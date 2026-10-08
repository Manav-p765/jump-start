// Shared entitlement write for gateway-backed purchases.
//
// BOTH the verify endpoint and (next) the webhook call this for the same
// payment, so it must be safe to run twice. Idempotency is keyed on
// razorpayPaymentId: a purchaseHistory record already carrying that id is
// treated as proof the grant happened, and the function returns without
// writing anything.
//
// Deliberate differences from userController.purchasePackage:
//
//  1. It does NOT touch testsInProgress or testProgress. purchasePackage
//     resets both, which is right when a student deliberately starts a new
//     package, but a duplicate webhook arriving mid-test would wipe live
//     answers. Payment unlocks access; it does not restart anything.
//
//  2. A failed coupon burn is not fatal. purchasePackage 409s when the last
//     slot is gone, which is correct BEFORE money changes hands. Here the
//     payment has already succeeded, so denying entitlement would take the
//     student's money and give nothing back. We log and proceed.
//
//  3. paymentMethod is "Razorpay", not the hardcoded "Online".
//
//  4. The write is one conditional updateOne, not user.save(), so two
//     concurrent callers for the same payment cannot both grant (see below).
import User from "../models/User.js";

/**
 * @param {object}  args
 * @param {object}  args.user               Mongoose User doc (not lean).
 * @param {object}  args.pkg                Package from AssessmentConfig.
 * @param {string}  args.razorpayOrderId
 * @param {string}  args.razorpayPaymentId  Idempotency key. Required.
 * @param {number}  args.originalAmount     Rupees, pre-discount.
 * @param {number}  args.finalAmount        Rupees, actually charged.
 * @param {string?} args.appliedCouponCode
 * @param {number?} args.discountAmount
 * @param {object?} args.couponDoc          Coupon doc to burn, if any.
 * @param {object?} args.CouponModel        Coupon model, for the increment.
 * @returns {Promise<{alreadyGranted: boolean, couponBurned: boolean}>}
 */
export async function grantPackageEntitlement({
  user,
  pkg,
  razorpayOrderId = null,
  razorpayPaymentId,
  originalAmount,
  finalAmount,
  appliedCouponCode = null,
  discountAmount = null,
  couponDoc = null,
  CouponModel = null,
}) {
  if (!user) throw new Error("grantPackageEntitlement: user is required");
  if (!pkg) throw new Error("grantPackageEntitlement: pkg is required");
  if (!razorpayPaymentId) {
    // Without the dedupe key we cannot promise idempotency, so refuse
    // rather than risk a double grant.
    throw new Error("grantPackageEntitlement: razorpayPaymentId is required");
  }

  // --- Fast path ---------------------------------------------------------
  // Cheap in-memory check for the common sequential repeat (a resent
  // webhook). NOT the guard: two callers can both load the user before
  // either writes, so the real gate is the conditional update below.
  const history = Array.isArray(user.purchaseHistory) ? user.purchaseHistory : [];
  const already = history.some(
    (record) => record && record.razorpayPaymentId === razorpayPaymentId
  );
  if (already) {
    return { alreadyGranted: true, couponBurned: false };
  }

  // --- Entitlement write (atomic) ------------------------------------------
  // One conditional updateOne: the filter only matches while no
  // purchaseHistory entry carries this payment id, and the push happens in
  // the same document write, so of two concurrent callers (verify + webhook,
  // or two webhook deliveries) exactly one gets modifiedCount === 1.
  //
  // Written straight to the collection rather than via user.save(), which
  // would replace the whole purchaseHistory array from a possibly stale
  // in-memory copy. The `user` doc passed in is therefore NOT updated; no
  // caller reads it afterwards.
  const entry = {
    packageId: pkg.id,
    packageTitle: pkg.title,
    // Post-discount value — what the student actually paid.
    amount: finalAmount,
    couponCode: appliedCouponCode,
    discountAmount,
    originalAmount,
    purchasedAt: new Date(),
    paymentMethod: "Razorpay",
    razorpayOrderId,
    razorpayPaymentId,
    status: "paid",
  };

  const write = await User.updateOne(
    {
      _id: user._id,
      "purchaseHistory.razorpayPaymentId": { $ne: razorpayPaymentId },
    },
    {
      $push: { purchaseHistory: entry },
      $addToSet: { purchasedPackages: pkg.id },
      $set: { selectedPackageId: pkg.id },
    }
  );
  // NOTE: testsInProgress and testProgress are intentionally untouched.

  if (write.modifiedCount !== 1) {
    // The other caller won (or the user vanished — matchedCount 0 either
    // way). Nothing was written, so nothing else may be either.
    return { alreadyGranted: true, couponBurned: false };
  }

  // --- Coupon burn -------------------------------------------------------
  // Only the caller whose write landed burns the slot, so a payment
  // consumes exactly one use however many times it is processed. Same
  // atomic, maxUses-guarded increment as purchasePackage, but a lost race
  // for the last slot is a warning here rather than a 409 (see note 2).
  let couponBurned = false;
  if (couponDoc && CouponModel) {
    const filter = { _id: couponDoc._id, isActive: true };
    if (couponDoc.maxUses != null) {
      filter.usedCount = { $lt: couponDoc.maxUses };
    }
    const inc = await CouponModel.updateOne(filter, { $inc: { usedCount: 1 } });
    couponBurned = inc.modifiedCount === 1;
    if (!couponBurned) {
      console.warn("coupon slot exhausted post-payment", {
        couponCode: couponDoc.code,
        userId: String(user._id),
        packageId: pkg.id,
        razorpayOrderId,
        razorpayPaymentId,
      });
    }
  }

  return { alreadyGranted: false, couponBurned };
}

// --- Revocation (full refund) ------------------------------------------------
//
// The 403 error code every gate returns for a package whose payment was fully
// refunded. The frontend keys its message off this, not the text.
export const ACCESS_REVOKED_REFUND = "ACCESS_REVOKED_REFUND";

export const ACCESS_REVOKED_REFUND_MSG =
  "Access to this test was removed because its payment was refunded.";

// Packages this user had and lost to a full refund: a "refunded"
// purchaseHistory entry, and the package no longer in purchasedPackages.
// Buying again puts it back in purchasedPackages, which clears it from this
// set, so everything hidden on revoke returns without further work.
//
// Needs purchaseHistory (packageId, status) and purchasedPackages on `user`;
// without them it returns an empty set, i.e. nothing is treated as revoked.
export const getRevokedPackageIds = (user) => {
  const owned = new Set(
    Array.isArray(user?.purchasedPackages) ? user.purchasedPackages.map(String) : []
  );
  const revoked = new Set();
  (Array.isArray(user?.purchaseHistory) ? user.purchaseHistory : []).forEach((entry) => {
    const packageId = String(entry?.packageId || "");
    if (entry?.status === "refunded" && packageId && !owned.has(packageId)) {
      revoked.add(packageId);
    }
  });
  return revoked;
};

export const isPackageRevoked = (user, packageId) =>
  Boolean(packageId) && getRevokedPackageIds(user).has(String(packageId));

/**
 * Take a package away after a FULL refund. Safe to run any number of times,
 * in any order relative to the webhooks that granted it.
 *
 *  1. The purchaseHistory entry for this order is marked "refunded", never
 *     deleted. Its razorpayPaymentId stays, so a late payment.captured or
 *     /verify still finds it and grantPackageEntitlement stays a no-op.
 *  2. The package leaves purchasedPackages only if no other paid entry for
 *     it remains, so refunding an old order cannot take away a package the
 *     student bought again since.
 *  3. testsInProgress drops to 0 if the package was the selected one.
 *     testProgress itself is kept: it is unusable without access, and is
 *     there again if the student buys the package back.
 *
 * Every step is a conditional single-document write, and step 2 runs even
 * when step 1 finds nothing to do, so a retry finishes a run that stopped
 * part-way.
 *
 * Keyed on razorpayOrderId: one Payment row per order, and every gateway
 * entry carries it.
 *
 * @returns {Promise<{found: boolean, packageId?: string, marked: boolean, removed: boolean}>}
 */
export async function revokePackageEntitlement({
  userId,
  razorpayOrderId,
  reason = "full_refund",
  now = new Date(),
}) {
  if (!userId || !razorpayOrderId) {
    throw new Error("revokePackageEntitlement: userId and razorpayOrderId are required");
  }

  const mark = await User.updateOne(
    {
      _id: userId,
      purchaseHistory: {
        $elemMatch: { razorpayOrderId, status: { $ne: "refunded" } },
      },
    },
    {
      $set: {
        "purchaseHistory.$[e].status": "refunded",
        "purchaseHistory.$[e].revokedAt": now,
        "purchaseHistory.$[e].revokeReason": reason,
      },
    },
    {
      arrayFilters: [{ "e.razorpayOrderId": razorpayOrderId, "e.status": { $ne: "refunded" } }],
    }
  );

  const user = await User.findById(userId)
    .select("purchaseHistory.razorpayOrderId purchaseHistory.packageId selectedPackageId")
    .lean();
  const entry = (user?.purchaseHistory || []).find(
    (item) => item?.razorpayOrderId === razorpayOrderId
  );
  if (!entry?.packageId) {
    // Refunded before any grant landed. Nothing to take away, and the
    // callers' isFullRefund checks stop a late grant.
    return { found: false, marked: false, removed: false };
  }
  const packageId = entry.packageId;

  const pull = await User.updateOne(
    {
      _id: userId,
      purchasedPackages: packageId,
      purchaseHistory: {
        $not: { $elemMatch: { packageId, status: { $ne: "refunded" } } },
      },
    },
    { $pull: { purchasedPackages: packageId } }
  );

  if (pull.modifiedCount === 1) {
    await User.updateOne(
      { _id: userId, selectedPackageId: packageId },
      { $set: { testsInProgress: 0 } }
    );
  }

  return {
    found: true,
    packageId,
    marked: mark.modifiedCount === 1,
    removed: pull.modifiedCount === 1,
  };
}

export default grantPackageEntitlement;

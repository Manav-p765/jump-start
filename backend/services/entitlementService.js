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

export default grantPackageEntitlement;

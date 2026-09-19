// Razorpay Tier 1 — package (report access) purchase.
//
// Two endpoints:
//   createOrder   — prices the package server-side, creates a Razorpay
//                   order, and opens a ledger row.
//   verifyPayment — checks the checkout signature and grants entitlement.
//
// The webhook (next) will call the same grantPackageEntitlement(), which is
// idempotent on razorpayPaymentId, so whichever arrives second is a no-op.
import crypto from "crypto";
import {
  validatePaymentVerification,
  validateWebhookSignature,
} from "razorpay/dist/utils/razorpay-utils.js";

import User from "../models/User.js";
import AssessmentConfig from "../models/AssessmentConfig.js";
import Coupon from "../models/Coupon.js";
import Payment from "../models/Payment.js";
import { getActivePackages } from "./userController.js";
import { getRazorpayClient, getRazorpayKeyId } from "../config/razorpay.js";
import { grantPackageEntitlement } from "../services/entitlementService.js";
import { GST_RATE, splitInclusiveGST } from "../utils/money.js";
import Booking from "../models/Booking.js";
import { COUNSELLING_NOTE_TYPE } from "../config/counselling.js";
import {
  confirmBookingPaid,
  noteBookingEvent,
} from "../services/bookingService.js";

// Razorpay caps `receipt` at 40 characters and requires uniqueness. A short
// prefix plus a base36 timestamp plus 6 random bytes stays well inside that
// and is collision-safe in practice.
const buildReceipt = () =>
  `js_${Date.now().toString(36)}_${crypto.randomBytes(6).toString("hex")}`.slice(
    0,
    40
  );

// Rupees -> paise. Razorpay takes currency subunits: 1999 => 199900.
const toPaise = (rupees) => Math.round(Number(rupees || 0) * 100);

// Billing normalisation + validation.
//
// This is the security boundary, not the form. The client gate in
// Payment.jsx is a courtesy to the student; anything can POST here, so the
// same rules are re-applied to the raw body and nothing reaches the ledger
// until they pass.
//
// Returns { ok: true, billing } with trimmed values, or { ok: false }.
const asTrimmedString = (value) =>
  typeof value === "string" ? value.trim() : "";

const validateBilling = (raw) => {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { ok: false };
  }

  const billing = {
    fullName: asTrimmedString(raw.fullName),
    email: asTrimmedString(raw.email),
    phone: asTrimmedString(raw.phone),
    address: asTrimmedString(raw.address),
    city: asTrimmedString(raw.city),
    state: asTrimmedString(raw.state),
    pincode: asTrimmedString(raw.pincode),
    gstNumber: asTrimmedString(raw.gstNumber),
  };

  // Non-empty after trim.
  if (!billing.fullName || !billing.address || !billing.city || !billing.state) {
    return { ok: false };
  }

  // "@" with a "." somewhere after it.
  const at = billing.email.indexOf("@");
  if (at < 1 || billing.email.indexOf(".", at) <= at + 1) {
    return { ok: false };
  }

  // Exactly 10 digits once every non-digit is stripped. Matches the client,
  // which also tolerates a +91/0 prefix — strip that here too so a number
  // the form accepted is not rejected server-side.
  const phoneDigits = billing.phone
    .replace(/\D/g, "")
    .replace(/^(?:91|0)(?=\d{10}$)/, "");
  if (!/^\d{10}$/.test(phoneDigits)) {
    return { ok: false };
  }

  if (!/^\d{6}$/.test(billing.pincode)) {
    return { ok: false };
  }

  // gstNumber is optional and unchecked — format varies and a wrong
  // rejection here blocks a sale for no benefit.
  return { ok: true, billing };
};

/**
 * POST /api/v1/user/payment/order
 * Body: { packageId, couponCode?, billing }
 */
export const createOrder = async (req, res) => {
  try {
    const { packageId, couponCode, billing: billingInput } = req.body || {};
    if (!packageId) {
      return res
        .status(400)
        .json({ success: false, msg: "packageId is required" });
    }

    // Before any lookup, pricing or gateway call: an invalid payload must
    // not cost us a Razorpay order or a ledger row.
    const billingCheck = validateBilling(billingInput);
    if (!billingCheck.ok) {
      return res.status(400).json({
        success: false,
        msg: "Billing information is incomplete or invalid",
      });
    }
    const billing = billingCheck.billing;

    const [cfg, user] = await Promise.all([
      AssessmentConfig.getOrCreateDefault(),
      User.findById(req.user.id),
    ]);
    if (!user)
      return res.status(404).json({ success: false, msg: "User not found" });

    const pkg = getActivePackages(cfg).find((p) => p.id === packageId);
    if (!pkg) {
      return res
        .status(404)
        .json({ success: false, msg: "Package not found or inactive" });
    }

    if (
      Array.isArray(user.purchasedPackages) &&
      user.purchasedPackages.includes(pkg.id)
    ) {
      return res.status(409).json({
        success: false,
        msg: "This package is already purchased and available in your account.",
      });
    }

    // --- Price it server-side ---------------------------------------------
    // The coupon is validated for PREVIEW only. It is not burned here: an
    // order that is never paid must not consume a slot. The burn happens
    // inside grantPackageEntitlement once money has actually moved.
    const originalAmount = Number(pkg.amount || 0);
    let finalAmount = originalAmount;
    let appliedCouponCode = null;
    let discountAmount = null;

    const trimmedCoupon = String(couponCode || "").trim().toUpperCase();
    if (trimmedCoupon) {
      const coupon = await Coupon.findOne({ code: trimmedCoupon });
      if (!coupon) {
        return res
          .status(400)
          .json({ success: false, msg: "Coupon code not found." });
      }
      const redeemable = coupon.isRedeemable();
      if (!redeemable.ok) {
        return res.status(400).json({ success: false, msg: redeemable.reason });
      }
      const { discount, finalPrice } = coupon.applyToAmount(originalAmount);
      appliedCouponCode = coupon.code;
      discountAmount = discount;
      finalAmount = finalPrice;
    }

    const amountPaise = toPaise(finalAmount);
    if (amountPaise <= 0) {
      // A zero-rupee order cannot be created at the gateway. Free packages
      // (the demo) still go through userController.purchasePackage.
      return res.status(400).json({
        success: false,
        msg: "This package has no payable amount. Use the free-package flow.",
      });
    }

    // GST split of the amount ACTUALLY CHARGED. Deliberately derived from
    // amountPaise (post-discount), not originalAmount: tax is owed on the
    // consideration received, so splitting the list price would overstate it
    // by the tax inside the discount whenever a coupon applies.
    const { base: basePaise, gst: gstPaise, gstRate } =
      splitInclusiveGST(amountPaise);

    const receipt = buildReceipt();
    const notes = {
      userId: String(user._id),
      packageId: pkg.id,
      couponCode: appliedCouponCode || "",
      // Three billing fields only, for at-a-glance identification in the
      // Razorpay dashboard. Notes are a capped key/value bag, not a store —
      // the full record lives on the Payment row below.
      billingName: billing.fullName,
      billingPhone: billing.phone,
      billingPincode: billing.pincode,
    };

    const razorpay = getRazorpayClient();
    const order = await razorpay.orders.create({
      amount: amountPaise,
      currency: "INR",
      receipt,
      notes,
    });

    // Ledger row for every order, paid or not.
    await Payment.create({
      userId: user._id,
      packageId: pkg.id,
      packageTitle: pkg.title,
      razorpayOrderId: order.id,
      amount: amountPaise,
      currency: "INR",
      status: "created",
      couponCode: appliedCouponCode,
      originalAmount,
      discountAmount,
      receipt,
      notes,
      // Snapshot of what the student entered at checkout. Read by the
      // invoice renderer later; nothing reads it today.
      billing,
      // Split of `amount` above (post-discount). base + gst === amount.
      base: basePaise,
      gst: gstPaise,
      gstRate,
    });

    return res.status(200).json({
      success: true,
      data: {
        orderId: order.id,
        amount: amountPaise,
        currency: "INR",
        receipt,
        // PUBLIC key — this is what Razorpay's checkout widget needs.
        keyId: getRazorpayKeyId(),
        packageId: pkg.id,
        packageTitle: pkg.title,
        originalAmount,
        discountAmount,
        finalAmount,
      },
    });
  } catch (err) {
    // The Razorpay SDK throws a plain object { statusCode, error }, NOT an
    // Error (see razorpay/dist/api.js normalizeError), so err.message is
    // undefined for every gateway failure. Without this line a 401, a
    // rejected amount and a dropped connection all collapse into the same
    // generic 500 with nothing in the log. Mongo and programmer errors are
    // real Errors and still carry .message; anything else logs raw.
    const sdkStatus = err?.statusCode;
    const sdkReason = err?.error?.description;
    if (sdkStatus || sdkReason) {
      console.error(
        "[payment] createOrder failed:",
        `${sdkStatus ?? "?"} ${sdkReason ?? ""}`.trim(),
        err?.error?.code ? `(${err.error.code})` : ""
      );
    } else {
      console.error("[payment] createOrder failed:", err?.message || err);
    }

    // Missing keys are a configuration problem, not a client error.
    if (String(err.message || "").includes("RAZORPAY_KEY_ID")) {
      return res.status(503).json({ success: false, msg: err.message });
    }
    return res.status(500).json({
      success: false,
      msg: err.message || "Failed to create payment order",
    });
  }
};

/**
 * POST /api/v1/user/payment/verify
 * Body: { razorpay_order_id, razorpay_payment_id, razorpay_signature }
 */
export const verifyPayment = async (req, res) => {
  const {
    razorpay_order_id: orderId,
    razorpay_payment_id: paymentId,
    razorpay_signature: signature,
  } = req.body || {};

  try {
    if (!orderId || !paymentId || !signature) {
      return res.status(400).json({
        success: false,
        msg: "razorpay_order_id, razorpay_payment_id and razorpay_signature are required",
      });
    }

    // Resolve the order from OUR ledger, never from the client. This is what
    // stops a tampered payload from changing the package or the amount.
    const payment = await Payment.findOne({ razorpayOrderId: orderId });
    if (!payment) {
      return res
        .status(404)
        .json({ success: false, msg: "Payment order not found" });
    }
    if (String(payment.userId) !== String(req.user.id)) {
      return res
        .status(403)
        .json({ success: false, msg: "This order belongs to another account" });
    }

    // --- Signature ---------------------------------------------------------
    const secret = String(process.env.RAZORPAY_KEY_SECRET || "").trim();
    if (!secret) {
      return res.status(503).json({
        success: false,
        msg: "RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET not set",
      });
    }

    const validSignature = validatePaymentVerification(
      { order_id: orderId, payment_id: paymentId },
      signature,
      secret
    );

    if (!validSignature) {
      payment.status = "failed";
      payment.failureReason = "signature_verification_failed";
      await payment.save();
      return res
        .status(400)
        .json({ success: false, msg: "Payment signature verification failed" });
    }

    // --- Grant -------------------------------------------------------------
    const [cfg, user] = await Promise.all([
      AssessmentConfig.getOrCreateDefault(),
      User.findById(req.user.id),
    ]);
    if (!user)
      return res.status(404).json({ success: false, msg: "User not found" });

    const pkg = getActivePackages(cfg).find((p) => p.id === payment.packageId);
    if (!pkg) {
      return res
        .status(404)
        .json({ success: false, msg: "Package not found or inactive" });
    }

    // Coupon comes off the ledger too, so the client cannot inject one.
    const couponDoc = payment.couponCode
      ? await Coupon.findOne({ code: payment.couponCode })
      : null;

    const result = await grantPackageEntitlement({
      user,
      pkg,
      razorpayOrderId: orderId,
      razorpayPaymentId: paymentId,
      // Ledger amounts are paise; purchaseHistory is in rupees, matching the
      // existing records and the admin Payments table.
      originalAmount: Number(payment.originalAmount ?? pkg.amount ?? 0),
      finalAmount: Number(payment.amount || 0) / 100,
      appliedCouponCode: payment.couponCode || null,
      discountAmount: payment.discountAmount ?? null,
      couponDoc,
      CouponModel: Coupon,
    });

    if (payment.status !== "paid") {
      payment.status = "paid";
      payment.razorpayPaymentId = paymentId;
      payment.failureReason = null;
      await payment.save();
    }

    // --- Authoritative money figures, in PAISE -----------------------------
    // The confirmation screen renders these verbatim rather than re-deriving
    // in rupees, so what the student sees on screen and what the invoice
    // prints off this same ledger row agree to the paisa.
    //
    // Historical rows (orders placed before base/gst were stored) carry no
    // split. Recompute it from the authoritative `amount` so the response
    // shape is identical for every order and no caller has to branch.
    const amountPaise = Number(payment.amount || 0);
    const hasStoredSplit =
      Number.isFinite(payment.base) && Number.isFinite(payment.gst);
    const money = hasStoredSplit
      ? {
          base: payment.base,
          gst: payment.gst,
          gstRate: payment.gstRate ?? GST_RATE,
        }
      : (() => {
          const s = splitInclusiveGST(amountPaise);
          return { base: s.base, gst: s.gst, gstRate: s.gstRate };
        })();

    return res.status(200).json({
      success: true,
      data: {
        packageId: pkg.id,
        packageTitle: pkg.title,
        razorpayOrderId: orderId,
        razorpayPaymentId: paymentId,
        alreadyGranted: result.alreadyGranted,
        // EVERY money field below is integer PAISE. amount === base + gst.
        //
        // originalAmount/discountAmount are converted here: on the ledger
        // they are stored in RUPEES (see createOrder — pkg.amount and
        // coupon.applyToAmount both work in rupees) while amount/base/gst
        // are paise. Emitting that split-brain to the client invites a 100x
        // formatting bug, so the response is uniform even though the
        // documents it reads are not.
        amount: amountPaise,
        base: money.base,
        gst: money.gst,
        gstRate: money.gstRate,
        originalAmount: toPaise(payment.originalAmount ?? 0),
        discountAmount: toPaise(payment.discountAmount ?? 0),
        couponCode: payment.couponCode || null,
      },
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      msg: err.message || "Failed to verify payment",
    });
  }
};

/**
 * POST /api/v1/user/payment/webhook
 *
 * Server-side source of truth. /verify grants entitlement for UX
 * responsiveness; this catches the cases where the browser never came back
 * (tab closed, network dropped, callback lost). Both call the same
 * idempotent grantPackageEntitlement(), keyed on razorpayPaymentId, so
 * whichever arrives second is a clean no-op.
 *
 * NOT protect-guarded: Razorpay has no session with us. The signature IS
 * the authentication.
 *
 * `req.body` is a Buffer — this route mounts ahead of the global
 * express.json() (server.js) so the raw bytes survive for HMAC validation.
 */
export const handleWebhook = async (req, res) => {
  // --- 1. Signature, before anything else --------------------------------
  const signature = req.headers["x-razorpay-signature"];
  const secret = String(process.env.RAZORPAY_WEBHOOK_SECRET || "").trim();

  if (!secret) {
    console.warn("[webhook] RAZORPAY_WEBHOOK_SECRET not set — rejecting");
    return res.status(400).json({ success: false, msg: "Webhook not configured" });
  }
  if (!signature) {
    console.warn("[webhook] missing x-razorpay-signature header");
    return res.status(400).json({ success: false, msg: "Missing signature" });
  }

  // Buffer -> string. Must be the exact bytes Razorpay signed: any parse or
  // re-serialise in between changes the digest and every check fails.
  const rawBody = Buffer.isBuffer(req.body)
    ? req.body.toString("utf8")
    : String(req.body || "");

  let valid = false;
  try {
    valid = validateWebhookSignature(rawBody, signature, secret);
  } catch (err) {
    console.warn("[webhook] signature validation threw", err.message);
    valid = false;
  }
  if (!valid) {
    console.warn("[webhook] invalid signature — payload ignored");
    return res.status(400).json({ success: false, msg: "Invalid signature" });
  }

  // --- 2. Parse only after the signature is trusted -----------------------
  let event;
  try {
    event = JSON.parse(rawBody);
  } catch (err) {
    console.warn("[webhook] signature valid but body is not JSON", err.message);
    return res.status(400).json({ success: false, msg: "Malformed payload" });
  }

  const eventName = String(event?.event || "");

  // From here on we answer 200 for anything we understood, even when we take
  // no action. Razorpay retries non-2xx, and retrying an event we chose to
  // ignore just generates noise.
  try {
    switch (eventName) {
      case "payment.captured":
        await onPaymentCaptured(event);
        break;

      case "payment.failed":
        await onPaymentFailed(event);
        break;

      case "refund.created":
      case "refund.processed":
        await onRefund(event, eventName);
        break;

      default:
        console.log("[webhook] ignoring unhandled event", eventName);
        break;
    }
  } catch (err) {
    // Deliberately still 200. A 500 makes Razorpay retry, and if the failure
    // is deterministic (bad data) it retries forever. The log is the alarm.
    console.error("[webhook] handler error for", eventName, err);
  }

  return res.status(200).json({ success: true, received: true });
};

// Record which event types have touched this order, deduped ($addToSet-style).
const noteEvent = (payment, eventName) => {
  if (!Array.isArray(payment.webhookEventsSeen)) {
    payment.webhookEventsSeen = [];
  }
  if (!payment.webhookEventsSeen.includes(eventName)) {
    payment.webhookEventsSeen.push(eventName);
  }
};

async function onPaymentCaptured(event) {
  const entity = event?.payload?.payment?.entity || {};
  const orderId = entity.order_id;
  const paymentId = entity.id;
  const notes = entity.notes || {};

  if (!orderId || !paymentId) {
    console.warn("[webhook] payment.captured missing order_id/id");
    return;
  }
  // --- Counselling branch ------------------------------------------------
  // Tier 2 bookings ride the SAME order/verify/webhook spine as packages;
  // ownership of the order is what tells the two apart. The `notes` marker
  // is logged rather than trusted as the sole signal: Razorpay copies order
  // notes onto the payment entity, but that is their behaviour rather than
  // our guarantee, and mis-routing a counselling capture into
  // grantPackageEntitlement would be a silent wrong grant. If a Booking owns
  // this order, it is a booking.
  const booking = await Booking.findOne({ razorpayOrderId: orderId });

  if (booking) {
    noteBookingEvent(booking, "payment.captured");
    const result = await confirmBookingPaid({
      booking,
      razorpayPaymentId: paymentId,
    });
    // confirmBookingPaid saves its own transitions; this persists the event
    // trail on the no-op (already booked) path too.
    await booking.save();

    console.log("[webhook] counselling payment.captured processed", {
      orderId,
      paymentId,
      bookingId: String(booking._id),
      markerPresent: notes.type === COUNSELLING_NOTE_TYPE,
      ok: result.ok,
      reason: result.reason || null,
      alreadyBooked: Boolean(result.alreadyBooked),
    });
    return; // never falls through to the package path
  }

  const payment = await Payment.findOne({ razorpayOrderId: orderId });
  if (!payment) {
    // An order we did not create. Never grant on this.
    console.warn("[webhook] payment.captured for unknown order", orderId);
    return;
  }
  noteEvent(payment, "payment.captured");

  const userId = notes.userId || String(payment.userId || "");
  const user = userId ? await User.findById(userId) : null;
  if (!user) {
    console.warn("[webhook] payment.captured: user not found", { orderId, userId });
    await payment.save();
    return;
  }

  const cfg = await AssessmentConfig.getOrCreateDefault();
  const packageId = payment.packageId || notes.packageId;
  const pkg = getActivePackages(cfg).find((p) => p.id === packageId);
  if (!pkg) {
    console.warn("[webhook] payment.captured: package not found", { orderId, packageId });
    await payment.save();
    return;
  }

  // Coupon from OUR ledger, as verifyPayment does — never from the payload.
  const couponDoc = payment.couponCode
    ? await Coupon.findOne({ code: payment.couponCode })
    : null;

  const result = await grantPackageEntitlement({
    user,
    pkg,
    razorpayOrderId: orderId,
    razorpayPaymentId: paymentId,
    originalAmount: Number(payment.originalAmount ?? pkg.amount ?? 0),
    finalAmount: Number(payment.amount || 0) / 100,
    appliedCouponCode: payment.couponCode || null,
    discountAmount: payment.discountAmount ?? null,
    couponDoc,
    CouponModel: Coupon,
  });

  // Guard the ledger flip so a replay cannot clobber an existing paid row.
  if (payment.status !== "paid") {
    payment.status = "paid";
    payment.razorpayPaymentId = paymentId;
    payment.failureReason = null;
  }
  await payment.save();

  console.log("[webhook] payment.captured processed", {
    orderId,
    paymentId,
    alreadyGranted: result.alreadyGranted,
  });
}

async function onPaymentFailed(event) {
  const entity = event?.payload?.payment?.entity || {};
  const orderId = entity.order_id;
  if (!orderId) {
    console.warn("[webhook] payment.failed missing order_id");
    return;
  }
  // Counselling booking? Record the failure and stop. Deliberately does NOT
  // release the slot: the reservation still has its 5-minute window, and a
  // failed attempt is often followed by a successful retry on the same order
  // (a mistyped UPI PIN). The lapse handles release on its own.
  const failedBooking = await Booking.findOne({ razorpayOrderId: orderId });
  if (failedBooking) {
    noteBookingEvent(failedBooking, "payment.failed");
    if (failedBooking.status !== "booked") {
      failedBooking.failureReason =
        entity.error_description || entity.error_reason || "payment_failed";
    }
    await failedBooking.save();
    console.log("[webhook] counselling payment.failed recorded", {
      orderId,
      bookingId: String(failedBooking._id),
      status: failedBooking.status,
    });
    return;
  }


  const payment = await Payment.findOne({ razorpayOrderId: orderId });
  if (!payment) {
    console.warn("[webhook] payment.failed for unknown order", orderId);
    return;
  }
  noteEvent(payment, "payment.failed");

  // A failure must NEVER overwrite a capture. Razorpay legitimately sends
  // payment.failed then payment.captured on the same order (a UPI retry
  // after a wrong PIN), and delivery order is not guaranteed either way.
  if (payment.status === "paid") {
    console.log("[webhook] payment.failed ignored — order already paid", orderId);
  } else {
    payment.status = "failed";
    payment.failureReason =
      entity.error_description || entity.error_reason || "payment_failed";
    console.log("[webhook] payment.failed recorded", orderId);
  }

  // Entitlement is untouched in both branches.
  await payment.save();
}

async function onRefund(event, eventName) {
  const entity = event?.payload?.refund?.entity || {};
  const orderId =
    entity.order_id || event?.payload?.payment?.entity?.order_id || null;

  if (!orderId) {
    console.warn("[webhook] refund event missing order_id", eventName);
    return;
  }
  // Counselling booking? Record the refund and stop. The booking is NOT
  // cancelled and the slot is NOT released — mirroring the package path,
  // where a refund is audit only and revoking access is a policy decision
  // that has not been made. Phase 3 gives the admin an explicit cancel.
  const refundedBooking = await Booking.findOne({ razorpayOrderId: orderId });
  if (refundedBooking) {
    noteBookingEvent(refundedBooking, eventName);
    refundedBooking.refundId = entity.id || refundedBooking.refundId;
    refundedBooking.refundStatus = entity.status || eventName;
    refundedBooking.refundedAt = new Date();
    await refundedBooking.save();
    console.log("[webhook] counselling refund recorded (slot retained)", {
      orderId,
      bookingId: String(refundedBooking._id),
      refundId: refundedBooking.refundId,
      refundStatus: refundedBooking.refundStatus,
    });
    return;
  }


  const payment = await Payment.findOne({ razorpayOrderId: orderId });
  if (!payment) {
    console.warn("[webhook] refund for unknown order", orderId);
    return;
  }

  noteEvent(payment, eventName);
  payment.refundId = entity.id || payment.refundId;
  payment.refundStatus = entity.status || eventName;
  payment.refundedAt = new Date();
  await payment.save();

  // Audit only. Entitlement is NOT revoked — that is a policy decision and
  // is out of scope here.
  console.log("[webhook] refund recorded (entitlement retained)", {
    orderId,
    refundId: payment.refundId,
    refundStatus: payment.refundStatus,
  });
}

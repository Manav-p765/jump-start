// Coupon model — promotional codes that discount the package price at
// checkout. Lives in its own collection (not embedded in User) so admins
// can manage codes independently of users and we can index by `code`.
//
// Usage flow
// ----------
// 1. Admin creates a code via POST /api/v1/admin/coupons.
// 2. Student types the code at checkout — POST /api/v1/user/coupon/validate
//    returns the discount + final price (no side-effects).
// 3. When the order is created (POST /api/v1/user/payment/order), the
//    controller re-validates the code, deducts the discount, persists
//    `couponCode` + `discountAmount` + `originalAmount` on the
//    purchaseHistory entry, and increments `usedCount` atomically so
//    `maxUses` is honoured under concurrent purchases.

import mongoose from "mongoose";
import { MIN_ORDER_PAISE } from "../utils/money.js";

const couponSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      // Index is implied by `unique: true`; the schema-level option
      // also forces upper-case so we never store mixed-case duplicates
      // that look distinct but collide once normalised.
    },
    discountType: {
      type: String,
      enum: ["percent", "flat"],
      required: true,
    },
    // For percent: 0–100. For flat: rupees off (positive integer-ish).
    // Validated by the create handler since the constraint depends on
    // discountType.
    discountValue: {
      type: Number,
      required: true,
      min: 0,
    },
    // Optional usage ceiling. `null` (the default) means unlimited.
    maxUses: { type: Number, default: null },
    usedCount: { type: Number, default: 0, min: 0 },
    // Optional expiry. `null` means no expiry.
    expiresAt: { type: Date, default: null },
    isActive: { type: Boolean, default: true },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: { createdAt: true, updatedAt: true } }
);

// Helper: is this coupon currently redeemable?
// Centralised here so /validate and /payment/order use identical logic.
couponSchema.methods.isRedeemable = function isRedeemable(now = new Date()) {
  if (!this.isActive) return { ok: false, reason: "Coupon is inactive" };
  if (this.expiresAt && this.expiresAt < now) {
    return { ok: false, reason: "Coupon has expired" };
  }
  if (this.maxUses != null && this.usedCount >= this.maxUses) {
    return { ok: false, reason: "Coupon usage limit reached" };
  }
  return { ok: true };
};

// Compute the discount amount + final price for a given subtotal.
// Returns integers (rupee-precision); the platform doesn't deal in
// paise anywhere, so rounding here keeps the rest of the pipeline
// simple. Caller is responsible for clamping discount <= subtotal.
couponSchema.methods.applyToAmount = function applyToAmount(subtotal) {
  const amount = Math.max(0, Number(subtotal || 0));
  let discount = 0;
  if (this.discountType === "percent") {
    discount = Math.round(amount * (Math.min(100, Math.max(0, this.discountValue)) / 100));
  } else {
    discount = Math.min(amount, Math.max(0, Math.round(this.discountValue)));
  }
  const finalPrice = Math.max(0, amount - discount);
  return { discount, finalPrice };
};

// Full discounts are not supported: a paid package must still cost at least
// Razorpay's ₹1 minimum after the coupon, because there is no gateway-free
// path for paid packages. Checked at coupon creation/activation (admin),
// /coupon/validate and /payment/order.
export const FULL_DISCOUNT_MSG = "This code can't be used for a full discount";

// True when this coupon would take a PAID package (amount in rupees) below
// the ₹1 minimum. Free packages (amount 0) never trip it.
couponSchema.methods.makesFree = function makesFree(subtotal) {
  const amount = Math.max(0, Number(subtotal || 0));
  if (amount <= 0) return false;
  const { finalPrice } = this.applyToAmount(amount);
  return Math.round(finalPrice * 100) < MIN_ORDER_PAISE;
};

const Coupon = mongoose.models.Coupon || mongoose.model("Coupon", couponSchema);
export default Coupon;

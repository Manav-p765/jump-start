// One-off catch-up: apply the full-refund rules to refunds recorded before
// they existed.
//
// Until now a refund webhook only recorded the refund. This finds every
// Payment and Booking whose refund is processed and covers the full amount
// (utils/refunds.js isFullRefund; a legacy refund with no stored amount
// counts as full) and applies exactly what the webhook now does:
//
//   Payment  revokePackageEntitlement: the purchaseHistory entry is marked
//            "refunded" (kept, not deleted) and the package leaves
//            purchasedPackages unless another paid purchase of it remains.
//   Booking  cancelBookingForRefund: status "cancelled", slot freed.
//
// Partial and pending refunds are listed as skipped and left alone.
//
// Both writes are conditional, so this is safe to run while the site is
// live and safe to re-run: a second run reports nothing to do.
//
// Run with:
//   node scripts/revokeRefundedEntitlements.mjs            # dry run (default)
//   node scripts/revokeRefundedEntitlements.mjs --write    # apply

import "dotenv/config";
import mongoose from "mongoose";
import { ensureRequiredEnv } from "../config/env.js";
import Payment from "../models/Payment.js";
import Booking from "../models/Booking.js";
import User from "../models/User.js";
import { isFullRefund, normalizeRefundStatus, refundedPaise } from "../utils/refunds.js";
import { revokePackageEntitlement } from "../services/entitlementService.js";
import { cancelBookingForRefund } from "../services/bookingService.js";

const WRITE = process.argv.includes("--write");

const rupees = (paise) => `₹${(Number(paise || 0) / 100).toFixed(2)}`;

// Every row with any refund on it; the processed/full test is done in JS
// through the same helpers the webhook uses, so the two cannot disagree.
const refunded = { refundStatus: { $nin: [null, ""] } };

const run = async () => {
  ensureRequiredEnv();
  await mongoose.connect(process.env.MONGODB_URI);

  console.log(WRITE ? "MODE: --write (changes WILL be saved)" : "MODE: dry run (no changes)");

  const summary = {
    paymentsFull: 0,
    revoked: 0,
    alreadyRevoked: 0,
    noPurchaseEntry: 0,
    bookingsFull: 0,
    cancelled: 0,
    alreadyCancelled: 0,
    skippedNotFull: 0,
  };

  // --- Packages -------------------------------------------------------------
  const payments = await Payment.find({ status: "paid", ...refunded })
    .select("_id userId packageId packageTitle razorpayOrderId amount refundStatus refundAmount refundId refundedAt")
    .lean();
  console.log(`\nPayments with a refund recorded: ${payments.length}`);

  for (const p of payments) {
    const label = `${p.razorpayOrderId} (${p.packageTitle || p.packageId || "package"})`;
    if (!isFullRefund(p)) {
      summary.skippedNotFull += 1;
      console.log(
        `- SKIP ${label}: refund ${normalizeRefundStatus(p.refundStatus)}, ` +
          `${rupees(refundedPaise(p))} of ${rupees(p.amount)} — not a full processed refund`
      );
      continue;
    }
    summary.paymentsFull += 1;

    const user = p.userId
      ? await User.findById(p.userId)
          .select("email purchasedPackages purchaseHistory.razorpayOrderId purchaseHistory.packageId purchaseHistory.status")
          .lean()
      : null;
    const who = user ? `${user.email} [${p.userId}]` : `user ${p.userId || "?"} (not found)`;
    const entry = (user?.purchaseHistory || []).find((e) => e?.razorpayOrderId === p.razorpayOrderId);

    if (!entry) {
      summary.noPurchaseEntry += 1;
      console.log(`- NONE ${label}: ${who} has no purchase for this order — nothing to revoke`);
      continue;
    }

    const packageId = entry.packageId;
    const otherPaid = (user.purchaseHistory || []).some(
      (e) => e?.packageId === packageId && e?.razorpayOrderId !== p.razorpayOrderId && e?.status !== "refunded"
    );
    const owns = (user.purchasedPackages || []).includes(packageId);
    const willMark = entry.status !== "refunded";
    const willRemove = owns && !otherPaid;

    if (!willMark && !willRemove) {
      summary.alreadyRevoked += 1;
      console.log(`- DONE ${label}: ${who} — already revoked`);
      continue;
    }

    const plan = [
      willMark ? "mark purchase refunded" : null,
      willRemove
        ? `remove ${packageId} from purchasedPackages`
        : otherPaid
          ? `keep ${packageId} (another paid purchase of it exists)`
          : null,
    ]
      .filter(Boolean)
      .join(", ");

    if (WRITE) {
      const r = await revokePackageEntitlement({ userId: p.userId, razorpayOrderId: p.razorpayOrderId });
      if (r.marked || r.removed) summary.revoked += 1;
      else summary.alreadyRevoked += 1;
      console.log(`- REVOKE ${label}: ${who} — ${plan} → marked=${r.marked} removed=${r.removed}`);
    } else {
      summary.revoked += 1;
      console.log(`- REVOKE ${label}: ${who} — would ${plan}`);
    }
  }

  // --- Counselling bookings -------------------------------------------------
  const bookings = await Booking.find(refunded)
    .select("_id userId razorpayOrderId slotStart slotDate slotLabel status activeSlotKey amount refundStatus refundAmount refundId")
    .lean();
  console.log(`\nBookings with a refund recorded: ${bookings.length}`);

  for (const b of bookings) {
    const label = `booking ${b._id} (${b.slotDate || "?"} ${b.slotLabel || ""}, user ${b.userId})`;
    if (!isFullRefund(b)) {
      summary.skippedNotFull += 1;
      console.log(
        `- SKIP ${label}: refund ${normalizeRefundStatus(b.refundStatus)}, ` +
          `${rupees(refundedPaise(b))} of ${rupees(b.amount)} — not a full processed refund`
      );
      continue;
    }
    summary.bookingsFull += 1;

    if (b.status === "cancelled") {
      summary.alreadyCancelled += 1;
      console.log(`- DONE ${label}: already cancelled`);
      continue;
    }

    const plan = `cancel (was ${b.status})${b.activeSlotKey ? `, free slot ${b.activeSlotKey}` : ""}`;
    if (WRITE) {
      const changed = await cancelBookingForRefund(b._id);
      if (changed) summary.cancelled += 1;
      else summary.alreadyCancelled += 1;
      console.log(`- CANCEL ${label}: ${plan} → ${changed ? "done" : "already cancelled"}`);
    } else {
      summary.cancelled += 1;
      console.log(`- CANCEL ${label}: would ${plan}`);
    }
  }

  console.log("\nSummary");
  console.log(`  fully refunded payments:   ${summary.paymentsFull}`);
  console.log(`  ${(WRITE ? "revoked:" : "would revoke:").padEnd(27)}${summary.revoked}`);
  console.log(`  already revoked:           ${summary.alreadyRevoked}`);
  console.log(`  no purchase to revoke:     ${summary.noPurchaseEntry}`);
  console.log(`  fully refunded bookings:   ${summary.bookingsFull}`);
  console.log(`  ${(WRITE ? "cancelled:" : "would cancel:").padEnd(27)}${summary.cancelled}`);
  console.log(`  already cancelled:         ${summary.alreadyCancelled}`);
  console.log(`  skipped (partial/pending): ${summary.skippedNotFull}`);
  if (!WRITE) console.log("\nDry run only. Re-run with --write to apply.");

  await mongoose.disconnect();
};

run().catch(async (err) => {
  console.error("Catch-up failed:", err);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});

// One-off backfill: receipt fields on payments captured before they existed.
//
// For every Payment with status "paid" that is missing paidAt,
// paymentMethod or a final receiptNumber (absent, null, or a PENDING-
// claim left behind by a crash), this fills in only what is missing:
//
//   paidAt         best available timestamp, in this order:
//                    1. Razorpay payment created_at (payments.fetch)
//                    2. purchaseHistory.purchasedAt for the same payment id
//                    3. the Payment row's updatedAt
//   paymentMethod  Razorpay payment.method (payments.fetch)
//   receiptNumber  drawn from the same per-year counter as live payments,
//                  assigned in order of capture time (paidAt)
//
// Existing values are never overwritten: every write is conditional on
// the field still being unset, so this is safe to run while the site is
// live and safe to re-run.
//
// Numbering note: the counter is shared with live payments, so backfilled
// rows take the next free numbers for their year. Run it soon after deploy
// so historical payments get the low numbers.
//
// Run with:
//   node scripts/backfillReceipts.mjs            # dry run (default)
//   node scripts/backfillReceipts.mjs --write    # apply

import "dotenv/config";
import mongoose from "mongoose";
import { ensureRequiredEnv } from "../config/env.js";
import Payment from "../models/Payment.js";
import User from "../models/User.js";
import Counter from "../models/Counter.js";
import { isRazorpayConfigured } from "../config/razorpay.js";
import {
  PENDING_PREFIX,
  allocateReceiptNumber,
  fetchRazorpayPaymentInfo,
  formatReceiptNumber,
  hasFinalReceiptNumber,
  istYear,
} from "../services/receiptService.js";

const WRITE = process.argv.includes("--write");

const unset = (field) => ({ $or: [{ [field]: { $exists: false } }, { [field]: null }] });

const run = async () => {
  ensureRequiredEnv();
  await mongoose.connect(process.env.MONGODB_URI);

  console.log(WRITE ? "MODE: --write (changes WILL be saved)" : "MODE: dry run (no changes)");
  if (!isRazorpayConfigured()) {
    console.warn(
      "RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET not set — payment methods cannot be fetched; " +
        "paidAt will fall back to purchaseHistory / updatedAt."
    );
  }

  const targets = await Payment.find({
    status: "paid",
    $or: [
      unset("paidAt"),
      unset("paymentMethod"),
      unset("receiptNumber"),
      { receiptNumber: { $regex: `^${PENDING_PREFIX}` } },
    ],
  })
    .select(
      "_id userId razorpayOrderId razorpayPaymentId paidAt paymentMethod receiptNumber updatedAt createdAt"
    )
    .lean();

  console.log(`Found ${targets.length} captured payment(s) needing receipt fields.`);
  if (targets.length === 0) {
    await mongoose.disconnect();
    return;
  }

  // purchaseHistory.purchasedAt by razorpayPaymentId, for the paidAt fallback.
  const users = await User.find({ _id: { $in: targets.map((t) => t.userId) } })
    .select("purchaseHistory.razorpayPaymentId purchaseHistory.purchasedAt")
    .lean();
  const purchasedAtByPaymentId = new Map();
  users.forEach((u) =>
    (u.purchaseHistory || []).forEach((p) => {
      if (p.razorpayPaymentId && p.purchasedAt) {
        purchasedAtByPaymentId.set(p.razorpayPaymentId, new Date(p.purchasedAt));
      }
    })
  );

  // Resolve every row's paidAt / method first, so numbering can follow
  // capture order across the whole set.
  const plans = [];
  for (const row of targets) {
    const needsMethod = !row.paymentMethod;
    const needsPaidAt = !row.paidAt;
    const info =
      needsMethod || needsPaidAt
        ? await fetchRazorpayPaymentInfo(row.razorpayPaymentId)
        : {};

    let paidAt = row.paidAt ? new Date(row.paidAt) : null;
    let paidAtSource = "existing";
    if (!paidAt) {
      if (info.createdAt) {
        paidAt = info.createdAt;
        paidAtSource = "razorpay";
      } else if (purchasedAtByPaymentId.has(row.razorpayPaymentId)) {
        paidAt = purchasedAtByPaymentId.get(row.razorpayPaymentId);
        paidAtSource = "purchaseHistory";
      } else {
        paidAt = new Date(row.updatedAt || row.createdAt);
        paidAtSource = "updatedAt";
      }
    }

    plans.push({
      row,
      paidAt,
      paidAtSource,
      setPaidAt: needsPaidAt,
      method: needsMethod ? info.method || null : null,
      needsNumber: !hasFinalReceiptNumber(row),
    });
  }

  plans.sort((a, b) => a.paidAt - b.paidAt);

  // Dry run previews numbers from the counters' current values without
  // advancing them.
  const preview = new Map();
  const previewNumber = async (paidAt) => {
    const year = istYear(paidAt);
    if (!preview.has(year)) {
      const doc = await Counter.findById(`receipt-${year}`).lean();
      preview.set(year, doc?.seq || 0);
    }
    preview.set(year, preview.get(year) + 1);
    return formatReceiptNumber(year, preview.get(year));
  };

  const summary = {
    paidAtSet: 0,
    methodSet: 0,
    methodUnavailable: 0,
    numbersAssigned: 0,
    skippedRace: 0,
  };

  for (const plan of plans) {
    const { row } = plan;
    const id = row._id;
    const changes = [];

    if (plan.setPaidAt) {
      changes.push(`paidAt=${plan.paidAt.toISOString()} (${plan.paidAtSource})`);
      if (WRITE) {
        const r = await Payment.updateOne({ _id: id, ...unset("paidAt") }, { $set: { paidAt: plan.paidAt } });
        summary.paidAtSet += r.modifiedCount;
      } else {
        summary.paidAtSet += 1;
      }
    }

    if (!row.paymentMethod) {
      if (plan.method) {
        changes.push(`method=${plan.method}`);
        if (WRITE) {
          const r = await Payment.updateOne(
            { _id: id, ...unset("paymentMethod") },
            { $set: { paymentMethod: plan.method } }
          );
          summary.methodSet += r.modifiedCount;
        } else {
          summary.methodSet += 1;
        }
      } else {
        changes.push("method=<unavailable>");
        summary.methodUnavailable += 1;
      }
    }

    if (plan.needsNumber) {
      if (WRITE) {
        // Claim the row, then draw and write the real number. A PENDING-
        // value already on the row is a claim abandoned by a crash
        // mid-allocation; the backfill takes it over rather than skip it.
        const stale = String(row.receiptNumber || "").startsWith(PENDING_PREFIX)
          ? row.receiptNumber
          : null;
        const placeholder = stale || `${PENDING_PREFIX}${id}`;
        if (!stale) {
          await Payment.updateOne(
            { _id: id, ...unset("receiptNumber") },
            { $set: { receiptNumber: placeholder } }
          );
        }
        const fresh = await Payment.findById(id).select("receiptNumber paidAt").lean();
        if (fresh?.receiptNumber === placeholder) {
          const receiptNumber = await allocateReceiptNumber(fresh.paidAt || plan.paidAt);
          const r = await Payment.updateOne(
            { _id: id, receiptNumber: placeholder },
            { $set: { receiptNumber } }
          );
          summary.numbersAssigned += r.modifiedCount;
          changes.push(`receiptNumber=${receiptNumber}`);
        } else {
          // Live traffic numbered it between our read and our claim.
          summary.skippedRace += 1;
          changes.push(`receiptNumber already set (${fresh?.receiptNumber})`);
        }
      } else {
        summary.numbersAssigned += 1;
        changes.push(`receiptNumber=${await previewNumber(plan.paidAt)} (preview)`);
      }
    }

    console.log(`- ${id} ${row.razorpayPaymentId || "-"}: ${changes.join(", ") || "nothing to do"}`);
  }

  console.log("\nSummary");
  console.log(`  payments examined:        ${plans.length}`);
  console.log(`  paidAt set:               ${summary.paidAtSet}`);
  console.log(`  paymentMethod set:        ${summary.methodSet}`);
  console.log(`  paymentMethod unavailable:${String(summary.methodUnavailable).padStart(3)}`);
  console.log(`  receipt numbers assigned: ${summary.numbersAssigned}`);
  if (summary.skippedRace) {
    console.log(`  already numbered by live traffic: ${summary.skippedRace}`);
  }
  if (!WRITE) console.log("\nDry run only. Re-run with --write to apply.");

  await mongoose.disconnect();
};

run().catch(async (err) => {
  console.error("Backfill failed:", err);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});

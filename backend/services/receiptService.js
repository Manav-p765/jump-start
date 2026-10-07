// Receipt stamping — paidAt, receiptNumber and paymentMethod on a Payment.
//
// Called from every place a payment becomes captured: verifyPayment and the
// payment.captured webhook (both in paymentController.js), plus the
// backfill script for rows paid before these fields existed.
//
// Idempotency
// -----------
// verify and the webhook routinely run for the same payment, sometimes
// concurrently, and Razorpay resends webhooks. So every field is written
// with a CONDITIONAL atomic update ("set X where X is still unset"), never
// by mutating the in-memory document and saving: a document save would
// happily overwrite a value the other path wrote a millisecond earlier.
//
// Receipt numbers must also be gapless, so a number is only drawn from the
// counter AFTER this caller has won the row. Winning means swapping the
// unset receiptNumber for a per-row placeholder (PENDING-<_id>); the loser
// sees the placeholder and draws nothing. If the process dies between the
// claim and the final write, the placeholder is left behind — the backfill
// script treats it as missing and repairs it.
import Payment from "../models/Payment.js";
import { nextSequence } from "../models/Counter.js";
import { getRazorpayClient, isRazorpayConfigured } from "../config/razorpay.js";

export const RECEIPT_PREFIX = "JS-RCPT";
export const PENDING_PREFIX = "PENDING-";

// Calendar year in IST, so a payment at 00:30 IST on 1 Jan belongs to the
// new year even though it is still 31 Dec in UTC.
export const istYear = (date) =>
  Number(
    new Intl.DateTimeFormat("en-IN", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
    }).format(date)
  );

export const formatReceiptNumber = (year, seq) =>
  `${RECEIPT_PREFIX}-${year}-${String(seq).padStart(5, "0")}`;

// One sequence per calendar year: JS-RCPT-2026-00001, JS-RCPT-2027-00001 ...
export const allocateReceiptNumber = async (paidAt) => {
  const year = istYear(paidAt);
  const seq = await nextSequence(`receipt-${year}`);
  return formatReceiptNumber(year, seq);
};

// Matches a receiptNumber that is absent or null. A PENDING- claim is NOT
// unset: it belongs to whichever caller is mid-allocation.
const receiptNumberUnset = {
  $or: [
    { receiptNumber: { $exists: false } },
    { receiptNumber: null },
  ],
};

/**
 * Razorpay payment entity -> { method, createdAt } for receipt stamping.
 * Never throws: a failed fetch leaves the method unset for the webhook (or
 * the backfill) to fill in later. Returns {} when keys are not configured.
 */
export const fetchRazorpayPaymentInfo = async (razorpayPaymentId) => {
  if (!razorpayPaymentId || !isRazorpayConfigured()) return {};
  try {
    const entity = await getRazorpayClient().payments.fetch(razorpayPaymentId);
    return {
      method: entity?.method || null,
      createdAt: entity?.created_at ? new Date(entity.created_at * 1000) : null,
    };
  } catch (err) {
    const reason = err?.error?.description || err?.message || String(err);
    console.warn("[receipt] payments.fetch failed", razorpayPaymentId, reason);
    return {};
  }
};

/**
 * Stamp paidAt, paymentMethod and receiptNumber on a PAID payment, each only
 * if still unset. Safe to call any number of times, from any path.
 *
 * @param {string|ObjectId} paymentDocId  Payment._id
 * @param {object} info
 * @param {Date}   [info.paidAt]         best known capture time (default now)
 * @param {string} [info.paymentMethod]  Razorpay method, if already known
 * @param {boolean}[info.fetchMethod]    fetch the method from Razorpay when
 *                                       neither info nor the row has one
 * @returns the fresh Payment document (lean), or null if not found / unpaid
 */
export const stampReceiptFields = async (
  paymentDocId,
  { paidAt, paymentMethod, fetchMethod = false } = {}
) => {
  const current = await Payment.findById(paymentDocId)
    .select("status paidAt paymentMethod receiptNumber razorpayPaymentId")
    .lean();
  if (!current || current.status !== "paid") return null;

  // 1. paidAt — first writer wins.
  const effectivePaidAt =
    paidAt instanceof Date && !Number.isNaN(paidAt.getTime()) ? paidAt : new Date();
  if (!current.paidAt) {
    await Payment.updateOne(
      { _id: paymentDocId, $or: [{ paidAt: { $exists: false } }, { paidAt: null }] },
      { $set: { paidAt: effectivePaidAt } }
    );
  }

  // 2. paymentMethod — from the caller, else (optionally) from Razorpay.
  if (!current.paymentMethod) {
    let method = paymentMethod || null;
    if (!method && fetchMethod) {
      method = (await fetchRazorpayPaymentInfo(current.razorpayPaymentId)).method;
    }
    if (method) {
      await Payment.updateOne(
        {
          _id: paymentDocId,
          $or: [{ paymentMethod: { $exists: false } }, { paymentMethod: null }],
        },
        { $set: { paymentMethod: String(method) } }
      );
    }
  }

  // 3. receiptNumber — claim the row, then draw from the counter.
  if (!current.receiptNumber) {
    const claim = await Payment.updateOne(
      { _id: paymentDocId, ...receiptNumberUnset },
      { $set: { receiptNumber: `${PENDING_PREFIX}${paymentDocId}` } }
    );
    if (claim.modifiedCount === 1) {
      // Number by the STORED paidAt (whoever set it), so the year in the
      // receipt number always matches the date printed on the receipt.
      const stamped = await Payment.findById(paymentDocId).select("paidAt").lean();
      const receiptNumber = await allocateReceiptNumber(
        stamped?.paidAt || effectivePaidAt
      );
      await Payment.updateOne(
        { _id: paymentDocId, receiptNumber: `${PENDING_PREFIX}${paymentDocId}` },
        { $set: { receiptNumber } }
      );
    }
  }

  return Payment.findById(paymentDocId).lean();
};

export const hasFinalReceiptNumber = (payment) =>
  Boolean(payment?.receiptNumber) &&
  !String(payment.receiptNumber).startsWith(PENDING_PREFIX);

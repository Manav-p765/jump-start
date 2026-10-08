// Refund state of a Payment ledger row — the ONE place it is interpreted.
//
// Shared by the student payments list, the admin Payments table and the PDF
// receipt, so the three never disagree about whether something was refunded
// or by how much.
//
// refundStatus holds Razorpay's refund.entity.status ("pending", "processed",
// "failed"), or the event name when an event arrived without one (older rows:
// "refund.created", "refund.processed").
//
// Only a PROCESSED refund counts as money returned. A pending refund is not
// yet refunded, and a failed one never will be.

export const normalizeRefundStatus = (status) => {
  const s = String(status || "").toLowerCase();
  if (!s) return null;
  if (s === "processed" || s === "refund.processed") return "processed";
  if (s === "failed" || s === "refund.failed") return "failed";
  // "pending", "created", "refund.created" — Razorpay has the refund but the
  // money has not moved yet.
  return "pending";
};

// Paise refunded. Rows recorded before refundAmount existed carry no amount
// and are treated as a FULL refund of what was charged.
export const refundedPaise = (payment) => {
  if (normalizeRefundStatus(payment?.refundStatus) !== "processed") return 0;
  const charged = Math.round(Number(payment?.amount || 0));
  const refunded = Number(payment?.refundAmount);
  return Number.isFinite(refunded) && refunded > 0
    ? Math.min(Math.round(refunded), charged)
    : charged;
};

export const isPartialRefund = (payment) => {
  const refunded = refundedPaise(payment);
  return refunded > 0 && refunded < Math.round(Number(payment?.amount || 0));
};

// Everything charged has come back. The ONLY test for revoking access or
// cancelling a booking: a pending or partial refund keeps both.
export const isFullRefund = (payment) => {
  const charged = Math.round(Number(payment?.amount || 0));
  return charged > 0 && refundedPaise(payment) >= charged;
};

// Add one PROCESSED refund to the row's running total (`refundAmount`,
// paise). Mutates `row` (a Payment or Booking doc); the caller saves.
//
// Razorpay can refund one payment several times, and each refund.* event
// carries only that refund's own amount. Two sources, best first:
//
//   gatewayTotal  payload.payment.entity.amount_refunded — Razorpay's own
//                 cumulative figure for the payment. Taken when present.
//   refundAmount  payload.refund.entity.amount — this refund alone. Added
//                 once per refund id (processedRefundIds), so a resent
//                 event is not counted twice.
//
// The total never goes down (a late or reordered event cannot shrink it)
// and never exceeds what was charged.
export const addProcessedRefund = (row, { refundId, refundAmount, gatewayTotal }) => {
  const charged = Math.round(Number(row.amount || 0));
  let counted = Array.isArray(row.processedRefundIds) ? [...row.processedRefundIds] : [];
  const current = Number(row.refundAmount);
  let total = Number.isFinite(current) && current > 0 ? Math.round(current) : 0;

  // Rows written before processedRefundIds existed hold the amount of the
  // refund named in refundId. Count that one as already included.
  if (!counted.length && total > 0 && row.refundId) {
    counted = [row.refundId];
  }

  const amount = Number(refundAmount);
  if (refundId && !counted.includes(refundId) && Number.isFinite(amount) && amount > 0) {
    total += Math.round(amount);
    counted.push(refundId);
  }

  const gateway = Number(gatewayTotal);
  if (Number.isFinite(gateway) && gateway > total) {
    total = Math.round(gateway);
  }

  if (charged > 0) total = Math.min(total, charged);
  if (total > 0) row.refundAmount = total;
  row.processedRefundIds = counted;
};

// Admin label: Paid / Refunded / Refund processing / Refund failed.
export const adminPaymentStatus = (payment) => {
  switch (normalizeRefundStatus(payment?.refundStatus)) {
    case "processed":
      return "Refunded";
    case "pending":
      return "Refund processing";
    case "failed":
      return "Refund failed";
    default:
      return "Paid";
  }
};

// Student-facing refund status: "processed", "pending" or null. A failed
// refund is shown to the student as a plain paid payment.
export const studentRefundStatus = (payment) => {
  const s = normalizeRefundStatus(payment?.refundStatus);
  return s === "processed" || s === "pending" ? s : null;
};

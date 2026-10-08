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

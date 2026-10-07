// Client-side money helpers — the ONLY place rupee amounts are formatted or
// the GST split is computed on the frontend.
//
// Everything is INTEGER PAISE, mirroring backend/utils/money.js. Rupee floats
// are converted to paise once, at the edge (Math.round(rupees * 100)), so the
// payment quote, the confirmation receipt and the invoice all print the same
// bytes for the same amount.

export const GST_RATE = 0.18;

// Paise -> displayed rupees. Two decimals always: the ledger split is exact
// to the paisa, so ₹1,524.58 is shown in full and a round amount reads
// "₹ 1,799.00".
export const formatPaise = (paise) =>
  `₹ ${(Number(paise || 0) / 100).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

// Split a GST-INCLUSIVE total into taxable base and the tax inside it.
// `gst` is the REMAINDER (total - base), never rounded on its own, so
// base + gst === total by construction. Must stay identical to
// backend/utils/money.js splitInclusiveGST.
export const splitInclusiveGST = (totalPaise) => {
  const t = Math.max(0, Math.round(Number(totalPaise) || 0));
  const base = Math.round(t / (1 + GST_RATE));
  const gst = t - base;

  return { base, gst, total: t };
};

// Money helpers — the single source of truth for the GST split.
//
// Everything here is INTEGER PAISE. Rupees never appear: floating-point
// rupees are what let a base and a tax figure disagree with the total by a
// paisa, and a tax invoice that does not add up is a compliance problem
// rather than a rounding curiosity.
//
// Prices in this system are GST-INCLUSIVE — the student pays the sticker
// price and the tax is already inside it. So the split is a *decomposition*
// of a number we already have, never an addition on top of one.

export const GST_RATE = 0.18;

// Razorpay rejects orders below ₹1 (100 paise). Anything that would price
// below this is not payable through the gateway at all.
export const MIN_ORDER_PAISE = 100;

/**
 * Split a GST-INCLUSIVE total into its taxable base and the tax inside it.
 *
 * `gst` is deliberately the REMAINDER (`total - base`), never rounded on its
 * own. Rounding both halves independently lets them sum to total ± 1 paisa;
 * taking one as the remainder makes `base + gst === total` true by
 * construction, for every input, with no reconciliation step.
 *
 * The caller must pass the amount ACTUALLY CHARGED (post-discount). Tax is
 * owed on the consideration received, so splitting a pre-discount list price
 * overstates the tax whenever a coupon is in play.
 *
 * @param {number} totalPaise inclusive total, integer paise
 * @returns {{ base: number, gst: number, total: number, gstRate: number }}
 */
export const splitInclusiveGST = (totalPaise) => {
  // Coerce defensively: this runs on a value that has been through JSON and
  // arithmetic. NaN/undefined collapse to 0 rather than poisoning the ledger.
  const t = Math.max(0, Math.round(Number(totalPaise) || 0));
  const base = Math.round(t / (1 + GST_RATE));
  const gst = t - base;

  return { base, gst, total: t, gstRate: GST_RATE };
};

export default { GST_RATE, MIN_ORDER_PAISE, splitInclusiveGST };

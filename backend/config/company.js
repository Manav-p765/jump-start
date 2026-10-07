// Company, legal and contact details for server-rendered documents (the
// PDF payment receipt in utils/receiptPdf.js).
//
// KEEP IN SYNC with frontend/src/config/company.js. The frontend copy feeds
// the footer and policy pages; this one feeds the receipt. The two are
// separate files only because the backend cannot import from the Vite app —
// a change to the legal name, address or contact details must land in both,
// or the receipt and the website will disagree.
//
// Unverified values stay null rather than plausible-looking: a wrong GSTIN
// on a receipt is a compliance problem, not a typo.

export const company = {
  // Registered legal entity — what must appear on receipts.
  legalName: "Monani Business Services Private Limited",

  // Consumer-facing brand.
  brandName: "Jumpstride",

  address: {
    line1: "Opp. Hotel Natraj, MG Road",
    city: "Porbandar",
    postalCode: "360575",
    state: "Gujarat",
    country: "India",
  },

  email: "connect@jumpstride.in",

  phone: "+919409081798",
  phoneDisplay: "+91 94090 81798",

  // Not yet registered. The receipt prints a GSTIN line only when this is
  // set. Fill in from the GST paperwork — never guess.
  gstin: null,

  // Whether the receipt itemises "Taxable value" and "GST 18% (included)"
  // above the total. When false the receipt shows the total only.
  showGstBreakdown: true,
};

// "Opp. Hotel Natraj, MG Road, Porbandar - 360575, Gujarat"
export const formattedAddress = [
  company.address.line1,
  `${company.address.city} - ${company.address.postalCode}`,
  company.address.state,
].join(", ");

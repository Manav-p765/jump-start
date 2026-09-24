// Single source of truth for company, legal and contact details.
//
// These appear in the footer today, and payment-gateway compliance
// (Razorpay) requires the same registered-entity name, address and
// contact details to be reachable from the site — so they are defined
// once here rather than retyped into each page that needs them.
//
// Anything unverified belongs in the TODO block at the bottom, not
// inlined as a plausible-looking value: a wrong GSTIN or registered
// address on a payments page is a compliance problem, not a typo.

export const company = {
  // Registered legal entity. Distinct from the brand name below — the
  // legal entity is what must appear on invoices, policies and the
  // payment gateway's merchant record.
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

  // E.164 for tel: links; `phoneDisplay` is the human-readable form.
  phone: "+919409081798",
  phoneDisplay: "+91 94090 81798",
};

// "Opp. Hotel Natraj, MG Road, Porbandar - 360575, Gujarat"
export const formattedAddress = [
  company.address.line1,
  `${company.address.city} - ${company.address.postalCode}`,
  company.address.state,
].join(", ");

// mailto:/tel: hrefs, kept next to the values they derive from.
export const mailtoHref = `mailto:${company.email}`;
export const telHref = `tel:${company.phone}`;

// TODO(compliance): the following are referenced by Razorpay's merchant
// onboarding / policy-page requirements but have no confirmed value yet.
// Do not guess these — fill them in from the incorporation and GST
// paperwork.
//   - GSTIN
//   - CIN (Corporate Identity Number)
//   - Registered office address, if it differs from the address above
//   - Social profile URLs, if any are to be linked from the footer

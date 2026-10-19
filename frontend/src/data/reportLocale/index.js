// Report language. A report is rendered in the language of the test package
// it came from — a Gujarati-package report is fully Gujarati even when the
// site UI is in English — and the layout is identical in every language.
//
// The English locale is the identity: every string passes through unchanged
// and the formatters reproduce the report's existing English sentences, so
// English reports render exactly as before.

import { ensureLanguageBundle } from "../../i18n/i18n.js";

export const GUJARATI_REPORT_PACKAGE_IDS = Object.freeze([
  "complete-aptitude-500q-gujarati",
]);

export const reportLanguageFor = (report = {}) => {
  const packageId = String(report?.packageId || report?.metadata?.packageId || "");
  return GUJARATI_REPORT_PACKAGE_IDS.includes(packageId) ? "gu" : "en";
};

const identity = (value) => value;

export const englishReportLocale = {
  lang: "en",
  L: identity,
  C: identity,
  F: {
    reportHeader: (date) => `Career Assessment Report · ${date}`,
    reportEyebrow: (year) => `Career Discovery & Guidance Report${year ? ` · ${year}` : ""}`,
    archetypeLine: (title) => (/^the\b/i.test(title) ? title : `The ${title}`),
    idLine: (brand, id) => `${brand} ID: ${id}`,
    mbtiCallout: ({ top, topPct, second, description }) =>
      `${top} (${topPct}%) is your strongest signal${
        second ? `, combined with ${second}` : ""
      }. ${description || ""}`.trim(),
    oceanPill: (pct, level) => `${pct}% · ${level}`,
    hollandPill: (code, pct) => `${code} Profile${pct != null ? ` · ${pct}%` : ""}`,
    hollandCallout: (code) => `${code || "RIASEC"} Profile`,
    subjectOverall: (band) => `Overall subject pull${band ? ` · ${band}` : ""}`,
    activityLead: (band, pct) =>
      `${band} pull${pct != null ? ` (${pct}% consistency)` : ""} — `,
    matchBadge: (n) => `${n}% Match`,
    bestFitMatch: (n) => `${n}% match with your profile`,
    developingRow: (name, pct) => `${name} (${pct}%)`,
    note: ({ topTwoMi, code }) =>
      `${
        topTwoMi
          ? `Your strongest combination is a ${topTwoMi} intelligence profile`
          : "Your profile is still taking shape"
      }${code ? ` with an ${code} personality` : ""}. This report is a starting point — a mirror, not a map. Use it to have honest conversations with your parents, counsellors, and mentors. The right environment and guidance will unlock far more than these scores suggest.`,
    miShortJoin: (names) => names.join("–"),
    locale: "en",
  },
  formatDate: null, // StudentReport keeps its existing formatStudentDate
  misses: () => [],
};

export async function loadReportLocale(lang) {
  if (lang !== "gu") return englishReportLocale;
  const [{ createGujaratiReportLocale }] = await Promise.all([
    import("./gu/index.js"),
    // The page's t() strings must come from the Gujarati bundle even when
    // the site language is English.
    ensureLanguageBundle("gu"),
  ]);
  return createGujaratiReportLocale();
}

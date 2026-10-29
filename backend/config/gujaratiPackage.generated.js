// Gujarati edition of the 500-question Complete Aptitude package.
//
// This is a *derived* package — at module-load time it reads the
// English package and emits a new package object where every question's
// `text` field is populated from `text_gu` and `options` from
// `options_gu`. Section titles and the package chrome (title, badge,
// features, durationText) are translated inline below.
//
// Why derive rather than duplicate?
// ---------------------------------
// One source of truth for question content (the English bank). Any
// future correction / addition to the question bank lands in
// `comprehensive500Package.generated.js` and is automatically reflected
// here. The Gujarati translations themselves live alongside in
// text_gu / options_gu, so this file is essentially a swap-and-rename.
//
// Native Gujarati items
// ---------------------
// Section 4 lost its meaning in direct translation, so the client wrote
// replacement questions in Gujarati for every block except 4.3 Abstract
// (341-365). Those carry their own answer key in
// `correctOption_gu`, which replaces the English `correctOption` here; the
// question ids (and so the subsection scoring ranges) are unchanged.
//
// Live-test behaviour
// -------------------
// Livetest.jsx already prefers `text` and `options` for rendering, so
// once this package is selected the questions render in Gujarati
// without any frontend code path needing the i18n locale to be `gu`.
// The site UI stays English everywhere; only the test content is
// localised.

import COMPREHENSIVE_500_PACKAGE from "./comprehensive500Package.generated.js";

const SECTION_TITLES_GU = {
  1: "વ્યક્તિત્વ મૂલ્યાંકન",
  2: "બહુવિધ બુદ્ધિ મૂલ્યાંકન",
  3: "રૂચિ મૂલ્યાંકન",
  4: "યોગ્યતા કસોટી",
  5: "ભાવનાત્મક બુદ્ધિ મૂલ્યાંકન",
};

// Pick the Gujarati equivalent if the translation exists; otherwise
// fall back to the English string so a partially-translated bank still
// renders something readable (today the bank is 100% translated, but
// the fallback keeps this resilient if it ever drifts).
const pickGu = (gu, en) => {
  const trimmed = String(gu || "").trim();
  return trimmed.length ? trimmed : String(en || "");
};

const isNativeGu = (q) => String(q.correctOption_gu || "").trim().length > 0;

const guQuestion = (q) => ({
  ...q,
  // Carry the Gujarati translation into the primary fields. The
  // original English values stay alongside in case a future feature
  // needs to show both side-by-side.
  text: pickGu(q.text_gu, q.text),
  // A native item owns its whole option list; a translated item is
  // index-aligned with the English options it translates.
  options: isNativeGu(q)
    ? [...q.options_gu]
    : Array.isArray(q.options_gu) && q.options_gu.length
      ? q.options.map((en, i) => pickGu(q.options_gu[i], en))
      : Array.isArray(q.options)
        ? [...q.options]
        : [],
  correctOption: pickGu(q.correctOption_gu, q.correctOption),
});

const guSection = (section) => ({
  ...section,
  title: SECTION_TITLES_GU[section.sectionId] || section.title,
  questions: (section.questions || []).map(guQuestion),
});

const GUJARATI_PACKAGE = {
  id: "complete-aptitude-500q-gujarati",
  title: "Complete Aptitude Test - Gujarati (500Q)",
  badge: "ગુજરાતી",
  amount: 1999,
  strikeAmount: COMPREHENSIVE_500_PACKAGE.strikeAmount ?? null,
  features: [
    "500 પ્રશ્નો સંપૂર્ણ રીતે ગુજરાતીમાં",
    "સંપૂર્ણ 5-વિભાગીય મૂલ્યાંકન",
    "વિગતવાર વિભાગ અને પેટા-વિભાગ રિપોર્ટિંગ",
    "રિલીઝ પહેલાં નિષ્ણાતો દ્વારા સમીક્ષા કરાયેલ રિપોર્ટ",
  ],
  durationText: "120 મિનિટનું વ્યાપક મૂલ્યાંકન",
  active: true,
  // Show the Gujarati edition right after the English 500q card so
  // students see them side-by-side rather than the Gujarati card being
  // tucked behind the demo.
  sortOrder: (COMPREHENSIVE_500_PACKAGE.sortOrder ?? 0) + 1,
  sections: (COMPREHENSIVE_500_PACKAGE.sections || []).map(guSection),
};

export default GUJARATI_PACKAGE;

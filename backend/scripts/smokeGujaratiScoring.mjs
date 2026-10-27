#!/usr/bin/env node
// backend/scripts/smokeGujaratiScoring.mjs
//
// Comprehensive smoke-test for the Gujarati 500-question package.
// Mirrors the English smokeCareer500qScoring.mjs but also verifies:
//   – Every question carries Gujarati text (Unicode block 0A80–0AFF)
//   – Answer keys are identical to the English package
//   – MIRROR questions preserve English options
//   – Scoring produces valid results across all three scenarios
//   – Section shapes match the expected 120/80/90/160/50 distribution
//
// Usage:
//   node scripts/smokeGujaratiScoring.mjs

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import guPkg from "../config/gujaratiPackage.generated.js";
import enPkg from "../config/comprehensive500Package.generated.js";
import { scoreCareer500QPackage } from "../utils/scoring/packageScoring/career500q.js";
import { isManualReviewRequired } from "../utils/scoring/specs/career500qEvaluationSpec.js";

// ---------------------------------------------------------------------------
// Constants & helpers
// ---------------------------------------------------------------------------
const GUJARATI_RE = /[\u0A80-\u0AFF]/;
const EXPECTED_TOTAL = 500;
const EXPECTED_SHAPE = [120, 80, 90, 160, 50];
// Section 4 except Abstract (341-365) is native Gujarati with its own answer
// key (135 items); Abstract + Spatial (341-390) keep English option labels.
const EXPECTED_MIRROR_COUNT = 50;
const EXPECTED_NATIVE_COUNT = 135;
const LIKERT_LETTERS = ["A", "B", "C", "D", "E", "F"];

const here = path.dirname(fileURLToPath(import.meta.url));
const GU_SOURCE_DIR = path.join(here, "gu");

let passCount = 0;
let failCount = 0;
const failures = [];

const assert = (condition, message, detail = "") => {
  if (condition) {
    passCount++;
    console.log(`  [PASS] ${message}${detail ? ` — ${detail}` : ""}`);
  } else {
    failCount++;
    const msg = `${message}${detail ? ` — ${detail}` : ""}`;
    failures.push(msg);
    console.error(`  [FAIL] ${msg}`);
  }
};

const questionsOf = (pkgObj) =>
  (pkgObj?.sections || []).flatMap((s) => s.questions || []);

const questionById = (pkgObj, id) =>
  questionsOf(pkgObj).find((q) => String(q.questionId) === String(id)) || null;

const shapeOf = (pkgObj) =>
  (pkgObj?.sections || []).map((s) => (s.questions || []).length);

const trunc = (s, n) => {
  const t = String(s ?? "").replace(/\s+/g, " ").trim();
  return t.length > n ? `${t.slice(0, n)}…` : t;
};

const pickWrongOption = (question) => {
  const correct = String(question.correctOption || "").trim().toUpperCase();
  if (!correct) return "A";
  const options = Array.isArray(question.options) ? question.options : [];
  const totalLetters = Math.max(options.length, 2);
  for (let i = 0; i < totalLetters && i < LIKERT_LETTERS.length; i += 1) {
    const letter = LIKERT_LETTERS[i];
    if (letter !== correct) return letter;
  }
  return correct === "A" ? "B" : "A";
};

const buildAnswers = (pkgDoc, scenario) => {
  const answers = {};
  for (const section of pkgDoc.sections || []) {
    (section.questions || []).forEach((question, index) => {
      const key = `${section.sectionId}-${index}`;
      if (question.type === "likert") {
        if (scenario === "all-correct") answers[key] = 5;
        else if (scenario === "all-wrong") answers[key] = 1;
        else answers[key] = index % 2 === 0 ? 4 : 5;
        return;
      }
      if (scenario === "all-correct") {
        answers[key] = question.correctOption || "A";
      } else if (scenario === "all-wrong") {
        answers[key] = pickWrongOption(question);
      } else {
        answers[key] = question.correctOption || "A";
      }
    });
  }
  return answers;
};

const readMirrorIds = () => {
  const ids = new Set();
  const nativeAnswers = new Map();
  let seen = 0;
  for (let i = 1; i <= 5; i += 1) {
    const f = path.join(GU_SOURCE_DIR, `section${i}.json`);
    if (!fs.existsSync(f)) {
      console.error(`  [WARN] Missing gu source file: ${f}`);
      continue;
    }
    const entries = JSON.parse(fs.readFileSync(f, "utf8"));
    for (const [key, value] of Object.entries(entries)) {
      seen += 1;
      if (value && value.o === "MIRROR") ids.add(String(key));
      if (value && value.a) nativeAnswers.set(String(key), String(value.a).trim().toUpperCase());
    }
  }
  return { ids, seen, nativeAnswers };
};

// ============================================================================
console.log("=".repeat(72));
console.log("  GUJARATI PACKAGE SMOKE TEST");
console.log("=".repeat(72));
console.log(`  Package ID : ${guPkg.id}`);
console.log(`  Title      : ${guPkg.title}`);
console.log(`  Badge      : ${guPkg.badge}`);
console.log(`  Amount     : ₹${guPkg.amount}`);
console.log(`  Duration   : ${guPkg.durationText}`);
console.log(`  Sections   : ${(guPkg.sections || []).length}`);
console.log();

// ============================================================================
// 1. STRUCTURAL CHECKS
// ============================================================================
console.log("─".repeat(72));
console.log("  1. STRUCTURAL CHECKS");
console.log("─".repeat(72));

const guQuestions = questionsOf(guPkg);
const enQuestions = questionsOf(enPkg);
const guShape = shapeOf(guPkg);

assert(
  guPkg.id === "complete-aptitude-500q-gujarati",
  "Package ID is correct",
  guPkg.id
);

assert(
  guQuestions.length === EXPECTED_TOTAL,
  `Total questions === ${EXPECTED_TOTAL}`,
  `got ${guQuestions.length}`
);

assert(
  guShape.length === EXPECTED_SHAPE.length &&
    guShape.every((n, i) => n === EXPECTED_SHAPE[i]),
  `Section shape === ${EXPECTED_SHAPE.join("/")}`,
  `got ${guShape.join("/")}`
);

const guIds = guQuestions.map((q) => String(q.questionId));
assert(
  new Set(guIds).size === guIds.length,
  "All question IDs are unique",
  `${new Set(guIds).size} unique of ${guIds.length}`
);

assert(
  (guPkg.sections || []).every((s) => s.title && s.title.length > 0),
  "All sections have titles",
  (guPkg.sections || []).map((s) => `S${s.sectionId}: "${s.title}"`).join(", ")
);

// ============================================================================
// 2. GUJARATI TRANSLATION CHECKS
// ============================================================================
console.log();
console.log("─".repeat(72));
console.log("  2. GUJARATI TRANSLATION CHECKS");
console.log("─".repeat(72));

// Section titles should be in Gujarati
const guSectionTitles = (guPkg.sections || []).map((s) => s.title);
const guTitleCount = guSectionTitles.filter((t) => GUJARATI_RE.test(t)).length;
assert(
  guTitleCount === 5,
  "All 5 section titles contain Gujarati script",
  `${guTitleCount}/5 are Gujarati`
);

// Count how many questions have Gujarati text
const { ids: mirrorIds, nativeAnswers } = readMirrorIds();

assert(
  mirrorIds.size === EXPECTED_MIRROR_COUNT,
  `gu source has ${EXPECTED_MIRROR_COUNT} MIRROR markers`,
  `found ${mirrorIds.size}`
);
let guTextCount = 0;
let nonGuTextCount = 0;
const nonGuTextSamples = [];

for (const q of guQuestions) {
  const qid = String(q.questionId);
  if (GUJARATI_RE.test(String(q.text || ""))) {
    guTextCount++;
  } else {
    nonGuTextCount++;
    if (nonGuTextSamples.length < 5) {
      nonGuTextSamples.push({
        id: qid,
        text: trunc(q.text, 40),
        isMirror: mirrorIds.has(qid),
      });
    }
  }
}

// Non-MIRROR questions should have Gujarati text.
// MIRROR questions (abstract/spatial/mechanical) keep English text since they are visual.
const nonMirrorTotal = guQuestions.length - mirrorIds.size;
const nonMirrorWithGu = guQuestions.filter(
  (q) => !mirrorIds.has(String(q.questionId)) && GUJARATI_RE.test(String(q.text || ""))
).length;

assert(
  nonMirrorWithGu === nonMirrorTotal,
  `Non-MIRROR questions have Gujarati text`,
  `${nonMirrorWithGu}/${nonMirrorTotal} translated`
);

console.log(`    Total with Gujarati text: ${guTextCount}/${guQuestions.length}`);
console.log(`    MIRROR (English-retained): ${mirrorIds.size}`);
if (nonGuTextSamples.length > 0) {
  console.log(`    Sample non-Gujarati questions:`);
  for (const s of nonGuTextSamples) {
    console.log(`      id=${s.id} mirror=${s.isMirror} text="${s.text}"`);
  }
}

// Check that MIRROR ids keep English options
let mirrorLeaked = 0;
let mirrorMismatch = 0;
for (const q of guQuestions) {
  const qid = String(q.questionId);
  if (!mirrorIds.has(qid)) continue;
  const opts = q.options || [];
  if (opts.some((o) => GUJARATI_RE.test(String(o)))) mirrorLeaked++;
  const en = questionById(enPkg, qid);
  if (en && JSON.stringify(en.options || []) !== JSON.stringify(opts)) mirrorMismatch++;
}

assert(
  mirrorLeaked === 0,
  "MIRROR questions carry no Gujarati options",
  mirrorLeaked ? `${mirrorLeaked} leaked` : `${mirrorIds.size} checked`
);

assert(
  mirrorMismatch === 0,
  "MIRROR questions options match English",
  mirrorMismatch ? `${mirrorMismatch} differ` : `${mirrorIds.size} compared`
);

// ============================================================================
// 3. ANSWER KEY PARITY
// ============================================================================
console.log();
console.log("─".repeat(72));
console.log("  3. ANSWER KEYS (native Gujarati key, else English parity)");
console.log("─".repeat(72));

assert(
  nativeAnswers.size === EXPECTED_NATIVE_COUNT,
  `gu source has ${EXPECTED_NATIVE_COUNT} native answer keys`,
  `found ${nativeAnswers.size}`
);

const nativeDrift = [];
const nativeOptionProblems = [];
for (const [qid, letter] of nativeAnswers) {
  const q = questionById(guPkg, qid);
  if (!q || String(q.correctOption ?? "") !== letter) nativeDrift.push(qid);
  const opts = q?.options || [];
  const idx = letter.charCodeAt(0) - 65;
  if (!String(opts[idx] ?? "").trim()) nativeOptionProblems.push(qid);
}
assert(
  nativeDrift.length === 0,
  "Native items score against the Gujarati answer key",
  nativeDrift.length ? `drift: ${nativeDrift.slice(0, 10).join(",")}` : `${nativeAnswers.size} checked`
);
assert(
  nativeOptionProblems.length === 0,
  "Native items: answer letter points at an option",
  nativeOptionProblems.length ? `bad: ${nativeOptionProblems.slice(0, 10).join(",")}` : `${nativeAnswers.size} checked`
);

let keyDriftCount = 0;
const keyDriftSamples = [];
for (const guQ of guQuestions) {
  if (nativeAnswers.has(String(guQ.questionId))) continue;
  const enQ = questionById(enPkg, guQ.questionId);
  if (enQ && String(enQ.correctOption ?? "") !== String(guQ.correctOption ?? "")) {
    keyDriftCount++;
    if (keyDriftSamples.length < 5) {
      keyDriftSamples.push({
        id: guQ.questionId,
        en: enQ.correctOption,
        gu: guQ.correctOption,
      });
    }
  }
}

assert(
  keyDriftCount === 0,
  `correctOption matches English for the other ${guQuestions.length - nativeAnswers.size}`,
  keyDriftCount ? `${keyDriftCount} drifted` : "no drift"
);

if (keyDriftSamples.length > 0) {
  console.log(`    Drifted answer keys:`);
  for (const s of keyDriftSamples) {
    console.log(`      id=${s.id} en=${s.en} gu=${s.gu}`);
  }
}

// ============================================================================
// 4. SCORING — THREE SCENARIOS
// ============================================================================
console.log();
console.log("─".repeat(72));
console.log("  4. SCORING SCENARIOS");
console.log("─".repeat(72));

const VALID_ARCHETYPES = new Set([
  "INTJ", "INTP", "ENTJ", "ENTP",
  "INFJ", "INFP", "ENFJ", "ENFP",
  "ISTJ", "ISFJ", "ESTJ", "ESFJ",
  "ISTP", "ISFP", "ESTP", "ESFP",
]);

const scenarioResults = {};

for (const scenario of ["all-correct", "all-wrong", "mixed"]) {
  console.log();
  console.log(`  ── Scenario: ${scenario.toUpperCase()} ──`);
  const answers = buildAnswers(guPkg, scenario);
  const result = scoreCareer500QPackage(answers, guPkg.sections);

  scenarioResults[scenario] = result;

  if (!result) {
    failCount++;
    failures.push(`${scenario}: scorer returned null`);
    console.error(`  [FAIL] Scorer returned null for ${scenario}`);
    continue;
  }

  assert(
    result.completionStatus === "Complete",
    `${scenario}: completionStatus === "Complete"`,
    `got "${result.completionStatus}"`
  );

  assert(
    result.completedSections === 5 && result.totalSections === 5,
    `${scenario}: completed 5/5 sections`,
    `got ${result.completedSections}/${result.totalSections}`
  );

  console.log(`    Overall Score: ${result.overallScore}`);
  console.log(`    Personality Type: ${result.personalityType?.code || "N/A"}`);
  console.log(
    `    Sections:`,
    (result.sectionBreakdown || [])
      .map((s) => `S${s.sectionId}=${s.percentage}%`)
      .join(", ")
  );

  // Career recommendations
  const careers = result.careerRecommendations || [];
  console.log(`    Career recommendations: ${careers.length}`);
  if (careers.length > 0) {
    console.log(`    Top 3 careers:`);
    for (const c of careers.slice(0, 3)) {
      console.log(`      ${c.title} (score: ${c.score})`);
    }
  }

  // Unique career titles
  if (careers.length > 0) {
    const uniqueTitles = new Set(careers.map((c) => c.title));
    assert(
      uniqueTitles.size === careers.length,
      `${scenario}: no duplicate career recommendations`,
      `${uniqueTitles.size} unique of ${careers.length}`
    );
  }

  // Manual review items
  const reviewItems = result.manualReviewItems || [];
  console.log(`    Manual review items: ${reviewItems.length}`);
  console.log(`    Has unreviewed: ${result.hasUnreviewedItems}`);

  // Personality profile
  const p = result.personalityProfile;
  if (p) {
    assert(
      VALID_ARCHETYPES.has(String(p.mbtiType || "")),
      `${scenario}: valid MBTI type`,
      `${p.mbtiType}`
    );

    assert(
      p.assertiveness === "Assertive" || p.assertiveness === "Turbulent",
      `${scenario}: valid assertiveness`,
      `${p.assertiveness}`
    );

    assert(
      /^[EI][NS][FT][JP]-[AT]$/.test(String(p.personalityType || "")),
      `${scenario}: personalityType format XXXX-A/T`,
      `${p.personalityType}`
    );

    assert(
      Boolean(p.archetypeName) && Boolean(p.archetypeDescription),
      `${scenario}: archetype name + description non-empty`
    );

    const ocean = p.oceanProfile || {};
    const VALID_BANDS = new Set(["Low", "Moderate", "High", "Not Measured"]);
    for (const trait of ["openness", "conscientiousness", "extraversion", "agreeableness", "neuroticism"]) {
      const t = ocean[trait];
      if (t) {
        assert(
          VALID_BANDS.has(String(t.band)),
          `${scenario}: OCEAN ${trait} band valid`,
          `${t.band} (score: ${t.score})`
        );
      }
    }

    assert(
      Array.isArray(ocean.dominantTraits) && ocean.dominantTraits.length >= 1,
      `${scenario}: OCEAN has dominant traits`,
      `[${(ocean.dominantTraits || []).join(", ")}]`
    );

    assert(
      Array.isArray(p.hspqSignature) && p.hspqSignature.length === 3,
      `${scenario}: HSPQ signature has 3 entries`,
      `length=${(p.hspqSignature || []).length}`
    );

    const ws = p.workStyle || {};
    assert(
      Boolean(ws.dominantStyle),
      `${scenario}: workStyle.dominantStyle non-empty`,
      `${ws.dominantStyle}`
    );
    if (ws.dominantStyle !== "Not Measured") {
      assert(
        Number(ws.consistency) > 0,
        `${scenario}: workStyle.consistency > 0`,
        `${ws.consistency}`
      );
    }
  } else {
    failCount++;
    failures.push(`${scenario}: personalityProfile is null`);
    console.error(`  [FAIL] ${scenario}: personalityProfile is null`);
  }
}

// ============================================================================
// 5. SCORE SPREAD VALIDATION
// ============================================================================
console.log();
console.log("─".repeat(72));
console.log("  5. SCORE SPREAD VALIDATION");
console.log("─".repeat(72));

const correctScore = Number(scenarioResults["all-correct"]?.overallScore || 0);
const wrongScore = Number(scenarioResults["all-wrong"]?.overallScore || 0);
const mixedScore = Number(scenarioResults["mixed"]?.overallScore || 0);
const spread = Math.abs(correctScore - wrongScore);

assert(
  correctScore > 70,
  "All-correct overall score > 70",
  `${correctScore}`
);

assert(
  wrongScore < 40,
  "All-wrong overall score < 40",
  `${wrongScore}`
);

assert(
  spread >= 30,
  "All-correct vs all-wrong spread >= 30",
  `spread=${spread.toFixed(1)} (${correctScore} - ${wrongScore})`
);

console.log(`    All-correct : ${correctScore}`);
console.log(`    All-wrong   : ${wrongScore}`);
console.log(`    Mixed       : ${mixedScore}`);
console.log(`    Spread      : ${spread.toFixed(1)}`);

// ============================================================================
// 6. SECTION-4 MANUAL REVIEW AUDIT
// ============================================================================
console.log();
console.log("─".repeat(72));
console.log("  6. SECTION-4 MANUAL REVIEW AUDIT");
console.log("─".repeat(72));

const section4 = guPkg.sections.find((s) => Number(s.sectionId) === 4);
const section4Questions = section4?.questions || [];
const section4Missing = section4Questions.filter((q) => isManualReviewRequired(q));
const section4WithKey = section4Questions.filter((q) => !isManualReviewRequired(q));

console.log(`    Total Section 4 questions  : ${section4Questions.length}`);
console.log(`    With valid answer key       : ${section4WithKey.length}`);
console.log(`    Missing key (→ review)      : ${section4Missing.length}`);

for (const scenario of ["all-correct", "all-wrong", "mixed"]) {
  const result = scenarioResults[scenario];
  if (!result) continue;
  const items = result.manualReviewItems || [];
  assert(
    items.length === section4Missing.length,
    `${scenario}: manualReviewItems.length === ${section4Missing.length}`,
    `got ${items.length}`
  );
}

// ============================================================================
// 7. GUJARATI METADATA VALIDATION
// ============================================================================
console.log();
console.log("─".repeat(72));
console.log("  7. GUJARATI PACKAGE METADATA");
console.log("─".repeat(72));

assert(
  GUJARATI_RE.test(guPkg.badge || ""),
  "Badge contains Gujarati script",
  `"${guPkg.badge}"`
);

assert(
  Array.isArray(guPkg.features) && guPkg.features.length > 0,
  "Features array is non-empty",
  `${(guPkg.features || []).length} features`
);

const guFeatureCount = (guPkg.features || []).filter((f) => GUJARATI_RE.test(f)).length;
assert(
  guFeatureCount === (guPkg.features || []).length,
  "All features contain Gujarati text",
  `${guFeatureCount}/${(guPkg.features || []).length}`
);

assert(
  GUJARATI_RE.test(guPkg.durationText || ""),
  "durationText contains Gujarati script",
  `"${guPkg.durationText}"`
);

assert(
  guPkg.amount === 1999,
  "Price is ₹1999",
  `₹${guPkg.amount}`
);

// ============================================================================
// FINAL REPORT
// ============================================================================
console.log();
console.log("=".repeat(72));
console.log("  FINAL REPORT");
console.log("=".repeat(72));
console.log(`    Total assertions : ${passCount + failCount}`);
console.log(`    Passed           : ${passCount}`);
console.log(`    Failed           : ${failCount}`);
console.log();

if (failCount === 0) {
  console.log("  ✅ ALL GUJARATI PACKAGE TESTS PASSED");
} else {
  console.error("  ❌ SOME TESTS FAILED:");
  for (const f of failures) {
    console.error(`    • ${f}`);
  }
  process.exitCode = 1;
}

console.log();
console.log("=".repeat(72));

// Output structured JSON for programmatic consumption
const jsonReport = {
  package: {
    id: guPkg.id,
    title: guPkg.title,
    totalQuestions: guQuestions.length,
    sectionShape: guShape.join("/"),
    mirrorCount: mirrorIds.size,
  },
  translation: {
    gujaratiTextQuestions: guTextCount,
    nonGujaratiTextQuestions: nonGuTextCount,
    nonMirrorWithGujarati: `${nonMirrorWithGu}/${nonMirrorTotal}`,
    mirrorLeaked: mirrorLeaked,
    mirrorMismatch: mirrorMismatch,
    answerKeyDrift: keyDriftCount,
  },
  scoring: Object.fromEntries(
    Object.entries(scenarioResults).map(([k, v]) => [
      k,
      v
        ? {
            overallScore: v.overallScore,
            completionStatus: v.completionStatus,
            completedSections: v.completedSections,
            personalityType: v.personalityType?.code,
            mbtiType: v.personalityProfile?.mbtiType,
            topCareers: (v.careerRecommendations || [])
              .slice(0, 5)
              .map((c) => ({ title: c.title, score: c.score })),
            manualReviewItems: (v.manualReviewItems || []).length,
          }
        : null,
    ])
  ),
  assertions: {
    total: passCount + failCount,
    passed: passCount,
    failed: failCount,
    failures,
  },
};

console.log(JSON.stringify(jsonReport, null, 2));

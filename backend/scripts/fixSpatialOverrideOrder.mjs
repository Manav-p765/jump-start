// Patch Section 4.4 Spatial Relations (ids 366-390) in
// backend/config/comprehensive500Package.generated.js so every question's
// text and answer key match the booklet figure it displays.
//
// Why this exists: the generator applied LIVE_SPATIAL_RELATIONS_OVERRIDES by
// array position, but the bank lists id 381 (booklet #25) last, so ids
// 381-390 each carried the NEXT question's text and key while the frontend
// shows images by id (question-media/spatial/q0NN). Seven keys were wrong
// (382, 384, 385, 386, 387, 388, 390). The override export is now sorted by
// liveQuestionId; this script fixes the already-generated file in place
// (re-running the generator would drop later patches - work-style,
// mechanical booklet, math operators).
//
// Only `text` and `correctOption` change - spatial options render as A-D
// images, so their labels are unused. Gujarati fields are left alone (the
// Gujarati package already carries the image-aligned key in correctOption_gu).
// Idempotent: a second run reports 0 changes.
//
// Run with:
//   node scripts/fixSpatialOverrideOrder.mjs
// then push the English package to the database:
//   MONGODB_URI=... node scripts/syncEnglishSpatialQuestions.mjs [--write]

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { SPATIAL_PDF_QUESTION_BANK } from "../config/spatialPdfQuestionBank.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const PKG_PATH = path.resolve(here, "..", "config", "comprehensive500Package.generated.js");

const pkg = JSON.parse(JSON.stringify((await import(pathToFileURL(PKG_PATH).href)).default));
const bankById = new Map(
  SPATIAL_PDF_QUESTION_BANK.filter((q) => q.liveQuestionId >= 366 && q.liveQuestionId <= 390).map(
    (q) => [String(q.liveQuestionId), q]
  )
);
if (bankById.size !== 25) throw new Error(`expected 25 spatial bank entries, got ${bankById.size}`);

const section4 = pkg.sections.find((s) => Number(s.sectionId) === 4);
let changed = 0;
for (const question of section4.questions) {
  const bank = bankById.get(String(question.questionId));
  if (!bank) continue;
  if (question.text !== bank.text || question.correctOption !== bank.correctOption) {
    console.log(
      `  ${question.questionId}: ${question.correctOption} "${question.text}"\n` +
        `      -> ${bank.correctOption} "${bank.text}"`
    );
    question.text = bank.text;
    question.correctOption = bank.correctOption;
    changed += 1;
  }
}

if (!changed) {
  console.log("[spatial] already aligned - nothing to do");
} else {
  const header = [
    "// AUTO-GENERATED — comprehensive 500-question package with Gujarati translations.",
    "// Regenerate via:  npm run translate:questions:gu  OR  node scripts/applyGujaratiTranslations.mjs",
    `// Last updated: ${new Date().toISOString()}`,
    "",
  ].join("\n");
  fs.writeFileSync(PKG_PATH, `${header}\nconst PACKAGE = ${JSON.stringify(pkg, null, 2)};\n\nexport default PACKAGE;\n`, "utf8");
  console.log(`[spatial] patched ${changed} questions in ${PKG_PATH}`);
}

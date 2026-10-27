// Apply inline Gujarati translations to comprehensive500Package.generated.js.
//
// Reads section translation files at backend/scripts/gu/section{1..5}.json.
// Each file is a flat map { "<questionId>": { "t": "...", "o": [...] | "MIRROR" } }
// where:
//   t = translated stem (becomes question.text_gu)
//   o = translated options array → question.options_gu, OR
//       the literal string "MIRROR" → copy question.options into options_gu
//       (used for Section 4 aptitude items where the options are numbers,
//        symbols, or English-vocabulary tokens that must not be translated)
//   o omitted     → options_gu stays [] (Likert items render section-level scale)
//   a = answer letter for a question rewritten natively in Gujarati (not a
//       translation of the English item) → question.correctOption_gu. The
//       Gujarati package scores against it; omitted → the English key applies.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const BACKEND_ROOT = path.resolve(__dirname, "..");
const PACKAGE_PATH = path.join(BACKEND_ROOT, "config", "comprehensive500Package.generated.js");
const GU_DIR = path.join(__dirname, "gu");

async function loadPackage() {
  const mod = await import(pathToFileURL(PACKAGE_PATH).href);
  const pkg = mod.default || mod;
  return JSON.parse(JSON.stringify(pkg));
}

function writePackage(pkg) {
  const body =
    `// AUTO-GENERATED — comprehensive 500-question package with Gujarati translations.\n` +
    `// Regenerate via:  npm run translate:questions:gu  OR  node scripts/applyGujaratiTranslations.mjs\n` +
    `// Last updated: ${new Date().toISOString()}\n\n` +
    `const PACKAGE = ${JSON.stringify(pkg, null, 2)};\n\n` +
    `export default PACKAGE;\n`;
  fs.writeFileSync(PACKAGE_PATH, body, "utf8");
}

function loadSectionTranslations(sectionNumber) {
  const file = path.join(GU_DIR, `section${sectionNumber}.json`);
  if (!fs.existsSync(file)) {
    throw new Error(`Missing translation file: ${file}`);
  }
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

async function main() {
  console.log("[apply:gu] loading package…");
  const pkg = await loadPackage();
  let applied = 0;
  let missing = 0;

  pkg.sections.forEach((section, idx) => {
    const sectionNumber = idx + 1;
    const translations = loadSectionTranslations(sectionNumber);
    (section.questions || []).forEach((question) => {
      const entry = translations[question.questionId];
      if (!entry) {
        missing++;
        return;
      }
      question.text_gu = entry.t || "";
      if (entry.o === "MIRROR") {
        question.options_gu = Array.isArray(question.options)
          ? [...question.options]
          : [];
      } else if (Array.isArray(entry.o)) {
        question.options_gu = entry.o;
      } else {
        question.options_gu = [];
      }
      if (entry.a) {
        question.correctOption_gu = String(entry.a).trim().toUpperCase();
      } else {
        delete question.correctOption_gu;
      }
      applied++;
    });
    const populated = section.questions.filter((q) => q.text_gu).length;
    console.log(
      `[apply:gu] S${sectionNumber} ${section.title}: ${populated}/${section.questions.length} translated`
    );
  });

  console.log(`[apply:gu] applied=${applied} missing=${missing}`);
  writePackage(pkg);
  console.log(`[apply:gu] wrote ${PACKAGE_PATH}`);
}

main().catch((err) => {
  console.error("[apply:gu] fatal:", err);
  process.exit(1);
});

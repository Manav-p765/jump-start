#!/usr/bin/env node
// backend/scripts/syncEnglishSpatialQuestions.mjs
//
// Push the corrected Section 4.4 Spatial Relations questions (ids 366-390:
// `text` + `correctOption`) from config/comprehensive500Package.generated.js
// into the AssessmentConfig doc, for the English 500Q package and the demo
// package built from it. See scripts/fixSpatialOverrideOrder.mjs for the bug.
//
// Boot-time seeding does not pick this up on its own: syncSeededSectionQuestions
// only compares Section 4 ids 391-430.
//
// SAFETY
//   * Dry run by default; --write performs one cfg.save().
//   * MONGODB_URI must come from the environment (no dotenv fallback).
//   * Only text/correctOption of ids 366-390 may change; every other field of
//     every package is deep-compared before the save. The Gujarati package is
//     never touched (it has its own image-aligned key).
//
// USAGE
//   MONGODB_URI="mongodb://..." node scripts/syncEnglishSpatialQuestions.mjs
//   MONGODB_URI="mongodb://..." node scripts/syncEnglishSpatialQuestions.mjs --write

import mongoose from "mongoose";
import AssessmentConfig from "../models/AssessmentConfig.js";
import ENGLISH_PACKAGE from "../config/comprehensive500Package.generated.js";

const WRITE = process.argv.includes("--write");
const TARGET_IDS = ["complete-aptitude-500q", "demo-aptitude-50q"];
const isSpatial = (id) => Number(id) >= 366 && Number(id) <= 390;

const fail = (msg) => {
  console.error(`ABORT: ${msg}`);
  process.exit(1);
};

const MONGODB_URI = String(process.env.MONGODB_URI || "").trim();
if (!MONGODB_URI) fail("MONGODB_URI is not set.");

const source = new Map();
for (const section of ENGLISH_PACKAGE.sections) {
  for (const q of section.questions) {
    if (isSpatial(q.questionId)) source.set(String(q.questionId), q);
  }
}
if (source.size !== 25) fail(`expected 25 spatial questions in the bundle, got ${source.size}`);

await mongoose.connect(MONGODB_URI);
try {
  console.log(`database: ${mongoose.connection.name} | mode: ${WRITE ? "WRITE" : "DRY-RUN"}`);
  const cfg = await AssessmentConfig.findOne({ key: "default" });
  if (!cfg) fail('AssessmentConfig { key: "default" } not found');

  const before = JSON.parse(JSON.stringify(cfg.toObject().packages));
  let changes = 0;
  for (const pkg of cfg.packages) {
    if (!TARGET_IDS.includes(pkg.id)) continue;
    for (const section of pkg.sections || []) {
      for (const q of section.questions || []) {
        const src = source.get(String(q.questionId));
        if (!src) continue;
        if (q.text !== src.text || q.correctOption !== src.correctOption) {
          console.log(`  ${pkg.id} ${q.questionId}: ${q.correctOption} -> ${src.correctOption} | "${src.text}"`);
          q.text = src.text;
          q.correctOption = src.correctOption;
          changes += 1;
        }
      }
    }
  }

  // Nothing but text/correctOption of spatial ids in target packages may differ.
  const after = JSON.parse(JSON.stringify(cfg.toObject().packages));
  const strip = (pkgs) =>
    pkgs.map((p) => ({
      ...p,
      sections: (p.sections || []).map((s) => ({
        ...s,
        questions: (s.questions || []).map((q) =>
          TARGET_IDS.includes(p.id) && isSpatial(q.questionId)
            ? { ...q, text: null, correctOption: null }
            : q
        ),
      })),
    }));
  if (JSON.stringify(strip(before)) !== JSON.stringify(strip(after))) {
    fail("unexpected change outside spatial text/correctOption - nothing written");
  }

  console.log(`${changes} question(s) to update`);
  if (!changes) {
    console.log("already in sync");
  } else if (WRITE) {
    cfg.markModified("packages");
    await cfg.save();
    const check = await AssessmentConfig.findOne({ key: "default" }).lean();
    const stale = check.packages
      .filter((p) => TARGET_IDS.includes(p.id))
      .flatMap((p) => p.sections.flatMap((s) => s.questions))
      .filter((q) => source.has(String(q.questionId)))
      .filter((q) => q.correctOption !== source.get(String(q.questionId)).correctOption);
    if (stale.length) fail(`post-write check failed: ${stale.map((q) => q.questionId).join(",")}`);
    console.log("WRITTEN - post-write verification passed");
  } else {
    console.log("DRY-RUN - nothing written. Re-run with --write to apply.");
  }
} finally {
  await mongoose.disconnect();
}

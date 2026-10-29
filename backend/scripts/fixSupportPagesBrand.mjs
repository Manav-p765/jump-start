#!/usr/bin/env node
// Replace the old brand name "Jumpstart" with "Jumpstride" in the stored
// support pages (Privacy Policy, Terms of Service, FAQs). The code defaults in
// models/AssessmentConfig.js were rebranded already, but the copies saved in
// the AssessmentConfig doc (editable from Admin > Settings) were not.
//
// Only whole-word "Jumpstart" is replaced (so "Jumpstride" and ids such as
// "jumpstartId" are untouched). Dry run by default.
//
//   MONGODB_URI="mongodb://..." node scripts/fixSupportPagesBrand.mjs [--write]

import mongoose from "mongoose";
import AssessmentConfig from "../models/AssessmentConfig.js";

const WRITE = process.argv.includes("--write");
const MONGODB_URI = String(process.env.MONGODB_URI || "").trim();
if (!MONGODB_URI) {
  console.error("ABORT: MONGODB_URI is not set.");
  process.exit(1);
}

const OLD = /\bJumpstart\b/g;
const rebrand = (value) => {
  if (typeof value === "string") return value.replace(OLD, "Jumpstride");
  if (Array.isArray(value)) return value.map(rebrand);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, rebrand(v)]));
  }
  return value;
};

await mongoose.connect(MONGODB_URI);
try {
  const cfg = await AssessmentConfig.findOne({ key: "default" });
  if (!cfg) throw new Error('AssessmentConfig { key: "default" } not found');
  const before = cfg.toObject().supportPages || {};
  const after = rebrand(before);
  const count = (JSON.stringify(before).match(OLD) || []).length;
  console.log(`database: ${mongoose.connection.name} | "Jumpstart" occurrences: ${count}`);
  if (!count) {
    console.log("nothing to change");
  } else if (WRITE) {
    cfg.supportPages = after;
    cfg.markModified("supportPages");
    await cfg.save();
    const left = (JSON.stringify((await AssessmentConfig.findOne({ key: "default" }).lean()).supportPages).match(OLD) || []).length;
    if (left) throw new Error(`${left} occurrence(s) remain after write`);
    console.log("WRITTEN - verified");
  } else {
    console.log("DRY-RUN - re-run with --write to apply");
  }
} finally {
  await mongoose.disconnect();
}

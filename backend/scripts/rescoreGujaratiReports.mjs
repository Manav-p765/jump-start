// Re-score stored Gujarati 500Q reports with the dedicated 500Q scorer.
//
// Why
// ---
// Until the scoring dispatch learned about the Gujarati edition, reports for
// "complete-aptitude-500q-gujarati" fell through to the generic heuristic
// scorer (algorithmKey "generic-profile"): empty subsections, flat 50%
// strengths, identical career matches. Every report stores the exact answer
// set it was scored from (assessmentReports[].rawAnswers), so it can be
// re-scored faithfully.
//
// What it does
// ------------
// For every Gujarati report whose profile was not produced by the 500Q
// scorer, re-runs computeAssessmentResult on rawAnswers + the package's
// enabled sections (same inputs as the submit path) and prints old vs new
// overall and per-section scores.
//
//   node scripts/rescoreGujaratiReports.mjs                # dry run (default)
//   node scripts/rescoreGujaratiReports.mjs --write        # apply
//   node scripts/rescoreGujaratiReports.mjs --report=<id>  # one report only
//
// With --write, each re-scored report gets the new profile, the new Section 4
// manual-review queue, scoringVersion/normVersion, and the flag fields
// rescoredAt + rescoredFrom (old scorer + old scores) that the admin
// submissions list and review page surface. publication (status, approval
// date, approver) is left exactly as it was.
//
// Idempotent: reports already scored by the 500Q scorer are skipped, so a
// second run changes nothing. Output carries report ids and Jumpstride IDs
// only, no names or emails. The dry run performs no writes at all.

import "dotenv/config";
import path from "node:path";
import { fileURLToPath } from "node:url";
import mongoose from "mongoose";
import { ensureRequiredEnv } from "../config/env.js";
import AssessmentConfig from "../models/AssessmentConfig.js";
import User from "../models/User.js";
import { computeAssessmentResult } from "../utils/scoring/index.js";
import { CAREER_500Q_CONFIG } from "../utils/scoring/configs/career500q.config.js";
import {
  CURRENT_NORM_VERSION,
  cloneManualReviewItems,
  cloneResultProfile,
  computeHasUnreviewedItems,
  syncLegacyStateFromReports,
} from "../utils/assessmentReports.js";
import GUJARATI_PACKAGE from "../config/gujaratiPackage.generated.js";

const GUJARATI_PACKAGE_ID = "complete-aptitude-500q-gujarati";
const TARGET_ALGORITHM = CAREER_500Q_CONFIG.algorithmKey;

const args = process.argv.slice(2);
const WRITE = args.includes("--write");
const ONLY_REPORT = (args.find((a) => a.startsWith("--report=")) || "").split("=")[1] || "";

// Same selection the submit path uses (userController getEnabledSections).
const getEnabledSections = (pkg) =>
  (pkg?.sections || [])
    .filter((section) => section.enabled !== false)
    .sort((a, b) => a.sectionId - b.sectionId);

const sectionScores = (profile = {}) =>
  (profile.sectionBreakdown || []).map((section) => ({
    sectionId: Number(section.sectionId),
    score: section.percentage ?? section.score ?? null,
  }));

const fmtSections = (scores) =>
  scores.map((s) => `S${s.sectionId}:${s.score ?? "-"}`).join(" ");

const isAlreadyRescored = (report) =>
  report.scoringVersion === TARGET_ALGORITHM &&
  report.profile?.metadata?.algorithmKey === TARGET_ALGORITHM;

export async function rescoreGujaratiReports({ write = false, onlyReport = "" } = {}) {
  // Read the live config without getOrCreateDefault (which upserts), so the
  // dry run is strictly read-only.
  const cfg = await AssessmentConfig.findOne({ key: "default" }).lean();
  let pkg = (cfg?.packages || []).find((p) => p.id === GUJARATI_PACKAGE_ID);
  let sectionsSource = "AssessmentConfig (database)";
  if (!pkg) {
    pkg = GUJARATI_PACKAGE;
    sectionsSource = "config/gujaratiPackage.generated.js (package missing from DB)";
  }
  const sections = getEnabledSections(pkg);
  console.log(`[rescore] sections from ${sectionsSource}: ${sections.map((s) => `${s.sectionId}:${(s.questions || []).length}`).join(", ")}`);

  const filter = { "assessmentReports.packageId": GUJARATI_PACKAGE_ID };
  if (onlyReport) filter["assessmentReports._id"] = onlyReport;
  const users = await User.find(filter).select(
    "jumpstartId assessmentReports resultProfile resultPublication topCareers reportsReady"
  );

  const totals = { reports: 0, rescored: 0, alreadyRescored: 0, noAnswers: 0, needsManualReview: 0 };

  for (const user of users) {
    let userChanged = false;
    for (const report of user.assessmentReports) {
      if (report.packageId !== GUJARATI_PACKAGE_ID) continue;
      if (onlyReport && String(report._id) !== onlyReport) continue;
      totals.reports += 1;
      const label = `report ${report._id} (${user.jumpstartId || "no ID"}, ${report.publication?.status || "?"})`;

      if (isAlreadyRescored(report)) {
        totals.alreadyRescored += 1;
        console.log(`[rescore] skip   ${label}: already ${TARGET_ALGORITHM}`);
        continue;
      }
      const answers = report.rawAnswers && typeof report.rawAnswers === "object" ? report.rawAnswers : {};
      if (!Object.keys(answers).length) {
        totals.noAnswers += 1;
        console.log(`[rescore] skip   ${label}: no stored rawAnswers, cannot re-score`);
        continue;
      }

      const oldProfile = report.profile?.toObject ? report.profile.toObject() : report.profile || {};
      const newProfile = computeAssessmentResult({ answers, sections, packageId: GUJARATI_PACKAGE_ID });
      if (newProfile?.metadata?.algorithmKey !== TARGET_ALGORITHM) {
        throw new Error(`${label}: scorer returned ${newProfile?.metadata?.algorithmKey}, expected ${TARGET_ALGORITHM}`);
      }
      const items = cloneManualReviewItems(newProfile.manualReviewItems || []);
      const pending = computeHasUnreviewedItems(items);
      if (pending) totals.needsManualReview += 1;

      const before = sectionScores(oldProfile);
      const after = sectionScores(newProfile);
      console.log(
        `[rescore] ${write ? "WRITE " : "dry   "} ${label}\n` +
          `           scorer  ${report.scoringVersion || oldProfile.metadata?.algorithmKey || "?"} -> ${TARGET_ALGORITHM}\n` +
          `           overall ${oldProfile.overallScore ?? "-"} -> ${newProfile.overallScore ?? "-"}\n` +
          `           before  ${fmtSections(before)}\n` +
          `           after   ${fmtSections(after)}\n` +
          `           manual review items: ${items.length}${pending ? " (pending admin review)" : ""}`
      );

      if (write) {
        const now = new Date();
        report.rescoredFrom = {
          scoringVersion: report.scoringVersion || oldProfile.metadata?.algorithmKey || "",
          overallScore: oldProfile.overallScore ?? null,
          sectionScores: before,
        };
        report.rescoredAt = now;
        report.profile = cloneResultProfile(newProfile);
        report.manualReviewItems = items;
        report.hasUnreviewedItems = pending;
        report.manualReviewCompletedAt = null;
        report.scoringVersion = TARGET_ALGORITHM;
        report.normVersion = CURRENT_NORM_VERSION;
        report.updatedAt = now;
        userChanged = true;
      }
      totals.rescored += 1;
    }

    if (write && userChanged) {
      user.markModified("assessmentReports");
      syncLegacyStateFromReports(user);
      await user.save();
    }
  }

  console.log(
    `[rescore] ${write ? "APPLIED" : "DRY RUN (no writes)"}: ${totals.reports} Gujarati report(s); ` +
      `${totals.rescored} ${write ? "re-scored" : "would be re-scored"}, ` +
      `${totals.alreadyRescored} already ${TARGET_ALGORITHM}, ${totals.noAnswers} without stored answers; ` +
      `${totals.needsManualReview} will need Section 4 manual review.`
  );
  return totals;
}

const isDirectRun = (() => {
  try {
    return Boolean(process.argv[1]) && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
  } catch {
    return false;
  }
})();

if (isDirectRun) {
  (async () => {
    ensureRequiredEnv();
    await mongoose.connect(process.env.MONGODB_URI);
    const { host, name } = mongoose.connection;
    console.log(`[rescore] connected to ${host}/${name} — ${WRITE ? "WRITE mode" : "dry run"}`);
    await rescoreGujaratiReports({ write: WRITE, onlyReport: ONLY_REPORT });
    await mongoose.disconnect();
  })().catch(async (err) => {
    console.error(err);
    await mongoose.disconnect().catch(() => {});
    process.exit(1);
  });
}

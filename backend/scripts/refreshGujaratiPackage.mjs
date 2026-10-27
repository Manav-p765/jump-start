#!/usr/bin/env node
// backend/scripts/refreshGujaratiPackage.mjs
//
// Atomically refresh the Gujarati package inside the AssessmentConfig doc.
//
// WHY THIS EXISTS
// ---------------
// seedGujaratiPackage.mjs is insert-only: once
// "complete-aptitude-500q-gujarati" exists it will never update it, so
// corrected translations in the generated bundle never reach the database.
// The documented workaround is "delete the package, then re-seed" — but that
// leaves the package ABSENT between the two commands, and re-insertion pushes
// it to the end of the packages[] array (changing ordering/sortOrder).
//
// This script avoids both problems. The Gujarati package is one ELEMENT of
// the `packages` array inside a SINGLE AssessmentConfig document
// (key: "default"), so refreshing it is an in-place element swap followed by
// one cfg.save() — a single atomic document write. The package is never
// absent, not even briefly, and its array position is preserved.
//
// SAFETY
// ------
//   * Defaults to --dry-run. Nothing is written without an explicit --write.
//   * MONGODB_URI must be supplied in the environment. There is deliberately
//     NO dotenv fallback: this script can touch production, and silently
//     inheriting a .env is exactly how the wrong database gets written.
//   * Every assertion below must pass before the save is attempted.
//   * Only the element whose id === complete-aptitude-500q-gujarati is
//     touched; all other packages are deep-compared before and after.
//
// USAGE
//   MONGODB_URI="mongodb+srv://..." node scripts/refreshGujaratiPackage.mjs
//   MONGODB_URI="mongodb+srv://..." node scripts/refreshGujaratiPackage.mjs --write
//
//   --dry-run            report only, change nothing (default)
//   --write              perform the atomic swap
//   --backend=<dir>      backend root (default: auto-detected)
//   --package=<file>     Gujarati package module
//                        (default: <backend>/config/gujaratiPackage.generated.js,
//                         which derives itself from
//                         config/comprehensive500Package.generated.js)
//   --id=<packageId>     override the package id to refresh

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import mongoose from "mongoose";

// ---------------------------------------------------------------------------
// Arguments
// ---------------------------------------------------------------------------
const argv = process.argv.slice(2);
const flag = (name) => {
  const hit = argv.find((a) => a === `--${name}` || a.startsWith(`--${name}=`));
  if (!hit) return undefined;
  const eq = hit.indexOf("=");
  return eq === -1 ? true : hit.slice(eq + 1);
};

const WRITE = flag("write") === true;
const GU_ID = flag("id") || "complete-aptitude-500q-gujarati";

const EXPECTED_TOTAL = 500;
const EXPECTED_SHAPE = [120, 80, 90, 160, 50];
// Section 4 except 4.3 Abstract (341-365) was rewritten natively in Gujarati
// by the client, with its own answer key ("a" in the gu source): 135 items.
// MIRROR (English option labels) = 4.3 Abstract + 4.4 Spatial, whose options
// are the A-D labels printed in the figures.
const EXPECTED_MIRROR_COUNT = 50;
const EXPECTED_NATIVE_COUNT = 135;
const GUJARATI_RE = /[\u0A80-\u0AFF]/; // Gujarati Unicode block

const fail = (msg) => {
  console.error(`ABORT: ${msg}`);
  process.exit(1);
};

// ---------------------------------------------------------------------------
// Locate the backend root
//
// Resolved from the script's own location first (this file is expected to
// live in <backend>/scripts/), then the working directory. Never a hardcoded
// absolute path — the same file has to run on a dev box and on the VPS.
// ---------------------------------------------------------------------------
const here = path.dirname(fileURLToPath(import.meta.url));

const looksLikeBackend = (dir) =>
  dir &&
  fs.existsSync(path.join(dir, "models", "AssessmentConfig.js")) &&
  fs.existsSync(path.join(dir, "config"));

const BACKEND = (() => {
  const explicit = flag("backend");
  if (typeof explicit === "string") {
    const abs = path.resolve(explicit);
    if (!looksLikeBackend(abs)) fail(`--backend=${explicit} is not a backend root`);
    return abs;
  }
  for (const candidate of [path.resolve(here, ".."), process.cwd(), here]) {
    if (looksLikeBackend(candidate)) return candidate;
  }
  return fail(
    "could not locate the backend root (expected models/AssessmentConfig.js). Pass --backend=<dir>."
  );
})();

const PACKAGE_PATH = (() => {
  const explicit = flag("package");
  const p =
    typeof explicit === "string"
      ? path.resolve(explicit)
      : path.join(BACKEND, "config", "gujaratiPackage.generated.js");
  if (!fs.existsSync(p)) fail(`package module not found: ${p}`);
  return p;
})();

const ENGLISH_PATH = path.join(BACKEND, "config", "comprehensive500Package.generated.js");
const GU_SOURCE_DIR = path.join(BACKEND, "scripts", "gu");

// ---------------------------------------------------------------------------
// Connection string — environment only, no dotenv fallback
// ---------------------------------------------------------------------------
const MONGODB_URI = String(process.env.MONGODB_URI || "").trim();
if (!MONGODB_URI) {
  fail(
    'MONGODB_URI is not set. Pass it explicitly, e.g.\n' +
      '  MONGODB_URI="mongodb+srv://..." node scripts/refreshGujaratiPackage.mjs --dry-run'
  );
}

// ---------------------------------------------------------------------------
// Load backend modules by resolved path
// ---------------------------------------------------------------------------
const load = async (p) => {
  const mod = await import(pathToFileURL(p).href);
  return mod.default ?? mod;
};

const AssessmentConfig = await load(path.join(BACKEND, "models", "AssessmentConfig.js"));
const GUJARATI_PACKAGE = await load(PACKAGE_PATH);
const ENGLISH_PACKAGE = fs.existsSync(ENGLISH_PATH) ? await load(ENGLISH_PATH) : null;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const plain = (v) => (v && typeof v.toObject === "function" ? v.toObject() : v);
const clone = (v) => JSON.parse(JSON.stringify(plain(v)));

const questionsOf = (pkgObj) => (pkgObj?.sections || []).flatMap((s) => s.questions || []);

const questionById = (pkgObj, id) =>
  questionsOf(pkgObj).find((q) => String(q.questionId) === String(id)) || null;

const shapeOf = (pkgObj) => (pkgObj?.sections || []).map((s) => (s.questions || []).length);

const trunc = (s, n) => {
  const t = String(s ?? "").replace(/\s+/g, " ").trim();
  return t.length > n ? `${t.slice(0, n)}…` : t;
};

// MIRROR ids come from the gu source markers, NOT a hardcoded id range.
// Section 4 is not uniformly English: 4.5 Mechanical Reasoning (391-410)
// legitimately carries translated Gujarati options. Only entries explicitly
// marked "o": "MIRROR" must keep English options, because their
// correctOption letter indexes English answer tokens.
const readMirrorIds = () => {
  if (!fs.existsSync(GU_SOURCE_DIR)) {
    fail(`gu source directory not found: ${GU_SOURCE_DIR}`);
  }
  const ids = new Set();
  // Native Gujarati items ("a" in the gu source) carry their own answer key.
  const nativeAnswers = new Map();
  let seen = 0;
  for (let i = 1; i <= 5; i += 1) {
    const f = path.join(GU_SOURCE_DIR, `section${i}.json`);
    if (!fs.existsSync(f)) fail(`missing gu source file: ${f}`);
    const entries = JSON.parse(fs.readFileSync(f, "utf8"));
    for (const [key, value] of Object.entries(entries)) {
      seen += 1;
      if (value && value.o === "MIRROR") ids.add(String(key));
      if (value && value.a) nativeAnswers.set(String(key), String(value.a).trim().toUpperCase());
    }
  }
  return { ids, seen, nativeAnswers };
};

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
await mongoose.connect(MONGODB_URI);

try {
  console.log("=".repeat(72));
  console.log("Gujarati package refresh");
  console.log("=".repeat(72));
  console.log("  database   :", mongoose.connection.name);
  console.log("  host       :", mongoose.connection.host);
  console.log("  backend    :", BACKEND);
  console.log("  package src:", PACKAGE_PATH);
  console.log("  package id :", GU_ID);
  console.log("  mode       :", WRITE ? "WRITE" : "DRY-RUN (default)");

  const cfg = await AssessmentConfig.findOne({ key: "default" });
  if (!cfg) fail('no AssessmentConfig document with key "default"');

  const idx = (cfg.packages || []).findIndex((p) => p.id === GU_ID);
  if (idx === -1) {
    fail(
      `package "${GU_ID}" is not present — this script refreshes in place and ` +
        "will not create it. Run seed:gujarati-package first."
    );
  }

  const before = clone(cfg.packages[idx]);
  const othersBefore = clone(cfg.packages)
    .filter((p) => p.id !== GU_ID)
    .map((p) => ({ id: p.id, body: JSON.stringify(p) }));

  // Operator-controlled fields and array position are preserved; only the
  // derived question content is refreshed.
  const next = {
    ...clone(GUJARATI_PACKAGE),
    active: before.active,
    sortOrder: before.sortOrder,
  };

  // ---- Before / after summary ---------------------------------------------
  const SPOT = [1, 135, 291, 485];
  console.log("\n--- BEFORE (live) ---");
  console.log("  sections:", shapeOf(before).join("/"), "| total:", questionsOf(before).length);
  for (const id of SPOT) {
    const q = questionById(before, id);
    console.log(`   id ${String(id).padStart(3)} : ${trunc(q?.text, 56)}`);
  }

  console.log("\n--- AFTER (candidate) ---");
  console.log("  sections:", shapeOf(next).join("/"), "| total:", questionsOf(next).length);
  for (const id of SPOT) {
    const q = questionById(next, id);
    console.log(`   id ${String(id).padStart(3)} : ${trunc(q?.text, 56)}`);
  }
  console.log(
    "  active:", next.active,
    "| sortOrder:", next.sortOrder,
    "| array index:", idx,
    "(all preserved from live)"
  );

  // ---- Assertions ----------------------------------------------------------
  console.log("\n--- ASSERTIONS ---");
  const results = [];
  const check = (label, ok, detail = "") => {
    results.push({ label, ok, detail });
    console.log(`  [${ok ? "PASS" : "FAIL"}] ${label}${detail ? ` — ${detail}` : ""}`);
  };

  // 1. Total question count.
  const total = questionsOf(next).length;
  check(`total questions === ${EXPECTED_TOTAL}`, total === EXPECTED_TOTAL, `got ${total}`);

  // 2. Section shape.
  const shape = shapeOf(next);
  check(
    `section shape === ${EXPECTED_SHAPE.join("/")}`,
    shape.length === EXPECTED_SHAPE.length && shape.every((n, i) => n === EXPECTED_SHAPE[i]),
    `got ${shape.join("/")}`
  );

  // 3. Unique question ids.
  const ids = questionsOf(next).map((q) => String(q.questionId));
  check("question ids unique", new Set(ids).size === ids.length, `${new Set(ids).size} unique of ${ids.length}`);

  // 4. MIRROR ids keep English options, keyed off the gu source markers.
  const { ids: mirrorIds, seen: guSeen, nativeAnswers } = readMirrorIds();
  check(
    `gu source parsed (${EXPECTED_MIRROR_COUNT} MIRROR markers)`,
    mirrorIds.size === EXPECTED_MIRROR_COUNT,
    `found ${mirrorIds.size} MIRROR of ${guSeen} entries`
  );

  const mirrorLeaked = [];
  const mirrorMismatch = [];
  for (const q of questionsOf(next)) {
    const qid = String(q.questionId);
    if (!mirrorIds.has(qid)) continue;
    const opts = q.options || [];
    if (opts.some((o) => GUJARATI_RE.test(String(o)))) mirrorLeaked.push(qid);
    if (ENGLISH_PACKAGE) {
      const en = questionById(ENGLISH_PACKAGE, qid);
      if (en && JSON.stringify(en.options || []) !== JSON.stringify(opts)) mirrorMismatch.push(qid);
    }
  }
  check(
    "MIRROR ids carry no Gujarati options",
    mirrorLeaked.length === 0,
    mirrorLeaked.length ? `leaked: ${mirrorLeaked.slice(0, 10).join(",")}` : `${mirrorIds.size} checked`
  );
  check(
    "MIRROR ids options === English options",
    mirrorMismatch.length === 0,
    ENGLISH_PACKAGE
      ? mirrorMismatch.length
        ? `differ: ${mirrorMismatch.slice(0, 10).join(",")}`
        : `${mirrorIds.size} compared`
      : "SKIPPED (English package not found)"
  );

  // 5. Answer keys: native Gujarati items use the gu source key ("a");
  //    every other item must keep the English bank's key.
  check(
    `gu source parsed (${EXPECTED_NATIVE_COUNT} native answer keys)`,
    nativeAnswers.size === EXPECTED_NATIVE_COUNT,
    `found ${nativeAnswers.size}`
  );
  const nativeDrift = [];
  for (const [qid, letter] of nativeAnswers) {
    const q = questionById(next, qid);
    if (!q || String(q.correctOption ?? "") !== letter) nativeDrift.push(qid);
  }
  check(
    "native items use the Gujarati answer key",
    nativeDrift.length === 0,
    nativeDrift.length ? `drift: ${nativeDrift.slice(0, 10).join(",")}` : `${nativeAnswers.size} checked`
  );
  if (ENGLISH_PACKAGE) {
    const keyDrift = [];
    for (const q of questionsOf(next)) {
      if (nativeAnswers.has(String(q.questionId))) continue;
      const en = questionById(ENGLISH_PACKAGE, q.questionId);
      if (en && String(en.correctOption ?? "") !== String(q.correctOption ?? "")) {
        keyDrift.push(String(q.questionId));
      }
    }
    check(
      `correctOption matches English bank for the other ${500 - nativeAnswers.size}`,
      keyDrift.length === 0,
      keyDrift.length ? `drift: ${keyDrift.slice(0, 10).join(",")}` : "no drift"
    );
  }

  // 6. Operator-controlled fields preserved.
  check(
    "active + sortOrder preserved",
    next.active === before.active && next.sortOrder === before.sortOrder,
    `active=${next.active} sortOrder=${next.sortOrder}`
  );

  // 7. Identity fields intact.
  check("package id unchanged", next.id === GU_ID, next.id);

  if (results.some((r) => !r.ok)) {
    fail(`${results.filter((r) => !r.ok).length} assertion(s) failed — nothing written`);
  }
  console.log(`\n  all ${results.length} assertions passed`);

  // ---- Write ---------------------------------------------------------------
  if (!WRITE) {
    console.log("\nMODE: DRY-RUN — nothing written. Re-run with --write to apply.");
  } else {
    // In-place element swap, then ONE document save. The package is never
    // absent and never changes position in packages[].
    cfg.packages[idx] = next;
    cfg.markModified("packages");
    await cfg.save();
    console.log("\nMODE: WRITTEN — single atomic cfg.save(), zero absence window.");

    // ---- Post-write verification against a fresh read ---------------------
    const after = await AssessmentConfig.findOne({ key: "default" }).lean();
    const guAfter = (after.packages || []).find((p) => p.id === GU_ID);
    if (!guAfter) fail("post-write: Gujarati package missing");

    const othersAfter = (after.packages || [])
      .filter((p) => p.id !== GU_ID)
      .map((p) => ({ id: p.id, body: JSON.stringify(p) }));

    const othersIdentical =
      othersBefore.length === othersAfter.length &&
      othersBefore.every((b, i) => b.id === othersAfter[i].id && b.body === othersAfter[i].body);

    const afterIdx = (after.packages || []).findIndex((p) => p.id === GU_ID);

    console.log("\n--- POST-WRITE VERIFICATION ---");
    console.log("  sections:", shapeOf(guAfter).join("/"), "| total:", questionsOf(guAfter).length);
    console.log("  array index preserved:", afterIdx === idx, `(${idx} -> ${afterIdx})`);
    console.log("  active/sortOrder     :", guAfter.active, "/", guAfter.sortOrder);
    console.log(
      "  other packages untouched:",
      othersIdentical,
      `[${othersAfter.map((p) => p.id).join(", ")}]`
    );
    for (const id of SPOT) {
      const q = questionById(guAfter, id);
      console.log(`   id ${String(id).padStart(3)} : ${trunc(q?.text, 56)}`);
    }

    if (!othersIdentical) fail("post-write: a non-Gujarati package changed");
    if (questionsOf(guAfter).length !== EXPECTED_TOTAL) fail("post-write: question count wrong");
    if (afterIdx !== idx) fail("post-write: array position moved");
    console.log("\n  post-write verification passed");
  }
} finally {
  await mongoose.disconnect();
}

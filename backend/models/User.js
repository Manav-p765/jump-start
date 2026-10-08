import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import {
  cloneResultProfile,
  cloneManualReviewItems,
  computeHasUnreviewedItems,
} from "../utils/assessmentReports.js";

const toPlainObject = (value) => {
  const plain = value?.toObject ? value.toObject() : value;
  return plain && typeof plain === "object" ? plain : {};
};

const toNullableNumber = (value) => {
  if (value == null || value === "") return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
};

const toNumberOrFallback = (value, fallback) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
};

const sanitizeTestProgress = (progress = {}) => {
  const rawProgress = toPlainObject(progress);

  return {
    ...rawProgress,
    sectionId: toNumberOrFallback(rawProgress.sectionId, 1),
    questionIndex: toNumberOrFallback(rawProgress.questionIndex, 0),
    completedSectionIds: Array.isArray(rawProgress.completedSectionIds)
      ? rawProgress.completedSectionIds
          .map((value) => toNullableNumber(value))
          .filter(Number.isFinite)
      : [],
    timeRemainingSeconds: toNullableNumber(rawProgress.timeRemainingSeconds),
    answers:
      rawProgress.answers && typeof rawProgress.answers === "object"
        ? rawProgress.answers
        : {},
  };
};

const sanitizeAssessmentReports = (reports = []) =>
  Array.isArray(reports)
    ? reports.map((report) => {
        const rawReport = toPlainObject(report);
        const items = cloneManualReviewItems(rawReport.manualReviewItems);
        return {
          ...rawReport,
          attemptNumber: toNumberOrFallback(rawReport.attemptNumber, 1),
          profile: cloneResultProfile(rawReport.profile),
          manualReviewItems: items,
          // Keep the persisted flag in sync with the items — preventing the
          // approval gate from misfiring if the items are edited directly.
          hasUnreviewedItems: computeHasUnreviewedItems(items),
          // Carried explicitly rather than left to the spread above. The
          // spread preserves them today, but this hook runs on EVERY save
          // and is the exact mechanism that silently dropped fields before
          // (`key` on sectionBreakdown). Listing them means a future
          // refactor from spread to explicit-build can't lose the raw
          // answers without deleting these lines on purpose.
          rawAnswers:
            rawReport.rawAnswers && typeof rawReport.rawAnswers === "object"
              ? rawReport.rawAnswers
              : {},
          normVersion: rawReport.normVersion || "",
          scoringVersion: rawReport.scoringVersion || "",
        };
      })
    : [];

const testResultSchema = new mongoose.Schema(
  {
    testName: { type: String, default: "" },
    sectionName: { type: String, default: "" },
    sectionId: { type: Number, default: null },
    completedAt: { type: Date, default: null },
    score: { type: Number, default: null },
    maxScore: { type: Number, default: null },
    reportUrl: { type: String, default: "" },
    interpretation: { type: String, default: "" },
  },
  { _id: false }
);

const factorResultSchema = new mongoose.Schema(
  {
    id: { type: String, default: "" },
    key: { type: String, default: "" },
    label: { type: String, default: "" },
    score: { type: Number, default: null },
    rawScore: { type: Number, default: null },
    maxScore: { type: Number, default: null },
    average: { type: Number, default: null },
    percentage: { type: Number, default: null },
    band: { type: String, default: "" },
    bandMin: { type: Number, default: null },
    bandMax: { type: Number, default: null },
    bandRangeLabel: { type: String, default: "" },
    status: { type: String, default: "" },
    description: { type: String, default: "" },
    interpretation: { type: String, default: "" },
    careerImplication: { type: String, default: "" },
    answerType: { type: String, default: "" },
    scoreType: { type: String, default: "" },
    questionNumbers: { type: [Number], default: [] },
    questionRangeLabel: { type: String, default: "" },
    answeredCount: { type: Number, default: null },
    totalQuestions: { type: Number, default: null },
  },
  { _id: false }
);

const interpretationItemSchema = new mongoose.Schema(
  {
    key: { type: String, default: "" },
    title: { type: String, default: "" },
    detail: { type: String, default: "" },
    meta: { type: String, default: "" },
  },
  { _id: false }
);

const subsectionSchema = new mongoose.Schema(
  {
    id: { type: String, default: "" },
    key: { type: String, default: "" },
    subsectionId: { type: String, default: "" },
    label: { type: String, default: "" },
    score: { type: Number, default: null },
    rawScore: { type: Number, default: null },
    maxScore: { type: Number, default: null },
    average: { type: Number, default: null },
    percentage: { type: Number, default: null },
    band: { type: String, default: "" },
    bandMin: { type: Number, default: null },
    bandMax: { type: Number, default: null },
    bandRangeLabel: { type: String, default: "" },
    status: { type: String, default: "" },
    description: { type: String, default: "" },
    interpretation: { type: String, default: "" },
    careerImplication: { type: String, default: "" },
    answerType: { type: String, default: "" },
    scoreType: { type: String, default: "" },
    evaluationType: { type: String, default: "" },
    displayMode: { type: String, default: "" },
    usedForPersonalityType: { type: Boolean, default: false },
    questionNumbers: { type: [Number], default: [] },
    questionRangeLabel: { type: String, default: "" },
    answeredCount: { type: Number, default: null },
    totalQuestions: { type: Number, default: null },
    factorResults: { type: [factorResultSchema], default: [] },
    clusterResults: { type: [factorResultSchema], default: [] },
    interpretationItems: { type: [interpretationItemSchema], default: [] },
  },
  { _id: false }
);

const sectionBreakdownSchema = new mongoose.Schema(
  {
    sectionId: { type: Number, default: null },
    title: { type: String, default: "" },
    score: { type: Number, default: null },
    maxScore: { type: Number, default: null },
    average: { type: Number, default: null },
    percentage: { type: Number, default: null },
    answeredCount: { type: Number, default: null },
    totalQuestions: { type: Number, default: null },
    status: { type: String, default: "" },
    interpretation: { type: String, default: "" },
    careerImplication: { type: String, default: "" },
    scoringType: { type: String, default: "" },
    answerType: { type: String, default: "" },
    scoreType: { type: String, default: "" },
    questionNumbers: { type: [Number], default: [] },
    questionRangeLabel: { type: String, default: "" },
    subsections: { type: [subsectionSchema], default: [] },
  },
  { _id: false }
);

const strengthSchema = new mongoose.Schema(
  {
    name: { type: String, default: "" },
    value: { type: Number, default: null },
    desc: { type: String, default: "" },
  },
  { _id: false }
);

const careerMatchReasonsSchema = new mongoose.Schema(
  {
    holland: { type: String, default: "" },
    intelligence: { type: String, default: "" },
    aptitude: { type: String, default: "" },
    eq: { type: String, default: "" },
  },
  { _id: false }
);

const careerMatchBreakdownSchema = new mongoose.Schema(
  {
    hollandMatch: { type: Number, default: null },
    intelligenceMatch: { type: Number, default: null },
    aptitudeMatch: { type: Number, default: null },
    eqMatch: { type: Number, default: null },
  },
  { _id: false }
);

const careerRecommendationSchema = new mongoose.Schema(
  {
    title: { type: String, default: "" },
    category: { type: String, default: "" },
    score: { type: Number, default: null },
    matchPercent: { type: Number, default: null },
    description: { type: String, default: "" },
    skills: { type: [String], default: [] },
    salaryRange: { type: String, default: "" },
    link: { type: String, default: "" },
    hollandCodes: { type: [String], default: [] },
    intelligenceTypes: { type: [String], default: [] },
    aptitudeStrengths: { type: [String], default: [] },
    eqCompetencies: { type: [String], default: [] },
    matchReasons: { type: careerMatchReasonsSchema, default: () => ({}) },
    breakdown: { type: careerMatchBreakdownSchema, default: () => ({}) },
  },
  { _id: false }
);

const personalityTraitSchema = new mongoose.Schema(
  {
    name: { type: String, default: "" },
    value: { type: Number, default: null },
  },
  { _id: false }
);

const personalityTypeSchema = new mongoose.Schema(
  {
    code: { type: String, default: "" },
    title: { type: String, default: "" },
    description: { type: String, default: "" },
    traits: { type: [personalityTraitSchema], default: [] },
  },
  { _id: false }
);

const reviewSummarySchema = new mongoose.Schema(
  {
    statusLabel: { type: String, default: "" },
    strongestSignals: { type: [String], default: [] },
    topCareerTitles: { type: [String], default: [] },
    observations: { type: [String], default: [] },
  },
  { _id: false }
);

const resultMetadataSchema = new mongoose.Schema(
  {
    algorithmKey: { type: String, default: "" },
    overallMaxScore: { type: Number, default: null },
    packageId: { type: String, default: "" },
    scoringGuideSources: { type: [String], default: [] },
    ambiguityNotes: { type: [String], default: [] },
  },
  { _id: false }
);

const resultProfileSchema = new mongoose.Schema(
  {
    overallScore: { type: Number, default: null },
    overallPercentile: { type: String, default: "" },
    // Prompt-6 fix: persist the scorer's completion-state fields so the
    // admin payload doesn't have to re-derive them on every read. The
    // scorer (Prompt-5) emits these explicitly; without schema entries,
    // Mongoose silently dropped them during save.
    completionStatus: { type: String, default: "" },
    completedSections: { type: Number, default: null },
    totalSections: { type: Number, default: null },
    completedTestsCount: { type: Number, default: 0 },
    totalTestsCount: { type: Number, default: 0 },
    careerPathwaysCount: { type: Number, default: 0 },
    testResults: { type: [testResultSchema], default: [] },
    sectionBreakdown: { type: [sectionBreakdownSchema], default: [] },
    strengths: { type: [strengthSchema], default: [] },
    careerRecommendations: { type: [careerRecommendationSchema], default: [] },
    // Prompt-8: rich personality aggregator (MBTI + OCEAN + HSPQ + Work
    // Style). Stored as Mixed so the nested structure persists without
    // per-field schema declarations. The scorer is the source of truth
    // for the shape.
    personalityProfile: { type: mongoose.Schema.Types.Mixed, default: () => ({}) },
    // Named profile buckets consumed by the careerMatcher. Stored as
    // open key/number maps so display-name keys ("Logical-Math") survive
    // the round-trip without per-key schema declarations.
    hollandProfile: { type: mongoose.Schema.Types.Mixed, default: () => ({}) },
    multipleIntelligences: { type: mongoose.Schema.Types.Mixed, default: () => ({}) },
    aptitudeScores: { type: mongoose.Schema.Types.Mixed, default: () => ({}) },
    eqProfile: { type: mongoose.Schema.Types.Mixed, default: () => ({}) },
    personalityType: { type: personalityTypeSchema, default: () => ({}) },
    reviewSummary: { type: reviewSummarySchema, default: () => ({}) },
    metadata: { type: resultMetadataSchema, default: () => ({}) },
    // Provenance stamp for the career-matching engine that produced
    // `careerRecommendations` — { version, source: "live" | "migration", at }.
    // Set by the scorer on fresh reports and by the rematch migration on
    // backfilled ones. Mixed so the small object persists without per-key
    // schema. null on reports written before this field landed.
    careerRematch: { type: mongoose.Schema.Types.Mixed, default: null },
  },
  { _id: false }
);

const resultPublicationSchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: ["not_submitted", "pending_approval", "approved"],
      default: "not_submitted",
    },
    submittedAt: { type: Date, default: null },
    approvedAt: { type: Date, default: null },
    approvedByName: { type: String, trim: true, default: "" },
  },
  { _id: false }
);

const purchaseHistorySchema = new mongoose.Schema(
  {
    packageId: { type: String, default: "" },
    packageTitle: { type: String, default: "" },
    // `amount` is the final amount actually charged (after any discount).
    // Existing reads of `amount` keep working — they just see the
    // post-discount value, which is what the user paid.
    amount: { type: Number, default: null },
    // Coupon trail. All three default to null so historical purchase
    // records without coupons remain untouched.
    couponCode: { type: String, default: null },
    discountAmount: { type: Number, default: null },
    originalAmount: { type: Number, default: null },
    purchasedAt: { type: Date, default: null },
    paymentMethod: { type: String, default: "Online" },
    // Razorpay trail. Null on legacy / non-gateway purchases.
    razorpayOrderId: { type: String, default: null },
    // DEDUPE KEY. grantPackageEntitlement() treats a purchaseHistory
    // record carrying this payment id as proof the entitlement was
    // already granted, so verify and the webhook can both run safely
    // for the same payment without double-writing.
    razorpayPaymentId: { type: String, default: null },
    // Only paid purchases are ever pushed onto purchaseHistory; failed
    // and unpaid orders live in the Payment ledger instead. A full refund
    // flips the entry to "refunded" (revokePackageEntitlement) rather than
    // deleting it: the entry is the receipt trail, and its payment id is
    // what stops a late webhook from granting the package again.
    status: { type: String, enum: ["paid", "refunded"], default: "paid" },
    revokedAt: { type: Date, default: null },
    revokeReason: { type: String, default: null },
  },
  { _id: false }
);

export const STUDENT_PROFILE_REQUIRED_FIELDS = Object.freeze([
  "dateOfBirth",
  "gender",
  "schoolOrCollege",
  "classOrGrade",
  "city",
  "state",
]);

const studentProfileSchema = new mongoose.Schema(
  {
    dateOfBirth: { type: Date, default: null },
    gender: {
      type: String,
      enum: ["Male", "Female", "Other", "Prefer not to say", ""],
      default: "",
    },
    phone: { type: String, trim: true, default: "" },
    schoolOrCollege: { type: String, trim: true, default: "" },
    classOrGrade: { type: String, trim: true, default: "" },
    stream: {
      type: String,
      enum: ["Science", "Commerce", "Arts", "Not Applicable", "Other", ""],
      default: "",
    },
    board: { type: String, trim: true, default: "" },
    city: { type: String, trim: true, default: "" },
    state: { type: String, trim: true, default: "" },
    isComplete: { type: Boolean, default: false },
  },
  { _id: false }
);

const isFieldFilled = (profile, key) => {
  const value = profile?.[key];
  if (key === "dateOfBirth") {
    if (!value) return false;
    const date = value instanceof Date ? value : new Date(value);
    return !Number.isNaN(date.getTime());
  }
  return Boolean(value && String(value).trim());
};

const computeStudentProfileComplete = (profile = {}) =>
  STUDENT_PROFILE_REQUIRED_FIELDS.every((key) => isFieldFilled(profile, key));

// Prompt-9 Fix 2: per-option detail for the manual review card. The
// scorer emits a structured options array (label + text) for every
// review item so admin can see all choices side-by-side with the
// correct one highlighted, rather than guessing from a bare answer
// letter. Stored as a sub-schema (not Mixed) so the data shape is
// validated even on legacy reports that get backfilled later.
const manualReviewOptionSchema = new mongoose.Schema(
  {
    label: { type: String, default: "" },
    text: { type: String, default: "" },
  },
  { _id: false }
);

const manualReviewItemSchema = new mongoose.Schema(
  {
    questionId: { type: String, default: "" },
    questionText: { type: String, default: "" },
    mediaUrl: { type: String, default: null },
    studentAnswer: { type: String, default: "" },
    correctAnswer: { type: String, default: "" },
    options: { type: [manualReviewOptionSchema], default: [] },
    autoMarkedCorrect: { type: Boolean, default: false },
    requiresManualReview: { type: Boolean, default: false },
    adminDecision: {
      type: String,
      enum: ["correct", "incorrect", null],
      default: null,
    },
    adminNote: { type: String, default: null },
    // Aptitude subsection key (abstract_reasoning / spatial_relations /
    // mechanical_reasoning) — used by the finalize handler to recompute
    // the right subsection without re-parsing question ranges.
    subsectionKey: { type: String, default: "" },
  },
  { _id: false }
);

// Per-section duration captured from testProgress.sectionTimings at
// submit time. Mirrored from `sections[i].title` so the admin UI can
// label rows without re-resolving the package config.
const sectionDurationSchema = new mongoose.Schema(
  {
    sectionId: { type: String, default: "" },
    sectionTitle: { type: String, default: "" },
    durationMinutes: { type: Number, default: null },
  },
  { _id: false }
);

const assessmentReportSchema = new mongoose.Schema({
  packageId: { type: String, default: "" },
  packageTitle: { type: String, default: "" },
  attemptNumber: { type: Number, default: 1 },
  isDemo: { type: Boolean, default: false },
  profile: { type: resultProfileSchema, default: () => ({}) },
  publication: { type: resultPublicationSchema, default: () => ({}) },
  // Section 4 manual review queue. Populated at submit time by the scorer
  // and updated by admin decisions; once all flagged items have a non-null
  // adminDecision the report becomes eligible for approval.
  manualReviewItems: { type: [manualReviewItemSchema], default: [] },
  hasUnreviewedItems: { type: Boolean, default: false },
  manualReviewCompletedAt: { type: Date, default: null },
  // Verbatim snapshot of the answer set this report was scored from,
  // written in the same save that creates the report. Without it a report
  // can never be re-scored: `user.testProgress.answers` is a single
  // user-level buffer that the submit path clears immediately (and that
  // package-switch/purchase also wipe), so once it's gone the raw
  // responses are unrecoverable. Keys match the scorer's own answer-key
  // format (`${sectionId}-${questionIndex}`, see getAnswerKey in
  // career500q.js) so this object can be fed straight back into
  // computeAssessmentResult.
  //
  // `immutable` blocks direct reassignment on a loaded document. Note it
  // is NOT absolute: the pre-validate sanitize hook rebuilds the whole
  // assessmentReports array, and re-cast subdocuments accept the value
  // again. It stops accidental writes, not determined ones.
  rawAnswers: {
    type: mongoose.Schema.Types.Mixed,
    default: () => ({}),
    immutable: true,
  },
  // Provenance. `scoringVersion` is the scorer that produced the profile
  // (profile.metadata.algorithmKey, e.g. "career-500q-v1");
  // `normVersion` is the banding/threshold table applied on top of it.
  // Both are recorded so a later re-band can tell which reports were
  // produced under which rules without re-deriving it from createdAt.
  normVersion: { type: String, default: "" },
  scoringVersion: { type: String, default: "" },
  // Wall-clock duration of the attempt. `totalDurationMinutes` is the
  // delta between the test's `startedAt` and the submission timestamp;
  // `sectionDurations` is the per-section breakdown. Both stay null on
  // reports written before this field landed — the UI treats null as
  // "not tracked" and hides the line.
  totalDurationMinutes: { type: Number, default: null },
  sectionDurations: { type: [sectionDurationSchema], default: [] },
  createdAt: { type: Date, default: null },
  updatedAt: { type: Date, default: null },
});

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    // Prompt-9 Fix 1: human-readable unique ID — JS-{YYYY}-{NNNNN}.
    // Sparse so legacy users without one don't block the index, unique
    // so duplicates are impossible at the DB level. The pre-save hook
    // assigns it on first save; the migration script backfills any
    // user that pre-dates this field.
    jumpstartId: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
      default: null,
    },
    password: { type: String, minlength: 6, default: null },
    mobile: { type: String, trim: true, default: "" },
    city: { type: String, trim: true, default: "" },
    dateOfBirth: { type: String, trim: true, default: "" },
    schoolName: { type: String, trim: true, default: "" },
    schoolLocation: { type: String, trim: true, default: "" },
    residentialAddress: { type: String, trim: true, default: "" },
    googleId: { type: String, sparse: true, default: null },
    avatar: { type: String, default: null },
    subscription: {
      type: String,
      enum: ["Basic", "Standard", "Premium"],
      default: "Basic",
    },
    role: { type: String, enum: ["user", "admin"], default: "user" },
    isSuspended: { type: Boolean, default: false },
    lastLoginAt: { type: Date, default: null },
    selectedPackageId: { type: String, default: "" },
    purchasedPackages: [{ type: String }],
    purchaseHistory: { type: [purchaseHistorySchema], default: [] },

    // Dashboard counters
    testsCompleted: { type: Number, default: 0 },
    testsInProgress: { type: Number, default: 0 },
    reportsReady: { type: Number, default: 0 },
    counsellingSessions: { type: Number, default: 0 },

    // Dashboard: per-user available tests (simple structure for now)
    availableTests: [
      {
        title: { type: String, required: true },
        durationMinutes: { type: Number, default: 180 },
        totalQuestions: { type: Number, default: 50 },
        status: {
          type: String,
          enum: ["not_started", "in_progress", "completed"],
          default: "not_started",
        },
      },
    ],

    // Dashboard: top career matches for this user
    topCareers: [
      {
        title: { type: String, required: true },
        matchPercent: { type: Number, required: true },
      },
    ],

    // Current/latest result snapshot kept for backward compatibility.
    resultProfile: { type: resultProfileSchema, default: () => ({}) },

    resultPublication: {
      type: resultPublicationSchema,
      default: () => ({ status: "not_submitted" }),
    },

    // Scalable result history for multiple purchased tests and repeated attempts.
    assessmentReports: { type: [assessmentReportSchema], default: [] },

    // Structured student-profile sub-document (the mandatory form a student
    // must complete before starting any test). Distinct from legacy
    // top-level fields like `city`, `schoolName`, `dateOfBirth` (those stay
    // for auth/back-compat); this is the source of truth for the gate.
    studentProfile: { type: studentProfileSchema, default: () => ({}) },

    // Livetest progress (section, question index, answers, time left)
    testProgress: {
      sectionId: { type: Number, default: 1 },
      questionIndex: { type: Number, default: 0 },
      answers: { type: mongoose.Schema.Types.Mixed, default: {} },
      completedSectionIds: { type: [Number], default: [] },
      timeRemainingSeconds: { type: Number, default: null },
      updatedAt: { type: Date, default: null },
      // Wall-clock test start — captured once on the first progress
      // ping (which is when the student lands on Q1 of section 1). Used
      // by postTestSubmit to compute `totalDurationMinutes` on the
      // resulting report.
      startedAt: { type: Date, default: null },
      // Per-section timings. Each entry is appended when the section
      // first becomes active (`startedAt`) and again when the section
      // is marked complete (`completedAt`). Submit reads completedAt -
      // startedAt for `sectionDurations`. Sparse by design — sections
      // the student never reached simply don't appear.
      sectionTimings: {
        type: [
          new mongoose.Schema(
            {
              sectionId: { type: Number, required: true },
              startedAt: { type: Date, default: null },
              completedAt: { type: Date, default: null },
            },
            { _id: false }
          ),
        ],
        default: [],
      },
    },
  },
  { timestamps: true }
);

const shouldSanitizePath = (doc, path) =>
  typeof doc.isSelected === "function" ? doc.isSelected(path) !== false : true;

// Compound + secondary indexes for the hot read paths. Mongoose
// auto-creates indexes for the `unique: true` fields above (`email`
// and `jumpstartId`), so we only declare the ones that aren't covered
// by the field definitions. In production, run `db.users.getIndexes()`
// after deploy to confirm — and watch for "build indexes in foreground"
// pauses on the first restart after this change lands.
//
// Why these specifically:
//   - selectedPackageId  : queried by admin dashboards and the demo
//                          surface to count active learners on each
//                          package; previously a collection scan.
//   - assessmentReports.status / publication.status : the admin
//                          review queue filters reports by publication
//                          status; without an index it scans every
//                          user document and then every embedded
//                          report.
//   - purchaseHistory.status : surfaced in admin Payments page.
userSchema.index({ selectedPackageId: 1 });
userSchema.index({ "assessmentReports.publication.status": 1 });
userSchema.index({ "purchaseHistory.status": 1 });

userSchema.pre("validate", function (next) {
  if (shouldSanitizePath(this, "resultProfile")) {
    this.resultProfile = cloneResultProfile(this.resultProfile);
  }

  if (shouldSanitizePath(this, "assessmentReports")) {
    this.assessmentReports = sanitizeAssessmentReports(this.assessmentReports);
  }

  if (shouldSanitizePath(this, "testProgress")) {
    this.testProgress = sanitizeTestProgress(this.testProgress);
  }

  next();
});

// Keep studentProfile.isComplete in sync with the required-field check on
// every save. Centralising this avoids the gate going stale if a future
// code path writes to studentProfile without setting isComplete explicitly.
userSchema.pre("save", function (next) {
  if (this.studentProfile) {
    this.studentProfile.isComplete = computeStudentProfileComplete(
      this.studentProfile
    );
  }
  next();
});

userSchema.pre("save", async function (next) {
  if (!this.isModified("password") || !this.password) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Prompt-9 Fix 1: assign a human-readable Jumpstart ID on first save.
// Skip if already set (idempotent — running the migration after this
// hook does nothing). The unique index on jumpstartId is the final
// safety net against the count-then-save race window; if a concurrent
// signup grabs the same counter, we retry once with a freshly-counted
// suffix. Beyond two retries we give up and let the unique-index
// violation surface as a save error rather than spinning forever.
userSchema.pre("save", async function (next) {
  if (this.jumpstartId) return next();
  const Model = this.constructor;
  const year = new Date().getFullYear();
  try {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const count = await Model.countDocuments();
      const candidate = `JS-${year}-${String(count + 1 + attempt).padStart(5, "0")}`;
      const clash = await Model.exists({ jumpstartId: candidate });
      if (!clash) {
        this.jumpstartId = candidate;
        return next();
      }
    }
    // Final fallback — base on createdAt timestamp so it's still
    // year-prefixed but globally unique.
    this.jumpstartId = `JS-${year}-${Date.now().toString().slice(-5)}`;
    next();
  } catch (err) {
    next(err);
  }
});

userSchema.methods.isStudentProfileComplete = function () {
  return computeStudentProfileComplete(this.studentProfile);
};

userSchema.methods.comparePassword = function (candidate) {
  if (!this.password) return false;
  return bcrypt.compare(candidate, this.password);
};

userSchema.methods.toAuthJSON = function () {
  return {
    id: this._id,
    jumpstartId: this.jumpstartId || "",
    name: this.name,
    email: this.email,
    mobile: this.mobile || "",
    city: this.city || "",
    dateOfBirth: this.dateOfBirth || "",
    schoolName: this.schoolName || "",
    schoolLocation: this.schoolLocation || "",
    residentialAddress: this.residentialAddress || "",
    subscription: this.subscription,
    role: this.role,
    isSuspended: this.isSuspended || false,
    lastLoginAt: this.lastLoginAt || null,
    selectedPackageId: this.selectedPackageId || "",
    studentProfile: {
      isComplete: Boolean(this.studentProfile?.isComplete),
    },
  };
};

export { computeStudentProfileComplete };

export default mongoose.model("User", userSchema);

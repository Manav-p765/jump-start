import {
  RESULT_PUBLICATION_STATUS,
  hasResultProfileData,
  getProfilePublicationState,
  getResultPublicationState,
} from "./resultApproval.js";

const cloneArray = (items = [], mapItem) =>
  Array.isArray(items) ? items.map((item) => mapItem(item || {})) : [];

// Preserve open key/number maps (hollandProfile etc.) through the
// sanitize hook. Non-finite values are dropped.
const cloneScoreMap = (source) => {
  if (!source || typeof source !== "object") return {};
  const out = {};
  for (const [key, raw] of Object.entries(source)) {
    const numeric = Number(raw);
    if (Number.isFinite(numeric)) out[key] = numeric;
  }
  return out;
};

const toNullableNumber = (value) => {
  if (value == null || value === "") return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
};

const toNumberOrFallback = (value, fallback = 0) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
};

const cloneFactorResult = (item = {}) => ({
  id: item.id || "",
  key: item.key || "",
  label: item.label || "",
  score: toNullableNumber(item.score),
  rawScore: toNullableNumber(item.rawScore),
  maxScore: toNullableNumber(item.maxScore),
  average: toNullableNumber(item.average),
  percentage: toNullableNumber(item.percentage),
  band: item.band || "",
  bandMin: toNullableNumber(item.bandMin),
  bandMax: toNullableNumber(item.bandMax),
  bandRangeLabel: item.bandRangeLabel || "",
  status: item.status || "",
  description: item.description || "",
  interpretation: item.interpretation || "",
  careerImplication: item.careerImplication || "",
  answerType: item.answerType || "",
  scoreType: item.scoreType || "",
  questionNumbers: Array.isArray(item.questionNumbers)
    ? item.questionNumbers.map((value) => Number(value)).filter(Number.isFinite)
    : [],
  questionRangeLabel: item.questionRangeLabel || "",
  answeredCount: toNullableNumber(item.answeredCount),
  totalQuestions: toNullableNumber(item.totalQuestions),
});

const cloneInterpretationItem = (item = {}) => ({
  key: item.key || "",
  title: item.title || "",
  detail: item.detail || "",
  meta: item.meta || "",
});

const cloneSubsection = (subsection = {}) => ({
  id: subsection.id || "",
  key: subsection.key || "",
  subsectionId: subsection.subsectionId || "",
  label: subsection.label || "",
  score: toNullableNumber(subsection.score),
  rawScore: toNullableNumber(subsection.rawScore),
  maxScore: toNullableNumber(subsection.maxScore),
  average: toNullableNumber(subsection.average),
  percentage: toNullableNumber(subsection.percentage),
  band: subsection.band || "",
  bandMin: toNullableNumber(subsection.bandMin),
  bandMax: toNullableNumber(subsection.bandMax),
  bandRangeLabel: subsection.bandRangeLabel || "",
  status: subsection.status || "",
  description: subsection.description || "",
  interpretation: subsection.interpretation || "",
  careerImplication: subsection.careerImplication || "",
  answerType: subsection.answerType || "",
  scoreType: subsection.scoreType || "",
  evaluationType: subsection.evaluationType || "",
  displayMode: subsection.displayMode || "",
  usedForPersonalityType: Boolean(subsection.usedForPersonalityType),
  questionNumbers: Array.isArray(subsection.questionNumbers)
    ? subsection.questionNumbers.map((value) => Number(value)).filter(Number.isFinite)
    : [],
  questionRangeLabel: subsection.questionRangeLabel || "",
  answeredCount: toNullableNumber(subsection.answeredCount),
  totalQuestions: toNullableNumber(subsection.totalQuestions),
  factorResults: cloneArray(subsection.factorResults, cloneFactorResult),
  clusterResults: cloneArray(subsection.clusterResults, cloneFactorResult),
  interpretationItems: cloneArray(subsection.interpretationItems, cloneInterpretationItem),
});

export const createEmptyResultProfile = () => ({
  overallScore: null,
  overallPercentile: "",
  completedTestsCount: 0,
  totalTestsCount: 0,
  careerPathwaysCount: 0,
  testResults: [],
  sectionBreakdown: [],
  strengths: [],
  careerRecommendations: [],
  personalityType: {
    code: "",
    title: "",
    description: "",
    traits: [],
  },
  reviewSummary: {
    statusLabel: "",
    strongestSignals: [],
    topCareerTitles: [],
    observations: [],
  },
  metadata: {
    algorithmKey: "",
    overallMaxScore: null,
    packageId: "",
    scoringGuideSources: [],
    ambiguityNotes: [],
  },
});

export const createEmptyResultPublication = () => ({
  status: RESULT_PUBLICATION_STATUS.NOT_SUBMITTED,
  submittedAt: null,
  approvedAt: null,
  approvedByName: "",
});

export const cloneResultProfile = (profile = {}) => ({
  overallScore: toNullableNumber(profile?.overallScore),
  overallPercentile: String(profile?.overallPercentile || ""),
  // Prompt-6 fix: preserve the scorer's completion-state fields through
  // the sanitize hook. Without this, every save would zero them out
  // even though the schema now allows them.
  completionStatus: String(profile?.completionStatus || ""),
  completedSections: toNullableNumber(profile?.completedSections),
  totalSections: toNullableNumber(profile?.totalSections),
  completedTestsCount: toNumberOrFallback(profile?.completedTestsCount, 0),
  totalTestsCount: toNumberOrFallback(profile?.totalTestsCount, 0),
  careerPathwaysCount: toNumberOrFallback(profile?.careerPathwaysCount, 0),
  testResults: cloneArray(profile?.testResults, (item) => ({
    testName: item.testName || "",
    sectionName: item.sectionName || "",
    sectionId: toNullableNumber(item.sectionId),
    completedAt: item.completedAt || null,
    score: toNullableNumber(item.score),
    maxScore: toNullableNumber(item.maxScore),
    reportUrl: item.reportUrl || "",
    interpretation: item.interpretation || "",
  })),
  sectionBreakdown: cloneArray(profile?.sectionBreakdown, (section) => ({
    sectionId: toNullableNumber(section.sectionId),
    title: section.title || "",
    score: toNullableNumber(section.score),
    maxScore: toNullableNumber(section.maxScore),
    average: toNullableNumber(section.average),
    percentage: toNullableNumber(section.percentage),
    answeredCount: toNullableNumber(section.answeredCount),
    totalQuestions: toNullableNumber(section.totalQuestions),
    status: section.status || "",
    interpretation: section.interpretation || "",
    careerImplication: section.careerImplication || "",
    scoringType: section.scoringType || "",
    answerType: section.answerType || "",
    scoreType: section.scoreType || "",
    questionNumbers: Array.isArray(section.questionNumbers)
      ? section.questionNumbers.map((item) => Number(item)).filter(Number.isFinite)
      : [],
    questionRangeLabel: section.questionRangeLabel || "",
    subsections: cloneArray(section.subsections, cloneSubsection),
  })),
  strengths: cloneArray(profile?.strengths, (item) => ({
    name: item.name || "",
    value: toNullableNumber(item.value),
    desc: item.desc || "",
  })),
  careerRecommendations: cloneArray(profile?.careerRecommendations, (career) => ({
    title: career.title || "",
    category: career.category || "",
    score: toNullableNumber(career.score),
    matchPercent: toNullableNumber(
      career.matchPercent != null ? career.matchPercent : career.score
    ),
    description: career.description || "",
    skills: Array.isArray(career.skills) ? career.skills : [],
    salaryRange: career.salaryRange || "",
    link: career.link || "",
    hollandCodes: Array.isArray(career.hollandCodes) ? career.hollandCodes : [],
    intelligenceTypes: Array.isArray(career.intelligenceTypes)
      ? career.intelligenceTypes
      : [],
    aptitudeStrengths: Array.isArray(career.aptitudeStrengths)
      ? career.aptitudeStrengths
      : [],
    eqCompetencies: Array.isArray(career.eqCompetencies)
      ? career.eqCompetencies
      : [],
    matchReasons: {
      holland: career?.matchReasons?.holland || "",
      intelligence: career?.matchReasons?.intelligence || "",
      aptitude: career?.matchReasons?.aptitude || "",
      eq: career?.matchReasons?.eq || "",
    },
    breakdown: {
      hollandMatch: toNullableNumber(career?.breakdown?.hollandMatch),
      intelligenceMatch: toNullableNumber(career?.breakdown?.intelligenceMatch),
      aptitudeMatch: toNullableNumber(career?.breakdown?.aptitudeMatch),
      eqMatch: toNullableNumber(career?.breakdown?.eqMatch),
    },
  })),
  // Prompt-8: deep-clone the nested personalityProfile aggregator. Open
  // structure (Mixed schema field), so JSON-clone is safe and keeps
  // every nested field including oceanProfile.dominantTraits and
  // hspqSignature[].
  personalityProfile: profile?.personalityProfile
    ? JSON.parse(JSON.stringify(profile.personalityProfile))
    : null,
  hollandProfile: cloneScoreMap(profile?.hollandProfile),
  multipleIntelligences: cloneScoreMap(profile?.multipleIntelligences),
  aptitudeScores: cloneScoreMap(profile?.aptitudeScores),
  eqProfile: cloneScoreMap(profile?.eqProfile),
  // Career-matching engine provenance ({ version, source, at }). Preserved
  // through the sanitize hook so a later app-triggered save doesn't strip the
  // marker the scorer/migration set — which would let the rematch migration
  // re-process (and double-ipsatize) the report on a future run.
  careerRematch: profile?.careerRematch
    ? JSON.parse(JSON.stringify(profile.careerRematch))
    : null,
  personalityType: {
    code: profile?.personalityType?.code || "",
    title: profile?.personalityType?.title || "",
    description: profile?.personalityType?.description || "",
    traits: cloneArray(profile?.personalityType?.traits, (trait) => ({
      name: trait.name || "",
      value: toNullableNumber(trait.value),
    })),
  },
  reviewSummary: {
    statusLabel: profile?.reviewSummary?.statusLabel || "",
    strongestSignals: Array.isArray(profile?.reviewSummary?.strongestSignals)
      ? profile.reviewSummary.strongestSignals
      : [],
    topCareerTitles: Array.isArray(profile?.reviewSummary?.topCareerTitles)
      ? profile.reviewSummary.topCareerTitles
      : [],
    observations: Array.isArray(profile?.reviewSummary?.observations)
      ? profile.reviewSummary.observations
      : [],
  },
  metadata: {
    algorithmKey: profile?.metadata?.algorithmKey || "",
    overallMaxScore: toNullableNumber(profile?.metadata?.overallMaxScore),
    packageId: profile?.metadata?.packageId || "",
    scoringGuideSources: Array.isArray(profile?.metadata?.scoringGuideSources)
      ? profile.metadata.scoringGuideSources
      : [],
    ambiguityNotes: Array.isArray(profile?.metadata?.ambiguityNotes)
      ? profile.metadata.ambiguityNotes
      : [],
  },
});

export const cloneResultPublication = (publication = {}) => ({
  status: publication?.status || RESULT_PUBLICATION_STATUS.NOT_SUBMITTED,
  submittedAt: publication?.submittedAt || null,
  approvedAt: publication?.approvedAt || null,
  approvedByName: publication?.approvedByName || "",
});

const toPackageLookupMap = (packageLookup) => {
  if (packageLookup instanceof Map) return packageLookup;
  return new Map(Array.isArray(packageLookup) ? packageLookup : []);
};

const resolvePackageTitle = (packageLookup, packageId, fallbackTitle = "") => {
  const lookup = toPackageLookupMap(packageLookup);
  return (
    fallbackTitle ||
    lookup.get(String(packageId || ""))?.title ||
    String(packageId || "") ||
    "Assessment"
  );
};

export const buildLegacyAssessmentReport = (user = {}, packageLookup) => {
  const publication = getResultPublicationState(user);
  if (!publication.hasProfileData) return null;

  return {
    _id: String(user?._id || ""),
    packageId: String(user?.selectedPackageId || ""),
    packageTitle: resolvePackageTitle(
      packageLookup,
      user?.selectedPackageId,
      user?.selectedPackageId
    ),
    attemptNumber: Math.max(1, Number(user?.testsCompleted || 1)),
    isDemo: false,
    profile: cloneResultProfile(user?.resultProfile || {}),
    publication: cloneResultPublication(publication),
    manualReviewItems: [],
    hasUnreviewedItems: false,
    manualReviewCompletedAt: null,
    createdAt:
      publication.submittedAt || user?.updatedAt || user?.createdAt || null,
    updatedAt: user?.updatedAt || publication.approvedAt || null,
    isLegacyFallback: true,
  };
};

export const normalizeAssessmentReport = (report = {}, packageLookup) => {
  const profile = cloneResultProfile(
    report?.profile || report?.resultProfile || {}
  );
  const publication = cloneResultPublication(
    report?.publication || report?.resultPublication || {}
  );
  const state = getProfilePublicationState(profile, publication, report);

  if (!hasResultProfileData(profile)) {
    return null;
  }

  const clonedManualReviewItems = cloneManualReviewItems(
    Array.isArray(report?.manualReviewItems) ? report.manualReviewItems : []
  );

  return {
    _id: String(report?._id || ""),
    packageId: String(report?.packageId || ""),
    packageTitle: resolvePackageTitle(
      packageLookup,
      report?.packageId,
      report?.packageTitle
    ),
    attemptNumber: Math.max(1, Number(report?.attemptNumber || 1)),
    isDemo: Boolean(report?.isDemo),
    profile,
    publication: {
      ...publication,
      status: state.status,
      submittedAt: state.submittedAt,
      approvedAt: state.approvedAt,
      approvedByName: state.approvedByName,
    },
    manualReviewItems: clonedManualReviewItems,
    // Recompute on read rather than trusting a stale stored value — the
    // queue and the flag can drift if an admin edits items directly.
    hasUnreviewedItems: computeHasUnreviewedItems(clonedManualReviewItems),
    manualReviewCompletedAt: report?.manualReviewCompletedAt || null,
    // Read-path passthrough. This function rebuilds the report field by
    // field and drops anything unlisted, and its output is written back to
    // `user.resultProfile` via syncLegacyStateFromReports — so omitting
    // these would make the snapshot invisible to every consumer.
    rawAnswers:
      report?.rawAnswers && typeof report.rawAnswers === "object"
        ? report.rawAnswers
        : {},
    normVersion: report?.normVersion || "",
    scoringVersion: report?.scoringVersion || "",
    rescoredAt: report?.rescoredAt || null,
    rescoredFrom:
      report?.rescoredFrom && typeof report.rescoredFrom === "object"
        ? report.rescoredFrom
        : null,
    createdAt: report?.createdAt || state.submittedAt || null,
    updatedAt: report?.updatedAt || state.approvedAt || state.submittedAt || null,
    isLegacyFallback: report?.isLegacyFallback === true,
  };
};

const getReportTimestamp = (report = {}) => {
  const value =
    report?.publication?.submittedAt ||
    report?.publication?.approvedAt ||
    report?.updatedAt ||
    report?.createdAt ||
    null;
  const timestamp = value ? new Date(value).getTime() : 0;
  return Number.isFinite(timestamp) ? timestamp : 0;
};

export const getStoredAssessmentReports = (user = {}, packageLookup) => {
  const reports = Array.isArray(user?.assessmentReports) ? user.assessmentReports : [];
  if (reports.length) {
    return reports
      .map((report) => normalizeAssessmentReport(report, packageLookup))
      .filter(Boolean)
      .sort((a, b) => getReportTimestamp(b) - getReportTimestamp(a));
  }

  const legacyReport = buildLegacyAssessmentReport(user, packageLookup);
  return legacyReport ? [legacyReport] : [];
};

export const getLatestAssessmentReport = (user = {}, packageLookup) =>
  getStoredAssessmentReports(user, packageLookup)[0] || null;

export const getLatestApprovedAssessmentReport = (user = {}, packageLookup) =>
  getStoredAssessmentReports(user, packageLookup).find(
    (report) =>
      report.publication.status === RESULT_PUBLICATION_STATUS.APPROVED
  ) || null;

const cloneManualReviewItem = (raw = {}) => ({
  questionId: String(raw?.questionId || ""),
  questionText: String(raw?.questionText || ""),
  mediaUrl: raw?.mediaUrl || null,
  studentAnswer: String(raw?.studentAnswer || ""),
  correctAnswer: String(raw?.correctAnswer || ""),
  autoMarkedCorrect: Boolean(raw?.autoMarkedCorrect),
  requiresManualReview: Boolean(raw?.requiresManualReview),
  adminDecision:
    raw?.adminDecision === "correct" || raw?.adminDecision === "incorrect"
      ? raw.adminDecision
      : null,
  adminNote: raw?.adminNote || null,
  subsectionKey: String(raw?.subsectionKey || ""),
});

export const cloneManualReviewItems = (items = []) =>
  Array.isArray(items) ? items.map(cloneManualReviewItem) : [];

export const computeHasUnreviewedItems = (items = []) =>
  Array.isArray(items) &&
  items.some(
    (item) => item?.requiresManualReview && item?.adminDecision == null
  );

// Banding/threshold vocabulary currently in force. Bump this when the band
// tables change so stored reports record which rules produced their labels.
// "raw" documents today's reality: bands are cut on raw score ratios, not
// on any normed or percentile value.
export const CURRENT_NORM_VERSION = "norm-v1-raw";

export const createAssessmentReportEntry = ({
  user = {},
  packageId = "",
  packageTitle = "",
  profile = {},
  publication = {},
  isDemo = false,
  manualReviewItems = null,
  rawAnswers = null,
  normVersion = "",
  scoringVersion = "",
}) => {
  const previousAttempts = getStoredAssessmentReports(user).filter(
    (report) => String(report.packageId || "") === String(packageId || "")
  ).length;
  const now = publication?.submittedAt || new Date();
  // Prefer the explicit `manualReviewItems` arg, but fall back to whatever
  // the scorer parked on the profile object so the report still captures
  // the queue if a caller forgets to pass it through.
  const itemsSource = Array.isArray(manualReviewItems)
    ? manualReviewItems
    : Array.isArray(profile?.manualReviewItems)
      ? profile.manualReviewItems
      : [];
  const clonedItems = cloneManualReviewItems(itemsSource);

  return {
    packageId: String(packageId || ""),
    packageTitle: String(packageTitle || packageId || "Assessment"),
    attemptNumber: previousAttempts + 1,
    isDemo: Boolean(isDemo),
    profile: cloneResultProfile(profile),
    publication: cloneResultPublication(publication),
    manualReviewItems: clonedItems,
    hasUnreviewedItems: computeHasUnreviewedItems(clonedItems),
    manualReviewCompletedAt: null,
    // Snapshot of the exact answer set scored above. Deep-cloned so the
    // report can't alias the live testProgress buffer that the caller is
    // about to clear.
    rawAnswers:
      rawAnswers && typeof rawAnswers === "object"
        ? JSON.parse(JSON.stringify(rawAnswers))
        : {},
    normVersion: String(normVersion || CURRENT_NORM_VERSION),
    // Fall back to the scorer's own provenance marker when the caller
    // doesn't pass one explicitly.
    scoringVersion: String(
      scoringVersion || profile?.metadata?.algorithmKey || ""
    ),
    createdAt: now,
    updatedAt: now,
  };
};

export const resetLegacyResultState = (user) => {
  user.resultProfile = createEmptyResultProfile();
  user.resultPublication = createEmptyResultPublication();
  user.topCareers = [];
  user.reportsReady = 0;
};

export const syncLegacyStateFromReports = (user, packageLookup) => {
  const reports = getStoredAssessmentReports(user, packageLookup);
  const latestReport = reports[0] || null;
  const approvedReports = reports.filter(
    (report) =>
      report.publication.status === RESULT_PUBLICATION_STATUS.APPROVED
  );
  const latestApprovedReport = approvedReports[0] || null;

  if (latestReport) {
    user.resultProfile = cloneResultProfile(latestReport.profile);
    user.resultPublication = cloneResultPublication(latestReport.publication);
  } else {
    user.resultProfile = createEmptyResultProfile();
    user.resultPublication = createEmptyResultPublication();
  }

  user.reportsReady = approvedReports.length;
  user.topCareers = latestApprovedReport
    ? latestApprovedReport.profile.careerRecommendations
        .slice(0, 3)
        .map((career) => ({
          title: career.title,
          matchPercent: career.matchPercent,
        }))
    : [];

  return {
    latestReport,
    latestApprovedReport,
    approvedReports,
  };
};

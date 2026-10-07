import User, {
  STUDENT_PROFILE_REQUIRED_FIELDS,
} from "../models/User.js";
import AssessmentConfig from "../models/AssessmentConfig.js";
import Coupon, { FULL_DISCOUNT_MSG } from "../models/Coupon.js";
import { computeAssessmentResult } from "../utils/scoring/index.js";
import { DEMO_PACKAGE_ID } from "../utils/scoring/configs/career500qDemo.config.js";
import {
  getResultPublicationState,
  RESULT_PUBLICATION_STATUS,
} from "../utils/resultApproval.js";
import {
  createAssessmentReportEntry,
  CURRENT_NORM_VERSION,
  getLatestApprovedAssessmentReport,
  getStoredAssessmentReports,
  syncLegacyStateFromReports,
} from "../utils/assessmentReports.js";

const isDemoPackageId = (id = "") =>
  String(id || "").trim() === DEMO_PACKAGE_ID;

// Does this user actually own `packageId`?
//
// Deliberately identical to the check selectPackage runs before it will set
// selectedPackageId (see below): the demo is free for every logged-in user,
// everything else must appear in purchasedPackages. Selection alone is NOT
// entitlement — the test routes call this so a user who selected a package
// and then abandoned checkout cannot reach them by hitting the API directly.
const hasPackageEntitlement = (user, packageId) => {
  if (isDemoPackageId(packageId)) return true;
  return Array.isArray(user?.purchasedPackages)
    ? user.purchasedPackages.includes(packageId)
    : false;
};

const STUDENT_PROFILE_GENDER_VALUES = [
  "Male",
  "Female",
  "Other",
  "Prefer not to say",
];

const STUDENT_PROFILE_STREAM_VALUES = [
  "Science",
  "Commerce",
  "Arts",
  "Not Applicable",
  "Other",
];

// Serialise a studentProfile sub-doc into the wire shape the frontend
// expects. dateOfBirth is converted to YYYY-MM-DD because the HTML
// <input type="date"> field requires that format on read-back.
const formatDateOnly = (date) => {
  if (!date) return "";
  const dt = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(dt.getTime())) return "";
  const year = dt.getUTCFullYear();
  const month = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const day = String(dt.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const serializeStudentProfile = (profile = {}) => {
  const plain = profile?.toObject ? profile.toObject() : profile;
  return {
    dateOfBirth: formatDateOnly(plain?.dateOfBirth),
    gender: plain?.gender || "",
    phone: plain?.phone || "",
    schoolOrCollege: plain?.schoolOrCollege || "",
    classOrGrade: plain?.classOrGrade || "",
    stream: plain?.stream || "",
    board: plain?.board || "",
    city: plain?.city || "",
    state: plain?.state || "",
    isComplete: Boolean(plain?.isComplete),
  };
};

const sanitizePhone = (value) =>
  String(value || "").replace(/\D/g, "").slice(0, 15);

const trimField = (value, max = 200) =>
  String(value == null ? "" : value).trim().slice(0, max);

// Validate a single incoming studentProfile update. Returns a normalized
// patch + a field-level error map so the frontend can render inline errors.
const validateStudentProfilePayload = (raw = {}) => {
  const patch = {};
  const errors = {};

  if ("dateOfBirth" in raw) {
    const value = String(raw.dateOfBirth || "").trim();
    if (!value) {
      patch.dateOfBirth = null;
    } else {
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) {
        errors.dateOfBirth = "Enter a valid date of birth.";
      } else {
        const now = new Date();
        if (date.getTime() > now.getTime()) {
          errors.dateOfBirth = "Date of birth cannot be in the future.";
        } else {
          patch.dateOfBirth = date;
        }
      }
    }
  }

  if ("gender" in raw) {
    const value = trimField(raw.gender, 30);
    if (value && !STUDENT_PROFILE_GENDER_VALUES.includes(value)) {
      errors.gender = "Choose a valid gender option.";
    } else {
      patch.gender = value;
    }
  }

  if ("phone" in raw) {
    patch.phone = sanitizePhone(raw.phone);
  }

  if ("schoolOrCollege" in raw) {
    patch.schoolOrCollege = trimField(raw.schoolOrCollege, 160);
  }

  if ("classOrGrade" in raw) {
    patch.classOrGrade = trimField(raw.classOrGrade, 80);
  }

  if ("stream" in raw) {
    const value = trimField(raw.stream, 40);
    if (value && !STUDENT_PROFILE_STREAM_VALUES.includes(value)) {
      errors.stream = "Choose a valid stream option.";
    } else {
      patch.stream = value;
    }
  }

  if ("board" in raw) {
    patch.board = trimField(raw.board, 160);
  }

  if ("city" in raw) {
    patch.city = trimField(raw.city, 120);
  }

  if ("state" in raw) {
    patch.state = trimField(raw.state, 80);
  }

  return { patch, errors };
};

const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

const getEnabledSections = (pkg) =>
  (pkg?.sections || [])
    .filter((section) => section.enabled !== false)
    .sort((a, b) => a.sectionId - b.sectionId);

const getQuestionCount = (pkg) =>
  getEnabledSections(pkg).reduce(
    (sum, section) => sum + ((section.questions || []).length || 0),
    0
  );

export const getActivePackages = (cfg) =>
  (cfg.packages || [])
    .filter((p) => p.active !== false && getQuestionCount(p) > 0)
    .sort((a, b) => a.sortOrder - b.sortOrder);

const getOwnedPackageIds = (user, packageLookup) => {
  const ownedIds = new Set(
    Array.isArray(user?.purchasedPackages) ? user.purchasedPackages : []
  );
  const storedReports = getStoredAssessmentReports(user, packageLookup);

  storedReports.forEach((report) => {
    if (report?.packageId) {
      ownedIds.add(String(report.packageId));
    }
  });

  // Legacy fallback for older users who only had one selected package saved
  // before purchasedPackages/history existed.
  if (!ownedIds.size && user?.selectedPackageId) {
    ownedIds.add(String(user.selectedPackageId));
  }

  return [...ownedIds].filter(Boolean);
};

const getOwnedPackages = (cfg, user) => {
  const packageLookup = getPackageLookup(cfg);
  const ownedIds = new Set(getOwnedPackageIds(user, packageLookup));
  return getActivePackages(cfg).filter((pkg) => ownedIds.has(pkg.id));
};

export const getPackageLookup = (cfg) =>
  new Map((cfg?.packages || []).map((pkg) => [String(pkg.id), pkg]));

const findPackageById = (cfg, packageId) =>
  (cfg?.packages || []).find(
    (pkg) => String(pkg.id) === String(packageId || "")
  ) || null;

const getSelectedPackage = (cfg, user) => {
  // The demo is "always owned": any logged-in user can run it without a
  // purchase record, so resolve it directly from the package list when it's
  // the current selection.
  if (isDemoPackageId(user?.selectedPackageId)) {
    const demoPkg = findPackageById(cfg, DEMO_PACKAGE_ID);
    if (demoPkg && demoPkg.active !== false) return demoPkg;
  }
  const owned = getOwnedPackages(cfg, user);
  if (!owned.length) return null;
  const selected = owned.find((p) => p.id === user?.selectedPackageId);
  return selected || owned[0];
};

const groupReportsByPackage = (reports = []) =>
  reports.reduce((map, report) => {
    const packageId = String(report?.packageId || "");
    if (!packageId) return map;
    if (!map.has(packageId)) {
      map.set(packageId, []);
    }
    map.get(packageId).push(report);
    return map;
  }, new Map());

const getLatestPackageReport = (user, packageId, packageLookup) => {
  const reports = groupReportsByPackage(getStoredAssessmentReports(user, packageLookup));
  return (reports.get(String(packageId || "")) || [])[0] || null;
};

const countCompletedSectionsFromReport = (report = {}) =>
  Array.isArray(report?.profile?.sectionBreakdown)
    ? report.profile.sectionBreakdown.filter(
        (section) => section.status !== "incomplete"
      ).length
    : 0;

const buildStudentResultHistory = (packages, user, packageLookup) => {
  const progress = user?.testProgress || {};
  const selectedPackageId = String(user?.selectedPackageId || "");
  const storedReports = getStoredAssessmentReports(user, packageLookup);
  const reportsByPackage = groupReportsByPackage(storedReports);
  const progressCompletedSet = new Set(
    Array.isArray(progress.completedSectionIds)
      ? progress.completedSectionIds.map((id) => Number(id))
      : []
  );

  const tests = packages.map((pkg) => {
    const packageId = String(pkg.id || "");
    const sections = getEnabledSections(pkg);
    const packageReports = reportsByPackage.get(packageId) || [];
    const latestReport = packageReports[0] || null;
    const latestPublishedReport =
      packageReports.find(
        (report) =>
          report.publication.status === RESULT_PUBLICATION_STATUS.APPROVED
      ) || null;
    const inProgress =
      packageId === selectedPackageId &&
      (hasStartedProgress(progress, sections) ||
        Number(user?.testsInProgress || 0) > 0);
    const completedSections = inProgress
      ? sections.filter((section) =>
          progressCompletedSet.has(Number(section.sectionId))
        ).length
      : latestReport
        ? countCompletedSectionsFromReport(latestReport)
        : 0;
    const totalSections = sections.length;
    const totalQuestions = sections.reduce(
      (sum, section) => sum + ((section.questions || []).length || 0),
      0
    );
    const totalDurationMinutes = sections.reduce(
      (sum, section) => sum + Number(section.durationMinutes || 0),
      0
    );
    const publicationStatus = latestReport?.publication?.status
      ? latestReport.publication.status
      : RESULT_PUBLICATION_STATUS.NOT_SUBMITTED;
    const attemptState = inProgress
      ? "in_progress"
      : latestReport
        ? "attempted"
        : "not_attempted";

    return {
      id: packageId,
      packageId,
      title: pkg.title,
      badge: pkg.badge || "",
      purchaseState: "purchased",
      attemptState,
      resultState: publicationStatus,
      latestReportId: latestReport?._id || "",
      publishedReportId: latestPublishedReport?._id || "",
      hasPublishedReport: Boolean(latestPublishedReport),
      isDemo:
        isDemoPackageId(packageId) || Boolean(latestReport?.isDemo),
      scorePreview: latestPublishedReport?.profile?.overallScore ?? null,
      percentagePreview:
        latestPublishedReport?.profile?.overallScore ?? null,
      totalSections,
      completedSections,
      totalQuestions,
      totalDurationMinutes,
      attemptCount: packageReports.length,
      lastUpdatedAt:
        latestReport?.publication?.submittedAt ||
        latestReport?.updatedAt ||
        null,
      currentAction:
        latestPublishedReport != null
          ? "view_report"
          : inProgress
            ? "continue_test"
            : publicationStatus === RESULT_PUBLICATION_STATUS.PENDING_APPROVAL
              ? "result_pending"
              : "start_test",
    };
  });

  return {
    tests,
    summary: {
      totalPurchased: tests.length,
      attemptedCount: tests.filter(
        (item) => item.attemptState === "attempted"
      ).length,
      inProgressCount: tests.filter(
        (item) => item.attemptState === "in_progress"
      ).length,
      pendingCount: tests.filter(
        (item) => item.resultState === RESULT_PUBLICATION_STATUS.PENDING_APPROVAL
      ).length,
      publishedCount: tests.filter((item) => item.hasPublishedReport).length,
    },
  };
};

const buildOverallResultsSummary = (tests = []) => {
  const visibleScores = (Array.isArray(tests) ? tests : [])
    .filter((test) => test?.scorePreview != null && test?.scorePreview !== "")
    .map((test) => Number(test?.scorePreview))
    .filter(Number.isFinite);

  if (!visibleScores.length) {
    return {
      overallScore: null,
      overallPercentile: "",
      scoredTestsCount: 0,
    };
  }

  const overallScore = Math.round(
    visibleScores.reduce((sum, score) => sum + score, 0) / visibleScores.length
  );

  return {
    overallScore,
    overallPercentile: `Top ${Math.max(8, 100 - overallScore)}% profile strength`,
    scoredTestsCount: visibleScores.length,
  };
};

const buildFallbackSectionBreakdown = (profile = {}) =>
  (Array.isArray(profile.testResults) ? profile.testResults : []).map((section) => ({
    sectionId: section.sectionId,
    title: section.sectionName || section.testName || "Section",
    score: Number(section.score || 0),
    maxScore: Number(section.maxScore || 100),
    average: null,
    percentage: Number(section.score || 0),
    answeredCount: 0,
    totalQuestions: 0,
    status: "completed",
    interpretation: section.interpretation || "",
    careerImplication: "",
    scoringType: "",
    answerType: "",
    scoreType: "",
    questionNumbers: [],
    questionRangeLabel: "",
    subsections: [],
  }));

const countCompletedSections = (sectionBreakdown = []) =>
  sectionBreakdown.filter((section) => section.status !== "incomplete").length;

export const buildStudentReportDetail = (report, user, packageLookup) => {
  const profile = report?.profile || {};
  const packageId = String(report?.packageId || "");
  const pkg = packageLookup.get(packageId);
  const storedBreakdown =
    Array.isArray(profile.sectionBreakdown) && profile.sectionBreakdown.length
      ? profile.sectionBreakdown
      : buildFallbackSectionBreakdown(profile);
  const knownSectionIds = new Set(
    storedBreakdown.map((section) => Number(section.sectionId || 0))
  );
  const pendingSections = Array.isArray(pkg?.sections)
    ? pkg.sections
        .filter((section) => section.enabled !== false)
        .filter((section) => !knownSectionIds.has(Number(section.sectionId)))
        .map((section) => ({
          sectionId: section.sectionId,
          title: section.title,
          score: 0,
          maxScore: 100,
          average: null,
          percentage: 0,
          answeredCount: 0,
          totalQuestions: Array.isArray(section.questions) ? section.questions.length : 0,
          status: "incomplete",
          interpretation: "Section data was not available in this report.",
          careerImplication: "",
          scoringType: section.scoringType || "",
          answerType: "",
          scoreType: "",
          questionNumbers: [],
          questionRangeLabel: "",
          subsections: [],
        }))
    : [];
  const sectionBreakdown = [...storedBreakdown, ...pendingSections].sort(
    (a, b) => Number(a.sectionId || 0) - Number(b.sectionId || 0)
  );
  const completedSections = countCompletedSections(sectionBreakdown);
  const totalSections =
    Number(profile.totalTestsCount || 0) || sectionBreakdown.length;

  return {
    id: report?._id || "",
    packageId,
    packageTitle:
      report?.packageTitle ||
      pkg?.title ||
      packageId ||
      "Assessment Report",
    status: report?.publication?.status || RESULT_PUBLICATION_STATUS.NOT_SUBMITTED,
    submittedAt: report?.publication?.submittedAt || report?.createdAt || null,
    approvedAt: report?.publication?.approvedAt || null,
    attemptNumber: Number(report?.attemptNumber || 1),
    isDemo: Boolean(report?.isDemo) || isDemoPackageId(packageId),
    student: {
      id: String(user?._id || ""),
      name: user?.name || "Student",
      email: user?.email || "",
      // Surface jumpstartId + studentProfile so the report's first page
      // can show the student's identity block (name, JS-ID, school,
      // class, city, etc.). The frontend treats missing fields as "—".
      jumpstartId: user?.jumpstartId || "",
      profile: {
        dateOfBirth: user?.studentProfile?.dateOfBirth || null,
        gender: user?.studentProfile?.gender || "",
        phone: user?.studentProfile?.phone || user?.mobile || "",
        schoolOrCollege: user?.studentProfile?.schoolOrCollege || "",
        classOrGrade: user?.studentProfile?.classOrGrade || "",
        stream: user?.studentProfile?.stream || "",
        board: user?.studentProfile?.board || "",
        city: user?.studentProfile?.city || user?.city || "",
        state: user?.studentProfile?.state || "",
      },
    },
    summary: {
      overallScore: profile.overallScore ?? null,
      maxScore: profile?.metadata?.overallMaxScore ?? 100,
      percentage: profile.overallScore ?? null,
      overallPercentile: profile.overallPercentile || "",
      completedSections,
      totalSections,
      completionStatus:
        completedSections >= totalSections && totalSections > 0
          ? "Completed"
          : "Incomplete",
      submittedAt: report?.publication?.submittedAt || null,
      approvedAt: report?.publication?.approvedAt || null,
    },
    strengths: Array.isArray(profile.strengths) ? profile.strengths : [],
    sectionBreakdown,
    personalityType: profile.personalityType || null,
    reviewSummary: profile.reviewSummary || {},
    // Surface the captured durations so the student report (page 1
    // header + per-section breakdown) and the admin Review page can
    // display them. Null on legacy reports — UI hides the line then.
    totalDurationMinutes: report?.totalDurationMinutes ?? null,
    sectionDurations: Array.isArray(report?.sectionDurations)
      ? report.sectionDurations.map((row) => ({
          sectionId: String(row?.sectionId || ""),
          sectionTitle: String(row?.sectionTitle || ""),
          durationMinutes: row?.durationMinutes ?? null,
        }))
      : [],
    careerRecommendations: Array.isArray(profile.careerRecommendations)
      ? profile.careerRecommendations
      : [],
    // Rich scoring maps + aggregators surfaced for the redesigned
    // downloadable report. These already exist on the stored profile
    // (career500q scorer output) but were previously not exposed on the
    // student-facing payload. Surfacing them lets the report render the
    // MBTI/OCEAN/HSPQ, Multiple-Intelligence, RIASEC, Aptitude, and EQ
    // panels directly instead of re-deriving everything from
    // sectionBreakdown.subsections. Legacy/heuristic reports that lack
    // these fields fall through to null/{} and the frontend degrades
    // gracefully (shows a dash / "pending"). Both this endpoint and the
    // admin adminView student-view endpoint share this builder, so both
    // paths get the enriched shape.
    personalityProfile: profile.personalityProfile || null,
    hollandProfile: profile.hollandProfile || {},
    multipleIntelligences: profile.multipleIntelligences || {},
    aptitudeScores: profile.aptitudeScores || {},
    eqProfile: profile.eqProfile || {},
    overallPercentile: profile.overallPercentile || "",
    consistencyNotes: Array.isArray(profile.consistencyNotes)
      ? profile.consistencyNotes
      : [],
    metadata: profile.metadata || {},
  };
};

const isAnswered = (question, rawAnswer) => {
  if (question?.type === "single") {
    return rawAnswer !== undefined && String(rawAnswer).trim() !== "";
  }

  const numeric = Number(rawAnswer);
  return Number.isFinite(numeric) && numeric >= 1 && numeric <= 5;
};

const countAnsweredQuestionsForSection = (section, answers = {}) =>
  (section.questions || []).reduce((count, question, index) => {
    const rawAnswer = answers[`${section.sectionId}-${index}`];
    return count + (isAnswered(question, rawAnswer) ? 1 : 0);
  }, 0);

const countAnsweredQuestionsAcrossSections = (sections, answers = {}) =>
  sections.reduce(
    (count, section) => count + countAnsweredQuestionsForSection(section, answers),
    0
  );

const hasStartedProgress = (progress = {}, sections = []) => {
  const completedCount = Array.isArray(progress.completedSectionIds)
    ? progress.completedSectionIds.length
    : 0;
  const answeredCount = countAnsweredQuestionsAcrossSections(
    sections,
    progress.answers || {}
  );

  return answeredCount > 0 || Number(progress.questionIndex || 0) > 0 || completedCount > 0;
};

const buildAvailableTests = (packages, progress = {}) => {
  const completedSet = new Set(
    Array.isArray(progress.completedSectionIds)
      ? progress.completedSectionIds.map((id) => Number(id))
      : []
  );
  const activePackageId = progress.packageId || "";

  return packages.flatMap((pkg) =>
    getEnabledSections(pkg)
      .map((section) => ({
        packageId: pkg.id,
        packageTitle: pkg.title,
        title: section.title,
        durationMinutes: section.durationMinutes ?? 20,
        totalQuestions: Array.isArray(section.questions)
          ? section.questions.length
          : 0,
        status:
          activePackageId === pkg.id && completedSet.has(Number(section.sectionId))
            ? "completed"
            : activePackageId === pkg.id &&
                Number(progress.sectionId) === Number(section.sectionId) &&
                (countAnsweredQuestionsForSection(section, progress.answers || {}) > 0 ||
                  Number(progress.questionIndex || 0) > 0)
              ? "in_progress"
              : "not_started",
      }))
  );
};

const buildPurchasedPackages = (packages, user, packageLookup) => {
  const selectedPackageId = user?.selectedPackageId || "";
  const progress = user?.testProgress || {};
  const storedReports = getStoredAssessmentReports(user, packageLookup);
  const reportsByPackage = groupReportsByPackage(storedReports);
  const completedSet = new Set(
    Array.isArray(progress.completedSectionIds)
      ? progress.completedSectionIds.map((id) => Number(id))
      : []
  );

  return packages.map((pkg) => {
    const sections = getEnabledSections(pkg);
    const packageReports = reportsByPackage.get(String(pkg.id || "")) || [];
    const latestReport = packageReports[0] || null;
    const latestPublishedReport =
      packageReports.find(
        (report) =>
          report.publication.status === RESULT_PUBLICATION_STATUS.APPROVED
      ) || null;
    const totalQuestions = sections.reduce(
      (sum, section) => sum + ((section.questions || []).length || 0),
      0
    );
    const totalDurationMinutes = sections.reduce(
      (sum, section) => sum + Number(section.durationMinutes || 0),
      0
    );
    const completedSections =
      pkg.id === selectedPackageId
        ? sections.filter((section) => completedSet.has(Number(section.sectionId)))
            .length
        : 0;

    let status = "unlocked";
    if (
      pkg.id === selectedPackageId &&
      (hasStartedProgress(progress, sections) ||
        Number(user?.testsInProgress || 0) > 0)
    ) {
      status = "in_progress";
    } else if (latestReport) {
      status = "completed";
    }

    return {
      id: pkg.id,
      title: pkg.title,
      badge: pkg.badge || "",
      amount: pkg.amount || 0,
      totalSections: sections.length,
      totalQuestions,
      totalDurationMinutes,
      completedSections,
      status,
      latestReportId: latestReport?._id || "",
      publishedReportId: latestPublishedReport?._id || "",
      publicationStatus:
        latestReport?.publication?.status ||
        RESULT_PUBLICATION_STATUS.NOT_SUBMITTED,
      overallScore: latestPublishedReport?.profile?.overallScore ?? null,
      attemptCount: packageReports.length,
    };
  });
};

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const createEmptyTestProgress = () => ({
  sectionId: 1,
  questionIndex: 0,
  answers: {},
  completedSectionIds: [],
  timeRemainingSeconds: null,
  updatedAt: null,
});

// PATCH /api/v1/user/package/select
export const selectPackage = async (req, res) => {
  try {
    const { packageId, resetProgress = false } = req.body || {};
    if (!packageId) return res.status(400).json({ success: false, msg: "packageId is required" });
    if (resetProgress === true) {
      return res.status(409).json({
        success: false,
        msg: "Retaking completed tests is not available.",
      });
    }
    const [cfg, user] = await Promise.all([AssessmentConfig.getOrCreateDefault(), User.findById(req.user.id)]);
    if (!user) return res.status(404).json({ success: false, msg: "User not found" });

    // Mandatory student-profile gate. Applies to every package, including
    // the free demo — demo users still have to complete the form first.
    if (!user.studentProfile?.isComplete) {
      return res.status(400).json({
        success: false,
        error: "PROFILE_INCOMPLETE",
        // `msg`, not `message` — every other error in this file uses `msg`,
        // and clients that follow that convention were silently dropping
        // this one and falling back to a generic "couldn't open" alert.
        // The `error` code stays: callers redirect off that, not the text.
        msg: "Please complete your student profile before starting a test.",
      });
    }

    const pkg = getActivePackages(cfg).find((p) => p.id === packageId);
    if (!pkg) return res.status(404).json({ success: false, msg: "Package not found or inactive" });
    const isDemo = isDemoPackageId(pkg.id);
    const alreadyPurchased = Array.isArray(user.purchasedPackages)
      ? user.purchasedPackages.includes(pkg.id)
      : false;
    // The demo package is free for every logged-in user and bypasses the
    // purchase gate; all other packages still require purchase first.
    if (!alreadyPurchased && !isDemo) {
      return res.status(403).json({ success: false, msg: "Purchase this package before starting it" });
    }

    const latestPackageReport = getLatestPackageReport(
      user,
      pkg.id,
      getPackageLookup(cfg)
    );
    if (
      latestPackageReport?.publication?.status ===
      RESULT_PUBLICATION_STATUS.PENDING_APPROVAL
    ) {
      return res.status(409).json({
        success: false,
        msg: "Your latest result for this package is still pending approval.",
      });
    }

    const shouldResetProgress =
      resetProgress === true || String(user.selectedPackageId || "") !== String(pkg.id);

    user.selectedPackageId = pkg.id;
    if (shouldResetProgress) {
      user.testsInProgress = 0;
      user.testProgress = createEmptyTestProgress();
    }
    await user.save();
    return res.status(200).json({
      success: true,
      data: { packageId: pkg.id, resetProgress: shouldResetProgress },
    });
  } catch (err) {
    return res.status(500).json({ success: false, msg: err.message || "Failed to select package" });
  }
};

// POST /api/v1/user/package/purchase
export const purchasePackage = async (req, res) => {
  try {
    const { packageId, couponCode } = req.body || {};
    if (!packageId) return res.status(400).json({ success: false, msg: "packageId is required" });
    const [cfg, user] = await Promise.all([AssessmentConfig.getOrCreateDefault(), User.findById(req.user.id)]);
    if (!user) return res.status(404).json({ success: false, msg: "User not found" });
    const pkg = getActivePackages(cfg).find((p) => p.id === packageId);
    if (!pkg) return res.status(404).json({ success: false, msg: "Package not found or inactive" });

    // TEMPORARY payment guard — remove once Razorpay verification lands.
    //
    // This endpoint grants the paid entitlement outright: it writes
    // purchasedPackages / purchaseHistory with a hardcoded
    // paymentMethod: "Online" and never talks to a gateway. Until an order
    // is created and its signature verified server-side, any authenticated
    // user could POST here and unlock a paid package for free. Gated behind
    // an env flag rather than deleted, so dev/staging can still exercise the
    // flow and so this is a one-line revert.
    //
    // The free demo is carved out deliberately: Test.jsx routes every
    // zero-amount package through this same endpoint (mode "unlock" fires
    // when plan.amount <= 0), so a blanket 503 would break the demo, which
    // has no payment to protect.
    const paymentsBypass = process.env.ALLOW_FREE_PURCHASE === "true";
    if (!paymentsBypass && !isDemoPackageId(pkg.id)) {
      return res.status(503).json({
        success: false,
        msg: "Payments are being set up. Purchases are temporarily unavailable.",
      });
    }

    if (Array.isArray(user.purchasedPackages) && user.purchasedPackages.includes(pkg.id)) {
      return res.status(409).json({
        success: false,
        msg: "This package is already purchased and available in your account.",
      });
    }

    const originalAmount = Number(pkg.amount || 0);
    let finalAmount = originalAmount;
    let appliedCouponCode = null;
    let discountAmount = null;

    // Optional coupon. Re-validate server-side (never trust the client's
    // computed price) and increment usedCount atomically only when the
    // claim is < maxUses, so concurrent purchases can't both squeeze
    // past a hard cap.
    const trimmedCoupon = String(couponCode || "").trim().toUpperCase();
    if (trimmedCoupon) {
      const coupon = await Coupon.findOne({ code: trimmedCoupon });
      if (!coupon) {
        return res.status(400).json({ success: false, msg: "Coupon code not found." });
      }
      const redeemable = coupon.isRedeemable();
      if (!redeemable.ok) {
        return res.status(400).json({ success: false, msg: redeemable.reason });
      }
      const { discount, finalPrice } = coupon.applyToAmount(originalAmount);
      // Atomic increment guarded by the maxUses ceiling — falls through
      // to a 409 if some other concurrent request took the last slot.
      const filter = { _id: coupon._id, isActive: true };
      if (coupon.maxUses != null) {
        filter.usedCount = { $lt: coupon.maxUses };
      }
      const inc = await Coupon.updateOne(filter, { $inc: { usedCount: 1 } });
      if (inc.modifiedCount !== 1) {
        return res
          .status(409)
          .json({ success: false, msg: "Coupon usage limit reached" });
      }
      appliedCouponCode = coupon.code;
      discountAmount = discount;
      finalAmount = finalPrice;
    }

    user.selectedPackageId = pkg.id;
    user.purchasedPackages = [...new Set([...(user.purchasedPackages || []), pkg.id])];
    user.purchaseHistory = [
      ...(Array.isArray(user.purchaseHistory) ? user.purchaseHistory : []),
      {
        packageId: pkg.id,
        packageTitle: pkg.title,
        // `amount` is the post-discount value (what the user actually
        // paid); originalAmount preserves the pre-discount sticker for
        // the admin Payments table.
        amount: finalAmount,
        couponCode: appliedCouponCode,
        discountAmount,
        originalAmount,
        purchasedAt: new Date(),
        paymentMethod: "Online",
      },
    ];
    user.testsInProgress = 0;
    user.testProgress = createEmptyTestProgress();
    await user.save();
    return res.status(200).json({
      success: true,
      data: {
        packageId: pkg.id,
        originalAmount,
        discountAmount,
        finalAmount,
        couponCode: appliedCouponCode,
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, msg: err.message || "Failed to purchase package" });
  }
};

// POST /api/v1/user/coupon/validate
// Body: { code, packageId }
// Returns { valid, discountType, discountValue, finalPrice, ... } or
// { valid: false, msg }. This is a read-only sanity check — no DB
// writes, no usage counter increment. The actual claim happens at
// purchasePackage time, which re-runs all checks atomically.
export const validateCoupon = async (req, res) => {
  try {
    const { code, packageId } = req.body || {};
    const trimmed = String(code || "").trim().toUpperCase();
    if (!trimmed) {
      return res.status(400).json({ success: false, msg: "Code is required" });
    }
    if (!packageId) {
      return res.status(400).json({ success: false, msg: "packageId is required" });
    }
    const [cfg, coupon] = await Promise.all([
      AssessmentConfig.getOrCreateDefault(),
      Coupon.findOne({ code: trimmed }),
    ]);
    if (!coupon) {
      return res.status(404).json({ success: false, msg: "Coupon code not found." });
    }
    const redeemable = coupon.isRedeemable();
    if (!redeemable.ok) {
      return res.status(400).json({ success: false, msg: redeemable.reason });
    }
    const pkg = getActivePackages(cfg).find((p) => p.id === packageId);
    if (!pkg) {
      return res.status(404).json({ success: false, msg: "Package not found or inactive" });
    }
    const originalAmount = Number(pkg.amount || 0);
    // Same rule as /payment/order: a paid package can't be discounted below
    // Razorpay's ₹1 minimum. Refused here so the student is told before
    // they reach the pay button.
    if (coupon.makesFree(originalAmount)) {
      return res.status(400).json({ success: false, msg: FULL_DISCOUNT_MSG });
    }
    const { discount, finalPrice } = coupon.applyToAmount(originalAmount);
    return res.status(200).json({
      success: true,
      data: {
        valid: true,
        code: coupon.code,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        originalAmount,
        discountAmount: discount,
        finalPrice,
      },
    });
  } catch (err) {
    return res
      .status(500)
      .json({ success: false, msg: err.message || "Failed to validate coupon" });
  }
};

// GET /api/v1/user/package/current
export const getCurrentPackage = async (req, res) => {
  try {
    const [cfg, user] = await Promise.all([AssessmentConfig.getOrCreateDefault(), User.findById(req.user.id).lean()]);
    if (!user) return res.status(404).json({ success: false, msg: "User not found" });
    const pkg = getSelectedPackage(cfg, user);
    if (!pkg) return res.status(404).json({ success: false, msg: "No purchased package found" });
    const sections = getEnabledSections(pkg);
    return res.status(200).json({
      success: true,
      data: {
        package: { id: pkg.id, title: pkg.title, amount: pkg.amount },
        sections: sections.map((s) => ({
          sectionId: s.sectionId,
          title: s.title,
          durationMinutes: s.durationMinutes,
          scoringType: s.scoringType,
          totalQuestions: (s.questions || []).length,
        })),
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, msg: err.message || "Failed to load current package" });
  }
};

// GET /api/v1/user/profile
export const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .select(
        "_id jumpstartId name email mobile city dateOfBirth schoolName schoolLocation residentialAddress subscription role isSuspended selectedPackageId studentProfile createdAt"
      )
      .lean();
    if (!user) return res.status(404).json({ success: false, msg: "User not found" });
    return res.status(200).json({
      success: true,
      data: {
        user: {
          ...user,
          studentProfile: serializeStudentProfile(user.studentProfile),
        },
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, msg: err.message || "Failed to load profile" });
  }
};

// GET /api/v1/user/profile/student
export const getStudentProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .select("studentProfile")
      .lean();
    if (!user) return res.status(404).json({ success: false, msg: "User not found" });
    return res.status(200).json({
      success: true,
      data: {
        studentProfile: serializeStudentProfile(user.studentProfile),
        requiredFields: STUDENT_PROFILE_REQUIRED_FIELDS,
      },
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      msg: err.message || "Failed to load student profile",
    });
  }
};

// PUT /api/v1/user/profile/student
export const updateStudentProfile = async (req, res) => {
  try {
    const { patch, errors } = validateStudentProfilePayload(req.body || {});

    if (Object.keys(errors).length) {
      return res.status(400).json({
        success: false,
        msg: "Some fields need attention before saving your profile.",
        errors,
      });
    }

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ success: false, msg: "User not found" });

    const currentProfile = user.studentProfile?.toObject
      ? user.studentProfile.toObject()
      : user.studentProfile || {};
    const merged = { ...currentProfile, ...patch };

    // Re-validate the merged profile against required fields and surface a
    // single grouped error if anything mandatory is still missing. The
    // pre-save hook also recomputes isComplete, so this guard exists only
    // to return a 400 with a useful message instead of silently saving.
    const missingRequired = STUDENT_PROFILE_REQUIRED_FIELDS.filter((field) => {
      const value = merged[field];
      if (value == null) return true;
      if (value instanceof Date) return Number.isNaN(value.getTime());
      return String(value).trim() === "";
    });

    if (missingRequired.length) {
      const missingErrors = Object.fromEntries(
        missingRequired.map((field) => [field, "This field is required."])
      );
      return res.status(400).json({
        success: false,
        msg: "Please fill in all required student profile fields.",
        errors: missingErrors,
        missingRequired,
      });
    }

    user.studentProfile = merged;
    await user.save();

    return res.status(200).json({
      success: true,
      data: {
        studentProfile: serializeStudentProfile(user.studentProfile),
        isComplete: Boolean(user.studentProfile?.isComplete),
      },
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      msg: err.message || "Failed to update student profile",
    });
  }
};

// PATCH /api/v1/user/profile
export const updateProfile = async (req, res) => {
  try {
    const {
      name,
      email,
      mobile,
      city,
      dateOfBirth,
      schoolName,
      schoolLocation,
      residentialAddress,
      currentPassword,
      newPassword,
    } = req.body || {};
    const hasProfileUpdate =
      name !== undefined ||
      email !== undefined ||
      mobile !== undefined ||
      city !== undefined ||
      dateOfBirth !== undefined ||
      schoolName !== undefined ||
      schoolLocation !== undefined ||
      residentialAddress !== undefined ||
      newPassword !== undefined;
    if (!hasProfileUpdate) {
      return res.status(400).json({ success: false, msg: "No valid fields to update" });
    }

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ success: false, msg: "User not found" });

    if (name !== undefined) {
      const trimmed = String(name).trim();
      if (!trimmed) return res.status(400).json({ success: false, msg: "Name is required" });
      if (trimmed.length > 80) return res.status(400).json({ success: false, msg: "Name is too long" });
      user.name = trimmed;
    }

    if (email !== undefined) {
      const normalized = String(email).trim().toLowerCase();
      if (!emailRegex.test(normalized)) {
        return res.status(400).json({ success: false, msg: "Valid email is required" });
      }
      if (normalized !== user.email) {
        const existing = await User.findOne({ email: normalized, _id: { $ne: user._id } }).select("_id").lean();
        if (existing) return res.status(409).json({ success: false, msg: "Email is already in use" });
        user.email = normalized;
      }
    }

    if (mobile !== undefined) {
      user.mobile = String(mobile || "").trim();
    }

    if (city !== undefined) {
      user.city = String(city || "").trim().slice(0, 120);
    }

    if (dateOfBirth !== undefined) {
      user.dateOfBirth = String(dateOfBirth || "").trim().slice(0, 40);
    }

    if (schoolName !== undefined) {
      user.schoolName = String(schoolName || "").trim().slice(0, 160);
    }

    if (schoolLocation !== undefined) {
      user.schoolLocation = String(schoolLocation || "").trim().slice(0, 200);
    }

    if (residentialAddress !== undefined) {
      user.residentialAddress = String(residentialAddress || "").trim().slice(0, 240);
    }

    if (newPassword !== undefined) {
      const normalizedNewPassword = String(newPassword);
      if (normalizedNewPassword.length < 6) {
        return res.status(400).json({ success: false, msg: "New password must be at least 6 characters" });
      }
      if (user.password) {
        if (!currentPassword) {
          return res.status(400).json({ success: false, msg: "Current password is required" });
        }
        const ok = await user.comparePassword(String(currentPassword));
        if (!ok) return res.status(400).json({ success: false, msg: "Current password is incorrect" });
      }
      user.password = normalizedNewPassword;
    }

    await user.save();
    return res.status(200).json({
      success: true,
      data: {
        user: user.toAuthJSON(),
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, msg: err.message || "Failed to update profile" });
  }
};

// GET /api/v1/user/init
export const init = async (req, res) => {
  try {
    const [user, cfg] = await Promise.all([
      User.findById(req.user.id)
        .select("name email testsCompleted testsInProgress reportsReady counsellingSessions topCareers resultProfile resultPublication assessmentReports selectedPackageId purchasedPackages testProgress studentProfile")
        .lean(),
      AssessmentConfig.getOrCreateDefault(),
    ]);
    if (!user) return res.status(404).json({ success: false, msg: "User not found" });
    const packageLookup = getPackageLookup(cfg);
    const pkg = getSelectedPackage(cfg, user);
    const studentProfileSerialized = serializeStudentProfile(user.studentProfile);
    const ownedPackages = getOwnedPackages(cfg, user);
    const storedReports = getStoredAssessmentReports(user, packageLookup);
    const latestReport = storedReports[0] || null;
    const latestApprovedReport = getLatestApprovedAssessmentReport(
      user,
      packageLookup
    );
    const latestPublication = latestReport
      ? {
          status: latestReport.publication.status,
          submittedAt: latestReport.publication.submittedAt,
          approvedAt: latestReport.publication.approvedAt,
          hasProfileData: true,
        }
      : getResultPublicationState(user);
    const hasApprovedReport =
      latestApprovedReport?.publication?.status ===
      RESULT_PUBLICATION_STATUS.APPROVED;
    const topCareerSource = latestApprovedReport?.profile;
    const topCareers =
      hasApprovedReport &&
      Array.isArray(topCareerSource?.careerRecommendations) &&
      topCareerSource.careerRecommendations.length > 0
        ? topCareerSource.careerRecommendations.map((c) => ({ title: c.title, matchPercent: c.matchPercent }))
        : hasApprovedReport && Array.isArray(user.topCareers)
          ? user.topCareers
          : [];
    const resultHistory = buildStudentResultHistory(
      ownedPackages,
      user,
      packageLookup
    );

    const demoPackageDoc = findPackageById(cfg, DEMO_PACKAGE_ID);
    const demoActive = Boolean(
      demoPackageDoc && demoPackageDoc.active !== false
    );
    const demoReport = storedReports.find(
      (report) => isDemoPackageId(report.packageId) || report.isDemo
    );
    const demoTotalQuestions = demoActive
      ? (demoPackageDoc.sections || []).reduce(
          (sum, section) =>
            sum + (Array.isArray(section.questions) ? section.questions.length : 0),
          0
        )
      : 0;

    return res.status(200).json({
      success: true,
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          selectedPackageId: pkg?.id || "",
          studentProfile: { isComplete: studentProfileSerialized.isComplete },
        },
        student_profile: studentProfileSerialized,
        student_profile_complete: studentProfileSerialized.isComplete,
        tests_completed: user.testsCompleted ?? 0,
        tests_in_progress: user.testsInProgress ?? 0,
        reports_ready: resultHistory.summary.publishedCount,
        counselling_sessions: user.counsellingSessions ?? 0,
        available_tests: buildAvailableTests(
          ownedPackages,
          {
            ...(user.testProgress || {}),
            packageId: user.selectedPackageId || "",
          }
        ),
        purchased_packages: buildPurchasedPackages(
          ownedPackages,
          user,
          packageLookup
        ),
        result_status: latestPublication.status,
        result_submitted_at: latestPublication.submittedAt,
        result_approved_at: latestPublication.approvedAt,
        top_careers: topCareers,
        tests_history: resultHistory.tests,
        tests_history_summary: resultHistory.summary,
        demo_test: demoActive
          ? {
              packageId: DEMO_PACKAGE_ID,
              title: demoPackageDoc.title || "Client Demo Test",
              totalQuestions: demoTotalQuestions,
              totalDurationMinutes: (demoPackageDoc.sections || []).reduce(
                (sum, section) => sum + Number(section.durationMinutes || 0),
                0
              ),
              attempted: Boolean(demoReport),
              latestReportId: demoReport?._id || "",
              publishedReportId:
                demoReport &&
                demoReport.publication?.status ===
                  RESULT_PUBLICATION_STATUS.APPROVED
                  ? demoReport._id
                  : "",
              publicationStatus:
                demoReport?.publication?.status ||
                RESULT_PUBLICATION_STATUS.NOT_SUBMITTED,
            }
          : null,
        // Prompt-9 Fix 3: in-progress test descriptor for the
        // Dashboard's "Continue Test" card. Null when the student
        // hasn't started a test yet OR has finished every section of
        // the currently selected package. The dashboard reads this
        // directly without re-deriving from testProgress + package
        // metadata client-side.
        test_in_progress: (() => {
          const progress = user.testProgress || {};
          const activePackageId = String(user.selectedPackageId || "");
          if (!activePackageId || !pkg) return null;
          const sections = getEnabledSections(pkg);
          if (!sections.length) return null;
          const completedSet = new Set(
            Array.isArray(progress.completedSectionIds)
              ? progress.completedSectionIds.map((id) => Number(id))
              : []
          );
          const hasAnyAnswer =
            progress.answers && Object.keys(progress.answers).length > 0;
          const hasMidSection = Number(progress.questionIndex || 0) > 0;
          const hasCompleted = completedSet.size > 0;
          // Only show a "Continue" card when there's real progress
          // (some answer, any completed section, or a non-zero
          // questionIndex). A freshly purchased package with zero
          // progress shouldn't surface as in-progress.
          if (!hasAnyAnswer && !hasCompleted && !hasMidSection) return null;
          // If every enabled section is already completed, the test
          // is awaiting submit — don't show as in-progress.
          const allDone = sections.every((s) =>
            completedSet.has(Number(s.sectionId))
          );
          if (allDone) return null;
          const currentSectionId = Number(
            progress.sectionId || sections[0]?.sectionId || 1
          );
          const currentSection =
            sections.find((s) => Number(s.sectionId) === currentSectionId) ||
            sections[0];
          return {
            packageId: pkg.id,
            packageTitle: pkg.title || "",
            sectionId: currentSectionId,
            sectionTitle: currentSection?.title || `Section ${currentSectionId}`,
            completedSectionsCount: sections.filter((s) =>
              completedSet.has(Number(s.sectionId))
            ).length,
            totalSections: sections.length,
            questionIndex: Number(progress.questionIndex || 0),
            timeRemainingSeconds: Number(progress.timeRemainingSeconds || 0),
            updatedAt: progress.updatedAt || null,
          };
        })(),
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, msg: err.message || "Failed to load dashboard" });
  }
};

// GET /api/v1/user/results
export const getResults = async (req, res) => {
  try {
    const [user, cfg] = await Promise.all([
      User.findById(req.user.id)
        .select(
          "name email selectedPackageId purchasedPackages testProgress testsInProgress testsCompleted resultProfile resultPublication assessmentReports"
        )
        .lean(),
      AssessmentConfig.getOrCreateDefault(),
    ]);
    if (!user) return res.status(404).json({ success: false, msg: "User not found" });
    const packageLookup = getPackageLookup(cfg);
    const ownedPackages = getOwnedPackages(cfg, user);
    const storedReports = getStoredAssessmentReports(user, packageLookup);
    const latestReport = storedReports[0] || null;
    const latestApprovedReport = getLatestApprovedAssessmentReport(
      user,
      packageLookup
    );
    const history = buildStudentResultHistory(
      ownedPackages,
      user,
      packageLookup
    );
    const overallResultsSummary = buildOverallResultsSummary(history.tests);
    const latestPublishedProfile = latestApprovedReport?.profile || {};
    const latestPublication = latestReport?.publication || getResultPublicationState(user);
    const hasVisibleResults = history.summary.publishedCount > 0;

    return res.status(200).json({
      success: true,
      data: {
        hasResults: hasVisibleResults,
        resultStatus: latestPublication.status,
        submittedAt: latestPublication.submittedAt,
        approvedAt: latestPublication.approvedAt,
        estimatedReadyHours:
          latestPublication.status === RESULT_PUBLICATION_STATUS.PENDING_APPROVAL
            ? 48
            : null,
        overallScore: hasVisibleResults
          ? overallResultsSummary.overallScore
          : null,
        overallPercentile: hasVisibleResults
          ? overallResultsSummary.overallPercentile
          : "",
        scoredTestsCount: hasVisibleResults
          ? overallResultsSummary.scoredTestsCount
          : 0,
        completedTestsCount: history.summary.attemptedCount ?? 0,
        totalTestsCount: history.summary.totalPurchased ?? 0,
        careerPathwaysCount: hasVisibleResults
          ? latestPublishedProfile.careerPathwaysCount ?? 0
          : 0,
        testResults:
          hasVisibleResults && Array.isArray(latestPublishedProfile.testResults)
            ? latestPublishedProfile.testResults
            : [],
        strengths:
          hasVisibleResults && Array.isArray(latestPublishedProfile.strengths)
            ? latestPublishedProfile.strengths
            : [],
        careerRecommendations:
          hasVisibleResults &&
          Array.isArray(latestPublishedProfile.careerRecommendations)
            ? latestPublishedProfile.careerRecommendations
            : [],
        personalityType: hasVisibleResults
          ? latestPublishedProfile.personalityType || null
          : null,
        tests: history.tests,
        testsSummary: history.summary,
        latestPublishedReportId: latestApprovedReport?._id || "",
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, msg: err.message || "Failed to load results" });
  }
};

// GET /api/v1/user/results/:reportId
export const getResultDetail = async (req, res) => {
  try {
    const { reportId } = req.params;
    const [user, cfg] = await Promise.all([
      User.findById(req.user.id)
        .select(
          "_id name email jumpstartId mobile city studentProfile selectedPackageId resultProfile resultPublication assessmentReports testsCompleted updatedAt createdAt"
        )
        .lean(),
      AssessmentConfig.getOrCreateDefault(),
    ]);
    if (!user) return res.status(404).json({ success: false, msg: "User not found" });

    const packageLookup = getPackageLookup(cfg);
    const storedReports = getStoredAssessmentReports(user, packageLookup);
    const report = storedReports.find(
      (item) => String(item._id) === String(reportId || "")
    );

    if (!report) {
      return res.status(404).json({ success: false, msg: "Result report not found" });
    }

    const hasAccess =
      report.publication.status === RESULT_PUBLICATION_STATUS.APPROVED;

    return res.status(200).json({
      success: true,
      data: {
        hasAccess,
        resultStatus: report.publication.status,
        submittedAt: report.publication.submittedAt,
        approvedAt: report.publication.approvedAt,
        estimatedReadyHours:
          report.publication.status === RESULT_PUBLICATION_STATUS.PENDING_APPROVAL
            ? 48
            : null,
        report: hasAccess
          ? buildStudentReportDetail(report, user, packageLookup)
          : null,
      },
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      msg: err.message || "Failed to load result report",
    });
  }
};

// PATCH /api/v1/user/results
export const updateResults = async (req, res) => {
  try {
    const allowed = [
      "overallScore",
      "overallPercentile",
      "completedTestsCount",
      "totalTestsCount",
      "careerPathwaysCount",
      "testResults",
      "sectionBreakdown",
      "strengths",
      "careerRecommendations",
      "personalityType",
      "reviewSummary",
    ];
    const nextProfileUpdates = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        nextProfileUpdates[key] = req.body[key];
      }
    }
    if (!Object.keys(nextProfileUpdates).length) {
      return res.status(400).json({ success: false, msg: "No valid fields to update" });
    }

    const user = await User.findById(req.user.id).select(
      "resultProfile resultPublication assessmentReports topCareers reportsReady updatedAt createdAt"
    );
    if (!user) return res.status(404).json({ success: false, msg: "User not found" });
    user.resultProfile = {
      ...(user.resultProfile?.toObject ? user.resultProfile.toObject() : user.resultProfile || {}),
      ...nextProfileUpdates,
    };

    if (Array.isArray(user.assessmentReports) && user.assessmentReports.length) {
      const latestIndex = user.assessmentReports.length - 1;
      const currentProfile =
        user.assessmentReports[latestIndex]?.profile?.toObject
          ? user.assessmentReports[latestIndex].profile.toObject()
          : user.assessmentReports[latestIndex]?.profile || {};
      user.assessmentReports[latestIndex].profile = {
        ...currentProfile,
        ...nextProfileUpdates,
      };
      user.assessmentReports[latestIndex].updatedAt = new Date();
      syncLegacyStateFromReports(user);
    }

    await user.save();
    return res.status(200).json({
      success: true,
      data: { resultProfile: user.resultProfile },
    });
  } catch (err) {
    res.status(500).json({ success: false, msg: err.message || "Failed to update results" });
  }
};

// GET /api/v1/user/test-progress
export const getTestProgress = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("testProgress selectedPackageId purchasedPackages").lean();
    if (!user) return res.status(404).json({ success: false, msg: "User not found" });

    // Entitlement, not just authentication. selectedPackageId records which
    // package the student picked; it does not prove they paid for it, so a
    // checkout abandoned after selection must not reach test data.
    if (!hasPackageEntitlement(user, user.selectedPackageId)) {
      return res.status(403).json({
        success: false,
        msg: "Purchase this package before continuing.",
      });
    }
    const p = user.testProgress || {};
    return res.status(200).json({
      success: true,
      data: {
        packageId: user.selectedPackageId || "",
        sectionId: p.sectionId ?? 1,
        questionIndex: p.questionIndex ?? 0,
        answers: p.answers || {},
        completedSectionIds: Array.isArray(p.completedSectionIds) ? p.completedSectionIds : [],
        timeRemainingSeconds: p.timeRemainingSeconds,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, msg: err.message || "Failed to load progress" });
  }
};

// PATCH /api/v1/user/test-progress
export const patchTestProgress = async (req, res) => {
  try {
    const { sectionId, questionIndex, answers, completedSectionIds, timeRemainingSeconds } = req.body;
    const now = new Date();

    // Duration tracking needs read-modify-write semantics (set startedAt
    // exactly once, append a section-timing row exactly once per
    // section), so we fetch the user first instead of using a blind
    // $set. The hot path (typing an answer, ticking a timer) still
    // resolves in a single round-trip.
    const user = await User.findById(req.user.id).select("testProgress testsInProgress selectedPackageId purchasedPackages");
    if (!user) {
      return res.status(404).json({ success: false, msg: "User not found" });
    }

    // Entitlement, not just authentication. selectedPackageId records which
    // package the student picked; it does not prove they paid for it, so a
    // checkout abandoned after selection must not reach test data.
    if (!hasPackageEntitlement(user, user.selectedPackageId)) {
      return res.status(403).json({
        success: false,
        msg: "Purchase this package before continuing.",
      });
    }

    if (sectionId !== undefined) user.testProgress.sectionId = sectionId;
    if (questionIndex !== undefined) user.testProgress.questionIndex = questionIndex;
    if (answers !== undefined) user.testProgress.answers = answers;
    if (timeRemainingSeconds !== undefined) {
      user.testProgress.timeRemainingSeconds = timeRemainingSeconds;
    }

    const previouslyCompleted = new Set(
      (user.testProgress.completedSectionIds || []).map((n) => Number(n))
    );
    let nextCompleted = previouslyCompleted;
    if (Array.isArray(completedSectionIds)) {
      nextCompleted = new Set(
        completedSectionIds.map((n) => Number(n)).filter(Boolean)
      );
      user.testProgress.completedSectionIds = [...nextCompleted];
    }

    // Stamp startedAt on the very first progress ping — this is when
    // the student lands on Q1 of section 1, before they've answered
    // anything or completed any section. Subsequent pings leave it
    // alone so resuming a paused test doesn't reset the clock.
    if (!user.testProgress.startedAt) {
      user.testProgress.startedAt = now;
    }

    // Maintain sectionTimings:
    //   - Mark startedAt for the active section the first time we see
    //     it surface in the progress (or fall back to the test start).
    //   - Stamp completedAt the first time the section appears in
    //     completedSectionIds.
    const timings = Array.isArray(user.testProgress.sectionTimings)
      ? user.testProgress.sectionTimings
      : [];
    const findOrAdd = (id) => {
      let row = timings.find((t) => Number(t.sectionId) === Number(id));
      if (!row) {
        row = { sectionId: Number(id), startedAt: null, completedAt: null };
        timings.push(row);
      }
      return row;
    };

    if (sectionId !== undefined) {
      const row = findOrAdd(sectionId);
      if (!row.startedAt) {
        row.startedAt = now;
      }
    }

    [...nextCompleted].forEach((id) => {
      if (previouslyCompleted.has(id)) return; // already tracked
      const row = findOrAdd(id);
      if (!row.startedAt) row.startedAt = user.testProgress.startedAt || now;
      if (!row.completedAt) row.completedAt = now;
    });

    user.testProgress.sectionTimings = timings;
    user.testProgress.updatedAt = now;

    const hasStarted =
      (answers && Object.keys(answers).length > 0) ||
      Number(questionIndex || 0) > 0 ||
      nextCompleted.size > 0;
    if (hasStarted) user.testsInProgress = 1;

    await user.save();
    return res.status(200).json({ success: true, data: { ok: true } });
  } catch (err) {
    res.status(500).json({ success: false, msg: err.message || "Failed to save progress" });
  }
};

// POST /api/v1/user/test-submit
export const postTestSubmit = async (req, res) => {
  try {
    const [cfg, user] = await Promise.all([AssessmentConfig.getOrCreateDefault(), User.findById(req.user.id)]);
    if (!user) return res.status(404).json({ success: false, msg: "User not found" });

    // Entitlement, not just authentication. selectedPackageId records which
    // package the student picked; it does not prove they paid for it, so a
    // checkout abandoned after selection must not reach test data.
    if (!hasPackageEntitlement(user, user.selectedPackageId)) {
      return res.status(403).json({
        success: false,
        msg: "Purchase this package before continuing.",
      });
    }
    const pkg = getSelectedPackage(cfg, user);
    if (!pkg) return res.status(400).json({ success: false, msg: "No purchased package selected" });
    const sections = getEnabledSections(pkg);
    const completedSet = new Set(
      Array.isArray(user.testProgress?.completedSectionIds)
        ? user.testProgress.completedSectionIds.map((id) => Number(id))
        : []
    );
    const missingSections = sections.filter(
      (section) => !completedSet.has(Number(section.sectionId))
    );
    if (missingSections.length) {
      return res.status(400).json({
        success: false,
        msg: "Complete all sections before submitting the final assessment",
      });
    }
    const answers = req.body?.answers && typeof req.body.answers === "object" ? req.body.answers : (user.testProgress?.answers || {});
    const answeredCount = countAnsweredQuestionsAcrossSections(sections, answers);
    if (!answeredCount) {
      return res.status(400).json({
        success: false,
        msg: "Answer at least one question before submitting",
      });
    }
    const profile = computeAssessmentResult({
      answers,
      sections,
      packageId: pkg.id,
    });
    if (!profile) return res.status(400).json({ success: false, msg: "No valid answers to submit" });

    const wasInProgress = Number(user.testsInProgress || 0) > 0;
    const submittedAt = new Date();
    const publication = {
      status: RESULT_PUBLICATION_STATUS.PENDING_APPROVAL,
      submittedAt,
      approvedAt: null,
      approvedByName: "",
    };

    // Duration capture. Total = submitted - testProgress.startedAt
    // (null when startedAt was never set — i.e. pre-existing user state
    // from before duration tracking was added; we leave it null then so
    // the UI can hide the line gracefully). Per-section pulls from
    // testProgress.sectionTimings; falls back to deriving from the
    // section's configured durationMinutes minus timeRemainingSeconds
    // for the section that was active when submit fired, if needed.
    const minutesBetween = (start, end) => {
      if (!start || !end) return null;
      const diff = (new Date(end).getTime() - new Date(start).getTime()) / 60000;
      if (!Number.isFinite(diff) || diff < 0) return null;
      return Math.max(1, Math.round(diff));
    };

    const totalDurationMinutes = minutesBetween(
      user.testProgress?.startedAt,
      submittedAt
    );

    const timings = Array.isArray(user.testProgress?.sectionTimings)
      ? user.testProgress.sectionTimings
      : [];
    const sectionDurations = sections.map((section) => {
      const row = timings.find(
        (t) => Number(t.sectionId) === Number(section.sectionId)
      );
      let durationMinutes = null;
      if (row) {
        const end = row.completedAt || submittedAt;
        durationMinutes = minutesBetween(row.startedAt, end);
      } else if (
        Number(user.testProgress?.sectionId) === Number(section.sectionId) &&
        Number.isFinite(Number(user.testProgress?.timeRemainingSeconds)) &&
        Number(section.durationMinutes) > 0
      ) {
        // Fallback for the section that was active at submit time but
        // never got a sectionTimings row (e.g. a one-shot submit without
        // intermediate progress pings): derive from the configured
        // section budget minus the time remaining when submit fired.
        const elapsedMin =
          Number(section.durationMinutes) -
          Number(user.testProgress.timeRemainingSeconds) / 60;
        if (Number.isFinite(elapsedMin) && elapsedMin > 0) {
          durationMinutes = Math.max(1, Math.round(elapsedMin));
        }
      }
      return {
        sectionId: String(section.sectionId),
        sectionTitle: section.title || "",
        durationMinutes,
      };
    });

    const nextReport = createAssessmentReportEntry({
      user,
      packageId: pkg.id,
      packageTitle: pkg.title,
      profile,
      publication,
      isDemo: isDemoPackageId(pkg.id),
      manualReviewItems: Array.isArray(profile?.manualReviewItems)
        ? profile.manualReviewItems
        : [],
      // Snapshot the answer set onto the report NOW, in the same object
      // that gets pushed and saved below. `user.testProgress` is reset to
      // an empty buffer a few lines further down (and package-switch and
      // purchase wipe it too), so a follow-up write would already be too
      // late — the answers would be gone. This is what makes the report
      // re-scoreable later.
      rawAnswers: answers,
      scoringVersion: profile?.metadata?.algorithmKey || "",
      normVersion: CURRENT_NORM_VERSION,
    });
    nextReport.totalDurationMinutes = totalDurationMinutes;
    nextReport.sectionDurations = sectionDurations;

    user.assessmentReports = Array.isArray(user.assessmentReports)
      ? [...user.assessmentReports, nextReport]
      : [nextReport];
    user.testsCompleted = clamp(
      (user.testsCompleted || 0) + (wasInProgress ? 1 : 0),
      0,
      9999
    );
    user.testsInProgress = 0;
    user.testProgress = {
      sectionId: 1,
      questionIndex: 0,
      answers: {},
      completedSectionIds: [],
      timeRemainingSeconds: null,
      updatedAt: null,
      startedAt: null,
      sectionTimings: [],
    };
    syncLegacyStateFromReports(user);
    await user.save();
    return res.status(200).json({
      success: true,
      data: {
        resultProfile: user.resultProfile,
        resultStatus: user.resultPublication.status,
        reportId:
          user.assessmentReports?.[user.assessmentReports.length - 1]?._id || "",
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, msg: err.message || "Failed to submit test" });
  }
};

import User from "../models/User.js";
import AssessmentConfig from "../models/AssessmentConfig.js";
import Coupon, { FULL_DISCOUNT_MSG } from "../models/Coupon.js";
import Payment from "../models/Payment.js";
import WebVital, { METRIC_NAMES } from "../models/WebVital.js";
import { adminPaymentStatus, refundedPaise } from "../utils/refunds.js";
import {
  ACCESS_REVOKED_REFUND,
  getRevokedPackageIds,
  isPackageRevoked,
} from "../services/entitlementService.js";
import {
  getResultPublicationState,
  RESULT_PUBLICATION_STATUS,
} from "../utils/resultApproval.js";
import {
  cloneManualReviewItems,
  computeHasUnreviewedItems,
  getStoredAssessmentReports,
  syncLegacyStateFromReports,
} from "../utils/assessmentReports.js";
import { matchCareers } from "../utils/scoring/careerMatcher.js";
import { DEMO_APTITUDE_BANDS } from "../utils/scoring/configs/career500qDemo.config.js";
import {
  buildStudentReportDetail,
  getActivePackages,
  getPackageLookup,
} from "./userController.js";

const fmtCurrency = (n) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(
    Number(n || 0)
  );

const fmtDate = (d) => {
  if (!d) return "-";
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return "-";
  return dt.toLocaleString("en-IN", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const shortAgo = (d) => {
  if (!d) return "Never";
  const now = Date.now();
  const ts = new Date(d).getTime();
  if (Number.isNaN(ts)) return "Never";
  const diff = Math.max(0, Math.floor((now - ts) / 1000));
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
};

const monthKey = (d) => {
  const dt = new Date(d);
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
};

const monthLabel = (key) => {
  const [y, m] = key.split("-").map(Number);
  const dt = new Date(y, m - 1, 1);
  return dt.toLocaleString("en-IN", { month: "short" });
};

const toTimestamp = (value) => {
  const timestamp = value ? new Date(value).getTime() : 0;
  return Number.isFinite(timestamp) ? timestamp : 0;
};

const getConfigLookup = (cfg) => {
  const map = new Map();
  for (const p of cfg?.packages || []) map.set(p.id, p);
  return map;
};

// Payments-table status for a purchase revoked by a full refund. Also the
// filter value the admin UI sends back, so keep it in step with Payments.jsx.
const REFUNDED_ACCESS_REMOVED = "Refunded – access removed";

// Pending reports for a package lost to a full refund leave the review
// queue: nobody should spend time reviewing a refunded test. They stay
// stored, and return to the queue if the student buys the package again.
const isHiddenFromReviewQueue = (report, revokedPackageIds) =>
  report.publication.status === RESULT_PUBLICATION_STATUS.PENDING_APPROVAL &&
  revokedPackageIds.has(String(report.packageId || ""));

// `ledgerByOrderId` (optional) maps razorpayOrderId -> the captured Payment
// ledger row. Only the admin Payments table passes it, to put the real
// Payment id (the receipt download key) and the refund state on each row;
// purchases with no ledger row (free activations, legacy records) get
// paymentId null and no ledger status.
const getUserPurchaseEntries = (user, packageMap, ledgerByOrderId = new Map()) => {
  const explicitHistory = Array.isArray(user?.purchaseHistory)
    ? user.purchaseHistory.filter((item) => item?.packageId)
    : [];

  if (explicitHistory.length > 0) {
    return explicitHistory.map((purchase, idx) => {
      const pkg = packageMap.get(purchase.packageId);
      const amount = Number(
        purchase.amount != null ? purchase.amount : pkg?.amount || 0
      );
      // Reconstruct original price + discount from the purchase trail
      // for the admin Payments table. Older purchases that predate the
      // coupon system have no trail and fall back to `amount` for both,
      // which renders as "₹X / None / ₹0 / ₹X" in the admin UI.
      const originalAmount =
        purchase.originalAmount != null
          ? Number(purchase.originalAmount)
          : amount;
      const discountAmount =
        purchase.discountAmount != null
          ? Number(purchase.discountAmount)
          : Math.max(0, originalAmount - amount);
      const couponCode = purchase.couponCode || null;
      const purchasedAt =
        purchase.purchasedAt || user.updatedAt || user.createdAt || null;
      const ledger =
        (purchase.razorpayOrderId &&
          ledgerByOrderId.get(purchase.razorpayOrderId)) ||
        null;
      // Ledger amounts are paise; this table works in rupees.
      const refundedAmount = ledger ? refundedPaise(ledger) / 100 : 0;

      return {
        // Internal unique key (contains the user's DB id). Used for
        // notification ids only — stripped before rows reach the Payments
        // table, which shows `id` below instead.
        key: `${String(user._id)}-purchase-${idx + 1}-${String(
          purchase.packageId || "package"
        )}-${toTimestamp(purchasedAt)}`,
        // Displayed / exported order id: the gateway's, never ours.
        id: purchase.razorpayOrderId || purchase.razorpayPaymentId || "—",
        userId: String(user._id),
        name: user.name || "Unknown",
        email: user.email || "",
        package: purchase.packageTitle || pkg?.title || purchase.packageId,
        packageId: purchase.packageId || "",
        amount,
        amountLabel: fmtCurrency(amount),
        // Coupon trail surfaced for the admin Payments table.
        couponCode,
        originalAmount,
        originalAmountLabel: fmtCurrency(originalAmount),
        discountAmount,
        discountAmountLabel: fmtCurrency(discountAmount),
        method: purchase.paymentMethod || "Online",
        date: purchasedAt,
        paymentId: ledger ? String(ledger._id) : null,
        // Paid / Refunded / Refund processing / Refund failed, or null when
        // there is no ledger row (shown as "Completed"). A purchase revoked
        // by a full refund says so explicitly.
        ledgerStatus:
          purchase.status === "refunded"
            ? REFUNDED_ACCESS_REMOVED
            : ledger
              ? adminPaymentStatus(ledger)
              : null,
        refundedAmount,
        refundedAt: refundedAmount > 0 ? ledger.refundedAt || null : null,
        fallback: false,
      };
    });
  }

  const purchases = Array.isArray(user?.purchasedPackages) ? user.purchasedPackages : [];
  return purchases.map((pkgId, idx) => {
    const pkg = packageMap.get(pkgId);
    const amount = Number(pkg?.amount || 0);
    return {
      key: `${String(user._id)}-purchase-fallback-${idx + 1}-${String(pkgId)}`,
      id: "—",
      userId: String(user._id),
      name: user.name || "Unknown",
      email: user.email || "",
      package: pkg?.title || pkgId,
      packageId: pkgId,
      amount,
      amountLabel: fmtCurrency(amount),
      method: idx % 2 === 0 ? "UPI" : "Card",
      date: user.updatedAt || user.createdAt || null,
      paymentId: null,
      ledgerStatus: null,
      refundedAmount: 0,
      refundedAt: null,
      fallback: true,
    };
  });
};

// Captured Payment ledger rows keyed by razorpayOrderId. Passed to
// buildPayments so every row carries its refund state (utils/refunds.js),
// which is what makes each admin revenue figure net of refunds. A refunded
// payment stays status "paid" on the ledger.
const loadLedgerByOrderId = async () => {
  const ledger = await Payment.find({ status: "paid" })
    .select("_id razorpayOrderId amount refundStatus refundAmount refundedAt")
    .lean();
  return new Map(ledger.map((p) => [p.razorpayOrderId, p]));
};

// Rupees kept from one purchase row: what was paid less any processed
// refund. The single definition of "revenue" for the admin pages.
const netRevenue = (p) => Number(p.amount || 0) - Number(p.refundedAmount || 0);

const buildPayments = (users, packageMap, ledgerByOrderId) => {
  const rows = [];
  for (const u of users) {
    getUserPurchaseEntries(u, packageMap, ledgerByOrderId).forEach(
      ({ ledgerStatus, ...purchase }) => {
        rows.push({
          ...purchase,
          status: ledgerStatus || "Completed",
        });
      }
    );
  }
  return rows.sort((a, b) => toTimestamp(b.date) - toTimestamp(a.date));
};

const toInitials = (name = "") =>
  String(name)
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join("") || "NA";

const ensureAdmin = (req, res) => {
  if (!req.user || req.user.role !== "admin") {
    res.status(403).json({ success: false, msg: "Admin access required" });
    return false;
  }
  return true;
};

const getPublicationStatusLabel = (status) => {
  if (status === RESULT_PUBLICATION_STATUS.PENDING_APPROVAL) {
    return "Pending Approval";
  }
  if (status === RESULT_PUBLICATION_STATUS.APPROVED) {
    return "Published";
  }
  return "Submitted";
};

const toFiniteNumber = (value, fallback = 0) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
};

const createAdminNotification = ({
  id,
  type,
  title,
  message,
  eventAt,
  link,
}) => ({
  id,
  type,
  title,
  message,
  eventAt,
  timeLabel: shortAgo(eventAt),
  dateLabel: fmtDate(eventAt),
  link: link || "/admin/dashboard",
});

const roundScoreValue = (value) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return Number.isInteger(numeric) ? numeric : Number(numeric.toFixed(2));
};

const getQuestionPossibleValue = (question = {}) => {
  const weight = toFiniteNumber(question.weight, 1);
  if (String(question.type || "").toLowerCase() === "likert") {
    return 5 * weight;
  }
  return weight;
};

const getConfiguredSectionPossibleValue = (section = {}) =>
  (Array.isArray(section.questions) ? section.questions : []).reduce(
    (sum, question) => sum + getQuestionPossibleValue(question),
    0
  );

const getConfiguredSectionQuestionCount = (section = {}) =>
  Array.isArray(section.questions) ? section.questions.length : 0;

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

// Shape the studentProfile sub-doc into a snapshot the admin UI renders.
// dateOfBirth is normalised to YYYY-MM-DD so the review block can display
// it without re-parsing.
const buildAdminStudentProfileSnapshot = (profile) => {
  const plain = profile?.toObject ? profile.toObject() : profile || {};
  let dateOfBirth = "";
  if (plain.dateOfBirth) {
    const dt =
      plain.dateOfBirth instanceof Date
        ? plain.dateOfBirth
        : new Date(plain.dateOfBirth);
    if (!Number.isNaN(dt.getTime())) {
      const y = dt.getUTCFullYear();
      const m = String(dt.getUTCMonth() + 1).padStart(2, "0");
      const d = String(dt.getUTCDate()).padStart(2, "0");
      dateOfBirth = `${y}-${m}-${d}`;
    }
  }
  return {
    dateOfBirth,
    gender: plain.gender || "",
    phone: plain.phone || "",
    schoolOrCollege: plain.schoolOrCollege || "",
    classOrGrade: plain.classOrGrade || "",
    stream: plain.stream || "",
    board: plain.board || "",
    city: plain.city || "",
    state: plain.state || "",
    isComplete: Boolean(plain.isComplete),
  };
};

const buildAdminReviewPayload = (user, cfg, reportOverride = null) => {
  const packageMap = getConfigLookup(cfg);
  const report =
    reportOverride ||
    getStoredAssessmentReports(user, packageMap)[0] || {
      _id: String(user._id),
      packageId: user.selectedPackageId || "",
      packageTitle: "",
      attemptNumber: Math.max(1, Number(user.testsCompleted || 1)),
      profile: user.resultProfile || {},
      publication: getResultPublicationState(user),
    };
  const publication = report.publication || getResultPublicationState(user);
  const accessRevoked = isPackageRevoked(user, report.packageId);
  const profile = report.profile || user.resultProfile || {};
  const pkg = packageMap.get(report.packageId || user.selectedPackageId || "");
  const storedBreakdown =
    Array.isArray(profile.sectionBreakdown) && profile.sectionBreakdown.length
      ? profile.sectionBreakdown
      : buildFallbackSectionBreakdown(profile);
  const knownSectionIds = new Set(
    storedBreakdown.map((section) => Number(section.sectionId))
  );
  const pendingSections = Array.isArray(pkg?.sections)
    ? pkg.sections
        .filter((section) => section.enabled !== false)
        .filter((section) => !knownSectionIds.has(Number(section.sectionId)))
        .map((section) => ({
          sectionId: section.sectionId,
          title: section.title,
          score: 0,
          maxScore: roundScoreValue(getConfiguredSectionPossibleValue(section)),
          average: null,
          percentage: 0,
          answeredCount: 0,
          totalQuestions: getConfiguredSectionQuestionCount(section),
          status: "incomplete",
          interpretation: "Section not completed",
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
  // Prompt-5 fix: prefer the scorer's top-level completedSections /
  // totalSections fields (which now reflect dynamic assigned counts).
  // Fall back to deriving from section.status only when the report
  // pre-dates the scorer fix and those fields aren't present.
  const completedSections = Number.isFinite(Number(profile.completedSections))
    ? Number(profile.completedSections)
    : sectionBreakdown.filter((section) => section.status !== "incomplete")
        .length;
  const totalSections = Number.isFinite(Number(profile.totalSections))
    ? Number(profile.totalSections)
    : Number(profile.totalTestsCount || 0) || sectionBreakdown.length || 0;
  const scoreTotals = sectionBreakdown.reduce(
    (totals, section) => ({
      score: totals.score + toFiniteNumber(section.score, 0),
      maxScore: totals.maxScore + toFiniteNumber(section.maxScore, 0),
    }),
    { score: 0, maxScore: 0 }
  );
  const overallScore = roundScoreValue(
    profile.overallScore != null ? Number(profile.overallScore) : scoreTotals.score
  );
  const hasSectionPercentages = sectionBreakdown.some((section) =>
    Number.isFinite(toFiniteNumber(section.percentage, NaN))
  );
  const inferredPercentStyleSummary =
    profile?.metadata?.overallMaxScore == null &&
    Number.isFinite(toFiniteNumber(profile?.overallScore, NaN)) &&
    hasSectionPercentages;
  const maxScore = roundScoreValue(
    inferredPercentStyleSummary
      ? 100
      : profile?.metadata?.overallMaxScore ??
          scoreTotals.maxScore ??
          Number(profile.totalTestsCount || 0) ??
          100
  );
  const percentage =
    inferredPercentStyleSummary
      ? roundScoreValue(overallScore)
      : maxScore > 0
      ? roundScoreValue((overallScore / maxScore) * 100)
      : roundScoreValue(Number(profile.overallScore || 0));
  const strongestSignals = Array.isArray(profile.reviewSummary?.strongestSignals)
    ? profile.reviewSummary.strongestSignals.filter(Boolean)
    : [];
  const topCareerTitles = Array.isArray(profile.reviewSummary?.topCareerTitles)
    ? profile.reviewSummary.topCareerTitles.filter(Boolean)
    : [];
  const observations = Array.isArray(profile.reviewSummary?.observations)
    ? profile.reviewSummary.observations.filter(Boolean)
    : [];
  const reviewStatusLabel =
    completedSections >= totalSections && totalSections > 0
      ? "Ready for Review"
      : "Incomplete Submission";
  const completionObservation =
    completedSections >= totalSections && totalSections > 0
      ? "All configured sections were completed and are ready for admin review."
      : "Some sections are incomplete and should be reviewed before publication.";
  const normalizedObservations = [
    ...observations.filter(
      (item) =>
        !/all available sections were completed|all configured sections were completed|some sections .* incomplete/i.test(
          item
        )
    ),
    completionObservation,
  ];

  return {
    id: String(report._id || user._id),
    userId: String(user._id),
    packageId: report.packageId || user.selectedPackageId || "",
    status: publication.status,
    statusLabel: getPublicationStatusLabel(publication.status),
    // Duration snapshot surfaced for the Review Snapshot card. Null on
    // reports written before duration tracking landed — the UI hides
    // the line in that case.
    totalDurationMinutes:
      report.totalDurationMinutes != null
        ? Number(report.totalDurationMinutes)
        : null,
    sectionDurations: Array.isArray(report.sectionDurations)
      ? report.sectionDurations.map((row) => ({
          sectionId: String(row?.sectionId || ""),
          sectionTitle: String(row?.sectionTitle || ""),
          durationMinutes:
            row?.durationMinutes != null ? Number(row.durationMinutes) : null,
        }))
      : [],
    student: {
      name: user.name || "Unknown",
      referenceId: `JS-${String(user._id).slice(-8).toUpperCase()}`,
      email: user.email || "",
      phone: user.studentProfile?.phone || user.mobile || "",
      subscription: user.subscription || "Basic",
      testName:
        report.packageTitle ||
        pkg?.title ||
        report.packageId ||
        user.selectedPackageId ||
        "Assessment",
      testType: user.subscription || "Basic",
      submittedAt:
        publication.submittedAt || report.updatedAt || user.updatedAt || user.createdAt,
      attemptLabel: `Attempt ${Math.max(1, Number(report.attemptNumber || user.testsCompleted || 1))}`,
      // Student-profile snapshot for the reviewer. Pulled from the user
      // record at review time, so the data shown matches what the student
      // submitted in the StudentProfileForm.
      profile: buildAdminStudentProfileSnapshot(user.studentProfile),
    },
    // Prompt-6 fix: the scorer (Prompt-5) now emits authoritative
    // completionStatus / completedSections / totalSections. The admin
    // payload must read those directly rather than re-deriving them
    // from section.status counts. Fall back to the count-derived value
    // only when the report pre-dates the scorer fix and those fields
    // aren't present.
    summary: {
      overallScore,
      maxScore,
      percentage,
      completionStatus:
        profile.completionStatus ||
        (completedSections >= totalSections && totalSections > 0
          ? "Complete"
          : "Incomplete"),
      completedSections,
      totalSections,
      isDemo: Boolean(report.isDemo),
      statusLabel: getPublicationStatusLabel(publication.status),
      reportsReady: Number(user.reportsReady || 0),
    },
    // Prompt-6 fix: top-level aliases so the frontend can read the scorer
    // values without digging into `summary`. overallPercentage is an
    // alias for overallScore (both are 0-100) for legacy reads.
    isDemo: Boolean(report.isDemo),
    completionStatus:
      profile.completionStatus ||
      (completedSections >= totalSections && totalSections > 0
        ? "Complete"
        : "Incomplete"),
    completedSections,
    totalSections,
    overallScore,
    overallPercentage: overallScore,
    sectionBreakdown,
    analysis: {
      reviewSummary: {
        statusLabel: reviewStatusLabel,
        strongestSignals:
          strongestSignals.length > 0
            ? strongestSignals
            : (profile.strengths || []).slice(0, 3).map((item) => item.name),
        topCareerTitles:
          topCareerTitles.length > 0
            ? topCareerTitles
            : (profile.careerRecommendations || [])
                .slice(0, 3)
                .map((item) => item.title),
        observations:
          normalizedObservations.length > 0
            ? normalizedObservations
            : (profile.strengths || []).length
                ? [
                    `Top strength: ${profile.strengths[0].name} (${profile.strengths[0].value}%).`,
                    completionObservation,
                  ]
                : [completionObservation],
      },
      strengths: Array.isArray(profile.strengths) ? profile.strengths : [],
      careers: Array.isArray(profile.careerRecommendations)
        ? profile.careerRecommendations
        : [],
      personalityType: profile.personalityType || null,
      testResults: Array.isArray(profile.testResults) ? profile.testResults : [],
    },
    // True when the student lost this package to a full refund (needs
    // purchaseHistory + purchasedPackages on `user`; false without them).
    // approveAdminResult refuses these.
    accessRevoked,
    actions: {
      canApprove:
        publication.status === RESULT_PUBLICATION_STATUS.PENDING_APPROVAL &&
        !report.hasUnreviewedItems &&
        !accessRevoked,
      canDelete: publication.status !== RESULT_PUBLICATION_STATUS.NOT_SUBMITTED,
      canPublish:
        publication.status === RESULT_PUBLICATION_STATUS.PENDING_APPROVAL &&
        !report.hasUnreviewedItems &&
        !accessRevoked,
    },
    manualReview: {
      hasUnreviewedItems: Boolean(report.hasUnreviewedItems),
      completedAt: report.manualReviewCompletedAt || null,
      totalItems: Array.isArray(report.manualReviewItems)
        ? report.manualReviewItems.length
        : 0,
      pendingCount: Array.isArray(report.manualReviewItems)
        ? report.manualReviewItems.filter(
            (item) =>
              item?.requiresManualReview && item?.adminDecision == null
          ).length
        : 0,
    },
  };
};

const findMutableReportSubdocument = (user, reportId) => {
  if (!Array.isArray(user?.assessmentReports)) return null;
  if (typeof user.assessmentReports.id === "function") {
    const report = user.assessmentReports.id(reportId);
    if (report) return report;
  }
  return user.assessmentReports.find(
    (report) => String(report?._id || "") === String(reportId || "")
  );
};

const getUserByReportId = async ({
  reportId,
  select = "",
  lean = false,
}) => {
  let query = User.findOne({
    role: { $ne: "admin" },
    "assessmentReports._id": reportId,
  });
  if (select) query = query.select(select);
  if (lean) query = query.lean();

  let user = await query;
  if (user) {
    return { user, isLegacyFallback: false };
  }

  query = User.findOne({ _id: reportId, role: { $ne: "admin" } });
  if (select) query = query.select(select);
  if (lean) query = query.lean();
  user = await query;

  if (!user) {
    return { user: null, isLegacyFallback: false };
  }

  if (Array.isArray(user.assessmentReports) && user.assessmentReports.length > 0) {
    return { user: null, isLegacyFallback: false };
  }

  const publication = getResultPublicationState(user);
  if (!publication.hasProfileData) {
    return { user: null, isLegacyFallback: false };
  }

  return { user, isLegacyFallback: true };
};

const buildAdminNotifications = (users, cfg, limit = 12) => {
  const packageMap = getConfigLookup(cfg);

  const notifications = [
    ...users.map((user) =>
      createAdminNotification({
        id: `registration-${String(user._id)}`,
        type: "registration",
        title: "New Registration",
        message: `${user.name || "A new student"} created a Jumpstride account.`,
        eventAt: user.createdAt,
        link: "/admin/usermanagement",
      })
    ),
    ...users.flatMap((user) =>
      getUserPurchaseEntries(user, packageMap)
        .filter((purchase) => !purchase.fallback)
        .map((purchase) =>
          createAdminNotification({
            id: `payment-${purchase.key}`,
            type: "payment",
            title: "Payment Received",
            message: `${purchase.name} purchased the ${purchase.package} package.`,
            eventAt: purchase.date,
            link: "/admin/payments",
          })
        )
    ),
    ...users.flatMap((user) => {
      const revoked = getRevokedPackageIds(user);
      return getStoredAssessmentReports(user, packageMap)
        .filter(
          (report) =>
            report.publication.status ===
              RESULT_PUBLICATION_STATUS.PENDING_APPROVAL &&
            report.publication.submittedAt &&
            !isHiddenFromReviewQueue(report, revoked)
        )
        .map((report) =>
          createAdminNotification({
            id: `review-${String(report._id)}`,
            type: "review",
            title: "New Report Review",
            message: `${user.name || "A student"} submitted ${
              report.packageTitle || report.packageId || "an assessment"
            } for admin review.`,
            eventAt: report.publication.submittedAt,
            link: `/admin/testsubmissions/${String(report._id)}`,
          })
        );
    }),
    ...users.flatMap((user) =>
      getStoredAssessmentReports(user, packageMap)
        .filter(
          (report) =>
            report.publication.status === RESULT_PUBLICATION_STATUS.APPROVED &&
            report.publication.approvedAt
        )
        .map((report) =>
          createAdminNotification({
            id: `published-${String(report._id)}`,
            type: "published",
            title: "Result Published",
            message: `${user.name || "A student"}'s ${
              report.packageTitle || report.packageId || "assessment"
            } result is now published.`,
            eventAt: report.publication.approvedAt,
            link: `/admin/testsubmissions/${String(report._id)}`,
          })
        )
    ),
  ]
    .filter((item) => toTimestamp(item.eventAt) > 0)
    .sort((a, b) => toTimestamp(b.eventAt) - toTimestamp(a.eventAt))
    .slice(0, limit);

  return notifications;
};

// GET /api/v1/admin/dashboard
export const getAdminDashboard = async (req, res) => {
  try {
    const [users, cfg, ledgerByOrderId] = await Promise.all([
      User.find({ role: { $ne: "admin" } }).lean(),
      AssessmentConfig.getOrCreateDefault(),
      loadLedgerByOrderId(),
    ]);
    const packageMap = getConfigLookup(cfg);
    const payments = buildPayments(users, packageMap, ledgerByOrderId);
    const completedTests = users.reduce((sum, u) => sum + Number(u.testsCompleted || 0), 0);
    // Net of processed refunds, same as the Payments page.
    const revenue = payments.reduce((sum, p) => sum + netRevenue(p), 0);

    const now = new Date();
    const growthData = [];
    const revenueData = [];
    for (let i = 5; i >= 0; i -= 1) {
      const dt = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = monthKey(dt);
      const label = dt.toLocaleString("en-IN", { month: "short" });
      const registered = users.filter((u) => monthKey(u.createdAt || now) === key).length;
      // By payment date, net of refunds — the current month equals the
      // Payments page "This month" card.
      const monthRevenue = payments
        .filter((p) => monthKey(p.date || now) === key)
        .reduce((sum, p) => sum + netRevenue(p), 0);
      growthData.push({ name: label, value: registered });
      revenueData.push({ name: label, value: monthRevenue });
    }

    const recentActivities = [
      ...payments.slice(0, 5).map((p, idx) => ({
        id: `pay-${idx}`,
        time: shortAgo(p.date),
        user: p.name,
        action: `Payment received (${p.package})`,
        status: "Completed",
      })),
      ...users
        .filter((u) => Number(u.testsCompleted || 0) > 0)
        .slice(0, 5)
        .map((u, idx) => ({
          id: `test-${idx}`,
          time: shortAgo(u.updatedAt),
          user: u.name || "Unknown",
          action: "Completed test",
          status: "Completed",
        })),
    ]
      .sort((a, b) => {
        const av = String(a.time).includes("s") ? 1 : String(a.time).includes("m") ? 2 : 3;
        const bv = String(b.time).includes("s") ? 1 : String(b.time).includes("m") ? 2 : 3;
        return av - bv;
      })
      .slice(0, 8);

    return res.status(200).json({
      success: true,
      data: {
        kpiData: [
          { title: "Total Users", value: users.length },
          { title: "Tests Purchased", value: payments.length },
          { title: "Completed Tests", value: completedTests },
          { title: "Revenue", value: fmtCurrency(revenue) },
        ],
        growthData,
        revenueData,
        recentActivities,
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, msg: err.message || "Failed to load admin dashboard" });
  }
};

// GET /api/v1/admin/notifications
export const getAdminNotifications = async (req, res) => {
  try {
    const [users, cfg] = await Promise.all([
      User.find({ role: { $ne: "admin" } })
        .select(
          "name email createdAt updatedAt purchasedPackages purchaseHistory selectedPackageId resultProfile resultPublication assessmentReports"
        )
        .lean(),
      AssessmentConfig.getOrCreateDefault(),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        items: buildAdminNotifications(users, cfg),
      },
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      msg: err.message || "Failed to load notifications",
    });
  }
};

// Prompt-9 Fix 1: build the Mongo filter for admin user/submission
// search. Matches name, email, OR jumpstartId (case-insensitive). Empty
// query returns the unfiltered base filter so existing callers keep
// working with no query at all.
const escapeRegex = (value = "") =>
  String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const buildAdminUserSearchFilter = (rawQuery = "", baseFilter = {}) => {
  const query = String(rawQuery || "").trim();
  if (!query) return baseFilter;
  const safe = escapeRegex(query);
  return {
    ...baseFilter,
    $or: [
      { name: { $regex: safe, $options: "i" } },
      { email: { $regex: safe, $options: "i" } },
      { jumpstartId: { $regex: safe, $options: "i" } },
    ],
  };
};

// GET /api/v1/admin/users
export const getAdminUsers = async (req, res) => {
  try {
    // Prompt-9 Fix 1: optional ?search= query matches name / email /
    // jumpstartId. Falls back to "list everything" when no query is
    // provided so the existing frontend list view is unaffected.
    const filter = buildAdminUserSearchFilter(req.query?.search, {
      role: { $ne: "admin" },
    });
    const users = await User.find(filter)
      .select(
        "name email mobile testsCompleted subscription lastLoginAt isSuspended createdAt selectedPackageId jumpstartId"
      )
      .sort({ createdAt: -1 })
      .lean();
    return res.status(200).json({
      success: true,
      data: users.map((u) => ({
        id: String(u._id),
        jumpstartId: u.jumpstartId || "",
        name: u.name || "Unknown",
        email: u.email || "",
        phone: u.mobile || "",
        initials: toInitials(u.name),
        tests: Number(u.testsCompleted || 0),
        subscription: u.subscription || "Basic",
        lastLogin: shortAgo(u.lastLoginAt),
        status: u.isSuspended ? "Suspended" : "Active",
        packageId: u.selectedPackageId || "",
      })),
    });
  } catch (err) {
    return res.status(500).json({ success: false, msg: err.message || "Failed to load users" });
  }
};

// PATCH /api/v1/admin/users/:userId
export const patchAdminUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const { name, mobile, subscription, status } = req.body || {};
    const update = {};
    if (name !== undefined) update.name = String(name).trim();
    if (mobile !== undefined) update.mobile = String(mobile).trim();
    if (subscription !== undefined) update.subscription = subscription;
    if (status !== undefined) update.isSuspended = String(status) === "Suspended";
    const user = await User.findOneAndUpdate({ _id: userId, role: { $ne: "admin" } }, { $set: update }, { new: true })
      .select(
        "name email mobile testsCompleted subscription lastLoginAt isSuspended selectedPackageId jumpstartId"
      )
      .lean();
    if (!user) return res.status(404).json({ success: false, msg: "User not found" });
    return res.status(200).json({
      success: true,
      data: {
        id: String(user._id),
        jumpstartId: user.jumpstartId || "",
        name: user.name || "Unknown",
        email: user.email || "",
        phone: user.mobile || "",
        initials: toInitials(user.name),
        tests: Number(user.testsCompleted || 0),
        subscription: user.subscription || "Basic",
        lastLogin: shortAgo(user.lastLoginAt),
        status: user.isSuspended ? "Suspended" : "Active",
        packageId: user.selectedPackageId || "",
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, msg: err.message || "Failed to update user" });
  }
};

// DELETE /api/v1/admin/users/:userId
export const deleteAdminUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findOneAndDelete({ _id: userId, role: { $ne: "admin" } }).lean();
    if (!user) return res.status(404).json({ success: false, msg: "User not found" });
    return res.status(200).json({ success: true, data: { id: String(user._id) } });
  } catch (err) {
    return res.status(500).json({ success: false, msg: err.message || "Failed to delete user" });
  }
};

// GET /api/v1/admin/payments
export const getAdminPayments = async (req, res) => {
  try {
    const [users, cfg, ledgerByOrderId] = await Promise.all([
      User.find({ role: { $ne: "admin" } })
        .select(
          "name email purchasedPackages purchaseHistory updatedAt createdAt"
        )
        .lean(),
      AssessmentConfig.getOrCreateDefault(),
      // Matched to each purchaseHistory row via razorpayOrderId: the real
      // Payment id (the receipt endpoint's key) and the refund state.
      loadLedgerByOrderId(),
    ]);
    const packageMap = getConfigLookup(cfg);
    const payments = buildPayments(users, packageMap, ledgerByOrderId);

    // Net of processed refunds. "This month" is by payment date: payments
    // made this month, less whatever of those has been refunded.
    const sumNet = (rows) => rows.reduce((sum, p) => sum + netRevenue(p), 0);
    const refundedAmount = payments.reduce(
      (sum, p) => sum + Number(p.refundedAmount || 0),
      0
    );
    const totalRevenue = sumNet(payments);
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    const thisMonth = sumNet(
      payments.filter((p) => new Date(p.date) >= startOfMonth)
    );

    return res.status(200).json({
      success: true,
      data: {
        summary: {
          totalRevenue,
          totalRevenueLabel: fmtCurrency(totalRevenue),
          thisMonth,
          thisMonthLabel: fmtCurrency(thisMonth),
          pendingAmount: 0,
          pendingAmountLabel: fmtCurrency(0),
          refundedAmount,
          refundedAmountLabel: fmtCurrency(refundedAmount),
        },
        // `key` and `userId` carry the user's DB id and are dropped here;
        // rowKey is an opaque per-response index for React.
        rows: payments.map(({ key, userId, ...p }, idx) => ({
          ...p,
          rowKey: `row-${idx}`,
          dateLabel: fmtDate(p.date),
          refundedAmountLabel: fmtCurrency(p.refundedAmount || 0),
          refundedAtLabel: p.refundedAt ? fmtDate(p.refundedAt) : "",
        })),
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, msg: err.message || "Failed to load payments" });
  }
};

// GET /api/v1/admin/submissions
export const getAdminSubmissions = async (req, res) => {
  try {
    // Prompt-9 Fix 1: optional ?search= filter applied at the user
    // level (admin sees rows only from matching users). Same matchers
    // as the users list — name, email, jumpstartId.
    const userFilter = buildAdminUserSearchFilter(req.query?.search, {
      role: { $ne: "admin" },
    });
    const [users, cfg] = await Promise.all([
      User.find(userFilter)
        .select(
          "name email subscription selectedPackageId purchasedPackages purchaseHistory.packageId purchaseHistory.status resultProfile resultPublication assessmentReports testsCompleted updatedAt createdAt jumpstartId"
        )
        .lean(),
      AssessmentConfig.getOrCreateDefault(),
    ]);
    const packageMap = getConfigLookup(cfg);

    const rows = users
      .flatMap((user) => {
        const revoked = getRevokedPackageIds(user);
        return getStoredAssessmentReports(user, packageMap)
          .filter((report) => !isHiddenFromReviewQueue(report, revoked))
          .map((report) => {
          // Prompt-6 fix: surface the scorer's completion + isDemo
          // fields on each list row so the badges render without a
          // second API call.
          const reportProfile = report?.profile || {};
          const completedSectionsValue = Number.isFinite(
            Number(reportProfile.completedSections)
          )
            ? Number(reportProfile.completedSections)
            : null;
          const totalSectionsValue = Number.isFinite(
            Number(reportProfile.totalSections)
          )
            ? Number(reportProfile.totalSections)
            : null;
          return {
            id: String(report._id),
            userId: String(user._id),
            jumpstartId: user.jumpstartId || "",
            name: user.name || "Unknown",
            email: user.email || "",
            initials: toInitials(user.name),
            type:
              report.packageTitle || report.packageId || user.subscription || "Assessment",
            date:
              report.publication.submittedAt ||
              report.updatedAt ||
              user.updatedAt ||
              user.createdAt,
            duration:
              report.totalDurationMinutes != null
                ? `${report.totalDurationMinutes} min`
                : "N/A",
            totalDurationMinutes:
              report.totalDurationMinutes != null
                ? Number(report.totalDurationMinutes)
                : null,
            status: getPublicationStatusLabel(report.publication.status),
            canApprove:
              report.publication.status ===
                RESULT_PUBLICATION_STATUS.PENDING_APPROVAL &&
              !report.hasUnreviewedItems,
            hasUnreviewedItems: Boolean(report.hasUnreviewedItems),
            isDemo: Boolean(report.isDemo),
            completionStatus:
              reportProfile.completionStatus ||
              (completedSectionsValue != null &&
              totalSectionsValue != null &&
              completedSectionsValue >= totalSectionsValue &&
              totalSectionsValue > 0
                ? "Complete"
                : "Incomplete"),
            completedSections: completedSectionsValue,
            totalSections: totalSectionsValue,
            overallScore: Number.isFinite(Number(reportProfile.overallScore))
              ? Number(reportProfile.overallScore)
              : null,
            // Student lost this package to a full refund; the report is
            // hidden from them but kept here.
            accessRevoked: revoked.has(String(report.packageId || "")),
          };
        });
      })
      .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))
      .map((row) => ({
        ...row,
        date: fmtDate(row.date),
      }));

    return res.status(200).json({ success: true, data: rows });
  } catch (err) {
    return res.status(500).json({ success: false, msg: err.message || "Failed to load submissions" });
  }
};

// GET /api/v1/admin/results
export const getAdminResults = async (req, res) => {
  try {
    const [users, cfg] = await Promise.all([
      User.find({ role: { $ne: "admin" } })
        .select(
          "name email subscription selectedPackageId resultProfile resultPublication assessmentReports updatedAt"
        )
        .lean(),
      AssessmentConfig.getOrCreateDefault(),
    ]);
    const packageMap = getConfigLookup(cfg);

    const rows = users
      .flatMap((user) =>
        getStoredAssessmentReports(user, packageMap)
          .filter(
            (report) =>
              report.publication.status === RESULT_PUBLICATION_STATUS.APPROVED &&
              report.profile?.overallScore != null
          )
          .map((report) => ({
            id: String(report._id),
            userId: String(user._id),
            name: user.name || "Unknown",
            email: user.email || "",
            initials: toInitials(user.name),
            type:
              report.packageTitle || report.packageId || user.subscription || "Assessment",
            date: report.publication.approvedAt || report.updatedAt || user.updatedAt,
            score: `${Number(report.profile?.overallScore || 0)}/100`,
            percentile: String(report.profile?.overallPercentile || "").replace("Top ", ""),
            rawResult: report.profile || {},
          }))
      )
      .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))
      .map((row) => ({
        ...row,
        date: fmtDate(row.date),
      }));
    return res.status(200).json({ success: true, data: rows });
  } catch (err) {
    return res.status(500).json({ success: false, msg: err.message || "Failed to load results" });
  }
};

// GET /api/v1/admin/submissions/:reportId
export const getAdminSubmissionDetail = async (req, res) => {
  try {
    const { reportId } = req.params;
    const cfg = await AssessmentConfig.getOrCreateDefault();
    const packageMap = getConfigLookup(cfg);
    const { user } = await getUserByReportId({
      reportId,
      select:
        "name email mobile subscription selectedPackageId purchasedPackages purchaseHistory.packageId purchaseHistory.status testsCompleted reportsReady resultProfile resultPublication assessmentReports studentProfile updatedAt createdAt",
      lean: true,
    });

    if (!user) {
      return res.status(404).json({ success: false, msg: "Submission not found" });
    }

    const report =
      getStoredAssessmentReports(user, packageMap).find(
        (item) => String(item._id) === String(reportId || "")
      ) || null;

    return res.status(200).json({
      success: true,
      data: buildAdminReviewPayload(user, cfg, report),
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      msg: err.message || "Failed to load submission detail",
    });
  }
};

// PATCH /api/v1/admin/results/:reportId/approve
export const approveAdminResult = async (req, res) => {
  try {
    if (!ensureAdmin(req, res)) return;

    const { reportId } = req.params;
    const { user, isLegacyFallback } = await getUserByReportId({
      reportId,
      select:
        "role testsCompleted reportsReady topCareers resultProfile resultPublication assessmentReports selectedPackageId purchasedPackages purchaseHistory",
      lean: false,
    });
    if (!user) {
      return res.status(404).json({ success: false, msg: "Submission not found" });
    }

    const report = isLegacyFallback
      ? {
          _id: String(user._id),
          profile: user.resultProfile || {},
          publication: getResultPublicationState(user),
        }
      : findMutableReportSubdocument(user, reportId);
    const normalizedReport = getStoredAssessmentReports(user).find(
      (item) => String(item._id) === String(reportId || "")
    );

    if (!report || !normalizedReport) {
      return res.status(404).json({ success: false, msg: "Submission not found" });
    }

    const publication =
      normalizedReport.publication || getResultPublicationState(user);
    if (!normalizedReport.profile) {
      return res.status(400).json({ success: false, msg: "No generated result available for approval" });
    }

    // Block approval while the manual-review queue still has pending items.
    // The frontend disables its Approve button on the same flag; this guard
    // protects against direct API calls or stale UI state.
    if (!isLegacyFallback && normalizedReport.hasUnreviewedItems) {
      return res.status(400).json({
        success: false,
        error: "MANUAL_REVIEW_PENDING",
        message:
          "Complete manual review of flagged questions before approving this report.",
      });
    }

    // The package was fully refunded, so the report is out of the review
    // queue and hidden from the student. Publishing it would be pointless;
    // it becomes approvable again if they buy the package back.
    if (isPackageRevoked(user, normalizedReport.packageId)) {
      return res.status(409).json({
        success: false,
        error: ACCESS_REVOKED_REFUND,
        msg: "This student's payment for the package was refunded, so the report can't be published.",
      });
    }

    const nextPublication = {
      status: RESULT_PUBLICATION_STATUS.APPROVED,
      submittedAt: publication.submittedAt || new Date(),
      approvedAt: new Date(),
      approvedByName: req.user.name || req.user.email || "Admin",
    };

    if (isLegacyFallback) {
      user.resultPublication = nextPublication;
    } else {
      report.publication = nextPublication;
      report.updatedAt = new Date();
    }

    syncLegacyStateFromReports(user);
    await user.save();

    return res.status(200).json({
      success: true,
      data: {
        id: String(reportId),
        status: "Published",
        approvedAt: nextPublication.approvedAt,
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, msg: err.message || "Failed to approve result" });
  }
};

// DELETE /api/v1/admin/results/:reportId
export const deleteAdminResult = async (req, res) => {
  try {
    if (!ensureAdmin(req, res)) return;

    const { reportId } = req.params;
    const { user, isLegacyFallback } = await getUserByReportId({
      reportId,
      select:
        "role testsCompleted reportsReady topCareers resultProfile resultPublication assessmentReports",
      lean: false,
    });
    if (!user) {
      return res.status(404).json({ success: false, msg: "Submission not found" });
    }

    if (isLegacyFallback) {
      user.resultProfile = {
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
      };
      user.resultPublication = {
        status: RESULT_PUBLICATION_STATUS.NOT_SUBMITTED,
        submittedAt: null,
        approvedAt: null,
        approvedByName: "",
      };
      user.topCareers = [];
      user.reportsReady = 0;
    } else {
      const nextReports = (user.assessmentReports || []).filter(
        (report) => String(report?._id || "") !== String(reportId || "")
      );
      user.assessmentReports = nextReports;
      syncLegacyStateFromReports(user);
    }

    user.testsCompleted = Math.max(0, Number(user.testsCompleted || 0) - 1);
    await user.save();

    return res.status(200).json({
      success: true,
      data: { id: String(reportId), deleted: true },
    });
  } catch (err) {
    return res.status(500).json({ success: false, msg: err.message || "Failed to delete result" });
  }
};

// ---------------------------------------------------------------------------
// Manual Review (Section 4 image/diagram questions)
// ---------------------------------------------------------------------------

const SUBSECTION_KEY_TO_APTITUDE_NAME = {
  abstract_reasoning: "Abstract",
  spatial_relations: "Spatial Relations",
  mechanical_reasoning: "Mechanical",
};

const safePercentage = (correct, scorable) => {
  if (!scorable) return null;
  return Math.round((correct / scorable) * 100);
};

const safeAverage = (values = []) => {
  const finite = values.filter((v) => Number.isFinite(v));
  if (!finite.length) return null;
  return finite.reduce((sum, v) => sum + v, 0) / finite.length;
};

// Recompute the three image-based aptitude subsections (abstract, spatial,
// mechanical) from a report's manualReviewItems, applying admin overrides
// where present. Mutates the report's profile in place so the caller can
// just save the user document afterward.
const recomputeReportWithManualDecisions = (report) => {
  if (!report?.profile) return null;

  const items = Array.isArray(report.manualReviewItems)
    ? report.manualReviewItems
    : [];

  // Bucket items by subsection key.
  const buckets = new Map();
  items.forEach((item) => {
    const key = String(item?.subsectionKey || "").trim();
    if (!key) return;
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push(item);
  });

  // Recompute each affected subsection from its bucket.
  const updatedSubsectionPercentages = {};
  buckets.forEach((bucket, subsectionKey) => {
    let scorable = 0;
    let correct = 0;
    bucket.forEach((item) => {
      const hasKey = Boolean(String(item?.correctAnswer || "").trim());
      if (!hasKey) return;
      scorable += 1;
      const effectiveCorrect =
        item?.adminDecision === "correct"
          ? true
          : item?.adminDecision === "incorrect"
            ? false
            : Boolean(item?.autoMarkedCorrect);
      if (effectiveCorrect) correct += 1;
    });
    const percentage = safePercentage(correct, scorable);
    updatedSubsectionPercentages[subsectionKey] = percentage;

    // Mutate the matching subsection inside section 4. Find by key, leave
    // band/interpretation untouched — the admin sees the same labels they
    // approved against. The numeric fields drive scoring and the careerMatcher.
    const section4 = (report.profile.sectionBreakdown || []).find(
      (section) =>
        section?.key === "aptitude" || Number(section?.sectionId) === 4
    );
    if (!section4) return;
    const sub = (section4.subsections || []).find(
      (s) => s?.key === subsectionKey
    );
    if (!sub) return;

    sub.rawScore = scorable ? correct : null;
    sub.maxScore = scorable || sub.maxScore || null;
    sub.percentage = percentage;
    sub.answeredCount = scorable;
    sub.totalQuestions = scorable || sub.totalQuestions || null;
  });

  // Recompute section 4's overall percentage as the average of its
  // subsection percentages.
  const section4 = (report.profile.sectionBreakdown || []).find(
    (section) => section?.key === "aptitude" || Number(section?.sectionId) === 4
  );
  if (section4 && Array.isArray(section4.subsections)) {
    const subAvg = safeAverage(
      section4.subsections.map((s) => Number(s?.percentage))
    );
    section4.percentage = subAvg == null ? null : Math.round(subAvg);
    section4.score = section4.percentage;
  }

  // Refresh the named aptitudeScores bucket the careerMatcher reads from.
  const aptitudeScores = { ...(report.profile.aptitudeScores || {}) };
  Object.entries(updatedSubsectionPercentages).forEach(([key, pct]) => {
    const displayName = SUBSECTION_KEY_TO_APTITUDE_NAME[key];
    if (displayName && pct != null) {
      aptitudeScores[displayName] = pct;
    }
  });
  report.profile.aptitudeScores = aptitudeScores;

  // Recompute overall score as the average of section percentages.
  const overallPercentages = (report.profile.sectionBreakdown || [])
    .map((section) => Number(section?.percentage))
    .filter((v) => Number.isFinite(v));
  const overallAvg = safeAverage(overallPercentages);
  if (overallAvg != null) {
    report.profile.overallScore = Math.round(overallAvg);
    report.profile.overallPercentile = `Top ${Math.max(
      8,
      100 - Math.round(overallAvg)
    )}% profile strength`;
  }

  // Re-run career matching against the refreshed named profile. Demo
  // reports return 6 careers (Prompt #1 contract), full reports return 10.
  const topN = report.isDemo ? 6 : 10;
  const refreshedCareers = matchCareers(
    {
      hollandProfile: report.profile.hollandProfile || {},
      multipleIntelligences: report.profile.multipleIntelligences || {},
      aptitudeScores,
      eqProfile: report.profile.eqProfile || {},
    },
    topN
  );
  report.profile.careerRecommendations = refreshedCareers;
  report.profile.careerPathwaysCount = refreshedCareers.length;

  // Demo aptitude bands are percentage-bracketed (see Prompt #1) — re-apply
  // them on the affected subsections so the band label matches the new %.
  if (report.isDemo && section4) {
    section4.subsections = (section4.subsections || []).map((sub) => {
      if (!SUBSECTION_KEY_TO_APTITUDE_NAME[sub?.key]) return sub;
      const pct = Number(sub?.percentage);
      if (!Number.isFinite(pct)) return sub;
      const band = DEMO_APTITUDE_BANDS.find(
        (b) => pct >= Number(b.min) && pct <= Number(b.max)
      );
      if (!band) return sub;
      return {
        ...sub,
        band: band.label,
        bandMin: band.min,
        bandMax: band.max,
        bandRangeLabel: `${band.min}-${band.max}%`,
        interpretation: band.interpretation,
        description: band.interpretation,
        careerImplication: band.careerImplication,
      };
    });
  }

  return refreshedCareers;
};

// GET /api/v1/admin/results/:reportId/manual-review
export const getManualReviewItems = async (req, res) => {
  try {
    if (!ensureAdmin(req, res)) return;
    const { reportId } = req.params;
    const { user, isLegacyFallback } = await getUserByReportId({
      reportId,
      select:
        "role assessmentReports resultProfile resultPublication",
      lean: true,
    });
    if (!user || isLegacyFallback) {
      return res.status(404).json({
        success: false,
        msg: "Submission not found or has no manual review queue",
      });
    }
    const report = (user.assessmentReports || []).find(
      (r) => String(r?._id || "") === String(reportId)
    );
    if (!report) {
      return res.status(404).json({ success: false, msg: "Report not found" });
    }
    const items = cloneManualReviewItems(report.manualReviewItems || []);
    return res.status(200).json({
      success: true,
      data: {
        reportId: String(reportId),
        manualReviewItems: items,
        hasUnreviewedItems: computeHasUnreviewedItems(items),
        manualReviewCompletedAt: report.manualReviewCompletedAt || null,
      },
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      msg: err.message || "Failed to load manual review queue",
    });
  }
};

// PATCH /api/v1/admin/results/:reportId/manual-review/:questionId
export const submitManualDecision = async (req, res) => {
  try {
    if (!ensureAdmin(req, res)) return;
    const { reportId, questionId } = req.params;
    const { decision, note } = req.body || {};

    if (decision !== "correct" && decision !== "incorrect") {
      return res.status(400).json({
        success: false,
        msg: 'decision must be "correct" or "incorrect"',
      });
    }

    const { user } = await getUserByReportId({
      reportId,
      select: "role assessmentReports",
      lean: false,
    });
    if (!user) {
      return res.status(404).json({ success: false, msg: "Submission not found" });
    }

    const report = findMutableReportSubdocument(user, reportId);
    if (!report) {
      return res.status(404).json({ success: false, msg: "Report not found" });
    }

    const item = (report.manualReviewItems || []).find(
      (entry) => String(entry?.questionId || "") === String(questionId)
    );
    if (!item) {
      return res.status(404).json({
        success: false,
        msg: "Manual review item not found",
      });
    }

    item.adminDecision = decision;
    if (typeof note === "string") {
      item.adminNote = note.trim().slice(0, 500) || null;
    }
    report.hasUnreviewedItems = computeHasUnreviewedItems(
      report.manualReviewItems
    );
    report.updatedAt = new Date();

    await user.save();

    return res.status(200).json({
      success: true,
      data: {
        reportId: String(reportId),
        questionId: String(questionId),
        adminDecision: item.adminDecision,
        adminNote: item.adminNote || null,
        hasUnreviewedItems: report.hasUnreviewedItems,
      },
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      msg: err.message || "Failed to record manual decision",
    });
  }
};

// POST /api/v1/admin/results/:reportId/manual-review/complete
export const finalizeManualReview = async (req, res) => {
  try {
    if (!ensureAdmin(req, res)) return;
    const { reportId } = req.params;

    const { user } = await getUserByReportId({
      reportId,
      select: "role assessmentReports resultProfile resultPublication topCareers reportsReady",
      lean: false,
    });
    if (!user) {
      return res.status(404).json({ success: false, msg: "Submission not found" });
    }

    const report = findMutableReportSubdocument(user, reportId);
    if (!report) {
      return res.status(404).json({ success: false, msg: "Report not found" });
    }

    // Every flagged item must have a decision before we recompute scoring.
    const pending = (report.manualReviewItems || []).filter(
      (item) => item?.requiresManualReview && item?.adminDecision == null
    );
    if (pending.length) {
      return res.status(400).json({
        success: false,
        error: "MANUAL_REVIEW_PENDING",
        msg: `Resolve all ${pending.length} flagged questions before finalizing.`,
        pendingQuestionIds: pending.map((p) => p.questionId),
      });
    }

    const refreshedCareers = recomputeReportWithManualDecisions(report);
    report.hasUnreviewedItems = false;
    report.manualReviewCompletedAt = new Date();
    report.updatedAt = new Date();
    syncLegacyStateFromReports(user);
    await user.save();

    return res.status(200).json({
      success: true,
      data: {
        reportId: String(reportId),
        overallScore: report.profile?.overallScore ?? null,
        overallPercentile: report.profile?.overallPercentile || "",
        aptitudeScores: report.profile?.aptitudeScores || {},
        careerRecommendations: refreshedCareers,
        manualReviewCompletedAt: report.manualReviewCompletedAt,
      },
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      msg: err.message || "Failed to finalize manual review",
    });
  }
};

// GET /api/v1/admin/analytics
export const getAdminAnalytics = async (req, res) => {
  try {
    const [users, cfg, ledgerByOrderId] = await Promise.all([
      User.find({ role: { $ne: "admin" } }).lean(),
      AssessmentConfig.getOrCreateDefault(),
      loadLedgerByOrderId(),
    ]);
    const packageMap = getConfigLookup(cfg);
    const payments = buildPayments(users, packageMap, ledgerByOrderId);

    const registered = users.length;
    const started = users.filter((u) => Object.keys(u.testProgress?.answers || {}).length > 0).length;
    const completed = users.filter((u) => Number(u.testsCompleted || 0) > 0).length;
    const paid = users.filter((u) => (u.purchasedPackages || []).length > 0).length;
    const counselling = users.filter((u) => Number(u.counsellingSessions || 0) > 0).length;

    const completionByPackage = (cfg.packages || []).map((p) => {
      const buyers = users.filter((u) => (u.purchasedPackages || []).includes(p.id));
      const done = buyers.filter((u) => Number(u.testsCompleted || 0) > 0).length;
      return { name: p.title, started: buyers.length, completed: done };
    });
    // Shares of revenue net of refunds, same definition as the Payments page.
    const totalRevenue = payments.reduce((sum, p) => sum + netRevenue(p), 0);
    const revenueByPackage = (cfg.packages || []).map((p) => {
      const amount = payments.filter((pm) => pm.package === p.title).reduce((s, pm) => s + netRevenue(pm), 0);
      const value = totalRevenue > 0 ? Math.round((amount / totalRevenue) * 100) : 0;
      return { name: p.title, value };
    });

    const regMap = new Map();
    users.forEach((u) => {
      const key = monthKey(u.createdAt || new Date());
      regMap.set(key, (regMap.get(key) || 0) + 1);
    });
    const regKeys = [...regMap.keys()].sort().slice(-7);
    const registrationTrend = regKeys.map((k) => ({ date: monthLabel(k), value: regMap.get(k) || 0 }));

    const careerCounts = new Map();
    users.forEach((u) => {
      const top = Array.isArray(u.resultProfile?.careerRecommendations) ? u.resultProfile.careerRecommendations : [];
      top.forEach((c) => {
        const title = c.title || "Unknown";
        careerCounts.set(title, (careerCounts.get(title) || 0) + 1);
      });
    });
    const careerPaths = [...careerCounts.entries()]
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    const avgScoreUsers = users.filter((u) => u.resultProfile?.overallScore != null);
    const avgScore =
      avgScoreUsers.length > 0
        ? (avgScoreUsers.reduce((sum, u) => sum + Number(u.resultProfile?.overallScore || 0), 0) / avgScoreUsers.length).toFixed(1)
        : "0.0";

    return res.status(200).json({
      success: true,
      data: {
        funnel: { registered, started, completed, paid, counselling },
        completionData: completionByPackage,
        revenueDistribution: revenueByPackage,
        registrationTrend,
        careerPaths,
        performanceMetrics: [
          { metric: "Avg. Score", current: `${avgScore}/100`, previous: "-", change: "-", trend: "up" },
          { metric: "Users Completed", current: String(completed), previous: "-", change: "-", trend: "up" },
          { metric: "Payments", current: String(payments.length), previous: "-", change: "-", trend: "up" },
        ],
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, msg: err.message || "Failed to load analytics" });
  }
};

// GET /api/v1/admin/results/:reportId/student-view
// Admin-only fetch of the student-facing report payload for ANY report id,
// regardless of publication status. Used by the "View Student Report"
// button on the admin Review Submission page so counsellors see exactly
// what the student receives — including for reports still in
// PENDING_APPROVAL that would otherwise be hidden by the student endpoint's
// hasAccess gate.
//
// Returns the same shape as GET /api/v1/user/results/:reportId, but with
// `hasAccess` forced to `true` so the frontend StudentReport.jsx renders
// the report body immediately rather than the "under review" panel.
export const getAdminStudentReportView = async (req, res) => {
  try {
    const { reportId } = req.params;
    if (!reportId) {
      return res.status(400).json({ success: false, msg: "reportId is required" });
    }

    const cfg = await AssessmentConfig.getOrCreateDefault();
    const packageLookup = getPackageLookup(cfg);

    // The report id is the per-attempt assessmentReports sub-document _id.
    // Mongo can find the parent User by querying for it, which is faster
    // and more correct than scanning every user.
    const user = await User.findOne({ "assessmentReports._id": reportId })
      .select(
        "_id name email jumpstartId mobile city studentProfile selectedPackageId resultProfile resultPublication assessmentReports testsCompleted updatedAt createdAt"
      )
      .lean();

    if (!user) {
      return res.status(404).json({ success: false, msg: "Result report not found" });
    }

    const storedReports = getStoredAssessmentReports(user, packageLookup);
    const report = storedReports.find(
      (item) => String(item._id) === String(reportId)
    );

    if (!report) {
      return res.status(404).json({ success: false, msg: "Result report not found" });
    }

    return res.status(200).json({
      success: true,
      data: {
        // Force the gate open — admin always sees the report body.
        hasAccess: true,
        resultStatus: report.publication.status,
        submittedAt: report.publication.submittedAt,
        approvedAt: report.publication.approvedAt,
        estimatedReadyHours: null,
        // Annotate the payload so the frontend can render an "admin
        // preview" banner if it wants to make the bypass obvious to
        // the counsellor.
        adminPreview: true,
        report: buildStudentReportDetail(report, user, packageLookup),
      },
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      msg: err.message || "Failed to load student report",
    });
  }
};

// ---------------------------------------------------------------------------
// Coupon management — admin-side CRUD.
// ---------------------------------------------------------------------------
// Coupons live in their own collection (see backend/models/Coupon.js).
// The shape returned to the admin UI matches what Settings.jsx renders:
// code / discount / used-vs-max / expiry / status chip.

const serializeCoupon = (doc) => ({
  id: String(doc._id),
  code: doc.code,
  discountType: doc.discountType,
  discountValue: doc.discountValue,
  maxUses: doc.maxUses,
  usedCount: doc.usedCount || 0,
  expiresAt: doc.expiresAt,
  isActive: Boolean(doc.isActive),
  createdAt: doc.createdAt,
  createdBy: doc.createdBy ? String(doc.createdBy) : null,
});

// GET /api/v1/admin/coupons
export const listCoupons = async (_req, res) => {
  try {
    const coupons = await Coupon.find({}).sort({ createdAt: -1 }).lean();
    return res.status(200).json({
      success: true,
      data: { coupons: coupons.map(serializeCoupon) },
    });
  } catch (err) {
    return res
      .status(500)
      .json({ success: false, msg: err.message || "Failed to load coupons" });
  }
};

// Active paid packages this coupon would price below Razorpay's ₹1 minimum.
// Coupons are not tied to a package, so a code is refused if it would make
// ANY purchasable paid package free; /coupon/validate and /payment/order
// re-check at checkout in case prices change later.
const paidPackagesMadeFreeBy = async (coupon) => {
  const cfg = await AssessmentConfig.getOrCreateDefault();
  return getActivePackages(cfg).filter((pkg) => coupon.makesFree(pkg.amount));
};

const fullDiscountAdminMsg = (packages) => {
  const names = packages
    .map((pkg) => `${pkg.title || pkg.id} (${fmtCurrency(Number(pkg.amount || 0))})`)
    .join(", ");
  return `${FULL_DISCOUNT_MSG}: it would make ${names} free. Paid packages must cost at least ₹1 after the discount.`;
};

// POST /api/v1/admin/coupons
// Body: { code, discountType, discountValue, maxUses?, expiresAt? }
// Validation rules:
//   - code is required, 3-32 chars, alphanumeric+dash, uppercased on save
//   - discountType is "percent" | "flat"
//   - discountValue: 1-100 if percent; >=1 if flat
//   - maxUses (optional): positive integer
//   - expiresAt (optional): ISO date in the future
export const createCoupon = async (req, res) => {
  try {
    const {
      code,
      discountType,
      discountValue,
      maxUses,
      expiresAt,
    } = req.body || {};

    const trimmedCode = String(code || "").trim().toUpperCase();
    if (!/^[A-Z0-9\-_]{3,32}$/.test(trimmedCode)) {
      return res.status(400).json({
        success: false,
        msg: "Code must be 3-32 alphanumeric characters (letters, digits, '-' or '_').",
      });
    }
    if (!["percent", "flat"].includes(discountType)) {
      return res.status(400).json({
        success: false,
        msg: "discountType must be either 'percent' or 'flat'.",
      });
    }
    const numericValue = Number(discountValue);
    if (!Number.isFinite(numericValue) || numericValue <= 0) {
      return res
        .status(400)
        .json({ success: false, msg: "discountValue must be a positive number." });
    }
    if (discountType === "percent" && numericValue > 100) {
      return res
        .status(400)
        .json({ success: false, msg: "Percent discount cannot exceed 100." });
    }
    if (discountType === "percent" && numericValue >= 100) {
      return res.status(400).json({
        success: false,
        msg: `${FULL_DISCOUNT_MSG}. Use a percentage below 100.`,
      });
    }
    const madeFree = await paidPackagesMadeFreeBy(
      new Coupon({ code: trimmedCode, discountType, discountValue: numericValue })
    );
    if (madeFree.length > 0) {
      return res
        .status(400)
        .json({ success: false, msg: fullDiscountAdminMsg(madeFree) });
    }

    const parsedMaxUses =
      maxUses === null || maxUses === undefined || maxUses === ""
        ? null
        : Number(maxUses);
    if (parsedMaxUses != null && (!Number.isInteger(parsedMaxUses) || parsedMaxUses <= 0)) {
      return res
        .status(400)
        .json({ success: false, msg: "maxUses must be a positive integer or omitted." });
    }

    let parsedExpiry = null;
    if (expiresAt) {
      const dt = new Date(expiresAt);
      if (Number.isNaN(dt.getTime())) {
        return res
          .status(400)
          .json({ success: false, msg: "expiresAt is not a valid date." });
      }
      parsedExpiry = dt;
    }

    const existing = await Coupon.findOne({ code: trimmedCode }).lean();
    if (existing) {
      return res
        .status(409)
        .json({ success: false, msg: `Coupon "${trimmedCode}" already exists.` });
    }

    const created = await Coupon.create({
      code: trimmedCode,
      discountType,
      discountValue: numericValue,
      maxUses: parsedMaxUses,
      expiresAt: parsedExpiry,
      isActive: true,
      createdBy: req.user?.id || null,
    });

    return res
      .status(201)
      .json({ success: true, data: { coupon: serializeCoupon(created) } });
  } catch (err) {
    return res
      .status(500)
      .json({ success: false, msg: err.message || "Failed to create coupon" });
  }
};

// PATCH /api/v1/admin/coupons/:id
// Body: { isActive?: boolean }
// Used for activate / deactivate from the admin Coupons tab. Other
// fields are intentionally immutable post-creation — admins should
// delete + recreate if a code's terms need to change, so the audit
// trail (and existing redemptions) stay coherent.
export const toggleCoupon = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ success: false, msg: "Coupon id is required" });
    }
    const { isActive } = req.body || {};
    if (typeof isActive !== "boolean") {
      return res
        .status(400)
        .json({ success: false, msg: "Body must include { isActive: boolean }" });
    }
    // Re-activating is the only way an old code goes live again, so it gets
    // the same full-discount check as creation (package prices may also have
    // changed since the coupon was made).
    if (isActive) {
      const existing = await Coupon.findById(id);
      if (!existing) {
        return res.status(404).json({ success: false, msg: "Coupon not found" });
      }
      const madeFree = await paidPackagesMadeFreeBy(existing);
      if (madeFree.length > 0) {
        return res
          .status(400)
          .json({ success: false, msg: fullDiscountAdminMsg(madeFree) });
      }
    }
    const updated = await Coupon.findByIdAndUpdate(
      id,
      { isActive },
      { new: true }
    );
    if (!updated) {
      return res.status(404).json({ success: false, msg: "Coupon not found" });
    }
    return res
      .status(200)
      .json({ success: true, data: { coupon: serializeCoupon(updated) } });
  } catch (err) {
    return res
      .status(500)
      .json({ success: false, msg: err.message || "Failed to update coupon" });
  }
};

// DELETE /api/v1/admin/coupons/:id
export const deleteCoupon = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ success: false, msg: "Coupon id is required" });
    }
    const deleted = await Coupon.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({ success: false, msg: "Coupon not found" });
    }
    return res.status(200).json({ success: true, data: { id } });
  } catch (err) {
    return res
      .status(500)
      .json({ success: false, msg: err.message || "Failed to delete coupon" });
  }
};

// GET /api/v1/admin/vitals/summary
//
// p75 per Core Web Vital over a trailing window. p75 rather than a mean
// because that is the statistic Google scores CWV on — an average hides
// exactly the slow tail that determines the grade.
//
// Samples are pushed into an in-memory array per metric so the percentile
// can be indexed directly. That is bounded by this site's volume (a few
// thousand samples a week); if it ever grows past comfort, swap the
// $group for Mongo 7's $percentile accumulator, which does the same job
// without materialising the values.
export const getAdminVitalsSummary = async (req, res) => {
  try {
    const days = Math.min(Math.max(Number(req.query.days) || 7, 1), 90);
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const rows = await WebVital.aggregate([
      { $match: { createdAt: { $gte: since } } },
      // Sorting before the group means each `values` array arrives
      // already ordered, so the percentile is a plain index lookup.
      { $sort: { value: 1 } },
      {
        $group: {
          _id: "$name",
          values: { $push: "$value" },
          count: { $sum: 1 },
        },
      },
    ]).allowDiskUse(true);

    const byName = new Map(rows.map((r) => [r._id, r]));

    const metrics = METRIC_NAMES.map((name) => {
      const row = byName.get(name);
      if (!row || !row.count) {
        return { name, p75: null, p50: null, count: 0 };
      }

      // Nearest-rank percentile: the smallest value at or below which at
      // least P% of samples fall.
      const at = (p) => row.values[Math.ceil((p / 100) * row.count) - 1];

      // CLS is a unitless ratio and needs the decimals; the timing
      // metrics are milliseconds where fractions are noise.
      const round = (v) =>
        name === "CLS" ? Number(v.toFixed(3)) : Math.round(v);

      return {
        name,
        p75: round(at(75)),
        p50: round(at(50)),
        count: row.count,
      };
    });

    return res.json({
      success: true,
      data: { windowDays: days, since, metrics },
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      msg: err.message || "Failed to load vitals summary",
    });
  }
};

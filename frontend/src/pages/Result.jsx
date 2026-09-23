import { useContext, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  ArrowRight,
  BadgeCheck,
  BookOpen,
  Brain,
  CheckCircle2,
  Compass,
  Download,
  Lightbulb,
  Medal,
  Share2,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import api from "../api/api";
import { AuthContext } from "../context/AuthContext";
import { company } from "../config/company";
import StatusPill from "../components/results/StatusPill";
import usePrintableDocument from "../hooks/usePrintableDocument";
import { ResultPageSkeleton } from "../components/Skeletons";
import {
  readApiCache,
  writeApiCache,
  cacheUserKey,
  CACHE_TTL,
} from "../utils/apiCache";
import {
  formatStudentDate,
  getPrimaryActionLabel,
  getResultMeta,
  normalizeStudentResultsPayload,
} from "../data/studentResults";

const defaultPayload = normalizeStudentResultsPayload({});
const resultCardClass =
  "rounded-[16px] border border-[#DCE6EE] bg-white shadow-[0_8px_24px_rgba(15,23,41,0.06)]";

const NEXT_STEP_ITEMS = [
  {
    key: "counselling",
    title: "Book Counselling",
    description: "Discuss results with a psychologist",
    icon: BadgeCheck,
    itemClass: "bg-[#DFF7F7]",
    iconClass: "bg-[#188B8B] text-white",
  },
  {
    key: "career-paths",
    title: "Explore Career Paths",
    description: "Research your top matches in detail",
    icon: Compass,
    itemClass: "bg-[#DFF7F7]",
    iconClass: "bg-[#157A7A] text-white",
  },
  {
    key: "action-plan",
    title: "Create Action Plan",
    description: "Set goals and milestones",
    icon: Lightbulb,
    itemClass: "bg-[#DFF7F7]",
    iconClass: "bg-[#F59F0A] text-white",
  },
];

const getTestStatusMeta = (test) => {
  if (test?.resultState === "approved") {
    return getResultMeta("result", "approved");
  }

  if (test?.resultState === "pending_approval") {
    return getResultMeta("result", "pending_approval");
  }

  return getResultMeta("attempt", test?.attemptState || "not_attempted");
};

const getTestSummaryText = (test) => {
  if (test?.scorePreview != null) {
    return `Score: ${test.scorePreview}/100`;
  }

  if (test?.resultState === "pending_approval") {
    return "Result pending";
  }

  if (test?.attemptState === "in_progress") {
    return `Progress: ${test.completedSections ?? 0}/${test.totalSections ?? 0} sections`;
  }

  return `Sections: ${test.completedSections ?? 0}/${test.totalSections ?? 0}`;
};

export default function Result() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user, updateUser } = useContext(AuthContext);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [openingTestId, setOpeningTestId] = useState("");
  const [shareFeedback, setShareFeedback] = useState("");
  const [data, setData] = useState(defaultPayload);
  const { printDocument } = usePrintableDocument();

  useEffect(() => {
    const userId = cacheUserKey(user);
    const cached = readApiCache("userResults", {
      userId,
      ttlMs: CACHE_TTL.USER_RESULTS_MS,
    });
    if (cached) {
      setData(normalizeStudentResultsPayload(cached));
      setLoading(false);
      return;
    }

    api
      .get("/v1/user/results")
      .then((res) => {
        const payload = res?.data?.data || {};
        writeApiCache("userResults", payload, { userId });
        setData(normalizeStudentResultsPayload(payload));
      })
      .catch((err) => {
        setError(err?.response?.data?.msg || "Failed to load your results.");
      })
      .finally(() => setLoading(false));
    // user identity drives the cache key; refetch when the active user changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?._id || user?.id || user?.email]);

  const summaryCards = useMemo(
    () => [
      {
        key: "completed_tests",
        label: "Completed Tests",
        value: data.completedTestsCount ?? 0,
        helper: `${data.completedTestsCount ?? 0} of ${data.totalTestsCount ?? 0} purchased tests completed`,
        icon: Medal,
        valueClass: "text-[#C27C00]",
        iconClass: "bg-[#FFF6E4] text-[#F59F0A]",
      },
      {
        key: "career_matches",
        label: "Career Matches",
        value: data.careerPathwaysCount ?? 0,
        helper: `${data.careerPathwaysCount ?? 0} pathways found`,
        icon: TrendingUp,
        valueClass: "text-[#157A7A]",
        iconClass: "bg-[#EFFBFB] text-[#157A7A]",
      },
    ],
    [
      data.careerPathwaysCount,
      data.completedTestsCount,
      data.totalTestsCount,
    ]
  );

  const visibleStrengths = useMemo(
    () => (Array.isArray(data.strengths) ? data.strengths.slice(0, 5) : []),
    [data.strengths]
  );

  // Backend (matchCareers in careerMatcher.js) already applies the
  // threshold rules: score >= 60, minimum 3 results, maximum 10 (demo)
  // or 15 (full test). Render whatever the API returns — no further
  // client-side cap.
  const visibleCareers = useMemo(
    () =>
      Array.isArray(data.careerRecommendations)
        ? data.careerRecommendations
        : [],
    [data.careerRecommendations]
  );

  const visibleTraits = useMemo(
    () =>
      Array.isArray(data.personalityType?.traits)
        ? data.personalityType.traits.slice(0, 4)
        : [],
    [data.personalityType]
  );

  const personalityTitle = useMemo(() => {
    const title = String(data.personalityType?.title || "").trim();
    if (!title) return "Profile pending";
    return title.toLowerCase().startsWith("the ") ? title : `The ${title}`;
  }, [data.personalityType?.title]);

  // Show the demo banner when the user's only published result is from the
  // demo package (so the upsell is relevant); hide it once they've also
  // completed the full 500-question test.
  const showDemoBanner = useMemo(() => {
    const tests = Array.isArray(data.tests) ? data.tests : [];
    const publishedTests = tests.filter(
      (test) => test?.resultState === "approved"
    );
    if (!publishedTests.length) return false;
    return publishedTests.every((test) => test?.isDemo === true);
  }, [data.tests]);

  const handleCardAction = async (test) => {
    if (!test) return;

    if (test.currentAction === "view_report" && test.publishedReportId) {
      navigate(`/result/${test.publishedReportId}`);
      return;
    }

    if (test.currentAction === "result_pending") {
      navigate("/test-completed");
      return;
    }

    setError("");
    setOpeningTestId(test.id);

    try {
      await api.patch("/v1/user/package/select", {
        packageId: test.packageId,
        resetProgress: false,
      });

      if (user) {
        updateUser({ ...user, selectedPackageId: test.packageId });
      }

      navigate("/pretest/sections");
    } catch (err) {
      // The profile gate is recoverable — send the student to the form
      // rather than stranding them on an error banner. Matches Dashboard
      // and Test; keyed off `error`, not the message text.
      if (err?.response?.data?.error === "PROFILE_INCOMPLETE") {
        navigate("/profile/student", {
          state: { returnTo: "/result", pendingPackageId: test.packageId },
        });
        return;
      }
      setError(
        err?.response?.data?.msg || "Unable to open this assessment right now."
      );
    } finally {
      setOpeningTestId("");
    }
  };

  const handleDownload = () => {
    if (!data.hasResults) return;
    void printDocument();
  };

  const handleShare = async () => {
    const shareUrl = data.latestPublishedReportId
      ? `${window.location.origin}/result/${data.latestPublishedReportId}`
      : window.location.href;

    try {
      if (navigator.share) {
        await navigator.share({
          title: `${company.brandName} Career Profile`,
          url: shareUrl,
        });
        setShareFeedback("Shared successfully.");
        return;
      }

      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareUrl);
        setShareFeedback("Link copied.");
        return;
      }

      setShareFeedback("Sharing is not available in this browser.");
    } catch {
      setShareFeedback("");
    }
  };

  if (loading) {
    return <ResultPageSkeleton />;
  }

  if (error && !data.tests.length) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center bg-[#FAFAFA] px-4">
        <div className={`${resultCardClass} w-full max-w-2xl p-8 text-center`}>
          <h1 className="text-3xl font-semibold text-[#0F1729]">
            Results Unavailable
          </h1>
          <p className="mt-3 text-[#65758B]">{error}</p>
          <Link to="/dashboard" className="primary-btn mt-6">
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="report-print-page bg-[#FAFAFA]">
      <div className="report-print-root mx-auto max-w-[1400px] px-5 py-12 lg:px-0">
        <div className="lg:px-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h1 className="text-[36px] font-semibold leading-[40px] tracking-[-0.6px] text-[#0F1729]">
                Your Career Profile
              </h1>
              <p className="mt-2 text-[16px] leading-6 text-[#65758B]">
                Comprehensive analysis based on your test results
              </p>
            </div>

            <div className="report-print-hidden flex flex-col items-start gap-3 sm:items-end">
              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={handleDownload}
                  disabled={!data.hasResults}
                  className="inline-flex h-10 w-[166px] items-center justify-center gap-2 rounded-[14px] border-2 border-[#188B8B] bg-white px-4 text-[14px] font-medium text-[#188B8B] hover:bg-[#F6FDFC] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Download className="h-4 w-4" />
                  Download PDF
                </button>
                <button
                  type="button"
                  onClick={handleShare}
                  className="inline-flex h-10 w-[107px] items-center justify-center gap-2 rounded-[14px] border-2 border-[#188B8B] bg-white px-4 text-[14px] font-medium text-[#188B8B] hover:bg-[#F6FDFC]"
                >
                  <Share2 className="h-4 w-4" />
                  Share
                </button>
              </div>
              {shareFeedback ? (
                <p className="text-xs font-medium text-[#7A8AA0]">{shareFeedback}</p>
              ) : null}
            </div>
          </div>

          {showDemoBanner ? (
            <div className="report-print-hidden mt-6 flex items-start gap-3 rounded-[16px] border border-[#F5D9A6] bg-[#FFF9EE] px-5 py-4 text-[#8C5A00]">
              <Sparkles className="mt-1 h-5 w-5 shrink-0 text-[#F59F0A]" />
              <div>
                <p className="text-sm font-semibold text-[#0F1729]">
                  {t("result.demoBannerTitle")}
                </p>
                <p className="mt-1 text-sm leading-6">
                  {t("result.demoBannerBody")}
                </p>
              </div>
            </div>
          ) : null}

          <section
            className={`${resultCardClass} report-print-card mt-8 min-h-[144px] overflow-hidden rounded-[16px] bg-[radial-gradient(circle_at_10%_0%,rgba(232,249,250,0.75),transparent_36%),linear-gradient(180deg,#FFFFFF_0%,#FCFEFF_100%)] px-6 py-[26px]`}
          >
            <div className="grid gap-4 md:grid-cols-2">
              {summaryCards.map((card) => {
                const Icon = card.icon;
                return (
                  <div
                    key={card.key}
                    className="flex flex-col items-center justify-center px-4 text-center"
                  >
                    <div
                      className={`flex h-12 w-12 items-center justify-center rounded-full ${card.iconClass}`}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <p className={`mt-2 text-[44px] font-bold leading-[48px] ${card.valueClass}`}>
                      {card.value}
                    </p>
                    <p className="mt-1 text-[14px] font-medium leading-5 text-[#0F1729]">
                      {card.label}
                    </p>
                    <p className="mt-0.5 text-[12px] leading-4 text-[#7D8CA2]">
                      {card.helper}
                    </p>
                  </div>
                );
              })}
            </div>
          </section>

          {data.resultStatus === "pending_approval" ? (
            <section
              className={`${resultCardClass} report-print-card mt-6 rounded-[16px] border-[#F5D9A6] bg-[linear-gradient(180deg,#FFF9EE_0%,#FFFFFF_100%)] p-6`}
            >
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-[24px] font-semibold text-[#0F1729]">
                    Latest Submission Is Under Review
                  </h2>
                  <p className="mt-2 max-w-3xl text-[14px] leading-7 text-[#65758B]">
                    Your most recent test has been submitted successfully. The published report will appear here after admin approval, while your previous test history remains available below.
                  </p>
                </div>
                <Link
                  to="/test-completed"
                  className="report-print-hidden inline-flex items-center gap-2 text-[14px] font-semibold text-[#188B8B] hover:underline"
                >
                  View Submission Status
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </section>
          ) : null}

          {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}

          <div className="mt-8 grid gap-8 xl:grid-cols-[880px_424px]">
            <div className="space-y-6">
              <section className={`${resultCardClass} report-print-card min-h-[360px] rounded-[16px] p-[25px]`}>
                <div>
                  <h2 className="text-[24px] font-semibold leading-6 text-[#0F1729]">
                    Your Tests
                  </h2>
                  <p className="mt-[6px] text-[14px] leading-5 text-[#65758B]">
                    View and manage your aptitude tests
                  </p>
                </div>

                <div className="mt-6 space-y-4">
                  {data.tests.length ? (
                    data.tests.map((test) => {
                      const statusMeta = getTestStatusMeta(test);
                      const actionLabel =
                        openingTestId === test.id
                          ? "Opening..."
                          : getPrimaryActionLabel(test.currentAction);

                      return (
                        <div
                          key={test.id}
                          className="min-h-[110px] rounded-[12px] border border-[#E1E7EF] bg-white px-[17px] py-[17px]"
                        >
                          <div className="flex flex-wrap items-center gap-[7px]">
                            <p className="text-[18px] font-semibold leading-6 text-[#0F1729]">
                              {test.title}
                            </p>
                            <StatusPill
                              label={statusMeta.label}
                              className={statusMeta.className}
                            />
                          </div>
                          <p className="mt-[9px] text-[14px] leading-5 text-[#7A8AA0]">
                            {test.lastUpdatedAt
                              ? `Completed on ${formatStudentDate(test.lastUpdatedAt)}`
                              : "No attempt recorded yet"}
                          </p>
                          <div className="mt-[7px] flex flex-wrap items-center gap-x-3 gap-y-1 text-[14px] leading-5">
                            <span className="text-[#74859C]">
                              {getTestSummaryText(test)}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleCardAction(test)}
                              disabled={openingTestId === test.id}
                              className="report-print-hidden font-semibold text-[#188B8B] hover:underline disabled:opacity-60"
                            >
                              {actionLabel}
                            </button>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="rounded-[16px] border border-dashed border-[#D6E4EA] bg-[#FBFCFD] px-5 py-8 text-center">
                      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#EAFBFB] text-[#188B8B]">
                        <CheckCircle2 className="h-6 w-6" />
                      </div>
                      <h3 className="mt-4 text-2xl font-semibold text-[#0F1729]">
                        No tests in your account yet
                      </h3>
                      <p className="mx-auto mt-2 max-w-xl text-sm leading-7 text-[#65758B]">
                        Purchase a test package to start building your assessment history and unlock published reports here.
                      </p>
                      <Link to="/test" className="secondary-btn mt-5">
                        Browse Tests
                      </Link>
                    </div>
                  )}
                </div>
              </section>

              <section className={`${resultCardClass} report-print-card min-h-[500px] rounded-[16px] p-[25px]`}>
                <div className="flex items-center gap-2.5">
                  <div className="flex h-5 w-5 items-center justify-center text-[#188B8B]">
                    <Brain className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-[24px] font-semibold leading-6 text-[#0F1729]">
                      Your Strengths & Skills
                    </h2>
                    <p className="mt-[6px] text-[14px] leading-5 text-[#65758B]">
                      Areas where you excel based on assessments
                    </p>
                  </div>
                </div>

                <div className="mt-6 space-y-5">
                  {visibleStrengths.length ? (
                    visibleStrengths.map((item) => (
                      <div key={item.name}>
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-[15px] font-medium leading-5 text-[#0F1729]">
                            {item.name}
                          </p>
                          <p className="text-[14px] font-semibold leading-5 text-[#188B8B]">
                            {item.value ?? 0}%
                          </p>
                        </div>
                        <div className="mt-2 h-2 rounded-full bg-[#DCE9EE]">
                          <div
                            className="h-2 rounded-full bg-[#188B8B]"
                            style={{ width: `${Math.min(100, item.value || 0)}%` }}
                          />
                        </div>
                        <p className="mt-[7px] text-[12px] leading-4 text-[#7D8CA2]">
                          {item.desc || "Strength detail will appear here."}
                        </p>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-[16px] bg-[#F8FAFC] px-4 py-5 text-sm text-[#65758B]">
                      Strength insights will appear here after a published report is available.
                    </div>
                  )}
                </div>
              </section>

              <section className={`${resultCardClass} report-print-card min-h-[672px] rounded-[16px] p-[25px]`}>
                <div>
                  <h2 className="text-[24px] font-semibold leading-6 text-[#0F1729]">
                    {t("result.topCareerMatches")}
                  </h2>
                  <p className="mt-[6px] text-[14px] leading-5 text-[#65758B]">
                    {t("result.topCareerMatchesSubtitle")}
                  </p>
                </div>

                <div className="mt-6 space-y-4">
                  {visibleCareers.length ? (
                    visibleCareers.map((career, index) => {
                      const matchValue =
                        career.score != null
                          ? career.score
                          : career.matchPercent != null
                            ? career.matchPercent
                            : 0;
                      const reasons = career.matchReasons || {};
                      const hasReasons =
                        reasons.holland ||
                        reasons.intelligence ||
                        reasons.aptitude ||
                        reasons.eq;
                      return (
                        <div
                          key={career.title}
                          className={`rounded-[12px] border px-[17px] py-[18px] ${
                            index < 2
                              ? "border-[#D4EBEE] bg-[linear-gradient(180deg,#F7FDFD_0%,#FFFFFF_100%)]"
                              : "border-[#E1E7EF] bg-white"
                          }`}
                        >
                          <div className="flex flex-wrap items-center gap-2.5">
                            <h3 className="text-[18px] font-semibold leading-7 text-[#0F1729]">
                              {career.title}
                            </h3>
                            <span
                              className="rounded-full bg-[#E2F8F7] px-[11px] py-[3px] text-[10px] font-semibold leading-[15px] text-[#188B8B]"
                              title={`Compatibility score: ${matchValue}/100`}
                            >
                              {Math.round(matchValue)}% Match
                            </span>
                            {career.category ? (
                              <span className="rounded-full border border-[#D9E5EC] px-[11px] py-[3px] text-[10px] font-semibold leading-[15px] text-[#4E5D72]">
                                {career.category}
                              </span>
                            ) : null}
                          </div>
                          <div
                            className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[#E6EEF2]"
                            aria-hidden="true"
                          >
                            <div
                              className="h-1.5 rounded-full bg-[#188B8B]"
                              style={{
                                width: `${Math.min(100, Math.max(0, matchValue))}%`,
                              }}
                            />
                          </div>
                          {career.description ? (
                            <p className="mt-2 text-[14px] leading-5 text-[#65758B]">
                              {career.description}
                            </p>
                          ) : null}
                          <div className="mt-3 flex flex-wrap gap-2">
                            {(career.skills || []).slice(0, 4).map((skill) => (
                              <span
                                key={skill}
                                className="rounded-full bg-[#157A7A] px-[11px] py-[3px] text-[10px] font-semibold leading-[15px] text-white"
                              >
                                {skill}
                              </span>
                            ))}
                          </div>
                          {hasReasons ? (
                            <details className="report-print-hidden mt-3 group">
                              <summary className="cursor-pointer list-none text-[12px] font-semibold text-[#188B8B] hover:underline">
                                <span className="group-open:hidden">
                                  {t("result.whyMatched")} ▾
                                </span>
                                <span className="hidden group-open:inline">
                                  {t("result.hideMatchDetails")} ▴
                                </span>
                              </summary>
                              <ul className="mt-2 space-y-1.5 rounded-[10px] bg-[#F6FDFC] px-3 py-2.5 text-[12px] leading-5 text-[#4E5D72]">
                                {reasons.holland ? (
                                  <li>
                                    <span className="font-semibold text-[#0F1729]">
                                      {t("result.matchReasonInterests")}:
                                    </span>{" "}
                                    {reasons.holland}
                                  </li>
                                ) : null}
                                {reasons.intelligence ? (
                                  <li>
                                    <span className="font-semibold text-[#0F1729]">
                                      {t("result.matchReasonIntelligence")}:
                                    </span>{" "}
                                    {reasons.intelligence}
                                  </li>
                                ) : null}
                                {reasons.aptitude ? (
                                  <li>
                                    <span className="font-semibold text-[#0F1729]">
                                      {t("result.matchReasonAptitude")}:
                                    </span>{" "}
                                    {reasons.aptitude}
                                  </li>
                                ) : null}
                                {reasons.eq ? (
                                  <li>
                                    <span className="font-semibold text-[#0F1729]">
                                      {t("result.matchReasonEq")}:
                                    </span>{" "}
                                    {reasons.eq}
                                  </li>
                                ) : null}
                              </ul>
                            </details>
                          ) : null}
                          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                            <p className="text-[12px] leading-5 text-[#7A8AA0]">
                              {career.salaryRange || ""}
                            </p>
                            <Link
                              to={`/careerdetail?career=${encodeURIComponent(career.title || "")}`}
                              state={{ career }}
                              className="report-print-hidden inline-flex items-center gap-1.5 text-[13px] font-medium text-[#188B8B] hover:underline"
                            >
                              {t("result.viewDetails")}
                              <ArrowRight className="h-4 w-4" />
                            </Link>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="rounded-[16px] bg-[#F8FAFC] px-4 py-5 text-sm text-[#65758B]">
                      {t("result.noCareerRecommendations")}
                    </div>
                  )}
                </div>

                <Link
                  to="/bookcounselling"
                  className="report-print-hidden mt-4 inline-flex h-10 w-full items-center justify-center rounded-[14px] border-2 border-[#188B8B] px-5 text-[13px] font-medium text-[#188B8B] hover:bg-[#F6FDFC]"
                >
                  For more career advice, book a call!
                </Link>
              </section>
            </div>

            <div className="space-y-6">
              <section
                className={`${resultCardClass} report-print-card min-h-[339px] rounded-[16px] border-[#F3D69B] bg-[radial-gradient(circle_at_100%_0%,rgba(255,238,205,0.7),transparent_38%),linear-gradient(180deg,#FFF9EE_0%,#FFFDF8_100%)] p-[25px]`}
              >
                <div className="flex items-center gap-2.5">
                  <div className="flex h-5 w-5 items-center justify-center text-[#F59F0A]">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <p className="text-[18px] font-semibold leading-7 text-[#0F1729]">
                    Your Personality Type
                  </p>
                </div>

                <h2 className="mt-6 text-[24px] font-bold leading-8 text-[#0F1729]">
                  {data.personalityType?.code || "--"}
                </h2>
                <p className="mt-2 text-[14px] font-medium leading-5 text-[#0F1729]">
                  {personalityTitle}
                </p>
                <p className="mt-[9px] text-[14px] leading-6 text-[#65758B]">
                  {data.personalityType?.description ||
                    "Your personality profile will appear here once a published result is available."}
                </p>

                <div className="mt-[18px] border-t border-[#EADAB3] pt-[9px]">
                  {visibleTraits.length ? (
                    <div className="space-y-2">
                      {visibleTraits.map((trait) => (
                        <div
                          key={trait.name}
                          className="flex items-center justify-between gap-3 text-[14px] leading-5"
                        >
                          <span className="text-[#6E7F97]">{trait.name}</span>
                          <span className="font-semibold text-[#0F1729]">
                            {trait.value ?? 0}%
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-[14px] bg-white/80 px-4 py-4 text-sm text-[#65758B]">
                      Trait percentages will appear here when personality scoring is available.
                    </div>
                  )}
                </div>
              </section>

              <section className={`${resultCardClass} report-print-card min-h-[358px] rounded-[16px] p-[25px]`}>
                <h2 className="text-[18px] font-semibold leading-7 text-[#0F1729]">
                  Recommended Next Steps
                </h2>
                <div className="mt-6 space-y-3">
                  {NEXT_STEP_ITEMS.map((step, index) => {
                    const Icon = step.icon;
                    return (
                      <div
                        key={step.key}
                        className={`h-[60px] rounded-[12px] px-3 py-3 ${step.itemClass}`}
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${step.iconClass}`}
                          >
                            <Icon className="h-3.5 w-3.5" />
                          </div>
                          <div>
                            <p className="text-[15px] font-medium leading-5 text-[#0F1729]">
                              {index + 1}. {step.title}
                            </p>
                            <p className="mt-0.5 text-[12px] leading-4 text-[#7A8AA0]">
                              {step.description}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <Link
                  to="/bookcounselling"
                  className="primary-btn report-print-hidden mt-3 flex h-10 w-full rounded-[14px] py-0 text-[13px] font-medium"
                >
                  Schedule Counselling
                </Link>
              </section>

              <section className={`${resultCardClass} report-print-card min-h-[168px] rounded-[16px] p-[25px]`}>
                <h2 className="text-[18px] font-semibold leading-7 text-[#0F1729]">
                  Complete Your Profile
                </h2>
                <p className="mt-[6px] text-[14px] leading-5 text-[#65758B]">
                  Take additional tests for deeper insights
                </p>
                <Link
                  to="/test"
                  className="secondary-btn report-print-hidden mt-6 flex h-10 w-full rounded-[14px] py-0 text-[13px] font-medium"
                >
                  <BookOpen className="mr-2 h-4 w-4" />
                  Browse Tests
                </Link>
              </section>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  AlertTriangle,
  Brain,
  Check,
  CheckCircle2,
  ClipboardCheck,
  GraduationCap,
  ImageOff,
  Lightbulb,
  Loader2,
  RefreshCw,
  Sparkles,
  Target,
  X,
} from "lucide-react";
import api from "../../api/api";
import { normalizeAdminReviewData } from "../../data/adminReview";
import AdminPageHeader from "../../components/admin/AdminPageHeader";
import StudentInfoCard from "../../components/admin/StudentInfoCard";
import OverallScoreSummaryCard from "../../components/admin/OverallScoreSummaryCard";
import SectionBreakdownCard from "../../components/admin/SectionBreakdownCard";
import ReviewActionBar from "../../components/admin/ReviewActionBar";
import ResultStatusBadge from "../../components/admin/ResultStatusBadge";
import { emitAdminNotificationsRefresh } from "../../utils/adminNotifications";
import { ReviewSkeleton } from "../../components/admin/Skeletons";

const chipClass =
  "rounded-full border border-[#D7E7EC] bg-white px-3 py-1 text-xs font-semibold text-[#4E5D72]";

// Subsection key → translation key. Profile data in the DB stays English;
// the UI looks up the localised label at render time.
const SUBSECTION_LABEL_KEYS = {
  abstract_reasoning: "reviewSubmission.subsectionAbstract",
  spatial_relations: "reviewSubmission.subsectionSpatial",
  mechanical_reasoning: "reviewSubmission.subsectionMechanical",
};

export default function ReviewSubmission() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { reportId } = useParams();
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState(null);
  const [error, setError] = useState("");
  const [approving, setApproving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [manualReview, setManualReview] = useState({
    loading: true,
    items: [],
    hasUnreviewedItems: false,
    completedAt: null,
    finalizing: false,
    decisionFor: "",
    notes: {},
    error: "",
    refreshedScores: null,
  });

  useEffect(() => {
    if (!reportId) return;

    setLoading(true);
    Promise.all([
      api.get(`/v1/admin/submissions/${reportId}`),
      api
        .get(`/v1/admin/results/${reportId}/manual-review`)
        .catch(() => ({ data: { data: null } })),
    ])
      .then(([submission, review]) => {
        setDetail(normalizeAdminReviewData(submission?.data?.data || {}));
        const reviewData = review?.data?.data;
        if (reviewData) {
          setManualReview((prev) => ({
            ...prev,
            loading: false,
            items: Array.isArray(reviewData.manualReviewItems)
              ? reviewData.manualReviewItems
              : [],
            hasUnreviewedItems: Boolean(reviewData.hasUnreviewedItems),
            completedAt: reviewData.manualReviewCompletedAt || null,
            notes: Object.fromEntries(
              (reviewData.manualReviewItems || []).map((item) => [
                item.questionId,
                item.adminNote || "",
              ])
            ),
          }));
        } else {
          setManualReview((prev) => ({ ...prev, loading: false }));
        }
      })
      .catch((err) => {
        setError(err?.response?.data?.msg || t("reviewSubmission.loadFailed"));
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reportId]);

  const recordDecision = async (questionId, decision) => {
    if (!reportId) return;
    setManualReview((prev) => ({
      ...prev,
      decisionFor: questionId,
      error: "",
    }));
    try {
      const note = manualReview.notes[questionId] || "";
      const res = await api.patch(
        `/v1/admin/results/${reportId}/manual-review/${questionId}`,
        { decision, note }
      );
      const data = res?.data?.data || {};
      setManualReview((prev) => ({
        ...prev,
        decisionFor: "",
        hasUnreviewedItems: Boolean(data.hasUnreviewedItems),
        items: prev.items.map((item) =>
          item.questionId === questionId
            ? {
                ...item,
                adminDecision: data.adminDecision,
                adminNote: data.adminNote || null,
              }
            : item
        ),
      }));
      // Keep the detail-level flag in sync so the Approve button updates
      // without a full refetch.
      setDetail((prev) =>
        prev
          ? {
              ...prev,
              manualReview: {
                ...(prev.manualReview || {}),
                hasUnreviewedItems: Boolean(data.hasUnreviewedItems),
              },
              actions: {
                ...prev.actions,
                canApprove:
                  prev.statusLabel === "Pending Approval" &&
                  !data.hasUnreviewedItems,
              },
            }
          : prev
      );
    } catch (err) {
      setManualReview((prev) => ({
        ...prev,
        decisionFor: "",
        error:
          err?.response?.data?.msg ||
          t("reviewSubmission.saveDecisionFailed"),
      }));
    }
  };

  const undoDecision = async (questionId) => {
    // The backend treats null as "no decision". The simplest path is to
    // mark "incorrect" then ask the admin to redecide — but we don't have
    // a clear-decision endpoint per the spec, so we just set both buttons
    // back to active by clearing local state. The next finalize attempt
    // would re-block if it's still required, which keeps the data honest.
    setManualReview((prev) => ({
      ...prev,
      items: prev.items.map((item) =>
        item.questionId === questionId
          ? { ...item, adminDecision: null }
          : item
      ),
    }));
  };

  const handleFinalize = async () => {
    if (!reportId) return;
    setManualReview((prev) => ({ ...prev, finalizing: true, error: "" }));
    try {
      const res = await api.post(
        `/v1/admin/results/${reportId}/manual-review/complete`
      );
      const data = res?.data?.data || {};
      setManualReview((prev) => ({
        ...prev,
        finalizing: false,
        hasUnreviewedItems: false,
        completedAt: data.manualReviewCompletedAt || new Date().toISOString(),
        refreshedScores: {
          overallScore: data.overallScore,
          overallPercentile: data.overallPercentile,
          aptitudeScores: data.aptitudeScores || {},
          careerRecommendations: data.careerRecommendations || [],
        },
      }));
      setDetail((prev) =>
        prev
          ? {
              ...prev,
              summary: {
                ...prev.summary,
                overallScore: data.overallScore ?? prev.summary?.overallScore,
                percentage:
                  data.overallScore != null
                    ? data.overallScore
                    : prev.summary?.percentage,
              },
              manualReview: {
                ...(prev.manualReview || {}),
                hasUnreviewedItems: false,
                completedAt: data.manualReviewCompletedAt,
              },
              actions: {
                ...prev.actions,
                canApprove: prev.statusLabel === "Pending Approval",
              },
            }
          : prev
      );
    } catch (err) {
      setManualReview((prev) => ({
        ...prev,
        finalizing: false,
        error:
          err?.response?.data?.msg ||
          t("reviewSubmission.finalizeFailed"),
      }));
    }
  };

  const sectionCards = useMemo(
    () => (Array.isArray(detail?.sectionBreakdown) ? detail.sectionBreakdown : []),
    [detail]
  );

  const handleApprove = async () => {
    if (!reportId) return;
    setError("");
    setApproving(true);
    try {
      await api.patch(`/v1/admin/results/${reportId}/approve`);
      setDetail((prev) =>
        prev
          ? {
              ...prev,
              status: "approved",
              statusLabel: "Published",
              summary: {
                ...prev.summary,
                statusLabel: "Published",
                reportsReady: Math.max(1, Number(prev.summary?.reportsReady || 0)),
              },
              actions: {
                ...prev.actions,
                canApprove: false,
                canPublish: false,
              },
            }
          : prev
      );
      emitAdminNotificationsRefresh();
    } catch (err) {
      const data = err?.response?.data;
      if (data?.error === "MANUAL_REVIEW_PENDING") {
        setError(
          data.message ||
            t("reviewSubmission.approvePending")
        );
      } else {
        setError(data?.msg || t("reviewSubmission.publishFailed"));
      }
    } finally {
      setApproving(false);
    }
  };

  const handleDelete = async () => {
    if (!detail?.actions?.canDelete || !reportId) return;
    const confirmed = window.confirm(
      t("reviewSubmission.deleteConfirm")
    );
    if (!confirmed) return;

    setError("");
    setDeleting(true);
    try {
      await api.delete(`/v1/admin/results/${reportId}`);
      emitAdminNotificationsRefresh();
      navigate("/admin/testsubmissions");
    } catch (err) {
      setError(err?.response?.data?.msg || t("reviewSubmission.deleteFailed"));
      setDeleting(false);
    }
  };

  if (loading) {
    return <ReviewSkeleton />;
  }

  if (error && !detail) {
    return (
      <main className="mx-auto max-w-[1440px] px-6 py-8">
        <div className="surface-card rounded-[28px] p-8 text-center">
          <h1 className="text-3xl font-bold text-[#0F1729]">{t("reviewSubmission.unavailableHeading")}</h1>
          <p className="mt-3 text-[#65758B]">{error}</p>
          <button
            type="button"
            onClick={() => navigate("/admin/testsubmissions")}
            className="primary-btn mt-6"
          >
            {t("reviewSubmission.back")}
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-[1440px] px-6 py-8">
      <AdminPageHeader
        title={t("reviewSubmission.title")}
        subtitle={t("reviewSubmission.subtitle")}
        backTo="/admin/testsubmissions"
        backLabel={t("reviewSubmission.back")}
        actions={
          detail ? <ResultStatusBadge status={detail.statusLabel} /> : null
        }
      />

      {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}

      {detail?.isDemo ? (
        <div className="mt-6 flex items-start gap-3 rounded-[18px] border border-[#F4DCA8] bg-[#FFF9EE] px-5 py-4 text-[#8C5A00] sm:rounded-[22px]">
          <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-[#F59F0A]" />
          <div>
            <p className="text-sm font-semibold text-[#0F1729]">
              {t("reviewSubmission.demoBannerTitle")}
            </p>
            <p className="mt-1 text-sm leading-6">
              {t("reviewSubmission.demoBannerBody")}
            </p>
          </div>
        </div>
      ) : null}

      <div className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(360px,0.88fr)]">
        <StudentInfoCard
          student={detail?.student}
          statusLabel={detail?.statusLabel}
          totalDurationMinutes={detail?.totalDurationMinutes ?? null}
        />
        <OverallScoreSummaryCard
          summary={{
            ...(detail?.summary || {}),
            isDemo: Boolean(detail?.isDemo),
          }}
        />
      </div>

      <StudentProfileReviewBlock profile={detail?.student?.profile} t={t} />

      <section className="surface-card mt-8 rounded-[28px] p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[#157A7A]">
              {t("reviewSubmission.sectionBreakdownEyebrow")}
            </p>
            <h2 className="mt-3 text-2xl font-bold text-[#0F1729]">
              {t("reviewSubmission.sectionBreakdownHeading")}
            </h2>
            <p className="mt-2 text-sm leading-7 text-[#65758B]">
              {t("reviewSubmission.sectionBreakdownBody")}
            </p>
          </div>
          <div className="rounded-full bg-[#F6FDFC] px-4 py-2 text-sm font-semibold text-[#157A7A]">
            {t("reviewSubmission.sectionsCount", { count: sectionCards.length })}
          </div>
        </div>

        <div className="mt-6 space-y-4">
          {sectionCards.length ? (
            sectionCards.map((section, index) => (
              <SectionBreakdownCard
                key={section.sectionId || section.title}
                section={section}
                defaultOpen={index === 0}
              />
            ))
          ) : (
            <div className="rounded-[22px] border border-dashed border-[#D8E6EC] bg-[#FBFCFD] px-5 py-8 text-center text-sm text-[#65758B]">
              {t("reviewSubmission.noSectionBreakdown")}
            </div>
          )}
        </div>
      </section>

      <ManualReviewSection
        manualReview={manualReview}
        setManualReview={setManualReview}
        onDecision={recordDecision}
        onUndo={undoDecision}
        onFinalize={handleFinalize}
        t={t}
      />

      <div className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(360px,0.85fr)]">
        <section className="surface-card rounded-[28px] p-6">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-[#EAFBFB] p-3 text-[#157A7A]">
              <ClipboardCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[#157A7A]">
                {t("reviewSubmission.reviewNotesEyebrow")}
              </p>
              <h2 className="mt-2 text-2xl font-bold text-[#0F1729]">
                {t("reviewSubmission.reviewNotesHeading")}
              </h2>
            </div>
          </div>

          <div className="mt-6 grid gap-5 lg:grid-cols-2">
            <div className="rounded-[24px] border border-[#E5EEF2] bg-[#FBFCFD] p-5">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-[#FFF6DF] p-2.5 text-[#F59F0A]">
                  <Lightbulb className="h-4 w-4" />
                </div>
                <h3 className="text-lg font-bold text-[#0F1729]">{t("reviewSubmission.observationsHeading")}</h3>
              </div>
              <div className="mt-4 space-y-3">
                {(detail?.analysis?.reviewSummary?.observations || []).length ? (
                  detail.analysis.reviewSummary.observations.map((item, index) => (
                    // Keyed by index + text, not text alone. The scorer used
                    // to emit the "Estimated personality profile" line twice
                    // (fixed at source in career500q.js), but the ~16 reports
                    // stored before that fix still carry the duplicate and
                    // aren't being backfilled — a bare string key makes React
                    // drop one of them. The list is render-only: never
                    // reordered, filtered, or edited, so an index-based key
                    // is stable here.
                    <div
                      key={`${index}-${item}`}
                      className="rounded-[18px] bg-white px-4 py-3 text-sm leading-7 text-[#4E5D72] shadow-sm"
                    >
                      {item}
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-[#65758B]">
                    {t("reviewSubmission.noObservations")}
                  </p>
                )}
              </div>
            </div>

            <div className="rounded-[24px] border border-[#E5EEF2] bg-[#FBFCFD] p-5">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-[#EAFBFB] p-2.5 text-[#157A7A]">
                  <Target className="h-4 w-4" />
                </div>
                <h3 className="text-lg font-bold text-[#0F1729]">{t("reviewSubmission.readinessHeading")}</h3>
              </div>
              <div className="mt-4 space-y-4">
                <div className="rounded-[18px] bg-white px-4 py-3 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#8A94A6]">
                    {t("reviewSubmission.reviewStatus")}
                  </p>
                  <p className="mt-2 text-lg font-bold text-[#0F1729]">
                    {detail?.analysis?.reviewSummary?.statusLabel || t("reviewSubmission.readyForReviewFallback")}
                  </p>
                </div>
                <div className="rounded-[18px] bg-white px-4 py-3 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#8A94A6]">
                    {t("reviewSubmission.strongestSignals")}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {(detail?.analysis?.reviewSummary?.strongestSignals || []).length ? (
                      detail.analysis.reviewSummary.strongestSignals.map((item) => (
                        <span key={item} className={chipClass}>
                          {item}
                        </span>
                      ))
                    ) : (
                      <span className="text-sm text-[#65758B]">
                        {t("reviewSubmission.noSignalHighlights")}
                      </span>
                    )}
                  </div>
                </div>
                <div className="rounded-[18px] bg-white px-4 py-3 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#8A94A6]">
                    {t("reviewSubmission.recommendedCareers")}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {(detail?.analysis?.reviewSummary?.topCareerTitles || []).length ? (
                      detail.analysis.reviewSummary.topCareerTitles.map((item) => (
                        <span key={item} className={chipClass}>
                          {item}
                        </span>
                      ))
                    ) : (
                      <span className="text-sm text-[#65758B]">
                        {t("reviewSubmission.noRecommendationHighlights")}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="space-y-6">
          <section className="surface-card rounded-[28px] p-6">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-[#EAFBFB] p-3 text-[#157A7A]">
                <Brain className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[#157A7A]">
                  {t("reviewSubmission.personalityTypeEyebrow")}
                </p>
                <h2 className="mt-2 text-2xl font-bold text-[#0F1729]">
                  {detail?.analysis?.personalityType?.code || t("reviewSubmission.personalityTypeNotAvailable")}
                </h2>
              </div>
            </div>
            <p className="mt-4 text-lg font-semibold text-[#0F1729]">
              {detail?.analysis?.personalityType?.title || t("reviewSubmission.personalityProfilePending")}
            </p>
            <p className="mt-2 text-sm leading-7 text-[#65758B]">
              {detail?.analysis?.personalityType?.description ||
                t("reviewSubmission.personalityProfilePendingBody")}
            </p>
          </section>

          <section className="surface-card rounded-[28px] p-6">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-[#FFF6DF] p-3 text-[#F59F0A]">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[#157A7A]">
                  {t("reviewSubmission.strengthsMatchesEyebrow")}
                </p>
                <h2 className="mt-2 text-2xl font-bold text-[#0F1729]">
                  {t("reviewSubmission.evaluationHighlights")}
                </h2>
              </div>
            </div>

            <div className="mt-5 space-y-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#8A94A6]">
                  {t("reviewSubmission.strengthsLabel")}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {(detail?.analysis?.strengths || []).length ? (
                    detail.analysis.strengths.slice(0, 5).map((item) => (
                      <span key={item.name} className={chipClass}>
                        {item.name} {item.value != null ? `(${item.value}%)` : ""}
                      </span>
                    ))
                  ) : (
                    <span className="text-sm text-[#65758B]">
                      {t("reviewSubmission.noStrengthsBreakdown")}
                    </span>
                  )}
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#8A94A6]">
                  {t("reviewSubmission.topCareerRecommendationsLabel")}
                </p>
                <div className="mt-3 space-y-3">
                  {(detail?.analysis?.careers || []).length ? (
                    // Admin sees the full career list (was capped at 3
                    // pre-go-live). Layout mirrors the student-facing
                    // /result page: title + category chip + match %
                    // pill + progress bar + the four "why it matched"
                    // reason lines — so counsellors review the same
                    // surface the student will see post-approval.
                    detail.analysis.careers.map((career, index) => {
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
                          key={`${career.title}-${index}`}
                          className="rounded-[18px] border border-[#E1E7EF] bg-white px-4 py-4"
                        >
                          <div className="flex flex-wrap items-center gap-2.5">
                            <h3 className="text-sm font-semibold text-[#0F1729]">
                              {career.title}
                            </h3>
                            <span className="rounded-full bg-[#E2F8F7] px-2.5 py-0.5 text-[10px] font-semibold text-[#157A7A]">
                              {Math.round(matchValue)}% Match
                            </span>
                            {career.category ? (
                              <span className="rounded-full border border-[#D9E5EC] px-2.5 py-0.5 text-[10px] font-semibold text-[#4E5D72]">
                                {career.category}
                              </span>
                            ) : null}
                          </div>
                          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[#E6EEF2]">
                            <div
                              className="h-1.5 rounded-full bg-[#157A7A]"
                              style={{
                                width: `${Math.min(100, Math.max(0, matchValue))}%`,
                              }}
                            />
                          </div>
                          {hasReasons ? (
                            <ul className="mt-3 space-y-1.5 text-[12px] leading-5 text-[#4E5D72]">
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
                          ) : career.description ? (
                            <p className="mt-2 text-sm leading-6 text-[#65758B]">
                              {career.description}
                            </p>
                          ) : null}
                        </div>
                      );
                    })
                  ) : (
                    <span className="text-sm text-[#65758B]">
                      {t("reviewSubmission.noCareerRecommendationsLabel")}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>

      <div className="mt-8">
        {detail?.rescore ? (
          <div className="mb-3 flex items-start gap-2 rounded-2xl border border-[#C9D7F2] bg-[#EEF3FD] px-4 py-3 text-xs font-semibold leading-5 text-[#2F5BB7]">
            <RefreshCw className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            {t("reviewSubmission.rescoredBanner", {
              date: new Date(detail.rescore.rescoredAt).toLocaleDateString(),
              from: detail.rescore.previousScoringVersion || "—",
              before: detail.rescore.previousOverallScore ?? "—",
              after: detail.rescore.currentOverallScore ?? "—",
            })}
          </div>
        ) : null}
        {manualReview.hasUnreviewedItems ? (
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#F4DCA8] bg-[#FFF1D3] px-3 py-1.5 text-xs font-semibold text-[#B86D00]">
            <AlertTriangle className="h-3.5 w-3.5" />
            {t("reviewSubmission.manualReviewBannerNeeded")}
          </div>
        ) : null}
        <ReviewActionBar
          statusLabel={detail?.statusLabel}
          canApprove={
            Boolean(detail?.actions?.canApprove) &&
            !manualReview.hasUnreviewedItems
          }
          canDelete={detail?.actions?.canDelete}
          approving={approving}
          deleting={deleting}
          onApprove={handleApprove}
          onDelete={handleDelete}
          onBack={() => navigate("/admin/testsubmissions")}
          // `reportId` route param is the per-attempt assessmentReport _id.
          // The adminView flag routes StudentReport.jsx to the ungated
          // /v1/admin/results/:reportId/student-view endpoint so admin
          // sees the same payload the student will receive, regardless
          // of approval state.
          onViewStudentReport={
            reportId
              ? () =>
                  // Same-tab navigate() into the admin-scoped report route,
                  // NOT window.open to /result: the old new-tab jump landed
                  // the admin in the student shell with no history entry to
                  // return to, stranding them off /admin. ?adminView=1 still
                  // selects the admin student-view endpoint.
                  navigate(`/admin/testsubmissions/${reportId}/report?adminView=1`)
              : undefined
          }
        />
      </div>
    </main>
  );
}

const formatProfileDate = (value) => {
  if (!value) return "-";
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return String(value);
  return dt.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

// Field definitions take `t` so labels translate live with the
// language toggle. Keys stay in English (they index the API response).
const buildProfileFieldDefinitions = (t) => [
  { key: "dateOfBirth", label: t("reviewSubmission.fieldDateOfBirth"), format: formatProfileDate },
  { key: "gender", label: t("reviewSubmission.fieldGender") },
  { key: "phone", label: t("reviewSubmission.fieldPhone") },
  { key: "schoolOrCollege", label: t("reviewSubmission.fieldSchoolCollege") },
  { key: "classOrGrade", label: t("reviewSubmission.fieldClassGrade") },
  { key: "stream", label: t("reviewSubmission.fieldStream") },
  { key: "board", label: t("reviewSubmission.fieldBoard") },
  { key: "city", label: t("reviewSubmission.fieldCity") },
  { key: "state", label: t("reviewSubmission.fieldState") },
];

function StudentProfileReviewBlock({ profile, t }) {
  const safeProfile = profile || {};
  const fields = buildProfileFieldDefinitions(t);
  const hasAnyData = fields.some((field) =>
    String(safeProfile[field.key] || "").trim()
  );

  return (
    <section className="surface-card mt-8 rounded-[28px] p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#EAFBFB] text-[#157A7A]">
            <GraduationCap className="h-5 w-5" />
          </span>
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[#157A7A]">
              {t("reviewSubmission.studentProfileEyebrow")}
            </p>
            <h2 className="mt-1 text-2xl font-bold text-[#0F1729]">
              {t("reviewSubmission.studentProfileHeading")}
            </h2>
            <p className="mt-1 text-sm leading-7 text-[#65758B]">
              {t("reviewSubmission.studentProfileBody")}
            </p>
          </div>
        </div>
        {safeProfile.isComplete ? (
          <span className="inline-flex shrink-0 items-center rounded-full bg-[#E2F8F7] px-3 py-1 text-xs font-semibold text-[#157A7A]">
            {t("reviewSubmission.profileComplete")}
          </span>
        ) : (
          <span className="inline-flex shrink-0 items-center rounded-full bg-[#FFF1D3] px-3 py-1 text-xs font-semibold text-[#B86D00]">
            {t("reviewSubmission.profileIncomplete")}
          </span>
        )}
      </div>

      {hasAnyData ? (
        <dl className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {fields.map((field) => {
            const raw = safeProfile[field.key];
            const value = field.format
              ? field.format(raw)
              : raw && String(raw).trim()
                ? raw
                : "-";
            return (
              <div key={field.key}>
                <dt className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#7D8CA2]">
                  {field.label}
                </dt>
                <dd className="mt-1.5 rounded-2xl border border-[#E1E7EF] bg-white px-4 py-3 text-sm font-medium text-[#0F1729]">
                  {value}
                </dd>
              </div>
            );
          })}
        </dl>
      ) : (
        <p className="mt-6 rounded-2xl bg-[#F8FAFC] px-4 py-4 text-sm text-[#65758B]">
          {t("reviewSubmission.noProfileDataNotice")}
        </p>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Manual Review section — Section 4 image/diagram items with per-item
// correct/incorrect override + a finalize button that recalculates scoring.
// ---------------------------------------------------------------------------

const decisionBadgeClass = (decision) => {
  if (decision === "correct") {
    return "border-[#BEE7D1] bg-[#F1FCF5] text-[#1D7D46]";
  }
  if (decision === "incorrect") {
    return "border-[#F5D0D0] bg-[#FFF5F5] text-[#B42318]";
  }
  return "border-[#F4DCA8] bg-[#FFF1D3] text-[#B86D00]";
};

// Prompt-9 Fix 2: render every answer option side-by-side with the
// correct one highlighted green and the student's answer highlighted
// blue (or red if it differs from correct). Letter labels (A/B/C/D)
// come from the scorer; text is the option's full content.
const normaliseLetter = (value = "") => String(value || "").trim().toUpperCase();

function ManualReviewOptionList({ options = [], studentAnswer, correctAnswer, t }) {
  const student = normaliseLetter(studentAnswer);
  const correct = normaliseLetter(correctAnswer);
  const studentMissed = Boolean(student && correct && student !== correct);
  const list = Array.isArray(options) ? options : [];

  if (!list.length) {
    return (
      <div className="rounded-[12px] border border-dashed border-[#D9E5EC] bg-[#FBFCFD] px-3 py-3 text-xs text-[#7D8CA2]">
        {t("reviewSubmission.optionsNotStored")}{" "}
        <span className="font-semibold text-[#0F1729]">
          {studentAnswer || "—"}
        </span>{" "}
        · {t("reviewSubmission.correctAnswerInline")}{" "}
        <span className="font-semibold text-[#1D7D46]">
          {correctAnswer || "—"}
        </span>
        .
      </div>
    );
  }

  return (
    <ul className="space-y-1.5">
      {list.map((option, index) => {
        const label = normaliseLetter(
          option?.label || String.fromCharCode(65 + index)
        );
        const isCorrect = label === correct;
        const isStudent = label === student;
        // Style precedence: correct (green) > student's wrong (red) >
        // student's confirmed-correct (already green) > student-only
        // (blue when no answer key) > neutral.
        let containerClass =
          "border-[#E1E7EF] bg-white text-[#4E5D72]";
        if (isCorrect) {
          containerClass = "border-[#BEE7D1] bg-[#F1FCF5] text-[#0F1729]";
        } else if (isStudent && studentMissed) {
          containerClass = "border-[#F5D0D0] bg-[#FFF5F5] text-[#0F1729]";
        } else if (isStudent) {
          containerClass = "border-[#BFDBFE] bg-[#EFF6FF] text-[#0F1729]";
        }
        return (
          <li
            key={`${label}-${index}`}
            className={`flex items-start gap-3 rounded-[12px] border px-3 py-2 ${containerClass}`}
          >
            <span
              className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[11px] font-bold ${
                isCorrect
                  ? "border-[#1D7D46] bg-[#1D7D46] text-white"
                  : isStudent
                    ? studentMissed
                      ? "border-[#B42318] bg-[#B42318] text-white"
                      : "border-[#2563EB] bg-[#2563EB] text-white"
                    : "border-[#D9E5EC] bg-white text-[#4E5D72]"
              }`}
            >
              {label}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] leading-5">
                {option?.text || t("reviewSubmission.noOptionText")}
              </p>
              <div className="mt-1 flex flex-wrap gap-2">
                {isCorrect ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#1D7D46] px-2 py-0.5 text-[10px] font-semibold text-white">
                    {t("reviewSubmission.correctAnswerBadge")}
                  </span>
                ) : null}
                {isStudent ? (
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold text-white ${
                      studentMissed ? "bg-[#B42318]" : "bg-[#2563EB]"
                    }`}
                  >
                    {t("reviewSubmission.studentAnsweredBadge")}
                  </span>
                ) : null}
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function ManualReviewItemCard({
  item,
  note,
  onNoteChange,
  onDecision,
  onUndo,
  isSaving,
  t,
}) {
  const decision = item.adminDecision;
  const decisionLabel =
    decision === "correct"
      ? t("reviewSubmission.decisionMarkedCorrect")
      : decision === "incorrect"
        ? t("reviewSubmission.decisionMarkedIncorrect")
        : item.requiresManualReview
          ? t("reviewSubmission.decisionPending")
          : t("reviewSubmission.decisionAutoGraded");
  const subsectionLabel = SUBSECTION_LABEL_KEYS[item.subsectionKey]
    ? t(SUBSECTION_LABEL_KEYS[item.subsectionKey])
    : item.subsectionKey;

  return (
    <div className="rounded-[20px] border border-[#E1E7EF] bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-[#F4F6F9] px-2.5 py-0.5 text-xs font-semibold text-[#4E5D72]">
              Q{item.questionId}
            </span>
            <span className="rounded-full border border-[#D7E7EC] bg-white px-2.5 py-0.5 text-[11px] font-semibold text-[#4E5D72]">
              {subsectionLabel}
            </span>
            {item.requiresManualReview ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-[#F4DCA8] bg-[#FFF1D3] px-2.5 py-0.5 text-[11px] font-semibold text-[#B86D00]">
                <AlertTriangle className="h-3 w-3" />
                {t("reviewSubmission.reviewRequiredChip")}
              </span>
            ) : null}
            <span
              className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${decisionBadgeClass(decision)}`}
            >
              {decisionLabel}
            </span>
          </div>
          <p className="mt-3 text-sm leading-6 text-[#0F1729]">
            {item.questionText || t("reviewSubmission.questionTextUnavailable")}
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-[minmax(0,220px)_minmax(0,1fr)]">
        <div className="overflow-hidden rounded-[14px] border border-[#E1E7EF] bg-[#FBFCFD]">
          {item.mediaUrl ? (
            <img
              src={item.mediaUrl}
              alt={t("reviewSubmission.questionMediaAlt", { id: item.questionId })}
              className="block h-auto w-full"
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
          ) : (
            <div className="flex flex-col items-center justify-center gap-1.5 px-4 py-8 text-[#7D8CA2]">
              <ImageOff className="h-5 w-5" />
              <p className="text-[11px] font-medium uppercase tracking-[0.1em]">
                {t("reviewSubmission.noImage")}
              </p>
              <p className="text-[11px] leading-4 text-center">
                {t("reviewSubmission.textOnlyMedia")}
              </p>
            </div>
          )}
        </div>

        <div className="space-y-3">
          {/* Prompt-9 Fix 2: render the full options list with the correct
              answer highlighted green and the student's answer highlighted
              blue (or red if it differs from correct). Replaces the
              previous two-column "student / stored key" tile pair, which
              forced the admin to mentally map A/B/C back to text. */}
          <ManualReviewOptionList
            options={item.options}
            studentAnswer={item.studentAnswer}
            correctAnswer={item.correctAnswer}
            t={t}
          />

          <p className="text-xs text-[#7D8CA2]">
            {item.correctAnswer ? (
              <>
                {t("reviewSubmission.storedAnswerKey")}{" "}
                <span className="font-semibold text-[#1D7D46]">
                  {item.correctAnswer}
                </span>
                . {t("reviewSubmission.algorithmMarkedThis")}{" "}
                <span
                  className={`font-semibold ${item.autoMarkedCorrect ? "text-[#1D7D46]" : "text-[#B42318]"}`}
                >
                  {item.autoMarkedCorrect
                    ? t("reviewSubmission.markedCorrectLower")
                    : t("reviewSubmission.markedIncorrectLower")}
                </span>
                .
              </>
            ) : (
              <>
                <span className="font-semibold text-[#B42318]">
                  {t("reviewSubmission.answerKeyMissing")}
                </span>{" "}
                {t("reviewSubmission.answerKeyMissingNote")}
              </>
            )}
          </p>

          <div className="space-y-2">
            <label
              htmlFor={`note-${item.questionId}`}
              className="block text-[10px] font-semibold uppercase tracking-[0.1em] text-[#7D8CA2]"
            >
              {t("reviewSubmission.adminNoteLabel")}
            </label>
            <input
              id={`note-${item.questionId}`}
              type="text"
              value={note}
              onChange={(e) => onNoteChange(item.questionId, e.target.value)}
              placeholder={t("reviewSubmission.adminNotePlaceholder")}
              className="w-full rounded-[10px] border border-[#D9E5EC] bg-white px-3 py-1.5 text-xs text-[#0F1729] focus:border-[#188B8B] focus:outline-none focus:ring-2 focus:ring-[#188B8B]/15"
              maxLength={500}
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <button
              type="button"
              onClick={() => onDecision(item.questionId, "correct")}
              disabled={isSaving || decision === "correct"}
              className={`inline-flex items-center gap-1.5 rounded-[10px] px-3 py-1.5 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${
                decision === "correct"
                  ? "bg-[#1D7D46] text-white"
                  : "border border-[#BEE7D1] bg-white text-[#1D7D46] hover:bg-[#F1FCF5]"
              }`}
            >
              <Check className="h-3.5 w-3.5" />
              {t("reviewSubmission.markCorrect")}
            </button>
            <button
              type="button"
              onClick={() => onDecision(item.questionId, "incorrect")}
              disabled={isSaving || decision === "incorrect"}
              className={`inline-flex items-center gap-1.5 rounded-[10px] px-3 py-1.5 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${
                decision === "incorrect"
                  ? "bg-[#B42318] text-white"
                  : "border border-[#F5D0D0] bg-white text-[#B42318] hover:bg-[#FFF5F5]"
              }`}
            >
              <X className="h-3.5 w-3.5" />
              {t("reviewSubmission.markIncorrect")}
            </button>
            {decision ? (
              <button
                type="button"
                onClick={() => onUndo(item.questionId)}
                className="inline-flex items-center gap-1.5 rounded-[10px] border border-[#D9E5EC] bg-white px-3 py-1.5 text-xs font-semibold text-[#4E5D72] hover:bg-[#F8FAFC]"
              >
                {t("reviewSubmission.undo")}
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

function ManualReviewSection({
  manualReview,
  setManualReview,
  onDecision,
  onUndo,
  onFinalize,
  t,
}) {
  const items = manualReview.items || [];
  const pending = items.filter(
    (item) => item.requiresManualReview && item.adminDecision == null
  );
  const completed = items.filter(
    (item) => item.requiresManualReview && item.adminDecision != null
  );

  const handleNoteChange = (questionId, value) => {
    setManualReview((prev) => ({
      ...prev,
      notes: { ...(prev.notes || {}), [questionId]: value },
    }));
  };

  return (
    <section className="surface-card mt-8 rounded-[28px] p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[#157A7A]">
            {t("reviewSubmission.manualReviewEyebrow")}
          </p>
          <h2 className="mt-2 text-2xl font-bold text-[#0F1729]">
            {t("reviewSubmission.manualReviewHeading")}
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-7 text-[#65758B]">
            {t("reviewSubmission.manualReviewBody")}
          </p>
        </div>
        <div className="text-right text-xs text-[#65758B]">
          {items.length ? (
            <>
              <p>
                <span className="font-semibold text-[#0F1729]">
                  {items.length}
                </span>{" "}
                {t("reviewSubmission.flaggedItems")}
              </p>
              <p>
                <span className="font-semibold text-[#B86D00]">
                  {pending.length}
                </span>{" "}
                {t("reviewSubmission.pending")} ·{" "}
                <span className="font-semibold text-[#1D7D46]">
                  {completed.length}
                </span>{" "}
                {t("reviewSubmission.resolved")}
              </p>
            </>
          ) : null}
        </div>
      </div>

      {manualReview.error ? (
        <div className="mt-4 rounded-[14px] border border-[#F5D0D0] bg-[#FFF5F5] px-4 py-3 text-sm text-[#B42318]">
          {manualReview.error}
        </div>
      ) : null}

      {manualReview.loading ? (
        <div className="mt-6 flex items-center gap-2 text-sm text-[#65758B]">
          <Loader2 className="h-4 w-4 animate-spin" />
          {t("reviewSubmission.loadingQueue")}
        </div>
      ) : items.length === 0 ||
        items.every((item) => !item.requiresManualReview) ? (
        <div className="mt-6 flex items-start gap-3 rounded-[18px] border border-[#BEE7D1] bg-[#F1FCF5] px-5 py-4 text-sm text-[#1D7D46]">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <p className="font-semibold">
              {t("reviewSubmission.allAutoGradedHeading")}
            </p>
            <p className="mt-1 text-[#4E5D72]">
              {t("reviewSubmission.allAutoGradedBody")}
            </p>
          </div>
        </div>
      ) : (
        <>
          <div className="mt-6 flex items-start gap-3 rounded-[18px] border border-[#F4DCA8] bg-[#FFF9EE] px-5 py-4 text-sm text-[#8C5A00]">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-[#F59F0A]" />
            <div>
              <p className="font-semibold text-[#0F1729]">
                {t("reviewSubmission.questionsCouldNotGrade", { count: items.length })}
              </p>
              <p className="mt-1 text-[#65758B]">
                {t("reviewSubmission.reviewEachOne")}
              </p>
            </div>
          </div>
          <div className="mt-6 space-y-4">
            {items.map((item) => (
              <ManualReviewItemCard
                key={item.questionId}
                item={item}
                note={manualReview.notes?.[item.questionId] || ""}
                onNoteChange={handleNoteChange}
                onDecision={onDecision}
                onUndo={onUndo}
                isSaving={manualReview.decisionFor === item.questionId}
                t={t}
              />
            ))}
          </div>

          <div className="mt-6 flex flex-col gap-3 rounded-[20px] border border-[#E5EEF2] bg-[#FBFCFD] p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-[#0F1729]">
                {pending.length === 0
                  ? t("reviewSubmission.allDecided")
                  : t("reviewSubmission.stillNeedDecision", { count: pending.length })}
              </p>
              <p className="mt-1 text-xs text-[#65758B]">
                {t("reviewSubmission.finalizingBody")}
              </p>
            </div>
            <button
              type="button"
              onClick={onFinalize}
              disabled={pending.length > 0 || manualReview.finalizing}
              className="inline-flex items-center justify-center gap-2 rounded-[12px] bg-[#157A7A] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_10px_22px_rgba(24,139,139,0.18)] hover:bg-[#147070] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {manualReview.finalizing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t("reviewSubmission.recalculating")}
                </>
              ) : (
                <>
                  <ClipboardCheck className="h-4 w-4" />
                  {t("reviewSubmission.finalizeAction")}
                </>
              )}
            </button>
          </div>
        </>
      )}

      {manualReview.refreshedScores ? (
        <div className="mt-5 rounded-[20px] border border-[#D4EBEE] bg-[linear-gradient(180deg,#F7FDFD_0%,#FFFFFF_100%)] p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#157A7A]">
            {t("reviewSubmission.recomputed")}
          </p>
          <h3 className="mt-1 text-lg font-bold text-[#0F1729]">
            {t("reviewSubmission.updatedScoresHeading")}
          </h3>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <div className="rounded-[14px] bg-white px-3 py-2 shadow-[0_2px_8px_rgba(15,23,41,0.04)]">
              <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#7D8CA2]">
                {t("reviewSubmission.overallScoreLabel")}
              </p>
              <p className="mt-1 text-2xl font-bold text-[#157A7A]">
                {manualReview.refreshedScores.overallScore ?? "—"}
              </p>
            </div>
            {Object.entries(manualReview.refreshedScores.aptitudeScores || {})
              .filter(([key]) =>
                ["Abstract", "Spatial Relations", "Mechanical"].includes(key)
              )
              .map(([key, value]) => (
                <div
                  key={key}
                  className="rounded-[14px] bg-white px-3 py-2 shadow-[0_2px_8px_rgba(15,23,41,0.04)]"
                >
                  <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#7D8CA2]">
                    {key}
                  </p>
                  <p className="mt-1 text-2xl font-bold text-[#0F1729]">
                    {value != null ? `${Math.round(Number(value))}%` : "—"}
                  </p>
                </div>
              ))}
          </div>
          {(manualReview.refreshedScores.careerRecommendations || []).length ? (
            <div className="mt-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#7D8CA2]">
                {t("reviewSubmission.refreshedTopCareers")}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {manualReview.refreshedScores.careerRecommendations
                  .slice(0, 5)
                  .map((career) => (
                    <span
                      key={career.title}
                      className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-xs font-semibold text-[#0F1729] shadow-[0_2px_8px_rgba(15,23,41,0.04)]"
                    >
                      {career.title}
                      <span className="rounded-full bg-[#E2F8F7] px-2 py-0.5 text-[10px] text-[#157A7A]">
                        {Math.round(Number(career.score || 0))}%
                      </span>
                    </span>
                  ))}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {manualReview.completedAt && !manualReview.refreshedScores ? (
        <p className="mt-4 text-xs text-[#7D8CA2]">
          {t("reviewSubmission.manualReviewCompletedAt", {
            date: new Date(manualReview.completedAt).toLocaleString("en-IN"),
          })}
        </p>
      ) : null}
    </section>
  );
}

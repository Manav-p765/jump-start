import { ArrowRight, Clock3, FileText } from "lucide-react";
import {
  formatStudentDate,
  getPrimaryActionLabel,
  getResultMeta,
} from "../../data/studentResults";
import StatusPill from "./StatusPill";

export default function ResultHistoryCard({
  test,
  busy = false,
  onAction,
}) {
  const purchaseMeta = getResultMeta("purchase", test.purchaseState);
  const attemptMeta = getResultMeta("attempt", test.attemptState);
  const resultMeta = getResultMeta("result", test.resultState);
  const helperText =
    test.resultState === "pending_approval" && test.hasPublishedReport
      ? "Latest attempt is under review. Your last published report is still available."
      : test.hasPublishedReport
        ? "Detailed report available"
        : test.resultState === "pending_approval"
          ? "Submitted and waiting for approval"
          : test.attemptState === "in_progress"
            ? "Continue from your saved progress"
            : "Ready whenever you want to begin";

  return (
    <article className="surface-card rounded-[28px] p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h3 className="text-2xl font-bold text-[#0F1729]">{test.title}</h3>
            {test.badge ? (
              <span className="rounded-full bg-[#FFF6DF] px-3 py-1 text-[11px] font-semibold text-[#B86D00]">
                {test.badge}
              </span>
            ) : null}
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <StatusPill label={purchaseMeta.label} className={purchaseMeta.className} />
            <StatusPill label={attemptMeta.label} className={attemptMeta.className} />
            <StatusPill label={resultMeta.label} className={resultMeta.className} />
          </div>

          <div className="mt-5 flex flex-wrap gap-5 text-sm text-[#65758B]">
            <span>Sections: {test.completedSections ?? 0} / {test.totalSections ?? 0}</span>
            <span>Questions: {test.totalQuestions ?? 0}</span>
            <span>Duration: {test.totalDurationMinutes ?? 0} mins</span>
            <span>Attempts: {test.attemptCount ?? 0}</span>
          </div>
        </div>

        <div className="min-w-[170px] rounded-[22px] border border-[#E5EEF2] bg-[#FBFCFD] px-4 py-4 text-right">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#8A94A6]">
            Published Score
          </p>
          <p className="mt-2 text-3xl font-bold text-[#0F1729]">
            {test.scorePreview == null ? "-" : `${test.scorePreview} / 100`}
          </p>
          <p className="mt-2 text-xs text-[#65758B]">
            {test.lastUpdatedAt
              ? `Updated ${formatStudentDate(test.lastUpdatedAt)}`
              : "No published result yet"}
          </p>
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap gap-3 text-sm text-[#65758B]">
          <span className="inline-flex items-center gap-2">
            <FileText className="h-4 w-4 text-[#157A7A]" />
            {helperText}
          </span>
          {test.resultState === "pending_approval" ? (
            <span className="inline-flex items-center gap-2">
              <Clock3 className="h-4 w-4 text-[#F59F0A]" />
              Estimated review time: 48 hours
            </span>
          ) : null}
        </div>

        <button
          type="button"
          onClick={() => onAction?.(test)}
          disabled={busy}
          className="inline-flex items-center justify-center gap-2 rounded-[16px] bg-[#157A7A] px-5 py-3 text-sm font-semibold text-white shadow-[0_14px_28px_rgba(24,139,139,0.16)] hover:bg-[#126A6A] disabled:opacity-60"
        >
          {busy ? "Opening..." : getPrimaryActionLabel(test.currentAction)}
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </article>
  );
}

import { CheckCircle2, ClipboardCheck, Percent, Trophy } from "lucide-react";
import { formatScoreValue } from "../../data/adminReview";
import ResultStatusBadge from "./ResultStatusBadge";

// Prompt-6 fix: derive the completion-status chip styling from the
// scorer's literal value ("Complete" | "Incomplete") rather than
// reading a separate flag — green when Complete, red when Incomplete,
// neutral otherwise.
const COMPLETION_CHIP_STYLES = {
  Complete: "bg-[#F1FCF5] text-[#1D7D46]",
  Completed: "bg-[#F1FCF5] text-[#1D7D46]",
  Incomplete: "bg-[#FFF5F5] text-[#B42318]",
};

const isCompleteStatus = (status) =>
  String(status || "").trim().toLowerCase().startsWith("complete");

const summaryItems = (summary = {}) => {
  const completionStatus = summary.completionStatus || "Pending";
  const completionChipClass =
    COMPLETION_CHIP_STYLES[completionStatus] || "bg-[#F4F8FF] text-[#3B82F6]";
  // The scorer's overallScore is already 0-100, and maxScore is always 100
  // for the post-Prompt-5 scoring pipeline. If the API still ships a
  // separate maxScore field we honour it; otherwise default to 100 so the
  // demo doesn't read "47 / 0".
  const maxScore =
    summary.maxScore != null && Number.isFinite(Number(summary.maxScore))
      ? summary.maxScore
      : 100;
  const overallScoreSuffix = summary.isDemo ? " (Demo)" : "";

  return [
    {
      key: "overallScore",
      label: "Overall Score",
      value: `${formatScoreValue(summary.overallScore)} / ${formatScoreValue(
        maxScore
      )}${overallScoreSuffix}`,
      icon: Trophy,
      accent: "bg-[#EAFBFB] text-[#157A7A]",
    },
    {
      key: "percentage",
      label: "Percentage",
      value: `${formatScoreValue(
        summary.percentage != null ? summary.percentage : summary.overallScore
      )}%`,
      icon: Percent,
      accent: "bg-[#FFF6DF] text-[#F59F0A]",
    },
    {
      key: "completionStatus",
      label: "Completion Status",
      value: completionStatus,
      icon: ClipboardCheck,
      accent: completionChipClass,
    },
    {
      key: "completedSections",
      label: "Completed Sections",
      value: `${summary.completedSections ?? 0} / ${summary.totalSections ?? 0}`,
      icon: CheckCircle2,
      accent: isCompleteStatus(completionStatus)
        ? "bg-[#F1FCF5] text-[#16A34A]"
        : "bg-[#FFF5F5] text-[#B42318]",
    },
  ];
};

export default function OverallScoreSummaryCard({ summary }) {
  return (
    <section className="surface-card rounded-[28px] p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[#157A7A]">
            Overall Result Summary
          </p>
          <h2 className="mt-3 text-2xl font-bold text-[#0F1729]">Review Snapshot</h2>
        </div>
        <ResultStatusBadge status={summary?.statusLabel} />
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {summaryItems(summary).map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.key}
              className="rounded-[22px] border border-[#E5EEF2] bg-white px-4 py-4"
            >
              <div className="flex items-center gap-3">
                <div className={`rounded-2xl p-2.5 ${item.accent}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#8A94A6]">
                    {item.label}
                  </p>
                  <p className="mt-1 text-lg font-bold text-[#0F1729]">{item.value}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

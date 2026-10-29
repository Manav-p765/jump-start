import { formatScoreValue } from "../../data/adminReview";
import ResultStatusBadge from "./ResultStatusBadge";

const getBreakdownStatusLabel = (status) => {
  if (status === "review_required") return "Review Required";
  if (status === "completed") return "Completed";
  return "Incomplete";
};

const SCORE_BAND_LABELS = new Set(["High", "Moderate", "Low"]);
const HIGH_SIGNAL_BANDS = new Set(["High", "Excellent", "Strong"]);
const SUBSECTION_PREFIX_PATTERN = /^\d+(?:\.\d+)*\s*/;
const LIKERT_BAND_RANGES = {
  High: "4.0-5.0",
  Moderate: "3.0-3.99",
  Low: "1.0-2.99",
};

const getDisplayLabel = (label) =>
  String(label || "").replace(SUBSECTION_PREFIX_PATTERN, "").trim();

const getLikertAverage = (item) => {
  if (Number.isFinite(Number(item?.average))) {
    return Number(item.average);
  }

  const percentage = Number(item?.percentage);
  if (Number.isFinite(percentage)) {
    return 1 + (percentage / 100) * 4;
  }

  return null;
};

const getDerivedInterpretationLabel = (item) => {
  const label = getDisplayLabel(item?.label);
  if (!label) return "";

  const band = String(item?.band || "").trim();
  if (band && band !== "Review Required" && item?.scoreType !== "profile_consistency") {
    if (item?.key === "neuroticism") return `${band} Neuroticism`;
    return `${band} ${label}`;
  }

  const average = getLikertAverage(item);
  if (!Number.isFinite(average)) return "";

  if (item?.key === "neuroticism") {
    if (average <= 2) return "Low Neuroticism";
    if (average < 4) return "Moderate Neuroticism";
    return "High Neuroticism";
  }

  if (average >= 4) return `High ${label}`;
  if (average >= 3) return `Moderate ${label}`;
  return `Low ${label}`;
};

const trimTrailingPunctuation = (value) =>
  String(value || "")
    .trim()
    .replace(/[.!,;:\s]+$/g, "");

const getInterpretationRange = (item) => {
  const configuredRange = String(item?.bandRangeLabel || "").trim();
  if (configuredRange) return configuredRange;
  if (item?.scoreType !== "average") return "";
  return LIKERT_BAND_RANGES[String(item?.band || "").trim()] || "";
};

const getInterpretationHeading = (item) => {
  if (item?.scoreType === "profile_consistency" && item?.band) {
    return String(item.band).trim();
  }

  return (
    getDerivedInterpretationLabel(item) ||
    getDisplayLabel(item?.label) ||
    String(item?.band || "").trim() ||
    "Interpretation"
  );
};

const getInterpretationNarrative = (item, heading) =>
  [item?.description, item?.interpretation]
    .map((value) => String(value || "").trim())
    .find((value) => value && value !== heading) || "";

const getScoreSummaryLabel = (item) => {
  if (item?.scoreType === "average" && Number.isFinite(Number(item?.average))) {
    return `${formatScoreValue(item.average)} / 5 average`;
  }

  if (
    item?.scoreType === "correct_count" &&
    Number.isFinite(Number(item?.score)) &&
    Number.isFinite(Number(item?.maxScore))
  ) {
    return `${formatScoreValue(item.score)} / ${formatScoreValue(item.maxScore)}`;
  }

  return "";
};

const buildInterpretationBody = (item, heading) => {
  const narrative = getInterpretationNarrative(item, heading);
  const careerImplication = String(item?.careerImplication || "").trim();
  const cleanedNarrative = careerImplication
    ? trimTrailingPunctuation(narrative)
    : narrative;
  const scoreSummary = getScoreSummaryLabel(item);

  if (cleanedNarrative && careerImplication) {
    return `${cleanedNarrative} -> ${careerImplication}`;
  }

  if (cleanedNarrative || careerImplication) {
    return cleanedNarrative || careerImplication;
  }

  if (scoreSummary) {
    return item?.scoreType === "average"
      ? "Average score across the questions mapped to this field."
      : "Score across the questions mapped to this field.";
  }

  return "Interpretation unavailable.";
};

const isHighSideInterpretationItem = (item) => {
  const band = String(item?.band || "").trim();
  if (band) {
    return HIGH_SIGNAL_BANDS.has(band);
  }

  const average = Number(item?.average);
  if (Number.isFinite(average)) {
    const maxScore = Number(item?.maxScore);
    if (Number.isFinite(maxScore) && maxScore > 0) {
      return average / maxScore >= 0.8;
    }
    return average >= 4;
  }

  const percentage = Number(item?.percentage);
  if (Number.isFinite(percentage)) {
    return percentage >= 75;
  }

  return false;
};

const getConfiguredInterpretationItems = (subsection) =>
  Array.isArray(subsection?.interpretationItems)
    ? subsection.interpretationItems
        .map((item) => {
          const heading = String(item?.title || "").trim();
          const meta = String(item?.meta || "").trim();
          return {
            key: item?.key || heading,
            heading: meta ? `${heading} (${meta})` : heading,
            body: String(item?.detail || "").trim(),
          };
        })
        .filter((item) => item.heading)
    : [];

const getUniqueQuestionCount = (questionNumbers = []) =>
  new Set(
    (Array.isArray(questionNumbers) ? questionNumbers : [])
      .map((value) => Number(value))
      .filter(Number.isFinite)
  ).size;

const parseQuestionRangeCount = (questionRangeLabel) => {
  const parts = String(questionRangeLabel || "")
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  if (!parts.length) return null;

  const total = parts.reduce((sum, part) => {
    const rangeMatch = part.match(/^(\d+)\s*-\s*(\d+)$/);
    if (rangeMatch) {
      const start = Number(rangeMatch[1]);
      const end = Number(rangeMatch[2]);
      if (Number.isFinite(start) && Number.isFinite(end) && end >= start) {
        return sum + (end - start + 1);
      }
      return sum;
    }

    const singleValue = Number(part);
    if (Number.isFinite(singleValue)) {
      return sum + 1;
    }

    return sum;
  }, 0);

  return total > 0 ? total : null;
};

// Prompt-6 fix: trust the scorer's authoritative answeredCount /
// totalQuestions fields. The previous fallback chain (derived from
// questionNumbers / questionRangeLabel / status) was the bug that
// produced "3/30 incomplete" for fully-answered demo subsections.
// Fall back to the questionNumbers count only when the scorer didn't
// emit a numeric totalQuestions at all (legacy reports).
const getQuestionProgressCounts = (subsection) => {
  const rawAnswered = Number(subsection?.answeredCount);
  const rawTotal = Number(subsection?.totalQuestions);

  const hasScorerTotal = Number.isFinite(rawTotal) && rawTotal >= 0;
  const hasScorerAnswered = Number.isFinite(rawAnswered) && rawAnswered >= 0;

  if (hasScorerTotal) {
    const answeredCount = hasScorerAnswered ? rawAnswered : 0;
    return {
      answeredCount: Math.min(answeredCount, rawTotal),
      totalQuestions: rawTotal,
    };
  }

  // Legacy fallback for reports persisted before the scorer fix.
  const fallbackTotal =
    getUniqueQuestionCount(subsection?.questionNumbers) ||
    parseQuestionRangeCount(subsection?.questionRangeLabel) ||
    0;

  if (!fallbackTotal) return null;
  if (hasScorerAnswered) {
    return {
      answeredCount: Math.min(rawAnswered, fallbackTotal),
      totalQuestions: fallbackTotal,
    };
  }
  // No explicit answered count and no scorer total — assume complete if
  // the subsection isn't marked incomplete, otherwise show 0/total.
  return subsection?.status !== "incomplete"
    ? { answeredCount: fallbackTotal, totalQuestions: fallbackTotal }
    : { answeredCount: 0, totalQuestions: fallbackTotal };
};

const getQuestionProgressValue = (subsection) => {
  const counts = getQuestionProgressCounts(subsection);
  if (counts) {
    return `${formatScoreValue(counts.answeredCount)} / ${formatScoreValue(
      counts.totalQuestions
    )}`;
  }

  return "Not available";
};

const getNormalizedScorePercent = (subsection) => {
  const explicitPercentage = Number(subsection?.percentage);
  if (Number.isFinite(explicitPercentage)) {
    return explicitPercentage;
  }

  if (subsection?.scoreType === "average") {
    const averageValue = Number(
      subsection?.average != null ? subsection.average : subsection?.score
    );
    if (Number.isFinite(averageValue)) {
      return ((averageValue - 1) / 4) * 100;
    }
  }

  if (subsection?.scoreType === "profile_consistency") {
    const score = Number(subsection?.score);
    const maxScore = Number(subsection?.maxScore);
    if (Number.isFinite(score) && Number.isFinite(maxScore) && maxScore > 0) {
      return (score / maxScore) * 100;
    }
  }

  return null;
};

// Prompt-6 fix: stale "Insufficient data" messages persisted by older
// reports (built before the scorer denominator fix in Prompt 5) can
// still appear on subsections that are now correctly marked
// "completed". Filter them out so the admin doesn't see contradictory
// text next to a green Complete badge.
const isStaleInsufficientMessage = (item = {}) =>
  /insufficient (data|answered)/i.test(String(item.heading || "")) ||
  /insufficient (data|answered)/i.test(String(item.body || "")) ||
  /only \d+\/\d+\s*questions? were answered/i.test(String(item.body || ""));

const stripStaleCoverageMessages = (subsection, items) => {
  if (!Array.isArray(items)) return items;
  if (subsection?.status === "incomplete") return items;
  return items.filter((item) => !isStaleInsufficientMessage(item));
};

const buildInterpretationItems = (subsection) => {
  const configuredItems = getConfiguredInterpretationItems(subsection);
  if (configuredItems.length) {
    return stripStaleCoverageMessages(subsection, configuredItems);
  }

  const factorResults = Array.isArray(subsection?.factorResults)
    ? subsection.factorResults.filter(
        (item) => item && item.status !== "incomplete" && item.status !== "review_required"
      )
    : [];
  const clusterResults = Array.isArray(subsection?.clusterResults)
    ? subsection.clusterResults.filter(
        (item) => item && item.status !== "incomplete" && item.status !== "review_required"
      )
    : [];
  const displayMode = String(subsection?.displayMode || "").trim();
  const useHighSignalDimensionMode =
    displayMode === "high_signal_dimensions" ||
    (!displayMode && (factorResults.length > 0 || clusterResults.length > 0));
  const items = useHighSignalDimensionMode
    ? factorResults.length
      ? factorResults
      : clusterResults.length
        ? clusterResults
        : [subsection]
    : [subsection];
  const filteredItems = useHighSignalDimensionMode
    ? items.filter((item) => isHighSideInterpretationItem(item))
    : items;

  const legacyItems = filteredItems.map((item) => {
    const heading = getInterpretationHeading(item);
    const range = getInterpretationRange(item);
    const scoreSummary = !range ? getScoreSummaryLabel(item) : "";
    const headingSuffix = range || scoreSummary;

    return {
      key: item.id || item.key || item.label || heading,
      heading: headingSuffix ? `${heading} (${headingSuffix})` : heading,
      body: buildInterpretationBody(item, heading),
    };
  });

  if (legacyItems.length) {
    return stripStaleCoverageMessages(subsection, legacyItems);
  }

  if (String(subsection?.interpretation || "").trim()) {
    const inferred = [
      {
        key: subsection.id || subsection.key || subsection.label || "summary",
        heading: String(subsection.interpretation).trim(),
        body: String(subsection.careerImplication || "").trim(),
      },
    ];
    return stripStaleCoverageMessages(subsection, inferred);
  }

  return [];
};

const getScoreDisplay = (subsection) => {
  if (subsection.scoreType === "profile_consistency") {
    const percentage = getNormalizedScorePercent(subsection);
    return {
      label: "Consistency",
      value:
        percentage == null
          ? subsection.score == null || subsection.maxScore == null
            ? "Not available"
            : `${formatScoreValue(subsection.score)} / ${formatScoreValue(
                subsection.maxScore
              )}`
          : `${formatScoreValue(percentage)}%`,
      meta: subsection.band || "Pattern-based",
    };
  }

  if (subsection.scoreType === "review_only") {
    return {
      label: "Answered",
      value: getQuestionProgressValue(subsection),
      meta: "Manual review",
    };
  }

  if (subsection.scoreType === "average") {
    const percentage = getNormalizedScorePercent(subsection);
    return {
      label: "Score",
      value: percentage == null ? "Not available" : `${formatScoreValue(percentage)}%`,
      meta: subsection.band || "Normalized",
    };
  }

  return {
    label: "Correct",
    value:
      subsection.score == null
        ? "Review required"
        : `${formatScoreValue(subsection.score)} / ${formatScoreValue(
            subsection.maxScore
          )}`,
    meta:
      subsection.bandRangeLabel ||
      subsection.band ||
      (subsection.percentage == null ? "" : `${formatScoreValue(subsection.percentage)}%`),
  };
};

export default function SubsectionBreakdownList({
  subsections = [],
  nested = false,
}) {
  if (!subsections.length) {
    return (
      <div className="rounded-[16px] border border-dashed border-[#D8E6EC] bg-[#FBFCFD] px-3 py-4 text-[13px] text-[#65758B] sm:rounded-[20px] sm:px-4 sm:py-5 sm:text-sm">
        No subsection data available for this section.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {subsections.map((subsection) => {
        const scoreDisplay = getScoreDisplay(subsection);
        const interpretationItems = buildInterpretationItems(subsection);
        const displayLabel = getDisplayLabel(subsection.label);
        const usesHighSignalDimensions =
          String(subsection?.displayMode || "").trim() === "high_signal_dimensions" ||
          ((!subsection?.displayMode || subsection.displayMode === "") &&
            ((Array.isArray(subsection?.factorResults) && subsection.factorResults.length > 0) ||
              (Array.isArray(subsection?.clusterResults) &&
                subsection.clusterResults.length > 0)));
        return (
          <div
            key={subsection.id || subsection.key || subsection.label}
            className={`rounded-[16px] border border-[#E6EEF2] ${
              nested ? "bg-white" : "bg-[#FBFCFD]"
            } px-3 py-3 sm:rounded-[20px] sm:px-4 sm:py-4`}
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
                  <p className="text-[14px] font-semibold leading-5 text-[#0F1729] sm:text-sm sm:leading-6">
                    {displayLabel}
                  </p>
                  <ResultStatusBadge status={getBreakdownStatusLabel(subsection.status)} />
                  {subsection.band && subsection.scoreType !== "profile_consistency" ? (
                    <span className="rounded-full bg-[#EAFBFB] px-2.5 py-1 text-[10px] font-semibold text-[#157A7A] sm:px-3 sm:text-[11px]">
                      {subsection.band}
                    </span>
                  ) : null}
                </div>

                {(() => {
                  // Prompt-6 fix: show "Questions Assigned: N" using the
                  // scorer's dynamic totalQuestions rather than the old
                  // "Question Pool: 1-30" range label, which read off the
                  // full-bank spec range and was confusing for the demo
                  // (where only 3 of 30 OCEAN items are assigned).
                  const totalAssigned = Number(subsection?.totalQuestions);
                  if (Number.isFinite(totalAssigned) && totalAssigned > 0) {
                    return (
                      <p className="mt-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-[#8A94A6] sm:mt-2 sm:text-xs sm:tracking-[0.12em]">
                        Questions Assigned: {totalAssigned}
                      </p>
                    );
                  }
                  if (subsection.questionRangeLabel) {
                    return (
                      <p className="mt-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-[#8A94A6] sm:mt-2 sm:text-xs sm:tracking-[0.12em]">
                        Question Pool: {subsection.questionRangeLabel}
                      </p>
                    );
                  }
                  return null;
                })()}

                <div className="mt-2.5 space-y-2.5 sm:mt-3 sm:space-y-3">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#8A94A6] sm:text-xs sm:tracking-[0.12em]">
                      Interpretation
                    </p>
                    {interpretationItems.length ? (
                      <ul className="mt-1.5 list-disc space-y-2 pl-5 text-[13px] leading-6 text-[#4E5D72] sm:mt-2 sm:space-y-2.5 sm:text-sm sm:leading-7">
                        {interpretationItems.map((item) => (
                          <li key={item.key}>
                            <span className="font-semibold text-[#0F1729]">
                              {item.heading}
                            </span>
                            {item.body ? (
                              <span className="text-[#4E5D72]">: {item.body}</span>
                            ) : null}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-1 text-[13px] leading-6 text-[#4E5D72] sm:text-sm sm:leading-7">
                        {usesHighSignalDimensions
                          ? "Interpretation details are unavailable for the saved result data in this subsection."
                          : "Interpretation unavailable for this subsection."}
                      </p>
                    )}
                  </div>

                </div>
              </div>

              <div className="w-full rounded-[14px] bg-white px-3 py-2.5 text-left shadow-sm sm:min-w-[170px] sm:w-auto sm:rounded-[18px] sm:px-4 sm:py-3 sm:text-right">
                <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#8A94A6] sm:text-xs sm:tracking-[0.12em]">
                  {scoreDisplay.label}
                </p>
                <p className="mt-1 text-[18px] font-bold text-[#0F1729] sm:text-lg">
                  {scoreDisplay.value}
                </p>
                {scoreDisplay.meta ? (
                  <p className="mt-1 text-[10px] font-semibold text-[#157A7A] sm:text-xs">
                    {scoreDisplay.meta}
                  </p>
                ) : null}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

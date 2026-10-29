import { useState } from "react";
import { ChevronDown, ClipboardList } from "lucide-react";
import { formatScoreValue } from "../../data/adminReview";
import SubsectionBreakdownList from "./SubsectionBreakdownList";

const getSectionScoreLine = (section) => {
  if (section.score == null) return "Section score: Review required";
  return `Section score: ${formatScoreValue(section.score)} / ${formatScoreValue(
    section.maxScore ?? 100
  )}`;
};

export default function SectionBreakdownCard({
  section,
  defaultOpen = true,
  forceOpen = false,
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const showContent = forceOpen || isOpen;

  return (
    <div className="report-print-section rounded-[18px] border border-[#DCE9EE] bg-white shadow-sm sm:rounded-[26px]">
      <button
        type="button"
        onClick={() => {
          if (forceOpen) return;
          setIsOpen((value) => !value);
        }}
        className="grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-2.5 px-3 py-3 text-left sm:gap-4 sm:px-5 sm:py-5"
      >
        <div className="rounded-[14px] bg-[#EAFBFB] p-2 text-[#157A7A] sm:rounded-2xl sm:p-3">
          <ClipboardList className="h-4 w-4 sm:h-5 sm:w-5" />
        </div>
        <div className="min-w-0">
          <h3 className="text-[15px] font-bold leading-6 text-[#0F1729] sm:text-lg sm:leading-7">
            {section.title}
          </h3>
          <p className="mt-1 text-[13px] font-medium leading-5 text-[#4E5D72] sm:mt-1.5 sm:text-sm sm:leading-6">
            {getSectionScoreLine(section)}
            {section.durationMinutes != null ? (
              <span className="ml-2 text-[#157A7A]">
                · Completed in {section.durationMinutes} min
              </span>
            ) : null}
          </p>
        </div>

        <ChevronDown
          className={`mt-1 h-5 w-5 shrink-0 text-[#65758B] transition-transform ${
            showContent ? "rotate-180" : ""
          }`}
        />
      </button>

      {/* Always render the content into the DOM, then visually hide it
          when collapsed. This keeps native browser print (Ctrl+P) able
          to expose every section even when our `forceOpen` path isn't
          triggered — the print stylesheet in index.css overrides the
          `hidden` utility under @media print. */}
      <div
        data-state={showContent ? "open" : "closed"}
        className={`accordion-content border-t border-[#E8EEF3] px-3 py-3 sm:px-5 sm:py-5 ${
          showContent ? "" : "hidden"
        }`}
      >
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#8A94A6] sm:text-xs sm:tracking-[0.16em]">
          Subsection Breakdown
        </p>
        <div className="mt-3 sm:mt-4">
          <SubsectionBreakdownList subsections={section.subsections || []} />
        </div>
      </div>
    </div>
  );
}

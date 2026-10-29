import { Trash2, CheckCircle2, ArrowLeft, ExternalLink } from "lucide-react";
import ResultStatusBadge from "./ResultStatusBadge";

export default function ReviewActionBar({
  statusLabel,
  canApprove,
  canDelete,
  approving = false,
  deleting = false,
  onApprove,
  onDelete,
  onBack,
  // Opens the student-facing report in a new tab using the admin-only
  // ungated endpoint. Falsy => the button is hidden (e.g. while the
  // submission detail is still loading and we don't have a report id).
  onViewStudentReport,
}) {
  return (
    <section className="surface-card rounded-[28px] p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[#157A7A]">
            Review Actions
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <h2 className="text-2xl font-bold text-[#0F1729]">Finalize this review</h2>
            <ResultStatusBadge status={statusLabel} />
          </div>
          <p className="mt-2 text-sm leading-7 text-[#65758B]">
            Approve and publish the reviewed result when everything looks correct,
            or remove the submission if it should not remain in the workflow.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center justify-center gap-2 rounded-[14px] border border-[#D7E4EA] bg-white px-5 py-3 text-sm font-semibold text-[#0F1729] hover:bg-[#F8FAFC]"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Submission List
          </button>

          {onViewStudentReport ? (
            <button
              type="button"
              onClick={onViewStudentReport}
              className="inline-flex items-center justify-center gap-2 rounded-[14px] border border-[#9BD9D6] bg-white px-5 py-3 text-sm font-semibold text-[#157A7A] hover:bg-[#F0FBFB]"
            >
              <ExternalLink className="h-4 w-4" />
              View Student Report
            </button>
          ) : null}

          {canDelete ? (
            <button
              type="button"
              onClick={onDelete}
              disabled={deleting}
              className="inline-flex items-center justify-center gap-2 rounded-[14px] border border-[#F3C7C7] bg-[#FFF5F5] px-5 py-3 text-sm font-semibold text-[#B42318] hover:bg-[#FEEBEC] disabled:opacity-60"
            >
              <Trash2 className="h-4 w-4" />
              {deleting ? "Deleting..." : "Delete"}
            </button>
          ) : null}

          <button
            type="button"
            onClick={onApprove}
            disabled={!canApprove || approving}
            className="inline-flex items-center justify-center gap-2 rounded-[14px] bg-[#188B8B] px-6 py-3 text-sm font-semibold text-white shadow-[0_14px_30px_rgba(24,139,139,0.18)] hover:bg-[#147979] disabled:cursor-default disabled:opacity-60"
          >
            <CheckCircle2 className="h-4 w-4" />
            {canApprove
              ? approving
                ? "Publishing..."
                : "Approve & Publish"
              : "Already Published"}
          </button>
        </div>
      </div>
    </section>
  );
}

import { Link } from "react-router-dom";
import { Clock3, FileText, LockKeyhole } from "lucide-react";

export default function ResultPendingPanel({
  heading = "Results Are Being Processed",
  description = "Your test has been submitted successfully and is awaiting admin approval before your report is published.",
  error = "",
}) {
  return (
    <div className="bg-white">
      <div className="mx-auto flex min-h-[70vh] max-w-5xl items-center justify-center px-4 py-14 sm:px-6 lg:px-8">
        <div className="w-full max-w-3xl text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#157A7A]">
            Test Submitted
          </p>

          <div className="mx-auto mt-6 flex h-20 w-20 items-center justify-center rounded-full bg-[#E8F9F8] text-[#157A7A]">
            <Clock3 className="h-9 w-9" />
          </div>

          <h1 className="mt-8 text-4xl font-bold text-[#0F1729] sm:text-5xl">
            {heading}
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-8 text-[#65758B]">
            {description}
          </p>

          <div className="surface-card mx-auto mt-8 max-w-xl rounded-[30px] border border-[#B9E5E5] p-8">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#E8F9F8] text-[#157A7A]">
              <FileText className="h-7 w-7" />
            </div>
            <h2 className="mt-5 text-2xl font-bold text-[#0F1729]">
              Your Results Will Be Ready In
            </h2>
            <p className="mt-3 text-4xl font-bold text-[#157A7A]">48 Hours</p>
            <p className="mt-4 text-sm leading-7 text-[#65758B]">
              Our team is carefully reviewing your responses and will publish your
              career report on the dashboard as soon as it is approved.
            </p>
          </div>

          <div className="mx-auto mt-6 flex max-w-xl items-start gap-3 rounded-[22px] bg-[#FFF9EE] px-5 py-4 text-left">
            <div className="mt-0.5 rounded-full bg-[#FFF1D3] p-2 text-[#F59F0A]">
              <LockKeyhole className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-semibold text-[#0F1729]">
                Result pending approval
              </p>
              <p className="mt-1 text-sm leading-6 text-[#65758B]">
                Your report stays hidden on the frontend until an admin approves it
                from the review panel.
              </p>
            </div>
          </div>

          {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}

          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              to="/dashboard"
              className="inline-flex items-center justify-center rounded-[14px] bg-[#188B8B] px-6 py-3 text-sm font-semibold text-white hover:bg-[#147979]"
            >
              Go to Dashboard
            </Link>
            <Link to="/test" className="secondary-btn">
              Browse More Tests
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

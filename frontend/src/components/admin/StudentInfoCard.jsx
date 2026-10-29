import {
  Mail,
  Phone,
  FileBadge2,
  GraduationCap,
  CalendarDays,
  Hash,
  Timer,
} from "lucide-react";
import { formatAdminDate } from "../../data/adminReview";
import ResultStatusBadge from "./ResultStatusBadge";

const infoItems = (student = {}, { totalDurationMinutes } = {}) => {
  const items = [
    {
      key: "referenceId",
      label: "Reference ID",
      value: student.referenceId || "-",
      icon: Hash,
    },
    {
      key: "email",
      label: "Email",
      value: student.email || "-",
      icon: Mail,
    },
    {
      key: "phone",
      label: "Phone",
      value: student.phone || "-",
      icon: Phone,
    },
    {
      key: "testName",
      label: "Test Name",
      value: student.testName || "-",
      icon: GraduationCap,
    },
    {
      key: "submittedAt",
      label: "Submitted",
      value: formatAdminDate(student.submittedAt),
      icon: CalendarDays,
    },
    {
      key: "attemptLabel",
      label: "Attempt",
      value: student.attemptLabel || "-",
      icon: FileBadge2,
    },
  ];
  // Duration is only rendered when the backend actually captured it.
  // Legacy reports written before duration tracking landed get nothing
  // here instead of a misleading "0 min" placeholder.
  if (totalDurationMinutes != null) {
    items.push({
      key: "totalDuration",
      label: "Total Duration",
      value: `${totalDurationMinutes} min`,
      icon: Timer,
    });
  }
  return items;
};

export default function StudentInfoCard({
  student,
  statusLabel,
  totalDurationMinutes = null,
}) {
  const reviewContext = student?.testName || student?.testType || "Assessment";

  return (
    <section className="surface-card rounded-[28px] p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[#157A7A]">
            Student Information
          </p>
          <h2 className="mt-3 text-2xl font-bold text-[#0F1729]">
            {student?.name || "Unknown Student"}
          </h2>
          <p className="mt-1 text-sm text-[#65758B]">
            {reviewContext} submission review
          </p>
        </div>
        <ResultStatusBadge status={statusLabel} />
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {infoItems(student, { totalDurationMinutes }).map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.key}
              className="rounded-[22px] border border-[#E5EEF2] bg-[#FBFCFD] px-4 py-4"
            >
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-[#EAFBFB] p-2.5 text-[#157A7A]">
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#8A94A6]">
                    {item.label}
                  </p>
                  <p className="mt-1 break-words text-sm font-semibold text-[#0F1729]">
                    {item.value}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

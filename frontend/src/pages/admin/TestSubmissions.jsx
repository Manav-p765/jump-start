import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ExternalLink,
  RefreshCw,
  Search,
  Trash2,
} from "lucide-react";
import api from "../../api/api";
import AdminPageHeader from "../../components/admin/AdminPageHeader";
import ResultStatusBadge from "../../components/admin/ResultStatusBadge";
import { emitAdminNotificationsRefresh } from "../../utils/adminNotifications";
import { TableSkeleton } from "../../components/admin/Skeletons";

export default function TestSubmissions() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [approvingId, setApprovingId] = useState("");
  const [deletingId, setDeletingId] = useState("");
  const [actionError, setActionError] = useState("");

  useEffect(() => {
    api
      .get("/v1/admin/submissions")
      .then((res) => setRows(res?.data?.data || []))
      .catch((err) =>
        setActionError(err?.response?.data?.msg || t("adminPages.loadSubmissionsFailed"))
      )
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Prompt-9 Fix 1: extend client-side filter to match jumpstartId in
  // addition to name and email. Server returns full list; this local
  // filter narrows it instantly as the admin types.
  const filteredRows = useMemo(
    () =>
      rows.filter((row) => {
        const query = search.trim().toLowerCase();
        const matchesSearch =
          !query ||
          row.name.toLowerCase().includes(query) ||
          row.email.toLowerCase().includes(query) ||
          (row.jumpstartId || "").toLowerCase().includes(query);
        const matchesStatus = statusFilter ? row.status === statusFilter : true;
        const matchesType = typeFilter ? row.type === typeFilter : true;
        return matchesSearch && matchesStatus && matchesType;
      }),
    [rows, search, statusFilter, typeFilter]
  );

  const availableTests = useMemo(
    () => [...new Set(rows.map((row) => row.type).filter(Boolean))].sort(),
    [rows]
  );

  const handleApprove = async (row) => {
    setActionError("");
    setApprovingId(row.id);
    try {
      await api.patch(`/v1/admin/results/${row.id}/approve`);
      setRows((prev) =>
        prev.map((item) =>
          item.id === row.id
            ? { ...item, status: "Published", canApprove: false }
            : item
        )
      );
      emitAdminNotificationsRefresh();
    } catch (err) {
      setActionError(err?.response?.data?.msg || t("adminPages.publishFailed"));
    } finally {
      setApprovingId("");
    }
  };

  const handleDelete = async (row) => {
    const confirmed = window.confirm(
      t("adminPages.deleteSubmissionConfirm")
    );
    if (!confirmed) return;

    setActionError("");
    setDeletingId(row.id);
    try {
      await api.delete(`/v1/admin/results/${row.id}`);
      setRows((prev) => prev.filter((item) => item.id !== row.id));
      emitAdminNotificationsRefresh();
    } catch (err) {
      setActionError(err?.response?.data?.msg || t("adminPages.deleteResultFailed"));
    } finally {
      setDeletingId("");
    }
  };

  return (
    <main className="mx-auto max-w-[1440px] px-6 py-8">
      <AdminPageHeader
        title={t("adminPages.submissionsHeading")}
        subtitle={t("adminPages.submissionsHeaderSubtitle")}
      />

      <section className="surface-card mt-8 rounded-[28px] p-5 md:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8A94A6]" />
            <input
              type="text"
              placeholder={t("adminPages.searchByName")}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="w-full rounded-[16px] border border-[#E1EAF0] bg-[#FBFCFD] py-3 pl-11 pr-4 text-sm text-[#0F1729] outline-none focus:border-[#9BD9D6]"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:w-auto">
            <div className="relative min-w-[180px]">
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="w-full appearance-none rounded-[16px] border border-[#E1EAF0] bg-[#FBFCFD] px-4 py-3 text-sm text-[#4E5D72] outline-none focus:border-[#9BD9D6]"
              >
                <option value="">{t("adminPages.allStatus")}</option>
                <option value="Submitted">{t("adminPages.statusSubmittedLabel")}</option>
                <option value="Pending Approval">{t("adminPages.statusPendingApprovalLabel")}</option>
                <option value="Published">{t("adminPages.statusPublishedLabel")}</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8A94A6]" />
            </div>

            <div className="relative min-w-[160px]">
              <select
                value={typeFilter}
                onChange={(event) => setTypeFilter(event.target.value)}
                className="w-full appearance-none rounded-[16px] border border-[#E1EAF0] bg-[#FBFCFD] px-4 py-3 text-sm text-[#4E5D72] outline-none focus:border-[#9BD9D6]"
              >
                <option value="">{t("adminPages.allTests")}</option>
                {availableTests.map((testName) => (
                  <option key={testName} value={testName}>
                    {testName}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8A94A6]" />
            </div>
          </div>
        </div>

        {actionError ? <p className="mt-4 text-sm text-red-600">{actionError}</p> : null}

        <div className="mt-6 overflow-hidden rounded-[24px] border border-[#E5EEF2]">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left">
              <thead className="bg-[#F7FBFB]">
                <tr>
                  <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-[0.18em] text-[#8A94A6]">
                    {t("adminPages.tableStudent")}
                  </th>
                  <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-[0.18em] text-[#8A94A6]">
                    {t("adminPages.tableTest")}
                  </th>
                  <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-[0.18em] text-[#8A94A6]">
                    {t("adminPages.tableSubmitted")}
                  </th>
                  <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-[0.18em] text-[#8A94A6]">
                    {t("adminPages.tableDuration")}
                  </th>
                  <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-[0.18em] text-[#8A94A6]">
                    {t("adminPages.tableStatus")}
                  </th>
                  <th className="px-6 py-4 text-right text-[11px] font-bold uppercase tracking-[0.18em] text-[#8A94A6]">
                    {t("adminPages.tableActions")}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EEF3F6] bg-white">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="p-0 border-none">
                      <TableSkeleton rows={5} cols={6} />
                    </td>
                  </tr>
                ) : filteredRows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-6 py-12 text-center text-sm text-[#65758B]"
                    >
                      {t("adminPages.noSubmittedTests")}
                    </td>
                  </tr>
                ) : (
                  filteredRows.map((row) => (
                    <tr key={row.id} className="hover:bg-[#FBFCFD]">
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-3">
                          <div className="flex h-11 w-11 items-center justify-center rounded-full border border-[#CFEDED] bg-[#EAFBFB] text-xs font-bold text-[#188B8B]">
                            {row.initials}
                          </div>
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-sm font-bold text-[#0F1729]">{row.name}</p>
                              {row.jumpstartId ? (
                                <span className="inline-flex items-center rounded-full border border-[#D4EEED] bg-[#EAFBFB] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-[#188B8B]">
                                  {row.jumpstartId}
                                </span>
                              ) : null}
                            </div>
                            <p className="text-xs text-[#8A94A6]">{row.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5 text-sm font-medium text-[#4E5D72]">
                        <div className="flex flex-wrap items-center gap-2">
                          <span>{row.type}</span>
                          {row.isDemo ? (
                            <span className="inline-flex items-center rounded-full border border-[#F4DCA8] bg-[#FFF9EE] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-[#B86D00]">
                              {t("adminPages.demoChip")}
                            </span>
                          ) : null}
                        </div>
                      </td>
                      <td className="px-6 py-5 text-sm text-[#4E5D72]">{row.date}</td>
                      <td className="px-6 py-5 text-sm text-[#4E5D72]">{row.duration}</td>
                      <td className="px-6 py-5">
                        <div className="flex flex-wrap items-center gap-2">
                          <ResultStatusBadge status={row.status} />
                          {row.completionStatus ? (
                            <ResultStatusBadge status={row.completionStatus} />
                          ) : null}
                          {Number.isFinite(Number(row.completedSections)) &&
                          Number.isFinite(Number(row.totalSections)) &&
                          Number(row.totalSections) > 0 ? (
                            <span
                              className="inline-flex items-center rounded-full border border-[#D7E4EA] bg-[#F8FBFC] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.06em] text-[#4E5D72]"
                              title="Completed sections out of assigned total"
                            >
                              {t("adminPages.sectionsChip", {
                                completed: row.completedSections,
                                total: row.totalSections,
                              })}
                            </span>
                          ) : null}
                          {row.hasUnreviewedItems ? (
                            <span
                              className="inline-flex items-center gap-1 rounded-full border border-[#F4DCA8] bg-[#FFF1D3] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.06em] text-[#B86D00]"
                              title="One or more Section 4 questions need manual review before approval"
                            >
                              <AlertTriangle className="h-3 w-3" />
                              {t("adminPages.reviewRequiredChip")}
                            </span>
                          ) : null}
                          {row.rescoredAt ? (
                            <span
                              className="inline-flex items-center gap-1 rounded-full border border-[#C9D7F2] bg-[#EEF3FD] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.06em] text-[#2F5BB7]"
                              title={`Scores were recalculated on ${new Date(row.rescoredAt).toLocaleDateString()}`}
                            >
                              <RefreshCw className="h-3 w-3" />
                              {t("adminPages.rescoredChip")}
                            </span>
                          ) : null}
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex flex-wrap justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => navigate(`/admin/testsubmissions/${row.id}`)}
                            className="inline-flex items-center gap-2 rounded-[12px] border border-[#D7E4EA] bg-white px-3 py-2 text-xs font-semibold text-[#0F1729] hover:bg-[#F8FAFC]"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                            {t("adminPages.viewProcess")}
                          </button>

                          {row.canApprove ? (
                            <button
                              type="button"
                              onClick={() => handleApprove(row)}
                              disabled={approvingId === row.id}
                              className="inline-flex items-center gap-2 rounded-[12px] bg-[#188B8B] px-3 py-2 text-xs font-semibold text-white hover:bg-[#147979] disabled:opacity-60"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              {approvingId === row.id
                                ? t("adminPages.publishing")
                                : t("adminPages.approveAndPublish")}
                            </button>
                          ) : null}

                          <button
                            type="button"
                            onClick={() => handleDelete(row)}
                            disabled={deletingId === row.id}
                            className="inline-flex items-center gap-2 rounded-[12px] border border-[#F3C7C7] bg-[#FFF5F5] px-3 py-2 text-xs font-semibold text-[#B42318] hover:bg-[#FEEBEC] disabled:opacity-60"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            {deletingId === row.id ? t("adminPages.deleting") : t("adminPages.delete")}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </main>
  );
}

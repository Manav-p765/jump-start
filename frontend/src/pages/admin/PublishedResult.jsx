import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ChevronDown, Download, ExternalLink, Search } from "lucide-react";
import api from "../../api/api";
import AdminPageHeader from "../../components/admin/AdminPageHeader";
import ResultStatusBadge from "../../components/admin/ResultStatusBadge";
import { TableSkeleton } from "../../components/admin/Skeletons";

export default function PublishedResults() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [testType, setTestType] = useState("");

  useEffect(() => {
    api
      .get("/v1/admin/results")
      .then((res) => setRows(res?.data?.data || []))
      .catch((err) => console.error("Results load failed:", err))
      .finally(() => setLoading(false));
  }, []);

  const filteredResults = useMemo(
    () =>
      rows.filter((row) => {
        const query = search.trim().toLowerCase();
        const matchSearch =
          !query ||
          row.name.toLowerCase().includes(query) ||
          row.email.toLowerCase().includes(query);
        const matchType = testType ? row.type === testType : true;
        return matchSearch && matchType;
      }),
    [rows, search, testType]
  );

  const availableTests = useMemo(
    () => [...new Set(rows.map((row) => row.type).filter(Boolean))].sort(),
    [rows]
  );

  const downloadRow = (row) => {
    const blob = new Blob([JSON.stringify(row.rawResult || {}, null, 2)], {
      type: "application/json;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${row.name.replace(/\s+/g, "_").toLowerCase()}-result.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <main className="mx-auto max-w-[1440px] px-6 py-8">
      <AdminPageHeader
        title={t("publishedResults.heading")}
        subtitle={t("publishedResults.subtitle")}
      />

      <section className="surface-card mt-8 rounded-[28px] p-5 md:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8A94A6]" />
            <input
              type="text"
              placeholder={t("publishedResults.searchPlaceholder")}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="w-full rounded-[16px] border border-[#E1EAF0] bg-[#FBFCFD] py-3 pl-11 pr-4 text-sm text-[#0F1729] outline-none focus:border-[#9BD9D6]"
            />
          </div>

          <div className="relative min-w-[180px]">
            <select
              value={testType}
              onChange={(event) => setTestType(event.target.value)}
              className="w-full appearance-none rounded-[16px] border border-[#E1EAF0] bg-[#FBFCFD] px-4 py-3 text-sm text-[#4E5D72] outline-none focus:border-[#9BD9D6]"
            >
              <option value="">{t("publishedResults.filterAllTests")}</option>
              {availableTests.map((testName) => (
                <option key={testName} value={testName}>
                  {testName}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8A94A6]" />
          </div>
        </div>

        <div className="mt-6 overflow-hidden rounded-[24px] border border-[#E5EEF2]">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left">
              <thead className="bg-[#F7FBFB]">
                <tr>
                  <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-[0.18em] text-[#8A94A6]">
                    {t("publishedResults.tableStudent")}
                  </th>
                  <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-[0.18em] text-[#8A94A6]">
                    {t("publishedResults.tableTest")}
                  </th>
                  <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-[0.18em] text-[#8A94A6]">
                    {t("publishedResults.tablePublished")}
                  </th>
                  <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-[0.18em] text-[#8A94A6]">
                    {t("publishedResults.tableScore")}
                  </th>
                  <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-[0.18em] text-[#8A94A6]">
                    {t("publishedResults.tablePercentile")}
                  </th>
                  <th className="px-6 py-4 text-right text-[11px] font-bold uppercase tracking-[0.18em] text-[#8A94A6]">
                    {t("publishedResults.tableActions")}
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
                ) : filteredResults.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-6 py-12 text-center text-sm text-[#65758B]"
                    >
                      {t("publishedResults.noResults")}
                    </td>
                  </tr>
                ) : (
                  filteredResults.map((row) => (
                    <tr key={row.id} className="hover:bg-[#FBFCFD]">
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-3">
                          <div className="flex h-11 w-11 items-center justify-center rounded-full border border-[#CFEDED] bg-[#EAFBFB] text-xs font-bold text-[#157A7A]">
                            {row.initials}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-[#0F1729]">{row.name}</p>
                            <p className="text-xs text-[#8A94A6]">{row.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5 text-sm font-medium text-[#4E5D72]">
                        {row.type}
                      </td>
                      <td className="px-6 py-5 text-sm text-[#4E5D72]">{row.date}</td>
                      <td className="px-6 py-5 text-sm font-bold text-[#0F1729]">
                        {row.score}
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-3">
                          <ResultStatusBadge status="Published" />
                          <span className="text-sm text-[#4E5D72]">
                            {row.percentile || "-"}
                          </span>
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
                            {t("publishedResults.view")}
                          </button>
                          <button
                            type="button"
                            onClick={() => downloadRow(row)}
                            className="inline-flex items-center gap-2 rounded-[12px] border border-[#D7E4EA] bg-white px-3 py-2 text-xs font-semibold text-[#0F1729] hover:bg-[#F8FAFC]"
                          >
                            <Download className="h-3.5 w-3.5" />
                            {t("publishedResults.download")}
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

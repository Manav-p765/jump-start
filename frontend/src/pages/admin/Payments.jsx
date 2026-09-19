import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Search, ChevronDown, Download, CreditCard, Smartphone } from "lucide-react";
import api from "../../api/api";
import { TableSkeleton } from "../../components/admin/Skeletons";

// Status comes back from the API as an English canonical string. We
// map it to a translation key for display so the badge swaps to
// Gujarati while the backend filter / API contract stays in English.
const STATUS_LABEL_KEYS = {
  Completed: "payments.statusCompleted",
  Pending: "payments.statusPending",
};

const PaymentStatusBadge = ({ status, t }) => {
  const styles = {
    Completed: "bg-emerald-50 text-emerald-600 border-emerald-100",
    Pending: "bg-slate-50 text-slate-400 border-slate-100",
  };
  const labelKey = STATUS_LABEL_KEYS[status];
  return (
    <span className={`px-3 py-1 rounded-full text-[10px] font-bold border uppercase tracking-wide ${styles[status] || styles.Pending}`}>
      {labelKey ? t(labelKey) : status}
    </span>
  );
};

const Payments = () => {
  const { t } = useTranslation();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState({
    totalRevenueLabel: "₹0",
    thisMonthLabel: "₹0",
    pendingAmountLabel: "₹0",
    refundedAmountLabel: "₹0",
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [methodFilter, setMethodFilter] = useState("All");

  useEffect(() => {
    api
      .get("/v1/admin/payments")
      .then((res) => {
        setRows(res?.data?.data?.rows || []);
        setSummary(res?.data?.data?.summary || {});
      })
      .catch((err) => console.error("Payments load failed:", err))
      .finally(() => setLoading(false));
  }, []);

  const filteredPayments = useMemo(
    () =>
      rows.filter((item) => {
        const matchesSearch =
          item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.id.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = statusFilter === "All" || item.status === statusFilter;
        const matchesMethod = methodFilter === "All" || item.method === methodFilter;
        return matchesSearch && matchesStatus && matchesMethod;
      }),
    [rows, searchQuery, statusFilter, methodFilter]
  );

  const exportCsv = () => {
    const headers = ["order_id", "name", "email", "package", "amount", "method", "date", "status"];
    const lines = filteredPayments.map((p) =>
      [p.id, p.name, p.email, p.package, p.amountLabel, p.method, p.dateLabel, p.status]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(",")
    );
    // Leading BOM: Excel assumes the system codepage for a .csv otherwise,
    // which mangles any non-ASCII name. The charset in the MIME type is
    // not enough — Excel reads the bytes, not the Blob type.
    const csv = "\uFEFF" + [headers.join(","), ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "payments-export.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col gap-6 p-6 md:p-8 max-w-[1440px] mx-auto w-full">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">{t("payments.heading")}</h1>
          <p className="text-gray-400 text-sm font-medium">{t("payments.subtitle")}</p>
        </div>
        <button onClick={exportCsv} className="flex items-center gap-2 border border-[#14b8a6] text-[#14b8a6] hover:bg-teal-50 px-5 py-2 rounded-xl font-bold text-sm">
          <Download size={18} /> {t("payments.exportAll")}
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-5 rounded-2xl border border-gray-50"><span className="text-xs text-gray-400 font-bold uppercase">{t("payments.summaryRevenue")}</span><h3 className="text-2xl font-bold mt-1">{summary.totalRevenueLabel}</h3></div>
        <div className="bg-white p-5 rounded-2xl border border-gray-50"><span className="text-xs text-gray-400 font-bold uppercase">{t("payments.summaryThisMonth")}</span><h3 className="text-2xl font-bold mt-1">{summary.thisMonthLabel}</h3></div>
        <div className="bg-white p-5 rounded-2xl border border-gray-50"><span className="text-xs text-gray-400 font-bold uppercase">{t("payments.summaryPending")}</span><h3 className="text-2xl font-bold mt-1">{summary.pendingAmountLabel}</h3></div>
        <div className="bg-white p-5 rounded-2xl border border-gray-50"><span className="text-xs text-gray-400 font-bold uppercase">{t("payments.summaryRefunded")}</span><h3 className="text-2xl font-bold mt-1">{summary.refundedAmountLabel}</h3></div>
      </div>

      <div className="flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder={t("payments.searchPlaceholder")} className="w-full pl-11 pr-4 py-2.5 bg-white border border-gray-100 rounded-xl text-sm" />
        </div>
        <div className="flex gap-4 w-full md:w-auto">
          <div className="relative w-full md:w-40">
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-full appearance-none bg-white border border-gray-100 rounded-xl px-4 py-2.5 text-sm">
              <option value="All">{t("payments.filterStatus")}</option>
              <option value="Completed">{t("payments.statusCompleted")}</option>
              <option value="Pending">{t("payments.statusPending")}</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
          </div>
          <div className="relative w-full md:w-48">
            <select value={methodFilter} onChange={(e) => setMethodFilter(e.target.value)} className="w-full appearance-none bg-white border border-gray-100 rounded-xl px-4 py-2.5 text-sm">
              <option value="All">{t("payments.filterPaymentMethod")}</option>
              <option value="Card">{t("payments.methodCard")}</option>
              <option value="UPI">{t("payments.methodUpi")}</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-gray-50 bg-gray-50/20">
                <th className="px-6 py-5 text-[11px] font-bold text-gray-400 uppercase tracking-widest">{t("payments.tableOrderId")}</th>
                <th className="px-6 py-5 text-[11px] font-bold text-gray-400 uppercase tracking-widest">{t("payments.tableStudent")}</th>
                <th className="px-6 py-5 text-[11px] font-bold text-gray-400 uppercase tracking-widest text-center">{t("payments.tablePackage")}</th>
                <th className="px-6 py-5 text-[11px] font-bold text-gray-400 uppercase tracking-widest text-center">Coupon Used</th>
                <th className="px-6 py-5 text-[11px] font-bold text-gray-400 uppercase tracking-widest text-center">Original Price</th>
                <th className="px-6 py-5 text-[11px] font-bold text-gray-400 uppercase tracking-widest text-center">Discount Applied</th>
                <th className="px-6 py-5 text-[11px] font-bold text-gray-400 uppercase tracking-widest text-center">Final Paid</th>
                <th className="px-6 py-5 text-[11px] font-bold text-gray-400 uppercase tracking-widest text-center">{t("payments.tableMethod")}</th>
                <th className="px-6 py-5 text-[11px] font-bold text-gray-400 uppercase tracking-widest text-center">{t("payments.tableDate")}</th>
                <th className="px-6 py-5 text-[11px] font-bold text-gray-400 uppercase tracking-widest text-center">{t("payments.tableStatus")}</th>
                <th className="px-6 py-5 text-[11px] font-bold text-gray-400 uppercase tracking-widest text-right">{t("payments.tableActions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan={11} className="p-0 border-none"><TableSkeleton rows={5} cols={11} /></td></tr>
              ) : filteredPayments.length > 0 ? (
                filteredPayments.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-5 text-xs font-bold text-gray-500 whitespace-nowrap">{item.id}</td>
                    <td className="px-6 py-5">
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-gray-900 whitespace-nowrap">{item.name}</span>
                        <span className="text-[11px] text-gray-400 font-medium">{item.email}</span>
                      </div>
                    </td>
                    <td className="px-6 py-5 text-center text-sm">{item.package}</td>
                    <td className="px-6 py-5 text-center text-xs">
                      {item.couponCode ? (
                        <span className="inline-flex items-center rounded-full border border-[#9BD9D6] bg-[#F0FBFB] px-2.5 py-0.5 font-mono font-semibold text-[#188B8B]">
                          {item.couponCode}
                        </span>
                      ) : (
                        <span className="text-gray-300">None</span>
                      )}
                    </td>
                    <td className="px-6 py-5 text-center text-sm text-gray-700 whitespace-nowrap">
                      {item.originalAmountLabel || item.amountLabel}
                    </td>
                    <td className="px-6 py-5 text-center text-sm whitespace-nowrap">
                      {item.discountAmount > 0 ? (
                        <span className="font-semibold text-emerald-700">
                          − {item.discountAmountLabel}
                        </span>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                    <td className="px-6 py-5 text-center text-sm font-bold text-gray-900 whitespace-nowrap">{item.amountLabel}</td>
                    <td className="px-6 py-5">
                      <div className="flex items-center justify-center gap-2 text-gray-600">
                        {item.method === "Card" ? <CreditCard size={14} /> : <Smartphone size={14} />}
                        <span className="text-xs font-medium">{item.method}</span>
                      </div>
                    </td>
                    <td className="px-6 py-5 text-center text-[13px] text-gray-400 font-medium whitespace-nowrap">{item.dateLabel}</td>
                    <td className="px-6 py-5 text-center"><PaymentStatusBadge status={item.status} t={t} /></td>
                    <td className="px-6 py-5 text-right">
                      <button onClick={() => navigator.clipboard?.writeText(item.id)} title={t("payments.copyOrderTitle")} className="px-2 py-1 text-xs border rounded-lg hover:bg-gray-50">{t("payments.copyIdButton")}</button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan={11} className="px-6 py-12 text-center text-gray-400 italic">{t("payments.noTransactions")}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Payments;

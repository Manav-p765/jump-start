// Admin Coupons tab.
//
// What this panel does
// --------------------
// 1. Lists every coupon stored in the DB (active and inactive) with the
//    "code / discount / used-vs-max / expiry / status / actions" columns
//    the brief calls for.
// 2. Provides a creation form. The form is deliberately ungated by client
//    JS validation beyond shape — the server is the source of truth and
//    rejects bad payloads with a 400, which we surface inline.
// 3. Activate / deactivate toggles isActive in place. Delete removes the
//    record entirely (the redemption trail on purchaseHistory survives
//    because we snapshot `couponCode` as a plain string, not a foreign
//    key).
//
// Mounted from Settings.jsx as the third tab; no routing changes needed.

import { useEffect, useMemo, useState } from "react";
import { Loader2, RefreshCw, Trash2 } from "lucide-react";
import api from "../../api/api";

const formatDate = (value) => {
  if (!value) return "—";
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return "—";
  return dt.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatUsage = (used, max) => {
  if (max == null) return `${used || 0} / ∞`;
  return `${used || 0} / ${max}`;
};

const formatDiscount = (type, value) => {
  if (type === "percent") return `${value}% off`;
  return `₹${value} off`;
};

const formatStatus = (coupon) => {
  if (!coupon.isActive) return { label: "Inactive", chipClass: "bg-gray-100 text-gray-600" };
  if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) {
    return { label: "Expired", chipClass: "bg-amber-50 text-amber-700" };
  }
  if (coupon.maxUses != null && coupon.usedCount >= coupon.maxUses) {
    return { label: "Used Up", chipClass: "bg-amber-50 text-amber-700" };
  }
  return { label: "Active", chipClass: "bg-emerald-50 text-emerald-700" };
};

// Random alphanumeric code generator for the "Generate" button. Length 8
// keeps codes readable on flyers / WhatsApp while being collision-safe
// enough for hundreds of active codes.
const generateCode = () => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no I/O/0/1 to avoid confusion
  let out = "";
  for (let i = 0; i < 8; i++) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
};

export default function CouponsPanel() {
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reloadTick, setReloadTick] = useState(0);
  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");

  const [form, setForm] = useState({
    code: "",
    discountType: "percent",
    discountValue: "",
    maxUses: "",
    expiresAt: "",
  });
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    setLoading(true);
    api
      .get("/v1/admin/coupons")
      .then((res) => setCoupons(res?.data?.data?.coupons || []))
      .catch((err) =>
        setError(err?.response?.data?.msg || "Failed to load coupons")
      )
      .finally(() => setLoading(false));
  }, [reloadTick]);

  const refresh = () => setReloadTick((n) => n + 1);

  const onField = (key) => (event) =>
    setForm((prev) => ({ ...prev, [key]: event.target.value }));

  const handleCreate = async (event) => {
    event.preventDefault();
    setFormError("");
    setFormSuccess("");
    if (!form.code.trim()) {
      setFormError("Code is required.");
      return;
    }
    if (!form.discountValue) {
      setFormError("Discount value is required.");
      return;
    }
    // Paid packages can't be made free (Razorpay's minimum order is ₹1).
    // The flat-amount case depends on package prices, so the server checks
    // that one and its message lands in formError below.
    if (form.discountType === "percent" && Number(form.discountValue) >= 100) {
      setFormError(
        "This code can't be used for a full discount. Use a percentage below 100."
      );
      return;
    }
    setCreating(true);
    try {
      const payload = {
        code: form.code.trim().toUpperCase(),
        discountType: form.discountType,
        discountValue: Number(form.discountValue),
        maxUses: form.maxUses ? Number(form.maxUses) : null,
        expiresAt: form.expiresAt || null,
      };
      await api.post("/v1/admin/coupons", payload);
      setFormSuccess(`Coupon ${payload.code} created.`);
      setForm({
        code: "",
        discountType: "percent",
        discountValue: "",
        maxUses: "",
        expiresAt: "",
      });
      refresh();
    } catch (err) {
      setFormError(err?.response?.data?.msg || "Failed to create coupon");
    } finally {
      setCreating(false);
    }
  };

  const handleToggle = async (coupon) => {
    setError("");
    try {
      await api.patch(`/v1/admin/coupons/${coupon.id}`, {
        isActive: !coupon.isActive,
      });
      refresh();
    } catch (err) {
      setError(err?.response?.data?.msg || "Failed to update coupon");
    }
  };

  const handleDelete = async (coupon) => {
    if (!window.confirm(`Delete coupon "${coupon.code}"? This cannot be undone.`)) {
      return;
    }
    setError("");
    try {
      await api.delete(`/v1/admin/coupons/${coupon.id}`);
      refresh();
    } catch (err) {
      setError(err?.response?.data?.msg || "Failed to delete coupon");
    }
  };

  const sortedCoupons = useMemo(
    () =>
      [...coupons].sort((a, b) => {
        const ta = new Date(a.createdAt || 0).getTime();
        const tb = new Date(b.createdAt || 0).getTime();
        return tb - ta;
      }),
    [coupons]
  );

  return (
    <div className="flex flex-col gap-6">
      <section className="bg-white rounded-2xl border border-gray-100 p-6">
        <header className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Generate Coupon</h2>
            <p className="text-sm text-gray-500 mt-1">
              Create a new promotional code. Expiry and usage cap are optional —
              leave blank for no limit.
            </p>
          </div>
        </header>
        <form className="grid gap-4 md:grid-cols-2 lg:grid-cols-5" onSubmit={handleCreate}>
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">
              Code
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={form.code}
                onChange={onField("code")}
                placeholder="e.g. WELCOME10"
                className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm uppercase"
              />
              <button
                type="button"
                onClick={() => setForm((p) => ({ ...p, code: generateCode() }))}
                className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
              >
                Generate
              </button>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">
              Discount Type
            </label>
            <select
              value={form.discountType}
              onChange={onField("discountType")}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
            >
              <option value="percent">% off</option>
              <option value="flat">Flat ₹ off</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">
              Value
            </label>
            <input
              type="number"
              min="1"
              value={form.discountValue}
              onChange={onField("discountValue")}
              placeholder={form.discountType === "percent" ? "10" : "200"}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">
              Max Uses (optional)
            </label>
            <input
              type="number"
              min="1"
              value={form.maxUses}
              onChange={onField("maxUses")}
              placeholder="∞"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">
              Expires On (optional)
            </label>
            <input
              type="date"
              value={form.expiresAt}
              onChange={onField("expiresAt")}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
            />
          </div>
          <div className="md:col-span-2 lg:col-span-5 flex items-center justify-between gap-3 pt-2">
            <div className="text-xs">
              {formError ? <span className="text-red-600">{formError}</span> : null}
              {formSuccess ? (
                <span className="text-emerald-700">{formSuccess}</span>
              ) : null}
            </div>
            <button
              type="submit"
              disabled={creating}
              className="inline-flex items-center gap-2 rounded-lg bg-[#188B8B] px-5 py-2 text-sm font-semibold text-white hover:bg-[#147979] disabled:opacity-60"
            >
              {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Create
            </button>
          </div>
        </form>
      </section>

      <section className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <header className="flex items-center justify-between gap-3 px-6 py-4 border-b border-gray-50">
          <div>
            <h2 className="text-xl font-bold text-gray-900">All Coupons</h2>
            <p className="text-sm text-gray-500 mt-1">
              {sortedCoupons.length} {sortedCoupons.length === 1 ? "code" : "codes"} stored
            </p>
          </div>
          <button
            type="button"
            onClick={refresh}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </button>
        </header>
        {error ? (
          <p className="px-6 py-3 text-sm text-red-600">{error}</p>
        ) : null}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-gray-50/50 text-[11px] uppercase tracking-widest text-gray-400">
                <th className="px-6 py-3 font-bold">Code</th>
                <th className="px-6 py-3 font-bold">Discount</th>
                <th className="px-6 py-3 font-bold">Used / Max</th>
                <th className="px-6 py-3 font-bold">Expiry</th>
                <th className="px-6 py-3 font-bold">Status</th>
                <th className="px-6 py-3 font-bold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-gray-400">
                    <Loader2 className="inline h-5 w-5 animate-spin" />
                  </td>
                </tr>
              ) : sortedCoupons.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center italic text-gray-400">
                    No coupons created yet.
                  </td>
                </tr>
              ) : (
                sortedCoupons.map((coupon) => {
                  const status = formatStatus(coupon);
                  return (
                    <tr key={coupon.id} className="hover:bg-gray-50/40">
                      <td className="px-6 py-4 font-mono text-xs font-bold text-gray-900">
                        {coupon.code}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        {formatDiscount(coupon.discountType, coupon.discountValue)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        {formatUsage(coupon.usedCount, coupon.maxUses)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        {formatDate(coupon.expiresAt)}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wide ${status.chipClass}`}
                        >
                          {status.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="inline-flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleToggle(coupon)}
                            className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
                              coupon.isActive
                                ? "border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100"
                                : "border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
                            }`}
                          >
                            {coupon.isActive ? "Deactivate" : "Activate"}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(coupon)}
                            className="rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5 text-red-600 hover:bg-red-100"
                            title="Delete"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

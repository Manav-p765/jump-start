import React, { useContext, useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  CircleCheckBig,
  FileText,
  Mail,
  Receipt,
  ShieldCheck,
  LayoutDashboard,
} from "lucide-react";
import api from "../api/api";
import { AuthContext } from "../context/AuthContext";
import { formatPaise, splitInclusiveGST } from "../utils/money";
import { company } from "../config/company";

const formatDate = (isoString) => {
  const value = new Date(isoString);
  if (Number.isNaN(value.getTime())) return "";
  return value.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

const addDays = (isoString, days) => {
  const value = new Date(isoString);
  value.setDate(value.getDate() + days);
  return value.toISOString();
};

const getFallbackFeatures = (sections = []) => {
  if (!sections.length) {
    return [
      "Assessment access is now unlocked on your account",
      "Your dashboard will track progress section by section",
      "Results will appear after the final submission",
    ];
  }

  return [
    `${sections.length} assessment sections unlocked`,
    `${sections.reduce((sum, section) => sum + Number(section.totalQuestions || 0), 0)} questions available`,
    "Dashboard progress tracking included",
    "Final report available after submission",
  ];
};

export default function PaymentConfirmation() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const paymentState = location.state || {};

  const [loading, setLoading] = useState(!paymentState.plan);
  const [error, setError] = useState("");
  const [plan, setPlan] = useState(paymentState.plan || null);
  const [issuedAt, setIssuedAt] = useState(
    paymentState.paidAt || new Date().toISOString()
  );
  const [fallbackSections, setFallbackSections] = useState([]);

  useEffect(() => {
    if (paymentState.plan?.id) return;

    let cancelled = false;

    Promise.all([api.get("/v1/user/package/current"), api.get("/v1/public/config")])
      .then(([pkgRes, configRes]) => {
        if (cancelled) return;

        const currentPackage = pkgRes?.data?.data?.package;
        const sections = pkgRes?.data?.data?.sections || [];
        const publicPackages = configRes?.data?.data?.packages || [];
        const fullPackage =
          publicPackages.find((pkg) => pkg.id === currentPackage?.id) ||
          currentPackage;

        if (!fullPackage?.id) {
          navigate("/dashboard", { replace: true });
          return;
        }

        setPlan(fullPackage);
        setFallbackSections(sections);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(
          err?.response?.data?.msg ||
            "Unable to load your payment confirmation right now."
        );
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [navigate, paymentState.plan]);

  // Prices are GST-INCLUSIVE: the total is the amount actually paid, and the
  // GST is back-calculated as already-included (base + GST = total). Nothing
  // is added on top.
  //
  // TWO SOURCES, in priority order:
  //
  //   1. `paymentState.money` — the paise block from /verify, read straight
  //      off the Payment ledger row. Authoritative, and the same numbers the
  //      invoice prints, so screen and invoice agree to the paisa. Used
  //      VERBATIM: re-deriving here is exactly what caused the drift.
  //
  //   2. Rupee fallback — free activations (no gateway order, so no ledger
  //      split), a failed /verify, and direct navigation with no state.
  //      Rupee figures converted to paise once, then split with the same
  //      shared splitInclusiveGST the payment page uses.
  //
  // Both sources end up as integer paise and go through the one shared
  // formatPaise, so the two paths print identical bytes for an amount.
  const money = paymentState.money || null;
  const isPaise = Boolean(money);
  const fmt = formatPaise;
  const toPaise = (rupees) => Math.round(Number(rupees || 0) * 100);

  const fallbackTotal = paymentState.total ?? plan?.amount ?? 0;
  const fallbackSplit = splitInclusiveGST(toPaise(fallbackTotal));
  const total = isPaise ? money.amount : fallbackSplit.total;
  const subtotal = isPaise ? money.base : fallbackSplit.base;
  const gstAmount = isPaise ? money.gst : fallbackSplit.gst;

  // List price and coupon, for the "how we got to this price" group. Both
  // are informational — the split above is already net of the discount.
  const discount = isPaise
    ? money.discountAmount || 0
    : toPaise(paymentState.discount);
  const couponCode = (isPaise ? money.couponCode : paymentState.couponCode) || null;
  const listPrice = isPaise
    ? money.originalAmount || money.amount
    : toPaise(paymentState.plan?.amount ?? plan?.amount ?? fallbackTotal);
  const validityEnd = useMemo(() => addDays(issuedAt, 15), [issuedAt]);
  const features = plan?.features?.length
    ? plan.features.slice(0, 4)
    : getFallbackFeatures(fallbackSections);

  const handleDownloadInvoice = () => {
    const lines = [
      `${company.brandName} Payment Confirmation`,
      `Date: ${formatDate(issuedAt)}`,
      `Customer: ${user?.name || "User"}`,
      `Email: ${user?.email || "Not available"}`,
      `Package: ${plan?.title || "Selected Package"}`,
      // Same figures and same formatter as the rows on screen, so the
      // downloaded text and the confirmation card cannot disagree.
      `List price: ${fmt(listPrice)}`,
      ...(discount
        ? [`Discount${couponCode ? ` (${couponCode})` : ""}: -${fmt(discount)}`]
        : []),
      `Taxable value: ${fmt(subtotal)}`,
      `GST (18%, included): ${fmt(gstAmount)}`,
      `Total (incl. GST): ${fmt(total)}`,
      `Valid Until: ${formatDate(validityEnd)}`,
    ];

    const blob = new Blob([lines.join("\n")], {
      type: "text/plain;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `jumpstride-invoice-${plan?.id || "package"}.txt`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center px-4">
        <p className="text-[#65758B]">Loading payment confirmation...</p>
      </div>
    );
  }

  if (!plan?.id) {
    return (
      <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center px-4">
        <div className="w-full max-w-xl rounded-2xl border border-[#E1E7EF] bg-white p-8 text-center">
          <h1 className="text-2xl font-bold text-[#0F1729]">
            Payment Confirmation Unavailable
          </h1>
          <p className="mt-3 text-[#65758B]">
            {error || "We could not find a recent payment for this session."}
          </p>
          <Link
            to="/dashboard"
            className="mt-6 inline-flex rounded-xl bg-[#188B8B] px-6 py-3 font-semibold text-white transition hover:bg-teal-700"
          >
            Go to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFAFA] px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <div className="mb-10">
          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-1 text-sm font-semibold text-emerald-700">
            <CircleCheckBig className="h-4 w-4" />
            Payment confirmation
          </div>
          <h1 className="mt-5 text-3xl font-bold text-[#0F1729] sm:text-4xl">
            Your Payment is Successful!
          </h1>
          <p className="mt-2 max-w-2xl text-base text-[#65758B]">
            Your package has been unlocked successfully. You can start the
            assessment now or head to the dashboard and continue from there.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="space-y-4">
            <div className="rounded-2xl border border-[#E1E7EF] bg-white p-6 shadow-sm">
              <div className="flex items-start gap-4">
                <div className="rounded-2xl bg-teal-50 p-3 text-[#188B8B]">
                  <Mail className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-2xl font-semibold text-[#0F1729]">
                    Account Confirmation Notice
                  </h2>
                  <p className="mt-2 text-sm text-[#65758B]">
                    This purchase is now linked to{" "}
                    <span className="font-semibold text-[#0F1729]">
                      {user?.email || "your account"}
                    </span>
                    . You can access the package directly from your dashboard.
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-[#E1E7EF] bg-white p-6 shadow-sm">
              <div className="flex items-start gap-4">
                <div className="rounded-2xl bg-amber-50 p-3 text-[#F59F0A]">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div className="w-full">
                  <h2 className="text-2xl font-semibold text-[#0F1729]">
                    Test Validity
                  </h2>
                  <ul className="mt-3 space-y-2 text-sm text-[#65758B]">
                    <li>Issued on {formatDate(issuedAt)}.</li>
                    <li>Assessment access remains active until {formatDate(validityEnd)}.</li>
                    <li>Progress is saved section by section while you attempt the test.</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-[#E1E7EF] bg-white p-6 shadow-sm">
              <div className="flex items-start gap-4">
                <div className="rounded-2xl bg-slate-100 p-3 text-[#0F1729]">
                  <FileText className="h-5 w-5" />
                </div>
                <div className="w-full">
                  <h2 className="text-2xl font-semibold text-[#0F1729]">
                    Package Access
                  </h2>
                  <ul className="mt-3 grid gap-2 text-sm text-[#65758B] sm:grid-cols-2">
                    {features.map((feature) => (
                      <li
                        key={feature}
                        className="rounded-xl bg-[#F8FAFA] px-4 py-3"
                      >
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => navigate("/dashboard")}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#188B8B] px-6 py-3 font-semibold text-white transition hover:bg-teal-700"
              >
                <LayoutDashboard className="h-4 w-4" />
                Go to Dashboard
              </button>
              <button
                type="button"
                onClick={() => navigate("/pretest")}
                className="inline-flex items-center justify-center rounded-xl border-2 border-[#188B8B] px-6 py-3 font-semibold text-[#188B8B] transition hover:bg-teal-50"
              >
                Start Test Now
              </button>
            </div>
          </div>

          <aside className="rounded-2xl border border-[#E1E7EF] bg-white p-6 shadow-sm h-fit">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-emerald-50 p-3 text-emerald-600">
                <Receipt className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-2xl font-semibold text-[#0F1729]">
                  Order Summary
                </h2>
                <p className="text-sm text-[#65758B]">
                  Completed on {formatDate(issuedAt)}
                </p>
              </div>
            </div>

            {/* Same two reconciling groups as the payment page:
                  list − discount = total, and base + GST = total. */}
            <div className="mt-6 space-y-3 text-sm">
              <div className="flex items-center justify-between gap-4">
                <span className="text-[#65758B]">{plan.title}</span>
                <span className="font-semibold text-[#0F1729]">
                  {fmt(listPrice)}
                </span>
              </div>
              {discount ? (
                <div className="flex items-center justify-between gap-4 text-emerald-700">
                  <span className="font-medium">
                    {couponCode ? `Coupon (${couponCode})` : "Discount"}
                  </span>
                  <span className="font-semibold">
                    − {fmt(discount)}
                  </span>
                </div>
              ) : null}
              <div className="flex items-center justify-between gap-4 pt-3 border-t border-[#EEF2F5]">
                <span className="text-[#65758B]">Taxable value</span>
                <span className="text-[#65758B]">{fmt(subtotal)}</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-[#65758B]">GST (18%, included)</span>
                <span className="text-[#65758B]">{fmt(gstAmount)}</span>
              </div>
            </div>

            <div className="my-5 border-t border-[#E1E7EF]" />

            <div className="flex items-center justify-between gap-4">
              <span className="font-semibold text-[#0F1729]">Total Amount</span>
              <span className="text-3xl font-bold text-[#0F1729]">
                {fmt(total)}
              </span>
            </div>
            <p className="mt-1 text-[11px] text-[#65758B]">
              Inclusive of all taxes (GST included)
            </p>

            <button
              type="button"
              onClick={handleDownloadInvoice}
              className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#F59F0A] px-5 py-3 font-semibold text-[#0F1729] transition hover:bg-[#E89206]"
            >
              <Receipt className="h-4 w-4" />
              Download Invoice
            </button>
          </aside>
        </div>
      </div>
    </div>
  );
}

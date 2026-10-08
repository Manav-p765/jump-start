import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Download, ReceiptText } from "lucide-react";
import api from "../../api/api";
import downloadReceipt from "../../utils/downloadReceipt";
import { formatPaise } from "../../utils/money";

// Mirrors backend/utils/receiptPdf.js formatPaymentMethod, so the card and
// the PDF name the method the same way.
const METHOD_LABELS = {
  upi: "UPI",
  card: "Card",
  netbanking: "Net banking",
  wallet: "Wallet",
  emi: "EMI",
  cardless_emi: "Cardless EMI",
  paylater: "Pay later",
  bank_transfer: "Bank transfer",
  app: "App",
};

const formatMethod = (method) => {
  if (!method) return "Online";
  const key = String(method).toLowerCase();
  return METHOD_LABELS[key] || key.charAt(0).toUpperCase() + key.slice(1);
};

const formatDate = (value) => {
  const d = value ? new Date(value) : null;
  if (!d || Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

// refundStatus from GET /v1/user/payments: "processed", "pending" or null.
// A failed refund arrives as null, so the student simply sees "Paid".
const STATUS = {
  processed: {
    key: "myPayments.statusRefunded",
    className: "border-[#F5C2C7] bg-[#FFF1F2] text-[#B42318]",
  },
  pending: {
    key: "myPayments.statusRefundProcessing",
    className: "border-[#F5D9A6] bg-[#FFF9EE] text-[#8C5A00]",
  },
  paid: {
    key: "myPayments.statusPaid",
    className: "border-[#BFE8E5] bg-[#E2F8F7] text-[#157A7A]",
  },
};

export default function MyPayments() {
  const { t } = useTranslation();
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [downloadingId, setDownloadingId] = useState(null);
  const [downloadError, setDownloadError] = useState("");

  useEffect(() => {
    api
      .get("/v1/user/payments")
      .then((res) => setPayments(Array.isArray(res?.data?.data) ? res.data.data : []))
      .catch(() => setError(t("myPayments.loadFailed")))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDownload = async (id) => {
    if (downloadingId) return;
    setDownloadError("");
    setDownloadingId(id);
    try {
      await downloadReceipt(`/v1/user/payment/${id}/receipt`);
    } catch (err) {
      setDownloadError(err.message);
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div className="mt-12">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#EAFBFB] text-[#188B8B]">
          <ReceiptText className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <h2 className="text-3xl font-bold text-[#0F1729]">{t("myPayments.title")}</h2>
          <p className="mt-1 text-sm leading-6 text-[#65758B]">{t("myPayments.subtitle")}</p>
        </div>
      </div>

      {downloadError ? (
        <p className="mt-4 text-sm text-red-600" role="alert">
          {downloadError}
        </p>
      ) : null}

      <div className="mt-6">
        {loading ? (
          <div className="grid gap-5 md:grid-cols-2">
            {[0, 1].map((i) => (
              <div key={i} className="h-[188px] animate-pulse rounded-2xl border border-[#E1E7EF] bg-[#F8FAFC]" />
            ))}
          </div>
        ) : error ? (
          <p className="rounded-2xl border border-[#E1E7EF] bg-[#F8FAFC] px-4 py-5 text-sm text-[#65758B]">
            {error}
          </p>
        ) : payments.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#D6E4EA] bg-[#FBFCFD] px-5 py-8 text-center">
            <p className="text-lg font-semibold text-[#0F1729]">{t("myPayments.empty")}</p>
            <p className="mt-1 text-sm text-[#65758B]">{t("myPayments.emptyHelper")}</p>
          </div>
        ) : (
          <ul className="grid gap-5 md:grid-cols-2">
            {payments.map((p) => {
              const status = STATUS[p.refundStatus] || STATUS.paid;
              return (
                <li
                  key={p._id}
                  className="flex min-w-0 flex-col rounded-2xl border border-[#E1E7EF] bg-white p-5 shadow-sm"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <p className="min-w-0 flex-1 break-words text-base font-semibold leading-6 text-[#0F1729]">
                      {p.packageTitle}
                    </p>
                    <span
                      className={`shrink-0 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-semibold ${status.className}`}
                    >
                      {t(status.key)}
                    </span>
                  </div>

                  <p className="mt-2 text-2xl font-bold text-[#0F1729]">{formatPaise(p.amount)}</p>
                  {p.refundStatus === "processed" ? (
                    <p className="mt-1 text-xs font-medium text-[#B42318]">
                      {/* Partial refund: say how much. Full refund: the
                          badge already says Refunded; just the date. */}
                      {p.refundAmount > 0 && p.refundAmount < p.amount
                        ? t("myPayments.partialRefundOn", {
                            amount: formatPaise(p.refundAmount),
                            date: formatDate(p.refundedAt),
                          })
                        : t("myPayments.refundedOn", { date: formatDate(p.refundedAt) })}
                    </p>
                  ) : null}

                  <dl className="mt-4 grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-1.5 text-sm">
                    <dt className="text-[#65758B]">{t("profileExtra.purchaseDate")}</dt>
                    <dd className="text-right text-[#0F1729]">{formatDate(p.paidAt)}</dd>
                    <dt className="text-[#65758B]">{t("myPayments.method")}</dt>
                    <dd className="text-right text-[#0F1729]">{formatMethod(p.paymentMethod)}</dd>
                    <dt className="text-[#65758B]">{t("myPayments.receiptNo")}</dt>
                    <dd className="break-all text-right font-medium text-[#0F1729]">
                      {p.receiptNumber || t("myPayments.receiptPending")}
                    </dd>
                  </dl>

                  <button
                    type="button"
                    onClick={() => handleDownload(p._id)}
                    disabled={Boolean(downloadingId)}
                    className="mt-5 inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border-2 border-[#188B8B] px-4 text-sm font-semibold text-[#188B8B] hover:bg-[#F6FDFC] disabled:cursor-wait disabled:opacity-60 sm:w-auto sm:self-start"
                  >
                    <Download className="h-4 w-4" />
                    {downloadingId === p._id
                      ? t("myPayments.downloading")
                      : t("myPayments.downloadReceipt")}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

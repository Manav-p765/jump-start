// PDF payment receipt — one A4 page, rendered with pdfkit.
//
// Input is a Payment ledger row (lean object). Every figure printed comes
// off that row as stored; nothing here re-prices or re-taxes:
//   - amount / base / gst are PAISE, printed as-is.
//   - originalAmount / discountAmount are stored in RUPEES on the ledger
//     (see createOrder), so they are converted to paise for display — a unit
//     conversion, the same one verifyPayment applies, not a recalculation.
//   - Rows created before base/gst were stored get the split from the same
//     shared splitInclusiveGST that priced the order (as verifyPayment does),
//     so the receipt matches what the student was shown.
//
// Fonts: Noto Sans (SIL OFL, assets/fonts/OFL.txt). The pdfkit built-in
// Helvetica has no ₹ glyph; Noto Sans does, and pdfkit embeds only the
// glyphs used, so the PDF stays small.
//
// Logo: assets/jumpstride-logo.png, the full Jumpstride logo (icon + wordmark),
// trimmed tight to its content so it sits flush with the top-left margin.
import path from "path";
import { fileURLToPath } from "url";
import PDFDocument from "pdfkit";

import { company } from "../config/company.js";
import { GST_RATE, splitInclusiveGST } from "./money.js";

const ASSETS_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../assets"
);
const FONT_REGULAR = path.join(ASSETS_DIR, "fonts/NotoSans-Regular.ttf");
const FONT_BOLD = path.join(ASSETS_DIR, "fonts/NotoSans-Bold.ttf");
const LOGO_PATH = path.join(ASSETS_DIR, "jumpstride-logo.png");
const LOGO_W = 150;

// Palette — the site's own tokens (PaymentConfirmation.jsx).
const C = {
  ink: "#0F1729",
  muted: "#65758B",
  border: "#E1E7EF",
  brand: "#188B8B",
  tint: "#F0F9F9",
  discount: "#047857",
};

// A4 in points.
const PAGE_W = 595.28;
const PAGE_H = 841.89;
const MARGIN = 48;
const X0 = MARGIN;
const X1 = PAGE_W - MARGIN;
const CONTENT_W = X1 - X0;

// --- formatting ----------------------------------------------------------

// Identical output to frontend/src/utils/money.js formatPaise.
const formatPaise = (paise) =>
  `₹ ${(Number(paise || 0) / 100).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const rupeesToPaise = (rupees) => Math.round(Number(rupees || 0) * 100);

// "02 Oct 2026, 06:41 PM" in IST.
export const formatIstDateTime = (value) => {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-IN", {
      timeZone: "Asia/Kolkata",
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    })
      .formatToParts(date)
      .map((p) => [p.type, p.value])
  );
  const dayPeriod = String(parts.dayPeriod || "").toUpperCase();
  return `${parts.day} ${parts.month} ${parts.year}, ${parts.hour}:${parts.minute} ${dayPeriod}`;
};

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

export const formatPaymentMethod = (method) => {
  if (!method) return "Online (Razorpay)";
  const key = String(method).toLowerCase();
  return METHOD_LABELS[key] || key.charAt(0).toUpperCase() + key.slice(1);
};

const companyAddressLines = () => [
  company.address.line1,
  `${company.address.city} - ${company.address.postalCode}`,
  `${company.address.state}, ${company.address.country}`,
];

// --- the figures, straight off the row ------------------------------------

export const receiptFigures = (payment) => {
  const total = Math.round(Number(payment.amount || 0));
  const hasStoredSplit =
    Number.isFinite(payment.base) && Number.isFinite(payment.gst);
  const split = hasStoredSplit
    ? { base: payment.base, gst: payment.gst }
    : splitInclusiveGST(total);
  const gstRate = payment.gstRate ?? GST_RATE;

  const discount = rupeesToPaise(payment.discountAmount);
  const listPrice =
    payment.originalAmount != null ? rupeesToPaise(payment.originalAmount) : total;

  return {
    total,
    base: split.base,
    gst: split.gst,
    gstRate,
    discount: discount > 0 ? discount : 0,
    listPrice,
  };
};

// --- drawing helpers ----------------------------------------------------

const label = (doc, text, x, y, options = {}) =>
  doc
    .font("Bold")
    .fontSize(8)
    .fillColor(C.muted)
    .text(text.toUpperCase(), x, y, { characterSpacing: 0.6, ...options });

// A block of lines; returns the y below it.
const lines = (doc, items, x, y, width) => {
  let cursor = y;
  items.forEach(({ text, bold = false, size = 10, color = C.ink }) => {
    doc.font(bold ? "Bold" : "Regular").fontSize(size).fillColor(color);
    doc.text(text, x, cursor, { width, lineGap: 1 });
    cursor = doc.y + 1;
  });
  return cursor;
};

const rule = (doc, y, color = C.border, width = 0.75) =>
  doc.moveTo(X0, y).lineTo(X1, y).lineWidth(width).strokeColor(color).stroke();

// One amount row: label left, amount right.
const amountRow = (doc, y, text, amount, { bold = false, size = 10, color = C.ink } = {}) => {
  const font = bold ? "Bold" : "Regular";
  doc.font(font).fontSize(size).fillColor(color);
  doc.text(text, X0 + 12, y, { width: CONTENT_W - 180, lineBreak: false });
  doc.text(amount, X1 - 168, y, { width: 156, align: "right", lineBreak: false });
  return y + size + 12;
};

// --- render ---------------------------------------------------------------

/**
 * Render a receipt for a PAID Payment row.
 *
 * @param {object} payment  lean Payment document
 * @param {object} [options]
 * @param {{name?: string, email?: string}} [options.fallbackCustomer]
 *        used for "Billed to" when the row predates the billing snapshot
 * @returns {Promise<Buffer>}
 */
export const renderReceiptPdf = (payment, { fallbackCustomer = {} } = {}) =>
  new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      // Bottom margin is small so the footer, drawn at a fixed y near the
      // foot of the page, never triggers pdfkit's automatic page break.
      margins: { top: MARGIN, bottom: 24, left: MARGIN, right: MARGIN },
      info: {
        Title: `Payment Receipt ${payment.receiptNumber || ""}`.trim(),
        Author: company.legalName,
        Subject: `${company.brandName} payment receipt`,
      },
    });

    const chunks = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    try {
      doc.registerFont("Regular", FONT_REGULAR);
      doc.registerFont("Bold", FONT_BOLD);

      const fig = receiptFigures(payment);

      // ---- Header -------------------------------------------------------
      const headerTop = MARGIN;
      const logo = doc.openImage(LOGO_PATH);
      const logoH = (LOGO_W * logo.height) / logo.width;
      doc.image(logo, X0, headerTop, { width: LOGO_W, height: logoH });

      // "Payment Receipt" + "PAID" (~36pt tall) centred on the logo.
      const titleTop = headerTop + logoH / 2 - 18;
      doc
        .font("Bold")
        .fontSize(18)
        .fillColor(C.brand)
        .text("Payment Receipt", X1 - 220, titleTop, {
          width: 220,
          align: "right",
          lineBreak: false,
        });
      doc
        .font("Bold")
        .fontSize(9)
        .fillColor(C.discount)
        .text("PAID", X1 - 220, titleTop + 26, {
          width: 220,
          align: "right",
          characterSpacing: 1,
          lineBreak: false,
        });

      let y = headerTop + logoH + 14;
      rule(doc, y, C.brand, 1.5);

      // ---- Receipt no. / date paid ----------------------------------------
      y += 16;
      const metaColW = CONTENT_W / 2;
      label(doc, "Receipt No.", X0, y);
      label(doc, "Date paid", X0 + metaColW, y);
      doc
        .font("Bold")
        .fontSize(12)
        .fillColor(C.ink)
        .text(payment.receiptNumber || "—", X0, y + 13, { lineBreak: false });
      doc.text(formatIstDateTime(payment.paidAt), X0 + metaColW, y + 13, {
        lineBreak: false,
      });

      y += 44;
      rule(doc, y);

      // ---- From / Billed to -----------------------------------------------
      y += 16;
      const colW = CONTENT_W / 2 - 12;
      const rightX = X0 + CONTENT_W / 2 + 12;

      label(doc, "From", X0, y);
      label(doc, "Billed to", rightX, y);
      const blockTop = y + 14;

      const fromLines = [
        { text: company.legalName, bold: true },
        ...companyAddressLines().map((text) => ({ text, color: C.muted })),
        { text: company.email, color: C.muted },
        { text: company.phoneDisplay, color: C.muted },
        ...(company.gstin ? [{ text: `GSTIN: ${company.gstin}`, color: C.muted }] : []),
      ];

      const b = payment.billing || {};
      const cityLine = [b.city, b.state].filter(Boolean).join(", ");
      const billedLines = [
        { text: b.fullName || fallbackCustomer.name || "—", bold: true },
        ...(b.email || fallbackCustomer.email
          ? [{ text: b.email || fallbackCustomer.email, color: C.muted }]
          : []),
        ...(b.phone ? [{ text: b.phone, color: C.muted }] : []),
        ...(b.address ? [{ text: b.address, color: C.muted }] : []),
        ...(cityLine || b.pincode
          ? [
              {
                text: [cityLine, b.pincode].filter(Boolean).join(" - "),
                color: C.muted,
              },
            ]
          : []),
        ...(b.gstNumber ? [{ text: `GSTIN: ${b.gstNumber}`, color: C.muted }] : []),
      ];

      const fromBottom = lines(doc, fromLines, X0, blockTop, colW);
      const billedBottom = lines(doc, billedLines, rightX, blockTop, colW);
      y = Math.max(fromBottom, billedBottom) + 14;
      rule(doc, y);

      // ---- Amounts --------------------------------------------------------
      y += 18;
      doc.rect(X0, y, CONTENT_W, 24).fill(C.tint);
      label(doc, "Description", X0 + 12, y + 8);
      label(doc, "Amount", X1 - 168, y + 8, { width: 156, align: "right" });
      y += 36;

      y = amountRow(
        doc,
        y,
        payment.packageTitle || payment.packageId || "Assessment package",
        formatPaise(fig.listPrice),
        { bold: true }
      );
      if (fig.discount > 0) {
        y = amountRow(
          doc,
          y,
          payment.couponCode ? `Discount (coupon ${payment.couponCode})` : "Discount",
          `− ${formatPaise(fig.discount)}`,
          { color: C.discount }
        );
      }

      y += 2;
      rule(doc, y);
      y += 12;

      if (company.showGstBreakdown) {
        y = amountRow(doc, y, "Taxable value", formatPaise(fig.base), {
          color: C.muted,
        });
        y = amountRow(
          doc,
          y,
          `GST ${Math.round(fig.gstRate * 100)}% (included)`,
          formatPaise(fig.gst),
          { color: C.muted }
        );
        y += 2;
      }

      // Total band.
      doc.rect(X0, y, CONTENT_W, 36).fill(C.tint);
      doc
        .font("Bold")
        .fontSize(12)
        .fillColor(C.ink)
        .text("Total paid", X0 + 12, y + 11, { lineBreak: false });
      doc
        .font("Bold")
        .fontSize(15)
        .fillColor(C.ink)
        .text(formatPaise(fig.total), X1 - 220, y + 8, {
          width: 208,
          align: "right",
          lineBreak: false,
        });
      y += 44;
      doc
        .font("Regular")
        .fontSize(8.5)
        .fillColor(C.muted)
        .text("Inclusive of all taxes (GST included).", X0 + 12, y, {
          lineBreak: false,
        });

      // ---- Payment details --------------------------------------------------
      y += 30;
      label(doc, "Payment details", X0, y);
      y += 16;
      const detailRow = (name, value) => {
        doc
          .font("Regular")
          .fontSize(10)
          .fillColor(C.muted)
          .text(name, X0, y, { width: 160, lineBreak: false });
        doc
          .font("Regular")
          .fontSize(10)
          .fillColor(C.ink)
          .text(value || "—", X0 + 160, y, {
            width: CONTENT_W - 160,
            lineBreak: false,
          });
        y += 18;
      };
      detailRow("Payment method", formatPaymentMethod(payment.paymentMethod));
      detailRow("Razorpay payment ID", payment.razorpayPaymentId);
      detailRow("Razorpay order ID", payment.razorpayOrderId);

      // ---- Footer -------------------------------------------------------
      const footerY = PAGE_H - 78;
      rule(doc, footerY);
      doc
        .font("Regular")
        .fontSize(9)
        .fillColor(C.muted)
        .text(
          "This is a computer-generated receipt and does not require a signature.",
          X0,
          footerY + 12,
          { width: CONTENT_W, align: "center", lineBreak: false }
        );
      doc
        .fontSize(8.5)
        .text(
          `${company.brandName} · ${company.email} · ${company.phoneDisplay}`,
          X0,
          footerY + 28,
          { width: CONTENT_W, align: "center", lineBreak: false }
        );

      doc.end();
    } catch (err) {
      reject(err);
    }
  });

export default renderReceiptPdf;

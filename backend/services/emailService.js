// Transactional email via Resend (https://resend.com).
//
// Every email goes out through ONE branded template stored in Resend —
// alias "jumpstride-base" — which carries the Jumpstride logo, name and
// company footer. Callers only supply the words: a heading, a message body,
// and an optional button. Edit the look in the Resend dashboard, not here.
//
// Template variables (all strings):
//   SUBJECT, USER_NAME, HEADING, MESSAGE, MESSAGE_TEXT, CTA_TEXT, CTA_URL
// MESSAGE_TEXT feeds the template's plain-text part; it is derived here
// from message / messageHtml, so callers never pass it.
// The template inserts them unescaped ({{{VAR}}}), so plain-text values are
// HTML-escaped here. MESSAGE alone may carry trusted HTML (<p>, <strong>…)
// via messageHtml — never put user input in it unescaped.
//
// Like Razorpay, Resend is optional: with RESEND_API_KEY unset the app
// boots and sendEmail() logs and returns { skipped: true } instead of
// throwing, so signup and payments never fail because mail is down.
import { company } from "../config/company.js";

const RESEND_API_URL = "https://api.resend.com/emails";

// resend.dev is Resend's shared test sender: it can only deliver to the
// Resend account owner's own address. Set EMAIL_FROM to an address on a
// domain verified in Resend before sending to real users.
const DEFAULT_FROM = `${company.brandName} <onboarding@resend.dev>`;
const DEFAULT_TEMPLATE = "jumpstride-base";

export const isEmailConfigured = () =>
  Boolean(String(process.env.RESEND_API_KEY || "").trim());

export const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

// Good enough for our own trusted messageHtml: block ends -> newlines,
// tags dropped, the few entities escapeHtml produces decoded.
const htmlToText = (html) =>
  String(html)
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>\s*/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .trim();

const frontendUrl = () =>
  String(process.env.FRONTEND_URL || "https://jumpstride.in").replace(/\/+$/, "");

/**
 * Send one branded email.
 *
 * @param {object}   opts
 * @param {string|string[]} opts.to
 * @param {string}   opts.subject
 * @param {string}   [opts.name]         recipient's name for "Hi <name>,"
 * @param {string}   opts.heading
 * @param {string}   [opts.message]      plain text; escaped, newlines -> <br>
 * @param {string}   [opts.messageHtml]  trusted HTML; wins over message
 * @param {string}   [opts.ctaText]
 * @param {string}   [opts.ctaUrl]       absolute, or a path on FRONTEND_URL
 * @param {string}   [opts.idempotencyKey] same key on retry = no duplicate send
 * @returns {Promise<{ id?: string, skipped?: boolean }>}
 */
export const sendEmail = async ({
  to,
  subject,
  name,
  heading,
  message,
  messageHtml,
  ctaText,
  ctaUrl,
  idempotencyKey,
}) => {
  if (!isEmailConfigured()) {
    console.warn(`[email] RESEND_API_KEY not set — skipped "${subject}"`);
    return { skipped: true };
  }

  const url = ctaUrl
    ? /^https?:\/\//i.test(ctaUrl)
      ? ctaUrl
      : `${frontendUrl()}/${ctaUrl.replace(/^\/+/, "")}`
    : frontendUrl();

  const body = {
    from: process.env.EMAIL_FROM || DEFAULT_FROM,
    to: Array.isArray(to) ? to : [to],
    subject,
    template: {
      id: process.env.RESEND_TEMPLATE_ID || DEFAULT_TEMPLATE,
      variables: {
        SUBJECT: escapeHtml(subject),
        USER_NAME: escapeHtml(name || "there"),
        HEADING: escapeHtml(heading),
        MESSAGE:
          messageHtml ?? escapeHtml(message || "").replace(/\r?\n/g, "<br>"),
        MESSAGE_TEXT:
          messageHtml != null ? htmlToText(messageHtml) : message || "",
        CTA_TEXT: escapeHtml(ctaText || `Visit ${company.brandName}`),
        CTA_URL: escapeHtml(url),
      },
    },
  };
  if (process.env.EMAIL_REPLY_TO) body.reply_to = process.env.EMAIL_REPLY_TO;

  const headers = {
    Authorization: `Bearer ${process.env.RESEND_API_KEY.trim()}`,
    "Content-Type": "application/json",
  };
  if (idempotencyKey) headers["Idempotency-Key"] = idempotencyKey;

  const res = await fetch(RESEND_API_URL, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      `[email] Resend ${res.status}: ${data?.message || res.statusText}`
    );
  }
  return { id: data.id };
};

/**
 * Fire-and-forget wrapper for request handlers: never throws, never
 * delays the response. Failures are logged only.
 */
export const sendEmailInBackground = (opts) => {
  sendEmail(opts).catch((err) => console.error(err.message || err));
};

// ---------------------------------------------------------------------------
// Ready-made messages
// ---------------------------------------------------------------------------

export const sendWelcomeEmail = (user) =>
  sendEmailInBackground({
    to: user.email,
    subject: `Welcome to ${company.brandName}!`,
    name: user.name,
    heading: `Welcome to ${company.brandName}`,
    messageHtml:
      `<p style="margin:0 0 12px 0;">Your account is ready.` +
      (user.jumpstartId
        ? ` Your ${company.brandName} ID is <strong>${escapeHtml(user.jumpstartId)}</strong>.`
        : "") +
      `</p><p style="margin:0;">Take your career aptitude assessment to discover the paths that suit you best.</p>`,
    ctaText: "Go to my dashboard",
    ctaUrl: "/dashboard",
    idempotencyKey: `welcome-${user._id}`,
  });

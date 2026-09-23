// Frontend i18n bootstrap.
//
// Current scope: site UI is English-only. The Gujarati locale resources
// and the SUPPORTED_LANGUAGES list are kept in place so the language
// toggle can be reinstated without re-instrumenting the pages — but the
// active language is hard-locked to `en` here, and `setLanguage()` is
// a no-op. The header toggle has been removed.
//
// Gujarati assessment content (the 500-question bank) is delivered as
// a separate test package whose `text` / `options` fields already carry
// the Gujarati strings — it does NOT depend on i18n locale switching.

import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import { company } from "../config/company.js";

import enCommon from "./locales/en/common.json";
// gu/common.json is NOT imported statically. It is 105 KB of JSON that,
// with the language hard-locked to `en` below, can never be read at
// runtime — but a static import still parks all 105 KB in the entry
// chunk, parsed on every page load before React renders. It is loaded on
// demand by setLanguage() instead, which keeps the toggle a one-line
// change to re-enable while costing the default path nothing.

export const SUPPORTED_LANGUAGES = ["en", "gu"];
export const DEFAULT_LANGUAGE = "en";
// Storage key retained so a prior `gu` preference doesn't keep
// resurfacing — we clear it on bootstrap below.
const STORAGE_KEY = "jumpstart.lang";

// Reflect the active language on the <html> element so CSS selectors
// like `:lang(en)` and screen readers pick up the locale. Locked to
// English now that the toggle is gone.
const syncHtmlLang = (lang) => {
  if (typeof document === "undefined") return;
  try {
    document.documentElement.lang = lang;
  } catch {
    // Document may not be available (SSR); non-fatal.
  }
};

// Clear any persisted preference from when the toggle existed — keeps
// returning users from being stuck in a locale the UI can no longer
// surface.
try {
  if (typeof window !== "undefined" && window.localStorage) {
    window.localStorage.removeItem(STORAGE_KEY);
  }
} catch {
  // Storage may be unavailable; non-fatal.
}

i18n.use(initReactI18next).init({
  resources: {
    en: { common: enCommon },
  },
  lng: DEFAULT_LANGUAGE,
  fallbackLng: DEFAULT_LANGUAGE,
  defaultNS: "common",
  supportedLngs: SUPPORTED_LANGUAGES,
  interpolation: {
    // React already escapes — no need for i18next to do it again.
    escapeValue: false,
    // Brand name is injected into every translation as {{brand}} so the
    // locale files never hardcode it. Renaming the product is a one-line
    // edit in config/company.js, not a sweep through two locale bundles.
    defaultVariables: { brand: company.brandName },
  },
});

syncHtmlLang(DEFAULT_LANGUAGE);

// Locale bundles other than the default are fetched on demand. Vite
// code-splits the dynamic import into its own chunk, so a visitor who
// never switches language never downloads it.
const loaders = {
  gu: () => import("./locales/gu/common.json"),
};

const loaded = new Set([DEFAULT_LANGUAGE]);

// Switching is async now because the bundle has to arrive first. The
// site is still English-only in the UI (no toggle is rendered), but this
// is a working implementation rather than a no-op: wiring the header
// switcher back on is the only remaining step.
export const setLanguage = async (lang) => {
  if (!SUPPORTED_LANGUAGES.includes(lang)) return;

  if (!loaded.has(lang)) {
    const mod = await loaders[lang]?.();
    if (!mod) return;
    // `default` because JSON modules expose the object as the default.
    i18n.addResourceBundle(lang, "common", mod.default, true, true);
    loaded.add(lang);
  }

  await i18n.changeLanguage(lang);
  syncHtmlLang(lang);
};

export default i18n;

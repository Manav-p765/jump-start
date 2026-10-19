// Frontend i18n bootstrap.
//
// Site UI languages: English (default) and Gujarati. The header renders an
// EN / ગુજ toggle that calls setLanguage(); the choice is persisted in
// localStorage and restored on the next visit.
//
// Gujarati assessment content (the 500-question bank) is delivered as
// a separate test package whose `text` / `options` fields already carry
// the Gujarati strings — it does NOT depend on i18n locale switching.

import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import { company } from "../config/company.js";

import enCommon from "./locales/en/common.json";
// gu/common.json is NOT imported statically. It is ~105 KB of JSON; a
// static import would park it in the entry chunk, parsed on every page
// load before React renders. setLanguage() loads it on demand instead, so
// it ships as its own chunk that only Gujarati visitors download.

export const SUPPORTED_LANGUAGES = ["en", "gu"];
export const DEFAULT_LANGUAGE = "en";
const STORAGE_KEY = "jumpstart.lang";

// Reflect the active language on the <html> element so CSS selectors
// like `:lang(gu)` (font stack) and screen readers pick up the locale.
const syncHtmlLang = (lang) => {
  if (typeof document === "undefined") return;
  try {
    document.documentElement.lang = lang;
  } catch {
    // Document may not be available (SSR); non-fatal.
  }
};

const readStoredLanguage = () => {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return SUPPORTED_LANGUAGES.includes(stored) ? stored : null;
  } catch {
    // Storage may be unavailable (private mode, blocked); non-fatal.
    return null;
  }
};

const storeLanguage = (lang) => {
  try {
    window.localStorage.setItem(STORAGE_KEY, lang);
  } catch {
    // Non-fatal: the choice just won't survive a reload.
  }
};

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

// Load a locale bundle without switching the site language. Used where one
// piece of content has its own language (a Gujarati-package report renders
// in Gujarati via i18n.getFixedT("gu") even when the site is in English).
export const ensureLanguageBundle = async (lang) => {
  if (!SUPPORTED_LANGUAGES.includes(lang)) return false;
  if (loaded.has(lang)) return true;
  const mod = await loaders[lang]?.();
  if (!mod) return false;
  // `default` because JSON modules expose the object as the default.
  i18n.addResourceBundle(lang, "common", mod.default, true, true);
  loaded.add(lang);
  return true;
};

export const setLanguage = async (lang) => {
  if (!SUPPORTED_LANGUAGES.includes(lang)) return;
  if (!(await ensureLanguageBundle(lang))) return;

  await i18n.changeLanguage(lang);
  syncHtmlLang(lang);
  storeLanguage(lang);
};

// Restore a returning visitor's choice. English renders immediately; a
// stored Gujarati preference swaps in as soon as its chunk arrives.
const storedLanguage = readStoredLanguage();
if (storedLanguage && storedLanguage !== DEFAULT_LANGUAGE) {
  setLanguage(storedLanguage).catch(() => {});
}

export default i18n;

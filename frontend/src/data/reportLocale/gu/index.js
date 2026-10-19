// Builds the Gujarati report locale. Loaded on demand (dynamic import) only
// when a Gujarati-package report is opened, so English reports never
// download these dictionaries.
import { createTranslator } from "../translator.js";
import * as scorer from "./scorer.js";
import { careerPhrases, careerTemplates } from "./careers.js";
import { uiPhrases, uiFormat } from "./ui.js";

export function createGujaratiReportLocale() {
  const base = {
    terms: scorer.terms,
    bands: scorer.bands,
    suffixes: scorer.suffixes,
    joinList: scorer.guJoin,
  };
  // Scorer output + the page's own labels.
  const text = createTranslator({
    ...base,
    phrases: { ...scorer.phrases, ...uiPhrases },
    templates: scorer.templates,
  });
  // Career titles and detail. Career strings win over scorer phrases
  // ("Architect" the career, not the personality archetype).
  const career = createTranslator({
    ...base,
    phrases: { ...scorer.phrases, ...careerPhrases },
    templates: [...careerTemplates, ...scorer.templates],
  });

  const dateFormat = new Intl.DateTimeFormat(uiFormat.locale, {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return {
    lang: "gu",
    L: text.tr,
    C: career.tr,
    F: uiFormat,
    formatDate: (value) => {
      if (!value) return "";
      const date = new Date(value);
      return Number.isNaN(date.getTime()) ? "" : dateFormat.format(date);
    },
    // Untranslated strings seen so far (for diagnostics).
    misses: () => [...new Set([...text.misses, ...career.misses])],
  };
}

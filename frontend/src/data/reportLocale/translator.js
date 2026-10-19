// Translates the English text a career report is built from (scorer output,
// career data, and the report page's own labels) into another language.
//
// The scorer composes many of its sentences from smaller pieces — e.g.
// "Key findings: High Agreeableness, Dominance + Emotional Stability, and
// Mixed preference pattern." — so an exact-string dictionary alone cannot
// cover it. A string is resolved by, in order:
//   1. an exact entry in the phrase dictionary;
//   2. the "<Band> <Term>[ Intelligence| Interest]" pattern ("High Warmth");
//   3. a sentence template whose captured parts are translated recursively;
//   4. a joinList-style list ("A, B, and C") split only where every piece
//      is itself translatable, so items that contain commas stay whole.
// Anything still unresolved is returned unchanged (and recorded in
// `misses` so the coverage script can fail on it).

const LIST_SEPARATOR = /(, and |, | and )/;

export function createTranslator({ phrases = {}, terms = {}, bands = {}, suffixes = {}, templates = [], joinList }) {
  const misses = new Set();
  const cache = new Map();

  const exact = (s) => {
    if (Object.prototype.hasOwnProperty.call(phrases, s)) return phrases[s];
    if (Object.prototype.hasOwnProperty.call(terms, s)) return terms[s];
    return null;
  };

  const term = (s) => (Object.prototype.hasOwnProperty.call(terms, s) ? terms[s] : null);

  // "High Agreeableness", "Low Artistic Interest", "Moderate Spatial-Visual Intelligence"
  const bandTerm = (s) => {
    const m = /^(High|Moderate|Low|Average|Good|Excellent) (.+?)( Intelligence| Interest)?$/.exec(s);
    if (!m) return null;
    const band = bands[m[1]];
    const t = term(m[2]);
    if (!band || !t) return null;
    const suffix = m[3] ? suffixes[m[3].trim()] : "";
    return [band, t, suffix].filter(Boolean).join(" ");
  };

  // Split "A, B, and C" into translatable items. Dynamic programming over
  // the separator tokens: an item may span separators ("Prefers flexible,
  // fast-moving environments") as long as the whole span translates.
  const list = (s) => {
    const tokens = s.split(LIST_SEPARATOR);
    const pieces = tokens.filter((_, i) => i % 2 === 0);
    if (pieces.length < 2) return null;
    const n = pieces.length;
    const best = new Array(n + 1).fill(null);
    best[0] = [];
    for (let end = 1; end <= n; end += 1) {
      for (let start = end - 1; start >= 0; start -= 1) {
        if (!best[start]) continue;
        const text = tokens.slice(start * 2, end * 2 - 1).join("");
        const translated = atom(text);
        if (translated != null) {
          const candidate = [...best[start], translated];
          if (!best[end] || candidate.length < best[end].length) best[end] = candidate;
        }
      }
    }
    return best[n] && best[n].length > 1 ? joinList(best[n]) : null;
  };

  const runTemplates = (s) => {
    for (const { re, render } of templates) {
      const m = re.exec(s);
      if (!m) continue;
      const out = render(m, api);
      if (out != null) return out;
    }
    return null;
  };

  // A single translatable unit (no top-level list splitting).
  function atom(s) {
    const text = String(s ?? "").trim();
    if (!text) return text;
    return exact(text) ?? bandTerm(text) ?? runTemplates(text);
  }

  // Full translation: unit first, then list, else unchanged + recorded.
  function tr(s) {
    if (s == null) return s;
    const text = String(s);
    if (!text.trim()) return text;
    if (cache.has(text)) return cache.get(text);
    // Text already in the target script (e.g. subject names the Gujarati
    // package carries natively) needs no translation.
    let out = /[઀-૿]/.test(text) && !/[A-Za-z]{3}/.test(text) ? text : null;
    if (out == null) out = atom(text);
    if (out == null) {
      const trimmed = text.trim().replace(/\.$/, "");
      out = list(trimmed);
      if (out != null && /\.\s*$/.test(text)) out += ".";
    }
    if (out == null) {
      misses.add(text);
      out = text;
    }
    cache.set(text, out);
    return out;
  }

  // Translate, but report failure as null instead of falling back.
  const tryTr = (s) => {
    const before = misses.size;
    const out = tr(s);
    if (misses.size !== before && misses.has(String(s))) return null;
    return out;
  };

  // Translate each item of a list and re-join it in the target language.
  const trList = (items) => joinList(items.map((item) => tr(item)));

  // Translate a scorer list that may be a single item or "A, B, and C".
  const trAnyList = (s) => atom(s) ?? list(String(s).trim().replace(/\.$/, "")) ?? null;

  const api = { tr, tryTr, atom, list, trList, trAnyList, term, misses };
  return api;
}

import AssessmentConfig, {
  DUMMY_TEST_PACKAGE_ID,
  PRIMARY_PACKAGE_ID,
} from "../models/AssessmentConfig.js";

const SUPPORTED_PACKAGE_IDS = new Set([
  PRIMARY_PACKAGE_ID,
  DUMMY_TEST_PACKAGE_ID,
]);

const SUPPORT_PAGE_KEYS = ["privacyPolicy", "termsOfService", "faqs"];

const SUPPORT_PAGE_PATHS = {
  privacyPolicy: "/privacy-policy",
  termsOfService: "/terms-of-service",
  faqs: "/faqs",
};

const normalizeTextItems = (items = []) =>
  Array.isArray(items)
    ? items.map((item) => String(item || "").trim()).filter(Boolean)
    : [];

const splitLegacyFaqItem = (value = "") => {
  const text = String(value || "").trim();
  if (!text) return null;

  const questionBreakIndex = text.indexOf("? ");
  if (questionBreakIndex >= 0) {
    return {
      heading: text.slice(0, questionBreakIndex + 1).trim(),
      content: text.slice(questionBreakIndex + 2).trim(),
    };
  }

  const colonBreakIndex = text.indexOf(": ");
  if (colonBreakIndex >= 0) {
    return {
      heading: text.slice(0, colonBreakIndex).trim(),
      content: text.slice(colonBreakIndex + 2).trim(),
    };
  }

  return {
    heading: text,
    content: "",
  };
};

const normalizeFaqItems = (faqItems = [], fallbackItems = []) => {
  const normalizedFaqItems = Array.isArray(faqItems)
    ? faqItems
        .map((item) => ({
          heading: String(item?.heading || "").trim(),
          content: String(item?.content || "").trim(),
        }))
        .filter((item) => item.heading || item.content)
    : [];

  if (normalizedFaqItems.length) {
    return normalizedFaqItems;
  }

  return normalizeTextItems(fallbackItems)
    .map((item) => splitLegacyFaqItem(item))
    .filter(Boolean);
};

const parseCsv = (raw = "") => {
  const rows = [];
  let row = [];
  let value = "";
  let inQuotes = false;

  for (let i = 0; i < raw.length; i += 1) {
    const c = raw[i];
    const next = raw[i + 1];
    if (c === '"') {
      if (inQuotes && next === '"') {
        value += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (!inQuotes && c === ",") {
      row.push(value.trim());
      value = "";
      continue;
    }
    if (!inQuotes && (c === "\n" || c === "\r")) {
      if (c === "\r" && next === "\n") i += 1;
      row.push(value.trim());
      if (row.some((cell) => cell !== "")) rows.push(row);
      row = [];
      value = "";
      continue;
    }
    value += c;
  }

  if (value.length > 0 || row.length > 0) {
    row.push(value.trim());
    if (row.some((cell) => cell !== "")) rows.push(row);
  }
  return rows;
};

const mapRowsToQuestions = (rows) => {
  if (!rows.length) return [];
  const headers = rows[0].map((h) => h.toLowerCase());
  const idx = {
    questionId: headers.findIndex((h) => ["question_id", "qid", "id"].includes(h)),
    text: headers.findIndex((h) => ["question", "text", "statement"].includes(h)),
    type: headers.findIndex((h) => h === "type"),
    optionA: headers.findIndex((h) => ["option_a", "a"].includes(h)),
    optionB: headers.findIndex((h) => ["option_b", "b"].includes(h)),
    optionC: headers.findIndex((h) => ["option_c", "c"].includes(h)),
    optionD: headers.findIndex((h) => ["option_d", "d"].includes(h)),
    optionE: headers.findIndex((h) => ["option_e", "e"].includes(h)),
    correctOption: headers.findIndex((h) => ["correct_option", "answer", "correct"].includes(h)),
    reverseScored: headers.findIndex((h) => ["reverse_scored", "reverse"].includes(h)),
    weight: headers.findIndex((h) => h === "weight"),
  };

  return rows
    .slice(1)
    .map((cells, i) => {
      const typeValue = (idx.type >= 0 ? cells[idx.type] : "").toLowerCase();
      const type = typeValue === "single" || typeValue === "objective" ? "single" : "likert";
      const options = [idx.optionA, idx.optionB, idx.optionC, idx.optionD, idx.optionE]
        .map((col) => (col >= 0 ? cells[col] : ""))
        .map((v) => String(v || "").trim())
        .filter(Boolean);
      return {
        questionId: idx.questionId >= 0 ? String(cells[idx.questionId] || "") : `${i + 1}`,
        text: idx.text >= 0 ? String(cells[idx.text] || "").trim() : "",
        type,
        options: type === "single" ? options : [],
        correctOption: idx.correctOption >= 0 ? String(cells[idx.correctOption] || "").trim() : "",
        reverseScored:
          idx.reverseScored >= 0
            ? ["1", "true", "yes", "y"].includes(String(cells[idx.reverseScored] || "").toLowerCase())
            : false,
        weight: idx.weight >= 0 ? Number(cells[idx.weight] || 1) : 1,
        subscale:
          headers.findIndex((h) => h === "subscale") >= 0
            ? String(cells[headers.findIndex((h) => h === "subscale")] || "").trim()
            : "",
        notes:
          headers.findIndex((h) => h === "notes") >= 0
            ? String(cells[headers.findIndex((h) => h === "notes")] || "").trim()
            : "",
      };
    })
    .filter((q) => q.text);
};

const toPublicPackage = (p) => ({
  id: p.id,
  title: p.title,
  badge: p.badge,
  amount: p.amount,
  strikeAmount: p.strikeAmount,
  features: p.features || [],
  durationText: p.durationText || "",
  active: p.active,
  sortOrder: p.sortOrder || 0,
  sectionCount: Array.isArray(p.sections) ? p.sections.filter((s) => s.enabled !== false).length : 0,
});

const toPublicSection = (s) => ({
  sectionId: s.sectionId,
  title: s.title,
  durationMinutes: s.durationMinutes,
  enabled: s.enabled,
  scoringType: s.scoringType,
  totalQuestions: Array.isArray(s.questions) ? s.questions.length : 0,
});

const getQuestionCount = (pkg) =>
  (pkg.sections || [])
    .filter((section) => section.enabled !== false)
    .reduce(
      (sum, section) => sum + ((section.questions || []).length || 0),
      0
    );

const normalizePackage = (p, sortOrder = 1) => ({
  id: String(p.id || `pkg-${Date.now()}`),
  title: String(p.title || "Package"),
  badge: String(p.badge || "Recommended"),
  amount: Number(p.amount || 0),
  strikeAmount: p.strikeAmount !== undefined && p.strikeAmount !== null && p.strikeAmount !== "" ? Number(p.strikeAmount) : null,
  features: Array.isArray(p.features) ? p.features.map((f) => String(f)).filter(Boolean) : [],
  durationText: String(p.durationText || ""),
  active: p.active !== false,
  sortOrder: Number.isFinite(Number(p.sortOrder)) ? Number(p.sortOrder) : sortOrder,
  sections: Array.isArray(p.sections)
    ? p.sections.map((s, i) => ({
      sectionId: Number(s.sectionId || i + 1),
      title: String(s.title || `Section ${i + 1}`),
      durationMinutes: Number(s.durationMinutes || 20),
      enabled: s.enabled !== false,
      scoringType: ["likert", "objective", "mixed"].includes(s.scoringType) ? s.scoringType : "mixed",
      sheetCsvUrl: String(s.sheetCsvUrl || ""),
      questions: Array.isArray(s.questions) ? s.questions : [],
    }))
    : [],
});

const getCfg = async () => AssessmentConfig.getOrCreateDefault();

const findPackage = (cfg, packageId) => (cfg.packages || []).find((p) => p.id === packageId);

const normalizeSupportPage = (page = {}, fallbackTitle = "", pageKey = "") => ({
  enabled: page?.enabled !== false,
  title: String(page?.title || fallbackTitle || "").trim(),
  summary: String(page?.summary || "").trim(),
  items: pageKey === "faqs" ? normalizeTextItems(page?.items) : normalizeTextItems(page?.items),
  faqItems:
    pageKey === "faqs" ? normalizeFaqItems(page?.faqItems, page?.items) : [],
});

const toPublicSupportPages = (cfg) =>
  SUPPORT_PAGE_KEYS.reduce((acc, key) => {
    const page = normalizeSupportPage(
      cfg?.supportPages?.[key] || {},
      key === "privacyPolicy"
        ? "Privacy Policy"
        : key === "termsOfService"
          ? "Terms of Service"
          : "FAQs",
      key
    );

    acc[key] = {
      key,
      path: SUPPORT_PAGE_PATHS[key],
      ...page,
    };
    return acc;
  }, {});

// Counselling settings, read-only, for the public config payload. Fee stays
// in PAISE — the same unit every other amount in the API uses — so the
// frontend divides by 100 exactly once, at render.
const toPublicCounselling = (cfg) => ({
  fee: Number(cfg?.counselling?.fee ?? 0),
  currency: "INR",
  durationMinutes: Number(cfg?.counselling?.durationMinutes ?? 50),
  active: cfg?.counselling?.active !== false,
});

// GET /api/v1/public/config
export const getPublicConfig = async (req, res) => {
  try {
    const cfg = await getCfg();
    const packages = (cfg.packages || [])
      .filter((p) => p.active !== false && getQuestionCount(p) > 0)
      .sort((a, b) => a.sortOrder - b.sortOrder);
    // Package list + support pages change only when an admin re-seeds
    // or edits config. Cache aggressively at the edge / browser; the
    // shorter `s-maxage` lets us push a config edit and have CDNs pick
    // it up within ~10 min while clients hold a 1-hour browser copy.
    res.set("Cache-Control", "public, max-age=3600, s-maxage=600");
    return res.status(200).json({
      success: true,
      data: {
        packages: packages.map(toPublicPackage),
        supportPages: toPublicSupportPages(cfg),
        // Read-only counselling settings so the booking page can show the
        // real configured fee instead of a hardcoded literal.
        counselling: toPublicCounselling(cfg),
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, msg: err.message || "Failed to load config" });
  }
};

// GET /api/v1/public/support-pages
export const getPublicSupportPages = async (req, res) => {
  try {
    const cfg = await getCfg();
    // Support page content (FAQs, terms, privacy) is admin-edited and
    // changes rarely. Same cache window as the package list.
    res.set("Cache-Control", "public, max-age=3600, s-maxage=600");
    return res.status(200).json({
      success: true,
      data: {
        pages: toPublicSupportPages(cfg),
      },
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      msg: err.message || "Failed to load support pages",
    });
  }
};

// The question bank is paid content: only admins, or a student who has the
// package (purchased, or a free package they selected), may read it.
const canReadPackageQuestions = (user, pkg) => {
  if (!user || !pkg) return false;
  if (user.role === "admin") return true;
  if (pkg.active === false) return false;
  const purchased = (user.purchasedPackages || []).map(String);
  if (purchased.includes(String(pkg.id))) return true;
  return Number(pkg.amount || 0) === 0 && String(user.selectedPackageId || "") === String(pkg.id);
};

const NO_PACKAGE_ACCESS = { success: false, msg: "You do not have access to this package" };

// GET /api/v1/public/packages/:packageId/sections
export const getPublicPackageSections = async (req, res) => {
  try {
    const cfg = await getCfg();
    const pkg = findPackage(cfg, req.params.packageId);
    if (!pkg) return res.status(404).json({ success: false, msg: "Package not found" });
    if (!canReadPackageQuestions(req.user, pkg)) return res.status(403).json(NO_PACKAGE_ACCESS);
    const sections = (pkg.sections || []).filter((s) => s.enabled !== false).sort((a, b) => a.sectionId - b.sectionId);
    // Per-user access check above, so never store in shared caches.
    res.set("Cache-Control", "private, max-age=600");
    return res.status(200).json({ success: true, data: { package: toPublicPackage(pkg), sections: sections.map(toPublicSection) } });
  } catch (err) {
    return res.status(500).json({ success: false, msg: err.message || "Failed to load package sections" });
  }
};

// GET /api/v1/public/packages/:packageId/sections/:sectionId/questions
export const getPublicSectionQuestions = async (req, res) => {
  try {
    const sectionId = Number(req.params.sectionId);
    const cfg = await getCfg();
    const pkg = findPackage(cfg, req.params.packageId);
    if (!pkg) return res.status(404).json({ success: false, msg: "Package not found" });
    if (!canReadPackageQuestions(req.user, pkg)) return res.status(403).json(NO_PACKAGE_ACCESS);
    const section = (pkg.sections || []).find((s) => s.sectionId === sectionId && s.enabled !== false);
    if (!section) return res.status(404).json({ success: false, msg: "Section not found" });
    const questions = (section.questions || []).map((q, index) => ({
      index,
      questionId: q.questionId || `${index + 1}`,
      text: q.text,
      // Gujarati translations surface only when an admin has filled
      // them in via the Translations panel. The frontend falls back to
      // `text` / `options[i]` when the translation is empty, so it's
      // safe to ship these fields with empty defaults.
      text_gu: q.text_gu || "",
      type: q.type,
      options: q.options || [],
      options_gu: Array.isArray(q.options_gu) ? q.options_gu : [],
    }));
    // Per-user access check above, so never store in shared caches.
    res.set("Cache-Control", "private, max-age=600");
    return res.status(200).json({ success: true, data: { section: toPublicSection(section), questions } });
  } catch (err) {
    return res.status(500).json({ success: false, msg: err.message || "Failed to load questions" });
  }
};

// GET /api/v1/admin/config
export const getAdminConfig = async (req, res) => {
  try {
    const cfg = await getCfg();
    return res.status(200).json({
      success: true,
      data: {
        key: cfg.key,
        packages: cfg.packages || [],
        supportPages: toPublicSupportPages(cfg),
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, msg: err.message || "Failed to load admin config" });
  }
};

// PUT /api/v1/admin/support-pages
export const putAdminSupportPages = async (req, res) => {
  try {
    const rawPages = req.body?.supportPages || {};
    const cfg = await getCfg();

    SUPPORT_PAGE_KEYS.forEach((key) => {
      const existingTitle =
        cfg?.supportPages?.[key]?.title ||
        (key === "privacyPolicy"
          ? "Privacy Policy"
          : key === "termsOfService"
            ? "Terms of Service"
            : "FAQs");

      cfg.supportPages[key] = normalizeSupportPage(rawPages[key], existingTitle, key);
    });

    await cfg.save();

    return res.status(200).json({
      success: true,
      data: {
        supportPages: toPublicSupportPages(cfg),
      },
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      msg: err.message || "Failed to save support pages",
    });
  }
};

// POST /api/v1/admin/packages
export const postAdminPackage = async (req, res) => {
  return res.status(403).json({
    success: false,
    msg: "Only the dummy test and comprehensive 500-question package are supported.",
  });
};

// PUT /api/v1/admin/packages/:packageId
export const putAdminPackage = async (req, res) => {
  try {
    const cfg = await getCfg();
    if (!SUPPORTED_PACKAGE_IDS.has(req.params.packageId)) {
      return res.status(404).json({ success: false, msg: "Package not found" });
    }
    const idx = (cfg.packages || []).findIndex((p) => p.id === req.params.packageId);
    if (idx < 0) return res.status(404).json({ success: false, msg: "Package not found" });
    const existing = cfg.packages[idx];
    const next = normalizePackage({ ...existing.toObject(), ...req.body, sections: existing.sections }, existing.sortOrder);
    next.id = req.params.packageId;
    next.active = true;
    next.sortOrder = req.params.packageId === PRIMARY_PACKAGE_ID ? 1 : 2;
    cfg.packages[idx] = next;
    await cfg.save();
    return res.status(200).json({ success: true, data: { package: next } });
  } catch (err) {
    return res.status(500).json({ success: false, msg: err.message || "Failed to update package" });
  }
};

// DELETE /api/v1/admin/packages/:packageId
export const deleteAdminPackage = async (req, res) => {
  return res.status(403).json({
    success: false,
    msg: "The dummy test and comprehensive 500-question package cannot be deleted.",
  });
};

// PUT /api/v1/admin/packages/:packageId/sections
export const putAdminPackageSections = async (req, res) => {
  try {
    const { sections } = req.body || {};
    if (!Array.isArray(sections)) return res.status(400).json({ success: false, msg: "sections array is required" });
    const cfg = await getCfg();
    const pkg = findPackage(cfg, req.params.packageId);
    if (!pkg) return res.status(404).json({ success: false, msg: "Package not found" });
    pkg.sections = sections.map((s, i) => {
      const existing = (pkg.sections || []).find((x) => x.sectionId === Number(s.sectionId));
      return {
        sectionId: Number(s.sectionId || i + 1),
        title: String(s.title || `Section ${i + 1}`),
        durationMinutes: Number(s.durationMinutes || 20),
        enabled: s.enabled !== false,
        scoringType: ["likert", "objective", "mixed"].includes(s.scoringType) ? s.scoringType : "mixed",
        sheetCsvUrl: String(s.sheetCsvUrl || ""),
        questions: existing?.questions || [],
      };
    });
    await cfg.save();
    return res.status(200).json({ success: true, data: { sections: pkg.sections } });
  } catch (err) {
    return res.status(500).json({ success: false, msg: err.message || "Failed to update sections" });
  }
};

// GET /api/v1/admin/translations
// Returns every question across active packages with translation
// status, optionally filtered by ?packageId= and ?status=. Used by
// the admin Translations panel to render its list.
export const getAdminTranslations = async (req, res) => {
  try {
    const cfg = await getCfg();
    const requestedPackageId = String(req.query?.packageId || "").trim();
    const statusFilter = String(req.query?.status || "all").toLowerCase();

    const packages = (cfg.packages || [])
      .filter((p) => p.active !== false)
      .filter((p) => !requestedPackageId || p.id === requestedPackageId)
      .sort((a, b) => Number(a.sortOrder || 0) - Number(b.sortOrder || 0));

    const rows = [];
    let translated = 0;
    let total = 0;

    for (const pkg of packages) {
      for (const section of pkg.sections || []) {
        for (const question of section.questions || []) {
          total += 1;
          const hasTranslation = Boolean(
            String(question.text_gu || "").trim()
          );
          if (hasTranslation) translated += 1;
          if (statusFilter === "translated" && !hasTranslation) continue;
          if (statusFilter === "untranslated" && hasTranslation) continue;
          rows.push({
            packageId: pkg.id,
            packageTitle: pkg.title,
            sectionId: section.sectionId,
            sectionTitle: section.title,
            questionId: String(question.questionId || ""),
            text: question.text || "",
            text_gu: question.text_gu || "",
            options: Array.isArray(question.options) ? question.options : [],
            options_gu: Array.isArray(question.options_gu)
              ? question.options_gu
              : [],
            translated: hasTranslation,
          });
        }
      }
    }

    return res.status(200).json({
      success: true,
      data: {
        summary: { total, translated, untranslated: total - translated },
        rows,
      },
    });
  } catch (err) {
    return res
      .status(500)
      .json({ success: false, msg: err.message || "Failed to load translations" });
  }
};

// PUT /api/v1/admin/questions/:questionId/translate
// Body: { language: "gu", text: "...", options: ["...", "..."] }
//
// Sets text_gu / options_gu on the matching question across every
// active package. Matches by questionId (the canonical ID from the
// 500-question bank), so a translation entered once propagates to
// both the full test and the demo curation if they reference the
// same question. Pass null/"" for `text` to clear a translation;
// pass an empty array for `options` to leave option translations
// unchanged.
export const putAdminQuestionTranslation = async (req, res) => {
  try {
    const { questionId } = req.params;
    const { language, text, options } = req.body || {};

    const lang = String(language || "").trim().toLowerCase();
    if (lang !== "gu") {
      // Only Gujarati is supported in this phase. Future languages
      // will gate on a SUPPORTED_TRANSLATION_LANGUAGES set.
      return res
        .status(400)
        .json({ success: false, msg: "Unsupported language" });
    }

    const cfg = await getCfg();
    const targetId = String(questionId || "").trim();
    if (!targetId) {
      return res
        .status(400)
        .json({ success: false, msg: "questionId is required" });
    }

    let matched = 0;
    for (const pkg of cfg.packages || []) {
      for (const section of pkg.sections || []) {
        for (const question of section.questions || []) {
          if (String(question.questionId || "") !== targetId) continue;
          if (text !== undefined) {
            question.text_gu = String(text || "").trim();
          }
          if (Array.isArray(options)) {
            // Pad / trim to match `options` length so the indexes
            // stay aligned. Missing entries become empty strings
            // (silent fallback to English in the UI).
            const englishLength = Array.isArray(question.options)
              ? question.options.length
              : 0;
            const padded = Array.from({ length: englishLength }, (_, i) =>
              String(options[i] || "").trim()
            );
            question.options_gu = padded;
          }
          matched += 1;
        }
      }
    }

    if (matched === 0) {
      return res
        .status(404)
        .json({ success: false, msg: `No question with id ${targetId}` });
    }

    // Tell Mongoose the nested array changed — without this the
    // sub-document edits inside packages[].sections[].questions[]
    // don't always trigger a save.
    cfg.markModified("packages");
    await cfg.save();

    return res.status(200).json({
      success: true,
      data: { questionId: targetId, matched, language: lang },
    });
  } catch (err) {
    return res
      .status(500)
      .json({ success: false, msg: err.message || "Failed to save translation" });
  }
};

// POST /api/v1/admin/packages/:packageId/sections/:sectionId/sync-google-sheet
export const postSyncSectionFromGoogleSheet = async (req, res) => {
  try {
    const sectionId = Number(req.params.sectionId);
    const { csvUrl } = req.body || {};
    if (!csvUrl) return res.status(400).json({ success: false, msg: "csvUrl is required" });

    const cfg = await getCfg();
    const pkg = findPackage(cfg, req.params.packageId);
    if (!pkg) return res.status(404).json({ success: false, msg: "Package not found" });
    const section = (pkg.sections || []).find((s) => s.sectionId === sectionId);
    if (!section) return res.status(404).json({ success: false, msg: "Section not found" });

    const response = await fetch(csvUrl);
    if (!response.ok) return res.status(400).json({ success: false, msg: `Failed to fetch CSV (${response.status})` });
    const raw = await response.text();
    const rows = parseCsv(raw);
    const questions = mapRowsToQuestions(rows);
    if (!questions.length) return res.status(400).json({ success: false, msg: "No questions parsed from CSV" });

    section.questions = questions;
    section.sheetCsvUrl = csvUrl;
    await cfg.save();
    return res.status(200).json({
      success: true,
      data: { section: { sectionId: section.sectionId, title: section.title, totalQuestions: section.questions.length } },
    });
  } catch (err) {
    return res.status(500).json({ success: false, msg: err.message || "Failed to sync section" });
  }
};

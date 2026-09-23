import mongoose from "mongoose";
import COMPREHENSIVE_500_PACKAGE from "../config/comprehensive500Package.generated.js";
import {
  DEMO_PACKAGE_ID,
  buildDemoPackageDoc,
} from "../utils/scoring/configs/career500qDemo.config.js";

const packageSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    title: { type: String, required: true },
    badge: { type: String, default: "Recommended" },
    amount: { type: Number, required: true, min: 0 },
    strikeAmount: { type: Number, default: null },
    features: [{ type: String }],
    durationText: { type: String, default: "" },
    active: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
    sections: [
      {
        sectionId: { type: Number, required: true },
        title: { type: String, required: true },
        durationMinutes: { type: Number, default: 20 },
        enabled: { type: Boolean, default: true },
        scoringType: { type: String, enum: ["likert", "objective", "mixed"], default: "mixed" },
        sheetCsvUrl: { type: String, default: "" },
        questions: [
          {
            questionId: { type: String, default: "" },
            text: { type: String, required: true },
            // Gujarati translation of the question stem. Empty string
            // when no translation has been added yet — the frontend
            // (Livetest.jsx) falls back silently to `text` in that
            // case, so the bank can be translated question-by-question
            // without breaking the live experience.
            text_gu: { type: String, default: "" },
            type: { type: String, enum: ["likert", "single"], default: "likert" },
            options: [{ type: String }],
            // Parallel array of Gujarati option translations indexed
            // identically to `options`. An empty / missing entry at a
            // given index falls back to the English option. Kept as a
            // sibling array rather than promoting `options` to objects
            // so existing data and the scorer (which reads `options`
            // by index) stay byte-for-byte compatible.
            options_gu: { type: [String], default: [] },
            correctOption: { type: String, default: "" },
            reverseScored: { type: Boolean, default: false },
            weight: { type: Number, default: 1, min: 0.1 },
            subscale: { type: String, default: "" },
            notes: { type: String, default: "" },
          },
        ],
      },
    ],
  },
  { _id: false }
);

const supportPageSchema = new mongoose.Schema(
  {
    enabled: { type: Boolean, default: true },
    title: { type: String, required: true },
    summary: { type: String, default: "" },
    items: { type: [String], default: [] },
    faqItems: {
      type: [
        new mongoose.Schema(
          {
            heading: { type: String, default: "" },
            content: { type: String, default: "" },
          },
          { _id: false }
        ),
      ],
      default: [],
    },
  },
  { _id: false }
);

const supportPagesSchema = new mongoose.Schema(
  {
    privacyPolicy: {
      type: supportPageSchema,
      default: () => ({}),
    },
    termsOfService: {
      type: supportPageSchema,
      default: () => ({}),
    },
    faqs: {
      type: supportPageSchema,
      default: () => ({}),
    },
  },
  { _id: false }
);


// Site-level counselling settings. Lives on the singleton beside
// supportPages (which is likewise site-wide, not package-scoped) rather than
// in a new collection — there is exactly one config document, keyed
// "default", and this is what it is for.
const counsellingSchema = new mongoose.Schema(
  {
    // PAISE, matching how every Razorpay amount is handled elsewhere
    // (Payment.amount, order.amount). 150000 = ₹1500, GST-inclusive.
    fee: { type: Number, default: 150000, min: 0 },
    durationMinutes: { type: Number, default: 50, min: 1 },
    active: { type: Boolean, default: true },
  },
  { _id: false }
);
const assessmentConfigSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, default: "default" },
    packages: [packageSchema],
    counselling: {
      type: counsellingSchema,
      default: () => ({}),
    },
    supportPages: {
      type: supportPagesSchema,
      default: () => ({}),
    },
  },
  { timestamps: true }
);

export const PRIMARY_PACKAGE_ID = COMPREHENSIVE_500_PACKAGE.id;
export const DUMMY_TEST_PACKAGE_ID = "dummy-test";
export const DEMO_TEST_PACKAGE_ID = DEMO_PACKAGE_ID;

const createDummyPackage = () => ({
  id: DUMMY_TEST_PACKAGE_ID,
  title: "Dummy Test",
  badge: "Quick Test",
  amount: 0,
  strikeAmount: null,
  features: [
    "3 quick sections",
    "1 question per section",
    "Fast end-to-end result testing",
  ],
  durationText: "3-minute dummy assessment",
  active: true,
  sortOrder: 2,
  sections: [
    {
      sectionId: 1,
      title: "Personality Assessment",
      durationMinutes: 1,
      enabled: true,
      scoringType: "likert",
      sheetCsvUrl: "",
      questions: [
        {
          questionId: "1",
          text: "I enjoy taking initiative when working with others.",
          type: "likert",
          options: [],
          correctOption: "",
          reverseScored: false,
          weight: 1,
          subscale: "",
          notes: "",
        },
      ],
    },
    {
      sectionId: 2,
      title: "Interest Assessment",
      durationMinutes: 1,
      enabled: true,
      scoringType: "mixed",
      sheetCsvUrl: "",
      questions: [
        {
          questionId: "2",
          text: "Which activity sounds most interesting to you?",
          type: "single",
          options: [
            "Organizing a community event",
            "Analyzing a science experiment",
            "Designing a poster for a campaign",
            "Managing records for a school club",
          ],
          correctOption: "",
          reverseScored: false,
          weight: 1,
          subscale: "",
          notes: "",
        },
      ],
    },
    {
      sectionId: 3,
      title: "Aptitude Battery",
      durationMinutes: 1,
      enabled: true,
      scoringType: "objective",
      sheetCsvUrl: "",
      questions: [
        {
          questionId: "291",
          text: "What is the next number in the pattern 2, 4, 8, 16, ?",
          type: "single",
          options: ["18", "24", "32", "34"],
          correctOption: "C",
          reverseScored: false,
          weight: 1,
          subscale: "",
          notes: "",
        },
      ],
    },
  ],
});

const createPrimaryPackage = () => ({
  ...JSON.parse(JSON.stringify(COMPREHENSIVE_500_PACKAGE)),
  active: true,
  sortOrder: 1,
});

const createDemoPackage = () => ({
  ...buildDemoPackageDoc(COMPREHENSIVE_500_PACKAGE),
  active: true,
  sortOrder: 0,
});

const createDefaultPackages = () => [
  createPrimaryPackage(),
  createDemoPackage(),
  createDummyPackage(),
];

const createDefaultSupportPages = () => ({
  privacyPolicy: {
    enabled: true,
    title: "Privacy Policy",
    summary: "How Jumpstride collects, uses, and protects student information.",
    items: [
      "We collect only the information needed to create your account, run assessments, and generate your report.",
      "Assessment responses and profile details are used to prepare result analysis, recommendations, and support services.",
      "Your personal information is not sold to third parties and is shared only when required to deliver the service or meet legal obligations.",
      "You can contact Jumpstride support to request updates or removal of your stored personal information.",
    ],
  },
  termsOfService: {
    enabled: true,
    title: "Terms of Service",
    summary: "Rules and responsibilities for using Jumpstride assessments and reports.",
    items: [
      "Assessment purchases provide access to the selected test package and related report features available on your account.",
      "Users must provide accurate information and must not misuse the platform, attempt unauthorized access, or disrupt the service.",
      "Reports and recommendations are guidance tools and should be used alongside professional advice where appropriate.",
      "Jumpstride may update platform features, pricing, or service terms when necessary to improve the product or comply with policy changes.",
    ],
  },
  faqs: {
    enabled: true,
    title: "FAQs",
    summary: "Answers to common questions about tests, reports, and admin review.",
    items: [],
    faqItems: [
      {
        heading: "How long does admin review take?",
        content: "Most submitted reports are reviewed within 48 hours.",
      },
      {
        heading: "Can I see my result before approval?",
        content: "No. Published reports appear only after admin approval is complete.",
      },
      {
        heading: "Where can I find my purchased tests?",
        content: "Purchased packages are listed in your dashboard and results area.",
      },
      {
        heading: "How do I get extra help?",
        content: "Use the Help Center or book a counselling session from your account.",
      },
    ],
  },
});

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

let cachedDefaultConfig = null;
const APTITUDE_BATTERY_SECTION_ID = 4;
const SECTION_4_CANONICAL_SYNC_IDS = new Set(
  Array.from({ length: 40 }, (_, index) => String(391 + index))
);

const countQuestions = (pkg = {}) =>
  (pkg.sections || []).reduce(
    (sum, section) => sum + ((section.questions || []).length || 0),
    0
  );

const normalizeQuestionText = (value = "") =>
  String(value || "").replace(/\s+/g, " ").trim();

const normalizeQuestionOptions = (options = []) =>
  Array.isArray(options)
    ? options.map((option) => normalizeQuestionText(option))
    : [];

const hasDeprecatedQuestionArtifact = (text = "") => {
  const normalizedText = normalizeQuestionText(text);
  return /description:/i.test(normalizedText) || /\]$/.test(normalizedText);
};

const areQuestionCoreFieldsEqual = (currentQuestion = {}, seededQuestion = {}) =>
  normalizeQuestionText(currentQuestion.text) ===
    normalizeQuestionText(seededQuestion.text) &&
  String(currentQuestion.type || "").trim() ===
    String(seededQuestion.type || "").trim() &&
  String(currentQuestion.correctOption || "").trim() ===
    String(seededQuestion.correctOption || "").trim() &&
  JSON.stringify(normalizeQuestionOptions(currentQuestion.options)) ===
    JSON.stringify(normalizeQuestionOptions(seededQuestion.options));

const shouldReplaceAptitudeBatteryQuestions = (
  existingSection = {},
  seededSection = {}
) => {
  if (Number(existingSection.sectionId) !== APTITUDE_BATTERY_SECTION_ID) {
    return false;
  }

  const existingQuestions = Array.isArray(existingSection.questions)
    ? existingSection.questions
    : [];
  const seededQuestions = Array.isArray(seededSection.questions)
    ? seededSection.questions
    : [];

  if (!existingQuestions.length) {
    return seededQuestions.length > 0;
  }

  if (
    existingQuestions.some((question) =>
      hasDeprecatedQuestionArtifact(question?.text)
    )
  ) {
    return true;
  }

  if (existingQuestions.length !== seededQuestions.length) {
    return true;
  }

  const existingIds = existingQuestions.map((question) =>
    String(question?.questionId || "").trim()
  );
  const seededIds = seededQuestions.map((question) =>
    String(question?.questionId || "").trim()
  );

  if (JSON.stringify(existingIds) !== JSON.stringify(seededIds)) {
    return true;
  }

  const existingQuestionById = new Map(
    existingQuestions.map((question) => [
      String(question?.questionId || "").trim(),
      question,
    ])
  );

  return seededQuestions.some((seededQuestion) => {
    const questionId = String(seededQuestion?.questionId || "").trim();
    if (!SECTION_4_CANONICAL_SYNC_IDS.has(questionId)) {
      return false;
    }

    const existingQuestion = existingQuestionById.get(questionId);
    if (!existingQuestion) {
      return true;
    }

    return !areQuestionCoreFieldsEqual(existingQuestion, seededQuestion);
  });
};

const syncSeededSectionQuestions = (target = {}, seeded = {}) => {
  if (!Array.isArray(target.sections) || !Array.isArray(seeded.sections)) {
    return false;
  }

  let changed = false;
  const seededSectionById = new Map(
    seeded.sections.map((section) => [Number(section.sectionId), section])
  );

  target.sections = target.sections.map((existingSection) => {
    const seededSection = seededSectionById.get(Number(existingSection.sectionId));
    if (!seededSection) {
      return existingSection;
    }

    if (shouldReplaceAptitudeBatteryQuestions(existingSection, seededSection)) {
      existingSection.questions = seededSection.questions;
      changed = true;
    }

    return existingSection;
  });

  return changed;
};

const mergeSeededPackage = (target, seeded) => {
  let changed = false;

  if (countQuestions(target) === 0 && countQuestions(seeded) > 0) {
    target.sections = seeded.sections;
    changed = true;
  }
  if (!Array.isArray(target.features) || !target.features.length) {
    target.features = seeded.features;
    changed = true;
  }
  if (!target.durationText && seeded.durationText) {
    target.durationText = seeded.durationText;
    changed = true;
  }
  if (!target.badge && seeded.badge) {
    target.badge = seeded.badge;
    changed = true;
  }
  if ((target.amount == null || Number.isNaN(Number(target.amount))) && seeded.amount != null) {
    target.amount = seeded.amount;
    changed = true;
  }
  if (!Number.isFinite(Number(target.sortOrder)) && seeded.sortOrder != null) {
    target.sortOrder = seeded.sortOrder;
    changed = true;
  }

  if (
    target.id === PRIMARY_PACKAGE_ID &&
    syncSeededSectionQuestions(target, seeded)
  ) {
    changed = true;
  }

  return changed;
};

const mergeSeededSupportPage = (target, seeded, pageKey = "") => {
  let changed = false;

  if (target.enabled == null) {
    target.enabled = seeded.enabled !== false;
    changed = true;
  }
  if (!target.title && seeded.title) {
    target.title = seeded.title;
    changed = true;
  }
  if (!target.summary && seeded.summary) {
    target.summary = seeded.summary;
    changed = true;
  }
  if ((!Array.isArray(target.items) || target.items.length === 0) && seeded.items?.length) {
    target.items = seeded.items;
    changed = true;
  }
  if (
    (!Array.isArray(target.faqItems) || target.faqItems.length === 0) &&
    Array.isArray(seeded.faqItems) &&
    seeded.faqItems.length
  ) {
    target.faqItems = seeded.faqItems;
    changed = true;
  }
  if (pageKey === "faqs") {
    const normalizedFaqItems = normalizeFaqItems(target.faqItems, target.items);
    if (
      JSON.stringify(normalizedFaqItems) !== JSON.stringify(Array.isArray(target.faqItems) ? target.faqItems : [])
    ) {
      target.faqItems = normalizedFaqItems;
      changed = true;
    }
  }

  return changed;
};

const loadDefaultConfig = () => {
  if (cachedDefaultConfig) {
    return cachedDefaultConfig;
  }

  cachedDefaultConfig = {
    key: "default",
    packages: createDefaultPackages(),
    supportPages: createDefaultSupportPages(),
  };

  return cachedDefaultConfig;
};

assessmentConfigSchema.statics.getOrCreateDefault = async function getOrCreateDefault() {
  const defaultConfig = loadDefaultConfig();

  await this.updateOne(
    { key: "default" },
    { $setOnInsert: defaultConfig },
    { upsert: true }
  );

  const cfg = await this.findOne({ key: "default" });
  if (!cfg) {
    return this.findOne({ key: "default" });
  }

  let changed = false;
  const packageSeeds = createDefaultPackages();
  const supportPageSeeds = createDefaultSupportPages();

  if (!Array.isArray(cfg.packages) || cfg.packages.length === 0) {
    cfg.packages = packageSeeds;
    changed = true;
  } else {
    const seededIds = new Set(packageSeeds.map((seed) => seed.id));
    const nextPackages = packageSeeds.map((seed) => {
      const existing = (cfg.packages || []).find((pkg) => pkg.id === seed.id);

      if (!existing) {
        changed = true;
        return seed;
      }

      changed = mergeSeededPackage(existing, seed) || changed;
      if (existing.active === false) {
        existing.active = true;
        changed = true;
      }
      if (Number(existing.sortOrder || 0) !== Number(seed.sortOrder || 0)) {
        existing.sortOrder = seed.sortOrder;
        changed = true;
      }
      return existing;
    });

    // Preserve packages that aren't part of the default seed set — e.g.
    // the separately-seeded Gujarati edition (complete-aptitude-500q-
    // gujarati). Without this, every getOrCreateDefault call would
    // rebuild `packages` from the 3 default seeds and silently strip any
    // extra package, so the Gujarati card would vanish from /test the
    // moment any config read ran.
    const extraPackages = (cfg.packages || []).filter(
      (pkg) => !seededIds.has(pkg.id)
    );
    const merged = [...nextPackages, ...extraPackages];

    const sameLength = (cfg.packages || []).length === merged.length;
    const sameOrder =
      sameLength &&
      merged.every((pkg, index) => cfg.packages[index]?.id === pkg.id);
    if (!sameLength || !sameOrder) {
      cfg.packages = merged;
      changed = true;
    } else {
      cfg.packages = merged;
    }
  }

  if (!cfg.supportPages) {
    cfg.supportPages = supportPageSeeds;
    changed = true;
  } else {
    if (!cfg.supportPages.privacyPolicy) {
      cfg.supportPages.privacyPolicy = supportPageSeeds.privacyPolicy;
      changed = true;
    }
    if (!cfg.supportPages.termsOfService) {
      cfg.supportPages.termsOfService = supportPageSeeds.termsOfService;
      changed = true;
    }
    if (!cfg.supportPages.faqs) {
      cfg.supportPages.faqs = supportPageSeeds.faqs;
      changed = true;
    }
    changed =
      mergeSeededSupportPage(cfg.supportPages.privacyPolicy, supportPageSeeds.privacyPolicy, "privacyPolicy") ||
      changed;
    changed =
      mergeSeededSupportPage(cfg.supportPages.termsOfService, supportPageSeeds.termsOfService, "termsOfService") ||
      changed;
    changed =
      mergeSeededSupportPage(cfg.supportPages.faqs, supportPageSeeds.faqs, "faqs") ||
      changed;
  }

  // Backfill counselling settings onto config documents created before
  // Tier 2 existed. Mongoose would apply the subdocument default on read
  // anyway, but persisting it means the admin config editor sees a real
  // stored value rather than a phantom one.
  if (!cfg.counselling) {
    cfg.counselling = {};
    changed = true;
  }

  if (changed) {
    await cfg.save();
  }

  return cfg;
};

export default mongoose.model("AssessmentConfig", assessmentConfigSchema);

import { useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Download, Sparkles } from "lucide-react";
import api from "../api/api";
import jumpstartLogo from "../assets/jumpstart-logo.png";
import { company } from "../config/company";
import { StudentReportSkeleton } from "../components/Skeletons";
import ResultPendingPanel from "../components/ResultPendingPanel";
import usePrintableDocument from "../hooks/usePrintableDocument";
import {
  formatStudentDate,
  normalizeStudentReportPayload,
} from "../data/studentResults";
import { getCareerDetailContent } from "../data/careerDetails";

/* ------------------------------------------------------------------ *
 * Design tokens (from the mockup)
 *   teal band / bars   #128678
 *   deep teal text     #0d7a6f
 *   tint callout bg    #e8f5f3
 *   bar track          #E6EEF0
 *   accent orange CTA  #f5a623
 * ------------------------------------------------------------------ */

const round = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? Math.round(n) : null;
};

// Short adjectives derived from the four MBTI poles. Lets the cover show
// data-driven trait pills (e.g. ISTJ → Reserved / Practical / Analytical /
// Structured) instead of hardcoding the mockup's placeholder tags.
const MBTI_ADJECTIVES = {
  I: "Reserved",
  E: "Outgoing",
  S: "Practical",
  N: "Imaginative",
  T: "Analytical",
  F: "Empathetic",
  J: "Structured",
  P: "Adaptable",
};

// Gardner intelligence display config, keyed by the section-2 subsection
// keys the scorer persists on sectionBreakdown. letter = the chip shown in
// the fingerprint.
const MI_DISPLAY = {
  logical_mathematical: { letter: "L", name: "Logical-Mathematical" },
  linguistic_verbal: { letter: "V", name: "Linguistic-Verbal" },
  spatial_visual: { letter: "S", name: "Spatial-Visual" },
  musical_rhythmic: { letter: "M", name: "Musical-Rhythmic" },
  bodily_kinesthetic: { letter: "B", name: "Bodily-Kinesthetic" },
  interpersonal: { letter: "P", name: "Interpersonal" },
  intrapersonal: { letter: "I", name: "Intrapersonal" },
  naturalistic: { letter: "N", name: "Naturalistic" },
};

const MI_GUIDANCE = {
  logical_mathematical:
    "Suited to analysis, research, and quantitative problem solving.",
  linguistic_verbal:
    "Well-suited to customer service, writing, and verbal-heavy professions.",
  spatial_visual: "Supports design, visualisation, and hands-on technical work.",
  musical_rhythmic: "Supports pattern, rhythm, and creative auditory work.",
  bodily_kinesthetic: "Supports hands-on, practical, physically engaged roles.",
  interpersonal: "Supports customer-facing and team-based careers.",
  intrapersonal: "Supports reflective, self-directed, independent work.",
  naturalistic: "Supports work with systems, environments, and the natural world.",
};

const RIASEC_DISPLAY = [
  { key: "realistic", letter: "R", name: "Realistic" },
  { key: "investigative", letter: "I", name: "Investigative" },
  { key: "artistic", letter: "A", name: "Artistic" },
  { key: "social", letter: "S", name: "Social" },
  { key: "enterprising", letter: "E", name: "Enterprising" },
  { key: "conventional", letter: "C", name: "Conventional" },
];

const APTITUDE_ORDER = [
  { key: "verbal_reasoning", name: "Verbal Reasoning" },
  { key: "numerical_ability", name: "Numerical Ability" },
  { key: "abstract_reasoning", name: "Abstract Reasoning" },
  { key: "spatial_relations", name: "Spatial Relations" },
  { key: "mechanical_reasoning", name: "Mechanical Reasoning" },
  { key: "clerical_accuracy", name: "Clerical Speed & Accuracy" },
  { key: "critical_thinking", name: "Critical Thinking" },
  { key: "problem_solving", name: "Problem Solving" },
];

// Section-5 subsection keys, in report order.
const EQ_ORDER = [
  { key: "self_awareness", name: "Self-Awareness" },
  { key: "self_regulation", name: "Self-Regulation" },
  { key: "motivation", name: "Motivation" },
  { key: "empathy", name: "Empathy" },
  { key: "social_skills", name: "Social Skills" },
];

// sectionBreakdown entries carry `sectionId` + `title` — they have no `key`
// (the persistence sanitize hook drops anything not in its whitelist). Match
// on sectionId first, then fall back to the title so packages that number
// their sections differently still resolve.
const SECTION_MATCHERS = {
  personality: { sectionId: 1, pattern: /personality/i },
  multiple_intelligence: { sectionId: 2, pattern: /multiple\s*intelligence/i },
  interest: { sectionId: 3, pattern: /interest/i },
  aptitude: { sectionId: 4, pattern: /aptitude/i },
  emotional_intelligence: { sectionId: 5, pattern: /emotional/i },
};

const APTITUDE_INTRO =
  "Aptitude measures your current, tested ability — not your ceiling. All aptitudes are developable with the right practice and environment.";

// Split a career-implication / interpretation string the scorer emits (it
// uses " | " or comma separators) into short tag pills.
const tagsFrom = (subsection, limit = 3) => {
  const raw = subsection?.careerImplication || "";
  const parts = String(raw)
    .split(/[|,;]/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (parts.length) return parts.slice(0, limit);
  const items = Array.isArray(subsection?.interpretationItems)
    ? subsection.interpretationItems.map((i) => i.title).filter(Boolean)
    : [];
  return items.slice(0, limit);
};

/* ------------------------------------------------------------------ *
 * Small presentational primitives
 * ------------------------------------------------------------------ */

function Card({ className = "", children }) {
  return (
    <div
      className={`surface-card report-print-card rounded-2xl p-5 sm:p-6 ${className}`}
    >
      {children}
    </div>
  );
}

function SectionBand({ num, title, subtitle, score }) {
  return (
    <div className="report-print-card flex items-center gap-4 rounded-2xl bg-[#128678] px-5 py-4 text-white sm:px-7 sm:py-5">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 border-white/40 text-sm font-bold">
        {num}
      </div>
      <div className="min-w-0 flex-1">
        <h2 className="text-lg font-bold leading-6 sm:text-xl">{title}</h2>
        {subtitle ? (
          <p className="mt-0.5 text-[11px] leading-4 text-white/80 sm:text-xs">
            {subtitle}
          </p>
        ) : null}
      </div>
      <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-full bg-white/15 text-center">
        <span className="text-base font-bold leading-none">
          {score == null ? "—" : score}
        </span>
        <span className="text-[9px] leading-none text-white/75">/ 100</span>
      </div>
    </div>
  );
}

function RingGauge({ value, label }) {
  const pct = round(value);
  const r = 18;
  const c = 2 * Math.PI * r;
  const dash = pct == null ? 0 : (Math.max(0, Math.min(100, pct)) / 100) * c;
  const color = pct == null ? "#CBD5E1" : pct < 34 ? "#f5a623" : "#128678";
  return (
    <div className="flex items-center gap-3">
      <svg width="46" height="46" viewBox="0 0 46 46" className="shrink-0">
        <circle cx="23" cy="23" r={r} fill="none" stroke="#E6EEF0" strokeWidth="5" />
        {pct == null ? null : (
          <circle
            cx="23"
            cy="23"
            r={r}
            fill="none"
            stroke={color}
            strokeWidth="5"
            strokeLinecap="round"
            strokeDasharray={`${dash} ${c}`}
            transform="rotate(-90 23 23)"
          />
        )}
      </svg>
      <div className="min-w-0">
        <p className="text-[11px] font-medium text-[#65758B]">{label}</p>
        <p className="text-sm font-bold text-[#0F1729]">
          {pct == null ? "—" : pct}
          <span className="font-semibold text-[#8A94A6]"> / 100</span>
        </p>
      </div>
    </div>
  );
}

function Bar({ label, value, max = 100, display, right }) {
  const n = Number(value);
  const pct = Number.isFinite(n)
    ? Math.max(0, Math.min(100, (n / max) * 100))
    : 0;
  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <span className="text-[13px] font-medium text-[#33414F]">{label}</span>
        <span className="flex items-center gap-2 text-[13px] font-semibold text-[#0d7a6f]">
          {display ?? (Number.isFinite(n) ? `${Math.round(n)}%` : "—")}
          {right}
        </span>
      </div>
      <div className="mt-1.5 h-2 rounded-full bg-[#E6EEF0]">
        <div
          className="h-2 rounded-full bg-[#128678]"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function levelFor(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return { label: "—", cls: "bg-[#EEF2F5] text-[#65758B]" };
  if (n >= 70) return { label: "High", cls: "bg-[#128678] text-white" };
  if (n >= 50) return { label: "Moderate", cls: "bg-[#d6ece9] text-[#0d7a6f]" };
  return { label: "Low", cls: "bg-[#EEF2F5] text-[#65758B]" };
}

function LevelChip({ value, className = "" }) {
  const lvl = levelFor(value);
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${lvl.cls} ${className}`}
    >
      {lvl.label}
    </span>
  );
}

function Pill({ children, tone = "teal" }) {
  const cls =
    tone === "muted"
      ? "border border-[#D9E2E8] text-[#4E5D72]"
      : "bg-[#e8f5f3] text-[#0d7a6f]";
  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-[12px] font-medium ${cls}`}
    >
      {children}
    </span>
  );
}

function Callout({ label, children, className = "" }) {
  return (
    <div
      className={`rounded-xl border-l-4 border-[#128678] bg-[#e8f5f3] p-4 ${className}`}
    >
      {label ? (
        <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#0d7a6f]">
          {label}
        </p>
      ) : null}
      <div className="mt-1.5 text-[13px] leading-6 text-[#33414F]">{children}</div>
    </div>
  );
}

// One labelled block inside a printed career profile (Career Overview,
// Key Skills, Education Pathway, ...). Keeps the five repeated
// label + body pairs readable.
function ProfileBlock({ label, children }) {
  return (
    <div className="mt-4">
      <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#8A94A6]">
        {label}
      </p>
      <div className="mt-2 text-[13px] leading-6 text-[#4E5D72]">{children}</div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

export default function StudentReport() {
  const { t } = useTranslation();
  const { reportId } = useParams();
  // Admin counsellor mode: ?adminView=1 routes the request through the
  // admin-only endpoint so an unapproved report still renders. The
  // student-facing flow leaves the query string empty and hits the
  // gated /v1/user/results/:reportId endpoint.
  const [searchParams] = useSearchParams();
  const adminView = searchParams.get("adminView") === "1";
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [payload, setPayload] = useState(() =>
    normalizeStudentReportPayload({})
  );
  const { printDocument } = usePrintableDocument();

  useEffect(() => {
    if (!reportId) {
      setLoading(false);
      setError("Result report not found.");
      return;
    }

    setLoading(true);
    const endpoint = adminView
      ? `/v1/admin/results/${reportId}/student-view`
      : `/v1/user/results/${reportId}`;
    api
      .get(endpoint)
      .then((res) => {
        setPayload(normalizeStudentReportPayload(res?.data?.data || {}));
      })
      .catch((err) => {
        setError(err?.response?.data?.msg || "Failed to load this report.");
      })
      .finally(() => setLoading(false));
  }, [reportId, adminView]);

  if (loading) return <StudentReportSkeleton />;

  if (error) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center bg-[#F7F8FA] px-4">
        <div className="surface-card w-full max-w-2xl rounded-[28px] p-8 text-center">
          <h1 className="text-3xl font-bold text-[#0F1729]">
            {t("report.unavailableHeading")}
          </h1>
          <p className="mt-3 text-[#65758B]">{error}</p>
          <Link to="/result" className="primary-btn mt-6">
            {t("report.backToResults")}
          </Link>
        </div>
      </div>
    );
  }

  if (!payload.hasAccess) {
    return (
      <ResultPendingPanel
        heading={t("report.underReviewHeading")}
        description={t("report.underReviewBody")}
      />
    );
  }

  const report = payload.report || {};
  const pp = report.personalityProfile || {};
  const sections = Array.isArray(report.sectionBreakdown)
    ? report.sectionBreakdown
    : [];
  const findSection = (key) => {
    const matcher = SECTION_MATCHERS[key];
    if (!matcher) return null;
    return (
      sections.find((s) => s.key === key) ||
      sections.find((s) => Number(s.sectionId) === matcher.sectionId) ||
      sections.find((s) => matcher.pattern.test(String(s.title || ""))) ||
      null
    );
  };
  const sectionScore = (key) => round(findSection(key)?.percentage);
  const findSub = (sk, subk) =>
    findSection(sk)?.subsections?.find((x) => x.key === subk) || null;

  const scores = {
    personality: sectionScore("personality"),
    intelligence: sectionScore("multiple_intelligence"),
    interests: sectionScore("interest"),
    aptitude: sectionScore("aptitude"),
    eq: sectionScore("emotional_intelligence"),
  };
  const overall = round(report.summary?.overallScore);

  // ---- Cover / identity -------------------------------------------------
  const student = report.student || {};
  const studentName = String(student.name || "").trim() || "Student";
  const reportDate = formatStudentDate(report.submittedAt || report.approvedAt);
  const reportDateValue = report.submittedAt || report.approvedAt;
  const parsedYear = reportDateValue
    ? new Date(reportDateValue).getFullYear()
    : null;
  const reportYear = Number.isFinite(parsedYear) ? parsedYear : "";

  const personalityType = report.personalityType || {};
  const code = personalityType.code || pp.personalityType || "";
  const mbti = pp.mbtiType || code.replace(/-[AT]$/, "");
  const assertiveness =
    pp.assertiveness ||
    (code.endsWith("-A") ? "Assertive" : code.endsWith("-T") ? "Turbulent" : "");
  const archetype = personalityType.title || pp.archetypeName || "";
  const archetypeLine = archetype
    ? /^the\b/i.test(archetype)
      ? archetype
      : `The ${archetype}`
    : "";
  const description =
    personalityType.description || pp.archetypeDescription || "";
  const mbtiTraits = Array.isArray(personalityType.traits)
    ? personalityType.traits
    : [];
  const coverPills = mbti
    .split("")
    .map((letter) => MBTI_ADJECTIVES[letter])
    .filter(Boolean);

  // ---- Section 01: OCEAN / HSPQ / work style ---------------------------
  const OCEAN = [
    { letter: "O", name: "Openness", key: "openness" },
    { letter: "C", name: "Conscientiousness", key: "conscientiousness" },
    { letter: "E", name: "Extraversion", key: "extraversion" },
    { letter: "A", name: "Agreeableness", key: "agreeableness" },
    { letter: "N", name: "Neuroticism", key: "neuroticism" },
  ];
  const bigFiveSub = findSub("personality", "big_five_ocean");
  // The trait scores live on the subsection's factorResults, keyed by trait
  // name — `report.personalityProfile.oceanProfile` is never populated by the
  // career500q scorer, so reading it always yielded dashes.
  const oceanProfile = Object.fromEntries(
    (bigFiveSub?.factorResults || []).map((f) => [f.key, f])
  );
  // "Dominant" = the two strongest measured traits, highlighted on the cards.
  const dominantTraits = new Set(
    (bigFiveSub?.factorResults || [])
      .filter((f) => Number.isFinite(Number(f.average)))
      .sort((a, b) => Number(b.average) - Number(a.average))
      .slice(0, 2)
      .map((f) => String(f.key).toLowerCase())
  );
  const oceanAvgPct = round(bigFiveSub?.percentage);

  const hspqSub = findSub("personality", "hspq_factors");
  const hspqFactors = (hspqSub?.factorResults || [])
    .filter((f) => Number.isFinite(Number(f.average)))
    .sort((a, b) => Number(b.average) - Number(a.average))
    .slice(0, 4);
  const hspqPct = round(hspqSub?.percentage);
  const hspqTags = tagsFrom(hspqSub, 3);

  const leadershipSub = findSub("personality", "leadership_social_interaction");
  const workStyleSub = findSub("personality", "work_style_preferences");
  const workLeadPct = round(
    leadershipSub?.percentage != null
      ? leadershipSub.percentage
      : workStyleSub?.percentage
  );
  // Top leadership signals, rendered as bars alongside the narrative.
  const leadershipFactors = (leadershipSub?.factorResults || [])
    .filter((f) => Number.isFinite(Number(f.average)))
    .sort((a, b) => Number(b.average) - Number(a.average));
  const workStyleNote = [leadershipSub?.interpretation, workStyleSub?.interpretation]
    .filter(Boolean)
    .join(" ");
  const developingAreas = (leadershipSub?.factorResults || [])
    .filter((f) => Number.isFinite(Number(f.average)))
    .sort((a, b) => Number(a.average) - Number(b.average))
    .slice(0, 3)
    .map((f) => f.label);

  // ---- Section 02: Multiple Intelligence -------------------------------
  // Each Gardner domain is its own subsection of section 2 (`percentage` is
  // the 0-100 signal, `average` the raw x/5). `report.multipleIntelligences`
  // is an internal career-matcher intermediate and is always {} on the
  // persisted report, so it can't be the source here.
  const miSubs = findSection("multiple_intelligence")?.subsections || [];
  const miRows = miSubs
    .map((sub) => ({
      key: sub.key,
      letter: MI_DISPLAY[sub.key]?.letter || String(sub.label || "?").trim()[0],
      name: MI_DISPLAY[sub.key]?.name || String(sub.label || "").replace(/^[\d.]+\s*/, ""),
      value: Number(sub.percentage),
      average: sub.average,
      interpretation: sub.interpretation || "",
      careerImplication: sub.careerImplication || "",
    }))
    .filter((r) => Number.isFinite(r.value))
    .sort((a, b) => b.value - a.value);
  const miHighest = miRows[0] || null;
  const miSecond = miRows[1] || null;
  const miDeveloping = miRows.length ? miRows[miRows.length - 1] : null;

  // ---- Section 03: Interests -------------------------------------------
  const hollandSub = findSub("interest", "holland_riasec");
  const hollandFactors = hollandSub?.factorResults || [];
  const hollandByKey = Object.fromEntries(hollandFactors.map((f) => [f.key, f]));
  const rankedHolland = [...hollandFactors]
    .filter((f) => Number.isFinite(Number(f.average)))
    .sort((a, b) => Number(b.average) - Number(a.average));
  const topHollandKeys = new Set(rankedHolland.slice(0, 2).map((f) => f.key));
  const hollandCode = rankedHolland
    .slice(0, 2)
    .map((f) => RIASEC_DISPLAY.find((r) => r.key === f.key)?.letter || "")
    .join("");
  const hollandPct = round(hollandSub?.percentage);

  const subjectSub = findSub("interest", "subject_preferences");
  // Persisted reports carry no per-cluster breakdown for subject preferences
  // (clusterResults is empty) — the ranked subject list is emitted in the
  // interpretation string ("Top subject pull: A, B, and C."). Use the
  // clusters when a scorer does supply them, else read the narrative.
  const subjectClusters = (subjectSub?.clusterResults || [])
    .filter((c) => Number.isFinite(Number(c.average)))
    .sort((a, b) => Number(b.average) - Number(a.average))
    .slice(0, 3);
  const subjectNames = subjectClusters.length
    ? subjectClusters.map((c) => c.label)
    : String(subjectSub?.interpretation || "")
        .split(":")
        .slice(1)
        .join(":")
        .replace(/\.\s*$/, "")
        // Split on commas only — subject names themselves contain "and"
        // ("Business and Economics"), so an "and" separator would shred them.
        // The Oxford "and" before the last item is stripped per-item below.
        .split(",")
        .map((s) => s.replace(/^\s*and\s+/i, "").trim())
        .filter(Boolean)
        .slice(0, 3);
  const topSubjectLabel = subjectSub?.band || subjectNames[0] || "";
  const topSubjectPct = round(subjectSub?.percentage);
  const subjectBandLabels = ["Top", "High", "Mid"];

  const envSub = findSub("interest", "work_environment_preferences");
  // `profileBreakdown` is dropped by the report sanitize hook, so persisted
  // reports only carry the dominant `band`. Prefer the breakdown when the
  // live scorer output is available, else fall back to the dominant band.
  const envPills = ((envSub?.profileBreakdown || [])
    .map((p) => p.label)
    .filter(Boolean)
    .slice(0, 3));
  if (!envPills.length && envSub?.band) envPills.push(envSub.band);
  if (envSub?.careerImplication) {
    String(envSub.careerImplication)
      .split(/[|,]/)
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 3)
      .forEach((p) => {
        if (!envPills.includes(p)) envPills.push(p);
      });
  }
  const activitySub = findSub("interest", "activity_preferences");

  // ---- Section 04: Aptitude --------------------------------------------
  const aptSubs = findSection("aptitude")?.subsections || [];
  const aptByKey = Object.fromEntries(aptSubs.map((s) => [s.key, s]));
  const aptitudeInterpretation = findSection("aptitude")?.interpretation || "";

  // ---- Section 05: Emotional Intelligence ------------------------------
  // Same story as MI: each competency is a section-5 subsection.
  // `report.eqProfile` is a career-matcher intermediate and is always {}.
  const eqSubs = findSection("emotional_intelligence")?.subsections || [];
  const eqByKey = Object.fromEntries(eqSubs.map((s) => [s.key, s]));
  const eqRows = EQ_ORDER.map(({ key, name }) => {
    const sub = eqByKey[key];
    return {
      key,
      name,
      value: Number(sub?.percentage),
      average: sub?.average,
      interpretation: sub?.interpretation || "",
    };
  }).filter((r) => Number.isFinite(r.value));
  const eqStrongest = eqRows.length
    ? eqRows.reduce((a, b) => (b.value > a.value ? b : a))
    : null;
  const eqDeveloping = [...eqRows]
    .sort((a, b) => a.value - b.value)
    .slice(0, 3);

  const careers = Array.isArray(report.careerRecommendations)
    ? report.careerRecommendations
    : [];

  // ---- Section 06: Detailed Career Report ------------------------------
  const strengths = Array.isArray(report.strengths) ? report.strengths : [];
  const bestFit = careers[0] || null;
  const bestFitMatch = round(
    bestFit?.matchPercent != null ? bestFit.matchPercent : bestFit?.score
  );
  const topCategory = bestFit?.category || miHighest?.name || "—";
  const fields = [...new Set(careers.map((c) => c.category).filter(Boolean))].slice(
    0,
    8
  );

  const topTwoMi = miRows
    .slice(0, 2)
    .map((r) => r.name.replace(/-Verbal|-Visual/g, ""))
    .join("–");
  const noteText = `${
    topTwoMi
      ? `Your strongest combination is a ${topTwoMi} intelligence profile`
      : "Your profile is still taking shape"
  }${code ? ` with an ${code} personality` : ""}. This report is a starting point — a mirror, not a map. Use it to have honest conversations with your parents, counsellors, and mentors. The right environment and guidance will unlock far more than these scores suggest.`;

  const handleDownload = () => {
    void printDocument();
  };

  return (
    <div className="report-print-page bg-[#F7F8FA]">
      <div className="report-print-root mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
        {/* Screen-only top bar (hidden in the PDF) */}
        <div className="report-print-hidden mb-6 flex items-center justify-between gap-4">
          {/* Admin counsellor mode arrived here from the review page, so the
              back link must return there rather than dumping the admin on the
              student results page (which shows the ADMIN's own account and has
              no route back to /admin). Student flow is unchanged. */}
          <Link
            to={adminView ? `/admin/testsubmissions/${reportId}` : "/result"}
            className="inline-flex items-center gap-2 text-sm font-semibold text-[#4E5D72] hover:text-[#0d7a6f]"
          >
            <ArrowLeft className="h-4 w-4" />
            {adminView ? "Back to Submission" : t("report.backToResults")}
          </Link>
          <button
            type="button"
            onClick={handleDownload}
            className="inline-flex items-center justify-center gap-2 rounded-full border border-[#B6DFE4] bg-white px-5 py-2.5 text-sm font-semibold text-[#0d7a6f] hover:bg-[#F6FDFC]"
          >
            <Download className="h-4 w-4" />
            {t("result.downloadReport")}
          </button>
        </div>

        {report?.isDemo ? (
          <div className="mb-6 flex items-start gap-3 rounded-2xl border border-[#F5D9A6] bg-[#FFF9EE] px-5 py-4 text-[#8C5A00]">
            <Sparkles className="mt-1 h-5 w-5 shrink-0 text-[#F59F0A]" />
            <div>
              <p className="text-sm font-semibold text-[#0F1729]">
                {t("result.demoBannerTitle")}
              </p>
              <p className="mt-1 text-sm leading-6">{t("result.demoBannerBody")}</p>
            </div>
          </div>
        ) : null}

        {/* ============================ COVER ============================ */}
        <Card className="!p-0">
          <div className="flex items-center justify-between gap-4 border-b border-[#E8EDF3] px-6 py-4 sm:px-8">
            <div className="flex items-center gap-3">
              <img
                src={jumpstartLogo}
                alt={company.brandName}
                width="333"
                height="235"
                className="report-print-logo h-9 w-auto"
              />
            </div>
            <p className="text-right text-[12px] text-[#8A94A6]">
              Career Assessment Report · {reportDate}
            </p>
          </div>

          <div className="grid gap-8 px-6 py-7 sm:px-8 sm:py-9 md:grid-cols-[1.6fr_1fr]">
            <div className="md:border-r md:border-[#EEF2F5] md:pr-8">
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#0d7a6f]">
                Career Discovery &amp; Guidance Report{reportYear ? ` · ${reportYear}` : ""}
              </p>
              <h1 className="mt-2 text-4xl font-bold leading-tight text-[#0F1729] sm:text-5xl">
                {studentName}
              </h1>
              {code || archetypeLine ? (
                <p className="mt-2 text-lg font-semibold text-[#0d7a6f]">
                  {[code, archetypeLine].filter(Boolean).join(" · ")}
                </p>
              ) : null}
              {description ? (
                <p className="mt-4 max-w-xl text-[14px] leading-6 text-[#4E5D72]">
                  {description}
                </p>
              ) : null}
              {coverPills.length ? (
                <div className="mt-5 flex flex-wrap gap-2">
                  {coverPills.map((p) => (
                    <Pill key={p} tone="muted">
                      {p}
                    </Pill>
                  ))}
                </div>
              ) : null}
              {student.jumpstartId ? (
                <p className="mt-5 text-[11px] font-medium text-[#8A94A6]">
                  {company.brandName} ID: {student.jumpstartId}
                  {student.profile?.schoolOrCollege
                    ? ` · ${student.profile.schoolOrCollege}`
                    : ""}
                </p>
              ) : null}
            </div>

            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#8A94A6]">
                Assessment Scores
              </p>
              <div className="mt-4 space-y-3.5">
                <RingGauge label="Personality" value={scores.personality} />
                <RingGauge label="Intelligence" value={scores.intelligence} />
                <RingGauge label="Interests" value={scores.interests} />
                <RingGauge label="Aptitude" value={scores.aptitude} />
                <RingGauge label="Emotional IQ" value={scores.eq} />
              </div>
            </div>
          </div>
        </Card>

        {/* ===================== 01 · PERSONALITY ======================= */}
        <section className="report-print-page-break-before mt-8">
          <SectionBand
            num="01"
            title="Personality Assessment"
            subtitle="MBTI · Big Five (OCEAN) · HSPQ · Work Style · Leadership"
            score={scores.personality}
          />

          <div className="mt-6 space-y-6">
            <Card>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="text-[15px] font-bold text-[#0F1729]">
                  MBTI dimension scores
                </h3>
                {mbti ? (
                  <Pill>
                    {[code || mbti, assertiveness].filter(Boolean).join(" · ")}
                  </Pill>
                ) : null}
              </div>
              <div className="mt-5 grid gap-6 md:grid-cols-[1.3fr_1fr]">
                <div className="space-y-4">
                  {mbtiTraits.length ? (
                    mbtiTraits.map((tr) => (
                      <Bar key={tr.name} label={tr.name} value={tr.value} />
                    ))
                  ) : (
                    <p className="text-[13px] text-[#8A94A6]">
                      MBTI dimension data is not available for this report.
                    </p>
                  )}
                </div>
                {mbtiTraits.length ? (
                  <Callout label="What this means for you">
                    {(() => {
                      const top = [...mbtiTraits].sort(
                        (a, b) => Number(b.value) - Number(a.value)
                      )[0];
                      const second = [...mbtiTraits].sort(
                        (a, b) => Number(b.value) - Number(a.value)
                      )[1];
                      if (!top) return description || "";
                      return `${top.name} (${round(top.value)}%) is your strongest signal${
                        second ? `, combined with ${second.name}` : ""
                      }. ${description || ""}`.trim();
                    })()}
                  </Callout>
                ) : null}
              </div>
            </Card>

            <Card>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="text-[15px] font-bold text-[#0F1729]">
                  Big Five (OCEAN)
                </h3>
                {oceanAvgPct != null ? (
                  <Pill>
                    {oceanAvgPct}% · {levelFor(oceanAvgPct).label}
                  </Pill>
                ) : null}
              </div>
              <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-5">
                {OCEAN.map(({ letter, name, key }) => {
                  const entry = oceanProfile[key] || {};
                  const isDominant =
                    dominantTraits.has(key) || dominantTraits.has(name.toLowerCase());
                  const display =
                    entry.average != null
                      ? `${entry.average} / 5`
                      : entry.band && entry.band !== "Not Measured"
                        ? entry.band
                        : "—";
                  return (
                    <div
                      key={key}
                      className={`rounded-xl border p-3 text-center ${
                        isDominant
                          ? "border-[#128678] bg-[#f2fbfa]"
                          : "border-[#E4EAF0] bg-[#FBFCFD]"
                      }`}
                    >
                      <p className="text-lg font-bold text-[#0d7a6f]">{letter}</p>
                      <p className="mt-0.5 text-[10px] font-medium text-[#65758B]">
                        {name}
                      </p>
                      <p className="mt-1.5 text-[12px] font-semibold text-[#0F1729]">
                        {display}
                      </p>
                      {entry.band ? (
                        <p className="mt-0.5 text-[10px] font-medium text-[#8A94A6]">
                          {entry.band}
                        </p>
                      ) : null}
                    </div>
                  );
                })}
              </div>
              {bigFiveSub?.interpretation ? (
                <p className="mt-4 text-[13px] leading-6 text-[#4E5D72]">
                  {bigFiveSub.interpretation}
                </p>
              ) : null}
            </Card>

            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-[15px] font-bold text-[#0F1729]">
                    HSPQ personality factors
                  </h3>
                  {hspqPct != null ? <Pill>{hspqPct}%</Pill> : null}
                </div>
                <div className="mt-4 space-y-3.5">
                  {hspqFactors.length ? (
                    hspqFactors.map((f) => (
                      <Bar
                        key={f.key}
                        label={f.label}
                        value={f.average}
                        max={5}
                        display={f.average != null ? `${f.average}` : "—"}
                      />
                    ))
                  ) : (
                    <p className="text-[13px] text-[#8A94A6]">
                      HSPQ factor data is not available.
                    </p>
                  )}
                </div>
                {hspqTags.length ? (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {hspqTags.map((tag) => (
                      <Pill key={tag}>{tag}</Pill>
                    ))}
                  </div>
                ) : null}
              </Card>

              <Card>
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-[15px] font-bold text-[#0F1729]">
                    Work style &amp; leadership
                  </h3>
                  {workLeadPct != null ? <Pill>{workLeadPct}%</Pill> : null}
                </div>
                <p className="mt-4 text-[13px] leading-6 text-[#4E5D72]">
                  {workStyleNote ||
                    "Leadership and work-style signals will appear here when assessed."}
                </p>
                {leadershipFactors.length ? (
                  <div className="mt-4 space-y-3.5">
                    {leadershipFactors.map((f) => (
                      <Bar
                        key={f.key}
                        label={f.label}
                        value={f.average}
                        max={5}
                        display={`${f.average}`}
                      />
                    ))}
                  </div>
                ) : null}
                {developingAreas.length ? (
                  <div className="mt-4 rounded-xl bg-[#F8FAFC] p-4">
                    <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#8A94A6]">
                      Development areas
                    </p>
                    <p className="mt-1.5 text-[13px] text-[#4E5D72]">
                      {developingAreas.join(" · ")}
                    </p>
                  </div>
                ) : null}
              </Card>
            </div>
          </div>
        </section>

        {/* ================= 02 · MULTIPLE INTELLIGENCE ================= */}
        <section className="report-print-page-break-before mt-8">
          <SectionBand
            num="02"
            title="Multiple Intelligence"
            subtitle="Gardner's Eight Intelligence Domains · Questions 121–200"
            score={scores.intelligence}
          />
          <div className="mt-6 space-y-6">
            <Card>
              <h3 className="text-[15px] font-bold text-[#0F1729]">
                Intelligence fingerprint
              </h3>
              <div className="mt-5 space-y-3.5">
                {miRows.length ? (
                  miRows.map((r) => (
                    <div key={r.key} className="flex items-center gap-3">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[#e8f5f3] text-[12px] font-bold text-[#0d7a6f]">
                        {r.letter}
                      </span>
                      <div className="flex-1">
                        <Bar
                          label={r.name}
                          value={r.value}
                          right={<LevelChip value={r.value} />}
                        />
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-[13px] text-[#8A94A6]">
                    Multiple-intelligence data is not available.
                  </p>
                )}
              </div>
            </Card>

            {miRows.length ? (
              <div className="grid gap-4 sm:grid-cols-3">
                {[
                  { tag: "Highest", row: miHighest },
                  { tag: "Second strongest", row: miSecond },
                  { tag: "Most developing", row: miDeveloping },
                ]
                  .filter((c) => c.row)
                  .map(({ tag, row }) => (
                    <Card key={tag} className="!bg-[#f2fbfa]">
                      <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#0d7a6f]">
                        {tag}
                      </p>
                      <p className="mt-1 text-[15px] font-bold text-[#0F1729]">
                        {row.name}
                      </p>
                      <p className="mt-2 text-[12px] leading-5 text-[#4E5D72]">
                        {MI_GUIDANCE[row.key] ||
                          row.careerImplication ||
                          row.interpretation ||
                          "A developable capability in your profile."}
                      </p>
                    </Card>
                  ))}
              </div>
            ) : null}
          </div>
        </section>

        {/* ===================== 03 · INTERESTS ========================= */}
        <section className="report-print-page-break-before mt-8">
          <SectionBand
            num="03"
            title="Interest Assessment"
            subtitle="Holland Code (RIASEC) · Subject Preferences · Activity & Environment"
            score={scores.interests}
          />
          <div className="mt-6 space-y-6">
            <Card>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="text-[15px] font-bold text-[#0F1729]">
                  Holland Code (RIASEC)
                </h3>
                {hollandCode ? (
                  <Pill>
                    {hollandCode} Profile{hollandPct != null ? ` · ${hollandPct}%` : ""}
                  </Pill>
                ) : null}
              </div>
              <div className="mt-5 grid grid-cols-3 gap-3 sm:grid-cols-6">
                {RIASEC_DISPLAY.map(({ key, letter, name }) => {
                  const factor = hollandByKey[key];
                  const isTop = topHollandKeys.has(key);
                  return (
                    <div
                      key={key}
                      className={`rounded-xl border p-3 text-center ${
                        isTop
                          ? "border-transparent bg-[#128678] text-white"
                          : "border-[#E4EAF0] bg-[#FBFCFD] text-[#65758B]"
                      }`}
                    >
                      <p
                        className={`text-xl font-bold ${
                          isTop ? "text-white" : "text-[#0F1729]"
                        }`}
                      >
                        {letter}
                      </p>
                      <p
                        className={`mt-0.5 text-[10px] ${
                          isTop ? "text-white/85" : "text-[#8A94A6]"
                        }`}
                      >
                        {name}
                      </p>
                      <p className="mt-1.5 text-[12px] font-semibold">
                        {factor?.average != null ? `${factor.average}/5` : "—"}
                      </p>
                      {factor?.band ? (
                        <p
                          className={`mt-0.5 text-[9px] font-medium ${
                            isTop ? "text-white/75" : "text-[#8A94A6]"
                          }`}
                        >
                          {factor.band}
                        </p>
                      ) : null}
                    </div>
                  );
                })}
              </div>
              {hollandSub?.interpretation ? (
                <Callout label={`${hollandCode || "RIASEC"} Profile`} className="mt-5">
                  {hollandSub.interpretation}
                </Callout>
              ) : null}
            </Card>

            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <h3 className="text-[15px] font-bold text-[#0F1729]">
                  Subject preferences
                  {topSubjectLabel ? (
                    <span className="font-medium text-[#8A94A6]">
                      {" "}
                      · {topSubjectLabel}
                      {topSubjectPct != null ? ` ${topSubjectPct}%` : ""}
                    </span>
                  ) : null}
                </h3>
                <div className="mt-4 space-y-3.5">
                  {subjectClusters.length ? (
                    subjectClusters.map((c, i) => (
                      <Bar
                        key={c.key || c.label}
                        label={c.label}
                        value={c.average}
                        max={5}
                        display={
                          subjectBandLabels[i] || c.band || `${c.average}`
                        }
                      />
                    ))
                  ) : subjectSub?.average != null ? (
                    <Bar
                      label={`Overall subject pull${
                        subjectSub.band ? ` · ${subjectSub.band}` : ""
                      }`}
                      value={subjectSub.average}
                      max={5}
                      display={`${subjectSub.average} / 5`}
                    />
                  ) : (
                    <p className="text-[13px] text-[#8A94A6]">
                      Subject-preference data is not available.
                    </p>
                  )}
                </div>
                {!subjectClusters.length && subjectNames.length ? (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {subjectNames.map((name, i) => (
                      <Pill key={name} tone={i === 0 ? "teal" : "muted"}>
                        {subjectBandLabels[i] ? `${subjectBandLabels[i]} · ` : ""}
                        {name}
                      </Pill>
                    ))}
                  </div>
                ) : null}
              </Card>

              <Card>
                <h3 className="text-[15px] font-bold text-[#0F1729]">
                  Environment fit
                </h3>
                {envPills.length ? (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {envPills.map((p) => (
                      <Pill key={p}>{p}</Pill>
                    ))}
                  </div>
                ) : null}
                {activitySub ? (
                  <div className="mt-4 rounded-xl bg-[#F8FAFC] p-4">
                    <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#8A94A6]">
                      Activity preference
                    </p>
                    <p className="mt-1.5 text-[13px] leading-6 text-[#4E5D72]">
                      {activitySub.band
                        ? `${activitySub.band} pull${
                            activitySub.percentage != null
                              ? ` (${round(activitySub.percentage)}% consistency)`
                              : ""
                          } — `
                        : ""}
                      {activitySub.interpretation || ""}
                    </p>
                  </div>
                ) : null}
              </Card>
            </div>
          </div>
        </section>

        {/* ==================== 04 · APTITUDE =========================== */}
        <section className="report-print-page-break-before mt-8">
          <SectionBand
            num="04"
            title="Aptitude Battery"
            subtitle="Verbal · Numerical · Abstract · Spatial · Mechanical · Clerical · Critical Thinking · Problem Solving"
            score={scores.aptitude}
          />
          <div className="mt-6 space-y-6">
            <Card>
              <p className="text-[13px] leading-6 text-[#4E5D72]">
                {APTITUDE_INTRO}
              </p>
              <div className="mt-5 divide-y divide-[#EEF2F5]">
                {APTITUDE_ORDER.map(({ key, name }) => {
                  const s = aptByKey[key];
                  const pending =
                    !s ||
                    s.score == null ||
                    /review/i.test(String(s.band || "")) ||
                    /review/i.test(String(s.status || ""));
                  const scoreLabel = pending
                    ? "—"
                    : `${s.rawScore != null ? s.rawScore : s.score}/${
                        s.maxScore != null ? s.maxScore : "—"
                      }`;
                  const guidance = pending
                    ? "Manual review pending"
                    : s.careerImplication || s.interpretation || "";
                  return (
                    <div
                      key={key}
                      className="flex items-start gap-4 py-3 first:pt-0"
                    >
                      <span className="w-40 shrink-0 text-[13px] font-semibold text-[#0F1729]">
                        {name}
                      </span>
                      <span
                        className={`w-14 shrink-0 text-[13px] font-bold ${
                          pending ? "text-[#B4BEC9]" : "text-[#0d7a6f]"
                        }`}
                      >
                        {scoreLabel}
                      </span>
                      <span
                        className={`flex-1 text-[12px] leading-5 ${
                          pending ? "text-[#B4BEC9]" : "text-[#65758B]"
                        }`}
                      >
                        {guidance}
                      </span>
                    </div>
                  );
                })}
              </div>
            </Card>

            {aptitudeInterpretation ? (
              <Callout label="Interpreting your scores">
                {aptitudeInterpretation}
              </Callout>
            ) : null}
          </div>
        </section>

        {/* ============= 05 · EMOTIONAL INTELLIGENCE =================== */}
        <section className="report-print-page-break-before mt-8">
          <SectionBand
            num="05"
            title="Emotional Intelligence"
            subtitle="Self-Awareness · Self-Regulation · Motivation · Empathy · Social Skills"
            score={scores.eq}
          />
          <div className="mt-6 space-y-6">
            <Card>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                {eqRows.length ? (
                  eqRows.map((r) => {
                    const isTop = eqStrongest && r.name === eqStrongest.name;
                    const lvl = levelFor(r.value);
                    return (
                      <div
                        key={r.name}
                        className={`rounded-xl border p-3 text-center ${
                          isTop
                            ? "border-transparent bg-[#128678] text-white"
                            : "border-[#E4EAF0] bg-[#FBFCFD]"
                        }`}
                      >
                        <p
                          className={`text-xl font-bold ${
                            isTop ? "text-white" : "text-[#0F1729]"
                          }`}
                        >
                          {round(r.value)}%
                        </p>
                        <p
                          className={`mt-0.5 text-[10px] ${
                            isTop ? "text-white/85" : "text-[#65758B]"
                          }`}
                        >
                          {r.name}
                        </p>
                        <span
                          className={`mt-1.5 inline-flex rounded-full px-2 py-0.5 text-[9px] font-semibold ${
                            isTop ? "bg-white/20 text-white" : lvl.cls
                          }`}
                        >
                          {lvl.label}
                        </span>
                      </div>
                    );
                  })
                ) : (
                  <p className="col-span-full text-[13px] text-[#8A94A6]">
                    Emotional-intelligence data is not available.
                  </p>
                )}
              </div>

              {eqRows.length ? (
                <div className="mt-6 grid gap-5 md:grid-cols-2">
                  <div className="rounded-xl bg-[#F8FAFC] p-4">
                    <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#8A94A6]">
                      Developing areas
                    </p>
                    <div className="mt-2 space-y-1.5">
                      {eqDeveloping.map((r) => (
                        <p key={r.name} className="text-[13px] text-[#4E5D72]">
                          <span className="font-semibold text-[#0F1729]">
                            {r.name} ({round(r.value)}%)
                          </span>
                        </p>
                      ))}
                    </div>
                  </div>
                  {eqStrongest ? (
                    <Callout label="Your biggest strength">
                      <p className="text-[15px] font-bold text-[#0d7a6f]">
                        {eqStrongest.name} · {round(eqStrongest.value)}%
                      </p>
                      <p className="mt-1.5">
                        {eqStrongest.interpretation ||
                          "Your strongest emotional-intelligence signal — lead with it as you choose environments and roles."}
                      </p>
                    </Callout>
                  ) : null}
                </div>
              ) : null}
            </Card>

            {careers.length ? (
              <Card>
                <h3 className="text-[15px] font-bold text-[#0F1729]">
                  Strongly aligned careers
                </h3>
                <div className="mt-4 flex flex-wrap gap-2">
                  {careers.map((c, i) => (
                    <span
                      key={`${c.title}-${i}`}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-[#E4EAF0] bg-white px-3 py-2 text-[12px] font-medium text-[#33414F]"
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-[#128678]" />
                      {c.title}
                    </span>
                  ))}
                </div>
              </Card>
            ) : null}
          </div>
        </section>

        {/* ============= 06 · DETAILED CAREER REPORT ================== */}
        <section className="report-print-page-break-before mt-8">
          <SectionBand
            num="06"
            title="Your Detailed Career Report"
            subtitle="Comprehensive analysis of your career aptitude assessment"
            score={overall}
          />
          <div className="mt-6 space-y-6">
            <div className="grid gap-4 sm:grid-cols-3">
              <Card>
                <p className="text-[12px] font-semibold text-[#65758B]">
                  Overall Score
                </p>
                <p className="mt-2 text-3xl font-bold text-[#0F1729]">
                  {overall == null ? "—" : overall}
                  <span className="text-lg text-[#8A94A6]">/100</span>
                </p>
                <div className="mt-3 h-2 rounded-full bg-[#E6EEF0]">
                  <div
                    className="h-2 rounded-full bg-[#128678]"
                    style={{ width: `${Math.max(0, Math.min(100, overall || 0))}%` }}
                  />
                </div>
                {report.overallPercentile ? (
                  <p className="mt-2 text-[11px] text-[#8A94A6]">
                    {report.overallPercentile}
                  </p>
                ) : null}
              </Card>
              <Card>
                <p className="text-[12px] font-semibold text-[#65758B]">
                  Top Category
                </p>
                <p className="mt-2 text-xl font-bold text-[#0F1729]">
                  {topCategory}
                </p>
                <p className="mt-2 text-[12px] text-[#65758B]">
                  Your strongest aligned career field.
                </p>
              </Card>
              <Card>
                <p className="text-[12px] font-semibold text-[#65758B]">Best Fit</p>
                <p className="mt-2 text-xl font-bold text-[#0F1729]">
                  {bestFit?.title || "—"}
                </p>
                <p className="mt-2 text-[12px] text-[#65758B]">
                  {bestFitMatch != null
                    ? `${bestFitMatch}% match with your profile`
                    : "Match analysis pending"}
                </p>
              </Card>
            </div>

            {strengths.length ? (
              <Card>
                <h3 className="text-[15px] font-bold text-[#0F1729]">
                  Personality Profile
                </h3>
                <div className="mt-4 space-y-3.5">
                  {strengths.map((s) => (
                    <Bar key={s.name} label={s.name} value={s.value} />
                  ))}
                </div>
              </Card>
            ) : null}

            {fields.length ? (
              <Card>
                <h3 className="text-[15px] font-bold text-[#0F1729]">
                  Fields to explore
                </h3>
                <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {fields.map((f) => (
                    <div
                      key={f}
                      className="rounded-xl border border-[#E4EAF0] bg-[#FBFCFD] px-3 py-3 text-center text-[12px] font-medium text-[#33414F]"
                    >
                      {f}
                    </div>
                  ))}
                </div>
              </Card>
            ) : null}

            {/* Print-only per-career profiles — one full page per
                recommended career. Hidden on screen via `report-print-only`;
                revealed by @media print and by the body class the Download
                button toggles. Each block carries `report-print-career-page`
                so the printer breaks after it. Sits between the Section 06
                summary and the CTA so the CTA stays last in the PDF. */}
            {careers.length ? (
              <div className="report-print-only report-print-page-break-before hidden">
                {/* Plain <div>, not <header>: the print rule hides bare
                    `header` elements, which silently dropped this section's
                    title and subtitle from the PDF. Spacing/classes unchanged. */}
                <div className="mb-4">
                  <h2 className="text-[22px] font-bold leading-8 text-[#0F1729]">
                    {t("report.yourCareerProfiles")}
                  </h2>
                  <p className="mt-1 text-[13px] leading-6 text-[#65758B]">
                    {t("report.yourCareerProfilesSubtitle")}
                  </p>
                </div>

                {careers.map((career, index) => {
                  const detail = getCareerDetailContent(career);
                  const match = round(
                    detail.score != null ? detail.score : detail.matchPercent
                  );
                  // Prefer the curated one-line environment sentence; fall back
                  // to the employer list for careers missing from the table.
                  const workEnvironment =
                    detail.workEnvironment ||
                    (detail.companies?.length
                      ? `Common employers include ${detail.companies
                          .slice(0, 5)
                          .join(", ")}.`
                      : "");
                  const outlook = detail.outlook || {};
                  const outlookRows = [
                    { key: "marketDemand", label: t("report.marketDemand") },
                    { key: "jobSatisfaction", label: t("report.jobSatisfaction") },
                    { key: "workLifeBalance", label: t("report.workLifeBalance") },
                  ]
                    .map((row) => ({ ...row, value: round(outlook[row.key]) }))
                    .filter((row) => row.value != null);
                  // The scorer emits "" for signals it could not measure, so
                  // filtering on the text also omits the whole block when a
                  // career carries no match reasons at all.
                  const reasons = detail.matchReasons || {};
                  const reasonRows = [
                    { key: "holland", label: t("result.matchReasonInterests") },
                    {
                      key: "intelligence",
                      label: t("result.matchReasonIntelligence"),
                    },
                    { key: "aptitude", label: t("result.matchReasonAptitude") },
                    { key: "eq", label: t("result.matchReasonEq") },
                  ]
                    .map((row) => ({
                      ...row,
                      text: String(reasons[row.key] || "").trim(),
                    }))
                    .filter((row) => row.text);

                  return (
                    <article
                      key={`career-profile-${detail.title}-${index}`}
                      className="report-print-career-page mb-4 rounded-2xl border border-[#E4EAF0] bg-white p-5 sm:p-6"
                    >
                      <div className="flex flex-wrap items-center gap-2.5">
                        <h3 className="text-[18px] font-bold leading-7 text-[#0F1729]">
                          {detail.title}
                        </h3>
                        {match == null ? null : (
                          <span className="rounded-full bg-[#e8f5f3] px-2.5 py-0.5 text-[11px] font-semibold text-[#0d7a6f]">
                            {match}% Match
                          </span>
                        )}
                        {detail.category ? (
                          <span className="rounded-full border border-[#D9E2E8] px-2.5 py-0.5 text-[11px] font-semibold text-[#4E5D72]">
                            {detail.category}
                          </span>
                        ) : null}
                      </div>

                      {match == null ? null : (
                        <div className="mt-3 h-2 rounded-full bg-[#E6EEF0]">
                          <div
                            className="h-2 rounded-full bg-[#128678]"
                            style={{
                              width: `${Math.max(0, Math.min(100, match))}%`,
                            }}
                          />
                        </div>
                      )}

                      {reasonRows.length ? (
                        <ProfileBlock label={t("result.whyMatched")}>
                          <ul className="space-y-1.5">
                            {reasonRows.map((row) => (
                              <li key={`${detail.title}-reason-${row.key}`}>
                                <span className="font-semibold text-[#0F1729]">
                                  {row.label}:
                                </span>{" "}
                                {row.text}
                              </li>
                            ))}
                          </ul>
                        </ProfileBlock>
                      ) : null}

                      <ProfileBlock label={t("report.careerOverview")}>
                        {detail.overview}
                      </ProfileBlock>

                      {detail.skills?.length ? (
                        <ProfileBlock label={t("report.keySkills")}>
                          <div className="flex flex-wrap gap-1.5">
                            {detail.skills.slice(0, 8).map((skill) => (
                              <span
                                key={`${detail.title}-skill-${skill}`}
                                className="rounded-full bg-[#128678] px-2.5 py-0.5 text-[10px] font-semibold text-white"
                              >
                                {skill}
                              </span>
                            ))}
                          </div>
                        </ProfileBlock>
                      ) : null}

                      {workEnvironment ? (
                        <ProfileBlock label={t("report.workEnvironment")}>
                          {workEnvironment}
                        </ProfileBlock>
                      ) : null}

                      {detail.education?.length ? (
                        <ProfileBlock label={t("report.educationPathway")}>
                          <ul className="list-disc space-y-1.5 pl-5">
                            {detail.education.map((line, eduIndex) => (
                              <li key={`${detail.title}-edu-${eduIndex}`}>
                                {line}
                              </li>
                            ))}
                          </ul>
                        </ProfileBlock>
                      ) : null}

                      {outlookRows.length ? (
                        <ProfileBlock label={t("report.growthOutlook")}>
                          <ul className="grid gap-2 text-[12px] sm:grid-cols-3">
                            {outlookRows.map((row) => (
                              <li key={`${detail.title}-${row.key}`}>
                                <span className="font-semibold text-[#0F1729]">
                                  {row.label}:
                                </span>{" "}
                                {row.value}%
                              </li>
                            ))}
                          </ul>
                        </ProfileBlock>
                      ) : null}
                    </article>
                  );
                })}
              </div>
            ) : null}

            <Card>
              <h3 className="text-[15px] font-bold text-[#0F1729]">Your next step</h3>
              <Callout label="A note on this report" className="mt-4">
                {noteText}
              </Callout>
              <div className="report-print-card mt-5 flex flex-col items-start justify-between gap-4 rounded-2xl bg-[#f5a623] px-6 py-5 sm:flex-row sm:items-center">
                <div className="text-white">
                  <p className="text-lg font-bold">
                    Ready to explore your career options?
                  </p>
                  <p className="mt-0.5 text-[13px] text-white/90">
                    30-minute session with expert career psychologists · Personalized
                    action plan
                  </p>
                </div>
                <span className="report-print-hidden inline-flex shrink-0 items-center rounded-full bg-white px-5 py-2.5 text-sm font-bold text-[#c97f0a]">
                  Schedule a call
                </span>
              </div>
            </Card>
          </div>
        </section>
      </div>
    </div>
  );
}

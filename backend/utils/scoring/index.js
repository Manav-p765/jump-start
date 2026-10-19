import { computeGenericResultFromAnswers } from "./genericScoring.js";
import scoreCareer500QPackage from "./packageScoring/career500q.js";
import scoreCareer500QDemoPackage from "./packageScoring/career500qDemo.js";
import { DEMO_PACKAGE_ID } from "./configs/career500qDemo.config.js";
import { CAREER_500Q_CONFIG } from "./configs/career500q.config.js";

// Packages scored by the dedicated 500Q scorer (English + Gujarati
// editions). The list lives in the scorer config so a new edition is
// registered in exactly one place.
export const CAREER_500Q_PACKAGE_IDS = Object.freeze([
  ...CAREER_500Q_CONFIG.packageIds,
]);

const normalizeId = (value) => String(value || "").trim();

export const isCareer500QPackageId = (packageId) =>
  CAREER_500Q_PACKAGE_IDS.includes(normalizeId(packageId));

export const hasCareer500QPackage = (pkg = {}) =>
  isCareer500QPackageId(pkg?.id || pkg?.packageId);

export const isDemoAptitude50QPackage = (pkg = {}) =>
  normalizeId(pkg?.id || pkg?.packageId) === DEMO_PACKAGE_ID;

// Question count per sectionId in the 500Q bank. Any package whose enabled
// sections match this exactly is carrying the 500Q bank, whatever its id.
const CAREER_500Q_SECTION_SHAPE = Object.freeze({
  1: 120,
  2: 80,
  3: 90,
  4: 160,
  5: 50,
});

const hasCareer500QShape = (sections = []) => {
  if (!Array.isArray(sections) || sections.length !== 5) return false;
  return sections.every(
    (section) =>
      (section?.questions || []).length ===
      CAREER_500Q_SECTION_SHAPE[Number(section?.sectionId)]
  );
};

export const computeAssessmentResult = ({
  answers = {},
  sections = [],
  packageId = "",
} = {}) => {
  const id = normalizeId(packageId);

  if (id === DEMO_PACKAGE_ID) {
    return scoreCareer500QDemoPackage(answers, sections);
  }

  if (isCareer500QPackageId(id)) {
    return scoreCareer500QPackage(answers, sections, { packageId: id });
  }

  // Guard: a package carrying the 500Q bank must be scored by the 500Q
  // scorer. Reaching here means a new edition was added without being
  // registered in CAREER_500Q_CONFIG.packageIds, and its reports would
  // silently come out of the heuristic scorer (empty subsections, flat
  // strengths, identical career matches). Still score it so the submit
  // isn't lost, but make the miss impossible to overlook in the logs.
  if (hasCareer500QShape(sections)) {
    console.error(
      `[scoring] SCORER MISMATCH: package "${id || "(none)"}" has the 500Q ` +
        "section shape but is not listed in CAREER_500Q_CONFIG.packageIds; " +
        "falling back to the GENERIC scorer. Register the package id so it " +
        "is scored by career-500q."
    );
  }

  return computeGenericResultFromAnswers(answers, sections);
};

export default computeAssessmentResult;

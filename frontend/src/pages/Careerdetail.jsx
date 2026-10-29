import { useContext, useEffect, useMemo, useState } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft,
  ArrowUpRight,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  CheckCircle2,
  GraduationCap,
  LineChart,
  NotebookText,
  Sparkles,
} from "lucide-react";
import api from "../api/api";
import { AuthContext } from "../context/AuthContext";
import { getCareerDetailContent, matchCareerByTitle } from "../data/careerDetails";
import { CareerdetailSkeleton } from "../components/Skeletons";
import {
  readApiCache,
  writeApiCache,
  cacheUserKey,
  CACHE_TTL,
} from "../utils/apiCache";

// Outlook keys map to translation labels — `key` is the backend field
// in detail.outlook; `labelKey` resolves to the localised heading.
const OUTLOOK_ITEMS = [
  { key: "marketDemand", labelKey: "careerdetail.marketDemand" },
  { key: "jobSatisfaction", labelKey: "careerdetail.jobSatisfaction" },
  { key: "workLifeBalance", labelKey: "careerdetail.workLifeBalance" },
];

const getStateCareer = (locationState) => {
  if (locationState?.career && typeof locationState.career === "object") {
    return locationState.career;
  }
  return null;
};

export default function Careerdetail() {
  const { t } = useTranslation();
  const location = useLocation();
  const { user } = useContext(AuthContext);
  const [searchParams] = useSearchParams();
  const seededCareer = getStateCareer(location.state);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [data, setData] = useState({
    hasResults: false,
    careerRecommendations: [],
  });

  useEffect(() => {
    const userId = cacheUserKey(user);
    // Reuse the same `userResults` cache key as Result.jsx — if the
    // student just came from /result the payload is already warm and
    // this page renders without a network round-trip.
    const cached = readApiCache("userResults", {
      userId,
      ttlMs: CACHE_TTL.USER_RESULTS_MS,
    });
    if (cached) {
      setData(cached);
      setLoading(false);
      return;
    }

    api
      .get("/v1/user/results")
      .then((res) => {
        const payload = res?.data?.data || {};
        writeApiCache("userResults", payload, { userId });
        setData(payload);
      })
      .catch((err) => {
        setError(err?.response?.data?.msg || "Failed to load career details.");
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?._id || user?.id || user?.email]);

  const requestedCareerTitle = searchParams.get("career") || seededCareer?.title || "";
  const selectedCareer = useMemo(() => {
    const matchedCareer = matchCareerByTitle(
      data.careerRecommendations || [],
      requestedCareerTitle
    );

    if (matchedCareer) return matchedCareer;
    if (seededCareer?.title) return seededCareer;
    return data.careerRecommendations?.[0] || null;
  }, [data.careerRecommendations, requestedCareerTitle, seededCareer]);

  const detail = useMemo(
    () => getCareerDetailContent(selectedCareer),
    [selectedCareer]
  );

  const topSkills = detail.skills.slice(0, 4);
  const hiddenSkillCount = Math.max(0, detail.skills.length - topSkills.length);
  const showBlockingError = Boolean(error) && !selectedCareer;

  if (loading && !selectedCareer) {
    return <CareerdetailSkeleton />;
  }

  if (showBlockingError) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center bg-[#F7F8FA] px-4">
        <div className="surface-card w-full max-w-xl rounded-[28px] p-8 text-center">
          <h1 className="text-3xl font-bold text-[#0F1729]">{t("careerdetail.unavailableHeading")}</h1>
          <p className="mt-3 text-[#65758B]">{error}</p>
          <Link to="/result" className="primary-btn mt-6">
            {t("careerdetail.backToResults")}
          </Link>
        </div>
      </div>
    );
  }

  if (!selectedCareer) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center bg-[#F7F8FA] px-4">
        <div className="surface-card w-full max-w-2xl rounded-[28px] p-8 text-center">
          <h1 className="text-3xl font-bold text-[#0F1729]">{t("careerdetail.noDetailHeading")}</h1>
          <p className="mt-3 text-[#65758B]">
            {t("careerdetail.noDetailBody")}
          </p>
          <Link to="/result" className="primary-btn mt-6">
            {t("careerdetail.goToResults")}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#F7F8FA]">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <Link
          to="/result"
          className="inline-flex items-center gap-2 rounded-full border border-[#DFE7EE] bg-white px-4 py-2 text-sm font-semibold text-[#4E5D72] hover:border-[#C3D4DE] hover:bg-[#FBFCFD]"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("careerdetail.backToResults")}
        </Link>

        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_340px] lg:items-start">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-4xl font-bold leading-tight text-[#0F1729] sm:text-[2.7rem]">
                {detail.title}
              </h1>
              <span
                className="rounded-full bg-[#E2F8F7] px-4 py-2 text-sm font-semibold text-[#157A7A]"
                title={
                  detail.score != null
                    ? t("careerdetail.matchScore", { score: detail.score })
                    : undefined
                }
              >
                {t("result.matchPercent", {
                  value: detail.score != null ? Math.round(detail.score) : detail.matchPercent,
                })}
              </span>
              {detail.category ? (
                <span className="rounded-full border border-[#D9E5EC] bg-white px-3 py-1.5 text-xs font-semibold text-[#4E5D72]">
                  {detail.category}
                </span>
              ) : null}
            </div>

            {detail.score != null ? (
              <div className="mt-3 max-w-md">
                <div className="h-2 w-full overflow-hidden rounded-full bg-[#E6EEF2]">
                  <div
                    className="h-2 rounded-full bg-[#157A7A]"
                    style={{
                      width: `${Math.min(100, Math.max(0, detail.score))}%`,
                    }}
                  />
                </div>
                <p className="mt-1.5 text-xs text-[#7D8CA2]">
                  {t("careerdetail.compatibilityBased")}
                </p>
              </div>
            ) : null}

            <p className="mt-4 max-w-4xl text-base leading-8 text-[#65758B]">
              {detail.description}
            </p>

            <div className="mt-5 flex flex-wrap gap-2">
              {topSkills.map((skill) => (
                <span
                  key={skill}
                  className="rounded-full bg-[#157A7A] px-3 py-1 text-[11px] font-semibold text-white"
                >
                  {skill}
                </span>
              ))}
              {hiddenSkillCount ? (
                <span className="rounded-full bg-[#EEF4F7] px-3 py-1 text-[11px] font-semibold text-[#4E5D72]">
                  {t("careerdetail.moreSkills", { count: hiddenSkillCount })}
                </span>
              ) : null}
            </div>
          </div>

          <section className="surface-card rounded-[26px] border border-[#F4DCA8] bg-[linear-gradient(180deg,#FFF9EA_0%,#FFFFFF_100%)] p-6">
            <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-[#FFF1D3] text-[#F59F0A]">
              <CalendarDays className="h-5 w-5" />
            </div>
            <p className="mt-4 text-center text-sm font-medium text-[#4E5D72]">
              {t("careerdetail.readyToExplore")}
            </p>
            <Link to="/bookcounselling" className="primary-btn mt-4 flex w-full">
              {t("careerdetail.scheduleCall")}
            </Link>
            <p className="mt-3 text-center text-xs text-[#8A94A6]">
              {t("careerdetail.talkToCounselor")}
            </p>
          </section>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_340px]">
          <div className="space-y-6">
            {detail.matchReasons &&
            (detail.matchReasons.holland ||
              detail.matchReasons.intelligence ||
              detail.matchReasons.aptitude ||
              detail.matchReasons.eq) ? (
              <section className="surface-card rounded-[26px] border border-[#D4EBEE] bg-[linear-gradient(180deg,#F7FDFD_0%,#FFFFFF_100%)] p-6">
                <div className="flex items-center gap-3">
                  <div className="rounded-2xl bg-[#EAFBFB] p-3 text-[#157A7A]">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-[#0F1729]">
                      {t("careerdetail.whyMatchedHeading")}
                    </h2>
                    <p className="mt-1 text-sm text-[#7D8CA2]">
                      {t("careerdetail.whyMatchedSubtitle")}
                    </p>
                  </div>
                </div>
                <ul className="mt-5 space-y-3 text-sm leading-7 text-[#4E5D72]">
                  {detail.matchReasons.holland ? (
                    <li className="flex gap-3">
                      <span className="mt-1.5 inline-block h-2 w-2 shrink-0 rounded-full bg-[#157A7A]" />
                      <span>
                        <span className="font-semibold text-[#0F1729]">
                          {t("result.matchReasonInterests")}:
                        </span>{" "}
                        {detail.matchReasons.holland}
                      </span>
                    </li>
                  ) : null}
                  {detail.matchReasons.intelligence ? (
                    <li className="flex gap-3">
                      <span className="mt-1.5 inline-block h-2 w-2 shrink-0 rounded-full bg-[#157A7A]" />
                      <span>
                        <span className="font-semibold text-[#0F1729]">
                          {t("result.matchReasonIntelligence")}:
                        </span>{" "}
                        {detail.matchReasons.intelligence}
                      </span>
                    </li>
                  ) : null}
                  {detail.matchReasons.aptitude ? (
                    <li className="flex gap-3">
                      <span className="mt-1.5 inline-block h-2 w-2 shrink-0 rounded-full bg-[#157A7A]" />
                      <span>
                        <span className="font-semibold text-[#0F1729]">
                          {t("result.matchReasonAptitude")}:
                        </span>{" "}
                        {detail.matchReasons.aptitude}
                      </span>
                    </li>
                  ) : null}
                  {detail.matchReasons.eq ? (
                    <li className="flex gap-3">
                      <span className="mt-1.5 inline-block h-2 w-2 shrink-0 rounded-full bg-[#157A7A]" />
                      <span>
                        <span className="font-semibold text-[#0F1729]">
                          {t("result.matchReasonEq")}:
                        </span>{" "}
                        {detail.matchReasons.eq}
                      </span>
                    </li>
                  ) : null}
                </ul>
                {detail.breakdown ? (
                  <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {[
                      {
                        label: t("careerdetail.breakdownHolland"),
                        value: detail.breakdown.hollandMatch,
                      },
                      {
                        label: t("careerdetail.breakdownIntelligence"),
                        value: detail.breakdown.intelligenceMatch,
                      },
                      {
                        label: t("careerdetail.breakdownAptitude"),
                        value: detail.breakdown.aptitudeMatch,
                      },
                      { label: t("careerdetail.breakdownEq"), value: detail.breakdown.eqMatch },
                    ].map((item) => (
                      <div
                        key={item.label}
                        className="rounded-[14px] bg-white px-3 py-2.5 text-center shadow-[0_2px_8px_rgba(15,23,41,0.04)]"
                      >
                        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8A94A6]">
                          {item.label}
                        </p>
                        <p className="mt-1 text-lg font-bold text-[#157A7A]">
                          {item.value != null ? Math.round(item.value) : "--"}
                          {item.value != null ? "%" : ""}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : null}
              </section>
            ) : null}

            <section className="surface-card rounded-[26px] p-6">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-[#EAFBFB] p-3 text-[#157A7A]">
                  <NotebookText className="h-5 w-5" />
                </div>
                <h2 className="text-2xl font-bold text-[#0F1729]">{t("careerdetail.careerOverview")}</h2>
              </div>
              <p className="mt-4 text-sm leading-8 text-[#65758B]">{detail.overview}</p>
            </section>

            {/* Salary Range section hidden — current placeholder data
                wasn't sufficiently differentiated per career (client
                feedback). detail.salaryBands is preserved in
                careerDetails.js so this block can be re-enabled once
                accurate India-wage data is available. */}

            <section className="surface-card rounded-[26px] p-6">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-[#EEF7FF] p-3 text-[#157A7A]">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <h2 className="text-2xl font-bold text-[#0F1729]">{t("careerdetail.keyResponsibilitiesHeading")}</h2>
              </div>

              <div className="mt-5 space-y-4">
                {detail.responsibilities.map((item, index) => (
                  <div key={item} className="flex gap-3">
                    <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#EAFBFB] text-xs font-bold text-[#157A7A]">
                      {index + 1}
                    </div>
                    <p className="text-sm leading-7 text-[#65758B]">{item}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="surface-card rounded-[26px] p-6">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-[#EAFBFB] p-3 text-[#157A7A]">
                  <Sparkles className="h-5 w-5" />
                </div>
                <h2 className="text-2xl font-bold text-[#0F1729]">
                  {t("careerdetail.requiredSkillsHeading")}
                </h2>
              </div>

              <div className="mt-5 flex flex-wrap gap-3">
                {detail.skills.map((skill) => (
                  <span
                    key={skill}
                    className="rounded-full bg-[#157A7A] px-4 py-2 text-xs font-semibold text-white"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </section>

            <section className="surface-card rounded-[26px] p-6">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-[#FFF6DF] p-3 text-[#F59F0A]">
                  <Building2 className="h-5 w-5" />
                </div>
                <h2 className="text-2xl font-bold text-[#0F1729]">{t("careerdetail.topHiringCompanies")}</h2>
              </div>

              <div className="mt-5 flex flex-wrap gap-3">
                {detail.companies.map((company) => (
                  <span
                    key={company}
                    className="rounded-full border border-[#DFE7EE] bg-white px-4 py-2 text-xs font-semibold text-[#4E5D72]"
                  >
                    {company}
                  </span>
                ))}
              </div>
            </section>
          </div>

          <div className="space-y-6">
            <section className="surface-card rounded-[26px] p-6">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-[#EAFBFB] p-3 text-[#157A7A]">
                  <GraduationCap className="h-5 w-5" />
                </div>
                <h2 className="text-2xl font-bold text-[#0F1729]">{t("careerdetail.educationHeading")}</h2>
              </div>

              <div className="mt-5 space-y-4">
                {detail.education.map((item) => (
                  <div key={item} className="flex gap-3">
                    <div className="mt-2 h-2.5 w-2.5 shrink-0 rounded-full bg-[#157A7A]" />
                    <p className="text-sm leading-7 text-[#65758B]">{item}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="surface-card rounded-[26px] p-6">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-[#EAFBFB] p-3 text-[#157A7A]">
                  <LineChart className="h-5 w-5" />
                </div>
                <h2 className="text-2xl font-bold text-[#0F1729]">{t("careerdetail.careerOutlookHeading")}</h2>
              </div>

              <div className="mt-5 space-y-5">
                {OUTLOOK_ITEMS.map((item) => (
                  <div key={item.key}>
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-[#0F1729]">{t(item.labelKey)}</p>
                      <p className="text-sm font-semibold text-[#157A7A]">
                        {detail.outlook[item.key]}%
                      </p>
                    </div>
                    <div className="mt-3 h-2.5 rounded-full bg-[#DCE9EE]">
                      <div
                        className="h-2.5 rounded-full bg-[#157A7A]"
                        style={{ width: `${Math.min(100, detail.outlook[item.key] || 0)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="surface-card rounded-[26px] border border-[#F4DCA8] bg-[linear-gradient(180deg,#FFF9EA_0%,#FFFFFF_100%)] p-6">
              <p className="text-2xl font-bold text-[#0F1729]">{t("careerdetail.needGuidance")}</p>
              <p className="mt-3 text-sm leading-7 text-[#65758B]">
                {t("careerdetail.needGuidanceBody")}
              </p>

              <div className="mt-5 space-y-3">
                {detail.guidancePoints.map((item) => (
                  <div key={item} className="flex items-center gap-3">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#FFF1D3] text-[#F59F0A]">
                      <Sparkles className="h-4 w-4" />
                    </div>
                    <span className="text-sm text-[#4E5D72]">{item}</span>
                  </div>
                ))}
              </div>

              <Link to="/bookcounselling" className="primary-btn mt-6 flex w-full gap-2">
                {t("careerdetail.scheduleCall")}
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

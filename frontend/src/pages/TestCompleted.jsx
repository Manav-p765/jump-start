import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  ArrowRight,
  BadgeCheck,
  CheckCircle2,
  Clock3,
  FileText,
  Sparkles,
  X,
} from "lucide-react";
import api from "../api/api";
import resultsIllustration from "../assets/results.png";
import ResultPendingPanel from "../components/ResultPendingPanel";

export default function TestCompleted() {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [results, setResults] = useState(null);
  const [pkg, setPkg] = useState(null);
  const [showCelebration, setShowCelebration] = useState(
    Boolean(location.state?.showCelebration)
  );

  useEffect(() => {
    Promise.allSettled([api.get("/v1/user/results"), api.get("/v1/user/package/current")])
      .then((responses) => {
        const resultsRes = responses[0];
        const packageRes = responses[1];

        if (resultsRes.status === "fulfilled") {
          setResults(resultsRes.value?.data?.data || null);
        }

        if (packageRes.status === "fulfilled") {
          setPkg(packageRes.value?.data?.data?.package || null);
        }

        if (
          resultsRes.status === "rejected" &&
          packageRes.status === "rejected"
        ) {
          setError(t("testCompletedExtra.loadError"));
        }
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!showCelebration) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setShowCelebration(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [showCelebration]);

  const dismissCelebration = () => {
    setShowCelebration(false);
    if (location.state?.showCelebration) {
      navigate("/test-completed", { replace: true, state: {} });
    }
  };

  const handleGoToDashboard = () => {
    setShowCelebration(false);
    navigate("/dashboard", { replace: true });
  };

  let pageContent;

  if (loading) {
    pageContent = (
      <div className="flex min-h-[70vh] items-center justify-center bg-white px-4">
        <p className="text-[#65758B]">{t("testCompletedExtra.loadingSummary")}</p>
      </div>
    );
  } else if (results?.resultStatus === "pending_approval") {
    pageContent = <ResultPendingPanel error={error} />;
  } else if (!results?.hasResults) {
    pageContent = (
      <div className="bg-white">
        <div className="mx-auto flex min-h-[70vh] max-w-5xl items-center justify-center px-4 py-14 sm:px-6 lg:px-8">
          <div className="w-full max-w-3xl text-center">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-[#E8F9F8] text-[#157A7A]">
              <Clock3 className="h-9 w-9" />
            </div>
            <h1 className="mt-8 text-4xl font-bold text-[#0F1729] sm:text-5xl">
              {t("testCompletedExtra.processingHeading")}
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-base leading-8 text-[#65758B]">
              {t("testCompletedExtra.processingBody")}
            </p>

            <div className="surface-card mx-auto mt-8 max-w-2xl rounded-[30px] border border-[#B9E5E5] p-8">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#E8F9F8] text-[#157A7A]">
                <FileText className="h-7 w-7" />
              </div>
              <h2 className="mt-5 text-3xl font-bold text-[#0F1729]">
                {t("testCompletedExtra.readyHereHeading")}
              </h2>
              <p className="mt-4 text-base leading-8 text-[#65758B]">
                {t("testCompletedExtra.readyHereBody")}
              </p>
            </div>

            {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}

            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Link
                to="/dashboard"
                className="inline-flex items-center justify-center rounded-[14px] bg-[#157A7A] px-6 py-3 text-sm font-semibold text-white hover:bg-[#126A6A]"
              >
                {t("testCompletedExtra.goToDashboard")}
              </Link>
              <Link to="/test" className="secondary-btn">
                {t("testCompletedExtra.browseMoreTests")}
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  } else {
    pageContent = (
      <div className="bg-white">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
          <div>
            <h1 className="text-4xl font-bold text-[#0F1729]">{t("testCompletedExtra.completedTitle")}</h1>
            <p className="mt-2 text-base text-[#65758B]">
              {t("testCompletedExtra.completedSubtitle")}
            </p>
          </div>

          <div className="surface-card mt-8 rounded-[30px] p-6 sm:p-8">
            <div className="rounded-[24px] border border-[#E1E7EF] p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-2xl font-semibold text-[#0F1729]">
                    {pkg?.title || t("testCompletedExtra.assessmentFallback")}
                  </h2>
                  <p className="mt-2 text-sm text-[#65758B]">
                    {t("testCompletedExtra.sectionsCompletedLabel", {
                      count: results.completedTestsCount || results.testResults?.length || 0,
                    })}
                  </p>
                </div>
                <span className="inline-flex items-center gap-2 rounded-full bg-[#E8F9F8] px-3 py-1 text-xs font-semibold text-[#157A7A]">
                  <BadgeCheck className="h-3 w-3" />
                  {t("testCompletedExtra.submittedBadge")}
                </span>
              </div>
            </div>

            <div className="mt-5 rounded-[24px] bg-[#DFF8F7] px-5 py-5">
              <p className="text-sm font-semibold text-[#0F1729]">
                {t("testCompletedExtra.whatHappensNextShort")}
              </p>
              <p className="mt-2 text-sm leading-7 text-[#65758B]">
                {t("testCompletedExtra.whatHappensNextBody")}
              </p>
            </div>
          </div>

          <div className="surface-card mt-6 flex flex-col gap-5 rounded-[30px] p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
            <div>
              <h2 className="text-3xl font-bold text-[#0F1729]">
                {t("testCompletedExtra.submissionConfirmation")}
              </h2>
              <p className="mt-2 text-sm text-[#65758B]">
                {t("testCompletedExtra.submissionConfirmationBody")}
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:w-auto sm:flex-row">
              <Link to="/dashboard" className="secondary-btn">
                {t("testCompletedExtra.goToDashboard")}
              </Link>
              <Link
                to="/result"
                className="inline-flex items-center justify-center rounded-[14px] bg-[#157A7A] px-6 py-3 text-sm font-semibold text-white hover:bg-[#126A6A]"
              >
                {t("testCompletedExtra.openResultsHub")}
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div
        className={showCelebration ? "pointer-events-none select-none blur-[2px]" : ""}
        aria-hidden={showCelebration}
      >
        {pageContent}
      </div>

      {showCelebration ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0F1729]/28 px-4 py-8 backdrop-blur-sm">
          <div className="relative w-full max-w-[460px] overflow-hidden rounded-[28px] bg-[#157A7A] text-white shadow-[0_28px_70px_rgba(15,23,41,0.28)]">
            <button
              type="button"
              onClick={dismissCelebration}
              className="absolute right-4 top-4 z-10 inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
              aria-label={t("testCompletedExtra.closeCelebration")}
            >
              <X className="h-4 w-4" />
            </button>

            <div className="relative overflow-hidden bg-[linear-gradient(180deg,#166F6F_0%,#197A7A_100%)] px-6 pb-5 pt-7">
              <div className="absolute -left-10 bottom-0 h-32 w-32 rounded-full bg-[#38D8D0]/20 blur-3xl" />
              <div className="absolute -right-10 top-2 h-28 w-28 rounded-full bg-[#F59F0A]/20 blur-3xl" />
              <div className="absolute left-1/2 top-[54%] h-[2px] w-44 -translate-x-1/2 -rotate-[22deg] rounded-full bg-[#F59F0A]" />
              <div className="absolute left-1/2 top-[60%] h-0 w-40 -translate-x-1/2 -rotate-[22deg] border-t-2 border-dashed border-white/65" />
              <div className="absolute left-[26%] top-[38%] flex h-9 w-9 items-center justify-center rounded-full bg-white/14 text-white/90">
                <CheckCircle2 className="h-4 w-4" />
              </div>
              <div className="absolute right-[24%] top-[26%] flex h-9 w-9 items-center justify-center rounded-full bg-[#F59F0A] text-[#0F1729] shadow-[0_10px_18px_rgba(245,159,10,0.22)]">
                <ArrowRight className="h-4 w-4" />
              </div>

              <div className="relative flex items-center justify-center">
                <div className="rounded-[24px] border border-white/10 bg-white/8 p-4 backdrop-blur">
                  <img
                    src={resultsIllustration}
                    alt={t("testCompletedExtra.submissionImageAlt")}
                    width="192"
                    height="192"
                    loading="lazy"
                    decoding="async"
                    className="h-24 w-auto object-contain sm:h-28"
                  />
                </div>
              </div>
            </div>

            <div className="px-7 pb-7 pt-6 text-center">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/12 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/85">
                <Sparkles className="h-3.5 w-3.5 text-[#F6C465]" />
                {t("testCompletedExtra.submissionReceived")}
              </div>

              <h2 className="mt-4 text-[30px] font-bold leading-tight text-white">
                {t("testCompletedExtra.congratulations")}
              </h2>
              <p className="mt-3 text-sm leading-7 text-white/85">
                {t("testCompletedExtra.celebrationBody")}
              </p>

              <button
                type="button"
                onClick={handleGoToDashboard}
                className="mt-6 inline-flex items-center justify-center gap-2 rounded-full bg-[#F59F0A] px-6 py-3 text-sm font-semibold text-[#0F1729] shadow-[0_14px_28px_rgba(245,159,10,0.24)] hover:bg-[#E89206]"
              >
                {t("testCompletedExtra.goToDashboard")}
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

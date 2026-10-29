import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { BookmarkCheck, Clock3, LayoutDashboard, PlayCircle } from "lucide-react";

export default function TestPaused() {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state || {};

  const isValidPauseState =
    Number(state.sectionId || 0) > 0 &&
    typeof state.sectionTitle === "string" &&
    Number.isFinite(Number(state.timeRemainingSeconds));

  useEffect(() => {
    if (!isValidPauseState) {
      navigate("/dashboard", { replace: true });
    }
  }, [isValidPauseState, navigate]);

  if (!isValidPauseState) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FAFAFA] px-4">
        <p className="text-[#65758B]">{t("sectionBreak.redirecting")}</p>
      </div>
    );
  }

  const timeRemainingSeconds = Math.max(0, Number(state.timeRemainingSeconds || 0));
  const minutesLeft = Math.floor(timeRemainingSeconds / 60);
  const secondsLeft = timeRemainingSeconds % 60;
  const timeLabel = `${minutesLeft}:${secondsLeft.toString().padStart(2, "0")}`;

  return (
    <div className="min-h-screen bg-[#FAFAFA] px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-3xl">
        <div className="rounded-[30px] border border-[#E1E7EF] bg-white p-8 text-center shadow-sm sm:p-10">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-[#E8F9F8] text-[#157A7A]">
            <BookmarkCheck className="h-10 w-10" />
          </div>

          <h1 className="mt-6 text-4xl font-bold text-[#0F1729]">
            {t("testPaused.title")}
          </h1>
          <p className="mt-3 text-base leading-8 text-[#65758B]">
            {t("testPaused.body")}
          </p>

          <div className="mt-8 rounded-[24px] border border-[#D9E5EC] bg-[#F8FAFC] p-6 text-left">
            <h2 className="text-2xl font-bold text-[#0F1729]">
              {t("sectionBreak.yourProgress")}
            </h2>
            <div className="mt-5 space-y-4">
              <div className="flex items-center justify-between gap-4 border-b border-[#E1E7EF] pb-4">
                <span className="text-sm text-[#65758B]">{t("livetest.sectionN", { number: "" }).trim()}</span>
                <span className="text-sm font-semibold text-[#0F1729]">
                  {t("livetest.sectionN", { number: state.sectionId })}: {state.sectionTitle}
                </span>
              </div>
              <div className="flex items-center justify-between gap-4 border-b border-[#E1E7EF] pb-4">
                <span className="text-sm text-[#65758B]">{t("sectionBreak.questionsAnswered")}</span>
                <span className="text-sm font-semibold text-[#0F1729]">
                  {state.answeredCount || 0} {t("common.of")} {state.totalQuestions || 0}
                </span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-sm text-[#65758B]">{t("sectionBreak.timeElapsed")}</span>
                <span className="inline-flex items-center gap-2 text-sm font-semibold text-[#0F1729]">
                  <Clock3 className="h-4 w-4 text-[#157A7A]" />
                  {timeLabel}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <button
              type="button"
              onClick={() => navigate("/dashboard", { replace: true })}
              className="inline-flex items-center justify-center gap-2 rounded-[14px] bg-[#157A7A] px-6 py-3 text-sm font-semibold text-white hover:bg-[#126A6A]"
            >
              <LayoutDashboard className="h-4 w-4" />
              {t("testPaused.returnToDashboard")}
            </button>
            <button
              type="button"
              onClick={() => navigate(`/livetest/${state.sectionId}`, { replace: true })}
              className="inline-flex items-center justify-center gap-2 rounded-[14px] border-2 border-[#188B8B] px-6 py-3 text-sm font-semibold text-[#157A7A] hover:bg-[#F6FDFC]"
            >
              <PlayCircle className="h-4 w-4" />
              {t("dashboard.continueTestCta")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

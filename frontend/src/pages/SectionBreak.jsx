import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { CheckCircle2, Coffee, Save, TimerReset } from "lucide-react";
import api from "../api/api";

export default function SectionBreak() {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state || {};
  // Prompt-9 Fix 3: "Save & Return to Dashboard" path. Auto-save runs
  // every few seconds while the student is in Livetest, but we trigger
  // one final PATCH here as confirmation so the dashboard's "Continue"
  // card reflects the most recent progress immediately.
  const [savingReturn, setSavingReturn] = useState(false);

  const completedSection = Number(state.completedSection || 0);
  const completedSectionTitle = state.completedSectionTitle || `Section ${completedSection}`;
  const completedSectionsCount = Number(state.completedSectionsCount || 0);
  const totalSections = Number(state.totalSections || 0);
  const questionsSoFar = Number(state.questionsSoFar || 0);
  const totalQuestions = Number(state.totalQuestions || 0);
  const timeElapsedMinutes = Number(state.timeElapsedMinutes || 0);
  const remainingTitles = Array.isArray(state.remainingTitles)
    ? state.remainingTitles
    : [];
  const nextSectionId = Number(state.nextSectionId || 0);
  const estimatedNextMinutes = Number(state.estimatedNextMinutes || 20);

  const isValidState =
    completedSection > 0 &&
    completedSectionsCount > 0 &&
    totalSections > 0 &&
    nextSectionId > 0;

  useEffect(() => {
    if (state.testComplete) {
      navigate("/test-completed", { replace: true });
      return;
    }

    if (!isValidState) {
      navigate("/pretest/sections", { replace: true });
    }
  }, [isValidState, navigate, state.testComplete]);

  if (!isValidState) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FAFAFA] px-4">
        <p className="text-[#65758B]">{t("sectionBreak.redirecting")}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <div className="border-b border-[#E1E7EF] bg-white">
        <div className="mx-auto max-w-6xl px-4 py-5 sm:px-6 lg:px-8">
          <h1 className="text-xl font-bold text-[#0F1729]">{t("sectionBreak.title")}</h1>
        </div>
      </div>

      <div className="mx-auto flex max-w-6xl justify-center px-4 py-12 sm:px-6 lg:px-8">
        <div className="w-full max-w-3xl text-center">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-[#E8F9F8] text-[#157A7A] shadow-sm">
            <CheckCircle2 className="h-10 w-10" />
          </div>

          <h2 className="mt-6 text-4xl font-bold text-[#0F1729]">
            {t("sectionBreak.sectionComplete", { number: completedSection })}
          </h2>
          <p className="mt-2 text-base text-[#65758B]">
            {t("sectionBreak.tagline")}
          </p>

          <div className="mt-8 rounded-[24px] border border-[#D9E5EC] bg-white p-6 text-left shadow-sm sm:p-8">
            <h3 className="text-2xl font-bold text-[#0F1729]">{t("sectionBreak.yourProgress")}</h3>
            <div className="mt-6 space-y-4">
              <div className="flex items-center justify-between gap-4 border-b border-[#E1E7EF] pb-4">
                <span className="text-sm text-[#65758B]">{t("sectionBreak.completedSections")}</span>
                <span className="text-sm font-semibold text-[#0F1729]">
                  {completedSectionsCount} {t("common.of")} {totalSections}
                </span>
              </div>
              <div className="flex items-center justify-between gap-4 border-b border-[#E1E7EF] pb-4">
                <span className="text-sm text-[#65758B]">{t("sectionBreak.questionsAnswered")}</span>
                <span className="text-sm font-semibold text-[#0F1729]">
                  {questionsSoFar} {t("common.of")} {totalQuestions}
                </span>
              </div>
              <div className="flex items-center justify-between gap-4 border-b border-[#E1E7EF] pb-4">
                <span className="text-sm text-[#65758B]">{t("sectionBreak.timeElapsed")}</span>
                <span className="text-sm font-semibold text-[#0F1729]">
                  {timeElapsedMinutes} {t("sectionBreak.minutes")}
                </span>
              </div>
              <div className="flex items-start justify-between gap-4">
                <span className="text-sm text-[#65758B]">{t("sectionBreak.remainingSections")}</span>
                <span className="max-w-[60%] text-right text-sm font-semibold text-[#0F1729]">
                  {remainingTitles.length ? remainingTitles.join(", ") : t("sectionBreak.none")}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-5 rounded-[24px] border border-[#C8ECEA] bg-[#EAFBFB] p-5 text-left sm:p-6">
            <div className="flex items-start gap-3">
              <div className="rounded-full bg-white p-2 text-[#157A7A]">
                <Coffee className="h-4 w-4" />
              </div>
              <div>
                <h4 className="text-base font-semibold text-[#0F1729]">
                  {t("sectionBreak.takeBreakTitle")}
                </h4>
                <p className="mt-2 text-sm leading-7 text-[#65758B]">
                  {t("sectionBreak.takeBreakBody")}
                </p>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => navigate(`/livetest/${nextSectionId}`, { replace: true })}
            className="mt-6 inline-flex w-full cursor-pointer items-center justify-center rounded-[14px] bg-[#F59F0A] px-6 py-3.5 text-sm font-semibold text-[#0F1729] shadow-[0_14px_28px_rgba(245,159,10,0.18)] transition hover:bg-[#E89206]"
          >
            {t("sectionBreak.continueCta")}
          </button>

          <div className="mt-4 flex items-center justify-center gap-2 text-sm text-[#65758B]">
            <TimerReset className="h-4 w-4 text-[#157A7A]" />
            <span>{t("sectionBreak.estimatedNext", { minutes: estimatedNextMinutes })}</span>
          </div>

          <p className="mt-4 text-sm text-[#98A2B3]">
            {t("sectionBreak.nextUp", { title: remainingTitles[0] || completedSectionTitle })}
          </p>

          {/* Prompt-9 Fix 3: secondary "Save & Return to Dashboard"
              path. Rendered as a teal-outlined button (not a text link)
              so it matches the visual weight of the primary CTA above
              while staying visually subordinate to it. Triggers one
              final PATCH to /test-progress as a write-fence, then
              navigates to /dashboard. Disabled during the save so a
              double-click can't fire two writes. */}
          <button
            type="button"
            onClick={async () => {
              if (savingReturn) return;
              setSavingReturn(true);
              try {
                // The auto-save loop in Livetest.jsx already pushed
                // progress for the section the student just finished;
                // this PATCH is a confirmation write to ensure the
                // dashboard reflects the latest sectionId/answers.
                await api.patch("/v1/user/test-progress", {
                  sectionId: nextSectionId,
                  questionIndex: 0,
                });
              } catch {
                // Best-effort — never block the student from leaving.
                // If the save fails, prior auto-save still applies.
              } finally {
                navigate("/dashboard", { replace: true });
              }
            }}
            disabled={savingReturn}
            className="mt-6 inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-[14px] border-2 border-[#188B8B] bg-white px-6 py-3.5 text-sm font-semibold text-[#157A7A] transition hover:bg-[#F6FDFC] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Save className="h-4 w-4" />
            {savingReturn
              ? t("sectionBreak.saveAndReturnSaving")
              : t("sectionBreak.saveAndReturn")}
          </button>
          <p className="mt-3 text-xs leading-5 text-[#98A2B3]">
            {t("sectionBreak.savedHelper")}
          </p>
        </div>
      </div>
    </div>
  );
}

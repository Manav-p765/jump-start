import { useContext, useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  CheckCircle2,
  Clock3,
  FileText,
  HelpCircle,
  PlayCircle,
  UserRound,
  Video,
  CalendarDays,
  ArrowRight,
  Trophy,
  Sparkles,
} from "lucide-react";
import { AuthContext } from "../context/AuthContext";
import api from "../api/api";
import { localisedPackageField } from "../utils/packageLabel";
import { DashboardSkeleton } from "../components/Skeletons";
import PrefetchLink from "../components/PrefetchLink";
import {
  readApiCache,
  writeApiCache,
  cacheUserKey,
  CACHE_TTL,
} from "../utils/apiCache";

const DEMO_PACKAGE_ID = "demo-aptitude-50q";

const defaultState = {
  tests_completed: 0,
  tests_in_progress: 0,
  reports_ready: 0,
  counselling_sessions: 0,
  user: null,
  selected_package_id: "",
  purchased_packages: [],
  top_careers: [],
  result_status: "not_submitted",
  demo_test: null,
  student_profile_complete: false,
  // Prompt-9 Fix 3: descriptor for the "Continue Test" card. null when
  // the student has no in-progress test on the currently selected
  // package. Populated by /init.
  test_in_progress: null,
};

// Status / action / publication meta — labels resolved at render time
// via t() so the language toggle updates them instantly. Cards stay
// keyed by status id so React state and prop-equality checks stay
// stable across renders.
const getPackageStatusMeta = (status, t) => {
  if (status === "completed") {
    return {
      label: t("dashboardExtra.statusCompleted"),
      badgeClass: "bg-emerald-50 text-emerald-700",
      cardClass: "border-[#D8F3E6] bg-emerald-50/30 hover:border-[#52B788]",
      clickable: true,
    };
  }

  if (status === "in_progress") {
    return {
      label: t("dashboardExtra.statusInProgress"),
      badgeClass: "bg-amber-50 text-amber-700",
      cardClass: "border-[#F8D38B] bg-[#FFF9EE] hover:border-[#F2B53D]",
      actionLabel: t("dashboardExtra.actionResume"),
      clickable: true,
    };
  }

  return {
    label: t("dashboardExtra.statusNotCompleted"),
    badgeClass: "bg-slate-100 text-slate-700",
    cardClass: "border-[#E1E7EF] bg-white hover:border-[#9BD9D6] hover:bg-[#F6FDFC]",
    actionLabel: t("dashboardExtra.actionOpen"),
    clickable: true,
  };
};

const getPackageActionMeta = (pkg, t) => {
  if (pkg.status === "completed") {
    if (pkg.publicationStatus === "pending_approval") {
      return {
        label: t("dashboardExtra.actionPendingView"),
        mode: "pending",
      };
    }

    return {
      label: t("dashboardExtra.actionResultsHub"),
      mode: "results",
    };
  }

  if (pkg.status === "in_progress") {
    return {
      label: t("dashboardExtra.actionResume"),
      mode: "open",
    };
  }

  return {
    label: t("dashboardExtra.actionOpen"),
    mode: "open",
  };
};

const getPackagePublicationMeta = (publicationStatus, t) => {
  if (publicationStatus === "pending_approval") {
    return {
      label: t("dashboardExtra.resultPendingLabel"),
      badgeClass: "bg-amber-50 text-amber-700",
      note: t("dashboardExtra.resultPendingNote"),
      noteClass: "text-amber-700",
    };
  }

  if (publicationStatus === "approved") {
    return {
      label: t("dashboardExtra.reportReadyLabel"),
      badgeClass: "bg-blue-50 text-blue-700",
      note: t("dashboardExtra.reportReadyNote"),
      noteClass: "text-blue-700",
    };
  }

  return null;
};

export default function Dashboard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { token, user, updateUser } = useContext(AuthContext);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(defaultState);
  const [packageError, setPackageError] = useState("");
  const [openingPackageId, setOpeningPackageId] = useState("");
  const [showAdminAccessNotice, setShowAdminAccessNotice] = useState(
    Boolean(location.state?.adminAccessRequired)
  );

  useEffect(() => {
    if (!location.state?.adminAccessRequired) return;

    navigate(location.pathname, { replace: true, state: null });
  }, [location.pathname, location.state, navigate]);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }

    const userId = cacheUserKey(user);
    const applyData = (data) => {
      setStats({
        tests_completed: data.tests_completed ?? 0,
        tests_in_progress: data.tests_in_progress ?? 0,
        reports_ready: data.reports_ready ?? 0,
        counselling_sessions: data.counselling_sessions ?? 0,
        user: data.user || user || null,
        selected_package_id: data.user?.selectedPackageId || user?.selectedPackageId || "",
        purchased_packages: data.purchased_packages || [],
        top_careers: data.top_careers || [],
        result_status: data.result_status || "not_submitted",
        demo_test: data.demo_test || null,
        student_profile_complete: Boolean(
          data.student_profile_complete ??
            data.user?.studentProfile?.isComplete
        ),
        test_in_progress: data.test_in_progress || null,
      });
    };

    // Serve the cached payload synchronously when fresh (<60s) so the
    // dashboard renders without a network round-trip on repeat visits
    // within the same session.
    const cached = readApiCache("userInit", {
      userId,
      ttlMs: CACHE_TTL.USER_INIT_MS,
    });
    if (cached) {
      applyData(cached);
      setLoading(false);
      return;
    }

    api
      .get("/v1/user/init")
      .then((res) => {
        const data = res?.data?.data;
        if (!data) return;
        writeApiCache("userInit", data, { userId });
        applyData(data);
      })
      .catch((err) => {
        console.error("Failed to load dashboard", err);
        setStats((prev) => ({
          ...prev,
          user: user || null,
        }));
      })
      .finally(() => setLoading(false));
  }, [token, user]);

  const statCards = useMemo(
    () => [
      {
        label: t("dashboardExtra.statTestsCompleted"),
        value: stats.tests_completed,
        icon: CheckCircle2,
        accent: "text-emerald-500",
        bg: "bg-emerald-50",
      },
      {
        label: t("dashboardExtra.statTestsInProgress"),
        value: stats.tests_in_progress,
        icon: PlayCircle,
        accent: "text-amber-500",
        bg: "bg-amber-50",
      },
      {
        label: t("dashboardExtra.statReportsReady"),
        value: stats.reports_ready,
        icon: FileText,
        accent: "text-blue-500",
        bg: "bg-blue-50",
      },
      {
        label: t("dashboardExtra.statCounsellingSessions"),
        value: stats.counselling_sessions,
        icon: Video,
        accent: "text-slate-500",
        bg: "bg-slate-100",
      },
    ],
    [
      t,
      stats.counselling_sessions,
      stats.reports_ready,
      stats.tests_completed,
      stats.tests_in_progress,
    ]
  );

  const openAssessmentPath = (path) => {
    navigate(path);
    window.setTimeout(() => {
      if (window.location.pathname !== path) {
        window.location.assign(path);
      }
    }, 0);
  };

  const redirectToStudentProfile = (pendingPackageId, returnTo = "/dashboard") => {
    navigate("/profile/student", {
      state: { returnTo, pendingPackageId },
    });
  };

  const handleOpenDemo = async () => {
    const demo = stats.demo_test;
    if (!demo) return;

    // If the demo is already submitted and approved, jump straight to the
    // published report instead of starting a new attempt.
    if (demo.publishedReportId) {
      navigate(`/result/${demo.publishedReportId}`);
      return;
    }
    if (demo.publicationStatus === "pending_approval") {
      navigate("/test-completed");
      return;
    }

    // Mandatory student-profile gate. The backend also enforces this in
    // selectPackage; the client check just avoids a noisy round-trip.
    if (!stats.student_profile_complete) {
      redirectToStudentProfile(DEMO_PACKAGE_ID);
      return;
    }

    setPackageError("");
    setOpeningPackageId(DEMO_PACKAGE_ID);

    try {
      await api.patch("/v1/user/package/select", {
        packageId: DEMO_PACKAGE_ID,
        resetProgress: false,
      });
      setStats((prev) => ({
        ...prev,
        selected_package_id: DEMO_PACKAGE_ID,
        user: prev.user
          ? { ...prev.user, selectedPackageId: DEMO_PACKAGE_ID }
          : prev.user,
      }));
      if (user) {
        updateUser({ ...user, selectedPackageId: DEMO_PACKAGE_ID });
      }
      openAssessmentPath("/pretest");
    } catch (err) {
      // If the server returns PROFILE_INCOMPLETE (e.g., stale local
      // student_profile_complete flag), redirect to the form rather than
      // showing a generic error.
      if (err?.response?.data?.error === "PROFILE_INCOMPLETE") {
        redirectToStudentProfile(DEMO_PACKAGE_ID);
        return;
      }
      setPackageError(
        err?.response?.data?.msg ||
          err?.message ||
          t("dashboardExtra.openDemoFailed")
      );
    } finally {
      setOpeningPackageId("");
    }
  };

  const handleOpenPackage = async (pkg) => {
    const statusMeta = getPackageStatusMeta(pkg.status, t);
    const actionMeta = getPackageActionMeta(pkg, t);
    if (!statusMeta.clickable) return;

    if (actionMeta.mode === "pending") {
      navigate("/test-completed");
      return;
    }

    if (actionMeta.mode === "results") {
      navigate(pkg.publishedReportId ? `/result/${pkg.publishedReportId}` : "/result");
      return;
    }

    // Same student-profile gate as the demo CTA.
    if (!stats.student_profile_complete) {
      redirectToStudentProfile(pkg.id);
      return;
    }

    setPackageError("");
    setOpeningPackageId(pkg.id);

    try {
      if (stats.selected_package_id !== pkg.id) {
        await api.patch("/v1/user/package/select", {
          packageId: pkg.id,
          resetProgress: false,
        });
        setStats((prev) => ({
          ...prev,
          selected_package_id: pkg.id,
          user: prev.user ? { ...prev.user, selectedPackageId: pkg.id } : prev.user,
        }));

        if (user) {
          updateUser({ ...user, selectedPackageId: pkg.id });
        }
      }

      openAssessmentPath("/pretest/sections");
    } catch (err) {
      console.error("Failed to open assessment package", err);
      if (err?.response?.data?.error === "PROFILE_INCOMPLETE") {
        redirectToStudentProfile(pkg.id);
        return;
      }
      setPackageError(
        err?.response?.data?.msg ||
          err?.message ||
          t("dashboardExtra.openAssessmentFailed")
      );
    } finally {
      setOpeningPackageId("");
    }
  };

  if (loading) {
    return <DashboardSkeleton />;
  }

  const displayName = stats.user?.name || user?.name || t("dashboardExtra.userFallback");
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <div className="bg-[#FAFAFA]">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        {showAdminAccessNotice ? (
          <div className="mb-6 flex items-start justify-between gap-4 rounded-[24px] border border-[#F8D38B] bg-[#FFF9EE] px-5 py-4">
            <div>
              <h2 className="text-sm font-semibold text-[#0F1729]">
                {t("dashboardExtra.adminNoticeTitle")}
              </h2>
              <p className="mt-1 text-sm leading-6 text-[#65758B]">
                {t("dashboardExtra.adminNoticeBody")}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowAdminAccessNotice(false)}
              className="shrink-0 rounded-full border border-[#E8C16A] px-3 py-1 text-xs font-semibold text-[#8C5A00] hover:bg-white"
            >
              {t("dashboardExtra.dismiss")}
            </button>
          </div>
        ) : null}

        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            {/* break-words: a long single-word surname at text-4xl is wider
                than a phone screen and pushed the whole page sideways. */}
            <h1 className="break-words text-4xl font-bold text-[#0F1729]">
              {t("dashboardExtra.welcomeName", { name: displayName })}
            </h1>
            <p className="mt-2 text-base text-[#65758B]">
              {t("dashboardExtra.subtitle")}
            </p>
          </div>
          <Link
            to="/profile"
            className="inline-flex items-center gap-3 rounded-full border border-[#D9E5EC] bg-white px-5 py-3 text-sm font-semibold text-[#0F1729] shadow-sm hover:border-[#188B8B] hover:bg-[#F6FDFC]"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#E8F9F8] text-[#188B8B]">
              <UserRound className="h-4 w-4" />
            </span>
            {t("dashboardExtra.manageProfile")}
          </Link>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {statCards.map((card) => {
            const Icon = card.icon;
            return (
              <div
                key={card.label}
                className="surface-card rounded-[26px] p-6"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-[#65758B]">{card.label}</p>
                    <p className={`mt-4 text-5xl font-bold ${card.accent}`}>
                      {card.value}
                    </p>
                  </div>
                  <div className={`rounded-2xl p-3 ${card.bg} ${card.accent}`}>
                    <Icon className="h-6 w-6" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Prompt-9 Fix 3: Continue Test card. Shown when the student
            has unfinished progress on their currently selected package.
            Visually prioritised above the demo CTA so "resume" is the
            obvious action for a returning student mid-test. */}
        {stats.test_in_progress ? (
          <section className="mt-8 overflow-hidden rounded-[26px] border border-[#9BD9D6] bg-[linear-gradient(135deg,#EAFBFB_0%,#FFFFFF_55%,#F6FDFC_100%)] p-6 shadow-[0_18px_36px_rgba(24,139,139,0.12)] sm:p-7">
            <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
              <div className="max-w-2xl">
                <div className="flex items-center gap-2">
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-white text-[#188B8B] shadow-sm">
                    <PlayCircle className="h-4 w-4" />
                  </span>
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-[#188B8B]">
                    {t("dashboardExtra.testInProgressBadge")}
                  </span>
                </div>
                <h2 className="mt-4 text-2xl font-bold text-[#0F1729] sm:text-3xl">
                  {t("dashboardExtra.continueYourAssessment", {
                    title: localisedPackageField(
                      t,
                      stats.test_in_progress.packageId,
                      "title",
                      stats.test_in_progress.packageTitle
                    ) || t("dashboardExtra.assessmentFallback"),
                  })}
                </h2>
                <p className="mt-2 text-sm leading-7 text-[#65758B] sm:text-base sm:leading-8">
                  {t("dashboardExtra.youreOnSection", {
                    section: stats.test_in_progress.sectionTitle || t("dashboardExtra.sectionFallback"),
                  })}{" "}
                  <span className="font-semibold text-[#0F1729]">
                    {t("dashboardExtra.sectionsCompletedSoFar", {
                      completed: stats.test_in_progress.completedSectionsCount ?? 0,
                      total: stats.test_in_progress.totalSections ?? 0,
                    })}
                  </span>{" "}
                  {t("dashboardExtra.sectionsCompletedSuffix")}
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  openAssessmentPath(
                    `/livetest/${stats.test_in_progress.sectionId}`
                  )
                }
                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-2xl bg-[#188B8B] px-6 py-3 text-sm font-semibold text-white shadow-[0_14px_28px_rgba(24,139,139,0.22)] hover:bg-[#147070]"
              >
                {t("dashboardExtra.resumeTest")}
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </section>
        ) : null}

        {/*
          Demo Test card visibility rule:
          - Show when the user has no purchased packages yet — the demo
            is the primary CTA for evaluating the platform.
          - Hide entirely once any package is purchased (even if the
            demo hasn't been attempted) — the user's main CTA from then
            on is their actual purchased test, not the demo.
          Excludes the auto-bundled "dummy-test" / free demo entries
          themselves from the purchase check so they don't suppress
          the demo card just because they're listed.
        */}
        {stats.demo_test &&
        !(stats.purchased_packages || []).some(
          (pkg) =>
            pkg.id !== "demo-aptitude-50q" &&
            pkg.id !== "dummy-test" &&
            (pkg.purchaseState === "purchased" ||
              pkg.amount > 0 ||
              pkg.status === "purchased")
        ) ? (
          <section className="mt-8 overflow-hidden rounded-[26px] border border-[#F5D9A6] bg-[linear-gradient(135deg,#FFF6E0_0%,#FFFFFF_55%,#F6FDFC_100%)] p-6 shadow-[0_18px_36px_rgba(245,159,10,0.12)] sm:p-7">
            <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
              <div className="max-w-2xl">
                <div className="flex items-center gap-2">
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-[#FFF1D3] text-[#B86D00]">
                    <Sparkles className="h-4 w-4" />
                  </span>
                  <span className="rounded-full bg-[#FFF1D3] px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-[#B86D00]">
                    {t("dashboardExtra.freeClientDemo")}
                  </span>
                </div>
                <h2 className="mt-4 text-2xl font-bold text-[#0F1729] sm:text-3xl">
                  {t("dashboardExtra.tryDemoTestHeading", {
                    count: stats.demo_test.totalQuestions || 50,
                  })}
                </h2>
                <p className="mt-2 text-sm leading-7 text-[#65758B] sm:text-base sm:leading-8">
                  {t("dashboardExtra.tryDemoTestBody", {
                    minutes: stats.demo_test.totalDurationMinutes || 25,
                  })}
                </p>
                {stats.demo_test.attempted ? (
                  <p className="mt-3 inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1.5 text-xs font-semibold text-[#188B8B]">
                    <CheckCircle2 className="h-4 w-4" />
                    {stats.demo_test.publicationStatus === "approved"
                      ? t("dashboardExtra.demoStatusApproved")
                      : stats.demo_test.publicationStatus === "pending_approval"
                        ? t("dashboardExtra.demoStatusPending")
                        : t("dashboardExtra.demoStatusOnFile")}
                  </p>
                ) : null}
              </div>

              <button
                type="button"
                onClick={handleOpenDemo}
                disabled={openingPackageId === DEMO_PACKAGE_ID}
                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-2xl bg-[#F59F0A] px-6 py-3 text-sm font-semibold text-[#0F1729] shadow-[0_14px_28px_rgba(245,159,10,0.25)] hover:bg-[#E89206] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {openingPackageId === DEMO_PACKAGE_ID
                  ? t("dashboardExtra.opening")
                  : stats.demo_test.publishedReportId
                    ? t("dashboardExtra.viewDemoResult")
                    : stats.demo_test.publicationStatus === "pending_approval"
                      ? t("dashboardExtra.viewSubmissionStatus")
                      : t("dashboardExtra.tryDemoButton")}
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </section>
        ) : null}

        {/* minmax(0,1fr) below xl: an implicit auto column grows to its
            widest unbreakable content and overflowed 375px screens. */}
        <div className="mt-8 grid grid-cols-[minmax(0,1fr)] gap-6 xl:grid-cols-[minmax(0,1.8fr)_minmax(280px,0.9fr)]">
          <section className="surface-card rounded-[30px] p-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-3xl font-bold text-[#0F1729]">
                  {t("dashboardExtra.purchasedPackagesHeading")}
                </h2>
                <p className="mt-2 text-base text-[#65758B]">
                  {t("dashboardExtra.purchasedPackagesBody")}
                </p>
              </div>
              <div className="hidden rounded-full bg-[#F6FDFC] px-4 py-2 text-sm font-semibold text-[#188B8B] sm:block">
                {stats.purchased_packages.length} {t("dashboardExtra.unlocked")}
              </div>
            </div>

            <div className="mt-7 space-y-4">
              {stats.purchased_packages.length ? (
                stats.purchased_packages.map((pkg) => {
                  const statusMeta = getPackageStatusMeta(pkg.status, t);
                  const actionMeta = getPackageActionMeta(pkg, t);
                  const publicationMeta = getPackagePublicationMeta(
                    pkg.publicationStatus,
                    t
                  );
                  return (
                    <button
                      key={pkg.id}
                      type="button"
                      onClick={() => handleOpenPackage(pkg)}
                      disabled={!statusMeta.clickable || openingPackageId === pkg.id}
                      className={`w-full rounded-[26px] border p-6 text-left shadow-sm transition ${statusMeta.cardClass} disabled:cursor-default disabled:opacity-100`}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                          <h3 className="text-2xl font-semibold text-[#0F1729]">
                            {localisedPackageField(t, pkg.packageId || pkg.id, "title", pkg.title)}
                          </h3>
                          <div className="mt-3 flex flex-wrap gap-5 text-sm text-[#65758B]">
                            <span>{t("dashboardExtra.sectionsCount2", { count: pkg.totalSections ?? 0 })}</span>
                            <span>{t("dashboardExtra.totalQuestionsCount", { count: pkg.totalQuestions ?? 0 })}</span>
                            <span>
                              {t("dashboardExtra.totalDurationCount", { count: pkg.totalDurationMinutes ?? 0 })}
                            </span>
                            {/* Expiry line: rendered only when the
                                backend surfaces `expiresAt` on the
                                purchased package. The data model
                                doesn't track expiry today, so this
                                stays hidden until that field lands —
                                avoiding fake / placeholder dates. */}
                            {pkg.expiresAt ? (
                              <span className="font-medium text-[#B86D00]">
                                Expires{" "}
                                {new Date(pkg.expiresAt).toLocaleDateString("en-IN", {
                                  day: "2-digit",
                                  month: "short",
                                  year: "numeric",
                                })}
                              </span>
                            ) : null}
                          </div>
                          {publicationMeta ? (
                            <p
                              className={`mt-3 text-sm font-medium ${publicationMeta.noteClass}`}
                            >
                              {publicationMeta.note}
                            </p>
                          ) : null}
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <span
                            className={`rounded-full px-4 py-2 text-xs font-semibold ${statusMeta.badgeClass}`}
                          >
                            {statusMeta.label}
                          </span>
                          {publicationMeta ? (
                            <span
                              className={`rounded-full px-4 py-2 text-xs font-semibold ${publicationMeta.badgeClass}`}
                            >
                              {publicationMeta.label}
                            </span>
                          ) : null}
                        </div>
                      </div>

                      <div className="mt-6 flex items-center justify-between gap-4">
                        <p className="text-sm font-semibold text-[#188B8B]">
                          {openingPackageId === pkg.id
                            ? t("dashboardExtra.opening")
                            : actionMeta.label}
                        </p>
                        {statusMeta.clickable ? (
                          <ArrowRight className="h-5 w-5 text-[#188B8B]" />
                        ) : null}
                      </div>
                    </button>
                  );
                })
              ) : (
                <div className="rounded-[26px] border border-dashed border-[#C8D7E1] bg-[#FBFCFD] p-8 text-center">
                  <h3 className="text-2xl font-semibold text-[#0F1729]">
                    {t("dashboardExtra.noPackagesHeading")}
                  </h3>
                  <p className="mt-3 text-[#65758B]">
                    {t("dashboardExtra.noPackagesBody")}
                  </p>
                </div>
              )}
            </div>

            {packageError ? (
              <p className="mt-4 text-sm text-red-600">{packageError}</p>
            ) : null}

            <PrefetchLink
              to="/test"
              prefetch={() => import("./Test")}
              className="mt-6 inline-flex w-full items-center justify-center rounded-2xl border-2 border-[#188B8B] px-5 py-3 text-sm font-semibold text-[#188B8B] hover:bg-[#F6FDFC]"
            >
              {t("dashboardExtra.browseMoreTests")}
            </PrefetchLink>
          </section>

          <div className="space-y-6">
            <section className="surface-card rounded-[30px] p-7">
              <h2 className="text-2xl font-bold text-[#0F1729]">
                {t("dashboardExtra.topCareerMatchesHeading")}
              </h2>
              <p className="mt-2 text-sm text-[#65758B]">
                {stats.result_status === "pending_approval"
                  ? t("dashboardExtra.awaitingAdminApproval")
                  : t("dashboardExtra.basedOnResults")}
              </p>

              <div className="mt-5 space-y-3">
                {stats.result_status === "pending_approval" ? (
                  <div className="rounded-2xl border border-[#F8D38B] bg-[#FFF9EE] p-4">
                    <div className="flex items-start gap-3">
                      <div className="rounded-2xl bg-white p-2 text-[#F59F0A]">
                        <Clock3 className="h-4 w-4" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-[#0F1729]">
                          {t("dashboardExtra.resultPendingHeading")}
                        </h3>
                        <p className="mt-1 text-sm leading-6 text-[#65758B]">
                          {t("dashboardExtra.resultPendingBody")}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : stats.top_careers.length ? (
                  stats.top_careers.slice(0, 3).map((career) => (
                    <div
                      key={career.title}
                      className="rounded-2xl bg-[#EAFBFB] p-4"
                    >
                      <div className="flex items-start gap-3">
                        <div className="rounded-2xl bg-white p-2 text-[#188B8B]">
                          <Trophy className="h-4 w-4" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-[#0F1729]">
                            {career.title}
                          </h3>
                          <p className="mt-1 text-sm text-[#65758B]">
                            {t("dashboardExtra.matchPercent", { percent: career.matchPercent ?? 0 })}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-2xl bg-[#F8FAFC] p-4 text-sm text-[#65758B]">
                    {t("dashboardExtra.completeToUnlock")}
                  </div>
                )}
              </div>

              <Link
                to={stats.result_status === "pending_approval" ? "/test-completed" : "/result"}
                className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[#188B8B] hover:underline"
              >
                {stats.result_status === "pending_approval"
                  ? t("dashboardExtra.viewSubmissionStatus")
                  : t("dashboardExtra.openResultsHub")}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </section>

            <section className="surface-card rounded-[30px] bg-[linear-gradient(180deg,#F8FEFE_0%,#FFFFFF_100%)] p-7">
              <h2 className="text-2xl font-bold text-[#0F1729]">
                {t("dashboardExtra.bookCounselling")}
              </h2>
              <p className="mt-2 text-sm text-[#65758B]">
                {t("dashboardExtra.bookCounsellingSubtitle")}
              </p>
              <p className="mt-4 text-sm leading-7 text-[#65758B]">
                {t("dashboardExtra.bookCounsellingBody")}
              </p>
              <Link
                to="/bookcounselling"
                className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#F59F0A] px-5 py-3 text-sm font-semibold text-[#0F1729] shadow-[0_14px_28px_rgba(245,159,10,0.18)] hover:bg-[#E89206]"
              >
                <CalendarDays className="h-4 w-4" />
                {t("dashboardExtra.bookSession")}
              </Link>
            </section>

            <section className="surface-card rounded-[30px] p-7">
              <h2 className="text-2xl font-bold text-[#0F1729]">{t("dashboardExtra.needHelpHeading")}</h2>
              <div className="mt-5 space-y-3">
                <Link
                  to="/bookcounselling"
                  className="flex items-center gap-3 rounded-2xl border border-[#D9E5EC] px-4 py-3 text-sm font-semibold text-[#0F1729] hover:bg-[#F8FAFC]"
                >
                  <HelpCircle className="h-4 w-4 text-[#188B8B]" />
                  {t("dashboardExtra.helpCenter")}
                </Link>
                <Link
                  to="/profile"
                  className="flex items-center gap-3 rounded-2xl border border-[#D9E5EC] px-4 py-3 text-sm font-semibold text-[#0F1729] hover:bg-[#F8FAFC]"
                >
                  <UserRound className="h-4 w-4 text-[#188B8B]" />
                  {t("dashboardExtra.myProfile")}
                </Link>
              </div>
            </section>

            <section className="surface-card rounded-[30px] p-7">
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-[22px] bg-[#188B8B] text-2xl font-bold text-white">
                  {initial}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-[#0F1729]">
                    {displayName}
                  </h2>
                  <p className="text-sm text-[#65758B]">
                    {stats.user?.email || user?.email || t("dashboardExtra.noEmailAvailable")}
                  </p>
                </div>
              </div>
              <Link
                to="/profile"
                className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-[#188B8B] hover:underline"
              >
                {t("dashboardExtra.viewProfile")}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

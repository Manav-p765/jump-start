import { useContext, useEffect, useMemo, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { LogOut, Menu, UserRound, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { AuthContext } from "../context/AuthContext";
import { ensureLanguageBundle, setLanguage, SUPPORTED_LANGUAGES } from "../i18n/i18n";
import ConfirmDialog from "./ConfirmDialog";
import AssetImage from "./AssetImage";
import { company } from "../config/company";

// Nav items live by translation key now. The `to` path is preserved;
// `labelKey` looks up the localized string under the `common.nav`
// namespace at render time.
// `prefetch` is invoked on hover / focus to start downloading the next
// page's lazy chunk before the user clicks — see PrefetchLink for the
// long-form explanation. Each thunk is fired at most once per session
// by the browser's HTTP cache.
const fired = new Set();
const prefetch = (key, importer) => {
  if (fired.has(key)) return;
  fired.add(key);
  try {
    importer().catch(() => fired.delete(key));
  } catch (_err) {
    fired.delete(key);
  }
};

const defaultNavItems = [
  { labelKey: "nav.home", to: "/", prefetch: () => prefetch("/", () => import("../pages/Home")) },
  { labelKey: "nav.tests", to: "/test", prefetch: () => prefetch("/test", () => import("../pages/Test")) },
  { labelKey: "nav.dashboard", to: "/dashboard", prefetch: () => prefetch("/dashboard", () => import("../pages/Dashboard")) },
  { labelKey: "nav.results", to: "/result", prefetch: () => prefetch("/result", () => import("../pages/Result")) },
];

const getLinkClassName = ({ isActive }) =>
  `text-sm font-semibold ${
    isActive ? "text-[#157A7A]" : "text-[#0F1729] hover:text-[#157A7A]"
  }`;

const getMobileLinkClassName = ({ isActive }) =>
  `rounded-2xl px-4 py-3 text-[15px] font-semibold transition-colors ${
    isActive
      ? "bg-[#EAFBFB] text-[#157A7A]"
      : "text-[#0F1729] hover:bg-[#F8FAFC] hover:text-[#157A7A]"
  }`;

export default function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useContext(AuthContext);
  const { t, i18n } = useTranslation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const isAdmin = user?.role === "admin";
  const currentLanguage = SUPPORTED_LANGUAGES.includes(i18n.language)
    ? i18n.language
    : "en";

  const firstName = useMemo(() => {
    const name = String(user?.name || "").trim();
    return name ? name.split(/\s+/)[0] : "Profile";
  }, [user?.name]);

  const navItems = useMemo(() => {
    if (!isAdmin) return defaultNavItems;

    // Match on labelKey, not label: the items only define labelKey (the
    // i18n migration renamed the field), so the old item.label checks
    // compared against undefined and silently left admins pointed at the
    // STUDENT /dashboard and /result pages.
    return defaultNavItems.map((item) => {
      if (item.labelKey === "nav.dashboard") {
        return { ...item, to: "/admin/dashboard" };
      }

      if (item.labelKey === "nav.results") {
        return { ...item, to: "/admin/publishedresults" };
      }

      return item;
    });
  }, [isAdmin]);

  const handleLogout = () => {
    setMobileOpen(false);
    setShowLogoutDialog(true);
  };

  const handleLogoutConfirm = () => {
    logout();
    setShowLogoutDialog(false);
    setMobileOpen(false);
    navigate("/", { replace: true });
  };

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!mobileOpen) {
      document.body.style.overflow = "";
      return undefined;
    }

    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  const desktopNavLinks = (
    <>
      {navItems.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          onClick={() => setMobileOpen(false)}
          onMouseEnter={item.prefetch}
          onFocus={item.prefetch}
          className={getLinkClassName}
        >
          {t(item.labelKey)}
        </NavLink>
      ))}
    </>
  );

  const mobileNavLinks = (
    <>
      {navItems.map((item) => (
        <NavLink
          key={`mobile-${item.to}`}
          to={item.to}
          onClick={() => setMobileOpen(false)}
          onMouseEnter={item.prefetch}
          onFocus={item.prefetch}
          className={getMobileLinkClassName}
        >
          {t(item.labelKey)}
        </NavLink>
      ))}
    </>
  );

  // EN / ગુજ toggle. Switches the site UI locale; the choice persists in
  // localStorage (see setLanguage in i18n.js).
  const renderLanguageToggle = (extraClass = "") => (
    <div
      role="group"
      aria-label={t("language.label")}
      className={`inline-flex items-center gap-1 rounded-full border border-[#D9E5EC] bg-white p-0.5 ${extraClass}`}
    >
      {SUPPORTED_LANGUAGES.map((lang) => {
        const isActive = currentLanguage === lang;
        return (
          <button
            key={lang}
            type="button"
            lang={lang}
            onClick={() => setLanguage(lang)}
            // Fetch the locale chunk on intent so the click switches at once.
            onPointerEnter={() => ensureLanguageBundle(lang)}
            onFocus={() => ensureLanguageBundle(lang)}
            aria-pressed={isActive}
            data-lang-toggle={lang}
            className={`rounded-full px-2.5 py-1 text-xs font-semibold transition ${
              isActive
                ? "bg-[#157A7A] text-white"
                : "text-[#0F1729] hover:bg-[#F0FBFB]"
            }`}
          >
            {lang === "gu" ? t("language.gujarati") : t("language.english")}
          </button>
        );
      })}
    </div>
  );

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-[#E8EDF3] bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-10">
            <Link to="/" className="flex items-center" aria-label={`${company.brandName} home`}>
              {/* Full wordmark logo on sm+; icon-only mark on the narrowest
                  screens where the wordmark would crowd the header bar.

                  width/height carry the intrinsic aspect ratio so the
                  browser reserves the right box before the file arrives.
                  Without them `w-auto` resolves to 0 until decode, and the
                  whole header row re-lays-out on load — a shift at the very
                  top of the page that pushes every section below it. */}
              <AssetImage
                name="jumpstride-logo"
                alt={company.brandName}
                width={711}
                height={443}
                priority
                className="hidden h-11 w-auto sm:block"
              />
              <AssetImage
                name="jumpstart-icon"
                alt={company.brandName}
                width={187}
                height={187}
                priority
                className="h-10 w-10 sm:hidden"
              />
            </Link>

            <nav className="hidden items-center gap-8 lg:flex">{desktopNavLinks}</nav>
          </div>

          <div className="hidden items-center gap-3 lg:flex">
            {renderLanguageToggle()}
            {user ? (
              <>
                <Link
                  to="/profile"
                  className="inline-flex items-center gap-2 rounded-full border border-[#D9E5EC] px-4 py-2 text-sm font-semibold text-[#0F1729] hover:border-[#188B8B] hover:bg-[#F0FBFB]"
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#E8F9F8] text-[#157A7A]">
                    <UserRound className="h-4 w-4" />
                  </span>
                  {firstName}
                </Link>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="inline-flex items-center gap-2 rounded-full bg-[#F59F0A] px-5 py-3 text-sm font-semibold text-[#0F1729] shadow-[0_12px_24px_rgba(245,159,10,0.22)] hover:-translate-y-0.5 hover:bg-[#E89206]"
                >
                  <LogOut className="h-4 w-4" />
                  {t("nav.logout")}
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="inline-flex items-center gap-2 text-sm font-semibold text-[#0F1729] hover:text-[#157A7A]"
                >
                  <UserRound className="h-4 w-4" />
                  {t("nav.signIn")}
                </Link>
                <Link to="/signup" className="primary-btn">
                  {t("nav.getStarted")}
                </Link>
              </>
            )}
          </div>

          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="inline-flex items-center justify-center rounded-2xl border border-[#D9E5EC] p-2 text-[#0F1729] lg:hidden"
            aria-label="Open navigation menu"
            aria-expanded={mobileOpen}
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </header>

      <div
        className={`fixed inset-0 z-50 lg:hidden transition-opacity duration-300 ${
          mobileOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        }`}
      >
        <div
          className="absolute inset-0 bg-[#0F1729]/40 backdrop-blur-[1px]"
          onClick={() => setMobileOpen(false)}
        />
        <div
          className={`ml-auto flex h-full w-full max-w-[22rem] flex-col bg-white px-5 py-5 shadow-2xl transition-transform duration-300 ease-out ${
            mobileOpen ? "translate-x-0" : "translate-x-full"
          }`}
          onClick={(event) => event.stopPropagation()}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <AssetImage
                name="jumpstride-logo"
                alt={company.brandName}
                width={711}
                height={443}
                className="h-10 w-auto"
              />
            </div>
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="rounded-2xl border border-[#D9E5EC] p-2 text-[#0F1729]"
              aria-label="Close navigation menu"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <nav className="mt-8 flex flex-col gap-2">{mobileNavLinks}</nav>

          <div className="mt-6 flex justify-center">{renderLanguageToggle()}</div>

          <div className="mt-auto flex flex-col gap-3 pt-8">
            {user ? (
              <>
                <Link
                  to="/profile"
                  onClick={() => setMobileOpen(false)}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[#D9E5EC] px-4 py-3 text-sm font-semibold text-[#0F1729]"
                >
                  <UserRound className="h-4 w-4" />
                  {t("nav.profile")}
                </Link>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#F59F0A] px-4 py-3 text-sm font-semibold text-[#0F1729]"
                >
                  <LogOut className="h-4 w-4" />
                  {t("nav.logout")}
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  onClick={() => setMobileOpen(false)}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[#D9E5EC] px-4 py-3 text-sm font-semibold text-[#0F1729]"
                >
                  <UserRound className="h-4 w-4" />
                  {t("nav.signIn")}
                </Link>
                <Link
                  to="/signup"
                  onClick={() => setMobileOpen(false)}
                  className="primary-btn"
                >
                  {t("nav.getStarted")}
                </Link>
              </>
            )}
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={showLogoutDialog}
        title="Confirm Logout"
        description={`Are you sure you want to log out of your ${company.brandName} account?`}
        confirmLabel="Logout"
        cancelLabel="Stay Logged In"
        onCancel={() => setShowLogoutDialog(false)}
        onConfirm={handleLogoutConfirm}
      />
    </>
  );
}

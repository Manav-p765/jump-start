import { useContext, useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowRight, CheckCircle2, Eye, EyeOff, ShieldCheck } from "lucide-react";
import { AuthContext } from "../context/AuthContext";
import jumpstartLogo from "../assets/jumpstart-logo.png";
import { company } from "../config/company";
import {
  googleClientId,
  googleConfigMessage,
  isGoogleAuthConfigured,
} from "../config/env";

// Highlight strings live in the locale files so they translate when
// the language toggle flips. Keys: auth.highlightResume,
// auth.highlightTrack, auth.highlightUnlock.
const HIGHLIGHT_KEYS = [
  "auth.highlightResume",
  "auth.highlightTrack",
  "auth.highlightUnlock",
];

const getPostLoginDestination = (authResponse) =>
  authResponse?.data?.user?.role === "admin" ? "/admin/dashboard" : "/dashboard";

export default function Login() {
  const { t } = useTranslation();
  const { login, loginWithGoogle } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const adminLoginRequired = Boolean(location.state?.adminLoginRequired);
  const switchAccountRequired = Boolean(location.state?.switchAccountRequired);

  const handleGoogleResponse = async (response) => {
    try {
      const idToken = response.credential;
      const authResponse = await loginWithGoogle(idToken);
      navigate(getPostLoginDestination(authResponse), { replace: true });
    } catch (err) {
      console.error("Google Login Error:", err);
      setError(err.message || t("auth.googleLoginError"));
    }
  };

  useEffect(() => {
    if (!isGoogleAuthConfigured) {
      setError(googleConfigMessage);
      return;
    }

    const loadScript = () =>
      new Promise((resolve, reject) => {
        if (window.google?.accounts) {
          resolve();
          return;
        }

        const script = document.createElement("script");
        script.src = "https://accounts.google.com/gsi/client";
        script.async = true;
        script.defer = true;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error("Google script failed to load"));
        document.body.appendChild(script);
      });

    loadScript()
      .then(() => {
        if (!window.google?.accounts) {
          setError(t("auth.googleFailed"));
          return;
        }

        window.google.accounts.id.initialize({
          client_id: googleClientId,
          callback: handleGoogleResponse,
          ux_mode: "popup",
        });

        const buttonRoot = document.getElementById("google-btn");
        const buttonWidth = Math.max(buttonRoot?.clientWidth || 0, 280);

        window.google.accounts.id.renderButton(buttonRoot, {
          theme: "outline",
          size: "large",
          width: buttonWidth,
        });
      })
      .catch(() => {
        setError("Google Sign-In could not be loaded.");
      });
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const authResponse = await login({ email, password });
      navigate(getPostLoginDestination(authResponse), { replace: true });
    } catch (err) {
      setError(err.message || t("auth.invalidCredentials"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[0.95fr_1.05fr] lg:px-8">
        <div className="surface-card rounded-[32px] p-8 sm:p-10">
          <img
            src={jumpstartLogo}
            alt={company.brandName}
            width="333"
            height="235"
            fetchPriority="high"
            className="mb-6 h-12 w-auto"
          />
          <div className="inline-flex items-center gap-2 rounded-full bg-[#E8F9F8] px-4 py-2 text-sm font-semibold text-[#188B8B]">
            <ShieldCheck className="h-4 w-4" />
            {adminLoginRequired ? t("auth.adminAccess") : t("auth.loginTitle")}
          </div>
          <h1 className="mt-6 text-4xl font-bold text-[#0F1729]">
            {adminLoginRequired ? t("auth.adminSignIn") : t("nav.signIn")}
          </h1>
          <p className="mt-3 text-base text-[#65758B]">
            {adminLoginRequired
              ? t("auth.adminSubtitle")
              : t("auth.loginSubtitle")}
          </p>

          {switchAccountRequired ? (
            <div className="mt-5 rounded-2xl border border-[#F4DCA8] bg-[#FFF9EE] px-4 py-3 text-sm text-[#8C5A00]">
              {t("auth.switchAccountWarning")}
            </div>
          ) : null}

          <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
            <div>
              <label className="mb-2 block text-sm font-semibold text-[#344054]">
                {t("auth.emailLabel")}
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-[56px] w-full rounded-2xl border border-[#E1E7EF] px-4 text-sm text-[#0F1729] outline-none focus:border-[#188B8B]"
                required
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-[#344054]">
                {t("auth.passwordLabel")}
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-[56px] w-full rounded-2xl border border-[#E1E7EF] px-4 pr-12 text-sm text-[#0F1729] outline-none focus:border-[#188B8B]"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((current) => !current)}
                  aria-label={
                    showPassword
                      ? t("auth.hidePassword")
                      : t("auth.showPassword")
                  }
                  className="absolute inset-y-0 right-0 flex items-center px-4 text-[#65758B] transition hover:text-[#0F1729]"
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>

            {error ? <p className="text-sm text-red-600">{error}</p> : null}

            <button
              type="submit"
              disabled={loading}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#0F1729] px-5 py-3.5 text-sm font-semibold text-white hover:bg-[#1E293B] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {loading ? t("auth.loggingIn") : t("auth.loginButton")}
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>

          <div className="mt-4" id="google-btn" />

          <p className="mt-6 text-sm text-[#65758B]">
            {t("auth.noAccount")}{" "}
            <Link to="/signup" className="font-semibold text-[#188B8B] hover:underline">
              {t("auth.createOneNow")}
            </Link>
          </p>
        </div>

        <div className="relative overflow-hidden rounded-[36px] bg-[radial-gradient(circle_at_top_left,_rgba(52,211,203,0.28),_transparent_35%),linear-gradient(180deg,#F4FEFE_0%,#EAFBFB_100%)] p-8 sm:p-10">
          <div className="max-w-xl">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#188B8B]">
              {t("auth.accountSidePillow")}
            </p>
            <h2 className="mt-5 text-4xl font-bold text-[#0F1729]">
              {t("auth.accountSideHeading")}
            </h2>
            <p className="mt-5 text-base leading-8 text-[#65758B]">
              {t("auth.accountSideBody")}
            </p>
          </div>

          <div className="mt-10 space-y-4">
            {HIGHLIGHT_KEYS.map((key) => (
              <div
                key={key}
                className="surface-card rounded-[24px] bg-white/90 px-5 py-4"
              >
                <div className="flex items-start gap-3">
                  <div className="rounded-full bg-[#E8F9F8] p-2 text-[#188B8B]">
                    <CheckCircle2 className="h-4 w-4" />
                  </div>
                  <p className="text-sm leading-7 text-[#0F1729]">{t(key)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

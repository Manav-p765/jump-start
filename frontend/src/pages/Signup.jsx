import { useContext, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowRight, BadgeCheck, Eye, EyeOff, Sparkles } from "lucide-react";
import { AuthContext } from "../context/AuthContext";
import jumpstartLogo from "../assets/jumpstart-logo.png";
import { company } from "../config/company";
import {
  apiUnavailableMessage,
  getApiV1Url,
  googleConfigMessage,
  googleClientId,
  isGoogleAuthConfigured,
} from "../config/env";

const BENEFIT_KEYS = [
  "auth.signupBenefitPurchased",
  "auth.signupBenefitAnswers",
  "auth.signupBenefitResults",
];

export default function Signup() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { loginWithGoogle } = useContext(AuthContext);

  const [form, setForm] = useState({
    name: "",
    mobile: "",
    email: "",
    password: "",
    password_confirmation: "",
  });
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleGoogleResponse = async (response) => {
    try {
      const idToken = response.credential;
      await loginWithGoogle(idToken);
      navigate("/dashboard");
    } catch (err) {
      console.error("Google Signup Error:", err);
      setMsg(err.message || t("auth.googleSignupError"));
    }
  };

  useEffect(() => {
    if (!isGoogleAuthConfigured) {
      setMsg(googleConfigMessage);
      return;
    }

    const loadScript = () =>
      new Promise((resolve) => {
        if (window.google?.accounts) {
          resolve();
          return;
        }

        const script = document.createElement("script");
        script.src = "https://accounts.google.com/gsi/client";
        script.async = true;
        script.defer = true;
        script.onload = resolve;
        document.body.appendChild(script);
      });

    loadScript().then(() => {
      if (!window.google?.accounts) {
        setMsg(t("auth.googleFailed"));
        return;
      }

      window.google.accounts.id.initialize({
        client_id: googleClientId,
        callback: handleGoogleResponse,
        ux_mode: "popup",
      });

      const buttonRoot = document.getElementById("google-signup");
      const buttonWidth = Math.max(buttonRoot?.clientWidth || 0, 280);

      window.google.accounts.id.renderButton(buttonRoot, {
        theme: "outline",
        size: "large",
        width: buttonWidth,
      });
    });
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setMsg("");

    try {
      const res = await fetch(getApiV1Url("/user/auth/register"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();
      if (res.ok) {
        setMsg(t("auth.signupSuccessful"));
        window.setTimeout(() => navigate("/login"), 500);
      } else {
        setMsg(data.msg || data.message || t("auth.signupFailed"));
      }
    } catch (error) {
      console.error("Signup error:", error);
      setMsg(apiUnavailableMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[1.02fr_0.98fr] lg:px-8">
        <div className="relative overflow-hidden rounded-[36px] bg-[radial-gradient(circle_at_top_left,_rgba(52,211,203,0.28),_transparent_35%),linear-gradient(180deg,#F4FEFE_0%,#EAFBFB_100%)] p-8 sm:p-10">
          <div className="max-w-xl">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#188B8B]">
              {t("auth.signupTitle")}
            </p>
            <h2 className="mt-5 text-4xl font-bold text-[#0F1729]">
              {t("auth.signupHeroBigHeading")}
            </h2>
            <p className="mt-5 text-base leading-8 text-[#65758B]">
              {t("auth.signupHeroBigBody")}
            </p>
          </div>

          <div className="mt-10 space-y-4">
            {BENEFIT_KEYS.map((key) => (
              <div
                key={key}
                className="surface-card rounded-[24px] bg-white/90 px-5 py-4"
              >
                <div className="flex items-start gap-3">
                  <div className="rounded-full bg-[#E8F9F8] p-2 text-[#188B8B]">
                    <BadgeCheck className="h-4 w-4" />
                  </div>
                  <p className="text-sm leading-7 text-[#0F1729]">{t(key)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

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
            <Sparkles className="h-4 w-4" />
            {t("auth.getStartedBadge")}
          </div>
          <h1 className="mt-6 text-4xl font-bold text-[#0F1729]">{t("auth.signupHeading")}</h1>
          <p className="mt-3 text-base text-[#65758B]">
            {t("auth.signupShortBody")}
          </p>

          <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
            <div>
              <label className="mb-2 block text-sm font-semibold text-[#344054]">
                {t("auth.nameLabelShort")}
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => handleChange("name", e.target.value)}
                className="h-[56px] w-full rounded-2xl border border-[#E1E7EF] px-4 text-sm text-[#0F1729] outline-none focus:border-[#188B8B]"
                required
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-[#344054]">
                {t("auth.mobileLabel")}
              </label>
              <input
                type="tel"
                value={form.mobile}
                onChange={(e) => handleChange("mobile", e.target.value)}
                className="h-[56px] w-full rounded-2xl border border-[#E1E7EF] px-4 text-sm text-[#0F1729] outline-none focus:border-[#188B8B]"
                required
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-[#344054]">
                {t("auth.emailLabel")}
              </label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => handleChange("email", e.target.value)}
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
                  value={form.password}
                  onChange={(e) => handleChange("password", e.target.value)}
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
            <div>
              <label className="mb-2 block text-sm font-semibold text-[#344054]">
                {t("auth.confirmPasswordLabel")}
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  value={form.password_confirmation}
                  onChange={(e) =>
                    handleChange("password_confirmation", e.target.value)
                  }
                  className="h-[56px] w-full rounded-2xl border border-[#E1E7EF] px-4 pr-12 text-sm text-[#0F1729] outline-none focus:border-[#188B8B]"
                  required
                />
                <button
                  type="button"
                  onClick={() =>
                    setShowConfirmPassword((current) => !current)
                  }
                  aria-label={
                    showConfirmPassword
                      ? t("auth.hideConfirmPassword")
                      : t("auth.showConfirmPassword")
                  }
                  className="absolute inset-y-0 right-0 flex items-center px-4 text-[#65758B] transition hover:text-[#0F1729]"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>

            {msg ? (
              <p
                className={`text-sm ${
                  msg.toLowerCase().includes("successful") ||
                  msg === t("auth.signupSuccessful")
                    ? "text-emerald-700"
                    : "text-red-600"
                }`}
              >
                {msg}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={loading}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#0F1729] px-5 py-3.5 text-sm font-semibold text-white hover:bg-[#1E293B] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {loading ? t("auth.signingUp") : t("auth.createAccount")}
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>

          <div className="mt-4" id="google-signup" />

          <p className="mt-6 text-sm text-[#65758B]">
            {t("auth.alreadyHaveAccount")}{" "}
            <Link to="/login" className="font-semibold text-[#188B8B] hover:underline">
              {t("auth.loginShort")}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

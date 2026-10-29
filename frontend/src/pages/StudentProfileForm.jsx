import { useContext, useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft, GraduationCap, Loader2 } from "lucide-react";
import api from "../api/api";
import { AuthContext } from "../context/AuthContext";

// Option arrays carry stable english `value` (sent to the backend) +
// translation `labelKey` (rendered to the user). The form keeps the
// english string in state so the DB stays consistent across languages.
const GENDER_OPTIONS = [
  { value: "Male", labelKey: "studentProfile.genderMaleOption" },
  { value: "Female", labelKey: "studentProfile.genderFemaleOption" },
  { value: "Other", labelKey: "studentProfile.genderOtherOption" },
  { value: "Prefer not to say", labelKey: "studentProfile.genderPreferNotOption" },
];

const STREAM_OPTIONS = [
  { value: "Science", labelKey: "studentProfile.streamScience" },
  { value: "Commerce", labelKey: "studentProfile.streamCommerce" },
  { value: "Arts", labelKey: "studentProfile.streamArts" },
  { value: "Not Applicable", labelKey: "studentProfile.streamNA" },
  { value: "Other", labelKey: "studentProfile.streamOther" },
];

// 28 states + 8 union territories (current as of 2026).
const INDIAN_STATES_AND_UTS = [
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
  "Andaman and Nicobar Islands",
  "Chandigarh",
  "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi",
  "Jammu and Kashmir",
  "Ladakh",
  "Lakshadweep",
  "Puducherry",
];

const REQUIRED_FIELDS = [
  "dateOfBirth",
  "gender",
  "schoolOrCollege",
  "classOrGrade",
  "city",
  "state",
];

const EMPTY_FORM = {
  dateOfBirth: "",
  gender: "",
  phone: "",
  schoolOrCollege: "",
  classOrGrade: "",
  stream: "",
  board: "",
  city: "",
  state: "",
};

const labelClass =
  "block text-sm font-semibold text-[#0F1729] mb-1.5";
const inputClass =
  "w-full rounded-[14px] border border-[#D9E5EC] bg-white px-4 py-2.5 text-sm text-[#0F1729] placeholder:text-[#9BA8B8] focus:border-[#188B8B] focus:outline-none focus:ring-2 focus:ring-[#188B8B]/20";
const helperClass = "mt-1 text-[12px] leading-5 text-[#7D8CA2]";
const errorClass = "mt-1 text-[12px] font-medium text-[#B91C1C]";

function Field({
  id,
  label,
  required,
  helper,
  error,
  children,
}) {
  return (
    <div>
      <label htmlFor={id} className={labelClass}>
        {label}
        {required ? <span className="ml-1 text-[#B91C1C]">*</span> : null}
      </label>
      {children}
      {error ? (
        <p className={errorClass}>{error}</p>
      ) : helper ? (
        <p className={helperClass}>{helper}</p>
      ) : null}
    </div>
  );
}

export default function StudentProfileForm() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useContext(AuthContext);

  const returnTo = location.state?.returnTo || "/dashboard";
  const pendingPackageId = location.state?.pendingPackageId || "";

  const [form, setForm] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [topError, setTopError] = useState("");

  useEffect(() => {
    let cancelled = false;
    api
      .get("/v1/user/profile/student")
      .then((res) => {
        if (cancelled) return;
        const sp = res?.data?.data?.studentProfile || {};
        setForm({
          dateOfBirth: sp.dateOfBirth || "",
          gender: sp.gender || "",
          phone: sp.phone || "",
          schoolOrCollege: sp.schoolOrCollege || "",
          classOrGrade: sp.classOrGrade || "",
          stream: sp.stream || "",
          board: sp.board || "",
          city: sp.city || "",
          state: sp.state || "",
        });
      })
      .catch(() => {
        // 401 will already redirect to /login via the axios interceptor;
        // for any other error just start with an empty form.
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const missingRequired = useMemo(
    () =>
      REQUIRED_FIELDS.filter((field) => !String(form[field] || "").trim()),
    [form]
  );

  const updateField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setTopError("");
    setErrors({});

    if (missingRequired.length) {
      setErrors(
        Object.fromEntries(
          missingRequired.map((field) => [field, t("studentProfile.errorRequired")])
        )
      );
      setTopError(t("studentProfile.completeRequiredFields"));
      return;
    }

    setSaving(true);
    try {
      await api.put("/v1/user/profile/student", form);

      // If the user reached this form because they tried to start a test,
      // resume that flow by calling selectPackage now (profile is complete,
      // so the backend gate passes) and routing on to /pretest. Otherwise
      // honor the returnTo route the caller passed in.
      if (pendingPackageId) {
        try {
          await api.patch("/v1/user/package/select", {
            packageId: pendingPackageId,
            resetProgress: false,
          });
          navigate("/pretest", { replace: true });
          return;
        } catch (selectErr) {
          // Profile saved, but package selection failed for an unrelated
          // reason (e.g., not purchased). Fall back to returnTo so the
          // student lands somewhere useful and sees the actual reason.
          const msg =
            selectErr?.response?.data?.msg ||
            selectErr?.message ||
            t("studentProfile.selectFailedFallback");
          navigate(returnTo, { replace: true, state: { notice: msg } });
          return;
        }
      }

      navigate(returnTo, { replace: true });
    } catch (err) {
      const responseErrors = err?.response?.data?.errors;
      if (responseErrors && typeof responseErrors === "object") {
        setErrors(responseErrors);
      }
      setTopError(
        err?.response?.data?.msg ||
          err?.message ||
          t("studentProfile.saveFailed")
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center bg-[#FAFAFA] px-4">
        <p className="text-sm font-medium text-[#65758B]">
          {t("studentProfile.loadingNow")}
        </p>
      </div>
    );
  }

  return (
    <div className="bg-[#FAFAFA] py-10">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <Link
          to={returnTo}
          className="inline-flex items-center gap-2 text-sm font-semibold text-[#4E5D72] hover:text-[#157A7A]"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("studentProfile.back")}
        </Link>

        <div className="surface-card mt-4 rounded-[28px] p-7 sm:p-9">
          <div className="flex items-start gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#EAFBFB] text-[#157A7A]">
              <GraduationCap className="h-5 w-5" />
            </span>
            <div>
              <h1 className="text-3xl font-bold text-[#0F1729]">
                {t("studentProfile.title")}
              </h1>
              <p className="mt-1.5 max-w-xl text-sm leading-7 text-[#65758B]">
                {t("studentProfile.introBody")}
              </p>
            </div>
          </div>

          {topError ? (
            <div className="mt-6 rounded-[14px] border border-[#FCA5A5] bg-[#FEF2F2] px-4 py-3 text-sm text-[#B91C1C]">
              {topError}
            </div>
          ) : null}

          <form onSubmit={handleSubmit} className="mt-7 space-y-8" noValidate>
            <section>
              <h2 className="text-lg font-bold text-[#0F1729]">
                {t("studentProfile.personalDetails")}
              </h2>
              <div className="mt-4 grid gap-5 sm:grid-cols-2">
                <Field id="fullName" label={t("studentProfile.fullNameLabel")}>
                  <input
                    id="fullName"
                    type="text"
                    value={user?.name || ""}
                    readOnly
                    className={`${inputClass} cursor-not-allowed bg-[#F4F6F9] text-[#65758B]`}
                  />
                  <p className={helperClass}>
                    {t("studentProfile.fullNameHelper")}
                  </p>
                </Field>
                <Field
                  id="dateOfBirth"
                  label={t("studentProfile.dateOfBirthLabel")}
                  required
                  error={errors.dateOfBirth}
                >
                  <input
                    id="dateOfBirth"
                    type="date"
                    value={form.dateOfBirth}
                    onChange={(e) => updateField("dateOfBirth", e.target.value)}
                    max={new Date().toISOString().slice(0, 10)}
                    className={inputClass}
                    aria-invalid={Boolean(errors.dateOfBirth)}
                    aria-required="true"
                  />
                </Field>
                <Field
                  id="gender"
                  label={t("studentProfile.genderLabel")}
                  required
                  error={errors.gender}
                >
                  <select
                    id="gender"
                    value={form.gender}
                    onChange={(e) => updateField("gender", e.target.value)}
                    className={inputClass}
                    aria-invalid={Boolean(errors.gender)}
                    aria-required="true"
                  >
                    <option value="">{t("studentProfile.selectGender")}</option>
                    {GENDER_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {t(opt.labelKey)}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field
                  id="phone"
                  label={t("studentProfile.phoneNumberLabel")}
                  helper={t("studentProfile.phoneHelper")}
                  error={errors.phone}
                >
                  <input
                    id="phone"
                    type="tel"
                    value={form.phone}
                    onChange={(e) => updateField("phone", e.target.value)}
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={15}
                    placeholder="9876543210"
                    className={inputClass}
                    aria-invalid={Boolean(errors.phone)}
                  />
                </Field>
              </div>
            </section>

            <section>
              <h2 className="text-lg font-bold text-[#0F1729]">
                {t("studentProfile.academicDetails")}
              </h2>
              <div className="mt-4 grid gap-5 sm:grid-cols-2">
                <Field
                  id="schoolOrCollege"
                  label={t("studentProfile.schoolCollegeLabel")}
                  required
                  error={errors.schoolOrCollege}
                >
                  <input
                    id="schoolOrCollege"
                    type="text"
                    value={form.schoolOrCollege}
                    onChange={(e) =>
                      updateField("schoolOrCollege", e.target.value)
                    }
                    placeholder="St. Xavier's School"
                    className={inputClass}
                    aria-invalid={Boolean(errors.schoolOrCollege)}
                    aria-required="true"
                  />
                </Field>
                <Field
                  id="classOrGrade"
                  label={t("studentProfile.classOrGradeLabel")}
                  required
                  helper={t("studentProfile.classOrGradeHelper")}
                  error={errors.classOrGrade}
                >
                  <input
                    id="classOrGrade"
                    type="text"
                    value={form.classOrGrade}
                    onChange={(e) =>
                      updateField("classOrGrade", e.target.value)
                    }
                    placeholder="Class 12"
                    className={inputClass}
                    aria-invalid={Boolean(errors.classOrGrade)}
                    aria-required="true"
                  />
                </Field>
                <Field
                  id="stream"
                  label={t("studentProfile.streamLabel")}
                  error={errors.stream}
                >
                  <select
                    id="stream"
                    value={form.stream}
                    onChange={(e) => updateField("stream", e.target.value)}
                    className={inputClass}
                    aria-invalid={Boolean(errors.stream)}
                  >
                    <option value="">{t("studentProfile.selectStream")}</option>
                    {STREAM_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {t(opt.labelKey)}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field
                  id="board"
                  label={t("studentProfile.boardLabel")}
                  helper={t("studentProfile.boardHelper")}
                  error={errors.board}
                >
                  <input
                    id="board"
                    type="text"
                    value={form.board}
                    onChange={(e) => updateField("board", e.target.value)}
                    placeholder="CBSE"
                    className={inputClass}
                    aria-invalid={Boolean(errors.board)}
                  />
                </Field>
              </div>
            </section>

            <section>
              <h2 className="text-lg font-bold text-[#0F1729]">{t("studentProfile.location")}</h2>
              <div className="mt-4 grid gap-5 sm:grid-cols-2">
                <Field id="city" label={t("studentProfile.cityLabel2")} required error={errors.city}>
                  <input
                    id="city"
                    type="text"
                    value={form.city}
                    onChange={(e) => updateField("city", e.target.value)}
                    placeholder="Jaipur"
                    className={inputClass}
                    aria-invalid={Boolean(errors.city)}
                    aria-required="true"
                  />
                </Field>
                <Field
                  id="state"
                  label={t("studentProfile.stateLabel2")}
                  required
                  error={errors.state}
                >
                  <select
                    id="state"
                    value={form.state}
                    onChange={(e) => updateField("state", e.target.value)}
                    className={inputClass}
                    aria-invalid={Boolean(errors.state)}
                    aria-required="true"
                  >
                    <option value="">{t("studentProfile.selectState")}</option>
                    {INDIAN_STATES_AND_UTS.map((stateName) => (
                      <option key={stateName} value={stateName}>
                        {stateName}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
            </section>

            <div className="flex flex-col gap-3 border-t border-[#E6EEF2] pt-6 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-[#7D8CA2]">
                {t("studentProfile.requiredFieldsNotice")}
              </p>
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center justify-center gap-2 rounded-[14px] bg-[#188B8B] px-6 py-3 text-sm font-semibold text-white shadow-[0_14px_28px_rgba(24,139,139,0.22)] hover:bg-[#147070] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {t("studentProfile.savingNow")}
                  </>
                ) : (
                  t("studentProfile.saveAndContinue")
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

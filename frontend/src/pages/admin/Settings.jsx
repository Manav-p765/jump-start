import React, { useMemo, useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import api from "../../api/api";
import { SettingsSkeleton } from "../../components/admin/Skeletons";
import TranslationsPanel from "../../components/admin/TranslationsPanel";
import CouponsPanel from "../../components/admin/CouponsPanel";

const blankPackage = {
  id: "",
  title: "",
  badge: "Recommended",
  amount: 0,
  strikeAmount: "",
  features: [],
  durationText: "",
  active: true,
  sortOrder: 1,
  sections: [],
};

const blankSection = (idx) => ({
  sectionId: idx,
  title: `Section ${idx}`,
  durationMinutes: 20,
  enabled: true,
  scoringType: "mixed",
  sheetCsvUrl: "",
  questions: [],
});

const blankSupportPage = (title) => ({
  enabled: true,
  title,
  summary: "",
  items: [],
  faqItems: [],
});

const createBlankFaqItem = () => ({
  heading: "",
  content: "",
});

const normalizeTextBlocks = (items = []) =>
  Array.isArray(items) ? items.map((item) => String(item || "")) : [];

const splitLegacyFaqItem = (value = "") => {
  const text = String(value || "").trim();
  if (!text) return null;

  const questionBreakIndex = text.indexOf("? ");
  if (questionBreakIndex >= 0) {
    return {
      heading: text.slice(0, questionBreakIndex + 1).trim(),
      content: text.slice(questionBreakIndex + 2).trim(),
    };
  }

  const colonBreakIndex = text.indexOf(": ");
  if (colonBreakIndex >= 0) {
    return {
      heading: text.slice(0, colonBreakIndex).trim(),
      content: text.slice(colonBreakIndex + 2).trim(),
    };
  }

  return {
    heading: text,
    content: "",
  };
};

const normalizeFaqEntries = (faqItems = [], fallbackItems = []) => {
  const normalizedFaqItems = Array.isArray(faqItems)
    ? faqItems
        .map((item) => ({
          heading: String(item?.heading || ""),
          content: String(item?.content || ""),
        }))
        .filter((item) => item.heading.trim() || item.content.trim())
    : [];

  if (normalizedFaqItems.length) {
    return normalizedFaqItems;
  }

  return normalizeTextBlocks(fallbackItems)
    .map((item) => splitLegacyFaqItem(item))
    .filter(Boolean);
};

const supportPageDefinitions = [
  {
    key: "privacyPolicy",
    label: "Privacy Policy",
    path: "/privacy-policy",
    contentType: "text",
  },
  {
    key: "termsOfService",
    label: "Terms of Service",
    path: "/terms-of-service",
    contentType: "text",
  },
  {
    key: "faqs",
    label: "FAQs",
    path: "/faqs",
    contentType: "faq",
  },
];

const blankSupportPages = {
  privacyPolicy: blankSupportPage("Privacy Policy"),
  termsOfService: blankSupportPage("Terms of Service"),
  faqs: blankSupportPage("FAQs"),
};

export default function Settings() {
  const { t } = useTranslation();
  // Tab toggle — the existing assessment management UI sits on the
  // "assessment" tab; the new TranslationsPanel sits on "translations".
  // Defaulting to "assessment" so existing admin muscle memory is
  // unchanged.
  const [activeTab, setActiveTab] = useState("assessment");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState("");
  const [packages, setPackages] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [draft, setDraft] = useState(blankPackage);
  const [featuresText, setFeaturesText] = useState("");
  const [editingSection, setEditingSection] = useState(null);
  const [supportPages, setSupportPages] = useState(blankSupportPages);
  const [savingSupportPages, setSavingSupportPages] = useState(false);

  const selectedPackage = useMemo(() => packages.find((p) => p.id === selectedId) || null, [packages, selectedId]);

  const hydrateDraft = (pkg) => {
    if (!pkg) {
      setDraft(blankPackage);
      setFeaturesText("");
      return;
    }
    setDraft({
      ...blankPackage,
      ...pkg,
      strikeAmount: pkg.strikeAmount ?? "",
      sections: Array.isArray(pkg.sections) ? [...pkg.sections].sort((a, b) => a.sectionId - b.sectionId) : [],
    });
    setFeaturesText((pkg.features || []).join("\n"));
  };

  const load = () => {
    setLoading(true);
    api
      .get("/v1/admin/config")
      .then((res) => {
        const list = res?.data?.data?.packages || [];
        const nextSupportPages = res?.data?.data?.supportPages || {};
        setPackages(list);
        const id = list[0]?.id || "";
        setSelectedId(id);
        hydrateDraft(list[0] || null);
        setSupportPages({
          privacyPolicy: {
            ...blankSupportPage("Privacy Policy"),
            ...(nextSupportPages.privacyPolicy || {}),
            items: normalizeTextBlocks(nextSupportPages.privacyPolicy?.items),
          },
          termsOfService: {
            ...blankSupportPage("Terms of Service"),
            ...(nextSupportPages.termsOfService || {}),
            items: normalizeTextBlocks(nextSupportPages.termsOfService?.items),
          },
          faqs: {
            ...blankSupportPage("FAQs"),
            ...(nextSupportPages.faqs || {}),
            items: normalizeTextBlocks(nextSupportPages.faqs?.items),
            faqItems: normalizeFaqEntries(
              nextSupportPages.faqs?.faqItems,
              nextSupportPages.faqs?.items
            ),
          },
        });
      })
      .catch((err) => setError(err?.response?.data?.msg || "Failed to load packages"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const pick = (id) => {
    setSelectedId(id);
    hydrateDraft(packages.find((p) => p.id === id) || null);
  };

  const savePackage = () => {
    if (!draft.id) return;
    setSaving(true);
    setError("");
    setSuccess("");
    const payload = {
      id: draft.id,
      title: draft.title,
      badge: draft.badge,
      amount: Number(draft.amount || 0),
      strikeAmount: draft.strikeAmount === "" ? null : Number(draft.strikeAmount),
      features: featuresText.split("\n").map((x) => x.trim()).filter(Boolean),
      durationText: draft.durationText,
      active: draft.active !== false,
      sortOrder: Number(draft.sortOrder || 1),
    };
    api
      .put(`/v1/admin/packages/${draft.id}`, payload)
      .then(() => api.put(`/v1/admin/packages/${draft.id}/sections`, { sections: draft.sections }))
      .then(() => {
        setSuccess("Package + sections saved.");
        load();
      })
      .catch((err) => setError(err?.response?.data?.msg || "Failed to save package"))
      .finally(() => setSaving(false));
  };

  const updateSupportPage = (pageKey, patch) => {
    setSupportPages((current) => ({
      ...current,
      [pageKey]: {
        ...current[pageKey],
        ...patch,
      },
    }));
  };

  const updateSupportTextItem = (pageKey, index, value) => {
    setSupportPages((current) => {
      const nextItems = [...(current[pageKey]?.items || [])];
      nextItems[index] = value;
      return {
        ...current,
        [pageKey]: {
          ...current[pageKey],
          items: nextItems,
        },
      };
    });
  };

  const addSupportTextItem = (pageKey) => {
    setSupportPages((current) => ({
      ...current,
      [pageKey]: {
        ...current[pageKey],
        items: [...(current[pageKey]?.items || []), ""],
      },
    }));
  };

  const removeSupportTextItem = (pageKey, index) => {
    setSupportPages((current) => ({
      ...current,
      [pageKey]: {
        ...current[pageKey],
        items: (current[pageKey]?.items || []).filter((_, itemIndex) => itemIndex !== index),
      },
    }));
  };

  const updateFaqItem = (pageKey, index, patch) => {
    setSupportPages((current) => {
      const nextFaqItems = [...(current[pageKey]?.faqItems || [])];
      nextFaqItems[index] = {
        ...createBlankFaqItem(),
        ...nextFaqItems[index],
        ...patch,
      };
      return {
        ...current,
        [pageKey]: {
          ...current[pageKey],
          faqItems: nextFaqItems,
        },
      };
    });
  };

  const addFaqItem = (pageKey) => {
    setSupportPages((current) => ({
      ...current,
      [pageKey]: {
        ...current[pageKey],
        faqItems: [...(current[pageKey]?.faqItems || []), createBlankFaqItem()],
      },
    }));
  };

  const removeFaqItem = (pageKey, index) => {
    setSupportPages((current) => ({
      ...current,
      [pageKey]: {
        ...current[pageKey],
        faqItems: (current[pageKey]?.faqItems || []).filter(
          (_, itemIndex) => itemIndex !== index
        ),
      },
    }));
  };

  const saveSupportPages = () => {
    setSavingSupportPages(true);
    setError("");
    setSuccess("");

    const payload = supportPageDefinitions.reduce((acc, definition) => {
      const currentPage = supportPages[definition.key] || blankSupportPage(definition.label);
      acc[definition.key] = {
        enabled: currentPage.enabled !== false,
        title: currentPage.title,
        summary: currentPage.summary,
        items:
          definition.contentType === "faq"
            ? []
            : (currentPage.items || []).map((item) => String(item || "").trim()).filter(Boolean),
        faqItems:
          definition.contentType === "faq"
            ? (currentPage.faqItems || [])
                .map((item) => ({
                  heading: String(item?.heading || "").trim(),
                  content: String(item?.content || "").trim(),
                }))
                .filter((item) => item.heading || item.content)
            : [],
      };
      return acc;
    }, {});

    api
      .put("/v1/admin/support-pages", { supportPages: payload })
      .then(() => {
        setSuccess("Support pages saved.");
        load();
      })
      .catch((err) =>
        setError(err?.response?.data?.msg || "Failed to save support pages")
      )
      .finally(() => setSavingSupportPages(false));
  };

  const updateSection = (index, patch) => {
    const next = [...draft.sections];
    next[index] = { ...next[index], ...patch };
    setDraft((d) => ({ ...d, sections: next }));
  };

  const addSection = () => {
    const maxId = Math.max(0, ...draft.sections.map((s) => Number(s.sectionId || 0)));
    const next = blankSection(maxId + 1);
    setDraft((d) => ({ ...d, sections: [...d.sections, next] }));
    setEditingSection(String(next.sectionId));
  };

  const removeSection = (sectionId) => {
    if (!window.confirm(`Delete section ${sectionId}?`)) return;
    setDraft((d) => ({
      ...d,
      sections: d.sections.filter((s) => String(s.sectionId) !== String(sectionId)),
    }));
    if (String(editingSection) === String(sectionId)) setEditingSection(null);
  };

  const syncSection = (section) => {
    if (!draft.id || !section.sheetCsvUrl) {
      setError("Enter Google Sheet CSV URL before sync.");
      return;
    }
    setSyncing(`${draft.id}:${section.sectionId}`);
    setError("");
    setSuccess("");
    api
      .post(`/v1/admin/packages/${draft.id}/sections/${section.sectionId}/sync-google-sheet`, { csvUrl: section.sheetCsvUrl })
      .then((res) => {
        const count = res?.data?.data?.section?.totalQuestions ?? 0;
        setSuccess(`Section ${section.sectionId} synced (${count} questions).`);
        load();
      })
      .catch((err) => setError(err?.response?.data?.msg || "Failed to sync section"))
      .finally(() => setSyncing(""));
  };

  // The Translations tab does its own loading/error state, so we
  // only block on the assessment-manager skeleton when that tab is
  // active. This means switching to Translations works even if the
  // initial /admin/config payload is still in flight.
  // Skeleton only applies to the assessment tab — the other two tabs
  // (Translations, Coupons) load their own data and render their own
  // states, so we don't want to gate them behind the config fetch.
  if (loading && activeTab === "assessment") return <SettingsSkeleton />;

  const tabs = [
    { value: "assessment", label: t("adminPages.tabAssessment") },
    { value: "translations", label: t("adminPages.tabTranslations") },
    { value: "coupons", label: "Coupons" },
  ];

  return (
    <div className="p-6 md:p-8 max-w-[1280px] mx-auto w-full flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            {activeTab === "translations"
              ? t("adminPages.tabTranslations")
              : activeTab === "coupons"
                ? "Coupons"
                : t("adminPages.tabAssessment")}
          </h1>
          <p className="text-gray-500 mt-1">
            {activeTab === "translations"
              ? t("adminPages.translationsSubtitle")
              : activeTab === "coupons"
                ? "Create and manage promotional codes used at checkout."
                : t("adminPages.assessmentSubtitle")}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-gray-200 pb-2">
        {tabs.map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => setActiveTab(tab.value)}
            className={`rounded-t-lg px-4 py-2 text-sm font-semibold transition ${
              activeTab === tab.value
                ? "bg-[#188B8B] text-white"
                : "bg-white text-gray-600 hover:text-[#157A7A]"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "translations" ? (
        <TranslationsPanel />
      ) : activeTab === "coupons" ? (
        <CouponsPanel />
      ) : (
        <>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {success ? <p className="text-sm text-emerald-700">{success}</p> : null}

      {packages.length > 1 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-4 flex flex-wrap gap-2">
          {packages.map((p) => (
            <button
              key={p.id}
              onClick={() => pick(p.id)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium border ${
                selectedId === p.id ? "bg-[#188B8B] text-white border-[#188B8B]" : "bg-white text-gray-700 border-gray-200"
              }`}
            >
              {p.title}
            </button>
          ))}
        </div>
      ) : null}

      {selectedPackage ? (
        <>
          <section className="bg-white rounded-2xl border border-gray-100 p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input value={draft.id} readOnly className="border rounded-lg px-3 py-2 bg-gray-100 text-gray-500" placeholder="Package ID" />
              <input value={draft.title} onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))} className="border rounded-lg px-3 py-2" placeholder="Title" />
              <input value={draft.badge} onChange={(e) => setDraft((d) => ({ ...d, badge: e.target.value }))} className="border rounded-lg px-3 py-2" placeholder="Badge" />
              <input type="number" value={draft.amount} onChange={(e) => setDraft((d) => ({ ...d, amount: e.target.value }))} className="border rounded-lg px-3 py-2" placeholder="Amount" />
              <input type="number" value={draft.strikeAmount} onChange={(e) => setDraft((d) => ({ ...d, strikeAmount: e.target.value }))} className="border rounded-lg px-3 py-2" placeholder="Strike Amount" />
              <input value={draft.durationText} onChange={(e) => setDraft((d) => ({ ...d, durationText: e.target.value }))} className="border rounded-lg px-3 py-2" placeholder="Duration text" />
            </div>
            <textarea className="mt-4 border rounded-lg px-3 py-2 w-full min-h-[110px]" value={featuresText} onChange={(e) => setFeaturesText(e.target.value)} placeholder="One feature per line" />
            <div className="mt-4 flex items-center gap-3">
              <button onClick={savePackage} disabled={saving} className="px-4 py-2 rounded-lg bg-[#F59F0A] text-[#0F1729] text-sm font-semibold disabled:opacity-60">
                {saving ? "Saving..." : "Save Package"}
              </button>
            </div>
          </section>

          <section className="bg-white rounded-2xl border border-gray-100 p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Sections for {draft.title}</h2>
              <button onClick={addSection} className="px-3 py-1.5 rounded-lg border border-[#188B8B] text-[#157A7A] text-sm font-semibold">+ Add Section</button>
            </div>

            <div className="mb-5 rounded-xl bg-[#F8FAFA] border border-[#E4E7EC] p-4">
              <p className="text-sm text-[#0F1729] font-semibold mb-2">Download Upload Format</p>
              <div className="flex flex-wrap gap-3 text-sm">
                <a href="/templates/section-template.csv" download className="text-[#157A7A] font-medium hover:underline">CSV Template</a>
                <a href="/templates/section-1-personality.csv" download className="text-[#157A7A] font-medium hover:underline">Section 1 Sample</a>
                <a href="/templates/section-2-intelligence.csv" download className="text-[#157A7A] font-medium hover:underline">Section 2 Sample</a>
                <a href="/templates/section-3-interest.csv" download className="text-[#157A7A] font-medium hover:underline">Section 3 Sample</a>
                <a href="/templates/section-4-aptitude.csv" download className="text-[#157A7A] font-medium hover:underline">Section 4 Sample</a>
                <a href="/templates/section-5-ei.csv" download className="text-[#157A7A] font-medium hover:underline">Section 5 Sample</a>
              </div>
            </div>

            <div className="space-y-4">
              {(draft.sections || []).map((s, idx) => (
                <div key={`${s.sectionId}-${idx}`} className="border rounded-xl p-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-[#0F1729]">Section {s.sectionId}</p>
                    <div className="flex items-center gap-2">
                      {String(editingSection) === String(s.sectionId) ? (
                        <button
                          type="button"
                          onClick={() => setEditingSection(null)}
                          className="px-3 py-1.5 rounded-lg border border-[#188B8B] text-[#157A7A] text-xs font-semibold"
                        >
                          Save Edit
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setEditingSection(String(s.sectionId))}
                          className="px-3 py-1.5 rounded-lg border border-gray-300 text-gray-700 text-xs font-semibold"
                        >
                          Edit
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => removeSection(s.sectionId)}
                        className="px-3 py-1.5 rounded-lg border border-red-300 text-red-600 text-xs font-semibold"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <input disabled={String(editingSection) !== String(s.sectionId)} type="number" value={s.sectionId} onChange={(e) => updateSection(idx, { sectionId: Number(e.target.value || 1) })} className="border rounded-lg px-3 py-2 disabled:bg-gray-100" />
                    <input disabled={String(editingSection) !== String(s.sectionId)} value={s.title} onChange={(e) => updateSection(idx, { title: e.target.value })} className="border rounded-lg px-3 py-2 disabled:bg-gray-100" />
                    <input disabled={String(editingSection) !== String(s.sectionId)} type="number" value={s.durationMinutes} onChange={(e) => updateSection(idx, { durationMinutes: Number(e.target.value || 20) })} className="border rounded-lg px-3 py-2 disabled:bg-gray-100" />
                    <select disabled={String(editingSection) !== String(s.sectionId)} value={s.scoringType || "mixed"} onChange={(e) => updateSection(idx, { scoringType: e.target.value })} className="border rounded-lg px-3 py-2 disabled:bg-gray-100">
                      <option value="mixed">mixed</option>
                      <option value="likert">likert</option>
                      <option value="objective">objective</option>
                    </select>
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    <label className="text-sm flex items-center gap-2">
                      <input disabled={String(editingSection) !== String(s.sectionId)} type="checkbox" checked={s.enabled !== false} onChange={(e) => updateSection(idx, { enabled: e.target.checked })} />
                      Enabled
                    </label>
                    <span className="text-xs text-gray-500">Questions: {Array.isArray(s.questions) ? s.questions.length : 0}</span>
                  </div>
                  <div className="mt-3 flex flex-col md:flex-row gap-3">
                    <input disabled={String(editingSection) !== String(s.sectionId)} value={s.sheetCsvUrl || ""} onChange={(e) => updateSection(idx, { sheetCsvUrl: e.target.value })} className="border rounded-lg px-3 py-2 flex-1 disabled:bg-gray-100" placeholder="Published Google Sheet CSV URL" />
                    <button
                      onClick={() => syncSection(s)}
                      disabled={syncing === `${draft.id}:${s.sectionId}`}
                      className="px-4 py-2 rounded-lg border border-[#188B8B] text-[#157A7A] text-sm font-semibold disabled:opacity-60"
                    >
                      {syncing === `${draft.id}:${s.sectionId}` ? "Syncing..." : "Sync Section"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="bg-white rounded-2xl border border-gray-100 p-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Support Pages</h2>
                <p className="mt-1 text-sm text-gray-500">
                  Manage the footer pages for Privacy Policy, Terms of Service, and FAQs.
                </p>
              </div>
              <button
                type="button"
                onClick={saveSupportPages}
                disabled={savingSupportPages}
                className="px-4 py-2 rounded-lg bg-[#188B8B] text-white text-sm font-semibold disabled:opacity-60"
              >
                {savingSupportPages ? "Saving..." : "Save Support Pages"}
              </button>
            </div>

            <div className="mt-6 space-y-5">
              {supportPageDefinitions.map((page) => {
                const pageDraft = supportPages[page.key] || blankSupportPage(page.label);

                return (
                  <div key={page.key} className="rounded-2xl border border-[#E4E7EC] p-5">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <h3 className="text-lg font-semibold text-[#0F1729]">
                          {page.label}
                        </h3>
                        <p className="mt-1 text-xs text-gray-500">
                          Public route: {page.path}
                        </p>
                      </div>

                      <label className="inline-flex items-center gap-2 text-sm font-medium text-[#0F1729]">
                        <input
                          type="checkbox"
                          checked={pageDraft.enabled !== false}
                          onChange={(event) =>
                            updateSupportPage(page.key, {
                              enabled: event.target.checked,
                            })
                          }
                        />
                        Show in footer
                      </label>
                    </div>

                    <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                      <input
                        value={pageDraft.title || ""}
                        onChange={(event) =>
                          updateSupportPage(page.key, {
                            title: event.target.value,
                          })
                        }
                        className="border rounded-lg px-3 py-2"
                        placeholder="Page title"
                      />
                      <input
                        value={page.path}
                        readOnly
                        className="border rounded-lg px-3 py-2 bg-gray-100 text-gray-500"
                      />
                    </div>

                    <textarea
                      className="mt-4 border rounded-lg px-3 py-2 w-full min-h-[100px]"
                      value={pageDraft.summary || ""}
                      onChange={(event) =>
                        updateSupportPage(page.key, {
                          summary: event.target.value,
                        })
                      }
                      placeholder="Short page summary"
                    />

                    {page.contentType === "faq" ? (
                      <div className="mt-4 rounded-xl border border-[#E4E7EC] bg-[#FBFCFD] p-4">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-[#0F1729]">
                              FAQ Entries
                            </p>
                            <p className="mt-1 text-xs text-gray-500">
                              Add question and answer pairs for the public accordion.
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => addFaqItem(page.key)}
                            className="px-3 py-1.5 rounded-lg border border-[#188B8B] text-[#157A7A] text-sm font-semibold"
                          >
                            + Add FAQ
                          </button>
                        </div>

                        <div className="mt-4 space-y-4">
                          {(pageDraft.faqItems || []).length ? (
                            pageDraft.faqItems.map((faqItem, faqIndex) => (
                              <div
                                key={`${page.key}-faq-${faqIndex}`}
                                className="rounded-xl border border-[#E4E7EC] bg-white p-4"
                              >
                                <div className="flex items-center justify-between gap-3">
                                  <p className="text-sm font-semibold text-[#0F1729]">
                                    FAQ {faqIndex + 1}
                                  </p>
                                  <button
                                    type="button"
                                    onClick={() => removeFaqItem(page.key, faqIndex)}
                                    className="px-3 py-1.5 rounded-lg border border-red-300 text-red-600 text-xs font-semibold"
                                  >
                                    Remove
                                  </button>
                                </div>

                                <input
                                  value={faqItem.heading || ""}
                                  onChange={(event) =>
                                    updateFaqItem(page.key, faqIndex, {
                                      heading: event.target.value,
                                    })
                                  }
                                  className="mt-3 border rounded-lg px-3 py-2 w-full"
                                  placeholder="Question heading"
                                />

                                <textarea
                                  className="mt-3 border rounded-lg px-3 py-2 w-full min-h-[120px]"
                                  value={faqItem.content || ""}
                                  onChange={(event) =>
                                    updateFaqItem(page.key, faqIndex, {
                                      content: event.target.value,
                                    })
                                  }
                                  placeholder="Answer content"
                                />
                              </div>
                            ))
                          ) : (
                            <div className="rounded-xl border border-dashed border-[#D8E6EC] bg-white px-4 py-6 text-sm text-[#65758B]">
                              No FAQ entries added yet.
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="mt-4 rounded-xl border border-[#E4E7EC] bg-[#FBFCFD] p-4">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-[#0F1729]">
                              Content Blocks
                            </p>
                            <p className="mt-1 text-xs text-gray-500">
                              Add or remove plain content paragraphs for this page.
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => addSupportTextItem(page.key)}
                            className="px-3 py-1.5 rounded-lg border border-[#188B8B] text-[#157A7A] text-sm font-semibold"
                          >
                            + Add Block
                          </button>
                        </div>

                        <div className="mt-4 space-y-4">
                          {(pageDraft.items || []).length ? (
                            pageDraft.items.map((item, itemIndex) => (
                              <div
                                key={`${page.key}-item-${itemIndex}`}
                                className="rounded-xl border border-[#E4E7EC] bg-white p-4"
                              >
                                <div className="flex items-center justify-between gap-3">
                                  <p className="text-sm font-semibold text-[#0F1729]">
                                    Block {itemIndex + 1}
                                  </p>
                                  <button
                                    type="button"
                                    onClick={() => removeSupportTextItem(page.key, itemIndex)}
                                    className="px-3 py-1.5 rounded-lg border border-red-300 text-red-600 text-xs font-semibold"
                                  >
                                    Remove
                                  </button>
                                </div>

                                <textarea
                                  className="mt-3 border rounded-lg px-3 py-2 w-full min-h-[120px]"
                                  value={item || ""}
                                  onChange={(event) =>
                                    updateSupportTextItem(page.key, itemIndex, event.target.value)
                                  }
                                  placeholder="Content paragraph"
                                />
                              </div>
                            ))
                          ) : (
                            <div className="rounded-xl border border-dashed border-[#D8E6EC] bg-white px-4 py-6 text-sm text-[#65758B]">
                              No content blocks added yet.
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        </>
      ) : null}
        </>
      )}
    </div>
  );
}

import { useEffect, useMemo, useState } from "react";
import { Check, Pencil, Save as SaveIcon, X } from "lucide-react";
import api from "../../api/api";

// Admin Translations panel. Lists every question in the active
// packages with translation status, supports a status filter, and
// opens an inline editor that PATCHes the new endpoint
//   PUT /api/v1/admin/questions/:questionId/translate
// to save text_gu + options_gu without a re-seed. Renders inside
// Settings.jsx as a separate tab — kept in its own component so the
// 700-line Settings page doesn't grow further.

const STATUS_FILTERS = [
  { value: "all", label: "All" },
  { value: "translated", label: "Translated" },
  { value: "untranslated", label: "Untranslated" },
];

const truncate = (text, max = 90) => {
  const value = String(text || "").trim();
  if (value.length <= max) return value;
  return `${value.slice(0, max - 1)}…`;
};

export default function TranslationsPanel() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState({
    total: 0,
    translated: 0,
    untranslated: 0,
  });
  const [statusFilter, setStatusFilter] = useState("all");
  const [editingId, setEditingId] = useState("");
  const [draftText, setDraftText] = useState("");
  const [draftOptions, setDraftOptions] = useState([]);
  const [saving, setSaving] = useState(false);

  const load = (filter = statusFilter) => {
    setLoading(true);
    setError("");
    api
      .get("/v1/admin/translations", { params: { status: filter } })
      .then((res) => {
        const data = res?.data?.data || {};
        setRows(Array.isArray(data.rows) ? data.rows : []);
        setSummary(
          data.summary || { total: 0, translated: 0, untranslated: 0 }
        );
      })
      .catch((err) =>
        setError(
          err?.response?.data?.msg || "Failed to load translations"
        )
      )
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load(statusFilter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  const startEdit = (row) => {
    setEditingId(`${row.packageId}::${row.questionId}`);
    setDraftText(row.text_gu || "");
    const englishLength = Array.isArray(row.options) ? row.options.length : 0;
    setDraftOptions(
      Array.from({ length: englishLength }, (_, i) =>
        String((row.options_gu || [])[i] || "")
      )
    );
  };

  const cancelEdit = () => {
    setEditingId("");
    setDraftText("");
    setDraftOptions([]);
  };

  const saveTranslation = async (row) => {
    setSaving(true);
    setError("");
    try {
      await api.put(
        `/v1/admin/questions/${encodeURIComponent(row.questionId)}/translate`,
        {
          language: "gu",
          text: draftText,
          options: draftOptions,
        }
      );
      cancelEdit();
      load(statusFilter);
    } catch (err) {
      setError(err?.response?.data?.msg || "Failed to save translation");
    } finally {
      setSaving(false);
    }
  };

  const percentLabel = useMemo(() => {
    if (!summary.total) return "0%";
    return `${Math.round((summary.translated / summary.total) * 100)}%`;
  }, [summary]);

  return (
    <section className="bg-white rounded-2xl border border-gray-100 p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">
            Question Translations
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Add Gujarati translations for each question. Empty translations
            fall back to English silently in the live test — translate at
            your own pace.
          </p>
        </div>
        <div className="rounded-xl bg-[#F1FCF5] border border-[#C8E9D5] px-4 py-3 text-right">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#1D7D46]">
            Translated
          </p>
          <p className="mt-1 text-lg font-bold text-[#0F1729]">
            {summary.translated} / {summary.total}{" "}
            <span className="text-sm font-medium text-[#1D7D46]">
              ({percentLabel})
            </span>
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {STATUS_FILTERS.map((filter) => (
          <button
            key={filter.value}
            type="button"
            onClick={() => setStatusFilter(filter.value)}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
              statusFilter === filter.value
                ? "bg-[#188B8B] text-white"
                : "border border-gray-200 bg-white text-gray-700 hover:border-[#188B8B] hover:text-[#157A7A]"
            }`}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {error ? (
        <p className="mt-3 text-sm text-red-600">{error}</p>
      ) : null}

      {loading ? (
        <p className="mt-6 text-sm text-gray-500">Loading translations…</p>
      ) : rows.length === 0 ? (
        <p className="mt-6 text-sm text-gray-500">
          No questions match this filter.
        </p>
      ) : (
        <div className="mt-5 divide-y divide-gray-100 rounded-xl border border-gray-100">
          {rows.map((row) => {
            const rowKey = `${row.packageId}::${row.questionId}`;
            const isEditing = editingId === rowKey;
            return (
              <div key={rowKey} className="p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-700">
                        Q{row.questionId}
                      </span>
                      <span className="text-xs text-gray-500">
                        {row.packageTitle} · Section {row.sectionId}
                      </span>
                      {row.translated ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-[#E8F9F1] px-2 py-0.5 text-[11px] font-semibold text-[#1D7D46]">
                          <Check className="h-3 w-3" /> Translated
                        </span>
                      ) : (
                        <span className="rounded-full bg-[#FFF6E4] px-2 py-0.5 text-[11px] font-semibold text-[#B45309]">
                          Pending
                        </span>
                      )}
                    </div>
                    <p className="mt-1.5 text-sm text-gray-800">
                      {isEditing ? row.text : truncate(row.text)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {isEditing ? (
                      <>
                        <button
                          type="button"
                          onClick={() => saveTranslation(row)}
                          disabled={saving}
                          className="inline-flex items-center gap-1 rounded-lg bg-[#188B8B] px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
                        >
                          <SaveIcon className="h-3.5 w-3.5" />
                          {saving ? "Saving…" : "Save"}
                        </button>
                        <button
                          type="button"
                          onClick={cancelEdit}
                          className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                        >
                          <X className="h-3.5 w-3.5" />
                          Cancel
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => startEdit(row)}
                        className="inline-flex items-center gap-1 rounded-lg border border-[#188B8B] px-3 py-1.5 text-xs font-semibold text-[#157A7A] hover:bg-[#F6FDFC]"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        {row.translated ? "Edit" : "Translate"}
                      </button>
                    )}
                  </div>
                </div>

                {isEditing ? (
                  <div className="mt-4 grid gap-3">
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-[0.1em] text-gray-500">
                        Gujarati translation
                      </label>
                      <textarea
                        value={draftText}
                        onChange={(e) => setDraftText(e.target.value)}
                        rows={2}
                        lang="gu"
                        className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#188B8B] focus:outline-none"
                        placeholder="ગુજરાતી અનુવાદ દાખલ કરો"
                      />
                    </div>

                    {row.options?.length ? (
                      <div>
                        <label className="block text-xs font-semibold uppercase tracking-[0.1em] text-gray-500">
                          Options
                        </label>
                        <div className="mt-1 grid gap-2">
                          {row.options.map((opt, optIndex) => (
                            <div
                              key={`opt-${optIndex}`}
                              className="grid gap-1 sm:grid-cols-[1fr_1fr] sm:items-center sm:gap-3"
                            >
                              <p className="rounded-md bg-gray-50 px-3 py-2 text-xs text-gray-700">
                                <span className="mr-1 font-semibold">
                                  {String.fromCharCode(65 + optIndex)}.
                                </span>
                                {opt}
                              </p>
                              <input
                                type="text"
                                value={draftOptions[optIndex] || ""}
                                onChange={(e) => {
                                  const next = [...draftOptions];
                                  next[optIndex] = e.target.value;
                                  setDraftOptions(next);
                                }}
                                lang="gu"
                                className="rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-[#188B8B] focus:outline-none"
                                placeholder="ગુજરાતી અનુવાદ"
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

"use client";

import {
  Download,
  FileUp,
  Loader2,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Alert, Badge, Card, SectionTitle, Spinner } from "@/components/ui";
import { api, ApiError, formatDate } from "@/lib/api";
import type { BenchmarkQuery, Judgment } from "@/lib/types";

const CATEGORIES = ["exact", "paraphrase", "ambiguous", "negative", "multi_document", "other"];
const GRADES = [
  { value: 0, label: "0 · Not relevant" },
  { value: 1, label: "1 · Marginal" },
  { value: 2, label: "2 · Relevant" },
  { value: 3, label: "3 · Highly relevant" },
];

type SectionResult = Awaited<ReturnType<typeof api.evaluation.searchSections>>[number];

export default function BenchmarkQueriesPage() {
  const [queries, setQueries] = useState<BenchmarkQuery[]>([]);
  const [selected, setSelected] = useState<BenchmarkQuery | null>(null);
  const [judgments, setJudgments] = useState<Judgment[]>([]);
  const [results, setResults] = useState<SectionResult[]>([]);
  const [search, setSearch] = useState("");
  const [grades, setGrades] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ query_text: "", category: "paraphrase", notes: "", reference_answer: "" });
  const importRef = useRef<HTMLInputElement>(null);

  const loadQueries = async () => {
    const rows = await api.evaluation.queries();
    setQueries(rows);
    if (selected) setSelected(rows.find((row) => row.id === selected.id) || null);
    return rows;
  };

  const loadJudgments = async (query: BenchmarkQuery) => {
    const rows = await api.evaluation.judgments(query.id);
    setJudgments(rows);
  };

  useEffect(() => {
    api.evaluation
      .queries()
      .then((rows) => {
        setQueries(rows);
        if (rows[0]) {
          setSelected(rows[0]);
          return api.evaluation.judgments(rows[0].id);
        }
        return [];
      })
      .then(setJudgments)
      .catch(() => setError("Benchmark queries could not be loaded."))
      .finally(() => setLoading(false));
  }, []);

  const selectQuery = async (query: BenchmarkQuery) => {
    setSelected(query);
    setResults([]);
    setSearch("");
    setError(null);
    setNotice(null);
    try {
      setJudgments(await api.evaluation.judgments(query.id));
    } catch {
      setError("Judgments could not be loaded.");
    }
  };

  const createQuery = async () => {
    if (form.query_text.trim().length < 3) return;
    setBusy(true);
    setError(null);
    try {
      const created = await api.evaluation.createQuery({
        query_text: form.query_text.trim(),
        category: form.category,
        notes: form.notes || undefined,
        reference_answer: form.reference_answer || undefined,
      });
      setForm({ query_text: "", category: "paraphrase", notes: "", reference_answer: "" });
      setShowForm(false);
      await loadQueries();
      await selectQuery(created);
      setNotice("Benchmark query created.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not create the query.");
    } finally {
      setBusy(false);
    }
  };

  const deleteQuery = async (query: BenchmarkQuery) => {
    if (!window.confirm(`Delete the benchmark query and all of its judgments?\n\n${query.query_text}`)) return;
    setBusy(true);
    try {
      await api.evaluation.deleteQuery(query.id);
      const rows = await loadQueries();
      if (query.id === selected?.id) {
        const next = rows[0] || null;
        setSelected(next);
        setJudgments(next ? await api.evaluation.judgments(next.id) : []);
      }
      setNotice("Query deleted.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not delete the query.");
    } finally {
      setBusy(false);
    }
  };

  const searchSections = async () => {
    if (search.trim().length < 2) return;
    setBusy(true);
    setError(null);
    try {
      setResults(await api.evaluation.searchSections(search.trim()));
    } catch {
      setError("Section search failed.");
    } finally {
      setBusy(false);
    }
  };

  const addJudgment = async (sectionId: string) => {
    if (!selected) return;
    setBusy(true);
    try {
      await api.evaluation.upsertJudgment(selected.id, {
        section_id: sectionId,
        grade: grades[sectionId] ?? 2,
      });
      await loadJudgments(selected);
      await loadQueries();
      setNotice("Relevance judgment saved.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save the judgment.");
    } finally {
      setBusy(false);
    }
  };

  const deleteJudgment = async (judgment: Judgment) => {
    if (!selected) return;
    try {
      await api.evaluation.deleteJudgment(judgment.id);
      await loadJudgments(selected);
      await loadQueries();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not delete the judgment.");
    }
  };

  const importCsv = async (file: File) => {
    setBusy(true);
    setError(null);
    try {
      const result = await api.evaluation.importBenchmark(file);
      setNotice(
        `Imported ${result.created_queries} queries and ${result.created_judgments} judgments.` +
          (result.errors.length ? ` ${result.errors.length} row(s) had errors.` : ""),
      );
      await loadQueries();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "CSV import failed.");
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <Spinner label="Loading benchmark set…" />;

  const documented = queries.filter((query) => query.judgment_count > 0).length;

  return (
    <div className="space-y-6">
      <SectionTitle
        title="Benchmark queries"
        description="Create the evaluation query set and assign manual relevance grades per section. Experiments use only these human judgments."
        action={
          <div className="flex flex-wrap gap-2">
            <a className="btn-secondary !py-2" href={api.evaluation.exportBenchmarkUrl}>
              <Download className="h-4 w-4" aria-hidden /> Export CSV
            </a>
            <button className="btn-secondary !py-2" onClick={() => importRef.current?.click()} disabled={busy}>
              <FileUp className="h-4 w-4" aria-hidden /> Import CSV
            </button>
            <input
              ref={importRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void importCsv(file);
                event.target.value = "";
              }}
            />
            <button className="btn-primary !py-2" onClick={() => setShowForm((value) => !value)}>
              <Plus className="h-4 w-4" aria-hidden /> New query
            </button>
          </div>
        }
      />

      {error ? <Alert>{error}</Alert> : null}
      {notice ? <Alert tone="success">{notice}</Alert> : null}

      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-600">Queries</p>
          <p className="mt-1 font-serif text-2xl font-semibold text-ink-900">{queries.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-600">With judgments</p>
          <p className="mt-1 font-serif text-2xl font-semibold text-ink-900">
            {documented} / {queries.length}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-600">Total judgments</p>
          <p className="mt-1 font-serif text-2xl font-semibold text-ink-900">
            {queries.reduce((sum, query) => sum + query.judgment_count, 0)}
          </p>
        </Card>
      </div>

      {showForm ? (
        <Card className="p-5">
          <h2 className="font-serif text-lg font-semibold text-ink-900">New benchmark query</h2>
          <div className="mt-3 space-y-3">
            <label className="block">
              <span className="label">Query text</span>
              <input
                className="input"
                value={form.query_text}
                onChange={(event) => setForm({ ...form, query_text: event.target.value })}
                placeholder="e.g. penalties for improper waste disposal"
              />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="label">Category</span>
                <select
                  className="input"
                  value={form.category}
                  onChange={(event) => setForm({ ...form, category: event.target.value })}
                >
                  {CATEGORIES.map((category) => (
                    <option key={category} value={category}>
                      {category.replaceAll("_", " ")}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="label">Notes</span>
                <input
                  className="input"
                  value={form.notes}
                  onChange={(event) => setForm({ ...form, notes: event.target.value })}
                />
              </label>
            </div>
            <label className="block">
              <span className="label">Reference answer (optional)</span>
              <textarea
                className="input min-h-[70px]"
                value={form.reference_answer}
                onChange={(event) => setForm({ ...form, reference_answer: event.target.value })}
                placeholder="A short answer grounded in a specific provision, if one exists."
              />
            </label>
            <div className="flex justify-end gap-2">
              <button className="btn-secondary" onClick={() => setShowForm(false)}>
                Cancel
              </button>
              <button className="btn-primary" onClick={createQuery} disabled={busy || form.query_text.trim().length < 3}>
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Create query
              </button>
            </div>
          </div>
        </Card>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,360px)_minmax(0,1fr)]">
        <Card className="max-h-[75vh] overflow-y-auto">
          <div className="border-b border-paper-200 px-4 py-3">
            <h2 className="font-serif text-lg font-semibold text-ink-900">Query set</h2>
            <p className="text-xs text-ink-600">Select a query to grade its relevant sections.</p>
          </div>
          <div className="divide-y divide-paper-200">
            {queries.length ? (
              queries.map((query) => (
                <button
                  key={query.id}
                  onClick={() => selectQuery(query)}
                  className={`block w-full px-4 py-3 text-left ${
                    selected?.id === query.id ? "bg-civic-50" : "hover:bg-paper-50"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <Badge tone="blue">{query.category.replaceAll("_", " ")}</Badge>
                    <span className="text-[11px] text-ink-600">{formatDate(query.created_at)}</span>
                  </div>
                  <p className="mt-1.5 text-sm font-medium text-ink-900">{query.query_text}</p>
                  <p className="mt-1 text-[11px] text-ink-600">
                    {query.judgment_count} judgment{query.judgment_count === 1 ? "" : "s"}
                  </p>
                </button>
              ))
            ) : (
              <p className="px-4 py-8 text-sm text-ink-600">
                No benchmark queries yet. Create one to begin building the evaluation set.
              </p>
            )}
          </div>
        </Card>

        <div className="space-y-4">
          {selected ? (
            <>
              <Card className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone="civic">{selected.category}</Badge>
                      <span className="text-xs text-ink-600">{selected.judgment_count} judgments</span>
                    </div>
                    <h2 className="mt-2 font-serif text-xl font-semibold text-ink-900">{selected.query_text}</h2>
                    {selected.notes ? <p className="mt-1 text-xs text-ink-600">{selected.notes}</p> : null}
                    {selected.reference_answer ? (
                      <p className="mt-2 rounded bg-paper-50 px-2 py-1.5 text-xs text-ink-700">
                        Reference: {selected.reference_answer}
                      </p>
                    ) : null}
                  </div>
                  <button className="btn-ghost !px-2 text-xs text-rust-700" onClick={() => deleteQuery(selected)} disabled={busy}>
                    <Trash2 className="h-3.5 w-3.5" aria-hidden /> Delete query
                  </button>
                </div>
              </Card>

              <Card className="p-5">
                <h3 className="font-serif text-lg font-semibold text-ink-900">Find sections to judge</h3>
                <div className="mt-3 flex gap-2">
                  <input
                    className="input"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") void searchSections();
                    }}
                    placeholder="Search section text, title, or ordinance number"
                  />
                  <button className="btn-secondary" onClick={searchSections} disabled={busy || search.trim().length < 2}>
                    <Search className="h-4 w-4" aria-hidden /> Search
                  </button>
                </div>
                {results.length ? (
                  <div className="mt-4 space-y-3">
                    {results.map((result) => {
                      const existing = judgments.find((judgment) => judgment.section_id === result.section_id);
                      return (
                        <div key={result.section_id} className="rounded-lg border border-paper-300 p-3">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium text-ink-900">{result.document_title}</p>
                              <p className="text-xs text-ink-600">
                                {result.ordinance_number ? `No. ${result.ordinance_number} · ` : ""}
                                {result.section_number ? `Section ${result.section_number} · ` : ""}
                                p. {result.page_start}
                                {result.page_end !== result.page_start ? `–${result.page_end}` : ""}
                              </p>
                            </div>
                            {existing ? (
                              <Badge tone="civic">Graded {existing.grade}</Badge>
                            ) : (
                              <Badge tone="gold">Not graded</Badge>
                            )}
                          </div>
                          <p className="mt-2 line-clamp-2 text-xs leading-5 text-ink-700">{result.excerpt}</p>
                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            <select
                              className="input max-w-[190px] !py-1.5 text-xs"
                              value={grades[result.section_id] ?? existing?.grade ?? 2}
                              onChange={(event) =>
                                setGrades((current) => ({ ...current, [result.section_id]: Number(event.target.value) }))
                              }
                            >
                              {GRADES.map((grade) => (
                                <option key={grade.value} value={grade.value}>
                                  {grade.label}
                                </option>
                              ))}
                            </select>
                            <button
                              className="btn-primary !py-1.5 text-xs"
                              disabled={busy}
                              onClick={() => addJudgment(result.section_id)}
                            >
                              {existing ? "Update grade" : "Save judgment"}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="mt-3 text-xs text-ink-600">
                    Search the corpus to find the section or sections that genuinely answer this query. Do
                    not grade documents that only mention the topic in passing.
                  </p>
                )}
              </Card>

              <Card>
                <div className="border-b border-paper-200 px-5 py-4">
                  <h3 className="font-serif text-lg font-semibold text-ink-900">Judged sections</h3>
                  <p className="text-xs text-ink-600">Only sections with a grade greater than zero count as relevant in metrics.</p>
                </div>
                <div className="divide-y divide-paper-200">
                  {judgments.length ? (
                    judgments.map((judgment) => (
                      <div key={judgment.id} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-ink-900">
                            {judgment.document_title || "Section"}{" "}
                            {judgment.section_number ? `· Section ${judgment.section_number}` : ""}
                          </p>
                          <p className="text-xs text-ink-600">
                            {judgment.page_start ? `Page ${judgment.page_start}` : ""}
                            {judgment.notes ? ` · ${judgment.notes}` : ""}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge tone={judgment.grade >= 2 ? "civic" : judgment.grade === 1 ? "gold" : "rust"}>
                            Grade {judgment.grade}
                          </Badge>
                          <button
                            className="btn-ghost !px-2 text-xs text-rust-700"
                            onClick={() => deleteJudgment(judgment)}
                            aria-label="Delete judgment"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="px-5 py-8 text-sm text-ink-600">No relevance judgments recorded for this query.</p>
                  )}
                </div>
              </Card>
            </>
          ) : (
            <Card className="p-8 text-center text-sm text-ink-600">
              Select a query from the benchmark set, or create a new one.
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

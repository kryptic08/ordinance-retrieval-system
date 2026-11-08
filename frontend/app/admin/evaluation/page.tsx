"use client";

import { BarChart3, Download, Loader2, Play, TrendingUp } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Alert, Badge, Card, SectionTitle, Spinner } from "@/components/ui";
import { api, ApiError, formatDate, formatScore } from "@/lib/api";
import type { Experiment } from "@/lib/types";

const CONFIGURATIONS = ["keyword", "vector", "hybrid", "hybrid_rerank"];

const METRIC_ROWS: Array<[string, string, "percent" | "number"]> = [
  ["precision_at_k", "Precision@K", "percent"],
  ["recall_at_k", "Recall@K", "percent"],
  ["mrr", "MRR", "percent"],
  ["ndcg_at_k", "nDCG@K", "percent"],
  ["citation_correct_rate", "Citation correctness", "percent"],
  ["no_relevant_empty_rate", "Empty rate on unanswerable queries", "percent"],
  ["median_latency_ms", "Median latency", "number"],
  ["p95_latency_ms", "P95 latency", "number"],
];

export default function EvaluationPage() {
  const [experiments, setExperiments] = useState<Experiment[]>([]);
  const [selected, setSelected] = useState<Experiment | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    configurations: ["keyword", "vector", "hybrid", "hybrid_rerank"],
    top_k: 10,
    notes: "",
  });

  const load = async () => {
    const rows = await api.evaluation.experiments();
    setExperiments(rows);
    setSelected((current) => (current ? rows.find((row) => row.id === current.id) || rows[0] || null : rows[0] || null));
    return rows;
  };

  useEffect(() => {
    api.evaluation
      .experiments()
      .then((rows) => {
        setExperiments(rows);
        setSelected(rows[0] || null);
      })
      .catch(() => setError("Experiments could not be loaded."))
      .finally(() => setLoading(false));
  }, []);

  const runExperiment = async () => {
    if (form.name.trim().length < 2 || form.configurations.length === 0) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const rows = await api.evaluation.runExperiment({
        name: form.name.trim(),
        configurations: form.configurations,
        top_k: form.top_k,
        notes: form.notes || undefined,
      });
      const refreshed = await load();
      setSelected(refreshed.find((row) => row.id === rows[0]?.id) || refreshed[0] || null);
      setNotice(`Experiment completed: ${rows.length} configuration run(s).`);
      setForm({ name: "", configurations: form.configurations, top_k: form.top_k, notes: "" });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "The experiment could not be completed.");
    } finally {
      setBusy(false);
    }
  };

  const chartRows = useMemo(
    () => experiments.filter((experiment) => experiment.status === "completed" && experiment.metrics_json),
    [experiments],
  );

  const best = (key: string) =>
    chartRows.length ? Math.max(...chartRows.map((row) => Number(row.metrics_json[key] || 0))) : 0;

  const exportJson = () => {
    if (!selected) return;
    const blob = new Blob([JSON.stringify(selected, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `experiment-${selected.configuration}-${selected.id.slice(0, 8)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  if (loading) return <Spinner label="Loading evaluation workspace…" />;

  return (
    <div className="space-y-6">
      <SectionTitle
        title="Retrieval evaluation"
        description="Run controlled experiments over the human-judged benchmark set. Metrics are computed from graded sections only and should be reported with their configuration, K, and corpus version."
        action={
          <button className="btn-secondary !py-2" onClick={() => load().catch(() => setError("Refresh failed."))}>
            Refresh
          </button>
        }
      />

      {error ? <Alert>{error}</Alert> : null}
      {notice ? <Alert tone="success">{notice}</Alert> : null}

      <Card className="p-5">
        <h2 className="flex items-center gap-2 font-serif text-lg font-semibold text-ink-900">
          <Play className="h-4 w-4 text-civic-700" aria-hidden /> Run a new experiment
        </h2>
        <p className="mt-1 text-xs text-ink-600">
          One experiment record is created per configuration. Runs execute synchronously and may take a
          moment with a large benchmark set.
        </p>
        <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_120px_1fr]">
          <label className="block">
            <span className="label">Experiment name</span>
            <input
              className="input"
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
              placeholder="e.g. Thesis run — final corpus"
            />
          </label>
          <label className="block">
            <span className="label">Top K</span>
            <input
              type="number"
              min={1}
              max={50}
              className="input"
              value={form.top_k}
              onChange={(event) => setForm({ ...form, top_k: Number(event.target.value) || 10 })}
            />
          </label>
          <label className="block">
            <span className="label">Notes</span>
            <input
              className="input"
              value={form.notes}
              onChange={(event) => setForm({ ...form, notes: event.target.value })}
              placeholder="Optional protocol notes"
            />
          </label>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-4">
          {CONFIGURATIONS.map((configuration) => (
            <label key={configuration} className="inline-flex items-center gap-2 text-sm text-ink-700">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-paper-300 text-civic-700"
                checked={form.configurations.includes(configuration)}
                onChange={(event) =>
                  setForm({
                    ...form,
                    configurations: event.target.checked
                      ? [...form.configurations, configuration]
                      : form.configurations.filter((item) => item !== configuration),
                  })
                }
              />
              {configuration.replaceAll("_", " + ")}
            </label>
          ))}
          <button
            className="btn-primary ml-auto"
            onClick={runExperiment}
            disabled={busy || form.configurations.length === 0 || form.name.trim().length < 2}
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <BarChart3 className="h-4 w-4" />}
            {busy ? "Running experiment…" : "Run experiment"}
          </button>
        </div>
      </Card>

      {chartRows.length ? (
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-serif text-lg font-semibold text-ink-900">
              <TrendingUp className="h-4 w-4 text-civic-700" aria-hidden /> Configuration comparison
            </h2>
            <p className="text-xs text-ink-600">Precision@K · higher is better</p>
          </div>
          <div className="mt-4 space-y-3">
            {chartRows.map((experiment) => {
              const value = Number(experiment.metrics_json.precision_at_k || 0);
              return (
                <div key={experiment.id}>
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <button
                      onClick={() => setSelected(experiment)}
                      className="truncate font-medium text-ink-800 hover:text-civic-700"
                    >
                      {experiment.configuration.replaceAll("_", " + ")} · {experiment.name}
                    </button>
                    <span className="shrink-0 font-semibold text-civic-700">{formatScore(value)}</span>
                  </div>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-paper-200">
                    <div
                      className="h-full rounded-full bg-civic-500"
                      style={{ width: `${Math.max(2, value * 100)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[300px_minmax(0,1fr)]">
        <Card className="max-h-[70vh] overflow-y-auto">
          <div className="border-b border-paper-200 px-4 py-3">
            <h2 className="font-serif text-lg font-semibold text-ink-900">Experiments</h2>
            <p className="text-xs text-ink-600">{experiments.length} recorded</p>
          </div>
          <div className="divide-y divide-paper-200">
            {experiments.length ? (
              experiments.map((experiment) => (
                <button
                  key={experiment.id}
                  onClick={() => setSelected(experiment)}
                  className={`block w-full px-4 py-3 text-left ${selected?.id === experiment.id ? "bg-civic-50" : "hover:bg-paper-50"}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <Badge tone={experiment.status === "completed" ? "civic" : experiment.status === "failed" ? "rust" : "gold"}>
                      {experiment.configuration.replaceAll("_", " + ")}
                    </Badge>
                    <span className="text-[10px] text-ink-600">{formatDate(experiment.created_at)}</span>
                  </div>
                  <p className="mt-1.5 truncate text-sm font-medium text-ink-900">{experiment.name}</p>
                  <p className="mt-0.5 text-[11px] text-ink-600">
                    K={String(experiment.metrics_json.k ?? "—")} · P@K {formatScore(experiment.metrics_json.precision_at_k)}
                  </p>
                </button>
              ))
            ) : (
              <p className="px-4 py-8 text-sm text-ink-600">No experiments yet.</p>
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
                      <Badge tone="civic">{selected.configuration.replaceAll("_", " + ")}</Badge>
                      <Badge>{selected.status}</Badge>
                      <span className="text-xs text-ink-600">{formatDate(selected.finished_at || selected.created_at)}</span>
                    </div>
                    <h2 className="mt-2 font-serif text-xl font-semibold text-ink-900">{selected.name}</h2>
                    <p className="mt-1 text-xs text-ink-600">
                      {String(selected.metrics_json.queries ?? "—")} queries · K={String(selected.metrics_json.k ?? "—")} ·
                      corpus {selected.corpus_version} · {selected.embedding_model || "no embedding model"}
                    </p>
                    {selected.notes ? <p className="mt-1 text-xs text-ink-600">{selected.notes}</p> : null}
                  </div>
                  <button className="btn-secondary !py-1.5 text-xs" onClick={exportJson}>
                    <Download className="h-3.5 w-3.5" aria-hidden /> Export JSON
                  </button>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {METRIC_ROWS.slice(0, 4).map(([key, label]) => (
                    <div key={key} className="rounded-lg border border-paper-300 bg-paper-50 p-3">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-600">{label}</p>
                      <p className="mt-1 text-xl font-semibold text-ink-900">
                        {formatScore(Number(selected.metrics_json[key] || 0))}
                      </p>
                      <p className="text-[10px] text-ink-600">
                        {key === "precision_at_k" || key === "recall_at_k" || key === "ndcg_at_k"
                          ? `K=${String(selected.metrics_json.k ?? "—")}`
                          : "rank of first relevant"}
                      </p>
                    </div>
                  ))}
                </div>
              </Card>

              <Card>
                <div className="border-b border-paper-200 px-5 py-4">
                  <h3 className="font-serif text-lg font-semibold text-ink-900">Metric detail</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Metric</th>
                        <th>Value</th>
                        <th>Interpretation</th>
                      </tr>
                    </thead>
                    <tbody>
                      {METRIC_ROWS.map(([key, label, type]) => {
                        const raw = Number(selected.metrics_json[key] || 0);
                        return (
                          <tr key={key}>
                            <td className="font-medium text-ink-900">{label}</td>
                            <td className="font-semibold text-civic-700">{type === "percent" ? formatScore(raw) : `${raw.toFixed(1)} ms`}</td>
                            <td className="text-xs text-ink-600">
                              {key === "precision_at_k"
                                ? "Proportion of top-K results that are relevant."
                                : key === "recall_at_k"
                                  ? "Proportion of all judged-relevant sections retrieved in top K."
                                  : key === "mrr"
                                    ? "Mean reciprocal rank of the first relevant result."
                                    : key === "ndcg_at_k"
                                      ? "Graded ranking quality relative to the ideal ordering."
                                      : key === "citation_correct_rate"
                                        ? "Share of results whose document and page citation match the source section."
                                        : key === "no_relevant_empty_rate"
                                          ? "How often the system returns nothing for queries with no relevant section."
                                          : key === "median_latency_ms"
                                            ? "Typical end-to-end retrieval latency."
                                            : "Tail retrieval latency across the benchmark."}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </Card>

              <Card>
                <div className="border-b border-paper-200 px-5 py-4">
                  <h3 className="font-serif text-lg font-semibold text-ink-900">Per-query results</h3>
                  <p className="text-xs text-ink-600">Inspect failure cases; aggregate scores alone can hide systematic errors.</p>
                </div>
                <div className="max-h-[60vh] overflow-auto">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Query</th>
                        <th>Category</th>
                        <th>P@K</th>
                        <th>R@K</th>
                        <th>RR</th>
                        <th>nDCG</th>
                        <th>Latency</th>
                        <th>Citation</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selected.results_json.map((result, index) => (
                        <tr key={`${result.query_id}-${index}`}>
                          <td className="max-w-sm">
                            <p className="truncate font-medium text-ink-900">{result.query_text}</p>
                            <p className="text-[11px] text-ink-600">{result.retrieved.length} retrieved</p>
                          </td>
                          <td className="text-xs">{result.category}</td>
                          <td>{formatScore(result.precision)}</td>
                          <td>{formatScore(result.recall)}</td>
                          <td>{result.rr.toFixed(2)}</td>
                          <td>{formatScore(result.ndcg)}</td>
                          <td>{result.latency_ms.toFixed(0)} ms</td>
                          <td>{result.citation_correct ? <Badge tone="civic">OK</Badge> : <Badge tone="rust">Check</Badge>}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </>
          ) : (
            <Card className="p-8 text-center text-sm text-ink-600">
              No experiment selected. Run a new experiment to produce metrics.
            </Card>
          )}
        </div>
      </div>

      {chartRows.length ? (
        <p className="text-xs leading-5 text-ink-600">
          Best observed Precision@K so far: {formatScore(best("precision_at_k"))}. Comparisons are only
          meaningful within the same benchmark judgments, corpus version, and K. Do not report these
          figures as legal or operational accuracy.
        </p>
      ) : null}
    </div>
  );
}

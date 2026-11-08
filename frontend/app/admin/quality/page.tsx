"use client";

import { ClipboardList, Loader2, Send } from "lucide-react";
import { useEffect, useState } from "react";
import { Alert, Badge, Card, SectionTitle, Spinner } from "@/components/ui";
import { api, ApiError, formatDateTime } from "@/lib/api";
import type { QualitySummary } from "@/lib/types";

const DIMENSIONS: Array<{ key: string; label: string; description: string }> = [
  {
    key: "functional_suitability",
    label: "Functional suitability",
    description: "The system retrieves the provisions needed to answer realistic ordinance questions.",
  },
  {
    key: "performance_efficiency",
    label: "Performance efficiency",
    description: "Search and document inspection respond quickly enough for the review task.",
  },
  {
    key: "compatibility",
    label: "Compatibility",
    description: "The interface works across the browsers and devices used by the intended users.",
  },
  {
    key: "usability",
    label: "Usability",
    description: "The workflow is understandable without training, including result interpretation.",
  },
  {
    key: "reliability",
    label: "Reliability",
    description: "Results and citations are consistent, and empty or error states behave predictably.",
  },
  {
    key: "security",
    label: "Security",
    description: "Administrative access and document operations are appropriately protected.",
  },
  {
    key: "maintainability",
    label: "Maintainability",
    description: "The corpus can be updated and re-indexed without breaking existing records.",
  },
  {
    key: "portability",
    label: "Portability",
    description: "The system can move to another environment without loss of core behavior.",
  },
];

const SCORES = [
  { value: 1, label: "1 · Poor" },
  { value: 2, label: "2 · Fair" },
  { value: 3, label: "3 · Good" },
  { value: 4, label: "4 · Very good" },
  { value: 5, label: "5 · Excellent" },
];

export default function QualitySurveyPage() {
  const [summary, setSummary] = useState<QualitySummary | null>(null);
  const [form, setForm] = useState({
    evaluator_name: "",
    evaluator_role: "",
    comments: "",
    is_test_data: false,
  });
  const [scores, setScores] = useState<Record<string, number>>(
    Object.fromEntries(DIMENSIONS.map((dimension) => [dimension.key, 3])),
  );
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const loadSummary = async () => {
    setSummary(await api.evaluation.qualitySummary());
  };

  useEffect(() => {
    loadSummary()
      .catch(() => setError("Quality responses could not be loaded."))
      .finally(() => setLoading(false));
  }, []);

  const submit = async () => {
    if (form.evaluator_name.trim().length < 2) {
      setError("Enter the evaluator's name.");
      return;
    }
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await api.evaluation.submitQuality({
        evaluator_name: form.evaluator_name.trim(),
        evaluator_role: form.evaluator_role || undefined,
        scores,
        comments: form.comments || undefined,
        is_test_data: form.is_test_data,
      });
      setNotice("Quality evaluation submitted.");
      setForm({ evaluator_name: "", evaluator_role: "", comments: "", is_test_data: false });
      setScores(Object.fromEntries(DIMENSIONS.map((dimension) => [dimension.key, 3])));
      await loadSummary();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Quality evaluation could not be submitted.");
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <Spinner label="Loading quality responses…" />;

  const renderSummary = (label: string, data: QualitySummary["real"]) => (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <h2 className="font-serif text-lg font-semibold text-ink-900">{label}</h2>
        <Badge tone={data.responses ? "civic" : "neutral"}>{data.responses} responses</Badge>
      </div>
      <div className="mt-3 flex items-end gap-2">
        <p className="font-serif text-3xl font-semibold text-ink-900">
          {data.overall_mean != null ? data.overall_mean.toFixed(2) : "—"}
        </p>
        <p className="pb-1 text-xs text-ink-600">overall mean / 5</p>
      </div>
      <div className="mt-4 space-y-2">
        {DIMENSIONS.map((dimension) => {
          const value = data.averages[dimension.key];
          return (
            <div key={dimension.key}>
              <div className="flex items-center justify-between text-xs">
                <span className="text-ink-700">{dimension.label}</span>
                <span className="font-semibold text-ink-900">{value != null ? value.toFixed(2) : "—"}</span>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-paper-200">
                <div className="h-full rounded-full bg-civic-500" style={{ width: `${((value || 0) / 5) * 100}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );

  return (
    <div className="space-y-6">
      <SectionTitle
        title="Quality evaluation"
        description="Collect structured usability and software-quality ratings using ISO/IEC 25010 characteristics. Test responses can be excluded from reported results."
      />

      {error ? <Alert>{error}</Alert> : null}
      {notice ? <Alert tone="success">{notice}</Alert> : null}

      {summary ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {renderSummary("Real evaluation responses", summary.real)}
          {renderSummary("Test / excluded responses", summary.test)}
        </div>
      ) : null}

      <Card className="p-5">
        <h2 className="flex items-center gap-2 font-serif text-lg font-semibold text-ink-900">
          <ClipboardList className="h-4 w-4 text-civic-700" aria-hidden /> Submit a response
        </h2>
        <p className="mt-1 text-xs leading-5 text-ink-600">
          Rate each characteristic from 1 (poor) to 5 (excellent) based on your own use of the system. Do
          not submit ratings on behalf of another evaluator.
        </p>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="label">Evaluator name</span>
            <input
              className="input"
              value={form.evaluator_name}
              onChange={(event) => setForm({ ...form, evaluator_name: event.target.value })}
              placeholder="Full name or initials"
            />
          </label>
          <label className="block">
            <span className="label">Role / group</span>
            <input
              className="input"
              value={form.evaluator_role}
              onChange={(event) => setForm({ ...form, evaluator_role: event.target.value })}
              placeholder="e.g. student, LGU staff, IT reviewer"
            />
          </label>
        </div>

        <div className="mt-4 divide-y divide-paper-200">
          {DIMENSIONS.map((dimension) => (
            <div key={dimension.key} className="grid gap-2 py-3 sm:grid-cols-[1fr_180px] sm:items-center">
              <div>
                <p className="text-sm font-medium text-ink-900">{dimension.label}</p>
                <p className="text-xs leading-5 text-ink-600">{dimension.description}</p>
              </div>
              <select
                className="input"
                value={scores[dimension.key]}
                onChange={(event) =>
                  setScores((current) => ({ ...current, [dimension.key]: Number(event.target.value) }))
                }
                aria-label={`${dimension.label} score`}
              >
                {SCORES.map((score) => (
                  <option key={score.value} value={score.value}>
                    {score.label}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>

        <label className="mt-3 block">
          <span className="label">Comments</span>
          <textarea
            className="input min-h-[90px]"
            value={form.comments}
            onChange={(event) => setForm({ ...form, comments: event.target.value })}
            placeholder="Specific strengths, failures, or suggestions."
          />
        </label>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <label className="inline-flex items-center gap-2 text-xs text-ink-700">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-paper-300 text-civic-700"
              checked={form.is_test_data}
              onChange={(event) => setForm({ ...form, is_test_data: event.target.checked })}
            />
            Mark as test data (excluded from real-response summary)
          </label>
          <button className="btn-primary" onClick={submit} disabled={busy}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Submit response
          </button>
        </div>
      </Card>

      {summary?.responses.length ? (
        <Card>
          <div className="border-b border-paper-200 px-5 py-4">
            <h2 className="font-serif text-lg font-semibold text-ink-900">Recorded responses</h2>
            <p className="text-xs text-ink-600">All responses, including test data.</p>
          </div>
          <div className="divide-y divide-paper-200">
            {summary.responses.map((response) => (
              <div key={response.id} className="px-5 py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-ink-900">{response.evaluator_name}</p>
                    <Badge>{response.evaluator_role || "role not stated"}</Badge>
                    {response.is_test_data ? <Badge tone="gold">Test data</Badge> : null}
                  </div>
                  <span className="text-xs text-ink-600">{formatDateTime(response.created_at)}</span>
                </div>
                {response.comments ? <p className="mt-1 text-xs leading-5 text-ink-700">{response.comments}</p> : null}
                <p className="mt-1 text-[11px] text-ink-600">
                  {Object.entries(response.scores)
                    .map(([key, value]) => `${key.replaceAll("_", " ")} ${value}`)
                    .join(" · ")}
                </p>
              </div>
            ))}
          </div>
        </Card>
      ) : null}
    </div>
  );
}

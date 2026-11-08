"use client";

import { Database, Loader2, Save, Settings2, UserPlus } from "lucide-react";
import { useEffect, useState } from "react";
import { Alert, Badge, Card, SectionTitle, Spinner } from "@/components/ui";
import { api, ApiError, formatDateTime } from "@/lib/api";
import type { SystemSettings, User } from "@/lib/types";

const RETRIEVAL_FIELDS: Array<{
  key: string;
  label: string;
  hint: string;
  step: string;
  min: number;
  max: number;
}> = [
  { key: "vector_weight", label: "Semantic weight", hint: "Weight applied to dense similarity in hybrid mode.", step: "0.05", min: 0, max: 1 },
  { key: "keyword_weight", label: "Keyword weight", hint: "Weight applied to FTS5 relevance in hybrid mode.", step: "0.05", min: 0, max: 1 },
  { key: "min_score", label: "Minimum hybrid score", hint: "Results below this normalized score are discarded.", step: "0.01", min: 0, max: 1 },
  { key: "vector_min_score", label: "Minimum semantic score", hint: "Floor for vector candidates before fusion.", step: "0.01", min: 0, max: 1 },
  { key: "top_k", label: "Default top K", hint: "Maximum number of results returned per search.", step: "1", min: 1, max: 50 },
];

export default function SettingsPage() {
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [retrieval, setRetrieval] = useState<Record<string, string | boolean>>({});
  const [chunking, setChunking] = useState<Record<string, string>>({});
  const [users, setUsers] = useState<User[]>([]);
  const [userForm, setUserForm] = useState({ email: "", full_name: "", password: "", role: "reviewer" });
  const [geminiKey, setGeminiKey] = useState("");
  const [geminiConfigured, setGeminiConfigured] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = async () => {
    const [config, accounts] = await Promise.all([api.admin.settings(), api.users()]);
    setSettings(config);
    setRetrieval(
      Object.fromEntries(
        Object.entries(config.retrieval).map(([key, value]) => [key, typeof value === "boolean" ? value : String(value)]),
      ),
    );
    setChunking(Object.fromEntries(Object.entries(config.chunking).map(([key, value]) => [key, String(value)])));
    setUsers(accounts);
    if (config.ai) {
      setGeminiConfigured(Boolean(config.ai.gemini_configured));
    }
  };

  useEffect(() => {
    load()
      .catch(() => setError("Settings could not be loaded. Administrator access is required."))
      .finally(() => setLoading(false));
  }, []);

  const saveAi = async () => {
    setBusy("ai");
    setError(null);
    setNotice(null);
    try {
      const res = await api.admin.updateAi({ gemini_api_key: geminiKey });
      setGeminiConfigured(res.gemini_configured);
      setNotice(
        res.gemini_configured
          ? "Google Gemini API Key saved. AI spelling & statutory formatting helper is now ACTIVE."
          : "Google Gemini settings updated.",
      );
      setGeminiKey("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "AI settings could not be saved.");
    } finally {
      setBusy(null);
    }
  };

  const saveRetrieval = async () => {
    setBusy("retrieval");
    setError(null);
    setNotice(null);
    try {
      const payload: Record<string, unknown> = {};
      for (const field of RETRIEVAL_FIELDS) payload[field.key] = Number(retrieval[field.key]);
      payload.rerank_enabled = Boolean(retrieval.rerank_enabled);
      const result = await api.admin.updateRetrieval(payload);
      setRetrieval(
        Object.fromEntries(
          Object.entries(result.retrieval).map(([key, value]) => [key, typeof value === "boolean" ? value : String(value)]),
        ),
      );
      setNotice("Retrieval settings saved. New searches use the updated configuration.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Retrieval settings could not be saved.");
    } finally {
      setBusy(null);
    }
  };

  const saveChunking = async () => {
    setBusy("chunking");
    setError(null);
    setNotice(null);
    try {
      const payload = Object.fromEntries(Object.entries(chunking).map(([key, value]) => [key, Number(value)]));
      await api.admin.updateChunking(payload);
      setNotice("Chunking settings saved. They apply to future processing and re-index jobs.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Chunking settings could not be saved.");
    } finally {
      setBusy(null);
    }
  };

  const createUser = async () => {
    setBusy("user");
    setError(null);
    setNotice(null);
    try {
      await api.createUser(userForm);
      setUserForm({ email: "", full_name: "", password: "", role: "reviewer" });
      setUsers(await api.users());
      setNotice("User account created.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "The user could not be created.");
    } finally {
      setBusy(null);
    }
  };

  if (loading) return <Spinner label="Loading settings…" />;
  if (!settings) return <Alert>{error || "Settings unavailable."}</Alert>;

  return (
    <div className="space-y-6">
      <SectionTitle
        title="System settings"
        description="Runtime retrieval and chunking overrides are stored in the database and audited. Environment-level processing limits require a restart."
      />

      {error ? <Alert>{error}</Alert> : null}
      {notice ? <Alert tone="success">{notice}</Alert> : null}

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-4">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-ink-600">
            <Database className="h-3.5 w-3.5" aria-hidden /> Embedding
          </p>
          <p className="mt-2 text-sm font-medium text-ink-900">{settings.embedding.provider}</p>
          <p className="mt-0.5 truncate text-xs text-ink-600">{settings.embedding.model}</p>
          <p className="mt-1 text-xs text-ink-600">Dimension: {settings.embedding.dimension ?? "not loaded"}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-600">OCR</p>
          <div className="mt-2 flex items-center gap-2">
            <Badge tone={settings.ocr.available ? "civic" : "rust"}>
              {settings.ocr.available ? "Available" : "Unavailable"}
            </Badge>
            <Badge>{settings.ocr.lang}</Badge>
            <Badge>{settings.ocr.dpi} DPI</Badge>
          </div>
          <p className="mt-1 text-xs text-ink-600">
            {settings.ocr.enabled ? "Enabled for pages without a text layer." : "Disabled in environment configuration."}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-600">Processing</p>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <Badge tone={settings.processing.worker_enabled ? "civic" : "gold"}>
              Worker {settings.processing.worker_enabled ? "enabled" : "disabled"}
            </Badge>
            <Badge>{String(settings.processing.max_upload_mb)} MB max</Badge>
            <Badge>batch {String(settings.processing.embedding_batch_size)}</Badge>
          </div>
          <p className="mt-1 text-xs text-ink-600">Environment-level values are read-only here.</p>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="flex items-center gap-2 font-serif text-lg font-semibold text-ink-900">
                <Settings2 className="h-4 w-4 text-civic-700" aria-hidden /> Retrieval
              </h2>
              <p className="text-xs text-ink-600">Applied to new searches immediately.</p>
            </div>
            <button className="btn-primary !py-1.5 text-xs" onClick={saveRetrieval} disabled={busy !== null}>
              {busy === "retrieval" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              Save
            </button>
          </div>
          <div className="mt-4 space-y-3">
            {RETRIEVAL_FIELDS.map((field) => (
              <label key={field.key} className="block">
                <span className="flex items-center justify-between gap-2">
                  <span className="label !mb-0">{field.label}</span>
                  <span className="text-[11px] text-ink-600">{field.hint}</span>
                </span>
                <input
                  type="number"
                  className="input mt-1"
                  step={field.step}
                  min={field.min}
                  max={field.max}
                  value={String(retrieval[field.key] ?? "")}
                  onChange={(event) => setRetrieval({ ...retrieval, [field.key]: event.target.value })}
                />
              </label>
            ))}
            <label className="inline-flex items-center gap-2 text-sm text-ink-700">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-paper-300 text-civic-700"
                checked={Boolean(retrieval.rerank_enabled)}
                onChange={(event) => setRetrieval({ ...retrieval, rerank_enabled: event.target.checked })}
              />
              Enable reranking in hybrid + rerank mode
            </label>
            <p className="rounded bg-paper-50 p-2 text-[11px] leading-5 text-ink-600">
              Vector and keyword weights are normalized during hybrid fusion. Changing them affects
              future benchmark comparability; record settings with any reported experiment.
            </p>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-serif text-lg font-semibold text-ink-900">Chunking</h2>
              <p className="text-xs text-ink-600">Applied to future extraction and re-index jobs.</p>
            </div>
            <button className="btn-primary !py-1.5 text-xs" onClick={saveChunking} disabled={busy !== null}>
              {busy === "chunking" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              Save
            </button>
          </div>
          <div className="mt-4 space-y-3">
            <label className="block">
              <span className="label">Maximum characters per chunk</span>
              <input
                type="number"
                min={200}
                max={8000}
                className="input"
                value={chunking.max_chars ?? ""}
                onChange={(event) => setChunking({ ...chunking, max_chars: event.target.value })}
              />
              <span className="mt-1 block text-[11px] text-ink-600">Default 1400. Larger chunks preserve context but reduce precision.</span>
            </label>
            <label className="block">
              <span className="label">Overlap characters</span>
              <input
                type="number"
                min={0}
                max={1000}
                className="input"
                value={chunking.overlap_chars ?? ""}
                onChange={(event) => setChunking({ ...chunking, overlap_chars: event.target.value })}
              />
              <span className="mt-1 block text-[11px] text-ink-600">Default 200. Overlap helps provisions that cross a boundary.</span>
            </label>
            <label className="block">
              <span className="label">Minimum chunk characters</span>
              <input
                type="number"
                min={0}
                max={1000}
                className="input"
                value={chunking.min_chars ?? ""}
                onChange={(event) => setChunking({ ...chunking, min_chars: event.target.value })}
              />
              <span className="mt-1 block text-[11px] text-ink-600">Very short fragments are merged into the preceding chunk.</span>
            </label>
            <p className="rounded bg-gold-100/60 p-2 text-[11px] leading-5 text-gold-700">
              Changing chunking does not automatically rebuild existing documents. Use “Re-index” on each
              affected document, then rerun experiments for a valid comparison.
            </p>
          </div>
        </Card>

        <Card className="p-5 xl:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-serif text-lg font-semibold text-ink-900 dark:text-ink-100">
                  Google Gemini OCR & Spell Refiner (Free Tier)
                </h2>
                <Badge tone={geminiConfigured ? "civic" : "gold"}>
                  {geminiConfigured ? "Active" : "Unconfigured (Heuristic Mode)"}
                </Badge>
              </div>
              <p className="mt-1 text-xs text-ink-600 dark:text-ink-400">
                Repairs OCR spelling errors, garbled typewriter characters, and formats statutory clauses in English and Filipino.
                Google Gemini API offers a 100% free tier (15 requests/min, 1M tokens/min) with no credit card required.
              </p>
            </div>
            <button
              className="btn-primary !py-1.5 text-xs"
              onClick={saveAi}
              disabled={busy !== null || !geminiKey.trim()}
            >
              {busy === "ai" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              Save API Key
            </button>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]">
            <label className="block">
              <span className="label">Google AI Studio API Key</span>
              <input
                type="password"
                className="input font-mono text-xs"
                placeholder={geminiConfigured ? "••••••••••••••••••••••••••••••••••••••• (Configured)" : "AIzaSy..."}
                value={geminiKey}
                onChange={(e) => setGeminiKey(e.target.value)}
              />
            </label>
            <div className="flex items-end">
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary !py-2 text-xs"
              >
                Get Free Gemini Key ↗
              </a>
            </div>
          </div>
          <p className="mt-2 text-[11px] text-ink-500">
            When configured, the system automatically runs spell correction during PDF ingestion, and enables the &quot;Refine OCR with AI&quot; button on all document records.
          </p>
        </Card>
      </div>

      <Card>
        <div className="border-b border-paper-200 px-5 py-4">
          <h2 className="font-serif text-lg font-semibold text-ink-900">Administrator accounts</h2>
          <p className="text-xs text-ink-600">Roles: admin (full control), reviewer (review/evaluation), viewer (read-only admin access).</p>
        </div>
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>Last login</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td className="font-medium text-ink-900">{user.full_name}</td>
                  <td>{user.email}</td>
                  <td>
                    <Badge tone={user.role === "admin" ? "civic" : "neutral"}>{user.role}</Badge>
                  </td>
                  <td>{user.is_active ? <Badge tone="civic">Active</Badge> : <Badge tone="rust">Disabled</Badge>}</td>
                  <td className="text-xs">{formatDateTime(user.last_login_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="border-t border-paper-200 p-5">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-ink-900">
            <UserPlus className="h-4 w-4 text-civic-700" aria-hidden /> Create an account
          </h3>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <label className="block">
              <span className="label">Full name</span>
              <input
                className="input"
                value={userForm.full_name}
                onChange={(event) => setUserForm({ ...userForm, full_name: event.target.value })}
              />
            </label>
            <label className="block">
              <span className="label">Email</span>
              <input
                type="email"
                className="input"
                value={userForm.email}
                onChange={(event) => setUserForm({ ...userForm, email: event.target.value })}
              />
            </label>
            <label className="block">
              <span className="label">Temporary password</span>
              <input
                type="password"
                className="input"
                value={userForm.password}
                onChange={(event) => setUserForm({ ...userForm, password: event.target.value })}
              />
            </label>
            <label className="block">
              <span className="label">Role</span>
              <select
                className="input"
                value={userForm.role}
                onChange={(event) => setUserForm({ ...userForm, role: event.target.value })}
              >
                <option value="reviewer">Reviewer</option>
                <option value="admin">Administrator</option>
                <option value="viewer">Viewer</option>
              </select>
            </label>
          </div>
          <div className="mt-3 flex justify-end">
            <button
              className="btn-primary"
              onClick={createUser}
              disabled={
                busy !== null ||
                userForm.full_name.trim().length < 2 ||
                userForm.password.length < 8 ||
                !userForm.email.includes("@")
              }
            >
              {busy === "user" ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
              Create account
            </button>
          </div>
        </div>
      </Card>
    </div>
  );
}

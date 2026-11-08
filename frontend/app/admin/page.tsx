"use client";

import {
  Activity,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Database,
  RefreshCw,
  ScanText,
  Upload,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { StatusBadge } from "@/components/status-badge";
import { Alert, Badge, Card, SectionTitle, Spinner } from "@/components/ui";
import { api, formatDateTime } from "@/lib/api";
import type { AdminStats } from "@/lib/types";

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    setError(null);
    api.admin
      .stats()
      .then(setStats)
      .catch(() => setError("Dashboard statistics could not be loaded."));
  };

  useEffect(() => {
    load();
  }, []);

  if (error) return <Alert>{error}</Alert>;
  if (!stats) return <Spinner label="Loading workspace…" />;

  const cards = [
    {
      label: "Active for retrieval",
      value: stats.documents.active,
      detail: `${stats.documents.total} total documents`,
      icon: CheckCircle2,
      tone: "text-civic-700 bg-civic-50",
      href: "/admin/documents",
    },
    {
      label: "Awaiting review",
      value: stats.documents.awaiting_review,
      detail: `${stats.documents.processed} processed`,
      icon: ScanText,
      tone: "text-gold-700 bg-gold-100",
      href: "/admin/documents?status=needs_review",
    },
    {
      label: "Indexed sections",
      value: stats.index.sections,
      detail: `${stats.index.chunks.toLocaleString()} chunks`,
      icon: Database,
      tone: "text-blue-700 bg-blue-50",
      href: "/admin/settings",
    },
    {
      label: "Unverified signatories",
      value: stats.signatories.unverified,
      detail: `${stats.signatories.total} extracted`,
      icon: Users,
      tone: "text-ink-700 bg-paper-100",
      href: "/admin/documents",
    },
  ];

  return (
    <div className="space-y-8">
      <SectionTitle
        title="Workspace overview"
        description="Monitor intake, review workload, and retrieval readiness. Activate only documents whose extracted text has been reviewed."
        action={
          <div className="flex gap-2">
            <button className="btn-secondary !py-2" onClick={load}>
              <RefreshCw className="h-4 w-4" aria-hidden /> Refresh
            </button>
            <Link href="/admin/documents" className="btn-primary !py-2">
              <Upload className="h-4 w-4" aria-hidden /> Upload documents
            </Link>
          </div>
        }
      />

      {!stats.system.ocr_available && stats.system.ocr_enabled ? (
        <Alert tone="warning">
          OCR is enabled but the Tesseract executable was not found. Scanned pages will fail extraction
          until the path is corrected in the environment configuration.
        </Alert>
      ) : null}
      {!stats.system.worker_enabled ? (
        <Alert tone="info">
          The background worker is disabled. New uploads will remain queued until processing is started
          manually from a document record.
        </Alert>
      ) : null}
      {stats.jobs.failed > 0 ? (
        <Alert tone="error">
          {stats.jobs.failed} processing job{stats.jobs.failed === 1 ? "" : "s"} failed. Inspect the
          document record, correct the cause, and retry the job.
        </Alert>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <Link key={card.label} href={card.href} className="surface group p-5 transition hover:border-civic-500/40">
            <div className="flex items-start justify-between">
              <span className={`flex h-10 w-10 items-center justify-center rounded-lg ${card.tone}`}>
                <card.icon className="h-5 w-5" aria-hidden />
              </span>
              <ArrowRight className="h-4 w-4 text-ink-600/40 transition group-hover:translate-x-0.5 group-hover:text-civic-700" aria-hidden />
            </div>
            <p className="mt-4 font-serif text-3xl font-semibold text-ink-900">{card.value.toLocaleString()}</p>
            <p className="mt-1 text-sm font-medium text-ink-800">{card.label}</p>
            <p className="mt-0.5 text-xs text-ink-600">{card.detail}</p>
          </Link>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.45fr_1fr]">
        <Card>
          <div className="flex items-center justify-between border-b border-paper-200 px-5 py-4">
            <div>
              <h2 className="font-serif text-lg font-semibold text-ink-900">Recent processing jobs</h2>
              <p className="text-xs text-ink-600">Intake and indexing activity</p>
            </div>
            <Link href="/admin/documents" className="btn-ghost !px-2 text-xs">
              View documents <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="divide-y divide-paper-200">
            {stats.jobs.recent.length ? (
              stats.jobs.recent.map((job) => (
                <div key={job.id} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Badge tone={job.job_type === "reindex" ? "blue" : "neutral"}>{job.job_type}</Badge>
                      <StatusBadge status={job.status} />
                    </div>
                    <p className="mt-1 truncate text-xs text-ink-600">
                      {job.stage || "Queued"} · {formatDateTime(job.created_at)}
                    </p>
                    {job.error ? <p className="mt-1 line-clamp-2 text-xs text-rust-700">{job.error}</p> : null}
                  </div>
                  <Link href={`/admin/documents/${job.document_id}`} className="text-xs font-medium text-civic-700 hover:underline">
                    Inspect
                  </Link>
                </div>
              ))
            ) : (
              <p className="px-5 py-8 text-sm text-ink-600">No processing jobs have run yet.</p>
            )}
          </div>
        </Card>

        <div className="space-y-4">
          <Card className="p-5">
            <h2 className="flex items-center gap-2 font-serif text-lg font-semibold text-ink-900">
              <Activity className="h-4 w-4 text-civic-700" aria-hidden /> System readiness
            </h2>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <dt className="text-ink-600">Embedding provider</dt>
                <dd className="font-medium text-ink-900">{stats.system.embedding_provider}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-ink-600">Vector dimension</dt>
                <dd className="font-medium text-ink-900">{stats.system.embedding_dim ?? "Not loaded"}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-ink-600">OCR engine</dt>
                <dd>
                  {stats.system.ocr_available ? (
                    <Badge tone="civic">Available · {stats.system.ocr_lang}</Badge>
                  ) : (
                    <Badge tone="rust">Unavailable</Badge>
                  )}
                </dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-ink-600">Background worker</dt>
                <dd>
                  {stats.system.worker_enabled ? <Badge tone="civic">Running</Badge> : <Badge tone="gold">Disabled</Badge>}
                </dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-ink-600">Verified sections</dt>
                <dd className="font-medium text-ink-900">
                  {stats.index.verified_sections} / {stats.index.sections}
                </dd>
              </div>
            </dl>
            <p className="mt-3 truncate rounded bg-paper-50 px-2 py-1.5 text-[11px] text-ink-600">
              Model: {stats.index.embedding_model}
            </p>
          </Card>

          <Card className="p-5">
            <h2 className="font-serif text-lg font-semibold text-ink-900">Review workload</h2>
            <div className="mt-3 space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-ink-700">Needs review</span>
                <span className="font-semibold text-ink-900">{stats.documents.awaiting_review}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-paper-200">
                <div
                  className="h-full rounded-full bg-gold-500"
                  style={{
                    width: `${stats.documents.total ? Math.min(100, (stats.documents.awaiting_review / stats.documents.total) * 100) : 0}%`,
                  }}
                />
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-ink-700">Failed documents</span>
                <span className="font-semibold text-ink-900">{stats.documents.failed}</span>
              </div>
              <Link href="/admin/documents?status=needs_review" className="btn-secondary w-full !py-1.5 text-xs">
                Open review queue
              </Link>
            </div>
          </Card>
        </div>
      </div>

      <Card>
        <div className="flex items-center justify-between border-b border-paper-200 px-5 py-4">
          <div>
            <h2 className="font-serif text-lg font-semibold text-ink-900">Recent activity</h2>
            <p className="text-xs text-ink-600">Attributed administrative actions</p>
          </div>
          <Link href="/admin/audit" className="btn-ghost !px-2 text-xs">
            Full audit log <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        <div className="divide-y divide-paper-200">
          {stats.recent_activity.length ? (
            stats.recent_activity.slice(0, 8).map((entry) => (
              <div key={entry.id} className="flex flex-wrap items-start justify-between gap-2 px-5 py-3">
                <div>
                  <p className="text-sm font-medium text-ink-900">{entry.action}</p>
                  <p className="text-xs text-ink-600">
                    {entry.actor_email || "system"} · {formatDateTime(entry.created_at)}
                  </p>
                </div>
                <Badge>{entry.entity_type || "system"}</Badge>
              </div>
            ))
          ) : (
            <p className="px-5 py-8 text-sm text-ink-600">No administrative activity recorded.</p>
          )}
        </div>
      </Card>

      <div className="flex items-start gap-2 rounded-lg border border-paper-300 bg-white p-4 text-xs text-ink-600">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-gold-700" aria-hidden />
        Activating a document makes its extracted text searchable by the public. Confirm metadata, OCR
        warnings, and section boundaries before approval.
      </div>
    </div>
  );
}

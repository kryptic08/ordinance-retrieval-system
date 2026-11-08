"use client";

import { ChevronLeft, ChevronRight, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { Alert, Badge, Card, SectionTitle, Spinner } from "@/components/ui";
import { api, formatDateTime } from "@/lib/api";
import type { AuditEntry, Paginated } from "@/lib/types";

export default function AuditPage() {
  const [data, setData] = useState<Paginated<AuditEntry> | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    setError(null);
    api.admin
      .audit(page)
      .then(setData)
      .catch(() => setError("The audit log could not be loaded."))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.page_size)) : 1;

  return (
    <div className="space-y-6">
      <SectionTitle
        title="Audit log"
        description="Immutable record of administrative and review actions, including actor, entity, and request context."
        action={
          <button className="btn-secondary !py-2" onClick={load}>
            <RefreshCw className="h-4 w-4" aria-hidden /> Refresh
          </button>
        }
      />

      {error ? <Alert>{error}</Alert> : null}

      <Card>
        {loading && !data ? (
          <div className="py-12 text-center">
            <Spinner label="Loading audit entries…" />
          </div>
        ) : data && data.items.length ? (
          <div className="divide-y divide-paper-200">
            {data.items.map((entry) => (
              <div key={entry.id} className="px-5 py-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone="civic">{entry.action}</Badge>
                      <Badge>{entry.entity_type || "system"}</Badge>
                      {entry.entity_id ? (
                        <span className="max-w-[180px] truncate text-[11px] text-ink-600">{entry.entity_id}</span>
                      ) : null}
                    </div>
                    <p className="mt-1 text-xs text-ink-600">
                      {entry.actor_email || "system"} · {formatDateTime(entry.created_at)}
                      {entry.ip_address ? ` · ${entry.ip_address}` : ""}
                    </p>
                  </div>
                  {Object.keys(entry.details || {}).length ? (
                    <details className="text-xs">
                      <summary className="cursor-pointer font-medium text-civic-700">Details</summary>
                      <pre className="mt-1 max-w-md overflow-auto rounded bg-paper-50 p-2 text-[11px]">
                        {JSON.stringify(entry.details, null, 2)}
                      </pre>
                    </details>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="px-5 py-10 text-center text-sm text-ink-600">No audit entries recorded.</p>
        )}

        <div className="flex items-center justify-between border-t border-paper-200 px-4 py-3">
          <p className="text-xs text-ink-600">{data ? `${data.total} entries` : "—"}</p>
          <div className="flex items-center gap-2">
            <button className="btn-ghost !px-2 !py-1" disabled={page <= 1} onClick={() => setPage((value) => value - 1)} aria-label="Previous page">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-xs text-ink-600">
              Page {page} of {totalPages}
            </span>
            <button
              className="btn-ghost !px-2 !py-1"
              disabled={page >= totalPages}
              onClick={() => setPage((value) => value + 1)}
              aria-label="Next page"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </Card>
    </div>
  );
}

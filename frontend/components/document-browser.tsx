"use client";

import { FileSearch, FileText, Loader2, Search } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { DocumentOptions, DocumentSummary, Paginated } from "@/lib/types";
import { Alert, Badge, EmptyState } from "./ui";
import { StatusBadge } from "./status-badge";

export function DocumentBrowser() {
  const [query, setQuery] = useState("");
  const [year, setYear] = useState("");
  const [documentType, setDocumentType] = useState("");
  const [jurisdiction, setJurisdiction] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Paginated<DocumentSummary> | null>(null);
  const [options, setOptions] = useState<DocumentOptions | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.documentOptions().then(setOptions).catch(() => undefined);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    api
      .documents({
        q: query.trim() || undefined,
        year: year ? Number(year) : undefined,
        document_type: documentType || undefined,
        jurisdiction: jurisdiction || undefined,
        page,
        page_size: 12,
      })
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch(() => {
        if (!cancelled) setError("The document repository could not be loaded.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [query, year, documentType, jurisdiction, page]);

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.page_size)) : 1;

  const reset = () => {
    setQuery("");
    setYear("");
    setDocumentType("");
    setJurisdiction("");
    setPage(1);
  };

  return (
    <div className="container-page py-10">
      <div className="max-w-3xl">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-civic-700 dark:text-[#4ade80]">
          OrdiSearch · Document Repository
        </p>
        <h1 className="mt-2 font-serif text-3xl font-semibold text-ink-900 dark:text-[#f3f3f3] sm:text-4xl">
          Browse the Polangui ordinance corpus
        </h1>
        <p className="mt-3 text-sm leading-6 text-ink-700 dark:text-[#d4d4d4]">
          Only official ordinances of the Municipality of Polangui approved and activated for retrieval appear here.
          Open any document to inspect its OCR-cleaned statutory sections and citations.
        </p>
      </div>

      <div className="mt-6 grid gap-3 rounded-xl border border-paper-300 bg-white p-4 sm:grid-cols-2 lg:grid-cols-4">
        <label className="relative block sm:col-span-2 lg:col-span-1">
          <span className="label">Title or ordinance number</span>
          <Search className="pointer-events-none absolute left-3 top-[34px] h-4 w-4 text-ink-600" aria-hidden />
          <input
            className="input !pl-9"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setPage(1);
            }}
            placeholder="e.g. waste disposal"
          />
        </label>
        <label className="block">
          <span className="label">Year</span>
          <select
            className="input"
            value={year}
            onChange={(event) => {
              setYear(event.target.value);
              setPage(1);
            }}
          >
            <option value="">Any year</option>
            {options?.years.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="label">Type</span>
          <select
            className="input"
            value={documentType}
            onChange={(event) => {
              setDocumentType(event.target.value);
              setPage(1);
            }}
          >
            <option value="">Any type</option>
            {options?.document_types.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="label">Jurisdiction</span>
          <select
            className="input"
            value={jurisdiction}
            onChange={(event) => {
              setJurisdiction(event.target.value);
              setPage(1);
            }}
          >
            <option value="">Any jurisdiction</option>
            {options?.jurisdictions.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
      </div>

      {error ? (
        <div className="mt-6">
          <Alert>{error}</Alert>
        </div>
      ) : null}

      <div className="mt-6 flex items-center justify-between gap-3">
        <p className="text-sm text-ink-600">
          {data ? (
            <>
              <strong className="text-ink-900">{data.total}</strong> document{data.total === 1 ? "" : "s"}
            </>
          ) : (
            "Loading documents…"
          )}
        </p>
        {(query || year || documentType || jurisdiction) && (
          <button className="btn-ghost text-xs" onClick={reset}>
            Clear filters
          </button>
        )}
      </div>

      {loading && !data ? (
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((item) => (
            <div key={item} className="surface h-52 animate-pulse p-5">
              <div className="h-3 w-24 rounded bg-paper-200" />
              <div className="mt-4 h-5 w-4/5 rounded bg-paper-200" />
              <div className="mt-3 h-3 w-full rounded bg-paper-200" />
              <div className="mt-2 h-3 w-3/4 rounded bg-paper-200" />
            </div>
          ))}
        </div>
      ) : data && data.items.length > 0 ? (
        <>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.items.map((doc) => (
              <Link
                key={doc.id}
                href={`/documents/${doc.id}`}
                className="surface group flex flex-col p-5 transition hover:-translate-y-0.5 hover:border-civic-500/40 hover:shadow-lg"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-civic-50 text-civic-700">
                    <FileText className="h-5 w-5" aria-hidden />
                  </span>
                  <StatusBadge status={doc.status} />
                </div>
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {doc.ordinance_number ? <Badge tone="civic">No. {doc.ordinance_number}</Badge> : null}
                  {doc.year ? <Badge>{doc.year}</Badge> : null}
                  <Badge>{doc.document_type}</Badge>
                </div>
                <h2 className="mt-3 line-clamp-3 font-serif text-[17px] font-semibold leading-snug text-ink-900 group-hover:text-civic-700">
                  {doc.title}
                </h2>
                <p className="mt-2 text-xs text-ink-600">
                  {doc.jurisdiction || doc.lgu || "Jurisdiction not stated"}
                </p>
                <div className="mt-auto flex items-center justify-between border-t border-paper-200 pt-3 text-[11px] text-ink-600">
                  <span>
                    {doc.page_count} page{doc.page_count === 1 ? "" : "s"} · {doc.section_count} sections
                  </span>
                  <span className="inline-flex items-center gap-1 font-medium text-civic-700">
                    <FileSearch className="h-3.5 w-3.5" aria-hidden />
                    Inspect
                  </span>
                </div>
              </Link>
            ))}
          </div>

          {totalPages > 1 ? (
            <div className="mt-8 flex items-center justify-center gap-3">
              <button
                className="btn-secondary !py-1.5"
                disabled={page <= 1 || loading}
                onClick={() => setPage((value) => Math.max(1, value - 1))}
              >
                Previous
              </button>
              <span className="inline-flex items-center gap-2 text-xs text-ink-600">
                {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                Page {data.page} of {totalPages}
              </span>
              <button
                className="btn-secondary !py-1.5"
                disabled={page >= totalPages || loading}
                onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
              >
                Next
              </button>
            </div>
          ) : null}
        </>
      ) : (
        <div className="mt-6">
          <EmptyState
            title="No active documents match"
            description="The repository contains no approved documents for these filters. Administrators must approve and activate a processed document before it appears here."
            action={
              <button className="btn-secondary" onClick={reset}>
                Clear filters
              </button>
            }
          />
        </div>
      )}
    </div>
  );
}

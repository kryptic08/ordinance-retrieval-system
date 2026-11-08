"use client";

import { ChevronDown, ChevronUp, FileText, MapPin, Scale } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { formatScore } from "@/lib/api";
import type { SearchResult } from "@/lib/types";
import { HighlightedText } from "./highlight";
import { Badge } from "./ui";

export function ResultCard({ result, rank }: { result: SearchResult; rank: number }) {
  const [expanded, setExpanded] = useState(false);
  const doc = result.document;
  const sectionLabel = result.section_number ? `Section ${result.section_number}` : "Unstructured passage";
  return (
    <article className="surface-hover overflow-hidden">
      <div className="border-b border-ink-100 bg-ink-50/50 px-5 py-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-civic-600 text-[10px] font-bold text-white shadow-sm">
                {rank}
              </span>
              {doc.ordinance_number ? (
                <Badge tone="civic">Ordinance No. {doc.ordinance_number}</Badge>
              ) : (
                <Badge tone="neutral">Number unknown</Badge>
              )}
              <Badge tone="neutral">{doc.document_type}</Badge>
              {doc.year ? <Badge tone="neutral">{doc.year}</Badge> : null}
            </div>
            <h3 className="mt-2 text-base font-semibold leading-snug text-ink-950">
              <Link href={`/documents/${doc.id}?page=${result.page_start}`} className="hover:text-civic-600 transition">
                {doc.title}
              </Link>
            </h3>
            <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-500 font-medium">
              <span className="inline-flex items-center gap-1.5 text-civic-700 font-semibold">
                <Scale className="h-3.5 w-3.5" aria-hidden />
                {sectionLabel}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5" aria-hidden />
                Page {result.page_start}
                {result.page_end !== result.page_start ? `–${result.page_end}` : ""}
              </span>
              {doc.jurisdiction ? (
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5" aria-hidden />
                  {doc.jurisdiction}
                </span>
              ) : null}
            </div>
          </div>
          <div className="shrink-0 rounded-xl border border-ink-200/80 bg-white px-3.5 py-2 text-right shadow-subtle">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-400">
              Match Confidence
            </p>
            <p className="text-lg font-bold text-civic-600">{formatScore(result.retrieval_score)}</p>
            <p className="text-[10px] text-ink-400">cosine + FTS5 rank</p>
          </div>
        </div>
      </div>
      <div className="px-5 py-4">
        {result.heading ? (
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-600">
            {result.heading}
          </p>
        ) : null}
        <p className="font-serif text-base leading-8 text-ink-800">
          <HighlightedText text={result.excerpt} terms={result.matched_terms} />
        </p>
        {expanded ? (
          <div className="mt-3 max-h-96 overflow-auto rounded-lg border border-paper-300 bg-paper-50 p-3">
            <p className="legal-text">
              <HighlightedText text={result.text} terms={result.matched_terms} />
            </p>
          </div>
        ) : null}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button className="btn-ghost !px-2 !py-1 text-xs" onClick={() => setExpanded((v) => !v)}>
            {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            {expanded ? "Hide full extracted section" : "View full extracted section"}
          </button>
          <Link href={`/documents/${doc.id}?page=${result.page_start}`} className="btn-secondary !py-1.5 text-xs">
            <FileText className="h-3.5 w-3.5" aria-hidden />
            Inspect source document
          </Link>
          <a
            className="btn-secondary !py-1.5 text-xs"
            href={`/backend/api/documents/${doc.id}/file#page=${result.page_start}`}
            target="_blank"
            rel="noreferrer"
          >
            Open PDF at page {result.page_start}
          </a>
          <span className="ml-auto text-[11px] text-ink-600">
            keyword {formatScore(result.keyword_score)} · semantic {formatScore(result.vector_score)}
          </span>
        </div>
      </div>
    </article>
  );
}

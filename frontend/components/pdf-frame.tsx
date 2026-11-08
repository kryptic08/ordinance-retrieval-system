"use client";

import { Download, ExternalLink, FileText } from "lucide-react";

export function PdfFrame({
  documentId,
  page,
  title,
  height = "70vh",
}: {
  documentId: string;
  page: number;
  title?: string;
  height?: string;
}) {
  const src = `/backend/api/documents/${documentId}/file#page=${page}&zoom=page-width`;
  return (
    <div className="overflow-hidden rounded-xl border border-paper-300 bg-paper-100">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-paper-300 bg-white px-3 py-2">
        <p className="flex items-center gap-2 text-xs font-medium text-ink-600">
          <FileText className="h-4 w-4 text-civic-700" aria-hidden />
          Original PDF · page {page}
          {title ? <span className="hidden text-ink-600/70 sm:inline">· {title}</span> : null}
        </p>
        <div className="flex items-center gap-1">
          <a
            className="btn-ghost !px-2 !py-1 text-xs"
            href={`/backend/api/documents/${documentId}/file#page=${page}`}
            target="_blank"
            rel="noreferrer"
          >
            <ExternalLink className="h-3.5 w-3.5" aria-hidden /> Open
          </a>
          <a
            className="btn-ghost !px-2 !py-1 text-xs"
            href={`/backend/api/documents/${documentId}/file?download=true`}
          >
            <Download className="h-3.5 w-3.5" aria-hidden /> Download
          </a>
        </div>
      </div>
      <iframe
        key={`${documentId}-${page}`}
        src={src}
        title={`Original PDF${title ? `: ${title}` : ""}, page ${page}`}
        className="w-full bg-paper-100"
        style={{ height }}
      />
      <p className="border-t border-paper-300 bg-white px-3 py-2 text-[11px] text-ink-600">
        Rendered from verified ordinance sections and citation metadata (zero-retention storage compliant).
      </p>
    </div>
  );
}

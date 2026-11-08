"use client";

import {
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  FileText,
  RefreshCw,
  Search,
  Upload,
  UploadCloud,
  X,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { StatusBadge } from "@/components/status-badge";
import { Alert, Badge, Card, SectionTitle, Spinner } from "@/components/ui";
import { api, ApiError, formatDate } from "@/lib/api";
import type { DocumentSummary, Paginated, UploadItem } from "@/lib/types";

const STATUSES = ["", "uploaded", "processing", "processed", "needs_review", "failed"];

export default function AdminDocumentsPage() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Paginated<DocumentSummary> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showUploader, setShowUploader] = useState(false);

  const [files, setFiles] = useState<File[]>([]);
  const [metadata, setMetadata] = useState({
    ordinance_number: "",
    title: "",
    document_type: "Ordinance",
    year: "",
    date_enacted: "",
    lgu: "",
    jurisdiction: "",
    category: "",
    subject: "",
  });
  const [uploading, setUploading] = useState(false);
  const [uploadResults, setUploadResults] = useState<UploadItem[] | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const load = () => {
    setLoading(true);
    setError(null);
    api.admin
      .documents({ q: q.trim() || undefined, status: status || undefined, page, page_size: 20 })
      .then(setData)
      .catch(() => setError("The document queue could not be loaded."))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    const initial = new URLSearchParams(window.location.search).get("status");
    if (initial) setStatus(initial);
  }, []);

  useEffect(() => {
    const timer = setTimeout(load, 200);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, status, page]);

  const addFiles = (incoming: FileList | File[]) => {
    const next = Array.from(incoming).filter(
      (file) => file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf"),
    );
    setUploadResults(null);
    setFiles((current) => {
      const keys = new Set(current.map((file) => `${file.name}:${file.size}`));
      return [...current, ...next.filter((file) => !keys.has(`${file.name}:${file.size}`))];
    });
  };

  const [publishImmediately, setPublishImmediately] = useState(true);
  const [uploadProgressText, setUploadProgressText] = useState("");

  const maxBytes = 50 * 1024 * 1024; // 50 MB limit
  const oversizedFiles = files.filter((f) => f.size > maxBytes);
  const hasOversized = oversizedFiles.length > 0;

  const upload = async () => {
    if (!files.length) return;
    if (hasOversized) {
      setError(`File exceeds the 50 MB limit (${oversizedFiles.map((f) => f.name).join(", ")}).`);
      return;
    }
    setUploading(true);
    setError(null);
    setUploadProgressText("Preparing files for upload…");
    const allResults: UploadItem[] = [];

    try {
      for (let fIdx = 0; fIdx < files.length; fIdx++) {
        const file = files[fIdx];
        const CHUNK_SIZE = 3 * 1024 * 1024; // 3 MB slices safely bypass Vercel's 4.5 MB serverless limit
        const totalChunks = Math.max(1, Math.ceil(file.size / CHUNK_SIZE));
        const uploadId =
          typeof crypto !== "undefined" && crypto.randomUUID
            ? crypto.randomUUID()
            : `upload-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

        for (let i = 0; i < totalChunks; i++) {
          const start = i * CHUNK_SIZE;
          const end = Math.min(file.size, start + CHUNK_SIZE);
          const blobSlice = file.slice(start, end);
          const chunkFile = new File([blobSlice], file.name, { type: "application/pdf" });

          const form = new FormData();
          form.append("upload_id", uploadId);
          form.append("chunk_index", String(i));
          form.append("total_chunks", String(totalChunks));
          form.append("filename", file.name);
          form.append("chunk", chunkFile);
          form.append("is_active", String(publishImmediately));

          // Include metadata on the final slice
          if (i === totalChunks - 1) {
            for (const [key, value] of Object.entries(metadata)) {
              if (value.trim()) form.append(key, value.trim());
            }
          }

          if (totalChunks > 1) {
            setUploadProgressText(
              `Uploading ${file.name}: slice ${i + 1} of ${totalChunks} (${Math.round(((i + 1) / totalChunks) * 100)}%)…`
            );
          } else {
            setUploadProgressText(`Uploading ${file.name}…`);
          }

          const resp = await api.admin.uploadChunk(form);
          if (resp.items) {
            allResults.push(...resp.items);
          }
        }
      }

      setUploadResults(allResults);
      setFiles([]);
      setMetadata({
        ordinance_number: "",
        title: "",
        document_type: "Ordinance",
        year: "",
        date_enacted: "",
        lgu: "",
        jurisdiction: "",
        category: "",
        subject: "",
      });
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
      setUploadProgressText("");
    }
  };

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.page_size)) : 1;

  return (
    <div className="space-y-6">
      <SectionTitle
        title="Documents"
        description="Every uploaded PDF is preserved, checksummed, and versioned. Metadata can be corrected after extraction; activation is a separate review decision."
        action={
          <div className="flex gap-2">
            <button className="btn-secondary !py-2" onClick={load}>
              <RefreshCw className="h-4 w-4" aria-hidden /> Refresh
            </button>
            <button className="btn-primary !py-2" onClick={() => setShowUploader((value) => !value)}>
              <Upload className="h-4 w-4" aria-hidden /> {showUploader ? "Hide uploader" : "Upload PDFs"}
            </button>
          </div>
        }
      />

      {error ? <Alert>{error}</Alert> : null}

      {showUploader ? (
        <Card className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="font-serif text-xl font-semibold text-ink-900">Add documents</h2>
              <p className="mt-1 text-xs text-ink-600">
                PDF only. Shared metadata below is applied to every file in this batch; leave fields blank
                to let extraction infer them.
              </p>
            </div>
            <button className="btn-ghost !px-2" onClick={() => setShowUploader(false)} aria-label="Close uploader">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div
            className={`mt-4 rounded-xl border-2 border-dashed p-7 text-center transition-all ${
              dragOver ? "border-civic-500 bg-civic-50/70" : "border-ink-200 bg-ink-50/50 hover:bg-ink-50"
            }`}
            onDragOver={(event) => {
              event.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(event) => {
              event.preventDefault();
              setDragOver(false);
              addFiles(event.dataTransfer.files);
            }}
          >
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-civic-50 text-civic-600 border border-civic-200">
              <UploadCloud className="h-6 w-6" aria-hidden />
            </div>
            <p className="mt-3 text-sm font-semibold text-ink-900">Drag & drop PDF files here</p>
            <p className="mt-1 text-xs text-ink-500">
              Only text and OCR-extracted data are stored. Original PDFs are safely disposed after ingestion.
            </p>
            <button className="btn-secondary mt-3.5 !py-1.5 !px-3 text-xs" onClick={() => fileInput.current?.click()}>
              Browse files
            </button>
            <input
              ref={fileInput}
              type="file"
              accept="application/pdf,.pdf"
              multiple
              className="hidden"
              onChange={(event) => {
                if (event.target.files) addFiles(event.target.files);
                event.target.value = "";
              }}
            />
          </div>

          <div className="mt-3 flex items-center gap-2 rounded-lg border border-civic-500/30 bg-civic-50/50 p-2.5 text-xs text-civic-900 dark:bg-civic-950/20 dark:text-civic-200">
            <span className="font-semibold text-civic-700 dark:text-civic-400">⚡ Sliced Streaming Upload Enabled:</span> Large PDFs up to 50 MB are automatically sliced into 3 MB chunks, safely bypassing Vercel serverless limits.
          </div>

          {files.length ? (
            <ul className="mt-3 divide-y divide-ink-100 rounded-lg border border-ink-200 bg-white shadow-subtle dark:bg-[#181818] dark:border-[#262626]">
              {files.map((file) => {
                const isOver = file.size > maxBytes;
                const slices = Math.max(1, Math.ceil(file.size / (3 * 1024 * 1024)));
                return (
                  <li key={`${file.name}-${file.size}`} className="flex items-center gap-3 px-3.5 py-2.5">
                    <FileText className={`h-4 w-4 ${isOver ? "text-rust-600" : "text-civic-600"}`} aria-hidden />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium text-ink-900 dark:text-ink-100">{file.name}</p>
                      <p className="text-[11px] text-ink-500">
                        {(file.size / 1024 / 1024).toFixed(2)} MB ·{" "}
                        {isOver ? (
                          <span className="font-medium text-rust-600">Exceeds 50 MB limit</span>
                        ) : (
                          <span>Ready for OCR & Ingestion ({slices} slice{slices > 1 ? "s" : ""})</span>
                        )}
                      </p>
                    </div>
                    <button
                      className="text-ink-400 hover:text-rust-600 transition"
                      onClick={() => setFiles((current) => current.filter((item) => item !== file))}
                      aria-label={`Remove ${file.name}`}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : null}

          <div className="mt-5 grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
            {[
              ["ordinance_number", "Ordinance number", "e.g. 2024-05"],
              ["title", "Title override", "Optional"],
              ["document_type", "Document type", "Ordinance"],
              ["year", "Year", "e.g. 2024"],
              ["date_enacted", "Date enacted", "YYYY-MM-DD"],
              ["lgu", "LGU", ""],
              ["jurisdiction", "Jurisdiction", ""],
              ["category", "Category", "e.g. Public safety"],
              ["subject", "Subject", ""],
            ].map(([key, label, placeholder]) => (
              <label key={key} className="block">
                <span className="label">{label}</span>
                <input
                  className="input"
                  value={metadata[key as keyof typeof metadata]}
                  placeholder={placeholder}
                  onChange={(event) => setMetadata((current) => ({ ...current, [key]: event.target.value }))}
                />
              </label>
            ))}
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-ink-100 pt-4 dark:border-[#262626]">
            <label className="inline-flex items-center gap-2 text-xs font-medium text-ink-800 dark:text-ink-200 cursor-pointer">
              <input
                type="checkbox"
                checked={publishImmediately}
                onChange={(e) => setPublishImmediately(e.target.checked)}
                className="h-4 w-4 rounded border-paper-300 text-civic-600 focus:ring-civic-500"
              />
              <span>Publish immediately for public search (makes document & all extracted phrases instantly searchable)</span>
            </label>
            <button className="btn-primary" disabled={!files.length || uploading || hasOversized} onClick={upload}>
              {uploading ? (
                <Spinner label={uploadProgressText || "Uploading…"} />
              ) : (
                <>
                  <Upload className="h-4 w-4" /> Upload and process
                </>
              )}
            </button>
          </div>

          {uploadResults ? (
            <div className="mt-4 space-y-2">
              {uploadResults.map((item) => (
                <div
                  key={item.filename}
                  className={`flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm ${
                    item.ok ? "border-civic-500/30 bg-civic-50" : "border-rust-600/30 bg-rust-50"
                  }`}
                >
                  <span className="flex min-w-0 items-center gap-2">
                    {item.ok ? (
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-civic-700" aria-hidden />
                    ) : (
                      <AlertCircle className="h-4 w-4 shrink-0 text-rust-700" aria-hidden />
                    )}
                    <span className="truncate">{item.filename}</span>
                  </span>
                  <span className="text-xs text-ink-700">
                    {item.ok && item.document ? (
                      <Link href={`/admin/documents/${item.document.id}`} className="link">
                        Open record
                      </Link>
                    ) : (
                      item.error
                    )}
                  </span>
                </div>
              ))}
            </div>
          ) : null}
        </Card>
      ) : null}

      <Card>
        <div className="flex flex-wrap items-end gap-3 border-b border-paper-200 px-4 py-3">
          <label className="relative min-w-[220px] flex-1">
            <span className="sr-only">Search documents</span>
            <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-ink-600" aria-hidden />
            <input
              className="input !pl-9"
              placeholder="Title, ordinance number, or filename"
              value={q}
              onChange={(event) => {
                setQ(event.target.value);
                setPage(1);
              }}
            />
          </label>
          <label className="block">
            <span className="sr-only">Status</span>
            <select
              className="input"
              value={status}
              onChange={(event) => {
                setStatus(event.target.value);
                setPage(1);
              }}
            >
              {STATUSES.map((item) => (
                <option key={item} value={item}>
                  {item ? item.replaceAll("_", " ") : "All statuses"}
                </option>
              ))}
            </select>
          </label>
          <button className="btn-secondary !py-2" onClick={load}>
            Apply
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>Document</th>
                <th>Status</th>
                <th>Pages</th>
                <th>Sections</th>
                <th>Created</th>
                <th className="text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading && !data ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center">
                    <Spinner label="Loading documents…" />
                  </td>
                </tr>
              ) : data && data.items.length ? (
                data.items.map((doc) => (
                  <tr key={doc.id}>
                    <td>
                      <div className="max-w-md">
                        <p className="truncate font-medium text-ink-900">{doc.title}</p>
                        <p className="mt-0.5 text-xs text-ink-600">
                          {doc.ordinance_number ? `No. ${doc.ordinance_number}` : "Number not extracted"}
                          {doc.year ? ` · ${doc.year}` : ""} · {doc.original_filename}
                        </p>
                      </div>
                    </td>
                    <td>
                      <div className="flex flex-col items-start gap-1">
                        <StatusBadge status={doc.status} />
                        {doc.is_active ? <Badge tone="civic">Active</Badge> : null}
                      </div>
                    </td>
                    <td>{doc.page_count}</td>
                    <td>{doc.section_count}</td>
                    <td className="whitespace-nowrap text-xs">{formatDate(doc.created_at)}</td>
                    <td className="text-right">
                      <Link href={`/admin/documents/${doc.id}`} className="btn-secondary !py-1 text-xs">
                        Review
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-sm text-ink-600">
                    No documents match these filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between border-t border-paper-200 px-4 py-3">
          <p className="text-xs text-ink-600">
            {data ? `${data.total} document${data.total === 1 ? "" : "s"}` : "—"}
          </p>
          <div className="flex items-center gap-2">
            <button
              className="btn-ghost !px-2 !py-1"
              disabled={page <= 1}
              onClick={() => setPage((value) => Math.max(1, value - 1))}
              aria-label="Previous page"
            >
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

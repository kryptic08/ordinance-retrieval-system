"use client";

import {
  ArrowLeft,
  CheckCircle2,
  Download,
  FileText,
  Loader2,
  Play,
  RefreshCw,
  RotateCcw,
  Save,
  Send,
  Sparkles,
  Trash2,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { StatusBadge } from "@/components/status-badge";
import { Alert, Badge, Card, Spinner } from "@/components/ui";
import { api, ApiError, formatDateTime } from "@/lib/api";
import type { DocumentDetail, DocumentSummary, Relationship } from "@/lib/types";

const TABS = ["Overview", "Pages & OCR", "Sections", "Signatories", "Relationships", "Revisions", "Jobs"] as const;
type Tab = (typeof TABS)[number];

const RELATIONSHIP_TYPES = ["amends", "repeals", "supersedes", "implements", "related_to", "possible_conflict"] as const;

const METADATA_FIELDS: Array<{ key: keyof MetadataForm; label: string; placeholder?: string }> = [
  { key: "ordinance_number", label: "Ordinance number" },
  { key: "title", label: "Title" },
  { key: "document_type", label: "Document type" },
  { key: "year", label: "Year", placeholder: "YYYY" },
  { key: "date_enacted", label: "Date enacted", placeholder: "YYYY-MM-DD" },
  { key: "lgu", label: "LGU" },
  { key: "jurisdiction", label: "Jurisdiction" },
  { key: "category", label: "Category" },
  { key: "subject", label: "Subject" },
  { key: "publication_status", label: "Publication status" },
  { key: "source_url", label: "Source URL" },
  { key: "notes", label: "Internal notes" },
];

interface MetadataForm {
  ordinance_number: string;
  title: string;
  document_type: string;
  year: string;
  date_enacted: string;
  lgu: string;
  jurisdiction: string;
  category: string;
  subject: string;
  publication_status: string;
  source_url: string;
  notes: string;
}

function toForm(doc: DocumentDetail): MetadataForm {
  return {
    ordinance_number: doc.ordinance_number || "",
    title: doc.title || "",
    document_type: doc.document_type || "Ordinance",
    year: doc.year ? String(doc.year) : "",
    date_enacted: doc.date_enacted || "",
    lgu: doc.lgu || "",
    jurisdiction: doc.jurisdiction || "",
    category: doc.category || "",
    subject: doc.subject || "",
    publication_status: doc.publication_status || "",
    source_url: doc.source_url || "",
    notes: doc.notes || "",
  };
}

export default function AdminDocumentPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const rawId = params?.id;
  const id =
    rawId && rawId !== "index"
      ? rawId
      : typeof window !== "undefined"
        ? window.location.pathname.split("/").filter(Boolean).pop()
        : rawId;
  const [doc, setDoc] = useState<DocumentDetail | null>(null);
  const [revisions, setRevisions] = useState<Awaited<ReturnType<typeof api.admin.revisions>>>([]);
  const [allDocs, setAllDocs] = useState<DocumentSummary[]>([]);
  const [tab, setTab] = useState<Tab>("Overview");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [metadata, setMetadata] = useState<MetadataForm | null>(null);
  const [selectedPage, setSelectedPage] = useState(1);
  const [pageText, setPageText] = useState("");
  const [pageReason, setPageReason] = useState("");
  const [pageApprove, setPageApprove] = useState(false);
  const [selectedSection, setSelectedSection] = useState<string>("");
  const [sectionText, setSectionText] = useState("");
  const [sectionReason, setSectionReason] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [showDelete, setShowDelete] = useState(false);
  const [relationship, setRelationship] = useState({
    to_document_id: "",
    relationship_type: "related_to",
    notes: "",
    verified: false,
  });

  const load = async () => {
    if (!id) return;
    setError(null);
    try {
      const result = await api.admin.document(id);
      setDoc(result);
      setMetadata(toForm(result));
      setAllDocs((await api.admin.documents({ page_size: 100 })).items);
      setRevisions(await api.admin.revisions(id));
      const initialPage = result.pages[0];
      if (initialPage) {
        setSelectedPage((current) =>
          result.pages.some((page) => page.page_number === current) ? current : initialPage.page_number,
        );
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Document could not be loaded.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    if (!doc) return;
    const isProcessing =
      doc.status === "uploaded" ||
      doc.status === "processing" ||
      doc.jobs.some((j) => j.status === "queued" || j.status === "running");
    if (!isProcessing) return;
    const interval = setInterval(() => {
      void load();
    }, 2500);
    return () => clearInterval(interval);
  }, [doc?.status, doc?.jobs?.length]);

  const currentPage = useMemo(
    () => doc?.pages.find((page) => page.page_number === selectedPage),
    [doc, selectedPage],
  );
  const currentSection = useMemo(
    () => doc?.sections.find((section) => section.id === selectedSection),
    [doc, selectedSection],
  );

  useEffect(() => {
    setPageText(currentPage?.corrected_text ?? currentPage?.normalized_text ?? "");
    setPageReason("");
    setPageApprove(false);
  }, [currentPage]);

  useEffect(() => {
    setSectionText(currentSection?.corrected_text ?? currentSection?.normalized_text ?? "");
    setSectionReason("");
  }, [currentSection]);

  const run = async (key: string, action: () => Promise<unknown>, message?: string) => {
    setBusy(key);
    setError(null);
    setNotice(null);
    try {
      await action();
      if (message) setNotice(message);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "The action failed.");
    } finally {
      setBusy(null);
    }
  };

  const deleteDocument = async () => {
    if (!doc) return;
    setBusy("delete");
    setError(null);
    setNotice(null);
    try {
      await api.admin.deleteDocument(doc.id, deleteConfirm);
      router.replace("/admin/documents");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "The action failed.");
    } finally {
      setBusy(null);
    }
  };

  const saveMetadata = () => {
    if (!doc || !metadata) return;
    const payload: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(metadata)) {
      payload[key] = key === "year" ? (value ? Number(value) : null) : value || null;
    }
    void run("metadata", () => api.admin.updateDocument(doc.id, payload), "Metadata saved.");
  };

  const savePage = () => {
    if (!doc || !currentPage) return;
    if (!pageText.trim()) {
      setError("Corrected page text cannot be empty.");
      return;
    }
    void run(
      "page",
      () => api.admin.correctPage(doc.id, currentPage.page_number, {
        corrected_text: pageText,
        reason: pageReason || undefined,
        approve: pageApprove,
      }),
      "Page correction saved. Re-index the document or correct affected sections to update retrieval.",
    );
  };

  const saveSection = () => {
    if (!doc || !currentSection) return;
    if (!sectionText.trim()) {
      setError("Corrected section text cannot be empty.");
      return;
    }
    void run(
      "section",
      () => api.admin.correctSection(doc.id, currentSection.id, {
        corrected_text: sectionText,
        reason: sectionReason || undefined,
      }),
      "Section corrected and its chunks re-embedded.",
    );
  };

  const addRelationship = () => {
    if (!doc || !relationship.to_document_id) return;
    void run(
      "relationship",
      () =>
        api.admin.createRelationship(doc.id, {
          ...relationship,
          notes: relationship.notes || undefined,
        }),
      "Relationship added.",
    );
  };

  if (loading) return <Spinner label="Loading document record…" />;
  if (error && !doc) return <Alert>{error}</Alert>;
  if (!doc || !metadata) return <Alert>Document not found.</Alert>;

  const hasActiveJob = doc.jobs.some((job) => job.status === "queued" || job.status === "running");

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/documents" className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-600 hover:text-civic-700">
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden /> Document queue
        </Link>
        <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={doc.status} />
              {doc.is_active ? <Badge tone="civic">Active</Badge> : <Badge tone="gold">Inactive</Badge>}
              {doc.ordinance_number ? <Badge>No. {doc.ordinance_number}</Badge> : null}
              {doc.year ? <Badge>{doc.year}</Badge> : null}
            </div>
            <h1 className="mt-2 max-w-3xl font-serif text-2xl font-semibold leading-tight text-ink-900 sm:text-3xl">
              {doc.title}
            </h1>
            <p className="mt-1 text-xs text-ink-600">
              {doc.original_filename} · {doc.page_count} pages · {doc.section_count} sections · uploaded{" "}
              {formatDateTime(doc.created_at)}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              className="btn-secondary !py-2"
              disabled={busy !== null || hasActiveJob}
              onClick={() => run("reindex", () => api.admin.createJob(doc.id, "reindex"), "Re-index job queued.")}
            >
              <RotateCcw className="h-4 w-4" aria-hidden /> Re-index
            </button>
            <button
              className="btn-secondary !py-2 text-civic-700 dark:text-civic-400"
              disabled={busy !== null || hasActiveJob}
              onClick={() =>
                run(
                  "refine-ocr",
                  async () => {
                    const res = await api.admin.refineOcr(doc.id);
                    await load();
                    return res;
                  },
                  "Statutory text spelling & formatting refined with Gemini AI.",
                )
              }
            >
              <Sparkles className="h-4 w-4" aria-hidden /> Refine OCR with AI
            </button>
            <button
              className="btn-secondary !py-2"
              disabled={busy !== null || hasActiveJob}
              onClick={() => run("extract", () => api.admin.createJob(doc.id, "extract"), "Re-extraction job queued.")}
            >
              <Play className="h-4 w-4" aria-hidden /> Re-extract
            </button>
          </div>
        </div>
      </div>

      {error ? <Alert>{error}</Alert> : null}
      {notice ? <Alert tone="success">{notice}</Alert> : null}
      {doc.processing_error ? <Alert tone="error">Processing error: {doc.processing_error}</Alert> : null}

      {hasActiveJob || doc.status === "uploaded" || doc.status === "processing" ? (
        <Card className="border-civic-500/40 bg-civic-50/50 p-4 dark:bg-civic-950/20">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Loader2 className="h-5 w-5 animate-spin text-civic-600" />
              <div>
                <p className="text-sm font-semibold text-ink-900">
                  {doc.jobs[0]?.stage || (doc.status === "uploaded" ? "Queued for processing & OCR" : "Processing document…")}
                </p>
                <p className="text-xs text-ink-600">
                  {doc.jobs[0]?.status === "queued" ? "Waiting in ingestion queue" : "Extracting text, sections, and vector embeddings"}
                  {doc.jobs[0] ? ` · Attempt ${doc.jobs[0].attempts}/${doc.jobs[0].max_attempts}` : ""}
                </p>
              </div>
            </div>
            {doc.jobs[0] && (doc.jobs[0].status === "queued" || doc.jobs[0].status === "failed") ? (
              <button
                className="btn-primary !py-1 text-xs"
                disabled={busy !== null}
                onClick={() => run("retry", () => api.admin.retryJob(doc.jobs[0].id), "Processing started.")}
              >
                <RotateCcw className="h-3.5 w-3.5" /> Run now
              </button>
            ) : null}
          </div>
          {doc.jobs[0] ? (
            <div className="mt-3">
              <div className="flex items-center justify-between text-[11px] text-ink-600 mb-1">
                <span>Progress</span>
                <span>{doc.jobs[0].progress <= 1 ? Math.round(doc.jobs[0].progress * 100) : doc.jobs[0].progress}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-paper-200">
                <div
                  className="h-full rounded-full bg-civic-600 transition-all duration-300"
                  style={{ width: `${Math.min(100, Math.max(0, doc.jobs[0].progress <= 1 ? Math.round(doc.jobs[0].progress * 100) : doc.jobs[0].progress))}%` }}
                />
              </div>
            </div>
          ) : null}
        </Card>
      ) : null}

      <Card className="flex flex-wrap items-center justify-between gap-3 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <button
            className="btn-secondary !py-1.5"
            disabled={busy !== null}
            onClick={() =>
              run(
                "approve",
                () => api.admin.approve(doc.id),
                "All sections marked verified. The document is still inactive until you activate it.",
              )
            }
          >
            <CheckCircle2 className="h-4 w-4" aria-hidden /> Approve extracted text
          </button>
          <button
            className={doc.is_active ? "btn-secondary !py-1.5" : "btn-primary !py-1.5"}
            disabled={busy !== null || (!doc.is_active && !doc.section_count)}
            onClick={() =>
              run(
                "activate",
                () => api.admin.activate(doc.id, !doc.is_active),
                doc.is_active ? "Document removed from public search." : "Document activated for public search.",
              )
            }
          >
            {doc.is_active ? <XCircle className="h-4 w-4" aria-hidden /> : <Send className="h-4 w-4" aria-hidden />}
            {doc.is_active ? "Deactivate" : "Activate for public search"}
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn-ghost !px-2 text-xs" onClick={() => setShowDelete((value) => !value)}>
            <Trash2 className="h-3.5 w-3.5" aria-hidden /> Delete document
          </button>
        </div>
      </Card>

      {showDelete ? (
        <Card className="border-rust-600/40 p-4">
          <p className="text-sm font-semibold text-rust-700">Permanently delete this document?</p>
          <p className="mt-1 text-xs text-ink-600">
            This removes the record, extracted pages, sections, chunks, and preserved files. Type the exact
            document title or id to confirm.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <input
              className="input max-w-md"
              value={deleteConfirm}
              onChange={(event) => setDeleteConfirm(event.target.value)}
              placeholder={doc.title}
            />
            <button
              className="btn bg-rust-700 text-white hover:bg-rust-700/90 disabled:opacity-50"
              disabled={deleteConfirm !== doc.title && deleteConfirm !== doc.id}
              onClick={() => void deleteDocument()}
            >
              Delete permanently
            </button>
          </div>
        </Card>
      ) : null}

      <div className="flex flex-wrap gap-1 rounded-lg border border-paper-300 bg-white p-1">
        {TABS.map((item) => (
          <button
            key={item}
            onClick={() => setTab(item)}
            className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${
              tab === item ? "bg-civic-700 text-white" : "text-ink-700 hover:bg-paper-100"
            }`}
          >
            {item}
            {item === "Pages & OCR" ? ` (${doc.pages.length})` : ""}
            {item === "Sections" ? ` (${doc.sections.length})` : ""}
            {item === "Signatories" ? ` (${doc.signatories.length})` : ""}
            {item === "Jobs" ? ` (${doc.jobs.length})` : ""}
          </button>
        ))}
      </div>

      {tab === "Overview" ? (
        <div className="grid gap-6 xl:grid-cols-[1.2fr_1fr]">
          <Card className="p-5">
            <div className="flex items-center justify-between">
              <h2 className="font-serif text-lg font-semibold text-ink-900">Metadata</h2>
              <button className="btn-primary !py-1.5 text-xs" onClick={saveMetadata} disabled={busy !== null}>
                {busy === "metadata" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                Save changes
              </button>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {METADATA_FIELDS.map((field) => (
                <label key={field.key} className={field.key === "title" || field.key === "notes" ? "sm:col-span-2" : ""}>
                  <span className="label">{field.label}</span>
                  {field.key === "notes" ? (
                    <textarea
                      className="input min-h-[80px]"
                      value={metadata[field.key]}
                      onChange={(event) => setMetadata({ ...metadata, [field.key]: event.target.value })}
                    />
                  ) : (
                    <input
                      className="input"
                      value={metadata[field.key]}
                      placeholder={field.placeholder}
                      onChange={(event) => setMetadata({ ...metadata, [field.key]: event.target.value })}
                    />
                  )}
                </label>
              ))}
            </div>
          </Card>

          <div className="space-y-4">
            <Card className="p-5">
              <h2 className="font-serif text-lg font-semibold text-ink-900">Processing summary</h2>
              <dl className="mt-3 space-y-2 text-sm">
                {[
                  ["Checksum", doc.checksum.slice(0, 16) + "…"],
                  ["File size", `${(doc.file_size / 1024 / 1024).toFixed(2)} MB`],
                  ["Embedding model", doc.embedding_model || "Not embedded"],
                  ["Vector dimension", doc.embedding_dim ? String(doc.embedding_dim) : "—"],
                  ["Corpus version", doc.corpus_version],
                  ["OCR pages", String(doc.pages.filter((page) => page.is_scanned).length)],
                  [
                    "Verified sections",
                    `${doc.sections.filter((section) => section.verification_status === "verified").length} / ${doc.sections.length}`,
                  ],
                ].map(([label, value]) => (
                  <div key={label} className="flex items-start justify-between gap-3">
                    <dt className="text-ink-600">{label}</dt>
                    <dd className="max-w-[60%] truncate text-right font-medium text-ink-900">{value}</dd>
                  </div>
                ))}
              </dl>
            </Card>
            <Card className="p-4 text-xs text-ink-600">
              Original PDF files and rendered page images are purged after extraction to protect physical
              signatures and personal data under privacy policy. Review and edit the OCR-normalized text
              directly in the Sections and Pages &amp; OCR tabs.
            </Card>
          </div>
        </div>
      ) : null}

      {tab === "Pages & OCR" ? (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,36%)_minmax(0,1fr)]">
          <div className="space-y-3">
            <Card className="max-h-[70vh] overflow-y-auto p-2">
              {doc.pages.map((page) => (
                <button
                  key={page.id}
                  onClick={() => setSelectedPage(page.page_number)}
                  className={`flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm ${
                    page.page_number === selectedPage ? "bg-civic-50 text-civic-700" : "hover:bg-paper-50"
                  }`}
                >
                  <span className="font-medium">Page {page.page_number}</span>
                  <span className="flex flex-wrap items-center justify-end gap-1">
                    {page.is_scanned ? <Badge tone="gold">OCR</Badge> : <Badge tone="civic">Text</Badge>}
                    {page.reviewed_at ? <Badge tone="blue">Reviewed</Badge> : null}
                    {page.ocr_confidence != null ? (
                      <span className="text-[10px] text-ink-600">{(page.ocr_confidence * 100).toFixed(0)}%</span>
                    ) : null}
                  </span>
                </button>
              ))}
            </Card>
          </div>

          <Card className="p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="font-serif text-lg font-semibold text-ink-900">Page {selectedPage} text</h2>
                <p className="text-xs text-ink-600">
                  Source: {currentPage?.text_source || "—"} · type: {currentPage?.page_type || "—"}
                  {currentPage?.ocr_confidence != null
                    ? ` · OCR confidence ${(currentPage.ocr_confidence * 100).toFixed(1)}%`
                    : ""}
                </p>
              </div>
              {currentPage?.reviewed_at ? <Badge tone="civic">Review recorded</Badge> : <Badge tone="gold">Unreviewed</Badge>}
            </div>
            {currentPage?.warnings.length ? (
              <p className="mt-2 rounded bg-gold-100 px-2 py-1.5 text-xs text-gold-700">
                {currentPage.warnings.join("; ")}
              </p>
            ) : null}
            <label className="mt-3 block">
              <span className="label">Corrected page text</span>
              <textarea
                className="input min-h-[420px] font-mono text-xs leading-5"
                value={pageText}
                onChange={(event) => setPageText(event.target.value)}
              />
            </label>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="label">Reason for correction</span>
                <input className="input" value={pageReason} onChange={(event) => setPageReason(event.target.value)} />
              </label>
              <label className="mt-6 inline-flex items-center gap-2 text-sm text-ink-700">
                <input
                  type="checkbox"
                  checked={pageApprove}
                  onChange={(event) => setPageApprove(event.target.checked)}
                  className="h-4 w-4 rounded border-paper-300 text-civic-700"
                />
                Mark this page reviewed
              </label>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <button className="btn-primary !py-2" onClick={savePage} disabled={busy !== null}>
                {busy === "page" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save page correction
              </button>
              <button className="btn-secondary !py-2" onClick={() => setPageText(currentPage?.normalized_text || "")}>
                <RefreshCw className="h-4 w-4" /> Reset to extracted text
              </button>
            </div>
            <p className="mt-3 text-xs leading-5 text-ink-600">
              Page corrections are recorded as revisions. They do not automatically rebuild section chunks;
              use “Re-extract” or correct the affected sections, then re-index.
            </p>
          </Card>
        </div>
      ) : null}

      {tab === "Sections" ? (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,38%)_minmax(0,1fr)]">
          <Card className="max-h-[75vh] overflow-y-auto p-2">
            {doc.sections.map((section) => (
              <button
                key={section.id}
                onClick={() => setSelectedSection(section.id)}
                className={`w-full rounded-lg px-3 py-2 text-left ${
                  section.id === selectedSection ? "bg-civic-50" : "hover:bg-paper-50"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wide text-civic-700">
                    {section.section_number ? `Section ${section.section_number}` : section.section_type}
                  </span>
                  <Badge>{section.verification_status}</Badge>
                </div>
                {section.heading ? <p className="mt-0.5 line-clamp-2 text-sm text-ink-900">{section.heading}</p> : null}
                <p className="mt-0.5 text-[11px] text-ink-600">
                  Pages {section.page_start}–{section.page_end} · {section.chunk_count} chunks
                </p>
              </button>
            ))}
          </Card>
          <Card className="p-5">
            {currentSection ? (
              <>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h2 className="font-serif text-lg font-semibold text-ink-900">
                      {currentSection.section_number ? `Section ${currentSection.section_number}` : currentSection.section_type}
                    </h2>
                    <p className="text-xs text-ink-600">
                      Pages {currentSection.page_start}–{currentSection.page_end} · {currentSection.chunk_count} chunks
                    </p>
                  </div>
                  <Badge tone={currentSection.verification_status === "verified" ? "civic" : "gold"}>
                    {currentSection.verification_status}
                  </Badge>
                </div>
                <label className="mt-3 block">
                  <span className="label">Corrected section text</span>
                  <textarea
                    className="input min-h-[420px] font-serif text-sm leading-7"
                    value={sectionText}
                    onChange={(event) => setSectionText(event.target.value)}
                  />
                </label>
                <label className="mt-3 block">
                  <span className="label">Reason for correction</span>
                  <input className="input" value={sectionReason} onChange={(event) => setSectionReason(event.target.value)} />
                </label>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button className="btn-primary !py-2" onClick={saveSection} disabled={busy !== null}>
                    {busy === "section" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    Save and re-embed section
                  </button>
                  <button className="btn-secondary !py-2" onClick={() => setSectionText(currentSection.normalized_text)}>
                    <RefreshCw className="h-4 w-4" /> Reset to extracted text
                  </button>
                </div>
              </>
            ) : (
              <p className="text-sm text-ink-600">Select a section to review its extracted text.</p>
            )}
          </Card>
        </div>
      ) : null}

      {tab === "Signatories" ? (
        <Card className="p-5">
          <h2 className="font-serif text-lg font-semibold text-ink-900">Signatories</h2>
          <p className="mt-1 text-xs text-ink-600">
            Confirm names and titles only when visible in the signature block. Verification is attributable.
          </p>
          {doc.signatories.length ? (
            <div className="mt-4 space-y-3">
              {doc.signatories.map((signatory) => (
                <SignatoryEditor
                  key={signatory.id}
                  signatory={signatory}
                  busy={busy === signatory.id}
                  onSave={(payload) =>
                    run(
                      signatory.id,
                      () => api.admin.updateSignatory(signatory.id, payload),
                      "Signatory record updated.",
                    )
                  }
                />
              ))}
            </div>
          ) : (
            <p className="mt-4 rounded-lg bg-paper-50 p-3 text-sm text-ink-600">
              No signature block was detected. Re-extraction will not invent signatories.
            </p>
          )}
        </Card>
      ) : null}

      {tab === "Relationships" ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="p-5">
            <h2 className="font-serif text-lg font-semibold text-ink-900">Existing relationships</h2>
            <div className="mt-3 space-y-2">
              {doc.relationships.length ? (
                doc.relationships.map((item: Relationship) => (
                  <div key={item.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-paper-200 p-3">
                    <div>
                      <Badge tone="blue">{item.relationship_type.replaceAll("_", " ")}</Badge>
                      <Link href={`/admin/documents/${item.to_document_id}`} className="ml-2 text-sm text-civic-700 hover:underline">
                        {allDocs.find((candidate) => candidate.id === item.to_document_id)?.title || item.to_document_id}
                      </Link>
                      {item.notes ? <p className="mt-1 text-xs text-ink-600">{item.notes}</p> : null}
                    </div>
                    <div className="flex items-center gap-2">
                      {item.verified ? <Badge tone="civic">Verified</Badge> : <Badge>Unverified</Badge>}
                      <button
                        className="btn-ghost !px-2 text-xs"
                        onClick={() => run("relationship", () => api.admin.deleteRelationship(item.id), "Relationship removed.")}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-ink-600">No relationships recorded.</p>
              )}
            </div>
          </Card>
          <Card className="p-5">
            <h2 className="font-serif text-lg font-semibold text-ink-900">Add a relationship</h2>
            <div className="mt-3 space-y-3">
              <label className="block">
                <span className="label">Related document</span>
                <select
                  className="input"
                  value={relationship.to_document_id}
                  onChange={(event) => setRelationship({ ...relationship, to_document_id: event.target.value })}
                >
                  <option value="">Select a document</option>
                  {allDocs
                    .filter((candidate) => candidate.id !== doc.id)
                    .map((candidate) => (
                      <option key={candidate.id} value={candidate.id}>
                        {candidate.title}
                      </option>
                    ))}
                </select>
              </label>
              <label className="block">
                <span className="label">Relationship type</span>
                <select
                  className="input"
                  value={relationship.relationship_type}
                  onChange={(event) => setRelationship({ ...relationship, relationship_type: event.target.value })}
                >
                  {RELATIONSHIP_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type.replaceAll("_", " ")}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="label">Notes</span>
                <input
                  className="input"
                  value={relationship.notes}
                  onChange={(event) => setRelationship({ ...relationship, notes: event.target.value })}
                />
              </label>
              <label className="inline-flex items-center gap-2 text-sm text-ink-700">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-paper-300 text-civic-700"
                  checked={relationship.verified}
                  onChange={(event) => setRelationship({ ...relationship, verified: event.target.checked })}
                />
                Verified by reviewer
              </label>
              <button
                className="btn-primary w-full !py-2"
                onClick={addRelationship}
                disabled={!relationship.to_document_id || busy !== null}
              >
                Add relationship
              </button>
            </div>
          </Card>
        </div>
      ) : null}

      {tab === "Revisions" ? (
        <Card>
          <div className="border-b border-paper-200 px-5 py-4">
            <h2 className="font-serif text-lg font-semibold text-ink-900">Revision history</h2>
            <p className="text-xs text-ink-600">Original extracted text is retained beside each correction.</p>
          </div>
          <div className="divide-y divide-paper-200">
            {revisions.length ? (
              revisions.map((revision) => (
                <div key={revision.id} className="px-5 py-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Badge>{revision.field}</Badge>
                      <span className="text-xs text-ink-600">{formatDateTime(revision.created_at)}</span>
                    </div>
                    <span className="text-xs text-ink-600">{revision.revised_by || "unknown reviewer"}</span>
                  </div>
                  {revision.reason ? <p className="mt-1 text-xs text-ink-600">Reason: {revision.reason}</p> : null}
                  <div className="mt-2 grid gap-2 md:grid-cols-2">
                    <pre className="max-h-32 overflow-auto whitespace-pre-wrap rounded bg-rust-50 p-2 text-[11px] text-ink-700">
                      {revision.old_text}
                    </pre>
                    <pre className="max-h-32 overflow-auto whitespace-pre-wrap rounded bg-civic-50 p-2 text-[11px] text-ink-700">
                      {revision.new_text}
                    </pre>
                  </div>
                </div>
              ))
            ) : (
              <p className="px-5 py-8 text-sm text-ink-600">No text corrections recorded.</p>
            )}
          </div>
        </Card>
      ) : null}

      {tab === "Jobs" ? (
        <Card>
          <div className="border-b border-paper-200 px-5 py-4">
            <h2 className="font-serif text-lg font-semibold text-ink-900">Processing jobs</h2>
            <p className="text-xs text-ink-600">Job logs are internal diagnostics and are not shown publicly.</p>
          </div>
          <div className="divide-y divide-paper-200">
            {doc.jobs.length ? (
              doc.jobs.map((job) => (
                <div key={job.id} className="px-5 py-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone="blue">{job.job_type}</Badge>
                      <StatusBadge status={job.status} />
                      <span className="text-xs text-ink-600">
                        attempt {job.attempts}/{job.max_attempts} · {formatDateTime(job.created_at)}
                      </span>
                    </div>
                    {job.status === "failed" || job.status === "queued" ? (
                      <button
                        className="btn-secondary !py-1 text-xs"
                        disabled={busy !== null}
                        onClick={() => run("retry", () => api.admin.retryJob(job.id), "Job re-queued.")}
                      >
                        <RotateCcw className="h-3.5 w-3.5" /> Retry
                      </button>
                    ) : null}
                  </div>
                  <div className="mt-2 flex items-center justify-between text-[11px] text-ink-600">
                    <span>{job.stage || "Processing"}</span>
                    <span>{job.progress <= 1 ? Math.round(job.progress * 100) : job.progress}%</span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-paper-200">
                    <div
                      className="h-full rounded-full bg-civic-500 transition-all duration-300"
                      style={{ width: `${Math.min(100, Math.max(0, job.progress <= 1 ? Math.round(job.progress * 100) : job.progress))}%` }}
                    />
                  </div>
                  {job.error ? <p className="mt-2 rounded bg-rust-50 px-2 py-1.5 text-xs text-rust-700">{job.error}</p> : null}
                  {job.logs ? (
                    <details className="mt-2">
                      <summary className="cursor-pointer text-xs font-medium text-civic-700">View log</summary>
                      <pre className="mt-2 max-h-56 overflow-auto whitespace-pre-wrap rounded bg-ink-900 p-3 text-[11px] text-paper-50">
                        {job.logs}
                      </pre>
                    </details>
                  ) : null}
                </div>
              ))
            ) : (
              <p className="px-5 py-8 text-sm text-ink-600">No jobs recorded.</p>
            )}
          </div>
        </Card>
      ) : null}
    </div>
  );
}

function SignatoryEditor({
  signatory,
  busy,
  onSave,
}: {
  signatory: DocumentDetail["signatories"][number];
  busy: boolean;
  onSave: (payload: Record<string, unknown>) => void;
}) {
  const [name, setName] = useState(signatory.name || "");
  const [title, setTitle] = useState(signatory.title || "");
  const [role, setRole] = useState(signatory.role || "");
  const [verified, setVerified] = useState(signatory.verified);
  const [notes, setNotes] = useState(signatory.notes || "");

  return (
    <div className="rounded-lg border border-paper-300 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Badge>Page {signatory.page_number}</Badge>
          <Badge tone={verified ? "civic" : "gold"}>{verified ? "Verified" : "Unverified"}</Badge>
          <span className="text-[11px] text-ink-600">
            {signatory.method}
            {signatory.confidence != null ? ` · ${(signatory.confidence * 100).toFixed(0)}%` : ""}
          </span>
        </div>
        <button
          className="btn-secondary !py-1 text-xs"
          disabled={busy}
          onClick={() => onSave({ name: name || null, title: title || null, role: role || null, verified, notes: notes || null })}
        >
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
          Save
        </button>
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        <label className="block">
          <span className="label">Name</span>
          <input className="input" value={name} onChange={(event) => setName(event.target.value)} />
        </label>
        <label className="block">
          <span className="label">Title</span>
          <input className="input" value={title} onChange={(event) => setTitle(event.target.value)} />
        </label>
        <label className="block">
          <span className="label">Role</span>
          <input className="input" value={role} onChange={(event) => setRole(event.target.value)} />
        </label>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <label className="inline-flex items-center gap-2 text-xs text-ink-700">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-paper-300 text-civic-700"
            checked={verified}
            onChange={(event) => setVerified(event.target.checked)}
          />
          Verified against the signature block
        </label>
        <input
          className="input max-w-sm flex-1"
          placeholder="Notes"
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
        />
      </div>
    </div>
  );
}

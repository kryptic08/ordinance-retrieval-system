"use client";

import {
  AlertTriangle,
  ArrowLeft,
  BookOpen,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronUp,
  FileText,
  Landmark,
  Loader2,
  Lock,
  MapPin,
  ScrollText,
  Search,
  ShieldCheck,
  Sparkles,
  Wand2,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { HighlightedText } from "@/components/highlight";
import { StatusBadge } from "@/components/status-badge";
import { Alert, Badge, Button, Card, Input, Spinner } from "@/components/ui";
import { api } from "@/lib/api";
import { refineLegalText } from "@/lib/ocr-client-helper";
import type { DocumentDetail, SectionRecord } from "@/lib/types";

const TABS = ["Sections", "Overview", "Pages & OCR"] as const;
type Tab = (typeof TABS)[number];

function SectionItem({
  section,
  isCited,
  forceOpen,
  highlightTerms = [],
}: {
  section: SectionRecord;
  isCited?: boolean;
  forceOpen?: boolean;
  highlightTerms?: string[];
}) {
  const [open, setOpen] = useState<boolean>(Boolean(isCited || forceOpen));

  useEffect(() => {
    if (isCited || forceOpen !== undefined) {
      setOpen(Boolean(isCited || forceOpen));
    }
  }, [isCited, forceOpen]);

  const cleanedText = useMemo(
    () => refineLegalText(section.corrected_text || section.normalized_text),
    [section.corrected_text, section.normalized_text],
  );
  const cleanedHeading = useMemo(
    () => (section.heading ? refineLegalText(section.heading) : null),
    [section.heading],
  );

  return (
    <div
      id={`section-${section.id}`}
      className={`rounded-xl border transition ${
        isCited
          ? "border-civic-600/50 bg-civic-50/35 shadow-xs dark:border-[#238636]/40 dark:bg-[#238636]/15"
          : "border-paper-200 bg-white hover:border-paper-300 dark:border-[#262626] dark:bg-[#181818]"
      }`}
    >
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex w-full flex-wrap items-center justify-between gap-2 px-4 py-3.5 text-left"
      >
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-civic-700 dark:text-[#4ade80]">
              {section.section_number ? `Section ${section.section_number}` : section.section_type}
            </span>
            {isCited ? (
              <Badge tone="civic">
                <Sparkles className="h-2.5 w-2.5" aria-hidden /> Cited Section
              </Badge>
            ) : null}
          </div>
          {cleanedHeading ? (
            <p className="mt-0.5 text-sm font-semibold text-ink-900 dark:text-[#f3f3f3]">{cleanedHeading}</p>
          ) : null}
        </div>
        <div className="flex items-center gap-2 text-[11px] text-ink-600 dark:text-[#888888]">
          <Badge tone="neutral">
            p. {section.page_start}
            {section.page_end !== section.page_start ? `–${section.page_end}` : ""}
          </Badge>
          {section.verification_status === "verified" ? (
            <Badge tone="civic">Verified</Badge>
          ) : (
            <Badge tone="outline">Unverified</Badge>
          )}
          {open ? (
            <ChevronUp className="h-4 w-4 text-ink-400" aria-hidden />
          ) : (
            <ChevronDown className="h-4 w-4 text-ink-400" aria-hidden />
          )}
        </div>
      </button>

      {open ? (
        <div className="border-t border-paper-200/80 px-4 pb-4 pt-3 dark:border-[#262626]">
          <p className="legal-text whitespace-pre-line">
            <HighlightedText text={cleanedText} terms={highlightTerms} />
          </p>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-paper-100 pt-2.5 dark:border-[#262626]">
            <span className="text-[11px] text-ink-500 dark:text-[#888888]">
              {section.chunk_count} indexed retrieval chunk{section.chunk_count === 1 ? "" : "s"} · Source Page{" "}
              {section.page_start}
            </span>
            <Badge tone="emerald" className="!text-[10px]">
              <Wand2 className="h-2.5 w-2.5" aria-hidden /> Context &amp; Bilingual Spell Refined
            </Badge>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default function DocumentDetailPage() {
  const params = useParams<{ id: string }>();
  const rawId = params?.id;
  const id =
    rawId && rawId !== "index"
      ? rawId
      : typeof window !== "undefined"
        ? window.location.pathname.split("/").filter(Boolean).pop()
        : rawId;
  const [doc, setDoc] = useState<DocumentDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("Sections");
  const [citedPhrase, setCitedPhrase] = useState("");
  const [citedSectionId, setCitedSectionId] = useState("");
  const [sectionFilter, setSectionFilter] = useState("");
  const [expandAllSections, setExpandAllSections] = useState<boolean | undefined>(undefined);
  const [refiningOcr, setRefiningOcr] = useState(false);
  const [refineSuccess, setRefineSuccess] = useState(false);

  const fetchDocument = (docId: string) => {
    setLoading(true);
    api
      .document(docId)
      .then((result) => {
        setDoc(result);
        const search = new URLSearchParams(window.location.search);
        const highlightParam = search.get("highlight")?.trim() ?? "";
        const sectionParam = search.get("section")?.trim() ?? "";
        const tabParam = search.get("tab")?.trim() as Tab | null;

        setCitedPhrase(highlightParam);
        setCitedSectionId(sectionParam);

        if (tabParam && TABS.includes(tabParam)) {
          setTab(tabParam);
        } else {
          setTab("Sections");
        }
      })
      .catch(() => {
        setError("This document is unavailable or has not been approved for public retrieval.");
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    if (!id) return;
    fetchDocument(id);
  }, [id]);

  const handleRunOcrRefiner = async () => {
    if (!id || refiningOcr) return;
    setRefiningOcr(true);
    try {
      await api.repairOcr();
      const updated = await api.document(id);
      setDoc(updated);
      setRefineSuccess(true);
      window.setTimeout(() => setRefineSuccess(false), 3000);
    } catch {
      // client-side refineLegalText is already active
    } finally {
      setRefiningOcr(false);
    }
  };

  const citedSection = useMemo(() => {
    if (!doc) return undefined;
    if (citedSectionId) {
      const byId = doc.sections.find((s) => s.id === citedSectionId);
      if (byId) return byId;
    }
    if (citedPhrase) {
      const needle = citedPhrase.toLowerCase();
      const byPhrase = doc.sections.find((section) => {
        const text = `${section.corrected_text ?? ""}\n${section.normalized_text}`.toLowerCase();
        return text.includes(needle) || (needle.length > 24 && text.includes(needle.slice(0, 48)));
      });
      if (byPhrase) return byPhrase;
    }
    return undefined;
  }, [doc, citedSectionId, citedPhrase]);

  useEffect(() => {
    if (!citedSection || tab !== "Sections") return;
    const timer = window.setTimeout(() => {
      document.getElementById(`section-${citedSection.id}`)?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }, 120);
    return () => window.clearTimeout(timer);
  }, [citedSection, tab]);

  if (loading) {
    return (
      <div className="container-page flex min-h-[50vh] items-center justify-center py-16">
        <Spinner label="Loading parsed ordinance sections…" />
      </div>
    );
  }

  if (error || !doc) {
    return (
      <div className="container-page py-16">
        <Alert>{error || "Document not found."}</Alert>
        <Link href="/documents" className="btn-secondary mt-4">
          <ArrowLeft className="h-4 w-4" /> Back to repository
        </Link>
      </div>
    );
  }

  const warningPages = doc.pages.filter((page) => page.warnings.length > 0 || page.is_scanned);
  const avgConfidence = (() => {
    const values = doc.pages.map((page) => page.ocr_confidence).filter((value): value is number => value != null);
    return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
  })();

  const filteredSections = sectionFilter.trim()
    ? doc.sections.filter((sec) => {
        const q = sectionFilter.trim().toLowerCase();
        const hay = `${sec.section_number ?? ""} ${sec.heading ?? ""} ${sec.corrected_text ?? sec.normalized_text}`.toLowerCase();
        return hay.includes(q);
      })
    : doc.sections;

  const highlightTerms = [
    ...(citedPhrase ? [citedPhrase] : []),
    ...(sectionFilter.trim().length > 1 ? [sectionFilter.trim()] : []),
  ];

  return (
    <div className="container-page max-w-5xl py-8">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-civic-700 hover:underline dark:text-[#4ade80]"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden /> Back to Legal Assistant &amp; Search
        </Link>
        <Link
          href="/documents"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-600 hover:text-civic-700 dark:text-[#888888] dark:hover:text-[#4ade80]"
        >
          Browse All Ordinances
        </Link>
      </div>

      <header className="mt-4 border-b border-paper-300 pb-6 dark:border-[#262626]">
        <div className="flex flex-wrap items-center gap-2">
          {doc.ordinance_number ? (
            <Badge tone="civic">Ordinance No. {doc.ordinance_number}</Badge>
          ) : (
            <Badge>Number unknown</Badge>
          )}
          <Badge>{doc.document_type}</Badge>
          {doc.year ? <Badge>{doc.year}</Badge> : null}
          <StatusBadge status={doc.status} />
          {doc.is_active ? <Badge tone="civic">Active for retrieval</Badge> : <Badge tone="gold">Not active</Badge>}
        </div>
        <h1 className="mt-3 max-w-4xl font-serif text-3xl font-semibold leading-tight text-ink-900 dark:text-[#f3f3f3] sm:text-4xl">
          {refineLegalText(doc.title)}
        </h1>
        <div className="mt-4 grid gap-3 text-sm text-ink-600 dark:text-[#d4d4d4] sm:grid-cols-2 lg:grid-cols-4">
          <span className="inline-flex items-center gap-2">
            <Landmark className="h-4 w-4 text-civic-700 dark:text-[#4ade80]" aria-hidden />
            {doc.lgu || doc.jurisdiction || "Issuing LGU not stated"}
          </span>
          <span className="inline-flex items-center gap-2">
            <MapPin className="h-4 w-4 text-civic-700 dark:text-[#4ade80]" aria-hidden />
            {doc.jurisdiction || "Jurisdiction not stated"}
          </span>
          <span className="inline-flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-civic-700 dark:text-[#4ade80]" aria-hidden />
            {doc.date_enacted ? `Enacted ${doc.date_enacted}` : doc.year ? `Year ${doc.year}` : "Date not stated"}
          </span>
          <span className="inline-flex items-center gap-2">
            <FileText className="h-4 w-4 text-civic-700 dark:text-[#4ade80]" aria-hidden />
            {doc.page_count} pages · {doc.section_count} parsed sections
          </span>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {doc.ordinance_number ? (
              <Link href={`/?q=${encodeURIComponent(doc.ordinance_number)}`} className="btn-secondary !py-2">
                <ScrollText className="h-4 w-4" aria-hidden /> Query this Ordinance in Assistant
              </Link>
            ) : null}
            <Button
              variant="outline"
              onClick={() => void handleRunOcrRefiner()}
              disabled={refiningOcr}
            >
              {refiningOcr ? (
                <Loader2 className="h-4 w-4 animate-spin text-civic-700 dark:text-[#4ade80]" aria-hidden />
              ) : refineSuccess ? (
                <Check className="h-4 w-4 text-emerald-600 dark:text-[#4ade80]" aria-hidden />
              ) : (
                <Wand2 className="h-4 w-4 text-civic-700 dark:text-[#4ade80]" aria-hidden />
              )}
              {refineSuccess
                ? "OCR Spelling & Context Refined"
                : "Run Smart OCR & Filipino/English Spell Refiner"}
            </Button>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-civic-600/20 bg-civic-50/60 px-3 py-1.5 text-xs font-medium text-civic-800 dark:border-[#238636]/30 dark:bg-[#238636]/15 dark:text-[#4ade80]">
            <Lock className="h-3.5 w-3.5 text-civic-700 dark:text-[#4ade80]" aria-hidden />
            Original PDF &amp; physical signatures withheld for Data Privacy compliance
          </span>
        </div>
      </header>

      {/* Cited Passage Highlight Banner */}
      {citedPhrase || citedSection ? (
        <Card className="mt-6 border-civic-500/40 bg-civic-50/55 p-5 shadow-xs dark:border-[#238636]/40 dark:bg-[#238636]/15">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Badge tone="civic">
                <Sparkles className="h-3 w-3" aria-hidden /> Cited Provision
              </Badge>
              {citedSection ? (
                <span className="text-xs font-semibold text-civic-900 dark:text-[#4ade80]">
                  Section {citedSection.section_number ?? citedSection.section_type}
                  {citedSection.heading ? ` — ${refineLegalText(citedSection.heading)}` : ""} (Page{" "}
                  {citedSection.page_start})
                </span>
              ) : null}
            </div>
          </div>
          <p className="legal-text mt-3 whitespace-pre-line rounded-lg border border-civic-600/20 bg-white p-4 dark:border-[#262626] dark:bg-[#181818]">
            <HighlightedText
              text={refineLegalText(
                citedSection ? citedSection.corrected_text || citedSection.normalized_text : citedPhrase,
              )}
              terms={citedPhrase ? [refineLegalText(citedPhrase)] : []}
            />
          </p>
        </Card>
      ) : null}

      <div className="mt-8">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap gap-1 rounded-xl border border-paper-300 bg-white p-1 dark:border-[#262626] dark:bg-[#181818]">
            {TABS.map((item) => (
              <button
                key={item}
                onClick={() => setTab(item)}
                className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition ${
                  tab === item
                    ? "bg-civic-700 text-white dark:bg-[#238636]"
                    : "text-ink-700 hover:bg-paper-100 dark:text-[#d4d4d4] dark:hover:bg-[#202020]"
                }`}
              >
                {item}
                {item === "Sections" ? ` (${doc.sections.length})` : ""}
                {item === "Pages & OCR" ? ` (${doc.pages.length})` : ""}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 space-y-4">
          {tab === "Sections" ? (
            <Card className="p-5">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-paper-200 pb-4 dark:border-[#262626]">
                <div>
                  <h2 className="flex items-center gap-2 font-serif text-xl font-semibold text-ink-900 dark:text-[#f3f3f3]">
                    <BookOpen className="h-5 w-5 text-civic-700 dark:text-[#4ade80]" aria-hidden />
                    Parsed Legal Sections
                  </h2>
                  <p className="mt-0.5 text-xs text-ink-600 dark:text-[#888888]">
                    OCR-normalized and spell-repaired statutory provisions (English &amp; Filipino). Click any section
                    to expand or collapse.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" onClick={() => setExpandAllSections(true)}>
                    Expand All
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setExpandAllSections(false)}>
                    Collapse All
                  </Button>
                </div>
              </div>

              {/* Quick Filter Input for Sections */}
              <div className="relative mt-4">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400"
                  aria-hidden
                />
                <Input
                  type="search"
                  value={sectionFilter}
                  onChange={(e) => {
                    setSectionFilter(e.target.value);
                    if (e.target.value.trim()) setExpandAllSections(true);
                  }}
                  placeholder="Filter sections by number, heading, or legal keyword (English or Filipino)…"
                  className="pl-9 text-sm"
                />
              </div>

              <div className="mt-4 space-y-3">
                {filteredSections.length ? (
                  filteredSections.map((section, idx) => (
                    <SectionItem
                      key={section.id}
                      section={section}
                      isCited={citedSection?.id === section.id}
                      forceOpen={
                        expandAllSections !== undefined
                          ? expandAllSections
                          : citedSection
                            ? citedSection.id === section.id
                            : idx < 3
                      }
                      highlightTerms={highlightTerms}
                    />
                  ))
                ) : (
                  <p className="py-6 text-center text-sm text-ink-600 dark:text-slate-400">
                    No sections matched &ldquo;{sectionFilter}&rdquo;.
                  </p>
                )}
              </div>
            </Card>
          ) : null}

          {tab === "Overview" ? (
            <>
              <Card className="p-5">
                <h2 className="font-serif text-xl font-semibold text-ink-900 dark:text-[#f3f3f3]">Document record</h2>
                <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                  {[
                    ["Ordinance number", doc.ordinance_number || "Not extracted"],
                    ["Document type", doc.document_type],
                    ["Year", doc.year ? String(doc.year) : "Not stated"],
                    ["Date enacted", doc.date_enacted || "Not stated"],
                    ["LGU", doc.lgu || "Not stated"],
                    ["Jurisdiction", doc.jurisdiction || "Not stated"],
                    ["Category", doc.category || "Uncategorized"],
                    ["Subject", doc.subject || "Not stated"],
                    ["Publication status", doc.publication_status || "Not stated"],
                    ["Embedding model", doc.embedding_model || "Not embedded"],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <dt className="text-[11px] font-semibold uppercase tracking-wide text-ink-600 dark:text-[#888888]">
                        {label}
                      </dt>
                      <dd className="mt-0.5 text-ink-800 dark:text-[#d4d4d4]">{value}</dd>
                    </div>
                  ))}
                </dl>
                {doc.notes ? (
                  <p className="mt-4 border-t border-paper-200 pt-3 text-sm text-ink-700 dark:border-[#262626] dark:text-[#d4d4d4]">
                    {doc.notes}
                  </p>
                ) : null}
              </Card>

              <Card className="p-5">
                <h2 className="font-serif text-xl font-semibold text-ink-900 dark:text-[#f3f3f3]">
                  OCR extraction &amp; privacy compliance
                </h2>
                <div className="mt-3 space-y-2 text-sm text-ink-700 dark:text-[#d4d4d4]">
                  <p>
                    {doc.pages.filter((page) => page.is_scanned).length} page(s) required OCR;{" "}
                    {doc.pages.filter((page) => page.has_text).length} page(s) contained a digital text layer.
                  </p>
                  {avgConfidence != null ? (
                    <p>Average available OCR confidence: {(avgConfidence * 100).toFixed(1)}%.</p>
                  ) : (
                    <p>No OCR confidence scores are recorded for this document.</p>
                  )}
                  <p>
                    {doc.sections.filter((section) => section.verification_status === "verified").length} of{" "}
                    {doc.sections.length} extracted sections are marked verified.
                  </p>
                  <p className="flex items-start gap-2 rounded-lg bg-paper-50 p-3 text-xs dark:bg-[#181818]">
                    <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-civic-700 dark:text-[#4ade80]" aria-hidden />
                    To protect personal privacy and physical signatures on signed municipal records, original PDF scans
                    and signature blocks are withheld from public display. Only normalized statutory text is served.
                  </p>
                </div>
              </Card>

              {warningPages.length > 0 ? (
                <Card className="border-gold-500/40 p-5">
                  <h2 className="flex items-center gap-2 font-serif text-lg font-semibold text-gold-700 dark:text-amber-400">
                    <AlertTriangle className="h-4 w-4" aria-hidden /> Pages with extraction warnings
                  </h2>
                  <ul className="mt-3 space-y-2 text-sm text-ink-700 dark:text-[#d4d4d4]">
                    {warningPages.slice(0, 8).map((page) => (
                      <li key={page.id} className="flex flex-wrap items-center gap-2">
                        <span className="font-medium text-civic-700 dark:text-[#4ade80]">
                          Page {page.page_number}
                        </span>
                        <span className="text-xs text-ink-600 dark:text-[#888888]">
                          {page.warnings.length ? page.warnings.join("; ") : "scanned page, OCR used"}
                        </span>
                      </li>
                    ))}
                  </ul>
                </Card>
              ) : null}

              {doc.relationships.length > 0 ? (
                <Card className="p-5">
                  <h2 className="font-serif text-xl font-semibold text-ink-900 dark:text-[#f3f3f3]">
                    Related documents
                  </h2>
                  <ul className="mt-3 space-y-2 text-sm">
                    {doc.relationships.map((relationship) => (
                      <li key={relationship.id} className="flex flex-wrap items-center gap-2">
                        <Badge tone="blue">{relationship.relationship_type.replaceAll("_", " ")}</Badge>
                        <Link className="link" href={`/documents/${relationship.to_document_id}`}>
                          Open related document
                        </Link>
                        {relationship.notes ? (
                          <span className="text-xs text-ink-600 dark:text-[#888888]">{relationship.notes}</span>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </Card>
              ) : null}
            </>
          ) : null}

          {tab === "Pages & OCR" ? (
            <Card className="p-5">
              <h2 className="font-serif text-xl font-semibold text-ink-900 dark:text-[#f3f3f3]">
                Page-level OCR text
              </h2>
              <div className="mt-3 divide-y divide-paper-200 dark:divide-[#262626]">
                {doc.pages.map((page) => (
                  <div key={page.id} className="py-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-sm font-semibold text-ink-900 dark:text-[#f3f3f3]">
                        Page {page.page_number}
                      </span>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Badge>{page.text_source}</Badge>
                        <Badge>{page.page_type}</Badge>
                        {page.is_scanned ? (
                          <Badge tone="gold">Scanned</Badge>
                        ) : (
                          <Badge tone="civic">Digital text</Badge>
                        )}
                        {page.ocr_confidence != null ? (
                          <Badge tone={page.ocr_confidence < 0.7 ? "rust" : "neutral"}>
                            OCR {(page.ocr_confidence * 100).toFixed(0)}%
                          </Badge>
                        ) : null}
                      </div>
                    </div>
                    {page.warnings.length ? (
                      <p className="mt-1 text-xs text-rust-700 dark:text-red-400">{page.warnings.join("; ")}</p>
                    ) : null}
                    <details className="mt-2" open={page.page_number === 1}>
                      <summary className="cursor-pointer text-xs font-medium text-civic-700 dark:text-[#4ade80]">
                        Read cleaned page text
                      </summary>
                      <p className="legal-text mt-2 max-h-80 overflow-auto whitespace-pre-line rounded-lg border border-paper-200 bg-paper-50 p-3.5 text-sm dark:border-[#262626] dark:bg-[#141414]">
                        {refineLegalText(page.corrected_text || page.normalized_text || "No text extracted.")}
                      </p>
                    </details>
                  </div>
                ))}
              </div>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}

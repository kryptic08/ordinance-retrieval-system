"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  BookOpen,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronUp,
  Clock,
  Copy,
  Eye,
  FileText,
  Landmark,
  Layers,
  Scale,
  ShieldCheck,
  Sparkles,
  Wand2,
  X,
} from "lucide-react";
import { HighlightedText } from "@/components/highlight";
import { Badge, Button, Card } from "@/components/ui";
import { api, formatScore } from "@/lib/api";
import type { ChatMessage } from "@/lib/chat-types";
import { refineLegalText } from "@/lib/ocr-client-helper";
import type { AnswerClaim, DocumentDetail, SearchResult, SectionRecord } from "@/lib/types";

type ChatMessageListProps = {
  messages: ChatMessage[];
  isGenerating: boolean;
  onRegenerate: () => void;
};

type InspectedCitation = {
  result: SearchResult;
  claim?: AnswerClaim;
  citationIndex?: number;
  highlightTerms: string[];
};

function formatConfigLabel(config?: string): string {
  switch (config) {
    case "hybrid_rerank":
      return "Hybrid + Rerank";
    case "hybrid":
      return "Hybrid (Vector + BM25)";
    case "vector":
      return "Dense Vector";
    case "keyword":
      return "Lexical BM25";
    default:
      return "Hybrid Grounded";
  }
}

/**
 * Separates an optional `[Ordinance ... | Section ...]` context prefix from the statutory body text
 * and runs the bilingual (English + Filipino) OCR & context refiner.
 */
function parseLegalDisplayText(raw: string): { contextHeader: string | null; body: string } {
  const trimmed = refineLegalText((raw || "").trim());
  if (trimmed.startsWith("[")) {
    const splitIdx = trimmed.indexOf("]\n\n");
    if (splitIdx !== -1 && splitIdx < 320) {
      return {
        contextHeader: trimmed.slice(1, splitIdx).trim(),
        body: trimmed.slice(splitIdx + 3).trim(),
      };
    }
  }
  return { contextHeader: null, body: trimmed };
}

export function ChatMessageList({ messages, isGenerating, onRegenerate }: ChatMessageListProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedChunks, setExpandedChunks] = useState<Record<string, boolean>>({});
  const [inspected, setInspected] = useState<InspectedCitation | null>(null);
  const [docDetailCache, setDocDetailCache] = useState<Record<string, DocumentDetail>>({});
  const [loadingDocId, setLoadingDocId] = useState<string | null>(null);
  const [drawerTab, setDrawerTab] = useState<"cited" | "all_sections">("cited");

  const lastAssistantId = [...messages].reverse().find((message) => message.role === "assistant")?.id;

  useEffect(() => {
    if (!inspected) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setInspected(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [inspected]);

  useEffect(() => {
    if (!inspected) return;
    const docId = inspected.result.document.id;
    if (docDetailCache[docId]) return;
    let cancelled = false;
    setLoadingDocId(docId);
    api
      .document(docId)
      .then((detail) => {
        if (!cancelled) {
          setDocDetailCache((prev) => ({ ...prev, [docId]: detail }));
        }
      })
      .catch(() => {
        // Ignore background prefetch errors; primary SearchResult text is already available in memory
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingDocId((current) => (current === docId ? null : current));
        }
      });
    return () => {
      cancelled = true;
    };
  }, [inspected, docDetailCache]);

  const copyMessage = async (message: ChatMessage) => {
    try {
      await navigator.clipboard.writeText(refineLegalText(message.content));
      setCopiedId(message.id);
      window.setTimeout(() => setCopiedId((current) => (current === message.id ? null : current)), 1600);
    } catch {
      // ignore clipboard permission errors
    }
  };

  const toggleChunkExpand = (chunkId: string) => {
    setExpandedChunks((prev) => ({ ...prev, [chunkId]: !prev[chunkId] }));
  };

  const openClaimInspector = (message: ChatMessage, claim: AnswerClaim, index: number) => {
    const results = message.results ?? [];
    const matchedResult =
      results.find((r) => claim.chunk_id && r.chunk_id === claim.chunk_id) ||
      results.find((r) => claim.document_id && r.document.id === claim.document_id) ||
      results[index] ||
      results[0];

    if (matchedResult) {
      const terms = Array.from(
        new Set([
          ...(matchedResult.matched_terms ?? []),
          ...(claim.claim ? [refineLegalText(claim.claim).slice(0, 90).trim()] : []),
        ]),
      );
      setDrawerTab("cited");
      setInspected({
        result: matchedResult,
        claim,
        citationIndex: index + 1,
        highlightTerms: terms,
      });
    }
  };

  const openProvisionInspector = (item: SearchResult, rank: number) => {
    setDrawerTab("cited");
    setInspected({
      result: item,
      citationIndex: rank,
      highlightTerms: item.matched_terms ?? [],
    });
  };

  /**
   * Renders message text with interactive `[1]`, `[2]` citation badges when claims exist.
   */
  const renderInteractiveAnswerText = (message: ChatMessage) => {
    const cleanContent = refineLegalText(message.content);
    const claims = message.answer?.claims ?? [];
    if (!claims.length) {
      return <p className="text-[15px] leading-relaxed text-ink-900 dark:text-slate-100">{cleanContent}</p>;
    }

    const parts = cleanContent.split(/(\[\d+\])/g);
    return (
      <p className="text-[15px] leading-relaxed text-ink-900 dark:text-[#f0f6fc]">
        {parts.map((part, idx) => {
          const match = /^\[(\d+)\]$/.exec(part);
          if (match) {
            const citationNum = Number(match[1]);
            const claim = claims[citationNum - 1];
            if (claim) {
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => openClaimInspector(message, claim, citationNum - 1)}
                  title={`Click to inspect parsed section: ${claim.citations[0] || `Citation ${citationNum}`}`}
                  className="mx-0.5 inline-flex items-center gap-0.5 rounded-md border border-civic-600/30 bg-civic-50 px-1.5 py-0.5 align-baseline text-xs font-bold text-civic-800 shadow-2xs transition hover:border-civic-600 hover:bg-civic-700 hover:text-white dark:border-[#2ea043]/30 dark:bg-[#238636]/15 dark:text-[#7ee787] dark:hover:bg-[#238636] dark:hover:text-white"
                >
                  [{citationNum}]
                </button>
              );
            }
          }
          return <span key={idx}>{part}</span>;
        })}
      </p>
    );
  };

  const inspectedDocDetail = inspected ? docDetailCache[inspected.result.document.id] : null;
  const inspectedParsed = inspected ? parseLegalDisplayText(inspected.result.text || inspected.result.excerpt) : null;

  return (
    <>
      <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-6 pb-36 sm:pb-40">
        {messages.map((message) => (
          <div
            key={message.id}
            id={`chat-msg-${message.id}`}
            className={`chat-message-in scroll-mt-32 flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
          >
            {message.role === "user" ? (
              <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-civic-700 px-4 py-3 text-white shadow-sm dark:bg-[#1d5c32] dark:border dark:border-[#238636]/40">
                <p className="text-sm font-medium leading-relaxed sm:text-[15px]">{message.content}</p>
              </div>
            ) : message.status === "generating" ? (
              <Card className="w-full p-5">
                <div className="flex items-center gap-2.5 text-xs font-semibold text-civic-700 dark:text-[#4ade80]">
                  <span className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-civic-700 chat-typing-dot dark:bg-[#4ade80]" aria-hidden />
                    <span
                      className="h-2 w-2 rounded-full bg-civic-700/70 chat-typing-dot dark:bg-[#4ade80]/70"
                      style={{ animationDelay: "0.15s" }}
                      aria-hidden
                    />
                    <span
                      className="h-2 w-2 rounded-full bg-civic-700/45 chat-typing-dot dark:bg-[#4ade80]/45"
                      style={{ animationDelay: "0.3s" }}
                      aria-hidden
                    />
                  </span>
                  <span>Searching vector index &amp; refining ordinance citations…</span>
                </div>
              </Card>
            ) : (
              <Card className="w-full p-5 sm:p-6">
                {/* Top Metadata Header */}
                <div className="mb-3.5 flex flex-wrap items-center justify-between gap-2 border-b border-ink-100 pb-3 dark:border-[#262626]">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone="civic">
                      <Scale className="h-3 w-3" aria-hidden />
                      Source-Grounded Synthesis
                    </Badge>
                    <Badge tone="neutral">{formatConfigLabel(message.configuration)}</Badge>
                    <Badge tone="emerald">
                      <Wand2 className="h-3 w-3" aria-hidden />
                      OCR &amp; Context Refined
                    </Badge>
                  </div>
                  {message.tookMs !== undefined ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-ink-400 dark:text-[#888888]">
                      <Clock className="h-3 w-3" aria-hidden />
                      {message.tookMs} ms
                    </span>
                  ) : null}
                </div>

                {/* Synthesized Grounded Answer with Interactive Citation Badges */}
                {renderInteractiveAnswerText(message)}

                {/* Cited Claims Interactive Bar */}
                {message.answer?.claims && message.answer.claims.length > 0 ? (
                  <div className="mt-4 rounded-xl border border-civic-500/20 bg-civic-50/40 p-3.5 dark:border-[#238636]/20 dark:bg-[#238636]/10">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-civic-800 dark:text-[#4ade80]">
                        Verified Legal Citations — Click to Instantly Inspect Parsed Section
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {message.answer.claims.map((claim, index) => {
                        const hasLocalResult = Boolean(
                          message.results && message.results.length > 0,
                        );
                        const docHref = claim.document_id
                          ? `/documents/${claim.document_id}?tab=Sections&page=${claim.page_start ?? 1}&highlight=${encodeURIComponent(refineLegalText(claim.claim).slice(0, 120))}`
                          : claim.citation_url || "#";

                        return hasLocalResult ? (
                          <button
                            key={`${claim.chunk_id ?? "claim"}-${index}`}
                            type="button"
                            onClick={() => openClaimInspector(message, claim, index)}
                            className="group inline-flex items-center gap-2 rounded-lg border border-civic-600/25 bg-white px-3 py-1.5 text-left text-xs font-medium text-civic-900 shadow-2xs transition hover:border-civic-600 hover:bg-civic-700 hover:text-white dark:border-[#262626] dark:bg-[#181818] dark:text-[#d4d4d4] dark:hover:border-[#238636]/40 dark:hover:bg-[#202020]"
                          >
                            <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-civic-700 text-[10px] font-bold text-white group-hover:bg-white group-hover:text-civic-800 dark:bg-[#238636]">
                              {index + 1}
                            </span>
                            <span className="max-w-[240px] truncate sm:max-w-[340px]">
                              {claim.citations[0] || `Source ${index + 1}`}
                            </span>
                            <Eye className="h-3.5 w-3.5 shrink-0 text-civic-700 group-hover:text-white dark:text-[#4ade80]" aria-hidden />
                          </button>
                        ) : (
                          <Link
                            key={`${claim.chunk_id ?? "claim"}-${index}`}
                            href={docHref}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-civic-600/25 bg-white px-2.5 py-1 text-xs font-medium text-civic-900 shadow-2xs transition hover:border-civic-600 hover:bg-civic-50 dark:border-[#262626] dark:bg-[#181818] dark:text-[#d4d4d4]"
                          >
                            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-civic-700 text-[10px] font-bold text-white dark:bg-[#238636]">
                              {index + 1}
                            </span>
                            <span className="max-w-[260px] truncate sm:max-w-[360px]">
                              {claim.citations[0] || `Source ${index + 1}`}
                            </span>
                            <ArrowUpRight className="h-3 w-3 text-civic-700 dark:text-[#4ade80]" aria-hidden />
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                ) : null}

                {/* Top Retrieved Ordinance Sections */}
                {message.results && message.results.length > 0 ? (
                  <div className="mt-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-ink-600 dark:text-[#d4d4d4]">
                        <BookOpen className="h-3.5 w-3.5 text-civic-700 dark:text-[#4ade80]" aria-hidden />
                        Retrieved Ordinance Provisions ({message.results.length})
                      </span>
                      <span className="text-[11px] text-ink-400 dark:text-[#888888]">
                        Click any provision to inspect full parsed section
                      </span>
                    </div>
                    <div className="space-y-3">
                      {message.results.slice(0, 5).map((item, idx) => {
                        const docLabel = item.document.ordinance_number
                          ? `${item.document.document_type} No. ${item.document.ordinance_number}`
                          : item.document.document_type;
                        const cleanHeading = item.heading ? refineLegalText(item.heading) : null;
                        const sectionLabel = item.section_number
                          ? `Section ${item.section_number}${cleanHeading ? ` — ${cleanHeading}` : ""}`
                          : cleanHeading || "Provision Excerpt";
                        const isExpanded = Boolean(expandedChunks[item.chunk_id]);
                        const parsed = parseLegalDisplayText(item.text || item.excerpt);
                        const cleanExcerpt = refineLegalText(item.excerpt);
                        const fullTextAvailable = parsed.body.length > cleanExcerpt.length + 25;
                        const documentHref = `/documents/${item.document.id}?tab=Sections&section=${encodeURIComponent(item.section_id)}&page=${item.page_start}&highlight=${encodeURIComponent(cleanExcerpt.slice(0, 100))}`;

                        return (
                          <div
                            key={item.chunk_id}
                            className="rounded-xl border border-ink-200/90 bg-ink-50/35 p-4 transition hover:border-civic-500/45 hover:bg-white hover:shadow-xs dark:border-[#262626] dark:bg-[#181818] dark:hover:border-[#238636]/40 dark:hover:bg-[#202020]"
                          >
                            <div className="flex flex-wrap items-start justify-between gap-2.5">
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-1.5">
                                  <span className="rounded bg-civic-700 px-1.5 py-0.5 text-[10px] font-bold text-white dark:bg-[#238636]">
                                    #{idx + 1}
                                  </span>
                                  <span className="text-xs font-bold text-civic-800 dark:text-[#4ade80]">
                                    {docLabel}
                                  </span>
                                  {item.document.year ? (
                                    <span className="text-xs font-medium text-ink-500 dark:text-[#888888]">
                                      ({item.document.year})
                                    </span>
                                  ) : null}
                                  {item.document.jurisdiction || item.document.lgu ? (
                                    <>
                                      <span className="text-ink-300 dark:text-[#404040]">·</span>
                                      <span className="text-xs text-ink-500 dark:text-[#888888]">
                                        {item.document.jurisdiction || item.document.lgu}
                                      </span>
                                    </>
                                  ) : null}
                                  <span className="text-ink-300 dark:text-[#404040]">·</span>
                                  <span className="rounded bg-ink-100 px-1.5 py-0.5 text-[11px] font-semibold text-ink-700 dark:bg-[#222222] dark:text-[#d4d4d4]">
                                    p. {item.page_start}
                                    {item.page_end && item.page_end !== item.page_start ? `–${item.page_end}` : ""}
                                  </span>
                                  {item.verification_status === "verified" ? (
                                    <Badge tone="civic" className="!py-0 !text-[10px]">
                                      <ShieldCheck className="h-3 w-3" aria-hidden /> Verified
                                    </Badge>
                                  ) : null}
                                </div>

                                <button
                                  type="button"
                                  onClick={() => openProvisionInspector(item, idx + 1)}
                                  className="mt-1.5 block text-left text-sm font-semibold text-ink-900 transition hover:text-civic-700 dark:text-[#f3f3f3] dark:hover:text-[#4ade80]"
                                >
                                  {refineLegalText(item.document.title)}
                                </button>
                                <p className="mt-0.5 text-xs font-semibold text-civic-800 dark:text-[#4ade80]">
                                  {sectionLabel}
                                </p>
                              </div>

                              {/* Score & Action Column */}
                              <div className="flex flex-col items-end gap-1.5">
                                <Badge
                                  tone="civic"
                                  className="cursor-help"
                                >
                                  Match {formatScore(item.retrieval_score)}
                                </Badge>
                                <div className="flex items-center gap-2 text-[10px] text-ink-500 dark:text-[#888888]">
                                  <span>Vec {formatScore(item.vector_score)}</span>
                                  <span>·</span>
                                  <span>BM25 {formatScore(item.keyword_score)}</span>
                                </div>
                              </div>
                            </div>

                            {/* Parsed Section Excerpt or Full Text */}
                            <div className="mt-2.5 rounded-lg border border-ink-200/60 bg-white/90 p-3 dark:border-[#262626] dark:bg-[#141414]">
                              {isExpanded && parsed.contextHeader ? (
                                <p className="mb-1.5 text-[11px] font-medium text-ink-500 dark:text-[#888888]">
                                  {parsed.contextHeader}
                                </p>
                              ) : null}
                              <p className="whitespace-pre-line font-serif text-[13.5px] leading-relaxed text-ink-800 dark:text-[#d4d4d4]">
                                <HighlightedText
                                  text={isExpanded ? parsed.body : cleanExcerpt}
                                  terms={item.matched_terms}
                                />
                              </p>
                            </div>

                            {/* Provision Action Bar */}
                            <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 pt-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <Button
                                  size="sm"
                                  variant="default"
                                  onClick={() => openProvisionInspector(item, idx + 1)}
                                >
                                  <Eye className="h-3.5 w-3.5" aria-hidden />
                                  Inspect Parsed Section
                                </Button>
                                {fullTextAvailable ? (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => toggleChunkExpand(item.chunk_id)}
                                  >
                                    {isExpanded ? (
                                      <>
                                        <ChevronUp className="h-3.5 w-3.5" aria-hidden />
                                        Show Excerpt Only
                                      </>
                                    ) : (
                                      <>
                                        <ChevronDown className="h-3.5 w-3.5" aria-hidden />
                                        Expand Full Text Inline
                                      </>
                                    )}
                                  </Button>
                                ) : null}
                              </div>

                              <Link
                                href={documentHref}
                                className="inline-flex items-center gap-1 text-xs font-semibold text-civic-700 hover:text-civic-800 hover:underline dark:text-[#4ade80] dark:hover:text-[#86efac]"
                              >
                                <FileText className="h-3.5 w-3.5" aria-hidden />
                                Open Full Ordinance
                                <ArrowUpRight className="h-3 w-3" aria-hidden />
                              </Link>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : null}

                {/* Footer Actions & Legal Disclaimer */}
                <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-ink-100 pt-3 dark:border-[#262626]">
                  <span className="text-[11px] text-ink-400 dark:text-[#888888]">
                    Extractive citation summary · Verify official ordinance status before legal reliance.
                  </span>
                  {!isGenerating && lastAssistantId === message.id ? (
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="outline" onClick={() => copyMessage(message)}>
                        {copiedId === message.id ? (
                          <Check className="h-3.5 w-3.5 text-civic-700 dark:text-[#4ade80]" aria-hidden />
                        ) : (
                          <Copy className="h-3.5 w-3.5" aria-hidden />
                        )}
                        {copiedId === message.id ? "Copied" : "Copy"}
                      </Button>
                      <Button size="sm" variant="outline" onClick={onRegenerate}>
                        <RefreshCwIcon />
                        Regenerate
                      </Button>
                    </div>
                  ) : null}
                </div>
              </Card>
            )}
          </div>
        ))}
      </div>

      {/* Instant Parsed Section & Citation Inspector Slide-Over Sheet */}
      {inspected ? (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-ink-950/55 backdrop-blur-xs transition-opacity"
          onClick={() => setInspected(null)}
          role="dialog"
          aria-modal="true"
          aria-label="Parsed Section Inspector"
        >
          <div
            className="flex h-full w-full max-w-2xl flex-col border-l border-ink-200 bg-white shadow-2xl dark:border-[#262626] dark:bg-[#181818]"
            onClick={(event) => event.stopPropagation()}
          >
            {/* Sheet Header */}
            <div className="flex items-start justify-between gap-4 border-b border-ink-200 bg-ink-50/60 px-6 py-4 dark:border-[#262626] dark:bg-[#141414]">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  {inspected.citationIndex ? (
                    <Badge tone="civic">Citation [{inspected.citationIndex}]</Badge>
                  ) : null}
                  <Badge tone="neutral">
                    {inspected.result.document.ordinance_number
                      ? `${inspected.result.document.document_type} No. ${inspected.result.document.ordinance_number}`
                      : inspected.result.document.document_type}
                  </Badge>
                  {inspected.result.document.year ? (
                    <Badge tone="outline">Series of {inspected.result.document.year}</Badge>
                  ) : null}
                  <Badge tone="emerald">
                    <Wand2 className="h-3 w-3" aria-hidden /> Context &amp; Spell Refined
                  </Badge>
                </div>
                <h2 className="mt-2 font-serif text-lg font-semibold leading-snug text-ink-900 dark:text-[#f3f3f3] sm:text-xl">
                  {refineLegalText(inspected.result.document.title)}
                </h2>
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setInspected(null)}
                aria-label="Close inspector"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Metadata & Retrieval Telemetry Strip */}
            <div className="border-b border-ink-200 bg-white px-6 py-3 dark:border-[#262626] dark:bg-[#181818]">
              <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-ink-600 dark:text-[#d4d4d4]">
                <div className="flex flex-wrap items-center gap-3">
                  {inspected.result.document.lgu || inspected.result.document.jurisdiction ? (
                    <span className="inline-flex items-center gap-1">
                      <Landmark className="h-3.5 w-3.5 text-civic-700 dark:text-[#4ade80]" aria-hidden />
                      {inspected.result.document.lgu || inspected.result.document.jurisdiction}
                    </span>
                  ) : null}
                  {inspected.result.document.date_enacted ? (
                    <span className="inline-flex items-center gap-1">
                      <CalendarDays className="h-3.5 w-3.5 text-civic-700 dark:text-[#4ade80]" aria-hidden />
                      Enacted {inspected.result.document.date_enacted}
                    </span>
                  ) : null}
                  <span className="inline-flex items-center gap-1 font-semibold text-ink-800 dark:text-[#f3f3f3]">
                    <FileText className="h-3.5 w-3.5 text-civic-700 dark:text-[#4ade80]" aria-hidden />
                    Page {inspected.result.page_start}
                    {inspected.result.page_end && inspected.result.page_end !== inspected.result.page_start
                      ? `–${inspected.result.page_end}`
                      : ""}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 text-[11px]">
                  <Badge tone="civic">Combined {formatScore(inspected.result.retrieval_score)}</Badge>
                  <Badge tone="neutral">Vec {formatScore(inspected.result.vector_score)}</Badge>
                  <Badge tone="neutral">BM25 {formatScore(inspected.result.keyword_score)}</Badge>
                </div>
              </div>

              {/* Drawer View Switcher */}
              <div className="mt-3 flex items-center gap-2 border-t border-ink-100 pt-2.5 dark:border-[#262626]">
                <Button
                  size="sm"
                  variant={drawerTab === "cited" ? "default" : "secondary"}
                  onClick={() => setDrawerTab("cited")}
                >
                  <Sparkles className="h-3.5 w-3.5" aria-hidden />
                  Cited Parsed Section
                </Button>
                <Button
                  size="sm"
                  variant={drawerTab === "all_sections" ? "default" : "secondary"}
                  onClick={() => setDrawerTab("all_sections")}
                >
                  <Layers className="h-3.5 w-3.5" aria-hidden />
                  All Ordinance Sections
                  {inspectedDocDetail
                    ? ` (${inspectedDocDetail.sections.length})`
                    : loadingDocId === inspected.result.document.id
                      ? " (Loading…)"
                      : ` (${inspected.result.document.section_count})`}
                </Button>
              </div>
            </div>

            {/* Drawer Scrollable Body */}
            <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
              {drawerTab === "cited" ? (
                <>
                  {/* Exact Cited Sentence Callout (when clicked from a citation badge) */}
                  {inspected.claim ? (
                    <div className="rounded-xl border border-civic-600/30 bg-civic-50/50 p-4 dark:border-[#238636]/30 dark:bg-[#238636]/15">
                      <span className="block text-[10px] font-bold uppercase tracking-wider text-civic-800 dark:text-[#4ade80]">
                        Extracted Grounded Claim
                      </span>
                      <p className="mt-1.5 font-serif text-sm font-medium leading-relaxed text-ink-900 dark:text-[#f3f3f3]">
                        “{refineLegalText(inspected.claim.claim)}”
                      </p>
                    </div>
                  ) : null}

                  {/* Full Parsed Legal Section Box */}
                  <Card className="p-5">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-ink-100 pb-3 dark:border-[#262626]">
                      <div>
                        <span className="text-xs font-bold uppercase tracking-wider text-civic-700 dark:text-[#4ade80]">
                          {inspected.result.section_number
                            ? `Section ${inspected.result.section_number}`
                            : "Extracted Legal Provision"}
                        </span>
                        {inspected.result.heading ? (
                          <h3 className="mt-0.5 text-base font-semibold text-ink-900 dark:text-[#f3f3f3]">
                            {refineLegalText(inspected.result.heading)}
                          </h3>
                        ) : null}
                      </div>
                      <Badge tone="neutral">Page {inspected.result.page_start}</Badge>
                    </div>

                    {inspectedParsed?.contextHeader ? (
                      <div className="mt-3 rounded-lg bg-ink-50 px-3 py-2 text-xs text-ink-600 dark:bg-[#202020] dark:text-[#d4d4d4]">
                        <span className="font-semibold text-ink-700 dark:text-[#f3f3f3]">Hierarchy Context: </span>
                        {inspectedParsed.contextHeader}
                      </div>
                    ) : null}

                    <div className="mt-4 whitespace-pre-line font-serif text-[15px] leading-relaxed text-ink-900 dark:text-[#f3f3f3]">
                      <HighlightedText
                        text={inspectedParsed?.body || refineLegalText(inspected.result.text || inspected.result.excerpt)}
                        terms={inspected.highlightTerms}
                      />
                    </div>
                  </Card>
                </>
              ) : (
                <div className="space-y-3">
                  {loadingDocId === inspected.result.document.id && !inspectedDocDetail ? (
                    <div className="py-12 text-center text-sm text-ink-500 dark:text-[#888888]">
                      Loading all parsed sections for this ordinance…
                    </div>
                  ) : inspectedDocDetail && inspectedDocDetail.sections.length > 0 ? (
                    inspectedDocDetail.sections.map((sec: SectionRecord) => {
                      const isCurrentSection =
                        sec.id === inspected.result.section_id ||
                        (sec.section_number && sec.section_number === inspected.result.section_number);
                      return (
                        <details
                          key={sec.id}
                          open={Boolean(isCurrentSection)}
                          className={`group rounded-xl border p-4 transition ${
                            isCurrentSection
                              ? "border-civic-600/40 bg-civic-50/30 dark:border-[#238636]/40 dark:bg-[#238636]/15"
                              : "border-ink-200 bg-white hover:border-ink-300 dark:border-[#262626] dark:bg-[#181818]"
                          }`}
                        >
                          <summary className="flex cursor-pointer list-none items-center justify-between gap-2">
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-xs font-bold uppercase tracking-wider text-civic-700 dark:text-[#4ade80]">
                                  {sec.section_number ? `Section ${sec.section_number}` : sec.section_type}
                                </span>
                                {isCurrentSection ? <Badge tone="civic">Cited Section</Badge> : null}
                              </div>
                              {sec.heading ? (
                                <p className="mt-0.5 text-sm font-semibold text-ink-900 dark:text-[#f3f3f3]">
                                  {refineLegalText(sec.heading)}
                                </p>
                              ) : null}
                            </div>
                            <span className="shrink-0 text-xs font-medium text-ink-500 dark:text-[#888888]">
                              p. {sec.page_start}
                            </span>
                          </summary>
                          <div className="mt-3 whitespace-pre-line border-t border-ink-100 pt-3 font-serif text-sm leading-relaxed text-ink-800 dark:border-[#262626] dark:text-[#d4d4d4]">
                            <HighlightedText
                              text={refineLegalText(sec.corrected_text || sec.normalized_text)}
                              terms={inspected.highlightTerms}
                            />
                          </div>
                        </details>
                      );
                    })
                  ) : (
                    <div className="rounded-xl border border-ink-200 bg-ink-50 p-4 text-sm text-ink-600 dark:border-[#262626] dark:bg-[#202020] dark:text-[#d4d4d4]">
                      Showing primary parsed section above. Open the full ordinance page for complete repository details.
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Drawer Footer */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-ink-200 bg-ink-50/70 px-6 py-3.5 dark:border-[#262626] dark:bg-[#141414]">
              <span className="inline-flex items-center gap-1.5 text-xs text-ink-500 dark:text-[#888888]">
                <ShieldCheck className="h-3.5 w-3.5 text-civic-700 dark:text-[#4ade80]" aria-hidden />
                Signature-redacted statutory text (PDF withheld for privacy)
              </span>

              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={() => setInspected(null)}>
                  Close
                </Button>
                <Link
                  href={`/documents/${inspected.result.document.id}?tab=Sections&section=${encodeURIComponent(inspected.result.section_id)}&page=${inspected.result.page_start}&highlight=${encodeURIComponent((inspected.claim?.claim || inspected.result.excerpt).slice(0, 100))}`}
                  className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-civic-700 px-3.5 text-xs font-semibold text-white shadow-xs transition hover:bg-civic-800 dark:bg-[#238636] dark:hover:bg-[#2ea043]"
                >
                  Open Full Ordinance View
                  <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
                </Link>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function RefreshCwIcon() {
  return (
    <svg
      className="h-3.5 w-3.5"
       viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
      <path d="M21 3v5h-5" />
      <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
      <path d="M8 16H3v5" />
    </svg>
  );
}

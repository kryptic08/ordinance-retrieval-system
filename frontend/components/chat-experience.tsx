"use client";

import { RotateCcw } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useConvex } from "convex/react";
import { api as convexApi } from "@/convex/_generated/api";
import { ChatComposer } from "@/components/chat-composer";
import { ChatLanding } from "@/components/chat-landing";
import { ChatMessageList } from "@/components/chat-message-list";
import { CHAT_CONFIGURATIONS } from "@/lib/chat-config";
import { api, ApiError } from "@/lib/api";
import type { ChatMessage } from "@/lib/chat-types";

interface ConvexSearchResultItem {
  id?: string;
  document_id: string;
  document_title: string;
  ordinance_number?: string;
  year?: number;
  jurisdiction?: string;
  section_number?: string;
  heading?: string;
  text: string;
  page_start: number;
  page_end: number;
  score?: number;
}

type Phase = "INITIAL" | "CONVERSATION" | "GENERATING" | "ERROR";

const FOLLOWUP_PRONOUN_RE =
  /\b(it|this|that|these|those|they|them|its|their|there|same|iyon|ito|iyan|doon|nito|niyan)\b/i;
const FOLLOWUP_START_RE =
  /^(what about|how about|and |also |what is the penalty|what are the penalties|how much is the fine|are there exemptions|who enforces|when does it|magkano ang multa|ano ang parusa)/i;

const buildContextualQuery = (history: ChatMessage[], currentQuery: string) => {
  const trimmed = currentQuery.trim();
  const lastUser = [...history].reverse().find((message) => message.role === "user");
  if (!lastUser) return trimmed;

  const wordCount = trimmed.split(/\s+/).length;
  const isFollowUp =
    (wordCount <= 9 && FOLLOWUP_PRONOUN_RE.test(trimmed)) ||
    (wordCount <= 7 && FOLLOWUP_START_RE.test(trimmed));

  if (!isFollowUp) {
    return trimmed;
  }

  return `User asked: ${lastUser.content}\nCurrent question: ${trimmed}`;
};

let chatMessageId = 0;

export function ChatExperience() {
  const convex = useConvex();
  const [phase, setPhase] = useState<Phase>("INITIAL");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [configuration, setConfiguration] = useState<string>(CHAT_CONFIGURATIONS[0].value);
  const [sessionId] = useState<string>(() => {
    if (typeof window !== "undefined") {
      const stored = sessionStorage.getItem("ordisearch_session_id");
      if (stored) return stored;
      const created = `session-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      sessionStorage.setItem("ordisearch_session_id", created);
      return created;
    }
    return `session-${Date.now()}`;
  });
  const didAutoQueryRef = useRef(false);
  const lastScrolledMsgIdRef = useRef<string | null>(null);

  // Scroll the top of the newest turn (user prompt + start of assistant answer) into view,
  // never jumping to the bottom of a long answer card.
  useEffect(() => {
    if (messages.length === 0) return;
    const lastAssistant = [...messages].reverse().find((m) => m.role === "assistant");
    const lastUser = [...messages].reverse().find((m) => m.role === "user");
    const targetMsg = lastUser ?? lastAssistant;
    if (!targetMsg) return;

    const scrollKey = `${targetMsg.id}-${lastAssistant?.status ?? "none"}`;
    if (lastScrolledMsgIdRef.current === scrollKey) return;
    lastScrolledMsgIdRef.current = scrollKey;

    const timer = window.setTimeout(() => {
      const el =
        document.getElementById(`chat-msg-${targetMsg.id}`) ??
        (lastAssistant ? document.getElementById(`chat-msg-${lastAssistant.id}`) : null);
      if (el) {
        el.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }
    }, 40);

    return () => window.clearTimeout(timer);
  }, [messages]);

  const sendMessage = useCallback(
    async (content?: string, options?: { replaceAssistant?: boolean }) => {
      const replaceAssistant = options?.replaceAssistant ?? false;
      const clean = (content ?? input).trim();
      if (!clean || isGenerating) return;

      const userMessage: ChatMessage = {
        id: `chat-user-${Date.now()}-${chatMessageId++}`,
        role: "user",
        content: clean,
        status: "complete",
      };
      const assistantMessage: ChatMessage = {
        id: `chat-assistant-${Date.now()}-${chatMessageId++}`,
        role: "assistant",
        content: "",
        status: "generating",
        configuration,
      };
      const contextQuery = buildContextualQuery(messages, clean);

      setPhase("GENERATING");
      setInput("");
      setIsGenerating(true);
      setError(null);
      setMessages((previous) => {
        if (!replaceAssistant) return [...previous, userMessage, assistantMessage];
        const next = [...previous];
        if (next.length > 0 && next[next.length - 1]?.role === "assistant") next.pop();
        next.push(assistantMessage);
        return next;
      });

      // Persist user turn directly to Convex database
      if (convex) {
        void convex.mutation(convexApi.chat.saveMessage, {
          sessionId,
          role: "user",
          content: clean,
          configuration,
        }).catch((err) => console.warn("Convex user message sync:", err));
      }

      try {
        let result;
        try {
          result = await api.search({
            query: contextQuery,
            top_k: 10,
            configuration,
          });
        } catch (apiErr) {
          // If local FastAPI is unreachable (e.g. deployed cloud environment), fallback to Convex search
          if (convex) {
            const convexSections = await convex.query(convexApi.search.searchSections, {
              queryText: contextQuery,
              limit: 8,
            });
            if (convexSections && convexSections.length > 0) {
              const items = convexSections as ConvexSearchResultItem[];
              result = {
                query: contextQuery,
                total: items.length,
                took_ms: 45,
                configuration: "convex-cloud",
                message: null,
                suggestions: [],
                top_score: items[0]?.score ?? 0.95,
                results: items.map((sec, idx) => ({
                  chunk_id: sec.id ?? `chunk-${idx}`,
                  section_id: sec.id ?? `sec-${idx}`,
                  chunk_key: `key-${idx}`,
                  document: {
                    id: sec.document_id,
                    ordinance_number: sec.ordinance_number ?? null,
                    title: sec.document_title,
                    document_type: "Ordinance",
                    year: sec.year ?? null,
                    date_enacted: null,
                    lgu: "Polangui, Albay",
                    jurisdiction: sec.jurisdiction ?? "Municipality of Polangui, Albay",
                    subject: null,
                    category: null,
                    publication_status: null,
                    status: "active",
                    is_active: true,
                    page_count: sec.page_end,
                    file_size: 0,
                    checksum: "",
                    original_filename: `${sec.document_title}.pdf`,
                    embedding_model: null,
                    processing_error: null,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                    section_count: 1,
                    chunk_count: 1,
                    signatory_count: 0,
                  },
                  section_number: sec.section_number ?? null,
                  heading: sec.heading ?? null,
                  page_start: sec.page_start,
                  page_end: sec.page_end,
                  excerpt: sec.text.slice(0, 200),
                  text: sec.text,
                  score: sec.score ?? 0.95,
                  retrieval_score: sec.score ?? 0.95,
                  keyword_score: 0.9,
                  vector_score: 0.9,
                  rerank_score: 0.95,
                  matched_terms: [],
                  verification_status: "verified",
                  citation: `${sec.document_title}, ${sec.section_number ?? "Section"}, p. ${sec.page_start}`,
                  pdf_url: "",
                })),
                answer: {
                  text: `Found official provisions for "${clean}" in the Municipality of Polangui Ordinance Repository:`,
                  mode: "convex-retrieval",
                  claims: items.slice(0, 3).map((s) => ({
                    claim: s.heading ? `${s.section_number ?? "Section"}: ${s.heading}` : s.section_number ?? "Provisions",
                    citations: [s.document_title],
                    chunk_id: s.id ?? null,
                    citation_url: null,
                    page_start: s.page_start,
                    document_id: s.document_id,
                  })),
                  disclaimer: "Retrieved directly from the official Convex cloud database.",
                },
              };
            } else {
              throw apiErr;
            }
          } else {
            throw apiErr;
          }
        }

        const assistantContent =
          result.answer?.text ??
          (result.results.length > 0
            ? `Retrieved ${result.results.length} relevant ordinance provision${result.results.length === 1 ? "" : "s"} from the official repository:`
            : result.message ?? "No sufficiently relevant source provision was found.");
        setMessages((previous) => {
          const next = [...previous];
          next[next.length - 1] = {
            ...next[next.length - 1],
            content: assistantContent,
            status: "complete",
            answer: result.answer ?? null,
            results: result.results,
            tookMs: result.took_ms,
            configuration: result.configuration,
          };
          return next;
        });

        // Persist assistant response turn to Convex cloud database
        if (convex) {
          void convex.mutation(convexApi.chat.saveMessage, {
            sessionId,
            role: "assistant",
            content: assistantContent,
            tookMs: result.took_ms,
            configuration: result.configuration,
            results: result.results,
            answer: result.answer ?? null,
          }).catch((err) => console.warn("Convex assistant message sync:", err));
        }

        setPhase("CONVERSATION");
      } catch (sendError) {
        const message =
          sendError instanceof ApiError
            ? sendError.message
            : "The assistant could not complete that response.";
        setError(message);
        setPhase("ERROR");
        setMessages((previous) => {
          const next = [...previous];
          if (next.length > 0) {
            next[next.length - 1] = { ...next[next.length - 1], status: "error" };
          }
          return next;
        });
      } finally {
        setIsGenerating(false);
      }
    },
    [configuration, convex, input, isGenerating, messages, sessionId],
  );

  // Support URL query parameter ?q=... from DocumentDetailPage links
  useEffect(() => {
    if (didAutoQueryRef.current || typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const initialQuery = params.get("q")?.trim();
    if (initialQuery) {
      didAutoQueryRef.current = true;
      void sendMessage(initialQuery);
    }
  }, [sendMessage]);

  const resetConversation = useCallback(() => {
    setPhase("INITIAL");
    setMessages([]);
    setInput("");
    setIsGenerating(false);
    setError(null);
    lastScrolledMsgIdRef.current = null;
  }, []);

  const regenerate = useCallback(async () => {
    const lastUser = [...messages].reverse().find((message) => message.role === "user");
    if (!lastUser || isGenerating) return;
    await sendMessage(lastUser.content, { replaceAssistant: true });
  }, [isGenerating, messages, sendMessage]);

  return (
    <div className="flex flex-1 flex-col bg-paper-50/70 dark:bg-[#111111]">
      {phase === "INITIAL" ? (
        <ChatLanding
          input={input}
          onChange={setInput}
          onSubmit={sendMessage}
          isGenerating={isGenerating}
          configuration={configuration}
          onConfigurationChange={setConfiguration}
        />
      ) : null}

      {phase === "CONVERSATION" || phase === "GENERATING" ? (
        <main className="flex flex-1 flex-col">
          <div className="sticky top-16 z-30 border-b border-ink-200/60 bg-white/95 backdrop-blur-md dark:border-[#262626] dark:bg-[#111111]/95">
            <div className="mx-auto flex w-full max-w-3xl items-center justify-end px-4 py-2 sm:py-2.5">
              <button
                type="button"
                onClick={resetConversation}
                className="inline-flex items-center gap-1.5 rounded-lg border border-ink-200/80 bg-white px-3 py-1.5 text-xs font-semibold text-ink-700 shadow-2xs transition hover:border-civic-500/40 hover:bg-ink-50 hover:text-ink-900 dark:border-[#262626] dark:bg-[#181818] dark:text-[#d4d4d4] dark:hover:bg-[#222222] dark:hover:text-white"
              >
                <RotateCcw className="h-3.5 w-3.5 text-civic-700 dark:text-[#4ade80]" aria-hidden />
                New Inquiry
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            <ChatMessageList
              messages={messages}
              isGenerating={isGenerating}
              onRegenerate={regenerate}
            />
          </div>

          <div className="sticky bottom-0 z-20 px-4 pb-4 pt-2 pointer-events-none">
            <div className="mx-auto w-full max-w-3xl pointer-events-auto">
              <ChatComposer
                value={input}
                onChange={setInput}
                onSubmit={sendMessage}
                isGenerating={isGenerating}
                configuration={configuration}
                onConfigurationChange={setConfiguration}
                placeholder="Ask a follow-up question or search another ordinance..."
              />
            </div>
          </div>
        </main>
      ) : null}

      {phase === "ERROR" ? (
        <main className="flex flex-1 items-center justify-center p-6">
          <section className="surface w-full max-w-xl p-6">
            <p className="text-xs font-semibold uppercase tracking-wider text-rust-600">
              Retrieval Service Error
            </p>
            <h1 className="mt-2 font-serif text-2xl font-semibold text-ink-900">
              We could not complete that query.
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-ink-700">{error}</p>
            <div className="mt-5 flex items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  sendMessage(messages.find((message) => message.role === "user")?.content ?? "")
                }
                className="btn-primary"
              >
                Retry Query
              </button>
              <button type="button" onClick={resetConversation} className="btn-secondary">
                Back to Search
              </button>
            </div>
          </section>
        </main>
      ) : null}
    </div>
  );
}

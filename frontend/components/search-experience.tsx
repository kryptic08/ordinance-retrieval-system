"use client";

import {
  BookOpenCheck,
  Filter,
  Info,
  Loader2,
  Search,
  SlidersHorizontal,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import type { DocumentOptions, SearchResponse } from "@/lib/types";
import { ResultCard } from "./result-card";
import { Alert, Badge, EmptyState } from "./ui";

const EXAMPLES = [
  "Are businesses allowed to operate after midnight?",
  "What are the penalties for improper waste disposal?",
  "Is there an ordinance regulating videoke noise at night?",
  "Which ordinance discusses the use of public roads for vending?",
  "What rules apply to construction near waterways?",
];

const CONFIGURATIONS = [
  { value: "hybrid", label: "Hybrid (recommended)" },
  { value: "keyword", label: "Keyword only" },
  { value: "vector", label: "Semantic only" },
  { value: "hybrid_rerank", label: "Hybrid + reranking" },
];

const BENEFITS = [
  {
    title: "Answers before search noise",
    description: "Start with a source-grounded answer, then inspect the matching provisions.",
  },
  {
    title: "Citations are traceable",
    description: "Every answer cites the ordinance, section, and original PDF page.",
  },
  {
    title: "Uncertainty stays visible",
    description: "Retrieval scores support confidence; they do not replace legal verification.",
  },
];

type ConversationTurn = {
  role: "user" | "assistant";
  content: string;
};

const buildContextualQuery = (history: ConversationTurn[], currentQuery: string) => {
  const lastUser = [...history].reverse().find((turn) => turn.role === "user");
  const lastAssistant = [...history].reverse().find((turn) => turn.role === "assistant");
  if (!lastUser || !lastAssistant) return currentQuery;
  return [
    "Earlier conversation context:",
    `User asked: ${lastUser.content}`,
    `Assistant answered: ${lastAssistant.content}`,
    `Current question: ${currentQuery}`,
  ].join("\n");
};

export function SearchExperience() {
  const [query, setQuery] = useState("");
  const [configuration, setConfiguration] = useState("hybrid");
  const [year, setYear] = useState("");
  const [documentType, setDocumentType] = useState("");
  const [jurisdiction, setJurisdiction] = useState("");
  const [category, setCategory] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [response, setResponse] = useState<SearchResponse | null>(null);
  const [conversation, setConversation] = useState<ConversationTurn[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [options, setOptions] = useState<DocumentOptions | null>(null);
  const [stats, setStats] = useState<{ active_documents: number; indexed_sections: number } | null>(null);

  useEffect(() => {
    api.documentOptions().then(setOptions).catch(() => undefined);
    api.publicStats().then(setStats).catch(() => undefined);
    const params = new URLSearchParams(window.location.search);
    const initial = params.get("q");
    if (initial) {
      setQuery(initial);
      const config = params.get("config");
      if (config) setConfiguration(config);
    }
  }, []);

  const runSearch = useCallback(
    async (
      searchQuery: string,
      overrides?: { config?: string; year?: string; type?: string; jurisdiction?: string; category?: string },
    ) => {
      const cleaned = searchQuery.trim();
      if (!cleaned) return;
      setLoading(true);
      setError(null);
      const config = overrides?.config ?? configuration;
      const selectedYear = overrides?.year ?? year;
      const contextualQuery = buildContextualQuery(conversation, cleaned);
      try {
        const result = await api.search({
          query: contextualQuery,
          top_k: 10,
          configuration: config,
          year: selectedYear ? Number(selectedYear) : undefined,
          document_type: (overrides?.type ?? documentType) || undefined,
          jurisdiction: (overrides?.jurisdiction ?? jurisdiction) || undefined,
          category: (overrides?.category ?? category) || undefined,
        });
        setResponse(result);
        setConversation((previous) => [
          ...previous,
          { role: "user", content: cleaned },
          {
            role: "assistant",
            content: result.answer?.text ?? result.message ?? "No sufficiently relevant source provision was found.",
          },
        ]);
        const params = new URLSearchParams(window.location.search);
        params.set("q", cleaned);
        params.set("config", config);
        window.history.replaceState(null, "", `?${params.toString()}`);
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "Search failed. Please try again.");
      } finally {
        setLoading(false);
      }
    },
    [configuration, year, documentType, jurisdiction, category, conversation],
  );

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const initial = params.get("q");
    if (initial) {
      const config = params.get("config") || "hybrid";
      setConfiguration(config);
      void runSearch(initial, { config });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const applyExample = (example: string) => {
    setQuery(example);
    setConversation([]);
    setResponse(null);
    void runSearch(example);
  };

  const resetFilters = () => {
    setYear("");
    setDocumentType("");
    setJurisdiction("");
    setCategory("");
  };

  const startConversation = () => {
    setConversation([]);
    setResponse(null);
    setQuery("");
  };

  const activeFilterCount = [year, documentType, jurisdiction, category].filter(Boolean).length;

  return (
    <div>
      <section className="relative overflow-hidden border-b border-paper-300 bg-paper-50">
        <div
          className="pointer-events-none absolute inset-0 opacity-60"
          style={{
            backgroundImage:
              "radial-gradient(circle at 15% 20%, rgba(47,122,96,0.12), transparent 35%), radial-gradient(circle at 85% 10%, rgba(184,137,47,0.12), transparent 30%)",
          }}
        />
        <div className="container-page relative py-12 sm:py-16">
          <div className="mx-auto max-w-3xl text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-civic-500/20 bg-white/80 px-3 py-1 text-sm font-semibold text-civic-700">
              <BookOpenCheck className="h-4 w-4" aria-hidden />
              Local ordinances and policy documents
            </div>
            <h1 className="mt-5 font-serif text-4xl font-semibold leading-tight tracking-tight text-ink-900 sm:text-6xl">
              Ask a question. Find the exact provision.
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-ink-700">
              Search the indexed text of local ordinances using everyday language. Every result
              points to the ordinance, section, and original PDF page it came from.
            </p>
          </div>

          <ul className="mx-auto mt-8 grid max-w-3xl gap-3 sm:grid-cols-3">
            {BENEFITS.map((benefit) => (
              <li key={benefit.title} className="surface p-4 text-left">
                <p className="text-sm font-semibold text-ink-900">{benefit.title}</p>
                <p className="mt-2 text-sm leading-6 text-ink-700">{benefit.description}</p>
              </li>
            ))}
          </ul>

          <form
            className="mx-auto mt-8 max-w-4xl"
            onSubmit={(event) => {
              event.preventDefault();
              void runSearch(query);
            }}
            role="search"
          >
            <div className="flex flex-col gap-2 rounded-2xl border border-paper-300 bg-white p-2 shadow-card sm:flex-row sm:items-center">
              <div className="flex flex-1 items-center gap-2 px-2">
                <Search className="h-5 w-5 shrink-0 text-civic-700" aria-hidden />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  className="w-full border-0 bg-transparent py-3 text-base text-ink-900 outline-none placeholder:text-ink-600/70"
                  placeholder="e.g. What are the penalties for improper waste disposal?"
                  aria-label="Search ordinances"
                  maxLength={2000}
                />
              </div>
              <button type="submit" className="btn-primary sm:min-w-[130px]" disabled={loading || !query.trim()}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Search className="h-4 w-4" aria-hidden />}
                {loading ? "Searching" : "Search"}
              </button>            </div>
            <div className="mt-3 flex flex-wrap items-center justify-center gap-2 text-xs">
              <button
                type="button"
                onClick={() => setShowFilters((value) => !value)}
                className="inline-flex items-center gap-1.5 rounded-full border border-paper-300 bg-white px-3 py-1.5 font-medium text-ink-700 hover:border-civic-500"
                aria-expanded={showFilters}
              >
                <Filter className="h-3.5 w-3.5" aria-hidden />
                Filters
                {activeFilterCount > 0 ? (
                  <span className="rounded-full bg-civic-700 px-1.5 text-[10px] text-white">{activeFilterCount}</span>
                ) : null}
              </button>
              <label className="inline-flex items-center gap-1.5 rounded-full border border-paper-300 bg-white px-3 py-1.5 text-ink-700">
                <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden />
                <span className="sr-only">Retrieval configuration</span>
                <select
                  value={configuration}
                  onChange={(event) => setConfiguration(event.target.value)}
                  className="bg-transparent text-xs font-medium outline-none"
                  aria-label="Retrieval configuration"
                >
                  {CONFIGURATIONS.map((config) => (
                    <option key={config.value} value={config.value}>
                      {config.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {showFilters ? (
              <div className="mt-4 grid gap-3 rounded-xl border border-paper-300 bg-white p-4 text-left sm:grid-cols-2 lg:grid-cols-4">
                <label className="block">
                  <span className="label">Year</span>
                  <select className="input" value={year} onChange={(event) => setYear(event.target.value)}>
                    <option value="">Any year</option>
                    {options?.years.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="label">Document type</span>
                  <select
                    className="input"
                    value={documentType}
                    onChange={(event) => setDocumentType(event.target.value)}
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
                    onChange={(event) => setJurisdiction(event.target.value)}
                  >
                    <option value="">Any jurisdiction</option>
                    {options?.jurisdictions.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="label">Category</span>
                  <select className="input" value={category} onChange={(event) => setCategory(event.target.value)}>
                    <option value="">Any category</option>
                    {options?.categories.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </label>
                {activeFilterCount > 0 ? (
                  <button type="button" className="btn-ghost justify-start !px-1 text-xs sm:col-span-2 lg:col-span-4" onClick={resetFilters}>
                    Clear filters
                  </button>
                ) : null}
              </div>
            ) : null}
          </form>

          <div className="mx-auto mt-6 flex max-w-4xl flex-wrap items-center justify-center gap-2">
            <span className="text-xs font-medium text-ink-600">Try:</span>
            {EXAMPLES.slice(0, 3).map((example) => (
              <button
                key={example}
                onClick={() => applyExample(example)}
                className="rounded-full border border-paper-300 bg-white/80 px-3 py-1.5 text-xs text-ink-700 transition hover:border-civic-500 hover:text-civic-700"
              >
                {example}
              </button>
            ))}
          </div>

          {stats ? (
            <div className="mx-auto mt-8 flex max-w-2xl flex-wrap items-center justify-center gap-x-8 gap-y-2 text-xs text-ink-600">
              <span>
                <strong className="text-ink-900">{stats.active_documents}</strong> active documents
              </span>
              <span>
                <strong className="text-ink-900">{stats.indexed_sections.toLocaleString()}</strong> indexed sections
              </span>
              <span className="inline-flex items-center gap-1">
                <Info className="h-3.5 w-3.5" aria-hidden /> OCR and digital text, with page citations
              </span>
            </div>
          ) : null}
        </div>
      </section>

      <section className="container-page py-10">
        {error ? (
          <div className="mb-6">
            <Alert>{error}</Alert>
          </div>
        ) : null}

        {loading ? (
          <div className="space-y-4">
            {[0, 1, 2].map((item) => (
              <div key={item} className="surface animate-pulse p-5">
                <div className="h-3 w-32 rounded bg-paper-200" />
                <div className="mt-3 h-5 w-3/4 rounded bg-paper-200" />
                <div className="mt-4 h-3 w-full rounded bg-paper-200" />
                <div className="mt-2 h-3 w-5/6 rounded bg-paper-200" />
              </div>
            ))}
          </div>
        ) : response ? (
          <div>
            {conversation.length > 0 ? (
              <section
                aria-label="Conversation"
                className="mb-6 overflow-hidden rounded-2xl border border-civic-500/30 bg-civic-50/50"
              >
                <div className="border-b border-civic-500/20 bg-white/70 px-5 py-3">
                  <p className="text-sm font-semibold uppercase tracking-wider text-civic-700">Conversation</p>
                  <p className="mt-1 text-sm text-ink-600">Follow-up questions use the previous answer as context.</p>
                </div>
                <ol className="divide-y divide-civic-100">
                  {conversation.map((turn, index) => (
                    <li
                      key={index}
                      className={`flex px-5 py-4 ${turn.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[85%] rounded-2xl px-4 py-3 shadow-sm ${
                          turn.role === "user"
                            ? "rounded-br-xl bg-civic-100 text-right"
                            : "rounded-bl-xl bg-white text-left"
                        }`}
                      >
                        <p className="text-xs font-semibold uppercase tracking-wider text-civic-700">
                          {turn.role === "user" ? "You" : "Assistant"}
                        </p>
                        <p className={`mt-2 text-base leading-7 ${turn.role === "user" ? "text-ink-900" : "text-ink-800"}`}>
                          {turn.content}
                        </p>
                      </div>
                    </li>
                  ))}
                </ol>
              </section>
            ) : null}

            <div className="flex flex-wrap items-end justify-between gap-3 border-b border-paper-300 pb-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wider text-ink-600">Supporting provisions</p>
                <h2 className="mt-1 font-serif text-3xl font-semibold text-ink-900">
                  {response.total > 0
                    ? `${response.total} source passage${response.total === 1 ? "" : "s"} found`
                    : "No reliable source passage found"}
                </h2>
                <p className="mt-1 text-sm text-ink-600">
                  Query: “{response.query}” · {response.took_ms} ms · {response.configuration.replace("_", " + ")}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button type="button" onClick={startConversation} className="btn-secondary !py-1.5 text-xs">
                  New conversation
                </button>
                <Badge tone="civic">
                  <Sparkles className="h-3 w-3" aria-hidden /> Source-grounded
                </Badge>
                <Badge>Retrieval, not legal advice</Badge>
              </div>
            </div>

            {response.answer ? (
              <section className="mt-6 overflow-hidden rounded-2xl border border-civic-500/30 bg-civic-50/60 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-civic-500/20 bg-white/60 px-5 py-3">
                  <Badge tone="civic">
                    <Sparkles className="h-3 w-3" aria-hidden /> Source-grounded answer
                  </Badge>
                  <span className="text-[11px] font-medium text-ink-600">
                    Extractive summary from the cited provisions
                  </span>
                </div>
                <div className="px-5 py-5">
                  <p className="font-serif text-base leading-8 text-ink-900">{response.answer.text}</p>
                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold uppercase tracking-wider text-ink-600">Sources</span>
                    {response.answer.claims.map((claim, index) => (
                      <Link
                        key={`${claim.chunk_id ?? "claim"}-${index}`}
                        href={
                          claim.document_id
                            ? `/documents/${claim.document_id}?page=${claim.page_start ?? 1}&highlight=${encodeURIComponent(claim.claim)}`
                            : claim.citation_url || "#"
                        }
                        className="inline-flex items-center gap-1 rounded-full border border-civic-500/20 bg-white px-2.5 py-1 text-[11px] font-medium text-civic-800 hover:border-civic-500"
                      >
                        <span className="flex h-4 w-4 items-center justify-center rounded-full bg-civic-700 text-[9px] font-bold text-white">
                          {index + 1}
                        </span>
                        {claim.citations[0] || `Source ${index + 1}`}
                      </Link>
                    ))}
                  </div>
                  <p className="mt-3 text-sm leading-6 text-ink-600">{response.answer.disclaimer}</p>
                </div>
              </section>
            ) : null}

            {response.results.length > 0 ? (
              <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1fr)_260px]">
                <div className="space-y-4">
                  {response.results.map((result, index) => (
                    <ResultCard key={result.chunk_id} result={result} rank={index + 1} />
                  ))}
                </div>
                <aside className="hidden lg:block">
                  <div className="sticky top-24 space-y-4">
                    <div className="surface p-4">
                      <h3 className="text-sm font-semibold text-ink-900">How to read this</h3>
                      <p className="mt-2 text-xs leading-5 text-ink-600">
                        The retrieval score compares your question with indexed text. A high score
                        does not prove that a provision is applicable, current, or still in force.
                        Verify the exact wording on the cited PDF page.
                      </p>
                    </div>
                    <div className="surface p-4">
                      <h3 className="text-sm font-semibold text-ink-900">Refine the search</h3>
                      <ul className="mt-2 space-y-2 text-xs leading-5 text-ink-600">
                        <li>Add an ordinance number if you know it.</li>
                        <li>Use the exact legal term, such as “videoke” or “penalty”.</li>
                        <li>Remove filters if the provision may be in another year.</li>
                      </ul>
                    </div>
                  </div>
                </aside>
              </div>
            ) : (
              <div className="mt-6">
                <EmptyState
                  title="No sufficiently relevant result"
                  description={
                    response.message ||
                    "The indexed corpus may not contain the provision you are looking for. Try different wording or remove filters."
                  }
                  action={
                    <div className="flex flex-wrap justify-center gap-2">
                      {response.suggestions.map((suggestion) => (
                        <button
                          key={suggestion}
                          className="btn-secondary !py-1.5 text-xs"
                          onClick={() => {
                            setQuery(suggestion.replace(/^Try:\s*/i, ""));
                            void runSearch(suggestion.replace(/^Try:\s*/i, ""));
                          }}
                        >
                          {suggestion}
                        </button>
                      ))}
                      <Link href="/documents" className="btn-primary !py-1.5 text-xs">
                        Browse all documents
                      </Link>
                    </div>
                  }
                />
              </div>
            )}
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
            <div className="surface p-6">
              <p className="text-xs font-semibold uppercase tracking-wider text-ink-600">Example questions</p>
              <ul className="mt-4 divide-y divide-paper-200">
                {EXAMPLES.map((example) => (
                  <li key={example}>
                    <button
                      onClick={() => applyExample(example)}
                      className="flex w-full items-center justify-between gap-3 py-3 text-left text-sm text-ink-800 hover:text-civic-700"
                    >
                      <span>{example}</span>
                      <Search className="h-4 w-4 shrink-0 text-ink-600" aria-hidden />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
            <div className="surface bg-civic-50/50 p-6">
              <p className="text-xs font-semibold uppercase tracking-wider text-civic-700">What you get</p>
              <ul className="mt-4 space-y-4 text-sm text-ink-700">
                <li className="flex gap-3">
                  <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-civic-500" />
                  A concise source-grounded answer with the ordinance number, section, and page.
                </li>
                <li className="flex gap-3">
                  <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-civic-500" />
                  Semantic matching for everyday wording plus keyword matching for legal terms and
                  ordinance numbers.
                </li>
                <li className="flex gap-3">
                  <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-civic-500" />
                  A link to the preserved original PDF, so you can verify every citation.
                </li>
                <li className="flex gap-3">
                  <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-civic-500" />
                  An explicit empty state when the corpus does not support a reliable match.
                </li>
              </ul>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

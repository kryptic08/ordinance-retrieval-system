"use client";

import {
  BookOpenCheck,
  Building2,
  Database,
  FileCheck2,
  Landmark,
  Scale,
  ShieldAlert,
  Trees,
  Volume2,
} from "lucide-react";
import { useEffect, useState } from "react";
import { ChatComposer } from "@/components/chat-composer";
import { api } from "@/lib/api";

type ChatLandingProps = {
  input: string;
  onChange: (value: string) => void;
  onSubmit: (content?: string) => void | Promise<void>;
  isGenerating: boolean;
  configuration?: string;
  onConfigurationChange?: (config: string) => void;
};

const SAMPLE_INQUIRIES = [
  {
    category: "Public Safety",
    query: "What are the curfew hours and exemptions for minors?",
    icon: ShieldAlert,
  },
  {
    category: "Environment & Sanitation",
    query: "What are the penalties for illegal waste dumping and littering?",
    icon: Trees,
  },
  {
    category: "Public Order",
    query: "Videoke and nighttime noise regulations in residential areas",
    icon: Volume2,
  },
  {
    category: "Commerce & Licensing",
    query: "Business permit requirements, fees, and renewal deadlines",
    icon: Building2,
  },
];

export function ChatLanding({
  input,
  onChange,
  onSubmit,
  isGenerating,
  configuration,
  onConfigurationChange,
}: ChatLandingProps) {
  const [stats, setStats] = useState<{
    active_documents: number;
    indexed_sections: number;
    indexed_chunks: number;
  } | null>(null);
  const [logoError, setLogoError] = useState(false);

  useEffect(() => {
    api
      .publicStats()
      .then(setStats)
      .catch(() => undefined);
  }, []);

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-4 py-10 sm:py-14 lg:py-16">
      <section className="w-full max-w-3xl text-center">
        {/* Seal & Jurisdiction Badge */}
        <div className="mb-4 flex flex-col items-center justify-center gap-3">
          <div className="relative flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border-2 border-gold-500/40 bg-white p-1 shadow-float transition-transform duration-200 hover:scale-105 dark:border-gold-500/50 dark:bg-[#181818] sm:h-22 sm:w-22">
            {!logoError ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src="/api/logo"
                alt="Official Seal of the Municipality of Polangui, Albay"
                className="h-full w-full object-contain p-0.5"
                onError={() => setLogoError(true)}
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-civic-700 text-white dark:bg-[#238636]">
                <Landmark className="h-10 w-10" aria-hidden />
              </div>
            )}
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border border-civic-600/20 bg-civic-50/90 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-civic-800 shadow-subtle dark:border-[#238636]/30 dark:bg-[#238636]/15 dark:text-[#4ade80]">
            <BookOpenCheck className="h-4 w-4 text-civic-700 dark:text-[#4ade80]" aria-hidden />
            Municipality of Polangui, Albay
          </div>
        </div>

        {/* Hero Title & Subtitle */}
        <h1 className="mt-3 font-serif text-3xl font-bold tracking-tight text-ink-950 dark:text-[#f3f3f3] sm:text-5xl lg:text-[54px] lg:leading-[1.12]">
          OrdiSearch<span className="text-civic-600 dark:text-[#4ade80]">.</span>
        </h1>
        <p className="mx-auto mt-2.5 max-w-xl text-sm font-medium text-ink-600 dark:text-[#a3a3a3] sm:text-base">
          Search through Polangui&apos;s ordinances and resolutions.
        </p>

        {/* Prominent Focal Search Bar */}
        <div className="mx-auto mt-8 w-full max-w-3xl text-left sm:mt-9">
          <ChatComposer
            value={input}
            onChange={onChange}
            onSubmit={onSubmit}
            isGenerating={isGenerating}
            configuration={configuration}
            onConfigurationChange={onConfigurationChange}
            variant="prominent"
            placeholder="Ask about a local ordinance, curfew hours, business permits, or noise regulations..."
          />
        </div>

        {/* Live Corpus Trust Metrics directly below Search Bar */}
        {stats ? (
          <div className="mx-auto mt-5 inline-flex flex-wrap items-center justify-center gap-3.5 rounded-full border border-ink-200/80 bg-white/80 px-4 py-1.5 text-xs text-ink-600 shadow-xs backdrop-blur-xs dark:border-[#262626] dark:bg-[#181818]/90 dark:text-[#d4d4d4]">
            <span className="inline-flex items-center gap-1.5">
              <FileCheck2 className="h-3.5 w-3.5 text-civic-700 dark:text-[#4ade80]" aria-hidden />
              <strong className="font-semibold text-ink-900 dark:text-[#f3f3f3]">{stats.active_documents}</strong> Active Ordinances
            </span>
            <span className="text-ink-300 dark:text-[#333333]" aria-hidden>
              ·
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Scale className="h-3.5 w-3.5 text-civic-700 dark:text-[#4ade80]" aria-hidden />
              <strong className="font-semibold text-ink-900 dark:text-[#f3f3f3]">{stats.indexed_sections}</strong> Legal Sections
            </span>
            <span className="text-ink-300 dark:text-[#333333]" aria-hidden>
              ·
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Database className="h-3.5 w-3.5 text-civic-700 dark:text-[#4ade80]" aria-hidden />
              <strong className="font-semibold text-ink-900 dark:text-[#f3f3f3]">{stats.indexed_chunks}</strong> Vector Chunks
            </span>
          </div>
        ) : null}

        {/* Categorized Sample Legal Inquiries */}
        <div className="mx-auto mt-10 w-full max-w-3xl text-left sm:mt-12">
          <div className="mb-3.5 flex items-center justify-between px-1">
            <p className="text-[11px] font-bold uppercase tracking-wider text-ink-400 dark:text-[#888888]">
              Explore common citizen inquiries
            </p>
            <span className="hidden text-[11px] font-medium text-ink-400 dark:text-[#737373] sm:inline">
              Click any topic to query
            </span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {SAMPLE_INQUIRIES.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.query}
                  type="button"
                  onClick={() => {
                    onChange(item.query);
                    void onSubmit(item.query);
                  }}
                  className="group flex items-start gap-3 rounded-2xl border border-ink-200/80 bg-white p-4 text-left shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:border-civic-600/50 hover:bg-civic-50/30 hover:shadow-card dark:border-[#262626] dark:bg-[#181818] dark:hover:border-[#238636]/50 dark:hover:bg-[#1f1f1f]"
                >
                  <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-civic-50 text-civic-700 transition-colors group-hover:bg-civic-700 group-hover:text-white dark:bg-[#238636]/15 dark:text-[#4ade80] dark:group-hover:bg-[#238636] dark:group-hover:text-white">
                    <Icon className="h-4.5 w-4.5" aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[10px] font-bold uppercase tracking-wider text-civic-700 dark:text-[#4ade80]">
                      {item.category}
                    </span>
                    <span className="mt-1 block text-xs font-semibold leading-snug text-ink-800 transition-colors group-hover:text-ink-950 dark:text-[#d4d4d4] dark:group-hover:text-white sm:text-[13px]">
                      {item.query}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </section>
    </main>
  );
}

"use client";

import { Loader2, Search, SendHorizonal, SlidersHorizontal, Sparkles } from "lucide-react";
import { useEffect, useRef } from "react";
import { Button, cn } from "@/components/ui";
import { CHAT_CONFIGURATIONS } from "@/lib/chat-config";

type ChatComposerProps = {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (content?: string) => void | Promise<void>;
  isGenerating: boolean;
  placeholder?: string;
  configuration?: string;
  onConfigurationChange?: (config: string) => void;
  variant?: "default" | "prominent";
};

export function ChatComposer({
  value,
  onChange,
  onSubmit,
  isGenerating,
  placeholder = "Ask about a local ordinance, penalty, permit requirement, or policy...",
  configuration = "hybrid_rerank",
  onConfigurationChange,
  variant = "default",
}: ChatComposerProps) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const isProminent = variant === "prominent";

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    const minHeight = isProminent ? 56 : 24;
    textarea.style.height = `${Math.max(minHeight, Math.min(textarea.scrollHeight, 220))}px`;
  }, [value, isProminent]);

  const submit = () => {
    if (!value.trim() || isGenerating) return;
    void onSubmit(value);
    onChange("");
    requestAnimationFrame(() => textareaRef.current?.focus());
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      if (!value.trim() || isGenerating) return;
      void onSubmit(value);
      onChange("");
      requestAnimationFrame(() => textareaRef.current?.focus());
    }
  };

  return (
    <div className="w-full max-w-3xl">
      <div
        className={cn(
          "transition-all duration-200 outline-none focus-within:outline-none focus-within:ring-0",
          isProminent
            ? "rounded-2xl sm:rounded-3xl border-2 border-ink-200/90 bg-white p-4 sm:p-5 shadow-[0_12px_40px_-12px_rgba(20,104,58,0.14),0_4px_16px_-4px_rgba(0,0,0,0.06)] hover:shadow-[0_18px_50px_-12px_rgba(20,104,58,0.2)] dark:border-[#2a2a2a] dark:bg-[#181818] dark:shadow-[0_12px_40px_-12px_rgba(0,0,0,0.7)]"
            : "rounded-2xl border border-ink-200/80 bg-white px-4 py-3.5 shadow-float dark:border-[#262626] dark:bg-[#181818] sm:px-5"
        )}
      >
        <div className="flex items-start gap-3">
          {isProminent && (
            <div className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-civic-50 text-civic-700 dark:bg-[#238636]/15 dark:text-[#4ade80]">
              <Search className="h-4.5 w-4.5" aria-hidden />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <textarea
              ref={textareaRef}
              value={value}
              onChange={(event) => onChange(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              rows={isProminent ? 2 : 1}
              className={cn(
                "w-full resize-none border-none bg-transparent font-medium leading-relaxed text-ink-900 outline-none ring-0 placeholder:text-ink-400 focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 dark:text-[#f3f3f3] dark:placeholder:text-[#737373]",
                isProminent
                  ? "min-h-[56px] text-base sm:text-lg placeholder:text-sm sm:placeholder:text-base"
                  : "max-h-[200px] text-sm sm:text-base"
              )}
              aria-label="Legal query input"
            />
          </div>
        </div>

        <div className={cn(
          "flex flex-wrap items-center justify-between gap-2 border-t border-ink-100 dark:border-[#262626]",
          isProminent ? "mt-3.5 pt-3" : "mt-3 pt-2.5"
        )}>
          <div className="flex flex-wrap items-center gap-2">
            {onConfigurationChange ? (
              <label className="inline-flex items-center gap-1.5 rounded-lg border border-ink-200/80 bg-ink-50/70 px-2.5 py-1 text-[11px] font-semibold text-ink-700 transition hover:border-civic-500/40 dark:border-[#262626] dark:bg-[#202020] dark:text-[#d4d4d4]">
                <SlidersHorizontal className="h-3 w-3 text-civic-700 dark:text-[#4ade80]" aria-hidden />
                <span className="sr-only">Retrieval Mode</span>
                <select
                  value={configuration}
                  onChange={(e) => onConfigurationChange(e.target.value)}
                  className="cursor-pointer bg-transparent font-semibold text-ink-800 outline-none dark:bg-[#202020] dark:text-[#f3f3f3]"
                  aria-label="Retrieval mode"
                >
                  {CHAT_CONFIGURATIONS.map((cfg) => (
                    <option key={cfg.value} value={cfg.value}>
                      {cfg.label}
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-civic-700 dark:text-[#4ade80]">
                <Sparkles className="h-3 w-3" aria-hidden />
                Dense Vector + BM25 Hybrid Grounding
              </span>
            )}
            <span className="hidden text-[11px] font-medium text-ink-400 dark:text-[#888888] sm:inline">
              · Press <kbd className="rounded border border-ink-200 bg-ink-50 px-1 py-0.5 text-[10px] font-semibold text-ink-600 dark:border-[#262626] dark:bg-[#202020] dark:text-[#d4d4d4]">Enter</kbd> to search
            </span>
          </div>
          <Button
            type="button"
            variant="default"
            size="default"
            onClick={submit}
            disabled={!value.trim() || isGenerating}
            className={cn(
              "font-semibold transition-all duration-150",
              isProminent ? "h-10 px-5 rounded-xl text-xs sm:text-sm shadow-sm hover:shadow" : "rounded-xl text-xs"
            )}
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                <span>Searching…</span>
              </>
            ) : (
              <>
                <span>Search Ordinances</span>
                <SendHorizonal className="h-3.5 w-3.5" aria-hidden />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

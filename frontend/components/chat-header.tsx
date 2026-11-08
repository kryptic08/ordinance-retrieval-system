"use client";

import { Landmark, MessageSquarePlus } from "lucide-react";
import { CHAT_CONFIGURATIONS } from "@/lib/chat-config";

type ChatHeaderProps = {
  onNewConversation: () => void;
  configuration: string;
  onConfigurationChange: (value: string) => void;
};

export function ChatHeader({ onNewConversation, configuration, onConfigurationChange }: ChatHeaderProps) {
  return (
    <header className="sticky top-0 z-30 border-b border-paper-300 bg-paper-50/95 backdrop-blur">
      <div className="container-page flex h-14 items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-civic-700 text-paper-50">
            <Landmark className="h-4 w-4" aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-ink-900">Local Ordinance Library</p>
            <p className="text-[11px] font-medium uppercase tracking-wider text-civic-700">AI assistant</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <label className="hidden items-center gap-2 rounded-full border border-paper-300 bg-white px-3 py-1.5 text-xs font-medium text-ink-700 sm:flex">
            <span className="sr-only">Assistant mode</span>
            <select
              value={configuration}
              onChange={(event) => onConfigurationChange(event.target.value)}
              className="bg-transparent outline-none"
            >
              {CHAT_CONFIGURATIONS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={onNewConversation}
            className="inline-flex min-h-[36px] items-center gap-1.5 rounded-full border border-civic-700/20 bg-civic-50 px-3 py-1.5 text-xs font-semibold text-civic-800 transition hover:bg-civic-100"
          >
            <MessageSquarePlus className="h-3.5 w-3.5" aria-hidden />
            New conversation
          </button>
        </div>
      </div>
    </header>
  );
}

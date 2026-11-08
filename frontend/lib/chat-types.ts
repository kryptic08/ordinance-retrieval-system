import type { AnswerBlock, SearchResult } from "@/lib/types";

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  status: "complete" | "generating" | "error";
  answer?: AnswerBlock | null;
  results?: SearchResult[];
  tookMs?: number;
  configuration?: string;
};

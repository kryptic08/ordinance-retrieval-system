export const CHAT_CONFIGURATIONS = [
  { value: "hybrid", label: "Hybrid (recommended)" },
  { value: "keyword", label: "Keyword only" },
  { value: "vector", label: "Semantic only" },
  { value: "hybrid_rerank", label: "Hybrid + reranking" },
] as const;

import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

/**
 * OrdiSearch Convex Database Schema
 * Municipality of Polangui Ordinance & Policy Retrieval System
 */
export default defineSchema({
  documents: defineTable({
    title: v.string(),
    ordinance_number: v.optional(v.string()),
    document_type: v.string(), // "Ordinance" | "Resolution" | "Executive Order"
    year: v.optional(v.number()),
    date_enacted: v.optional(v.string()),
    jurisdiction: v.optional(v.string()), // e.g. "Municipality of Polangui, Albay"
    lgu: v.optional(v.string()),
    status: v.string(), // "uploaded" | "processing" | "review" | "active" | "archived"
    category: v.optional(v.string()),
    is_active: v.boolean(),
    page_count: v.number(),
    section_count: v.number(),
    embedding_model: v.optional(v.string()),
    notes: v.optional(v.string()),
    created_at: v.number(),
    updated_at: v.number(),
  })
    .index("by_status", ["status"])
    .index("by_active", ["is_active"])
    .index("by_year", ["year"])
    .index("by_ordinance_number", ["ordinance_number"])
    .searchIndex("search_title", {
      searchField: "title",
      filterFields: ["is_active", "year"],
    }),

  sections: defineTable({
    document_id: v.id("documents"),
    section_number: v.optional(v.string()),
    section_type: v.string(), // "Section" | "Article" | "Whereas" | "Penalty"
    heading: v.optional(v.string()),
    raw_text: v.string(),
    normalized_text: v.string(),
    corrected_text: v.optional(v.string()),
    page_start: v.number(),
    page_end: v.number(),
    verification_status: v.string(), // "verified" | "unverified"
    chunk_count: v.number(),
    created_at: v.number(),
  })
    .index("by_document", ["document_id"])
    .index("by_doc_section", ["document_id", "section_number"])
    .searchIndex("search_section_text", {
      searchField: "normalized_text",
      filterFields: ["document_id"],
    }),

  chunks: defineTable({
    document_id: v.id("documents"),
    section_id: v.id("sections"),
    chunk_index: v.number(),
    text: v.string(),
    excerpt: v.string(),
    page_start: v.number(),
    page_end: v.number(),
    embedding: v.optional(v.array(v.float64())),
    vector_score: v.optional(v.float64()),
    keyword_score: v.optional(v.float64()),
    created_at: v.number(),
  })
    .index("by_document", ["document_id"])
    .index("by_section", ["section_id"])
    .searchIndex("search_chunk_text", {
      searchField: "text",
      filterFields: ["document_id"],
    })
    .vectorIndex("by_embedding", {
      vectorField: "embedding",
      dimensions: 384, // BAAI/bge-small-en-v1.5 embedding dimension
      filterFields: ["document_id"],
    }),

  chat_sessions: defineTable({
    session_id: v.string(),
    title: v.string(),
    configuration: v.optional(v.string()),
    created_at: v.number(),
    updated_at: v.number(),
  }).index("by_session_id", ["session_id"]),

  chat_messages: defineTable({
    session_id: v.string(),
    role: v.string(), // "user" | "assistant"
    content: v.string(),
    took_ms: v.optional(v.number()),
    configuration: v.optional(v.string()),
    results: v.optional(v.any()),
    answer: v.optional(v.any()),
    created_at: v.number(),
  }).index("by_session_id", ["session_id"]),

  benchmark_queries: defineTable({
    query_text: v.string(),
    category: v.optional(v.string()),
    expected_sections: v.optional(v.array(v.string())),
    notes: v.optional(v.string()),
    created_at: v.number(),
  }),

  audit_logs: defineTable({
    action: v.string(),
    actor_id: v.string(),
    target_id: v.optional(v.string()),
    target_type: v.optional(v.string()),
    details: v.optional(v.string()),
    ip_address: v.optional(v.string()),
    timestamp: v.number(),
  }).index("by_action", ["action"]),
});

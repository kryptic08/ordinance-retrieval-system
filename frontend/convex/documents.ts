import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

/**
 * OrdiSearch Document Queries and Mutations
 */
export const list = query({
  args: {
    activeOnly: v.optional(v.boolean()),
    year: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let docs = await ctx.db.query("documents").collect();

    if (args.activeOnly) {
      docs = docs.filter((d) => d.is_active);
    }
    if (args.year) {
      docs = docs.filter((d) => d.year === args.year);
    }

    return docs.sort((a, b) => b.created_at - a.created_at);
  },
});

export const getById = query({
  args: { id: v.id("documents") },
  handler: async (ctx, args) => {
    const doc = await ctx.db.get(args.id);
    if (!doc) return null;

    const sections = await ctx.db
      .query("sections")
      .withIndex("by_document", (q) => q.eq("document_id", args.id))
      .collect();

    return {
      ...doc,
      sections: sections.sort((a, b) => a.page_start - b.page_start),
    };
  },
});

export const create = mutation({
  args: {
    title: v.string(),
    ordinance_number: v.optional(v.string()),
    document_type: v.string(),
    year: v.optional(v.number()),
    date_enacted: v.optional(v.string()),
    jurisdiction: v.optional(v.string()),
    lgu: v.optional(v.string()),
    status: v.string(),
    is_active: v.boolean(),
    page_count: v.number(),
    section_count: v.number(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("documents", {
      ...args,
      jurisdiction: args.jurisdiction || "Municipality of Polangui, Albay",
      lgu: args.lgu || "Polangui, Albay",
      created_at: now,
      updated_at: now,
    });
  },
});

export const addSection = mutation({
  args: {
    document_id: v.id("documents"),
    section_number: v.optional(v.string()),
    section_type: v.string(),
    heading: v.optional(v.string()),
    raw_text: v.string(),
    normalized_text: v.string(),
    corrected_text: v.optional(v.string()),
    page_start: v.number(),
    page_end: v.number(),
    verification_status: v.string(),
    chunk_count: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("sections", {
      ...args,
      created_at: Date.now(),
    });
  },
});

import { query } from "./_generated/server";
import { v } from "convex/values";

/**
 * OrdiSearch Cloud Search Implementation
 * Direct serverless retrieval over ordinances, sections, and chunks in Convex
 */
export const searchSections = query({
  args: {
    queryText: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 10;
    if (!args.queryText.trim()) return [];

    const sections = await ctx.db
      .query("sections")
      .withSearchIndex("search_section_text", (q) =>
        q.search("normalized_text", args.queryText)
      )
      .take(limit);

    // Enrich with document metadata
    const results = await Promise.all(
      sections.map(async (sec) => {
        const doc = await ctx.db.get(sec.document_id);
        return {
          id: sec._id,
          document_id: sec.document_id,
          document_title: doc?.title ?? "Official Ordinance",
          ordinance_number: doc?.ordinance_number ?? "N/A",
          year: doc?.year,
          jurisdiction: doc?.jurisdiction ?? "Municipality of Polangui, Albay",
          section_number: sec.section_number ?? "Provisions",
          heading: sec.heading ?? "",
          text: sec.corrected_text || sec.normalized_text || sec.raw_text,
          page_start: sec.page_start,
          page_end: sec.page_end,
          score: 0.95,
        };
      })
    );

    return results;
  },
});

export const searchDocuments = query({
  args: {
    searchTerm: v.string(),
    year: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    if (!args.searchTerm.trim()) {
      let q = ctx.db.query("documents");
      if (args.year) {
        return (await q.collect()).filter((d) => d.year === args.year);
      }
      return await q.take(20);
    }

    return await ctx.db
      .query("documents")
      .withSearchIndex("search_title", (q) =>
        q.search("title", args.searchTerm)
      )
      .take(15);
  },
});

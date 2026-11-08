import { query } from "./_generated/server";

/**
 * Live Corpus Trust Metrics for OrdiSearch
 */
export const publicStats = query({
  args: {},
  handler: async (ctx) => {
    const [docs, sections, chunks] = await Promise.all([
      ctx.db.query("documents").collect(),
      ctx.db.query("sections").collect(),
      ctx.db.query("chunks").collect(),
    ]);

    const activeDocs = docs.filter((d) => d.is_active);

    return {
      active_documents: activeDocs.length,
      indexed_sections: sections.length,
      indexed_chunks: chunks.length,
    };
  },
});

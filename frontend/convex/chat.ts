import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

/**
 * Convex Chat Session and Message Persistence for OrdiSearch
 * Cloud Database integration for deployed production environments
 */
export const saveMessage = mutation({
  args: {
    sessionId: v.string(),
    role: v.string(),
    content: v.string(),
    tookMs: v.optional(v.number()),
    configuration: v.optional(v.string()),
    results: v.optional(v.any()),
    answer: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const existingSession = await ctx.db
      .query("chat_sessions")
      .withIndex("by_session_id", (q) => q.eq("session_id", args.sessionId))
      .first();

    const now = Date.now();
    if (!existingSession) {
      await ctx.db.insert("chat_sessions", {
        session_id: args.sessionId,
        title: args.content.slice(0, 60),
        configuration: args.configuration,
        created_at: now,
        updated_at: now,
      });
    } else {
      await ctx.db.patch(existingSession._id, {
        updated_at: now,
      });
    }

    return await ctx.db.insert("chat_messages", {
      session_id: args.sessionId,
      role: args.role,
      content: args.content,
      took_ms: args.tookMs,
      configuration: args.configuration,
      results: args.results,
      answer: args.answer,
      created_at: now,
    });
  },
});

export const getMessages = query({
  args: { sessionId: v.string() },
  handler: async (ctx, args) => {
    const messages = await ctx.db
      .query("chat_messages")
      .withIndex("by_session_id", (q) => q.eq("session_id", args.sessionId))
      .collect();

    return messages.sort((a, b) => a.created_at - b.created_at);
  },
});

export const listSessions = query({
  args: {},
  handler: async (ctx) => {
    const sessions = await ctx.db.query("chat_sessions").collect();
    return sessions.sort((a, b) => b.updated_at - a.updated_at);
  },
});

export const clearSession = mutation({
  args: { sessionId: v.string() },
  handler: async (ctx, args) => {
    const messages = await ctx.db
      .query("chat_messages")
      .withIndex("by_session_id", (q) => q.eq("session_id", args.sessionId))
      .collect();

    for (const msg of messages) {
      await ctx.db.delete(msg._id);
    }

    const session = await ctx.db
      .query("chat_sessions")
      .withIndex("by_session_id", (q) => q.eq("session_id", args.sessionId))
      .first();

    if (session) {
      await ctx.db.delete(session._id);
    }

    return { deleted: messages.length };
  },
});

"use client";

import { ReactNode, useMemo } from "react";
import { ConvexProvider, ConvexReactClient } from "convex/react";

/**
 * ConvexClientProvider provides real-time reactive access to Convex database.
 * If NEXT_PUBLIC_CONVEX_URL is not yet configured, it renders gracefully.
 */
export function ConvexClientProvider({ children }: { children: ReactNode }) {
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;

  const convex = useMemo(() => {
    if (!convexUrl || !convexUrl.startsWith("http")) {
      return null;
    }
    try {
      return new ConvexReactClient(convexUrl);
    } catch (e) {
      console.warn("Failed to initialize Convex client:", e);
      return null;
    }
  }, [convexUrl]);

  if (!convex) {
    // When Convex is not yet connected via `npx convex dev`, children render seamlessly
    return <>{children}</>;
  }

  return <ConvexProvider client={convex}>{children}</ConvexProvider>;
}

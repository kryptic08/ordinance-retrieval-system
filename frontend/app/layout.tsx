import type { Metadata } from "next";
import { Inter, Newsreader } from "next/font/google";
import { ConvexClientProvider } from "@/components/convex-client-provider";
import { ThemeProvider } from "@/components/theme-provider";
import { ensurePublicArchitectureAssets } from "@/lib/init-public-assets";
import "./globals.css";

// Ensure public architecture assets exist when running locally in development
if (process.env.NODE_ENV !== "production" && !process.env.VERCEL) {
  try {
    ensurePublicArchitectureAssets();
  } catch {
    // ignore in serverless / restricted environments
  }
}

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const newsreader = Newsreader({
  subsets: ["latin"],
  style: ["normal", "italic"],
  variable: "--font-newsreader",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "OrdiSearch · Municipality of Polangui Ordinance & Policy Retrieval",
    template: "%s · OrdiSearch",
  },
  description:
    "OrdiSearch: Official local ordinance and policy retrieval system for the Municipality of Polangui, Province of Albay. Source-grounded semantic and keyword search with exact statutory citations.",
  icons: {
    icon: "/api/logo",
    shortcut: "/api/logo",
    apple: "/api/logo",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${inter.variable} ${newsreader.variable}`}>
      <body className="min-h-screen bg-background font-sans text-foreground antialiased selection:bg-civic-100 selection:text-civic-900 dark:selection:bg-emerald-900 dark:selection:text-emerald-100">
        <ConvexClientProvider>
          <ThemeProvider>{children}</ThemeProvider>
        </ConvexClientProvider>
      </body>
    </html>
  );
}

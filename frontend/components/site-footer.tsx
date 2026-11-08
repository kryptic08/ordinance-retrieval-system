import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-ink-200/70 bg-white/90 backdrop-blur-sm dark:border-[#262626] dark:bg-[#111111]/95">
      <div className="container-page flex flex-col sm:flex-row items-center justify-between gap-4 py-4 text-xs text-ink-600">
        {/* Left: Brand & copyright */}
        <div className="flex items-center gap-2.5">
          <BrandLogo size={26} />
          <span className="font-semibold text-ink-900 dark:text-[#f3f3f3]">OrdiSearch</span>
          <span className="hidden sm:inline text-ink-300 dark:text-[#404040]">·</span>
          <span className="text-ink-500 dark:text-[#888888] hidden sm:inline">Municipality of Polangui, Albay · Source-Grounded Civic Records</span>
        </div>

        {/* Right: Clean minimal links */}
        <nav className="flex flex-wrap items-center gap-x-5 gap-y-2 text-ink-500 font-medium" aria-label="Footer">
          <Link href="/" className="hover:text-civic-700 transition">
            Search
          </Link>
          <Link href="/documents" className="hover:text-civic-700 transition">
            Documents
          </Link>
          <Link href="/about" className="hover:text-civic-700 transition">
            Methodology
          </Link>
          <a
            href="/architecture-diagram.svg"
            target="_blank"
            rel="noreferrer"
            className="hover:text-civic-700 transition dark:hover:text-[#4ade80]"
            title="View & Download Inverted System Architecture Diagram"
          >
            System Architecture
          </a>
          <a href="/docs" target="_blank" rel="noreferrer" className="hover:text-civic-700 transition">
            API Docs
          </a>
          <Link href="/login" className="hover:text-civic-700 transition text-civic-700 font-semibold">
            Admin
          </Link>
        </nav>
      </div>
    </footer>
  );
}

"use client";

import { Menu, ShieldCheck, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import clsx from "clsx";
import { ThemeToggle } from "@/components/theme-toggle";

import { BrandLogo } from "@/components/brand-logo";

const links = [
  { href: "/", label: "Search" },
  { href: "/documents", label: "Document repository" },
  { href: "/about", label: "Methodology" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-40 border-b border-ink-200/80 bg-white/90 backdrop-blur-md transition-all dark:border-[#262626] dark:bg-[#111111]/95">
      <div className="container-page flex h-16 items-center justify-between gap-4">
        <Link href="/" className="group flex items-center gap-3" aria-label="OrdiSearch home">
          <BrandLogo size={40} showText={true} />
        </Link>
        <nav className="hidden items-center gap-1.5 md:flex" aria-label="Primary">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={clsx(
                "rounded-lg px-3.5 py-2 text-sm font-medium transition-all duration-150",
                pathname === link.href
                  ? "bg-civic-50 font-semibold text-civic-700 dark:bg-[#238636]/15 dark:text-[#4ade80]"
                  : "text-ink-600 hover:bg-ink-100 hover:text-ink-900 dark:text-[#a3a3a3] dark:hover:bg-[#202020] dark:hover:text-[#f3f3f3]",
              )}
            >
              {link.label}
            </Link>
          ))}
          <div className="ml-2 flex items-center gap-2 border-l border-ink-200 pl-3 dark:border-[#262626]">
            <ThemeToggle />
            <Link href="/login" className="btn-secondary !py-1.5 !text-xs font-semibold">
              <ShieldCheck className="h-3.5 w-3.5 text-civic-600 dark:text-[#4ade80]" aria-hidden />
              Admin Portal
            </Link>
          </div>
        </nav>
        <div className="flex items-center gap-2 md:hidden">
          <ThemeToggle />
          <button
            className="btn-ghost !p-2"
            onClick={() => setOpen((value) => !value)}
            aria-expanded={open}
            aria-label="Toggle navigation"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>
      {open ? (
        <nav
          className="border-t border-paper-300 bg-paper-50 px-4 py-3 dark:border-[#262626] dark:bg-[#181818] md:hidden"
          aria-label="Mobile"
        >
          <div className="flex flex-col gap-1">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-2 text-sm font-medium text-ink-700 hover:bg-paper-100 dark:text-[#d4d4d4] dark:hover:bg-[#202020]"
              >
                {link.label}
              </Link>
            ))}
            <Link
              href="/login"
              onClick={() => setOpen(false)}
              className="rounded-lg px-3 py-2 text-sm font-semibold text-civic-700 hover:bg-paper-100 dark:text-[#4ade80] dark:hover:bg-[#202020]"
            >
              Administration
            </Link>
          </div>
        </nav>
      ) : null}
    </header>
  );
}

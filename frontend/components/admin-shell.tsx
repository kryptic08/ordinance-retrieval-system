"use client";

import {
  Activity,
  BarChart3,
  ClipboardCheck,
  FileStack,
  Gauge,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  ShieldCheck,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import clsx from "clsx";
import { api, ApiError } from "@/lib/api";
import type { User } from "@/lib/types";
import { Spinner } from "./ui";
import { ThemeToggle } from "./theme-toggle";

import { BrandLogo } from "@/components/brand-logo";

const NAV = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/documents", label: "Documents", icon: FileStack },
  { href: "/admin/queries", label: "Benchmark queries", icon: ClipboardCheck },
  { href: "/admin/evaluation", label: "Evaluation", icon: BarChart3 },
  { href: "/admin/quality", label: "Quality survey", icon: Gauge },
  { href: "/admin/settings", label: "Settings", icon: Settings },
  { href: "/admin/audit", label: "Audit log", icon: Activity },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [checked, setChecked] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    api
      .me()
      .then(setUser)
      .catch((error) => {
        if (error instanceof ApiError && error.status === 401) router.replace("/login");
        else router.replace("/login");
      })
      .finally(() => setChecked(true));
  }, [router]);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const logout = async () => {
    try {
      await api.logout();
    } finally {
      router.replace("/login");
    }
  };

  if (!checked) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-paper-50 dark:bg-[#111111]">
        <Spinner label="Checking session…" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-ink-50 dark:bg-[#111111] lg:grid lg:grid-cols-[250px_minmax(0,1fr)]">
      <a
        href="#main-content"
        className="sr-only z-50 rounded-lg bg-civic-600 px-4 py-2 text-sm font-semibold text-white focus:not-sr-only focus:absolute focus:left-4 focus:top-4"
      >
        Skip to main content
      </a>
      <aside
        className={clsx(
          "fixed inset-y-0 left-0 z-50 flex w-72 flex-col bg-ink-950 text-white transition-transform lg:static lg:w-auto lg:translate-x-0 border-r border-ink-800/60 dark:bg-[#141414] dark:border-[#262626]",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-16 items-center justify-between gap-2 border-b border-ink-800/80 px-4 dark:border-[#262626]">
          <Link href="/admin" className="flex items-center gap-2.5 group">
            <BrandLogo size={32} />
            <span className="leading-tight">
              <span className="block text-sm font-semibold text-white">OrdiSearch Admin</span>
              <span className="block text-[10px] font-semibold uppercase tracking-[0.14em] text-civic-400">
                Polangui, Albay
              </span>
            </span>
          </Link>
          <button className="text-ink-400 hover:text-white lg:hidden" onClick={() => setOpen(false)} aria-label="Close menu">
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4" aria-label="Admin">
          {NAV.map((item) => {
            const active = item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={clsx(
                  "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150",
                  active
                    ? "bg-civic-600 text-white shadow-sm font-semibold"
                    : "text-ink-300 hover:bg-ink-900 hover:text-white dark:hover:bg-[#202020]",
                )}
              >
                <item.icon className="h-4 w-4" aria-hidden />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-ink-800/80 p-3 dark:border-[#262626]">
          <Link
            href="/"
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-ink-300 hover:bg-ink-900 hover:text-white transition dark:hover:bg-[#202020]"
          >
            <ShieldCheck className="h-4 w-4 text-civic-400" aria-hidden />
            View Public Search
          </Link>
          <div className="mt-2 rounded-lg bg-ink-900/90 border border-ink-800/60 p-3 dark:border-[#262626] dark:bg-[#181818]">
            <p className="truncate text-xs font-semibold text-white">{user.full_name}</p>
            <p className="truncate text-[11px] text-ink-400">{user.email}</p>
            <div className="mt-2.5 flex items-center justify-between pt-2 border-t border-ink-800/50 dark:border-[#262626]">
              <span className="rounded bg-civic-950/80 border border-civic-800 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-civic-300">
                {user.role}
              </span>
              <button onClick={logout} className="inline-flex items-center gap-1 text-[11px] font-medium text-ink-400 hover:text-rust-400 transition">
                <LogOut className="h-3 w-3" />
                Sign out
              </button>
            </div>
          </div>
        </div>
      </aside>

      {open ? <div className="fixed inset-0 z-40 bg-ink-900/40 lg:hidden" onClick={() => setOpen(false)} /> : null}

      <div className="flex min-w-0 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-paper-300 bg-paper-50/95 px-4 backdrop-blur dark:border-[#262626] dark:bg-[#141414]/95 lg:px-8">
          <div className="flex items-center gap-2">
            <button className="btn-ghost !px-2 lg:hidden" onClick={() => setOpen(true)} aria-label="Open menu">
              <Menu className="h-5 w-5" />
            </button>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-600 dark:text-[#a3a3a3]">Administration</p>
              <p className="text-sm font-medium text-ink-900 dark:text-[#f3f3f3]">
                {NAV.find((item) => (item.href === "/admin" ? pathname === item.href : pathname.startsWith(item.href)))?.label ||
                  "Workspace"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <ThemeToggle />
            <span className="hidden text-xs text-ink-600 dark:text-[#a3a3a3] sm:inline">{user.email}</span>
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-civic-700 text-xs font-semibold text-white">
              {user.full_name?.slice(0, 1).toUpperCase() || "A"}
            </span>
          </div>
        </header>
        <main id="main-content" className="min-w-0 flex-1 px-4 py-6 lg:px-8 lg:py-8">{children}</main>
      </div>
    </div>
  );
}

"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "@/components/theme-provider";

export function ThemeToggle() {
  const { theme, resolvedTheme, setTheme, toggleTheme } = useTheme();

  return (
    <div className="inline-flex items-center rounded-xl border border-ink-200/80 bg-ink-50/80 p-0.5 dark:border-[#262626] dark:bg-[#202020]">
      <button
        type="button"
        onClick={() => setTheme("light")}
        title="Light mode"
        aria-label="Switch to light mode"
        className={`inline-flex h-7 w-7 items-center justify-center rounded-lg text-xs transition ${
          theme === "light" || (theme === "system" && resolvedTheme === "light")
            ? "bg-white text-amber-600 shadow-2xs dark:bg-[#141414] dark:text-amber-400"
            : "text-ink-500 hover:text-ink-900 dark:text-[#888888] dark:hover:text-white"
        }`}
      >
        <Sun className="h-3.5 w-3.5" aria-hidden />
      </button>
      <button
        type="button"
        onClick={() => setTheme("dark")}
        title="Dark mode"
        aria-label="Switch to dark mode"
        className={`inline-flex h-7 w-7 items-center justify-center rounded-lg text-xs transition ${
          theme === "dark" || (theme === "system" && resolvedTheme === "dark")
            ? "bg-white text-emerald-600 shadow-2xs dark:bg-[#141414] dark:text-[#4ade80]"
            : "text-ink-500 hover:text-ink-900 dark:text-[#888888] dark:hover:text-white"
        }`}
      >
        <Moon className="h-3.5 w-3.5" aria-hidden />
      </button>
      <button
        type="button"
        onClick={toggleTheme}
        title="Toggle theme"
        className="sr-only"
      >
        <Monitor className="h-3.5 w-3.5" aria-hidden />
      </button>
    </div>
  );
}

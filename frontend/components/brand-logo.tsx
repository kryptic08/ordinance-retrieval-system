"use client";

import { useState } from "react";
import { Landmark } from "lucide-react";

interface BrandLogoProps {
  size?: number;
  className?: string;
  showText?: boolean;
  textClassName?: string;
  subtextClassName?: string;
  invertOnDark?: boolean;
}

export function BrandLogo({
  size = 36,
  className = "",
  showText = false,
  textClassName = "",
  subtextClassName = "",
}: BrandLogoProps) {
  const [imageError, setImageError] = useState(false);

  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <div
        className="relative flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-gold-500/30 bg-white shadow-xs transition-transform duration-200 group-hover:scale-105 dark:border-gold-500/40 dark:bg-[#181818]"
        style={{ width: size, height: size }}
      >
        {!imageError ? (
          /* Using /api/logo ensures the official Polangui seal is streamed directly */
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src="/api/logo"
            alt="Municipality of Polangui, Albay Seal"
            width={size}
            height={size}
            className="h-full w-full object-contain p-0.5"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-civic-700 text-white dark:bg-[#238636]">
            <Landmark style={{ width: size * 0.55, height: size * 0.55 }} aria-hidden />
          </div>
        )}
      </div>

      {showText && (
        <div className="leading-tight">
          <span
            className={`block font-serif text-[16px] font-bold tracking-tight text-ink-950 dark:text-[#f3f3f3] ${textClassName}`}
          >
            OrdiSearch
          </span>
          <span
            className={`block text-[10px] font-bold uppercase tracking-[0.14em] text-civic-700 dark:text-[#4ade80] ${subtextClassName}`}
          >
            Municipality of Polangui · Albay
          </span>
        </div>
      )}
    </div>
  );
}

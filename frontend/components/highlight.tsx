import type { ReactNode } from "react";

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function HighlightedText({
  text,
  terms,
}: {
  text: string;
  terms: string[];
}): ReactNode {
  const cleaned = Array.from(new Set(terms.filter((term) => term && term.length > 1))).sort(
    (a, b) => b.length - a.length,
  );
  if (cleaned.length === 0) return text;
  const pattern = new RegExp(`(${cleaned.map(escapeRegex).join("|")})`, "gi");
  const parts = text.split(pattern);
  return (
    <>
      {parts.map((part, index) =>
        index % 2 === 1 ? (
          <mark
            key={index}
            className="rounded bg-gold-100 px-1 py-0.5 font-medium text-ink-950 dark:bg-amber-500/30 dark:text-amber-200"
          >
            {part}
          </mark>
        ) : (
          <span key={index}>{part}</span>
        ),
      )}
    </>
  );
}

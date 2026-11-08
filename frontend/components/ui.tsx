import clsx, { type ClassValue } from "clsx";
import { AlertCircle, CheckCircle2, Loader2, SearchX } from "lucide-react";
import type { ButtonHTMLAttributes, HTMLAttributes, InputHTMLAttributes, ReactNode } from "react";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

/* -------------------------------------------------------------------------- */
/* shadcn/ui Button                                                           */
/* -------------------------------------------------------------------------- */
export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "secondary" | "outline" | "ghost" | "destructive" | "civic";
  size?: "default" | "sm" | "lg" | "icon";
}

export function Button({
  className,
  variant = "default",
  size = "default",
  type = "button",
  ...props
}: ButtonProps) {
  const variants = {
    default:
      "bg-civic-700 text-white shadow-xs hover:bg-civic-800 dark:bg-[#238636] dark:text-white dark:hover:bg-[#2ea043]",
    civic:
      "bg-civic-600 text-white shadow-xs hover:bg-civic-700 dark:bg-[#238636] dark:text-white dark:hover:bg-[#2ea043]",
    secondary:
      "bg-ink-100 text-ink-900 hover:bg-ink-200/80 dark:bg-[#202020] dark:text-[#f3f3f3] dark:hover:bg-[#262626]",
    outline:
      "border border-ink-200 bg-white text-ink-800 shadow-2xs hover:bg-ink-50 hover:text-ink-950 dark:border-[#262626] dark:bg-[#181818] dark:text-[#d4d4d4] dark:hover:bg-[#202020] dark:hover:text-[#f3f3f3]",
    ghost:
      "text-ink-600 hover:bg-ink-100 hover:text-ink-900 dark:text-[#888888] dark:hover:bg-[#202020] dark:hover:text-[#f3f3f3]",
    destructive:
      "bg-rust-600 text-white shadow-xs hover:bg-rust-700 dark:bg-[#da3633] dark:hover:bg-[#f85149]",
  };

  const sizes = {
    default: "h-10 px-4 py-2 text-sm rounded-xl",
    sm: "h-8 px-3 text-xs rounded-lg",
    lg: "h-11 px-6 text-base rounded-xl",
    icon: "h-9 w-9 rounded-lg",
  };

  return (
    <button
      type={type}
      className={cn(
        "inline-flex items-center justify-center gap-2 font-semibold transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-civic-500 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]",
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    />
  );
}

/* -------------------------------------------------------------------------- */
/* shadcn/ui Card                                                             */
/* -------------------------------------------------------------------------- */
export function Card({
  children,
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "surface rounded-2xl border border-ink-200/80 bg-white text-ink-950 shadow-card dark:border-[#262626] dark:bg-[#181818] dark:text-[#f3f3f3]",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex flex-col space-y-1.5 p-6", className)} {...props} />;
}

export function CardTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn("font-serif text-xl font-semibold leading-none tracking-tight text-ink-950 dark:text-[#f3f3f3]", className)}
      {...props}
    />
  );
}

export function CardDescription({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("text-xs text-ink-500 dark:text-[#888888]", className)} {...props} />;
}

export function CardContent({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-6 pt-0", className)} {...props} />;
}

export function CardFooter({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex items-center p-6 pt-0", className)} {...props} />;
}

/* -------------------------------------------------------------------------- */
/* shadcn/ui Badge                                                            */
/* -------------------------------------------------------------------------- */
export function Badge({
  children,
  tone = "neutral",
  className,
}: {
  children: ReactNode;
  tone?: "neutral" | "civic" | "gold" | "rust" | "blue" | "emerald" | "outline";
  className?: string;
}) {
  const tones = {
    neutral:
      "border-ink-200 bg-ink-100 text-ink-700 dark:border-[#262626] dark:bg-[#202020] dark:text-[#d4d4d4]",
    outline:
      "border-ink-300 bg-transparent text-ink-700 dark:border-[#262626] dark:text-[#d4d4d4]",
    civic:
      "border-civic-500/25 bg-civic-50 text-civic-700 font-semibold dark:border-[#238636]/30 dark:bg-[#238636]/15 dark:text-[#4ade80]",
    gold:
      "border-gold-500/30 bg-gold-50 text-gold-700 font-semibold dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300",
    rust:
      "border-rust-600/30 bg-rust-50 text-rust-700 font-semibold dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300",
    blue:
      "border-blue-300 bg-blue-50 text-blue-700 font-semibold dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-300",
    emerald:
      "border-emerald-500/30 bg-emerald-50 text-emerald-700 font-semibold dark:border-[#238636]/30 dark:bg-[#238636]/15 dark:text-[#4ade80]",
  };
  return <span className={cn("badge", tones[tone], className)}>{children}</span>;
}

/* -------------------------------------------------------------------------- */
/* shadcn/ui Input, Separator, Skeleton                                       */
/* -------------------------------------------------------------------------- */
export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn("input", className)} {...props} />;
}

export function Separator({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      role="separator"
      className={cn("h-[1px] w-full shrink-0 bg-ink-200/80 dark:bg-[#262626]", className)}
      {...props}
    />
  );
}

export function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-xl bg-ink-200/70 dark:bg-[#202020]", className)}
      {...props}
    />
  );
}

/* -------------------------------------------------------------------------- */
/* Feedback & Layout Primitives                                               */
/* -------------------------------------------------------------------------- */
export function Spinner({ label }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-2 text-sm font-medium text-ink-600 dark:text-[#d4d4d4]">
      <Loader2 className="h-4 w-4 animate-spin text-civic-600 dark:text-[#4ade80]" aria-hidden />
      {label || "Loading…"}
    </span>
  );
}

export function Alert({
  tone = "error",
  children,
  className,
}: {
  tone?: "error" | "success" | "info" | "warning";
  children: ReactNode;
  className?: string;
}) {
  const tones = {
    error:
      "border-rust-600/30 bg-rust-50/80 text-rust-700 dark:border-red-500/30 dark:bg-red-950/40 dark:text-red-300",
    success:
      "border-emerald-500/30 bg-emerald-50/80 text-emerald-700 dark:border-[#238636]/30 dark:bg-[#238636]/15 dark:text-[#4ade80]",
    info:
      "border-civic-500/30 bg-civic-50/80 text-civic-800 dark:border-[#238636]/30 dark:bg-[#238636]/15 dark:text-[#4ade80]",
    warning:
      "border-gold-500/30 bg-gold-50/80 text-gold-700 dark:border-amber-500/30 dark:bg-amber-950/40 dark:text-amber-300",
  };
  const Icon = tone === "success" ? CheckCircle2 : AlertCircle;
  return (
    <div
      className={cn("flex gap-2.5 rounded-xl border px-4 py-3 text-sm shadow-subtle", tones[tone], className)}
      role="status"
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <div>{children}</div>
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-paper-300 bg-paper-50 px-6 py-14 text-center dark:border-[#262626] dark:bg-[#141414]">
      <div className="rounded-full bg-paper-100 p-3 text-ink-600 dark:bg-[#202020] dark:text-[#d4d4d4]">
        <SearchX className="h-6 w-6" aria-hidden />
      </div>
      <h3 className="mt-4 font-serif text-xl font-semibold text-ink-900 dark:text-[#f3f3f3]">{title}</h3>
      <p className="mt-2 max-w-lg text-sm leading-6 text-ink-600 dark:text-[#888888]">{description}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function Field({
  label,
  hint,
  children,
  className,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("block", className)}>
      <span className="label">{label}</span>
      {children}
      {hint ? <span className="mt-1 block text-xs text-ink-600 dark:text-[#888888]">{hint}</span> : null}
    </label>
  );
}

export function SectionTitle({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 className="font-serif text-2xl font-semibold text-ink-900 dark:text-[#f3f3f3]">{title}</h2>
        {description ? (
          <p className="mt-1 max-w-2xl text-sm text-ink-600 dark:text-[#888888]">{description}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}

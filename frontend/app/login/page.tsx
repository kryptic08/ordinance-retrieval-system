"use client";

import { ArrowLeft, Loader2, Lock, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Alert, Field } from "@/components/ui";
import { BrandLogo } from "@/components/brand-logo";
import { api, ApiError } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await api.login(email.trim(), password);
      router.replace("/admin");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Sign in failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid min-h-screen bg-paper-50 dark:bg-[#111111] lg:grid-cols-[1.05fr_1fr]">
      <div className="relative hidden overflow-hidden bg-ink-900 dark:bg-[#141414] dark:border-r dark:border-[#262626] p-10 text-paper-50 lg:flex lg:flex-col lg:justify-between">
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 15%, rgba(63,138,110,0.55), transparent 45%), radial-gradient(circle at 80% 90%, rgba(184,137,47,0.35), transparent 40%)",
          }}
        />
        <Link href="/" className="relative flex items-center gap-3">
          <BrandLogo size={44} showText={true} textClassName="text-white" subtextClassName="text-civic-300" />
        </Link>
        <div className="relative max-w-md">
          <ShieldCheck className="h-8 w-8 text-gold-500" aria-hidden />
          <h1 className="mt-4 font-serif text-4xl font-semibold leading-tight">
            Stewardship of the public record.
          </h1>
          <p className="mt-4 text-sm leading-6 text-paper-50/75">
            The OrdiSearch administration area supports document intake, OCR review, metadata correction,
            activation, and evaluation for the Municipality of Polangui, Albay.
          </p>
        </div>
        <p className="relative text-xs text-paper-50/50">
          Authorized personnel only. Access is monitored.
        </p>
      </div>

      <div className="flex items-center justify-center px-5 py-12">
        <div className="w-full max-w-md">
          <Link href="/" className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-600 hover:text-civic-700">
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden /> Back to public search
          </Link>
          <div className="mt-6 flex items-center gap-3 lg:hidden">
            <BrandLogo size={40} showText={true} />
          </div>
          <h1 className="mt-8 font-serif text-3xl font-semibold text-ink-900 dark:text-[#f3f3f3]">Administrator sign in</h1>
          <p className="mt-2 text-sm leading-6 text-ink-600">
            Use the account configured for this deployment. Sessions are stored in an httpOnly cookie.
          </p>

          <form className="mt-6 space-y-4" onSubmit={submit}>
            {error ? <Alert>{error}</Alert> : null}
            <Field label="Email address">
              <input
                type="email"
                className="input"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="username"
                required
                autoFocus
              />
            </Field>
            <Field label="Password">
              <input
                type="password"
                className="input"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                required
              />
            </Field>
            <button className="btn-primary w-full" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Lock className="h-4 w-4" aria-hidden />}
              {loading ? "Signing in…" : "Sign in securely"}
            </button>
          </form>

          <p className="mt-6 text-xs leading-5 text-ink-600">
            Repeated failed attempts are rate-limited. Contact the system administrator if you need an
            account or have lost access.
          </p>
        </div>
      </div>
    </div>
  );
}

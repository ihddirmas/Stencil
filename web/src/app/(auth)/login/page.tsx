"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";
import { SiteHeader } from "@/components/SiteChrome";
import { createClient } from "@/lib/supabase/client";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/journal";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error: err } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (err) {
      setError(err.message);
      return;
    }
    router.push(next);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="mt-8 space-y-4">
      <label className="block text-sm font-semibold">
        Email
        <input
          required
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-1 w-full rounded-xl border border-[var(--line)] bg-white px-3 py-2.5"
        />
      </label>
      <label className="block text-sm font-semibold">
        Password
        <input
          required
          type="password"
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-1 w-full rounded-xl border border-[var(--line)] bg-white px-3 py-2.5"
        />
      </label>
      {error ? <p className="text-sm text-[var(--danger)]">{error}</p> : null}
      <button
        disabled={loading}
        className="w-full rounded-xl bg-[var(--leaf)] px-4 py-3 text-sm font-bold text-white disabled:opacity-60"
      >
        {loading ? "Signing in…" : "Log in"}
      </button>
      <p className="text-center text-sm text-[var(--ink-soft)]">
        No account?{" "}
        <Link className="font-semibold text-[var(--leaf)]" href="/signup">
          Sign up
        </Link>
      </p>
    </form>
  );
}

export default function LoginPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-md px-5 py-12">
        <h1 className="text-3xl font-bold text-[var(--leaf-deep)]">Welcome back</h1>
        <p className="mt-2 text-[var(--ink-soft)]">
          Log in to continue your stencil library and memory profile.
        </p>
        <Suspense>
          <LoginForm />
        </Suspense>
      </main>
    </>
  );
}

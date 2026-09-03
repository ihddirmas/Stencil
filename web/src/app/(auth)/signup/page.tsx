"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { SiteHeader } from "@/components/SiteChrome";
import { createClient } from "@/lib/supabase/client";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setInfo(null);
    const supabase = createClient();
    const { data, error: err } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { display_name: displayName || undefined } },
    });
    setLoading(false);
    if (err) {
      setError(err.message);
      return;
    }
    if (data.session) {
      router.push("/journal");
      router.refresh();
      return;
    }
    setInfo("Check your email to confirm your account, then log in.");
  }

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-md px-5 py-12">
        <h1 className="text-3xl font-bold text-[var(--leaf-deep)]">Create your Stencil</h1>
        <p className="mt-2 text-[var(--ink-soft)]">
          Save entries, stencils, and an evolving memory profile across sessions.
        </p>
        <form onSubmit={onSubmit} className="mt-8 space-y-4">
          <label className="block text-sm font-semibold">
            Display name
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="mt-1 w-full rounded-xl border border-[var(--line)] bg-white px-3 py-2.5"
            />
          </label>
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
          {info ? <p className="text-sm text-[var(--leaf)]">{info}</p> : null}
          <button
            disabled={loading}
            className="w-full rounded-xl bg-[var(--leaf)] px-4 py-3 text-sm font-bold text-white disabled:opacity-60"
          >
            {loading ? "Creating…" : "Sign up"}
          </button>
          <p className="text-center text-sm text-[var(--ink-soft)]">
            Already have an account?{" "}
            <Link className="font-semibold text-[var(--leaf)]" href="/login">
              Log in
            </Link>
          </p>
        </form>
      </main>
    </>
  );
}

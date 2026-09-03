"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { analyzeEntry } from "@/lib/analyze";
import { persistAnalyzeResult } from "@/lib/memory";
import { createClient } from "@/lib/supabase/client";
import type { AnalyzeSuccess, CrisisResponse, StencilRow } from "@/lib/types";
import { StencilView } from "@/components/StencilView";

const PLACEHOLDER = `Tue — Another week where I said yes to everything. I take on the fixing so nobody is disappointed.

Wed — Feedback wasn’t harsh but I spiralled: they think I’m incompetent. I should be further along.

Fri — I told Maya the truth about my capacity. Afterwards I sat with it.`;

export default function JournalPage() {
  const [text, setText] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [crisis, setCrisis] = useState<CrisisResponse | null>(null);
  const [latest, setLatest] = useState<StencilRow | null>(null);
  const [result, setResult] = useState<AnalyzeSuccess | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const body = text.trim();
    if (!body) {
      setStatus("Paste at least one diary entry.");
      return;
    }
    setLoading(true);
    setStatus("Finding your template…");
    setCrisis(null);
    setLatest(null);
    setResult(null);

    try {
      const analyzed = await analyzeEntry(body);
      if (analyzed.crisis_flag) {
        setCrisis(analyzed);
        setStatus("");
        return;
      }

      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in");

      const { stencil } = await persistAnalyzeResult(supabase, user.id, body, analyzed);
      setLatest(stencil as StencilRow);
      setResult(analyzed);
      setStatus("Saved to your library and memory.");
      setText("");
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main>
      <div className="animate-rise max-w-3xl">
        <p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--leaf)]">
          Write
        </p>
        <h1 className="mt-1 text-4xl font-bold text-[var(--leaf-deep)]">Journal</h1>
        <p className="mt-2 text-[var(--ink-soft)]">
          Paste entries. We stencil them, save the entry, update your library, and grow your
          memory profile.{" "}
          <Link href="/memory" className="font-semibold text-[var(--leaf)]">
            View memory →
          </Link>
        </p>

        <form onSubmit={onSubmit} className="mt-6">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={10}
            placeholder={PLACEHOLDER}
            className="w-full rounded-2xl border border-[var(--line)] bg-white/80 px-4 py-4 text-[15px] leading-7 shadow-sm outline-none focus:ring-2 focus:ring-[var(--leaf)]/30"
          />
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <button
              disabled={loading}
              className="rounded-xl bg-[var(--leaf)] px-5 py-2.5 text-sm font-bold text-white disabled:opacity-60"
            >
              {loading ? "Stenciling…" : "Stencil it"}
            </button>
            <p className="text-sm text-[var(--ink-soft)]">{status}</p>
          </div>
        </form>
      </div>

      {crisis ? (
        <section className="mt-8 max-w-2xl rounded-2xl border border-red-200 bg-[var(--danger-bg)] p-6">
          <h2 className="text-2xl font-semibold text-[var(--danger)]">We paused the templates</h2>
          <p className="mt-2">{crisis.message}</p>
          <ul className="mt-4 list-disc space-y-2 pl-5">
            {crisis.resources.map((r) => (
              <li key={r.name}>
                {r.url ? (
                  <a
                    className="font-semibold text-[var(--danger)] underline"
                    href={r.url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {r.name}
                  </a>
                ) : (
                  <strong>{r.name}</strong>
                )}
                {r.detail ? ` — ${r.detail}` : ""}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {result && latest ? (
        <section className="mt-10">
          <div className="mb-4 flex items-end justify-between gap-3">
            <h2 className="text-2xl font-semibold">Latest stencil</h2>
            <Link href="/entries" className="text-sm font-semibold text-[var(--leaf)]">
              All entries →
            </Link>
          </div>
          <StencilView result={result} />
        </section>
      ) : null}
    </main>
  );
}

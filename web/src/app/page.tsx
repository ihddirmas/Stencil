import Link from "next/link";
import { SiteHeader } from "@/components/SiteChrome";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function LandingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/journal");

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-5 pb-20 pt-8">
        <section className="animate-rise mx-auto max-w-3xl">
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.12em] text-[var(--leaf)]">
            A journaling agent with tools
          </p>
          <h1 className="text-5xl font-bold tracking-tight text-[var(--leaf-deep)] sm:text-6xl">
            Stencil
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-relaxed text-[var(--ink-soft)]">
            Chat with an agent that turns diary entries into evidence-based visual frameworks —
            then remembers patterns, searches your history, and grows a memory profile. Not another
            wall of AI markdown.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/signup"
              className="rounded-xl bg-[var(--leaf)] px-5 py-3 text-sm font-bold text-white shadow-md"
            >
              Create account
            </Link>
            <Link
              href="/login"
              className="rounded-xl border border-[var(--line)] bg-white/80 px-5 py-3 text-sm font-bold text-[var(--ink)]"
            >
              Log in
            </Link>
          </div>
        </section>

        <section className="animate-rise mt-16 grid gap-6 sm:grid-cols-3">
          {[
            {
              t: "Chat",
              d: "Talk to the agent — paste diary text, ask what it remembers, or search past entries.",
            },
            {
              t: "Stencil",
              d: "It calls tools to match a cited framework: quadrant maps, identity worksheets, CBT distortions, forgiveness prompts.",
            },
            {
              t: "Remember",
              d: "Entries, stencils, and memory notes persist. The agent reads your profile on later turns.",
            },
          ].map((card) => (
            <div
              key={card.t}
              className="rounded-2xl border border-[var(--line)] bg-white/70 p-5 shadow-sm"
            >
              <h2 className="text-xl font-semibold text-[var(--leaf-deep)]">{card.t}</h2>
              <p className="mt-2 text-sm leading-relaxed text-[var(--ink-soft)]">{card.d}</p>
            </div>
          ))}
        </section>

        <p className="mt-14 max-w-2xl text-sm text-[var(--ink-soft)]">
          Psychoeducational only — never diagnostic. Crisis language skips templates and
          surfaces resources instead. Frameworks cite established sources.
        </p>
      </main>
    </>
  );
}

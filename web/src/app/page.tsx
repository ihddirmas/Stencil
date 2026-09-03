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
            Journaling templates that evolve
          </p>
          <h1 className="text-5xl font-bold tracking-tight text-[var(--leaf-deep)] sm:text-6xl">
            Stencil
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-relaxed text-[var(--ink-soft)]">
            AI journaling leaves you with unsearchable markdown. Stencil turns your diary
            entries into evidence-based visual frameworks and editable worksheets — annotated
            with your own words, saved to a growing library and memory profile.
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
              t: "Paste",
              d: "Drop real diary entries — no mood scores, no 1–5 ratings.",
            },
            {
              t: "Stencil",
              d: "Matched to a cited framework: quadrant maps, identity worksheets, CBT distortions, forgiveness prompts.",
            },
            {
              t: "Remember",
              d: "Entries and stencils persist. Your memory profile evolves as patterns recur.",
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

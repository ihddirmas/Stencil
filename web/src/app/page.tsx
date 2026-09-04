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
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-[var(--leaf)] focus:px-3 focus:py-2 focus:text-white"
      >
        Skip to content
      </a>
      <SiteHeader />
      <main id="main" className="mx-auto max-w-6xl px-5 pb-24 pt-6">
        <section className="animate-rise relative overflow-hidden rounded-[2rem] border border-[var(--line)] bg-gradient-to-br from-[#e7f2ea] via-[#f7faf7] to-[#e8eef2] px-6 py-12 sm:px-10 sm:py-16">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-40"
            style={{
              backgroundImage:
                "radial-gradient(circle at 20% 20%, rgba(47,107,79,0.18), transparent 40%), radial-gradient(circle at 80% 0%, rgba(42,122,110,0.16), transparent 35%)",
            }}
          />
          <div className="relative max-w-2xl">
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.14em] text-[var(--leaf)]">
              Mental health · braindump → filled worksheets
            </p>
            <h1 className="text-5xl font-bold tracking-tight text-[var(--leaf-deep)] sm:text-6xl">
              Stencil
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-[var(--ink-soft)]">
              Generic Claude or GPT chats leave you with jumbled threads and DIY memory.
              Stencil is the agent that turns a daily braindump into{" "}
              <strong className="font-semibold text-[var(--ink)]">
                filled, visual therapy worksheets
              </strong>{" "}
              — CBT thought records, identity maps, forgiveness loops — so you never start from a
              blank form. Edit if you want; that updates your profile memory. Crisis-gated by design.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/signup"
                className="rounded-xl bg-[var(--leaf)] px-5 py-3 text-sm font-bold text-white shadow-md transition hover:bg-[var(--leaf-deep)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--leaf)]"
              >
                Start braindumping
              </Link>
              <Link
                href="/login"
                className="rounded-xl border border-[var(--line)] bg-white/80 px-5 py-3 text-sm font-bold text-[var(--ink)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--leaf)]"
              >
                Log in
              </Link>
              <a
                href="#safety"
                className="rounded-xl px-5 py-3 text-sm font-semibold text-[var(--leaf-deep)] underline-offset-4 hover:underline"
              >
                Safety model →
              </a>
            </div>
          </div>
        </section>

        <section className="animate-rise mt-16" aria-labelledby="problem-heading">
          <h2 id="problem-heading" className="text-3xl font-bold text-[var(--leaf-deep)]">
            Why not just use Claude or ChatGPT?
          </h2>
          <p className="mt-3 max-w-3xl text-[var(--ink-soft)]">
            People in distress already dump feelings into chats. Those chats don’t leave a{" "}
            <em>filled thought record</em>, a sticky visual, or a structured profile you can search
            next week. Blank therapy homework gets abandoned. Stencil meets you at the braindump and
            does the worksheet work — CBT, identity, self-compassion — with citations and memory
            that compounds.
          </p>
          <ul className="mt-6 grid gap-3 sm:grid-cols-3">
            {[
              {
                t: "Dump once",
                d: "Freeform diary. No blank forms to stare at.",
              },
              {
                t: "Agent fills it",
                d: "Named frameworks + fields from your quotes.",
              },
              {
                t: "Memory sticks",
                d: "Optional edits update your profile — not a chat scroll.",
              },
            ].map((item) => (
              <li
                key={item.t}
                className="rounded-2xl border border-[var(--line)] bg-white/70 p-5"
              >
                <h3 className="text-lg font-semibold text-[var(--leaf-deep)]">{item.t}</h3>
                <p className="mt-2 text-sm text-[var(--ink-soft)]">{item.d}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className="animate-rise mt-14" aria-labelledby="how-heading">
          <h2 id="how-heading" className="text-3xl font-bold text-[var(--leaf-deep)]">
            How the agent works
          </h2>
          <ol className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                n: "01",
                t: "Crisis gate",
                d: "Heuristic short-circuit before any generative stage. Verified 988 / Crisis Text / IASP resources — never invented hotlines.",
              },
              {
                n: "02",
                t: "PII minimization",
                d: "Emails, phones, and ID-like patterns redacted before model calls. Data minimization by default.",
              },
              {
                n: "03",
                t: "4-stage Claude pipeline",
                d: "Extract claims → match cited template → position/worksheet → exercise. Structured tool use with schema retries.",
              },
              {
                n: "04",
                t: "Output verification",
                d: "Citation allowlist, diagnostic-language scan, quote grounding. Soft-corrects unsafe citations.",
              },
              {
                n: "05",
                t: "Memory agent tools",
                d: "ToolLoopAgent can apply_stencil, get_memory, search_entries — durable profile, not a one-shot chat.",
              },
              {
                n: "06",
                t: "Render Workflows",
                d: "Optional durable orchestration: each stage is a retried Render Workflows task that scales to zero.",
              },
            ].map((step) => (
              <li
                key={step.n}
                className="rounded-2xl border border-[var(--line)] bg-white/70 p-5 transition hover:-translate-y-0.5 hover:shadow-sm"
              >
                <p className="text-xs font-bold tracking-[0.14em] text-[var(--teal)]">{step.n}</p>
                <h3 className="mt-1 text-xl font-semibold text-[var(--leaf-deep)]">{step.t}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[var(--ink-soft)]">{step.d}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="animate-rise mt-16" aria-labelledby="frameworks-heading">
          <h2 id="frameworks-heading" className="text-3xl font-bold text-[var(--leaf-deep)]">
            Evidence-based templates
          </h2>
          <p className="mt-2 max-w-2xl text-[var(--ink-soft)]">
            Not diagnoses — named frameworks with citations, filled with the writer’s own quotes.
          </p>
          <ul className="mt-6 grid gap-3 sm:grid-cols-2">
            {[
              "Consciousness × Agency quadrant maps",
              "CBT cognitive distortions / thought records (Beck; Burns)",
              "Identity shift: Who I Had to Be → Who I’m Becoming",
              "Self-forgiveness worksheets",
              "Conflict / drama-triangle style maps",
            ].map((item) => (
              <li
                key={item}
                className="flex gap-3 rounded-xl border border-[var(--line)] bg-white/60 px-4 py-3 text-sm"
              >
                <span aria-hidden className="mt-1 h-2 w-2 shrink-0 rounded-full bg-[var(--leaf)]" />
                {item}
              </li>
            ))}
          </ul>
        </section>

        <section
          id="safety"
          className="animate-rise mt-16 rounded-[2rem] border border-[var(--line)] bg-[var(--leaf-deep)] px-6 py-10 text-[#e8f0eb] sm:px-10"
          aria-labelledby="safety-heading"
        >
          <h2 id="safety-heading" className="text-3xl font-bold text-white">
            Feasibility & safety, by design
          </h2>
          <ul className="mt-5 grid gap-4 text-sm leading-relaxed sm:grid-cols-2">
            <li>
              <strong className="text-white">Psychoeducational only</strong> — system prompts forbid
              diagnosis, prescriptions, and clinical certainty.
            </li>
            <li>
              <strong className="text-white">Crisis short-circuit</strong> — generative pipeline never
              runs; verified US/international resources shown.
            </li>
            <li>
              <strong className="text-white">Supabase RLS</strong> — users only read/write their own
              entries, stencils, and memory notes.
            </li>
            <li>
              <strong className="text-white">Explainable stages</strong> — every stencil shows the
              pipeline trace and verification rationale in-product.
            </li>
          </ul>
        </section>

        <p className="mt-12 max-w-3xl text-sm text-[var(--ink-soft)]">
          Built for Hack for Humanity · Mental Health track. Not a diagnostic or therapeutic
          service. If you are in crisis, call or text 988 (US) or visit{" "}
          <a className="font-semibold text-[var(--leaf)] underline" href="https://988lifeline.org/">
            988lifeline.org
          </a>
          .
        </p>
      </main>
    </>
  );
}

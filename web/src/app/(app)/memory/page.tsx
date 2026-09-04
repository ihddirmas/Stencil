import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { MemoryNote, StencilRow } from "@/lib/types";

export default async function MemoryPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user!.id)
    .maybeSingle();

  const { data: notes } = await supabase
    .from("memory_notes")
    .select("*")
    .eq("user_id", user!.id)
    .order("updated_at", { ascending: false })
    .limit(100);

  const { data: recentStencils } = await supabase
    .from("stencils")
    .select("id, title, template_type, created_at")
    .eq("user_id", user!.id)
    .order("created_at", { ascending: false })
    .limit(5);

  const grouped: Record<string, MemoryNote[]> = {};
  for (const n of (notes || []) as MemoryNote[]) {
    grouped[n.kind] = grouped[n.kind] || [];
    grouped[n.kind].push(n);
  }

  const kindOrder = ["quadrant", "pattern", "role", "value", "distortion", "note"] as const;
  const kindLabel: Record<string, string> = {
    quadrant: "Where you land",
    pattern: "Recurring patterns",
    role: "Roles you had to play",
    value: "Who you're becoming",
    distortion: "Thinking traps noticed",
    note: "Notes",
  };

  return (
    <main>
      <p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--leaf)]">
        Profile memory
      </p>
      <h1 className="mt-1 text-4xl font-bold text-[var(--leaf-deep)]">
        {profile?.display_name || "Your"} memory
      </h1>
      <p className="mt-2 max-w-2xl text-[var(--ink-soft)]">
        As you stencil entries, we accumulate a living profile — patterns, roles, distortions,
        and framework landings — so your life reads as an applied framework, not a pile of files.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <Stat label="Memory notes" value={String((notes || []).length)} />
        <Stat
          label="Recent stencils"
          value={String((recentStencils || []).length)}
        />
        <Stat
          label="Kinds tracked"
          value={String(Object.keys(grouped).length)}
        />
      </div>

      {(notes || []).length === 0 ? (
        <div className="mt-10 rounded-2xl border border-dashed border-[var(--line)] bg-white/50 p-8 text-center">
          <p className="text-[var(--ink-soft)]">Memory is empty until you stencil an entry.</p>
          <Link
            href="/journal"
            className="mt-4 inline-block rounded-xl bg-[var(--leaf)] px-4 py-2 text-sm font-bold text-white"
          >
            Go to journal
          </Link>
        </div>
      ) : (
        <div className="mt-10 space-y-8">
          {kindOrder
            .filter((k) => grouped[k]?.length)
            .map((kind) => (
              <section key={kind}>
                <h2 className="text-xl font-semibold text-[var(--leaf-deep)]">
                  {kindLabel[kind] || kind}
                </h2>
                <ul className="mt-3 grid gap-3 sm:grid-cols-2">
                  {grouped[kind].map((n) => (
                    <li
                      key={n.id}
                      className="rounded-xl border border-[var(--line)] bg-white/75 p-4 shadow-sm"
                    >
                      <p className="font-semibold">{n.label}</p>
                      {n.detail ? (
                        <p className="mt-1 text-sm text-[var(--ink-soft)]">{n.detail}</p>
                      ) : null}
                      <p className="mt-2 text-xs text-[var(--ink-soft)]">
                        weight {n.weight.toFixed(1)} ·{" "}
                        {new Date(n.updated_at).toLocaleDateString()}
                      </p>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
        </div>
      )}

      {(recentStencils || []).length > 0 ? (
        <section className="mt-12">
          <h2 className="text-xl font-semibold">Recent applied frameworks</h2>
          <ul className="mt-3 space-y-2">
            {((recentStencils || []) as Pick<
              StencilRow,
              "id" | "title" | "template_type" | "created_at"
            >[]).map((s) => (
              <li key={s.id} className="text-sm text-[var(--ink-soft)]">
                <span className="font-semibold text-[var(--ink)]">{s.title}</span> ·{" "}
                {s.template_type} · {new Date(s.created_at).toLocaleString()}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[var(--line)] bg-white/70 p-4 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-wide text-[var(--ink-soft)]">{label}</p>
      <p className="mt-1 font-[family-name:var(--font-display)] text-3xl font-bold text-[var(--leaf-deep)]">
        {value}
      </p>
    </div>
  );
}

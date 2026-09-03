import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { EntryRow, StencilRow } from "@/lib/types";

export default async function EntriesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: entries } = await supabase
    .from("entries")
    .select("*")
    .eq("user_id", user!.id)
    .order("created_at", { ascending: false })
    .limit(50);

  const { data: stencils } = await supabase
    .from("stencils")
    .select("*")
    .eq("user_id", user!.id)
    .order("created_at", { ascending: false })
    .limit(50);

  const byEntry = new Map<string, StencilRow>();
  for (const s of (stencils || []) as StencilRow[]) {
    if (s.entry_id && !byEntry.has(s.entry_id)) byEntry.set(s.entry_id, s);
  }

  return (
    <main>
      <p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--leaf)]">
        History
      </p>
      <h1 className="mt-1 text-4xl font-bold text-[var(--leaf-deep)]">Entries & stencils</h1>
      <p className="mt-2 max-w-2xl text-[var(--ink-soft)]">
        Your diary entries and the templates applied to them. This is what replaces a folder of
        unsearchable markdown files.
      </p>

      <div className="mt-8 grid gap-8 lg:grid-cols-2">
        <section>
          <h2 className="text-xl font-semibold">Entries</h2>
          <ul className="mt-3 space-y-3">
            {((entries || []) as EntryRow[]).length === 0 ? (
              <li className="text-sm text-[var(--ink-soft)]">
                No entries yet.{" "}
                <Link href="/journal" className="font-semibold text-[var(--leaf)]">
                  Write one →
                </Link>
              </li>
            ) : (
              ((entries || []) as EntryRow[]).map((e) => {
                const s = byEntry.get(e.id);
                return (
                  <li
                    key={e.id}
                    className="rounded-xl border border-[var(--line)] bg-white/75 p-4 shadow-sm"
                  >
                    <p className="text-xs text-[var(--ink-soft)]">
                      {new Date(e.created_at).toLocaleString()}
                      {s ? ` · ${s.template_type}` : ""}
                    </p>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">
                      {e.body.slice(0, 320)}
                      {e.body.length > 320 ? "…" : ""}
                    </p>
                    {s ? (
                      <p className="mt-2 text-sm font-semibold text-[var(--leaf)]">{s.title}</p>
                    ) : null}
                  </li>
                );
              })
            )}
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold">Stencil library</h2>
          <ul className="mt-3 space-y-3">
            {((stencils || []) as StencilRow[]).length === 0 ? (
              <li className="text-sm text-[var(--ink-soft)]">No stencils yet.</li>
            ) : (
              ((stencils || []) as StencilRow[]).map((s) => (
                <li
                  key={s.id}
                  className="rounded-xl border border-[var(--line)] bg-white/75 p-4 shadow-sm"
                >
                  <p className="font-semibold text-[var(--leaf-deep)]">{s.title}</p>
                  <p className="mt-1 text-xs text-[var(--ink-soft)]">
                    {s.template_type} · {new Date(s.created_at).toLocaleString()}
                  </p>
                  <p className="mt-2 text-sm text-[var(--ink-soft)]">{s.summary}</p>
                  <p className="mt-2 text-xs text-[var(--ink-soft)]">{s.source_citation}</p>
                </li>
              ))
            )}
          </ul>
        </section>
      </div>
    </main>
  );
}

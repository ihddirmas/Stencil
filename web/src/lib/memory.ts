import type { AnalyzeSuccess, MemoryNote } from "./types";
import type { SupabaseClient } from "@supabase/supabase-js";

/** Derive durable memory notes from a stencil result so the profile evolves. */
export function deriveMemoryNotes(
  result: AnalyzeSuccess,
): Omit<MemoryNote, "id" | "user_id" | "source_stencil_id" | "created_at" | "updated_at">[] {
  const notes: Omit<
    MemoryNote,
    "id" | "user_id" | "source_stencil_id" | "created_at" | "updated_at"
  >[] = [];

  for (const a of result.annotations?.slice(0, 3) || []) {
    notes.push({
      kind: "pattern",
      label: a.note.slice(0, 120),
      detail: a.quote,
      weight: 1,
    });
  }

  if (result.template_type === "quadrant" && result.framework) {
    const labels = result.framework.labels;
    const x = result.framework.position.x ?? 0.5;
    const y = result.framework.position.y ?? 0.5;
    const region =
      y >= 0.5
        ? x >= 0.5
          ? labels.top_right
          : labels.top_left
        : x >= 0.5
          ? labels.bottom_right
          : labels.bottom_left;
    notes.push({
      kind: "quadrant",
      label: region || "Mapped position",
      detail: `x=${x.toFixed(2)}, y=${y.toFixed(2)} on ${result.title}`,
      weight: 1.2,
    });
  }

  if (result.template_type === "identity_shift") {
    const ws = (result.worksheet || result.exercise?.fields || {}) as Record<
      string,
      unknown
    >;
    const roles = (ws.had_to_be as string[]) || [];
    for (const role of roles.slice(0, 3)) {
      notes.push({ kind: "role", label: String(role), detail: "Protective role", weight: 1 });
    }
    const becoming = (ws.becoming as string[]) || [];
    for (const role of becoming.slice(0, 2)) {
      notes.push({
        kind: "value",
        label: String(role),
        detail: "Chosen identity direction",
        weight: 1.1,
      });
    }
  }

  if (result.template_type === "cognitive_distortions") {
    const ws = (result.worksheet || result.exercise?.fields || {}) as {
      distortions?: { name?: string; id?: string }[];
    };
    for (const d of ws.distortions || []) {
      notes.push({
        kind: "distortion",
        label: d.name || d.id || "Thinking trap",
        detail: "Detected in journal language",
        weight: 1,
      });
    }
  }

  return notes;
}

export async function persistAnalyzeResult(
  supabase: SupabaseClient,
  userId: string,
  body: string,
  result: AnalyzeSuccess,
) {
  const { data: entry, error: entryErr } = await supabase
    .from("entries")
    .insert({ user_id: userId, body })
    .select("*")
    .single();
  if (entryErr) throw entryErr;

  const { data: stencil, error: stencilErr } = await supabase
    .from("stencils")
    .insert({
      user_id: userId,
      entry_id: entry.id,
      template_type: result.template_type,
      title: result.title,
      source_citation: result.source_citation,
      summary: result.exercise?.rationale || null,
      payload: {
        framework: result.framework || null,
        annotations: result.annotations || [],
        claims: result.claims || [],
        exercise: result.exercise || null,
      },
      worksheet: result.worksheet || result.exercise?.fields || {},
    })
    .select("*")
    .single();
  if (stencilErr) throw stencilErr;

  const mem = deriveMemoryNotes(result).map((n) => ({
    ...n,
    user_id: userId,
    source_stencil_id: stencil.id,
  }));
  if (mem.length) {
    const { error: memErr } = await supabase.from("memory_notes").insert(mem);
    if (memErr) throw memErr;
  }

  return { entry, stencil };
}

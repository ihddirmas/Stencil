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
    if (ws.had_to_line_a) {
      notes.push({
        kind: "role",
        label: String(ws.had_to_line_a).slice(0, 120),
        detail: ws.had_to_line_b ? String(ws.had_to_line_b) : "Protective role",
        weight: 1,
      });
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
    if (ws.becoming_line_a) {
      notes.push({
        kind: "value",
        label: String(ws.becoming_line_a).slice(0, 120),
        detail: ws.becoming_line_b
          ? String(ws.becoming_line_b)
          : "Chosen identity direction",
        weight: 1.1,
      });
    }
  }

  if (result.template_type === "cognitive_distortions") {
    const ws = (result.worksheet || result.exercise?.fields || {}) as {
      distortions?: {
        name?: string;
        id?: string;
        my_example?: string;
        my_challenge?: string;
      }[];
    };
    for (const d of ws.distortions || []) {
      notes.push({
        kind: "distortion",
        label: d.name || d.id || "Thinking trap",
        detail: d.my_challenge
          ? String(d.my_challenge).slice(0, 200)
          : d.my_example
            ? String(d.my_example).slice(0, 200)
            : "Detected in journal language",
        weight: 1,
      });
    }
  }

  if (result.template_type === "forgiveness") {
    const ws = (result.worksheet || result.exercise?.fields || {}) as Record<
      string,
      unknown
    >;
    if (ws.mistake) {
      notes.push({
        kind: "pattern",
        label: "Self-forgiveness focus",
        detail: String(ws.mistake).slice(0, 200),
        weight: 1,
      });
    }
    if (ws.compassion) {
      notes.push({
        kind: "value",
        label: "Self-compassion",
        detail: String(ws.compassion).slice(0, 200),
        weight: 1.1,
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

/** Persist user edits to a stencil worksheet and refresh memory notes from those fields. */
export async function updateStencilWorksheet(
  supabase: SupabaseClient,
  userId: string,
  stencilId: string,
  worksheet: Record<string, unknown>,
  resultLike: AnalyzeSuccess,
) {
  const { data: stencil, error: upErr } = await supabase
    .from("stencils")
    .update({
      worksheet,
      updated_at: new Date().toISOString(),
    })
    .eq("id", stencilId)
    .eq("user_id", userId)
    .select("*")
    .single();
  if (upErr) throw upErr;

  await supabase
    .from("memory_notes")
    .delete()
    .eq("user_id", userId)
    .eq("source_stencil_id", stencilId);

  const mem = deriveMemoryNotes({ ...resultLike, worksheet }).map((n) => ({
    ...n,
    user_id: userId,
    source_stencil_id: stencilId,
  }));
  if (mem.length) {
    const { error: memErr } = await supabase.from("memory_notes").insert(mem);
    if (memErr) throw memErr;
  }

  return stencil;
}

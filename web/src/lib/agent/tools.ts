import { tool } from "ai";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { analyzeEntry } from "@/lib/analyze";
import { persistAnalyzeResult } from "@/lib/memory";
import type { AnalyzeSuccess, StencilRow } from "@/lib/types";

export async function getMemoryNotes(
  supabase: SupabaseClient,
  userId: string,
  limit = 20,
) {
  const { data, error } = await supabase
    .from("memory_notes")
    .select("id, kind, label, detail, weight, created_at, updated_at")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return { notes: data || [], count: data?.length || 0 };
}

export async function searchUserEntries(
  supabase: SupabaseClient,
  userId: string,
  query: string,
  limit = 8,
) {
  const { data, error } = await supabase
    .from("entries")
    .select("id, body, created_at")
    .eq("user_id", userId)
    .ilike("body", `%${query}%`)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return {
    results: (data || []).map((e) => ({
      id: e.id,
      created_at: e.created_at,
      excerpt: String(e.body).slice(0, 220),
    })),
  };
}

export async function listUserStencils(
  supabase: SupabaseClient,
  userId: string,
  limit = 8,
) {
  const { data, error } = await supabase
    .from("stencils")
    .select("id, title, template_type, source_citation, summary, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return { stencils: data || [] };
}

export async function saveUserEntry(
  supabase: SupabaseClient,
  userId: string,
  journalText: string,
) {
  const { data, error } = await supabase
    .from("entries")
    .insert({ user_id: userId, body: journalText.trim() })
    .select("id, created_at")
    .single();
  if (error) throw error;
  return { entry_id: data.id, created_at: data.created_at };
}

export async function addUserMemoryNote(
  supabase: SupabaseClient,
  userId: string,
  kind: "pattern" | "role" | "value" | "distortion" | "quadrant" | "note",
  label: string,
  detail?: string,
) {
  const { data, error } = await supabase
    .from("memory_notes")
    .insert({
      user_id: userId,
      kind,
      label,
      detail: detail || null,
      weight: 1,
    })
    .select("id, kind, label, detail")
    .single();
  if (error) throw error;
  return { note: data };
}

export async function applyStencilToJournal(
  supabase: SupabaseClient,
  userId: string,
  journalText: string,
) {
  const analyzed = await analyzeEntry(journalText.trim());

  if (analyzed.crisis_flag) {
    return {
      crisis_flag: true as const,
      message: analyzed.message,
      resources: analyzed.resources,
      persisted: false,
    };
  }

  const success = analyzed as AnalyzeSuccess;
  const { entry, stencil } = await persistAnalyzeResult(
    supabase,
    userId,
    journalText.trim(),
    success,
  );

  return {
    crisis_flag: false as const,
    persisted: true,
    entry_id: entry.id,
    stencil_id: (stencil as StencilRow).id,
    template_type: success.template_type,
    title: success.title,
    source_citation: success.source_citation,
    summary: success.exercise?.rationale || null,
    result: success,
  };
}

/** Build Stencil agent tools bound to the authenticated user session. */
export function createStencilTools(supabase: SupabaseClient, userId: string) {
  return {
    get_memory: tool({
      description:
        "Read the user's evolving memory profile (patterns, roles, values, distortions, quadrant landings).",
      inputSchema: z.object({
        limit: z.number().int().min(1).max(50).optional().default(20),
      }),
      execute: async ({ limit }) => getMemoryNotes(supabase, userId, limit ?? 20),
    }),

    search_entries: tool({
      description: "Search the user's past diary entries by keyword (case-insensitive).",
      inputSchema: z.object({
        query: z.string().min(1).describe("Keyword or phrase to search for"),
        limit: z.number().int().min(1).max(20).optional().default(8),
      }),
      execute: async ({ query, limit }) =>
        searchUserEntries(supabase, userId, query, limit ?? 8),
    }),

    list_stencils: tool({
      description: "List recently applied journaling templates (stencils) for this user.",
      inputSchema: z.object({
        limit: z.number().int().min(1).max(20).optional().default(8),
      }),
      execute: async ({ limit }) => listUserStencils(supabase, userId, limit ?? 8),
    }),

    save_entry: tool({
      description:
        "Save a diary entry without applying a stencil. Prefer apply_stencil unless the user explicitly asks to save only.",
      inputSchema: z.object({
        journal_text: z.string().min(1),
      }),
      execute: async ({ journal_text }) =>
        saveUserEntry(supabase, userId, journal_text),
    }),

    add_memory_note: tool({
      description: "Add an explicit memory note the user asked you to remember.",
      inputSchema: z.object({
        kind: z
          .enum(["pattern", "role", "value", "distortion", "quadrant", "note"])
          .default("note"),
        label: z.string().min(1).max(160),
        detail: z.string().max(500).optional(),
      }),
      execute: async ({ kind, label, detail }) =>
        addUserMemoryNote(supabase, userId, kind, label, detail),
    }),

    apply_stencil: tool({
      description:
        "Analyze a freeform braindump / diary text, auto-fill an evidence-based visual worksheet (stencil), persist entry + stencil + memory notes, and return the framework payload. Prefer this whenever the user pastes journal content — they should not fill blank therapy forms themselves.",
      inputSchema: z.object({
        journal_text: z
          .string()
          .min(1)
          .describe("The diary / journal braindump to stencil"),
      }),
      execute: async ({ journal_text }) =>
        applyStencilToJournal(supabase, userId, journal_text),
    }),
  };
}

export type StencilTools = ReturnType<typeof createStencilTools>;

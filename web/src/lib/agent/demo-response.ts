import {
  createUIMessageStream,
  createUIMessageStreamResponse,
  type UIMessage,
} from "ai";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  applyStencilToJournal,
  getMemoryNotes,
  searchUserEntries,
} from "./tools";

function lastUserText(messages: UIMessage[]): string {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (m.role !== "user") continue;
    const parts = m.parts || [];
    const text = parts
      .filter((p): p is { type: "text"; text: string } => p.type === "text")
      .map((p) => p.text)
      .join("\n")
      .trim();
    if (text) return text;
  }
  return "";
}

function looksLikeJournal(text: string) {
  if (text.length >= 80) return true;
  if (/\b(mon|tue|wed|thu|fri|sat|sun)\b/i.test(text) && text.length > 40) {
    return true;
  }
  if (/\b(stencil|map|framework|worksheet)\b/i.test(text) && text.length > 30) {
    return true;
  }
  return false;
}

function wantsMemory(text: string) {
  return /\b(memory|remember|pattern|what do you know|profile)\b/i.test(text);
}

function wantsSearch(text: string) {
  return /\b(search|find|look up|past entr)/i.test(text);
}

function extractSearchQuery(text: string) {
  const m = text.match(/(?:search|find|look up)\s+(?:for\s+)?["']?(.+?)["']?$/i);
  return (m?.[1] || text.replace(/^(search|find|look up)\s+(for\s+)?/i, "")).trim();
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type StreamWriter = { write: (chunk: any) => void };

function writeText(writer: StreamWriter, textId: string, text: string) {
  writer.write({ type: "text-start", id: textId });
  const step = Math.max(24, Math.ceil(text.length / 8));
  for (let i = 0; i < text.length; i += step) {
    writer.write({
      type: "text-delta",
      id: textId,
      delta: text.slice(i, i + step),
    });
  }
  writer.write({ type: "text-end", id: textId });
}

function writeToolCall(
  writer: StreamWriter,
  toolCallId: string,
  toolName: string,
  input: unknown,
  output: unknown,
) {
  writer.write({ type: "start-step" });
  writer.write({
    type: "tool-input-start",
    toolCallId,
    toolName,
  });
  writer.write({
    type: "tool-input-available",
    toolCallId,
    toolName,
    input,
  });
  writer.write({
    type: "tool-output-available",
    toolCallId,
    output,
  });
  writer.write({ type: "finish-step" });
}

/**
 * Deterministic agent loop when ANTHROPIC_API_KEY is missing.
 * Still calls the same tools (analyze API + Supabase) so the product works in demo.
 */
export function createDemoAgentResponse(
  messages: UIMessage[],
  supabase: SupabaseClient,
  userId: string,
) {
  const text = lastUserText(messages);

  const stream = createUIMessageStream({
    execute: async ({ writer }) => {
      writer.write({ type: "start" });

      if (!text) {
        writeText(
          writer,
          "t1",
          "Paste a diary entry and I’ll stencil it into a visual framework, or ask what I remember about your patterns.",
        );
        writer.write({ type: "finish" });
        return;
      }

      try {
        if (wantsMemory(text) && !looksLikeJournal(text)) {
          const output = await getMemoryNotes(supabase, userId, 20);
          writeToolCall(writer, "demo_mem", "get_memory", { limit: 20 }, output);
          const notes = output.notes;
          const reply =
            notes.length === 0
              ? "Your memory profile is empty so far. Paste a few diary lines and I’ll stencil them — notes will accumulate here."
              : `Here’s what I’m holding onto (${notes.length} notes):\n` +
                notes
                  .slice(0, 8)
                  .map((n) => `• [${n.kind}] ${n.label}`)
                  .join("\n") +
                "\n\nPaste a new entry anytime and I’ll map it against these patterns.";
          writeText(writer, "t1", reply);
          writer.write({ type: "finish" });
          return;
        }

        if (wantsSearch(text) && !looksLikeJournal(text)) {
          const query = extractSearchQuery(text) || text;
          const output = await searchUserEntries(supabase, userId, query, 8);
          writeToolCall(
            writer,
            "demo_search",
            "search_entries",
            { query, limit: 8 },
            output,
          );
          const results = output.results;
          const reply =
            results.length === 0
              ? `I didn’t find entries matching “${query}”.`
              : `Found ${results.length} entr${results.length === 1 ? "y" : "ies"} for “${query}”. Open Entries for the full list — or paste a new entry to stencil.`;
          writeText(writer, "t1", reply);
          writer.write({ type: "finish" });
          return;
        }

        if (looksLikeJournal(text) || messages.length <= 2) {
          const input = { journal_text: text };
          const output = await applyStencilToJournal(supabase, userId, text);
          writeToolCall(writer, "demo_apply", "apply_stencil", input, output);

          if (output.crisis_flag) {
            const lines = [
              output.message,
              "",
              ...output.resources.map(
                (r) =>
                  `• ${r.name}${r.detail ? ` — ${r.detail}` : ""}${r.url ? ` (${r.url})` : ""}`,
              ),
            ];
            writeText(writer, "t1", lines.join("\n"));
            writer.write({ type: "finish" });
            return;
          }

          const reply = [
            `Applied ${output.title} (${output.template_type.replace(/_/g, " ")}).`,
            output.summary || "Your words are annotated on the framework below.",
            output.source_citation ? `Source: ${output.source_citation}` : "",
            "",
            "Demo agent mode (no Anthropic key) — tools still ran against your library and memory.",
          ]
            .filter(Boolean)
            .join("\n");
          writeText(writer, "t1", reply);
          writer.write({ type: "finish" });
          return;
        }

        writeText(
          writer,
          "t1",
          "I’m your Stencil agent. Paste diary text to apply a framework, ask what I remember, or search past entries. (Running in demo agent mode without an Anthropic key.)",
        );
        writer.write({ type: "finish" });
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Something went wrong";
        writer.write({ type: "error", errorText: msg });
        writer.write({ type: "finish" });
      }
    },
  });

  return createUIMessageStreamResponse({ stream });
}

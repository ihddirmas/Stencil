"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, isToolUIPart } from "ai";
import { FormEvent, useMemo, useState } from "react";
import Link from "next/link";
import { StencilView } from "@/components/StencilView";
import { PipelineTrace } from "@/components/PipelineTrace";
import type { AnalyzeSuccess, CrisisResponse } from "@/lib/types";

const PLACEHOLDER = `Tue — Another week where I said yes to everything. I take on the fixing so nobody is disappointed.

Wed — Feedback wasn’t harsh but I spiralled: they think I’m incompetent. I should be further along.

Fri — I told Maya the truth about my capacity. Afterwards I sat with it.`;

const SUGGESTIONS = [
  "What do you remember about my patterns?",
  "Search for entries about feedback",
];

function partText(parts: { type: string; text?: string }[]) {
  return parts
    .filter((p) => p.type === "text" && p.text)
    .map((p) => p.text)
    .join("\n");
}

function ToolChip({ name, state }: { name: string; state: string }) {
  const label = name.replace(/_/g, " ");
  const done = state === "output-available" || state === "output-error";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-semibold ${
        done
          ? "border-[var(--line)] bg-white/80 text-[var(--leaf-deep)]"
          : "border-[var(--leaf)]/30 bg-[var(--mist)] text-[var(--leaf)]"
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${done ? "bg-[var(--leaf)]" : "animate-pulse bg-[var(--leaf)]"}`}
      />
      {done ? `Used ${label}` : `Calling ${label}…`}
    </span>
  );
}

function ApplyStencilResult({ output }: { output: unknown }) {
  if (!output || typeof output !== "object") return null;
  const data = output as Record<string, unknown>;

  if (data.crisis_flag) {
    const crisis = data as CrisisResponse & { message: string };
    return (
      <section className="mt-3 rounded-2xl border border-red-200 bg-[var(--danger-bg)] p-5">
        <h3 className="text-xl font-semibold text-[var(--danger)]">We paused the templates</h3>
        <p className="mt-2 text-sm">{crisis.message}</p>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm">
          {(crisis.resources || []).map((r) => (
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
    );
  }

  if (data.result) {
    const result = data.result as AnalyzeSuccess;
    return (
      <div className="mt-3">
        <PipelineTrace
          stages={result.pipeline_trace?.stages}
          orchestration={result.pipeline_trace?.orchestration}
          verification={result.pipeline_trace?.verification}
        />
        <div className="mt-3">
          <StencilView result={result} />
        </div>
        {result.safety ? (
          <p className="mt-2 text-xs text-[var(--ink-soft)]" role="status">
            Safety:{" "}
            {[
              result.safety.crisis_gated ? "crisis-gated" : null,
              result.safety.pii_minimized ? "PII-minimized" : null,
              result.safety.output_verified ? "output-verified" : null,
              result.safety.render_workflows ? "Render Workflows" : null,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
        ) : null}
        <p className="mt-2 text-sm text-[var(--ink-soft)]">
          Saved to{" "}
          <Link href="/entries" className="font-semibold text-[var(--leaf)]">
            Entries
          </Link>{" "}
          and{" "}
          <Link href="/memory" className="font-semibold text-[var(--leaf)]">
            Memory
          </Link>
          .
        </p>
      </div>
    );
  }

  return null;
}

export function AgentChat({ demoMode }: { demoMode?: boolean }) {
  const [input, setInput] = useState("");
  const transport = useMemo(
    () => new DefaultChatTransport({ api: "/api/agent" }),
    [],
  );
  const { messages, sendMessage, status, error, setMessages } = useChat({
    transport,
  });

  const busy = status === "submitted" || status === "streaming";

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || busy) return;
    setInput("");
    await sendMessage({ text });
  }

  function sendSuggestion(text: string) {
    if (busy) return;
    void sendMessage({ text });
  }

  return (
    <main className="animate-rise">
      <div className="max-w-3xl">
        <p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--leaf)]">
          Agent
        </p>
        <h1 className="mt-1 text-4xl font-bold text-[var(--leaf-deep)]">Journal</h1>
        <p className="mt-2 text-[var(--ink-soft)]">
          Chat with Stencil. Paste diary text and the agent applies frameworks, updates memory,
          and can search your history.{" "}
          <Link href="/memory" className="font-semibold text-[var(--leaf)]">
            View memory →
          </Link>
        </p>
        {demoMode ? (
          <p className="mt-3 rounded-xl border border-[var(--line)] bg-white/70 px-3 py-2 text-xs text-[var(--ink-soft)]">
            Demo agent mode — no <code className="font-semibold">ANTHROPIC_API_KEY</code>. Tools
            still run (analyze API + Supabase).
          </p>
        ) : null}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
        <section className="flex min-h-[520px] flex-col rounded-2xl border border-[var(--line)] bg-white/70 shadow-sm">
          <div className="flex-1 space-y-4 overflow-y-auto px-4 py-5 sm:px-5">
            {messages.length === 0 ? (
              <div className="space-y-4 py-6">
                <p className="text-sm leading-relaxed text-[var(--ink-soft)]">
                  Start by pasting a few diary lines, or try a prompt:
                </p>
                <div className="flex flex-wrap gap-2">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => sendSuggestion(s)}
                      className="rounded-xl border border-[var(--line)] bg-[var(--mist)]/60 px-3 py-2 text-left text-sm font-medium text-[var(--ink)] transition hover:bg-white"
                    >
                      {s}
                    </button>
                  ))}
                </div>
                <pre className="whitespace-pre-wrap rounded-xl border border-dashed border-[var(--line)] bg-[var(--sand)]/40 p-4 font-[family-name:var(--font-body)] text-sm leading-6 text-[var(--ink-soft)]">
                  {PLACEHOLDER}
                </pre>
              </div>
            ) : null}

            {messages.map((message) => {
              const isUser = message.role === "user";
              return (
                <article
                  key={message.id}
                  className={`max-w-[95%] ${isUser ? "ml-auto" : ""}`}
                >
                  <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-[var(--ink-soft)]">
                    {isUser ? "You" : "Stencil"}
                  </p>
                  <div
                    className={`rounded-2xl px-4 py-3 text-[15px] leading-7 ${
                      isUser
                        ? "bg-[var(--leaf)] text-white shadow-sm"
                        : "border border-[var(--line)] bg-white/90"
                    }`}
                  >
                    {isUser ? (
                      <p className="whitespace-pre-wrap">{partText(message.parts)}</p>
                    ) : (
                      <div className="space-y-3">
                        <div className="flex flex-wrap gap-2">
                          {message.parts.filter(isToolUIPart).map((part, i) => {
                            const name =
                              "toolName" in part
                                ? String(part.toolName)
                                : part.type.replace(/^tool-/, "");
                            return (
                              <ToolChip
                                key={`${message.id}-tool-${i}`}
                                name={name}
                                state={part.state}
                              />
                            );
                          })}
                        </div>
                        {message.parts.map((part, i) => {
                          if (part.type === "text" && part.text) {
                            return (
                              <p
                                key={`${message.id}-t-${i}`}
                                className="whitespace-pre-wrap"
                              >
                                {part.text}
                              </p>
                            );
                          }
                          return null;
                        })}
                        {message.parts.map((part, i) => {
                          if (
                            isToolUIPart(part) &&
                            part.state === "output-available" &&
                            (part.type === "tool-apply_stencil" ||
                              ("toolName" in part && part.toolName === "apply_stencil"))
                          ) {
                            return (
                              <ApplyStencilResult
                                key={`${message.id}-apply-${i}`}
                                output={"output" in part ? part.output : null}
                              />
                            );
                          }
                          return null;
                        })}
                      </div>
                    )}
                  </div>
                </article>
              );
            })}

            {busy ? (
              <p className="text-sm font-medium text-[var(--leaf)]">Thinking…</p>
            ) : null}
            {error ? (
              <p className="rounded-xl border border-red-200 bg-[var(--danger-bg)] px-3 py-2 text-sm text-[var(--danger)]">
                {error.message}
              </p>
            ) : null}
          </div>

          <form
            onSubmit={onSubmit}
            className="border-t border-[var(--line)] bg-white/80 p-3 sm:p-4"
          >
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              rows={4}
              placeholder="Paste diary text, or ask about your memory…"
              className="w-full resize-y rounded-xl border border-[var(--line)] bg-white px-3 py-3 text-[15px] leading-6 outline-none focus:ring-2 focus:ring-[var(--leaf)]/30"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void onSubmit(e as unknown as FormEvent);
                }
              }}
            />
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <button
                type="submit"
                disabled={busy || !input.trim()}
                className="rounded-xl bg-[var(--leaf)] px-5 py-2.5 text-sm font-bold text-white disabled:opacity-60"
              >
                {busy ? "Working…" : "Send"}
              </button>
              {messages.length > 0 ? (
                <button
                  type="button"
                  onClick={() => setMessages([])}
                  className="rounded-xl border border-[var(--line)] bg-white px-3 py-2 text-sm font-semibold text-[var(--ink-soft)]"
                >
                  Clear chat
                </button>
              ) : null}
              <span className="text-xs text-[var(--ink-soft)]">Enter to send · Shift+Enter for newline</span>
            </div>
          </form>
        </section>

        <aside className="hidden space-y-4 lg:block">
          <div className="rounded-2xl border border-[var(--line)] bg-white/70 p-4">
            <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold text-[var(--leaf-deep)]">
              Agent tools
            </h2>
            <ul className="mt-3 space-y-2 text-sm text-[var(--ink-soft)]">
              <li>apply stencil → visual framework</li>
              <li>read / update memory</li>
              <li>search past entries</li>
              <li>crisis short-circuit</li>
            </ul>
          </div>
          <div className="rounded-2xl border border-[var(--line)] bg-[var(--mist)]/50 p-4 text-sm text-[var(--ink-soft)]">
            Psychoeducational only. Crisis language skips templates and surfaces resources.
          </div>
        </aside>
      </div>
    </main>
  );
}

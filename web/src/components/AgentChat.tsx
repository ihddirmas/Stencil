"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, isToolUIPart } from "ai";
import Link from "next/link";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { FrameworkGallery, StencilView } from "@/components/StencilView";
import { PipelineTrace } from "@/components/PipelineTrace";
import { FRAMEWORKS } from "@/lib/frameworks";
import type { AnalyzeSuccess, CrisisResponse } from "@/lib/types";

const PLACEHOLDER = `Tue — Another week where I said yes to everything. I take on the fixing so nobody is disappointed.

Wed — Feedback wasn’t harsh but I spiralled: they think I’m incompetent. I should be further along.

Fri — I told Maya the truth about my capacity. Afterwards I sat with it.`;

const SUGGESTIONS = [
  "Stencil this diary entry for me",
  "What do you remember about my patterns?",
  "Search for entries about feedback",
];

function partText(parts: { type: string; text?: string }[]) {
  return parts
    .filter((p) => p.type === "text" && p.text)
    .map((p) => p.text)
    .join("\n");
}

function toolNameOf(part: { type: string; toolName?: string }) {
  if ("toolName" in part && part.toolName) return String(part.toolName);
  return part.type.replace(/^tool-/, "");
}

function extractApplyOutput(output: unknown): {
  result?: AnalyzeSuccess;
  crisis?: CrisisResponse & { message: string };
  stencilId?: string;
} {
  if (!output || typeof output !== "object") return {};
  const data = output as Record<string, unknown>;
  if (data.crisis_flag) {
    return { crisis: data as CrisisResponse & { message: string } };
  }
  if (data.result && typeof data.result === "object") {
    return {
      result: data.result as AnalyzeSuccess,
      stencilId: typeof data.stencil_id === "string" ? data.stencil_id : undefined,
    };
  }
  if ("template_type" in data && "title" in data && data.crisis_flag === false) {
    return { result: data as AnalyzeSuccess };
  }
  return {};
}

function latestApplyFromMessages(
  messages: Array<{ role: string; parts?: unknown[] }>
): { result?: AnalyzeSuccess; crisis?: CrisisResponse & { message: string }; stencilId?: string } {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const message = messages[i];
    if (message.role !== "assistant" || !message.parts) continue;
    for (let j = message.parts.length - 1; j >= 0; j -= 1) {
      const part = message.parts[j];
      if (!part || typeof part !== "object") continue;
      if (!isToolUIPart(part as never)) continue;
      const p = part as {
        type: string;
        toolName?: string;
        state?: string;
        output?: unknown;
      };
      if (p.state !== "output-available") continue;
      if (toolNameOf(p) !== "apply_stencil") continue;
      const extracted = extractApplyOutput(p.output);
      if (extracted.result || extracted.crisis) return extracted;
    }
  }
  return {};
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

function CrisisPanel({ crisis }: { crisis: CrisisResponse & { message: string } }) {
  return (
    <section className="rounded-2xl border border-red-200 bg-[var(--danger-bg)] p-5">
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

export function AgentChat({ demoMode }: { demoMode?: boolean }) {
  const [input, setInput] = useState("");
  const [previewId, setPreviewId] = useState<string | null>(null);
  const threadRef = useRef<HTMLDivElement>(null);
  const transport = useMemo(() => new DefaultChatTransport({ api: "/api/agent" }), []);
  const { messages, sendMessage, status, error } = useChat({ transport });

  const busy = status === "submitted" || status === "streaming";
  const latest = latestApplyFromMessages(messages);
  const activeResult = latest.result;
  const activeCrisis = latest.crisis;
  const activeStencilId = latest.stencilId;

  useEffect(() => {
    threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, status]);

  useEffect(() => {
    if (activeResult?.template_type) setPreviewId(null);
  }, [activeResult?.template_type]);

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

  function askForFramework(id: string) {
    const meta = FRAMEWORKS.find((f) => f.id === id);
    if (!meta || busy) return;
    setPreviewId(id);
    const seed = input.trim() || PLACEHOLDER;
    void sendMessage({
      text: `Please apply the ${meta.name} framework (${meta.citation}) to this journal text:\n\n${seed}`,
    });
  }

  const visualTitle =
    activeResult?.title ??
    (activeCrisis
      ? "Crisis support"
      : previewId
        ? FRAMEWORKS.find((f) => f.id === previewId)?.name
        : "Evidence-based frameworks");

  return (
    <main className="animate-rise">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div className="max-w-2xl">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--leaf)]">
            Journal agent
          </p>
          <h1 className="mt-1 text-4xl font-bold text-[var(--leaf-deep)]">Braindump → worksheet</h1>
          <p className="mt-2 text-[var(--ink-soft)]">
            Dump the day in plain language. The agent fills a visual therapy worksheet for you —
            CBT, identity, forgiveness, conflict maps — so you never start from a blank form.
            Edit only if you want; saves update your memory profile.
          </p>
          {demoMode ? (
            <p className="mt-3 rounded-xl border border-[var(--line)] bg-white/70 px-3 py-2 text-xs text-[var(--ink-soft)]">
              Demo agent mode — tools still run (analyze API + Supabase).
            </p>
          ) : null}
        </div>
        <p className="rounded-xl border border-[var(--line)] bg-white/70 px-3 py-2 text-xs text-[var(--ink-soft)]" role="note">
          Psychoeducation only. Crisis? Call or text <strong>988</strong> (US).
        </p>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
        {/* Visual pane — product surface */}
        <aside
          className="flex min-h-[560px] flex-col overflow-hidden rounded-2xl border border-[var(--line)] bg-white/85 shadow-sm"
          aria-label="Framework visual"
        >
          <div className="border-b border-[var(--line)] bg-[var(--mist)]/40 px-5 py-4">
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--teal)]">
              Framework visual
            </p>
            <h2 className="mt-1 font-[family-name:var(--font-display)] text-2xl font-semibold text-[var(--leaf-deep)]">
              {visualTitle}
            </h2>
            <p className="mt-1 text-sm text-[var(--ink-soft)]">
              {activeResult
                ? activeResult.source_citation
                : "Pick a template below, or paste diary text and let the agent match one."}
            </p>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4 sm:px-5">
            {activeCrisis ? <CrisisPanel crisis={activeCrisis} /> : null}

            {activeResult ? (
              <>
                <StencilView result={activeResult} compact stencilId={activeStencilId} />
                <details className="rounded-xl border border-[var(--line)] bg-[var(--sand)]/50 p-3 text-sm">
                  <summary className="cursor-pointer font-semibold text-[var(--leaf-deep)]">
                    Pipeline & safety (collapsed)
                  </summary>
                  <div className="mt-3">
                    <PipelineTrace
                      stages={activeResult.pipeline_trace?.stages}
                      orchestration={activeResult.pipeline_trace?.orchestration}
                      verification={activeResult.pipeline_trace?.verification}
                    />
                    {activeResult.safety ? (
                      <p className="mt-2 text-xs text-[var(--ink-soft)]">
                        {[
                          activeResult.safety.crisis_gated ? "crisis-gated" : null,
                          activeResult.safety.pii_minimized ? "PII-minimized" : null,
                          activeResult.safety.output_verified ? "output-verified" : null,
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
                </details>
              </>
            ) : !activeCrisis ? (
              <FrameworkGallery
                activeId={previewId}
                onSelect={(id) => {
                  setPreviewId(id);
                }}
              />
            ) : null}
          </div>

          <div
            className="flex flex-wrap gap-2 border-t border-[var(--line)] bg-white/90 px-4 py-3"
            aria-label="Framework picker"
          >
            {FRAMEWORKS.map((f) => {
              const active =
                (activeResult?.template_type ?? previewId) === f.id;
              return (
                <button
                  key={f.id}
                  type="button"
                  disabled={busy}
                  onClick={() => askForFramework(f.id)}
                  className={`rounded-xl border px-3 py-2 text-left transition ${
                    active
                      ? "border-[var(--leaf)] bg-[var(--mist)]"
                      : "border-[var(--line)] bg-white hover:bg-[var(--mist)]/60"
                  }`}
                >
                  <span className="block text-sm font-semibold text-[var(--leaf-deep)]">
                    {f.name}
                  </span>
                  <span className="block text-[11px] text-[var(--ink-soft)]">{f.citation}</span>
                </button>
              );
            })}
          </div>
        </aside>

        {/* Chat pane */}
        <section className="flex min-h-[560px] flex-col rounded-2xl border border-[var(--line)] bg-white/70 shadow-sm">
          <div className="flex items-center justify-between border-b border-[var(--line)] px-4 py-3">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--ink-soft)]">
                Conversation
              </p>
              <p className="text-sm text-[var(--ink-soft)]">Paste diary text → agent applies a stencil</p>
            </div>
            <div className="flex gap-3 text-sm font-semibold text-[var(--leaf)]">
              <Link href="/entries">Entries</Link>
              <Link href="/memory">Memory</Link>
            </div>
          </div>

          <div ref={threadRef} className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
            {messages.length === 0 ? (
              <div className="space-y-4 py-4">
                <p className="text-sm leading-relaxed text-[var(--ink-soft)]">
                  Paste today’s braindump. You should not fill blank CBT forms — the agent does,
                  then pins the visual on the left. Chat is just how you dump.
                </p>
                <div className="flex flex-wrap gap-2">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => sendSuggestion(s)}
                      className="rounded-xl border border-[var(--line)] bg-[var(--mist)]/60 px-3 py-2 text-left text-sm font-medium transition hover:bg-white"
                    >
                      {s}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => sendSuggestion(PLACEHOLDER)}
                  className="w-full rounded-xl border border-dashed border-[var(--line)] bg-[var(--sand)]/40 p-4 text-left transition hover:bg-white/80"
                >
                  <p className="mb-2 text-xs font-bold uppercase tracking-wide text-[var(--teal)]">
                    Try sample diary → apply stencil
                  </p>
                  <pre className="whitespace-pre-wrap font-[family-name:var(--font-body)] text-sm leading-6 text-[var(--ink-soft)]">
                    {PLACEHOLDER}
                  </pre>
                </button>
              </div>
            ) : null}

            {messages.map((message) => {
              const isUser = message.role === "user";
              const applyParts = message.parts.filter(
                (part) =>
                  isToolUIPart(part) &&
                  part.state === "output-available" &&
                  toolNameOf(part) === "apply_stencil"
              );

              return (
                <article key={message.id} className={`max-w-[95%] ${isUser ? "ml-auto" : ""}`}>
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
                          {message.parts.filter(isToolUIPart).map((part, i) => (
                            <ToolChip
                              key={`${message.id}-tool-${i}`}
                              name={toolNameOf(part)}
                              state={part.state}
                            />
                          ))}
                        </div>
                        {message.parts.map((part, i) => {
                          if (part.type === "text" && part.text) {
                            return (
                              <p key={`${message.id}-t-${i}`} className="whitespace-pre-wrap">
                                {part.text}
                              </p>
                            );
                          }
                          return null;
                        })}
                        {applyParts.length > 0 ? (
                          <p className="rounded-xl bg-[var(--mist)]/70 px-3 py-2 text-sm text-[var(--leaf-deep)]">
                            Framework visual updated in the left panel
                            {(() => {
                              const out = extractApplyOutput(
                                "output" in applyParts[0] ? applyParts[0].output : null
                              );
                              return out.result?.title ? ` — ${out.result.title}` : "";
                            })()}
                            .
                          </p>
                        ) : null}
                      </div>
                    )}
                  </div>
                </article>
              );
            })}

            {busy ? (
              <p className="text-sm font-medium text-[var(--leaf)]">
                Mapping your words onto a framework…
              </p>
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
                className="rounded-xl bg-[var(--leaf)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                Send
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => sendSuggestion(PLACEHOLDER)}
                className="rounded-xl border border-[var(--line)] bg-white px-3 py-2 text-sm font-semibold text-[var(--leaf-deep)]"
              >
                Apply sample diary
              </button>
            </div>
          </form>
        </section>
      </div>
    </main>
  );
}

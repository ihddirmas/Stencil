"use client";

type Stage = {
  id: string;
  label: string;
  status?: string;
  detail?: string;
};

export function PipelineTrace({
  stages,
  orchestration,
  verification,
}: {
  stages?: Stage[];
  orchestration?: string;
  verification?: { ok?: boolean; explainability?: { why_safe?: string; citation?: string } };
}) {
  if (!stages?.length) return null;
  return (
    <section
      aria-label="AI pipeline stages"
      className="mt-3 rounded-xl border border-[var(--line)] bg-[var(--mist)]/40 p-3"
    >
      <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--leaf)]">
        Multi-stage pipeline
        {orchestration ? ` · ${orchestration.replace(/_/g, " ").slice(0, 48)}` : ""}
      </p>
      <ol className="mt-2 flex flex-wrap gap-2">
        {stages.map((s, i) => (
          <li
            key={`${s.id}-${i}`}
            className="rounded-lg border border-[var(--line)] bg-white/80 px-2.5 py-1.5 text-xs"
          >
            <span className="font-semibold text-[var(--leaf-deep)]">
              {i + 1}. {s.label}
            </span>
            {s.detail ? (
              <span className="mt-0.5 block max-w-[14rem] text-[var(--ink-soft)]">{s.detail}</span>
            ) : null}
          </li>
        ))}
      </ol>
      {verification?.explainability?.why_safe ? (
        <p className="mt-2 text-xs leading-relaxed text-[var(--ink-soft)]">
          <span className="font-semibold text-[var(--leaf-deep)]">Why this is safe: </span>
          {verification.explainability.why_safe}
        </p>
      ) : null}
    </section>
  );
}

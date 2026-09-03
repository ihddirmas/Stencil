"use client";

import type { AnalyzeSuccess } from "@/lib/types";

export function StencilView({ result }: { result: AnalyzeSuccess }) {
  const anns = result.annotations || result.framework?.annotations || [];
  const ws = (result.worksheet || result.exercise?.fields || {}) as Record<string, unknown>;

  return (
    <div className="space-y-5 rounded-2xl border border-[var(--line)] bg-white/75 p-5 shadow-sm">
      <header>
        <h3 className="text-2xl font-semibold text-[var(--leaf-deep)]">{result.title}</h3>
        <p className="mt-1 text-sm text-[var(--ink-soft)]">{result.source_citation}</p>
        {result.exercise?.rationale ? (
          <p className="mt-2 text-sm">{result.exercise.rationale}</p>
        ) : null}
      </header>

      {result.framework?.framework_type === "quadrant" ? (
        <QuadrantSvg
          labels={result.framework.labels}
          position={result.framework.position}
        />
      ) : null}
      {result.framework?.framework_type === "triangle" ? (
        <TriangleSvg
          labels={result.framework.labels}
          position={result.framework.position}
        />
      ) : null}

      <div className="grid gap-3">
        {anns.map((a, i) => (
          <figure
            key={i}
            className="rounded-xl border-l-4 border-[var(--accent)] bg-[var(--sand)]/50 px-4 py-3"
          >
            <blockquote className="font-[family-name:var(--font-display)] italic">
              “{a.quote}”
            </blockquote>
            <figcaption className="mt-1 text-sm text-[var(--ink-soft)]">{a.note}</figcaption>
          </figure>
        ))}
      </div>

      {result.template_type === "identity_shift" ? <IdentityFields ws={ws} /> : null}
      {result.template_type === "forgiveness" ? <ForgivenessFields ws={ws} /> : null}
      {result.template_type === "cognitive_distortions" ? (
        <DistortionFields ws={ws} />
      ) : null}

      {(result.template_type === "quadrant" || result.template_type === "triangle") &&
      result.exercise?.html_template ? (
        <div
          className="rounded-xl border border-[var(--line)] bg-white p-4 [&_label]:mb-3 [&_label]:grid [&_label]:gap-1 [&_label]:text-sm [&_label]:font-semibold [&_textarea]:rounded-lg [&_textarea]:border [&_textarea]:border-[var(--line)] [&_textarea]:p-2"
          dangerouslySetInnerHTML={{ __html: result.exercise.html_template }}
        />
      ) : null}
    </div>
  );
}

function QuadrantSvg({
  labels,
  position,
}: {
  labels: Record<string, string>;
  position: Record<string, number>;
}) {
  const x = Math.min(1, Math.max(0, position.x ?? 0.5));
  const y = Math.min(1, Math.max(0, position.y ?? 0.5));
  const px = 80 + x * 440;
  const py = 80 + (1 - y) * 440;
  return (
    <svg viewBox="0 0 600 600" className="w-full max-w-xl rounded-xl border border-[var(--line)] bg-white">
      <rect x="80" y="80" width="220" height="220" rx="10" fill="#9fc49a" opacity="0.45" />
      <rect x="300" y="80" width="220" height="220" rx="10" fill="#7eb8b0" opacity="0.5" />
      <rect x="80" y="300" width="220" height="220" rx="10" fill="#e8c97a" opacity="0.45" />
      <rect x="300" y="300" width="220" height="220" rx="10" fill="#e0a066" opacity="0.5" />
      <text x="100" y="130" className="fill-[var(--ink)] text-[15px] font-bold">
        {labels.top_left}
      </text>
      <text x="320" y="130" className="fill-[var(--ink)] text-[15px] font-bold">
        {labels.top_right}
      </text>
      <text x="100" y="350" className="fill-[var(--ink)] text-[15px] font-bold">
        {labels.bottom_left}
      </text>
      <text x="320" y="350" className="fill-[var(--ink)] text-[15px] font-bold">
        {labels.bottom_right}
      </text>
      <line x1="300" y1="80" x2="300" y2="520" stroke="#1a2a24" strokeOpacity="0.25" />
      <line x1="80" y1="300" x2="520" y2="300" stroke="#1a2a24" strokeOpacity="0.25" />
      <text x="300" y="55" textAnchor="middle" className="fill-[var(--ink-soft)] text-[12px]">
        {labels.y_high}
      </text>
      <text x="300" y="555" textAnchor="middle" className="fill-[var(--ink-soft)] text-[12px]">
        {labels.y_low}
      </text>
      <circle cx={px} cy={py} r="10" fill="#1e4a36" />
      <circle cx={px} cy={py} r="3.5" fill="#fff" />
    </svg>
  );
}

function TriangleSvg({
  labels,
  position,
}: {
  labels: Record<string, string>;
  position: Record<string, number>;
}) {
  const wa = position.vertex_a ?? 0.34;
  const wb = position.vertex_b ?? 0.33;
  const wc = position.vertex_c ?? 0.33;
  const sum = wa + wb + wc || 1;
  const A = { x: 300, y: 90 },
    B = { x: 90, y: 480 },
    C = { x: 510, y: 480 };
  const a = wa / sum,
    b = wb / sum,
    c = wc / sum;
  const px = a * A.x + b * B.x + c * C.x;
  const py = a * A.y + b * B.y + c * C.y;
  return (
    <svg viewBox="0 0 600 600" className="w-full max-w-xl rounded-xl border border-[var(--line)] bg-white">
      <polygon
        points={`${A.x},${A.y} ${B.x},${B.y} ${C.x},${C.y}`}
        fill="#fbfefc"
        stroke="#1a2a24"
        strokeOpacity="0.22"
      />
      <text x={A.x} y="58" textAnchor="middle" className="fill-[var(--ink)] text-[15px] font-bold">
        {labels.vertex_a}
      </text>
      <text x={B.x} y="530" textAnchor="middle" className="fill-[var(--ink)] text-[15px] font-bold">
        {labels.vertex_b}
      </text>
      <text x={C.x} y="530" textAnchor="middle" className="fill-[var(--ink)] text-[15px] font-bold">
        {labels.vertex_c}
      </text>
      <circle cx={px} cy={py} r="9" fill="#c45c26" />
      <circle cx={px} cy={py} r="3.5" fill="#fff" />
    </svg>
  );
}

function IdentityFields({ ws }: { ws: Record<string, unknown> }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Field label="I had to" value={String(ws.had_to_line_a || "")} />
      <Field label="so I wouldn't feel" value={String(ws.had_to_line_b || "")} />
      <Field label="Now I choose to" value={String(ws.becoming_line_a || "")} />
      <Field label="because I deserve" value={String(ws.becoming_line_b || "")} />
      <Field label="Letting go" value={String(ws.letting_go || "")} wide />
      <Field label="Reclaiming" value={String(ws.reclaiming || "")} wide />
      <Field label="Anchor" value={String(ws.anchor || "")} wide />
    </div>
  );
}

function ForgivenessFields({ ws }: { ws: Record<string, unknown> }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Field label="Mistake" value={String(ws.mistake || "")} />
      <Field label="Emotions" value={String(ws.emotions || "")} />
      <Field label="Compassion" value={String(ws.compassion || "")} wide />
      <Field label="Affirmations" value={String(ws.affirmations || "")} />
      <Field label="Visualization" value={String(ws.visualization || "")} />
    </div>
  );
}

function DistortionFields({ ws }: { ws: Record<string, unknown> }) {
  const rows = (ws.distortions as { name?: string; my_example?: string; my_challenge?: string }[]) || [];
  return (
    <div className="space-y-3">
      {rows.map((r, i) => (
        <div key={i} className="rounded-xl border border-[var(--line)] p-3">
          <p className="text-xs font-bold uppercase tracking-wide text-[var(--ink-soft)]">
            {r.name}
          </p>
          <Field label="My example" value={String(r.my_example || "")} />
          <Field label="My challenge" value={String(r.my_challenge || "")} />
        </div>
      ))}
    </div>
  );
}

function Field({
  label,
  value,
  wide,
}: {
  label: string;
  value: string;
  wide?: boolean;
}) {
  return (
    <label className={`grid gap-1 text-sm font-semibold ${wide ? "sm:col-span-2" : ""}`}>
      {label}
      <textarea
        defaultValue={value}
        rows={3}
        className="rounded-lg border border-[var(--line)] bg-white p-2 font-normal"
      />
    </label>
  );
}

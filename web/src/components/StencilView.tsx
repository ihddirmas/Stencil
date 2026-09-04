"use client";

import type { AnalyzeSuccess } from "@/lib/types";

const FRAMEWORK_BLURBS: Record<string, string> = {
  quadrant: "Map where insight meets action on a 2×2.",
  triangle: "See the pull between three competing moves.",
  identity_shift: "Separate protective roles from chosen identity.",
  forgiveness: "Walk a short self-compassion loop for a past act.",
  cognitive_distortions: "Name thinking traps and rewrite with evidence.",
};

export function StencilView({
  result,
  compact,
}: {
  result: AnalyzeSuccess;
  compact?: boolean;
}) {
  const anns = result.annotations || result.framework?.annotations || [];
  const ws = (result.worksheet || result.exercise?.fields || {}) as Record<string, unknown>;

  return (
    <div
      className={`space-y-5 ${compact ? "" : "rounded-2xl border border-[var(--line)] bg-white/90 p-5 shadow-sm"}`}
    >
      <header>
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--teal)]">
          Applied framework
        </p>
        <h3 className="mt-1 text-2xl font-semibold text-[var(--leaf-deep)] sm:text-3xl">
          {result.title}
        </h3>
        <p className="mt-1 text-sm text-[var(--ink-soft)]">{result.source_citation}</p>
        {result.exercise?.rationale ? (
          <p className="mt-2 text-sm leading-relaxed">{result.exercise.rationale}</p>
        ) : (
          <p className="mt-2 text-sm text-[var(--ink-soft)]">
            {FRAMEWORK_BLURBS[result.template_type] || "Your words, mapped."}
          </p>
        )}
      </header>

      {/* Visual first — the point of Stencil */}
      <div className="animate-rise">
        {result.framework?.framework_type === "quadrant" ? (
          <QuadrantSvg labels={result.framework.labels} position={result.framework.position} />
        ) : null}
        {result.framework?.framework_type === "triangle" ? (
          <TriangleSvg labels={result.framework.labels} position={result.framework.position} />
        ) : null}
        {result.template_type === "cognitive_distortions" ? (
          <DistortionsVisual ws={ws} />
        ) : null}
        {result.template_type === "identity_shift" ? <IdentityVisual ws={ws} /> : null}
        {result.template_type === "forgiveness" ? <ForgivenessVisual ws={ws} /> : null}
      </div>

      {anns.length ? (
        <div className="grid gap-3">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--ink-soft)]">
            Your words on the map
          </p>
          {anns.map((a, i) => (
            <figure
              key={i}
              className="rounded-xl border-l-4 border-[var(--teal)] bg-[var(--mist)]/50 px-4 py-3"
            >
              <blockquote className="font-[family-name:var(--font-display)] text-[15px] italic">
                “{a.quote}”
              </blockquote>
              <figcaption className="mt-1 text-sm text-[var(--ink-soft)]">{a.note}</figcaption>
            </figure>
          ))}
        </div>
      ) : null}

      {result.template_type === "identity_shift" ? <IdentityFields ws={ws} /> : null}
      {result.template_type === "forgiveness" ? <ForgivenessFields ws={ws} /> : null}
      {result.template_type === "cognitive_distortions" ? <DistortionFields ws={ws} /> : null}

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

/** Empty-state gallery so users see what frameworks look like before chatting. */
export function FrameworkGallery({
  activeId,
  onSelect,
}: {
  activeId?: string | null;
  onSelect?: (id: string) => void;
} = {}) {
  const cards = [
    {
      id: "quadrant",
      title: "Consciousness × Agency",
      cite: "Limberg-style 2×2",
      body: <QuadrantSvg labels={DEMO_QUADRANT.labels} position={DEMO_QUADRANT.position} />,
    },
    {
      id: "triangle",
      title: "Conflict Triangle",
      cite: "Three-pull conflict map",
      body: (
        <TriangleSvg
          labels={{
            vertex_a: "Confront",
            vertex_b: "Withdraw",
            vertex_c: "Appease",
          }}
          position={{ vertex_a: 0.45, vertex_b: 0.25, vertex_c: 0.3 }}
        />
      ),
    },
    {
      id: "cognitive_distortions",
      title: "Cognitive Distortions",
      cite: "Beck · Burns · CBT thought records",
      body: (
        <DistortionsVisual
          ws={{
            distortions: [
              {
                name: "Mind Reading",
                my_example: "They think I’m incompetent",
                my_challenge: "I don’t have evidence of that.",
              },
              {
                name: "Should Statements",
                my_example: "I should be further along",
                my_challenge: "I’d like progress — and rest counts.",
              },
            ],
          }}
        />
      ),
    },
    {
      id: "identity_shift",
      title: "Who I Had to Be → Becoming",
      cite: "Identity / roles work",
      body: (
        <IdentityVisual
          ws={{
            had_to_line_a: "Be the fixer",
            becoming_line_a: "Name my capacity",
            letting_go: "Pleasing at all costs",
            reclaiming: "Honest boundaries",
          }}
        />
      ),
    },
    {
      id: "forgiveness",
      title: "Forgiving Yourself",
      cite: "Self-compassion prompts",
      body: (
        <ForgivenessVisual
          ws={{
            mistake: "I snapped under pressure",
            emotions: "Shame, regret",
            compassion: "I was protecting something tender",
          }}
        />
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--teal)]">
          Evidence-based templates
        </p>
        <h2 className="mt-1 font-[family-name:var(--font-display)] text-2xl font-semibold text-[var(--leaf-deep)]">
          What Stencil draws
        </h2>
        <p className="mt-1 text-sm text-[var(--ink-soft)]">
          These diagrams are the product. Paste a diary entry — the agent picks one and annotates
          it with your quotes.
        </p>
      </div>
      <div className="grid gap-4">
        {cards.map((card) => (
          <GalleryCard
            key={card.id}
            title={card.title}
            cite={card.cite}
            active={activeId === card.id}
            onSelect={onSelect ? () => onSelect(card.id) : undefined}
            body={card.body}
          />
        ))}
      </div>
    </div>
  );
}

const DEMO_QUADRANT = {
  labels: {
    top_left: "Spiritual Bypassers",
    top_right: "Conscious Agents",
    bottom_left: "Sleepwalkers",
    bottom_right: "Busy Bodies",
    x_low: "Low agency",
    x_high: "High agency",
    y_low: "Low consciousness",
    y_high: "High consciousness",
  },
  position: { x: 0.38, y: 0.62 },
};

function GalleryCard({
  title,
  cite,
  body,
  active,
  onSelect,
}: {
  title: string;
  cite: string;
  body: React.ReactNode;
  active?: boolean;
  onSelect?: () => void;
}) {
  const className = `overflow-hidden rounded-2xl border p-4 text-left transition ${
    active
      ? "border-[var(--leaf)] bg-[var(--mist)]/70 ring-2 ring-[var(--leaf)]/20"
      : "border-[var(--line)] bg-white/80 hover:border-[var(--leaf)]/40"
  }`;

  if (onSelect) {
    return (
      <button type="button" onClick={onSelect} className={`w-full ${className}`}>
        <h3 className="font-[family-name:var(--font-display)] text-lg font-semibold text-[var(--leaf-deep)]">
          {title}
        </h3>
        <p className="mb-3 text-xs text-[var(--ink-soft)]">{cite}</p>
        {body}
      </button>
    );
  }

  return (
    <article className={className}>
      <h3 className="font-[family-name:var(--font-display)] text-lg font-semibold text-[var(--leaf-deep)]">
        {title}
      </h3>
      <p className="mb-3 text-xs text-[var(--ink-soft)]">{cite}</p>
      {body}
    </article>
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
    <svg
      viewBox="0 0 600 600"
      className="w-full rounded-xl border border-[var(--line)] bg-white"
      role="img"
      aria-label="Consciousness by agency quadrant map"
    >
      <rect x="80" y="80" width="220" height="220" rx="10" fill="#9fc49a" opacity="0.45" />
      <rect x="300" y="80" width="220" height="220" rx="10" fill="#7eb8b0" opacity="0.55" />
      <rect x="80" y="300" width="220" height="220" rx="10" fill="#c5d4c8" opacity="0.5" />
      <rect x="300" y="300" width="220" height="220" rx="10" fill="#a8c4be" opacity="0.5" />
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
      <text x="40" y="310" textAnchor="middle" className="fill-[var(--ink-soft)] text-[11px]" transform="rotate(-90 40 310)">
        {labels.x_low}
      </text>
      <circle cx={px} cy={py} r="12" fill="#1e4a36" />
      <circle cx={px} cy={py} r="4" fill="#fff" />
      <text x={px + 16} y={py + 4} className="fill-[var(--leaf-deep)] text-[12px] font-bold">
        You
      </text>
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
    <svg
      viewBox="0 0 600 600"
      className="w-full rounded-xl border border-[var(--line)] bg-white"
      role="img"
      aria-label="Conflict triangle map"
    >
      <polygon
        points={`${A.x},${A.y} ${B.x},${B.y} ${C.x},${C.y}`}
        fill="#f4faf6"
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
      <circle cx={px} cy={py} r="10" fill="#2a7a6e" />
      <circle cx={px} cy={py} r="3.5" fill="#fff" />
    </svg>
  );
}

function DistortionsVisual({ ws }: { ws: Record<string, unknown> }) {
  const rows =
    (ws.distortions as { name?: string; id?: string; my_example?: string; my_challenge?: string }[]) ||
    [];
  if (!rows.length) {
    return (
      <div className="rounded-xl border border-dashed border-[var(--line)] bg-[var(--mist)]/40 p-6 text-sm text-[var(--ink-soft)]">
        No distortions detected in this pass — quotes still help you spot traps.
      </div>
    );
  }
  return (
    <div
      className="rounded-xl border border-[var(--line)] bg-gradient-to-br from-[#eef6f1] to-white p-4"
      role="img"
      aria-label="Cognitive distortions thought-record visual"
    >
      <p className="mb-3 text-center text-xs font-bold uppercase tracking-[0.12em] text-[var(--teal)]">
        Thought record · trap → challenge
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        {rows.map((r, i) => (
          <div
            key={i}
            className="relative overflow-hidden rounded-xl border border-[var(--line)] bg-white p-4 shadow-sm"
          >
            <div className="absolute inset-y-0 left-0 w-1.5 bg-[var(--leaf)]" />
            <p className="pl-2 text-xs font-bold uppercase tracking-wide text-[var(--leaf-deep)]">
              {r.name || r.id || "Thinking trap"}
            </p>
            <p className="mt-2 pl-2 font-[family-name:var(--font-display)] text-sm italic text-[var(--ink)]">
              “{r.my_example || "…"}”
            </p>
            <div className="mt-3 flex items-center gap-2 pl-2 text-[11px] font-bold uppercase tracking-wide text-[var(--teal)]">
              <span aria-hidden>↓</span> Evidence challenge
            </div>
            <p className="mt-1 pl-2 text-sm leading-relaxed text-[var(--ink-soft)]">
              {r.my_challenge || "What else could be true?"}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function IdentityVisual({ ws }: { ws: Record<string, unknown> }) {
  const left = String(ws.had_to_line_a || ws.had_to || "Who I had to be");
  const right = String(ws.becoming_line_a || ws.becoming || "Who I’m becoming");
  const release = String(ws.letting_go || "");
  const reclaim = String(ws.reclaiming || "");
  return (
    <div
      className="rounded-xl border border-[var(--line)] bg-white p-4"
      role="img"
      aria-label="Identity shift from protective role to chosen self"
    >
      <div className="grid items-stretch gap-3 sm:grid-cols-[1fr_auto_1fr]">
        <div className="rounded-xl bg-[#d8e8de] p-4">
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--ink-soft)]">
            Had to be
          </p>
          <p className="mt-2 font-[family-name:var(--font-display)] text-xl font-semibold text-[var(--leaf-deep)]">
            {left}
          </p>
          {release ? (
            <p className="mt-3 text-sm text-[var(--ink-soft)]">Letting go: {release}</p>
          ) : null}
        </div>
        <div className="flex items-center justify-center px-1 text-2xl text-[var(--teal)]" aria-hidden>
          →
        </div>
        <div className="rounded-xl bg-[var(--leaf)] p-4 text-white">
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-white/80">
            Becoming
          </p>
          <p className="mt-2 font-[family-name:var(--font-display)] text-xl font-semibold">
            {right}
          </p>
          {reclaim ? <p className="mt-3 text-sm text-white/90">Reclaiming: {reclaim}</p> : null}
        </div>
      </div>
    </div>
  );
}

function ForgivenessVisual({ ws }: { ws: Record<string, unknown> }) {
  const steps = [
    { t: "Mistake", v: String(ws.mistake || "What happened") },
    { t: "Feel", v: String(ws.emotions || "What it cost") },
    { t: "Compassion", v: String(ws.compassion || "What you needed") },
    { t: "Release", v: String(ws.affirmations || ws.visualization || "A kinder next step") },
  ];
  return (
    <div
      className="rounded-xl border border-[var(--line)] bg-gradient-to-b from-white to-[var(--mist)]/60 p-4"
      role="img"
      aria-label="Self-forgiveness loop"
    >
      <p className="mb-4 text-center text-xs font-bold uppercase tracking-[0.12em] text-[var(--teal)]">
        Self-forgiveness loop
      </p>
      <ol className="grid gap-3 sm:grid-cols-2">
        {steps.map((s, i) => (
          <li
            key={s.t}
            className="flex gap-3 rounded-xl border border-[var(--line)] bg-white p-3"
          >
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[var(--leaf)] text-sm font-bold text-white">
              {i + 1}
            </span>
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-[var(--ink-soft)]">
                {s.t}
              </p>
              <p className="mt-1 text-sm leading-relaxed">{s.v}</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
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
  if (!rows.length) return null;
  return (
    <details className="rounded-xl border border-[var(--line)] bg-white/70 p-3">
      <summary className="cursor-pointer text-sm font-semibold text-[var(--leaf-deep)]">
        Edit worksheet fields
      </summary>
      <div className="mt-3 space-y-3">
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
    </details>
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

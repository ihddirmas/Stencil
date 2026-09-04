# Stencil

Paste diary entries → Stencil matches them to an evidence-based journaling **template** (framework diagram or worksheet), annotated with your own words, editable, and accumulating over time — instead of another unsearchable folder of AI-generated `.md` analysis.

Reading long psychological analysis is boring. A diagram or bite-sized stencil sticks.

This is **not a mood tracker**.

## The demo moment

Paste 2–4 journal entries → see them applied to a customized framework visual (e.g. Consciousness × Agency quadrant) **or** an editable worksheet (identity shift, self-forgiveness, CBT distortions) → keep adding entries; the library evolves.

## Template library (v1)

| Template | Shape | Citation lineage |
|---|---|---|
| Consciousness × Agency | 2×2 quadrant map | Peter Limberg / Less Foolish |
| Who I Had to Be vs Who I'm Becoming | Two-column identity worksheet | Identity / parts-informed journaling |
| Forgiving Yourself | 5-prompt compassion worksheet | Self-compassion / CBT self-blame work |
| Cognitive Distortions | Spot + challenge rows | CBT (Beck; Burns) |
| Triangle map | 3-vertex conflict | Reflective self-inquiry |

Reference visuals live in `docs/references/`.

## Architecture

```
raw diary text
       │
       ▼
 crisis check ──yes──► resources only (no template)
       │ no
       ▼
┌─────────────┐
│ 1 Extractor │  → claims + verbatim quotes
└──────┬──────┘
       ▼
┌──────────────────┐
│ 2 Template Match │  → which stencil + labels
└──────┬───────────┘
       ▼
┌──────────────────┐
│ 3 Position/Fill  │  → plot + prefilled worksheet fields
└──────┬───────────┘
       ▼
┌──────────────────┐
│ 4 Exercise pack  │  → editable HTML/JS stencil
└──────────────────┘
```

## UI (Lovable) + API (this repo)

- **Primary UI:** Lovable React app — editor + live preview (see links below / in PR)
- **API:** FastAPI in `backend/` — `POST /api/analyze`, crisis short-circuit, Claude tool-use pipeline, `DEMO_MODE` fallback
- Session stencil library persists in the browser (`localStorage`); server does **not** store raw entries

## Safety & Responsible AI

| Guardrail | Behavior |
|---|---|
| System prompt scope | Psychoeducational only — never diagnostic / clinical advice |
| Crisis short-circuit | Runs **before** the pipeline; no diagram/worksheet if flagged |
| Ephemeral processing | No persistent server-side storage of raw entries |
| Cited frameworks | Sources shown in-app; templates are pre-selected, not invented pop psych |
| Disclaimer | Always visible banner |

Crisis resource links include a TODO for verified region-appropriate hotlines before public demo.

## How to run the API locally

```bash
python -m venv .venv && source .venv/bin/activate
pip install -r backend/requirements.txt
cp backend/.env.example backend/.env
# ANTHROPIC_API_KEY=...  or  DEMO_MODE=1

uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
```

Legacy vanilla frontend in `frontend/` is still served at `/` for smoke tests; Lovable is the product UI.

## Deploy

`render.yaml` + `Procfile` for the FastAPI service. Set `ANTHROPIC_API_KEY` in the Render dashboard.

## Lovable

- Editor / preview URLs are recorded when the Lovable project is created (see PR description).
- Project knowledge encodes product constraints (safety, templates, design).

## What's next / out of scope

- Auth / multi-user accounts
- Persistent server-side history
- Unlimited open-ended framework invention
- Native mobile

## License

MIT

# Pattern Mirror

Paste your journal entries → an AI pipeline maps them onto an evidence-based psychological framework as an editable visual diagram, annotated with your own words, plus one tailored journaling exercise — instead of another wall of AI-generated markdown you'll never search again.

## The demo moment

Paste 3–4 real journal entries → within seconds see them plotted on a personalized **quadrant** or **triangle** diagram, annotated with your own phrases → get one tailored, editable journaling exercise below it. That's the product.

This is **not a mood tracker**. It does not ask you to rate your day 1–5. It maps relationships between patterns in what you already wrote through an established framework template.

## Architecture

A 4-stage structured Claude pipeline (tool-use / schema-validated — not one freeform prompt):

```
raw journal text
       │
       ▼
┌─────────────┐
│ 1 Extractor │  → 3–6 claims + verbatim quotes
└──────┬──────┘
       ▼
┌──────────────────┐
│ 2 Framework Match│  → quadrant XOR triangle + generated labels
└──────┬───────────┘
       ▼
┌──────────────────┐
│ 3 Position Gen   │  → x/y or vertex weights + quote annotations
└──────┬───────────┘
       ▼
┌──────────────────┐
│ 4 Exercise Rec.  │  → one pre-written exercise, pre-filled
└──────────────────┘
```

Exactly **two** framework templates (the AI fills labels, not invents geometry):

1. **Quadrant** — 2-axis / 4-region map (CBT thought-record / cognitive mapping lineage)
2. **Triangle** — 3-vertex self-inquiry map (reflective multi-perspective practice)

## Safety & Responsible AI

Judges: this section is load-bearing for the Responsible AI framing.

| Guardrail | Behavior |
|---|---|
| **System prompt scope** | Psychoeducational only — never diagnostic, never clinical/medical advice, never claims certainty about mental state |
| **Crisis-language short-circuit** | Lightweight check runs **before** the pipeline. If flagged, the framework stages never run; the UI shows resources only (no diagram, no exercise) |
| **Ephemeral processing** | No persistent server-side storage of raw entries — request in, response out |
| **Cited frameworks** | Templates cite established sources (e.g. CBT thought-record structures). Sources are shown in-app near the diagram |
| **Visible disclaimer** | Banner: *This is a psychoeducational reflection tool, not a diagnostic or therapeutic service.* |

Crisis resource links include a **TODO** placeholder for verified, region-appropriate hotlines — fill these before a public demo; do not invent numbers.

## How to run locally

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements.txt
cp backend/.env.example backend/.env
# Set ANTHROPIC_API_KEY=... in backend/.env
# Or set DEMO_MODE=1 for a deterministic sample without calling Claude

uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
```

Open [http://localhost:8000](http://localhost:8000). Frontend is served by FastAPI (no separate build step).

Health check: `GET /api/health`  
Analyze: `POST /api/analyze` with `{ "text": "..." }`

## Deploy (Render)

`render.yaml` + `Procfile` are included. Set `ANTHROPIC_API_KEY` in the Render dashboard (`sync: false` in the Blueprint).

Blueprint deeplink (after this repo is on GitHub):

```
https://dashboard.render.com/blueprint/new?repo=<YOUR_HTTPS_REPO_URL>
```

**Live demo URL:** _(fill in after Render deploy)_

## What's next / out of scope for this submission

- Expanded framework library beyond the two templates
- Persistent history / multi-user accounts
- Native mobile app
- Drag-to-reposition on the diagram

## License

MIT

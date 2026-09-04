# Render Workflows — Stencil pipeline

Durable orchestration for the Stencil mental-health journaling agent.

## Tasks

| Task | Role |
|---|---|
| `orchestrate_stencil` | Root chain |
| `gate_crisis_and_pii` | Crisis short-circuit + PII redaction |
| `extract_claims` | Stage 1 extractor |
| `match_template` | Stage 2 framework matcher |
| `build_position_and_exercise` | Stages 3–4 |
| `verify_output` | Citation / diagnostic / grounding checks |

## Deploy (Dashboard)

1. Render Dashboard → **New** → **Workflow**
2. Connect repo `ihddirmas/Stencil`, branch `cursor/stencil-agent-9de5`
3. Root directory: `workflows` (or repo root with start command below)
4. Build: `pip install -r workflows/requirements.txt && pip install -r backend/requirements.txt`
5. Start: `PYTHONPATH=. python workflows/main.py`
6. Env: `DEMO_MODE=1` (or `ANTHROPIC_API_KEY`), same as API

## Trigger

```python
from render import Render
render = Render()  # RENDER_API_KEY
finished = render.workflows.run_task("stencil-workflows/orchestrate_stencil", ["journal text…"])
print(finished.results)
```

Blueprints do not yet manage Workflows — create via Dashboard / CLI.

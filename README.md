# Stencil

**Mental Health track** — a journaling **agent** that turns diary entries into evidence-based visual **stencils** (not mood scores, not AI markdown dumps), with crisis gating, PII minimization, output verification, durable memory, and optional **Render Workflows** orchestration.

See [`docs/JUDGES.md`](docs/JUDGES.md) for rubric mapping.

## Product flow

1. **Landing** (`/`) — problem, pipeline, safety (988)  
2. **Auth** — Supabase email/password + RLS  
3. **Journal agent** (`/journal`) — ToolLoopAgent + tools via `/api/agent`  
4. **Entries / Memory** — searchable history + evolving pattern profile  

## Safety stack

1. Crisis short-circuit (verified 988 / Crisis Text / IASP)  
2. PII redaction before model calls  
3. 4-stage Claude structured pipeline (or demo heuristics)  
4. Output verification (citations, anti-diagnosis, quote grounding)  
5. Explainable `pipeline_trace` in UI  

## Monorepo

| Path | Role |
|---|---|
| `web/` | Next.js agent UI + `/api/agent` |
| `backend/` | FastAPI analyze API (privacy→…→verify) |
| `workflows/` | **Render Workflows** durable task chain |
| `docs/JUDGES.md` | Hackathon scoring map |
| `frontend/` | Legacy vanilla SPA |

## Run locally

### Analyze API

```bash
python -m venv .venv && source .venv/bin/activate
pip install -r backend/requirements.txt
DEMO_MODE=1 uvicorn backend.main:app --host 0.0.0.0 --port 8000
```

### Web

```bash
cd web
cp .env.example .env.local
# Supabase + NEXT_PUBLIC_ANALYZE_API_URL=http://127.0.0.1:8000
npm install && npm run dev
```

### Render Workflows (optional)

See [`workflows/README.md`](workflows/README.md). Root task: `orchestrate_stencil`.

## Deploy

### Vercel (Next.js in `web/`)

This is a monorepo. The Next app lives in **`web/`** — Vercel must use that as the Root Directory or the build finishes in ~20ms with no output.

1. Vercel Project → **Settings → General → Root Directory** → set to `web` → Save  
2. Framework Preset: **Next.js**  
3. Install Command: `npm install` (default)  
4. Build Command: `npm run build` (default)  
5. Env vars:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_ANALYZE_API_URL=https://stencil-api.onrender.com`
   - optional `ANTHROPIC_API_KEY`
6. Redeploy

If Root Directory is left blank, you get: *Build output contains no "functions" or "static" directory*.

- **API (Render web service):** https://stencil-api.onrender.com  
- **Workflows:** create Workflow service from `workflows/` (Dashboard; see `workflows/README.md`)  
- Add the Vercel URL to Supabase Auth redirect URLs (`/auth/callback`)

## License

MIT

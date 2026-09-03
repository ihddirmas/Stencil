# Stencil

Paste diary entries → Stencil matches them to an evidence-based journaling **template**, annotated with your own words, saved to your library, and accumulated into an evolving **memory profile**.

Not a mood tracker. Psychoeducational only.

## Product flow

1. **Landing** (`/`) — brand + pitch + Get started / Log in  
2. **Auth** (`/signup`, `/login`) — Supabase email/password  
3. **Journal** (`/journal`) — paste → analyze → save entry + stencil + memory notes  
4. **Entries** (`/entries`) — searchable history of diary text + applied templates  
5. **Memory** (`/memory`) — living profile (patterns, roles, distortions, quadrant landings)

Crisis language still short-circuits to resources only (no template saved).

## Monorepo layout

| Path | Role |
|---|---|
| `web/` | Next.js 15 App Router UI (landing, auth, journal, entries, memory) |
| `backend/` | FastAPI 4-stage Claude / demo analyze API |
| `frontend/` | Legacy vanilla SPA (smoke / fallback) |
| `supabase/migrations/` | Schema reference |
| `docs/references/` | Framework visual references |

## Supabase

Project: **stencil** (`babzsbnsxhtgjafhvndw`, us-east-1)

Tables (RLS on): `profiles`, `entries`, `stencils`, `memory_notes`  
Signup trigger creates a `profiles` row.

**Auth tip for local demos:** In Supabase Dashboard → Authentication → Providers → Email, turn off “Confirm email” so signup returns a session immediately. Or confirm users via Dashboard / SQL (`email_confirmed_at`).

## Run locally

### 1) Analyze API

```bash
python -m venv .venv && source .venv/bin/activate
pip install -r backend/requirements.txt
DEMO_MODE=1 uvicorn backend.main:app --host 0.0.0.0 --port 8000
```

### 2) Web app

```bash
cd web
cp .env.example .env.local
# fill NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_ANON_KEY
# NEXT_PUBLIC_ANALYZE_API_URL=http://127.0.0.1:8000
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Safety

- Persistent disclaimer banner  
- Crisis short-circuit before templates  
- RLS: users only read/write their own rows  
- Framework citations shown in-app  
- Analyze API does not store raw entries; persistence is user-owned in Supabase

## Deploy notes

- **API:** Render (`render.yaml`) — set `ANTHROPIC_API_KEY`  
- **Web:** Vercel/Netlify — set Supabase + `NEXT_PUBLIC_ANALYZE_API_URL` to the Render URL  
- Add the web origin to API CORS if locked down

## Lovable

Earlier Lovable UI work is paused (workspace out of credits). Primary product UI is now `web/`.

## License

MIT

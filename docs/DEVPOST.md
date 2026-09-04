# Devpost submission copy — Stencil

Hack for Humanity Summer 2026 · Mental Health track  
Submission manage URL pattern: `…/manage/submissions/…-stencil/project-overview`

**Deadline:** Sep 4, 2026 @ 11:45pm EDT  
**Required:** GitHub repo + video (≤4 min)  
**Public site (when live):** https://stencil-fawn-nu.vercel.app  
**API:** https://stencil-api.onrender.com  
**Repo:** https://github.com/ihddirmas/Stencil  

> If the Vercel site shows auth/SSO or 500, turn off Deployment Protection / fix env, then paste the working URL under “Try it out”. Judges need a clickable demo.

---

## 1) Project Overview tab

### Project name
```
Stencil
```

### Tagline (keep under ~60–80 characters)
```
Braindump once — AI fills visual therapy worksheets + memory
```

### Elevator pitch / About the project (paste into the big markdown box)

```markdown
## One-liner
Chat gives you words. **Stencil** gives you the therapy worksheet you’d fill if you had the energy — and remembers it.

## The problem
People under stress already **braindump** into Notes or Claude/ChatGPT. Blank CBT / identity / forgiveness forms get abandoned. Generic chat leaves **jumbled threads** and DIY memory. Mood trackers reduce life to a 1–5 score.

## What we built
Stencil is a **journaling agent** (Mental Health track):

1. You dump freeform diary text  
2. The agent **auto-fills** an evidence-based visual **stencil** (thought record, identity shift, self-forgiveness, conflict triangle, consciousness×agency map) using your own quotes  
3. You glance a sticky diagram — optional field edits **Save to memory**  
4. Profile compounds across days (patterns, roles, distortions, landings) under Supabase RLS  

## Why not just Claude/GPT?
| Need | General chat | Stencil |
|---|---|---|
| Dump fast | ✅ | ✅ |
| Filled worksheet | ❌ you prompt & organize | ✅ `apply_stencil` |
| Sticky visual | ❌ markdown wall | ✅ diagram-first UI |
| Structured memory | ❌ freeform | ✅ `memory_notes` + Entries |
| Crisis before generation | soft | ✅ hard gate + verified 988 |

## Safety (Responsible AI)
- Crisis short-circuit **before** generative stages (988 / Crisis Text / IASP — verified, not invented)  
- PII redaction before model calls  
- Output verification (citation allowlist, anti-diagnosis, quote grounding)  
- Psychoeducational only — not diagnosis or therapy  
- Explainable `pipeline_trace` in-product  

## Stack
Next.js agent UI (Vercel) · FastAPI analyze API + optional **Render Workflows** · Supabase Auth/RLS · Anthropic Claude (demo heuristics if no key)

## Demo path (2 min)
Sign up → `/journal` → paste a diary dump (or “Apply sample diary”) → see filled visual worksheet on the left → tweak a field → Save to memory → `/memory` → try crisis language to see the short-circuit.
```

### Links
| Field | Value |
|---|---|
| **Website / Try it** | `https://stencil-fawn-nu.vercel.app` (confirm it loads; else temporary demo note + API health) |
| **GitHub repo** | `https://github.com/ihddirmas/Stencil` |
| **Video** | Upload ≤4 min (script below) |
| **Cover / gallery** | Landing hero, journal dual-pane with framework visual, applied CBT/identity stencil, memory page, crisis screen |

### Built With (type/select these tags)
```
Next.js, TypeScript, React, Tailwind CSS, Vercel AI SDK, Anthropic Claude,
FastAPI, Python, Supabase, PostgreSQL, Render, Render Workflows,
Vercel, Zod
```

---

## 2) Additional Info tab (standard Devpost story)

### Inspiration
```
Therapy homework fails when people are already exhausted. They can dump feelings into ChatGPT, but they leave with another essay—not a filled thought record they can revisit. We wanted the activation energy of a braindump with the structure clinicians already teach (CBT distortions, identity work, self-compassion), plus memory that compounds without the user becoming a librarian of their own chats.
```

### What it does
```
1) User braindumps freeform journal text into the Stencil agent.
2) Agent tools call an analyze pipeline that crisis-gates, redacts PII, extracts claims, matches a cited template, fills worksheet fields, and verifies output.
3) UI pins a visual framework (not a chat bubble dump). Fields are pre-filled; optional edits save back to the stencil and refresh structured memory notes.
4) Entries and Memory pages let users search history and see patterns, roles, distortions, and map landings over time.
5) Crisis language short-circuits the generative path and shows verified resources (988, Crisis Text, IASP).
```

### How we built it
```
• web/ — Next.js App Router agent (Vercel AI SDK ToolLoopAgent + tools: apply_stencil, get_memory, search_entries, …) and worksheet save API
• backend/ — FastAPI multi-stage pipeline: privacy → extract → match → position/exercise → verify
• workflows/ — Render Workflows durable chain (orchestrate_stencil + retried subtasks) for Best Use of Render
• Supabase — auth, RLS on entries / stencils / memory_notes
• Demo mode — deterministic tool loop when ANTHROPIC_API_KEY is unset so judges can still run the product path
```

### Challenges we ran into
```
• Making frameworks feel like visuals (not buried forms inside chat bubbles)
• Keeping MH scope psychoeducational while still useful (no diagnosis, verified crisis resources only)
• Monorepo deploy on Vercel (Root Directory must be web/) and separating sync API vs durable Render Workflows
• Turning freeform diary language into grounded worksheet fields without inventing feelings the user never wrote
```

### Accomplishments that we're proud of
```
• End-to-end loop: braindump → filled cited stencil → editable fields → memory profile
• Visual-first agent UI with evidence-based templates (CBT, identity, forgiveness, maps)
• Responsible AI stack: crisis gate, PII min, verification, explainability, RLS
• Honest differentiation from “just use Claude”
```

### What we learned
```
Chatbots are great companions and weak worksheet systems. For mental-health tooling, the unit of value is a named, revisitable artifact (the stencil) plus structured memory—not another thread. Safety has to be product controls, not only a system prompt.
```

### What's next for Stencil
```
• Stronger longitudinal memory (trends across weeks, not only per-stencil notes)
• Therapist-shareable export of worksheets (user-controlled)
• Deeper Render Workflows production path + evaluation harness for template match quality
• Mobile-friendly capture for “dump on the go”
```

---

## 3) Project Details / hackathon-specific questions

Exact labels vary; paste answers that match these intents:

### Which track?
```
Mental Health
```

### Opt-in / prizes you want considered (pick all that apply in the UI + mirror in a comment if required)
```
Best Mental Health Tool
Responsible AI
Best Use of AI/ML
Best Use of Render (Render Workflows)
Best Design
Best Innovation and Creativity
(Public voting — optional)
```
Do **not** opt into Concussion Recovery unless you add that focus.

### Comment / note for organizers (if there’s a free-text “additional info” or Discord-style note on the submission)
```
Stencil — Mental Health track.

Primary prizes: Best Mental Health Tool + Responsible AI.
Also: Best Use of AI/ML, Best Use of Render (workflows/ orchestrate_stencil), Best Design, Best Innovation.

Repo: https://github.com/ihddirmas/Stencil
Live web: https://stencil-fawn-nu.vercel.app
Analyze API: https://stencil-api.onrender.com

Not a diagnostic product. Crisis-gated; psychoeducational worksheets only.
```

### Technologies used for Render prize (if asked)
```
Render Web Service (FastAPI analyze API) + Render Workflows (workflows/main.py — orchestrate_stencil → gate_crisis_and_pii → extract_claims → match_template → build_position_and_exercise → verify_output)
```

---

## 4) Video script (≤4:00)

1. **0:00–0:25 Problem** — Braindump vs blank worksheets vs chat walls  
2. **0:25–0:45 One-liner** — Chat = words; Stencil = filled worksheet + memory  
3. **0:45–2:15 Demo** — signup/login → paste dump → visual filled → edit/save → memory → crisis short-circuit  
4. **2:15–3:15 How built** — agent tools, multi-stage pipeline, Supabase RLS, Render Workflows  
5. **3:15–3:50 Safety** — crisis, PII, verification, psychoeducational only  
6. **3:50–4:00 Close** — prizes + thank you  

---

## 5) Pre-submit checklist

- [ ] GitHub public and builds from README  
- [ ] Demo URL loads without Vercel SSO wall  
- [ ] Video ≤4 min uploaded  
- [ ] Gallery: ≥3 screenshots (landing, journal visual, memory/crisis)  
- [ ] Track = Mental Health; prize opt-ins selected  
- [ ] Team members added on Devpost  
- [ ] Submit before **Sep 4, 2026 11:45pm EDT**  

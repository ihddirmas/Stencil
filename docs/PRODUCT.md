# Why Stencil sells (and wins) vs general Claude / GPT chat

## The job to be done

Someone under stress already braindumps into a notes app or a chatbot. What they actually need is not another essay — it is **named therapy worksheets filled for them**, stored as a **living profile**, so pattern literacy compounds without homework.

**Stencil loop**

1. **Braindump** — freeform diary once a day (or whenever). No blank CBT forms.
2. **Agent fills the worksheet** — matches an evidence-based stencil (thought record, identity shift, forgiveness, conflict map, consciousness×agency) and writes fields from the user’s own quotes.
3. **Glance the visual** — spatial / diagram first so it sticks; text fields are optional polish.
4. **Optional edit** — tweak a field; that update writes back to the stencil and refreshes **profile memory**.
5. **Return tomorrow** — ask “what do you remember?” and get structured notes, not a scroll hunt.

## Why generic Claude / GPT chat loses this job

| Need | Claude / GPT chat | Stencil |
|---|---|---|
| Dump feelings fast | Strong | Strong — same friction, diary-shaped |
| Leave with a **filled** CBT / identity / forgiveness worksheet | Weak — user must prompt, paste templates, re-explain formats | **Core** — `apply_stencil` auto-fills cited templates |
| Visual that sticks (map / loop / trap→challenge) | Weak — walls of markdown | **Core** — diagram pane is the product |
| Durable **structured** memory (roles, distortions, landings) | Soft — Projects / memory are freeform prose; user organizes | **Core** — `memory_notes` kinds + Entries / Memory UI |
| Search past journals | Soft — chat scroll / uploads | **Core** — `search_entries` + Entries |
| Edit worksheet → profile updates | Manual copy-paste | **Supported** — save worksheet → stencil + memory |
| Crisis before generation | Prompt-dependent | **Hard gate** — verified 988 / Crisis Text / IASP |
| Anti-diagnosis + citation allowlist | Soft system prompt | **Verification layer** on outputs |
| Explainable multi-stage pipeline | Opaque single reply | `pipeline_trace` + optional Render Workflows |

Chatbots are great **companions**. They are poor **worksheet systems**. Stencil is the worksheet system that still feels like dumping into a chat.

## Why this sells (product)

- **Lower activation energy than therapy homework.** People abandon blank thought records. They already write diaries. Stencil meets them at the diary.
- **Sticky cognition.** A 2×2 with “You” on it, or a trap→challenge card with *their* quote, encodes faster than a 800-word chat reply.
- **Compounding profile.** Day 12 is not “start over and remind the model.” Memory kinds (pattern / role / value / distortion / quadrant) accumulate under RLS.
- **Trust surface for mental health.** Crisis short-circuit, PII redaction, psychoeducational scope, and verified resources are table stakes for judges *and* users — chat alone rarely ships them as product controls.

## Why this wins (hackathon rubrics)

| Rubric / prize angle | Stencil feature that maps |
|---|---|
| Domain effectiveness (MH) | Diary → cited clinical-teaching tools, not mood scores |
| Innovation | Unit of value = **stencil** (visual + editable + quote-grounded), agent-orchestrated |
| AI/ML complexity | Privacy → extract → match → position → exercise → verify (+ Workflows) |
| Responsible AI | Crisis gate, PII min, verification, explainability, RLS |
| Design | Visual-first dual pane; chat secondary |
| Render Workflows | Durable `orchestrate_stencil` chain |

## Feature readiness (honest)

**Shipped for the pitch**

- Braindump → `apply_stencil` fills worksheets + persists entry / stencil / memory notes  
- Visual frameworks for quadrant, triangle, CBT distortions, identity, forgiveness  
- Agent tools: memory, search, list stencils, save entry, add note  
- Crisis / PII / verification / pipeline trace  
- Edit worksheet → save updates stencil + regenerates memory notes from fields  

**Still thin (call out, don’t fake)**

- Edits are field-level on the current stencil, not a full collaborative therapy OS  
- Memory is derived notes, not a clinical EHR  
- Demo mode works without Anthropic; full Claude quality needs `ANTHROPIC_API_KEY`  
- Render Workflows code exists; prize needs the Workflow **service** created in Dashboard  

## One-liner

**Chat gives you words. Stencil gives you the worksheet you would have filled if you had the energy — and remembers it.**

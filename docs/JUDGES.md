# Stencil — Judge & prize map (Hack for Humanity)

Mental Health track submission. Goal: score **5** across rubrics and compete for Best Mental Health Tool, Responsible AI, Best Use of Render Workflows, Best Use of AI/ML, Best Design, Best Innovation.

## Domain effectiveness (Mental Health)

**Pain point:** People already journal under stress. Generic AI chats dump unsearchable markdown; mood trackers reduce experience to 1–5 scores. Neither builds pattern literacy with tools therapists already teach.

**Solution:** An agent that converts diary text into **cited visual worksheets** (CBT distortions, identity shift, forgiveness, consciousness×agency maps), persists a **memory profile**, and stays psychoeducational — not diagnostic.

## Feasibility & safety

| Control | Implementation |
|---|---|
| Crisis short-circuit | Heuristic gate **before** generative stages; verified 988 / Crisis Text / IASP |
| Scope | System prompts forbid diagnosis / prescriptions / certainty |
| PII minimization | Redact emails/phones/IDs before model calls |
| Output verification | Citation allowlist + diagnostic-language scan + quote grounding |
| AuthZ | Supabase RLS on entries / stencils / memory_notes |
| Explainability | In-product `pipeline_trace` + “why this is safe” |

## Innovation & novelty

Not a mood tracker clone. The novel unit is the **stencil**: a visual, editable, quote-annotated template that evolves into a searchable library — orchestrated by a **tool-using agent** (not a single prompt).

## Technical complexity (AI/ML)

1. Privacy gate  
2. Claude structured tool-use **Extractor**  
3. **Template matcher** with citation  
4. **Position / worksheet** generator  
5. Exercise assembly  
6. **Verification layer**  
7. Optional **Render Workflows** durable chain (`orchestrate_stencil` → subtasks with retries)  
8. Frontend **ToolLoopAgent** with memory/search/apply tools  

## Data safety & responsibility

- Minimize identifiers before third-party LLM calls  
- Crisis path never sends content into framework generation  
- Verification layer catches diagnostic hallucinations and off-allowlist citations  
- User-owned persistence under RLS; analyze API does not store raw journals by default  

## UI/UX & accessibility

- Brand-first landing with skip link, focus-visible rings, `prefers-reduced-motion`  
- Agent chat with tool chips, pipeline trace, crisis UI  
- Semantic headings / ARIA labels on pipeline and safety sections  

## Best Use of Render Workflows

Code: `workflows/main.py` — deploy as a **Render Workflow** service.

Root task: `orchestrate_stencil`  
Subtasks: `gate_crisis_and_pii` → `extract_claims` → `match_template` → `build_position_and_exercise` → `verify_output`

Web service `stencil-api` remains the synchronous demo path; Workflows add durable retries + scale-to-zero for the prize criteria.

## Demo script (2 minutes)

1. Landing → Safety model (988)  
2. Sign in → paste diary → tool `apply_stencil` → pipeline stages + visual worksheet  
3. Ask “What do you remember?” → `get_memory`  
4. Paste crisis language → short-circuit, no template  
5. Mention Render Workflows + verification in Q&A  

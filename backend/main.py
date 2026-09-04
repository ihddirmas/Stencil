"""FastAPI entrypoint for Stencil."""

from __future__ import annotations

import os
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

from backend.pipeline import run_pipeline
from backend.privacy import redact_pii
from backend.safety import check_crisis_language, crisis_resources

load_dotenv()
load_dotenv(Path(__file__).resolve().parent / ".env")

FRONTEND_DIR = Path(__file__).resolve().parent.parent / "frontend"

app = FastAPI(
    title="Stencil",
    description=(
        "Convert diary entries into evolving, editable evidence-based journaling "
        "templates — framework visuals annotated with the user's own words. "
        "Crisis-gated, PII-minimized, output-verified psychoeducational agent pipeline."
    ),
    version="0.3.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("CORS_ORIGINS", "*").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class AnalyzeRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=20000)


@app.get("/api/health")
async def health() -> dict:
    return {
        "status": "ok",
        "demo_mode": os.getenv("DEMO_MODE", "0"),
        "has_api_key": bool(os.getenv("ANTHROPIC_API_KEY")),
        "safety": {
            "crisis_gate": True,
            "pii_minimization": True,
            "output_verification": True,
            "psychoeducational_only": True,
        },
        "pipeline": [
            "privacy",
            "extract",
            "match",
            "position",
            "exercise",
            "verify",
        ],
        "workflows": {
            "render_workflows": bool(os.getenv("RENDER_WORKFLOW_NAME")),
            "note": "Optional durable orchestration via Render Workflows (see /workflows)",
        },
    }


@app.post("/api/analyze")
async def analyze(body: AnalyzeRequest) -> dict:
    text = body.text.strip()
    if not text:
        raise HTTPException(status_code=400, detail="Text is required.")

    # Safety short-circuit — never run the framework pipeline on crisis language.
    # Runs on RAW text before PII redaction so we do not miss crisis phrasing.
    if check_crisis_language(text):
        return {
            "crisis_flag": True,
            "resources": crisis_resources(),
            "message": (
                "We paused the pattern analysis. If you are in distress, please reach out "
                "to someone you trust or a crisis resource below."
            ),
            "safety": {
                "psychoeducational_only": True,
                "crisis_gated": True,
                "pipeline_skipped": True,
            },
            "pipeline_trace": {
                "stages": [
                    {
                        "id": "crisis_gate",
                        "label": "Crisis short-circuit",
                        "status": "triggered",
                        "detail": "Skipped generative pipeline; surfaced verified resources only",
                    }
                ],
                "orchestration": "crisis_gate→resources",
            },
        }

    # Minimize identifiers before any generative stage.
    _, preview_events = redact_pii(text)

    try:
        result = await run_pipeline(text)
        # Ensure crisis never leaks through demo/live paths.
        if result.get("crisis_flag"):
            return result
        result.setdefault("safety", {})["pii_preview_events"] = preview_events
        return result
    except Exception as exc:  # noqa: BLE001 — surface clean error to demo UI
        raise HTTPException(status_code=502, detail=f"Analysis failed: {exc}") from exc


@app.get("/")
async def index() -> FileResponse:
    return FileResponse(FRONTEND_DIR / "index.html")


if FRONTEND_DIR.exists():
    app.mount("/static", StaticFiles(directory=FRONTEND_DIR), name="static")


@app.get("/styles.css")
async def styles() -> FileResponse:
    return FileResponse(FRONTEND_DIR / "styles.css")


@app.get("/app.js")
async def app_js() -> FileResponse:
    return FileResponse(FRONTEND_DIR / "app.js")

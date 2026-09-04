"""
Stencil Render Workflows — durable multi-stage mental-health journaling pipeline.

Deploy as a Render Workflow service (Dashboard → New → Workflow).
Tasks chain: crisis/PII gate → extract → match → position → verify.

Prize angle: Best Use of Render Workflows.
"""

from __future__ import annotations

import os
import sys
from pathlib import Path
from typing import Any

# Allow importing the shared backend package from the monorepo root.
ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from render import Retry, TaskContext, Workflows  # noqa: E402

from backend.pipeline import (  # noqa: E402
    _client,
    _demo_pipeline,
    stage_extract,
    stage_generate_position,
    stage_match_framework,
    stage_recommend_exercise,
)
from backend.frameworks import StencilResult  # noqa: E402
from backend.privacy import redact_pii  # noqa: E402
from backend.safety import check_crisis_language, crisis_resources  # noqa: E402
from backend.verify import verify_stencil_output  # noqa: E402

app = Workflows(
    default_retry=Retry(max_retries=2, wait_duration_ms=800, backoff_scaling=1.5),
    default_timeout=180,
)


def _use_demo() -> bool:
    if os.getenv("DEMO_MODE", "").strip() in {"1", "true", "True", "yes"}:
        return True
    if not os.getenv("ANTHROPIC_API_KEY"):
        return True
    return False


@app.task(name="gate_crisis_and_pii")
def gate_crisis_and_pii(ctx: TaskContext, text: str) -> dict[str, Any]:
    """Stage 0–1: crisis short-circuit + PII minimization before any model work."""
    if check_crisis_language(text):
        return {
            "crisis_flag": True,
            "resources": crisis_resources(),
            "message": (
                "We paused the pattern analysis. If you are in distress, please reach out "
                "to someone you trust or a crisis resource below."
            ),
            "sanitized_text": None,
            "pii_redactions": [],
        }
    sanitized, events = redact_pii(text)
    return {
        "crisis_flag": False,
        "sanitized_text": sanitized,
        "pii_redactions": events,
    }


@app.task(name="extract_claims")
def extract_claims(ctx: TaskContext, sanitized_text: str) -> dict[str, Any]:
    if _use_demo():
        demo = _demo_pipeline(sanitized_text)
        return {"claims": demo.get("claims") or [], "demo": True}
    client = _client()
    return {"claims": stage_extract(client, sanitized_text), "demo": False}


@app.task(name="match_template")
def match_template(ctx: TaskContext, claims: list[dict[str, str]]) -> dict[str, Any]:
    if _use_demo():
        # Matcher is embedded in demo pipeline; return a stub for chaining demos.
        return {
            "template_type": "quadrant",
            "labels": {},
            "source_citation": "Consciousness × Agency map (adapted from Limberg-style 2×2 frameworks)",
            "why": "Demo match via Render Workflows chain",
            "detected_distortions": [],
            "demo": True,
        }
    client = _client()
    match = stage_match_framework(client, claims)
    match["demo"] = False
    return match


@app.task(name="build_position_and_exercise")
def build_position_and_exercise(
    ctx: TaskContext,
    claims: list[dict[str, str]],
    match: dict[str, Any],
) -> dict[str, Any]:
    if match.get("demo") or _use_demo():
        # Full demo result constructed in orchestrator from sanitized text instead.
        return {"demo": True}
    client = _client()
    generated = stage_generate_position(client, claims, match)
    exercise = stage_recommend_exercise(match, generated, claims)
    return {"generated": generated, "exercise": exercise, "demo": False}


@app.task(name="verify_output")
def verify_output(ctx: TaskContext, result: dict[str, Any]) -> dict[str, Any]:
    report = verify_stencil_output(result)
    return {"result": result, "verification": report}


@app.task(name="orchestrate_stencil", timeout=300)
async def orchestrate_stencil(ctx: TaskContext, text: str) -> dict[str, Any]:
    """
    Root Render Workflows task: durable chain for Stencil analyze.

    Each stage runs as its own task instance with retries — Best Use of Render Workflows.
    """
    gate = await ctx.run(gate_crisis_and_pii, text)
    if gate.get("crisis_flag"):
        gate["pipeline_trace"] = {
            "stages": [
                {
                    "id": "crisis_gate",
                    "label": "Crisis short-circuit",
                    "status": "triggered",
                    "detail": "Render Workflows halted generative chain",
                }
            ],
            "orchestration": "render_workflows:crisis_gate",
        }
        return gate

    sanitized = gate["sanitized_text"]
    extracted = await ctx.run(extract_claims, sanitized)
    claims = extracted["claims"]

    if extracted.get("demo") or _use_demo():
        result = _demo_pipeline(sanitized)
        verified = await ctx.run(verify_output, result)
        result = verified["result"]
        verification = verified["verification"]
        result["pipeline_trace"] = {
            "stages": [
                {"id": "privacy", "label": "PII minimization", "status": "done"},
                {"id": "extract", "label": "Extract claims", "status": "done"},
                {"id": "match", "label": "Match template", "status": "done"},
                {"id": "position", "label": "Position / worksheet", "status": "done"},
                {"id": "verify", "label": "Output verification", "status": "done"},
            ],
            "pii_redactions": gate.get("pii_redactions") or [],
            "verification": verification,
            "orchestration": "render_workflows:orchestrate_stencil",
        }
        result["safety"] = {
            "psychoeducational_only": True,
            "crisis_gated": True,
            "pii_minimized": True,
            "output_verified": verification.get("ok", False),
            "render_workflows": True,
        }
        return result

    match = await ctx.run(match_template, claims)
    built = await ctx.run(build_position_and_exercise, claims, match)
    generated = built["generated"]
    exercise = built["exercise"]
    title_map = {
        "quadrant": "Consciousness × Agency",
        "triangle": "Your triangle map",
        "identity_shift": "Who I Had to Be vs Who I'm Becoming",
        "forgiveness": "Forgiving Yourself for Past Mistakes",
        "cognitive_distortions": "Cognitive Distortions",
    }
    result = StencilResult(
        template_type=match["template_type"],
        title=title_map.get(match["template_type"], "Your stencil"),
        source_citation=match["source_citation"],
        annotations=generated["annotations"],
        framework=generated.get("framework"),
        worksheet=generated.get("worksheet") or exercise.get("fields") or {},
        exercise=exercise,
        claims=claims,
    ).model_dump()

    verified = await ctx.run(verify_output, result)
    result = verified["result"]
    verification = verified["verification"]
    result["pipeline_trace"] = {
        "stages": [
            {"id": "privacy", "label": "PII minimization", "status": "done"},
            {"id": "extract", "label": "Extract claims", "status": "done", "detail": f"{len(claims)} claims"},
            {"id": "match", "label": "Match template", "status": "done", "detail": match["template_type"]},
            {"id": "position", "label": "Position / worksheet", "status": "done"},
            {"id": "verify", "label": "Output verification", "status": "done"},
        ],
        "pii_redactions": gate.get("pii_redactions") or [],
        "verification": verification,
        "orchestration": "render_workflows:orchestrate_stencil",
    }
    result["safety"] = {
        "psychoeducational_only": True,
        "crisis_gated": True,
        "pii_minimized": True,
        "output_verified": verification.get("ok", False),
        "render_workflows": True,
    }
    return result


if __name__ == "__main__":
    # Local / Render Workflows entrypoint
    app.start()

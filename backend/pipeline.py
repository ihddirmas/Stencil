"""4-stage Pattern Mirror pipeline using Anthropic tool use / structured output."""

from __future__ import annotations

import json
import os
from typing import Any

from anthropic import Anthropic
from pydantic import ValidationError

from backend.exercises import pick_exercise
from backend.frameworks import (
    QUADRANT_FRAMEWORK,
    TRIANGLE_FRAMEWORK,
    AnalyzeSuccess,
    FrameworkResult,
)
from backend.safety import SYSTEM_PROMPT_CONSTRAINT

MODEL = os.getenv("ANTHROPIC_MODEL", "claude-sonnet-4-20250514")


def _client() -> Anthropic:
    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        raise RuntimeError(
            "ANTHROPIC_API_KEY is not set. Add it to your environment or enable DEMO_MODE=1."
        )
    return Anthropic(api_key=api_key)


def _tool_result(client: Anthropic, tools: list[dict], messages: list[dict], system: str) -> dict:
    """Call Claude with forced tool use; retry once on schema/tool miss."""
    last_error: Exception | None = None
    working_messages = list(messages)

    for attempt in range(2):
        response = client.messages.create(
            model=MODEL,
            max_tokens=2048,
            system=system,
            tools=tools,
            tool_choice={"type": "any"},
            messages=working_messages,
        )
        tool_blocks = [b for b in response.content if getattr(b, "type", None) == "tool_use"]
        if not tool_blocks:
            last_error = ValueError("Model returned no tool_use block")
            working_messages = working_messages + [
                {"role": "assistant", "content": response.content},
                {
                    "role": "user",
                    "content": (
                        "Your last response didn't use a tool. Call the required tool "
                        "with a payload that matches the schema exactly."
                    ),
                },
            ]
            continue
        return tool_blocks[0].input  # type: ignore[no-any-return]

    raise RuntimeError(f"Structured tool call failed after retry: {last_error}")


def _validate_with_retry(
    client: Anthropic,
    tools: list[dict],
    messages: list[dict],
    system: str,
    validator,
) -> Any:
    raw = _tool_result(client, tools, messages, system)
    try:
        return validator(raw)
    except (ValidationError, ValueError, KeyError, TypeError) as exc:
        retry_messages = messages + [
            {
                "role": "user",
                "content": (
                    f"Your last tool payload failed validation: {exc}. "
                    "Call the tool again with a corrected payload that matches the schema."
                ),
            }
        ]
        raw = _tool_result(client, tools, retry_messages, system)
        return validator(raw)


# --- Stage 1: Extractor -------------------------------------------------------

EXTRACT_TOOL = {
    "name": "submit_claims",
    "description": "Submit 3–6 discrete patterns extracted from the journal text.",
    "input_schema": {
        "type": "object",
        "properties": {
            "claims": {
                "type": "array",
                "minItems": 3,
                "maxItems": 6,
                "items": {
                    "type": "object",
                    "properties": {
                        "claim": {
                            "type": "string",
                            "description": "Short paraphrased pattern or belief",
                        },
                        "quote": {
                            "type": "string",
                            "description": "Closest verbatim quote from the original text",
                        },
                    },
                    "required": ["claim", "quote"],
                },
            }
        },
        "required": ["claims"],
    },
}


def stage_extract(client: Anthropic, raw_text: str) -> list[dict[str, str]]:
    system = (
        SYSTEM_PROMPT_CONSTRAINT
        + "\n\nYou extract reflective patterns from journal text. "
        "Do not diagnose. Prefer the user's own language in quotes."
    )
    messages = [
        {
            "role": "user",
            "content": (
                "Extract 3–6 discrete claims/patterns from this journal text. "
                "Each claim is a short paraphrase of what the writer seems to believe, "
                "feel, or avoid. Pair each with the closest verbatim quote.\n\n"
                f"JOURNAL TEXT:\n{raw_text}"
            ),
        }
    ]

    def validator(raw: dict) -> list[dict[str, str]]:
        claims = raw.get("claims")
        if not isinstance(claims, list) or not (3 <= len(claims) <= 6):
            raise ValueError("claims must be a list of 3–6 items")
        cleaned: list[dict[str, str]] = []
        for item in claims:
            claim = str(item.get("claim", "")).strip()
            quote = str(item.get("quote", "")).strip()
            if not claim or not quote:
                raise ValueError("each claim needs claim and quote")
            cleaned.append({"claim": claim, "quote": quote})
        return cleaned

    return _validate_with_retry(client, [EXTRACT_TOOL], messages, system, validator)


# --- Stage 2: Framework Matcher -----------------------------------------------

MATCH_TOOL = {
    "name": "submit_framework_choice",
    "description": "Choose quadrant or triangle and generate labels for this user's content.",
    "input_schema": {
        "type": "object",
        "properties": {
            "framework_type": {"type": "string", "enum": ["quadrant", "triangle"]},
            "labels": {
                "type": "object",
                "additionalProperties": {"type": "string"},
                "description": (
                    "Quadrant requires: x_low, x_high, y_low, y_high, top_left, top_right, "
                    "bottom_left, bottom_right. Triangle requires: vertex_a, vertex_b, vertex_c."
                ),
            },
            "source_citation": {"type": "string"},
            "why": {"type": "string"},
        },
        "required": ["framework_type", "labels", "source_citation", "why"],
    },
}


def stage_match_framework(
    client: Anthropic, claims: list[dict[str, str]]
) -> dict[str, Any]:
    system = (
        SYSTEM_PROMPT_CONSTRAINT
        + "\n\nYou choose which pre-built framework template fits the extracted patterns "
        "and invent axis/vertex labels specific to THIS user's content — not generic mood labels."
    )
    claim_blob = json.dumps(claims, indent=2)
    messages = [
        {
            "role": "user",
            "content": (
                "Decide whether a QUADRANT (2-axis) or TRIANGLE (3-vertex) framework better "
                "fits these claims. Generate specific labels for this content.\n\n"
                f"QUADRANT template shape: {json.dumps(QUADRANT_FRAMEWORK['description'])}\n"
                f"TRIANGLE template shape: {json.dumps(TRIANGLE_FRAMEWORK['description'])}\n\n"
                "For quadrant labels include: x_low, x_high, y_low, y_high, "
                "top_left, top_right, bottom_left, bottom_right.\n"
                "For triangle labels include: vertex_a, vertex_b, vertex_c.\n"
                "Cite an established source (CBT thought-record / reflective self-inquiry) — "
                "do not invent fake papers.\n\n"
                f"CLAIMS:\n{claim_blob}"
            ),
        }
    ]

    def validator(raw: dict) -> dict[str, Any]:
        ftype = raw.get("framework_type")
        labels = raw.get("labels") or {}
        citation = str(raw.get("source_citation", "")).strip()
        if ftype not in ("quadrant", "triangle"):
            raise ValueError("framework_type must be quadrant or triangle")
        if not isinstance(labels, dict) or not labels:
            raise ValueError("labels required")
        if ftype == "quadrant":
            needed = {
                "x_low",
                "x_high",
                "y_low",
                "y_high",
                "top_left",
                "top_right",
                "bottom_left",
                "bottom_right",
            }
            if needed - set(labels):
                raise ValueError(f"missing quadrant labels: {needed - set(labels)}")
            citation = citation or QUADRANT_FRAMEWORK["source_citation"]
        else:
            needed = {"vertex_a", "vertex_b", "vertex_c"}
            if needed - set(labels):
                raise ValueError(f"missing triangle labels: {needed - set(labels)}")
            citation = citation or TRIANGLE_FRAMEWORK["source_citation"]
        return {
            "framework_type": ftype,
            "labels": {k: str(v) for k, v in labels.items()},
            "source_citation": citation,
            "why": str(raw.get("why", "")),
        }

    return _validate_with_retry(client, [MATCH_TOOL], messages, system, validator)


# --- Stage 3: Position Generator ----------------------------------------------

POSITION_TOOL = {
    "name": "submit_position",
    "description": "Plot the user's claims onto the chosen framework with annotations.",
    "input_schema": {
        "type": "object",
        "properties": {
            "position": {
                "type": "object",
                "additionalProperties": {"type": "number"},
                "description": "Quadrant: x,y in 0–1. Triangle: vertex_a/b/c weights summing ~1.",
            },
            "annotations": {
                "type": "array",
                "minItems": 1,
                "maxItems": 6,
                "items": {
                    "type": "object",
                    "properties": {
                        "quote": {"type": "string"},
                        "note": {"type": "string"},
                    },
                    "required": ["quote", "note"],
                },
            },
        },
        "required": ["position", "annotations"],
    },
}


def stage_generate_position(
    client: Anthropic,
    claims: list[dict[str, str]],
    match: dict[str, Any],
) -> FrameworkResult:
    system = (
        SYSTEM_PROMPT_CONSTRAINT
        + "\n\nYou plot reflective patterns onto a named framework. "
        "Annotations must use the user's verbatim quotes."
    )
    messages = [
        {
            "role": "user",
            "content": (
                f"Framework type: {match['framework_type']}\n"
                f"Labels: {json.dumps(match['labels'])}\n"
                f"Claims: {json.dumps(claims)}\n\n"
                "Compute where these claims land overall (one primary position) and produce "
                "annotations pairing verbatim quotes with short notes explaining placement. "
                "For quadrant use x,y in [0,1] where (0,0) is bottom-left. "
                "For triangle use vertex_a, vertex_b, vertex_c weights summing to 1.0."
            ),
        }
    ]

    def validator(raw: dict) -> FrameworkResult:
        return FrameworkResult(
            framework_type=match["framework_type"],
            labels=match["labels"],
            position=raw.get("position") or {},
            annotations=raw.get("annotations") or [],
            source_citation=match["source_citation"],
        )

    return _validate_with_retry(client, [POSITION_TOOL], messages, system, validator)


# --- Stage 4: Exercise Recommender --------------------------------------------

RECOMMEND_TOOL = {
    "name": "submit_exercise_choice",
    "description": "Pick one exercise id from the provided library for this framework result.",
    "input_schema": {
        "type": "object",
        "properties": {
            "exercise_id": {
                "type": "string",
                "description": "One of the provided exercise ids",
            },
            "rationale": {"type": "string"},
        },
        "required": ["exercise_id", "rationale"],
    },
}


def stage_recommend_exercise(
    client: Anthropic,
    framework: FrameworkResult,
    claims: list[dict[str, str]],
) -> dict[str, Any]:
    """Prefer library heuristic; optionally let Claude refine rationale via tool use."""
    # Deterministic library pick keeps demos reliable; Claude may refine rationale.
    base = pick_exercise(
        framework.framework_type,
        framework.position,
        claims,
        framework.labels,
    )
    try:
        from backend.exercises import EXERCISES

        ids = [e["id"] for e in EXERCISES if framework.framework_type in e["fits"]]
        system = SYSTEM_PROMPT_CONSTRAINT + "\n\nPick the single best journaling exercise."
        messages = [
            {
                "role": "user",
                "content": (
                    f"Framework: {framework.framework_type}\n"
                    f"Position: {json.dumps(framework.position)}\n"
                    f"Labels: {json.dumps(framework.labels)}\n"
                    f"Claims: {json.dumps(claims)}\n"
                    f"Available exercise ids: {ids}\n"
                    f"Default pick: {base['exercise_id']}\n"
                    "Confirm or override the exercise_id and write a short rationale."
                ),
            }
        ]

        def validator(raw: dict) -> dict[str, Any]:
            eid = str(raw.get("exercise_id", base["exercise_id"]))
            if eid not in ids:
                eid = base["exercise_id"]
            # Rebuild with chosen id by temporarily filtering
            chosen = next(e for e in EXERCISES if e["id"] == eid)
            rebuilt = pick_exercise(
                framework.framework_type,
                framework.position,
                claims,
                framework.labels,
            )
            # Force the chosen exercise content
            from backend.exercises import fill_template

            fills = {
                "situation": claims[0]["claim"] if claims else "",
                "thought": claims[1]["claim"] if len(claims) > 1 else (claims[0]["claim"] if claims else ""),
                "avoiding": claims[0]["claim"] if claims else "",
                "pull": claims[0]["claim"] if claims else "",
                "hypothesis": claims[0]["claim"] if claims else "",
                "harsh": claims[0]["claim"] if claims else "",
                "vertex_a": framework.labels.get("vertex_a", "A"),
                "vertex_b": framework.labels.get("vertex_b", "B"),
                "vertex_c": framework.labels.get("vertex_c", "C"),
                "claim_a": claims[0]["claim"] if claims else "",
                "claim_b": claims[1]["claim"] if len(claims) > 1 else "",
                "claim_c": claims[2]["claim"] if len(claims) > 2 else "",
            }
            return {
                "title": chosen["title"],
                "html_template": fill_template(chosen["html_template"], fills),
                "rationale": str(raw.get("rationale") or rebuilt["rationale"]),
                "exercise_id": eid,
            }

        return _validate_with_retry(client, [RECOMMEND_TOOL], messages, system, validator)
    except Exception:
        return base


# --- Demo mode ----------------------------------------------------------------

def _demo_pipeline(raw_text: str) -> dict:
    """Deterministic sample so UI can be demoed without an API key."""
    lower = raw_text.lower()
    use_triangle = any(w in lower for w in ("critic", "hypocrit", "avoid", "triangle"))
    if use_triangle:
        framework = FrameworkResult(
            framework_type="triangle",
            labels={
                "vertex_a": "Avoid",
                "vertex_b": "Criticize",
                "vertex_c": "Perform / Prove",
            },
            position={"vertex_a": 0.45, "vertex_b": 0.35, "vertex_c": 0.20},
            annotations=[
                {
                    "quote": "I keep putting it off",
                    "note": "Pulls toward Avoid — delay as protection.",
                },
                {
                    "quote": "I'm being lazy",
                    "note": "Inner Criticize voice naming the delay as a moral failure.",
                },
                {
                    "quote": "I should already be further along",
                    "note": "Perform / Prove pressure underneath the criticism.",
                },
            ],
            source_citation=TRIANGLE_FRAMEWORK["source_citation"],
        )
    else:
        framework = FrameworkResult(
            framework_type="quadrant",
            labels={
                "x_low": "Avoid",
                "x_high": "Approach",
                "y_low": "Low stakes",
                "y_high": "High stakes",
                "top_left": "Freeze under pressure",
                "top_right": "Brave experiment",
                "bottom_left": "Quiet retreat",
                "bottom_right": "Low-risk practice",
            },
            position={"x": 0.32, "y": 0.68},
            annotations=[
                {
                    "quote": "I keep rewriting the same paragraph",
                    "note": "High stakes + avoid — polishing as delay.",
                },
                {
                    "quote": "What if it's not good enough",
                    "note": "Stakes feel personal; approach feels costly.",
                },
                {
                    "quote": "Maybe I'll send it tomorrow",
                    "note": "Soft deferral — still in the freeze region.",
                },
            ],
            source_citation=QUADRANT_FRAMEWORK["source_citation"],
        )

    claims = [
        {"claim": a.note.split("—")[0].strip(), "quote": a.quote}
        for a in framework.annotations
    ]
    # Ensure at least short claims
    claims = [
        {"claim": c["claim"] or c["quote"], "quote": c["quote"]} for c in claims
    ]
    exercise = pick_exercise(
        framework.framework_type, framework.position, claims, framework.labels
    )
    result = AnalyzeSuccess(framework=framework, exercise=exercise, claims=claims)
    return result.model_dump()


# --- Orchestrator -------------------------------------------------------------

async def run_pipeline(raw_text: str) -> dict:
    """Run Extractor → Matcher → Position → Exercise; return JSON-ready dict."""
    if os.getenv("DEMO_MODE", "").strip() in {"1", "true", "True", "yes"}:
        return _demo_pipeline(raw_text)

    if not os.getenv("ANTHROPIC_API_KEY"):
        # Fall back so local UI work isn't blocked; production should set the key.
        if os.getenv("ALLOW_DEMO_FALLBACK", "1") == "1":
            return _demo_pipeline(raw_text)
        raise RuntimeError("ANTHROPIC_API_KEY is required")

    client = _client()
    claims = stage_extract(client, raw_text)
    match = stage_match_framework(client, claims)
    framework = stage_generate_position(client, claims, match)
    exercise = stage_recommend_exercise(client, framework, claims)
    result = AnalyzeSuccess(framework=framework, exercise=exercise, claims=claims)
    return result.model_dump()

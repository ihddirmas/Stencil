"""4-stage Stencil pipeline using Anthropic tool use / structured output."""

from __future__ import annotations

import json
import os
import re
from typing import Any

from anthropic import Anthropic
from pydantic import ValidationError

from backend.exercises import pick_exercise
from backend.frameworks import (
    COGNITIVE_DISTORTIONS_FRAMEWORK,
    FORGIVENESS_FRAMEWORK,
    IDENTITY_SHIFT_FRAMEWORK,
    QUADRANT_FRAMEWORK,
    TRIANGLE_FRAMEWORK,
    FrameworkResult,
    StencilResult,
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

    for _attempt in range(2):
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
                        "claim": {"type": "string"},
                        "quote": {"type": "string"},
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


# --- Stage 2: Template / Framework Matcher ------------------------------------

MATCH_TOOL = {
    "name": "submit_template_choice",
    "description": "Choose which Stencil template fits and generate labels/fields.",
    "input_schema": {
        "type": "object",
        "properties": {
            "template_type": {
                "type": "string",
                "enum": [
                    "quadrant",
                    "triangle",
                    "identity_shift",
                    "forgiveness",
                    "cognitive_distortions",
                ],
            },
            "labels": {
                "type": "object",
                "additionalProperties": {"type": "string"},
            },
            "source_citation": {"type": "string"},
            "why": {"type": "string"},
            "detected_distortions": {
                "type": "array",
                "items": {
                    "type": "string",
                    "enum": [
                        "all_or_nothing",
                        "catastrophizing",
                        "mind_reading",
                        "should_statements",
                    ],
                },
            },
        },
        "required": ["template_type", "source_citation", "why"],
    },
}


def stage_match_framework(
    client: Anthropic, claims: list[dict[str, str]]
) -> dict[str, Any]:
    system = (
        SYSTEM_PROMPT_CONSTRAINT
        + "\n\nYou choose which pre-built Stencil template fits the extracted patterns. "
        "Prefer evidence-based templates. Invent axis/vertex labels only for quadrant/triangle."
    )
    claim_blob = json.dumps(claims, indent=2)
    messages = [
        {
            "role": "user",
            "content": (
                "Pick ONE template:\n"
                "- quadrant: Consciousness×Agency style 2x2 map (or similar axes)\n"
                "- triangle: 3-vertex conflict map\n"
                "- identity_shift: Who I Had to Be vs Who I'm Becoming\n"
                "- forgiveness: self-forgiveness worksheet when guilt/shame about a past act\n"
                "- cognitive_distortions: CBT thinking traps when should/all-or-nothing/mind-reading appear\n\n"
                "For quadrant labels include: x_low, x_high, y_low, y_high, "
                "top_left, top_right, bottom_left, bottom_right.\n"
                "For triangle labels include: vertex_a, vertex_b, vertex_c.\n"
                "For cognitive_distortions, list detected_distortions ids.\n"
                "Cite established sources — do not invent fake papers.\n\n"
                f"CLAIMS:\n{claim_blob}"
            ),
        }
    ]

    def validator(raw: dict) -> dict[str, Any]:
        ftype = raw.get("template_type")
        labels = raw.get("labels") or {}
        citation = str(raw.get("source_citation", "")).strip()
        allowed = {
            "quadrant",
            "triangle",
            "identity_shift",
            "forgiveness",
            "cognitive_distortions",
        }
        if ftype not in allowed:
            raise ValueError("invalid template_type")
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
                labels = {**QUADRANT_FRAMEWORK["default_labels"], **labels}
            citation = citation or QUADRANT_FRAMEWORK["source_citation"]
        elif ftype == "triangle":
            needed = {"vertex_a", "vertex_b", "vertex_c"}
            if needed - set(labels):
                raise ValueError(f"missing triangle labels: {needed - set(labels)}")
            citation = citation or TRIANGLE_FRAMEWORK["source_citation"]
        elif ftype == "identity_shift":
            citation = citation or IDENTITY_SHIFT_FRAMEWORK["source_citation"]
        elif ftype == "forgiveness":
            citation = citation or FORGIVENESS_FRAMEWORK["source_citation"]
        else:
            citation = citation or COGNITIVE_DISTORTIONS_FRAMEWORK["source_citation"]
        return {
            "template_type": ftype,
            "labels": {k: str(v) for k, v in labels.items()} if isinstance(labels, dict) else {},
            "source_citation": citation,
            "why": str(raw.get("why", "")),
            "detected_distortions": raw.get("detected_distortions") or [],
        }

    return _validate_with_retry(client, [MATCH_TOOL], messages, system, validator)


# --- Stage 3: Position / Worksheet Generator ----------------------------------

POSITION_TOOL = {
    "name": "submit_position_or_worksheet",
    "description": "Plot diagram position and/or fill worksheet fields with user quotes.",
    "input_schema": {
        "type": "object",
        "properties": {
            "position": {
                "type": "object",
                "additionalProperties": {"type": "number"},
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
            "worksheet": {
                "type": "object",
                "description": "Template-specific editable fields",
            },
        },
        "required": ["annotations"],
    },
}


def stage_generate_position(
    client: Anthropic,
    claims: list[dict[str, str]],
    match: dict[str, Any],
) -> dict[str, Any]:
    system = (
        SYSTEM_PROMPT_CONSTRAINT
        + "\n\nYou apply a named framework to the user's words. "
        "Annotations must use verbatim quotes. Prefill worksheet fields from their language."
    )
    messages = [
        {
            "role": "user",
            "content": (
                f"Template: {match['template_type']}\n"
                f"Labels: {json.dumps(match.get('labels') or {})}\n"
                f"Detected distortions: {json.dumps(match.get('detected_distortions') or [])}\n"
                f"Claims: {json.dumps(claims)}\n\n"
                "Return annotations (quote+note). "
                "For quadrant/triangle also return position. "
                "For identity_shift / forgiveness / cognitive_distortions return a worksheet object "
                "with sensible prefilled strings drawn from the claims."
            ),
        }
    ]

    def validator(raw: dict) -> dict[str, Any]:
        annotations = raw.get("annotations") or []
        if not annotations:
            raise ValueError("annotations required")
        out: dict[str, Any] = {
            "annotations": annotations,
            "worksheet": raw.get("worksheet") or {},
            "position": raw.get("position") or {},
        }
        if match["template_type"] in ("quadrant", "triangle"):
            out["framework"] = FrameworkResult(
                framework_type=match["template_type"],
                labels=match["labels"],
                position=raw.get("position") or {},
                annotations=annotations,
                source_citation=match["source_citation"],
            )
        return out

    return _validate_with_retry(client, [POSITION_TOOL], messages, system, validator)


# --- Stage 4: Exercise / worksheet packaging ----------------------------------

def stage_recommend_exercise(
    match: dict[str, Any],
    generated: dict[str, Any],
    claims: list[dict[str, str]],
) -> dict[str, Any]:
    ttype = match["template_type"]
    if ttype in ("quadrant", "triangle") and generated.get("framework"):
        fw: FrameworkResult = generated["framework"]
        base = pick_exercise(fw.framework_type, fw.position, claims, fw.labels)
        base["template_type"] = ttype
        return base

    if ttype == "identity_shift":
        ws = generated.get("worksheet") or {}
        return {
            "title": "Who I Had to Be vs Who I'm Becoming",
            "html_template": "",
            "rationale": match.get("why")
            or "Your entries show roles built for safety alongside a pull toward a chosen identity.",
            "exercise_id": "identity_shift",
            "template_type": ttype,
            "fields": ws,
        }
    if ttype == "forgiveness":
        ws = generated.get("worksheet") or {}
        return {
            "title": "Forgiving Yourself for Past Mistakes",
            "html_template": "",
            "rationale": match.get("why")
            or "Self-blame showed up — this stencil walks compassion without erasing accountability.",
            "exercise_id": "forgiveness",
            "template_type": ttype,
            "fields": ws,
        }
    # cognitive_distortions
    catalog = COGNITIVE_DISTORTIONS_FRAMEWORK["catalog"]
    detected = match.get("detected_distortions") or ["should_statements"]
    rows = []
    for item in catalog:
        if item["id"] in detected:
            rows.append(
                {
                    **item,
                    "my_example": claims[0]["quote"] if claims else item["example"],
                    "my_challenge": item["challenge"],
                }
            )
    if not rows:
        rows = [{**catalog[0], "my_example": claims[0]["quote"] if claims else "", "my_challenge": catalog[0]["challenge"]}]
    return {
        "title": "Cognitive Distortions",
        "html_template": "",
        "rationale": match.get("why")
        or "Thinking traps appeared in your wording — challenge them with evidence, not certainty.",
        "exercise_id": "cognitive_distortions",
        "template_type": ttype,
        "fields": {"distortions": rows},
    }


# --- Demo helpers -------------------------------------------------------------

def _snippet_quotes(raw_text: str, fallbacks: list[str], limit: int = 3) -> list[str]:
    lines = [ln.strip(" -\t") for ln in raw_text.splitlines() if ln.strip()]
    cleaned: list[str] = []
    for ln in lines:
        ln = re.sub(
            r"^(mon|tue|tues|wed|thu|thur|fri|sat|sun)[a-z]*\s*[—\-:]\s*",
            "",
            ln,
            flags=re.IGNORECASE,
        ).strip()
        if len(ln) > 12:
            cleaned.append(ln)
    expanded: list[str] = []
    for ln in cleaned:
        parts = [p.strip() for p in re.split(r"[.?!—]", ln) if len(p.strip()) > 12]
        expanded.extend(parts or [ln])
    quotes = expanded[:limit]
    while len(quotes) < limit:
        quotes.append(fallbacks[len(quotes) % len(fallbacks)])
    return [q[:140] for q in quotes]


def _pick_demo_template(lower: str) -> str:
    if any(w in lower for w in ("forgive", "guilt", "shame", "mistake", "regret")):
        return "forgiveness"
    if any(
        w in lower
        for w in ("should", "always", "never", "everyone thinks", "failure", "perfect", "catastroph")
    ):
        return "cognitive_distortions"
    if any(w in lower for w in ("who i had", "mask", "role", "becoming", "fixer", "caretaker", "performer")):
        return "identity_shift"
    if any(w in lower for w in ("critic", "hypocrit", "triangle")):
        return "triangle"
    return "quadrant"


def _demo_pipeline(raw_text: str) -> dict:
    """Deterministic sample so UI can be demoed without an API key."""
    lower = raw_text.lower()
    ttype = _pick_demo_template(lower)
    quotes = _snippet_quotes(
        raw_text,
        [
            "I keep rewriting the same paragraph",
            "What if it's not good enough",
            "Maybe I'll send it tomorrow",
        ],
    )
    claims = [{"claim": q, "quote": q} for q in quotes]

    if ttype == "triangle":
        framework = FrameworkResult(
            framework_type="triangle",
            labels={
                "vertex_a": "Avoid",
                "vertex_b": "Criticize",
                "vertex_c": "Perform / Prove",
            },
            position={"vertex_a": 0.45, "vertex_b": 0.35, "vertex_c": 0.20},
            annotations=[
                {"quote": quotes[0], "note": "Pulls toward Avoid — delay as protection."},
                {"quote": quotes[1], "note": "Inner Criticize voice."},
                {"quote": quotes[2], "note": "Perform / Prove pressure underneath."},
            ],
            source_citation=TRIANGLE_FRAMEWORK["source_citation"],
        )
        exercise = pick_exercise("triangle", framework.position, claims, framework.labels)
        exercise["template_type"] = "triangle"
        return StencilResult(
            template_type="triangle",
            title="Your triangle map",
            source_citation=framework.source_citation,
            annotations=framework.annotations,
            framework=framework,
            exercise=exercise,
            claims=claims,
        ).model_dump()

    if ttype == "identity_shift":
        citation = IDENTITY_SHIFT_FRAMEWORK["source_citation"]
        worksheet = {
            "had_to_be": ["The Overthinker", "The Avoider", "The Performer"],
            "becoming": ["The Boundary-Setter", "The Fully-Expressed Self", "The One Who Slows Down"],
            "had_to_line_a": quotes[0][:80],
            "had_to_line_b": "unsafe / not enough",
            "becoming_line_a": "tell the truth sooner",
            "becoming_line_b": "honesty without self-abandonment",
            "letting_go": quotes[1],
            "reclaiming": "Permission to be unfinished and still worthy.",
            "anchor": (
                "I don't shame who I had to be to survive. "
                "I just know I'm free now to become who I really am."
            ),
        }
        annotations = [
            {"quote": quotes[0], "note": "A role that may have been built for safety."},
            {"quote": quotes[1], "note": "A pull toward a chosen identity."},
        ]
        return StencilResult(
            template_type="identity_shift",
            title="Who I Had to Be vs Who I'm Becoming",
            source_citation=citation,
            annotations=annotations,
            worksheet=worksheet,
            exercise={
                "title": "Who I Had to Be vs Who I'm Becoming",
                "html_template": "",
                "rationale": "Your writing shows protective roles alongside a desire to choose differently.",
                "exercise_id": "identity_shift",
                "template_type": "identity_shift",
                "fields": worksheet,
            },
            claims=claims,
        ).model_dump()

    if ttype == "forgiveness":
        citation = FORGIVENESS_FRAMEWORK["source_citation"]
        worksheet = {
            "mistake": quotes[0],
            "emotions": "guilt, shame, sadness",
            "compassion": f"If a friend wrote “{quotes[0]}”, I would remind them they are still learning.",
            "affirmations": (
                "I am worthy of forgiveness.\n"
                "I am growing and learning every day.\n"
                "I can make amends without erasing myself."
            ),
            "visualization": "A weight lifting; breath returning; room to move again.",
        }
        annotations = [
            {"quote": quotes[0], "note": "The moment self-blame clusters around."},
            {"quote": quotes[1], "note": "Emotion that needs compassion, not a verdict."},
        ]
        return StencilResult(
            template_type="forgiveness",
            title="Forgiving Yourself for Past Mistakes",
            source_citation=citation,
            annotations=annotations,
            worksheet=worksheet,
            exercise={
                "title": "Forgiving Yourself for Past Mistakes",
                "html_template": "",
                "rationale": "Self-forgiveness sticks better as a short guided stencil than a wall of analysis.",
                "exercise_id": "forgiveness",
                "template_type": "forgiveness",
                "fields": worksheet,
            },
            claims=claims,
        ).model_dump()

    if ttype == "cognitive_distortions":
        citation = COGNITIVE_DISTORTIONS_FRAMEWORK["source_citation"]
        catalog = COGNITIVE_DISTORTIONS_FRAMEWORK["catalog"]
        detected_ids = []
        if "should" in lower:
            detected_ids.append("should_statements")
        if any(w in lower for w in ("always", "never", "perfect", "failure", "complete")):
            detected_ids.append("all_or_nothing")
        if any(w in lower for w in ("everyone thinks", "they think", "people think")):
            detected_ids.append("mind_reading")
        if any(w in lower for w in ("worst", "catastroph", "ruined", "disaster")):
            detected_ids.append("catastrophizing")
        if not detected_ids:
            detected_ids = ["should_statements", "all_or_nothing"]
        rows = []
        for item in catalog:
            if item["id"] in detected_ids:
                rows.append(
                    {
                        **item,
                        "my_example": quotes[len(rows) % len(quotes)],
                        "my_challenge": item["challenge"],
                    }
                )
        worksheet = {"distortions": rows}
        annotations = [
            {"quote": quotes[0], "note": "Possible thinking trap — check evidence gently."},
            {"quote": quotes[1], "note": "A place to practice a balanced challenge."},
        ]
        return StencilResult(
            template_type="cognitive_distortions",
            title="Cognitive Distortions",
            source_citation=citation,
            annotations=annotations,
            worksheet=worksheet,
            exercise={
                "title": "Cognitive Distortions",
                "html_template": "",
                "rationale": "Spot common traps in your own wording, then rewrite with evidence.",
                "exercise_id": "cognitive_distortions",
                "template_type": "cognitive_distortions",
                "fields": worksheet,
            },
            claims=claims,
        ).model_dump()

    # Default: Consciousness × Agency quadrant (Limberg-inspired)
    labels = dict(QUADRANT_FRAMEWORK["default_labels"])
    framework = FrameworkResult(
        framework_type="quadrant",
        labels=labels,
        position={"x": 0.38, "y": 0.62},
        annotations=[
            {"quote": quotes[0], "note": "Insight present — agency still tentative."},
            {"quote": quotes[1], "note": "Stakes feel high; action slows."},
            {"quote": quotes[2], "note": "Soft deferral keeps you near Spiritual Bypassers."},
        ],
        source_citation=QUADRANT_FRAMEWORK["source_citation"],
    )
    exercise = pick_exercise("quadrant", framework.position, claims, framework.labels)
    exercise["template_type"] = "quadrant"
    return StencilResult(
        template_type="quadrant",
        title="Consciousness × Agency",
        source_citation=framework.source_citation,
        annotations=framework.annotations,
        framework=framework,
        exercise=exercise,
        claims=claims,
    ).model_dump()


# --- Orchestrator -------------------------------------------------------------

async def run_pipeline(raw_text: str) -> dict:
    """Run Extractor → Matcher → Position → Exercise; return JSON-ready dict."""
    if os.getenv("DEMO_MODE", "").strip() in {"1", "true", "True", "yes"}:
        return _demo_pipeline(raw_text)

    if not os.getenv("ANTHROPIC_API_KEY"):
        if os.getenv("ALLOW_DEMO_FALLBACK", "1") == "1":
            return _demo_pipeline(raw_text)
        raise RuntimeError("ANTHROPIC_API_KEY is required")

    client = _client()
    claims = stage_extract(client, raw_text)
    match = stage_match_framework(client, claims)
    generated = stage_generate_position(client, claims, match)
    exercise = stage_recommend_exercise(match, generated, claims)

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
    )
    return result.model_dump()

"""Stencil framework templates and validation schemas."""

from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field, field_validator, model_validator


FrameworkType = Literal[
    "quadrant",
    "triangle",
    "identity_shift",
    "forgiveness",
    "cognitive_distortions",
]


# --- Shape templates (labels filled per-request) -------------------------------

QUADRANT_FRAMEWORK: dict[str, Any] = {
    "type": "quadrant",
    "description": "2-axis / 4-quadrant map. Labels generated per-request.",
    "default_labels": {
        "x_low": "Low Agency",
        "x_high": "High Agency",
        "y_low": "Low Consciousness",
        "y_high": "High Consciousness",
        "top_left": "Spiritual Bypassers",
        "top_right": "Agentic Sages",
        "bottom_left": "NPCs",
        "bottom_right": "Agentic Fools",
    },
    "source_citation": (
        "Adapted from Peter Limberg / Less Foolish — Consciousness × Agency "
        "(https://lessfoolish.substack.com/p/how-to-win-friends-and-get-things)"
    ),
}

TRIANGLE_FRAMEWORK: dict[str, Any] = {
    "type": "triangle",
    "description": "3-vertex self-inquiry map.",
    "source_citation": (
        "Adapted from triangular conflict / self-inquiry mapping patterns "
        "used in reflective practice and cognitive-behavioral self-observation"
    ),
}

IDENTITY_SHIFT_FRAMEWORK: dict[str, Any] = {
    "type": "identity_shift",
    "description": "Who I Had to Be vs Who I'm Becoming worksheet.",
    "source_citation": (
        "Adapted from identity-reconstruction / parts-work reflective journaling "
        "(roles developed for safety → chosen identity)"
    ),
}

FORGIVENESS_FRAMEWORK: dict[str, Any] = {
    "type": "forgiveness",
    "description": "Self-forgiveness guided worksheet (5 prompts).",
    "source_citation": (
        "Adapted from self-compassion and self-forgiveness journaling practices "
        "(Neff-informed compassion; CBT self-blame work)"
    ),
}

COGNITIVE_DISTORTIONS_FRAMEWORK: dict[str, Any] = {
    "type": "cognitive_distortions",
    "description": "CBT cognitive-distortions spotting + challenge worksheet.",
    "source_citation": (
        "Adapted from CBT cognitive distortions / thought records (Beck; Burns)"
    ),
    "catalog": [
        {
            "id": "all_or_nothing",
            "name": "All-or-Nothing Thinking",
            "description": "Viewing things in black-and-white terms, no middle ground.",
            "example": "If I don't do it perfectly, I've failed.",
            "challenge": "Doing something is better than nothing. Progress counts.",
        },
        {
            "id": "catastrophizing",
            "name": "Catastrophizing",
            "description": "Expecting the worst-case scenario.",
            "example": "If this goes wrong, everything falls apart.",
            "challenge": "There might be discomfort, but I can handle it.",
        },
        {
            "id": "mind_reading",
            "name": "Mind Reading",
            "description": "Assuming you know what others are thinking.",
            "example": "They think I'm incompetent.",
            "challenge": "I don't have evidence of that. I'll check the facts.",
        },
        {
            "id": "should_statements",
            "name": "Should Statements",
            "description": "Holding yourself to rigid rules.",
            "example": "I should be more productive.",
            "challenge": "I'd like to get more done, but rest is also important.",
        },
    ],
}


class Annotation(BaseModel):
    quote: str = Field(..., min_length=1)
    note: str = Field(..., min_length=1)


class FrameworkResult(BaseModel):
    """Unified result for diagram-style frameworks (quadrant / triangle)."""

    framework_type: Literal["quadrant", "triangle"]
    labels: dict[str, str]
    position: dict[str, float]
    annotations: list[Annotation] = Field(default_factory=list, min_length=1)
    source_citation: str

    @field_validator("position")
    @classmethod
    def clamp_position_values(cls, value: dict[str, float]) -> dict[str, float]:
        return {key: float(val) for key, val in value.items()}

    @model_validator(mode="after")
    def validate_shape(self) -> FrameworkResult:
        if self.framework_type == "quadrant":
            required_labels = {
                "x_low",
                "x_high",
                "y_low",
                "y_high",
                "top_left",
                "top_right",
                "bottom_left",
                "bottom_right",
            }
            missing = required_labels - set(self.labels)
            if missing:
                raise ValueError(f"Quadrant labels missing: {sorted(missing)}")
            if "x" not in self.position or "y" not in self.position:
                raise ValueError("Quadrant position requires x and y")
            self.position = {
                "x": max(0.0, min(1.0, self.position["x"])),
                "y": max(0.0, min(1.0, self.position["y"])),
            }
        else:
            required_labels = {"vertex_a", "vertex_b", "vertex_c"}
            missing = required_labels - set(self.labels)
            if missing:
                raise ValueError(f"Triangle labels missing: {sorted(missing)}")
            required_pos = {"vertex_a", "vertex_b", "vertex_c"}
            missing_pos = required_pos - set(self.position)
            if missing_pos:
                raise ValueError(f"Triangle position missing: {sorted(missing_pos)}")
            total = sum(self.position[k] for k in required_pos)
            if total <= 0:
                raise ValueError("Triangle weights must sum to a positive value")
            self.position = {
                k: max(0.0, self.position[k]) / total
                for k in ("vertex_a", "vertex_b", "vertex_c")
            }
        return self


class ExerciseRecommendation(BaseModel):
    title: str
    html_template: str
    rationale: str
    exercise_id: str | None = None
    template_type: str | None = None
    fields: dict[str, Any] = Field(default_factory=dict)


class StencilResult(BaseModel):
    """Full Stencil response: which template + visual data + editable worksheet."""

    crisis_flag: Literal[False] = False
    template_type: FrameworkType
    title: str
    source_citation: str
    annotations: list[Annotation] = Field(default_factory=list)
    # Diagram payloads (optional depending on type)
    framework: FrameworkResult | None = None
    # Worksheet payload — freeform structured fields the UI binds to
    worksheet: dict[str, Any] = Field(default_factory=dict)
    exercise: ExerciseRecommendation | None = None
    claims: list[dict[str, str]] = Field(default_factory=list)


class CrisisResponse(BaseModel):
    crisis_flag: Literal[True] = True
    resources: list[dict[str, str]]
    message: str = (
        "We paused the pattern analysis. If you are in distress, please reach out "
        "to someone you trust or a crisis resource below."
    )


# Back-compat alias used by older pipeline code
AnalyzeSuccess = StencilResult

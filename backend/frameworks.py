"""Framework templates and validation schemas for Pattern Mirror."""

from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field, field_validator, model_validator


QUADRANT_FRAMEWORK: dict[str, Any] = {
    "type": "quadrant",
    "description": (
        "A 2-axis, 4-quadrant map. Axis labels and quadrant names are generated "
        "per-request from the user's patterns; the shape is fixed."
    ),
    "axes": {
        "x": {"low": None, "high": None},
        "y": {"low": None, "high": None},
    },
    "quadrants": {
        "top_left": None,
        "top_right": None,
        "bottom_left": None,
        "bottom_right": None,
    },
    "position": {"x": 0.5, "y": 0.5},
    "source_citation": (
        "Adapted from CBT thought-record / cognitive mapping structures "
        "(Beck; Greenberger & Padesky)"
    ),
}


TRIANGLE_FRAMEWORK: dict[str, Any] = {
    "type": "triangle",
    "description": (
        "A 3-vertex self-inquiry map. Vertex labels are generated per-request; "
        "position is expressed as weights toward each vertex summing to 1.0."
    ),
    "vertices": {
        "vertex_a": None,
        "vertex_b": None,
        "vertex_c": None,
    },
    "position": {"vertex_a": 0.34, "vertex_b": 0.33, "vertex_c": 0.33},
    "source_citation": (
        "Adapted from triangular conflict / self-inquiry mapping patterns "
        "used in reflective practice and cognitive-behavioral self-observation"
    ),
}


class Annotation(BaseModel):
    quote: str = Field(..., min_length=1, description="Verbatim words from the user's entry")
    note: str = Field(..., min_length=1, description="Why this quote lands where it does")


class FrameworkResult(BaseModel):
    framework_type: Literal["quadrant", "triangle"]
    labels: dict[str, str] = Field(
        ...,
        description=(
            "For quadrant: x_low, x_high, y_low, y_high, top_left, top_right, "
            "bottom_left, bottom_right. For triangle: vertex_a, vertex_b, vertex_c."
        ),
    )
    position: dict[str, float] = Field(
        ...,
        description="For quadrant: {x, y} in 0–1. For triangle: vertex weights summing to 1.0.",
    )
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
            x = max(0.0, min(1.0, self.position["x"]))
            y = max(0.0, min(1.0, self.position["y"]))
            self.position = {"x": x, "y": y}
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
                k: max(0.0, self.position[k]) / total for k in ("vertex_a", "vertex_b", "vertex_c")
            }
        return self


class ExerciseRecommendation(BaseModel):
    title: str
    html_template: str
    rationale: str
    exercise_id: str | None = None


class AnalyzeSuccess(BaseModel):
    crisis_flag: Literal[False] = False
    framework: FrameworkResult
    exercise: ExerciseRecommendation
    claims: list[dict[str, str]] = Field(default_factory=list)


class CrisisResponse(BaseModel):
    crisis_flag: Literal[True] = True
    resources: list[dict[str, str]]
    message: str = (
        "We paused the pattern analysis. If you are in distress, please reach out "
        "to someone you trust or a crisis resource below."
    )

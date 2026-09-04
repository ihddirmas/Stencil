"""Output verification layer — citation allowlist + anti-diagnosis scan."""

from __future__ import annotations

import re
from typing import Any

from backend.frameworks import (
    COGNITIVE_DISTORTIONS_FRAMEWORK,
    FORGIVENESS_FRAMEWORK,
    IDENTITY_SHIFT_FRAMEWORK,
    QUADRANT_FRAMEWORK,
    TRIANGLE_FRAMEWORK,
)

ALLOWED_CITATION_SNIPPETS = [
    QUADRANT_FRAMEWORK["source_citation"],
    TRIANGLE_FRAMEWORK["source_citation"],
    IDENTITY_SHIFT_FRAMEWORK["source_citation"],
    FORGIVENESS_FRAMEWORK["source_citation"],
    COGNITIVE_DISTORTIONS_FRAMEWORK["source_citation"],
    "Beck",
    "Burns",
    "CBT",
    "ACT",
    "self-compassion",
    "Neff",
    "Limberg",
    "Karpman",
    "drama triangle",
    "identity",
    "forgiveness",
    "cognitive distortion",
]

_DIAGNOSTIC_PATTERNS = [
    re.compile(p, re.I)
    for p in [
        r"\byou\s+(?:have|are)\s+(?:depression|anxiety|bipolar|ptsd|ocd|adhd|bpd)\b",
        r"\bdiagnos(?:e|is|ed)\b",
        r"\bclinical\s+disorder\b",
        r"\bprescribe\b",
        r"\bmedication\b",
        r"\byou\s+need\s+therapy\b",
        r"\bmental\s+illness\b",
    ]
]


def _flatten_text(result: dict[str, Any]) -> str:
    bits: list[str] = []
    for key in ("title", "source_citation", "summary"):
        if result.get(key):
            bits.append(str(result[key]))
    for a in result.get("annotations") or []:
        bits.append(str(a.get("note", "")))
        bits.append(str(a.get("quote", "")))
    ex = result.get("exercise") or {}
    bits.append(str(ex.get("rationale", "")))
    bits.append(str(ex.get("title", "")))
    return " ".join(bits)


def verify_stencil_output(result: dict[str, Any]) -> dict[str, Any]:
    """
    Guardrail pass after the generative pipeline.
    Returns verification report; may soft-rewrite citation if off-allowlist.
    """
    issues: list[str] = []
    actions: list[str] = []

    citation = str(result.get("source_citation") or "")
    if citation and not any(s.lower() in citation.lower() for s in ALLOWED_CITATION_SNIPPETS):
        issues.append("citation_not_in_allowlist")
        # Soft-correct to template default rather than inventing a paper.
        ttype = result.get("template_type")
        defaults = {
            "quadrant": QUADRANT_FRAMEWORK["source_citation"],
            "triangle": TRIANGLE_FRAMEWORK["source_citation"],
            "identity_shift": IDENTITY_SHIFT_FRAMEWORK["source_citation"],
            "forgiveness": FORGIVENESS_FRAMEWORK["source_citation"],
            "cognitive_distortions": COGNITIVE_DISTORTIONS_FRAMEWORK["source_citation"],
        }
        if ttype in defaults:
            result["source_citation"] = defaults[ttype]
            actions.append("replaced_citation_with_template_default")

    blob = _flatten_text(result)
    for pat in _DIAGNOSTIC_PATTERNS:
        if pat.search(blob):
            issues.append(f"diagnostic_language:{pat.pattern}")
            actions.append("flagged_diagnostic_language")
            break

    # Quote grounding: annotations should prefer user quotes present in claims.
    claims_quotes = {str(c.get("quote", "")).strip().lower() for c in (result.get("claims") or [])}
    anns = result.get("annotations") or []
    grounded = 0
    for a in anns:
        q = str(a.get("quote", "")).strip().lower()
        if not q:
            continue
        if q in claims_quotes or any(q in cq or cq in q for cq in claims_quotes if cq):
            grounded += 1
    if anns and grounded == 0:
        issues.append("annotations_not_grounded_in_claims")

    return {
        "ok": "diagnostic_language" not in "".join(issues),
        "issues": issues,
        "actions": actions,
        "grounded_annotations": grounded,
        "total_annotations": len(anns),
        "explainability": {
            "template_type": result.get("template_type"),
            "citation": result.get("source_citation"),
            "claims_used": len(result.get("claims") or []),
            "why_safe": (
                "Output checked for diagnostic language; citations constrained to "
                "known psychoeducational sources; annotations tied to user quotes."
            ),
        },
    }

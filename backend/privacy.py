"""PII minimization before any model call — Responsible AI / data safety."""

from __future__ import annotations

import re
from typing import Any

# Conservative redaction: emails, phones, SSNs, common ID patterns.
_PATTERNS: list[tuple[re.Pattern[str], str]] = [
    (re.compile(r"\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b", re.I), "[email]"),
    (re.compile(r"\b(?:\+?1[-.\s]?)?(?:\(?\d{3}\)?[-.\s]?)\d{3}[-.\s]?\d{4}\b"), "[phone]"),
    (re.compile(r"\b\d{3}-\d{2}-\d{4}\b"), "[ssn]"),
    (re.compile(r"\b(?:\d[ -]*?){13,19}\b"), "[card]"),
    (
        re.compile(
            r"\b(?:my name is|i'm|i am)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\b",
            re.I,
        ),
        "my name is [name]",
    ),
]


def redact_pii(text: str) -> tuple[str, list[dict[str, Any]]]:
    """Return redacted text + list of redaction events (no raw secrets retained)."""
    if not text:
        return text, []
    out = text
    events: list[dict[str, Any]] = []
    for pattern, repl in _PATTERNS:
        matches = list(pattern.finditer(out))
        if not matches:
            continue
        events.append(
            {
                "type": repl.strip("[]"),
                "count": len(matches),
            }
        )
        out = pattern.sub(repl, out)
    return out, events

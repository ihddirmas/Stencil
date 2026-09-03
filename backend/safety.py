"""Safety constraints and crisis-language short-circuit for Pattern Mirror."""

from __future__ import annotations

import re

SYSTEM_PROMPT_CONSTRAINT = """
You are assisting Pattern Mirror, a psychoeducational reflection tool.

Hard scope constraints (never violate):
- Psychoeducational only — help the user notice patterns in THEIR OWN words.
- Never diagnose, never suggest clinical conditions, never give medical or therapeutic advice.
- Never claim certainty about the user's mental state; speak in tentative, reflective language
  ("patterns that appear in your writing", "one reading of these entries").
- Only reflect patterns drawn from the user's own words through a named, cited psychological
  framework template. Do not invent unsupported pop-psychology claims.
- Do not encourage self-harm, isolation, or harmful coping. If content seems crisis-related,
  you would not be reached — crisis routing happens before you run.
""".strip()


# Lightweight phrase / pattern heuristics. This is a short-circuit gate before the
# framework pipeline — intentionally conservative recall over precision for safety.
_CRISIS_PATTERNS: list[re.Pattern[str]] = [
    re.compile(p, re.IGNORECASE)
    for p in [
        r"\bkill\s+my\s*self\b",
        r"\bkilling\s+myself\b",
        r"\bsuicid(?:e|al)\b",
        r"\bend\s+my\s+life\b",
        r"\btake\s+my\s+own\s+life\b",
        r"\bwant\s+to\s+die\b",
        r"\bwish\s+i\s+(?:was|were)\s+dead\b",
        r"\bself[-\s]?harm\b",
        r"\bcut(?:ting)?\s+myself\b",
        r"\bhurt\s+myself\b",
        r"\bno\s+reason\s+to\s+live\b",
        r"\bbetter\s+off\s+dead\b",
        r"\bplan(?:ning)?\s+to\s+(?:die|kill)\b",
        r"\bdon'?t\s+want\s+to\s+be\s+alive\b",
        r"\bcan'?t\s+go\s+on\b",
    ]
]


def check_crisis_language(text: str) -> bool:
    """Return True if raw input appears to contain self-harm / crisis language."""
    if not text or not text.strip():
        return False
    normalized = " ".join(text.split())
    return any(pattern.search(normalized) for pattern in _CRISIS_PATTERNS)


def crisis_resources() -> list[dict[str, str]]:
    """
    Crisis resources shown when the short-circuit fires.

    TODO (before demo): replace / extend with current, region-appropriate verified
    resources. Do not invent hotline numbers.
    """
    return [
        {
            "name": "Find a local crisis resource",
            "detail": (
                "TODO: fill with verified region-appropriate hotline / chat resources "
                "before the public demo."
            ),
            "url": "https://www.iasp.info/suicidalthoughts/",
        },
        {
            "name": "Talk to someone you trust",
            "detail": (
                "Reach out to a friend, family member, or local emergency services "
                "if you feel unsafe right now."
            ),
            "url": "",
        },
    ]

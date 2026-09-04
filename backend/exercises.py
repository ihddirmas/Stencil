"""Small library of evidence-informed journaling exercise templates."""

from __future__ import annotations

from typing import Any


EXERCISES: list[dict[str, Any]] = [
    {
        "id": "thought_record",
        "title": "One-situation thought record",
        "fits": ["quadrant", "triangle"],
        "rationale_hint": "Good when the map shows polarized thinking or a stuck belief.",
        "html_template": """
<article class="exercise-body">
  <p>Pick one concrete situation from your entries. Fill the blanks with your own words.</p>
  <label>Situation I keep returning to
    <textarea data-field="situation" rows="2">{situation}</textarea>
  </label>
  <label>Automatic thought that showed up
    <textarea data-field="thought" rows="2">{thought}</textarea>
  </label>
  <label>What evidence supports this thought?
    <textarea data-field="evidence_for" rows="2"></textarea>
  </label>
  <label>What evidence complicates it?
    <textarea data-field="evidence_against" rows="2"></textarea>
  </label>
  <label>A more balanced sentence I could try
    <textarea data-field="balanced" rows="2"></textarea>
  </label>
</article>
""".strip(),
        "source": "Adapted from CBT thought records (Beck; Greenberger & Padesky)",
    },
    {
        "id": "approach_ladder",
        "title": "Tiny approach ladder",
        "fits": ["quadrant"],
        "rationale_hint": "Useful when the plot lands toward avoidance or low-stakes retreat.",
        "html_template": """
<article class="exercise-body">
  <p>Build three steps from where you are toward a slightly braver move.</p>
  <label>What I have been avoiding
    <textarea data-field="avoiding" rows="2">{avoiding}</textarea>
  </label>
  <label>Step 1 — smallest possible action (today)
    <textarea data-field="step1" rows="2"></textarea>
  </label>
  <label>Step 2 — slightly larger (this week)
    <textarea data-field="step2" rows="2"></textarea>
  </label>
  <label>Step 3 — stretch (when ready)
    <textarea data-field="step3" rows="2"></textarea>
  </label>
  <label>What would make Step 1 feel safer?
    <textarea data-field="safety" rows="2"></textarea>
  </label>
</article>
""".strip(),
        "source": "Adapted from graded exposure / behavioral activation ideas",
    },
    {
        "id": "values_compass",
        "title": "Values compass check",
        "fits": ["quadrant", "triangle"],
        "rationale_hint": "Fits when the map shows tension between competing priorities.",
        "html_template": """
<article class="exercise-body">
  <p>Name the pull you feel, then reconnect to what matters underneath it.</p>
  <label>The pull I noticed in my writing
    <textarea data-field="pull" rows="2">{pull}</textarea>
  </label>
  <label>A value this might be protecting
    <textarea data-field="value" rows="2"></textarea>
  </label>
  <label>One action this week that honors that value without forcing certainty
    <textarea data-field="action" rows="2"></textarea>
  </label>
</article>
""".strip(),
        "source": "Adapted from values clarification used in ACT-informed journaling",
    },
    {
        "id": "three_voices",
        "title": "Three voices on the page",
        "fits": ["triangle"],
        "rationale_hint": "Best when a triangular conflict (e.g. avoid / criticize / perform) appears.",
        "html_template": """
<article class="exercise-body">
  <p>Give each vertex a short turn speaking — then write one integrating line.</p>
  <label>Voice A — {vertex_a}
    <textarea data-field="voice_a" rows="2">{claim_a}</textarea>
  </label>
  <label>Voice B — {vertex_b}
    <textarea data-field="voice_b" rows="2">{claim_b}</textarea>
  </label>
  <label>Voice C — {vertex_c}
    <textarea data-field="voice_c" rows="2">{claim_c}</textarea>
  </label>
  <label>One sentence that holds all three without picking a winner
    <textarea data-field="integrate" rows="2"></textarea>
  </label>
</article>
""".strip(),
        "source": "Adapted from parts / multi-perspective reflective writing practices",
    },
    {
        "id": "experiment_note",
        "title": "One-week experiment note",
        "fits": ["quadrant"],
        "rationale_hint": "Fits high-stakes / approach quadrants — turn insight into a small test.",
        "html_template": """
<article class="exercise-body">
  <p>Treat one pattern as a hypothesis, not a verdict.</p>
  <label>Hypothesis drawn from my map
    <textarea data-field="hypothesis" rows="2">{hypothesis}</textarea>
  </label>
  <label>One small experiment I will run this week
    <textarea data-field="experiment" rows="2"></textarea>
  </label>
  <label>What I will observe (not judge)
    <textarea data-field="observe" rows="2"></textarea>
  </label>
  <label>How I will know it was worth trying
    <textarea data-field="signal" rows="2"></textarea>
  </label>
</article>
""".strip(),
        "source": "Adapted from experimental mindset / behavioral experiment framing",
    },
    {
        "id": "self_compassion_rewrite",
        "title": "Self-compassion rewrite",
        "fits": ["quadrant", "triangle"],
        "rationale_hint": "Use when annotations show harsh self-criticism.",
        "html_template": """
<article class="exercise-body">
  <p>Keep the facts; soften the verdict.</p>
  <label>The harsh line from my entries
    <textarea data-field="harsh" rows="2">{harsh}</textarea>
  </label>
  <label>What a kind friend might say instead
    <textarea data-field="friend" rows="2"></textarea>
  </label>
  <label>A rewrite I can actually believe today
    <textarea data-field="rewrite" rows="2"></textarea>
  </label>
</article>
""".strip(),
        "source": "Adapted from self-compassion journaling prompts (Neff-informed)",
    },
]


def fill_template(template: str, values: dict[str, str]) -> str:
    """Replace {placeholders} safely; leave unknown keys intact-ish by escaping misses."""
    result = template
    for key, value in values.items():
        result = result.replace("{" + key + "}", value)
    # Clear any leftover placeholders so the form stays clean
    import re

    result = re.sub(r"\{[a-zA-Z0-9_]+\}", "", result)
    return result


def pick_exercise(
    framework_type: str,
    position: dict[str, float],
    claims: list[dict[str, str]],
    labels: dict[str, str],
) -> dict[str, Any]:
    """Select one exercise from the library based on where the user landed."""
    claim_texts = [c.get("claim", "") for c in claims]
    quote_texts = [c.get("quote", "") for c in claims]
    primary = claim_texts[0] if claim_texts else (quote_texts[0] if quote_texts else "")
    secondary = claim_texts[1] if len(claim_texts) > 1 else primary
    tertiary = claim_texts[2] if len(claim_texts) > 2 else secondary

    candidates = [e for e in EXERCISES if framework_type in e["fits"]]
    chosen = candidates[0]

    if framework_type == "quadrant":
        x = position.get("x", 0.5)
        y = position.get("y", 0.5)
        # Low-x / low-y leans avoidance → approach ladder
        if x < 0.4 and y < 0.5:
            chosen = next(e for e in candidates if e["id"] == "approach_ladder")
        elif x > 0.55 and y > 0.55:
            chosen = next(e for e in candidates if e["id"] == "experiment_note")
        elif any(
            w in " ".join(claim_texts).lower()
            for w in ("critic", "harsh", "should", "fail", "not enough")
        ):
            chosen = next(e for e in candidates if e["id"] == "self_compassion_rewrite")
        else:
            chosen = next(e for e in candidates if e["id"] == "thought_record")
        region = _quadrant_region(x, y, labels)
        rationale = (
            f"Your map placed you nearest “{region}”. "
            f"{chosen['rationale_hint']} This exercise uses phrases drawn from your entries."
        )
        fills = {
            "situation": primary[:280],
            "thought": secondary[:280],
            "avoiding": primary[:280],
            "pull": primary[:280],
            "hypothesis": primary[:280],
            "harsh": primary[:280],
        }
    else:
        # Strongest vertex drives the triangle exercise
        strongest = max(
            ("vertex_a", "vertex_b", "vertex_c"),
            key=lambda k: position.get(k, 0.0),
        )
        if strongest and position.get(strongest, 0) >= 0.45:
            chosen = next(e for e in candidates if e["id"] == "three_voices")
        elif any(
            w in " ".join(claim_texts).lower()
            for w in ("critic", "harsh", "should", "fail")
        ):
            chosen = next(e for e in candidates if e["id"] == "self_compassion_rewrite")
        else:
            chosen = next(e for e in candidates if e["id"] == "values_compass")
        vertex_name = labels.get(strongest, strongest)
        rationale = (
            f"Your writing weighted most toward “{vertex_name}”. "
            f"{chosen['rationale_hint']}"
        )
        fills = {
            "vertex_a": labels.get("vertex_a", "Voice A"),
            "vertex_b": labels.get("vertex_b", "Voice B"),
            "vertex_c": labels.get("vertex_c", "Voice C"),
            "claim_a": primary[:280],
            "claim_b": secondary[:280],
            "claim_c": tertiary[:280],
            "pull": primary[:280],
            "harsh": primary[:280],
            "situation": primary[:280],
            "thought": secondary[:280],
        }

    html = fill_template(chosen["html_template"], fills)
    return {
        "title": chosen["title"],
        "html_template": html,
        "rationale": rationale,
        "exercise_id": chosen["id"],
    }


def _quadrant_region(x: float, y: float, labels: dict[str, str]) -> str:
    if y >= 0.5 and x < 0.5:
        return labels.get("top_left", "top-left")
    if y >= 0.5 and x >= 0.5:
        return labels.get("top_right", "top-right")
    if y < 0.5 and x < 0.5:
        return labels.get("bottom_left", "bottom-left")
    return labels.get("bottom_right", "bottom-right")

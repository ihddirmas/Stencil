import type { TemplateType } from "@/lib/types";

export type FrameworkMeta = {
  id: TemplateType;
  name: string;
  citation: string;
  blurb: string;
};

/** Core evidence-based templates the agent can apply. */
export const FRAMEWORKS: FrameworkMeta[] = [
  {
    id: "quadrant",
    name: "Consciousness × Agency",
    citation: "Limberg-style 2×2",
    blurb: "Where insight meets action on a map.",
  },
  {
    id: "triangle",
    name: "Conflict Triangle",
    citation: "Three-pull conflict map",
    blurb: "See competing moves pull against each other.",
  },
  {
    id: "cognitive_distortions",
    name: "Cognitive Distortions",
    citation: "Beck · Burns · CBT thought records",
    blurb: "Name thinking traps, then challenge with evidence.",
  },
  {
    id: "identity_shift",
    name: "Who I Had to Be → Becoming",
    citation: "Identity / protective roles",
    blurb: "Separate survival roles from chosen self.",
  },
  {
    id: "forgiveness",
    name: "Forgiving Yourself",
    citation: "Self-compassion prompts",
    blurb: "A short loop from mistake to kinder next step.",
  },
];

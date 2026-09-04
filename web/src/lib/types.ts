export type TemplateType =
  | "quadrant"
  | "triangle"
  | "identity_shift"
  | "forgiveness"
  | "cognitive_distortions";

export type Annotation = { quote: string; note: string };

export type AnalyzeSuccess = {
  crisis_flag: false;
  template_type: TemplateType;
  title: string;
  source_citation: string;
  annotations: Annotation[];
  framework?: {
    framework_type: "quadrant" | "triangle";
    labels: Record<string, string>;
    position: Record<string, number>;
    annotations: Annotation[];
    source_citation: string;
  } | null;
  worksheet?: Record<string, unknown>;
  exercise?: {
    title: string;
    html_template?: string;
    rationale?: string;
    exercise_id?: string;
    template_type?: string;
    fields?: Record<string, unknown>;
  } | null;
  claims?: { claim: string; quote: string }[];
  pipeline_trace?: {
    stages?: { id: string; label: string; status?: string; detail?: string }[];
    orchestration?: string;
    verification?: {
      ok?: boolean;
      explainability?: { why_safe?: string; citation?: string };
    };
    pii_redactions?: { type: string; count: number }[];
  };
  safety?: {
    psychoeducational_only?: boolean;
    crisis_gated?: boolean;
    pii_minimized?: boolean;
    output_verified?: boolean;
    render_workflows?: boolean;
  };
};

export type CrisisResponse = {
  crisis_flag: true;
  resources: { name: string; detail: string; url: string }[];
  message: string;
};

export type AnalyzeResponse = AnalyzeSuccess | CrisisResponse;

export type EntryRow = {
  id: string;
  user_id: string;
  body: string;
  created_at: string;
};

export type StencilRow = {
  id: string;
  user_id: string;
  entry_id: string | null;
  template_type: TemplateType;
  title: string;
  source_citation: string | null;
  summary: string | null;
  payload: Record<string, unknown>;
  worksheet: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type MemoryNote = {
  id: string;
  user_id: string;
  kind: "pattern" | "role" | "value" | "distortion" | "quadrant" | "note";
  label: string;
  detail: string | null;
  source_stencil_id: string | null;
  weight: number;
  created_at: string;
  updated_at: string;
};

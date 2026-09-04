import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { updateStencilWorksheet } from "@/lib/memory";
import type { AnalyzeSuccess, TemplateType } from "@/lib/types";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { worksheet?: Record<string, unknown> };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.worksheet || typeof body.worksheet !== "object") {
    return NextResponse.json({ error: "worksheet required" }, { status: 400 });
  }

  const { data: row, error } = await supabase
    .from("stencils")
    .select("id, template_type, title, source_citation, payload, worksheet")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error || !row) {
    return NextResponse.json({ error: "Stencil not found" }, { status: 404 });
  }

  const payload = (row.payload || {}) as Record<string, unknown>;

  const resultLike: AnalyzeSuccess = {
    crisis_flag: false,
    template_type: row.template_type as TemplateType,
    title: row.title,
    source_citation: row.source_citation || "",
    annotations: (payload.annotations as AnalyzeSuccess["annotations"]) || [],
    framework: (payload.framework as AnalyzeSuccess["framework"]) || null,
    worksheet: body.worksheet,
    exercise: (payload.exercise as AnalyzeSuccess["exercise"]) || null,
    claims: (payload.claims as AnalyzeSuccess["claims"]) || [],
  };

  try {
    const updated = await updateStencilWorksheet(
      supabase,
      user.id,
      id,
      body.worksheet,
      resultLike,
    );
    return NextResponse.json({ ok: true, stencil: updated });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Update failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

import { anthropic } from "@ai-sdk/anthropic";
import { ToolLoopAgent, stepCountIs } from "ai";
import type { SupabaseClient } from "@supabase/supabase-js";
import { STENCIL_AGENT_INSTRUCTIONS } from "./instructions";
import { createStencilTools } from "./tools";

export function createStencilAgent(supabase: SupabaseClient, userId: string) {
  const tools = createStencilTools(supabase, userId);

  return new ToolLoopAgent({
    model: anthropic(process.env.ANTHROPIC_MODEL || "claude-sonnet-4-5"),
    instructions: STENCIL_AGENT_INSTRUCTIONS,
    tools,
    stopWhen: stepCountIs(8),
    temperature: 0.4,
  });
}

export function hasAnthropicKey() {
  return Boolean(process.env.ANTHROPIC_API_KEY?.trim());
}

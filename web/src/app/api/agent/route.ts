import { createAgentUIStreamResponse, type UIMessage } from "ai";
import { createClient } from "@/lib/supabase/server";
import { createStencilAgent, hasAnthropicKey } from "@/lib/agent/create-agent";
import { createDemoAgentResponse } from "@/lib/agent/demo-response";

export const maxDuration = 60;

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const messages = (body.messages || []) as UIMessage[];

  if (!hasAnthropicKey()) {
    return createDemoAgentResponse(messages, supabase, user.id);
  }

  const agent = createStencilAgent(supabase, user.id);

  return createAgentUIStreamResponse({
    agent,
    uiMessages: messages,
  });
}

import { AgentChat } from "@/components/AgentChat";

export default function JournalPage() {
  const demoMode = !process.env.ANTHROPIC_API_KEY?.trim();
  return <AgentChat demoMode={demoMode} />;
}

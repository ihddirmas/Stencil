import type { AnalyzeResponse } from "./types";

const API = process.env.NEXT_PUBLIC_ANALYZE_API_URL || "http://127.0.0.1:8000";

export async function analyzeEntry(text: string): Promise<AnalyzeResponse> {
  const res = await fetch(`${API}/api/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      typeof data.detail === "string" ? data.detail : `Analyze failed (${res.status})`,
    );
  }
  return data as AnalyzeResponse;
}

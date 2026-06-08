import type { CompiledAgent, Globals } from "./compiler";

export function buildAssistantBody(compiled: CompiledAgent, globals: Globals, serverUrl: string) {
  return {
    name: "VOIZ Generated Agent",
    firstMessage: compiled.firstMessage,
    // Enforce the user's call budget on Vapi's side (a little headroom over the cap).
    maxDurationSeconds: Math.max(30, globals.maxDurationSec + 10),
    model: {
      provider: "anthropic",
      model: "claude-3-5-haiku-20241022",
      messages: [{ role: "system", content: compiled.systemPrompt }],
      tools: [compiled.toolSchema, { type: "endCall" }],
    },
    voice: { provider: "vapi", voiceId: "Elliot", language: "hi" },
    transcriber: { provider: "deepgram", model: "nova-3", language: "multi" },
    serverUrl,
    serverMessages: ["end-of-call-report", "tool-calls", "status-update"],
  };
}

/** Create a Vapi assistant. Network call — exercised manually with real creds. */
export async function createAssistant(body: unknown, privateKey: string): Promise<{ id: string }> {
  const res = await fetch("https://api.vapi.ai/assistant", {
    method: "POST",
    headers: { Authorization: `Bearer ${privateKey}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Vapi create failed (${res.status}): ${detail.slice(0, 300)}`);
  }
  return (await res.json()) as { id: string };
}

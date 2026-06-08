import { describe, it, expect } from "vitest";
import { buildAssistantBody } from "@/lib/vapi";
import { compileAgent } from "@/lib/compiler";
import { DEFAULT_NODES } from "@/lib/nodes";

const compiled = compileAgent(DEFAULT_NODES, { voice: "Elliot", register: "Tier 2/3", maxDurationSec: 60 });

describe("buildAssistantBody", () => {
  it("wires model, prompt, tools (incl. endCall), voice, transcriber and serverUrl", () => {
    const body = buildAssistantBody(compiled, { voice: "Elliot", register: "Tier 2/3", maxDurationSec: 60 }, "https://x.dev/api/vapi-events");
    expect(body.model.provider).toBe("anthropic");
    expect(body.model.messages[0].role).toBe("system");
    expect(body.model.messages[0].content).toContain("submit_call_result");
    const toolNames = body.model.tools.map((t: any) => t.function?.name ?? t.type);
    expect(toolNames).toContain("submit_call_result");
    expect(toolNames).toContain("endCall");
    expect(body.firstMessage).toBe(compiled.firstMessage);
    expect(body.transcriber.provider).toBe("deepgram");
    expect(body.serverUrl).toBe("https://x.dev/api/vapi-events");
    expect(body.serverMessages).toContain("end-of-call-report");
    expect(body.serverMessages).toContain("tool-calls");
  });
});

import { describe, it, expect } from "vitest";
import { deriveCaptureKey, buildToolSchema } from "@/lib/compiler";
import { compileAgent } from "@/lib/compiler";
import { DEFAULT_NODES } from "@/lib/nodes";

describe("deriveCaptureKey", () => {
  it("uses canonical keys for known node types", () => {
    const emp = DEFAULT_NODES.find((n) => n.type === "employment")!;
    const amt = DEFAULT_NODES.find((n) => n.type === "amount")!;
    expect(deriveCaptureKey(emp).key).toBe("employment_type");
    expect(deriveCaptureKey(amt).key).toBe("loan_amount_range");
  });

  it("derives enum from the node's options plus NOT_CAPTURED", () => {
    const emp = DEFAULT_NODES.find((n) => n.type === "employment")!;
    expect(deriveCaptureKey(emp).enumVals).toEqual(["SALARIED", "SELF_EMPLOYED", "NOT_CAPTURED"]);
  });
});

describe("buildToolSchema", () => {
  it("always includes the universal fields and requires the core three", () => {
    const t = buildToolSchema(DEFAULT_NODES);
    expect(t.function.name).toBe("submit_call_result");
    expect(t.function.parameters.required).toEqual(["rpc_confirmed", "interest", "exit_state"]);
    const props = t.function.parameters.properties;
    expect(props.rpc_confirmed.type).toBe("boolean");
    expect((props.interest as any).enum).toEqual(["INTERESTED", "NOT_INTERESTED", "DEFERRED"]);
    expect((props.exit_state as any).enum).toContain("HANDOFF");
    expect(props.unclear_count.type).toBe("number");
    expect(props.hard_timeout_fired.type).toBe("boolean");
  });

  it("adds one enum property per data-capturing node", () => {
    const t = buildToolSchema(DEFAULT_NODES);
    const props = t.function.parameters.properties;
    expect((props.employment_type as any).enum).toEqual(["SALARIED", "SELF_EMPLOYED", "NOT_CAPTURED"]);
    expect((props.loan_amount_range as any).enum).toEqual(["1-3L", "3-5L", "5L+", "NOT_CAPTURED"]);
  });

  it("ignores non-data nodes", () => {
    const t = buildToolSchema(DEFAULT_NODES);
    expect(t.function.parameters.properties).not.toHaveProperty("rpc");
    expect(t.function.parameters.properties).not.toHaveProperty("offer");
  });
});

describe("compileAgent", () => {
  const globals = { voice: "Aanya (Hindi)", register: "Tier 2/3", maxDurationSec: 60 };

  it("uses the RPC node's opening line as firstMessage", () => {
    const out = compileAgent(DEFAULT_NODES, globals);
    expect(out.firstMessage).toContain("नमस्ते");
  });

  it("embeds every node's script text and the duration cap in the prompt", () => {
    const out = compileAgent(DEFAULT_NODES, globals);
    expect(out.systemPrompt).toContain("60");
    expect(out.systemPrompt).toContain("आपके नाम पर");
    expect(out.systemPrompt).toContain("आप नौकरी करते हैं");
    expect(out.systemPrompt).toMatch(/Aadhaar/i);
    expect(out.systemPrompt).toMatch(/submit_call_result/);
    expect(out.systemPrompt).toMatch(/endCall/);
  });

  it("returns capture keys for data nodes, paired with node ids", () => {
    const out = compileAgent(DEFAULT_NODES, globals);
    expect(out.captureKeys).toEqual([
      { nodeId: "n-employment", key: "employment_type" },
      { nodeId: "n-amount", key: "loan_amount_range" },
    ]);
  });

  it("exposes the tool schema", () => {
    const out = compileAgent(DEFAULT_NODES, globals);
    expect(out.toolSchema.function.name).toBe("submit_call_result");
  });
});

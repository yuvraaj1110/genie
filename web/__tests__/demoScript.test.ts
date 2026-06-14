import { describe, it, expect } from "vitest";
import { DEFAULT_NODES, type AgentNode } from "@/lib/nodes";
import { compileAgent } from "@/lib/compiler";
import { buildDemoScript, eventsForStep, type ScriptStep } from "@/lib/demoScript";
import { initialCallState, reduceCall } from "@/lib/callReducer";

const GLOBALS = { voice: "male", register: "friendly", maxDurationSec: 55 };
const captureKeys = compileAgent(DEFAULT_NODES, GLOBALS).captureKeys;

describe("buildDemoScript", () => {
  it("is time-ordered and ends with a terminal 'end' step", () => {
    const s = buildDemoScript(DEFAULT_NODES, captureKeys);
    for (let i = 1; i < s.length; i++) expect(s[i].atMs).toBeGreaterThanOrEqual(s[i - 1].atMs);
    expect(s[s.length - 1].kind).toBe("end");
  });

  it("emits exactly one capture per captureKey", () => {
    const s = buildDemoScript(DEFAULT_NODES, captureKeys);
    const caps = s.filter((x): x is Extract<ScriptStep, { kind: "capture" }> => x.kind === "capture");
    expect(caps.map((c) => c.key).sort()).toEqual(captureKeys.map((c) => c.key).sort());
  });

  it("folds (via the real reducer) into a captured, ended, high-score state", () => {
    const s = buildDemoScript(DEFAULT_NODES, captureKeys);
    let state = initialCallState(0);
    for (const step of s) for (const ev of eventsForStep(step, 1000)) state = reduceCall(state, ev);
    expect(state.ended).toBe(true);
    for (const { key } of captureKeys) expect(state.captured).toContain(key);
    expect(state.submitArgs?.rpc_confirmed).toBe(true);
    expect(state.submitArgs?.interest).toBe("INTERESTED");
    expect(state.submitArgs?.employment_type).toBe("SALARIED");
    expect(state.submitArgs?.loan_amount_range).toBe("1-3L");
  });

  it("handles a custom data node (one capture, generic answer)", () => {
    const custom: AgentNode = {
      id: "n-custom-1", type: "custom", title: "City", desc: "", pill: "DATA",
      icon: "interest", accent: "violet", capturesData: true,
      fields: [
        { key: "question", label: "Q", kind: "text", value: "आप किस शहर में रहते हैं?" },
        { key: "field", label: "as", kind: "text", value: "city" },
      ],
    };
    const nodes = [DEFAULT_NODES[0], custom, DEFAULT_NODES[5]];
    const keys = compileAgent(nodes, GLOBALS).captureKeys;
    const s = buildDemoScript(nodes, keys);
    expect(s.filter((x) => x.kind === "capture").length).toBe(1);
  });

  it("plays an authored reply as the customer line", () => {
    const nodes = DEFAULT_NODES.map((n) =>
      n.type === "employment"
        ? { ...n, fields: n.fields.map((f) => (f.key === "reply" ? { ...f, value: "Ji main salaried hoon" } : f)) }
        : n,
    );
    const keys = compileAgent(nodes, GLOBALS).captureKeys;
    const s = buildDemoScript(nodes, keys);
    const userLines = s.filter(
      (x): x is Extract<ScriptStep, { kind: "transcript" }> => x.kind === "transcript" && x.role === "user",
    );
    expect(userLines.some((l) => l.text === "Ji main salaried hoon")).toBe(true);
  });

  it("captures the reply text verbatim for a custom (free-text) node", () => {
    const custom: AgentNode = {
      id: "n-custom-1", type: "custom", title: "State", desc: "", pill: "DATA",
      icon: "interest", accent: "violet", capturesData: true,
      fields: [
        { key: "question", label: "Q", kind: "text", value: "Aap kaunsi state se ho?" },
        { key: "field", label: "as", kind: "text", value: "state" },
        { key: "reply", label: "Sample customer reply (demo)", kind: "text", value: "Main Maharashtra se hoon" },
      ],
    };
    const nodes = [DEFAULT_NODES[0], custom, DEFAULT_NODES[5]];
    const keys = compileAgent(nodes, GLOBALS).captureKeys;
    const s = buildDemoScript(nodes, keys);
    let state = initialCallState(0);
    for (const step of s) for (const ev of eventsForStep(step, 1000)) state = reduceCall(state, ev);
    expect(state.submitArgs?.state).toBe("Main Maharashtra se hoon");
    expect(state.captured).toContain("state");
  });

  it("falls back to a non-empty canned line when reply is blank", () => {
    const custom: AgentNode = {
      id: "n-custom-1", type: "custom", title: "X", desc: "", pill: "DATA",
      icon: "interest", accent: "violet", capturesData: true,
      fields: [
        { key: "question", label: "Q", kind: "text", value: "Sawaal?" },
        { key: "field", label: "as", kind: "text", value: "x" },
        { key: "reply", label: "r", kind: "text", value: "" },
      ],
    };
    const nodes = [DEFAULT_NODES[0], custom, DEFAULT_NODES[5]];
    const keys = compileAgent(nodes, GLOBALS).captureKeys;
    const s = buildDemoScript(nodes, keys);
    const userLines = s.filter(
      (x): x is Extract<ScriptStep, { kind: "transcript" }> => x.kind === "transcript" && x.role === "user",
    );
    expect(userLines.every((l) => l.text.length > 0)).toBe(true);
  });
});

import type { AgentNode } from "./nodes";
import type { CallEvent } from "./callReducer";

export type ScriptStep =
  | { atMs: number; kind: "transcript"; role: "user" | "bot"; text: string }
  | { atMs: number; kind: "capture"; key: string; value: string }
  | { atMs: number; kind: "end"; reason: string; finalArgs: Record<string, unknown> };

const STEP_GAP_MS = 1300;

/** Omit that distributes over a union, so each member keeps its own fields. */
type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;

const CANNED_USER: Record<string, string> = {
  rpc: "जी हाँ, मैं ही बोल रहा हूँ।",
  interest: "हाँ, ज़रा बताइए।",
  employment: "मैं नौकरी करता हूँ।",
  amount: "एक से तीन लाख तक।",
  custom: "जी हाँ।",
};

function field(node: AgentNode, key: string): string {
  return String(node.fields.find((f) => f.key === key)?.value ?? "");
}

/** First configured option, else the authored reply, else a generic non-empty marker. */
function captureValue(node: AgentNode, reply: string): string {
  const opts = node.fields.find((f) => f.key === "options")?.value;
  if (Array.isArray(opts) && opts.length > 0) return String(opts[0]);
  return reply.trim() || "PROVIDED";
}

/** Build the timed walkthrough script for the agent the user just configured. */
export function buildDemoScript(
  nodes: AgentNode[],
  captureKeys: { nodeId: string; key: string }[],
): ScriptStep[] {
  const steps: ScriptStep[] = [];
  let t = 0;
  const push = (s: DistributiveOmit<ScriptStep, "atMs">) => {
    steps.push({ atMs: t, ...s } as ScriptStep);
    t += STEP_GAP_MS;
  };
  const keyFor = (nodeId: string) => captureKeys.find((c) => c.nodeId === nodeId)?.key;

  for (const node of nodes) {
    if (node.type === "handoff") continue;

    const agentLine =
      node.type === "rpc" ? field(node, "line")
      : node.type === "offer" ? field(node, "script")
      : field(node, "question");
    if (agentLine) push({ kind: "transcript", role: "bot", text: agentLine });

    if (node.type === "offer") continue; // statement, no reply

    const reply = field(node, "reply").trim() || CANNED_USER[node.type] || CANNED_USER.custom;
    push({ kind: "transcript", role: "user", text: reply });

    if (node.capturesData) {
      const key = keyFor(node.id);
      if (key) push({ kind: "capture", key, value: captureValue(node, reply) });
    }
  }

  const handoff = nodes.find((n) => n.type === "handoff");
  if (handoff) push({ kind: "transcript", role: "bot", text: field(handoff, "line") });

  steps.push({
    atMs: t,
    kind: "end",
    reason: "assistant-ended-call",
    finalArgs: {
      rpc_confirmed: true,
      interest: "INTERESTED",
      exit_state: "HANDOFF",
      unclear_count: 0,
      hard_timeout_fired: false,
    },
  });

  return steps;
}

/** Convert a script step into the CallEvents the existing reducer understands. */
export function eventsForStep(step: ScriptStep, atMs: number): CallEvent[] {
  switch (step.kind) {
    case "transcript":
      return [{ kind: "transcript", role: step.role, text: step.text, final: true, at: atMs }];
    case "capture":
      return [{ kind: "tool-call", args: { [step.key]: step.value } }];
    case "end":
      return [
        { kind: "tool-call", args: step.finalArgs },
        { kind: "end", reason: step.reason, at: atMs },
      ];
  }
}

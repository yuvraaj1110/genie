import type { AgentNode } from "./nodes";

export type ToolProperty =
  | { type: "boolean"; description: string }
  | { type: "number"; description: string }
  | { type: "string"; enum?: string[]; description: string };

export type ToolSchema = {
  type: "function";
  function: {
    name: "submit_call_result";
    description: string;
    parameters: {
      type: "object";
      required: string[];
      properties: Record<string, ToolProperty>;
    };
  };
};

/** Slugify free text into a safe snake_case tool-property key. */
function slug(s: string): string {
  return (
    s
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "") || "field"
  );
}

function optionsOf(node: AgentNode): string[] {
  const f = node.fields.find((x) => x.key === "options");
  return Array.isArray(f?.value) ? (f!.value as string[]) : [];
}

/** Resolve a data node into a tool-property key + enum values (+ NOT_CAPTURED). */
export function deriveCaptureKey(node: AgentNode): { key: string; enumVals: string[] } {
  const key =
    node.type === "employment"
      ? "employment_type"
      : node.type === "amount"
        ? "loan_amount_range"
        : slug(String(node.fields.find((f) => f.key === "field")?.value ?? node.title));
  const opts = optionsOf(node);
  const enumVals = opts.length > 0 ? [...opts, "NOT_CAPTURED"] : [];
  return { key, enumVals };
}

export function buildToolSchema(nodes: AgentNode[]): ToolSchema {
  const properties: Record<string, ToolProperty> = {
    rpc_confirmed: { type: "boolean", description: "True if the right party confirmed they are the intended lead." },
    interest: {
      type: "string",
      enum: ["INTERESTED", "NOT_INTERESTED", "DEFERRED"],
      description: "INTERESTED = wants to know more; NOT_INTERESTED = declined; DEFERRED = call back later.",
    },
    unclear_count: { type: "number", description: "Total UNCLEAR classifications across the call." },
    hard_timeout_fired: { type: "boolean", description: "True if the hard deadline forced an early handoff." },
    exit_state: {
      type: "string",
      enum: ["HANDOFF", "EXIT_WRONG_PARTY", "EXIT_NO_ANSWER", "EXIT_NOT_INTERESTED", "EXIT_UNRESOLVED"],
      description: "The FSM state at which the call ended.",
    },
  };

  for (const node of nodes.filter((n) => n.capturesData)) {
    const { key, enumVals } = deriveCaptureKey(node);
    properties[key] =
      enumVals.length > 0
        ? { type: "string", enum: enumVals, description: `Captured for "${node.title}". NOT_CAPTURED if unclear/timed out.` }
        : { type: "string", description: `Captured for "${node.title}". Empty if not captured.` };
  }

  return {
    type: "function",
    function: {
      name: "submit_call_result",
      description: "Call this when the conversation reaches any terminal state. Mandatory on every exit path.",
      parameters: { type: "object", required: ["rpc_confirmed", "interest", "exit_state"], properties },
    },
  };
}

export type Globals = { voice: string; register: string; maxDurationSec: number };

export type CompiledAgent = {
  systemPrompt: string;
  firstMessage: string;
  toolSchema: ToolSchema;
  captureKeys: { nodeId: string; key: string }[];
};

function textField(node: AgentNode, key: string): string {
  return String(node.fields.find((f) => f.key === key)?.value ?? "");
}

function nodeSection(node: AgentNode): string {
  switch (node.type) {
    case "rpc":
      return `### STATE: RPC_CHECK\nSay: "${textField(node, "line")}"\nIf wrong party -> submit_call_result(rpc_confirmed=false, exit_state="EXIT_WRONG_PARTY"). If silence, retry ${textField(node, "retries")} time(s) then EXIT_NO_ANSWER.`;
    case "offer":
      return `### STATE: OFFER\nSay: "${textField(node, "script")}" then continue.`;
    case "interest":
      return `### STATE: INTEREST_CHECK\nAsk: "${textField(node, "question")}"\nINTERESTED -> continue; NOT_INTERESTED -> EXIT_NOT_INTERESTED; DEFERRED -> log DEFERRED & exit; UNCLEAR x2 -> EXIT_UNRESOLVED.`;
    default: {
      const { key, enumVals } = deriveCaptureKey(node);
      const opts = enumVals.filter((v) => v !== "NOT_CAPTURED");
      const optText = opts.length ? ` Classify into: ${opts.join(", ")}.` : "";
      return `### STATE: ${key.toUpperCase()}\nAsk: "${textField(node, "question")}".${optText}\nStore as ${key}. UNCLEAR x2 or timeout -> ${key}=NOT_CAPTURED, then continue.`;
    }
  }
}

const HANDOFF_AND_RULES = `### STATE: HANDOFF\nSay the closing line, then call submit_call_result with everything captured, then call endCall to hang up.\n\n## RULES\n- Speak natural, conversational Hindi. One short question at a time.\n- NEVER ask for Aadhaar number, full PAN, card number/CVV, OTP, or exact salary.\n- NEVER promise approval, interest rate, or sanction.\n- If a qualification answer is UNCLEAR, re-ask once, then store NOT_CAPTURED and move on.\n- ALWAYS call submit_call_result before the call ends, then endCall. Never linger.`;

export function compileAgent(nodes: AgentNode[], globals: Globals): CompiledAgent {
  const rpc = nodes.find((n) => n.type === "rpc");
  const handoff = nodes.find((n) => n.type === "handoff");

  const persona = `You are a Hindi-speaking outbound voice agent for an Indian lender. Register: ${globals.register}. The ENTIRE call must finish within ${globals.maxDurationSec} seconds. Follow these states in order; classify each reply and transition.`;

  const sections = nodes
    .filter((n) => n.type !== "handoff")
    .map(nodeSection)
    .join("\n\n");

  const closing = handoff
    ? HANDOFF_AND_RULES.replace("the closing line", `"${textField(handoff, "line")}"`)
    : HANDOFF_AND_RULES;

  const systemPrompt = `${persona}\n\n${sections}\n\n${closing}`;
  const firstMessage = rpc ? textField(rpc, "line") : "नमस्ते।";
  const captureKeys = nodes
    .filter((n) => n.capturesData)
    .map((n) => ({ nodeId: n.id, key: deriveCaptureKey(n).key }));

  return { systemPrompt, firstMessage, toolSchema: buildToolSchema(nodes), captureKeys };
}

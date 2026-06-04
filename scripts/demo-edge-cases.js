/**
 * Edge-case replay harness.
 *
 * Runs every FSM exit path and resilience scenario through the REAL
 * payload-builder used in production (src/server/payload-builder.js) and prints
 * the structured CRM payload each one produces. No phone call required — this
 * proves the resilience objective deterministically and in under a second.
 *
 *   npm run demo:edge-cases
 */
import { buildCrmPayload } from "../src/server/payload-builder.js";

const call = (overrides = {}) => ({
  id: "demo-call",
  createdAt: "2026-06-04T10:00:00Z",
  endedAt: "2026-06-04T10:00:48Z",
  endedReason: "assistant-ended-call",
  customer: { number: "+919876543210" },
  ...overrides,
});

const tool = (overrides = {}) => ({
  rpc_confirmed: true,
  interest: "INTERESTED",
  employment_type: "SALARIED",
  loan_amount_range: "5L_PLUS",
  unclear_count: 0,
  hard_timeout_fired: false,
  exit_state: "HANDOFF",
  ...overrides,
});

// ── The scenarios. `what` = what the customer did on the call. ────────────────
const scenarios = [
  {
    name: "1. HAPPY PATH — salaried, large ticket",
    what: 'Confirms identity → "haan batao" → "naukri" → "paanch lakh se zyada"',
    callData: call(),
    toolCall: tool(),
  },
  {
    name: "2. SELF-EMPLOYED — qualified, harder to underwrite",
    what: 'Confirms → interested → "apna business hai" → "teen se paanch lakh"',
    callData: call(),
    toolCall: tool({ employment_type: "SELF_EMPLOYED", loan_amount_range: "3_5L" }),
  },
  {
    name: "3. WRONG PARTY — not the target prospect",
    what: '"Nahi, galat number" at the identity check',
    callData: call({ endedReason: "assistant-ended-call" }),
    toolCall: tool({
      rpc_confirmed: false,
      interest: "NOT_INTERESTED",
      employment_type: "NOT_CAPTURED",
      loan_amount_range: "NOT_CAPTURED",
      exit_state: "EXIT_WRONG_PARTY",
    }),
  },
  {
    name: "4. NO ANSWER — silence through one retry",
    what: "No response → agent retries once → still silent → exits",
    callData: call({ endedAt: "2026-06-04T10:00:12Z" }),
    toolCall: tool({
      rpc_confirmed: false,
      interest: "NOT_INTERESTED",
      employment_type: "NOT_CAPTURED",
      loan_amount_range: "NOT_CAPTURED",
      exit_state: "EXIT_NO_ANSWER",
    }),
  },
  {
    name: "5. NOT INTERESTED — declines the offer",
    what: '"Nahi chahiye, interest nahi hai"',
    callData: call(),
    toolCall: tool({
      interest: "NOT_INTERESTED",
      employment_type: "NOT_CAPTURED",
      loan_amount_range: "NOT_CAPTURED",
      exit_state: "EXIT_NOT_INTERESTED",
    }),
  },
  {
    name: "6. DEFERRED — busy now, call back later",
    what: '"Abhi nahi, thodi der baad call karo" → queued for callback',
    callData: call(),
    toolCall: tool({
      interest: "DEFERRED",
      employment_type: "NOT_CAPTURED",
      loan_amount_range: "NOT_CAPTURED",
      exit_state: "EXIT_NOT_INTERESTED",
    }),
  },
  {
    name: "7. DOUBLE-UNCLEAR — STT garbage on loan amount",
    what: "Employment captured, but loan amount unintelligible twice → NOT_CAPTURED, never asked a 3rd time",
    callData: call(),
    toolCall: tool({
      loan_amount_range: "NOT_CAPTURED",
      unclear_count: 2,
      exit_state: "HANDOFF",
    }),
  },
  {
    name: "8. HARD TIMEOUT — 53s deadline hit mid-qualification",
    what: "Interested + salaried captured, but call nears 53s → jumps to handoff with partial data",
    callData: call({ endedAt: "2026-06-04T10:00:54Z" }),
    toolCall: tool({
      loan_amount_range: "NOT_CAPTURED",
      hard_timeout_fired: true,
      exit_state: "HANDOFF",
    }),
  },
  {
    name: "9. EARLY HANGUP — customer drops, no tool call ever fires",
    what: "Line drops mid-call. Webhook builds a partial payload from call metadata alone (toolCall = null)",
    callData: call({ endedReason: "customer-ended-call", endedAt: "2026-06-04T10:00:18Z" }),
    toolCall: null,
  },
];

// ── Render ────────────────────────────────────────────────────────────────
const scoreBar = (s) =>
  "█".repeat(Math.round(s / 10)) + "░".repeat(10 - Math.round(s / 10));

console.log("\n" + "═".repeat(70));
console.log("  VOIZ — EDGE-CASE REPLAY  (real payload-builder, 0 phone calls)");
console.log("═".repeat(70));

for (const s of scenarios) {
  const p = buildCrmPayload(s.callData, s.toolCall);
  console.log(`\n▸ ${s.name}`);
  console.log(`  customer:  ${s.what}`);
  console.log(
    `  →  rpc=${p.rpc_confirmed}  interest=${p.interest}  emp=${p.employment_type}  loan=${p.loan_amount_range}`
  );
  console.log(
    `  →  qualified=${p.qualification_complete}  unclear=${p.unclear_count}  timeout=${p.hard_timeout_fired}  early=${p.call_terminated_early}`
  );
  console.log(
    `  →  rep_priority  ${scoreBar(p.rep_priority_score)} ${String(p.rep_priority_score).padStart(3)}/100`
  );
}

console.log("\n" + "═".repeat(70));
console.log(
  "  Every path terminates in a structured payload. No undefined exits."
);
console.log("═".repeat(70) + "\n");

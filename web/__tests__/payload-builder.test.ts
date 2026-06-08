import { describe, it, expect } from "vitest";
import { buildCrmPayload } from "@/lib/payload-builder";

const baseToolCall = {
  rpc_confirmed: true,
  interest: "INTERESTED",
  employment_type: "SALARIED",
  loan_amount_range: "3_5L",
  unclear_count: 0,
  hard_timeout_fired: false,
  exit_state: "HANDOFF",
};
const baseCallData = {
  id: "call-uuid-123",
  createdAt: "2026-06-04T10:00:00Z",
  endedAt: "2026-06-04T10:00:42Z",
  endedReason: "assistant-ended-call",
  customer: { number: "+919876543210" },
};

describe("buildCrmPayload", () => {
  it("builds a complete qualified handoff with score 100", () => {
    const r = buildCrmPayload(baseCallData, baseToolCall);
    expect(r.call_duration_seconds).toBe(42);
    expect(r.qualification_complete).toBe(true);
    expect(r.rep_priority_score).toBe(100);
  });
  it("docks 5 for self-employed", () => {
    expect(buildCrmPayload(baseCallData, { ...baseToolCall, employment_type: "SELF_EMPLOYED" }).rep_priority_score).toBe(95);
  });
  it("docks 20 per NOT_CAPTURED", () => {
    const r = buildCrmPayload(baseCallData, { ...baseToolCall, employment_type: "NOT_CAPTURED", loan_amount_range: "NOT_CAPTURED" });
    expect(r.qualification_complete).toBe(false);
    expect(r.rep_priority_score).toBe(60);
  });
  it("partial payload when no tool call (hangup) scores 45", () => {
    const r = buildCrmPayload({ ...baseCallData, endedReason: "customer-ended-call" }, null);
    expect(r.call_terminated_early).toBe(true);
    expect(r.rep_priority_score).toBe(45);
  });
});

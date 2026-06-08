import { describe, it, expect } from "vitest";
import { initialCallState, reduceCall, type CallEvent } from "@/lib/callReducer";

describe("reduceCall", () => {
  it("appends final transcript lines with role and seconds", () => {
    let s = initialCallState(0);
    s = reduceCall(s, { kind: "transcript", role: "user", text: "हाँ जी", final: true, at: 4000 } as CallEvent);
    expect(s.transcript).toHaveLength(1);
    expect(s.transcript[0]).toMatchObject({ role: "user", message: "हाँ जी" });
  });

  it("ignores non-final (partial) transcripts", () => {
    let s = initialCallState(0);
    s = reduceCall(s, { kind: "transcript", role: "user", text: "हा", final: false, at: 4000 } as CallEvent);
    expect(s.transcript).toHaveLength(0);
  });

  it("marks capture keys present in a tool-call as captured", () => {
    let s = initialCallState(0);
    s = reduceCall(s, {
      kind: "tool-call",
      args: { rpc_confirmed: true, interest: "INTERESTED", employment_type: "SALARIED", exit_state: "HANDOFF" },
    } as CallEvent);
    expect(s.captured).toContain("employment_type");
    expect(s.captured).toContain("interest");
    expect(s.submitArgs?.employment_type).toBe("SALARIED");
  });

  it("records end with reason and timestamp", () => {
    let s = initialCallState(0);
    s = reduceCall(s, { kind: "end", reason: "assistant-ended-call", at: 48000 } as CallEvent);
    expect(s.ended).toBe(true);
    expect(s.endedReason).toBe("assistant-ended-call");
  });
});

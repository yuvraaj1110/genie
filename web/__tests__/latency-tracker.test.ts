import { describe, it, expect } from "vitest";
import { computeTurnLatencies, summarizeLatency } from "@/lib/latency-tracker";

describe("computeTurnLatencies", () => {
  it("pairs user turn with bot reply and computes ms gap", () => {
    const msgs = [
      { role: "user", message: "Haan", secondsFromStart: 4, duration: 1 },
      { role: "bot", message: "ok", secondsFromStart: 5.8, duration: 4 },
    ];
    expect(computeTurnLatencies(msgs)[0].latencyMs).toBe(800);
  });
  it("never returns negative latency", () => {
    const msgs = [
      { role: "user", message: "Haan", secondsFromStart: 5, duration: 1 },
      { role: "bot", message: "ok", secondsFromStart: 5.9, duration: 2 },
    ];
    expect(computeTurnLatencies(msgs)[0].latencyMs).toBe(0);
  });
});

describe("summarizeLatency", () => {
  it("computes min/avg/max/p95", () => {
    const s = summarizeLatency([{ latencyMs: 400 }, { latencyMs: 600 }, { latencyMs: 500 }, { latencyMs: 800 }]);
    expect(s).toMatchObject({ turns: 4, minMs: 400, maxMs: 800, avgMs: 575, p95Ms: 800 });
  });
  it("zeroes for empty", () => {
    expect(summarizeLatency([])).toEqual({ turns: 0, minMs: 0, avgMs: 0, maxMs: 0, p95Ms: 0 });
  });
});

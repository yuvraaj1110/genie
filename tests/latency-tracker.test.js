import { describe, it, expect } from "vitest";
import {
  computeTurnLatencies,
  summarizeLatency,
} from "../src/server/latency-tracker.js";

describe("computeTurnLatencies", () => {
  it("pairs each user turn with the bot reply and computes the gap in ms", () => {
    const messages = [
      { role: "bot", message: "Namaste...", secondsFromStart: 0, duration: 3 },
      { role: "user", message: "Haan ji", secondsFromStart: 4, duration: 1 },
      // user finished at 5s, bot starts at 5.8s -> 800ms
      { role: "bot", message: "Aapke naam par...", secondsFromStart: 5.8, duration: 4 },
      { role: "user", message: "Naukri", secondsFromStart: 11, duration: 1 },
      // user finished at 12s, bot starts at 12.5s -> 500ms
      { role: "bot", message: "Kitna loan...", secondsFromStart: 12.5, duration: 3 },
    ];
    const turns = computeTurnLatencies(messages);
    expect(turns).toHaveLength(2);
    expect(turns[0].latencyMs).toBe(800);
    expect(turns[1].latencyMs).toBe(500);
    expect(turns[0].afterUserSaid).toBe("Haan ji");
  });

  it("normalises ms-valued durations to seconds", () => {
    const messages = [
      { role: "user", message: "Haan", secondsFromStart: 4, duration: 1000 }, // 1000ms = 1s
      { role: "bot", message: "ok", secondsFromStart: 5.5, duration: 2000 },
    ];
    // user finished at 5s, bot at 5.5s -> 500ms
    expect(computeTurnLatencies(messages)[0].latencyMs).toBe(500);
  });

  it("never returns negative latency from clock noise", () => {
    const messages = [
      { role: "user", message: "Haan", secondsFromStart: 5, duration: 1 },
      { role: "bot", message: "ok", secondsFromStart: 5.9, duration: 2 }, // before user 'ends'
    ];
    expect(computeTurnLatencies(messages)[0].latencyMs).toBe(0);
  });

  it("ignores messages without timing and handles empty input", () => {
    expect(computeTurnLatencies([])).toEqual([]);
    expect(computeTurnLatencies([{ role: "user", message: "x" }])).toEqual([]);
  });
});

describe("summarizeLatency", () => {
  it("computes min / avg / max / p95 in ms", () => {
    const turns = [
      { latencyMs: 400 },
      { latencyMs: 600 },
      { latencyMs: 500 },
      { latencyMs: 800 },
    ];
    const s = summarizeLatency(turns);
    expect(s.turns).toBe(4);
    expect(s.minMs).toBe(400);
    expect(s.maxMs).toBe(800);
    expect(s.avgMs).toBe(575);
    expect(s.p95Ms).toBe(800);
  });

  it("returns zeroes for no turns", () => {
    expect(summarizeLatency([])).toEqual({
      turns: 0,
      minMs: 0,
      avgMs: 0,
      maxMs: 0,
      p95Ms: 0,
    });
  });
});

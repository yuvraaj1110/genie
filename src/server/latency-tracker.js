/**
 * Latency observability (assignment Objective 2: performance visibility).
 *
 * Vapi's end-of-call-report carries a transcript in `artifact.messages`, where
 * each turn is timestamped with `secondsFromStart` and a spoken `duration`.
 * From that we reconstruct, for every assistant turn, how long the customer
 * waited between finishing their sentence and the agent starting to speak —
 * i.e. the end-to-end response latency (STT finalisation + LLM + TTS start).
 *
 * This is the single number that determines whether a voice call "feels" snappy
 * or laggy, so it's the right thing to instrument for a real deployment.
 */

/** Normalise a duration to seconds — Vapi sometimes reports ms, sometimes s. */
function toSeconds(d) {
  if (typeof d !== "number" || Number.isNaN(d)) return 0;
  // A single spoken turn is never > 60s; if it's that big it must be ms.
  return d > 60 ? d / 1000 : d;
}

/**
 * Compute per-turn agent response latencies (in milliseconds) from a Vapi
 * transcript messages array. A "turn" pairs a customer (user) message with the
 * assistant (bot) message that answers it.
 *
 * @param {Array} messages - artifact.messages from the end-of-call-report
 * @returns {Array<{turn:number, afterUserSaid:string, latencyMs:number}>}
 */
export function computeTurnLatencies(messages = []) {
  const isUser = (m) => m.role === "user";
  const isBot = (m) => m.role === "bot" || m.role === "assistant";

  const turns = [];
  let pendingUser = null;
  let turnNo = 0;

  for (const m of messages) {
    if (typeof m.secondsFromStart !== "number") continue;

    if (isUser(m)) {
      pendingUser = m;
    } else if (isBot(m) && pendingUser) {
      const userEnd =
        pendingUser.secondsFromStart + toSeconds(pendingUser.duration);
      const latencyMs = Math.round((m.secondsFromStart - userEnd) * 1000);
      // Guard against clock noise producing small negatives.
      turns.push({
        turn: ++turnNo,
        afterUserSaid: String(pendingUser.message ?? "").slice(0, 40),
        latencyMs: Math.max(0, latencyMs),
      });
      pendingUser = null;
    }
  }

  return turns;
}

/**
 * Summarise a list of turn latencies into min / avg / max / p95 (ms).
 * @param {Array<{latencyMs:number}>} turns
 */
export function summarizeLatency(turns = []) {
  if (turns.length === 0) {
    return { turns: 0, minMs: 0, avgMs: 0, maxMs: 0, p95Ms: 0 };
  }
  const values = turns.map((t) => t.latencyMs).sort((a, b) => a - b);
  const sum = values.reduce((a, b) => a + b, 0);
  const p95Index = Math.min(values.length - 1, Math.ceil(0.95 * values.length) - 1);

  return {
    turns: values.length,
    minMs: values[0],
    avgMs: Math.round(sum / values.length),
    maxMs: values[values.length - 1],
    p95Ms: values[p95Index],
  };
}

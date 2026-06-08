export type Turn = { turn: number; afterUserSaid: string; latencyMs: number };
type Msg = { role?: string; message?: string; secondsFromStart?: number; duration?: number };

function toSeconds(d: unknown): number {
  if (typeof d !== "number" || Number.isNaN(d)) return 0;
  return d > 60 ? d / 1000 : d;
}

export function computeTurnLatencies(messages: Msg[] = []): Turn[] {
  const isUser = (m: Msg) => m.role === "user";
  const isBot = (m: Msg) => m.role === "bot" || m.role === "assistant";
  const turns: Turn[] = [];
  let pendingUser: Msg | null = null;
  let turnNo = 0;
  for (const m of messages) {
    if (typeof m.secondsFromStart !== "number") continue;
    if (isUser(m)) pendingUser = m;
    else if (isBot(m) && pendingUser) {
      const userEnd = (pendingUser.secondsFromStart ?? 0) + toSeconds(pendingUser.duration);
      const latencyMs = Math.round(((m.secondsFromStart ?? 0) - userEnd) * 1000);
      turns.push({ turn: ++turnNo, afterUserSaid: String(pendingUser.message ?? "").slice(0, 40), latencyMs: Math.max(0, latencyMs) });
      pendingUser = null;
    }
  }
  return turns;
}

export function summarizeLatency(turns: { latencyMs: number }[] = []) {
  if (turns.length === 0) return { turns: 0, minMs: 0, avgMs: 0, maxMs: 0, p95Ms: 0 };
  const v = turns.map((t) => t.latencyMs).sort((a, b) => a - b);
  const sum = v.reduce((a, b) => a + b, 0);
  const p95 = Math.min(v.length - 1, Math.ceil(0.95 * v.length) - 1);
  return { turns: v.length, minMs: v[0], avgMs: Math.round(sum / v.length), maxMs: v[v.length - 1], p95Ms: v[p95] };
}

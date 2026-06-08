"use client";

import { useMemo } from "react";
import type { AgentNode } from "@/lib/nodes";
import type { CallState } from "@/lib/callReducer";
import { buildCrmPayload } from "@/lib/payload-builder";
import { computeTurnLatencies, summarizeLatency } from "@/lib/latency-tracker";

export function ResultCard({
  call,
  nodes,
  captureKeys,
  onRestart,
}: {
  call: CallState;
  nodes: AgentNode[];
  captureKeys: { nodeId: string; key: string }[];
  onRestart: () => void;
}) {
  void nodes;
  void captureKeys;

  const payload = useMemo(() => {
    const seconds = call.transcript.length ? Math.max(...call.transcript.map((t) => t.secondsFromStart)) : 0;
    const callData = {
      id: "web-call",
      createdAt: new Date(call.startedAtMs).toISOString(),
      endedAt: new Date(call.startedAtMs + seconds * 1000).toISOString(),
      endedReason: call.endedReason ?? "assistant-ended-call",
    };
    return buildCrmPayload(callData, (call.submitArgs as Record<string, unknown>) ?? null);
  }, [call]);

  const latency = useMemo(() => summarizeLatency(computeTurnLatencies(call.transcript)), [call]);

  const score = payload.rep_priority_score;
  const bars = Math.round(score / 10);

  return (
    <div className="w-full max-w-[900px] mx-auto px-8 py-12">
      <h1 className="font-extralight text-[40px] -tracking-[0.5px] mb-2">Call result</h1>
      <p className="text-muted font-light mb-8">This is the structured disposition your CRM receives.</p>

      <div className="bg-panel border border-line rounded-2xl p-6 mb-5">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-sm text-faint">rep priority</span>
          <span className="font-mono text-emerald-300">{"█".repeat(bars)}{"░".repeat(10 - bars)}</span>
          <span className="font-semibold">{score}/100</span>
        </div>
        <pre className="font-mono text-xs text-muted overflow-x-auto leading-relaxed">
{JSON.stringify(payload, null, 2)}
        </pre>
      </div>

      <div className="bg-panel border border-line rounded-2xl p-6 mb-8">
        <div className="text-xs uppercase tracking-wide text-faint mb-2">Agent response latency</div>
        <div className="text-sm font-light">
          {latency.turns} turns · min {latency.minMs}ms · avg {latency.avgMs}ms · p95 {latency.p95Ms}ms · max {latency.maxMs}ms
        </div>
      </div>

      <button
        onClick={onRestart}
        className="font-medium text-base text-ink px-7 py-3.5 rounded-xl bg-gradient-to-r from-amber-300 to-fuchsia-400 hover:brightness-110 transition-all"
      >
        Build another
      </button>
    </div>
  );
}

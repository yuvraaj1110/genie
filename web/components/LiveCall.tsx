"use client";

import { useEffect } from "react";
import { useVapiCall } from "@/lib/useVapiCall";
import type { AgentNode } from "@/lib/nodes";
import type { CallState } from "@/lib/callReducer";

export function LiveCall({
  assistantId,
  publicKey,
  nodes,
  captureKeys,
  maxDurationSec,
  onEnded,
}: {
  assistantId: string;
  publicKey: string;
  nodes: AgentNode[];
  captureKeys: { nodeId: string; key: string }[];
  maxDurationSec: number;
  onEnded: (state: CallState) => void;
}) {
  void maxDurationSec;
  const { status, state, error, start, stop } = useVapiCall(publicKey);

  useEffect(() => {
    if (status === "ended") onEnded(state);
  }, [status, state, onEnded]);

  const capturedFor = (nodeId: string) => {
    const k = captureKeys.find((c) => c.nodeId === nodeId)?.key;
    return k ? state.captured.includes(k) : false;
  };

  return (
    <div className="w-full max-w-[1100px] mx-auto px-8 py-12">
      <h1 className="font-extralight text-[40px] -tracking-[0.5px] mb-2">Talk to your agent</h1>
      <p className="text-muted font-light mb-8">Click talk and speak in Hindi. Captured fields light up live.</p>

      <div className="flex gap-3 mb-8">
        {status === "idle" || status === "error" ? (
          <button
            onClick={() => start(assistantId)}
            className="font-semibold text-base text-ink px-7 py-3.5 rounded-xl bg-gradient-to-r from-amber-300 to-fuchsia-400 hover:brightness-110 transition-all"
          >
            🎙 Talk
          </button>
        ) : (
          <button onClick={stop} className="font-medium text-base px-7 py-3.5 rounded-xl border border-line2 text-fg">
            End call
          </button>
        )}
        <span className="self-center text-sm text-faint">
          {status === "connecting" ? "connecting…" : status === "live" ? "● live" : status === "ended" ? "ended" : ""}
        </span>
      </div>

      {error && <div className="mb-6 text-sm text-rose-300">{error}</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* transcript */}
        <div className="bg-panel border border-line rounded-2xl p-5 min-h-[260px]">
          <div className="text-xs uppercase tracking-wide text-faint mb-3">Transcript</div>
          <div className="space-y-2">
            {state.transcript.map((t, i) => (
              <div key={i} className="text-sm font-light">
                <span className={t.role === "user" ? "text-sky-300" : "text-fuchsia-300"}>
                  {t.role === "user" ? "Customer" : "Agent"}:
                </span>{" "}
                <span className="font-deva">{t.message}</span>
              </div>
            ))}
            {state.transcript.length === 0 && <div className="text-sm text-faint">…</div>}
          </div>
        </div>

        {/* capture lights */}
        <div className="bg-panel border border-line rounded-2xl p-5">
          <div className="text-xs uppercase tracking-wide text-faint mb-3">Captured data</div>
          <div className="space-y-2.5">
            {nodes.filter((n) => n.capturesData).map((n) => {
              const done = capturedFor(n.id);
              return (
                <div key={n.id} className="flex items-center gap-3 text-sm">
                  <span className={`w-2.5 h-2.5 rounded-full ${done ? "bg-emerald-400" : "bg-line2"}`} />
                  <span className={done ? "text-fg" : "text-faint"}>{n.title}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

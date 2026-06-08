"use client";

import { useCallback, useRef, useState } from "react";
import Vapi from "@vapi-ai/web";
import { initialCallState, reduceCall, type CallEvent, type CallState } from "./callReducer";

export type CallStatus = "idle" | "connecting" | "live" | "ended" | "error";

export function useVapiCall(publicKey: string) {
  const vapiRef = useRef<Vapi | null>(null);
  const [status, setStatus] = useState<CallStatus>("idle");
  const [state, setState] = useState<CallState>(initialCallState(0));
  const [error, setError] = useState<string | null>(null);

  const apply = useCallback((ev: CallEvent) => setState((s) => reduceCall(s, ev)), []);

  const start = useCallback(
    async (assistantId: string) => {
      try {
        setError(null);
        setStatus("connecting");
        setState(initialCallState(Date.now()));
        const vapi = new Vapi(publicKey);
        vapiRef.current = vapi;

        vapi.on("call-start", () => setStatus("live"));
        vapi.on("error", (e: unknown) => {
          setError(String((e as { message?: string })?.message ?? e));
          setStatus("error");
        });
        vapi.on("message", (msg: any) => {
          if (msg?.type === "transcript") {
            apply({
              kind: "transcript",
              role: msg.role === "user" ? "user" : "bot",
              text: msg.transcript ?? "",
              final: msg.transcriptType === "final",
              at: Date.now(),
            });
          } else if (msg?.type === "tool-calls") {
            const calls = msg.toolCalls ?? msg.toolCallList ?? [];
            for (const c of calls) {
              if (c?.function?.name === "submit_call_result") {
                const raw = c.function.arguments ?? "{}";
                const args = typeof raw === "string" ? JSON.parse(raw) : raw;
                apply({ kind: "tool-call", args });
              }
            }
          }
        });
        vapi.on("call-end", () => {
          apply({ kind: "end", reason: "assistant-ended-call", at: Date.now() });
          setStatus("ended");
        });

        await vapi.start(assistantId);
      } catch (e) {
        setError((e as Error).message);
        setStatus("error");
      }
    },
    [publicKey, apply],
  );

  const stop = useCallback(() => {
    vapiRef.current?.stop();
  }, []);

  return { status, state, error, start, stop };
}

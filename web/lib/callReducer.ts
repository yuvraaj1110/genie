export type TranscriptLine = { role: "user" | "bot"; message: string; secondsFromStart: number; duration: number };

export type CallState = {
  startedAtMs: number;
  transcript: TranscriptLine[];
  captured: string[];
  submitArgs: Record<string, unknown> | null;
  ended: boolean;
  endedReason: string | null;
};

export type CallEvent =
  | { kind: "transcript"; role: "user" | "bot"; text: string; final: boolean; at: number }
  | { kind: "tool-call"; args: Record<string, unknown> }
  | { kind: "end"; reason: string; at: number };

export function initialCallState(startedAtMs: number): CallState {
  return { startedAtMs, transcript: [], captured: [], submitArgs: null, ended: false, endedReason: null };
}

export function reduceCall(state: CallState, ev: CallEvent): CallState {
  switch (ev.kind) {
    case "transcript": {
      if (!ev.final) return state;
      const line: TranscriptLine = {
        role: ev.role,
        message: ev.text,
        secondsFromStart: Math.max(0, (ev.at - state.startedAtMs) / 1000),
        duration: 1,
      };
      return { ...state, transcript: [...state.transcript, line] };
    }
    case "tool-call": {
      const keys = Object.keys(ev.args ?? {});
      const captured = Array.from(new Set([...state.captured, ...keys]));
      return { ...state, captured, submitArgs: { ...(state.submitArgs ?? {}), ...ev.args } };
    }
    case "end":
      return { ...state, ended: true, endedReason: ev.reason };
    default:
      return state;
  }
}

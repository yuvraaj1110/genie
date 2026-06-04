import "dotenv/config";
import express from "express";
import { buildCrmPayload } from "./payload-builder.js";

const app = express();
app.use(express.json());

// ── In-memory capture of submit_call_result args, keyed by call id ────────────
// Vapi fires the `tool-calls` event live (mid-call) with the arguments, but the
// later `end-of-call-report` nests the same call inside its transcript in a way
// that is easy to miss. We stash the args here on the live event and read them
// back when the report arrives — the report is the source of truth for call
// metadata (duration, ended reason), the tool-call event for the captured data.
// (Swap this Map for Redis/DB in production — it's per-process and ephemeral.)
const resultsByCallId = new Map();

/** Pull submit_call_result args out of whatever shape a Vapi event provides. */
function extractSubmitArgs(message) {
  const candidates = [
    ...(message?.toolCallList ?? []),
    ...(message?.toolCalls ?? []),
    ...(message?.artifact?.toolCalls ?? []),
    // end-of-call-report nests tool calls inside the transcript messages
    ...(message?.artifact?.messages ?? []).flatMap((m) => m?.toolCalls ?? []),
  ];

  const hit = candidates.find(
    (tc) => tc?.function?.name === "submit_call_result"
  );
  if (!hit) return null;

  const raw = hit.function.arguments ?? "{}";
  return typeof raw === "string" ? JSON.parse(raw) : raw;
}

/** Normalize the call object so the payload builder always has timestamps. */
function normalizeCallData(message) {
  const call = message?.call ?? {};
  return {
    ...call,
    createdAt: call.createdAt ?? message?.startedAt ?? message?.timestamp,
    endedAt: call.endedAt ?? message?.endedAt,
    endedReason: message?.endedReason ?? call.endedReason,
  };
}

app.post("/webhook/vapi", (req, res) => {
  const event = req.body;
  const message = event.message ?? {};
  const msgType = message.type ?? "unknown";
  console.log(`[webhook] event type: ${msgType}`);

  // ── Live tool-call: Vapi fires this mid-call and waits for our ack ──────────
  // Must respond with { results: [{ toolCallId, result }] } or the LLM retries.
  if (msgType === "tool-calls") {
    const callId = message.call?.id;
    const toolCallList = message.toolCallList ?? [];
    const results = toolCallList.map((tc) => {
      const name = tc.function?.name ?? "";
      const rawArgs = tc.function?.arguments ?? "{}";
      const args = typeof rawArgs === "string" ? JSON.parse(rawArgs) : rawArgs;

      if (name === "submit_call_result") {
        if (callId) resultsByCallId.set(callId, args);
        console.log(
          "[tool-call] submit_call_result received:",
          JSON.stringify(args, null, 2)
        );
      }

      return { toolCallId: tc.id, result: "success" };
    });

    return res.status(200).json({ results });
  }

  // ── End-of-call report: full call summary, build & log CRM payload ──────────
  if (msgType === "end-of-call-report") {
    const callData = normalizeCallData(message);

    // Prefer the args we stashed from the live tool-call; fall back to digging
    // them out of the report itself.
    const args =
      (callData.id && resultsByCallId.get(callData.id)) ??
      extractSubmitArgs(message);

    if (!args) {
      console.log(
        "[webhook] no submit_call_result found (genuine early hangup) — building partial payload"
      );
    }

    const crmPayload = buildCrmPayload(callData, args);
    console.log("[CRM PAYLOAD]", JSON.stringify(crmPayload, null, 2));

    if (callData.id) resultsByCallId.delete(callData.id);
  }

  res.status(200).json({ ok: true });
});

app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`[server] listening on port ${port}`);
  console.log(`[server] webhook URL: POST /webhook/vapi`);
});

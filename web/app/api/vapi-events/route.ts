import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

// Vapi serverUrl webhook. For tool-calls it must reply with
// { results: [{ toolCallId, result }] } or the model retries. Authoritative
// path / logging; the live UI is driven client-side by the Web SDK.
export async function POST(req: NextRequest) {
  const event = await req.json().catch(() => ({}));
  const type = event?.message?.type;

  if (type === "tool-calls") {
    const list = event.message?.toolCallList ?? [];
    const results = list.map((tc: { id: string }) => ({ toolCallId: tc.id, result: "success" }));
    return NextResponse.json({ results });
  }

  if (type === "end-of-call-report") {
    // eslint-disable-next-line no-console
    console.log("[vapi end-of-call]", JSON.stringify(event.message?.artifact?.toolCalls ?? []).slice(0, 500));
  }

  return NextResponse.json({ ok: true });
}

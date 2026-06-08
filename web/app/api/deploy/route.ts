import { NextRequest, NextResponse } from "next/server";
import { compileAgent, type Globals } from "@/lib/compiler";
import { buildAssistantBody, createAssistant } from "@/lib/vapi";
import type { AgentNode } from "@/lib/nodes";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const privateKey = process.env.VAPI_PRIVATE_KEY;
  const publicKey = process.env.VAPI_PUBLIC_KEY;
  if (!privateKey || !publicKey) {
    return NextResponse.json({ error: "Vapi keys not configured on the server." }, { status: 500 });
  }

  let nodes: AgentNode[];
  let globals: Globals;
  try {
    const body = await req.json();
    nodes = body.nodes;
    globals = { voice: body.voice, register: body.register, maxDurationSec: body.maxDurationSec };
    if (!Array.isArray(nodes) || nodes.length === 0) throw new Error("no nodes");
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const compiled = compileAgent(nodes, globals);
  const origin = req.nextUrl.origin;
  const assistantBody = buildAssistantBody(compiled, globals, `${origin}/api/vapi-events`);

  try {
    const { id } = await createAssistant(assistantBody, privateKey);
    return NextResponse.json({ assistantId: id, publicKey, captureKeys: compiled.captureKeys });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}

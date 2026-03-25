import { NextRequest, NextResponse } from "next/server";
import { verifyBearer } from "@/lib/auth";
import { getAllAgents, upsertAgent, getAgentById } from "@/lib/db";

// GET /api/agents — list all agents (no token field)
export async function GET(req: NextRequest) {
  const auth = await verifyBearer(req.headers.get("authorization"));
  if (!auth.ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const agents = await getAllAgents();
  return NextResponse.json({ agents });
}

// POST /api/agents/heartbeat — agent signals alive
export async function POST(req: NextRequest) {
  const auth = await verifyBearer(req.headers.get("authorization"));
  if (!auth.ok || auth.subject !== "agent") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const agentId = body.agentId as string | undefined;

  if (agentId && agentId !== auth.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const existing = await getAgentById(auth.id);
  if (existing) {
    await upsertAgent({ ...existing, lastSeen: Date.now() });
  }

  return NextResponse.json({ ok: true });
}

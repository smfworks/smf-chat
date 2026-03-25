import { NextRequest, NextResponse } from "next/server";
import { verifyBearer } from "@/lib/auth";

const AGENTS = [
  { id: "michael", name: "Michael", avatar: "👤", color: "#C87941" },
  { id: "gabriel", name: "Gabriel", avatar: "🔵", color: "#5B8DEF" },
  { id: "rafael",  name: "Rafael",  avatar: "🟢", color: "#34C759" },
  { id: "aiona",   name: "Aiona",   avatar: "🎯", color: "#FF9500" },
];

// GET /api/agents — list all agents
export async function GET(req: NextRequest) {
  const auth = await verifyBearer(req.headers.get("authorization"));
  if (!auth.ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({ agents: AGENTS });
}

// POST /api/agents/heartbeat — agent signals alive (no-op with Turso)
export async function POST(req: NextRequest) {
  const auth = await verifyBearer(req.headers.get("authorization"));
  if (!auth.ok || auth.subject !== "agent") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json({ ok: true });
}

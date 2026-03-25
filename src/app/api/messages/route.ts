import { NextRequest, NextResponse } from "next/server";
import { verifyBearer } from "@/lib/auth";
import { getMessages, saveMessage, initDb } from "@/lib/db";

// Init DB schema once per cold start
let _dbInitialized = false;
async function ensureDb() {
  if (!_dbInitialized) {
    _dbInitialized = true;
    await initDb();
  }
}

export async function GET(req: NextRequest) {
  await ensureDb();
  const auth = await verifyBearer(req.headers.get("authorization"));
  if (!auth.ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const channel = searchParams.get("channel") ?? "general";
  const since = Number(searchParams.get("since") ?? "0");

  const messages = await getMessages(channel, since);
  return NextResponse.json({ messages });
}

export async function POST(req: NextRequest) {
  await ensureDb();
  const auth = await verifyBearer(req.headers.get("authorization"));
  if (!auth.ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { content, channel } = await req.json();
    if (!content || typeof content !== "string") {
      return NextResponse.json({ error: "content required" }, { status: 400 });
    }

    const msg = await saveMessage(
      auth.id,
      content.slice(0, 10000),
      (channel as string) ?? "general",
    );
    return NextResponse.json({ message: msg }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

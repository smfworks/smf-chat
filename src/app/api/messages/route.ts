import { NextRequest, NextResponse } from "next/server";
import { verifyBearer } from "@/lib/auth";
import { getMessages, insertMessage } from "@/lib/db";
import { v4 as uuidv4 } from "uuid";

export async function GET(req: NextRequest) {
  const auth = await verifyBearer(req.headers.get("authorization"));
  if (!auth.ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const channel = searchParams.get("channel") ?? "general";
  const since = Number(searchParams.get("since") ?? "0");

  const messages = await getMessages(channel, since);
  return NextResponse.json({ messages });
}

export async function POST(req: NextRequest) {
  const auth = await verifyBearer(req.headers.get("authorization"));
  if (!auth.ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { content, channel } = await req.json();
    if (!content || typeof content !== "string") {
      return NextResponse.json({ error: "content required" }, { status: 400 });
    }

    const message = {
      id: uuidv4(),
      agentId: auth.id,
      content: content.slice(0, 10000),
      timestamp: Date.now(),
      channel: (channel as string) ?? "general",
    };

    await insertMessage(message);
    return NextResponse.json({ message }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

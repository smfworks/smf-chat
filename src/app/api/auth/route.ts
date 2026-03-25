import { NextRequest, NextResponse } from "next/server";
import { verifyPin, mintMichaelToken } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const { pin } = await req.json();
    if (!pin || typeof pin !== "string") {
      return NextResponse.json({ error: "PIN required" }, { status: 400 });
    }

    if (!verifyPin(pin)) {
      return NextResponse.json({ error: "Invalid PIN" }, { status: 401 });
    }

    const token = await mintMichaelToken();
    return NextResponse.json({ token });
  } catch (e) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

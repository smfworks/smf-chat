import { NextResponse } from "next/server";
import { createClient } from "@libsql/client";

export async function GET() {
  const url = process.env.TURSO_DATABASE_URL;
  const token = process.env.TURSO_AUTH_TOKEN;
  const pin = process.env.PIN_SECRET;
  
  try {
    const client = createClient({ url: url!, authToken: token! });
    const result = await client.execute("SELECT COUNT(*) as count FROM messages");
    return NextResponse.json({
      turso_url: url ?? "NOT SET",
      turso_token: token ? "SET" : "NOT SET",
      pin_secret: pin ?? "NOT SET",
      pin_secret_len: pin?.length ?? 0,
      db_count: result.rows,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message, url, token_set: !!token, pin_secret: pin ?? "NOT SET" });
  }
}

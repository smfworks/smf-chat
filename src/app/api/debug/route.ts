import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@libsql/client";
import { verifyAgentToken } from "@/lib/auth";

function decodeEnvVal(key: string): string {
  const val = process.env[key];
  if (!val) return "";
  try {
    return Buffer.from(val, "base64").toString("utf8");
  } catch {
    return val;
  }
}

export async function GET(req: NextRequest) {
  const url = process.env.TURSO_DATABASE_URL;
  const token = process.env.TURSO_AUTH_TOKEN;
  const pin = process.env.PIN_SECRET;
  const action = new URL(req.url).searchParams.get("action");

  // Decode AGENT_TOKEN_HASHES using the same method as auth.ts
  const decoded = decodeEnvVal("AGENT_TOKEN_HASHES");

  // Test agent token verification
  const testTokens = {
    aiona: "372a1438-03db-4ab2-98a9-d8b77e265b2b",
    gabriel: "909ca9e7-f897-4aaa-a197-766b8f53c266",
    rafael: "5e97606e-d2b2-4c12-aeac-a7c8c18e391c"
  };

  const agentResults: Record<string, { token_ok: boolean; agent_id: string | null }> = {};
  for (const [name, t] of Object.entries(testTokens)) {
    const id = verifyAgentToken(t);
    agentResults[name] = { token_ok: id !== null, agent_id: id };
  }

  try {
    const client = createClient({ url: url!, authToken: token! });

    // One-shot cleanup: delete all NO_REPLY messages
    if (action === "cleanup-noreply") {
      const findResult = await client.execute(
        `SELECT id, agent_id, content, timestamp, channel FROM messages WHERE content = 'NO_REPLY'`
      );
      const msgs = findResult.rows as unknown as Array<{ id: string; agent_id: string; content: string; timestamp: number; channel: string }>;
      let deleted = 0;
      for (const m of msgs) {
        const r = await client.execute({ sql: "DELETE FROM messages WHERE id = ?", args: [m.id] });
        if ((r.rowsAffected ?? 0) > 0) deleted++;
      }
      return NextResponse.json({ action: "cleanup-noreply", found: msgs.length, deleted });
    }

    const result = await client.execute("SELECT COUNT(*) as count FROM messages");
    return NextResponse.json({
      pin_secret_len: pin?.length ?? 0,
      decoded_hashes: decoded || "EMPTY",
      decoded_parsed: (() => { try { return JSON.parse(decoded); } catch { return "PARSE_ERROR"; } })(),
      agent_verification: agentResults,
      db_count: result.rows,
    });
  } catch (e: any) {
    return NextResponse.json({
      error: e.message,
      decoded_hashes: decoded || "EMPTY",
      agent_verification: agentResults,
    });
  }
}

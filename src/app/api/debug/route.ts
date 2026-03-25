import { NextResponse } from "next/server";
import { verifyAgentToken } from "@/lib/auth";

export async function GET(req: Request) {
  const auth = req.headers.get("authorization") ?? "";
  const token = auth.replace("Bearer ", "");
  
  // Try to verify the agent token directly
  const agentId = verifyAgentToken(token);
  
  return NextResponse.json({
    token_len: token.length,
    agent_id_result: agentId,
    agent_hashes_type: typeof process.env.AGENT_TOKEN_HASHES,
    agent_hashes_len: (process.env.AGENT_TOKEN_HASHES ?? "MISSING").length,
    agent_hashes_preview: (process.env.AGENT_TOKEN_HASHES ?? "MISSING").slice(0, 50),
    pin_secret_set: !!process.env.PIN_SECRET,
    pin_secret_val: process.env.PIN_SECRET ?? "NOT SET",
  });
}

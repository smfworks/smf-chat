/**
 * smf-chat auth — JWT for Michael, Bearer-hash for agents
 */

import { SignJWT, jwtVerify } from "jose";
import { compareSync } from "bcryptjs";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET ?? "change-me-in-production-min-32-chars!!",
);

const PIN_HASH = process.env.PIN_HASH ?? ""; // bcrypt hash of 6-digit PIN
const AGENT_TOKEN_HASHES: Record<string, string> = JSON.parse(
  process.env.AGENT_TOKEN_HASHES ?? "{}",
);

// ── Michael (JWT) ──────────────────────────────────────────

export async function mintMichaelToken(): Promise<string> {
  return new SignJWT({ role: "michael" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("24h")
    .sign(JWT_SECRET);
}

export async function verifyMichaelToken(token: string): Promise<boolean> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload.role === "michael";
  } catch {
    return false;
  }
}

// ── PIN auth (for Michael web login) ──────────────────────

export function verifyPin(pin: string): boolean {
  if (!PIN_HASH) return false;
  return compareSync(pin, PIN_HASH);
}

// ── Agent bearer tokens ───────────────────────────────────

export function verifyAgentToken(token: string): string | null {
  // token is the raw UUID; we hash it and compare
  for (const [id, hash] of Object.entries(AGENT_TOKEN_HASHES)) {
    if (compareSync(token, hash)) return id;
  }
  return null;
}

// ── Generic bearer verifier (Michael or agent) ─────────────

export type AuthResult =
  | { ok: true; subject: "michael"; id: string }
  | { ok: true; subject: "agent"; id: string }
  | { ok: false };

export async function verifyBearer(
  authHeader: string | null,
): Promise<AuthResult> {
  if (!authHeader?.startsWith("Bearer ")) return { ok: false };
  const token = authHeader.slice(7);

  // Try Michael JWT first
  if (await verifyMichaelToken(token)) {
    return { ok: true, subject: "michael", id: "michael" };
  }

  // Try agent token
  const agentId = verifyAgentToken(token);
  if (agentId) {
    return { ok: true, subject: "agent", id: agentId };
  }

  return { ok: false };
}

/**
 * smf-chat auth — JWT for Michael, Bearer-hash for agents
 */

import { SignJWT, jwtVerify } from "jose";
import { compareSync } from "bcryptjs";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET ?? "change-me-in-production-min-32-chars!!",
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
const CORRECT_PIN = process.env.PIN_SECRET ?? "123456";

export function verifyPin(pin: string): boolean {
  return pin === CORRECT_PIN;
}

// ── Agent bearer tokens ───────────────────────────────────
function decodeEnv(key: string): string {
  const val = process.env[key];
  if (!val) return "";
  try {
    // Base64-encode values with $ to avoid shell expansion stripping them
    return Buffer.from(val, "base64").toString("utf8");
  } catch {
    return val;
  }
}

export function verifyAgentToken(token: string): string | null {
  const raw = decodeEnv("AGENT_TOKEN_HASHES");
  if (!raw) return null;
  let hashes: Record<string, string>;
  try {
    hashes = JSON.parse(raw);
  } catch {
    return null;
  }
  for (const [id, hash] of Object.entries(hashes)) {
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

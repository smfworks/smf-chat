/**
 * smf-chat — Database layer
 * Uses Turso (libsql) for persistent storage.
 * Falls back to in-memory if TURSO_DATABASE_URL is not set.
 */

import { createClient, type Client } from "@libsql/client";

// ── Types ───────────────────────────────────────────────
export type Message = {
  id: string;
  agentId: string;
  content: string;
  timestamp: number;
  channel: string;
};

// ── Turso client ───────────────────────────────────────
let _client: Client | null = null;

function getClient(): Client | null {
  if (!process.env.TURSO_DATABASE_URL) return null;
  if (!_client) {
    _client = createClient({
      url: process.env.TURSO_DATABASE_URL,
      authToken: process.env.TURSO_AUTH_TOKEN,
    });
  }
  return _client;
}

// ── Schema init ────────────────────────────────────────
export async function initDb(): Promise<void> {
  const client = getClient();
  if (!client) return;

  await client.execute(`
    CREATE TABLE IF NOT EXISTS messages (
      id          TEXT    PRIMARY KEY,
      agent_id    TEXT    NOT NULL,
      content     TEXT    NOT NULL,
      timestamp   INTEGER NOT NULL,
      channel     TEXT    NOT NULL
    )
  `);
  await client.execute(`
    CREATE INDEX IF NOT EXISTS idx_messages_channel_timestamp
      ON messages(channel, timestamp)
  `);
}

// ── In-memory fallback store ────────────────────────────
const _memStore: Message[] = [];

function genId(): string {
  return crypto.randomUUID();
}

// ── API ────────────────────────────────────────────────

/**
 * Save a message. Returns the saved message with id + timestamp.
 */
export async function saveMessage(
  agentId: string,
  content: string,
  channel: string,
): Promise<Message> {
  const msg: Message = {
    id: genId(),
    agentId,
    content,
    timestamp: Date.now(),
    channel,
  };

  const client = getClient();
  if (client) {
    await client.execute({
      sql: "INSERT INTO messages (id, agent_id, content, timestamp, channel) VALUES (?, ?, ?, ?, ?)",
      args: [msg.id, msg.agentId, msg.content, msg.timestamp, msg.channel],
    });
  } else {
    _memStore.push(msg);
  }

  return msg;
}

/**
 * Get messages for a channel newer than `since` (exclusive).
 * If since is 0, returns all messages up to a limit.
 */
export async function getMessages(
  channel: string,
  since: number,
  limit = 500,
): Promise<Message[]> {
  const client = getClient();

  if (client) {
    const result = await client.execute({
      sql: `
        SELECT id, agent_id AS agentId, content, timestamp, channel
        FROM messages
        WHERE channel = ? AND timestamp > ?
        ORDER BY timestamp ASC
        LIMIT ?
      `,
      args: [channel, since, limit],
    });
    return result.rows as unknown as Message[];
  }

  // In-memory fallback
  const msgs = _memStore.filter(
    (m) => m.channel === channel && m.timestamp > since,
  );
  return msgs.slice(0, limit);
}

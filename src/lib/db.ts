/**
 * smf-chat DB — File-based JSON store
 * Works on Vercel serverless (no external DB needed)
 * Uses /tmp for ephemeral storage (resets on cold start)
 * For production persistence, replace with Turso or Postgres
 */

import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";

const DATA_FILE = "/tmp/smf-chat-data.json";

type Message = {
  id: string;
  agentId: string;
  content: string;
  timestamp: number;
  channel: string;
};

type AgentRecord = {
  id: string;
  name: string;
  tokenHash: string;
  emoji: string;
  lastSeen: number;
};

type DataStore = {
  messages: Message[];
  agents: AgentRecord[];
};

function loadData(): DataStore {
  if (existsSync(DATA_FILE)) {
    try {
      return JSON.parse(readFileSync(DATA_FILE, "utf-8"));
    } catch {
      // corrupt file, reset
    }
  }
  return { messages: [], agents: [] };
}

function saveData(data: DataStore) {
  writeFileSync(DATA_FILE, JSON.stringify(data), "utf-8");
}

// ── Messages ──────────────────────────────────────────────

export async function insertMessage(msg: Message) {
  const data = loadData();
  data.messages.push(msg);
  // Keep last 1000 messages per channel to avoid unbounded growth
  const byChannel: Record<string, Message[]> = {};
  for (const m of data.messages) {
    byChannel[m.channel] = byChannel[m.channel] ?? [];
    byChannel[m.channel].push(m);
  }
  for (const ch in byChannel) {
    byChannel[ch] = byChannel[ch].slice(-1000);
  }
  data.messages = Object.values(byChannel).flat();
  saveData(data);
}

export async function getMessages(channel: string, since = 0): Promise<Message[]> {
  const data = loadData();
  return data.messages
    .filter((m) => m.channel === channel && m.timestamp > since)
    .sort((a, b) => a.timestamp - b.timestamp);
}

// ── Agents ────────────────────────────────────────────────

export async function upsertAgent(agent: AgentRecord) {
  const data = loadData();
  const idx = data.agents.findIndex((a) => a.id === agent.id);
  if (idx >= 0) {
    data.agents[idx] = agent;
  } else {
    data.agents.push(agent);
  }
  saveData(data);
}

export async function getAgentById(id: string): Promise<AgentRecord | null> {
  const data = loadData();
  return data.agents.find((a) => a.id === id) ?? null;
}

export async function getAllAgents(): Promise<Omit<AgentRecord, "tokenHash">[]> {
  const data = loadData();
  return data.agents
    .map(({ tokenHash: _, ...rest }) => rest)
    .sort((a, b) => b.lastSeen - a.lastSeen);
}

// ── Init (no-op for file store) ───────────────────────────

export async function initDb() {
  // No-op — file store auto-creates on first write
}

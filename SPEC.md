# smf-chat — Secure Multi-Agent Chat

## What It Is

A secure, self-hosted chat application for Michael's multi-agent OpenClaw setup.
Three agents + Michael communicate through a central Vercel-hosted hub.
Private, fast, and publishable as a Pro skill.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│  smf-chat.vercel.app (Vercel)                          │
│                                                         │
│  /              → Chat web UI (Michael)                 │
│  /api/auth      → PIN validation                        │
│  /api/messages  → GET/POST messages                     │
│  /api/agents    → Agent registry                        │
│                                                         │
│  SQLite (Turso) for persistence                        │
└─────────────────────────────────────────────────────────┘
       ↑                              ↑        ↑
   Michael                       Agent 1    Agent 2/3
   (web UI)                   (OpenClaw)  (OpenClaw)
```

## Auth Design

- **Michael (web):** 6-digit PIN stored as bcrypt hash in env var
- **Agents (API):** Bearer token per agent (UUID stored in env vars)
- **Encryption:** All traffic over HTTPS
- **Rate limiting:** 100 req/min per agent

## Data Model

```typescript
type Message = {
  id: string;          // UUID
  agentId: string;     // "michael" | "gabriel" | "rafael" | "aiona"
  content: string;     // Markdown content
  timestamp: number;    // Unix ms
  channel: string;     // "general" | "agent:gabriel" | etc.
};

type Agent = {
  id: string;           // Unique agent ID
  name: string;         // Display name
  token: string;        // Bearer token (hashed in DB)
  emoji: string;        // Avatar emoji
  lastSeen: number;    // Unix ms
};
```

## API Endpoints

### POST /api/auth
**Body:** `{ pin: string }`  
**Returns:** `{ token: string }` (JWT, 24h expiry)  
**Errors:** 401 if wrong PIN

### GET /api/messages?channel=general&since=0
**Auth:** Bearer token (agent or Michael JWT)  
**Returns:** `{ messages: Message[] }`

### POST /api/messages
**Auth:** Bearer token  
**Body:** `{ content: string, channel: string }`  
**Returns:** `{ message: Message }`

### GET /api/agents
**Auth:** Bearer token  
**Returns:** `{ agents: Agent[] }` (不含token字段)

### POST /api/agents/heartbeat
**Auth:** Bearer token (agent only)  
**Body:** `{ agentId: string }`  
**Returns:** `{ ok: true }`

## Channels

- `general` — Shared chat for all
- `agent:<id>` — Direct message to specific agent
- `system` — System announcements (agent join/leave)

## Skill Wrapper

Location: `/skills/smf-chat/`
- SKILL.md — Overview, features, security
- SETUP.md — How to deploy Vercel app + configure agents
- HOWTO.md — Usage guide for Michael and agents

## Dashboard Integration

Link from smf-dashboard `/chat` section to smf-chat app.

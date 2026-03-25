"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import ReactMarkdown from "react-markdown";

type Message = {
  id: string;
  agentId: string;
  content: string;
  timestamp: number;
  channel: string;
};

type Agent = {
  id: string;
  name: string;
  emoji: string;
  lastSeen: number;
};

const AGENT_EMOJI: Record<string, string> = {
  michael: "👤",
  gabriel: "🔵",
  rafael: "🟢",
  aiona: "🎯",
};

const AGENT_NAMES: Record<string, string> = {
  michael: "Michael",
  gabriel: "Gabriel",
  rafael: "Rafael",
  aiona: "Aiona",
};

function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function ChatPage() {
  const [token, setToken] = useState<string | null>(null);
  const [pin, setPin] = useState("");
  const [authError, setAuthError] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [channel, setChannel] = useState("general");
  const [channels] = useState(["general", "system"]);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [sending, setSending] = useState(false);
  const [since, setSince] = useState(0);
  const [agents, setAgents] = useState<Agent[]>([]);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Auth ────────────────────────────────────────────────
  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setAuthError("");
    const res = await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin }),
    });
    if (!res.ok) {
      setAuthError("Invalid PIN");
      return;
    }
    const data = await res.json();
    setToken(data.token);
    setPin("");
  }

  // ── Load messages ───────────────────────────────────────
  const loadMessages = useCallback(async () => {
    if (!token) return;
    const res = await fetch(`/api/messages?channel=${channel}&since=${since}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return;
    const data = await res.json();
    if (data.messages.length > 0) {
      setMessages((prev) => {
        const ids = new Set(prev.map((m) => m.id));
        const newMsgs = data.messages.filter((m: Message) => !ids.has(m.id));
        return [...prev, ...newMsgs].slice(-500);
      });
      setSince(data.messages[data.messages.length - 1].timestamp);
    }
  }, [token, channel, since]);

  // ── Send message ────────────────────────────────────────
  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || !token || sending) return;
    setSending(true);
    const content = input.trim();
    setInput("");
    const res = await fetch("/api/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ content, channel }),
    });
    setSending(false);
    if (res.ok) {
      await loadMessages();
    }
  }

  // ── Poll for new messages ──────────────────────────────
  useEffect(() => {
    if (!token) return;
    loadMessages();
    pollingRef.current = setInterval(loadMessages, 2000);
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [token, channel, loadMessages]);

  // ── Scroll to bottom ───────────────────────────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ── Login screen ───────────────────────────────────────
  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <form onSubmit={handleLogin} className="bg-gray-900 p-8 rounded-xl border border-gray-800 w-80">
          <h1 className="text-white text-xl font-bold mb-6 text-center">smf-chat</h1>
          <input
            type="password"
            maxLength={8}
            inputMode="numeric"
            pattern="[0-9]*"
            placeholder="Enter 6-digit PIN"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white text-center text-2xl tracking-widest placeholder:text-gray-500 focus:outline-none focus:border-blue-500"
            autoFocus
          />
          {authError && <p className="text-red-400 text-sm mt-3 text-center">{authError}</p>}
          <button
            type="submit"
            className="w-full mt-4 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium transition"
          >
            Sign In
          </button>
          <p className="text-gray-500 text-xs mt-4 text-center">Secured with HTTPS + JWT</p>
        </form>
      </div>
    );
  }

  // ── Chat screen ────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      {/* Header */}
      <header className="bg-gray-900 border-b border-gray-800 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-xl">💬</span>
          <h1 className="text-white font-bold text-lg">smf-chat</h1>
          <span className="text-gray-500 text-sm">Secure Multi-Agent</span>
        </div>
        <div className="flex gap-2">
          {["general", "system"].map((ch) => (
            <button
              key={ch}
              onClick={() => { setChannel(ch); setSince(0); setMessages([]); }}
              className={`px-3 py-1 rounded text-sm ${
                channel === ch
                  ? "bg-blue-600 text-white"
                  : "bg-gray-800 text-gray-400 hover:text-white"
              }`}
            >
              #{ch}
            </button>
          ))}
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <p className="text-gray-500 text-center text-sm mt-8">No messages yet. Say hello! 👋</p>
        )}
        {messages.map((msg) => {
          const isMe = msg.agentId === "michael";
          const emoji = AGENT_EMOJI[msg.agentId] ?? "🤖";
          const name = AGENT_NAMES[msg.agentId] ?? msg.agentId;
          return (
            <div key={msg.id} className={`flex gap-3 ${isMe ? "flex-row-reverse" : ""}`}>
              <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-lg ${
                isMe ? "bg-blue-600" : "bg-gray-800"
              }`}>
                {emoji}
              </div>
              <div className={`max-w-[75%] ${isMe ? "items-end" : "items-start"} flex flex-col`}>
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-sm font-medium ${isMe ? "text-blue-400" : "text-gray-300"}`}>
                    {name}
                  </span>
                  <span className="text-gray-600 text-xs">{formatTime(msg.timestamp)}</span>
                </div>
                <div className={`rounded-xl px-4 py-2 text-sm ${
                  isMe
                    ? "bg-blue-600 text-white rounded-tr-sm"
                    : "bg-gray-800 text-gray-100 rounded-tl-sm"
                }`}>
                  <ReactMarkdown className="prose prose-sm prose-invert">{msg.content}</ReactMarkdown>
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSend} className="bg-gray-900 border-t border-gray-800 p-4">
        <div className="flex gap-3 max-w-4xl mx-auto">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Message…"
            className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder:text-gray-500 focus:outline-none focus:border-blue-500 text-sm"
            disabled={sending}
          />
          <button
            type="submit"
            disabled={!input.trim() || sending}
            className="bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white px-6 py-3 rounded-xl font-medium text-sm transition"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
}

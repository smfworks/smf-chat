"use client";

import { useState, useEffect, useRef, useCallback } from "react";

/* ── Types ─────────────────────────────────────────────── */
type Message = {
  id: string;
  agentId: string;
  content: string;
  timestamp: number;
  channel: string;
};

type AgentInfo = {
  id: string;
  name: string;
  avatar: string;
  color: string;
};

const AGENTS: Record<string, AgentInfo> = {
  michael: { id: "michael", name: "Michael", avatar: "👤", color: "#C87941" },
  gabriel: { id: "gabriel", name: "Gabriel", avatar: "🔵", color: "#5B8DEF" },
  rafael:  { id: "rafael",  name: "Rafael",  avatar: "🟢", color: "#34C759" },
  aiona:   { id: "aiona",   name: "Aiona",   avatar: "🎯", color: "#FF9500" },
};

/* ── Helpers ──────────────────────────────────────────── */
function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}
function formatDate(ts: number) {
  const d = new Date(ts);
  const today = new Date();
  const yest = new Date(today); yest.setDate(yest.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === yest.toDateString()) return "Yesterday";
  return d.toLocaleDateString("en-US", { month: "long", day: "numeric" });
}

/* ── Markdown renderer (no dependencies) ──────────────── */
function renderMarkdown(text: string): string {
  return text
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/`(.+?)`/g, "<code>$1</code>")
    .replace(/\n/g, "<br/>");
}

function BubbleText({ content }: { content: string }) {
  return (
    <span
      dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
      style={{ fontSize: 14, lineHeight: 1.55 }}
    />
  );
}

/* ── Avatar ─────────────────────────────────────────── */
function Avatar({ agentId, size = 32 }: { agentId: string; size?: number }) {
  const agent = AGENTS[agentId] ?? { name: agentId, avatar: "?", color: "#666" };
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      background: agent.color + "22", color: agent.color,
      border: `1.5px solid ${agent.color}33`,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.45, flexShrink: 0
    }}>
      {agent.avatar}
    </div>
  );
}

/* ── Sidebar ─────────────────────────────────────────── */
function Sidebar({ msgCount, onLogout }: { msgCount: number; onLogout: () => void }) {
  const agents = Object.values(AGENTS);

  return (
    <aside style={{
      width: 240, flexShrink: 0, display: "flex", flexDirection: "column",
      height: "100%", background: "#161618",
      borderRight: "1px solid rgba(255,255,255,0.06)"
    }}>
      <div style={{ padding: "20px 20px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: "linear-gradient(135deg, #C87941, #E8A462)",
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18
          }}>💬</div>
          <div>
            <div style={{ color: "white", fontWeight: 600, fontSize: 14, lineHeight: 1.2 }}>smf-chat</div>
            <div style={{ color: "#6b7280", fontSize: 12 }}>Secure Network</div>
          </div>
        </div>
        <div style={{
          display: "flex", gap: 4, padding: 3, borderRadius: 10,
          background: "rgba(255,255,255,0.04)"
        }}>
          {["All", "Direct"].map((tab, i) => (
            <button key={tab} style={{
              flex: 1, padding: "6px 0", borderRadius: 8, border: "none",
              fontSize: 12, fontWeight: 500,
              background: i === 0 ? "rgba(255,255,255,0.08)" : "transparent",
              color: i === 0 ? "white" : "#6b7280",
              cursor: "pointer"
            }}>{tab}</button>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "12px 8px" }}>
        <div style={{ color: "#6b7280", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600, margin: "0 0 8px 8px" }}>Network</div>
        {agents.map((agent) => (
          <button key={agent.id} style={{
            width: "100%", display: "flex", alignItems: "center", gap: 10,
            padding: "8px 12px", borderRadius: 12, border: "none",
            background: "transparent", cursor: "pointer", textAlign: "left",
            transition: "background 0.15s"
          }}
            onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.04)")}
            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
            <div style={{ position: "relative" }}>
              <Avatar agentId={agent.id} />
              <span style={{
                position: "absolute", bottom: -1, right: -1, width: 10, height: 10,
                borderRadius: "50%", background: "#34C759", border: "2px solid #161618"
              }} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ color: "white", fontSize: 14, fontWeight: 500 }}>{agent.name}</div>
              <div style={{ color: "#6b7280", fontSize: 12 }}>Active now</div>
            </div>
          </button>
        ))}

        <div style={{
          margin: "16px 4px", padding: 16, borderRadius: 16,
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.06)"
        }}>
          <div style={{ color: "#6b7280", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600, marginBottom: 12 }}>Session</div>
          {[
            ["Messages", String(msgCount), "#ffffff"],
            ["Channel", "general", "#d1d5db"],
            ["Agents", `${agents.length} online`, "#34C759"],
          ].map(([label, value, color]) => (
            <div key={label} style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <span style={{ color: "#9ca3af", fontSize: 12 }}>{label}</span>
              <span style={{ color: color as string, fontSize: 12, fontFamily: "monospace" }}>{value}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ padding: 16, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{
          display: "flex", alignItems: "center", gap: 10,
          padding: "10px 12px", borderRadius: 12,
          background: "rgba(200,121,65,0.08)",
          border: "1px solid rgba(200,121,65,0.15)"
        }}>
          <Avatar agentId="michael" size={32} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ color: "white", fontSize: 14, fontWeight: 500 }}>Michael</div>
            <div style={{ color: "rgba(200,121,65,0.7)", fontSize: 12 }}>You</div>
          </div>
          <button
            onClick={onLogout}
            title="Sign out"
            style={{
              width: 28, height: 28, borderRadius: 8, border: "none",
              background: "rgba(255,255,255,0.05)", color: "#6b7280",
              cursor: "pointer", display: "flex", alignItems: "center",
              justifyContent: "center", fontSize: 14, transition: "color 0.15s"
            }}
            onMouseEnter={e => (e.currentTarget.style.color = "#ef4444")}
            onMouseLeave={e => (e.currentTarget.style.color = "#6b7280")}
          >⏻</button>
        </div>
      </div>
    </aside>
  );
}

/* ── PIN Login ────────────────────────────────────────── */
function PinLogin({ onSubmit, error }: { onSubmit: (pin: string) => void; error: string }) {
  const [pin, setPin] = useState("");

  const btn: React.CSSProperties = {
    width: 72, height: 52, borderRadius: 999, border: "none",
    background: "rgba(255,255,255,0.07)", color: "white",
    fontSize: 20, fontWeight: 300, cursor: "pointer",
    transition: "background 0.15s, transform 0.1s"
  };
  const ctrlBtn: React.CSSProperties = {
    ...btn, background: "transparent", color: "#9ca3af", fontSize: 12, fontWeight: 600
  };

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: "radial-gradient(ellipse at 50% 0%, #1e1030 0%, #0e0e18 70%)",
      padding: 24, flexDirection: "column", gap: 28
    }}>
      {/* Logo */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
        <div style={{
          width: 56, height: 56, borderRadius: 14,
          background: "linear-gradient(135deg, #C87941, #E8A462)",
          boxShadow: "0 4px 24px rgba(200,121,65,0.25)",
          display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28
        }}>💬</div>
        <h1 style={{ color: "white", fontSize: 24, fontWeight: 600, margin: 0 }}>smf-chat</h1>
        <p style={{ color: "#6b7280", fontSize: 14, margin: 0 }}>Sign in with your PIN</p>
      </div>

      {/* PIN input */}
      <input
        type="password"
        inputMode="numeric"
        pattern="[0-9]*"
        maxLength={6}
        value={pin}
        onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
        placeholder="••••••"
        autoFocus
        style={{
          width: "100%", maxWidth: 280, textAlign: "center", fontSize: 28,
          letterSpacing: "0.5em", fontWeight: 600, padding: "16px 0",
          borderRadius: 16, border: `2px solid ${pin.length > 0 ? "#C87941" : "rgba(255,255,255,0.1)"}`,
          background: "rgba(255,255,255,0.05)", color: "white", outline: "none",
          caretColor: "#C87941",
          boxShadow: pin.length > 0 ? "0 0 0 4px rgba(200,121,65,0.1)" : "none",
          transition: "border-color 0.15s, box-shadow 0.15s"
        }}
      />

      {/* Keypad */}
      <div style={{ width: "100%", maxWidth: 240 }}>
        {[
          ["1","2","3"],
          ["4","5","6"],
          ["7","8","9"],
          ["CLR","0","⌫"],
        ].map((row, ri) => (
          <div key={ri} style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
            {row.map((key) => {
              const isCtrl = key === "CLR" || key === "⌫";
              const onClick = key === "CLR" ? () => setPin("") : key === "⌫" ? () => setPin(pin.slice(0, -1)) : () => pin.length < 6 && setPin(pin + key);
              const b = isCtrl ? ctrlBtn : btn;
              return (
                <button key={key} type="button" onClick={onClick}
                  style={b}
                  onMouseEnter={e => (e.currentTarget.style.background = isCtrl ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.12)")}
                  onMouseLeave={e => (e.currentTarget.style.background = isCtrl ? "transparent" : "rgba(255,255,255,0.07)")}
                  onMouseDown={e => (e.currentTarget.style.transform = "scale(0.94)")}
                  onMouseUp={e => (e.currentTarget.style.transform = "scale(1)")}
                >{key}</button>
              );
            })}
          </div>
        ))}
      </div>

      {/* Progress dots */}
      <div style={{ display: "flex", gap: 8 }}>
        {[...Array(6)].map((_, i) => (
          <div key={i} style={{
            width: 8, height: 8, borderRadius: "50%",
            background: i < pin.length ? "#C87941" : "rgba(255,255,255,0.15)",
            transform: i < pin.length ? "scale(1.25)" : "scale(1)",
            transition: "all 0.15s"
          }} />
        ))}
      </div>

      {/* Submit */}
      <button
        type="button"
        onClick={() => pin.length === 6 && onSubmit(pin)}
        disabled={pin.length !== 6}
        style={{
          width: "100%", maxWidth: 280, padding: "14px 0", borderRadius: 999, border: "none",
          background: pin.length === 6 ? "linear-gradient(135deg, #C87941, #E8A462)" : "rgba(255,255,255,0.06)",
          color: "white", fontSize: 13, fontWeight: 700, letterSpacing: "0.08em",
          cursor: pin.length === 6 ? "pointer" : "not-allowed",
          opacity: pin.length === 6 ? 1 : 0.3,
          boxShadow: pin.length === 6 ? "0 4px 16px rgba(200,121,65,0.3)" : "none",
          transition: "all 0.15s", textTransform: "uppercase"
        }}
      >
        {pin.length === 6 ? "Sign In" : `${pin.length}/6`}
      </button>

      {/* Error */}
      {error && (
        <div style={{
          padding: "8px 16px", borderRadius: 999,
          background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)",
          color: "#fca5a5", fontSize: 12, fontWeight: 500
        }}>{error}</div>
      )}
    </div>
  );
}

/* ── Message Bubble ───────────────────────────────────── */
function MessageBubble({ msg, prevMsg }: { msg: Message; prevMsg?: Message }) {
  const isMe = msg.agentId === "michael";
  const agent = AGENTS[msg.agentId] ?? { name: msg.agentId, avatar: "?", color: "#666" };
  const showAvatar = !prevMsg || prevMsg.agentId !== msg.agentId;
  const showName = !isMe && showAvatar;

  return (
    <div style={{
      display: "flex", flexDirection: isMe ? "row-reverse" : "row",
      gap: 8, marginTop: showAvatar ? 16 : 2
    }}>
      <div style={{ width: 32, flexShrink: 0 }}>
        {showAvatar && !isMe && <Avatar agentId={msg.agentId} />}
        {showAvatar && isMe && (
          <div style={{
            width: 32, height: 32, borderRadius: "50%",
            background: "rgba(200,121,65,0.2)", color: "#C87941",
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14
          }}>👤</div>
        )}
        {!showAvatar && <div style={{ width: 32 }} />}
      </div>

      <div style={{ display: "flex", flexDirection: "column", alignItems: isMe ? "flex-end" : "flex-start", maxWidth: "65%" }}>
        {(showName || isMe) && (
          <div style={{
            display: "flex", alignItems: "center", gap: 6, marginBottom: 4,
            flexDirection: isMe ? "row-reverse" : "row"
          }}>
            <span style={{ color: "#9ca3af", fontSize: 12 }}>{agent.name}</span>
            <span style={{ color: "#4b5563", fontSize: 12 }}>·</span>
            <span style={{ color: "#6b7280", fontSize: 12 }}>{formatTime(msg.timestamp)}</span>
          </div>
        )}
        <div style={{
          padding: "10px 16px",
          maxWidth: "65%",
          background: isMe ? "linear-gradient(135deg, #C87941, #E8A462)" : "rgba(255,255,255,0.06)",
          color: "white",
          borderRadius: isMe ? "18px 18px 4px 18px" : showAvatar ? "18px 18px 18px 4px" : "4px 18px 18px 18px",
          fontSize: 14, lineHeight: 1.55, wordBreak: "break-word"
        }}>
          <BubbleText content={msg.content} />
        </div>
      </div>
    </div>
  );
}

/* ── Date Divider ─────────────────────────────────────── */
function DateDivider({ date }: { date: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 16, margin: "20px 0" }}>
      <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.05)" }} />
      <span style={{
        color: "#6b7280", fontSize: 12, padding: "4px 12px", borderRadius: 999,
        background: "rgba(255,255,255,0.04)"
      }}>{date}</span>
      <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.05)" }} />
    </div>
  );
}

/* ── Main Chat ─────────────────────────────────────── */
export default function ChatPage() {
  const [token, setToken] = useState<string | null>(null);
  const [authError, setAuthError] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [since, setSince] = useState(0);
  const [hydrated, setHydrated] = useState(false);
  const [storedToken, setStoredToken] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { setHydrated(true); }, []);
  useEffect(() => {
    if (hydrated && typeof window !== "undefined") {
      setStoredToken(localStorage.getItem("smf-chat-token"));
    }
  }, [hydrated]);
  useEffect(() => {
    if (storedToken) setToken(storedToken);
  }, [storedToken]);

  async function handlePinSubmit(p: string) {
    setAuthError("");
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: p }),
      });
      if (!res.ok) { setAuthError("Incorrect PIN — try again"); return; }
      const data = await res.json();
      if (typeof window !== "undefined") localStorage.setItem("smf-chat-token", data.token);
      setToken(data.token);
    } catch {
      setAuthError("Connection error — try again");
    }
  }

  function handleLogout() {
    if (typeof window !== "undefined") localStorage.removeItem("smf-chat-token");
    setToken(null);
    setMessages([]);
    setSince(0);
  }

  const loadMessages = useCallback(async () => {
    if (!token) return;
    const res = await fetch(`/api/messages?channel=general&since=${since}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return;
    const data = await res.json();
    if (data.messages.length > 0) {
      setMessages((prev) => {
        const ids = new Set(prev.map((m) => m.id));
        const newMsgs = data.messages.filter((m: Message) => !ids.has(m.id));
        if (newMsgs.length > 0) setSince(data.messages[data.messages.length - 1].timestamp);
        return [...prev, ...newMsgs].slice(-500);
      });
    }
  }, [token, since]);

  async function handleSend() {
    if (!input.trim() || !token || sending) return;
    setSending(true);
    const content = input.trim();
    setInput("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
    await fetch("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ content, channel: "general" }),
    });
    setSending(false);
    await loadMessages();
  }

  useEffect(() => {
    if (!token) return;
    loadMessages();
    pollingRef.current = setInterval(loadMessages, 2000);
    return () => { if (pollingRef.current) clearInterval(pollingRef.current); };
  }, [token, loadMessages]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  function autoResize() {
    if (!textareaRef.current) return;
    textareaRef.current.style.height = "auto";
    textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + "px";
  }

  const grouped: { date: string; msgs: Message[] }[] = [];
  let lastDate = "";
  for (const msg of messages) {
    const d = formatDate(msg.timestamp);
    if (d !== lastDate) { grouped.push({ date: d, msgs: [msg] }); lastDate = d; }
    else { grouped[grouped.length - 1].msgs.push(msg); }
  }

  if (!hydrated) return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: "#0e0e10"
    }}>
      <div style={{ width: 32, height: 32, borderRadius: 8, background: "linear-gradient(135deg, #C87941, #E8A462)" }} />
    </div>
  );

  if (!token) return <PinLogin onSubmit={handlePinSubmit} error={authError} />;

  return (
    <div style={{ minHeight: "100vh", display: "flex", background: "#0e0e10" }}>
      <Sidebar msgCount={messages.length} onLogout={handleLogout} />

      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, background: "rgba(14,14,16,0.95)" }}>
        <header style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "16px 24px", flexShrink: 0,
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          background: "rgba(14,14,16,0.8)", backdropFilter: "blur(20px)"
        }}>
          <div>
            <div style={{ color: "white", fontWeight: 600, fontSize: 14 }}>general</div>
            <div style={{ color: "#6b7280", fontSize: 12 }}>{Object.values(AGENTS).length} online · {messages.length} messages</div>
          </div>
          <div style={{
            display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 999,
            background: "rgba(52,199,89,0.1)", border: "1px solid rgba(52,199,89,0.2)"
          }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#34C759", display: "inline-block" }} />
            <span style={{ color: "#34C759", fontSize: 12, fontWeight: 500 }}>Live</span>
          </div>
        </header>

        <div style={{ flex: 1, overflowY: "auto", padding: "8px 24px" }}>
          {messages.length === 0 && (
            <div style={{
              height: "100%", display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center", gap: 12, color: "#4b5563"
            }}>
              <div style={{ width: 48, height: 48, borderRadius: 14, background: "rgba(255,255,255,0.04)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>💬</div>
              <div style={{ textAlign: "center" }}>
                <div style={{ color: "white", fontWeight: 500, fontSize: 14 }}>Start the conversation</div>
                <div style={{ color: "#6b7280", fontSize: 12, marginTop: 4 }}>Send a message to get started</div>
              </div>
            </div>
          )}

          {grouped.map((group) => (
            <div key={group.date}>
              <DateDivider date={group.date} />
              <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                {group.msgs.map((msg, i) => (
                  <MessageBubble key={msg.id} msg={msg} prevMsg={group.msgs[i - 1]} />
                ))}
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        <div style={{
          padding: "16px 24px", flexShrink: 0,
          borderTop: "1px solid rgba(255,255,255,0.06)",
          background: "rgba(14,14,16,0.8)"
        }}>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 12, maxWidth: 800, margin: "0 auto" }}>
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => { setInput(e.target.value); autoResize(); }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
              }}
              placeholder="Write a message…"
              rows={1}
              disabled={sending}
              style={{
                flex: 1, padding: "12px 16px", borderRadius: 16,
                background: "rgba(255,255,255,0.06)",
                border: "1.5px solid rgba(255,255,255,0.1)",
                color: "white", fontSize: 14, resize: "none", outline: "none",
                minHeight: 46, maxHeight: 120,
                fontFamily: "inherit", lineHeight: 1.5,
                transition: "border-color 0.15s"
              }}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || sending}
              style={{
                width: 44, height: 44, borderRadius: 14, border: "none",
                background: input.trim() ? "linear-gradient(135deg, #C87941, #E8A462)" : "rgba(255,255,255,0.06)",
                color: "white", cursor: input.trim() ? "pointer" : "not-allowed",
                opacity: input.trim() ? 1 : 0.4,
                display: "flex", alignItems: "center", justifyContent: "center",
                transition: "all 0.15s", flexShrink: 0
              }}>
              {sending ? (
                <span style={{ fontSize: 10, opacity: 0.6 }}>···</span>
              ) : (
                <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                </svg>
              )}
            </button>
          </div>
          <div style={{ color: "#374151", fontSize: 11, textAlign: "center", marginTop: 8, maxWidth: 800, margin: "8px auto 0" }}>
            Enter to send · Shift+Enter for new line
          </div>
        </div>
      </div>
    </div>
  );
}
// deployed-1774460771
// force-fresh-1774460869

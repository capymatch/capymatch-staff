import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { toast } from "sonner";
import { MessageSquare, Send, ChevronLeft, Loader2 } from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

function formatTime(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  const now = new Date();
  const diff = (now - d) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400 && d.getDate() === now.getDate()) {
    return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  }
  if (diff < 172800) return "Yesterday";
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

/* ── Gmail-style Thread Row ── */
function ThreadRow({ thread, onSelect }) {
  const isUnread = thread.unread_count > 0;
  const sender = thread.last_sender_name || thread.created_by || "Unknown";
  const snippet = thread.last_snippet || "";

  return (
    <div
      onClick={() => onSelect(thread.thread_id)}
      className="group cursor-pointer transition-colors hover:shadow-[inset_0_-1px_0_#e2e8f0,0_1px_3px_rgba(0,0,0,0.04)]"
      style={{
        display: "grid",
        gridTemplateColumns: "180px 1fr auto",
        alignItems: "center",
        gap: 12,
        padding: "10px 16px",
        borderBottom: "1px solid #f1f3f4",
        backgroundColor: isUnread ? "#f2f6fc" : "white",
      }}
      data-testid={`thread-${thread.thread_id}`}
    >
      {/* Sender */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
        {isUnread && <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#0d9488", flexShrink: 0 }} data-testid={`unread-dot-${thread.thread_id}`} />}
        <span
          className="truncate"
          style={{
            fontSize: 13,
            fontWeight: isUnread ? 700 : 400,
            color: isUnread ? "#1a1a1a" : "#5f6368",
          }}
        >
          {sender}
        </span>
      </div>

      {/* Subject + snippet */}
      <div style={{ display: "flex", alignItems: "center", gap: 0, minWidth: 0, overflow: "hidden" }}>
        <span
          className="truncate"
          style={{
            fontSize: 13,
            fontWeight: isUnread ? 700 : 400,
            color: isUnread ? "#1a1a1a" : "#202124",
            flexShrink: 0,
            maxWidth: "50%",
          }}
        >
          {thread.subject}
        </span>
        {snippet && (
          <span
            className="truncate"
            style={{
              fontSize: 13,
              fontWeight: 400,
              color: "#5f6368",
              marginLeft: 6,
              flex: 1,
              minWidth: 0,
            }}
          >
            - {snippet}
          </span>
        )}
      </div>

      {/* Time */}
      <span
        style={{
          fontSize: 12,
          fontWeight: isUnread ? 700 : 400,
          color: isUnread ? "#0d9488" : "#5f6368",
          whiteSpace: "nowrap",
          textAlign: "right",
        }}
      >
        {formatTime(thread.last_message_at)}
      </span>
    </div>
  );
}

/* ── Thread List ── */
function ThreadList({ threads, onSelect }) {
  if (!threads.length) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center" data-testid="messages-empty">
        <MessageSquare className="w-12 h-12 mb-3" style={{ color: "#dadce0" }} />
        <p className="text-sm font-medium" style={{ color: "#5f6368" }}>No messages yet</p>
        <p className="text-xs mt-1" style={{ color: "#80868b" }}>
          Your coach will reach out when they have updates.
        </p>
      </div>
    );
  }

  const unread = threads.filter(t => t.unread_count > 0);
  const read = threads.filter(t => !t.unread_count);

  return (
    <div>
      {unread.length > 0 && (
        <>
          <div style={{ padding: "8px 16px", fontSize: 12, fontWeight: 600, color: "#5f6368", borderBottom: "1px solid #e8eaed" }}>
            Unread
          </div>
          {unread.map(t => <ThreadRow key={t.thread_id} thread={t} onSelect={onSelect} />)}
        </>
      )}
      {read.length > 0 && unread.length > 0 && (
        <div style={{ padding: "8px 16px", fontSize: 12, fontWeight: 600, color: "#5f6368", borderBottom: "1px solid #e8eaed" }}>
          Earlier
        </div>
      )}
      {read.map(t => <ThreadRow key={t.thread_id} thread={t} onSelect={onSelect} />)}
    </div>
  );
}

/* ── Thread Detail / Conversation View ── */
function ThreadDetail({ threadId, onBack }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);

  const fetchThread = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/support-messages/thread/${threadId}`);
      setData(res.data);
    } catch {
      toast.error("Failed to load conversation");
    } finally {
      setLoading(false);
    }
  }, [threadId]);

  useEffect(() => { fetchThread(); }, [fetchThread]);

  const sendReply = async () => {
    if (!reply.trim()) return;
    setSending(true);
    try {
      await axios.post(`${API}/support-messages/${threadId}/reply`, { body: reply.trim() });
      setReply("");
      fetchThread();
    } catch {
      toast.error("Failed to send reply");
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendReply(); }
  };

  if (loading) {
    return <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin" style={{ color: "#80868b" }} /></div>;
  }

  const thread = data?.thread;
  const messages = data?.messages || [];

  return (
    <div className="flex flex-col" style={{ minHeight: "calc(100vh - 140px)" }} data-testid="thread-detail">
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 4px", borderBottom: "1px solid #e8eaed" }}>
        <button onClick={onBack} style={{ padding: 6, borderRadius: 20, border: "none", background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }} data-testid="thread-back">
          <ChevronLeft style={{ width: 20, height: 20, color: "#5f6368" }} />
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h2 style={{ fontSize: 18, fontWeight: 400, color: "#202124", margin: 0, lineHeight: 1.3 }}>
            {thread?.subject}
          </h2>
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, padding: "16px 0", display: "flex", flexDirection: "column", gap: 12 }}>
        {messages.map(m => {
          const isCoach = m.sender_role === "club_coach" || m.sender_role === "director";
          return (
            <div key={m.id} style={{ border: "1px solid #e8eaed", borderRadius: 8, overflow: "hidden" }} data-testid={`message-${m.id}`}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 16px", backgroundColor: "#fafafa" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: "50%",
                    background: isCoach ? "#0d9488" : "#7c3aed",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: "white", fontSize: 13, fontWeight: 600,
                  }}>
                    {(m.sender_name || "?")[0].toUpperCase()}
                  </div>
                  <div>
                    <span style={{ fontSize: 13, fontWeight: 600, color: "#202124" }}>{m.sender_name}</span>
                  </div>
                </div>
                <span style={{ fontSize: 11, color: "#80868b" }}>{formatTime(m.created_at)}</span>
              </div>
              <div style={{ padding: "14px 16px 14px 56px" }}>
                <p style={{ fontSize: 14, color: "#202124", lineHeight: 1.6, whiteSpace: "pre-wrap", margin: 0 }}>{m.body}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Reply box */}
      <div style={{ border: "1px solid #e8eaed", borderRadius: 8, padding: 12, marginTop: 8 }}>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 8 }}>
          <textarea
            value={reply}
            onChange={e => setReply(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Reply..."
            rows={2}
            style={{
              flex: 1, padding: "8px 12px", borderRadius: 8, border: "1px solid #e8eaed",
              fontSize: 14, resize: "none", outline: "none", fontFamily: "inherit",
              minHeight: 44, maxHeight: 120,
            }}
            data-testid="thread-reply-input"
          />
          <button
            onClick={sendReply}
            disabled={!reply.trim() || sending}
            style={{
              padding: "8px 20px", borderRadius: 18, border: "none",
              background: "#0d9488", color: "white", fontSize: 13, fontWeight: 600,
              cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
              opacity: !reply.trim() || sending ? 0.4 : 1,
            }}
            data-testid="thread-reply-send"
          >
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send style={{ width: 14, height: 14 }} />}
            Send
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Main Messages Page ── */
export default function MessagesPage() {
  const [threads, setThreads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedThread, setSelectedThread] = useState(null);

  const fetchInbox = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/support-messages/inbox`);
      setThreads(res.data.threads || []);
    } catch {
      toast.error("Failed to load messages");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchInbox(); }, [fetchInbox]);

  const handleSelectThread = useCallback((threadId) => {
    setSelectedThread(threadId);
    setThreads(prev => prev.map(t =>
      t.thread_id === threadId ? { ...t, unread_count: 0 } : t
    ));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: "#80868b" }} />
      </div>
    );
  }

  if (selectedThread) {
    return (
      <div data-testid="messages-page">
        <ThreadDetail
          key={selectedThread}
          threadId={selectedThread}
          onBack={() => { setSelectedThread(null); fetchInbox(); }}
        />
      </div>
    );
  }

  return (
    <div data-testid="messages-page">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 2 }}>
        <h1 style={{ fontSize: 22, fontWeight: 400, color: "#202124", margin: 0 }}>Inbox</h1>
        <span style={{ fontSize: 12, color: "#80868b" }}>{threads.length} message{threads.length !== 1 ? "s" : ""}</span>
      </div>
      <div style={{ borderRadius: 8, border: "1px solid #e8eaed", overflow: "hidden", backgroundColor: "white" }}>
        <ThreadList threads={threads} onSelect={handleSelectThread} />
      </div>
    </div>
  );
}

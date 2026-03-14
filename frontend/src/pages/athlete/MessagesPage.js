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

/* ── Thread List ── */
function ThreadList({ threads, selectedId, onSelect }) {
  if (!threads.length) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center" data-testid="messages-empty">
        <MessageSquare className="w-10 h-10 mb-3" style={{ color: "var(--cm-text-4, #cbd5e1)" }} />
        <p className="text-sm font-medium" style={{ color: "var(--cm-text-2, #64748b)" }}>No messages yet</p>
        <p className="text-xs mt-1" style={{ color: "var(--cm-text-3, #94a3b8)" }}>
          Your coach will reach out when they have updates.
        </p>
      </div>
    );
  }

  return (
    <div className="divide-y" style={{ borderColor: "var(--cm-border, #e2e8f0)" }}>
      {threads.map(t => {
        const isUnread = t.unread_count > 0 && selectedId !== t.thread_id;
        return (
          <button
            key={t.thread_id}
            onClick={() => onSelect(t.thread_id)}
            className={`w-full text-left px-4 py-3 transition-colors hover:bg-slate-50/70 ${
              selectedId === t.thread_id ? "bg-teal-50/50" : ""
            }`}
            data-testid={`thread-${t.thread_id}`}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                {isUnread && (
                  <span className="w-2 h-2 rounded-full bg-teal-500 shrink-0" data-testid={`unread-dot-${t.thread_id}`} />
                )}
                <span className={`text-sm truncate ${isUnread ? "font-semibold" : "font-medium"}`}
                  style={{ color: "var(--cm-text, #1e293b)" }}>
                  {t.subject}
                </span>
              </div>
              <span className="text-[10px] shrink-0" style={{ color: "var(--cm-text-3, #94a3b8)" }}>
                {formatTime(t.last_message_at)}
              </span>
            </div>
          </button>
        );
      })}
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
    return <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin" style={{ color: "var(--cm-text-3)" }} /></div>;
  }

  const thread = data?.thread;
  const messages = data?.messages || [];

  return (
    <div className="flex flex-col h-full" data-testid="thread-detail">
      {/* Header */}
      <div className="px-4 py-3 border-b flex items-center gap-3 shrink-0" style={{ borderColor: "var(--cm-border, #e2e8f0)" }}>
        <button onClick={onBack} className="p-1 rounded-lg hover:bg-slate-100 transition-colors sm:hidden" data-testid="thread-back">
          <ChevronLeft className="w-5 h-5" style={{ color: "var(--cm-text-2)" }} />
        </button>
        <div className="min-w-0">
          <h2 className="text-sm font-bold truncate" style={{ color: "var(--cm-text, #1e293b)" }}>
            {thread?.subject}
          </h2>
          <p className="text-[11px]" style={{ color: "var(--cm-text-3, #94a3b8)" }}>
            {messages.length} message{messages.length !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.map(m => {
          const isCoach = m.sender_role === "club_coach" || m.sender_role === "director";
          return (
            <div key={m.id} className={`flex ${isCoach ? "justify-start" : "justify-end"}`} data-testid={`message-${m.id}`}>
              <div className={`max-w-[80%] rounded-xl px-4 py-3 ${isCoach ? "rounded-tl-sm" : "rounded-tr-sm"}`}
                style={{
                  backgroundColor: isCoach ? "var(--cm-surface-2, #f1f5f9)" : "rgba(13,148,136,0.08)",
                  border: isCoach ? "1px solid var(--cm-border, #e2e8f0)" : "1px solid rgba(13,148,136,0.15)",
                }}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[11px] font-semibold" style={{ color: isCoach ? "var(--cm-text-2, #475569)" : "#0d9488" }}>
                    {m.sender_name}
                  </span>
                  <span className="text-[10px]" style={{ color: "var(--cm-text-3, #94a3b8)" }}>
                    {formatTime(m.created_at)}
                  </span>
                </div>
                <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: "var(--cm-text, #1e293b)" }}>
                  {m.body}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Reply box */}
      <div className="px-4 py-3 border-t shrink-0" style={{ borderColor: "var(--cm-border, #e2e8f0)" }}>
        <div className="flex items-end gap-2">
          <textarea
            value={reply}
            onChange={e => setReply(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a reply..."
            rows={1}
            className="flex-1 px-3 py-2 rounded-lg border text-sm resize-none outline-none focus:ring-1 focus:ring-teal-500 transition-colors"
            style={{ borderColor: "var(--cm-border, #e2e8f0)", minHeight: "40px", maxHeight: "120px" }}
            data-testid="thread-reply-input"
          />
          <button
            onClick={sendReply}
            disabled={!reply.trim() || sending}
            className="p-2.5 rounded-lg text-white transition-all disabled:opacity-40"
            style={{ backgroundColor: "#0d9488" }}
            data-testid="thread-reply-send"
          >
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
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
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: "var(--cm-text-3)" }} />
      </div>
    );
  }

  return (
    <div data-testid="messages-page" className="-mx-4 -mt-4 sm:-mx-6 sm:-mt-6 flex" style={{ height: "calc(100vh - 64px)" }}>
      {/* Thread list — hidden on mobile when a thread is selected */}
      <div className={`${selectedThread ? "hidden sm:flex" : "flex"} flex-col w-full sm:w-80 lg:w-96 border-r shrink-0 bg-white`}
        style={{ borderColor: "var(--cm-border, #e2e8f0)" }}>
        <div className="px-4 py-3 border-b" style={{ borderColor: "var(--cm-border, #e2e8f0)" }}>
          <h1 className="text-base font-bold" style={{ color: "var(--cm-text, #1e293b)" }}>Messages</h1>
          <p className="text-[11px] mt-0.5" style={{ color: "var(--cm-text-3, #94a3b8)" }}>Support messages from your coaching team</p>
        </div>
        <div className="flex-1 overflow-y-auto">
          <ThreadList threads={threads} selectedId={selectedThread} onSelect={handleSelectThread} />
        </div>
      </div>

      {/* Thread detail */}
      <div className={`${selectedThread ? "flex" : "hidden sm:flex"} flex-col flex-1 bg-white`}>
        {selectedThread ? (
          <ThreadDetail
            key={selectedThread}
            threadId={selectedThread}
            onBack={() => { setSelectedThread(null); fetchInbox(); }}
          />
        ) : (
          <div className="flex flex-col items-center justify-center flex-1 text-center px-4">
            <MessageSquare className="w-12 h-12 mb-3" style={{ color: "var(--cm-text-4, #cbd5e1)" }} />
            <p className="text-sm font-medium" style={{ color: "var(--cm-text-2, #64748b)" }}>Select a conversation</p>
            <p className="text-xs mt-1" style={{ color: "var(--cm-text-3, #94a3b8)" }}>Choose a thread from the left to read and reply.</p>
          </div>
        )}
      </div>
    </div>
  );
}

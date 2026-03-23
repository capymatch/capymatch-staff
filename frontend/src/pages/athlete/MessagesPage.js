import { useState, useEffect, useCallback, useRef } from "react";
import axios from "axios";
import { toast } from "sonner";
import { MessageSquare, Send, ChevronLeft, Loader2, Paperclip, X, FileText, Image as ImageIcon } from "lucide-react";

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

/* ── Attachment display ── */
function AttachmentBubble({ att }) {
  const isImage = att.content_type?.startsWith("image/");
  const token = localStorage.getItem("capymatch_token");

  const handleDownload = async () => {
    try {
      const res = await axios.get(`${API}/files/${att.file_id}/download`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: "blob",
      });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement("a");
      a.href = url;
      a.download = att.filename || "file";
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Failed to download file");
    }
  };

  return (
    <button
      onClick={handleDownload}
      className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors hover:bg-slate-50"
      style={{ borderColor: "#e2e8f0", background: "#fafafa", cursor: "pointer" }}
      data-testid={`attachment-${att.file_id}`}
    >
      {isImage ? <ImageIcon style={{ width: 14, height: 14, color: "#0d9488" }} /> : <FileText style={{ width: 14, height: 14, color: "#6366f1" }} />}
      <span style={{ fontSize: 12, color: "#334155", fontWeight: 500, maxWidth: 160 }} className="truncate">{att.filename}</span>
      <span style={{ fontSize: 10, color: "#94a3b8" }}>{formatFileSize(att.size)}</span>
    </button>
  );
}

function formatFileSize(bytes) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/* ── Thread Detail / Conversation View ── */
function ThreadDetail({ threadId, onBack }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [attachments, setAttachments] = useState([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

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

  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const token = localStorage.getItem("capymatch_token");
    setUploading(true);
    for (const file of files) {
      if (file.size > 10 * 1024 * 1024) { toast.error(`${file.name} is too large (max 10 MB)`); continue; }
      try {
        const form = new FormData();
        form.append("file", file);
        const res = await axios.post(`${API}/files/upload`, form, {
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "multipart/form-data" },
        });
        setAttachments(prev => [...prev, res.data]);
      } catch {
        toast.error(`Failed to upload ${file.name}`);
      }
    }
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeAttachment = (fileId) => {
    setAttachments(prev => prev.filter(a => a.file_id !== fileId));
  };

  const sendReply = async () => {
    if (!reply.trim() && attachments.length === 0) return;
    setSending(true);
    try {
      await axios.post(`${API}/support-messages/${threadId}/reply`, {
        body: reply.trim(),
        attachments: attachments.map(a => ({
          file_id: a.file_id,
          filename: a.filename,
          content_type: a.content_type,
          size: a.size,
        })),
      });
      setReply("");
      setAttachments([]);
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
          const msgAttachments = m.attachments || [];
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
                {msgAttachments.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
                    {msgAttachments.map(att => <AttachmentBubble key={att.file_id} att={att} />)}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Reply box with upload */}
      <div style={{ border: "1px solid #e8eaed", borderRadius: 8, padding: 12, marginTop: 8 }}>
        {/* Attachment previews */}
        {attachments.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }} data-testid="reply-attachments">
            {attachments.map(att => (
              <div key={att.file_id} className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md" style={{ background: "#f1f5f9", border: "1px solid #e2e8f0" }}>
                <Paperclip style={{ width: 12, height: 12, color: "#64748b" }} />
                <span style={{ fontSize: 11, color: "#334155", fontWeight: 500, maxWidth: 120 }} className="truncate">{att.filename}</span>
                <button onClick={() => removeAttachment(att.file_id)} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex" }} data-testid={`remove-attachment-${att.file_id}`}>
                  <X style={{ width: 12, height: 12, color: "#94a3b8" }} />
                </button>
              </div>
            ))}
          </div>
        )}

        <div style={{ display: "flex", alignItems: "flex-end", gap: 8 }}>
          {/* Upload button */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv"
            onChange={handleFileSelect}
            style={{ display: "none" }}
            data-testid="file-input"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            style={{
              padding: 8, borderRadius: 8, border: "1px solid #e8eaed",
              background: "transparent", cursor: "pointer", display: "flex",
              alignItems: "center", justifyContent: "center",
              opacity: uploading ? 0.5 : 1, flexShrink: 0,
            }}
            title="Attach file"
            data-testid="attach-file-btn"
          >
            {uploading ? <Loader2 style={{ width: 16, height: 16, color: "#80868b" }} className="animate-spin" /> : <Paperclip style={{ width: 16, height: 16, color: "#80868b" }} />}
          </button>

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
            disabled={(!reply.trim() && attachments.length === 0) || sending}
            style={{
              padding: "8px 20px", borderRadius: 18, border: "none",
              background: "#0d9488", color: "white", fontSize: 13, fontWeight: 600,
              cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
              opacity: (!reply.trim() && attachments.length === 0) || sending ? 0.4 : 1,
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

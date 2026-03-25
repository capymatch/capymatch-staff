import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import {
  Mail, Send, Search, RefreshCw, ChevronLeft, Reply, ReplyAll,
  X, AlertCircle, Loader2, Sparkles, ExternalLink, Inbox as InboxIcon
} from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

/* ── Compose / Reply Modal ── */
function ComposeModal({ open, onClose, replyTo, threadId, messageId, onSent }) {
  const [to, setTo] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [drafting, setDrafting] = useState(false);
  const [draftProgramId, setDraftProgramId] = useState("");
  const [programs, setPrograms] = useState([]);
  const token = localStorage.getItem("token");
  const headers = useMemo(() => token ? { Authorization: `Bearer ${token}` } : {}, [token]);

  useEffect(() => {
    if (open) {
      if (replyTo) {
        setTo(replyTo.from || "");
        const s = replyTo.subject || "";
        setSubject(s.startsWith("Re:") ? s : `Re: ${s}`);
        setBody("");
      } else {
        setTo(""); setSubject(""); setBody("");
      }
      axios.get(`${API}/athlete/programs`, { headers }).then(r => setPrograms(r.data || [])).catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, replyTo]);

  const handleSend = async () => {
    if (!to || !body) return;
    setSending(true);
    try {
      if (replyTo && threadId && messageId) {
        await axios.post(`${API}/athlete/gmail/reply`, { message_id: messageId, thread_id: threadId, body, reply_all: false }, { headers });
      } else {
        await axios.post(`${API}/athlete/gmail/send`, { to, subject, body }, { headers });
      }
      toast.success("Email sent!");
      onSent?.();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to send");
    } finally { setSending(false); }
  };

  const handleAIDraft = async () => {
    if (!draftProgramId) { toast.error("Select a school first"); return; }
    setDrafting(true);
    try {
      const res = await axios.post(`${API}/ai/draft-email`, { program_id: draftProgramId, email_type: "intro" }, { headers });
      setSubject(res.data.subject || subject);
      setBody(res.data.body || "");
      if (res.data.coach_email) setTo(res.data.coach_email);
      toast.success("AI draft generated!");
    } catch (err) {
      const detail = err.response?.data?.detail;
      if (detail?.type === "subscription_limit") {
        toast.error(detail.message || "AI draft limit reached. Upgrade your plan.");
      } else {
        toast.error(typeof detail === "string" ? detail : "Failed to generate draft");
      }
    } finally { setDrafting(false); }
  };

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" data-testid="compose-modal">
      <div className="w-full max-w-2xl mx-4 rounded-lg border shadow-2xl" style={{ backgroundColor: "var(--cm-surface)", borderColor: "var(--cm-border)" }}>
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/10">
          <h3 className="text-[14px] font-bold text-[var(--cm-text)]">{replyTo ? "Reply" : "New Email"}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg" style={{ color: "var(--cm-text-3)" }}><X className="w-4 h-4" /></button>
        </div>
        <div className="p-5 space-y-3">
          {!replyTo && (
            <div className="flex items-center gap-2 rounded-xl border px-3 py-2" style={{ borderColor: "var(--cm-border)", backgroundColor: "var(--cm-input-bg)" }}>
              <span className="text-[11px] font-semibold text-[var(--cm-text)]/30 w-8">To:</span>
              <input value={to} onChange={e => setTo(e.target.value)} placeholder="coach@university.edu"
                className="flex-1 bg-transparent text-[13px] text-[var(--cm-text)] outline-none placeholder:text-[var(--cm-text)]/20" data-testid="compose-to" />
            </div>
          )}
          <div className="flex items-center gap-2 rounded-xl border px-3 py-2" style={{ borderColor: "var(--cm-border)", backgroundColor: "var(--cm-input-bg)" }}>
            <span className="text-[11px] font-semibold text-[var(--cm-text)]/30 w-14">Subject:</span>
            <input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Email subject"
              className="flex-1 bg-transparent text-[13px] text-[var(--cm-text)] outline-none placeholder:text-[var(--cm-text)]/20" data-testid="compose-subject" />
          </div>

          {/* AI Draft Section */}
          {!replyTo && (
            <div className="flex items-center gap-2 p-3 rounded-xl border border-[#1a8a80]/20 bg-[#1a8a80]/5">
              <Sparkles className="w-4 h-4 text-[#1a8a80] flex-shrink-0" />
              <select value={draftProgramId} onChange={e => setDraftProgramId(e.target.value)}
                className="flex-1 bg-transparent text-[12px] text-[var(--cm-text)]/60 outline-none border-none" data-testid="draft-program-select">
                <option value="">Select school for AI draft...</option>
                {programs.map(p => <option key={p.program_id} value={p.program_id}>{p.university_name}</option>)}
              </select>
              <button onClick={handleAIDraft} disabled={drafting || !draftProgramId}
                className="px-3 py-1.5 rounded-lg text-[11px] font-bold bg-[#1a8a80] text-[var(--cm-text)] disabled:opacity-40 inline-flex items-center gap-1"
                data-testid="ai-draft-btn">
                {drafting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                {drafting ? "Drafting..." : "AI Draft"}
              </button>
            </div>
          )}

          <textarea value={body} onChange={e => setBody(e.target.value)} placeholder="Write your message..." rows={10}
            className="w-full rounded-xl p-3 text-[13px] text-[var(--cm-text)] outline-none resize-none placeholder:text-[var(--cm-text)]/20 border"
            style={{ backgroundColor: "var(--cm-input-bg)", borderColor: "var(--cm-border)" }}
            data-testid="compose-body" />
        </div>
        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-white/10">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-[12px] font-semibold text-[var(--cm-text)]/40 border border-white/10">Cancel</button>
          <button onClick={handleSend} disabled={sending || !to || !body}
            className="px-5 py-2 rounded-lg text-[12px] font-bold text-[var(--cm-text)] bg-[#1a8a80] disabled:opacity-40 inline-flex items-center gap-1.5"
            data-testid="compose-send-btn">
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            {sending ? "Sending..." : "Send"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Thread View ── */
function ThreadView({ thread, onBack, onReply }) {
  if (!thread) return null;
  return (
    <div className="flex flex-col h-full" data-testid="thread-view">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10">
        <button onClick={onBack} className="p-1.5 rounded-lg" style={{ color: "var(--cm-text-3)" }} data-testid="thread-back-btn">
          <ChevronLeft className="w-4 h-4 text-[var(--cm-text)]/40" />
        </button>
        <div className="flex-1 min-w-0">
          <h3 className="text-[14px] font-bold text-[var(--cm-text)] truncate">{thread.subject}</h3>
          <p className="text-[11px] text-[var(--cm-text)]/30">{thread.messages?.length || 0} messages in thread</p>
        </div>
        <button onClick={() => onReply(thread.messages?.[thread.messages.length - 1])}
          className="px-3 py-1.5 rounded-lg text-[11px] font-bold bg-[#1a8a80] text-[var(--cm-text)] inline-flex items-center gap-1" data-testid="thread-reply-btn">
          <Reply className="w-3.5 h-3.5" /> Reply
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {(thread.messages || []).map((msg, i) => (
          <div key={msg.id} className="rounded-xl border p-4" style={{ borderColor: "var(--cm-border)", backgroundColor: "var(--cm-surface)" }} data-testid={`thread-msg-${i}`}>
            <div className="flex items-center justify-between mb-2">
              <div className="text-[12px] font-semibold text-[var(--cm-text)]">{msg.from}</div>
              <div className="text-[10px] text-[var(--cm-text)]/25">{msg.date}</div>
            </div>
            {msg.body_html ? (
              <div className="text-[13px] text-[var(--cm-text)]/70 leading-relaxed prose prose-invert prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: msg.body_html }} />
            ) : (
              <p className="text-[13px] text-[var(--cm-text)]/70 leading-relaxed whitespace-pre-wrap">{msg.body_text || msg.snippet || ""}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function InboxPage() {
  const navigate = useNavigate();
  const [emails, setEmails] = useState([]);
  const [loading, setLoading] = useState(true);
  const [gmailConnected, setGmailConnected] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [nextPageToken, setNextPageToken] = useState(null);
  const [selectedThread, setSelectedThread] = useState(null);
  const [loadingThread, setLoadingThread] = useState(false);
  const [showCompose, setShowCompose] = useState(false);
  const [replyContext, setReplyContext] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [threadInsights, setThreadInsights] = useState({});

  const token2 = localStorage.getItem("token");
  const headers = useMemo(() => token2 ? { Authorization: `Bearer ${token2}` } : {}, [token2]);

  const checkGmail = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/athlete/gmail/status`, { headers });
      setGmailConnected(res.data.connected);
      return res.data.connected;
    } catch { setGmailConnected(false); return false; }
  }, [headers]);

  const fetchEmails = useCallback(async (q = "", pageToken = null) => {
    setLoading(true);
    try {
      const params = { max_results: 20 };
      if (q) params.q = q;
      if (pageToken) params.page_token = pageToken;
      const res = await axios.get(`${API}/athlete/gmail/emails`, { headers, params });
      setEmails(res.data.emails || []);
      setNextPageToken(res.data.next_page_token || null);
    } catch (err) {
      if (err.response?.status === 403) {
        setGmailConnected(false);
        toast.error("Gmail disconnected. Please reconnect.");
      }
    } finally { setLoading(false); }
  }, [headers]);

  useEffect(() => {
    checkGmail().then(connected => { if (connected) fetchEmails(); else setLoading(false); });
  }, [checkGmail, fetchEmails]);

  // Fetch gmail intelligence insights indexed by thread_id
  useEffect(() => {
    axios.get(`${API}/athlete/gmail/intelligence/insights`, { headers })
      .then(res => {
        const byThread = {};
        (res.data?.insights || []).forEach(i => {
          if (i.thread_id && !byThread[i.thread_id]) byThread[i.thread_id] = i;
        });
        setThreadInsights(byThread);
      })
      .catch(() => {});
  }, [emails.length, headers]);

  const openThread = async (threadId) => {
    setLoadingThread(true);
    try {
      const res = await axios.get(`${API}/athlete/gmail/threads/${threadId}`, { headers });
      setSelectedThread(res.data);
    } catch { toast.error("Failed to load thread"); }
    finally { setLoadingThread(false); }
  };

  const handleReply = (msg) => {
    setReplyContext(msg);
    setShowCompose(true);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchEmails(searchQuery);
    setRefreshing(false);
  };

  const handleSearch = () => fetchEmails(searchQuery);

  const connectGmail = async () => {
    try {
      const res = await axios.get(`${API}/athlete/gmail/connect?return_to=/inbox`, { headers });
      if (res.data?.auth_url) window.location.href = res.data.auth_url;
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to start Gmail connection");
    }
  };

  // Not connected state
  if (gmailConnected === false) {
    return (
      <div className="max-w-xl mx-auto text-center py-20" data-testid="inbox-not-connected">
        <div className="w-16 h-16 rounded-lg bg-[#1a8a80]/10 flex items-center justify-center mx-auto mb-5">
          <Mail className="w-8 h-8 text-[#1a8a80]" />
        </div>
        <h2 className="text-xl font-bold text-[var(--cm-text)] mb-2">Connect Your Gmail</h2>
        <p className="text-[14px] text-[var(--cm-text)]/40 mb-6 leading-relaxed">
          Connect your Gmail to see recruiting emails, reply to coaches, and use AI to draft messages.
        </p>
        <button onClick={connectGmail}
          className="px-6 py-3 rounded-xl text-[14px] font-bold text-[var(--cm-text)] inline-flex items-center gap-2"
          style={{ background: "linear-gradient(135deg, #1a8a80, #25a99e)" }}
          data-testid="connect-gmail-btn">
          <Mail className="w-5 h-5" /> Connect Gmail
        </button>
      </div>
    );
  }

  if (gmailConnected === null || (loading && emails.length === 0)) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 text-[#1a8a80] animate-spin" />
      </div>
    );
  }

  // Thread view
  if (selectedThread) {
    return (
      <div className="max-w-4xl mx-auto h-[calc(100vh-120px)]">
        <ThreadView thread={selectedThread} onBack={() => setSelectedThread(null)}
          onReply={(msg) => { setReplyContext(msg); setShowCompose(true); }} />
        <ComposeModal
          open={showCompose} onClose={() => { setShowCompose(false); setReplyContext(null); }}
          replyTo={replyContext} threadId={selectedThread?.thread_id} messageId={replyContext?.id}
          onSent={() => { openThread(selectedThread.thread_id); }} />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto" data-testid="inbox-page">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-lg font-bold text-[var(--cm-text)]" data-testid="inbox-title">Inbox</h1>
          <p className="text-[12px] text-[var(--cm-text)]/30">Recruiting emails from .edu addresses & coaches</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleRefresh} disabled={refreshing}
            className="px-3 py-2 rounded-xl text-[12px] font-semibold text-[var(--cm-text)]/50 bg-[var(--cm-surface)] border border-[var(--cm-border)] inline-flex items-center gap-1.5"
            data-testid="inbox-refresh-btn">
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} /> Refresh
          </button>
          <button onClick={() => { setReplyContext(null); setShowCompose(true); }}
            className="px-4 py-2 rounded-xl text-[12px] font-bold text-[var(--cm-text)] inline-flex items-center gap-1.5"
            style={{ background: "linear-gradient(135deg, #1a8a80, #25a99e)" }}
            data-testid="compose-new-btn">
            <Send className="w-3.5 h-3.5" /> Compose
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="flex gap-2 mb-5">
        <div className="flex-1 flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-[var(--cm-surface)] border border-[var(--cm-border)]">
          <Search className="w-4 h-4 text-[var(--cm-text)]/30" />
          <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleSearch()}
            placeholder="Search emails..." className="flex-1 bg-transparent text-[13px] text-[var(--cm-text)] outline-none placeholder:text-[var(--cm-text)]/25"
            data-testid="inbox-search" />
        </div>
      </div>

      {/* Email List */}
      {emails.length === 0 ? (
        <div className="text-center py-16" data-testid="inbox-empty">
          <InboxIcon className="w-10 h-10 mx-auto mb-3 text-[var(--cm-text)]/15" />
          <p className="text-sm text-[var(--cm-text)]/30">No recruiting emails found</p>
          <p className="text-[12px] text-[var(--cm-text)]/20 mt-1">Try sending an email to a coach first</p>
        </div>
      ) : (
        <div className="space-y-1" data-testid="email-list">
          {emails.map(em => (
            <div key={em.id} onClick={() => openThread(em.thread_id)}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer transition-all ${em.is_unread ? "border" : "border border-transparent"}`}
              style={{
                backgroundColor: em.is_unread ? "rgba(26,138,128,0.05)" : "transparent",
                borderColor: em.is_unread ? "rgba(26,138,128,0.1)" : "transparent"
              }}
              onMouseEnter={e => e.currentTarget.style.backgroundColor = em.is_unread ? "rgba(26,138,128,0.05)" : "var(--cm-surface-hover)"}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = em.is_unread ? "rgba(26,138,128,0.05)" : "transparent"}
              data-testid={`email-item-${em.id}`}>
              <div className="flex-shrink-0">
                {em.is_known_coach ? (
                  <div className="w-9 h-9 rounded-full bg-[#1a8a80]/15 flex items-center justify-center">
                    <Mail className="w-4 h-4 text-[#1a8a80]" />
                  </div>
                ) : (
                  <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ backgroundColor: "var(--cm-surface-2)" }}>
                    <Mail className="w-4 h-4 text-[var(--cm-text)]/30" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className={`text-[12px] font-semibold truncate ${em.is_unread ? "text-[var(--cm-text)]" : "text-[var(--cm-text)]/70"}`}>
                    {em.from?.split("<")[0]?.trim() || em.from}
                  </span>
                  {em.is_known_coach && (
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#1a8a80]/15 text-[#1a8a80]">Coach</span>
                  )}
                  {threadInsights[em.thread_id] && (() => {
                    const ti = threadInsights[em.thread_id];
                    const SIGNAL_COLORS = {
                      "Coach Interest": "#10b981", "Info Requested": "#f59e0b", "Camp Invite": "#06b6d4",
                      "Visit Invite": "#8b5cf6", "Scholarship Talk": "#d97706", "Offer": "#dc2626",
                      "Reply Needed": "#ef4444", "Going Cold": "#6b7280", "Not a Fit": "#9ca3af", "Info Only": "#a1a1aa",
                    };
                    const c = SIGNAL_COLORS[ti.signal_label] || "#6b7280";
                    return (
                      <span data-testid={`inbox-signal-${em.thread_id}`} className="px-1.5 py-0.5 rounded text-[9px] font-bold" style={{ backgroundColor: `${c}18`, color: c }}>
                        {ti.signal_label}
                      </span>
                    );
                  })()}
                </div>
                <div className={`text-[12px] truncate ${em.is_unread ? "font-semibold text-[var(--cm-text)]/80" : "text-[var(--cm-text)]/50"}`}>
                  {em.subject}
                </div>
                <div className="text-[11px] text-[var(--cm-text)]/25 truncate mt-0.5">{em.snippet}</div>
              </div>
              <div className="flex-shrink-0 text-right">
                <div className="text-[10px] text-[var(--cm-text)]/25">{em.date?.split(",")?.pop()?.trim()?.split(" ").slice(0, 3).join(" ")}</div>
                {em.is_unread && <div className="w-2 h-2 rounded-full bg-[#1a8a80] mt-1 ml-auto" />}
              </div>
            </div>
          ))}
        </div>
      )}

      {loadingThread && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-40">
          <Loader2 className="w-6 h-6 text-[#1a8a80] animate-spin" />
        </div>
      )}

      <ComposeModal
        open={showCompose && !selectedThread} onClose={() => { setShowCompose(false); setReplyContext(null); }}
        replyTo={replyContext} threadId={null} messageId={null}
        onSent={() => fetchEmails(searchQuery)} />
    </div>
  );
}

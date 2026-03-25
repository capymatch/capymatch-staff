import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { X, Send, Sparkles, MessageCircle, Plus, ChevronLeft, Loader2 } from "lucide-react";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

function formatTime(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

export default function AIAssistantDrawer({ isOpen, onClose }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [showSessions, setShowSessions] = useState(false);
  const messagesEnd = useRef(null);
  const inputRef = useRef(null);
  const token = localStorage.getItem("token");
  const headers = useMemo(() => token ? { Authorization: `Bearer ${token}` } : {}, [token]);

  const scrollToBottom = () => messagesEnd.current?.scrollIntoView({ behavior: "smooth" });
  useEffect(() => { scrollToBottom(); }, [messages]);

  useEffect(() => {
    if (isOpen && !sessionId) {
      setSessionId(`asst_${Date.now().toString(36)}`);
      setMessages([]);
    }
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 300);
  }, [isOpen, sessionId]);

  const loadSessions = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/ai/assistant/sessions`, { headers });
      setSessions(res.data.sessions || []);
    } catch {}
  }, [headers]);

  useEffect(() => { if (isOpen) loadSessions(); }, [isOpen, loadSessions]);

  const loadSession = async (sid) => {
    try {
      const res = await axios.get(`${API}/ai/assistant/history?session_id=${sid}`, { headers });
      setMessages((res.data.messages || []).map(m => ({ role: m.role, content: m.content, time: m.created_at })));
      setSessionId(sid);
      setShowSessions(false);
    } catch {}
  };

  const startNewChat = () => {
    setSessionId(`asst_${Date.now().toString(36)}`);
    setMessages([]);
    setShowSessions(false);
  };

  const sendMessage = async () => {
    if (!input.trim() || sending) return;
    const text = input.trim();
    setInput("");
    setMessages(prev => [...prev, { role: "user", content: text, time: new Date().toISOString() }]);
    setSending(true);
    try {
      const res = await axios.post(`${API}/ai/assistant`, { message: text, session_id: sessionId }, { headers });
      setMessages(prev => [...prev, { role: "assistant", content: res.data.response, time: new Date().toISOString() }]);
      if (res.data.session_id) setSessionId(res.data.session_id);
    } catch {
      setMessages(prev => [...prev, { role: "assistant", content: "Sorry, I had trouble responding. Please try again.", time: new Date().toISOString() }]);
    } finally { setSending(false); }
  };

  const handleKeyDown = (e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } };

  if (!isOpen) return null;

  const suggestions = [
    "How should I approach D1 coaches?",
    "When should I send my first email?",
    "What makes a good recruiting email?",
    "How do I stand out from other recruits?",
  ];

  return (
    <div className="fixed inset-0 z-[90] flex justify-end" data-testid="ai-assistant-drawer">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md h-full flex flex-col border-l animate-in slide-in-from-right duration-300" style={{ backgroundColor: "var(--cm-bg)", borderColor: "var(--cm-border)" }}>
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b" style={{ borderColor: "var(--cm-border)" }}>
          {showSessions && (
            <button onClick={() => setShowSessions(false)} className="p-1.5 rounded-lg" style={{ color: "var(--cm-text-3)" }} data-testid="ai-back-btn">
              <ChevronLeft className="w-4 h-4 text-white/40" />
            </button>
          )}
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#1a8a80] to-violet-600 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-white">{showSessions ? "Chat History" : "Recruiting Advisor"}</h3>
            <p className="text-[10px] text-white/40">{showSessions ? `${sessions.length} conversations` : "AI-powered recruiting advice"}</p>
          </div>
          <div className="flex items-center gap-1">
            {!showSessions && (
              <>
                <button onClick={() => setShowSessions(true)} className="p-2 rounded-lg" style={{ color: "var(--cm-text-3)" }} title="History" data-testid="ai-history-btn">
                  <MessageCircle className="w-4 h-4" />
                </button>
                <button onClick={startNewChat} className="p-2 rounded-lg" style={{ color: "var(--cm-text-3)" }} title="New chat" data-testid="ai-new-chat-btn">
                  <Plus className="w-4 h-4" />
                </button>
              </>
            )}
            <button onClick={onClose} className="p-2 rounded-lg" style={{ color: "var(--cm-text-3)" }} data-testid="ai-close-btn">
              <X className="w-4 h-4 text-white/40" />
            </button>
          </div>
        </div>

        {/* Sessions List */}
        {showSessions ? (
          <div className="flex-1 overflow-y-auto p-3 space-y-1">
            {sessions.length === 0 ? (
              <p className="text-center text-xs py-8 text-white/30">No conversations yet</p>
            ) : sessions.map(s => (
              <button key={s.session_id} onClick={() => loadSession(s.session_id)}
                className="w-full text-left rounded-lg p-3 transition-colors"
                style={{ backgroundColor: "transparent" }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = "var(--cm-surface-hover)"}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = "transparent"}
                data-testid={`session-${s.session_id}`}>
                <p className="text-xs font-medium truncate text-white">{s.preview}</p>
                <p className="text-[10px] mt-0.5 text-white/30">{s.messages} messages</p>
              </button>
            ))}
          </div>
        ) : (
          <>
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center pt-8 px-4">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#1a8a80]/15 to-violet-600/15 flex items-center justify-center mb-4">
                    <Sparkles className="w-7 h-7 text-[#1a8a80]" />
                  </div>
                  <h4 className="text-sm font-semibold mb-1 text-white">Ask me anything</h4>
                  <p className="text-xs text-center mb-6 text-white/40">I know your profile, pipeline, and recruiting history.</p>
                  <div className="w-full space-y-2">
                    {suggestions.map((s, i) => (
                      <button key={i} onClick={() => { setInput(s); inputRef.current?.focus(); }}
                        className="w-full text-left px-3 py-2.5 rounded-lg text-xs border transition-colors"
                        style={{ borderColor: "var(--cm-border)", color: "var(--cm-text-3)" }}
                        onMouseEnter={e => e.currentTarget.style.backgroundColor = "var(--cm-surface-hover)"}
                        onMouseLeave={e => e.currentTarget.style.backgroundColor = "transparent"}
                        data-testid={`suggestion-${i}`}>{s}</button>
                    ))}
                  </div>
                </div>
              ) : messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 ${msg.role === "user" ? "bg-[#1a8a80] text-white rounded-br-md" : "rounded-bl-md"}`}
                    style={msg.role !== "user" ? { backgroundColor: "var(--cm-surface)", color: "var(--cm-text)" } : {}}>
                    <p className="text-[13px] leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                    <p className={`text-[9px] mt-1 ${msg.role === "user" ? "text-white/60" : "text-white/30"}`}>{formatTime(msg.time)}</p>
                  </div>
                </div>
              ))}
              {sending && (
                <div className="flex justify-start">
                  <div className="rounded-2xl rounded-bl-md px-4 py-3" style={{ backgroundColor: "var(--cm-surface)" }}>
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-[#1a8a80]" />
                      <span className="text-xs text-white/40">Thinking...</span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEnd} />
            </div>

            {/* Input */}
            <div className="border-t p-3" style={{ borderColor: "var(--cm-border)" }}>
              <div className="flex items-end gap-2">
                <textarea ref={inputRef} value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKeyDown}
                  placeholder="Ask about recruiting..." rows={1}
                  className="flex-1 resize-none rounded-xl border px-3 py-2.5 text-sm outline-none"
                  style={{ borderColor: "var(--cm-border)", backgroundColor: "var(--cm-input-bg)", color: "var(--cm-text)", maxHeight: "120px" }} data-testid="ai-input" />
                <button onClick={sendMessage} disabled={!input.trim() || sending}
                  className="p-2.5 rounded-xl bg-[#1a8a80] text-white hover:bg-[#25a99e] disabled:opacity-40 transition-colors" data-testid="ai-send-btn">
                  <Send className="w-4 h-4" />
                </button>
              </div>
              <p className="text-[9px] text-center mt-2" style={{ color: "var(--cm-text-4)" }}>AI-powered by Claude</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

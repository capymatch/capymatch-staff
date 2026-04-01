import { useState, useEffect } from "react";
import { Send, X, Loader2, CheckCircle2, Sparkles } from "lucide-react";
import axios from "axios";
import { toast } from "sonner";
import { Button } from "../ui/button";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const EMAIL_TYPES = [
  { id: "intro", label: "Introduction" },
  { id: "follow_up", label: "Follow-Up" },
  { id: "thank_you", label: "Thank You" },
  { id: "interest_update", label: "Interest Update" },
];

export function EmailComposer({ coaches, programId, universityName, onSent, onCancel, initialSubject, initialBody }) {
  const [to, setTo] = useState(coaches?.[0]?.email || "");
  const [subject, setSubject] = useState(initialSubject || "");
  const [body, setBody] = useState(initialBody || "");
  const [sending, setSending] = useState(false);
  const [gmailConnected, setGmailConnected] = useState(false);
  const [draftType, setDraftType] = useState("intro");
  const [drafting, setDrafting] = useState(false);
  const [customInstructions, setCustomInstructions] = useState("");
  const inputCls = "w-full px-3 py-2 rounded-lg border text-sm outline-none focus:ring-1 focus:ring-teal-600 transition-colors";
  const inputStyle = { backgroundColor: "rgba(255,255,255,0.05)", borderColor: "rgba(255,255,255,0.1)", color: "#e2e8f0" };

  useEffect(() => {
    axios.get(`${API}/athlete/gmail/status`).then(r => setGmailConnected(r.data.connected)).catch(() => {});
  }, []);

  const handleAIDraft = async () => {
    setDrafting(true);
    try {
      const res = await axios.post(`${API}/ai/draft-email`, {
        program_id: programId,
        email_type: draftType,
        custom_instructions: customInstructions,
      });
      if (res.data.subject) setSubject(res.data.subject);
      if (res.data.body) setBody(res.data.body);
      if (res.data.coach_email && !to) setTo(res.data.coach_email);
      toast.success("AI draft generated!");
    } catch (err) {
      const detail = err.response?.data?.detail;
      if (detail?.type === "subscription_limit") {
        toast.error(detail.message || "AI draft limit reached. Upgrade your plan.");
      } else {
        toast.error(typeof detail === "string" ? detail : "Failed to generate AI draft");
      }
    } finally {
      setDrafting(false);
    }
  };

  const send = async () => {
    if (!subject || !body) { toast.error("Fill subject and message"); return; }
    setSending(true);
    try {
      if (gmailConnected) {
        const res = await axios.post(`${API}/athlete/gmail/send`, {
          to, subject, body, program_id: programId, university_name: universityName,
        });
        toast.success(res.data.gmail_sent ? "Email sent via Gmail!" : "Email logged to timeline");
      } else {
        await axios.post(`${API}/athlete/interactions`, {
          program_id: programId, university_name: universityName,
          type: "Email Sent", notes: `Subject: ${subject}\n\n${body}`, outcome: "No Response",
        });
        toast.success("Email logged to timeline");
      }
      onSent();
    } catch { toast.error("Failed to send email"); }
    finally { setSending(false); }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(12px)" }} data-testid="email-composer-overlay">
      <div className="w-full max-w-[620px] rounded-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200 flex flex-col"
        style={{ background: "#161b25", border: "1px solid rgba(46, 196, 182, 0.15)", boxShadow: "0 25px 60px rgba(0,0,0,0.5), 0 0 40px rgba(26,138,128,0.08)", maxHeight: "90vh", colorScheme: "dark" }}
        data-testid="email-composer">
        <div className="p-5 pb-4 border-b flex-shrink-0" style={{ borderColor: "rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)" }}>
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-base font-bold text-white tracking-tight">Compose Email</h2>
            <button onClick={onCancel} className="p-1 rounded-lg hover:bg-white/10 transition-colors" data-testid="composer-close-btn">
              <X className="w-4 h-4 text-white/40" />
            </button>
          </div>
          <p className="text-[11px] text-slate-500">
            {gmailConnected
              ? <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-green-400 inline" /> Sending via Gmail</span>
              : "Gmail not connected \u2014 email will be logged to timeline only"
            }
          </p>
        </div>

        <div className="p-5 space-y-3 overflow-y-auto flex-1" style={{ colorScheme: "dark" }}>
          {/* AI Draft Section */}
          <div className="rounded-xl p-3 border border-[#1a8a80]/20 bg-[#1a8a80]/5" data-testid="ai-draft-section">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-[#1a8a80]" />
              <span className="text-[11px] font-bold text-[#1a8a80]">AI Draft</span>
            </div>
            <div className="flex items-center gap-2 mb-2">
              <div className="flex gap-1 flex-wrap">
                {EMAIL_TYPES.map(t => (
                  <button key={t.id} onClick={() => setDraftType(t.id)}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-all ${draftType === t.id ? "bg-[#1a8a80] text-white" : "bg-white/5 text-white/40 border border-white/10"}`}
                    data-testid={`draft-type-${t.id}`}>{t.label}</button>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <input value={customInstructions} onChange={e => setCustomInstructions(e.target.value)}
                placeholder="Custom instructions (optional)..."
                className="flex-1 px-2.5 py-1.5 rounded-lg text-[11px] bg-white/5 border border-white/10 text-white outline-none placeholder:text-white/20"
                data-testid="custom-instructions-input" />
              <button onClick={handleAIDraft} disabled={drafting}
                className="px-3 py-1.5 rounded-lg text-[11px] font-bold bg-[#1a8a80] text-white disabled:opacity-40 inline-flex items-center gap-1"
                data-testid="ai-generate-btn">
                {drafting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                {drafting ? "..." : "Generate"}
              </button>
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider block mb-1.5" style={{ color: "rgba(255,255,255,0.3)" }}>To</label>
            <select value={to} onChange={e => setTo(e.target.value)} className={inputCls} style={{...inputStyle, colorScheme: "dark"}} data-testid="email-to-select">
              <option value="" style={{ background: "#1e2230", color: "#94a3b8" }}>Select recipient...</option>
              {coaches.filter(c => c.email).map(c => <option key={c.coach_id} value={c.email} style={{ background: "#1e2230", color: "#e2e8f0" }}>{c.coach_name} ({c.email})</option>)}
            </select>
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider block mb-1.5" style={{ color: "rgba(255,255,255,0.3)" }}>Subject</label>
            <input placeholder="e.g. Introduction \u2014 Class of 2027" value={subject} onChange={e => setSubject(e.target.value)} className={inputCls} style={inputStyle} data-testid="email-subject-input" />
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider block mb-1.5" style={{ color: "rgba(255,255,255,0.3)" }}>Message</label>
            <textarea placeholder="Write your message..." value={body} onChange={e => setBody(e.target.value)} rows={8}
              className={`${inputCls} resize-none`} style={inputStyle} data-testid="email-body-input" />
          </div>
        </div>

        <div className="p-4 flex items-center justify-between gap-3 flex-shrink-0" style={{ background: "rgba(15,18,25,0.5)", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <button onClick={onCancel}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-[13px] font-semibold transition-all hover:bg-white/5"
            style={{ color: "rgba(255,255,255,0.5)", border: "1px solid rgba(255,255,255,0.1)" }}
            data-testid="composer-cancel-btn">Cancel</button>
          <Button onClick={send} disabled={sending}
            className="flex items-center gap-2 px-6 py-2.5 rounded-lg text-[13px] font-bold text-white transition-all hover:shadow-[0_0_20px_rgba(26,138,128,0.4)]"
            style={{ background: "linear-gradient(135deg, #1a8a80, #25a99e)" }}
            data-testid="send-email-btn">
            <Send className="w-4 h-4" />{sending ? "Sending..." : "Send Email"}
          </Button>
        </div>
      </div>
    </div>
  );
}

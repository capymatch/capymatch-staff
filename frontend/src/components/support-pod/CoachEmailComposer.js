import { useState } from "react";
import { Mail, X, Loader2, Send } from "lucide-react";
import axios from "axios";
import { toast } from "sonner";
import { Button } from "../ui/button";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export function CoachEmailComposer({ athleteId, athleteName, podMembers, onSent, onCancel }) {
  const recipients = [
    { id: "athlete", name: athleteName || "Athlete", type: "Athlete" },
    ...(podMembers || []).map(m => ({ id: m.id, name: m.name, type: m.role_label })),
  ];
  const [to, setTo] = useState(recipients[0]?.name || "");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);

  const inputCls = "w-full px-3 py-2 rounded-lg border text-sm outline-none focus:ring-1 focus:ring-teal-600 transition-colors";
  const inputStyle = { backgroundColor: "rgba(255,255,255,0.05)", borderColor: "rgba(255,255,255,0.1)", color: "#e2e8f0" };

  const send = async () => {
    if (!subject.trim() || !body.trim()) { toast.error("Fill subject and message"); return; }
    setSending(true);
    try {
      await axios.post(`${API}/athletes/${athleteId}/notes`, {
        text: `Email to ${to}\nSubject: ${subject}\n\n${body}`,
        tag: "Email",
      });
      toast.success("Email logged");
      onSent();
    } catch { toast.error("Failed to log email"); }
    finally { setSending(false); }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(12px)" }} data-testid="coach-email-overlay" onClick={onCancel}>
      <div className="w-full max-w-[580px] rounded-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200 flex flex-col"
        onClick={e => e.stopPropagation()}
        style={{ background: "#161b25", border: "1px solid rgba(46, 196, 182, 0.15)", boxShadow: "0 25px 60px rgba(0,0,0,0.5), 0 0 40px rgba(26,138,128,0.08)", maxHeight: "90vh", colorScheme: "dark" }}
        data-testid="coach-email-composer">
        <div className="p-5 pb-4 border-b flex-shrink-0" style={{ borderColor: "rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)" }}>
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
              <Mail className="w-4 h-4 text-teal-600" />Send Message
            </h2>
            <button onClick={onCancel} className="p-1 rounded-lg hover:bg-white/10 transition-colors" data-testid="coach-email-close">
              <X className="w-4 h-4 text-white/40" />
            </button>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Message will be logged to the pod timeline</p>
        </div>

        <div className="p-5 space-y-3 overflow-y-auto flex-1">
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider block mb-1.5" style={{ color: "rgba(255,255,255,0.3)" }}>To</label>
            <select value={to} onChange={e => setTo(e.target.value)} className={inputCls} style={{...inputStyle, colorScheme: "dark"}} data-testid="coach-email-to">
              {recipients.map(r => (
                <option key={r.id} value={r.name} style={{ background: "#1e2230", color: "#e2e8f0" }}>
                  {r.name} ({r.type})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider block mb-1.5" style={{ color: "rgba(255,255,255,0.3)" }}>Subject</label>
            <input placeholder="e.g. Recruiting status update" value={subject} onChange={e => setSubject(e.target.value)}
              className={inputCls} style={inputStyle} data-testid="coach-email-subject" />
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider block mb-1.5" style={{ color: "rgba(255,255,255,0.3)" }}>Message</label>
            <textarea placeholder="Write your message..." value={body} onChange={e => setBody(e.target.value)} rows={6}
              className={`${inputCls} resize-none`} style={inputStyle} data-testid="coach-email-body" />
          </div>
        </div>

        <div className="p-4 flex items-center justify-between gap-3 flex-shrink-0" style={{ background: "rgba(15,18,25,0.5)", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <button onClick={onCancel} className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-[13px] font-semibold transition-all hover:bg-white/5"
            style={{ color: "rgba(255,255,255,0.5)", border: "1px solid rgba(255,255,255,0.1)" }}>Cancel</button>
          <Button onClick={send} disabled={sending}
            className="flex items-center gap-2 px-6 py-2.5 rounded-lg text-[13px] font-bold text-white transition-all hover:shadow-[0_0_20px_rgba(26,138,128,0.4)]"
            style={{ background: "linear-gradient(135deg, #1a8a80, #25a99e)" }} data-testid="coach-email-send">
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Log Email
          </Button>
        </div>
      </div>
    </div>
  );
}

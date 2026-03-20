import { useState } from "react";
import { Send, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import axios from "axios";
import { API, extractAthleteId } from "./inbox-utils";

export function ComposeModal({ nudge, item, onClose, onSent }) {
  const [body, setBody] = useState(nudge.template || "");
  const [sending, setSending] = useState(false);
  const subject = nudge.actionType === "follow_up" ? "Following up"
    : nudge.actionType === "request_doc" ? "Missing document needed"
    : "Quick check-in";

  const inputCls = "w-full px-3 py-2 rounded-lg border text-sm outline-none focus:ring-1 focus:ring-teal-600 transition-colors";
  const inputStyle = { backgroundColor: "rgba(255,255,255,0.05)", borderColor: "rgba(255,255,255,0.1)", color: "#e2e8f0" };

  async function handleSend() {
    if (!body.trim() || sending) return;
    setSending(true);
    try {
      const res = await axios.post(`${API}/autopilot/execute`, {
        action_type: nudge.actionType,
        athlete_id: extractAthleteId(item),
        athlete_name: item.athleteName,
        school_name: item.schoolName || null,
        message_body: body.trim(),
      });
      toast.success(res.data.detail || res.data.message || "Message sent");
      onSent();
    } catch (err) {
      toast.error("Failed to send — try again");
      console.error(err);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(12px)" }}
      onClick={onClose}
      data-testid="compose-modal-overlay"
    >
      <div className="w-full max-w-[640px] rounded-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200 flex flex-col"
        style={{ background: "#161b25", border: "1px solid rgba(46, 196, 182, 0.15)", boxShadow: "0 25px 60px rgba(0,0,0,0.5), 0 0 40px rgba(26,138,128,0.08)" }}
        onClick={e => e.stopPropagation()}
        data-testid="compose-modal"
      >
        {/* Header */}
        <div className="p-5 pb-4 border-b flex-shrink-0" style={{ borderColor: "rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)" }}>
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
              <nudge.Icon className="w-4 h-4 text-teal-400" />
              {nudge.label}
            </h2>
            <button onClick={onClose} className="p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer" data-testid="compose-modal-close">
              <X className="w-4 h-4 text-white/40" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-5 space-y-3">
          <div className="flex items-center gap-2 text-[12px]" style={{ color: "rgba(255,255,255,0.4)" }}>
            <span className="font-semibold">To:</span>
            <span className="text-white font-semibold">{item.athleteName}</span>
          </div>
          {item.schoolName && (
            <div className="flex items-center gap-2 text-[12px]" style={{ color: "rgba(255,255,255,0.4)" }}>
              <span className="font-semibold">School:</span>
              <span style={{ color: "#e2e8f0" }}>{item.schoolName}</span>
            </div>
          )}
          {item.schoolCount > 1 && (
            <div className="text-[12px]" style={{ color: "rgba(255,255,255,0.4)" }}>
              <span className="font-semibold">Scope:</span>
              <span style={{ color: "#e2e8f0" }}> Across {item.schoolCount} schools</span>
              {(item.schoolBreakdown || []).length > 0 && (
                <div className="mt-1.5 ml-1 space-y-0.5">
                  {(item.schoolBreakdown || []).slice(0, 3).map((b, i) => (
                    <p key={i} className="text-[11px]" style={{ color: "rgba(255,255,255,0.5)", margin: 0 }}>
                      {b.school} — <span style={{ color: "rgba(255,255,255,0.3)" }}>{b.issue}</span>
                    </p>
                  ))}
                </div>
              )}
            </div>
          )}
          <div className="flex items-center gap-2 text-[12px]" style={{ color: "rgba(255,255,255,0.4)" }}>
            <span className="font-semibold">Reason:</span>
            <span style={{ color: "#e2e8f0" }}>{(item.issues || []).join(" · ")}{item.timeAgo ? ` · ${item.timeAgo}` : ""}</span>
          </div>
          <div className="flex items-center gap-2 text-[12px]" style={{ color: "rgba(255,255,255,0.4)" }}>
            <span className="font-semibold">Subject:</span>
            <span style={{ color: "#e2e8f0" }}>{subject}</span>
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider block mb-1.5" style={{ color: "rgba(255,255,255,0.3)" }}>Message</label>
            <textarea
              value={body}
              onChange={e => setBody(e.target.value)}
              rows={6}
              className={`${inputCls} resize-none`}
              style={inputStyle}
              data-testid="compose-modal-body"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 flex items-center justify-between gap-3 flex-shrink-0" style={{ background: "rgba(15,18,25,0.5)", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <button onClick={onClose}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-[13px] font-semibold transition-all hover:bg-white/5 cursor-pointer"
            style={{ color: "rgba(255,255,255,0.5)", border: "1px solid rgba(255,255,255,0.1)", background: "transparent", fontFamily: "inherit" }}
            data-testid="compose-modal-cancel"
          >Cancel</button>
          <button onClick={handleSend} disabled={!body.trim() || sending}
            className="flex items-center gap-2 px-6 py-2.5 rounded-lg text-[13px] font-bold text-white transition-all hover:shadow-[0_0_20px_rgba(46,196,182,0.3)] cursor-pointer"
            style={{ background: "linear-gradient(135deg, #0d9488, #0f766e)", border: "none", fontFamily: "inherit", opacity: !body.trim() || sending ? 0.5 : 1 }}
            data-testid="compose-modal-send"
          >
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Send
          </button>
        </div>
      </div>
    </div>
  );
}

import { useState } from "react";
import { ArrowUpRight, X, Loader2, AlertTriangle } from "lucide-react";
import axios from "axios";
import { toast } from "sonner";
import { Button } from "../ui/button";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const ESCALATION_REASONS = [
  { id: "needs_intervention", label: "Needs director intervention" },
  { id: "family_concern", label: "Family concern or conflict" },
  { id: "compliance_issue", label: "Compliance / eligibility issue" },
  { id: "resource_request", label: "Resource or budget request" },
  { id: "strategy_review", label: "Strategy review needed" },
  { id: "other", label: "Other" },
];

const URGENCY_LEVELS = [
  { id: "low", label: "Low — can wait a few days", color: "#6b7280" },
  { id: "medium", label: "Medium — within 24 hours", color: "#f59e0b" },
  { id: "high", label: "High — needs attention today", color: "#ef4444" },
];

export function EscalateToDirector({ athleteId, athleteName, onSaved, onCancel }) {
  const [reason, setReason] = useState(ESCALATION_REASONS[0].id);
  const [urgency, setUrgency] = useState("medium");
  const [details, setDetails] = useState("");
  const [saving, setSaving] = useState(false);

  const inputCls = "w-full px-3 py-2 rounded-lg border text-sm outline-none focus:ring-1 focus:ring-teal-600 transition-colors";
  const inputStyle = { backgroundColor: "rgba(255,255,255,0.05)", borderColor: "rgba(255,255,255,0.1)", color: "#e2e8f0" };

  const save = async () => {
    if (!details.trim()) { toast.error("Add details about why you're escalating"); return; }
    setSaving(true);
    try {
      const reasonLabel = ESCALATION_REASONS.find(r => r.id === reason)?.label || reason;
      // Create a director action via coach escalation endpoint
      await axios.post(`${API}/support-pods/${athleteId}/escalate`, {
        athlete_name: athleteName,
        type: "escalation",
        title: `Escalation: ${reasonLabel}`,
        reason,
        description: details.trim(),
        urgency,
        source: "coach_escalation",
      });
      // Log to timeline
      await axios.post(`${API}/athletes/${athleteId}/notes`, {
        text: `Escalated to Director: ${reasonLabel}\n${details.trim()}`,
        tag: "Escalation",
      });
      toast.success("Escalated to Director");
      onSaved();
    } catch { toast.error("Failed to escalate"); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(12px)" }} data-testid="escalate-overlay" onClick={onCancel}>
      <div className="w-full max-w-2xl rounded-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200 flex flex-col"
        onClick={e => e.stopPropagation()}
        style={{ background: "#161b25", border: "1px solid rgba(245,158,11,0.2)", boxShadow: "0 25px 60px rgba(0,0,0,0.5), 0 0 40px rgba(245,158,11,0.08)" }}
        data-testid="escalate-form">
        <div className="p-5 pb-4 border-b flex-shrink-0" style={{ borderColor: "rgba(255,255,255,0.06)", background: "rgba(245,158,11,0.03)" }}>
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
              <ArrowUpRight className="w-4 h-4 text-amber-500" />Escalate to Director
            </h2>
            <button onClick={onCancel} className="p-1 rounded-lg hover:bg-white/10 transition-colors" data-testid="escalate-close">
              <X className="w-4 h-4 text-white/40" />
            </button>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Creates an action item in the Director's queue for {athleteName}</p>
        </div>

        <div className="p-5 space-y-3">
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider block mb-1.5" style={{ color: "rgba(255,255,255,0.3)" }}>Reason</label>
            <select value={reason} onChange={e => setReason(e.target.value)}
              className={inputCls} style={{...inputStyle, colorScheme: "dark"}} data-testid="escalate-reason">
              {ESCALATION_REASONS.map(r => (
                <option key={r.id} value={r.id} style={{ background: "#1e2230", color: "#e2e8f0" }}>{r.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider block mb-2" style={{ color: "rgba(255,255,255,0.3)" }}>Urgency</label>
            <div className="flex gap-2">
              {URGENCY_LEVELS.map(u => (
                <button key={u.id} onClick={() => setUrgency(u.id)}
                  className={`flex-1 px-3 py-2 rounded-lg text-[11px] font-semibold transition-all border ${urgency === u.id ? "border-transparent" : ""}`}
                  style={{
                    backgroundColor: urgency === u.id ? `${u.color}20` : "rgba(255,255,255,0.03)",
                    color: urgency === u.id ? u.color : "rgba(255,255,255,0.4)",
                    borderColor: urgency === u.id ? `${u.color}40` : "rgba(255,255,255,0.08)",
                  }}
                  data-testid={`escalate-urgency-${u.id}`}>
                  {u.id.charAt(0).toUpperCase() + u.id.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider block mb-1.5" style={{ color: "rgba(255,255,255,0.3)" }}>Details</label>
            <textarea placeholder="What's happening? What do you need from the director?"
              value={details} onChange={e => setDetails(e.target.value)} rows={4}
              className={`${inputCls} resize-none`} style={inputStyle} data-testid="escalate-details" />
          </div>
        </div>

        <div className="p-4 flex items-center justify-between gap-3 flex-shrink-0" style={{ background: "rgba(15,18,25,0.5)", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <button onClick={onCancel} className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-[13px] font-semibold transition-all hover:bg-white/5"
            style={{ color: "rgba(255,255,255,0.5)", border: "1px solid rgba(255,255,255,0.1)" }}>Cancel</button>
          <Button onClick={save} disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 rounded-lg text-[13px] font-bold text-white transition-all hover:shadow-[0_0_20px_rgba(245,158,11,0.3)]"
            style={{ background: "linear-gradient(135deg, #d97706, #f59e0b)" }} data-testid="escalate-submit">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <AlertTriangle className="w-4 h-4" />}
            Escalate
          </Button>
        </div>
      </div>
    </div>
  );
}

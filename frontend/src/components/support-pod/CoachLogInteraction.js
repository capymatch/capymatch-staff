import { useState } from "react";
import { FileText, X, Plus, Loader2 } from "lucide-react";
import axios from "axios";
import { toast } from "sonner";
import { Button } from "../ui/button";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const INTERACTION_TYPES = [
  "Athlete Check-in",
  "Parent Call",
  "Event Prep Conversation",
  "Pod Discussion",
  "Director Update",
  "Video Call",
  "In-Person Meeting",
  "Other",
];

const OUTCOMES = ["Positive", "Neutral", "Needs Follow-up", "Concern Raised"];

export function CoachLogInteraction({ athleteId, athleteName, programId, schoolName, onSaved, onCancel }) {
  const [form, setForm] = useState({
    type: "Athlete Check-in",
    notes: "",
    outcome: "Positive",
    date_time: new Date().toISOString().slice(0, 16),
  });
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const inputCls = "w-full px-3 py-2 rounded-lg border text-sm outline-none focus:ring-1 focus:ring-teal-600 transition-colors";
  const inputStyle = { backgroundColor: "rgba(255,255,255,0.05)", borderColor: "rgba(255,255,255,0.1)", color: "#e2e8f0" };

  const save = async () => {
    if (!form.notes.trim()) { toast.error("Add a note about this interaction"); return; }
    setSaving(true);
    try {
      const noteText = `[${form.type}] ${form.notes}\nOutcome: ${form.outcome}`;
      if (programId) {
        await axios.post(`${API}/support-pods/${athleteId}/school/${programId}/notes`, {
          text: noteText, tag: form.type,
        }, { headers: { Authorization: `Bearer ${localStorage.getItem("capymatch_token")}` } });
      } else {
        await axios.post(`${API}/athletes/${athleteId}/notes`, {
          text: noteText, tag: form.type,
        });
      }
      toast.success("Interaction logged");
      onSaved();
    } catch { toast.error("Failed to log interaction"); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(12px)" }} data-testid="coach-log-overlay" onClick={onCancel}>
      <div className="w-full max-w-2xl rounded-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200 flex flex-col"
        onClick={e => e.stopPropagation()}
        style={{ background: "#161b25", border: "1px solid rgba(46, 196, 182, 0.15)", boxShadow: "0 25px 60px rgba(0,0,0,0.5), 0 0 40px rgba(26,138,128,0.08)" }}
        data-testid="coach-log-form">
        <div className="p-5 pb-4 border-b flex-shrink-0" style={{ borderColor: "rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)" }}>
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
              <FileText className="w-4 h-4 text-teal-600" />Log Interaction
            </h2>
            <button onClick={onCancel} className="p-1 rounded-lg hover:bg-white/10 transition-colors" data-testid="coach-log-close">
              <X className="w-4 h-4 text-white/40" />
            </button>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">{schoolName ? `${athleteName} · ${schoolName}` : athleteName}</p>
        </div>

        <div className="p-5 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider block mb-1.5" style={{ color: "rgba(255,255,255,0.3)" }}>Type</label>
              <select value={form.type} onChange={e => set("type", e.target.value)} className={inputCls}
                style={{...inputStyle, colorScheme: "dark"}} data-testid="coach-log-type">
                {INTERACTION_TYPES.map(t => (
                  <option key={t} style={{ background: "#1e2230", color: "#e2e8f0" }}>{t}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider block mb-1.5" style={{ color: "rgba(255,255,255,0.3)" }}>Outcome</label>
              <select value={form.outcome} onChange={e => set("outcome", e.target.value)} className={inputCls}
                style={{...inputStyle, colorScheme: "dark"}} data-testid="coach-log-outcome">
                {OUTCOMES.map(o => (
                  <option key={o} style={{ background: "#1e2230", color: "#e2e8f0" }}>{o}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider block mb-1.5" style={{ color: "rgba(255,255,255,0.3)" }}>Date</label>
              <input type="datetime-local" value={form.date_time} onChange={e => set("date_time", e.target.value)}
                className={inputCls} style={{...inputStyle, colorScheme: "dark"}} data-testid="coach-log-date" />
            </div>
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider block mb-1.5" style={{ color: "rgba(255,255,255,0.3)" }}>Notes</label>
            <textarea placeholder="What happened? Key takeaways, decisions made..."
              value={form.notes} onChange={e => set("notes", e.target.value)} rows={4}
              className={`${inputCls} resize-none`} style={inputStyle} data-testid="coach-log-notes" />
          </div>
        </div>

        <div className="p-4 flex items-center justify-between gap-3 flex-shrink-0" style={{ background: "rgba(15,18,25,0.5)", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <button onClick={onCancel} className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-[13px] font-semibold transition-all hover:bg-white/5"
            style={{ color: "rgba(255,255,255,0.5)", border: "1px solid rgba(255,255,255,0.1)" }}>Cancel</button>
          <Button onClick={save} disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 rounded-lg text-[13px] font-bold text-white transition-all hover:shadow-[0_0_20px_rgba(26,138,128,0.4)]"
            style={{ background: "linear-gradient(135deg, #1a8a80, #25a99e)" }} data-testid="coach-log-save">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Log Interaction
          </Button>
        </div>
      </div>
    </div>
  );
}

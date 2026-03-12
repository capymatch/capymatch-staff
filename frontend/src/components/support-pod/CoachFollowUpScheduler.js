import { useState } from "react";
import { Clock, X, Loader2 } from "lucide-react";
import axios from "axios";
import { toast } from "sonner";
import { Button } from "../ui/button";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const FOLLOWUP_TYPES = [
  "Athlete check-in call",
  "Parent follow-up",
  "Event prep review",
  "Pod sync meeting",
  "Director status update",
  "Review recruiting progress",
  "Custom",
];

export function CoachFollowUpScheduler({ athleteId, athleteName, onSaved, onCancel }) {
  const [date, setDate] = useState("");
  const [type, setType] = useState(FOLLOWUP_TYPES[0]);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const inputCls = "w-full px-3 py-2 rounded-lg border text-sm outline-none focus:ring-1 focus:ring-teal-600 transition-colors";
  const inputStyle = { backgroundColor: "rgba(255,255,255,0.05)", borderColor: "rgba(255,255,255,0.1)", color: "#e2e8f0" };

  const save = async () => {
    if (!date) { toast.error("Pick a date"); return; }
    setSaving(true);
    try {
      // Create as a pod action item with a due date
      await axios.post(`${API}/support-pods/${athleteId}/actions`, {
        title: type === "Custom" && notes.trim() ? notes.trim() : type,
        owner: "Coach Martinez",
        due_date: new Date(date).toISOString(),
      });
      // Also log a timeline note
      await axios.post(`${API}/athletes/${athleteId}/notes`, {
        text: `Follow-up scheduled for ${new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}: ${type}${notes ? ` — ${notes}` : ""}`,
        tag: "Follow-up",
      });
      toast.success("Follow-up scheduled");
      onSaved();
    } catch { toast.error("Failed to schedule"); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(12px)" }} data-testid="coach-followup-overlay" onClick={onCancel}>
      <div className="w-full max-w-[480px] rounded-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200 flex flex-col"
        onClick={e => e.stopPropagation()}
        style={{ background: "#161b25", border: "1px solid rgba(46, 196, 182, 0.15)", boxShadow: "0 25px 60px rgba(0,0,0,0.5), 0 0 40px rgba(26,138,128,0.08)" }}
        data-testid="coach-followup-form">
        <div className="p-5 pb-4 border-b flex-shrink-0" style={{ borderColor: "rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)" }}>
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
              <Clock className="w-4 h-4 text-teal-600" />Schedule Follow-up
            </h2>
            <button onClick={onCancel} className="p-1 rounded-lg hover:bg-white/10 transition-colors" data-testid="coach-followup-close">
              <X className="w-4 h-4 text-white/40" />
            </button>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">{athleteName} — creates a task in Next Actions</p>
        </div>

        <div className="p-5 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider block mb-1.5" style={{ color: "rgba(255,255,255,0.3)" }}>Date</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)}
                className={inputCls} style={{...inputStyle, colorScheme: "dark"}} data-testid="coach-followup-date" />
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider block mb-1.5" style={{ color: "rgba(255,255,255,0.3)" }}>Type</label>
              <select value={type} onChange={e => setType(e.target.value)}
                className={inputCls} style={{...inputStyle, colorScheme: "dark"}} data-testid="coach-followup-type">
                {FOLLOWUP_TYPES.map(t => (
                  <option key={t} style={{ background: "#1e2230", color: "#e2e8f0" }}>{t}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider block mb-1.5" style={{ color: "rgba(255,255,255,0.3)" }}>Notes (optional)</label>
            <input placeholder="e.g. Discuss recruiting plan changes" value={notes} onChange={e => setNotes(e.target.value)}
              className={inputCls} style={inputStyle} data-testid="coach-followup-notes" />
          </div>
        </div>

        <div className="p-4 flex items-center justify-between gap-3 flex-shrink-0" style={{ background: "rgba(15,18,25,0.5)", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <button onClick={onCancel} className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-[13px] font-semibold transition-all hover:bg-white/5"
            style={{ color: "rgba(255,255,255,0.5)", border: "1px solid rgba(255,255,255,0.1)" }}>Cancel</button>
          <Button onClick={save} disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 rounded-lg text-[13px] font-bold text-white transition-all hover:shadow-[0_0_20px_rgba(26,138,128,0.4)]"
            style={{ background: "linear-gradient(135deg, #1a8a80, #25a99e)" }} data-testid="coach-followup-save">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Clock className="w-4 h-4" />}
            Set Reminder
          </Button>
        </div>
      </div>
    </div>
  );
}

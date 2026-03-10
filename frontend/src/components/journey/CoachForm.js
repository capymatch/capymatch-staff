import { useState } from "react";
import { User, X, Save } from "lucide-react";
import { Button } from "../ui/button";

export function CoachForm({ initial, programId, onSave, onCancel }) {
  const [form, setForm] = useState(initial || { coach_name: "", role: "Head Coach", email: "", phone: "", notes: "" });
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const inputCls = "w-full px-3 py-2 rounded-lg border text-sm outline-none focus:ring-1 focus:ring-teal-600 transition-colors";
  const inputStyle = { backgroundColor: "rgba(255,255,255,0.05)", borderColor: "rgba(255,255,255,0.1)", color: "#e2e8f0" };
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(12px)" }} data-testid="coach-form-overlay">
      <div className="w-full max-w-[480px] rounded-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200 flex flex-col"
        style={{ background: "#161b25", border: "1px solid rgba(46, 196, 182, 0.15)", boxShadow: "0 25px 60px rgba(0,0,0,0.5), 0 0 40px rgba(26,138,128,0.08)" }}
        data-testid="coach-form">
        <div className="p-5 pb-4 border-b flex-shrink-0" style={{ borderColor: "rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)" }}>
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2"><User className="w-4 h-4 text-teal-600" />{initial ? "Edit Coach" : "Add Coach"}</h2>
            <button onClick={onCancel} className="p-1 rounded-lg hover:bg-white/10 transition-colors" data-testid="coach-close-btn"><X className="w-4 h-4 text-white/40" /></button>
          </div>
        </div>
        <div className="p-5 space-y-3">
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider block mb-1.5" style={{ color: "rgba(255,255,255,0.3)" }}>Coach Name</label>
            <input placeholder="e.g. John Smith" value={form.coach_name} onChange={e => set("coach_name", e.target.value)} className={inputCls} style={inputStyle} data-testid="coach-name-input" />
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider block mb-1.5" style={{ color: "rgba(255,255,255,0.3)" }}>Role</label>
            <select value={form.role} onChange={e => set("role", e.target.value)} className={inputCls} style={{...inputStyle, colorScheme: "dark"}} data-testid="coach-role-select">
              {["Head Coach", "Associate Head Coach", "Assistant Coach", "Recruiting Coordinator", "Director of Operations"].map(r => <option key={r} style={{ background: "#1e2230", color: "#e2e8f0" }}>{r}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider block mb-1.5" style={{ color: "rgba(255,255,255,0.3)" }}>Email</label>
            <input placeholder="coach@university.edu" value={form.email} onChange={e => set("email", e.target.value)} className={inputCls} style={inputStyle} data-testid="coach-email-input" />
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider block mb-1.5" style={{ color: "rgba(255,255,255,0.3)" }}>Phone</label>
            <input placeholder="(555) 123-4567" value={form.phone} onChange={e => set("phone", e.target.value)} className={inputCls} style={inputStyle} data-testid="coach-phone-input" />
          </div>
        </div>
        <div className="p-4 flex items-center justify-between gap-3 flex-shrink-0" style={{ background: "rgba(15,18,25,0.5)", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <button onClick={onCancel} className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-[13px] font-semibold transition-all hover:bg-white/5" style={{ color: "rgba(255,255,255,0.5)", border: "1px solid rgba(255,255,255,0.1)" }}>Cancel</button>
          <Button onClick={() => onSave({ ...form, program_id: programId })}
            className="flex items-center gap-2 px-6 py-2.5 rounded-lg text-[13px] font-bold text-white transition-all hover:shadow-[0_0_20px_rgba(26,138,128,0.4)]"
            style={{ background: "linear-gradient(135deg, #1a8a80, #25a99e)" }} data-testid="save-coach-btn">
            <Save className="w-4 h-4" />Save Coach
          </Button>
        </div>
      </div>
    </div>
  );
}

import { useState } from "react";
import { ClipboardCheck, X, Plus, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ACTION_TYPES } from "./constants";

export function AddTaskModal({ open, onOpenChange, onSubmit }) {
  const [title, setTitle] = useState("");
  const [assignToAthlete, setAssignToAthlete] = useState(false);
  const [actionType, setActionType] = useState("general");
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const handleSubmit = () => {
    if (!title.trim()) return;
    onSubmit(title.trim(), assignToAthlete, assignToAthlete ? actionType : null);
    setTitle("");
    setAssignToAthlete(false);
    setActionType("general");
  };

  if (!open) return null;

  const inputCls = "w-full px-3 py-2 rounded-lg border text-sm outline-none focus:ring-1 focus:ring-teal-600 transition-colors";
  const inputStyle = { backgroundColor: "rgba(255,255,255,0.05)", borderColor: "rgba(255,255,255,0.1)", color: "#e2e8f0" };
  const selectedLabel = ACTION_TYPES.find(t => t.value === actionType)?.label || "General Task";

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(12px)" }} data-testid="add-task-overlay" onClick={() => onOpenChange(false)}>
      <div className="w-full max-w-md rounded-lg shadow-2xl animate-in fade-in zoom-in-95 duration-200 flex flex-col"
        onClick={e => e.stopPropagation()}
        style={{ background: "#161b25", border: "1px solid rgba(46, 196, 182, 0.15)", boxShadow: "0 25px 60px rgba(0,0,0,0.5), 0 0 40px rgba(26,138,128,0.08)", maxHeight: "90vh", colorScheme: "dark" }}
        data-testid="add-task-modal">

        <div className="p-5 pb-4 border-b flex-shrink-0" style={{ borderColor: "rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)" }}>
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
              <ClipboardCheck className="w-4 h-4 text-teal-600" />New Task
            </h2>
            <button onClick={() => onOpenChange(false)} className="p-1 rounded-lg hover:bg-white/10 transition-colors" data-testid="add-task-close">
              <X className="w-4 h-4 text-white/40" />
            </button>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Add a task for this school relationship.</p>
        </div>

        <div className="p-5 space-y-3 flex-1">
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider block mb-1.5" style={{ color: "rgba(255,255,255,0.3)" }}>Task</label>
            <input
              autoFocus
              value={title}
              onChange={e => setTitle(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSubmit()}
              placeholder="What needs to be done?"
              className={inputCls}
              style={inputStyle}
              data-testid="new-task-input"
            />
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider block mb-2" style={{ color: "rgba(255,255,255,0.3)" }}>Options</label>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer select-none" data-testid="assign-to-athlete-toggle">
                <div
                  onClick={() => setAssignToAthlete(!assignToAthlete)}
                  className="relative w-8 h-[18px] rounded-full transition-colors"
                  style={{ background: assignToAthlete ? "#1a8a80" : "rgba(255,255,255,0.15)" }}
                >
                  <div className="absolute top-[2px] rounded-full w-[14px] h-[14px] bg-white transition-transform shadow-sm"
                    style={{ left: assignToAthlete ? 15 : 2 }} />
                </div>
                <span className="text-xs font-medium" style={{ color: assignToAthlete ? "#5eead4" : "rgba(255,255,255,0.4)" }}>
                  Assign to Athlete
                </span>
              </label>
              {assignToAthlete && (
                <div className="relative" data-testid="task-type-select">
                  <button
                    type="button"
                    onClick={() => setDropdownOpen(!dropdownOpen)}
                    className="flex items-center gap-2 text-xs px-3 py-1.5 rounded-md border outline-none transition-colors hover:border-teal-600/40"
                    style={{ backgroundColor: "rgba(255,255,255,0.05)", borderColor: dropdownOpen ? "rgba(46,196,182,0.4)" : "rgba(255,255,255,0.1)", color: "#e2e8f0" }}
                  >
                    {selectedLabel}
                    <ChevronDown className="w-3 h-3" style={{ color: "rgba(255,255,255,0.4)" }} />
                  </button>
                  {dropdownOpen && (
                    <div className="absolute top-full left-0 mt-1 w-48 rounded-lg border shadow-xl overflow-hidden z-10"
                      style={{ backgroundColor: "#1e2535", borderColor: "rgba(255,255,255,0.1)", boxShadow: "0 12px 40px rgba(0,0,0,0.5)" }}>
                      {ACTION_TYPES.map(t => (
                        <button
                          key={t.value}
                          type="button"
                          onClick={() => { setActionType(t.value); setDropdownOpen(false); }}
                          className="w-full text-left px-3 py-2 text-xs transition-colors"
                          style={{
                            color: t.value === actionType ? "#5eead4" : "rgba(255,255,255,0.6)",
                            backgroundColor: t.value === actionType ? "rgba(46,196,182,0.1)" : "transparent",
                          }}
                          onMouseEnter={e => { if (t.value !== actionType) e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.05)"; }}
                          onMouseLeave={e => { if (t.value !== actionType) e.currentTarget.style.backgroundColor = "transparent"; }}
                        >
                          {t.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="p-4 flex items-center justify-between gap-3 flex-shrink-0" style={{ background: "rgba(15,18,25,0.5)", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <button onClick={() => onOpenChange(false)} className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-[13px] font-semibold transition-all hover:bg-white/5"
            style={{ color: "rgba(255,255,255,0.5)", border: "1px solid rgba(255,255,255,0.1)" }} data-testid="cancel-task-btn">
            Cancel
          </button>
          <Button onClick={handleSubmit} disabled={!title.trim()}
            className="flex items-center gap-2 px-6 py-2.5 rounded-lg text-[13px] font-bold text-white transition-all hover:shadow-[0_0_20px_rgba(26,138,128,0.4)] disabled:opacity-40"
            style={{ background: "linear-gradient(135deg, #1a8a80, #25a99e)" }} data-testid="save-task-btn">
            <Plus className="w-4 h-4" />
            Add Task
          </Button>
        </div>
      </div>
    </div>
  );
}

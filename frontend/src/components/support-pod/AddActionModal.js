import { useState, useMemo } from "react";
import { X, Loader2, Plus, Calendar, User, Tag, FileText } from "lucide-react";
import { Button } from "../ui/button";
import axios from "axios";
import { toast } from "sonner";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const CATEGORIES = [
  { id: "follow_up", label: "Follow-up needed" },
  { id: "coach_response", label: "Coach requested response" },
  { id: "check_in", label: "Check-in" },
  { id: "visit_planning", label: "Visit planning" },
  { id: "academic_update", label: "Academic update" },
  { id: "video_highlights", label: "Video / highlights" },
  { id: "admin_task", label: "Administrative task" },
  { id: "other", label: "Other" },
];

const SUGGESTED_TITLES = {
  follow_up: "Follow up on last conversation",
  coach_response: "Respond to coach inquiry",
  check_in: "Check in with athlete about progress",
  visit_planning: "Plan campus visit logistics",
  academic_update: "Update academic transcripts / test scores",
  video_highlights: "Upload updated highlight reel",
  admin_task: "Complete required paperwork",
};

const inputCls = "w-full px-3 py-2.5 rounded-lg border text-sm outline-none focus:ring-1 focus:ring-teal-600/40 transition-all";
const inputStyle = { backgroundColor: "rgba(255,255,255,0.04)", borderColor: "rgba(255,255,255,0.08)", color: "#e2e8f0" };
const labelCls = "text-[10px] font-bold uppercase tracking-wider block mb-1.5";
const labelStyle = { color: "rgba(255,255,255,0.3)" };
const errorStyle = { color: "#f87171", fontSize: 11, marginTop: 4 };

function getDefaultDue() {
  const d = new Date();
  d.setDate(d.getDate() + 3);
  return d.toISOString().split("T")[0];
}

export function AddActionModal({ athleteId, podMembers, currentUser, onCreated, onCancel }) {
  const [title, setTitle] = useState("");
  const [assignee, setAssignee] = useState("");
  const [assigneeRole, setAssigneeRole] = useState("");
  const [dueDate, setDueDate] = useState(getDefaultDue());
  const [category, setCategory] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [touched, setTouched] = useState({});

  // Build assignee options from real pod members
  const assigneeOptions = useMemo(() => {
    const opts = [];
    if (podMembers && podMembers.length > 0) {
      podMembers.forEach(m => {
        opts.push({ name: m.name, role: m.role_label || m.role, id: m.id });
      });
    }
    // Ensure current user is in the list
    if (currentUser?.name && !opts.find(o => o.name === currentUser.name)) {
      opts.unshift({ name: currentUser.name, role: "You", id: "current" });
    }
    return opts;
  }, [podMembers, currentUser]);

  // Default assignee to current user (coach)
  useState(() => {
    if (currentUser?.name && !assignee) {
      setAssignee(currentUser.name);
      setAssigneeRole("Coach");
    }
  });

  const errors = {
    title: touched.title && !title.trim() ? "Action title is required" : null,
    assignee: touched.assignee && !assignee ? "Please assign this to someone" : null,
    dueDate: touched.dueDate && !dueDate ? "Pick a due date" : null,
  };
  const hasErrors = !title.trim() || !assignee || !dueDate;

  const handleCategoryClick = (catId) => {
    setCategory(prev => prev === catId ? "" : catId);
    // Suggest a title if empty
    if (!title.trim() && SUGGESTED_TITLES[catId]) {
      setTitle(SUGGESTED_TITLES[catId]);
    }
  };

  const handleAssigneeChange = (name) => {
    setAssignee(name);
    const opt = assigneeOptions.find(o => o.name === name);
    setAssigneeRole(opt?.role || "");
  };

  const submit = async () => {
    setTouched({ title: true, assignee: true, dueDate: true });
    if (hasErrors) return;
    setSaving(true);
    try {
      await axios.post(`${API}/support-pods/${athleteId}/actions`, {
        title: title.trim(),
        owner: assignee,
        owner_role: assigneeRole,
        due_date: new Date(dueDate).toISOString(),
        source_category: category || null,
        notes: notes.trim() || null,
      });
      toast.success("Action created", { description: `Assigned to ${assignee}` });
      onCreated();
    } catch {
      toast.error("Failed to create action");
    }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(12px)" }}
      onClick={onCancel} data-testid="add-action-overlay">

      <div className="w-full max-w-[540px] rounded-xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200 flex flex-col"
        onClick={e => e.stopPropagation()}
        style={{ background: "#161b25", border: "1px solid rgba(46,196,182,0.12)", boxShadow: "0 25px 60px rgba(0,0,0,0.5), 0 0 40px rgba(26,138,128,0.06)", maxHeight: "90vh" }}
        data-testid="add-action-modal">

        {/* Header */}
        <div className="px-6 pt-6 pb-4 flex-shrink-0" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: "rgba(46,196,182,0.12)" }}>
                <Plus className="w-3.5 h-3.5 text-teal-400" />
              </div>
              Add Next Action
            </h2>
            <button onClick={onCancel} className="p-1.5 rounded-lg hover:bg-white/5 transition-colors" data-testid="add-action-close">
              <X className="w-4 h-4 text-white/30" />
            </button>
          </div>
          <p className="text-[12px] mt-2 ml-9" style={{ color: "rgba(255,255,255,0.35)" }}>
            Create a follow-up task for this athlete and assign it to the right person.
          </p>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4 overflow-y-auto flex-1">
          {/* Category chips — quick-select */}
          <div>
            <label className={labelCls} style={labelStyle}>
              <Tag className="w-3 h-3 inline mr-1 -mt-0.5" />Type (optional)
            </label>
            <div className="flex flex-wrap gap-1.5">
              {CATEGORIES.map(cat => (
                <button key={cat.id} onClick={() => handleCategoryClick(cat.id)}
                  className="px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all"
                  style={{
                    backgroundColor: category === cat.id ? "rgba(46,196,182,0.15)" : "rgba(255,255,255,0.03)",
                    color: category === cat.id ? "#5eead4" : "rgba(255,255,255,0.4)",
                    border: `1px solid ${category === cat.id ? "rgba(46,196,182,0.3)" : "rgba(255,255,255,0.06)"}`,
                  }}
                  data-testid={`cat-chip-${cat.id}`}>
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Title */}
          <div>
            <label className={labelCls} style={labelStyle}>Action title *</label>
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              onBlur={() => setTouched(p => ({...p, title: true}))}
              placeholder="What needs to happen?"
              className={inputCls}
              style={{ ...inputStyle, borderColor: errors.title ? "#f87171" : inputStyle.borderColor }}
              autoFocus
              data-testid="add-action-title"
            />
            {errors.title && <p style={errorStyle}>{errors.title}</p>}
          </div>

          {/* Assign to + Due date — side by side */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={labelCls} style={labelStyle}>
                <User className="w-3 h-3 inline mr-1 -mt-0.5" />Assigned to *
              </label>
              {assigneeOptions.length > 0 ? (
                <select
                  value={assignee}
                  onChange={e => handleAssigneeChange(e.target.value)}
                  onBlur={() => setTouched(p => ({...p, assignee: true}))}
                  className={inputCls}
                  style={{ ...inputStyle, colorScheme: "dark", borderColor: errors.assignee ? "#f87171" : inputStyle.borderColor }}
                  data-testid="add-action-assignee"
                >
                  <option value="" style={{ background: "#1e2230", color: "#94a3b8" }}>Select person...</option>
                  {assigneeOptions.map(opt => (
                    <option key={opt.id} value={opt.name} style={{ background: "#1e2230", color: "#e2e8f0" }}>
                      {opt.name} — {opt.role}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="px-3 py-2.5 rounded-lg text-xs" style={{ backgroundColor: "rgba(239,68,68,0.08)", color: "#f87171", border: "1px solid rgba(239,68,68,0.15)" }}>
                  No pod members found. Add members to assign actions.
                </div>
              )}
              {errors.assignee && <p style={errorStyle}>{errors.assignee}</p>}
            </div>

            <div>
              <label className={labelCls} style={labelStyle}>
                <Calendar className="w-3 h-3 inline mr-1 -mt-0.5" />Due date *
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={e => setDueDate(e.target.value)}
                onBlur={() => setTouched(p => ({...p, dueDate: true}))}
                className={inputCls}
                style={{ ...inputStyle, colorScheme: "dark", borderColor: errors.dueDate ? "#f87171" : inputStyle.borderColor }}
                data-testid="add-action-due"
              />
              {errors.dueDate && <p style={errorStyle}>{errors.dueDate}</p>}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className={labelCls} style={labelStyle}>
              <FileText className="w-3 h-3 inline mr-1 -mt-0.5" />Notes (optional)
            </label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Any additional context..."
              rows={2}
              className={`${inputCls} resize-none`}
              style={inputStyle}
              data-testid="add-action-notes"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 flex items-center justify-between gap-3 flex-shrink-0"
          style={{ background: "rgba(15,18,25,0.5)", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <button onClick={onCancel}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-[13px] font-semibold transition-all hover:bg-white/5"
            style={{ color: "rgba(255,255,255,0.5)", border: "1px solid rgba(255,255,255,0.1)" }}>
            Cancel
          </button>
          <Button
            onClick={submit}
            disabled={saving || (touched.title && hasErrors)}
            className="flex items-center gap-2 px-6 py-2.5 rounded-lg text-[13px] font-bold text-white transition-all hover:shadow-[0_0_20px_rgba(26,138,128,0.4)] disabled:opacity-40"
            style={{ background: "linear-gradient(135deg, #1a8a80, #25a99e)" }}
            data-testid="add-action-submit"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Create Action
          </Button>
        </div>
      </div>
    </div>
  );
}

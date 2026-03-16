import { useState } from "react";
import { Shield, CheckCircle2, Send, Plus, ChevronDown, ChevronUp, Clock, AlertTriangle, User } from "lucide-react";
import axios from "axios";
import { toast } from "sonner";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const headers = () => ({ Authorization: `Bearer ${localStorage.getItem("capymatch_token")}` });

/**
 * EscalationBanner — shown when a director opens a pod from an escalated issue.
 * Provides: acknowledge, add guidance, create intervention task, message.
 * Persistent chip mode after acknowledgment.
 */
export default function EscalationBanner({ escalation, athleteId, onRefresh, isDirector }) {
  const [expanded, setExpanded] = useState(true);
  const [showNoteForm, setShowNoteForm] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [sendingNote, setSendingNote] = useState(false);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskAssignee, setTaskAssignee] = useState("Coach");
  const [taskDueDays, setTaskDueDays] = useState(7);
  const [sendingTask, setSendingTask] = useState(false);
  const [acknowledging, setAcknowledging] = useState(false);
  const [resolving, setResolving] = useState(false);

  if (!escalation) return null;

  const isOpen = escalation.status === "open";
  const isAcknowledged = !!escalation.acknowledged_at;
  const isResolved = escalation.status === "resolved";
  const accentColor = isResolved ? "#10b981" : isAcknowledged ? "#6366f1" : "#dc2626";

  const handleAcknowledge = async () => {
    setAcknowledging(true);
    try {
      await axios.post(`${API}/director/actions/${escalation.id}/acknowledge`, {}, { headers: headers() });
      toast.success("Escalation acknowledged");
      onRefresh?.();
    } catch { toast.error("Failed to acknowledge"); }
    finally { setAcknowledging(false); }
  };

  const handleResolve = async () => {
    setResolving(true);
    try {
      await axios.post(`${API}/director/actions/${escalation.id}/resolve`, { resolution_note: "Resolved by director" }, { headers: headers() });
      toast.success("Escalation resolved");
      onRefresh?.();
    } catch { toast.error("Failed to resolve"); }
    finally { setResolving(false); }
  };

  const handleAddNote = async () => {
    if (!noteText.trim()) return;
    setSendingNote(true);
    try {
      await axios.post(`${API}/support-pods/${athleteId}/director-notes`, {
        content: noteText.trim(),
        escalation_id: escalation.id,
      }, { headers: headers() });
      toast.success("Guidance note added");
      setNoteText("");
      setShowNoteForm(false);
      onRefresh?.();
    } catch { toast.error("Failed to add note"); }
    finally { setSendingNote(false); }
  };

  const handleCreateTask = async () => {
    if (!taskTitle.trim()) return;
    setSendingTask(true);
    try {
      await axios.post(`${API}/support-pods/${athleteId}/director-tasks`, {
        title: taskTitle.trim(),
        assignee: taskAssignee,
        due_days: taskDueDays,
        escalation_id: escalation.id,
      }, { headers: headers() });
      toast.success("Intervention task created");
      setTaskTitle("");
      setShowTaskForm(false);
      onRefresh?.();
    } catch { toast.error("Failed to create task"); }
    finally { setSendingTask(false); }
  };

  const formatDate = (iso) => {
    if (!iso) return "";
    return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  // Compact chip mode (after acknowledged or for non-director viewing)
  if (!isDirector || !expanded) {
    return (
      <div
        className="flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-colors hover:bg-opacity-80"
        style={{ backgroundColor: `${accentColor}08`, borderColor: `${accentColor}20` }}
        onClick={() => isDirector && setExpanded(true)}
        data-testid="escalation-chip"
      >
        <Shield className="w-3.5 h-3.5 shrink-0" style={{ color: accentColor }} />
        <span className="text-[11px] font-semibold" style={{ color: accentColor }}>
          {isResolved ? "Escalation Resolved" : isAcknowledged ? "Escalation Acknowledged" : "Escalated"}
        </span>
        <span className="text-[10px]" style={{ color: "var(--cm-text-3, #94a3b8)" }}>
          by {escalation.coach_name || "Coach"} on {formatDate(escalation.created_at)}
        </span>
        {isDirector && <ChevronDown className="w-3 h-3 ml-auto" style={{ color: "var(--cm-text-4)" }} />}
      </div>
    );
  }

  // Full banner mode (director, expanded)
  return (
    <div
      className="rounded-xl border overflow-hidden"
      style={{ backgroundColor: "#1a1530", borderColor: `${accentColor}30` }}
      data-testid="escalation-banner"
    >
      {/* Header */}
      <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: `1px solid ${accentColor}15` }}>
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${accentColor}15` }}>
            <Shield className="w-4 h-4" style={{ color: accentColor }} />
          </div>
          <div>
            <p className="text-xs font-bold text-white">
              {isResolved ? "Escalation Resolved" : isAcknowledged ? "Escalation Under Review" : "Escalated Issue"}
            </p>
            <p className="text-[10px]" style={{ color: "rgba(255,255,255,0.4)" }}>
              by {escalation.coach_name || "Coach"} &middot; {formatDate(escalation.created_at)}
              {escalation.urgency && <> &middot; <span className="uppercase font-bold" style={{ color: escalation.urgency === "high" ? "#ef4444" : "#d97706" }}>{escalation.urgency}</span></>}
            </p>
          </div>
        </div>
        <button onClick={() => setExpanded(false)} className="p-1 rounded hover:bg-white/10" data-testid="escalation-minimize">
          <ChevronUp className="w-4 h-4" style={{ color: "rgba(255,255,255,0.4)" }} />
        </button>
      </div>

      {/* Reason */}
      <div className="px-4 py-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: "rgba(255,255,255,0.3)" }}>Reason</p>
        <p className="text-xs text-white/90">{escalation.reason_label || escalation.reason || "Coach escalation"}</p>
        {escalation.note && <p className="text-[11px] mt-1" style={{ color: "rgba(255,255,255,0.5)" }}>{escalation.note}</p>}
      </div>

      {/* Actions */}
      {isOpen && (
        <div className="px-4 py-3 flex flex-wrap gap-2" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          {!isAcknowledged && (
            <button onClick={handleAcknowledge} disabled={acknowledging}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all hover:opacity-90 disabled:opacity-50"
              style={{ backgroundColor: "rgba(99,102,241,0.15)", color: "#a5b4fc", border: "1px solid rgba(99,102,241,0.2)" }}
              data-testid="escalation-acknowledge-btn">
              <CheckCircle2 className="w-3 h-3" />{acknowledging ? "..." : "Acknowledge"}
            </button>
          )}
          <button onClick={() => { setShowNoteForm(!showNoteForm); setShowTaskForm(false); }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all hover:opacity-90"
            style={{ backgroundColor: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.7)", border: "1px solid rgba(255,255,255,0.1)" }}
            data-testid="escalation-add-note-btn">
            <Send className="w-3 h-3" />Add Guidance
          </button>
          <button onClick={() => { setShowTaskForm(!showTaskForm); setShowNoteForm(false); }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all hover:opacity-90"
            style={{ backgroundColor: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.7)", border: "1px solid rgba(255,255,255,0.1)" }}
            data-testid="escalation-add-task-btn">
            <Plus className="w-3 h-3" />Assign Task
          </button>
          <button onClick={handleResolve} disabled={resolving}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all hover:opacity-90 disabled:opacity-50"
            style={{ backgroundColor: "rgba(16,185,129,0.12)", color: "#6ee7b7", border: "1px solid rgba(16,185,129,0.2)" }}
            data-testid="escalation-resolve-btn">
            <CheckCircle2 className="w-3 h-3" />{resolving ? "..." : "Resolve"}
          </button>
        </div>
      )}

      {/* Guidance note form */}
      {showNoteForm && (
        <div className="px-4 py-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }} data-testid="escalation-note-form">
          <textarea
            autoFocus value={noteText} onChange={e => setNoteText(e.target.value)}
            placeholder="Add guidance for the coach..."
            className="w-full px-3 py-2 rounded-lg border text-xs resize-none outline-none focus:ring-1 focus:ring-indigo-500"
            style={{ backgroundColor: "rgba(255,255,255,0.05)", borderColor: "rgba(255,255,255,0.1)", color: "#e2e8f0", minHeight: 60 }}
            rows={2}
          />
          <div className="flex items-center gap-2 mt-2">
            <button onClick={handleAddNote} disabled={sendingNote || !noteText.trim()}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-all disabled:opacity-40"
              style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}>
              {sendingNote ? "Sending..." : "Add Note"}
            </button>
            <button onClick={() => { setShowNoteForm(false); setNoteText(""); }}
              className="px-3 py-1.5 text-xs font-medium" style={{ color: "rgba(255,255,255,0.4)" }}>Cancel</button>
          </div>
        </div>
      )}

      {/* Intervention task form */}
      {showTaskForm && (
        <div className="px-4 py-3 space-y-2" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }} data-testid="escalation-task-form">
          <input
            autoFocus value={taskTitle} onChange={e => setTaskTitle(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleCreateTask()}
            placeholder="Coach follow-up required by Friday..."
            className="w-full px-3 py-2 rounded-lg border text-xs outline-none focus:ring-1 focus:ring-indigo-500"
            style={{ backgroundColor: "rgba(255,255,255,0.05)", borderColor: "rgba(255,255,255,0.1)", color: "#e2e8f0" }}
          />
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.3)" }}>Assign to</span>
              {["Coach", "Athlete", "Director"].map(r => (
                <button key={r} onClick={() => setTaskAssignee(r)}
                  className="px-2 py-1 rounded text-[10px] font-semibold transition-colors"
                  style={{
                    backgroundColor: taskAssignee === r ? "rgba(99,102,241,0.2)" : "rgba(255,255,255,0.05)",
                    color: taskAssignee === r ? "#a5b4fc" : "rgba(255,255,255,0.4)",
                    border: `1px solid ${taskAssignee === r ? "rgba(99,102,241,0.3)" : "rgba(255,255,255,0.08)"}`,
                  }}>
                  {r}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-3 h-3" style={{ color: "rgba(255,255,255,0.3)" }} />
              <select value={taskDueDays} onChange={e => setTaskDueDays(Number(e.target.value))}
                className="text-[10px] px-2 py-1 rounded border outline-none"
                style={{ backgroundColor: "rgba(255,255,255,0.05)", borderColor: "rgba(255,255,255,0.1)", color: "#e2e8f0", colorScheme: "dark" }}>
                <option value={1}>Due tomorrow</option>
                <option value={3}>Due in 3 days</option>
                <option value={7}>Due in 1 week</option>
                <option value={14}>Due in 2 weeks</option>
              </select>
            </div>
          </div>
          <div className="flex items-center gap-2 pt-1">
            <button onClick={handleCreateTask} disabled={sendingTask || !taskTitle.trim()}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-all disabled:opacity-40"
              style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}>
              {sendingTask ? "Creating..." : "Create Task"}
            </button>
            <button onClick={() => { setShowTaskForm(false); setTaskTitle(""); }}
              className="px-3 py-1.5 text-xs font-medium" style={{ color: "rgba(255,255,255,0.4)" }}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}

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
  const accentColor = isResolved ? "#10b981" : isAcknowledged ? "#ff6a3d" : "#dc2626";

  const handleAcknowledge = async () => {
    setAcknowledging(true);
    try {
      await axios.post(`${API}/director/actions/${escalation.action_id}/acknowledge`, {}, { headers: headers() });
      toast.success("Escalation acknowledged");
      onRefresh?.();
    } catch { toast.error("Failed to acknowledge"); }
    finally { setAcknowledging(false); }
  };

  const handleResolve = async () => {
    setResolving(true);
    try {
      await axios.post(`${API}/director/actions/${escalation.action_id}/resolve`, { note: "Resolved by director" }, { headers: headers() });
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
        escalation_id: escalation.action_id,
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
        escalation_id: escalation.action_id,
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
        className="flex items-center gap-2.5 px-4 py-2.5 rounded-lg cursor-pointer transition-colors"
        style={{ backgroundColor: "#161921", border: "1px solid rgba(255,255,255,0.06)" }}
        onClick={() => isDirector && setExpanded(true)}
        data-testid="escalation-chip"
      >
        <Shield className="w-3.5 h-3.5 shrink-0" style={{ color: accentColor }} />
        <span className="text-[11px] font-semibold" style={{ color: accentColor }}>
          {isResolved ? "Escalation Resolved" : isAcknowledged ? "Escalation Acknowledged" : "Escalated"}
        </span>
        <span className="text-[10px]" style={{ color: "#5c5e6a" }}>
          by {escalation.coach_name || "Coach"} on {formatDate(escalation.created_at)}
        </span>
        {isDirector && <ChevronDown className="w-3 h-3 ml-auto" style={{ color: "#5c5e6a" }} />}
      </div>
    );
  }

  // Full banner mode (director, expanded)
  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ backgroundColor: "#161921", border: `1px solid ${isOpen && !isAcknowledged ? "rgba(220,38,38,0.20)" : "rgba(255,255,255,0.06)"}` }}
      data-testid="escalation-banner"
    >
      {/* Header */}
      <div className="px-5 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${accentColor}12`, border: `1px solid ${accentColor}20` }}>
            <Shield className="w-4 h-4" style={{ color: accentColor }} />
          </div>
          <div>
            <p className="text-[13px] font-bold" style={{ color: "#f0f0f2" }}>
              {isResolved ? "Escalation Resolved" : isAcknowledged ? "Escalation Under Review" : "Escalated Issue"}
            </p>
            <p className="text-[10px]" style={{ color: "#5c5e6a" }}>
              by {escalation.coach_name || "Coach"} &middot; {formatDate(escalation.created_at)}
              {escalation.urgency && <> &middot; <span className="uppercase font-bold text-[9px] tracking-wider" style={{ color: escalation.urgency === "high" ? "#ef4444" : "#f59e0b" }}>{escalation.urgency}</span></>}
            </p>
          </div>
        </div>
        <button onClick={() => setExpanded(false)} className="p-1.5 rounded-lg transition-colors" style={{ border: "1px solid rgba(255,255,255,0.06)" }} data-testid="escalation-minimize">
          <ChevronUp className="w-3.5 h-3.5" style={{ color: "#5c5e6a" }} />
        </button>
      </div>

      {/* Reason */}
      <div className="px-5 py-3.5" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <p className="text-[9px] font-bold uppercase tracking-[0.1em] mb-1.5" style={{ color: "#5c5e6a" }}>Reason</p>
        <p className="text-[13px] font-semibold" style={{ color: "#f0f0f2", lineHeight: 1.4 }}>{escalation.reason_label || escalation.reason || "Coach escalation"}</p>
        {escalation.note && <p className="text-[11.5px] mt-1.5" style={{ color: "#8b8d98", lineHeight: 1.5 }}>{escalation.note}</p>}
      </div>

      {/* Actions */}
      {!isResolved && (
        <div className="px-5 py-3.5 flex flex-wrap gap-2.5" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          {isOpen && !isAcknowledged && (
            <button onClick={handleAcknowledge} disabled={acknowledging}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-[11px] font-bold uppercase tracking-[0.03em] transition-all hover:brightness-110 disabled:opacity-50"
              style={{ backgroundColor: "#ff6a3d", color: "#fff", border: "none", boxShadow: "0 0 16px rgba(255,106,61,0.20)" }}
              data-testid="escalation-acknowledge-btn">
              <CheckCircle2 className="w-3 h-3" />{acknowledging ? "..." : "Acknowledge"}
            </button>
          )}
          <button onClick={() => { setShowNoteForm(!showNoteForm); setShowTaskForm(false); }}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[11px] font-semibold transition-all"
            style={{ backgroundColor: "transparent", color: "#8b8d98", border: "1px solid rgba(255,255,255,0.10)" }}
            data-testid="escalation-add-note-btn">
            <Send className="w-3 h-3" />Add Guidance
          </button>
          <button onClick={() => { setShowTaskForm(!showTaskForm); setShowNoteForm(false); }}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[11px] font-semibold transition-all"
            style={{ backgroundColor: "transparent", color: "#8b8d98", border: "1px solid rgba(255,255,255,0.10)" }}
            data-testid="escalation-add-task-btn">
            <Plus className="w-3 h-3" />Assign Task
          </button>
          <button onClick={handleResolve} disabled={resolving}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[11px] font-bold transition-all hover:brightness-110 disabled:opacity-50"
            style={{ backgroundColor: "rgba(16,185,129,0.10)", color: "#6ee7b7", border: "1px solid rgba(16,185,129,0.18)" }}
            data-testid="escalation-resolve-btn">
            <CheckCircle2 className="w-3 h-3" />{resolving ? "..." : "Resolve"}
          </button>
        </div>
      )}

      {/* Guidance note form */}
      {showNoteForm && (
        <div className="px-5 py-3.5" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }} data-testid="escalation-note-form">
          <textarea
            autoFocus value={noteText} onChange={e => setNoteText(e.target.value)}
            placeholder="Add guidance for the coach..."
            className="w-full px-3 py-2.5 rounded-lg text-[12px] resize-none outline-none focus:ring-1 focus:ring-orange-500/30"
            style={{ backgroundColor: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#f0f0f2", minHeight: 60 }}
            rows={2}
          />
          <div className="flex items-center gap-2 mt-2.5">
            <button onClick={handleAddNote} disabled={sendingNote || !noteText.trim()}
              className="px-4 py-2 rounded-lg text-[11px] font-bold uppercase tracking-[0.03em] text-white transition-all disabled:opacity-40"
              style={{ background: "#ff6a3d", boxShadow: "0 0 12px rgba(255,106,61,0.15)" }}>
              {sendingNote ? "Sending..." : "Add Note"}
            </button>
            <button onClick={() => { setShowNoteForm(false); setNoteText(""); }}
              className="px-3 py-2 text-[11px] font-medium" style={{ color: "#5c5e6a" }}>Cancel</button>
          </div>
        </div>
      )}

      {/* Intervention task form */}
      {showTaskForm && (
        <div className="px-5 py-3.5 space-y-2.5" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }} data-testid="escalation-task-form">
          <input
            autoFocus value={taskTitle} onChange={e => setTaskTitle(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleCreateTask()}
            placeholder="Coach follow-up required by Friday..."
            className="w-full px-3 py-2.5 rounded-lg text-[12px] outline-none focus:ring-1 focus:ring-orange-500/30"
            style={{ backgroundColor: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#f0f0f2" }}
          />
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-bold uppercase tracking-[0.1em]" style={{ color: "#5c5e6a" }}>Assign to</span>
              {["Coach", "Athlete", "Director"].map(r => (
                <button key={r} onClick={() => setTaskAssignee(r)}
                  className="px-2.5 py-1 rounded-md text-[10px] font-semibold transition-colors"
                  style={{
                    backgroundColor: taskAssignee === r ? "rgba(255,106,61,0.12)" : "rgba(255,255,255,0.04)",
                    color: taskAssignee === r ? "#ff6a3d" : "#5c5e6a",
                    border: `1px solid ${taskAssignee === r ? "rgba(255,106,61,0.20)" : "rgba(255,255,255,0.06)"}`,
                  }}>
                  {r}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-3 h-3" style={{ color: "#5c5e6a" }} />
              <select value={taskDueDays} onChange={e => setTaskDueDays(Number(e.target.value))}
                className="text-[10px] px-2.5 py-1 rounded-md outline-none"
                style={{ backgroundColor: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#8b8d98", colorScheme: "dark" }}>
                <option value={1}>Due tomorrow</option>
                <option value={3}>Due in 3 days</option>
                <option value={7}>Due in 1 week</option>
                <option value={14}>Due in 2 weeks</option>
              </select>
            </div>
          </div>
          <div className="flex items-center gap-2 pt-1">
            <button onClick={handleCreateTask} disabled={sendingTask || !taskTitle.trim()}
              className="px-4 py-2 rounded-lg text-[11px] font-bold uppercase tracking-[0.03em] text-white transition-all disabled:opacity-40"
              style={{ background: "#ff6a3d", boxShadow: "0 0 12px rgba(255,106,61,0.15)" }}>
              {sendingTask ? "Creating..." : "Create Task"}
            </button>
            <button onClick={() => { setShowTaskForm(false); setTaskTitle(""); }}
              className="px-3 py-2 text-[11px] font-medium" style={{ color: "#5c5e6a" }}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}

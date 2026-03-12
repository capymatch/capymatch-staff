import { useState, useMemo } from "react";
import {
  Circle, CheckCircle2, Plus, Clock, ChevronDown, ChevronUp,
  User, Zap, ArrowUpRight, X as XIcon, Loader2, Ban,
} from "lucide-react";
import { AddActionModal } from "./AddActionModal";
import axios from "axios";
import { toast } from "sonner";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const STATUS_STYLE = {
  completed: { color: "#10b981", bg: "rgba(16,185,129,0.06)" },
  escalated: { color: "#f59e0b", bg: "rgba(245,158,11,0.06)" },
  cancelled: { color: "#6b7280", bg: "rgba(107,114,128,0.06)" },
};

/* ─── Escalate Task Modal ─────────────────────────────────────────────── */

function EscalateTaskModal({ task, athleteId, onClose, onEscalated }) {
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!reason.trim()) { toast.error("Please provide a reason"); return; }
    setSubmitting(true);
    try {
      await axios.post(`${API}/support-pods/${athleteId}/actions/${task.id}/escalate`, { reason: reason.trim() });
      toast.success("Escalated to director");
      onEscalated?.();
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Failed to escalate");
    } finally { setSubmitting(false); }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(8px)" }}
      data-testid="escalate-task-modal-overlay">
      <div className="w-full max-w-md rounded-2xl overflow-hidden shadow-2xl"
        style={{ backgroundColor: "var(--cm-surface)", border: "1px solid var(--cm-border)" }}>
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: "rgba(245,158,11,0.1)" }}>
              <ArrowUpRight className="w-4 h-4 text-amber-500" />
            </div>
            <div>
              <h3 className="text-sm font-bold" style={{ color: "var(--cm-text)" }}>Escalate to Director</h3>
              <p className="text-[11px]" style={{ color: "var(--cm-text-3)" }}>This will create a director action item</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/5" data-testid="escalate-close-btn">
            <XIcon className="w-4 h-4" style={{ color: "var(--cm-text-3)" }} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-5 pb-5">
          <div className="rounded-lg p-3 mb-4" style={{ backgroundColor: "var(--cm-surface-2)" }}>
            <p className="text-[10px] font-bold uppercase tracking-wider mb-0.5" style={{ color: "var(--cm-text-3)" }}>Task</p>
            <p className="text-sm font-medium" style={{ color: "var(--cm-text)" }}>{task.title}</p>
          </div>

          <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--cm-text-2)" }}>
            Why are you escalating?
          </label>
          <textarea value={reason} onChange={(e) => setReason(e.target.value)}
            rows={3} required placeholder="e.g., Need director input on next steps..."
            className="w-full px-3 py-2 rounded-lg text-sm border focus:outline-none resize-none"
            style={{ backgroundColor: "var(--cm-input-bg)", borderColor: "var(--cm-border)", color: "var(--cm-text)" }}
            data-testid="escalate-reason-input" />

          <div className="flex items-center gap-2 mt-4">
            <button type="submit" disabled={submitting || !reason.trim()}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-white transition-all disabled:opacity-40"
              style={{ backgroundColor: "#d97706" }}
              data-testid="escalate-submit-btn">
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowUpRight className="w-4 h-4" />}
              Escalate
            </button>
            <button type="button" onClick={onClose}
              className="px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
              style={{ color: "var(--cm-text-3)", border: "1px solid var(--cm-border)" }}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ─── Main NextActions ────────────────────────────────────────────────── */

function NextActions({ actions, athleteId, podMembers, currentUser, onRefresh }) {
  const [showModal, setShowModal] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);
  const [completing, setCompleting] = useState(null);
  const [cancelling, setCancelling] = useState(null);
  const [escalateTask, setEscalateTask] = useState(null);

  const activeActions = useMemo(() => {
    if (!actions) return [];
    return actions
      .filter(a => a.status !== "completed" && a.status !== "escalated" && a.status !== "cancelled")
      .sort((a, b) => {
        const ov = (x) => x.status === "overdue" ? 0 : 1;
        if (ov(a) !== ov(b)) return ov(a) - ov(b);
        if (a.due_date && b.due_date) return new Date(a.due_date) - new Date(b.due_date);
        return 0;
      });
  }, [actions]);

  const doneActions = useMemo(() => {
    if (!actions) return [];
    return actions
      .filter(a => a.status === "completed" || a.status === "escalated" || a.status === "cancelled")
      .sort((a, b) => new Date(b.completed_at || b.escalated_at || b.cancelled_at || 0) - new Date(a.completed_at || a.escalated_at || a.cancelled_at || 0))
      .slice(0, 10);
  }, [actions]);

  const visible = showAll ? activeActions : activeActions.slice(0, 5);
  const hasMore = activeActions.length > 5;

  const handleComplete = async (actionId) => {
    setCompleting(actionId);
    try {
      await axios.patch(`${API}/support-pods/${athleteId}/actions/${actionId}`, { status: "completed" });
      toast.success("Task completed");
      onRefresh?.();
    } catch {
      toast.error("Failed to complete task");
    } finally { setCompleting(null); }
  };

  const handleCancel = async (actionId) => {
    setCancelling(actionId);
    try {
      await axios.patch(`${API}/support-pods/${athleteId}/actions/${actionId}`, { status: "cancelled" });
      toast.success("Task cancelled");
      onRefresh?.();
    } catch {
      toast.error("Failed to cancel task");
    } finally { setCancelling(null); }
  };

  const formatDue = (dateStr) => {
    if (!dateStr) return null;
    const due = new Date(dateStr);
    const now = new Date();
    const diff = Math.ceil((due - now) / 86400000);
    if (diff < 0) return { label: `${Math.abs(diff)}d overdue`, overdue: true };
    if (diff === 0) return { label: "Today", overdue: false };
    if (diff === 1) return { label: "Tomorrow", overdue: false };
    return { label: `${diff}d`, overdue: false };
  };

  const isSystem = (action) => action.is_suggested || action.source === "system" || action.source === "intervention";

  return (
    <div data-testid="next-actions">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <h3 className="text-[11px] font-bold uppercase tracking-widest" style={{ color: "var(--cm-text-3, #94a3b8)" }}>
            Next Actions
          </h3>
          {activeActions.length > 0 && (
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded" style={{ backgroundColor: "rgba(13,148,136,0.08)", color: "#0d9488" }}>
              {activeActions.length}
            </span>
          )}
        </div>
        <button onClick={() => setShowModal(true)}
          className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold transition-colors"
          style={{ color: "#0d9488", backgroundColor: "rgba(13,148,136,0.06)", border: "1px solid rgba(13,148,136,0.15)" }}
          data-testid="add-action-btn">
          <Plus className="w-3 h-3" /> Add Task
        </button>
      </div>

      {/* Active actions */}
      <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: "var(--cm-surface, white)", borderColor: "var(--cm-border, #e2e8f0)" }}>
        {visible.length === 0 && (
          <div className="px-5 py-8 text-center">
            <p className="text-sm" style={{ color: "var(--cm-text-3, #94a3b8)" }}>No active tasks</p>
            <p className="text-xs mt-1" style={{ color: "var(--cm-text-3, #94a3b8)" }}>System recommendations and coach tasks will appear here</p>
          </div>
        )}

        {visible.map((action, idx) => {
          const due = formatDue(action.due_date);
          const isOverdue = action.status === "overdue" || due?.overdue;
          const isCompleting = completing === action.id;
          const system = isSystem(action);

          return (
            <div key={action.id}
              className="flex items-start gap-3 px-4 py-3 transition-colors hover:bg-white/3 group"
              style={{ borderBottom: idx < visible.length - 1 ? "1px solid var(--cm-border, #f1f5f9)" : "none" }}
              data-testid={`action-item-${action.id}`}>
              {/* Complete circle */}
              <button onClick={() => handleComplete(action.id)} disabled={isCompleting}
                className="mt-0.5 shrink-0" data-testid={`complete-action-${action.id}`}>
                {isCompleting
                  ? <div className="w-5 h-5 rounded-full border-2 animate-pulse" style={{ borderColor: "var(--cm-border, #e2e8f0)" }} />
                  : <Circle className="w-5 h-5 transition-colors hover:text-emerald-400" style={{ color: isOverdue ? "#fca5a5" : "var(--cm-border, #d1d5db)" }} />}
              </button>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <p className="text-sm font-medium leading-snug" style={{ color: "var(--cm-text, #1e293b)" }}>{action.title}</p>
                  {system ? (
                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider"
                      style={{ backgroundColor: "rgba(139,92,246,0.08)", color: "#8b5cf6" }}>
                      <Zap className="w-2.5 h-2.5" /> System
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider"
                      style={{ backgroundColor: "rgba(13,148,136,0.08)", color: "#0d9488" }}>
                      <User className="w-2.5 h-2.5" /> Coach
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-1 text-[11px]" style={{ color: "var(--cm-text-3, #94a3b8)" }}>
                  {action.owner && action.owner !== "Unassigned" && (
                    <span className="flex items-center gap-1"><User className="w-3 h-3" />{action.owner}</span>
                  )}
                  {action.owner === "Unassigned" && (
                    <span className="flex items-center gap-1 font-medium" style={{ color: "#f59e0b" }}><User className="w-3 h-3" />Unassigned</span>
                  )}
                  {due && (
                    <>
                      <span style={{ color: "var(--cm-border, #d1d5db)" }}>&middot;</span>
                      <span className={`flex items-center gap-1 ${isOverdue ? "font-semibold" : ""}`} style={{ color: isOverdue ? "#ef4444" : undefined }}>
                        <Clock className="w-3 h-3" />{due.label}
                      </span>
                    </>
                  )}
                  {action.source_category && (
                    <>
                      <span style={{ color: "var(--cm-border, #d1d5db)" }}>&middot;</span>
                      <span className="capitalize">{action.source_category.replace(/_/g, " ")}</span>
                    </>
                  )}
                </div>
              </div>

              {/* Row actions: escalate + cancel */}
              <div className="flex items-center gap-1 shrink-0 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                <button onClick={() => setEscalateTask(action)} title="Escalate to director"
                  className="p-1.5 rounded-lg transition-colors hover:bg-amber-500/10"
                  style={{ color: "var(--cm-text-3, #94a3b8)" }}
                  data-testid={`escalate-action-${action.id}`}>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => handleCancel(action.id)} disabled={cancelling === action.id} title="Cancel task"
                  className="p-1.5 rounded-lg transition-colors hover:bg-red-500/10"
                  style={{ color: "var(--cm-text-3, #94a3b8)" }}
                  data-testid={`cancel-action-${action.id}`}>
                  {cancelling === action.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <XIcon className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          );
        })}

        {/* See all toggle */}
        {hasMore && (
          <button onClick={() => setShowAll(!showAll)}
            className="w-full flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-colors hover:bg-white/3"
            style={{ color: "var(--cm-text-3, #94a3b8)", borderTop: "1px solid var(--cm-border, #f1f5f9)" }}
            data-testid="toggle-all-actions">
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showAll ? "rotate-180" : ""}`} />
            {showAll ? "Show less" : `See all ${activeActions.length} actions`}
          </button>
        )}
      </div>

      {/* ── Completed / Escalated / Cancelled ── */}
      {doneActions.length > 0 && (
        <div className="mt-3">
          <button onClick={() => setShowCompleted(!showCompleted)}
            className="flex items-center gap-2 mb-2" data-testid="toggle-completed-actions">
            <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--cm-text-3, #94a3b8)" }}>
              Completed & Resolved
            </span>
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded" style={{ backgroundColor: "rgba(16,185,129,0.06)", color: "#10b981" }}>
              {doneActions.length}
            </span>
            {showCompleted ? <ChevronUp className="w-3 h-3" style={{ color: "var(--cm-text-3)" }} /> : <ChevronDown className="w-3 h-3" style={{ color: "var(--cm-text-3)" }} />}
          </button>

          {showCompleted && (
            <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: "var(--cm-surface, white)", borderColor: "var(--cm-border, #e2e8f0)" }}>
              {doneActions.map((action, idx) => {
                const ss = STATUS_STYLE[action.status] || STATUS_STYLE.completed;
                return (
                  <div key={action.id}
                    className="flex items-start gap-3 px-4 py-2.5"
                    style={{ borderBottom: idx < doneActions.length - 1 ? "1px solid var(--cm-border, #f1f5f9)" : "none", backgroundColor: ss.bg }}
                    data-testid={`done-action-${action.id}`}>
                    {action.status === "completed" && <CheckCircle2 className="w-4.5 h-4.5 mt-0.5 shrink-0" style={{ color: ss.color }} />}
                    {action.status === "escalated" && <ArrowUpRight className="w-4.5 h-4.5 mt-0.5 shrink-0" style={{ color: ss.color }} />}
                    {action.status === "cancelled" && <Ban className="w-4.5 h-4.5 mt-0.5 shrink-0" style={{ color: ss.color }} />}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm line-through opacity-70" style={{ color: "var(--cm-text, #1e293b)" }}>{action.title}</p>
                      <p className="text-[10px] mt-0.5" style={{ color: "var(--cm-text-3, #94a3b8)" }}>
                        {action.status === "completed" && (
                          <>{action.completed_by || "Coach"} &middot; {action.completed_at ? new Date(action.completed_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : ""}</>
                        )}
                        {action.status === "escalated" && (
                          <>Escalated by {action.escalated_by || "Coach"} &middot; {action.escalated_at ? new Date(action.escalated_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : ""}</>
                        )}
                        {action.status === "cancelled" && (
                          <>Cancelled by {action.cancelled_by || "Coach"} &middot; {action.cancelled_at ? new Date(action.cancelled_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : ""}</>
                        )}
                      </p>
                    </div>
                    <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded shrink-0"
                      style={{ backgroundColor: ss.bg, color: ss.color }}>
                      {action.status}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      {showModal && (
        <AddActionModal athleteId={athleteId} podMembers={podMembers} currentUser={currentUser}
          onCancel={() => setShowModal(false)} onCreated={() => { setShowModal(false); onRefresh?.(); }} />
      )}
      {escalateTask && (
        <EscalateTaskModal task={escalateTask} athleteId={athleteId}
          onClose={() => setEscalateTask(null)}
          onEscalated={() => { setEscalateTask(null); onRefresh?.(); }} />
      )}
    </div>
  );
}

export default NextActions;

import { useState, useMemo } from "react";
import { Circle, CheckCircle2, Plus, Clock, ChevronDown, User, Zap } from "lucide-react";
import { AddActionModal } from "./AddActionModal";
import axios from "axios";
import { toast } from "sonner";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

function NextActions({ actions, athleteId, podMembers, currentUser, onRefresh }) {
  const [showModal, setShowModal] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [completing, setCompleting] = useState(null);

  const activeActions = useMemo(() => {
    if (!actions) return [];
    return actions
      .filter(a => a.status !== "completed")
      .sort((a, b) => {
        const ov = (x) => x.status === "overdue" ? 0 : 1;
        if (ov(a) !== ov(b)) return ov(a) - ov(b);
        if (a.due_date && b.due_date) return new Date(a.due_date) - new Date(b.due_date);
        return 0;
      });
  }, [actions]);

  const visible = showAll ? activeActions : activeActions.slice(0, 5);
  const hasMore = activeActions.length > 5;

  const handleComplete = async (actionId) => {
    setCompleting(actionId);
    try {
      await axios.patch(`${API}/support-pods/${athleteId}/actions/${actionId}`, { status: "completed" });
      toast.success("Action completed");
      onRefresh?.();
    } catch {
      toast.error("Failed to complete action");
    } finally {
      setCompleting(null);
    }
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
      {/* Section header */}
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
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold transition-colors"
          style={{ color: "#0d9488", backgroundColor: "rgba(13,148,136,0.06)", border: "1px solid rgba(13,148,136,0.15)" }}
          data-testid="add-action-btn"
        >
          <Plus className="w-3 h-3" />
          Add Task
        </button>
      </div>

      {/* Action list */}
      <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: "var(--cm-surface, white)", borderColor: "var(--cm-border, #e2e8f0)" }}>
        {visible.length === 0 && (
          <div className="px-5 py-8 text-center">
            <p className="text-sm" style={{ color: "var(--cm-text-3, #94a3b8)" }}>No actions yet</p>
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
              className="flex items-start gap-3 px-4 py-3 transition-colors hover:bg-white/3"
              style={{ borderBottom: idx < visible.length - 1 ? "1px solid var(--cm-border, #f1f5f9)" : "none" }}
              data-testid={`action-item-${action.id}`}>

              {/* Complete circle */}
              <button
                onClick={() => handleComplete(action.id)}
                disabled={isCompleting}
                className="mt-0.5 shrink-0"
                data-testid={`complete-action-${action.id}`}
              >
                {isCompleting ? (
                  <div className="w-5 h-5 rounded-full border-2 animate-pulse" style={{ borderColor: "var(--cm-border, #e2e8f0)" }} />
                ) : (
                  <Circle className="w-5 h-5 transition-colors hover:text-emerald-400"
                    style={{ color: isOverdue ? "#fca5a5" : "var(--cm-border, #d1d5db)" }} />
                )}
              </button>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <p className="text-sm font-medium leading-snug" style={{ color: "var(--cm-text, #1e293b)" }}>
                    {action.title}
                  </p>
                  {/* Source badge */}
                  {system ? (
                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider"
                      style={{ backgroundColor: "rgba(139,92,246,0.08)", color: "#8b5cf6" }}
                      data-testid={`action-source-${action.id}`}>
                      <Zap className="w-2.5 h-2.5" /> System
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider"
                      style={{ backgroundColor: "rgba(13,148,136,0.08)", color: "#0d9488" }}
                      data-testid={`action-source-${action.id}`}>
                      <User className="w-2.5 h-2.5" /> Coach
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-1 text-[11px]" style={{ color: "var(--cm-text-3, #94a3b8)" }}>
                  {action.owner && action.owner !== "Unassigned" && (
                    <span className="flex items-center gap-1">
                      <User className="w-3 h-3" />
                      {action.owner}
                    </span>
                  )}
                  {action.owner && action.owner === "Unassigned" && (
                    <span className="flex items-center gap-1 font-medium" style={{ color: "#f59e0b" }}>
                      <User className="w-3 h-3" />
                      Unassigned
                    </span>
                  )}
                  {due && (
                    <>
                      <span style={{ color: "var(--cm-border, #d1d5db)" }}>&middot;</span>
                      <span className={`flex items-center gap-1 ${isOverdue ? "font-semibold" : ""}`}
                        style={{ color: isOverdue ? "#ef4444" : undefined }}>
                        <Clock className="w-3 h-3" />
                        {due.label}
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
            </div>
          );
        })}

        {/* See all / collapse */}
        {hasMore && (
          <button
            onClick={() => setShowAll(!showAll)}
            className="w-full flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-colors hover:bg-white/3"
            style={{ color: "var(--cm-text-3, #94a3b8)", borderTop: "1px solid var(--cm-border, #f1f5f9)" }}
            data-testid="toggle-all-actions"
          >
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showAll ? "rotate-180" : ""}`} />
            {showAll ? "Show less" : `See all ${activeActions.length} actions`}
          </button>
        )}
      </div>

      {/* Add Action Modal */}
      {showModal && (
        <AddActionModal
          athleteId={athleteId}
          podMembers={podMembers}
          currentUser={currentUser}
          onCancel={() => setShowModal(false)}
          onCreated={() => { setShowModal(false); onRefresh?.(); }}
        />
      )}
    </div>
  );
}

export default NextActions;

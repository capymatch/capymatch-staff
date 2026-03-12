import { useState, useMemo } from "react";
import { Circle, CheckCircle2, Plus, Clock, ChevronDown, User } from "lucide-react";
import { AddActionModal } from "./AddActionModal";

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

  const completedActions = useMemo(() => {
    if (!actions) return [];
    return actions.filter(a => a.status === "completed").slice(0, 5);
  }, [actions]);

  const visible = showAll ? activeActions : activeActions.slice(0, 3);
  const hasMore = activeActions.length > 3;

  const handleComplete = async (actionId) => {
    setCompleting(actionId);
    try {
      await fetch(`${API}/support-pods/${athleteId}/actions/${actionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "completed" }),
      });
      onRefresh?.();
    } catch { /* silently fail */ }
    finally { setCompleting(null); }
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

  return (
    <div data-testid="next-actions">
      {/* Section header */}
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400">
          Next Actions
        </h3>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-700 transition-colors"
          data-testid="add-action-btn"
        >
          <Plus className="w-3.5 h-3.5" />
          Add
        </button>
      </div>

      {/* Action list */}
      <div className="rounded-2xl border border-slate-100 bg-white divide-y divide-slate-50 overflow-hidden">
        {visible.length === 0 && (
          <div className="px-5 py-8 text-center">
            <p className="text-sm text-slate-400">No actions yet</p>
          </div>
        )}

        {visible.map((action) => {
          const due = formatDue(action.due_date);
          const isOverdue = action.status === "overdue" || due?.overdue;
          const isCompleting = completing === action.id;

          return (
            <div key={action.id} className="flex items-start gap-3 px-4 py-3" data-testid={`action-item-${action.id}`}>
              <button
                onClick={() => handleComplete(action.id)}
                disabled={isCompleting}
                className="mt-0.5 shrink-0"
                data-testid={`complete-action-${action.id}`}
              >
                {isCompleting ? (
                  <div className="w-5 h-5 rounded-full border-2 border-slate-200 animate-pulse" />
                ) : (
                  <Circle className={`w-5 h-5 ${isOverdue ? "text-red-300" : "text-slate-200"} hover:text-emerald-400 transition-colors`} />
                )}
              </button>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-800 leading-snug">
                  {action.title}
                </p>
                <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-400">
                  {action.owner && action.owner !== "Unassigned" && (
                    <span className="flex items-center gap-1">
                      <User className="w-3 h-3" />
                      {action.owner}
                    </span>
                  )}
                  {due && (
                    <>
                      <span>·</span>
                      <span className={`flex items-center gap-1 ${isOverdue ? "text-red-500 font-semibold" : ""}`}>
                        <Clock className="w-3 h-3" />
                        {due.label}
                      </span>
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
            className="w-full flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium text-slate-400 hover:text-slate-600 transition-colors"
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

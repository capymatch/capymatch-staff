import { useState, useMemo } from "react";
import { Check, Plus, UserPlus, Clock, ShieldAlert, Zap, AlertTriangle, Users, Target, ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import axios from "axios";
import { AddActionModal } from "./AddActionModal";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const CATEGORY_ICONS = {
  momentum_drop: Zap,
  blocker: ShieldAlert,
  deadline_proximity: Clock,
  engagement_drop: AlertTriangle,
  ownership_gap: Users,
  readiness_issue: Target,
  follow_up: Clock,
  check_in: Users,
  coach_response: AlertTriangle,
};

const PRIORITY_COLORS = {
  1: { bg: "rgba(239,68,68,0.08)", border: "rgba(239,68,68,0.2)", badge: "#ef4444" },
  2: { bg: "rgba(245,158,11,0.06)", border: "rgba(245,158,11,0.15)", badge: "#f59e0b" },
  3: { bg: "rgba(59,130,246,0.06)", border: "rgba(59,130,246,0.15)", badge: "#3b82f6" },
};

function NextActions({ actions, athleteId, podMembers, currentUser, onRefresh }) {
  const [showModal, setShowModal] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [reassigningId, setReassigningId] = useState(null);

  const now = new Date();
  const enriched = (actions || []).map((a) => {
    if (a.status === "completed") return a;
    if (a.due_date && new Date(a.due_date) < now && a.status !== "overdue") {
      return { ...a, status: "overdue" };
    }
    return a;
  });

  const active = enriched.filter(a => a.status !== "completed");
  const completed = enriched.filter(a => a.status === "completed");

  const sorted = useMemo(() => {
    return [...active].sort((a, b) => {
      const statusOrder = { overdue: 0, ready: 1, in_progress: 1, blocked: 1 };
      const sa = statusOrder[a.status] ?? 2;
      const sb = statusOrder[b.status] ?? 2;
      if (sa !== sb) return sa - sb;
      const da = a.due_date ? new Date(a.due_date).getTime() : Infinity;
      const db = b.due_date ? new Date(b.due_date).getTime() : Infinity;
      return da - db;
    });
  }, [active]);

  const top3 = sorted.slice(0, 3);
  const rest = sorted.slice(3);

  // Build reassign options from pod members
  const reassignOptions = useMemo(() => {
    if (!podMembers || podMembers.length === 0) return [];
    return podMembers.map(m => ({ name: m.name, role: m.role_label || m.role }));
  }, [podMembers]);

  const handleComplete = async (action) => {
    try {
      await axios.patch(`${API}/support-pods/${athleteId}/actions/${action.id}`, { status: "completed" });
      toast.success("Action completed");
      onRefresh?.();
    } catch {
      toast.error("Failed to complete");
    }
  };

  const handleReassign = async (actionId, owner) => {
    try {
      await axios.patch(`${API}/support-pods/${athleteId}/actions/${actionId}`, { owner });
      toast.success(`Reassigned to ${owner}`);
      setReassigningId(null);
      onRefresh?.();
    } catch {
      toast.error("Failed to reassign");
    }
  };

  const renderAction = (action, rank = null) => {
    const SourceIcon = CATEGORY_ICONS[action.source_category];
    const isOverdue = action.status === "overdue";
    const colors = rank ? PRIORITY_COLORS[rank] || {} : {};

    return (
      <div
        key={action.id}
        className="flex items-start gap-3 px-4 py-3 group rounded-lg transition-colors"
        style={rank ? { backgroundColor: colors.bg, border: `1px solid ${colors.border}`, marginBottom: 8 } : { borderBottom: "1px solid var(--cm-border, #f1f5f9)" }}
        data-testid={`action-item-${action.id}`}
      >
        {rank ? (
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold text-white shrink-0"
              style={{ backgroundColor: colors.badge }}>
              {rank}
            </span>
            <button onClick={() => handleComplete(action)}
              className="mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors shrink-0 hover:border-emerald-500 hover:bg-emerald-50"
              style={{ borderColor: isOverdue ? "#ef4444" : "var(--cm-border, #e2e8f0)" }}
              data-testid={`complete-action-${action.id}`}>
              <Check className="w-3 h-3 text-transparent group-hover:text-emerald-500 transition-colors" />
            </button>
          </div>
        ) : (
          <button onClick={() => handleComplete(action)}
            className="mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors shrink-0 hover:border-emerald-500 hover:bg-emerald-50"
            style={{ borderColor: isOverdue ? "#ef4444" : "var(--cm-border, #e2e8f0)" }}
            data-testid={`complete-action-${action.id}`}>
            <Check className="w-3 h-3 text-transparent group-hover:text-emerald-500 transition-colors" />
          </button>
        )}

        <div className="flex-1 min-w-0">
          <p className={`text-sm leading-snug ${rank ? "font-medium" : ""}`} style={{ color: "var(--cm-text, #1e293b)" }}>{action.title}</p>
          <div className="flex items-center gap-2 mt-1 text-xs flex-wrap" style={{ color: "var(--cm-text-3, #94a3b8)" }}>
            <span className="font-medium" style={{ color: "var(--cm-text-2, #64748b)" }}>{action.owner || "Unassigned"}</span>
            {action.due_date && (
              <>
                <span>·</span>
                <span className={isOverdue ? "text-red-500 font-semibold" : ""}>
                  {isOverdue ? "Overdue: " : "Due: "}
                  {new Date(action.due_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </span>
              </>
            )}
            {SourceIcon && (
              <>
                <span>·</span>
                <span className="flex items-center gap-0.5">
                  <SourceIcon className="w-3 h-3" />
                  {action.source_category?.replace(/_/g, " ")}
                </span>
              </>
            )}
          </div>
        </div>

        {reassigningId === action.id ? (
          <div className="flex flex-col gap-1 min-w-[140px]">
            {reassignOptions.filter(o => o.name !== action.owner).map(o => (
              <button key={o.name} onClick={() => handleReassign(action.id, o.name)}
                className="text-left text-xs px-2 py-1 rounded hover:bg-primary/5 hover:text-primary transition-colors"
                style={{ backgroundColor: "var(--cm-surface-2, #f1f5f9)" }}>
                {o.name} <span className="text-[10px] opacity-60">— {o.role}</span>
              </button>
            ))}
            <button onClick={() => setReassigningId(null)} className="text-xs px-2 mt-0.5" style={{ color: "var(--cm-text-3, #94a3b8)" }}>Cancel</button>
          </div>
        ) : (
          <Button size="sm" variant="ghost"
            className="text-xs p-1 h-auto opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ color: "var(--cm-text-3, #94a3b8)" }}
            onClick={() => setReassigningId(action.id)}
            data-testid={`reassign-${action.id}`}>
            <UserPlus className="w-3.5 h-3.5" />
          </Button>
        )}
      </div>
    );
  };

  return (
    <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: "var(--cm-surface, #fff)", borderColor: "var(--cm-border, #f1f5f9)" }} data-testid="next-actions">
      <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "1px solid var(--cm-border, #f1f5f9)" }}>
        <div className="flex items-center gap-2.5">
          <h3 className="text-[11px] font-bold uppercase tracking-widest" style={{ color: "var(--cm-text-3, #94a3b8)" }}>Next Actions</h3>
          <span className="text-xs font-medium" style={{ color: "var(--cm-text-3, #94a3b8)" }}>
            {active.length} active
            {sorted.filter(a => a.status === "overdue").length > 0 && (
              <span className="text-red-500 font-semibold"> · {sorted.filter(a => a.status === "overdue").length} overdue</span>
            )}
          </span>
        </div>
        <Button size="sm" variant="outline" className="rounded-full text-xs gap-1" onClick={() => setShowModal(true)} data-testid="add-action-btn">
          <Plus className="w-3.5 h-3.5" /> Add
        </Button>
      </div>

      {/* Top 3 priority actions */}
      {top3.length > 0 && (
        <div className="px-4 pt-4 pb-2">
          {top3.map((action, idx) => renderAction(action, idx + 1))}
        </div>
      )}

      {/* Remaining actions - collapsible */}
      {rest.length > 0 && (
        <>
          <button onClick={() => setShowAll(!showAll)}
            className="w-full flex items-center justify-between px-5 py-2.5 hover:bg-slate-50/50 transition-colors"
            style={{ borderTop: "1px solid var(--cm-border, #f1f5f9)" }}
            data-testid="show-all-actions">
            <span className="text-xs font-medium" style={{ color: "var(--cm-text-3, #94a3b8)" }}>
              {showAll ? "Hide" : "Show"} {rest.length} more action{rest.length > 1 ? "s" : ""}
            </span>
            {showAll ? <ChevronDown className="w-3.5 h-3.5" style={{ color: "var(--cm-text-3, #94a3b8)" }} /> : <ChevronRight className="w-3.5 h-3.5" style={{ color: "var(--cm-text-3, #94a3b8)" }} />}
          </button>
          {showAll && <div>{rest.map(action => renderAction(action))}</div>}
        </>
      )}

      {/* Completed */}
      {completed.length > 0 && (
        <details className="border-t" style={{ borderColor: "var(--cm-border, #f1f5f9)" }}>
          <summary className="px-5 py-3 text-xs cursor-pointer hover:bg-slate-50/50 list-none flex items-center gap-1" style={{ color: "var(--cm-text-3, #94a3b8)" }}>
            <ChevronRight className="w-3 h-3" />
            {completed.length} completed
          </summary>
          <div className="px-5 pb-3 space-y-1.5">
            {completed.map(a => (
              <div key={a.id} className="flex items-center gap-2 text-xs" style={{ color: "var(--cm-text-3, #94a3b8)" }}>
                <Check className="w-3 h-3 text-emerald-500" />
                <span className="line-through">{a.title}</span>
              </div>
            ))}
          </div>
        </details>
      )}

      {active.length === 0 && (
        <div className="px-5 py-8 text-center">
          <p className="text-sm" style={{ color: "var(--cm-text-3, #94a3b8)" }}>No active actions.</p>
          <button onClick={() => setShowModal(true)} className="text-xs text-teal-600 font-medium mt-1 hover:underline">Create one</button>
        </div>
      )}

      {/* Add Action Modal */}
      {showModal && (
        <AddActionModal
          athleteId={athleteId}
          podMembers={podMembers}
          currentUser={currentUser}
          onCreated={() => { setShowModal(false); onRefresh?.(); }}
          onCancel={() => setShowModal(false)}
        />
      )}
    </div>
  );
}

export default NextActions;

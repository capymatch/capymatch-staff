import { useState } from "react";
import { Check, Plus, UserPlus, Clock, ShieldAlert, Zap, AlertTriangle, Users, Target, ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const CATEGORY_ICONS = {
  momentum_drop: Zap,
  blocker: ShieldAlert,
  deadline_proximity: Clock,
  engagement_drop: AlertTriangle,
  ownership_gap: Users,
  readiness_issue: Target,
};

const OWNERS = ["Coach Martinez", "Parent/Guardian", "Athlete", "Assistant Coach Davis", "Academic Advisor"];

const STATUS_GROUP = {
  overdue: { label: "Overdue", color: "#ef4444", bg: "rgba(239,68,68,0.06)", dotClass: "bg-red-500" },
  ready: { label: "Ready", color: "#3b82f6", bg: "rgba(59,130,246,0.04)", dotClass: "bg-blue-400" },
  upcoming: { label: "Upcoming", color: "#8b5cf6", bg: "rgba(139,92,246,0.04)", dotClass: "bg-purple-400" },
};

function NextActions({ actions, athleteId, onRefresh }) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newOwner, setNewOwner] = useState("Coach Martinez");
  const [reassigningId, setReassigningId] = useState(null);
  const [saving, setSaving] = useState(false);

  const now = new Date();
  const enriched = (actions || []).map((a) => {
    if (a.status === "completed") return a;
    if (a.due_date && new Date(a.due_date) < now && a.status !== "overdue") {
      return { ...a, status: "overdue" };
    }
    return a;
  });

  // Group by status: overdue, ready, upcoming
  const overdue = enriched.filter(a => a.status === "overdue");
  const ready = enriched.filter(a => a.status === "ready" || a.status === "in_progress" || a.status === "blocked");
  const upcoming = enriched.filter(a => a.status !== "completed" && a.status !== "overdue" && a.status !== "ready" && a.status !== "in_progress" && a.status !== "blocked" && a.due_date && new Date(a.due_date) > now);
  const completed = enriched.filter(a => a.status === "completed");

  // Combine any that didn't fit into a group
  const ungrouped = enriched.filter(a =>
    a.status !== "completed" &&
    !overdue.includes(a) && !ready.includes(a) && !upcoming.includes(a)
  );
  if (ungrouped.length > 0) ready.push(...ungrouped);

  const groups = [
    { key: "overdue", items: overdue },
    { key: "ready", items: ready },
    { key: "upcoming", items: upcoming },
  ].filter(g => g.items.length > 0);

  const activeCount = enriched.filter(a => a.status !== "completed").length;

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

  const handleAddAction = async () => {
    if (!newTitle.trim()) return;
    setSaving(true);
    try {
      await axios.post(`${API}/support-pods/${athleteId}/actions`, {
        title: newTitle.trim(),
        owner: newOwner,
      });
      toast.success("Action created");
      setNewTitle("");
      setShowAddForm(false);
      onRefresh?.();
    } catch {
      toast.error("Failed to create");
    }
    setSaving(false);
  };

  const renderAction = (action, isLast) => {
    const SourceIcon = CATEGORY_ICONS[action.source_category];
    const isOverdue = action.status === "overdue";

    return (
      <div
        key={action.id}
        className="flex items-start gap-3 px-4 py-3 group"
        style={{ borderBottom: isLast ? "none" : "1px solid var(--cm-border)" }}
        data-testid={`action-item-${action.id}`}
      >
        {/* Checkbox */}
        <button
          onClick={() => handleComplete(action)}
          className="mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors shrink-0"
          style={{ borderColor: isOverdue ? "#ef4444" : "var(--cm-border)" }}
          data-testid={`complete-action-${action.id}`}
        >
          <Check className="w-3 h-3 text-transparent group-hover:text-primary transition-colors" />
        </button>

        <div className="flex-1 min-w-0">
          <p className="text-sm leading-snug" style={{ color: "var(--cm-text)" }}>{action.title}</p>
          <div className="flex items-center gap-2 mt-1 text-xs flex-wrap" style={{ color: "var(--cm-text-3)" }}>
            <span className="font-medium" style={{ color: "var(--cm-text-2)" }}>{action.owner || "Unassigned"}</span>
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

        {/* Reassign */}
        {reassigningId === action.id ? (
          <div className="flex flex-col gap-1 min-w-[140px]">
            {OWNERS.filter(o => o !== action.owner).map(o => (
              <button key={o} onClick={() => handleReassign(action.id, o)}
                className="text-left text-xs px-2 py-1 rounded hover:bg-primary/5 hover:text-primary transition-colors"
                style={{ backgroundColor: "var(--cm-surface-2)" }}>
                {o}
              </button>
            ))}
            <button onClick={() => setReassigningId(null)} className="text-xs px-2" style={{ color: "var(--cm-text-3)" }}>Cancel</button>
          </div>
        ) : (
          <Button
            size="sm" variant="ghost"
            className="text-xs p-1 h-auto opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ color: "var(--cm-text-3)" }}
            onClick={() => setReassigningId(action.id)}
            data-testid={`reassign-${action.id}`}
          >
            <UserPlus className="w-3.5 h-3.5" />
          </Button>
        )}
      </div>
    );
  };

  return (
    <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: "var(--cm-surface)", borderColor: "var(--cm-border)" }} data-testid="next-actions">
      <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "1px solid var(--cm-border)" }}>
        <div className="flex items-center gap-2.5">
          <h3 className="text-[11px] font-bold uppercase tracking-widest" style={{ color: "var(--cm-text-3)" }}>Next Actions</h3>
          <span className="text-xs font-medium" style={{ color: "var(--cm-text-3)" }}>
            {activeCount} active{overdue.length > 0 && <span className="text-red-500 font-semibold"> · {overdue.length} overdue</span>}
          </span>
        </div>
        <Button size="sm" variant="outline" className="rounded-full text-xs gap-1" onClick={() => setShowAddForm(!showAddForm)} data-testid="add-action-btn">
          <Plus className="w-3.5 h-3.5" /> Add
        </Button>
      </div>

      {/* Add action form */}
      {showAddForm && (
        <div className="px-5 py-3 space-y-2" style={{ backgroundColor: "var(--cm-surface-2)", borderBottom: "1px solid var(--cm-border)" }} data-testid="add-action-form">
          <input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="What needs to happen?"
            className="w-full text-sm border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/20"
            style={{ borderColor: "var(--cm-border)" }}
            autoFocus
            data-testid="new-action-title"
            onKeyDown={(e) => e.key === "Enter" && handleAddAction()}
          />
          <div className="flex items-center gap-2">
            <select value={newOwner} onChange={(e) => setNewOwner(e.target.value)}
              className="text-xs border rounded-lg px-2 py-1.5 focus:outline-none"
              style={{ borderColor: "var(--cm-border)" }}
              data-testid="new-action-owner">
              {OWNERS.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
            <Button size="sm" onClick={handleAddAction} disabled={!newTitle.trim() || saving} className="rounded-full text-xs" data-testid="submit-action">
              {saving ? "Saving..." : "Create"}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setShowAddForm(false)} className="text-xs">Cancel</Button>
          </div>
        </div>
      )}

      {/* Grouped by status: Overdue → Ready → Upcoming */}
      {groups.map(({ key, items }) => {
        const config = STATUS_GROUP[key];
        return (
          <div key={key}>
            <div className="px-4 py-2 flex items-center gap-2"
              style={{ backgroundColor: config.bg, borderBottom: `1px solid var(--cm-border)` }}>
              <div className={`w-2 h-2 rounded-full ${config.dotClass}`} />
              <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: config.color }}>
                {config.label}
              </span>
              <span className="text-[10px] font-medium" style={{ color: config.color, opacity: 0.7 }}>
                {items.length}
              </span>
            </div>
            {items.map((action, idx) => renderAction(action, idx === items.length - 1))}
          </div>
        );
      })}

      {/* Completed — collapsed */}
      {completed.length > 0 && (
        <details className="border-t" style={{ borderColor: "var(--cm-border)" }}>
          <summary className="px-5 py-3 text-xs cursor-pointer hover:bg-slate-50/50 flex items-center gap-1" style={{ color: "var(--cm-text-3)" }}>
            <ChevronRight className="w-3 h-3" />
            {completed.length} completed
          </summary>
          <div className="px-5 pb-3 space-y-1.5">
            {completed.map(a => (
              <div key={a.id} className="flex items-center gap-2 text-xs" style={{ color: "var(--cm-text-3)" }}>
                <Check className="w-3 h-3 text-emerald-500" />
                <span className="line-through">{a.title}</span>
              </div>
            ))}
          </div>
        </details>
      )}

      {activeCount === 0 && !showAddForm && (
        <div className="px-5 py-8 text-center">
          <p className="text-sm" style={{ color: "var(--cm-text-3)" }}>No active actions. Click "+ Add" to create one.</p>
        </div>
      )}
    </div>
  );
}

export default NextActions;

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

const STATUS_STYLES = {
  ready: { dot: "bg-gray-300", label: "Ready" },
  in_progress: { dot: "bg-blue-400", label: "In progress" },
  blocked: { dot: "bg-red-400", label: "Blocked" },
  overdue: { dot: "bg-red-500", label: "Overdue" },
  completed: { dot: "bg-emerald-500", label: "Done" },
};

function NextActions({ actions, athleteId, onRefresh }) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newOwner, setNewOwner] = useState("Coach Martinez");
  const [reassigningId, setReassigningId] = useState(null);
  const [saving, setSaving] = useState(false);

  // Check for overdue actions
  const now = new Date();
  const enriched = (actions || []).map((a) => {
    if (a.status === "completed") return a;
    if (a.due_date && new Date(a.due_date) < now && a.status !== "overdue") {
      return { ...a, status: "overdue" };
    }
    return a;
  });

  // Group by owner
  const groups = {};
  const unassigned = [];
  enriched.forEach((a) => {
    if (a.status === "completed") return;
    if (!a.owner || a.owner === "Unassigned") {
      unassigned.push(a);
    } else {
      if (!groups[a.owner]) groups[a.owner] = [];
      groups[a.owner].push(a);
    }
  });

  const completed = enriched.filter((a) => a.status === "completed");

  const handleComplete = async (action) => {
    try {
      await axios.patch(`${API}/support-pods/${athleteId}/actions/${action.id}`, { status: "completed" });
      toast.success("Action completed");
      onRefresh?.();
    } catch {
      toast.error("Failed to complete");
    }
  };

  const handleReassign = async (actionId, newOwner) => {
    try {
      await axios.patch(`${API}/support-pods/${athleteId}/actions/${actionId}`, { owner: newOwner });
      toast.success(`Reassigned to ${newOwner}`);
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

  const renderAction = (action) => {
    const style = STATUS_STYLES[action.status] || STATUS_STYLES.ready;
    const SourceIcon = CATEGORY_ICONS[action.source_category];
    const isOverdue = action.status === "overdue";

    return (
      <div
        key={action.id}
        className={`flex items-start gap-3 py-2.5 group ${isOverdue ? "bg-red-50/50 -mx-2 px-2 rounded-lg" : ""}`}
        data-testid={`action-item-${action.id}`}
      >
        {/* Checkbox */}
        <button
          onClick={() => handleComplete(action)}
          className="mt-0.5 w-5 h-5 rounded-full border-2 border-gray-300 hover:border-primary hover:bg-primary/10 flex items-center justify-center transition-colors shrink-0"
          data-testid={`complete-action-${action.id}`}
        >
          <Check className="w-3 h-3 text-transparent group-hover:text-primary transition-colors" />
        </button>

        <div className="flex-1 min-w-0">
          <p className="text-sm text-gray-800 leading-snug">{action.title}</p>
          <div className="flex items-center gap-2 mt-1 text-xs text-gray-400 flex-wrap">
            <span className={`flex items-center gap-1 ${isOverdue ? "text-red-600 font-medium" : ""}`}>
              <div className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
              {style.label}
            </span>
            {action.due_date && (
              <span className={isOverdue ? "text-red-500" : ""}>
                Due: {new Date(action.due_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              </span>
            )}
            {SourceIcon && (
              <span className="flex items-center gap-0.5 text-gray-400">
                <SourceIcon className="w-3 h-3" />
                From: {action.source_category?.replace(/_/g, " ")}
              </span>
            )}
          </div>
        </div>

        {/* Reassign */}
        {reassigningId === action.id ? (
          <div className="flex flex-col gap-1 min-w-[140px]">
            {OWNERS.filter((o) => o !== action.owner).map((o) => (
              <button
                key={o}
                onClick={() => handleReassign(action.id, o)}
                className="text-left text-xs px-2 py-1 rounded bg-gray-50 hover:bg-primary/5 hover:text-primary transition-colors"
              >
                {o}
              </button>
            ))}
            <button onClick={() => setReassigningId(null)} className="text-xs text-gray-400 px-2">Cancel</button>
          </div>
        ) : (
          (isOverdue || action.owner === "Unassigned") && (
            <Button
              size="sm"
              variant="ghost"
              className="text-xs text-gray-400 hover:text-primary p-1 h-auto"
              onClick={() => setReassigningId(action.id)}
              data-testid={`reassign-${action.id}`}
            >
              <UserPlus className="w-3.5 h-3.5" />
            </Button>
          )
        )}
      </div>
    );
  };

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm" data-testid="next-actions">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Next Actions</h3>
        <Button
          size="sm"
          variant="outline"
          className="rounded-full text-xs gap-1"
          onClick={() => setShowAddForm(!showAddForm)}
          data-testid="add-action-btn"
        >
          <Plus className="w-3.5 h-3.5" /> Add
        </Button>
      </div>

      {/* Add action form */}
      {showAddForm && (
        <div className="mb-4 p-3 rounded-lg bg-gray-50 border border-gray-200 space-y-2" data-testid="add-action-form">
          <input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="What needs to happen?"
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/20"
            autoFocus
            data-testid="new-action-title"
            onKeyDown={(e) => e.key === "Enter" && handleAddAction()}
          />
          <div className="flex items-center gap-2">
            <select
              value={newOwner}
              onChange={(e) => setNewOwner(e.target.value)}
              className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none"
              data-testid="new-action-owner"
            >
              {OWNERS.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
            <Button size="sm" onClick={handleAddAction} disabled={!newTitle.trim() || saving} className="rounded-full text-xs" data-testid="submit-action">
              {saving ? "Saving..." : "Create"}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setShowAddForm(false)} className="text-xs">Cancel</Button>
          </div>
        </div>
      )}

      {/* Grouped actions by owner */}
      {Object.entries(groups).map(([owner, ownerActions]) => (
        <div key={owner} className="mb-4">
          <p className="text-xs font-semibold text-gray-600 mb-1 flex items-center gap-1">
            <span>{owner}</span>
            <span className="text-gray-400">({ownerActions.length})</span>
          </p>
          <div className="divide-y divide-gray-50">
            {ownerActions.map(renderAction)}
          </div>
        </div>
      ))}

      {/* Unassigned */}
      {unassigned.length > 0 && (
        <div className="mb-4">
          <p className="text-xs font-semibold text-amber-700 mb-1 flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Unassigned ({unassigned.length})</span>
          </p>
          <div className="divide-y divide-gray-50">
            {unassigned.map(renderAction)}
          </div>
        </div>
      )}

      {/* Completed — collapsed */}
      {completed.length > 0 && (
        <details className="mt-3 pt-3 border-t border-gray-100">
          <summary className="text-xs text-gray-400 cursor-pointer hover:text-gray-600 flex items-center gap-1">
            <ChevronRight className="w-3 h-3 details-open:hidden" />
            <ChevronDown className="w-3 h-3 hidden details-open:inline" />
            {completed.length} completed
          </summary>
          <div className="mt-2 space-y-1.5">
            {completed.map((a) => (
              <div key={a.id} className="flex items-center gap-2 text-xs text-gray-400">
                <Check className="w-3 h-3 text-emerald-500" />
                <span className="line-through">{a.title}</span>
              </div>
            ))}
          </div>
        </details>
      )}

      {enriched.filter((a) => a.status !== "completed").length === 0 && !showAddForm && (
        <p className="text-sm text-gray-400 text-center py-4">No active actions. Click "+ Add" to create one.</p>
      )}
    </div>
  );
}

export default NextActions;

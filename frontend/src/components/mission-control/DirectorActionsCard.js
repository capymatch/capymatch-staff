import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import {
  ClipboardCheck, AlertTriangle, Loader2, ChevronDown, ChevronUp,
  CheckCircle2, Eye, Clock, Shield, X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const TYPE_CONFIG = {
  review_request: {
    label: "Review Request",
    shortLabel: "Review",
    icon: ClipboardCheck,
    color: "#3b82f6",
    bgColor: "rgba(59,130,246,0.08)",
    borderColor: "rgba(59,130,246,0.2)",
  },
  pipeline_escalation: {
    label: "Pipeline Escalation",
    shortLabel: "Escalation",
    icon: AlertTriangle,
    color: "#ef4444",
    bgColor: "rgba(239,68,68,0.06)",
    borderColor: "rgba(239,68,68,0.2)",
  },
};

const STATUS_CONFIG = {
  open: { label: "Open", color: "#f59e0b", bgColor: "rgba(245,158,11,0.12)" },
  acknowledged: { label: "Acknowledged", color: "#3b82f6", bgColor: "rgba(59,130,246,0.12)" },
  resolved: { label: "Resolved", color: "#10b981", bgColor: "rgba(16,185,129,0.12)" },
};

const RISK_CONFIG = {
  critical: { label: "Critical", color: "#ef4444", bgColor: "rgba(239,68,68,0.12)" },
  warning: { label: "Warning", color: "#f59e0b", bgColor: "rgba(245,158,11,0.12)" },
};

function ActionRow({ action, role, onAcknowledge, onResolve, acknowledging, resolving, justChanged }) {
  const type = TYPE_CONFIG[action.type] || TYPE_CONFIG.review_request;
  const status = STATUS_CONFIG[action.status] || STATUS_CONFIG.open;
  const risk = action.risk_level ? RISK_CONFIG[action.risk_level] : null;
  const TypeIcon = type.icon;
  const created = action.created_at ? new Date(action.created_at) : null;

  const isCoach = role === "club_coach";
  const canAcknowledge = isCoach && action.status === "open";
  const canResolve = isCoach && (action.status === "open" || action.status === "acknowledged");

  return (
    <div
      className="px-4 py-3 transition-all hover:bg-white/3"
      style={{
        borderBottom: "1px solid var(--cm-border)",
        backgroundColor: justChanged ? (action.status === "resolved" ? "rgba(16,185,129,0.06)" : "rgba(59,130,246,0.06)") : "transparent",
        transition: "background-color 1s ease-out",
      }}
      data-testid={`director-action-${action.action_id}`}
    >
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
          style={{ backgroundColor: type.bgColor }}>
          <TypeIcon className="w-4 h-4" style={{ color: type.color }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold" style={{ color: "var(--cm-text)" }}>{action.athlete_name}</span>
            <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded"
              style={{ backgroundColor: status.bgColor, color: status.color }}>
              {status.label}
            </span>
            {risk && (
              <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded"
                style={{ backgroundColor: risk.bgColor, color: risk.color }}>
                {risk.label}
              </span>
            )}
          </div>
          <p className="text-[11px] mt-0.5" style={{ color: "var(--cm-text-2)" }}>
            {action.reason_label}
            {action.note ? ` — ${action.note}` : ""}
          </p>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-[10px]" style={{ color: "var(--cm-text-3)" }}>
              {isCoach ? `From ${action.director_name}` : `To ${action.coach_name}`}
            </span>
            {created && (
              <span className="text-[10px]" style={{ color: "var(--cm-text-3)" }}>
                {created.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              </span>
            )}
          </div>
          {/* Coach action buttons */}
          {(canAcknowledge || canResolve) && (
            <div className="flex items-center gap-2 mt-2">
              {canAcknowledge && (
                <Button size="sm" onClick={() => onAcknowledge(action.action_id)}
                  disabled={acknowledging}
                  className="text-[10px] h-6 px-2.5 bg-blue-600/80 hover:bg-blue-600 text-white"
                  data-testid={`ack-action-${action.action_id}`}>
                  {acknowledging ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Eye className="w-3 h-3 mr-1" />}
                  Acknowledge
                </Button>
              )}
              {canResolve && (
                <Button size="sm" onClick={() => onResolve(action.action_id)}
                  disabled={resolving}
                  className="text-[10px] h-6 px-2.5 bg-emerald-600/80 hover:bg-emerald-600 text-white"
                  data-testid={`resolve-action-${action.action_id}`}>
                  {resolving ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <CheckCircle2 className="w-3 h-3 mr-1" />}
                  Resolve
                </Button>
              )}
            </div>
          )}
          {/* Resolved info */}
          {action.status === "resolved" && action.resolved_note && (
            <p className="text-[10px] mt-1.5 italic" style={{ color: "var(--cm-text-3)" }}>
              Resolution: {action.resolved_note}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function DirectorActionsCard({ role }) {
  const [actions, setActions] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showResolved, setShowResolved] = useState(false);
  const [ackingId, setAckingId] = useState(null);
  const [resolvingId, setResolvingId] = useState(null);
  const [justChangedId, setJustChangedId] = useState(null);

  const fetchActions = useCallback(async () => {
    try {
      const token = localStorage.getItem("capymatch_token");
      const res = await axios.get(`${API}/director/actions`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setActions(res.data.actions || []);
      setSummary(res.data.summary || null);
    } catch {
      // silently fail
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchActions(); }, [fetchActions]);

  const handleAcknowledge = async (actionId) => {
    setAckingId(actionId);
    // Optimistic update: change status locally first
    setActions(prev => prev.map(a =>
      a.action_id === actionId ? { ...a, status: "acknowledged" } : a
    ));
    setJustChangedId(actionId);
    setTimeout(() => setJustChangedId(null), 2500);
    try {
      const token = localStorage.getItem("capymatch_token");
      await axios.post(`${API}/director/actions/${actionId}/acknowledge`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success("Acknowledged — you're on it");
      // Delay re-fetch so optimistic highlight animation completes
      setTimeout(() => fetchActions(), 2500);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to acknowledge");
      fetchActions(); // revert immediately on error
    } finally { setAckingId(null); }
  };

  const handleResolve = async (actionId) => {
    setResolvingId(actionId);
    // Optimistic update: change status locally first
    setActions(prev => prev.map(a =>
      a.action_id === actionId ? { ...a, status: "resolved" } : a
    ));
    setJustChangedId(actionId);
    setShowResolved(true); // Auto-expand resolved section
    setTimeout(() => setJustChangedId(null), 2500);
    try {
      const token = localStorage.getItem("capymatch_token");
      await axios.post(`${API}/director/actions/${actionId}/resolve`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success("Resolved — nice work");
      // Delay re-fetch so optimistic highlight animation completes
      setTimeout(() => fetchActions(), 2500);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to resolve");
      fetchActions(); // revert immediately on error
    } finally { setResolvingId(null); }
  };

  if (loading) {
    return (
      <section data-testid="director-actions-card">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-[11px] font-bold uppercase tracking-widest" style={{ color: "var(--cm-text-3)" }}>
            {role === "club_coach" ? "Assigned Actions" : "Director Actions"}
          </span>
        </div>
        <div className="rounded-xl border p-6 flex items-center justify-center" style={{ backgroundColor: "var(--cm-surface)", borderColor: "var(--cm-border)" }}>
          <Loader2 className="w-5 h-5 animate-spin text-teal-600" />
        </div>
      </section>
    );
  }

  const openAck = actions.filter(a => a.status === "open" || a.status === "acknowledged");
  const resolved = actions.filter(a => a.status === "resolved");

  if (openAck.length === 0 && resolved.length === 0) {
    return (
      <section data-testid="director-actions-card">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-[11px] font-bold uppercase tracking-widest" style={{ color: "var(--cm-text-3)" }}>
            {role === "club_coach" ? "Assigned Actions" : "Director Actions"}
          </span>
        </div>
        <div className="rounded-xl border px-6 py-8 text-center" style={{ backgroundColor: "var(--cm-surface)", borderColor: "var(--cm-border)" }}>
          <div className="w-9 h-9 rounded-full flex items-center justify-center mx-auto mb-2.5" style={{ backgroundColor: "rgba(16,185,129,0.1)" }}>
            <CheckCircle2 className="w-4 h-4" style={{ color: "#10b981" }} />
          </div>
          <p className="text-sm font-medium" style={{ color: "var(--cm-text-2)" }}>No open actions</p>
          <p className="text-xs mt-1" style={{ color: "var(--cm-text-3)" }}>
            {role === "club_coach" ? "No review requests or escalations right now." : "Create actions from athlete pipeline views."}
          </p>
        </div>
      </section>
    );
  }

  return (
    <section data-testid="director-actions-card">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          {summary && summary.total_open > 0 && <span className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />}
          <span className="text-[11px] font-bold uppercase tracking-widest" style={{ color: "var(--cm-text-3)" }}>
            {role === "club_coach" ? "Assigned Actions" : "Director Actions"}
          </span>
        </div>
        {summary && (
          <div className="flex items-center gap-3">
            {summary.open_critical > 0 && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded" style={{ backgroundColor: "rgba(239,68,68,0.1)", color: "#ef4444" }}>
                {summary.open_critical} Critical
              </span>
            )}
            <span className="text-xs" style={{ color: "var(--cm-text-3)" }}>
              {summary.total_open} open · {summary.acknowledged} ack
            </span>
          </div>
        )}
      </div>

      {/* Active actions */}
      <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: "var(--cm-surface)", borderColor: "var(--cm-border)" }}>
        {openAck.map(action => (
          <ActionRow
            key={action.action_id}
            action={action}
            role={role}
            onAcknowledge={handleAcknowledge}
            onResolve={handleResolve}
            acknowledging={ackingId === action.action_id}
            resolving={resolvingId === action.action_id}
            justChanged={justChangedId === action.action_id}
          />
        ))}

        {/* Resolved section (collapsible) */}
        {resolved.length > 0 && (
          <>
            <button
              onClick={() => setShowResolved(!showResolved)}
              className="w-full flex items-center justify-between px-4 py-2.5 transition-colors hover:bg-white/3"
              style={{ borderTop: openAck.length > 0 ? "1px solid var(--cm-border)" : "none" }}
              data-testid="toggle-resolved-actions"
            >
              <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--cm-text-3)" }}>
                Resolved ({resolved.length})
              </span>
              {showResolved
                ? <ChevronUp className="w-3.5 h-3.5" style={{ color: "var(--cm-text-3)" }} />
                : <ChevronDown className="w-3.5 h-3.5" style={{ color: "var(--cm-text-3)" }} />
              }
            </button>
            {showResolved && resolved.map(action => (
              <ActionRow
                key={action.action_id}
                action={action}
                role={role}
                onAcknowledge={handleAcknowledge}
                onResolve={handleResolve}
                acknowledging={ackingId === action.action_id}
                resolving={resolvingId === action.action_id}
                justChanged={justChangedId === action.action_id}
              />
            ))}
          </>
        )}
      </div>
    </section>
  );
}

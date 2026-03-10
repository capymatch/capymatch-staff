import { useState, useEffect } from "react";
import axios from "axios";
import {
  X, Loader2, TrendingUp, TrendingDown, Minus, School,
  MessageCircle, Clock, AlertTriangle, ChevronDown, ChevronRight,
  Mail, Phone, Send, FileText, MapPin, Trophy, Users, Zap,
  ArrowUpRight, Flag, Check, ClipboardCheck, Shield, Eye, CheckCircle2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const MOMENTUM_ICON = { rising: TrendingUp, declining: TrendingDown, stable: Minus };
const MOMENTUM_COLOR = { strong: "#10b981", steady: "#8A92A3", declining: "#ef4444" };
const MOMENTUM_LABEL = { strong: "Strong", steady: "Steady", declining: "Declining" };

const STAGE_COLOR = {
  added: "#64748b",
  outreach: "#3b82f6",
  in_conversation: "#0d9488",
  campus_visit: "#8b5cf6",
  offer: "#f59e0b",
  committed: "#10b981",
};

const PULSE_DOT = { hot: "bg-emerald-500", warm: "bg-amber-400", cold: "bg-slate-500" };

const RISK_LABEL = {
  overdue_followup: "Overdue",
  no_response: "No Reply",
  stale: "Stale",
};

const ACTIVITY_ICON = {
  "Email Sent": Mail,
  "Email Received": Mail,
  "Phone Call": Phone,
  "Campus Visit": MapPin,
  "Profile Sent": Send,
  "Note": FileText,
};

function StatCard({ value, label, color, warning }) {
  return (
    <div className="flex-1 min-w-0 p-3 rounded-xl text-center" style={{ backgroundColor: "var(--cm-surface-2)" }}>
      <p className="text-lg font-bold" style={{ color: warning ? "#ef4444" : color || "var(--cm-text)" }}>{value}</p>
      <p className="text-[10px] font-medium uppercase tracking-wider mt-0.5" style={{ color: "var(--cm-text-3)" }}>{label}</p>
    </div>
  );
}

function StageBar({ distribution }) {
  const total = distribution.reduce((s, d) => s + d.count, 0) || 1;
  return (
    <div className="flex rounded-lg overflow-hidden h-2.5 w-full" style={{ backgroundColor: "var(--cm-surface-2)" }}>
      {distribution.filter(d => d.count > 0).map(d => (
        <div key={d.stage} title={`${d.label}: ${d.count}`}
          style={{ width: `${(d.count / total) * 100}%`, backgroundColor: STAGE_COLOR[d.stage] || "#64748b", minWidth: d.count > 0 ? "8px" : 0 }}
          className="transition-all" />
      ))}
    </div>
  );
}

function SchoolRow({ school, onFlag }) {
  const pulseClass = PULSE_DOT[school.pulse] || "bg-slate-600";
  return (
    <div className="flex items-center gap-3 py-2.5 px-1 group" data-testid={`school-row-${school.program_id}`}>
      {school.logo_url ? (
        <img src={school.logo_url} alt="" className="w-7 h-7 rounded-md object-contain flex-shrink-0" style={{ backgroundColor: "var(--cm-surface-2)" }} />
      ) : (
        <div className="w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0" style={{ backgroundColor: "var(--cm-surface-2)" }}>
          <School className="w-3.5 h-3.5" style={{ color: "var(--cm-text-3)" }} />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className={`w-1.5 h-1.5 rounded-full ${pulseClass} flex-shrink-0`} />
          <span className="text-xs font-semibold truncate" style={{ color: "var(--cm-text)" }}>{school.university_name}</span>
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          {school.division && <span className="text-[10px]" style={{ color: "var(--cm-text-3)" }}>{school.division}</span>}
          {school.reply_status && (
            <span className="text-[10px] font-medium" style={{ color: school.reply_status === "Reply Received" || school.reply_status === "Positive" ? "#10b981" : "var(--cm-text-3)" }}>
              {school.reply_status}
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1.5 flex-shrink-0">
        {school.risks.map(r => (
          <span key={r} className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded"
            style={{ backgroundColor: r === "overdue_followup" ? "rgba(239,68,68,0.12)" : "rgba(245,158,11,0.12)", color: r === "overdue_followup" ? "#ef4444" : "#f59e0b" }}>
            {RISK_LABEL[r] || r}
          </span>
        ))}
        {school.next_action && (
          <span className="text-[10px] hidden group-hover:block" style={{ color: "var(--cm-text-3)" }}>{school.next_action}</span>
        )}
        {onFlag && (
          <button
            onClick={(e) => { e.stopPropagation(); onFlag(school); }}
            className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all hover:bg-amber-500/10"
            style={{ color: "var(--cm-text-3)" }}
            title="Flag for follow-up"
            data-testid={`flag-school-${school.program_id}`}>
            <Flag className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}

function ActivityItem({ item }) {
  const Icon = ACTIVITY_ICON[item.type] || FileText;
  const d = item.date ? new Date(item.date) : null;
  return (
    <div className="flex items-start gap-2.5 py-2">
      <div className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 mt-0.5" style={{ backgroundColor: "var(--cm-surface-2)" }}>
        <Icon className="w-3 h-3" style={{ color: "var(--cm-text-3)" }} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium" style={{ color: "var(--cm-text)" }}>{item.type}</span>
          {item.university_name && <span className="text-[10px]" style={{ color: "var(--cm-text-3)" }}>{item.university_name}</span>}
        </div>
        {item.notes && <p className="text-[10px] mt-0.5 truncate" style={{ color: "var(--cm-text-3)" }}>{item.notes}</p>}
      </div>
      <div className="flex-shrink-0 text-right">
        {item.outcome && (
          <span className="text-[10px] font-medium" style={{ color: item.outcome === "Positive" ? "#10b981" : item.outcome === "No Response" ? "#f59e0b" : "var(--cm-text-3)" }}>
            {item.outcome}
          </span>
        )}
        {d && <p className="text-[9px] mt-0.5" style={{ color: "var(--cm-text-3)" }}>{d.toLocaleDateString("en-US", { month: "short", day: "numeric" })}</p>}
      </div>
    </div>
  );
}


const PRESET_REASONS = [
  { key: "reply_needed", label: "Reply needed" },
  { key: "followup_overdue", label: "Follow-up overdue" },
  { key: "strong_interest", label: "Strong interest worth pursuing" },
  { key: "review_school", label: "Review this school" },
];

const DUE_OPTIONS = [
  { key: "none", label: "No deadline" },
  { key: "today", label: "Today" },
  { key: "this_week", label: "This week" },
];

function FlagModal({ school, athleteId, onClose, onFlagged }) {
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const [due, setDue] = useState("none");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!reason) { toast.error("Select a reason"); return; }
    setSubmitting(true);
    try {
      const token = localStorage.getItem("session_token");
      const res = await axios.post(`${API}/roster/athlete/${athleteId}/flag-followup`, {
        program_id: school.program_id,
        reason,
        note: note.trim(),
        due,
      }, { headers: { Authorization: `Bearer ${token}` } });
      toast.success(res.data.message || "Flagged for follow-up");
      onFlagged?.();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to flag");
    } finally { setSubmitting(false); }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center" data-testid="flag-modal-overlay">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm mx-4 rounded-lg p-5" style={{ backgroundColor: "var(--cm-bg)", border: "1px solid var(--cm-border)" }}
        data-testid="flag-modal">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: "rgba(245,158,11,0.15)" }}>
              <Flag className="w-4 h-4" style={{ color: "#f59e0b" }} />
            </div>
            <div>
              <h3 className="text-sm font-bold" style={{ color: "var(--cm-text)" }}>Flag for Follow-Up</h3>
              <p className="text-[10px]" style={{ color: "var(--cm-text-3)" }}>{school.university_name}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-white/5">
            <X className="w-4 h-4" style={{ color: "var(--cm-text-3)" }} />
          </button>
        </div>

        {/* Reason */}
        <div className="mb-3">
          <label className="text-[10px] font-bold uppercase tracking-wider block mb-1.5" style={{ color: "var(--cm-text-3)" }}>Reason</label>
          <div className="space-y-1.5">
            {PRESET_REASONS.map(r => (
              <button key={r.key} onClick={() => setReason(r.key)}
                className="w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-all"
                style={{
                  backgroundColor: reason === r.key ? "rgba(245,158,11,0.12)" : "var(--cm-surface-2)",
                  color: reason === r.key ? "#f59e0b" : "var(--cm-text-2)",
                  border: `1px solid ${reason === r.key ? "rgba(245,158,11,0.3)" : "transparent"}`,
                }}
                data-testid={`flag-reason-${r.key}`}>
                {r.label}
              </button>
            ))}
          </div>
        </div>

        {/* Note */}
        <div className="mb-3">
          <label className="text-[10px] font-bold uppercase tracking-wider block mb-1.5" style={{ color: "var(--cm-text-3)" }}>Note (optional)</label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={300}
            rows={2}
            placeholder="Add context for the athlete..."
            className="w-full px-3 py-2 rounded-lg text-xs resize-none focus:outline-none"
            style={{ backgroundColor: "var(--cm-surface-2)", color: "var(--cm-text)", border: "1px solid var(--cm-border)" }}
            data-testid="flag-note-input" />
        </div>

        {/* Due */}
        <div className="mb-4">
          <label className="text-[10px] font-bold uppercase tracking-wider block mb-1.5" style={{ color: "var(--cm-text-3)" }}>Due</label>
          <div className="flex gap-2">
            {DUE_OPTIONS.map(d => (
              <button key={d.key} onClick={() => setDue(d.key)}
                className="flex-1 px-2 py-1.5 rounded-lg text-[10px] font-semibold transition-all text-center"
                style={{
                  backgroundColor: due === d.key ? "rgba(245,158,11,0.12)" : "var(--cm-surface-2)",
                  color: due === d.key ? "#f59e0b" : "var(--cm-text-3)",
                  border: `1px solid ${due === d.key ? "rgba(245,158,11,0.3)" : "transparent"}`,
                }}
                data-testid={`flag-due-${d.key}`}>
                {d.label}
              </button>
            ))}
          </div>
        </div>

        {/* Submit */}
        <button onClick={handleSubmit} disabled={submitting || !reason}
          className="w-full py-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2"
          style={{
            backgroundColor: reason ? "#f59e0b" : "var(--cm-surface-2)",
            color: reason ? "#000" : "var(--cm-text-3)",
            opacity: submitting ? 0.6 : 1,
          }}
          data-testid="flag-submit-btn">
          {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Flag className="w-3.5 h-3.5" />}
          {submitting ? "Flagging..." : "Flag for Follow-Up"}
        </button>
      </div>
    </div>
  );
}

// ─── Director Action Presets ─────────────────────
const REVIEW_REASONS = [
  { key: "pipeline_stalling", label: "Pipeline stalling" },
  { key: "high_value_recruit", label: "High-value recruit" },
  { key: "scholarship_deadline", label: "Scholarship deadline approaching" },
  { key: "needs_guidance", label: "Needs guidance" },
  { key: "other", label: "Other" },
];

const ESCALATION_REASONS = [
  { key: "overdue_followups", label: "Overdue follow-ups" },
  { key: "no_responses", label: "No responses from schools" },
  { key: "momentum_drop", label: "Momentum drop" },
  { key: "deadline_risk", label: "Deadline risk" },
  { key: "other", label: "Other" },
];

function DirectorActionModal({ athleteId, athleteName, coachId, actionType, onClose, onCreated }) {
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const [riskLevel, setRiskLevel] = useState("warning");
  const [submitting, setSubmitting] = useState(false);

  const isEscalation = actionType === "pipeline_escalation";
  const reasons = isEscalation ? ESCALATION_REASONS : REVIEW_REASONS;
  const accentColor = isEscalation ? "#ef4444" : "#3b82f6";
  const Icon = isEscalation ? AlertTriangle : ClipboardCheck;
  const title = isEscalation ? "Escalate Pipeline" : "Request Coach Review";

  const handleSubmit = async () => {
    if (!reason) { toast.error("Select a reason"); return; }
    setSubmitting(true);
    try {
      const token = localStorage.getItem("session_token");
      const payload = {
        type: actionType,
        athlete_id: athleteId,
        coach_id: coachId,
        reason,
        note: note.trim(),
      };
      if (isEscalation) payload.risk_level = riskLevel;
      const res = await axios.post(`${API}/director/actions`, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success(res.data.message || "Action created");
      onCreated?.();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to create action");
    } finally { setSubmitting(false); }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center" data-testid="director-action-modal-overlay">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm mx-4 rounded-lg p-5"
        style={{ backgroundColor: "var(--cm-bg)", border: "1px solid var(--cm-border)" }}
        data-testid="director-action-modal">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${accentColor}15` }}>
              <Icon className="w-4 h-4" style={{ color: accentColor }} />
            </div>
            <div>
              <h3 className="text-sm font-bold" style={{ color: "var(--cm-text)" }}>{title}</h3>
              <p className="text-[10px]" style={{ color: "var(--cm-text-3)" }}>{athleteName}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-white/5">
            <X className="w-4 h-4" style={{ color: "var(--cm-text-3)" }} />
          </button>
        </div>

        {/* Risk Level (escalation only) */}
        {isEscalation && (
          <div className="mb-3">
            <label className="text-[10px] font-bold uppercase tracking-wider block mb-1.5" style={{ color: "var(--cm-text-3)" }}>Severity</label>
            <div className="flex gap-2">
              {[
                { key: "warning", label: "Warning", color: "#f59e0b" },
                { key: "critical", label: "Critical", color: "#ef4444" },
              ].map(rl => (
                <button key={rl.key} onClick={() => setRiskLevel(rl.key)}
                  className="flex-1 px-2 py-1.5 rounded-lg text-[10px] font-semibold transition-all text-center"
                  style={{
                    backgroundColor: riskLevel === rl.key ? `${rl.color}15` : "var(--cm-surface-2)",
                    color: riskLevel === rl.key ? rl.color : "var(--cm-text-3)",
                    border: `1px solid ${riskLevel === rl.key ? `${rl.color}40` : "transparent"}`,
                  }}
                  data-testid={`risk-level-${rl.key}`}>
                  {rl.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Reason */}
        <div className="mb-3">
          <label className="text-[10px] font-bold uppercase tracking-wider block mb-1.5" style={{ color: "var(--cm-text-3)" }}>Reason</label>
          <div className="space-y-1.5">
            {reasons.map(r => (
              <button key={r.key} onClick={() => setReason(r.key)}
                className="w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-all"
                style={{
                  backgroundColor: reason === r.key ? `${accentColor}12` : "var(--cm-surface-2)",
                  color: reason === r.key ? accentColor : "var(--cm-text-2)",
                  border: `1px solid ${reason === r.key ? `${accentColor}30` : "transparent"}`,
                }}
                data-testid={`action-reason-${r.key}`}>
                {r.label}
              </button>
            ))}
          </div>
        </div>

        {/* Note */}
        <div className="mb-4">
          <label className="text-[10px] font-bold uppercase tracking-wider block mb-1.5" style={{ color: "var(--cm-text-3)" }}>Note (optional)</label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={300}
            rows={2}
            placeholder="Add context for the coach..."
            className="w-full px-3 py-2 rounded-lg text-xs resize-none focus:outline-none"
            style={{ backgroundColor: "var(--cm-surface-2)", color: "var(--cm-text)", border: "1px solid var(--cm-border)" }}
            data-testid="action-note-input" />
        </div>

        {/* Submit */}
        <button onClick={handleSubmit} disabled={submitting || !reason}
          className="w-full py-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2"
          style={{
            backgroundColor: reason ? accentColor : "var(--cm-surface-2)",
            color: reason ? "#fff" : "var(--cm-text-3)",
            opacity: submitting ? 0.6 : 1,
          }}
          data-testid="action-submit-btn">
          {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Icon className="w-3.5 h-3.5" />}
          {submitting ? "Creating..." : title}
        </button>
      </div>
    </div>
  );
}


function AthleteActionsSection({ athleteId, userRole }) {
  const [actions, setActions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("session_token");
    axios.get(`${API}/director/actions/athlete/${athleteId}`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then(res => setActions(res.data.actions || []))
    .catch(() => {})
    .finally(() => setLoading(false));
  }, [athleteId]);

  const handleAck = async (actionId) => {
    try {
      const token = localStorage.getItem("session_token");
      await axios.post(`${API}/director/actions/${actionId}/acknowledge`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success("Acknowledged");
      setActions(prev => prev.map(a => a.action_id === actionId ? { ...a, status: "acknowledged", acknowledged_at: new Date().toISOString() } : a));
    } catch (err) { toast.error(err.response?.data?.detail || "Failed"); }
  };

  const handleResolve = async (actionId) => {
    try {
      const token = localStorage.getItem("session_token");
      await axios.post(`${API}/director/actions/${actionId}/resolve`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success("Resolved");
      setActions(prev => prev.map(a => a.action_id === actionId ? { ...a, status: "resolved", resolved_at: new Date().toISOString() } : a));
    } catch (err) { toast.error(err.response?.data?.detail || "Failed"); }
  };

  const active = actions.filter(a => a.status === "open" || a.status === "acknowledged");
  if (loading || active.length === 0) return null;

  const STATUS_CFG = {
    open: { label: "Open", color: "#f59e0b", bg: "rgba(245,158,11,0.12)" },
    acknowledged: { label: "Ack'd", color: "#3b82f6", bg: "rgba(59,130,246,0.12)" },
  };

  const isCoach = userRole === "club_coach";

  return (
    <div data-testid="athlete-actions-section">
      <span className="text-[10px] font-bold uppercase tracking-wider block mb-2" style={{ color: "var(--cm-text-3)" }}>
        Director Actions
      </span>
      <div className="space-y-2">
        {active.map(a => {
          const isEsc = a.type === "pipeline_escalation";
          const sc = STATUS_CFG[a.status] || STATUS_CFG.open;
          return (
            <div key={a.action_id} className="rounded-xl border p-3"
              style={{
                backgroundColor: isEsc ? "rgba(239,68,68,0.04)" : "rgba(59,130,246,0.04)",
                borderColor: isEsc ? "rgba(239,68,68,0.15)" : "rgba(59,130,246,0.15)",
              }}
              data-testid={`pipeline-action-${a.action_id}`}>
              <div className="flex items-center gap-2 mb-1">
                {isEsc
                  ? <AlertTriangle className="w-3.5 h-3.5" style={{ color: "#ef4444" }} />
                  : <ClipboardCheck className="w-3.5 h-3.5" style={{ color: "#3b82f6" }} />
                }
                <span className="text-[10px] font-bold" style={{ color: isEsc ? "#ef4444" : "#3b82f6" }}>
                  {isEsc ? "Escalation" : "Review Request"}
                </span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ backgroundColor: sc.bg, color: sc.color }}>
                  {sc.label}
                </span>
                {a.risk_level && (
                  <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded"
                    style={{
                      backgroundColor: a.risk_level === "critical" ? "rgba(239,68,68,0.12)" : "rgba(245,158,11,0.12)",
                      color: a.risk_level === "critical" ? "#ef4444" : "#f59e0b",
                    }}>
                    {a.risk_level}
                  </span>
                )}
              </div>
              <p className="text-[11px]" style={{ color: "var(--cm-text-2)" }}>
                {a.reason_label}{a.note ? ` — ${a.note}` : ""}
              </p>
              <p className="text-[10px] mt-0.5" style={{ color: "var(--cm-text-3)" }}>
                From {a.director_name} · {a.created_at ? new Date(a.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : ""}
              </p>
              {isCoach && (
                <div className="flex items-center gap-2 mt-2">
                  {a.status === "open" && (
                    <Button size="sm" onClick={() => handleAck(a.action_id)}
                      className="text-[10px] h-6 px-2.5 bg-blue-600/80 hover:bg-blue-600 text-white"
                      data-testid={`panel-ack-${a.action_id}`}>
                      <Eye className="w-3 h-3 mr-1" />Acknowledge
                    </Button>
                  )}
                  <Button size="sm" onClick={() => handleResolve(a.action_id)}
                    className="text-[10px] h-6 px-2.5 bg-emerald-600/80 hover:bg-emerald-600 text-white"
                    data-testid={`panel-resolve-${a.action_id}`}>
                    <CheckCircle2 className="w-3 h-3 mr-1" />Resolve
                  </Button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}


export default function AthletePipelinePanel({ athleteId, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedStage, setExpandedStage] = useState(null);
  const [flagTarget, setFlagTarget] = useState(null);
  const [dirActionType, setDirActionType] = useState(null); // "review_request" | "pipeline_escalation" | null
  const [actionsKey, setActionsKey] = useState(0); // refresh trigger

  // Get current user role from token
  const userRole = (() => {
    try {
      const token = localStorage.getItem("session_token");
      if (!token) return "athlete";
      const payload = JSON.parse(atob(token.split(".")[1]));
      return payload.role || "athlete";
    } catch { return "athlete"; }
  })();

  const isDirector = userRole === "director" || userRole === "platform_admin";
  const isCoach = userRole === "club_coach";

  useEffect(() => {
    if (!athleteId) return;
    setLoading(true);
    setError(null);
    axios.get(`${API}/roster/athlete/${athleteId}/pipeline`)
      .then(res => {
        setData(res.data);
        // Auto-expand first non-empty stage
        const first = res.data?.schools?.[0];
        if (first) setExpandedStage(first.stage);
      })
      .catch(err => setError(err.response?.data?.detail || "Failed to load pipeline"))
      .finally(() => setLoading(false));
  }, [athleteId]);

  if (!athleteId) return null;

  const MomIcon = data ? (MOMENTUM_ICON[data.header?.momentum_trend] || Minus) : Minus;
  const momColor = MOMENTUM_COLOR[data?.momentum_assessment] || "#8A92A3";

  return (
    <div className="fixed inset-0 z-50 flex justify-end" data-testid="pipeline-panel-overlay">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className="relative w-full max-w-lg h-full overflow-y-auto"
        style={{ backgroundColor: "var(--cm-bg)", borderLeft: "1px solid var(--cm-border)" }}
        data-testid="pipeline-panel">

        {/* Header */}
        <div className="sticky top-0 z-10 px-5 py-4 flex items-center justify-between"
          style={{ backgroundColor: "var(--cm-bg)", borderBottom: "1px solid var(--cm-border)" }}>
          <div className="flex items-center gap-2">
            <ArrowUpRight className="w-4 h-4 text-teal-600" />
            <span className="text-sm font-bold" style={{ color: "var(--cm-text)" }}>Pipeline Summary</span>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/5 transition-colors" data-testid="close-pipeline-panel">
            <X className="w-4 h-4" style={{ color: "var(--cm-text-3)" }} />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-teal-600" />
          </div>
        ) : error ? (
          <div className="p-5 text-center">
            <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-red-400" />
            <p className="text-sm text-red-400">{error}</p>
          </div>
        ) : data ? (
          <div className="p-5 space-y-5">
            {/* Athlete Header */}
            <div className="flex items-center gap-3" data-testid="pipeline-athlete-header">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: "var(--cm-surface-2)" }}>
                {data.header.photo_url ? (
                  <img src={data.header.photo_url} alt="" className="w-11 h-11 rounded-xl object-cover" />
                ) : (
                  <Users className="w-5 h-5" style={{ color: "var(--cm-text-3)" }} />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-base font-bold truncate" style={{ color: "var(--cm-text)" }}>{data.header.name}</h2>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[10px] font-medium" style={{ color: "var(--cm-text-3)" }}>
                    {data.header.position} · {data.header.grad_year} · {data.header.team}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg" style={{ backgroundColor: `${momColor}15` }}>
                <MomIcon className="w-3.5 h-3.5" style={{ color: momColor }} />
                <span className="text-[10px] font-bold" style={{ color: momColor }}>
                  {MOMENTUM_LABEL[data.momentum_assessment] || "Steady"}
                </span>
              </div>
            </div>

            {/* Director Action Buttons */}
            {isDirector && data.header?.primary_coach_id && (
              <div className="flex items-center gap-2" data-testid="director-action-buttons">
                <Button size="sm" onClick={() => setDirActionType("review_request")}
                  className="text-[10px] h-7 px-3 bg-blue-600/80 hover:bg-blue-600 text-white"
                  data-testid="request-review-btn">
                  <ClipboardCheck className="w-3 h-3 mr-1.5" />Request Review
                </Button>
                <Button size="sm" onClick={() => setDirActionType("pipeline_escalation")}
                  className="text-[10px] h-7 px-3 bg-red-600/80 hover:bg-red-600 text-white"
                  data-testid="escalate-btn">
                  <AlertTriangle className="w-3 h-3 mr-1.5" />Escalate
                </Button>
              </div>
            )}

            {/* Active Director Actions for this athlete */}
            <AthleteActionsSection key={actionsKey} athleteId={athleteId} userRole={userRole} />

            {/* Summary Row */}
            <div className="flex gap-2" data-testid="pipeline-summary-row">
              <StatCard value={data.summary.total_schools} label="Schools" color="#0d9488" />
              <StatCard value={`${data.summary.response_rate}%`} label="Response" color="#3b82f6" />
              <StatCard value={data.summary.active_conversations} label="Talking" color="#8b5cf6" />
              <StatCard value={data.summary.overdue_followups} label="Overdue" warning={data.summary.overdue_followups > 0} />
            </div>

            {/* Stage Distribution Bar */}
            <div data-testid="pipeline-stage-bar">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--cm-text-3)" }}>Pipeline Stages</span>
                <span className="text-[10px]" style={{ color: "var(--cm-text-3)" }}>{data.summary.total_schools} schools</span>
              </div>
              <StageBar distribution={data.stage_distribution} />
              <div className="flex items-center gap-3 mt-2 flex-wrap">
                {data.stage_distribution.filter(d => d.count > 0).map(d => (
                  <div key={d.stage} className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-sm" style={{ backgroundColor: STAGE_COLOR[d.stage] }} />
                    <span className="text-[9px] font-medium" style={{ color: "var(--cm-text-3)" }}>{d.label} ({d.count})</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Schools Grouped by Stage */}
            <div data-testid="pipeline-schools-list">
              <span className="text-[10px] font-bold uppercase tracking-wider block mb-2" style={{ color: "var(--cm-text-3)" }}>Schools by Stage</span>
              <div className="space-y-1">
                {data.schools.map(group => {
                  const isExpanded = expandedStage === group.stage;
                  return (
                    <div key={group.stage} className="rounded-xl overflow-hidden border" style={{ borderColor: "var(--cm-border)" }}>
                      <button
                        onClick={() => setExpandedStage(isExpanded ? null : group.stage)}
                        className="w-full flex items-center gap-2.5 px-3 py-2.5 transition-colors hover:bg-white/3"
                        style={{ backgroundColor: "var(--cm-surface)" }}
                        data-testid={`stage-toggle-${group.stage}`}>
                        <div className="w-2 h-2 rounded-sm flex-shrink-0" style={{ backgroundColor: STAGE_COLOR[group.stage] }} />
                        <span className="text-xs font-semibold flex-1 text-left" style={{ color: "var(--cm-text)" }}>
                          {group.label}
                        </span>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ backgroundColor: "var(--cm-surface-2)", color: "var(--cm-text-3)" }}>
                          {group.schools.length}
                        </span>
                        {isExpanded ? <ChevronDown className="w-3.5 h-3.5" style={{ color: "var(--cm-text-3)" }} /> : <ChevronRight className="w-3.5 h-3.5" style={{ color: "var(--cm-text-3)" }} />}
                      </button>
                      {isExpanded && (
                        <div className="px-3 pb-2" style={{ borderTop: "1px solid var(--cm-border)" }}>
                          {group.schools.map(s => <SchoolRow key={s.program_id} school={s} onFlag={(school) => setFlagTarget(school)} />)}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Recent Activity */}
            {data.recent_activity.length > 0 && (
              <div data-testid="pipeline-recent-activity">
                <span className="text-[10px] font-bold uppercase tracking-wider block mb-2" style={{ color: "var(--cm-text-3)" }}>Recent Activity</span>
                <div className="rounded-xl border p-3" style={{ backgroundColor: "var(--cm-surface)", borderColor: "var(--cm-border)" }}>
                  {data.recent_activity.slice(0, 5).map((item, i) => (
                    <div key={i}>
                      {i > 0 && <div className="my-0.5" style={{ borderTop: "1px solid var(--cm-border)" }} />}
                      <ActivityItem item={item} />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Days since activity warning */}
            {data.header.days_since_activity > 14 && (
              <div className="flex items-center gap-2 p-3 rounded-xl" style={{ backgroundColor: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.15)" }}
                data-testid="pipeline-inactivity-warning">
                <Clock className="w-4 h-4 text-red-400 flex-shrink-0" />
                <span className="text-xs text-red-400">
                  No activity in {data.header.days_since_activity} days
                </span>
              </div>
            )}
          </div>
        ) : null}
      </div>

      {/* Flag Modal */}
      {flagTarget && (
        <FlagModal
          school={flagTarget}
          athleteId={athleteId}
          onClose={() => setFlagTarget(null)}
          onFlagged={() => toast.success("Flag sent to athlete")}
        />
      )}

      {/* Director Action Modal */}
      {dirActionType && data && (
        <DirectorActionModal
          athleteId={athleteId}
          athleteName={data.header?.name || "Athlete"}
          coachId={data.header?.primary_coach_id || ""}
          actionType={dirActionType}
          onClose={() => setDirActionType(null)}
          onCreated={() => setActionsKey(k => k + 1)}
        />
      )}
    </div>
  );
}

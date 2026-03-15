import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft, School, Mail, Phone, ExternalLink, RefreshCw,
  AlertTriangle, CheckCircle2, Clock, FileText, Plus, Send,
  MessageSquare, TrendingUp, TrendingDown, Minus, Flag, Loader2, X, ClipboardCheck, Megaphone
} from "lucide-react";
import axios from "axios";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { CoachActionBar } from "@/components/support-pod/CoachActionBar";
import { CoachEmailComposer } from "@/components/support-pod/CoachEmailComposer";
import { CoachLogInteraction } from "@/components/support-pod/CoachLogInteraction";
import { CoachFollowUpScheduler } from "@/components/support-pod/CoachFollowUpScheduler";
import { EscalateToDirector } from "@/components/support-pod/EscalateToDirector";
import { CoachNotesSidebar } from "@/components/support-pod/CoachNotesSidebar";
import ActionPlan from "@/components/support-pod/ActionPlan";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const token = () => localStorage.getItem("capymatch_token");
const headers = () => ({ Authorization: `Bearer ${token()}` });

const PRIORITY_ICON = { critical: AlertTriangle, high: AlertTriangle, medium: Clock, info: TrendingUp };
const PRIORITY_COLOR = { critical: "#ef4444", high: "#f59e0b", medium: "#3b82f6", info: "#10b981" };

function SignalCard({ signal }) {
  const Icon = PRIORITY_ICON[signal.priority] || AlertTriangle;
  const color = PRIORITY_COLOR[signal.priority] || "#64748b";
  return (
    <div className="flex items-start gap-3 py-2.5" data-testid={`signal-${signal.id}`}>
      <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5" style={{ backgroundColor: `${color}15` }}>
        <Icon className="w-3.5 h-3.5" style={{ color }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold" style={{ color: "var(--cm-text, #1e293b)" }}>{signal.title}</p>
        <p className="text-[11px] mt-0.5" style={{ color: "var(--cm-text-3, #94a3b8)" }}>{signal.description}</p>
        {signal.recommendation && (
          <p className="text-[11px] mt-1 font-medium" style={{ color }}>→ {signal.recommendation}</p>
        )}
      </div>
    </div>
  );
}

function ActionItem({ action, onComplete }) {
  const isOpen = action.status === "ready" || action.status === "open";
  return (
    <div className="flex items-center gap-3 py-2 group" data-testid={`action-${action.id}`}>
      <button
        onClick={() => isOpen && onComplete(action.id)}
        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${isOpen ? "border-slate-300 hover:border-teal-500 hover:bg-teal-50 cursor-pointer" : "border-emerald-400 bg-emerald-50"}`}
      >
        {!isOpen && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />}
      </button>
      <div className="flex-1 min-w-0">
        <p className={`text-xs font-medium ${!isOpen ? "line-through" : ""}`} style={{ color: isOpen ? "var(--cm-text, #1e293b)" : "var(--cm-text-3, #94a3b8)" }}>
          {action.title}
        </p>
        {action.owner && <p className="text-[10px]" style={{ color: "var(--cm-text-3, #94a3b8)" }}>Owner: {action.owner}</p>}
        {action.assigned_to_athlete && <span className="inline-block text-[9px] font-bold px-1.5 py-0.5 rounded bg-teal-50 text-teal-600 mt-0.5">Sent to Athlete</span>}
      </div>
      {action.due_date && (
        <span className="text-[10px] shrink-0" style={{ color: "var(--cm-text-3, #94a3b8)" }}>
          {new Date(action.due_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
        </span>
      )}
    </div>
  );
}

function TimelineItem({ event }) {
  const d = event.created_at ? new Date(event.created_at) : null;
  return (
    <div className="flex items-start gap-3 py-2" data-testid="timeline-event">
      <div className="w-1.5 h-1.5 rounded-full bg-slate-300 mt-1.5 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-xs" style={{ color: "var(--cm-text, #1e293b)" }}>{event.description}</p>
        <p className="text-[10px] mt-0.5" style={{ color: "var(--cm-text-3, #94a3b8)" }}>
          {event.actor}{d ? ` · ${d.toLocaleDateString("en-US", { month: "short", day: "numeric" })} at ${d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}` : ""}
        </p>
      </div>
    </div>
  );
}

const ACTION_TYPES = [
  { value: "general", label: "General Task" },
  { value: "send_email", label: "Send Email" },
  { value: "log_visit", label: "Log Visit" },
  { value: "log_interaction", label: "Log Interaction" },
  { value: "preparation", label: "Preparation" },
  { value: "profile_update", label: "Profile Update" },
  { value: "research", label: "Research" },
  { value: "reply", label: "Reply to Message" },
];

function AddActionForm({ onSubmit, onCancel }) {
  const [title, setTitle] = useState("");
  const [assignToAthlete, setAssignToAthlete] = useState(false);
  const [actionType, setActionType] = useState("general");
  const handleSubmit = () => {
    if (!title.trim()) return;
    onSubmit(title.trim(), assignToAthlete, assignToAthlete ? actionType : null);
  };
  return (
    <div className="py-2 space-y-2">
      <div className="flex items-center gap-2">
        <input
          autoFocus
          value={title}
          onChange={e => setTitle(e.target.value)}
          onKeyDown={e => e.key === "Enter" && handleSubmit()}
          placeholder="New action..."
          className="flex-1 text-xs px-3 py-2 rounded-lg border outline-none focus:ring-1 focus:ring-teal-500"
          style={{ backgroundColor: "var(--cm-surface, white)", borderColor: "var(--cm-border, #e2e8f0)", color: "var(--cm-text, #1e293b)" }}
          data-testid="new-action-input"
        />
        <Button size="sm" onClick={handleSubmit} disabled={!title.trim()} data-testid="save-action-btn">Add</Button>
        <button onClick={onCancel} className="p-1.5 rounded hover:bg-slate-100"><X className="w-3.5 h-3.5" /></button>
      </div>
      <div className="flex items-center gap-4">
        <label className="flex items-center gap-2 cursor-pointer select-none" data-testid="assign-to-athlete-toggle">
          <div
            onClick={() => setAssignToAthlete(!assignToAthlete)}
            className="relative w-8 h-[18px] rounded-full transition-colors"
            style={{ background: assignToAthlete ? "#0d9488" : "#d1d5db" }}
          >
            <div className="absolute top-[2px] rounded-full w-[14px] h-[14px] bg-white transition-transform shadow-sm"
              style={{ left: assignToAthlete ? 15 : 2 }} />
          </div>
          <span className="text-xs font-medium" style={{ color: assignToAthlete ? "#0d9488" : "var(--cm-text-3, #94a3b8)" }}>
            Assign to Athlete
          </span>
        </label>
        {assignToAthlete && (
          <select
            value={actionType}
            onChange={e => setActionType(e.target.value)}
            className="text-xs px-2 py-1 rounded-md border outline-none"
            style={{ backgroundColor: "var(--cm-surface, white)", borderColor: "var(--cm-border, #e2e8f0)", color: "var(--cm-text, #1e293b)" }}
            data-testid="action-type-select"
          >
            {ACTION_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        )}
      </div>
    </div>
  );
}

function AddNoteForm({ onSubmit, onCancel }) {
  const [text, setText] = useState("");
  return (
    <div className="py-2">
      <textarea
        autoFocus
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder="Add a note about this school..."
        rows={3}
        className="w-full text-xs px-3 py-2 rounded-lg border outline-none focus:ring-1 focus:ring-teal-500 resize-none"
        style={{ backgroundColor: "var(--cm-surface, white)", borderColor: "var(--cm-border, #e2e8f0)", color: "var(--cm-text, #1e293b)" }}
        data-testid="new-note-input"
      />
      <div className="flex justify-end gap-2 mt-2">
        <button onClick={onCancel} className="text-xs px-3 py-1.5 rounded-lg" style={{ color: "var(--cm-text-3)" }}>Cancel</button>
        <Button size="sm" onClick={() => text.trim() && onSubmit(text.trim())} disabled={!text.trim()} data-testid="save-note-btn">Save Note</Button>
      </div>
    </div>
  );
}

// ─── Section wrapper ─────────────────────────────
function Section({ title, count, children, action, testId }) {
  return (
    <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: "var(--cm-surface, white)", borderColor: "var(--cm-border, #e2e8f0)" }} data-testid={testId}>
      <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: "var(--cm-border, #e2e8f0)" }}>
        <div className="flex items-center gap-2">
          <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--cm-text-3, #94a3b8)" }}>{title}</h3>
          {count != null && <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold" style={{ backgroundColor: "var(--cm-surface-2, #f1f5f9)", color: "var(--cm-text-3)" }}>{count}</span>}
        </div>
        {action}
      </div>
      <div className="px-4 py-2">{children}</div>
    </div>
  );
}

// ─── Main School Pod Page ────────────────────────
export default function SchoolPod() {
  const { athleteId, programId } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAddAction, setShowAddAction] = useState(false);
  const [showAddNote, setShowAddNote] = useState(false);
  const [activeAction, setActiveAction] = useState(null);
  const [notesOpen, setNotesOpen] = useState(false);

  const toggleAction = (action) => {
    if (action === "notes") { setNotesOpen(true); return; }
    setActiveAction(prev => prev === action ? null : action);
  };

  const fetchData = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/support-pods/${athleteId}/school/${programId}`, { headers: headers() });
      setData(res.data);
    } catch (err) {
      toast.error("Failed to load school pod");
    } finally {
      setLoading(false);
    }
  }, [athleteId, programId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const completeAction = async (actionId) => {
    try {
      await axios.patch(`${API}/support-pods/${athleteId}/school/${programId}/actions/${actionId}`, { status: "completed" }, { headers: headers() });
      toast.success("Action completed");
      fetchData();
    } catch { toast.error("Failed"); }
  };

  const addAction = async (title, assignToAthlete = false, actionType = null) => {
    try {
      const payload = { title, assigned_to_athlete: assignToAthlete };
      if (actionType) payload.action_type = actionType;
      await axios.post(`${API}/support-pods/${athleteId}/school/${programId}/actions`, payload, { headers: headers() });
      toast.success(assignToAthlete ? "Action assigned to athlete" : "Action created");
      setShowAddAction(false);
      fetchData();
    } catch { toast.error("Failed"); }
  };

  const addNote = async (text) => {
    try {
      await axios.post(`${API}/support-pods/${athleteId}/school/${programId}/notes`, { text }, { headers: headers() });
      toast.success("Note saved");
      setShowAddNote(false);
      fetchData();
    } catch { toast.error("Failed"); }
  };

  const savePlaybookProgress = async (checkedSteps) => {
    try {
      await axios.patch(`${API}/support-pods/${athleteId}/school/${programId}/playbook-progress`, { checked_steps: checkedSteps }, { headers: headers() });
    } catch { /* silent — don't disrupt UX for save failures */ }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: "var(--cm-text-3)" }} />
      </div>
    );
  }

  if (!data) return null;

  const { program, metrics, health, health_display, signals, actions, notes, timeline_events, stage_history, school_info, current_issue, playbook, playbook_checked_steps } = data;
  const openActions = actions.filter(a => a.status === "ready" || a.status === "open");
  const completedActions = actions.filter(a => a.status === "completed");
  const allTimeline = [
    ...timeline_events,
    ...notes.map(n => ({ ...n, type: "note_display", description: n.text, actor: n.author })),
  ].sort((a, b) => (b.created_at || "").localeCompare(a.created_at || ""));

  return (
    <div className={`-mx-4 -mt-4 sm:-mx-6 sm:-mt-6 bg-slate-50/30 min-h-screen overflow-x-hidden transition-[margin] duration-300 ease-out ${notesOpen ? "mr-[340px] sm:mr-[380px]" : ""}`} data-testid="school-pod-page">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-100" data-testid="school-pod-header">
        <div className="px-3 sm:px-6 py-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(`/support-pods/${athleteId}`)}
              className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors shrink-0"
              data-testid="back-to-athlete"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: health_display.bg }}>
              <School className="w-4.5 h-4.5" style={{ color: health_display.color }} />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="font-semibold text-gray-900 text-sm sm:text-base leading-tight truncate" data-testid="school-name">
                {program.university_name}
              </h1>
              <p className="text-[11px] text-gray-500 truncate">
                {program.division} · {program.conference} · {program.recruiting_status}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full" style={{ backgroundColor: health_display.bg, color: health_display.color }}>
                {health_display.label}
              </span>
              <button onClick={fetchData} className="p-1.5 rounded-full hover:bg-gray-100" title="Refresh" data-testid="school-refresh-btn">
                <RefreshCw className="w-3.5 h-3.5 text-gray-400" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-2 sm:px-4 py-4 sm:py-5 space-y-4 pb-28">
        {/* ─── Hero: Current Issue or Program Status ─── */}
        <div className="rounded-xl border relative overflow-hidden" style={{
          backgroundColor: current_issue ? "rgba(239,68,68,0.04)" : signals.some(s => s.priority === "critical") ? "rgba(239,68,68,0.04)" : signals.some(s => s.priority === "high") ? "rgba(245,158,11,0.04)" : "rgba(16,185,129,0.04)",
          borderColor: current_issue ? "rgba(239,68,68,0.15)" : signals.some(s => s.priority === "critical") ? "rgba(239,68,68,0.15)" : signals.some(s => s.priority === "high") ? "rgba(245,158,11,0.15)" : "rgba(16,185,129,0.15)",
        }} data-testid="school-hero">
          <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-xl" style={{
            backgroundColor: current_issue ? "#dc2626" : signals.some(s => s.priority === "critical") ? "#dc2626" : signals.some(s => s.priority === "high") ? "#d97706" : "#10b981"
          }} />
          <div className="px-4 py-3 sm:px-5 sm:py-4">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider" style={{
                color: current_issue ? "#dc2626" : signals.some(s => s.priority === "critical") ? "#dc2626" : signals.some(s => s.priority === "high") ? "#d97706" : "#10b981"
              }}>
                {current_issue ? "Active Issue" : signals[0]?.priority === "critical" ? "Critical" : signals[0]?.priority === "high" ? "Needs Attention" : "On Track"}
              </span>
            </div>
            <h2 className="text-sm sm:text-base font-bold" style={{ color: "var(--cm-text, #1e293b)" }} data-testid="school-hero-title">
              {current_issue?.title || signals[0]?.title || `${program.university_name} — ${program.recruiting_status}`}
            </h2>
            <p className="text-xs mt-1" style={{ color: "var(--cm-text-3, #94a3b8)" }}>
              {current_issue?.description || signals[0]?.description || `Reply: ${program.reply_status} · Next: ${program.next_action || "No pending action"}`}
            </p>

            {/* Quick stats */}
            <div className="flex flex-wrap gap-3 mt-3 text-[11px]" style={{ color: "var(--cm-text-2, #64748b)" }}>
              {metrics.days_since_last_engagement != null && (
                <span>Last engagement: <strong>{metrics.days_since_last_engagement}d ago</strong></span>
              )}
              {metrics.reply_rate != null && (
                <span>Reply rate: <strong>{Math.round(metrics.reply_rate * 100)}%</strong></span>
              )}
              {metrics.meaningful_interaction_count > 0 && (
                <span>Interactions: <strong>{metrics.meaningful_interaction_count}</strong></span>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex flex-wrap gap-2 mt-3" data-testid="hero-action-buttons">
              <button
                onClick={() => setActiveAction("email")}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors hover:bg-blue-50"
                style={{ color: "#2563eb", borderColor: "#bfdbfe", backgroundColor: "rgba(59,130,246,0.05)" }}
                data-testid="hero-btn-email"
              >
                <Mail className="w-3.5 h-3.5" /> Send Email
              </button>
              <button
                onClick={() => {
                  const title = `Follow up on ${current_issue?.title || signals[0]?.title || "signal"} — ${program.university_name}`;
                  addAction(title, true, "send_email");
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors hover:bg-violet-50"
                style={{ color: "#7c3aed", borderColor: "#c4b5fd", backgroundColor: "rgba(124,58,237,0.05)" }}
                data-testid="hero-btn-assign"
              >
                <Send className="w-3.5 h-3.5" /> Assign to Athlete
              </button>
              <button
                onClick={() => {
                  const title = `Log interaction with ${program.university_name}`;
                  addAction(title, false, "log_interaction");
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors hover:bg-emerald-50"
                style={{ color: "#059669", borderColor: "#a7f3d0", backgroundColor: "rgba(5,150,105,0.05)" }}
                data-testid="hero-btn-log"
              >
                <ClipboardCheck className="w-3.5 h-3.5" /> Log Interaction
              </button>
              <button
                onClick={() => setActiveAction("escalate")}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors hover:bg-red-50"
                style={{ color: "#dc2626", borderColor: "#fecaca", backgroundColor: "rgba(220,38,38,0.05)" }}
                data-testid="hero-btn-escalate"
              >
                <Flag className="w-3.5 h-3.5" /> Escalate
              </button>
              <button
                onClick={() => navigate(`/advocacy/new?athlete=${athleteId}&schoolName=${encodeURIComponent(program.university_name)}`)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors hover:bg-amber-50"
                style={{ color: "#d97706", borderColor: "#fde68a", backgroundColor: "rgba(217,119,6,0.05)" }}
                data-testid="hero-btn-advocate"
              >
                <Megaphone className="w-3.5 h-3.5" /> Advocate
              </button>
            </div>
          </div>
        </div>

        {/* ─── School Coach Info ─── */}
        {school_info && (school_info.primary_coach || school_info.coach_email) && (
          <div className="rounded-xl border px-4 py-3" style={{ backgroundColor: "var(--cm-surface, white)", borderColor: "var(--cm-border, #e2e8f0)" }} data-testid="school-coach-info">
            <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: "var(--cm-text-3)" }}>School Contact</p>
            <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs" style={{ color: "var(--cm-text, #1e293b)" }}>
              {school_info.primary_coach && <span>Coach: <strong>{school_info.primary_coach}</strong></span>}
              {school_info.coach_email && (
                <a href={`mailto:${school_info.coach_email}`} className="text-teal-600 hover:underline flex items-center gap-1">
                  <Mail className="w-3 h-3" />{school_info.coach_email}
                </a>
              )}
              {school_info.website && (
                <a href={school_info.website} target="_blank" rel="noreferrer" className="text-teal-600 hover:underline flex items-center gap-1">
                  <ExternalLink className="w-3 h-3" />Website
                </a>
              )}
            </div>
          </div>
        )}

        {/* ─── Signals ─── */}
        {signals.length > 0 && (
          <Section title="Signals" count={signals.length} testId="school-signals">
            <div className="divide-y" style={{ borderColor: "var(--cm-border, #e2e8f0)" }}>
              {signals.map(s => <SignalCard key={s.id} signal={s} />)}
            </div>
          </Section>
        )}

        {/* ─── Action Plan (auto-generated from signals) ─── */}
        {playbook && (
          <Section title="Action Plan" testId="school-action-plan">
            <ActionPlan playbook={playbook} initialChecked={playbook_checked_steps || []} onSave={savePlaybookProgress} />
          </Section>
        )}

        {/* ─── Actions ─── */}
        <Section
          title="Actions"
          count={openActions.length || null}
          testId="school-actions"
          action={
            <button onClick={() => setShowAddAction(true)} className="flex items-center gap-1 text-[10px] font-semibold text-teal-600 hover:text-teal-700" data-testid="add-action-btn">
              <Plus className="w-3 h-3" />Add
            </button>
          }
        >
          {showAddAction && <AddActionForm onSubmit={addAction} onCancel={() => setShowAddAction(false)} />}
          {openActions.length > 0 ? (
            <div className="divide-y" style={{ borderColor: "var(--cm-border, #e2e8f0)" }}>
              {openActions.map(a => <ActionItem key={a.id} action={a} onComplete={completeAction} />)}
            </div>
          ) : !showAddAction && (
            <p className="text-xs py-3 text-center" style={{ color: "var(--cm-text-3)" }}>No open actions for this school</p>
          )}
          {completedActions.length > 0 && (
            <div className="mt-2 pt-2 border-t" style={{ borderColor: "var(--cm-border, #e2e8f0)" }}>
              <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: "var(--cm-text-3)" }}>Completed ({completedActions.length})</p>
              {completedActions.slice(0, 3).map(a => (
                <div key={a.id} className="flex items-center gap-2 py-1 text-[11px]" style={{ color: "var(--cm-text-3, #94a3b8)" }}>
                  <CheckCircle2 className="w-3 h-3 shrink-0" />
                  <span className="line-through truncate">{a.title}</span>
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* ─── Notes ─── */}
        <Section
          title="Notes"
          count={notes.length || null}
          testId="school-notes"
          action={
            <button onClick={() => setShowAddNote(true)} className="flex items-center gap-1 text-[10px] font-semibold text-teal-600 hover:text-teal-700" data-testid="add-note-btn">
              <Plus className="w-3 h-3" />Add
            </button>
          }
        >
          {showAddNote && <AddNoteForm onSubmit={addNote} onCancel={() => setShowAddNote(false)} />}
          {notes.length > 0 ? (
            <div className="divide-y" style={{ borderColor: "var(--cm-border, #e2e8f0)" }}>
              {notes.map(n => (
                <div key={n.id} className="py-2.5" data-testid={`note-${n.id}`}>
                  <p className="text-xs" style={{ color: "var(--cm-text, #1e293b)" }}>{n.text}</p>
                  <p className="text-[10px] mt-1" style={{ color: "var(--cm-text-3, #94a3b8)" }}>
                    {n.author} · {n.created_at ? new Date(n.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : ""}
                  </p>
                </div>
              ))}
            </div>
          ) : !showAddNote && (
            <p className="text-xs py-3 text-center" style={{ color: "var(--cm-text-3)" }}>No notes for this school yet</p>
          )}
        </Section>

        {/* ─── Timeline ─── */}
        <Section title="Timeline" count={allTimeline.length || null} testId="school-timeline">
          {allTimeline.length > 0 ? (
            <div className="divide-y" style={{ borderColor: "var(--cm-border, #e2e8f0)" }}>
              {allTimeline.map((e, i) => <TimelineItem key={e.id || i} event={e} />)}
            </div>
          ) : (
            <p className="text-xs py-3 text-center" style={{ color: "var(--cm-text-3)" }}>No activity recorded yet</p>
          )}
        </Section>

        {/* ─── Stage History ─── */}
        {stage_history.length > 0 && (
          <Section title="Stage History" count={stage_history.length} testId="school-stage-history">
            <div className="divide-y" style={{ borderColor: "var(--cm-border, #e2e8f0)" }}>
              {stage_history.map((h, i) => (
                <div key={i} className="flex items-center gap-3 py-2 text-xs">
                  <span style={{ color: "var(--cm-text-3)" }}>{h.from_stage}</span>
                  <span>→</span>
                  <span className="font-semibold" style={{ color: "var(--cm-text)" }}>{h.to_stage}</span>
                  {h.note && <span className="text-[10px] truncate flex-1" style={{ color: "var(--cm-text-3)" }}>— {h.note}</span>}
                  <span className="text-[10px] shrink-0" style={{ color: "var(--cm-text-3)" }}>
                    {h.created_at ? new Date(h.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : ""}
                  </span>
                </div>
              ))}
            </div>
          </Section>
        )}
      </main>

      {/* Action Bar */}
      <CoachActionBar
        activeAction={activeAction}
        onToggle={toggleAction}
        notesOpen={notesOpen}
        onToggleNotes={() => setNotesOpen(!notesOpen)}
      />

      {/* Modals */}
      {activeAction === "email" && (
        <CoachEmailComposer
          athleteId={athleteId}
          athleteName=""
          programId={programId}
          schoolName={program.university_name}
          podMembers={[]}
          onCancel={() => setActiveAction(null)}
          onSent={() => { setActiveAction(null); fetchData(); }}
        />
      )}
      {activeAction === "log" && (
        <CoachLogInteraction
          athleteId={athleteId}
          athleteName=""
          programId={programId}
          schoolName={program.university_name}
          onCancel={() => setActiveAction(null)}
          onSaved={() => { setActiveAction(null); fetchData(); }}
        />
      )}
      {activeAction === "followup" && (
        <CoachFollowUpScheduler
          athleteId={athleteId}
          athleteName=""
          programId={programId}
          schoolName={program.university_name}
          onCancel={() => setActiveAction(null)}
          onSaved={() => { setActiveAction(null); fetchData(); }}
        />
      )}
      {activeAction === "escalate" && (
        <EscalateToDirector
          athleteId={athleteId}
          athleteName=""
          programId={programId}
          schoolName={program.university_name}
          onCancel={() => setActiveAction(null)}
          onSaved={() => { setActiveAction(null); fetchData(); }}
        />
      )}

      {/* Notes Sidebar */}
      <CoachNotesSidebar
        athleteId={athleteId}
        athleteName={program.university_name}
        programId={programId}
        open={notesOpen}
        onClose={() => setNotesOpen(false)}
      />
    </div>
  );
}

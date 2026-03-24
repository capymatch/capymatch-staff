import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft, School, Mail, Phone, ExternalLink, RefreshCw,
  CheckCircle2, Clock, Plus,
  ClipboardCheck, Megaphone, Flag, Loader2,
  PenLine,
} from "lucide-react";
import axios from "axios";
import { toast } from "sonner";
import { CoachActionBar } from "@/components/support-pod/CoachActionBar";
import { CoachEmailComposer } from "@/components/support-pod/CoachEmailComposer";
import { CoachLogInteraction } from "@/components/support-pod/CoachLogInteraction";
import { CoachFollowUpScheduler } from "@/components/support-pod/CoachFollowUpScheduler";
import { EscalateToDirector } from "@/components/support-pod/EscalateToDirector";
import { CoachNotesSidebar } from "@/components/support-pod/CoachNotesSidebar";
import SchoolPodRisk from "@/components/mission-control/SchoolPodRisk";

import { API, headers } from "@/components/school-pod/constants";
import { SignalCard } from "@/components/school-pod/SignalCard";
import { TaskItem } from "@/components/school-pod/TaskItem";
import { AddTaskModal } from "@/components/school-pod/AddTaskModal";
import { TimelineItem } from "@/components/school-pod/TimelineItem";
import { Section } from "@/components/school-pod/Section";
import { PipelineStatus } from "@/components/school-pod/PipelineStatus";
import { RelationshipTracker } from "@/components/school-pod/RelationshipTracker";
import { PlaybookSection } from "@/components/school-pod/PlaybookSection";

// ─── Main School Pod Page ────────────────────────
export default function SchoolPod() {
  const { athleteId, programId } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAddTask, setShowAddTask] = useState(false);
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
      toast.success("Task completed");
      fetchData();
    } catch { toast.error("Failed"); }
  };

  const addAction = async (title, assignToAthlete = false, actionType = null) => {
    try {
      const payload = { title, assigned_to_athlete: assignToAthlete };
      if (actionType) payload.action_type = actionType;
      await axios.post(`${API}/support-pods/${athleteId}/school/${programId}/actions`, payload, { headers: headers() });
      toast.success(assignToAthlete ? "Task assigned to athlete" : "Task created");
      setShowAddTask(false);
      fetchData();
    } catch { toast.error("Failed"); }
  };

  const addNote = async (text) => {
    try {
      await axios.post(`${API}/support-pods/${athleteId}/school/${programId}/notes`, { text }, { headers: headers() });
      toast.success("Note saved");
      fetchData();
    } catch { toast.error("Failed"); }
  };

  const savePlaybookProgress = async (checkedSteps) => {
    try {
      await axios.patch(`${API}/support-pods/${athleteId}/school/${programId}/playbook-progress`, { checked_steps: checkedSteps }, { headers: headers() });
    } catch { /* silent */ }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: "var(--cm-text-3)" }} />
      </div>
    );
  }

  if (!data) return null;

  const { program, metrics, health_display, hero_status, signals, actions, notes, timeline_events, stage_history, school_info, current_issue, playbook, playbook_checked_steps, athlete_context, relationship, pipeline } = data;
  const openActions = actions.filter(a => a.status === "ready" || a.status === "open");
  const completedActions = actions.filter(a => a.status === "completed");
  const allTimeline = [
    ...timeline_events,
    ...notes.map(n => ({ ...n, type: "note_display", description: n.text, actor: n.author })),
  ].sort((a, b) => (b.created_at || "").localeCompare(a.created_at || ""));

  const heroColor = hero_status?.color || "#10b981";
  const heroLabel = hero_status?.label || "On Track";

  let heroTitle = current_issue?.title || signals[0]?.title || `${program.university_name} — ${program.recruiting_status}`;
  let heroDesc = current_issue?.description || signals[0]?.description || `Reply: ${program.reply_status} · Next: ${program.next_action || "No pending action"}`;

  const athleteIdentity = [
    athlete_context?.name,
    athlete_context?.graduation_year ? `${athlete_context.graduation_year}` : "",
    athlete_context?.position || "",
  ].filter(Boolean).join(" — ");

  return (
    <div className={`bg-slate-50/30 min-h-screen overflow-x-hidden transition-[margin] duration-300 ease-out ${notesOpen ? "mr-[340px] sm:mr-[380px]" : ""}`} data-testid="school-pod-page">
      {/* Header with Athlete Context */}
      <header className="bg-white/95 border-b border-gray-100" data-testid="school-pod-header">
        <div className="px-3 sm:px-6 py-3 max-w-5xl mx-auto">
          <div className="flex items-center gap-3 min-w-0">
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
              {athleteIdentity && (
                <p className="text-[11px] font-medium" style={{ color: "var(--cm-text-2, #64748b)" }} data-testid="athlete-identity">
                  {athleteIdentity}
                </p>
              )}
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

      <main className="max-w-6xl mx-auto px-2 sm:px-4 py-4 sm:py-5 pb-28">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">

          {/* ═══ LEFT COLUMN — Actions & Workflow ═══ */}
          <div className="lg:col-span-3 space-y-4">

            {/* Hero: Current Issue */}
            <div className="rounded-xl relative overflow-hidden" style={{
              backgroundColor: "#161921",
              border: `1px solid ${heroColor}30`,
            }} data-testid="school-hero">
              <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-xl" style={{ backgroundColor: heroColor }} />
              <div className="px-4 py-3 sm:px-5 sm:py-4">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: heroColor }}>
                    {heroLabel}
                  </span>
                </div>
                <h2 className="text-sm sm:text-base font-bold" style={{ color: "#f0f0f2" }} data-testid="school-hero-title">
                  {heroTitle}
                </h2>
                <p className="text-xs mt-1" style={{ color: "#8b8d98" }}>
                  {heroDesc}
                </p>
                <div className="flex flex-wrap gap-3 mt-3 text-[11px]" style={{ color: "#5c5e6a" }}>
                  {metrics.days_since_last_engagement != null && metrics.days_since_last_engagement > 0 && metrics.days_since_last_engagement < 999 && (
                    <span>Last contact <strong style={{ color: "#f0f0f2" }}>{metrics.days_since_last_engagement} day{metrics.days_since_last_engagement !== 1 ? "s" : ""} ago</strong></span>
                  )}
                  {metrics.days_since_last_engagement === 0 && (
                    <span>Contacted <strong style={{ color: "#f0f0f2" }}>today</strong></span>
                  )}
                  {metrics.reply_rate != null && (
                    <span>Reply rate: <strong style={{ color: "#f0f0f2" }}>{Math.round(metrics.reply_rate * 100)}%</strong></span>
                  )}
                  {metrics.meaningful_interaction_count > 0 && (
                    <span>Interactions: <strong style={{ color: "#f0f0f2" }}>{metrics.meaningful_interaction_count}</strong></span>
                  )}
                </div>
              </div>
            </div>

            {/* Risk Engine v3 Context */}
            <SchoolPodRisk programId={programId} />

            {/* Quick Action Buttons */}
            <div className="flex flex-wrap gap-2" data-testid="quick-actions">
              <button
                onClick={() => setActiveAction("email")}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border transition-colors hover:bg-blue-50"
                style={{ color: "#2563eb", borderColor: "#bfdbfe", backgroundColor: "rgba(59,130,246,0.05)" }}
                data-testid="quick-btn-email"
              >
                <Mail className="w-3.5 h-3.5" /> Send Email
              </button>
              <button
                onClick={() => setActiveAction("log")}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border transition-colors hover:bg-emerald-50"
                style={{ color: "#059669", borderColor: "#a7f3d0", backgroundColor: "rgba(5,150,105,0.05)" }}
                data-testid="quick-btn-log"
              >
                <ClipboardCheck className="w-3.5 h-3.5" /> Log Interaction
              </button>
              <button
                onClick={() => setActiveAction("followup")}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border transition-colors hover:bg-orange-50"
                style={{ color: "#d97706", borderColor: "#fde68a", backgroundColor: "rgba(217,119,6,0.05)" }}
                data-testid="quick-btn-followup"
              >
                <Clock className="w-3.5 h-3.5" /> Schedule Follow-up
              </button>
              <button
                onClick={() => navigate(`/advocacy/new?athlete=${athleteId}&schoolName=${encodeURIComponent(program.university_name)}`)}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border transition-colors hover:bg-amber-50"
                style={{ color: "#92400e", borderColor: "#fde68a", backgroundColor: "rgba(146,64,14,0.05)" }}
                data-testid="quick-btn-advocate"
              >
                <Megaphone className="w-3.5 h-3.5" /> Advocate
              </button>
              <button
                onClick={() => setActiveAction("escalate")}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border transition-colors hover:bg-red-50"
                style={{ color: "#dc2626", borderColor: "#fecaca", backgroundColor: "rgba(220,38,38,0.05)" }}
                data-testid="quick-btn-escalate"
              >
                <Flag className="w-3.5 h-3.5" /> Escalate
              </button>
            </div>

            {/* Playbook */}
            {playbook && (
              <PlaybookSection
                playbook={playbook}
                initialChecked={playbook_checked_steps || []}
                onSave={savePlaybookProgress}
              />
            )}

            {/* Tasks */}
            <Section
              title="Tasks"
              count={openActions.length || null}
              testId="school-tasks"
              action={
                <button onClick={() => setShowAddTask(true)} className="flex items-center gap-1 text-[10px] font-semibold text-teal-600 hover:text-teal-700" data-testid="add-task-btn">
                  <Plus className="w-3 h-3" />Add
                </button>
              }
            >
              <AddTaskModal open={showAddTask} onOpenChange={setShowAddTask} onSubmit={addAction} />
              {openActions.length > 0 ? (
                <div className="divide-y" style={{ borderColor: "var(--cm-border, #e2e8f0)" }}>
                  {openActions.map(a => <TaskItem key={a.id} action={a} onComplete={completeAction} onUpdate={fetchData} athleteId={athleteId} programId={programId} />)}
                </div>
              ) : (
                <p className="text-xs py-3 text-center" style={{ color: "var(--cm-text-3)" }}>No open tasks</p>
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

            {/* Timeline */}
            <Section title="Timeline" count={allTimeline.length || null} testId="school-timeline">
              {allTimeline.length > 0 ? (
                <div className="divide-y" style={{ borderColor: "var(--cm-border, #e2e8f0)" }}>
                  {allTimeline.map((e, i) => <TimelineItem key={e.id || i} event={e} />)}
                </div>
              ) : (
                <p className="text-xs py-3 text-center" style={{ color: "var(--cm-text-3)" }}>No activity recorded yet</p>
              )}
            </Section>

            {/* Stage History */}
            {stage_history.length > 0 && (
              <Section title="Stage History" count={stage_history.length} testId="school-stage-history">
                <div className="divide-y" style={{ borderColor: "var(--cm-border, #e2e8f0)" }}>
                  {stage_history.map((h, i) => (
                    <div key={i} className="flex items-center gap-2 py-2 text-xs flex-wrap">
                      <span style={{ color: "var(--cm-text-3)" }}>{h.from_stage}</span>
                      <span>&#8594;</span>
                      <span className="font-semibold" style={{ color: "var(--cm-text)" }}>{h.to_stage}</span>
                      {h.note && <span className="text-[10px] truncate" style={{ color: "var(--cm-text-3)" }}>— {h.note}</span>}
                      <span className="text-[10px] ml-auto shrink-0" style={{ color: "var(--cm-text-3)" }}>
                        {h.created_at ? new Date(h.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : ""}
                      </span>
                    </div>
                  ))}
                </div>
              </Section>
            )}
          </div>

          {/* ═══ RIGHT COLUMN — Context & History ═══ */}
          <div className="lg:col-span-2 space-y-4">

            {/* School Contact */}
            {school_info && (school_info.primary_coach || school_info.coach_email) && (
              <div className="rounded-xl border px-4 py-3" style={{ backgroundColor: "var(--cm-surface, white)", borderColor: "var(--cm-border, #e2e8f0)" }} data-testid="school-coach-info">
                <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: "var(--cm-text-3)" }}>School Contact</p>
                <div className="flex flex-col gap-1.5 text-xs" style={{ color: "var(--cm-text, #1e293b)" }}>
                  {school_info.primary_coach && <span>Coach: <strong>{school_info.primary_coach}</strong></span>}
                  {school_info.coach_email && (
                    <a href={`mailto:${school_info.coach_email}`} className="text-teal-600 hover:underline flex items-center gap-1">
                      <Mail className="w-3 h-3" />{school_info.coach_email}
                    </a>
                  )}
                  {school_info.coach_phone && (
                    <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{school_info.coach_phone}</span>
                  )}
                  {school_info.website && (
                    <a href={school_info.website} target="_blank" rel="noreferrer" className="text-teal-600 hover:underline flex items-center gap-1">
                      <ExternalLink className="w-3 h-3" />Website
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* Signals */}
            {signals.length > 0 && (
              <Section title="Signals" count={signals.length} testId="school-signals">
                <div className="divide-y" style={{ borderColor: "var(--cm-border, #e2e8f0)" }}>
                  {signals.map(s => <SignalCard key={s.id} signal={s} />)}
                </div>
              </Section>
            )}

            {/* Relationship Tracker */}
            <RelationshipTracker relationship={relationship} />
            <PipelineStatus pipeline={pipeline} />
          </div>
        </div>
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

      {/* Right-edge Notes Tab + Panel */}
      {!notesOpen && (
        <button
          onClick={() => setNotesOpen(true)}
          className="fixed right-0 top-1/2 -translate-y-1/2 z-40 flex flex-col items-center gap-2 px-2.5 py-3 rounded-l-xl border border-r-0 transition-all hover:px-3"
          style={{ backgroundColor: "var(--cm-surface, white)", borderColor: "var(--cm-border, #e2e8f0)", boxShadow: "-4px 0 20px rgba(0,0,0,0.08)" }}
          data-testid="notes-tab"
        >
          <PenLine className="w-4 h-4 text-amber-400" />
          <span className="text-[10px] font-semibold" style={{ writingMode: "vertical-rl", color: "var(--cm-text-3, #94a3b8)" }}>My Notes</span>
          {notes.length > 0 && (
            <span className="rounded-full bg-teal-600 text-white text-[9px] font-bold flex items-center justify-center" style={{ minWidth: 18, minHeight: 18 }}>
              {notes.length}
            </span>
          )}
        </button>
      )}

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

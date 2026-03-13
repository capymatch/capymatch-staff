import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { useAuth } from "@/AuthContext";
import {
  CheckCircle2, School, ChevronRight, AlertTriangle, Clock,
  TrendingUp, ArrowRight, Loader2
} from "lucide-react";
import PodHeader from "@/components/support-pod/PodHeader";
import PodHeroCard from "@/components/support-pod/PodHeroCard";
import NextActions from "@/components/support-pod/NextActions";
import QuickSummary from "@/components/support-pod/QuickSummary";
import PodMembers from "@/components/support-pod/PodMembers";
import KeySignals from "@/components/support-pod/KeySignals";
import ActionPlan from "@/components/support-pod/ActionPlan";
import RecruitingTimeline from "@/components/support-pod/RecruitingTimeline";
import ActivityHistory from "@/components/support-pod/ActivityHistory";
import { CollapsibleSection } from "@/components/support-pod/CollapsibleSection";
import { CoachActionBar } from "@/components/support-pod/CoachActionBar";
import { CoachEmailComposer } from "@/components/support-pod/CoachEmailComposer";
import { CoachLogInteraction } from "@/components/support-pod/CoachLogInteraction";
import { CoachFollowUpScheduler } from "@/components/support-pod/CoachFollowUpScheduler";
import { EscalateToDirector } from "@/components/support-pod/EscalateToDirector";
import { CoachNotesSidebar } from "@/components/support-pod/CoachNotesSidebar";
import { toast } from "sonner";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const POLL_INTERVAL = 60000;

// ─── School Row ─────────────────────────────────────
function SchoolRow({ school, athleteId }) {
  const navigate = useNavigate();
  const healthColors = {
    at_risk: { bg: "rgba(239,68,68,0.08)", text: "#ef4444", dot: "bg-red-500" },
    needs_attention: { bg: "rgba(245,158,11,0.08)", text: "#f59e0b", dot: "bg-amber-500" },
    awaiting_reply: { bg: "rgba(59,130,246,0.08)", text: "#3b82f6", dot: "bg-blue-500" },
    active: { bg: "rgba(13,148,136,0.08)", text: "#0d9488", dot: "bg-teal-500" },
    strong_momentum: { bg: "rgba(16,185,129,0.08)", text: "#10b981", dot: "bg-emerald-500" },
    still_early: { bg: "rgba(100,116,139,0.08)", text: "#64748b", dot: "bg-slate-400" },
  };
  const c = healthColors[school.health] || healthColors.still_early;

  return (
    <button
      onClick={() => navigate(`/support-pods/${athleteId}/school/${school.program_id}`)}
      className="w-full flex items-center gap-3 px-4 py-3 text-left group hover:bg-slate-50/80 transition-colors"
      data-testid={`school-row-${school.program_id}`}
    >
      {/* Health indicator */}
      <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: c.bg }}>
        <School className="w-4 h-4" style={{ color: c.text }} />
      </div>

      {/* Main content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-xs sm:text-sm font-semibold truncate" style={{ color: "var(--cm-text, #1e293b)" }}>
            {school.university_name}
          </p>
          <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded shrink-0" style={{ backgroundColor: c.bg, color: c.text }}>
            {school.health_label}
          </span>
        </div>
        <div className="flex items-center gap-2 mt-0.5 text-[11px]" style={{ color: "var(--cm-text-3, #94a3b8)" }}>
          <span>{school.recruiting_status}</span>
          <span>·</span>
          <span>{school.reply_status}</span>
          {school.days_since_last_engagement != null && (
            <>
              <span>·</span>
              <span>{school.days_since_last_engagement}d ago</span>
            </>
          )}
        </div>
      </div>

      {/* Right: next action + arrow */}
      <div className="flex items-center gap-2 shrink-0">
        {school.next_action && (
          <span className="hidden sm:block text-[10px] max-w-[160px] truncate px-2 py-1 rounded-lg border" style={{ color: "var(--cm-text-2, #64748b)", borderColor: "var(--cm-border, #e2e8f0)" }}>
            {school.next_action}
          </span>
        )}
        {school.overdue_followups > 0 && (
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-red-50 text-red-600 shrink-0">
            {school.overdue_followups} overdue
          </span>
        )}
        <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 transition-colors shrink-0" />
      </div>
    </button>
  );
}

// ─── School List Section ────────────────────────────
function SchoolListSection({ schools, athleteId, loading }) {
  const needsAttention = schools.filter(s => s.health === "at_risk" || s.health === "needs_attention");
  const others = schools.filter(s => s.health !== "at_risk" && s.health !== "needs_attention");

  if (loading) {
    return (
      <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: "var(--cm-surface, white)", borderColor: "var(--cm-border, #e2e8f0)" }}>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-5 h-5 animate-spin" style={{ color: "var(--cm-text-3)" }} />
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: "var(--cm-surface, white)", borderColor: "var(--cm-border, #e2e8f0)" }} data-testid="school-list-section">
      <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: "var(--cm-border, #e2e8f0)" }}>
        <div className="flex items-center gap-2">
          <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--cm-text-3, #94a3b8)" }}>Target Schools</h3>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold" style={{ backgroundColor: "var(--cm-surface-2, #f1f5f9)", color: "var(--cm-text-3)" }}>{schools.length}</span>
          {needsAttention.length > 0 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold bg-red-50 text-red-600">
              {needsAttention.length} need attention
            </span>
          )}
        </div>
      </div>

      <div className="divide-y" style={{ borderColor: "var(--cm-border, #e2e8f0)" }}>
        {needsAttention.map(s => <SchoolRow key={s.program_id} school={s} athleteId={athleteId} />)}
        {others.map(s => <SchoolRow key={s.program_id} school={s} athleteId={athleteId} />)}
      </div>

      {schools.length === 0 && (
        <p className="text-xs py-6 text-center" style={{ color: "var(--cm-text-3)" }}>No target schools found</p>
      )}
    </div>
  );
}

// ─── Main SupportPod Page ───────────────────────────
function SupportPod() {
  const { athleteId } = useParams();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [schools, setSchools] = useState([]);
  const [schoolsLoading, setSchoolsLoading] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState(null);
  const [isPolling, setIsPolling] = useState(false);
  const [activeAction, setActiveAction] = useState(null);
  const [notesOpen, setNotesOpen] = useState(false);
  const pollRef = useRef(null);

  const fetchPodData = useCallback(async (showRefresh = false) => {
    if (showRefresh) setIsPolling(true);
    try {
      const res = await axios.get(`${API}/support-pods/${athleteId}`);
      setData(res.data);
      setLastRefreshed(new Date());
    } catch (err) {
      toast.error("Failed to load pod data");
    } finally {
      setLoading(false);
      setIsPolling(false);
    }
  }, [athleteId]);

  const fetchSchools = useCallback(async () => {
    try {
      const token = localStorage.getItem("capymatch_token");
      const res = await axios.get(`${API}/support-pods/${athleteId}/schools`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSchools(res.data.schools || []);
    } catch (err) {
      console.error("Failed to load schools", err);
    } finally {
      setSchoolsLoading(false);
    }
  }, [athleteId]);

  useEffect(() => {
    fetchPodData();
    fetchSchools();
    pollRef.current = setInterval(() => fetchPodData(), POLL_INTERVAL);
    return () => clearInterval(pollRef.current);
  }, [fetchPodData, fetchSchools]);

  useEffect(() => {
    const action = searchParams.get("action");
    if (action && ["email", "log", "followup", "notes", "escalate"].includes(action)) {
      if (action === "notes") setNotesOpen(true);
      else setActiveAction(action);
    }
  }, [searchParams]);

  const toggleAction = (action) => {
    if (action === "notes") { setNotesOpen(true); return; }
    setActiveAction(prev => prev === action ? null : action);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen" data-testid="pod-loading">
        <div className="w-6 h-6 border-2 border-slate-300 border-t-slate-800 rounded-full animate-spin" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-center px-4" data-testid="pod-error">
        <p className="text-sm text-slate-500 mb-2">Could not load pod data</p>
        <button onClick={() => fetchPodData(true)} className="text-sm font-medium text-slate-800 underline">Retry</button>
      </div>
    );
  }

  const {
    athlete, pod_members, actions, timeline, pod_health, upcoming_events,
    recruiting_timeline, recruiting_signals, intervention_playbook, current_issue,
  } = data;

  // Filter athlete-level actions (no program_id)
  const athleteLevelActions = (actions || []).filter(a => !a.program_id);
  const completedActions = athleteLevelActions.filter(a => a.status === "completed").slice(0, 8);

  return (
    <div data-testid="support-pod-page" className={`-mx-4 -mt-4 sm:-mx-6 sm:-mt-6 bg-slate-50/30 min-h-screen overflow-x-hidden transition-[margin] duration-300 ease-out ${notesOpen ? "mr-[340px] sm:mr-[380px]" : ""}`}>
      <PodHeader
        athlete={athlete}
        podHealth={pod_health}
        lastRefreshed={lastRefreshed}
        isPolling={isPolling}
        onManualRefresh={() => { fetchPodData(true); fetchSchools(); }}
        athleteId={athleteId}
      />

      <main className="max-w-5xl mx-auto px-2 sm:px-4 py-4 sm:py-5 space-y-4 sm:space-y-5 pb-36 sm:pb-28">

        {/* ─── 1. Athlete-Level Hero ─── */}
        <PodHeroCard
          currentIssue={current_issue}
          recruitingSignals={recruiting_signals}
          athleteId={athleteId}
          onLogCheckin={() => toggleAction("log")}
          onSendMessage={() => toggleAction("email")}
          onEscalate={() => toggleAction("escalate")}
          onOpenNotes={() => setNotesOpen(true)}
          onRefresh={fetchPodData}
        />

        {/* ─── 2. TARGET SCHOOLS (primary content) ─── */}
        <SchoolListSection schools={schools} athleteId={athleteId} loading={schoolsLoading} />

        {/* ─── 3. Athlete-Level Actions (non-school-specific) ─── */}
        {athleteLevelActions.filter(a => a.status !== "completed").length > 0 && (
          <CollapsibleSection title="Athlete-Level Actions" count={`${athleteLevelActions.filter(a => a.status !== "completed").length}`} defaultOpen={true} testId="section-athlete-actions">
            <NextActions actions={athleteLevelActions} athleteId={athleteId} podMembers={pod_members} currentUser={user} onRefresh={fetchPodData} />
          </CollapsibleSection>
        )}

        {/* ─── 4. Key Signals (athlete-level overview) ─── */}
        {recruiting_signals && recruiting_signals.length > 0 && (
          <CollapsibleSection title="Athlete Signals Overview" count={`${recruiting_signals.length}`} testId="section-key-signals">
            <KeySignals signals={recruiting_signals} />
          </CollapsibleSection>
        )}

        {/* ─── 5. Action Plan / Playbook (athlete-level) ─── */}
        {intervention_playbook && (
          <CollapsibleSection title="Action Plan" testId="section-action-plan">
            <ActionPlan playbook={intervention_playbook} />
          </CollapsibleSection>
        )}

        {/* ─── 6. Timeline ─── */}
        <CollapsibleSection title="Timeline" testId="section-timeline">
          <ActivityHistory timeline={timeline} />
        </CollapsibleSection>

        {/* ─── 7. Athlete Context ─── */}
        <CollapsibleSection title="Athlete Context" testId="section-athlete-context">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 sm:gap-5">
            <div className="lg:col-span-2">
              <QuickSummary athlete={athlete} events={upcoming_events} />
            </div>
            <div className="lg:col-span-3">
              <PodMembers
                members={pod_members}
                onMessage={() => toggleAction("email")}
                onLogCall={() => toggleAction("log")}
              />
            </div>
          </div>
        </CollapsibleSection>

        {/* ─── 8. Recruiting Timeline ─── */}
        {recruiting_timeline && recruiting_timeline.length > 0 && (
          <CollapsibleSection title="Recruiting Timeline" count={`${recruiting_timeline.length}`} testId="section-recruiting-timeline">
            <RecruitingTimeline milestones={recruiting_timeline} />
          </CollapsibleSection>
        )}

        {/* ─── 9. Completed Actions ─── */}
        {completedActions.length > 0 && (
          <CollapsibleSection title="Completed Actions" count={`${completedActions.length}`} testId="section-completed-actions">
            <div className="space-y-1 px-1">
              {completedActions.map(a => (
                <div key={a.id} className="flex items-center gap-2 text-[11px] py-1" style={{ color: "var(--cm-text-3, #94a3b8)" }}>
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" style={{ color: "var(--cm-text-3, #cbd5e1)" }} />
                  <span className="line-through">{a.title}</span>
                </div>
              ))}
            </div>
          </CollapsibleSection>
        )}

      </main>

      <CoachActionBar
        activeAction={activeAction}
        onToggle={toggleAction}
        notesOpen={notesOpen}
        onToggleNotes={() => setNotesOpen(!notesOpen)}
      />

      {activeAction === "email" && (
        <CoachEmailComposer athleteId={athleteId} athleteName={athlete?.full_name || athlete?.first_name || "Athlete"} podMembers={pod_members}
          onCancel={() => setActiveAction(null)} onSent={() => { setActiveAction(null); fetchPodData(); }} />
      )}
      {activeAction === "log" && (
        <CoachLogInteraction athleteId={athleteId} athlete={athlete}
          onCancel={() => setActiveAction(null)} onSaved={() => { setActiveAction(null); fetchPodData(); }} />
      )}
      {activeAction === "followup" && (
        <CoachFollowUpScheduler athleteId={athleteId} athlete={athlete}
          onCancel={() => setActiveAction(null)} onSaved={() => { setActiveAction(null); fetchPodData(); }} />
      )}
      {activeAction === "escalate" && (
        <EscalateToDirector athleteId={athleteId} athlete={athlete}
          onCancel={() => setActiveAction(null)} onSaved={() => { setActiveAction(null); fetchPodData(); }} />
      )}
      <CoachNotesSidebar athleteId={athleteId} open={notesOpen} onClose={() => setNotesOpen(false)} />
    </div>
  );
}

export default SupportPod;

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import axios from "axios";
import { useAuth } from "@/AuthContext";
import { CheckCircle2 } from "lucide-react";
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

function SupportPod() {
  const { athleteId } = useParams();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
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

  useEffect(() => {
    fetchPodData();
    pollRef.current = setInterval(() => fetchPodData(), POLL_INTERVAL);
    return () => clearInterval(pollRef.current);
  }, [fetchPodData]);

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

  const completedActions = (actions || []).filter(a => a.status === "completed").slice(0, 8);

  return (
    <div data-testid="support-pod-page" className={`-mx-4 -mt-4 sm:-mx-6 sm:-mt-6 bg-slate-50/30 min-h-screen overflow-x-hidden transition-[margin] duration-300 ease-out ${notesOpen ? "mr-[340px] sm:mr-[380px]" : ""}`}>
      {/* Header */}
      <PodHeader
        athlete={athlete}
        podHealth={pod_health}
        lastRefreshed={lastRefreshed}
        isPolling={isPolling}
        onManualRefresh={() => fetchPodData(true)}
        athleteId={athleteId}
      />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-4 sm:py-5 space-y-4 sm:space-y-5 pb-36 sm:pb-28">

        {/* ─── 1. DIAGNOSE: Critical Banner ─── */}
        <PodHeroCard
          currentIssue={current_issue}
          athleteId={athleteId}
          onLogCheckin={() => toggleAction("log")}
          onSendMessage={() => toggleAction("email")}
          onEscalate={() => toggleAction("escalate")}
          onOpenNotes={() => setNotesOpen(true)}
          onRefresh={fetchPodData}
        />

        {/* ─── 2. DIAGNOSE: Key Signals (always open) ─── */}
        {recruiting_signals && recruiting_signals.length > 0 && (
          <CollapsibleSection title="Key Signals" count={`${recruiting_signals.length}`} defaultOpen={true} testId="section-key-signals">
            <KeySignals signals={recruiting_signals} />
          </CollapsibleSection>
        )}

        {/* ─── 3. PLAN: Action Plan / Playbook (always open) ─── */}
        {intervention_playbook && (
          <CollapsibleSection title="Action Plan" defaultOpen={true} testId="section-action-plan">
            <ActionPlan playbook={intervention_playbook} />
          </CollapsibleSection>
        )}

        {/* ─── 4. ACT: Next Actions (always open) ─── */}
        <NextActions actions={actions} athleteId={athleteId} podMembers={pod_members} currentUser={user} onRefresh={fetchPodData} />

        {/* ─── 5. RECORD: Timeline (always open) ─── */}
        <CollapsibleSection title="Timeline" defaultOpen={true} testId="section-timeline">
          <ActivityHistory timeline={timeline} />
        </CollapsibleSection>

        {/* ─── Reference: Athlete Context (collapsed) ─── */}
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

        {/* ─── 6. Recruiting Timeline (collapsed) ─── */}
        {recruiting_timeline && recruiting_timeline.length > 0 && (
          <CollapsibleSection title="Recruiting Timeline" count={`${recruiting_timeline.length}`} testId="section-recruiting-timeline">
            <RecruitingTimeline milestones={recruiting_timeline} />
          </CollapsibleSection>
        )}

        {/* ─── 7. Completed Actions (collapsed) ─── */}
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

      {/* Floating Action Bar: Log | Email | Follow-up | Notes | Escalate */}
      <CoachActionBar
        activeAction={activeAction}
        onToggle={toggleAction}
        notesOpen={notesOpen}
        onToggleNotes={() => setNotesOpen(!notesOpen)}
      />

      {/* Action Modals */}
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

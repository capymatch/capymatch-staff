import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import axios from "axios";
import { useAuth } from "@/AuthContext";
import { Radar, ClipboardList, GitBranch, FileText } from "lucide-react";
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
    athlete, active_intervention, all_interventions, pod_members, actions,
    timeline, pod_health, upcoming_events, unassigned_count,
    recruiting_timeline, recruiting_signals, intervention_playbook,
    pod_top_action,
  } = data;

  return (
    <div data-testid="support-pod-page" className="-mx-4 -mt-4 sm:-mx-6 sm:-mt-6 bg-slate-50/30 min-h-screen">
      {/* Header */}
      <PodHeader
        athlete={athlete}
        podHealth={pod_health}
        lastRefreshed={lastRefreshed}
        isPolling={isPolling}
        onManualRefresh={() => fetchPodData(true)}
        athleteId={athleteId}
      />

      <main className="max-w-2xl mx-auto px-4 py-5 space-y-5 pb-28">

        {/* 1. Hero Card — expanded, the single source of truth */}
        <PodHeroCard
          topAction={pod_top_action}
          athleteId={athleteId}
          onLogCheckin={() => toggleAction("log")}
          onSendMessage={() => toggleAction("email")}
          onEscalate={() => toggleAction("escalate")}
          onRefresh={fetchPodData}
        />

        {/* 2. Next Actions — expanded */}
        <NextActions actions={actions} athleteId={athleteId} podMembers={pod_members} currentUser={user} onRefresh={fetchPodData} />

        {/* 3. Quick Summary — expanded */}
        <div>
          <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Quick Summary</h3>
          <QuickSummary athlete={athlete} events={upcoming_events} />
        </div>

        {/* 4. Pod Members — expanded */}
        <div>
          <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Pod Members</h3>
          <PodMembers
            members={pod_members}
            onMessage={() => toggleAction("email")}
            onLogCall={() => toggleAction("log")}
          />
        </div>

        {/* ─── Collapsed sections below ─── */}

        {/* 5. Key Signals */}
        {recruiting_signals && recruiting_signals.length > 0 && (
          <CollapsibleSection
            title="Key Signals"
            count={`${recruiting_signals.length}`}
            testId="section-key-signals"
          >
            <KeySignals signals={recruiting_signals} />
          </CollapsibleSection>
        )}

        {/* 6. Action Plan */}
        {intervention_playbook && (
          <CollapsibleSection
            title="Action Plan"
            testId="section-action-plan"
          >
            <ActionPlan playbook={intervention_playbook} />
          </CollapsibleSection>
        )}

        {/* 7. Recruiting Timeline */}
        {recruiting_timeline && recruiting_timeline.length > 0 && (
          <CollapsibleSection
            title="Recruiting Timeline"
            count={`${recruiting_timeline.length}`}
            testId="section-recruiting-timeline"
          >
            <RecruitingTimeline milestones={recruiting_timeline} />
          </CollapsibleSection>
        )}

        {/* 8. Activity History */}
        <CollapsibleSection
          title="Activity History"
          testId="section-activity-history"
        >
          <ActivityHistory timeline={timeline} />
        </CollapsibleSection>

      </main>

      {/* Floating Action Bar */}
      <CoachActionBar
        activeAction={activeAction}
        onToggle={toggleAction}
        notesOpen={notesOpen}
        onToggleNotes={() => setNotesOpen(!notesOpen)}
      />

      {/* Action Modals */}
      {activeAction === "email" && (
        <CoachEmailComposer athleteId={athleteId} athlete={athlete} podMembers={pod_members}
          onClose={() => setActiveAction(null)} onSent={() => { setActiveAction(null); fetchPodData(); }} />
      )}
      {activeAction === "log" && (
        <CoachLogInteraction athleteId={athleteId} athlete={athlete}
          onClose={() => setActiveAction(null)} onSaved={() => { setActiveAction(null); fetchPodData(); }} />
      )}
      {activeAction === "followup" && (
        <CoachFollowUpScheduler athleteId={athleteId} athlete={athlete}
          onClose={() => setActiveAction(null)} onScheduled={() => { setActiveAction(null); fetchPodData(); }} />
      )}
      {activeAction === "escalate" && (
        <EscalateToDirector athleteId={athleteId} athlete={athlete}
          onClose={() => setActiveAction(null)} onEscalated={() => { setActiveAction(null); fetchPodData(); }} />
      )}
      {notesOpen && (
        <CoachNotesSidebar athleteId={athleteId} onClose={() => setNotesOpen(false)} />
      )}
    </div>
  );
}

export default SupportPod;

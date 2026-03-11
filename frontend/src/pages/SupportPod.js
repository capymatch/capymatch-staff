import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import axios from "axios";
import { useAuth } from "@/AuthContext";
import PodHeader from "@/components/support-pod/PodHeader";
import QuickActionsBar from "@/components/support-pod/QuickActionsBar";
import ActiveIssueBanner from "@/components/support-pod/ActiveIssueBanner";
import AthleteSnapshot from "@/components/support-pod/AthleteSnapshot";
import PodMembers from "@/components/support-pod/PodMembers";
import NextActions from "@/components/support-pod/NextActions";
import RecruitingIntelligence from "@/components/support-pod/RecruitingIntelligence";
import InterventionPlaybooks from "@/components/support-pod/InterventionPlaybooks";
import RecruitingTimeline from "@/components/support-pod/RecruitingTimeline";
import TreatmentTimeline from "@/components/support-pod/TreatmentTimeline";
import { toast } from "sonner";
import { AiSuggestedActions } from "@/components/AiV2Components";
import QuickNote from "@/components/QuickNote";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const POLL_INTERVAL_MS = 30000;

function SupportPod() {
  const { athleteId } = useParams();
  const [searchParams] = useSearchParams();
  const context = searchParams.get("context");
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState(null);
  const [isPolling, setIsPolling] = useState(false);
  const pollRef = useRef(null);

  useEffect(() => {
    if (user?.role !== "club_coach") return;
    const track = async () => {
      try {
        await Promise.all([
          axios.post(`${API}/onboarding/complete-step`, { step: "meet_roster" }),
          axios.post(`${API}/onboarding/complete-step`, { step: "support_pod" }),
        ]);
      } catch { /* silent */ }
    };
    track();
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchPodData = useCallback(async (silent = false) => {
    try {
      if (silent) setIsPolling(true);
      const url = context
        ? `${API}/support-pods/${athleteId}?context=${context}`
        : `${API}/support-pods/${athleteId}`;
      const response = await axios.get(url);
      setData(response.data);
      setLastRefreshed(new Date());
    } catch (error) {
      console.error("Failed to load Support Pod:", error);
      if (!silent) toast.error("Failed to load Support Pod");
    } finally {
      setLoading(false);
      setIsPolling(false);
    }
  }, [athleteId, context]);

  useEffect(() => { fetchPodData(false); }, [fetchPodData]);

  useEffect(() => {
    pollRef.current = setInterval(() => fetchPodData(true), POLL_INTERVAL_MS);
    return () => clearInterval(pollRef.current);
  }, [fetchPodData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto mb-3" />
          <p className="text-sm text-gray-500">Loading Support Pod...</p>
        </div>
      </div>
    );
  }

  if (!data || data.error) {
    return (
      <div className="flex items-center justify-center py-32">
        <p className="text-gray-500">Athlete not found</p>
      </div>
    );
  }

  const {
    athlete, active_intervention, all_interventions, pod_members, actions,
    timeline, pod_health, upcoming_events, unassigned_count,
    recruiting_timeline, recruiting_signals, intervention_playbook,
  } = data;

  return (
    <div data-testid="support-pod-page" className="-mx-4 -mt-4 sm:-mx-6 sm:-mt-6">
      {/* Header */}
      <PodHeader
        athlete={athlete}
        podHealth={pod_health}
        lastRefreshed={lastRefreshed}
        isPolling={isPolling}
        onManualRefresh={() => fetchPodData(true)}
        athleteId={athleteId}
      />

      {/* Quick Actions Bar */}
      <QuickActionsBar
        athleteId={athleteId}
        athleteName={athlete?.full_name}
        onRefresh={fetchPodData}
      />

      <main className="max-w-[1400px] mx-auto px-3 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6">
        {/* Active Issue Banner */}
        {!bannerDismissed && active_intervention && (
          <ActiveIssueBanner
            intervention={active_intervention}
            athleteId={athleteId}
            onResolve={() => { setBannerDismissed(true); fetchPodData(); }}
            onDismiss={() => setBannerDismissed(true)}
          />
        )}

        {/* Athlete Snapshot + Support Team */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-2">
            <AthleteSnapshot athlete={athlete} interventions={all_interventions} events={upcoming_events} />
          </div>
          <div className="lg:col-span-3">
            <PodMembers members={pod_members} unassignedCount={unassigned_count} athleteId={athleteId} onRefresh={fetchPodData} />
          </div>
        </div>

        {/* Next Actions */}
        <NextActions actions={actions} athleteId={athleteId} onRefresh={fetchPodData} />

        {/* Recruiting Intelligence */}
        <RecruitingIntelligence signals={recruiting_signals} />

        {/* Intervention Playbook (single, based on active issue) */}
        <InterventionPlaybooks
          playbook={intervention_playbook}
          interventionCategory={active_intervention?.category}
        />

        {/* Coaching Suggestions (AI) */}
        <AiSuggestedActions
          endpoint={`${API}/ai/pod-actions/${athleteId}`}
          label="Coaching Suggestions"
          buttonLabel="Get Coaching Suggestions"
          helperText="AI will analyze this athlete's situation and suggest next steps"
        />

        {/* Recruiting Timeline */}
        <RecruitingTimeline milestones={recruiting_timeline} />

        {/* Quick Note */}
        <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm" data-testid="pod-quick-note">
          <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">Add Note</h3>
          <QuickNote athleteId={athleteId} athleteName={athlete?.full_name} onSaved={fetchPodData} />
        </div>

        {/* Treatment History */}
        <TreatmentTimeline timeline={timeline} />
      </main>
    </div>
  );
}

export default SupportPod;

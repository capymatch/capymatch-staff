import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import axios from "axios";
import { useAuth } from "@/AuthContext";
import PodHeader from "@/components/support-pod/PodHeader";
import ActiveIssueBanner from "@/components/support-pod/ActiveIssueBanner";
import AthleteSnapshot from "@/components/support-pod/AthleteSnapshot";
import PodMembers from "@/components/support-pod/PodMembers";
import NextActions from "@/components/support-pod/NextActions";
import TreatmentTimeline from "@/components/support-pod/TreatmentTimeline";
import { toast } from "sonner";
import { AiPodBrief, AiSuggestedActions } from "@/components/AiV2Components";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const POLL_INTERVAL_MS = 30000; // 30 seconds

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

  // Track onboarding steps for coaches
  useEffect(() => {
    if (user?.role !== "coach") return;
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

  // Initial fetch
  useEffect(() => { fetchPodData(false); }, [fetchPodData]);

  // Polling interval — silent background refresh
  useEffect(() => {
    pollRef.current = setInterval(() => fetchPodData(true), POLL_INTERVAL_MS);
    return () => clearInterval(pollRef.current);
  }, [fetchPodData]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="flex items-center justify-center py-32">
          <div className="text-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto mb-3" />
            <p className="text-sm text-gray-500">Loading Support Pod...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!data || data.error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Athlete not found</p>
      </div>
    );
  }

  const { athlete, active_intervention, all_interventions, pod_members, actions, timeline, pod_health, upcoming_events, unassigned_count } = data;

  return (
    <div className="min-h-screen bg-gray-50" data-testid="support-pod-page">
      <PodHeader
        athlete={athlete}
        podHealth={pod_health}
        lastRefreshed={lastRefreshed}
        isPolling={isPolling}
        onManualRefresh={() => fetchPodData(true)}
      />

      <main className="max-w-[1400px] mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* AI V2: Pod Brief */}
        <AiPodBrief endpoint={`${API}/ai/pod-brief/${athleteId}`} />

        {/* Block 1: Active Issue Banner */}
        {!bannerDismissed && active_intervention && (
          <ActiveIssueBanner
            intervention={active_intervention}
            athleteId={athleteId}
            onResolve={() => { setBannerDismissed(true); fetchPodData(); }}
            onDismiss={() => setBannerDismissed(true)}
          />
        )}

        {/* Blocks 2 + 3: Athlete Snapshot + Pod Members (side by side) */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-2">
            <AthleteSnapshot athlete={athlete} interventions={all_interventions} events={upcoming_events} />
          </div>
          <div className="lg:col-span-3">
            <PodMembers members={pod_members} unassignedCount={unassigned_count} />
          </div>
        </div>

        {/* Block 4: Next Actions */}
        <NextActions actions={actions} athleteId={athleteId} onRefresh={fetchPodData} />

        {/* AI V2: Pod Suggested Actions */}
        <AiSuggestedActions
          endpoint={`${API}/ai/pod-actions/${athleteId}`}
          label="AI Suggested Actions"
          buttonLabel="Suggest Actions for This Athlete"
        />

        {/* Block 5: Treatment Timeline */}
        <TreatmentTimeline timeline={timeline} />
      </main>
    </div>
  );
}

export default SupportPod;

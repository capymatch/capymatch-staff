import { useState, useEffect } from "react";
import axios from "axios";
import Header from "@/components/mission-control/Header";
import PriorityAlerts from "@/components/mission-control/PriorityAlerts";
import MomentumFeed from "@/components/mission-control/MomentumFeed";
import AthletesNeedingAttention from "@/components/mission-control/AthletesNeedingAttention";
import CriticalUpcoming from "@/components/mission-control/CriticalUpcoming";
import ProgramSnapshot from "@/components/mission-control/ProgramSnapshot";
import PeekPanel from "@/components/mission-control/PeekPanel";
import { toast } from "sonner";
import { AiBriefing } from "@/components/AiBriefing";
import { AiSuggestedActions } from "@/components/AiV2Components";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

function MissionControl() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [selectedGradYear, setSelectedGradYear] = useState("all");
  const [peekedIntervention, setPeekedIntervention] = useState(null);

  useEffect(() => { fetchMissionControlData(); }, []);

  const fetchMissionControlData = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API}/mission-control`);
      setData(response.data);
    } catch (error) {
      console.error("Error fetching mission control data:", error);
      toast.error("Failed to load Mission Control data");
    } finally {
      setLoading(false);
    }
  };

  const filterAthletes = (athletes) => {
    if (selectedGradYear === "all") return athletes;
    return athletes.filter((a) => a.grad_year === parseInt(selectedGradYear));
  };

  // Header stats
  const stats = data ? {
    alertCount: data.priorityAlerts?.length || 0,
    athleteCount: data.athletesNeedingAttention?.length || 0,
    eventCount: data.upcomingEvents?.length || 0,
  } : null;

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Header selectedGradYear={selectedGradYear} setSelectedGradYear={setSelectedGradYear} stats={null} />
        <div className="max-w-[1400px] mx-auto px-6 py-16">
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-3" />
              <p className="text-xs text-slate-400 uppercase tracking-wider">Loading Mission Control...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const filteredAthletes = filterAthletes(data.athletesNeedingAttention || []);

  return (
    <div className="min-h-screen bg-slate-50" data-testid="mission-control-page">
      <Header selectedGradYear={selectedGradYear} setSelectedGradYear={setSelectedGradYear} stats={stats} />

      <main className="max-w-[1400px] mx-auto px-4 sm:px-6 py-8">
        {/* AI Daily Briefing */}
        <div className="mb-8">
          <AiBriefing
            endpoint={`${API}/ai/briefing`}
            label="Daily Briefing"
            buttonLabel="Generate Today's Priorities"
          />
        </div>

        {/* AI V2: Suggested Next Actions */}
        <div className="mb-8">
          <AiSuggestedActions
            endpoint={`${API}/ai/suggested-actions`}
            label="Suggested Next Actions"
            buttonLabel="What Should I Do Next?"
          />
        </div>

        {/* Priority zone — alerts + live feed side by side */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-12">
          <div className="lg:col-span-2">
            {data.priorityAlerts && data.priorityAlerts.length > 0 && (
              <PriorityAlerts alerts={data.priorityAlerts} onPeek={(a) => setPeekedIntervention(a)} />
            )}
          </div>
          <div>
            <MomentumFeed signals={data.recentChanges || []} />
          </div>
        </div>

        {/* Monitoring zone — athletes */}
        <div className="mb-12">
          <AthletesNeedingAttention
            athletes={filteredAthletes}
            selectedGradYear={selectedGradYear}
            onPeek={(a) => setPeekedIntervention(a)}
          />
        </div>

        {/* Context zone — events + program snapshot */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <CriticalUpcoming events={data.upcomingEvents || []} />
          </div>
          <div>
            <ProgramSnapshot snapshot={data.programSnapshot || {}} />
          </div>
        </div>
      </main>

      {/* Peek Panel */}
      {peekedIntervention && (
        <PeekPanel intervention={peekedIntervention} onClose={() => setPeekedIntervention(null)} />
      )}
    </div>
  );
}

export default MissionControl;

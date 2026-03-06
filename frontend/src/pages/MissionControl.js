import { useState, useEffect } from "react";
import axios from "axios";
import Header from "@/components/mission-control/Header";
import PriorityAlerts from "@/components/mission-control/PriorityAlerts";
import MomentumFeed from "@/components/mission-control/MomentumFeed";
import AthletesNeedingAttention from "@/components/mission-control/AthletesNeedingAttention";
import CriticalUpcoming from "@/components/mission-control/CriticalUpcoming";
import ProgramSnapshot from "@/components/mission-control/ProgramSnapshot";
import QuickActions from "@/components/mission-control/QuickActions";
import PeekPanel from "@/components/mission-control/PeekPanel";
import { toast } from "sonner";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

function MissionControl() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [selectedGradYear, setSelectedGradYear] = useState("all");
  const [peekedIntervention, setPeekedIntervention] = useState(null);

  useEffect(() => {
    fetchMissionControlData();
  }, []);

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

  const handlePeek = (intervention) => setPeekedIntervention(intervention);
  const handleClosePeek = () => setPeekedIntervention(null);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header selectedGradYear={selectedGradYear} setSelectedGradYear={setSelectedGradYear} />
        <div className="max-w-[1600px] mx-auto px-6 py-8">
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-gray-600 text-sm">Loading Mission Control...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header selectedGradYear={selectedGradYear} setSelectedGradYear={setSelectedGradYear} />
        <div className="max-w-[1600px] mx-auto px-6 py-8">
          <div className="text-center py-20">
            <p className="text-gray-600">No data available</p>
          </div>
        </div>
      </div>
    );
  }

  const filteredAthletes = filterAthletes(data.athletesNeedingAttention || []);

  return (
    <div className="min-h-screen bg-gray-50" data-testid="mission-control-page">
      <Header selectedGradYear={selectedGradYear} setSelectedGradYear={setSelectedGradYear} />

      <main className="max-w-[1600px] mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-8">
        {data.priorityAlerts && data.priorityAlerts.length > 0 && (
          <PriorityAlerts alerts={data.priorityAlerts} onPeek={handlePeek} />
        )}

        <MomentumFeed signals={data.recentChanges || []} />

        <AthletesNeedingAttention
          athletes={filteredAthletes}
          selectedGradYear={selectedGradYear}
          onPeek={handlePeek}
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <CriticalUpcoming events={data.upcomingEvents || []} />
          </div>
          <div>
            <ProgramSnapshot snapshot={data.programSnapshot || {}} />
          </div>
        </div>
      </main>

      <QuickActions />

      {/* Peek Panel — slides in from right */}
      {peekedIntervention && (
        <PeekPanel intervention={peekedIntervention} onClose={handleClosePeek} />
      )}
    </div>
  );
}

export default MissionControl;

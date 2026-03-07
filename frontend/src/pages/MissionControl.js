import { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "sonner";
import { useAuth } from "@/AuthContext";
import Header from "@/components/mission-control/Header";
import DirectorView from "@/components/mission-control/DirectorView";
import CoachView from "@/components/mission-control/CoachView";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

function MissionControl() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [selectedGradYear, setSelectedGradYear] = useState("all");

  useEffect(() => {
    fetchData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API}/mission-control`);
      setData(res.data);
    } catch (error) {
      console.error("Error fetching mission control data:", error);
      toast.error("Failed to load Mission Control data");
    } finally {
      setLoading(false);
    }
  };

  const isDirector = data?.role === "director" || user?.role === "director";

  // Header stats (role-aware)
  const stats = data ? {
    alertCount: isDirector
      ? (data.needsAttention?.length || 0)
      : (data.todays_summary?.alertCount || 0),
    athleteCount: isDirector
      ? (data.programStatus?.totalAthletes || 0)
      : (data.todays_summary?.athleteCount || 0),
    eventCount: isDirector
      ? (data.programStatus?.upcomingEvents || 0)
      : (data.todays_summary?.upcomingEvents || 0),
  } : null;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50/50">
        <Header selectedGradYear={selectedGradYear} setSelectedGradYear={setSelectedGradYear} stats={null} />
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-16">
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-400 mx-auto mb-3" />
              <p className="text-xs text-slate-400 uppercase tracking-wider">Loading Mission Control...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="min-h-screen bg-gray-50/50" data-testid="mission-control-page">
      <Header selectedGradYear={selectedGradYear} setSelectedGradYear={setSelectedGradYear} stats={stats} />

      <main className="max-w-[1400px] mx-auto px-4 sm:px-6 py-8">
        {isDirector ? (
          <DirectorView data={data} />
        ) : (
          <CoachView data={data} />
        )}
      </main>
    </div>
  );
}

export default MissionControl;

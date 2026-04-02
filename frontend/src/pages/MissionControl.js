import { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "sonner";
import { useAuth } from "@/AuthContext";
import DirectorView from "@/components/mission-control/DirectorView";
import CoachView from "@/components/mission-control/CoachView";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const POLL_INTERVAL = 45_000; // 45 seconds

function MissionControl() {
  const { user, effectiveRole } = useAuth();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

  const fetchData = async (isBackground = false) => {
    try {
      if (!isBackground) setLoading(true);
      const res = await axios.get(`${API}/mission-control`);
      setData(res.data);
    } catch (error) {
      if (!isBackground) {
        console.error("Error fetching mission control data:", error);
        toast.error("Failed to load Mission Control data");
      }
    } finally {
      if (!isBackground) setLoading(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchData(false);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Background polling
  useEffect(() => {
    const interval = setInterval(() => fetchData(true), POLL_INTERVAL);
    return () => clearInterval(interval);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const role = effectiveRole || user?.role;
  const isDirector = data?.role === "director" || role === "director";

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500 mx-auto mb-3" />
          <p className="text-xs text-slate-400 uppercase tracking-wider">Loading...</p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div data-testid="mission-control-page">
      {isDirector ? (
        <DirectorView data={data} userName={user?.name} />
      ) : (
        <CoachView data={data} userName={user?.name} />
      )}
    </div>
  );
}

export default MissionControl;

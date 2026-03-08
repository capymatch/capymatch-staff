import { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "sonner";
import { useAuth } from "@/AuthContext";
import DirectorView from "@/components/mission-control/DirectorView";
import CoachView from "@/components/mission-control/CoachView";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

function MissionControl() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

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

import { createContext, useContext, useState, useEffect, useCallback } from "react";
import axios from "axios";
import { useAuth } from "@/AuthContext";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const PlanContext = createContext(null);

export function PlanProvider({ children }) {
  const { user } = useAuth();
  const [planData, setPlanData] = useState(null);
  const [loading, setLoading] = useState(true);

  const isStaff = user?.role === "director" || user?.role === "club_coach";

  const fetchPlan = useCallback(async () => {
    if (!isStaff) {
      setLoading(false);
      return;
    }
    try {
      const res = await axios.get(`${API}/club-plans/entitlements`);
      setPlanData(res.data);
    } catch {
      setPlanData({ plan_id: "starter", plan_label: "Starter", entitlements: {}, limits: {} });
    } finally {
      setLoading(false);
    }
  }, [isStaff]);

  useEffect(() => {
    fetchPlan();
  }, [fetchPlan]);

  const can = useCallback(
    (featureId) => {
      if (!planData?.entitlements) return true;
      const ent = planData.entitlements[featureId];
      if (!ent) return true;
      return ent.allowed;
    },
    [planData]
  );

  const getAccess = useCallback(
    (featureId) => {
      if (!planData?.entitlements) return { allowed: true, access: true };
      return planData.entitlements[featureId] || { allowed: true, access: true };
    },
    [planData]
  );

  return (
    <PlanContext.Provider value={{ planData, loading, can, getAccess, refetch: fetchPlan }}>
      {children}
    </PlanContext.Provider>
  );
}

export function usePlan() {
  const ctx = useContext(PlanContext);
  if (!ctx) {
    return {
      planData: null,
      loading: true,
      can: () => true,
      getAccess: () => ({ allowed: true, access: true }),
      refetch: () => {},
    };
  }
  return ctx;
}

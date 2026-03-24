import { createContext, useContext, useState, useEffect, useCallback } from "react";
import axios from "axios";
import { useAuth } from "@/AuthContext";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const PlanContext = createContext(null);

const DEPTH_ORDER = ["none", "basic", "detailed", "advanced", "full"];

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

  /** Boolean access check: is this feature turned on? */
  const can = useCallback(
    (featureKey) => {
      if (!planData?.entitlements) return true;
      const val = planData.entitlements[featureKey];
      if (val === undefined || val === null) return true;
      if (typeof val === "boolean") return val;
      if (typeof val === "number") return val !== 0;
      if (typeof val === "string") return val !== "none" && val !== "false" && val !== "";
      return Boolean(val);
    },
    [planData]
  );

  /** Depth check: is the current depth at least `minDepth`? */
  const hasDepth = useCallback(
    (depthKey, minDepth) => {
      if (!planData?.entitlements) return true;
      const current = planData.entitlements[depthKey];
      if (!current) return true;
      const currentIdx = DEPTH_ORDER.indexOf(current);
      const minIdx = DEPTH_ORDER.indexOf(minDepth);
      if (currentIdx === -1 || minIdx === -1) return true;
      return currentIdx >= minIdx;
    },
    [planData]
  );

  /** Get the current depth level string */
  const getDepth = useCallback(
    (depthKey) => {
      if (!planData?.entitlements) return "advanced";
      return planData.entitlements[depthKey] || "basic";
    },
    [planData]
  );

  /** Get a numeric limit value (-1 = unlimited) */
  const getLimit = useCallback(
    (limitKey) => {
      if (!planData?.entitlements) return -1;
      const val = planData.entitlements[limitKey];
      if (val === undefined || val === null) return -1;
      return val;
    },
    [planData]
  );

  /** Get any raw entitlement value */
  const getValue = useCallback(
    (key) => {
      if (!planData?.entitlements) return undefined;
      return planData.entitlements[key];
    },
    [planData]
  );

  const planId = planData?.plan_id || "starter";
  const planLabel = planData?.plan_label || "Starter";

  return (
    <PlanContext.Provider value={{ planData, planId, planLabel, loading, can, hasDepth, getDepth, getLimit, getValue, refetch: fetchPlan }}>
      {children}
    </PlanContext.Provider>
  );
}

export function usePlan() {
  const ctx = useContext(PlanContext);
  if (!ctx) {
    return {
      planData: null,
      planId: "starter",
      planLabel: "Starter",
      loading: true,
      can: () => true,
      hasDepth: () => true,
      getDepth: () => "advanced",
      getLimit: () => -1,
      getValue: () => undefined,
      refetch: () => {},
    };
  }
  return ctx;
}

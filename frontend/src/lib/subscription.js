import { createContext, useContext, useState, useEffect, useCallback } from "react";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const SubscriptionContext = createContext(null);

export function SubscriptionProvider({ children }) {
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const token = localStorage.getItem("capymatch_token");
      if (!token) { setSubscription(null); setLoading(false); return; }
      const res = await axios.get(`${API}/subscription`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSubscription(res.data);
    } catch {
      setSubscription(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  return (
    <SubscriptionContext.Provider value={{ subscription, loading, refresh }}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  const ctx = useContext(SubscriptionContext);
  if (!ctx) return { subscription: null, loading: true, refresh: () => {} };
  return ctx;
}

export function canAccess(subscription, feature) {
  if (!subscription) return false;
  return subscription.limits?.[feature] === true || subscription.limits?.[feature] === -1;
}

export function getUsage(subscription, key) {
  if (!subscription) return { used: 0, limit: 0, remaining: 0, unlimited: false };
  const usage = subscription.usage || {};
  const limit = usage[`${key}_limit`];
  return {
    used: usage[key] || 0,
    limit: limit,
    remaining: usage[`${key}_remaining`],
    unlimited: limit === -1,
  };
}

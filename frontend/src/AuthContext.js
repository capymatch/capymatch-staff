import { createContext, useContext, useState, useEffect } from "react";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem("capymatch_token"));
  const [loading, setLoading] = useState(true);
  const [onboardingDone, setOnboardingDone] = useState(null);

  // Set default auth header when token changes
  useEffect(() => {
    if (token) {
      axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
      localStorage.setItem("capymatch_token", token);
    } else {
      delete axios.defaults.headers.common["Authorization"];
      localStorage.removeItem("capymatch_token");
    }
  }, [token]);

  // Check onboarding status for athletes
  const checkOnboarding = async (userData) => {
    if (userData?.role === "athlete" || userData?.role === "parent") {
      try {
        const res = await axios.get(`${API}/athlete/onboarding-status`);
        setOnboardingDone(res.data.completed);
      } catch {
        setOnboardingDone(true); // Assume done if check fails (e.g. no claimed profile)
      }
    } else {
      setOnboardingDone(true);
    }
  };

  // Validate token on mount
  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    axios
      .get(`${API}/auth/me`)
      .then(async (res) => {
        setUser(res.data);
        await checkOnboarding(res.data);
      })
      .catch(() => {
        setToken(null);
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const login = async (email, password) => {
    const res = await axios.post(`${API}/auth/login`, { email, password });
    setToken(res.data.token);
    const userData = res.data.user;
    setUser(userData);
    // Check onboarding synchronously before returning
    if (userData?.role === "athlete" || userData?.role === "parent") {
      try {
        // Token already set via interceptor from setToken above
        const obRes = await axios.get(`${API}/athlete/onboarding-status`, {
          headers: { Authorization: `Bearer ${res.data.token}` },
        });
        setOnboardingDone(obRes.data.completed);
      } catch {
        setOnboardingDone(true);
      }
    } else {
      setOnboardingDone(true);
    }
    return userData;
  };

  const register = async (email, password, name, role) => {
    const res = await axios.post(`${API}/auth/register`, { email, password, name, role });
    setToken(res.data.token);
    const userData = res.data.user;
    setUser(userData);
    if (userData?.role === "athlete" || userData?.role === "parent") {
      try {
        const obRes = await axios.get(`${API}/athlete/onboarding-status`, {
          headers: { Authorization: `Bearer ${res.data.token}` },
        });
        setOnboardingDone(obRes.data.completed);
      } catch {
        setOnboardingDone(true);
      }
    } else {
      setOnboardingDone(true);
    }
    return userData;
  };

  const completeOnboarding = () => setOnboardingDone(true);

  const logout = () => {
    setToken(null);
    setUser(null);
    setOnboardingDone(null);
  };

  return (
    <AuthContext.Provider value={{ user, setUser, token, loading, login, register, logout, onboardingDone, completeOnboarding }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

import { createContext, useContext, useState, useEffect, useRef, useCallback } from "react";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem("capymatch_token"));
  const [loading, setLoading] = useState(true);
  const [onboardingDone, setOnboardingDone] = useState(null);
  const refreshingRef = useRef(null);

  // Persist tokens
  useEffect(() => {
    if (token) {
      axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
      localStorage.setItem("capymatch_token", token);
    } else {
      delete axios.defaults.headers.common["Authorization"];
      localStorage.removeItem("capymatch_token");
      localStorage.removeItem("capymatch_refresh_token");
    }
  }, [token]);

  // Refresh token helper
  const refreshAccessToken = useCallback(async () => {
    const refreshToken = localStorage.getItem("capymatch_refresh_token");
    if (!refreshToken) throw new Error("No refresh token");

    // Dedupe: if already refreshing, return the same promise
    if (refreshingRef.current) return refreshingRef.current;

    refreshingRef.current = axios
      .post(`${API}/auth/refresh`, { refresh_token: refreshToken })
      .then((res) => {
        const newToken = res.data.token;
        const newRefresh = res.data.refresh_token;
        setToken(newToken);
        localStorage.setItem("capymatch_refresh_token", newRefresh);
        setUser(res.data.user);
        return newToken;
      })
      .catch((err) => {
        // Refresh failed — force logout
        setToken(null);
        setUser(null);
        setOnboardingDone(null);
        localStorage.removeItem("capymatch_refresh_token");
        throw err;
      })
      .finally(() => {
        refreshingRef.current = null;
      });

    return refreshingRef.current;
  }, []);

  // Axios interceptor: auto-refresh on 401
  useEffect(() => {
    const interceptor = axios.interceptors.response.use(
      (res) => res,
      async (error) => {
        const originalRequest = error.config;
        if (
          error.response?.status === 401 &&
          !originalRequest._retry &&
          !originalRequest.url?.includes("/auth/login") &&
          !originalRequest.url?.includes("/auth/refresh") &&
          !originalRequest.url?.includes("/auth/register")
        ) {
          originalRequest._retry = true;
          try {
            const newToken = await refreshAccessToken();
            originalRequest.headers["Authorization"] = `Bearer ${newToken}`;
            return axios(originalRequest);
          } catch {
            return Promise.reject(error);
          }
        }
        return Promise.reject(error);
      }
    );
    return () => axios.interceptors.response.eject(interceptor);
  }, [refreshAccessToken]);

  // Check onboarding status
  const checkOnboarding = async (userData) => {
    if (userData?.role === "athlete" || userData?.role === "parent") {
      try {
        const res = await axios.get(`${API}/athlete/onboarding-status`);
        setOnboardingDone(res.data.completed);
      } catch {
        setOnboardingDone(true);
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
    if (res.data.refresh_token) {
      localStorage.setItem("capymatch_refresh_token", res.data.refresh_token);
    }
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

  const register = async (email, password, name, role) => {
    const res = await axios.post(`${API}/auth/register`, { email, password, name, role });
    setToken(res.data.token);
    if (res.data.refresh_token) {
      localStorage.setItem("capymatch_refresh_token", res.data.refresh_token);
    }
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

  const googleLogin = async (credential) => {
    const res = await axios.post(`${API}/auth/google`, { credential });
    setToken(res.data.token);
    if (res.data.refresh_token) {
      localStorage.setItem("capymatch_refresh_token", res.data.refresh_token);
    }
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

  const logout = async () => {
    try {
      await axios.post(`${API}/auth/logout`);
    } catch { /* ignore */ }
    setToken(null);
    setUser(null);
    setOnboardingDone(null);
  };

  return (
    <AuthContext.Provider value={{ user, setUser, token, loading, login, register, googleLogin, logout, onboardingDone, completeOnboarding }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../AuthContext";
import { Eye, EyeOff } from "lucide-react";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

/* ── inline CSS-in-JS for page-level grid background ── */
const pageStyle = {
  minHeight: "100vh",
  background: `
    linear-gradient(rgba(16,24,40,0.06) 1px, transparent 1px),
    linear-gradient(90deg, rgba(16,24,40,0.06) 1px, transparent 1px),
    #f7f3ec`,
  backgroundSize: "44px 44px, 44px 44px, auto",
};

export default function LoginPage() {
  const { login, register, loginWithTokens } = useAuth();
  const location = useLocation();
  const [mode, setMode] = useState(location.pathname === "/signup" ? "register" : "login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState("athlete");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [remember, setRemember] = useState(false);

  // Handle Google OAuth redirect callback
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    if (code) {
      window.history.replaceState({}, "", "/login");
      setBusy(true);
      setError("");
      axios.post(`${API}/auth/google`, { code })
        .then(res => loginWithTokens(res.data))
        .catch(err => setError(err.response?.data?.detail || "Google sign-in failed."))
        .finally(() => setBusy(false));
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleGoogleClick = async () => {
    setError("");
    try {
      const res = await axios.get(`${API}/auth/google/url`);
      window.location.href = res.data.url;
    } catch {
      setError("Google Sign-In is not available right now.");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      if (mode === "login") {
        await login(email, password);
      } else {
        await register(email, password, name, role);
      }
    } catch (err) {
      setError(err.response?.data?.detail || "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const demoAccounts = [
    { label: "Athlete Demo", desc: "Student-athlete recruiting workflow", email: "emma.chen@athlete.capymatch.com", pw: "athlete123" },
    { label: "Coach Demo", desc: "Coach operating system view", email: "coach.williams@capymatch.com", pw: "coach123" },
    { label: "Director Demo", desc: "Program oversight and escalations", email: "director@capymatch.com", pw: "director123" },
  ];

  return (
    <div style={pageStyle} data-testid="login-page">
      <main className="min-h-screen grid grid-cols-1 lg:grid-cols-[1.05fr_0.95fr] gap-7 lg:gap-12 items-center p-5 sm:p-7 lg:py-12 lg:px-14">

        {/* ── Left: Brand side ── */}
        <section className="lg:py-6 lg:pl-6 max-w-[700px]">
          {/* Logo */}
          <div className="flex items-center gap-3.5 mb-12">
            <div
              className="w-12 h-12 grid place-items-center text-white font-extrabold text-2xl"
              style={{
                borderRadius: 16,
                background: "linear-gradient(180deg, #ff6d37, #ff5a1f)",
                boxShadow: "0 18px 34px rgba(255,90,31,0.22)",
              }}
            >C</div>
            <span className="text-[34px] font-extrabold tracking-[-0.04em] text-[#101828]">CapyMatch</span>
          </div>

          {/* Eyebrow badge */}
          <div
            className="inline-flex items-center gap-2 px-3.5 py-2 mb-6 text-[13px] font-bold tracking-[0.04em]"
            style={{
              borderRadius: 999,
              background: "rgba(255,255,255,0.66)",
              border: "1px solid rgba(231,223,212,0.9)",
              color: "#667085",
            }}
          >
            <span className="w-[7px] h-[7px] rounded-full bg-[#ff5a1f] inline-block" />
            FOR ATHLETES AND FAMILIES
          </div>

          {/* Hero heading */}
          <h1
            className="mb-6 font-black leading-[0.92] tracking-[-0.07em] max-w-[620px]"
            style={{ fontSize: "clamp(54px, 6vw, 96px)", color: "#101828" }}
          >
            Turn recruiting chaos into{" "}
            <span className="text-[#ff5a1f]">confident follow-ups.</span>
          </h1>

          {/* Subtext */}
          <p
            className="max-w-[560px] mb-7 leading-[1.45] tracking-[-0.03em]"
            style={{ fontSize: 26, color: "#475467" }}
          >
            Track schools. Manage coach emails.{" "}
            <strong className="text-[#101828] font-bold">Always know what to do next.</strong>
            <br />
            No spreadsheets. No missed follow-ups.
          </p>

          {/* Feature chips */}
          <div className="flex flex-wrap gap-2.5 mb-8">
            {["Track Schools", "Manage Communication", "Know What To Do Next"].map((t) => (
              <span
                key={t}
                className="text-sm font-bold"
                style={{
                  padding: "10px 14px",
                  borderRadius: 999,
                  background: "rgba(255,255,255,0.72)",
                  border: "1px solid rgba(231,223,212,0.95)",
                  color: "#475467",
                  boxShadow: "0 6px 18px rgba(16,24,40,0.04)",
                }}
              >
                {t}
              </span>
            ))}
          </div>

          {/* Social proof */}
          <div className="flex items-center gap-3.5 text-[15px] text-[#667085]">
            <div className="flex mr-1.5">
              {[
                "linear-gradient(180deg, #b8f0d7, #72d2a9)",
                "linear-gradient(180deg, #ffc2bb, #ff9c8e)",
                "linear-gradient(180deg, #b6d6ff, #7fb4ff)",
                "linear-gradient(180deg, #ffe2a6, #ffc55d)",
              ].map((bg, i) => (
                <span
                  key={i}
                  className="w-[30px] h-[30px] rounded-full border-2 border-[#f7f3ec]"
                  style={{
                    background: bg,
                    marginLeft: i === 0 ? 0 : -8,
                    boxShadow: "0 6px 14px rgba(16,24,40,0.06)",
                  }}
                />
              ))}
            </div>
            Used by families managing 10–30+ schools
          </div>
        </section>

        {/* ── Right: Auth card ── */}
        <section className="flex justify-center items-center">
          <div
            className="w-full max-w-[560px]"
            style={{
              background: "rgba(255,255,255,0.88)",
              backdropFilter: "blur(10px)",
              border: "1px solid rgba(231,223,212,0.92)",
              borderRadius: 28,
              boxShadow: "0 30px 80px rgba(16,24,40,0.08)",
              padding: 26,
            }}
          >
            {/* Mini brand header */}
            <div className="flex items-center gap-2.5 mb-5">
              <div
                className="w-[34px] h-[34px] grid place-items-center text-white font-extrabold text-lg"
                style={{
                  borderRadius: 12,
                  background: "linear-gradient(180deg, #ff6d37, #ff5a1f)",
                }}
              >C</div>
              <span className="text-lg font-extrabold tracking-[-0.03em] text-[#101828]">CapyMatch</span>
            </div>

            {/* Welcome copy */}
            <div className="mb-5">
              <h2 className="text-[34px] font-extrabold tracking-[-0.05em] text-[#101828] mb-2 leading-tight">
                {mode === "login" ? "Welcome back" : "Get started"}
              </h2>
              <p className="text-base text-[#667085] leading-[1.55]">
                {mode === "login"
                  ? "Sign in to manage your recruiting, review coach conversations, and take your next best action."
                  : "Create your account to start managing your recruiting pipeline."}
              </p>
            </div>

            {/* Tab switcher */}
            <div
              className="grid grid-cols-2 gap-2 mb-6"
              style={{
                padding: 8,
                borderRadius: 18,
                background: "#f7f5f1",
                border: "1px solid #e7dfd4",
              }}
              data-testid="auth-tabs"
            >
              <button
                onClick={() => { setMode("login"); setError(""); }}
                className={`py-3.5 px-4 text-lg font-bold cursor-pointer border-0 transition-all duration-200 ${
                  mode === "login" ? "text-[#101828]" : "text-[#667085] bg-transparent"
                }`}
                style={{
                  borderRadius: 14,
                  ...(mode === "login"
                    ? { background: "white", boxShadow: "0 6px 18px rgba(16,24,40,0.06)" }
                    : {}),
                }}
                data-testid="tab-login"
              >
                Sign In
              </button>
              <button
                onClick={() => { setMode("register"); setError(""); }}
                className={`py-3.5 px-4 text-lg font-bold cursor-pointer border-0 transition-all duration-200 ${
                  mode === "register" ? "text-[#101828]" : "text-[#667085] bg-transparent"
                }`}
                style={{
                  borderRadius: 14,
                  ...(mode === "register"
                    ? { background: "white", boxShadow: "0 6px 18px rgba(16,24,40,0.06)" }
                    : {}),
                }}
                data-testid="tab-register"
              >
                Create Account
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              {mode === "register" && (
                <>
                  {/* Name field */}
                  <div className="mb-4">
                    <label className="block text-[13px] font-extrabold tracking-[0.08em] text-[#667085] mb-2">NAME</label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      placeholder="Your full name"
                      className="w-full text-lg text-[#101828] outline-none"
                      style={{
                        border: "1px solid #e7dfd4",
                        borderRadius: 16,
                        padding: "18px",
                        background: "#fff",
                        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.5)",
                      }}
                      data-testid="input-name"
                    />
                  </div>

                  {/* Role is defaulted to athlete */}
                </>
              )}

              {/* Email */}
              <div className="mb-4">
                <label className="block text-[13px] font-extrabold tracking-[0.08em] text-[#667085] mb-2">EMAIL</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="you@capymatch.com"
                  className="w-full text-lg text-[#101828] outline-none placeholder:text-[#98a2b3]"
                  style={{
                    border: "1px solid #e7dfd4",
                    borderRadius: 16,
                    padding: "18px",
                    background: "#fff",
                    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.5)",
                  }}
                  data-testid="input-email"
                />
              </div>

              {/* Password */}
              <div className="mb-4">
                <label className="block text-[13px] font-extrabold tracking-[0.08em] text-[#667085] mb-2">PASSWORD</label>
                <div className="relative">
                  <input
                    type={showPw ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="Enter password"
                    className="w-full text-lg text-[#101828] outline-none pr-14 placeholder:text-[#98a2b3]"
                    style={{
                      border: "1px solid #e7dfd4",
                      borderRadius: 16,
                      padding: "18px",
                      background: "#fff",
                      boxShadow: "inset 0 1px 0 rgba(255,255,255,0.5)",
                    }}
                    data-testid="input-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(!showPw)}
                    className="absolute right-[18px] top-1/2 -translate-y-1/2 text-[#98a2b3] hover:text-[#667085] transition-colors bg-transparent border-0 cursor-pointer"
                    data-testid="toggle-password"
                  >
                    {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {/* Remember me + Forgot password */}
              {mode === "login" && (
                <div className="flex items-center justify-between mb-4 text-sm text-[#667085]">
                  <label
                    className="flex items-center gap-2.5 cursor-pointer !text-sm !font-normal !tracking-normal !text-[#667085] !mb-0"
                    data-testid="remember-me"
                  >
                    <span
                      className="w-[18px] h-[18px] border border-[#e7dfd4] bg-white flex-shrink-0 cursor-pointer flex items-center justify-center"
                      style={{ borderRadius: 6 }}
                      onClick={(e) => { e.preventDefault(); setRemember(!remember); }}
                    >
                      {remember && (
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                          <path d="M2.5 6L5 8.5L9.5 3.5" stroke="#ff5a1f" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                    </span>
                    <span onClick={() => setRemember(!remember)} className="cursor-pointer">Remember me</span>
                  </label>
                  <Link
                    to="/forgot-password"
                    className="text-[#475467] no-underline hover:text-[#ff5a1f] transition-colors"
                    data-testid="forgot-password-link"
                  >
                    Forgot password?
                  </Link>
                </div>
              )}

              {/* Error */}
              {error && (
                <div
                  className="mb-4 text-[15px] font-semibold"
                  style={{
                    padding: "14px 16px",
                    borderRadius: 14,
                    background: "#fff0ee",
                    border: "1px solid #ffd4cf",
                    color: "#d92d20",
                  }}
                  data-testid="auth-error"
                >
                  {error}
                </div>
              )}

              {/* Submit button */}
              <button
                type="submit"
                disabled={busy}
                className="w-full border-0 text-white text-xl font-extrabold tracking-[-0.02em] cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 transition-all duration-200 hover:brightness-110 active:scale-[0.98] mb-5"
                style={{
                  background: "#ff5a1f",
                  borderRadius: 18,
                  padding: "18px 22px",
                  boxShadow: "0 20px 34px rgba(255,90,31,0.22)",
                }}
                data-testid="auth-submit-btn"
              >
                {busy ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  mode === "login" ? "Sign In" : "Create Account"
                )}
              </button>
            </form>

            {/* Google OAuth — always visible */}
            <div className="relative text-center my-5">
              <div className="absolute top-1/2 left-0 right-0 h-px bg-[#e7dfd4]" />
              <span
                className="relative z-10 px-3 text-[13px] font-bold uppercase tracking-[0.08em] text-[#98a2b3]"
                style={{ background: "rgba(255,255,255,0.88)" }}
              >
                or
              </span>
            </div>
            <button
              type="button"
              onClick={handleGoogleClick}
              disabled={busy}
              className="w-full flex items-center justify-center gap-3 border cursor-pointer transition-all duration-200 hover:bg-gray-50 active:scale-[0.98] disabled:opacity-50"
              style={{
                border: "1px solid #e7dfd4",
                borderRadius: 18,
                padding: "16px 22px",
                background: "#fff",
                boxShadow: "0 4px 12px rgba(16,24,40,0.04)",
              }}
              data-testid="google-login-btn"
            >
              <svg width="20" height="20" viewBox="0 0 48 48">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                <path fill="#FBBC05" d="M10.53 28.59a14.5 14.5 0 0 1 0-9.18l-7.98-6.19a24.1 24.1 0 0 0 0 21.56l7.98-6.19z"/>
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
              </svg>
              <span className="text-[16px] font-bold text-[#344054]">
                {mode === "login" ? "Continue with Google" : "Sign up with Google"}
              </span>
            </button>

            {/* Demo accounts divider */}
            {mode === "login" && (
              <>
                <div className="relative text-center my-5">
                  <div className="absolute top-1/2 left-0 right-0 h-px bg-[#e7dfd4]" />
                  <span
                    className="relative z-10 px-3 text-[13px] font-bold uppercase tracking-[0.08em] text-[#98a2b3]"
                    style={{ background: "rgba(255,255,255,0.88)" }}
                  >
                    Demo accounts
                  </span>
                </div>

                {/* Demo box */}
              </>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

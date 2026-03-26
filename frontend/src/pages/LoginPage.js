import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../AuthContext";
import { Eye, EyeOff, ArrowRight } from "lucide-react";

export default function LoginPage() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState("athlete");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [remember, setRemember] = useState(false);
  const [showDemo, setShowDemo] = useState(false);

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
    { label: "Director Demo", desc: "Program director dashboard", email: "director@capymatch.com", pw: "director123" },
  ];

  return (
    <div className="min-h-screen flex" data-testid="login-page">
      {/* Left — Branding panel with grid background */}
      <div className="hidden lg:flex lg:w-[55%] relative overflow-hidden items-start pt-16 px-12 xl:px-20" style={{ backgroundColor: "#F5F0EB" }}>
        {/* Grid pattern overlay */}
        <div className="absolute inset-0 pointer-events-none" style={{
          backgroundImage: "linear-gradient(rgba(0,0,0,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.04) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }} />

        <div className="relative z-10 max-w-xl">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-16">
            <div className="w-10 h-10 rounded-full bg-[#F26522] flex items-center justify-center">
              <span className="text-white font-black text-lg" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>C</span>
            </div>
            <span className="text-xl font-bold text-gray-900 tracking-tight">CapyMatch</span>
          </div>

          {/* Badge */}
          <div className="inline-flex items-center gap-2 mb-8">
            <span className="w-2 h-2 rounded-full bg-[#F26522]" />
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-widest">For Athletes and Families</span>
          </div>

          {/* Hero text */}
          <h1
            className="text-[3.5rem] xl:text-[4.2rem] font-black leading-[1.05] tracking-tight text-gray-900 mb-8"
            style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900 }}
          >
            Turn recruiting<br />chaos into<br />
            <span className="text-[#F26522]">confident<br />follow-ups.</span>
          </h1>

          {/* Description */}
          <p className="text-base text-gray-500 leading-relaxed mb-1">
            Track schools. Manage coach emails.{" "}
            <span className="font-bold text-gray-900">Always know</span>
          </p>
          <p className="text-base mb-1">
            <span className="font-bold text-gray-900">what to do next.</span>
          </p>
          <p className="text-base text-gray-500 mb-10">
            No spreadsheets. No missed follow-ups.
          </p>

          {/* Feature pills */}
          <div className="flex flex-wrap gap-2 mb-12">
            {["Track Schools", "Manage Communication", "Know What To Do Next"].map((label) => (
              <span
                key={label}
                className="px-4 py-2 text-xs font-medium text-gray-600 bg-white/80 border border-gray-200 rounded-full"
              >
                {label}
              </span>
            ))}
          </div>

          {/* Social proof */}
          <div className="flex items-center gap-3">
            <div className="flex -space-x-1.5">
              {["bg-emerald-400", "bg-sky-400", "bg-pink-400", "bg-amber-300"].map((color, i) => (
                <div key={i} className={`w-7 h-7 rounded-full ${color} border-2 border-[#F5F0EB]`} />
              ))}
            </div>
            <span className="text-sm text-gray-500">Used by families managing 10-30+ schools</span>
          </div>
        </div>
      </div>

      {/* Right — Auth form */}
      <div className="flex-1 bg-white flex flex-col min-h-screen">
        <div className="flex-1 flex items-start justify-center pt-8 lg:pt-12 px-6 pb-8 overflow-y-auto">
          <div className="w-full max-w-[420px]">
            {/* Logo (top of form) */}
            <div className="flex items-center gap-2.5 mb-8">
              <div className="w-8 h-8 rounded-full bg-[#F26522] flex items-center justify-center">
                <span className="text-white font-black text-sm" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>C</span>
              </div>
              <span className="text-lg font-bold text-gray-900 tracking-tight">CapyMatch</span>
            </div>

            {/* Header */}
            <h2
              className="text-2xl font-black text-gray-900 tracking-tight mb-2"
              style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900 }}
            >
              {mode === "login" ? "Welcome back" : "Get started"}
            </h2>
            <p className="text-sm text-gray-500 leading-relaxed mb-7">
              {mode === "login"
                ? "Sign in to manage your recruiting, review coach conversations, and take your next best action."
                : "Create your account to start managing your recruiting pipeline."}
            </p>

            {/* Tabs */}
            <div className="flex border border-gray-200 rounded-xl p-1 mb-7" data-testid="auth-tabs">
              <button
                onClick={() => { setMode("login"); setError(""); }}
                className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all duration-200 ${
                  mode === "login"
                    ? "bg-white text-gray-900 shadow-sm border border-gray-100"
                    : "text-gray-400 hover:text-gray-600"
                }`}
                data-testid="tab-login"
              >
                Sign In
              </button>
              <button
                onClick={() => { setMode("register"); setError(""); }}
                className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all duration-200 ${
                  mode === "register"
                    ? "bg-white text-gray-900 shadow-sm border border-gray-100"
                    : "text-gray-400 hover:text-gray-600"
                }`}
                data-testid="tab-register"
              >
                Create Account
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {mode === "register" && (
                <>
                  <div>
                    <label className="text-sm font-semibold text-gray-700 block mb-2">Full Name</label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      placeholder="Your full name"
                      className="w-full px-4 py-3 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F26522]/20 focus:border-[#F26522] transition-all placeholder:text-gray-400"
                      style={{ backgroundColor: "#FAFAF8" }}
                      data-testid="input-name"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-gray-700 block mb-2">I am a...</label>
                    <div className="grid grid-cols-3 gap-2" data-testid="role-selector">
                      {[
                        { value: "athlete", label: "Athlete" },
                        { value: "parent", label: "Parent" },
                        { value: "club_coach", label: "Coach" },
                      ].map((r) => (
                        <button
                          key={r.value}
                          type="button"
                          onClick={() => setRole(r.value)}
                          data-testid={`role-${r.value}`}
                          className={`py-2.5 text-sm font-semibold rounded-xl border transition-all duration-200 ${
                            role === r.value
                              ? "bg-[#F26522] text-white border-[#F26522]"
                              : "bg-white text-gray-500 border-gray-200 hover:border-[#F26522]/40"
                          }`}
                        >
                          {r.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}

              <div>
                <label className="text-sm font-semibold text-gray-700 block mb-2">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="you@capymatch.com"
                  className="w-full px-4 py-3 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F26522]/20 focus:border-[#F26522] transition-all placeholder:text-gray-400"
                  style={{ backgroundColor: "#FAFAF8" }}
                  data-testid="input-email"
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-700 block mb-2">Password</label>
                <div className="relative">
                  <input
                    type={showPw ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="Enter password"
                    className="w-full px-4 py-3 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F26522]/20 focus:border-[#F26522] transition-all pr-11 placeholder:text-gray-400"
                    style={{ backgroundColor: "#FAFAF8" }}
                    data-testid="input-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(!showPw)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                    data-testid="toggle-password"
                  >
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Remember me + Forgot password */}
              {mode === "login" && (
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer" data-testid="remember-me">
                    <input
                      type="checkbox"
                      checked={remember}
                      onChange={(e) => setRemember(e.target.checked)}
                      className="w-4 h-4 rounded border-gray-300 text-[#F26522] focus:ring-[#F26522]/20"
                    />
                    <span className="text-sm text-gray-500">Remember me</span>
                  </label>
                  <Link
                    to="/forgot-password"
                    className="text-sm text-gray-400 hover:text-[#F26522] transition-colors"
                    data-testid="forgot-password-link"
                  >
                    Forgot password?
                  </Link>
                </div>
              )}

              {error && (
                <div
                  className="text-sm px-4 py-3 rounded-xl"
                  style={{ backgroundColor: "#FDE8E5", color: "#C0392B" }}
                  data-testid="auth-error"
                >
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={busy}
                className="w-full py-3.5 bg-[#F26522] text-white text-sm font-bold rounded-full hover:bg-[#d9551a] active:scale-[0.98] transition-all duration-200 disabled:opacity-50 flex items-center justify-center gap-2"
                data-testid="auth-submit-btn"
              >
                {busy ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white" />
                ) : (
                  <>
                    {mode === "login" ? "Sign In" : "Create Account"}
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {/* Demo accounts */}
            {mode === "login" && (
              <div className="mt-8">
                {/* Divider */}
                <div className="flex items-center gap-3 mb-5">
                  <div className="flex-1 h-px bg-gray-200" />
                  <button
                    type="button"
                    onClick={() => setShowDemo(!showDemo)}
                    className="text-xs font-semibold text-gray-400 uppercase tracking-widest hover:text-gray-600 transition-colors"
                    data-testid="toggle-demo-accounts"
                  >
                    Demo Accounts
                  </button>
                  <div className="flex-1 h-px bg-gray-200" />
                </div>

                {showDemo && (
                  <div className="border border-gray-200 rounded-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="px-4 py-3 border-b border-gray-100">
                      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Quick Access</span>
                    </div>
                    <div className="divide-y divide-gray-100">
                      {demoAccounts.map((d) => (
                        <div key={d.email} className="flex items-center justify-between px-4 py-3 hover:bg-gray-50/50 transition-colors">
                          <div>
                            <div className="text-sm font-semibold text-gray-900">{d.label}</div>
                            <div className="text-xs text-gray-400 mt-0.5">{d.desc}</div>
                          </div>
                          <button
                            type="button"
                            onClick={() => { setEmail(d.email); setPassword(d.pw); }}
                            className="px-3.5 py-1.5 text-xs font-semibold text-gray-700 bg-white border border-gray-200 rounded-lg hover:border-gray-300 hover:bg-gray-50 transition-all"
                            data-testid={`demo-${d.label.toLowerCase().replace(/\s+/g, "-")}`}
                          >
                            Use
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

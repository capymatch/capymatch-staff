import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../AuthContext";
import { Eye, EyeOff, ArrowRight, ChevronDown, ChevronUp } from "lucide-react";

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
      setError(err.response?.data?.detail || "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex" data-testid="login-page">
      {/* Left — Branding panel */}
      <div className="hidden lg:flex lg:w-[52%] relative overflow-hidden items-center justify-center bg-[#faf9f7]">
        <div className="relative z-10 max-w-lg px-12">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-orange-200 bg-white mb-8">
            <span className="w-2 h-2 rounded-full bg-[#F26522]" />
            <span className="text-sm text-[#F26522] font-medium">Built for coaches and recruiting staff</span>
          </div>
          <h1
            className="text-5xl font-black text-gray-900 leading-[1.1] tracking-tight mb-6"
            style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900 }}
          >
            Run recruiting like{" "}
            <span className="text-[#F26522]">a system,</span>
            <br />
            not a spreadsheet.
          </h1>
          <p className="text-lg text-gray-500 leading-relaxed mb-10">
            CapyMatch gives you full visibility across athletes, schools, and actions — so nothing falls through the cracks.
          </p>

          {/* Dashboard preview card */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-5 transform rotate-[-1deg]">
            <div className="flex items-center gap-2 mb-4">
              <span className="w-3 h-3 rounded-full bg-red-300" />
              <span className="w-3 h-3 rounded-full bg-yellow-300" />
              <span className="w-3 h-3 rounded-full bg-green-300" />
              <span className="ml-4 text-xs text-gray-400">capymatch.app / coach / dashboard</span>
            </div>
            <div className="grid grid-cols-4 gap-3 mb-4">
              {[
                { label: "Total Athletes", val: "14" },
                { label: "Need Attention", val: "3" },
                { label: "Active Pipelines", val: "47" },
                { label: "Actions Today", val: "8" },
              ].map((s) => (
                <div key={s.label} className="bg-gray-50 rounded-lg p-3 text-center">
                  <div className="text-[10px] text-gray-400 mb-1">{s.label}</div>
                  <div className="text-lg font-bold text-gray-900">{s.val}</div>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-3 bg-orange-50 rounded-lg px-4 py-2.5">
              <span className="w-6 h-6 rounded bg-[#F26522]" />
              <span className="text-xs text-gray-700 flex-1">Jordan K. — Duke window closing. Act today.</span>
              <span className="text-xs text-[#F26522] font-medium whitespace-nowrap">Act now &rarr;</span>
            </div>
          </div>
        </div>

        {/* Decorative circle */}
        <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-orange-100/50" />
        <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full bg-orange-50/80" />
      </div>

      {/* Right — Auth form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-[400px]">
          {/* Mobile branding */}
          <div className="lg:hidden text-center mb-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-orange-200 bg-orange-50/50 mb-4">
              <span className="w-1.5 h-1.5 rounded-full bg-[#F26522]" />
              <span className="text-xs text-[#F26522] font-medium">CapyMatch</span>
            </div>
          </div>

          {/* Header */}
          <div className="mb-8">
            <h2
              className="text-3xl font-black text-gray-900 tracking-tight mb-2"
              style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900 }}
            >
              {mode === "login" ? "Welcome back" : "Get started"}
            </h2>
            <p className="text-gray-500 text-sm">
              {mode === "login"
                ? "Sign in to your CapyMatch account"
                : "Create your CapyMatch account"}
            </p>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 bg-gray-100 rounded-full p-1 mb-8" data-testid="auth-tabs">
            <button
              onClick={() => { setMode("login"); setError(""); }}
              className={`flex-1 py-2.5 text-sm font-semibold rounded-full transition-all duration-200 ${
                mode === "login"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
              data-testid="tab-login"
            >
              Sign In
            </button>
            <button
              onClick={() => { setMode("register"); setError(""); }}
              className={`flex-1 py-2.5 text-sm font-semibold rounded-full transition-all duration-200 ${
                mode === "register"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
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
                  <label className="text-xs font-semibold text-gray-700 block mb-2">Full Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    placeholder="Your full name"
                    className="w-full px-4 py-3 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F26522]/20 focus:border-[#F26522] transition-all placeholder:text-gray-400"
                    data-testid="input-name"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-700 block mb-2">I am a...</label>
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
                        className={`py-2.5 text-sm font-semibold rounded-xl border-2 transition-all duration-200 ${
                          role === r.value
                            ? "bg-[#F26522] text-white border-[#F26522]"
                            : "bg-white text-gray-500 border-gray-200 hover:border-[#F26522]/40 hover:text-gray-700"
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
              <label className="text-xs font-semibold text-gray-700 block mb-2">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
                className="w-full px-4 py-3 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F26522]/20 focus:border-[#F26522] transition-all placeholder:text-gray-400"
                data-testid="input-email"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-700 block mb-2">Password</label>
              <div className="relative">
                <input
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="Enter password"
                  className="w-full px-4 py-3 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F26522]/20 focus:border-[#F26522] transition-all pr-11 placeholder:text-gray-400"
                  data-testid="input-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  data-testid="toggle-password"
                >
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {mode === "login" && (
                <div className="text-right mt-2">
                  <Link
                    to="/forgot-password"
                    className="text-xs text-gray-400 hover:text-[#F26522] transition-colors"
                    data-testid="forgot-password-link"
                  >
                    Forgot password?
                  </Link>
                </div>
              )}
            </div>

            {error && (
              <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-100 px-4 py-3 rounded-xl" data-testid="auth-error">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0" />
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={busy}
              className="w-full py-3.5 bg-[#F26522] text-white text-sm font-bold rounded-full hover:bg-[#d9551a] active:scale-[0.98] transition-all duration-200 disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-orange-200/50"
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

          {/* Demo accounts (collapsible) */}
          {mode === "login" && (
            <div className="mt-8">
              <button
                type="button"
                onClick={() => setShowDemo(!showDemo)}
                className="w-full flex items-center justify-between py-2 text-xs text-gray-400 hover:text-gray-600 transition-colors group"
                data-testid="toggle-demo-accounts"
              >
                <div className="flex items-center gap-2">
                  <span className="h-px w-8 bg-gray-200 group-hover:bg-gray-300 transition-colors" />
                  <span className="font-medium uppercase tracking-wider">Demo Accounts</span>
                  <span className="h-px w-8 bg-gray-200 group-hover:bg-gray-300 transition-colors" />
                </div>
                {showDemo ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>

              {showDemo && (
                <div className="mt-3 space-y-1 animate-in fade-in slide-in-from-top-2 duration-200">
                  {[
                    { label: "Director", email: "director@capymatch.com", pw: "director123" },
                    { label: "Coach Williams", email: "coach.williams@capymatch.com", pw: "coach123" },
                    { label: "Coach Garcia", email: "coach.garcia@capymatch.com", pw: "coach123" },
                    { label: "Emma Chen (Athlete)", email: "emma.chen@athlete.capymatch.com", pw: "athlete123" },
                    { label: "Olivia Anderson", email: "olivia.anderson@athlete.capymatch.com", pw: "athlete123" },
                    { label: "Marcus Johnson", email: "marcus.johnson@athlete.capymatch.com", pw: "athlete123" },
                    { label: "Lucas Rodriguez", email: "lucas.rodriguez@athlete.capymatch.com", pw: "athlete123" },
                    { label: "Sarah Martinez", email: "sarah.martinez@athlete.capymatch.com", pw: "athlete123" },
                  ].map((d) => (
                    <button
                      key={d.email}
                      type="button"
                      onClick={() => { setEmail(d.email); setPassword(d.pw); }}
                      className="w-full text-left px-3 py-2 text-xs rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-between group"
                      data-testid={`demo-${d.label.toLowerCase().replace(/\s+/g, "-")}`}
                    >
                      <span className="text-gray-600 font-medium">{d.label}</span>
                      <span className="text-gray-300 group-hover:text-gray-400 text-[10px] transition-colors">{d.email}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Footer */}
          <p className="text-center text-xs text-gray-400 mt-8">
            Built for real club and program workflows
          </p>
        </div>
      </div>
    </div>
  );
}

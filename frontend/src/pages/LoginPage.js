import { useState } from "react";
import { useAuth } from "../AuthContext";
import { LogIn, UserPlus, Eye, EyeOff, Shield } from "lucide-react";

export default function LoginPage() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState("coach");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

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
    <div className="min-h-screen bg-slate-900 flex items-center justify-center px-4" data-testid="login-page">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center mx-auto mb-3">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-xl font-semibold text-white tracking-tight">CapyMatch</h1>
          <p className="text-xs text-white/40 mt-1">Recruiting Operating System</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-xl p-6 shadow-2xl">
          {/* Tabs */}
          <div className="flex bg-gray-100 rounded-lg p-0.5 mb-6" data-testid="auth-tabs">
            <button
              onClick={() => { setMode("login"); setError(""); }}
              className={`flex-1 py-2 text-xs font-medium rounded-md transition-colors ${
                mode === "login" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"
              }`}
              data-testid="tab-login"
            >
              Sign In
            </button>
            <button
              onClick={() => { setMode("register"); setError(""); }}
              className={`flex-1 py-2 text-xs font-medium rounded-md transition-colors ${
                mode === "register" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"
              }`}
              data-testid="tab-register"
            >
              Create Account
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "register" && (
              <>
                <div>
                  <label className="text-[11px] font-medium text-gray-500 uppercase tracking-wider block mb-1.5">Full Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    placeholder="Coach Williams"
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-300 transition-all"
                    data-testid="input-name"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-gray-500 uppercase tracking-wider block mb-1.5">Role</label>
                  <div className="flex gap-2" data-testid="role-selector">
                    {[
                      { val: "coach", label: "Coach" },
                      { val: "director", label: "Director" },
                    ].map((r) => (
                      <button
                        key={r.val}
                        type="button"
                        onClick={() => setRole(r.val)}
                        className={`flex-1 py-2.5 text-xs font-medium rounded-lg border transition-colors ${
                          role === r.val
                            ? "bg-slate-900 text-white border-slate-900"
                            : "bg-white text-gray-500 border-gray-200 hover:border-gray-300"
                        }`}
                        data-testid={`role-${r.val}`}
                      >
                        {r.label}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            <div>
              <label className="text-[11px] font-medium text-gray-500 uppercase tracking-wider block mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@capymatch.com"
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-300 transition-all"
                data-testid="input-email"
              />
            </div>

            <div>
              <label className="text-[11px] font-medium text-gray-500 uppercase tracking-wider block mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="Enter password"
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-300 transition-all pr-10"
                  data-testid="input-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  data-testid="toggle-password"
                >
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg" data-testid="auth-error">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={busy}
              className="w-full py-2.5 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              data-testid="auth-submit-btn"
            >
              {busy ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
              ) : mode === "login" ? (
                <>
                  <LogIn className="w-4 h-4" /> Sign In
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" /> Create Account
                </>
              )}
            </button>
          </form>

          {/* Quick access hint */}
          {mode === "login" && (
            <div className="mt-5 pt-4 border-t border-gray-100">
              <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-2 font-medium">Demo Accounts</p>
              <div className="space-y-1.5">
                {[
                  { label: "Director", email: "director@capymatch.com", pw: "director123" },
                  { label: "Coach Williams", email: "coach.williams@capymatch.com", pw: "coach123" },
                  { label: "Coach Garcia", email: "coach.garcia@capymatch.com", pw: "coach123" },
                ].map((d) => (
                  <button
                    key={d.email}
                    type="button"
                    onClick={() => { setEmail(d.email); setPassword(d.pw); }}
                    className="w-full text-left px-2.5 py-2 text-xs text-gray-500 hover:bg-gray-50 rounded-md transition-colors flex items-center justify-between group"
                    data-testid={`demo-${d.label.toLowerCase().replace(/\s+/g, "-")}`}
                  >
                    <span>{d.label}</span>
                    <span className="text-[10px] text-gray-300 group-hover:text-gray-400">{d.email}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

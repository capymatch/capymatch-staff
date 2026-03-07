import { useState } from "react";
import { useSearchParams, Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { KeyRound, Eye, EyeOff, CheckCircle, ArrowLeft } from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token") || "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }

    setBusy(true);
    try {
      await axios.post(`${API}/auth/reset-password`, { token, password });
      setSuccess(true);
      setTimeout(() => navigate("/login"), 3000);
    } catch (err) {
      setError(err.response?.data?.detail || "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center px-4" data-testid="reset-password-page">
        <div className="w-full max-w-sm">
          <div className="bg-white rounded-xl p-6 shadow-2xl text-center">
            <p className="text-sm text-gray-600 mb-3">Invalid reset link.</p>
            <Link
              to="/forgot-password"
              className="text-xs text-slate-600 hover:text-slate-900 font-medium"
              data-testid="request-new-link"
            >
              Request a new reset link
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center px-4" data-testid="reset-password-page">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center mx-auto mb-3">
            <KeyRound className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-xl font-semibold text-white tracking-tight">Set New Password</h1>
          <p className="text-xs text-white/40 mt-1">CapyMatch</p>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-2xl">
          {success ? (
            <div className="text-center py-4" data-testid="reset-success">
              <div className="w-10 h-10 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-3">
                <CheckCircle className="w-5 h-5 text-emerald-600" />
              </div>
              <h2 className="text-sm font-semibold text-gray-900 mb-1">Password updated</h2>
              <p className="text-xs text-gray-500 mb-4">Redirecting you to sign in...</p>
              <Link
                to="/login"
                className="inline-flex items-center gap-1 text-xs text-slate-600 hover:text-slate-900 font-medium"
                data-testid="go-to-login-link"
              >
                <ArrowLeft className="w-3 h-3" />
                Sign in now
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-[11px] font-medium text-gray-500 uppercase tracking-wider block mb-1.5">New Password</label>
                <div className="relative">
                  <input
                    type={showPw ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="At least 6 characters"
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-300 transition-all pr-10"
                    data-testid="reset-password-input"
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

              <div>
                <label className="text-[11px] font-medium text-gray-500 uppercase tracking-wider block mb-1.5">Confirm Password</label>
                <input
                  type={showPw ? "text" : "password"}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                  placeholder="Re-enter password"
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-300 transition-all"
                  data-testid="reset-confirm-input"
                />
              </div>

              {error && (
                <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg" data-testid="reset-error">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={busy}
                className="w-full py-2.5 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                data-testid="reset-submit-btn"
              >
                {busy ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                ) : (
                  <>
                    <KeyRound className="w-4 h-4" /> Set New Password
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

import { useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { Mail, ArrowLeft, CheckCircle } from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await axios.post(`${API}/auth/forgot-password`, { email });
      setSent(true);
    } catch (err) {
      setError(err.response?.data?.detail || "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center px-4" data-testid="forgot-password-page">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center mx-auto mb-3">
            <Mail className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-xl font-semibold text-white tracking-tight">Reset Password</h1>
          <p className="text-xs text-white/40 mt-1">CapyMatch</p>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-2xl">
          {sent ? (
            <div className="text-center py-4" data-testid="reset-email-sent">
              <div className="w-10 h-10 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-3">
                <CheckCircle className="w-5 h-5 text-emerald-600" />
              </div>
              <h2 className="text-sm font-semibold text-gray-900 mb-1">Check your email</h2>
              <p className="text-xs text-gray-500 leading-relaxed mb-4">
                If an account exists for that email, we sent a reset link. It expires in 1 hour.
              </p>
              <Link
                to="/login"
                className="inline-flex items-center gap-1 text-xs text-slate-600 hover:text-slate-900 font-medium"
                data-testid="back-to-login-link"
              >
                <ArrowLeft className="w-3 h-3" />
                Back to sign in
              </Link>
            </div>
          ) : (
            <>
              <p className="text-xs text-gray-500 mb-4 leading-relaxed">
                Enter your email and we'll send you a link to reset your password.
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-[11px] font-medium text-gray-500 uppercase tracking-wider block mb-1.5">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="you@capymatch.com"
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-300 transition-all"
                    data-testid="forgot-email-input"
                  />
                </div>

                {error && (
                  <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg" data-testid="forgot-error">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={busy}
                  className="w-full py-2.5 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  data-testid="forgot-submit-btn"
                >
                  {busy ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                  ) : (
                    <>
                      <Mail className="w-4 h-4" /> Send Reset Link
                    </>
                  )}
                </button>
              </form>

              <div className="mt-4 text-center">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600"
                  data-testid="back-to-login-link"
                >
                  <ArrowLeft className="w-3 h-3" />
                  Back to sign in
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

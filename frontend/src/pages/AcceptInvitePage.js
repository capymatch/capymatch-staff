import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { useAuth } from "@/AuthContext";
import { Shield, Eye, EyeOff, CheckCircle, XCircle } from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function AcceptInvitePage() {
  const { token } = useParams();
  const navigate = useNavigate();
  const { user, login } = useAuth();
  const [invite, setInvite] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  // If already logged in, redirect to mission control
  useEffect(() => {
    if (user) navigate("/mission-control", { replace: true });
  }, [user, navigate]);

  // Validate invite token
  useEffect(() => {
    axios
      .get(`${API}/invites/validate/${token}`)
      .then((res) => {
        setInvite(res.data);
        setName(res.data.name || "");
      })
      .catch((err) => {
        setError(err.response?.data?.detail || "Invalid or expired invite link");
      })
      .finally(() => setLoading(false));
  }, [token]);

  const handleAccept = async (e) => {
    e.preventDefault();
    setSubmitError("");
    setSubmitting(true);
    try {
      const res = await axios.post(`${API}/invites/accept/${token}`, {
        password,
        name: name || undefined,
      });
      // Set auth state manually — the response has token + user
      localStorage.setItem("capymatch_token", res.data.token);
      axios.defaults.headers.common["Authorization"] = `Bearer ${res.data.token}`;
      // Navigate and reload to pick up the new auth state
      window.location.href = "/mission-control";
    } catch (err) {
      setSubmitError(err.response?.data?.detail || "Failed to create account");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center px-4" data-testid="invite-error-page">
        <div className="w-full max-w-sm text-center">
          <XCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h1 className="text-lg font-semibold text-white mb-2">Invite Issue</h1>
          <p className="text-sm text-white/60 mb-6">{error}</p>
          <button
            onClick={() => navigate("/login")}
            className="px-4 py-2.5 bg-white/10 text-white text-sm font-medium rounded-lg hover:bg-white/20 transition-colors"
            data-testid="go-to-login-btn"
          >
            Go to Sign In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center px-4" data-testid="accept-invite-page">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center mx-auto mb-3">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-xl font-semibold text-white tracking-tight">Join CapyMatch</h1>
          <p className="text-xs text-white/40 mt-1">
            Invited by <span className="text-white/60">{invite.invited_by_name}</span>
          </p>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-2xl">
          <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-3 mb-5 flex items-start gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs text-emerald-800 font-medium">You've been invited as a Coach</p>
              {invite.team && (
                <p className="text-[10px] text-emerald-600 mt-0.5">Team: {invite.team}</p>
              )}
            </div>
          </div>

          <form onSubmit={handleAccept} className="space-y-4">
            <div>
              <label className="text-[11px] font-medium text-gray-500 uppercase tracking-wider block mb-1.5">Email</label>
              <input
                type="email"
                value={invite.email}
                disabled
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg bg-gray-50 text-gray-500"
                data-testid="invite-email-display"
              />
            </div>

            <div>
              <label className="text-[11px] font-medium text-gray-500 uppercase tracking-wider block mb-1.5">Your Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your full name"
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-300 transition-all"
                data-testid="invite-accept-name"
              />
            </div>

            <div>
              <label className="text-[11px] font-medium text-gray-500 uppercase tracking-wider block mb-1.5">Create Password</label>
              <div className="relative">
                <input
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  placeholder="Min 6 characters"
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-300 transition-all pr-10"
                  data-testid="invite-accept-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {submitError && (
              <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg" data-testid="accept-error">
                {submitError}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              data-testid="accept-invite-btn"
            >
              {submitting ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" /> Complete Setup
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

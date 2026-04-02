import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { useAuth } from "@/AuthContext";
import { Eye, EyeOff, CheckCircle, XCircle } from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const pageStyle = {
  minHeight: "100vh",
  background: `
    linear-gradient(rgba(16,24,40,0.06) 1px, transparent 1px),
    linear-gradient(90deg, rgba(16,24,40,0.06) 1px, transparent 1px),
    #f7f3ec`,
  backgroundSize: "44px 44px, 44px 44px, auto",
};

export default function AcceptInvitePage() {
  const { token } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [invite, setInvite] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  useEffect(() => {
    if (user) navigate("/mission-control", { replace: true });
  }, [user, navigate]);

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
      localStorage.setItem("capymatch_token", res.data.token);
      axios.defaults.headers.common["Authorization"] = `Bearer ${res.data.token}`;
      window.location.href = "/mission-control";
    } catch (err) {
      setSubmitError(err.response?.data?.detail || "Failed to create account");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={pageStyle} className="flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#ff5a1f]" />
      </div>
    );
  }

  if (error) {
    return (
      <div style={pageStyle} className="flex items-center justify-center px-4" data-testid="invite-error-page">
        <div className="w-full max-w-[480px] text-center"
          style={{ background: "rgba(255,255,255,0.88)", backdropFilter: "blur(10px)", border: "1px solid rgba(231,223,212,0.92)", borderRadius: 28, boxShadow: "0 30px 80px rgba(16,24,40,0.08)", padding: 32 }}>
          <XCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h1 className="text-xl font-extrabold text-[#101828] mb-2 tracking-[-0.03em]">Invite Issue</h1>
          <p className="text-sm text-[#667085] mb-6">{error}</p>
          <button
            onClick={() => navigate("/login")}
            className="px-5 py-3 text-sm font-bold cursor-pointer transition-all"
            style={{ background: "linear-gradient(180deg, #ff6d37, #ff5a1f)", color: "white", borderRadius: 16, border: "none", boxShadow: "0 8px 20px rgba(255,90,31,0.18)" }}
            data-testid="go-to-login-btn"
          >
            Go to Sign In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={pageStyle} className="flex items-center justify-center px-4 py-10" data-testid="accept-invite-page">
      <div className="w-full max-w-[480px]">
        {/* Brand header */}
        <div className="flex items-center gap-3 mb-10 justify-center">
          <div
            className="w-11 h-11 grid place-items-center text-white font-extrabold text-xl"
            style={{ borderRadius: 14, background: "linear-gradient(180deg, #ff6d37, #ff5a1f)", boxShadow: "0 14px 28px rgba(255,90,31,0.2)" }}
          >C</div>
          <span className="text-2xl font-extrabold tracking-[-0.03em] text-[#101828]">CapyMatch</span>
        </div>

        {/* Card */}
        <div
          style={{
            background: "rgba(255,255,255,0.88)",
            backdropFilter: "blur(10px)",
            border: "1px solid rgba(231,223,212,0.92)",
            borderRadius: 28,
            boxShadow: "0 30px 80px rgba(16,24,40,0.08)",
            padding: 26,
          }}
        >
          {/* Welcome copy */}
          <div className="mb-5">
            <h2 className="text-[28px] font-extrabold tracking-[-0.04em] text-[#101828] mb-2 leading-tight">
              Join your team
            </h2>
            <p className="text-sm text-[#667085] leading-[1.55]">
              Invited by <span className="font-bold text-[#101828]">{invite.invited_by_name}</span> to join as a Coach. Complete setup below.
            </p>
          </div>

          {/* Invite badge */}
          <div
            className="flex items-center gap-2 px-3.5 py-2.5 mb-6"
            style={{ borderRadius: 14, background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.12)" }}
          >
            <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
            <p className="text-[13px] text-emerald-800 font-bold">You've been invited as a Coach</p>
            {invite.team && (
              <span className="text-[11px] text-emerald-600 ml-auto font-medium">{invite.team}</span>
            )}
          </div>

          <form onSubmit={handleAccept}>
            {/* Email */}
            <div className="mb-4">
              <label className="block text-[13px] font-extrabold tracking-[0.08em] text-[#667085] mb-2">EMAIL</label>
              <input
                type="email"
                value={invite.email}
                disabled
                className="w-full text-base text-[#98a2b3] outline-none"
                style={{ border: "1px solid #e7dfd4", borderRadius: 16, padding: "16px 18px", background: "#f7f5f1" }}
                data-testid="invite-email-display"
              />
            </div>

            {/* Name */}
            <div className="mb-4">
              <label className="block text-[13px] font-extrabold tracking-[0.08em] text-[#667085] mb-2">YOUR NAME</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your full name"
                className="w-full text-base text-[#101828] outline-none placeholder:text-[#98a2b3]"
                style={{ border: "1px solid #e7dfd4", borderRadius: 16, padding: "16px 18px", background: "#fff", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.5)" }}
                data-testid="invite-accept-name"
              />
            </div>

            {/* Password */}
            <div className="mb-5">
              <label className="block text-[13px] font-extrabold tracking-[0.08em] text-[#667085] mb-2">CREATE PASSWORD</label>
              <div className="relative">
                <input
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  placeholder="Min 6 characters"
                  className="w-full text-base text-[#101828] outline-none pr-14 placeholder:text-[#98a2b3]"
                  style={{ border: "1px solid #e7dfd4", borderRadius: 16, padding: "16px 18px", background: "#fff", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.5)" }}
                  data-testid="invite-accept-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[#98a2b3] hover:text-[#667085] cursor-pointer"
                  style={{ background: "none", border: "none" }}
                >
                  {showPw ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {submitError && (
              <p className="text-xs text-red-700 bg-red-50 px-4 py-2.5 mb-4 font-medium" style={{ borderRadius: 12, border: "1px solid rgba(239,68,68,0.12)" }} data-testid="accept-error">
                {submitError}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full text-base font-bold cursor-pointer transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              style={{
                background: "linear-gradient(180deg, #ff6d37, #ff5a1f)",
                color: "white",
                border: "none",
                borderRadius: 16,
                padding: "16px",
                boxShadow: "0 12px 28px rgba(255,90,31,0.2)",
              }}
              data-testid="accept-invite-btn"
            >
              {submitting ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
              ) : (
                <>
                  <CheckCircle className="w-5 h-5" /> Complete Setup
                </>
              )}
            </button>
          </form>

          {/* Login link */}
          <p className="text-center text-[13px] text-[#667085] mt-5">
            Already have an account?{" "}
            <button onClick={() => navigate("/login")} className="text-[#ff5a1f] font-bold cursor-pointer hover:underline" style={{ background: "none", border: "none" }}>
              Sign In
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

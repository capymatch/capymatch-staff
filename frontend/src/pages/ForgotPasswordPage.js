import { useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { Mail, ArrowLeft, CheckCircle } from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const pageStyle = {
  minHeight: "100vh",
  background: `
    linear-gradient(rgba(16,24,40,0.06) 1px, transparent 1px),
    linear-gradient(90deg, rgba(16,24,40,0.06) 1px, transparent 1px),
    #f7f3ec`,
  backgroundSize: "44px 44px, 44px 44px, auto",
};

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
    <div style={pageStyle} data-testid="forgot-password-page">
      <main className="min-h-screen grid grid-cols-1 lg:grid-cols-[1.05fr_0.95fr] gap-7 lg:gap-12 items-center p-5 sm:p-7 lg:py-12 lg:px-14">

        {/* Left: Brand side */}
        <section className="lg:py-6 lg:pl-6 max-w-[700px]">
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
            ACCOUNT RECOVERY
          </div>

          <h1
            className="mb-6 font-black leading-[0.92] tracking-[-0.07em] max-w-[620px]"
            style={{ fontSize: "clamp(54px, 6vw, 96px)", color: "#101828" }}
          >
            Forgot your{" "}
            <span className="text-[#ff5a1f]">password?</span>
          </h1>

          <p
            className="max-w-[560px] mb-7 leading-[1.45] tracking-[-0.03em]"
            style={{ fontSize: 26, color: "#475467" }}
          >
            No worries.{" "}
            <strong className="text-[#101828] font-bold">We'll send you a reset link.</strong>
            <br />
            Check your inbox and follow the instructions.
          </p>

          <div className="flex flex-wrap gap-2.5 mb-8">
            {["Secure Reset", "1-Hour Expiry", "Instant Delivery"].map((t) => (
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
        </section>

        {/* Right: Reset card */}
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

            {sent ? (
              <div data-testid="reset-email-sent">
                <div className="mb-5">
                  <h2 className="text-[34px] font-extrabold tracking-[-0.05em] text-[#101828] mb-2 leading-tight">
                    Check your email
                  </h2>
                  <p className="text-base text-[#667085] leading-[1.55]">
                    If an account exists for that email, we sent a reset link. It expires in 1 hour.
                  </p>
                </div>

                <div
                  className="flex items-center gap-4 mb-6"
                  style={{
                    padding: "18px",
                    borderRadius: 16,
                    background: "#f0fdf4",
                    border: "1px solid #bbf7d0",
                  }}
                >
                  <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                    <CheckCircle className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-emerald-900">Reset link sent</p>
                    <p className="text-xs text-emerald-700 mt-0.5">Check your inbox and spam folder</p>
                  </div>
                </div>

                <Link
                  to="/login"
                  className="w-full border-0 text-white text-xl font-extrabold tracking-[-0.02em] cursor-pointer flex items-center justify-center gap-2 transition-all duration-200 hover:brightness-110 active:scale-[0.98] no-underline"
                  style={{
                    background: "#ff5a1f",
                    borderRadius: 18,
                    padding: "18px 22px",
                    boxShadow: "0 20px 34px rgba(255,90,31,0.22)",
                  }}
                  data-testid="back-to-login-link"
                >
                  <ArrowLeft className="w-5 h-5" /> Back to Sign In
                </Link>
              </div>
            ) : (
              <>
                <div className="mb-5">
                  <h2 className="text-[34px] font-extrabold tracking-[-0.05em] text-[#101828] mb-2 leading-tight">
                    Reset password
                  </h2>
                  <p className="text-base text-[#667085] leading-[1.55]">
                    Enter your email and we'll send you a link to reset your password.
                  </p>
                </div>

                <form onSubmit={handleSubmit}>
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
                      data-testid="forgot-email-input"
                    />
                  </div>

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
                      data-testid="forgot-error"
                    >
                      {error}
                    </div>
                  )}

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
                    data-testid="forgot-submit-btn"
                  >
                    {busy ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <Mail className="w-5 h-5" /> Send Reset Link
                      </>
                    )}
                  </button>
                </form>

                <div className="relative text-center my-5">
                  <div className="absolute top-1/2 left-0 right-0 h-px bg-[#e7dfd4]" />
                  <span
                    className="relative z-10 px-3 text-[13px] font-bold uppercase tracking-[0.08em] text-[#98a2b3]"
                    style={{ background: "rgba(255,255,255,0.88)" }}
                  >
                    or
                  </span>
                </div>

                <Link
                  to="/login"
                  className="w-full flex items-center justify-center gap-3 border cursor-pointer transition-all duration-200 hover:bg-gray-50 active:scale-[0.98] no-underline"
                  style={{
                    border: "1px solid #e7dfd4",
                    borderRadius: 18,
                    padding: "16px 22px",
                    background: "#fff",
                    boxShadow: "0 4px 12px rgba(16,24,40,0.04)",
                  }}
                  data-testid="back-to-login-link"
                >
                  <ArrowLeft className="w-5 h-5 text-[#344054]" />
                  <span className="text-[16px] font-bold text-[#344054]">Back to Sign In</span>
                </Link>
              </>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

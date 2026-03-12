import { useState } from "react";
import { Shield, CheckCircle2, X, Mail } from "lucide-react";

export default function GmailConsentModal({ onAccept, onCancel }) {
  const [agreed, setAgreed] = useState(false);

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(12px)" }} data-testid="gmail-consent-overlay">
      <div className="w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200"
        style={{ backgroundColor: "var(--cm-surface)", border: "1px solid var(--cm-border)" }}
        data-testid="gmail-consent-modal">

        {/* Header */}
        <div className="flex items-start justify-between p-6 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(26,138,128,0.15)" }}>
              <Shield className="w-5 h-5" style={{ color: "#1a8a80" }} />
            </div>
            <div>
              <h2 className="text-lg font-bold" style={{ color: "var(--cm-text)" }}>Before You Connect Gmail</h2>
              <p className="text-sm" style={{ color: "var(--cm-text-3)" }}>Your privacy matters to us</p>
            </div>
          </div>
          <button onClick={onCancel} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors mt-0.5" data-testid="consent-close-btn">
            <X className="w-4.5 h-4.5" style={{ color: "var(--cm-text-3)" }} />
          </button>
        </div>

        <div className="px-6 pb-6 space-y-5">
          {/* Pro Tip Box */}
          <div className="rounded-xl p-4" style={{ backgroundColor: "rgba(26,138,128,0.06)", borderLeft: "3px solid #1a8a80" }} data-testid="pro-tip-box">
            <p className="text-sm font-semibold mb-1" style={{ color: "#1a8a80" }}>Pro Tip: Use a Recruiting Email</p>
            <p className="text-xs leading-relaxed" style={{ color: "var(--cm-text-3)" }}>
              We recommend creating a dedicated email for recruiting (e.g., <span className="font-medium" style={{ color: "var(--cm-text-2)" }}>firstname.lastname.recruiting@gmail.com</span>). This keeps your personal inbox private and your recruiting communication organized.
            </p>
          </div>

          {/* WHAT WE ACCESS */}
          <div>
            <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: "var(--cm-text-2)" }}>What We Access</p>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 mt-0.5 flex-shrink-0" style={{ color: "#1a8a80" }} />
                <div>
                  <p className="text-sm font-semibold" style={{ color: "var(--cm-text)" }}>Send emails to coaches on your behalf</p>
                  <p className="text-xs" style={{ color: "var(--cm-text-3)" }}>Only when you compose an email and click Send</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 mt-0.5 flex-shrink-0" style={{ color: "#1a8a80" }} />
                <div>
                  <p className="text-sm font-semibold" style={{ color: "var(--cm-text)" }}>Read recruiting-related emails you choose to sync</p>
                  <p className="text-xs" style={{ color: "var(--cm-text-3)" }}>We access messages and threads so we can organize conversations by school and timeline</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 mt-0.5 flex-shrink-0" style={{ color: "#1a8a80" }} />
                <div>
                  <p className="text-sm font-semibold" style={{ color: "var(--cm-text)" }}>Detect inbound coach responses and activity</p>
                  <p className="text-xs" style={{ color: "var(--cm-text-3)" }}>Used to update your recruiting journey automatically (You can turn this off anytime in Settings)</p>
                </div>
              </div>
            </div>
          </div>

          {/* WHAT WE NEVER DO */}
          <div>
            <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: "var(--cm-text-2)" }}>What We Never Do</p>
            <div className="space-y-2.5">
              {[
                "Read or analyze emails unrelated to recruiting",
                "Send emails without your explicit action",
                "Sell or share your email data with third parties",
                "Use your Gmail content for advertising",
              ].map((text, i) => (
                <div key={i} className="flex items-center gap-3">
                  <X className="w-4.5 h-4.5 flex-shrink-0 text-red-500" />
                  <p className="text-sm" style={{ color: "var(--cm-text-2)" }}>{text}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Security Note */}
          <div className="flex items-start gap-3 rounded-xl p-3.5" style={{ backgroundColor: "rgba(26,138,128,0.06)" }} data-testid="security-note">
            <Shield className="w-4.5 h-4.5 mt-0.5 flex-shrink-0" style={{ color: "#1a8a80" }} />
            <p className="text-xs leading-relaxed" style={{ color: "var(--cm-text-3)" }}>
              Your Gmail access is encrypted and secure. You can disconnect Gmail at any time from Settings or your Google account.
            </p>
          </div>

          {/* Consent Checkbox */}
          <label className="flex items-start gap-3 cursor-pointer select-none" data-testid="consent-checkbox-label">
            <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)}
              className="mt-1 w-4 h-4 rounded border-2 accent-teal-600 flex-shrink-0 cursor-pointer"
              style={{ borderColor: "var(--cm-border)" }}
              data-testid="consent-checkbox" />
            <span className="text-sm" style={{ color: "var(--cm-text-2)" }}>
              I understand what data is accessed and consent to connecting my Gmail account.
            </span>
          </label>
        </div>

        {/* Buttons */}
        <div className="px-6 pb-6 flex items-center gap-3">
          <button onClick={onAccept} disabled={!agreed}
            className="flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ backgroundColor: agreed ? "#1a8a80" : "rgba(26,138,128,0.5)" }}
            data-testid="consent-accept-btn">
            <Mail className="w-4 h-4" /> Connect Gmail
          </button>
          <button onClick={onCancel}
            className="px-6 py-3 rounded-xl text-sm font-medium transition-colors"
            style={{ color: "var(--cm-text-2)", backgroundColor: "var(--cm-surface-2)", border: "1px solid var(--cm-border)" }}
            data-testid="consent-cancel-btn">
            Not Now
          </button>
        </div>
      </div>
    </div>
  );
}

import { Shield, Mail, Lock, Eye, X } from "lucide-react";
import { Button } from "./ui/button";

export default function GmailConsentModal({ onAccept, onCancel }) {
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(12px)" }} data-testid="gmail-consent-overlay">
      <div className="w-full max-w-md rounded-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200"
        style={{ background: "#161b25", border: "1px solid rgba(46, 196, 182, 0.15)" }}
        data-testid="gmail-consent-modal">
        <div className="p-5 pb-4 border-b" style={{ borderColor: "rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)" }}>
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
              <Shield className="w-4 h-4 text-teal-600" />Connect Gmail
            </h2>
            <button onClick={onCancel} className="p-1 rounded-lg hover:bg-white/10 transition-colors" data-testid="consent-close-btn">
              <X className="w-4 h-4 text-white/40" />
            </button>
          </div>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-xs text-slate-300 leading-relaxed">
            CapyMatch needs access to your Gmail to help you manage your recruiting communications.
            Here's exactly what we'll do with your data:
          </p>

          <div className="space-y-3">
            {[
              {
                icon: Mail, title: "Send emails on your behalf",
                desc: "Compose and send recruiting emails directly from the app"
              },
              {
                icon: Eye, title: "Read email headers",
                desc: "Scan subject lines and sender info to identify schools — we never read email body content"
              },
              {
                icon: Lock, title: "Your data stays private",
                desc: "Tokens are encrypted. We never share your data with third parties."
              },
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-slate-800/40">
                <div className="w-8 h-8 rounded-lg bg-teal-700/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <item.icon className="w-4 h-4 text-teal-600" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-white">{item.title}</p>
                  <p className="text-[10px] text-slate-400 leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <p className="text-[10px] text-slate-500 leading-relaxed">
            You can disconnect Gmail and revoke access at any time from Settings.
            By connecting, you agree to our{" "}
            <a href="/privacy" className="text-teal-600 underline">Privacy Policy</a>.
          </p>
        </div>

        <div className="p-4 flex items-center justify-between gap-3" style={{ background: "rgba(15,18,25,0.5)", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <button onClick={onCancel}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-[13px] font-semibold transition-all hover:bg-white/5"
            style={{ color: "rgba(255,255,255,0.5)", border: "1px solid rgba(255,255,255,0.1)" }}
            data-testid="consent-cancel-btn">
            Cancel
          </button>
          <Button onClick={onAccept}
            className="flex items-center gap-2 px-6 py-2.5 rounded-lg text-[13px] font-bold text-white transition-all hover:shadow-[0_0_20px_rgba(26,138,128,0.4)]"
            style={{ background: "linear-gradient(135deg, #1a8a80, #25a99e)" }}
            data-testid="consent-accept-btn">
            <Mail className="w-4 h-4" />Connect Gmail
          </Button>
        </div>
      </div>
    </div>
  );
}

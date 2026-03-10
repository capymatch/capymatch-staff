import { Phone, FileText, Mail } from "lucide-react";
import { Button } from "../ui/button";

export function CelebrationHero({ program, coaches, onEmail, onLog, onCall }) {
  const coachName = coaches?.[0]?.coach_name || "The coach";
  const signals = program.signals || {};
  const daysAgo = signals.days_since_reply;
  const timeText = daysAgo === 0 ? "today" : daysAgo === 1 ? "yesterday" : daysAgo != null ? `${daysAgo} days ago` : "recently";

  return (
    <div className="overflow-hidden" style={{ background: "#1e1e2e", borderRadius: 10 }} data-testid="celebration-hero">
      <div style={{ height: 2, background: "linear-gradient(90deg, #10b981, rgba(16,185,129,0.2))" }} />
      <div className="p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
            style={{ backgroundColor: "rgba(16,185,129,0.15)" }}>
            <span className="text-lg">&#127881;</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: "#10b981" }}>
              Coach replied {timeText}
            </p>
            <h3 className="text-sm font-bold mb-1" style={{ color: "#ffffff" }}>
              {coachName} is interested!
            </h3>
            <p className="text-xs mb-4" style={{ color: "rgba(255,255,255,0.5)" }}>
              Keep the momentum going — respond quickly to show you're serious.
            </p>
            <div className="flex gap-2 flex-wrap">
              {onEmail && (
                <button onClick={onEmail}
                  className="inline-flex items-center gap-1.5 px-3 h-8 rounded-md text-xs font-medium text-white transition-colors shadow-md"
                  style={{ backgroundColor: "#0d9488" }}
                  data-testid="celebration-email-btn">
                  <Mail className="w-3.5 h-3.5" /> Send Thank You
                </button>
              )}
              <button onClick={onCall}
                className="inline-flex items-center gap-1.5 px-3 h-8 rounded-md text-xs font-medium transition-colors"
                style={{ color: "rgba(255,255,255,0.6)", border: "1px solid rgba(255,255,255,0.1)" }}
                data-testid="celebration-call-btn">
                <Phone className="w-3.5 h-3.5" /> Schedule Call
              </button>
              <button onClick={onLog}
                className="inline-flex items-center gap-1.5 px-3 h-8 rounded-md text-xs font-medium transition-colors"
                style={{ color: "#0d9488", border: "1px solid rgba(13,148,136,0.25)" }}
                data-testid="celebration-log-btn">
                <FileText className="w-3.5 h-3.5" /> Log a Note
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

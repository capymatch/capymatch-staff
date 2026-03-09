import { Mail, Phone, FileText } from "lucide-react";
import { Button } from "../ui/button";

export function CelebrationHero({ program, coaches, onEmail, onLog, onCall }) {
  const coachName = coaches?.[0]?.coach_name || "The coach";
  const signals = program.signals || {};
  const daysAgo = signals.days_since_reply;
  const timeText = daysAgo === 0 ? "today" : daysAgo === 1 ? "yesterday" : daysAgo != null ? `${daysAgo} days ago` : "recently";

  return (
    <div className="rounded-2xl border p-5 sm:p-6 text-center relative overflow-hidden"
      style={{ borderColor: "rgba(16,185,129,0.2)", background: "linear-gradient(135deg, rgba(16,185,129,0.04), #0f172a 60%)" }}
      data-testid="celebration-hero">
      <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-48 h-48 rounded-full" style={{ background: "radial-gradient(circle, rgba(16,185,129,0.08) 0%, transparent 60%)" }} />
      <div className="relative">
        <div className="text-3xl mb-2">&#127881;</div>
        <h3 className="text-base font-bold mb-1 text-white">{coachName} is interested!</h3>
        <p className="text-xs mb-4 max-w-sm mx-auto text-slate-400">
          Replied {timeText} — keep the momentum going:
        </p>
        <div className="flex gap-2.5 justify-center flex-wrap">
          {onEmail && (
            <Button className="bg-teal-700 hover:bg-teal-800 text-white text-xs h-8 px-4 shadow-md" onClick={onEmail} data-testid="celebration-email-btn">
              <Mail className="w-3.5 h-3.5 mr-1.5" />Send Thank You
            </Button>
          )}
          <Button variant="outline" className="text-xs h-8 px-4 text-slate-300 border-slate-600" onClick={onCall} data-testid="celebration-call-btn">
            <Phone className="w-3.5 h-3.5 mr-1.5" />Schedule Call
          </Button>
          <Button variant="outline" className="text-xs h-8 px-4 border-teal-700/30 text-teal-600 hover:bg-teal-700/10"
            onClick={onLog} data-testid="celebration-log-btn">
            <FileText className="w-3.5 h-3.5 mr-1.5" />Log a Note
          </Button>
        </div>
      </div>
    </div>
  );
}

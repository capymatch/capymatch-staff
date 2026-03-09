import { X } from "lucide-react";
import { Button } from "../ui/button";
import { NEXT_STEP_RULES, ACTION_BUTTONS } from "./constants";

export function NextStepCard({ latestEvent, universityName, onEmail, onLog, onFollowup, onDismiss }) {
  const evtType = (latestEvent?.event_type || latestEvent?.type || "").toLowerCase().replace(/\s+/g, "_");
  const rule = NEXT_STEP_RULES[evtType];
  if (!rule) return null;

  const actionHandlers = { email: onEmail, log: onLog, followup: onFollowup };

  return (
    <div className="rounded-2xl border p-5 relative overflow-hidden"
      style={{ borderColor: "rgba(26,138,128,0.3)", background: "#1e1e2e" }}
      data-testid="next-step-card">
      <button onClick={onDismiss} className="absolute top-3 right-3 p-1 rounded-lg hover:bg-white/10 transition-colors" style={{ color: "rgba(255,255,255,0.35)" }}
        data-testid="next-step-dismiss"><X className="w-4 h-4" /></button>
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
          style={{ backgroundColor: rule.iconBg }}>
          <rule.icon className="w-5 h-5" style={{ color: rule.iconColor }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: "#1a8a80" }}>What's Next</p>
          <h3 className="text-sm font-bold mb-1" style={{ color: "#ffffff" }}>{rule.title}</h3>
          <p className="text-xs mb-4" style={{ color: "rgba(255,255,255,0.5)" }}>{rule.desc}</p>
          <div className="flex gap-2 flex-wrap">
            {rule.actions.map(key => {
              const btn = ACTION_BUTTONS[key];
              const Icon = btn.icon;
              return (
                <Button key={key} size="sm" variant={key === rule.actions[0] ? "default" : "outline"}
                  className={`text-xs h-8 px-3 ${key === rule.actions[0] ? "bg-teal-700 hover:bg-teal-800 text-white shadow-md" : ""}`}
                  style={key !== rule.actions[0] ? { color: "rgba(255,255,255,0.6)", borderColor: "rgba(255,255,255,0.1)" } : undefined}
                  onClick={actionHandlers[key]} data-testid={btn.testId}>
                  <Icon className="w-3.5 h-3.5 mr-1.5" />{btn.label}
                </Button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

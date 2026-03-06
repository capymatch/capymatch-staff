import { AlertCircle, ArrowRight, Clock, ShieldAlert, Users, Target, Zap, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

const CATEGORY_LABELS = {
  momentum_drop: "Momentum Drop",
  blocker: "Blocker",
  deadline_proximity: "Deadline",
  engagement_drop: "Engagement",
  ownership_gap: "Unassigned",
  readiness_issue: "Readiness",
};

const CATEGORY_ICONS = {
  momentum_drop: Zap,
  blocker: ShieldAlert,
  deadline_proximity: Clock,
  engagement_drop: AlertTriangle,
  ownership_gap: Users,
  readiness_issue: Target,
};

function PriorityAlerts({ alerts, onPeek }) {
  if (!alerts || alerts.length === 0) return null;

  const getBorderColor = (color) => {
    switch (color) {
      case "red": return "border-l-red-500";
      case "amber": return "border-l-amber-500";
      default: return "border-l-blue-500";
    }
  };

  const getAccentColor = (color) => {
    switch (color) {
      case "red": return "text-red-600";
      case "amber": return "text-amber-600";
      default: return "text-blue-600";
    }
  };

  const getBadgeStyles = (color) => {
    switch (color) {
      case "red": return "bg-red-500/10 text-red-600";
      case "amber": return "bg-amber-500/10 text-amber-600";
      default: return "bg-blue-500/10 text-blue-600";
    }
  };

  return (
    <section data-testid="priority-alerts-section">
      <div className="flex items-center gap-2 mb-5">
        <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse" />
        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.1em]">Priority Alerts</span>
        <span className="text-[11px] text-slate-400 ml-1">{alerts.length} active</span>
      </div>

      <div className="space-y-3">
        {alerts.map((alert, idx) => {
          const CategoryIcon = CATEGORY_ICONS[alert.category] || AlertCircle;
          return (
            <div
              key={`${alert.athlete_id}_${alert.category}_${idx}`}
              data-testid={`priority-alert-${alert.athlete_id}-${alert.category}`}
              onClick={() => onPeek?.(alert)}
              className={`border-l-[3px] bg-white rounded-r-lg pl-5 pr-5 py-4 cursor-pointer hover:shadow-md transition-all duration-150 ${getBorderColor(alert.badge_color)}`}
            >
              {/* Top line: category + athlete */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${getBadgeStyles(alert.badge_color)}`}>
                    <CategoryIcon className="w-3 h-3" />
                    {CATEGORY_LABELS[alert.category]}
                  </span>
                  <span className="text-xs text-slate-400">{alert.athlete_name} · {alert.grad_year}</span>
                </div>
                {alert.pod_health && (
                  <span className="flex items-center gap-1 text-[11px]" data-testid="alert-pod-health">
                    <span className={`w-1.5 h-1.5 rounded-full ${
                      alert.pod_health.status === "red" ? "bg-red-500" :
                      alert.pod_health.status === "yellow" ? "bg-amber-400" : "bg-emerald-500"
                    }`} />
                    <span className={`font-medium ${
                      alert.pod_health.status === "red" ? "text-red-600" :
                      alert.pod_health.status === "yellow" ? "text-amber-600" : "text-emerald-600"
                    }`}>{alert.pod_health.label}</span>
                  </span>
                )}
              </div>

              {/* WHY — the dominant line */}
              <p className={`text-base font-semibold leading-snug mb-1 ${getAccentColor(alert.badge_color)}`} data-testid="alert-why">
                {alert.why_this_surfaced}
              </p>

              {/* Context + owner */}
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-500">{alert.what_changed}</p>
                <span className="text-[11px] text-slate-400">
                  <span className="font-medium text-slate-600">{alert.owner}</span>
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export default PriorityAlerts;

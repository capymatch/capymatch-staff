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

  const getAlertStyles = (color) => {
    switch (color) {
      case "red": return "border-l-red-500 bg-red-50/40";
      case "amber": return "border-l-amber-500 bg-amber-50/40";
      case "blue": return "border-l-blue-500 bg-blue-50/40";
      default: return "border-l-gray-400 bg-gray-50";
    }
  };

  const getBadgeStyles = (color) => {
    switch (color) {
      case "red": return "bg-red-100 text-red-700 border-red-200";
      case "amber": return "bg-amber-100 text-amber-700 border-amber-200";
      case "blue": return "bg-blue-100 text-blue-700 border-blue-200";
      default: return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

  const getIconColor = (color) => {
    switch (color) {
      case "red": return "text-red-500";
      case "amber": return "text-amber-500";
      default: return "text-blue-500";
    }
  };

  return (
    <section className="space-y-4" data-testid="priority-alerts-section">
      <div className="flex items-center space-x-2">
        <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
        <h2 className="text-xl font-bold tracking-tight">Priority Alerts</h2>
        <span className="text-sm text-gray-500 ml-2">{alerts.length} active</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {alerts.map((alert, idx) => {
          const CategoryIcon = CATEGORY_ICONS[alert.category] || AlertCircle;
          return (
            <div
              key={`${alert.athlete_id}_${alert.category}_${idx}`}
              data-testid={`priority-alert-${alert.athlete_id}-${alert.category}`}
              onClick={() => onPeek?.(alert)}
              className={`bg-white rounded-xl border-l-4 p-5 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer ${getAlertStyles(alert.badge_color)}`}
            >
              {/* Header: category badge + icon */}
              <div className="flex items-start justify-between mb-3">
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getBadgeStyles(alert.badge_color)}`}>
                  {CATEGORY_LABELS[alert.category] || alert.category}
                </span>
                <CategoryIcon className={`w-5 h-5 ${getIconColor(alert.badge_color)}`} />
              </div>

              {/* Athlete + why */}
              <div className="space-y-1.5 mb-3">
                <div className="flex items-baseline gap-2">
                  <h3 className="font-semibold text-gray-900" data-testid="alert-athlete-name">{alert.athlete_name}</h3>
                  <span className="text-xs text-gray-500">{alert.grad_year} · {alert.position}</span>
                </div>
                <p className="text-sm text-gray-700 leading-relaxed" data-testid="alert-why">
                  {alert.why_this_surfaced}
                </p>
                {alert.what_changed && (
                  <p className="text-xs text-gray-500">{alert.what_changed}</p>
                )}
              </div>

              {/* Owner */}
              <div className="text-xs text-gray-500 mb-3">
                Owner: <span className="font-medium text-gray-700">{alert.owner}</span>
              </div>

              {/* Action button */}
              <Button
                size="sm"
                className="w-full bg-primary hover:bg-primary/90 text-white rounded-full font-medium text-sm"
                data-testid={`alert-action-${alert.athlete_id}`}
              >
                {alert.recommended_action}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export default PriorityAlerts;

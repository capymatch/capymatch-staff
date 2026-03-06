import { AlertCircle, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

function PriorityAlerts({ alerts }) {
  if (!alerts || alerts.length === 0) {
    return null;
  }

  const getAlertStyles = (color) => {
    switch (color) {
      case "red":
        return "border-l-red-500 bg-red-50/50";
      case "amber":
        return "border-l-orange-500 bg-orange-50/50";
      case "blue":
        return "border-l-blue-500 bg-blue-50/50";
      default:
        return "border-l-gray-400 bg-gray-50";
    }
  };

  const getBadgeStyles = (color) => {
    switch (color) {
      case "red":
        return "bg-red-100 text-red-700 border-red-200";
      case "amber":
        return "bg-orange-100 text-orange-700 border-orange-200";
      case "blue":
        return "bg-blue-100 text-blue-700 border-blue-200";
      default:
        return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

  return (
    <section className="space-y-4" data-testid="priority-alerts-section">
      <div className="flex items-center space-x-2">
        <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse-dot"></div>
        <h2 className="text-xl font-bold tracking-tight" style={{fontFamily: 'Manrope'}}>
          Priority Alerts
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {alerts.map((alert) => (
          <div
            key={alert.id}
            data-testid={`priority-alert-${alert.id}`}
            className={`
              bg-white rounded-xl border-l-4 p-6 shadow-sm
              hover:shadow-md transition-all duration-200
              ${getAlertStyles(alert.color)}
            `}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center space-x-2">
                <span className={`
                  px-2 py-0.5 rounded-full text-xs font-medium border
                  ${getBadgeStyles(alert.color)}
                `}>
                  {alert.title}
                </span>
              </div>
              <AlertCircle className={`w-5 h-5 ${alert.color === 'red' ? 'text-red-500' : alert.color === 'amber' ? 'text-orange-500' : 'text-blue-500'}`} />
            </div>

            <div className="space-y-2 mb-4">
              <div className="flex items-baseline space-x-2">
                <h3 className="font-semibold text-gray-900">{alert.athleteName}</h3>
                <span className="text-xs text-gray-500">{alert.gradYear}</span>
              </div>
              <p className="text-sm text-gray-600 leading-relaxed">{alert.description}</p>
              {alert.context && (
                <p className="text-xs text-gray-500">School: {alert.context}</p>
              )}
            </div>

            <Button 
              size="sm" 
              className="w-full bg-primary hover:bg-primary/90 text-white rounded-full font-medium"
              data-testid={`alert-action-${alert.id}`}
            >
              {alert.action}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        ))}
      </div>
    </section>
  );
}

export default PriorityAlerts;

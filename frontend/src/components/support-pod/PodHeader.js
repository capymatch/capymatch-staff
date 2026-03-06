import { useNavigate } from "react-router-dom";
import { ArrowLeft, Activity } from "lucide-react";

const HEALTH_COLORS = {
  green: { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500", label: "Healthy" },
  yellow: { bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-500", label: "Needs Attention" },
  red: { bg: "bg-red-50", text: "text-red-700", dot: "bg-red-500", label: "At Risk" },
};

function PodHeader({ athlete, podHealth }) {
  const navigate = useNavigate();
  const health = HEALTH_COLORS[podHealth] || HEALTH_COLORS.yellow;

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-100" data-testid="pod-header">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate("/mission-control")}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors"
            data-testid="back-to-mc"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Mission Control</span>
          </button>
          <div className="h-5 w-px bg-gray-200" />
          <div>
            <h1 className="font-semibold text-gray-900 text-base leading-tight" data-testid="pod-athlete-name">
              {athlete?.fullName}
            </h1>
            <p className="text-xs text-gray-500">
              {athlete?.gradYear} · {athlete?.position} · {athlete?.team}
            </p>
          </div>
        </div>

        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${health.bg}`} data-testid="pod-health-badge">
          <div className={`w-2 h-2 rounded-full ${health.dot}`} />
          <Activity className={`w-3.5 h-3.5 ${health.text}`} />
          <span className={`text-xs font-medium ${health.text}`}>{health.label}</span>
        </div>
      </div>
    </header>
  );
}

export default PodHeader;

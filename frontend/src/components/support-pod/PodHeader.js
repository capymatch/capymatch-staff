import { useNavigate } from "react-router-dom";
import { ArrowLeft, Activity, RefreshCw, User } from "lucide-react";

const HEALTH_COLORS = {
  green: { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500", label: "Healthy" },
  yellow: { bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-500", label: "Needs Attention" },
  red: { bg: "bg-red-50", text: "text-red-700", dot: "bg-red-500", label: "At Risk" },
};

function formatTime(date) {
  if (!date) return "";
  const now = new Date();
  const diff = Math.round((now - date) / 1000);
  if (diff < 5) return "just now";
  if (diff < 60) return `${diff}s ago`;
  return `${Math.floor(diff / 60)}m ago`;
}

function PodHeader({ athlete, podHealth, lastRefreshed, isPolling, onManualRefresh, athleteId }) {
  const navigate = useNavigate();
  const health = HEALTH_COLORS[podHealth] || HEALTH_COLORS.yellow;

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-100" data-testid="pod-header">
      <div className="max-w-[1400px] mx-auto px-3 sm:px-6 py-2.5 sm:py-3">
        <div className="flex items-center justify-between gap-2">
          {/* Left: back + name */}
          <div className="flex items-center gap-2 sm:gap-4 min-w-0">
            <button
              onClick={() => navigate("/mission-control")}
              className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors shrink-0"
              data-testid="back-to-mc"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden md:inline">Mission Control</span>
            </button>
            <div className="h-5 w-px bg-gray-200 hidden md:block" />
            <div className="min-w-0">
              <h1 className="font-semibold text-gray-900 text-sm sm:text-base leading-tight truncate" data-testid="pod-athlete-name">
                {athlete?.full_name}
              </h1>
              <p className="text-[11px] sm:text-xs text-gray-500 truncate">
                {athlete?.grad_year} · {athlete?.position} · {athlete?.team}
              </p>
            </div>
          </div>

          {/* Right: actions */}
          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
            <button
              onClick={onManualRefresh}
              disabled={isPolling}
              className="p-1.5 rounded-full hover:bg-gray-100 transition-colors disabled:opacity-50"
              title="Refresh now"
              data-testid="manual-refresh-btn"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-gray-400 ${isPolling ? "animate-spin" : ""}`} />
            </button>

            {athleteId && (
              <button
                onClick={() => navigate(`/internal/athlete/${athleteId}/profile`)}
                className="flex items-center gap-1.5 px-2 sm:px-3 py-1.5 text-xs font-medium text-teal-600 bg-teal-50 hover:bg-teal-100 rounded-full transition-colors"
                data-testid="pod-view-profile-btn"
              >
                <User className="w-3.5 h-3.5" />
                <span className="hidden md:inline">View Profile</span>
              </button>
            )}

            <div className={`flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full ${health.bg}`} data-testid="pod-health-badge">
              <div className={`w-2 h-2 rounded-full ${health.dot}`} />
              <Activity className={`w-3.5 h-3.5 ${health.text} hidden sm:block`} />
              <span className={`text-xs font-medium ${health.text} hidden md:inline`}>{health.label}</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

export default PodHeader;

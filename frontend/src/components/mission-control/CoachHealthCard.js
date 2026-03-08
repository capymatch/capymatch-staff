import { useNavigate } from "react-router-dom";
import { Users, Eye, Bell, ArrowRightLeft } from "lucide-react";

const STATUS_CONFIG = {
  active: { label: "Active", dot: "bg-emerald-500", bg: "bg-emerald-50", text: "text-emerald-700" },
  activating: { label: "Activating", dot: "bg-yellow-400", bg: "bg-yellow-50", text: "text-yellow-700" },
  needs_support: { label: "Needs Support", dot: "bg-orange-500", bg: "bg-orange-50", text: "text-orange-700" },
  inactive: { label: "Inactive", dot: "bg-red-500", bg: "bg-red-50", text: "text-red-700" },
};

const WORKLOAD_CONFIG = {
  high: { label: "High workload", color: "text-orange-500", bar: "bg-orange-400", width: "w-full" },
  moderate: { label: "Moderate", color: "text-slate-500", bar: "bg-slate-300", width: "w-2/3" },
  light: { label: "Light", color: "text-emerald-500", bar: "bg-emerald-300", width: "w-1/3" },
};

function ActivitySignal({ daysInactive }) {
  if (daysInactive === 0) {
    return <span className="text-emerald-600 font-medium">Active today</span>;
  }
  if (daysInactive != null && daysInactive > 0) {
    const isStale = daysInactive > 7;
    return (
      <span className={isStale ? "text-red-500 font-medium" : "text-slate-500"}>
        {isStale
          ? `No activity in ${daysInactive} days`
          : `Last activity ${daysInactive} day${daysInactive !== 1 ? "s" : ""} ago`}
      </span>
    );
  }
  return <span className="text-slate-400">No activity yet</span>;
}

function ActionButton({ icon: Icon, label, onClick, testId }) {
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium text-slate-500 bg-slate-50 hover:bg-slate-100 hover:text-slate-700 transition-colors"
      data-testid={testId}
    >
      <Icon className="w-3 h-3" />
      {label}
    </button>
  );
}

export default function CoachHealthCard({ coaches = [] }) {
  const navigate = useNavigate();

  if (!coaches.length) {
    return (
      <section data-testid="coach-health-card">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Coach Health</span>
        </div>
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-8 text-center">
          <Users className="w-5 h-5 text-slate-300 mx-auto mb-2" />
          <p className="text-sm text-slate-400">No coaches in the program yet.</p>
        </div>
      </section>
    );
  }

  const totalAthletes = coaches.reduce((sum, c) => sum + (c.athleteCount || 0), 0);

  return (
    <section data-testid="coach-health-card">
      {/* Section header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Coach Health</span>
        </div>
        <span className="text-xs text-slate-400">
          {coaches.length} coach{coaches.length !== 1 ? "es" : ""} · {totalAthletes} athletes managed
        </span>
      </div>

      {/* Coach cards grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {coaches.map((coach) => {
          const status = STATUS_CONFIG[coach.status] || STATUS_CONFIG.activating;
          const workload = WORKLOAD_CONFIG[coach.workload] || WORKLOAD_CONFIG.moderate;

          return (
            <div
              key={coach.id}
              data-testid={`coach-health-${coach.id}`}
              className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden flex flex-col"
            >
              {/* Card body */}
              <div className="px-5 pt-5 pb-4 flex-1">
                {/* Name + status */}
                <div className="flex items-start justify-between mb-3">
                  <p className="text-sm font-semibold text-slate-900">{coach.name}</p>
                  <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-bold shrink-0 ${status.bg} ${status.text}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
                    {status.label}
                  </span>
                </div>

                {/* Athletes assigned */}
                <div className="mb-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-slate-500">
                      {coach.athleteCount} athlete{coach.athleteCount !== 1 ? "s" : ""} assigned
                    </span>
                    <span className={`text-[10px] font-medium ${workload.color}`}>{workload.label}</span>
                  </div>
                  {/* Workload bar */}
                  <div className="h-1 rounded-full bg-slate-100 overflow-hidden">
                    <div className={`h-full rounded-full ${workload.bar} ${workload.width} transition-all`} />
                  </div>
                </div>

                {/* Last activity */}
                <p className="text-xs">
                  <ActivitySignal daysInactive={coach.daysInactive} />
                </p>
              </div>

              {/* Action buttons */}
              <div className="px-5 py-3 border-t border-slate-50 flex items-center gap-2 bg-slate-50/30">
                <ActionButton
                  icon={Eye}
                  label="View Roster"
                  onClick={() => navigate("/roster")}
                  testId={`coach-view-roster-${coach.id}`}
                />
                <ActionButton
                  icon={Bell}
                  label="Send Nudge"
                  onClick={() => navigate("/roster")}
                  testId={`coach-send-nudge-${coach.id}`}
                />
                <ActionButton
                  icon={ArrowRightLeft}
                  label="Reassign"
                  onClick={() => navigate("/roster")}
                  testId={`coach-reassign-${coach.id}`}
                />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

import { useNavigate } from "react-router-dom";
import { Users, ChevronRight } from "lucide-react";

const STATUS_STYLES = {
  active: { label: "Active", dot: "bg-emerald-500", text: "text-emerald-600" },
  activating: { label: "Activating", dot: "bg-blue-400", text: "text-blue-600" },
  inactive: { label: "Inactive", dot: "bg-red-500", text: "text-red-600" },
  needs_support: { label: "Needs Support", dot: "bg-amber-500", text: "text-amber-600" },
};

export default function CoachHealthCard({ coaches = [] }) {
  const navigate = useNavigate();

  if (!coaches.length) {
    return (
      <section data-testid="coach-health-card">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Coach Health</span>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-8 text-center">
          <Users className="w-5 h-5 text-slate-300 mx-auto mb-2" />
          <p className="text-sm text-slate-400">No coaches in the program yet.</p>
        </div>
      </section>
    );
  }

  return (
    <section data-testid="coach-health-card">
      <div className="flex items-center justify-between mb-4">
        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Coach Health</span>
        <button
          onClick={() => navigate("/roster")}
          className="text-[11px] text-slate-400 hover:text-slate-600 font-medium"
          data-testid="view-roster-link"
        >
          View roster
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden divide-y divide-gray-50">
        {coaches.map((coach) => {
          const style = STATUS_STYLES[coach.status] || STATUS_STYLES.activating;

          return (
            <div
              key={coach.id}
              data-testid={`coach-health-${coach.id}`}
              className="flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50/60 transition-colors group"
            >
              {/* Status dot */}
              <span className={`w-2 h-2 rounded-full shrink-0 ${style.dot}`} />

              {/* Name + status */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-slate-700">{coach.name}</span>
                  <span className={`text-[11px] font-semibold ${style.text}`}>{style.label}</span>
                </div>
              </div>

              {/* Meta */}
              <div className="flex items-center gap-4 text-[11px] text-slate-400 shrink-0">
                {coach.athleteCount > 0 && (
                  <span>{coach.athleteCount} athletes</span>
                )}
                {coach.daysInactive != null && coach.daysInactive > 0 && (
                  <span className={coach.daysInactive > 7 ? "text-red-400" : ""}>
                    {coach.daysInactive === 1 ? "1 day ago" : `${coach.daysInactive} days ago`}
                  </span>
                )}
                {coach.daysInactive === 0 && (
                  <span className="text-emerald-400">Active today</span>
                )}
                {coach.daysInactive == null && (
                  <span className="text-slate-300">No activity</span>
                )}
              </div>

              <ChevronRight className="w-4 h-4 text-slate-200 group-hover:text-slate-400 transition-colors shrink-0" />
            </div>
          );
        })}
      </div>
    </section>
  );
}

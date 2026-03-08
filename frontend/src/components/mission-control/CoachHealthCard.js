import { useNavigate } from "react-router-dom";
import { Users, ChevronRight } from "lucide-react";

const STATUS_STYLES = {
  active: { label: "Active", dot: "bg-emerald-500", bg: "bg-emerald-50", text: "text-emerald-700" },
  activating: { label: "Activating", dot: "bg-amber-400", bg: "bg-amber-50", text: "text-amber-700" },
  inactive: { label: "Inactive", dot: "bg-red-500", bg: "bg-red-50", text: "text-red-700" },
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

      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px bg-gray-100">
          {coaches.map((coach) => {
            const style = STATUS_STYLES[coach.status] || STATUS_STYLES.activating;

            return (
              <div
                key={coach.id}
                data-testid={`coach-health-${coach.id}`}
                className="bg-white px-5 py-4 hover:bg-slate-50/60 transition-colors cursor-pointer group"
                onClick={() => navigate("/roster")}
              >
                {/* Name */}
                <p className="text-sm font-semibold text-slate-800 mb-2 group-hover:text-slate-900 transition-colors">
                  {coach.name}
                </p>

                {/* Status badge */}
                <div className="flex items-center gap-2 mb-2">
                  <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-bold ${style.bg} ${style.text}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
                    {style.label}
                  </span>
                </div>

                {/* Meta */}
                <p className="text-[12px] text-slate-400">
                  {coach.athleteCount} athlete{coach.athleteCount !== 1 ? "s" : ""} assigned
                  {coach.daysInactive != null && coach.daysInactive > 0 && (
                    <span className={coach.daysInactive > 7 ? " text-red-400" : ""}>
                      {" "}· Last active {coach.daysInactive}d ago
                    </span>
                  )}
                  {coach.daysInactive === 0 && (
                    <span className="text-emerald-500"> · Active today</span>
                  )}
                  {coach.daysInactive == null && (
                    <span className="text-slate-300"> · No activity yet</span>
                  )}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

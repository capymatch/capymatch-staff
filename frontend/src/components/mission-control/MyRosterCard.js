import { useNavigate } from "react-router-dom";
import { TrendingUp, TrendingDown, Minus, ChevronRight, Zap, ShieldAlert, Clock, AlertTriangle, Users, Target } from "lucide-react";
import QuickNote from "@/components/QuickNote";

const CATEGORY_CONFIG = {
  momentum_drop: { icon: Zap, label: "Momentum" },
  blocker: { icon: ShieldAlert, label: "Blocker" },
  deadline_proximity: { icon: Clock, label: "Deadline" },
  engagement_drop: { icon: AlertTriangle, label: "Engagement" },
  ownership_gap: { icon: Users, label: "Unassigned" },
  readiness_issue: { icon: Target, label: "Readiness" },
};

const HEALTH_DOT = {
  green: "bg-emerald-500",
  yellow: "bg-amber-400",
  red: "bg-red-500",
};

function MomentumIndicator({ score, trend }) {
  if (trend === "rising") {
    return (
      <span className="inline-flex items-center gap-0.5 text-emerald-600 text-xs font-semibold">
        <TrendingUp className="w-3 h-3" />+{score}
      </span>
    );
  }
  if (trend === "declining") {
    return (
      <span className="inline-flex items-center gap-0.5 text-red-600 text-xs font-semibold">
        <TrendingDown className="w-3 h-3" />{score}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-0.5 text-slate-400 text-xs font-semibold">
      <Minus className="w-3 h-3" />{score}
    </span>
  );
}

export default function MyRosterCard({ athletes = [] }) {
  const navigate = useNavigate();

  if (!athletes.length) {
    return (
      <section data-testid="my-roster-card">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">My Roster</span>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-8 text-center">
          <Users className="w-5 h-5 text-slate-300 mx-auto mb-2" />
          <p className="text-sm text-slate-400">No athletes assigned yet.</p>
        </div>
      </section>
    );
  }

  // Split: athletes needing action vs healthy
  const needsAction = athletes.filter((a) => a.category);
  const onTrack = athletes.filter((a) => !a.category);

  return (
    <section data-testid="my-roster-card">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">My Roster</span>
          <span className="text-[11px] text-slate-300 font-medium">{athletes.length} athletes</span>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        {/* Athletes needing action first */}
        {needsAction.map((athlete, idx) => {
          const cat = CATEGORY_CONFIG[athlete.category];
          const CatIcon = cat?.icon || AlertTriangle;
          const colorClass = athlete.badgeColor === "red" ? "text-red-600 bg-red-50" :
            athlete.badgeColor === "amber" ? "text-amber-600 bg-amber-50" : "text-blue-600 bg-blue-50";

          return (
            <div
              key={athlete.id}
              data-testid={`roster-athlete-${athlete.id}`}
              className={`flex items-center gap-4 px-5 py-4 cursor-pointer hover:bg-slate-50/60 transition-colors group ${
                idx < needsAction.length + onTrack.length - 1 ? "border-b border-gray-50" : ""
              }`}
              onClick={() => navigate(`/support-pods/${athlete.id}`)}
            >
              {/* Momentum */}
              <div className="w-10 shrink-0 text-center">
                <MomentumIndicator score={athlete.momentum_score} trend={athlete.momentum_trend} />
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-sm font-semibold text-slate-800 group-hover:text-primary transition-colors">
                    {athlete.name}
                  </span>
                  <span className="text-[11px] text-slate-400">{athlete.grad_year} · {athlete.position}</span>
                  <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${colorClass}`}>
                    <CatIcon className="w-2.5 h-2.5" />
                    {cat?.label}
                  </span>
                </div>
                {athlete.why && (
                  <p className="text-xs text-slate-500 truncate">{athlete.why}</p>
                )}
              </div>

              {/* Right side */}
              <div className="flex items-center gap-3 shrink-0">
                {athlete.podHealth && (
                  <span className={`w-2 h-2 rounded-full ${HEALTH_DOT[athlete.podHealth.status] || HEALTH_DOT.green}`}
                    title={athlete.podHealth.label}
                  />
                )}
                <QuickNote athleteId={athlete.id} athleteName={athlete.name} compact />
                <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 transition-colors" />
              </div>
            </div>
          );
        })}

        {/* On-track athletes */}
        {onTrack.map((athlete, idx) => (
          <div
            key={athlete.id}
            data-testid={`roster-athlete-${athlete.id}`}
            className={`flex items-center gap-4 px-5 py-3.5 cursor-pointer hover:bg-slate-50/60 transition-colors group ${
              idx < onTrack.length - 1 ? "border-b border-gray-50" : ""
            }`}
            onClick={() => navigate(`/support-pods/${athlete.id}`)}
          >
            <div className="w-10 shrink-0 text-center">
              <MomentumIndicator score={athlete.momentum_score} trend={athlete.momentum_trend} />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-slate-700 group-hover:text-primary transition-colors">
                  {athlete.name}
                </span>
                <span className="text-[11px] text-slate-400">{athlete.grad_year} · {athlete.position}</span>
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              {athlete.podHealth && (
                <span className={`w-2 h-2 rounded-full ${HEALTH_DOT[athlete.podHealth.status] || HEALTH_DOT.green}`}
                  title={athlete.podHealth.label}
                />
              )}
              <QuickNote athleteId={athlete.id} athleteName={athlete.name} compact />
              <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 transition-colors" />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

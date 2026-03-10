import { TrendingUp, TrendingDown, Minus, Calendar, Target, ShieldAlert } from "lucide-react";

const STAGE_LABELS = {
  exploring: { label: "Exploring", color: "bg-gray-100 text-gray-700" },
  actively_recruiting: { label: "Active", color: "bg-blue-100 text-blue-700" },
  narrowing: { label: "Narrowing", color: "bg-purple-100 text-purple-700" },
};

function AthleteSnapshot({ athlete, interventions, events }) {
  if (!athlete) return null;

  const stage = STAGE_LABELS[athlete.recruiting_stage] || STAGE_LABELS.exploring;
  const blockerCount = (interventions || []).filter((i) => i.category === "blocker").length;
  const readinessIssue = (interventions || []).find((i) => i.category === "readiness_issue");

  const MomentumIcon = athlete.momentum_trend === "rising" ? TrendingUp : athlete.momentum_trend === "declining" ? TrendingDown : Minus;
  const momentumColor = athlete.momentum_trend === "rising" ? "text-emerald-600" : athlete.momentum_trend === "declining" ? "text-red-600" : "text-gray-500";

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm" data-testid="athlete-snapshot">
      <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Athlete Snapshot</h3>

      <div className="grid grid-cols-2 gap-4">
        {/* Momentum */}
        <div>
          <p className="text-[11px] text-gray-400 uppercase tracking-wider mb-1">Momentum</p>
          <div className="flex items-center gap-1.5">
            <MomentumIcon className={`w-4 h-4 ${momentumColor}`} />
            <span className={`text-lg font-bold ${momentumColor}`} data-testid="snapshot-momentum">{athlete.momentum_score}</span>
            <span className="text-xs text-gray-500">{athlete.momentum_trend}</span>
          </div>
        </div>

        {/* Stage */}
        <div>
          <p className="text-[11px] text-gray-400 uppercase tracking-wider mb-1">Stage</p>
          <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${stage.color}`} data-testid="snapshot-stage">
            {stage.label}
          </span>
        </div>

        {/* Target Schools */}
        <div>
          <p className="text-[11px] text-gray-400 uppercase tracking-wider mb-1">Target Schools</p>
          <div className="flex items-center gap-1.5">
            <Target className="w-3.5 h-3.5 text-gray-400" />
            <span className="text-sm font-semibold text-gray-800" data-testid="snapshot-targets">{athlete.school_targets} schools</span>
          </div>
          <p className="text-xs text-gray-500">{athlete.active_interest} responding</p>
        </div>

        {/* Blockers */}
        <div>
          <p className="text-[11px] text-gray-400 uppercase tracking-wider mb-1">Blockers</p>
          {blockerCount > 0 ? (
            <div className="flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5 text-red-500" />
              <span className="text-sm font-semibold text-red-700">{blockerCount} active</span>
            </div>
          ) : (
            <span className="text-sm text-gray-500">None</span>
          )}
        </div>
      </div>

      {/* Readiness */}
      {readinessIssue && (
        <div className="mt-3 p-2.5 rounded-lg bg-purple-50 border border-purple-100">
          <p className="text-xs font-medium text-purple-700">{readinessIssue.why_this_surfaced}</p>
        </div>
      )}

      {/* Upcoming events */}
      {events && events.length > 0 && (
        <div className="mt-4 pt-3 border-t border-gray-100">
          <p className="text-[11px] text-gray-400 uppercase tracking-wider mb-2">Upcoming</p>
          <div className="space-y-1.5">
            {events.map((e) => (
              <div key={e.id} className="flex items-center gap-2 text-sm">
                <Calendar className="w-3.5 h-3.5 text-gray-400" />
                <span className="text-gray-700">{e.name}</span>
                <span className="text-xs text-gray-400">({e.daysAway}d)</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Last activity */}
      <p className="mt-3 text-xs text-gray-400">
        Last activity: <span className="text-gray-600 font-medium">{athlete.days_since_activity === 0 ? "Today" : `${athlete.days_since_activity} days ago`}</span>
      </p>
    </div>
  );
}

export default AthleteSnapshot;

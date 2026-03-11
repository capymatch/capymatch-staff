import { TrendingUp, TrendingDown, Minus, Calendar, Target, ShieldAlert, Activity, Mail } from "lucide-react";

const STAGE_LABELS = {
  exploring: { label: "Exploring", color: "bg-gray-100 text-gray-700" },
  actively_recruiting: { label: "Active", color: "bg-blue-100 text-blue-700" },
  narrowing: { label: "Narrowing", color: "bg-purple-100 text-purple-700" },
};

function HealthBar({ value, max = 100, color = "#10b981" }) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div className="w-full h-1.5 rounded-full" style={{ backgroundColor: "var(--cm-surface-2)" }}>
      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
    </div>
  );
}

function AthleteSnapshot({ athlete, interventions, events }) {
  if (!athlete) return null;

  const stage = STAGE_LABELS[athlete.recruiting_stage] || STAGE_LABELS.exploring;
  const blockerCount = (interventions || []).filter(i => i.category === "blocker").length;
  const readinessIssue = (interventions || []).find(i => i.category === "readiness_issue");

  const MomentumIcon = athlete.momentum_trend === "rising" ? TrendingUp : athlete.momentum_trend === "declining" ? TrendingDown : Minus;
  const momentumColor = athlete.momentum_trend === "rising" ? "#10b981" : athlete.momentum_trend === "declining" ? "#ef4444" : "#6b7280";

  // Pipeline health: derive from available data
  const respondingPct = athlete.school_targets > 0 ? Math.round((athlete.active_interest / athlete.school_targets) * 100) : 0;
  const engagementColor = respondingPct >= 40 ? "#10b981" : respondingPct >= 20 ? "#f59e0b" : "#ef4444";
  const engagementLabel = respondingPct >= 40 ? "Healthy" : respondingPct >= 20 ? "Needs attention" : "Low engagement";

  return (
    <div className="rounded-xl border p-5" style={{ backgroundColor: "var(--cm-surface)", borderColor: "var(--cm-border)" }} data-testid="athlete-snapshot">
      <h3 className="text-[11px] font-bold uppercase tracking-widest mb-4" style={{ color: "var(--cm-text-3)" }}>Athlete Snapshot</h3>

      <div className="grid grid-cols-2 gap-4 mb-4">
        {/* Momentum */}
        <div>
          <p className="text-[10px] uppercase tracking-wider mb-1.5 font-semibold" style={{ color: "var(--cm-text-3)" }}>Momentum</p>
          <div className="flex items-center gap-1.5 mb-1">
            <MomentumIcon className="w-4 h-4" style={{ color: momentumColor }} />
            <span className="text-xl font-bold" style={{ color: momentumColor }} data-testid="snapshot-momentum">{athlete.momentum_score}</span>
          </div>
          <HealthBar value={athlete.momentum_score} color={momentumColor} />
          <p className="text-[10px] mt-1 capitalize" style={{ color: "var(--cm-text-3)" }}>{athlete.momentum_trend}</p>
        </div>

        {/* Stage */}
        <div>
          <p className="text-[10px] uppercase tracking-wider mb-1.5 font-semibold" style={{ color: "var(--cm-text-3)" }}>Stage</p>
          <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${stage.color}`} data-testid="snapshot-stage">
            {stage.label}
          </span>
          <p className="text-[10px] mt-2" style={{ color: "var(--cm-text-3)" }}>
            Last active: <span className="font-medium" style={{ color: "var(--cm-text-2)" }}>
              {athlete.days_since_activity === 0 ? "Today" : `${athlete.days_since_activity}d ago`}
            </span>
          </p>
        </div>

        {/* Pipeline Health */}
        <div>
          <p className="text-[10px] uppercase tracking-wider mb-1.5 font-semibold" style={{ color: "var(--cm-text-3)" }}>Pipeline Health</p>
          <div className="flex items-center gap-1.5 mb-1">
            <Activity className="w-3.5 h-3.5" style={{ color: engagementColor }} />
            <span className="text-sm font-semibold" style={{ color: engagementColor }} data-testid="snapshot-pipeline-health">
              {respondingPct}% responding
            </span>
          </div>
          <HealthBar value={respondingPct} color={engagementColor} />
          <p className="text-[10px] mt-1" style={{ color: engagementColor }}>{engagementLabel}</p>
        </div>

        {/* Target Schools */}
        <div>
          <p className="text-[10px] uppercase tracking-wider mb-1.5 font-semibold" style={{ color: "var(--cm-text-3)" }}>Target Schools</p>
          <div className="flex items-center gap-1.5">
            <Target className="w-3.5 h-3.5" style={{ color: "var(--cm-text-3)" }} />
            <span className="text-sm font-semibold" style={{ color: "var(--cm-text)" }} data-testid="snapshot-targets">{athlete.school_targets}</span>
          </div>
          <div className="flex items-center gap-1.5 mt-1">
            <Mail className="w-3 h-3" style={{ color: "var(--cm-text-3)" }} />
            <span className="text-xs" style={{ color: "var(--cm-text-2)" }}>{athlete.active_interest} responding</span>
          </div>
        </div>
      </div>

      {/* Blockers */}
      {blockerCount > 0 && (
        <div className="rounded-lg p-3 mb-3" style={{ backgroundColor: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.15)" }}>
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-red-500" />
            <span className="text-sm font-semibold text-red-700">{blockerCount} active blocker{blockerCount > 1 ? "s" : ""}</span>
          </div>
        </div>
      )}

      {/* Readiness */}
      {readinessIssue && (
        <div className="rounded-lg p-3 mb-3" style={{ backgroundColor: "rgba(139,92,246,0.06)", border: "1px solid rgba(139,92,246,0.15)" }}>
          <p className="text-xs font-medium text-purple-700">{readinessIssue.why_this_surfaced}</p>
        </div>
      )}

      {/* Upcoming events */}
      {events && events.length > 0 && (
        <div className="pt-3 mt-3" style={{ borderTop: "1px solid var(--cm-border)" }}>
          <p className="text-[10px] uppercase tracking-wider mb-2 font-semibold" style={{ color: "var(--cm-text-3)" }}>Upcoming Events</p>
          <div className="space-y-1.5">
            {events.map(e => (
              <div key={e.id} className="flex items-center gap-2 text-sm">
                <Calendar className="w-3.5 h-3.5" style={{ color: "var(--cm-text-3)" }} />
                <span style={{ color: "var(--cm-text-2)" }}>{e.name}</span>
                <span className="text-xs" style={{ color: "var(--cm-text-3)" }}>({e.daysAway}d)</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default AthleteSnapshot;

import { TrendingUp, TrendingDown, Minus, Calendar, Target, ShieldAlert, Activity, Mail, Users, ChevronRight } from "lucide-react";

const STAGE_LABELS = {
  exploring: { label: "Exploring", color: "bg-gray-100 text-gray-700", step: 1 },
  actively_recruiting: { label: "Active", color: "bg-blue-100 text-blue-700", step: 2 },
  narrowing: { label: "Narrowing", color: "bg-purple-100 text-purple-700", step: 3 },
};

const PROGRESS_STEPS = [
  { key: "exploring", label: "Exploring" },
  { key: "actively_recruiting", label: "Contacted" },
  { key: "narrowing", label: "Engaged" },
  { key: "committed", label: "Committed" },
];

function HealthBar({ value, max = 100, color = "#10b981" }) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div className="w-full h-1.5 rounded-full" style={{ backgroundColor: "var(--cm-surface-2, #f1f5f9)" }}>
      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
    </div>
  );
}

function RecruitingProgressBar({ currentStage }) {
  const currentStep = STAGE_LABELS[currentStage]?.step || 1;
  return (
    <div className="flex items-center gap-1 w-full" data-testid="recruiting-progress">
      {PROGRESS_STEPS.map((step, idx) => {
        const isActive = idx < currentStep;
        const isCurrent = idx === currentStep - 1;
        return (
          <div key={step.key} className="flex items-center flex-1">
            <div className="flex flex-col items-center flex-1">
              <div className={`w-full h-1.5 rounded-full ${isActive ? "" : ""}`}
                style={{ backgroundColor: isActive ? "#8b5cf6" : "var(--cm-surface-2, #e2e8f0)" }} />
              <span className={`text-[9px] mt-1 ${isCurrent ? "font-bold" : "font-medium"}`}
                style={{ color: isActive ? "#8b5cf6" : "var(--cm-text-3, #94a3b8)" }}>
                {step.label}
              </span>
            </div>
          </div>
        );
      })}
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

  // Pipeline health
  const respondingPct = athlete.school_targets > 0 ? Math.round((athlete.active_interest / athlete.school_targets) * 100) : 0;
  const engagementColor = respondingPct >= 40 ? "#10b981" : respondingPct >= 20 ? "#f59e0b" : "#ef4444";
  const engagementLabel = respondingPct >= 40 ? "Healthy" : respondingPct >= 20 ? "Needs attention" : "Low engagement";

  // Coach engagement (derived from interest + activity)
  const coachEngaged = athlete.active_interest || 0;
  const coachTotal = athlete.school_targets || 0;
  const coachPct = coachTotal > 0 ? Math.round((coachEngaged / coachTotal) * 100) : 0;
  const coachColor = coachPct >= 40 ? "#10b981" : coachPct >= 20 ? "#f59e0b" : "#ef4444";

  return (
    <div className="rounded-xl border p-5" style={{ backgroundColor: "var(--cm-surface, #fff)", borderColor: "var(--cm-border, #f1f5f9)" }} data-testid="athlete-snapshot">
      <h3 className="text-[11px] font-bold uppercase tracking-widest mb-4" style={{ color: "var(--cm-text-3, #94a3b8)" }}>Athlete Snapshot</h3>

      {/* Recruiting Progress bar */}
      <div className="mb-4 pb-4" style={{ borderBottom: "1px solid var(--cm-border, #f1f5f9)" }}>
        <p className="text-[10px] uppercase tracking-wider mb-2 font-semibold" style={{ color: "var(--cm-text-3, #94a3b8)" }}>Recruiting Progress</p>
        <RecruitingProgressBar currentStage={athlete.recruiting_stage} />
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        {/* Momentum */}
        <div>
          <p className="text-[10px] uppercase tracking-wider mb-1.5 font-semibold" style={{ color: "var(--cm-text-3, #94a3b8)" }}>Momentum</p>
          <div className="flex items-center gap-1.5 mb-1">
            <MomentumIcon className="w-4 h-4" style={{ color: momentumColor }} />
            <span className="text-xl font-bold" style={{ color: momentumColor }} data-testid="snapshot-momentum">{athlete.momentum_score}</span>
          </div>
          <HealthBar value={athlete.momentum_score} color={momentumColor} />
          <p className="text-[10px] mt-1 capitalize" style={{ color: "var(--cm-text-3, #94a3b8)" }}>{athlete.momentum_trend}</p>
        </div>

        {/* Coach Engagement */}
        <div>
          <p className="text-[10px] uppercase tracking-wider mb-1.5 font-semibold" style={{ color: "var(--cm-text-3, #94a3b8)" }}>Coach Engagement</p>
          <div className="flex items-center gap-1.5 mb-1">
            <Users className="w-4 h-4" style={{ color: coachColor }} />
            <span className="text-sm font-semibold" style={{ color: coachColor }} data-testid="snapshot-coach-engagement">
              {coachEngaged}/{coachTotal} engaged
            </span>
          </div>
          <HealthBar value={coachPct} color={coachColor} />
          <p className="text-[10px] mt-1" style={{ color: coachColor }}>{coachPct}% response rate</p>
        </div>

        {/* Pipeline Health */}
        <div>
          <p className="text-[10px] uppercase tracking-wider mb-1.5 font-semibold" style={{ color: "var(--cm-text-3, #94a3b8)" }}>Pipeline Health</p>
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
          <p className="text-[10px] uppercase tracking-wider mb-1.5 font-semibold" style={{ color: "var(--cm-text-3, #94a3b8)" }}>Target Schools</p>
          <div className="flex items-center gap-1.5">
            <Target className="w-3.5 h-3.5" style={{ color: "var(--cm-text-3, #94a3b8)" }} />
            <span className="text-sm font-semibold" style={{ color: "var(--cm-text, #1e293b)" }} data-testid="snapshot-targets">{athlete.school_targets}</span>
          </div>
          <div className="flex items-center gap-1.5 mt-1">
            <Mail className="w-3 h-3" style={{ color: "var(--cm-text-3, #94a3b8)" }} />
            <span className="text-xs" style={{ color: "var(--cm-text-2, #64748b)" }}>{athlete.active_interest} responding</span>
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
        <div className="pt-3 mt-3" style={{ borderTop: "1px solid var(--cm-border, #f1f5f9)" }}>
          <p className="text-[10px] uppercase tracking-wider mb-2 font-semibold" style={{ color: "var(--cm-text-3, #94a3b8)" }}>Upcoming Events</p>
          <div className="space-y-1.5">
            {events.filter(e => e.daysAway > 0).map(e => (
              <div key={e.id || e.name} className="flex items-center gap-2 text-sm">
                <Calendar className="w-3.5 h-3.5" style={{ color: "var(--cm-text-3, #94a3b8)" }} />
                <span style={{ color: "var(--cm-text-2, #64748b)" }}>{e.name}</span>
                <span className="text-xs" style={{ color: "var(--cm-text-3, #94a3b8)" }}>({e.daysAway}d)</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default AthleteSnapshot;

import { TrendingUp, TrendingDown, Minus, FileText, MessageSquare, Zap, ShieldAlert, Clock, AlertTriangle, Users, Target, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";

const CATEGORY_LABELS = {
  momentum_drop: "Momentum Drop",
  blocker: "Blocker",
  deadline_proximity: "Deadline",
  engagement_drop: "Engagement",
  ownership_gap: "Unassigned",
  readiness_issue: "Readiness",
};

const CATEGORY_ICONS = {
  momentum_drop: Zap,
  blocker: ShieldAlert,
  deadline_proximity: Clock,
  engagement_drop: AlertTriangle,
  ownership_gap: Users,
  readiness_issue: Target,
};

const HEALTH_STYLES = {
  green: { dot: "bg-emerald-500", text: "text-emerald-700" },
  yellow: { dot: "bg-amber-400", text: "text-amber-700" },
  red: { dot: "bg-red-500", text: "text-red-700" },
};

function PodHealthDot({ health }) {
  const s = HEALTH_STYLES[health.status] || HEALTH_STYLES.green;
  return (
    <span className={`inline-flex items-center gap-1 ${s.text}`} data-testid="pod-health-dot" title={health.reason}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      <span className="font-medium">{health.label}</span>
    </span>
  );
}

function AthletesNeedingAttention({ athletes, selectedGradYear, onPeek }) {
  if (!athletes || athletes.length === 0) {
    return (
      <section data-testid="athletes-attention-section">
        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.1em]">Monitoring</span>
        <div className="bg-white rounded-lg p-10 mt-3 text-center">
          <TrendingUp className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
          <p className="text-sm text-slate-500">All athletes are on track.</p>
        </div>
      </section>
    );
  }

  const getMomentumBadge = (trend, score) => {
    if (trend === "rising") return <span className="inline-flex items-center gap-0.5 text-emerald-600 text-xs font-semibold"><TrendingUp className="w-3 h-3" />+{score}</span>;
    if (trend === "declining") return <span className="inline-flex items-center gap-0.5 text-red-600 text-xs font-semibold"><TrendingDown className="w-3 h-3" />{score}</span>;
    return <span className="inline-flex items-center gap-0.5 text-slate-500 text-xs font-semibold"><Minus className="w-3 h-3" />{score}</span>;
  };

  const getCategoryBadge = (category, badgeColor) => {
    const colors = {
      red: "text-red-600 bg-red-500/8",
      amber: "text-amber-600 bg-amber-500/8",
      blue: "text-blue-600 bg-blue-500/8",
      gray: "text-slate-500 bg-slate-500/8",
    };
    const Icon = CATEGORY_ICONS[category] || Zap;
    const c = colors[badgeColor] || colors.gray;
    return (
      <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${c}`}>
        <Icon className="w-3 h-3" />
        {CATEGORY_LABELS[category]}
      </span>
    );
  };

  return (
    <section data-testid="athletes-attention-section">
      <div className="flex items-baseline gap-3 mb-4">
        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.1em]">Monitoring</span>
        <span className="text-[11px] text-slate-400">{athletes.length} athletes</span>
      </div>

      <div className="bg-white rounded-lg overflow-hidden divide-y divide-slate-50">
        {athletes.map((athlete, idx) => (
          <div
            key={`${athlete.athlete_id}_${athlete.category}_${idx}`}
            data-testid={`athlete-card-${athlete.athlete_id}`}
            onClick={() => onPeek?.(athlete)}
            className="flex items-start gap-4 px-5 py-4 cursor-pointer hover:bg-slate-50/60 transition-colors group"
          >
            {/* Left: momentum indicator */}
            <div className="pt-0.5 shrink-0">
              {getMomentumBadge(athlete.momentum_trend, athlete.momentum_score)}
            </div>

            {/* Center: main content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-semibold text-slate-800 group-hover:text-primary transition-colors" data-testid="athlete-name">
                  {athlete.athlete_name}
                </span>
                <span className="text-[11px] text-slate-400">{athlete.grad_year} · {athlete.position}</span>
                {getCategoryBadge(athlete.category, athlete.badge_color)}
              </div>

              {/* WHY — prominent */}
              <p className="text-sm text-slate-600 leading-relaxed" data-testid="athlete-issue">
                {athlete.why_this_surfaced}
              </p>
            </div>

            {/* Right: pod health + owner */}
            <div className="shrink-0 text-right space-y-1 pt-0.5">
              {athlete.pod_health && <PodHealthDot health={athlete.pod_health} />}
              <p className="text-[11px] text-slate-400">{athlete.owner}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export default AthletesNeedingAttention;

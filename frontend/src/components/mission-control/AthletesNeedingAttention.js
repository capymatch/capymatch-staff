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
      <section className="space-y-4" data-testid="athletes-attention-section">
        <h2 className="text-xl font-bold tracking-tight">Athletes Needing Attention</h2>
        <div className="bg-white rounded-xl border border-gray-100 p-12 shadow-sm text-center">
          <div className="max-w-md mx-auto">
            <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <TrendingUp className="w-8 h-8 text-emerald-600" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">No athletes need immediate attention</h3>
            <p className="text-sm text-gray-600">
              {selectedGradYear === "all"
                ? "All athletes are looking good! Great work."
                : `All ${selectedGradYear} athletes are on track.`}
            </p>
          </div>
        </div>
      </section>
    );
  }

  const getMomentumBadge = (trend, score) => {
    if (trend === "rising") {
      return (
        <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-100 px-2 py-0.5 rounded-full text-xs font-medium">
          <TrendingUp className="w-3 h-3" />
          <span>+{score}</span>
        </span>
      );
    } else if (trend === "declining") {
      return (
        <span className="inline-flex items-center gap-1 bg-red-50 text-red-700 border border-red-100 px-2 py-0.5 rounded-full text-xs font-medium">
          <TrendingDown className="w-3 h-3" />
          <span>{score}</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 bg-gray-100 text-gray-600 border border-gray-200 px-2 py-0.5 rounded-full text-xs font-medium">
        <Minus className="w-3 h-3" />
        <span>{score}</span>
      </span>
    );
  };

  const getCategoryBadge = (category, badgeColor) => {
    const colors = {
      red: "bg-red-50 text-red-700 border-red-200",
      amber: "bg-amber-50 text-amber-700 border-amber-200",
      blue: "bg-blue-50 text-blue-700 border-blue-200",
      gray: "bg-gray-100 text-gray-600 border-gray-200",
    };
    const Icon = CATEGORY_ICONS[category] || Zap;
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${colors[badgeColor] || colors.gray}`}>
        <Icon className="w-3 h-3" />
        {CATEGORY_LABELS[category] || category}
      </span>
    );
  };

  const getStageBadge = (stage) => {
    const stages = {
      exploring: { label: "Exploring", color: "bg-gray-100 text-gray-700 border-gray-200" },
      actively_recruiting: { label: "Active", color: "bg-blue-100 text-blue-700 border-blue-200" },
      narrowing: { label: "Narrowing", color: "bg-purple-100 text-purple-700 border-purple-200" },
    };
    const s = stages[stage] || stages.exploring;
    return <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${s.color}`}>{s.label}</span>;
  };

  return (
    <section className="space-y-4" data-testid="athletes-attention-section">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold tracking-tight">
          Athletes Needing Attention
          <span className="ml-3 text-sm font-normal text-gray-500">
            {athletes.length} {athletes.length === 1 ? "athlete" : "athletes"}
          </span>
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {athletes.map((athlete, idx) => (
          <div
            key={`${athlete.athlete_id}_${athlete.category}_${idx}`}
            data-testid={`athlete-card-${athlete.athlete_id}`}
            onClick={() => onPeek?.(athlete)}
            className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm hover:shadow-md hover:border-primary/20 transition-all duration-200 cursor-pointer group"
          >
            {/* Header */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 mb-1 group-hover:text-primary transition-colors" data-testid="athlete-name">
                  {athlete.athlete_name}
                </h3>
                <div className="flex items-center gap-1.5 text-xs text-gray-500">
                  <span>{athlete.grad_year}</span>
                  <span>·</span>
                  <span>{athlete.position}</span>
                  <span>·</span>
                  <span>{athlete.team}</span>
                </div>
              </div>
              {getMomentumBadge(athlete.momentum_trend, athlete.momentum_score)}
            </div>

            {/* Intervention reason */}
            <div className="mb-3 p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2 mb-1.5">
                {getCategoryBadge(athlete.category, athlete.badge_color)}
              </div>
              <p className="text-sm text-gray-700 leading-relaxed" data-testid="athlete-issue">
                {athlete.why_this_surfaced}
              </p>
            </div>

            {/* Meta row */}
            <div className="flex items-center gap-2 text-xs text-gray-500 mb-3 flex-wrap">
              {getStageBadge(athlete.recruiting_stage)}
              <span>·</span>
              <span>{athlete.school_targets} schools</span>
              <span>·</span>
              <span>Owner: {athlete.owner}</span>
              {athlete.pod_health && (
                <>
                  <span>·</span>
                  <PodHealthDot health={athlete.pod_health} />
                </>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                className="flex-1 bg-primary hover:bg-primary/90 text-white rounded-full font-medium text-xs"
                data-testid={`athlete-view-pod-${athlete.athlete_id}`}
              >
                View Support Pod
              </Button>
              <Button size="sm" variant="ghost" className="p-2" data-testid={`athlete-log-note-${athlete.athlete_id}`}>
                <FileText className="w-4 h-4" />
              </Button>
              <Button size="sm" variant="ghost" className="p-2" data-testid={`athlete-message-${athlete.athlete_id}`}>
                <MessageSquare className="w-4 h-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export default AthletesNeedingAttention;

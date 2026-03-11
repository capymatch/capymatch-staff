import { useNavigate } from "react-router-dom";
import { TrendingUp, TrendingDown, Minus, ChevronRight, Zap, ShieldAlert, Clock, AlertTriangle, Users, Target } from "lucide-react";
import QuickNote from "@/components/QuickNote";

const CATEGORY_CONFIG = {
  momentum_drop: { icon: Zap, label: "Momentum Drop", color: "#ef4444", bg: "rgba(239,68,68,0.08)" },
  blocker: { icon: ShieldAlert, label: "Blocker", color: "#ef4444", bg: "rgba(239,68,68,0.08)" },
  deadline_proximity: { icon: Clock, label: "Deadline", color: "#f59e0b", bg: "rgba(245,158,11,0.08)" },
  engagement_drop: { icon: AlertTriangle, label: "Engagement Drop", color: "#f59e0b", bg: "rgba(245,158,11,0.08)" },
  ownership_gap: { icon: Users, label: "Unassigned", color: "#3b82f6", bg: "rgba(59,130,246,0.08)" },
  readiness_issue: { icon: Target, label: "Readiness Issue", color: "#8b5cf6", bg: "rgba(139,92,246,0.08)" },
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

function AthleteRow({ athlete, onViewPipeline, isLast }) {
  const navigate = useNavigate();
  const cat = athlete.category ? CATEGORY_CONFIG[athlete.category] : null;
  const CatIcon = cat?.icon || AlertTriangle;
  const hasIssue = !!cat;

  return (
    <div
      data-testid={`roster-athlete-${athlete.id}`}
      className="flex items-start gap-2 sm:gap-4 px-3 sm:px-5 py-3 sm:py-4 cursor-pointer hover:bg-slate-50/60 transition-colors group"
      style={{ borderBottom: isLast ? "none" : "1px solid var(--cm-border)" }}
      onClick={() => navigate(`/support-pods/${athlete.id}`)}
    >
      {/* Momentum */}
      <div className="w-8 sm:w-10 shrink-0 text-center pt-1">
        <MomentumIndicator score={athlete.momentum_score} trend={athlete.momentum_trend} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Row 1: Name + issue type badge */}
        <div className="flex items-center gap-1.5 sm:gap-2 mb-1 flex-wrap">
          <span className="text-xs sm:text-sm font-semibold group-hover:text-primary transition-colors" style={{ color: "var(--cm-text)" }}>
            {athlete.name}
          </span>
          <span className="text-[10px] sm:text-[11px] hidden sm:inline" style={{ color: "var(--cm-text-3)" }}>{athlete.grad_year} · {athlete.position}</span>
          {hasIssue && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] sm:text-[10px] font-bold uppercase tracking-wider"
              style={{ backgroundColor: cat.bg, color: cat.color }}>
              <CatIcon className="w-2.5 h-2.5" />
              <span className="hidden sm:inline">{cat.label}</span>
            </span>
          )}
        </div>

        {/* Row 2: Reason (why) */}
        {athlete.why && (
          <p className="text-[11px] sm:text-xs mb-1 truncate" style={{ color: "var(--cm-text-3)" }}>{athlete.why}</p>
        )}

        {/* Row 3: Next step */}
        {athlete.next_step && hasIssue && (
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--cm-text-3)" }}>Next:</span>
            <span className="text-[11px] sm:text-xs font-medium truncate" style={{ color: "var(--cm-text-2)" }}>{athlete.next_step}</span>
          </div>
        )}
      </div>

      {/* Right: health dot + CTA */}
      <div className="flex items-center gap-2 shrink-0 pt-1">
        {athlete.podHealth && (
          <span className={`w-2 h-2 rounded-full ${HEALTH_DOT[athlete.podHealth.status] || HEALTH_DOT.green}`}
            title={athlete.podHealth.label}
          />
        )}
        <span className="hidden sm:block"><QuickNote athleteId={athlete.id} athleteName={athlete.name} compact /></span>
        <button
          onClick={(e) => { e.stopPropagation(); navigate(`/support-pods/${athlete.id}`); }}
          className="flex items-center gap-1 px-2 sm:px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all sm:opacity-0 sm:group-hover:opacity-100"
          style={{
            backgroundColor: hasIssue ? "rgba(13,148,136,0.1)" : "transparent",
            color: "#0d9488",
            border: "1px solid rgba(13,148,136,0.2)",
          }}
          data-testid={`open-pod-${athlete.id}`}
        >
          <span className="hidden sm:inline">Open Pod</span>
          <ChevronRight className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}

export default function MyRosterCard({ athletes = [], onViewPipeline }) {
  if (!athletes.length) {
    return (
      <section data-testid="my-roster-card">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-[11px] font-bold uppercase tracking-widest" style={{ color: "var(--cm-text-3)" }}>My Roster</span>
        </div>
        <div className="rounded-xl border p-8 text-center" style={{ backgroundColor: "var(--cm-surface)", borderColor: "var(--cm-border)" }}>
          <Users className="w-5 h-5 mx-auto mb-2" style={{ color: "var(--cm-text-3)" }} />
          <p className="text-sm" style={{ color: "var(--cm-text-3)" }}>No athletes assigned yet.</p>
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
        <div className="flex items-center gap-2.5">
          <span className="text-[11px] font-bold uppercase tracking-widest" style={{ color: "var(--cm-text-3)" }}>My Roster</span>
          <span className="text-xs font-medium" style={{ color: "var(--cm-text-3)" }}>
            {athletes.length} athletes
            {needsAction.length > 0 && (
              <span style={{ color: "#f59e0b" }}> · {needsAction.length} need action</span>
            )}
          </span>
        </div>
      </div>

      <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: "var(--cm-surface)", borderColor: "var(--cm-border)" }}>
        {/* Athletes needing action first */}
        {needsAction.map((athlete, idx) => (
          <AthleteRow
            key={athlete.id}
            athlete={athlete}
            onViewPipeline={onViewPipeline}
            isLast={idx === needsAction.length - 1 && onTrack.length === 0}
          />
        ))}

        {/* Separator between groups */}
        {needsAction.length > 0 && onTrack.length > 0 && (
          <div className="px-5 py-2" style={{ backgroundColor: "rgba(16,185,129,0.04)", borderTop: "1px solid var(--cm-border)", borderBottom: "1px solid var(--cm-border)" }}>
            <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "#10b981" }}>
              On Track — {onTrack.length} athlete{onTrack.length !== 1 ? "s" : ""}
            </span>
          </div>
        )}

        {/* On-track athletes — compact */}
        {onTrack.map((athlete, idx) => (
          <AthleteRow
            key={athlete.id}
            athlete={athlete}
            onViewPipeline={onViewPipeline}
            isLast={idx === onTrack.length - 1}
          />
        ))}
      </div>
    </section>
  );
}

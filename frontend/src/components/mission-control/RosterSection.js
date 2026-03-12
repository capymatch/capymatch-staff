import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { TrendingUp, TrendingDown, Minus, ChevronRight, ChevronDown, Zap, ShieldAlert, Clock, AlertTriangle, Users, Target, Calendar } from "lucide-react";
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
  if (trend === "rising") return <span className="inline-flex items-center gap-0.5 text-emerald-600 text-xs font-semibold"><TrendingUp className="w-3 h-3" />+{score}</span>;
  if (trend === "declining") return <span className="inline-flex items-center gap-0.5 text-red-600 text-xs font-semibold"><TrendingDown className="w-3 h-3" />{score}</span>;
  return <span className="inline-flex items-center gap-0.5 text-slate-400 text-xs font-semibold"><Minus className="w-3 h-3" />{score}</span>;
}

function AthleteRow({ athlete, isLast }) {
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
        <div className="flex items-center gap-1.5 sm:gap-2 mb-0.5 flex-wrap">
          <span className="text-xs sm:text-sm font-semibold group-hover:text-primary transition-colors" style={{ color: "var(--cm-text)" }}>
            {athlete.name}
          </span>
          {hasIssue && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] sm:text-[10px] font-bold uppercase tracking-wider"
              style={{ backgroundColor: cat.bg, color: cat.color }}>
              <CatIcon className="w-2.5 h-2.5" />
              {cat.label}
            </span>
          )}
        </div>

        {athlete.why && (
          <p className="text-[11px] sm:text-xs truncate" style={{ color: "var(--cm-text-3)" }}>{athlete.why}</p>
        )}

        {athlete.next_step && hasIssue && (
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--cm-text-3)" }}>Next:</span>
            <span className="text-[11px] sm:text-xs font-medium truncate" style={{ color: "var(--cm-text-2)" }}>{athlete.next_step}</span>
          </div>
        )}
      </div>

      {/* Right side */}
      <div className="flex items-center gap-2 shrink-0 pt-1">
        {athlete.podHealth && (
          <span className={`w-2 h-2 rounded-full ${HEALTH_DOT[athlete.podHealth.status] || HEALTH_DOT.green}`} />
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

export default function RosterSection({ athletes = [], eventPrep = [] }) {
  const [showOnTrack, setShowOnTrack] = useState(false);
  const navigate = useNavigate();

  if (!athletes.length) {
    return (
      <section data-testid="roster-section">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-[11px] font-bold uppercase tracking-widest" style={{ color: "var(--cm-text-3)" }}>
            Athletes Requiring Attention
          </span>
        </div>
        <div className="rounded-xl border p-8 text-center" style={{ backgroundColor: "var(--cm-surface)", borderColor: "var(--cm-border)" }}>
          <Users className="w-5 h-5 mx-auto mb-2" style={{ color: "var(--cm-text-3)" }} />
          <p className="text-sm" style={{ color: "var(--cm-text-3)" }}>No athletes assigned yet.</p>
        </div>
      </section>
    );
  }

  const needsAction = athletes.filter(a => a.category);
  const onTrack = athletes.filter(a => !a.category);

  return (
    <section data-testid="roster-section">
      {/* ── Athletes Requiring Attention ── */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5">
          {needsAction.length > 0 && <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />}
          <span className="text-[11px] font-bold uppercase tracking-widest" style={{ color: "var(--cm-text-3)" }}>
            Athletes Requiring Attention
          </span>
          {needsAction.length > 0 && (
            <span className="text-xs font-medium" style={{ color: "var(--cm-text-3)" }}>
              {needsAction.length}
            </span>
          )}
        </div>
      </div>

      {needsAction.length === 0 ? (
        <div className="rounded-xl border px-6 py-6 text-center mb-6" style={{ backgroundColor: "var(--cm-surface)", borderColor: "var(--cm-border)" }}>
          <div className="w-9 h-9 rounded-full flex items-center justify-center mx-auto mb-2.5" style={{ backgroundColor: "rgba(16,185,129,0.1)" }}>
            <Target className="w-4 h-4" style={{ color: "#10b981" }} />
          </div>
          <p className="text-sm font-medium" style={{ color: "var(--cm-text-2)" }}>All clear</p>
          <p className="text-xs mt-1" style={{ color: "var(--cm-text-3)" }}>No athletes need immediate attention right now.</p>
        </div>
      ) : (
        <div className="rounded-xl border overflow-hidden mb-6" style={{ backgroundColor: "var(--cm-surface)", borderColor: "var(--cm-border)" }}>
          {needsAction.map((athlete, idx) => (
            <AthleteRow key={athlete.id} athlete={athlete} isLast={idx === needsAction.length - 1} />
          ))}
        </div>
      )}

      {/* ── Event Prep ── */}
      {eventPrep.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="w-3.5 h-3.5" style={{ color: "#8b5cf6" }} />
            <span className="text-[11px] font-bold uppercase tracking-widest" style={{ color: "var(--cm-text-3)" }}>
              Events Requiring Prep
            </span>
            <span className="text-xs font-medium" style={{ color: "var(--cm-text-3)" }}>
              {eventPrep.length}
            </span>
          </div>
          <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: "var(--cm-surface)", borderColor: "var(--cm-border)" }}>
            {eventPrep.map((item, idx) => (
              <div
                key={item.event_id || idx}
                className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-slate-50/60 transition-colors group"
                style={{ borderBottom: idx < eventPrep.length - 1 ? "1px solid var(--cm-border)" : "none" }}
                onClick={() => item.cta_path && navigate(item.cta_path)}
                data-testid={`event-prep-${item.event_id || idx}`}
              >
                <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: "rgba(139,92,246,0.08)" }}>
                  <Calendar className="w-4 h-4" style={{ color: "#8b5cf6" }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium group-hover:text-primary transition-colors" style={{ color: "var(--cm-text)" }}>
                    {item.action || item.title}
                  </p>
                  <p className="text-[11px]" style={{ color: "var(--cm-text-3)" }}>{item.reason}</p>
                </div>
                <button
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all sm:opacity-0 sm:group-hover:opacity-100"
                  style={{ backgroundColor: "rgba(139,92,246,0.08)", color: "#8b5cf6", border: "1px solid rgba(139,92,246,0.15)" }}
                >
                  <span className="hidden sm:inline">{item.cta_label || "Prep"}</span>
                  <ChevronRight className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── On Track Athletes ── */}
      {onTrack.length > 0 && (
        <div>
          <button
            onClick={() => setShowOnTrack(o => !o)}
            className="flex items-center gap-2 mb-3 group"
            data-testid="on-track-toggle"
          >
            {showOnTrack
              ? <ChevronDown className="w-3.5 h-3.5 text-slate-300" />
              : <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
            }
            <span className="text-[11px] font-bold uppercase tracking-widest group-hover:text-slate-500 transition-colors" style={{ color: "var(--cm-text-3)" }}>
              On Track Athletes
            </span>
            <span className="text-xs font-medium" style={{ color: "var(--cm-text-3)" }}>
              {onTrack.length}
            </span>
          </button>

          {showOnTrack && (
            <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: "var(--cm-surface)", borderColor: "var(--cm-border)" }}>
              {onTrack.map((athlete, idx) => (
                <AthleteRow key={athlete.id} athlete={athlete} isLast={idx === onTrack.length - 1} />
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}

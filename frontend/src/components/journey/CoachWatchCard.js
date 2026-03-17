import {
  TrendingUp, TrendingDown, Minus, ArrowUpRight,
  Activity, Signal, User, ShieldCheck, ShieldAlert, Shield,
} from "lucide-react";

/* ── Interest level styles ── */
const INTEREST_STYLES = {
  "High":           { color: "#22c55e", bg: "rgba(34,197,94,0.1)",  border: "rgba(34,197,94,0.2)" },
  "Medium":         { color: "#3b82f6", bg: "rgba(59,130,246,0.1)", border: "rgba(59,130,246,0.2)" },
  "Emerging":       { color: "#f59e0b", bg: "rgba(245,158,11,0.1)", border: "rgba(245,158,11,0.2)" },
  "No signals yet": { color: "#94a3b8", bg: "var(--cm-surface-2)",  border: "var(--cm-border)" },
  "Not started":    { color: "#64748b", bg: "var(--cm-surface-2)",  border: "var(--cm-border)" },
};

const TREND_ICON = {
  "Increasing":   { Icon: TrendingUp,   color: "#22c55e" },
  "Stable":       { Icon: Minus,        color: "#94a3b8" },
  "Cooling":      { Icon: TrendingDown, color: "#ef4444" },
  "Reactivated":  { Icon: ArrowUpRight, color: "#3b82f6" },
  "Not started":  { Icon: Activity,     color: "#64748b" },
};

const CONFIDENCE_META = {
  high:   { Icon: ShieldCheck, label: "High confidence", color: "#22c55e", bg: "rgba(34,197,94,0.08)" },
  medium: { Icon: Shield,      label: "Medium confidence", color: "#f59e0b", bg: "rgba(245,158,11,0.08)" },
  low:    { Icon: ShieldAlert, label: "Low confidence", color: "#94a3b8", bg: "rgba(148,163,184,0.08)" },
};

export default function CoachWatchCard({ coachWatch }) {
  const cw = coachWatch || {};
  const interest = cw.interestLevel || "Not started";
  const iStyle = INTEREST_STYLES[interest] || INTEREST_STYLES["Not started"];
  const trend = cw.trend || "Not started";
  const trendMeta = TREND_ICON[trend] || TREND_ICON["Not started"];
  const signals = cw.signals || [];
  const conf = CONFIDENCE_META[cw.confidenceLevel] || CONFIDENCE_META.low;

  return (
    <div className="rounded-xl border px-4 py-3.5" style={{ backgroundColor: "var(--cm-surface)", borderColor: "var(--cm-border)" }} data-testid="coach-watch-card">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <Signal className="w-3 h-3 text-teal-600" />
          <span className="text-[9px] font-extrabold uppercase tracking-[1.5px]" style={{ color: "var(--cm-text-3)" }}>Coach Watch</span>
        </div>
        {typeof cw.score === "number" && (
          <span className="text-[9px] font-bold" style={{ color: "var(--cm-text-3)" }} data-testid="cw-score">Score: {cw.score}</span>
        )}
      </div>

      {/* 1. Headline */}
      {cw.headline && (
        <h3 className="text-[12px] font-bold mb-1.5" style={{ color: "var(--cm-text)" }} data-testid="cw-headline">
          {cw.headline}
        </h3>
      )}

      {/* Interest Level + Trend row */}
      <div className="flex items-center gap-2.5 mb-2.5">
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md"
          style={{ color: iStyle.color, backgroundColor: iStyle.bg, border: `1px solid ${iStyle.border}` }}
          data-testid="cw-interest-level">
          {interest}
        </span>
        <div className="flex items-center gap-1" data-testid="cw-trend">
          <trendMeta.Icon className="w-3 h-3" style={{ color: trendMeta.color }} />
          <span className="text-[9px] font-semibold" style={{ color: trendMeta.color }}>{trend}</span>
        </div>
      </div>

      {/* 2. Summary */}
      {cw.summary && (
        <p className="text-[10.5px] leading-snug mb-1.5" style={{ color: "var(--cm-text-2)" }} data-testid="cw-summary">
          {cw.summary}
        </p>
      )}

      {/* 3. Why line */}
      {cw.whyLine && (
        <p className="text-[9.5px] leading-snug mb-2" style={{ color: "var(--cm-text-3)" }} data-testid="cw-why-line">
          {cw.whyLine}
        </p>
      )}

      {/* 4. Why this matters (persuasion layer) */}
      {cw.whyThisMatters && (
        <p className="text-[9.5px] leading-snug italic mb-2" style={{ color: "var(--cm-text-2)" }} data-testid="cw-why-this-matters">
          {cw.whyThisMatters}
        </p>
      )}

      {/* 5. What Changed — transition explanation (only shown on state change) */}
      {cw.whatChangedCopy && (
        <div className="flex items-start gap-1.5 mb-2.5 px-2.5 py-1.5 rounded-md"
          style={{ backgroundColor: "rgba(13,148,136,0.06)", border: "1px solid rgba(13,148,136,0.12)" }}
          data-testid="cw-what-changed">
          <span className="text-[9px] font-bold flex-shrink-0 mt-px" style={{ color: "#0d9488" }}>What changed:</span>
          <span className="text-[9.5px] leading-snug" style={{ color: "var(--cm-text-2)" }}>{cw.whatChangedCopy}</span>
        </div>
      )}

      {/* 6. Confidence badge */}
      {cw.confidenceLevel && (
        <div className="flex items-center gap-1.5 mb-2.5 px-2 py-1 rounded-md w-fit"
          style={{ backgroundColor: conf.bg }}
          data-testid="cw-confidence">
          <conf.Icon className="w-3 h-3" style={{ color: conf.color }} />
          <span className="text-[9px] font-semibold" style={{ color: conf.color }}>{conf.label}</span>
        </div>
      )}

      {/* 7. Recommended Action */}
      {cw.recommendedAction && (
        <p className="text-[10.5px] font-semibold leading-snug mb-3" style={{ color: "var(--cm-text)" }} data-testid="cw-action">
          {cw.recommendedAction}
        </p>
      )}

      {/* Signals */}
      {signals.length > 0 && (
        <div className="pt-2 space-y-1.5" style={{ borderTop: "1px solid var(--cm-border)" }}>
          <span className="text-[8px] font-bold uppercase tracking-[1px]" style={{ color: "var(--cm-text-3)" }}>Signals</span>
          {signals.slice(0, 3).map((sig, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: sig.strength === "strong" ? "#22c55e" : sig.strength === "negative" ? "#ef4444" : "#f59e0b" }} />
              <span className="text-[9.5px]" style={{ color: "var(--cm-text-2)" }} data-testid={`cw-signal-${i}`}>
                {sig.label}
              </span>
              <span className="text-[8px] font-semibold ml-auto" style={{ color: sig.points > 0 ? "#22c55e" : sig.points < 0 ? "#ef4444" : "var(--cm-text-3)" }}>
                {sig.points > 0 ? `+${sig.points}` : sig.points}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Most Engaged Contact */}
      {cw.mostEngagedContact && (
        <div className="flex items-center gap-1.5 mt-2.5 pt-2" style={{ borderTop: "1px solid var(--cm-border)" }}>
          <User className="w-3 h-3" style={{ color: "var(--cm-text-3)" }} />
          <span className="text-[9px]" style={{ color: "var(--cm-text-3)" }}>
            Primary contact: <span className="font-semibold" style={{ color: "var(--cm-text-2)" }} data-testid="cw-contact">{cw.mostEngagedContact}</span>
          </span>
        </div>
      )}
    </div>
  );
}

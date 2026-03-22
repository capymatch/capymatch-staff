import { useState, useEffect } from "react";
import {
  Zap, Clock, Send, ShieldCheck, Shield, ShieldAlert, Sparkles,
} from "lucide-react";

/* ── State → chip color ── */
const STATE_CHIP = {
  hot_opportunity:       { label: "Hot",         bg: "rgba(239,68,68,0.12)",   text: "#ef4444", border: "rgba(239,68,68,0.25)" },
  active_conversation:   { label: "Active",      bg: "rgba(34,197,94,0.12)",   text: "#22c55e", border: "rgba(34,197,94,0.25)" },
  re_engaged:            { label: "Re-engaged",  bg: "rgba(59,130,246,0.12)",  text: "#3b82f6", border: "rgba(59,130,246,0.25)" },
  emerging_interest:     { label: "Emerging",     bg: "rgba(245,158,11,0.12)",  text: "#f59e0b", border: "rgba(245,158,11,0.25)" },
  cooling:               { label: "Cooling",      bg: "rgba(245,158,11,0.10)",  text: "#d97706", border: "rgba(245,158,11,0.20)" },
  follow_up_window_open: { label: "Follow-up",   bg: "rgba(59,130,246,0.10)",  text: "#3b82f6", border: "rgba(59,130,246,0.20)" },
  waiting_for_signal:    { label: "Waiting",      bg: "rgba(148,163,184,0.10)", text: "#94a3b8", border: "rgba(148,163,184,0.20)" },
  stalled:               { label: "Stalled",      bg: "rgba(100,116,139,0.10)", text: "#64748b", border: "rgba(100,116,139,0.20)" },
  deprioritize:          { label: "Low Priority", bg: "rgba(100,116,139,0.08)", text: "#94a3b8", border: "rgba(100,116,139,0.15)" },
  no_signals:            { label: "No Signals",   bg: "rgba(100,116,139,0.08)", text: "#94a3b8", border: "rgba(100,116,139,0.15)" },
};

const CONFIDENCE_META = {
  high:   { Icon: ShieldCheck, label: "High confidence", color: "#22c55e" },
  medium: { Icon: Shield,      label: "Medium",          color: "#f59e0b" },
  low:    { Icon: ShieldAlert, label: "Low confidence",  color: "#94a3b8" },
};

/* ── Action → icon mapping ── */
function ActionIcon({ text }) {
  const t = (text || "").toLowerCase();
  if (t.includes("follow up") || t.includes("respond") || t.includes("reply"))
    return <Zap className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "#f59e0b" }} />;
  if (t.includes("wait"))
    return <Clock className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "#3b82f6" }} />;
  if (t.includes("send") || t.includes("email"))
    return <Send className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "#22c55e" }} />;
  return <Zap className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "#f59e0b" }} />;
}

/* ── Skeleton shimmer ── */
function Skeleton({ className }) {
  return (
    <div className={`animate-pulse rounded-md ${className}`}
      style={{ backgroundColor: "var(--cm-border)" }} />
  );
}

export default function CoachWatchCardV2({ insight, loading }) {
  const [visible, setVisible] = useState(false);
  const [aiVisible, setAiVisible] = useState(false);

  useEffect(() => {
    if (insight && !loading) {
      const t1 = setTimeout(() => setVisible(true), 50);
      const t2 = setTimeout(() => setAiVisible(true), 200);
      return () => { clearTimeout(t1); clearTimeout(t2); };
    }
    setVisible(false);
    setAiVisible(false);
  }, [insight, loading]);

  const chip = STATE_CHIP[insight?.state] || STATE_CHIP.no_signals;
  const conf = CONFIDENCE_META[insight?.confidence] || CONFIDENCE_META.low;
  const ConfIcon = conf.Icon;

  /* Loading skeleton */
  if (loading) {
    return (
      <div className="rounded-2xl border p-4 space-y-3"
        style={{ backgroundColor: "var(--cm-surface)", borderColor: "var(--cm-border)" }}
        data-testid="coach-watch-v2-skeleton">
        <div className="flex items-center justify-between">
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-4 w-24" />
        </div>
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <div className="pt-2" style={{ borderTop: "1px solid var(--cm-border)" }}>
          <Skeleton className="h-4 w-5/6" />
        </div>
        <Skeleton className="h-3 w-2/3" />
      </div>
    );
  }

  if (!insight) return null;

  return (
    <div
      className="rounded-2xl border p-4 transition-all duration-500"
      style={{
        backgroundColor: "var(--cm-surface)",
        borderColor: "var(--cm-border)",
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(8px)",
      }}
      data-testid="coach-watch-v2"
    >
      {/* Row 1: Status Chip + Confidence */}
      <div className="flex items-center justify-between mb-3">
        <span
          className="text-[11px] font-bold px-2.5 py-1 rounded-full"
          style={{ color: chip.text, backgroundColor: chip.bg, border: `1px solid ${chip.border}` }}
          data-testid="cw2-status-chip"
        >
          {chip.label}
        </span>
        <div className="flex items-center gap-1" style={{ opacity: 0.6 }} data-testid="cw2-confidence">
          <ConfIcon className="w-3 h-3" style={{ color: conf.color }} />
          <span className="text-[11px] font-medium" style={{ color: conf.color }}>{conf.label}</span>
        </div>
      </div>

      {/* Row 2: Headline */}
      <h3 className="text-[16px] font-semibold mb-2" style={{ color: "var(--cm-text)" }} data-testid="cw2-headline">
        {insight.headline}
      </h3>

      {/* Row 3: Recommended Action */}
      <div className="flex items-center gap-2 mb-3" data-testid="cw2-action">
        <ActionIcon text={insight.recommended_action_text} />
        <p className="text-[12px] font-semibold" style={{ color: "var(--cm-text)" }}>
          <span className="font-normal" style={{ color: "var(--cm-text-3)" }}>Recommended: </span>
          {insight.recommended_action_text}
        </p>
      </div>

      {/* Divider */}
      <div className="mb-3" style={{ borderTop: "1px solid var(--cm-border)" }} />

      {/* Row 4: AI Insight */}
      <div
        className="transition-all duration-500"
        style={{
          opacity: aiVisible ? 1 : 0,
          filter: aiVisible ? "blur(0px)" : "blur(4px)",
        }}
        data-testid="cw2-ai-insight"
      >
        <div className="flex items-center gap-1.5 mb-1.5">
          <Sparkles className="w-3 h-3 text-[#1a8a80]" />
          <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "#1a8a80" }}>AI Insight</span>
        </div>
        <p className="text-[11.5px] leading-relaxed mb-2" style={{ color: "var(--cm-text-2)" }}>
          {insight.ai?.insight}
        </p>
      </div>

      {/* Row 5: Why signals */}
      {insight.signals?.length > 0 && (
        <p className="text-[10px]" style={{ color: "var(--cm-text-3)" }} data-testid="cw2-signals">
          <span className="font-semibold">Why: </span>
          {insight.signals.join(" \u2022 ")}
        </p>
      )}
    </div>
  );
}

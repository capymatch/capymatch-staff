import React from "react";
import { Activity, TrendingUp, Clock, AlertCircle, Zap, Sprout, Send } from "lucide-react";

const HEALTH_CONFIG = {
  strong_momentum: { label: "Strong Momentum", bg: "rgba(16,185,129,0.08)", border: "rgba(16,185,129,0.2)", color: "#10b981", Icon: TrendingUp },
  active:          { label: "Active",           bg: "rgba(59,130,246,0.08)", border: "rgba(59,130,246,0.2)", color: "#3b82f6", Icon: Zap },
  needs_follow_up: { label: "Needs Follow-Up",  bg: "rgba(245,158,11,0.08)", border: "rgba(245,158,11,0.2)", color: "#f59e0b", Icon: Clock },
  cooling_off:     { label: "Cooling Off",       bg: "rgba(251,146,60,0.06)", border: "rgba(251,146,60,0.18)", color: "#fb923c", Icon: Activity },
  at_risk:         { label: "At Risk",           bg: "rgba(239,68,68,0.06)",  border: "rgba(239,68,68,0.15)",  color: "#f87171", Icon: AlertCircle },
  still_early:     { label: "Still Early",       bg: "rgba(139,92,246,0.07)", border: "rgba(139,92,246,0.18)", color: "#a78bfa", Icon: Sprout },
  awaiting_reply:  { label: "Awaiting Reply",    bg: "rgba(99,102,241,0.07)", border: "rgba(99,102,241,0.18)", color: "#818cf8", Icon: Send },
};

function getExplanation(metrics) {
  if (!metrics) return null;

  const state = metrics.pipeline_health_state;
  if (state === "still_early") return "No signals yet";
  if (state === "awaiting_reply") return "Waiting for coach response";

  const days = metrics.days_since_last_meaningful_engagement;
  const type = metrics.last_meaningful_engagement_type;

  if (days != null && type) {
    const label = type.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
    if (days === 0) return `${label} today`;
    if (days === 1) return `${label} yesterday`;
    return `${label} ${days}d ago`;
  }

  if (days != null) {
    if (days <= 1) return "Recent meaningful engagement";
    return `No meaningful engagement in ${days}d`;
  }

  return "No meaningful engagement yet";
}

export function PipelineHealthBadge({ metrics, variant = "compact" }) {
  if (!metrics?.pipeline_health_state) return null;

  const cfg = HEALTH_CONFIG[metrics.pipeline_health_state] || HEALTH_CONFIG.at_risk;
  const explanation = getExplanation(metrics);
  const { Icon } = cfg;

  if (variant === "compact") {
    return (
      <div
        data-testid={`health-badge-${metrics.program_id}`}
        style={{ display: "flex", flexDirection: "column", gap: 1, maxWidth: "100%" }}
      >
        <div
          style={{
            display: "flex", alignItems: "center", gap: 4,
            padding: "2px 7px 2px 5px", borderRadius: 6,
            background: cfg.bg, border: `1px solid ${cfg.border}`,
            maxWidth: "fit-content",
          }}
        >
          <Icon style={{ width: 10, height: 10, color: cfg.color, flexShrink: 0 }} />
          <span style={{ fontSize: 9.5, fontWeight: 650, color: cfg.color, whiteSpace: "nowrap" }}>
            {cfg.label}
          </span>
        </div>
        {explanation && (
          <span
            style={{ fontSize: 9, color: "var(--cm-text-3)", paddingLeft: 2, lineHeight: 1.3 }}
            data-testid={`health-explanation-${metrics.program_id}`}
          >
            {explanation}
          </span>
        )}
      </div>
    );
  }

  return (
    <div
      data-testid={`health-badge-${metrics.program_id}`}
      style={{
        display: "flex", alignItems: "center", gap: 6,
        padding: "4px 10px 4px 8px", borderRadius: 8,
        background: cfg.bg, border: `1px solid ${cfg.border}`,
      }}
    >
      <Icon style={{ width: 12, height: 12, color: cfg.color, flexShrink: 0 }} />
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: cfg.color, lineHeight: 1.3 }}>{cfg.label}</div>
        {explanation && (
          <div style={{ fontSize: 9.5, color: cfg.color, opacity: 0.75, lineHeight: 1.3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {explanation}
          </div>
        )}
      </div>
    </div>
  );
}

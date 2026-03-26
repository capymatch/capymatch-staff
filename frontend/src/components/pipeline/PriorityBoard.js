import React from "react";
import { AlertCircle, ChevronRight, Eye } from "lucide-react";

const FONT = '-apple-system, "SF Pro Text", Inter, ui-sans-serif, system-ui, sans-serif';

/* ── Tier config for YOUR NEXT MOVES cards ── */
const TIER_CONFIG = {
  top: {
    badge: "NEEDS YOUR ATTENTION NOW",
    badgeBg: "rgba(239,68,68,0.08)",
    badgeColor: "#dc2626",
    borderColor: "#ef4444",
    Icon: AlertCircle,
    iconBg: "rgba(239,68,68,0.08)",
    iconColor: "#ef4444",
  },
  secondary: {
    badge: "SECONDARY",
    badgeBg: "rgba(245,158,11,0.08)",
    badgeColor: "#d97706",
    borderColor: "#f59e0b",
    Icon: ChevronRight,
    iconBg: "rgba(245,158,11,0.08)",
    iconColor: "#f59e0b",
  },
  watch: {
    badge: "WATCH",
    badgeBg: "rgba(100,116,139,0.08)",
    badgeColor: "#64748b",
    borderColor: "#94a3b8",
    Icon: Eye,
    iconBg: "rgba(100,116,139,0.08)",
    iconColor: "#94a3b8",
  },
};

/* ── Urgency group definitions ── */
const URGENCY_GROUPS = [
  { key: "top", label: "Needs action now", ranks: ["top"] },
  { key: "secondary", label: "Follow up soon", ranks: ["secondary"] },
  { key: "watch", label: "On track", ranks: ["watch"] },
];

/* ── Single recap-driven move card (ORIGINAL — unchanged) ── */
function RecapMoveCard({ priority, navigate }) {
  const config = TIER_CONFIG[priority.rank] || TIER_CONFIG.watch;
  const { Icon } = config;

  return (
    <div
      data-testid={`next-move-card-${priority.program_id}`}
      onClick={() => navigate && navigate(`/pipeline/${priority.program_id}`)}
      style={{
        background: "#fff",
        border: "1px solid rgba(20,37,68,0.06)",
        borderLeft: `4px solid ${config.borderColor}`,
        borderRadius: 14,
        padding: "18px 20px",
        cursor: "pointer",
        transition: "transform 80ms ease, box-shadow 80ms ease",
      }}
      onMouseEnter={e => {
        e.currentTarget.style.transform = "translateY(-1px)";
        e.currentTarget.style.boxShadow = "0 6px 20px rgba(19,33,58,0.08)";
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = "";
        e.currentTarget.style.boxShadow = "none";
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
        {/* Icon */}
        <div style={{
          width: 36, height: 36, borderRadius: "50%",
          background: config.iconBg,
          display: "flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0, marginTop: 2,
        }}>
          <Icon style={{ width: 16, height: 16, color: config.iconColor }} />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Badge */}
          <span data-testid={`move-badge-${priority.rank}`} style={{
            fontSize: 10, fontWeight: 700, letterSpacing: "0.06em",
            textTransform: "uppercase",
            color: config.badgeColor,
            display: "inline-block", marginBottom: 6,
          }}>
            {config.badge}
          </span>

          {/* Action title */}
          <div data-testid={`move-action-${priority.program_id}`} style={{
            fontSize: 15, fontWeight: 600, color: "#0f172a",
            lineHeight: 1.4, marginBottom: 4,
          }}>
            {priority.action}
          </div>

          {/* Reason */}
          <div data-testid={`move-reason-${priority.program_id}`} style={{
            fontSize: 13, fontWeight: 400, color: "#64748b",
            lineHeight: 1.5,
          }}>
            {priority.reason?.startsWith("\u2192") ? priority.reason : `\u2192 ${priority.reason}`}
          </div>

          {/* Urgency note (top priority only) */}
          {priority.urgency_note && (
            <div data-testid="move-urgency-note" style={{
              fontSize: 12, fontWeight: 400, color: "#94a3b8",
              fontStyle: "italic", marginTop: 8,
            }}>
              {priority.urgency_note}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Main PriorityBoard ── */
export default function PriorityBoard({ items, navigate, heroItemId, recapData }) {
  // Get recap priorities, exclude the hero school
  const priorities = (recapData?.priorities || []).filter(p => p.program_id !== heroItemId);

  // Count schools needing attention (top + secondary ranks)
  const needsAttentionCount = priorities.filter(p => p.rank === "top" || p.rank === "secondary").length;

  // Group by urgency
  const groups = URGENCY_GROUPS.map(group => ({
    ...group,
    items: priorities.filter(p => group.ranks.includes(p.rank)),
  })).filter(g => g.items.length > 0);

  // All on track
  const allOnTrack = items?.every(i => i.tier === "low") && items?.length > 0 && priorities.length === 0;

  if (priorities.length === 0 && !allOnTrack) return null;

  return (
    <div data-testid="priority-board" style={{ marginTop: 8, fontFamily: FONT }}>
      {/* ── Attention summary header ── */}
      {needsAttentionCount > 0 && (
        <div style={{
          display: "flex", alignItems: "center", gap: 8,
          padding: "12px 16px", borderRadius: 12,
          background: "rgba(239,68,68,0.04)", border: "1px solid rgba(239,68,68,0.08)",
          marginBottom: 16,
        }} data-testid="attention-summary">
          <AlertCircle style={{ width: 16, height: 16, color: "#dc2626", flexShrink: 0 }} />
          <span style={{ fontSize: 14, fontWeight: 600, color: "#0f172a" }}>
            {needsAttentionCount} school{needsAttentionCount !== 1 ? "s" : ""} need{needsAttentionCount === 1 ? "s" : ""} attention
          </span>
        </div>
      )}

      {allOnTrack && (
        <div style={{
          display: "flex", alignItems: "center", gap: 10,
          padding: "14px 18px", borderRadius: 12,
          background: "rgba(16,185,129,0.04)", border: "1px solid rgba(16,185,129,0.10)",
          marginBottom: 20,
        }} data-testid="all-on-track-banner">
          <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#10b981", flexShrink: 0 }} />
          <span style={{ fontSize: 14, fontWeight: 500, color: "#1e293b" }}>Everything is on track</span>
          <span style={{ fontSize: 13, fontWeight: 400, color: "#64748b" }}> — no programs need immediate attention</span>
        </div>
      )}

      {/* ── Section divider ── */}
      {priorities.length > 0 && (
        <div style={{
          fontSize: 11, fontWeight: 700, letterSpacing: "0.08em",
          textTransform: "uppercase", color: "#94a3b8",
          marginBottom: 16, paddingBottom: 10,
          borderBottom: "1px solid rgba(20,37,68,0.06)",
        }} data-testid="other-schools-divider">
          Other schools needing attention
        </div>
      )}

      {/* ── Grouped list ── */}
      <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
        {groups.map(group => {
          const groupConfig = TIER_CONFIG[group.key] || TIER_CONFIG.watch;
          return (
            <div key={group.key} data-testid={`urgency-group-${group.key}`}>
              {/* Group header */}
              <div style={{
                display: "flex", alignItems: "center", gap: 8,
                marginBottom: 10, padding: "0 2px",
              }}>
                <groupConfig.Icon style={{ width: 14, height: 14, color: groupConfig.iconColor }} />
                <span style={{
                  fontSize: 12, fontWeight: 700, letterSpacing: "0.04em",
                  textTransform: "uppercase", color: groupConfig.badgeColor,
                }}>
                  {group.label}
                </span>
                <span style={{
                  fontSize: 10, fontWeight: 700,
                  padding: "2px 7px", borderRadius: 6,
                  background: groupConfig.badgeBg, color: groupConfig.badgeColor,
                }}>
                  {group.items.length}
                </span>
              </div>

              {/* Group items — original RecapMoveCard */}
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {group.items.map((p) => (
                  <RecapMoveCard key={p.program_id} priority={p} navigate={navigate} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

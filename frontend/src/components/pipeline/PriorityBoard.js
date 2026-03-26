import React from "react";
import { AlertCircle, Clock, CheckCircle, ChevronRight } from "lucide-react";
import UniversityLogo from "../UniversityLogo";

const FONT = '-apple-system, "SF Pro Text", Inter, ui-sans-serif, system-ui, sans-serif';

/* ── Urgency group config ── */
const URGENCY_GROUPS = [
  {
    key: "high",
    label: "Needs action now",
    filter: (item) => item.tier === "high",
    borderColor: "#ef4444",
    badgeBg: "rgba(239,68,68,0.08)",
    badgeColor: "#dc2626",
    Icon: AlertCircle,
    iconBg: "rgba(239,68,68,0.08)",
    iconColor: "#ef4444",
  },
  {
    key: "medium",
    label: "Follow up soon",
    filter: (item) => item.tier === "medium",
    borderColor: "#f59e0b",
    badgeBg: "rgba(245,158,11,0.08)",
    badgeColor: "#d97706",
    Icon: Clock,
    iconBg: "rgba(245,158,11,0.08)",
    iconColor: "#f59e0b",
  },
  {
    key: "low",
    label: "On track",
    filter: (item) => item.tier === "low",
    borderColor: "#10b981",
    badgeBg: "rgba(16,185,129,0.08)",
    badgeColor: "#059669",
    Icon: CheckCircle,
    iconBg: "rgba(16,185,129,0.08)",
    iconColor: "#10b981",
  },
];

/* ── Single school list item ── */
function SchoolListItem({ item, config, navigate }) {
  const p = item.program;
  const { Icon } = config;

  return (
    <div
      data-testid={`priority-item-${item.programId}`}
      onClick={() => navigate && navigate(`/pipeline/${item.programId}`)}
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
          {/* School name with logo */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            {p && (
              <UniversityLogo
                name={p.university_name}
                domain={p.domain}
                logoUrl={p.logo_url}
                size={20}
                className="rounded-md flex-shrink-0"
              />
            )}
            <span style={{ fontSize: 14, fontWeight: 700, color: "#0f172a", lineHeight: 1.3 }}>
              {p?.university_name || "School"}
            </span>
            {item.timingLabel && (
              <span style={{
                fontSize: 10, fontWeight: 600, color: config.badgeColor,
                background: config.badgeBg, padding: "2px 6px", borderRadius: 6,
                marginLeft: 4, whiteSpace: "nowrap",
              }}>
                {item.timingLabel}
              </span>
            )}
          </div>

          {/* Action */}
          <div data-testid={`item-action-${item.programId}`} style={{
            fontSize: 13, fontWeight: 500, color: "#334155",
            lineHeight: 1.4, marginBottom: 2,
          }}>
            {item.primaryAction}
          </div>

          {/* Reason */}
          <div data-testid={`item-reason-${item.programId}`} style={{
            fontSize: 12, fontWeight: 400, color: "#94a3b8",
            lineHeight: 1.4,
          }}>
            {item.reasonShort || item.reason}
          </div>
        </div>

        {/* Navigate chevron */}
        <ChevronRight style={{ width: 16, height: 16, color: "#cbd5e1", flexShrink: 0, marginTop: 10 }} />
      </div>
    </div>
  );
}

/* ── Main PriorityBoard ── */
export default function PriorityBoard({ items, navigate, heroItemId, recapData }) {
  // Exclude hero school from the list
  const listItems = (items || []).filter(i => i.programId !== heroItemId);

  // Count schools needing attention (high + medium tiers)
  const needsAttentionCount = listItems.filter(i => i.tier === "high" || i.tier === "medium").length;

  // Group items by urgency
  const groups = URGENCY_GROUPS.map(group => ({
    ...group,
    items: listItems.filter(group.filter),
  })).filter(g => g.items.length > 0);

  // All on track
  const allOnTrack = listItems.length > 0 && listItems.every(i => i.tier === "low");

  if (listItems.length === 0) return null;

  return (
    <div data-testid="priority-board" style={{ marginTop: 8, fontFamily: FONT }}>
      {/* ── Header summary ── */}
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
          marginBottom: 16,
        }} data-testid="all-on-track-banner">
          <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#10b981", flexShrink: 0 }} />
          <span style={{ fontSize: 14, fontWeight: 500, color: "#1e293b" }}>All other schools are on track</span>
          <span style={{ fontSize: 13, fontWeight: 400, color: "#64748b" }}> — no additional action needed right now</span>
        </div>
      )}

      {/* ── Section divider ── */}
      {needsAttentionCount > 0 && (
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
        {groups.map(group => (
          <div key={group.key} data-testid={`urgency-group-${group.key}`}>
            {/* Group header */}
            <div style={{
              display: "flex", alignItems: "center", gap: 8,
              marginBottom: 10, padding: "0 2px",
            }}>
              <group.Icon style={{ width: 14, height: 14, color: group.iconColor }} />
              <span style={{
                fontSize: 12, fontWeight: 700, letterSpacing: "0.04em",
                textTransform: "uppercase", color: group.badgeColor,
              }}>
                {group.label}
              </span>
              <span style={{
                fontSize: 10, fontWeight: 700,
                padding: "2px 7px", borderRadius: 6,
                background: group.badgeBg, color: group.badgeColor,
              }}>
                {group.items.length}
              </span>
            </div>

            {/* Group items */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {group.items.map(item => (
                <SchoolListItem
                  key={item.programId}
                  item={item}
                  config={group}
                  navigate={navigate}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

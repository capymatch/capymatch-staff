import React from "react";
import { AlertCircle, ChevronRight, Eye, AlertTriangle } from "lucide-react";

const FONT = '-apple-system, "SF Pro Text", Inter, ui-sans-serif, system-ui, sans-serif';

/* ── Tier config for card badges ── */
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
    badge: "FOLLOW UP",
    badgeBg: "rgba(245,158,11,0.08)",
    badgeColor: "#d97706",
    borderColor: "#f59e0b",
    Icon: ChevronRight,
    iconBg: "rgba(245,158,11,0.08)",
    iconColor: "#f59e0b",
  },
  watch: {
    badge: "ON TRACK",
    badgeBg: "rgba(22,163,74,0.06)",
    badgeColor: "#6b9e7a",
    borderColor: "#b5d4be",
    Icon: Eye,
    iconBg: "rgba(22,163,74,0.06)",
    iconColor: "#7bae8a",
  },
};

/* ── Section definitions ── */
const SECTIONS = [
  {
    key: "top",
    label: "Needs attention now",
    ranks: ["top"],
    headerIcon: AlertCircle,
    headerColor: "#dc2626",
    countBg: "rgba(239,68,68,0.08)",
    wrapBg: "rgba(239,68,68,0.02)",
    wrapBorder: "rgba(239,68,68,0.06)",
    wrapped: true,
  },
  {
    key: "secondary",
    label: "Follow up soon",
    ranks: ["secondary"],
    headerIcon: ChevronRight,
    headerColor: "#d97706",
    countBg: "rgba(245,158,11,0.06)",
    wrapBg: "transparent",
    wrapBorder: "transparent",
    wrapped: false,
  },
  {
    key: "watch",
    label: "On track",
    ranks: ["watch"],
    headerIcon: Eye,
    headerColor: "#6b9e7a",
    countBg: "rgba(22,163,74,0.06)",
    wrapBg: "transparent",
    wrapBorder: "transparent",
    wrapped: false,
  },
];

/* ── Single move card (original styling preserved) ── */
function RecapMoveCard({ priority, navigate, passive }) {
  const config = TIER_CONFIG[priority.rank] || TIER_CONFIG.watch;
  const { Icon } = config;
  const isOnTrack = passive;

  return (
    <div
      data-testid={`next-move-card-${priority.program_id}`}
      onClick={() => navigate && navigate(`/pipeline/${priority.program_id}`)}
      style={{
        background: isOnTrack ? "rgba(22,163,74,0.025)" : "#fff",
        border: `1px solid ${isOnTrack ? "rgba(22,163,74,0.08)" : "rgba(20,37,68,0.06)"}`,
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
        <div style={{
          width: 36, height: 36, borderRadius: "50%",
          background: config.iconBg,
          display: "flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0, marginTop: 2,
        }}>
          <Icon style={{ width: 16, height: 16, color: config.iconColor }} />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <span data-testid={`move-badge-${priority.rank}`} style={{
            fontSize: 10, fontWeight: 700, letterSpacing: "0.06em",
            textTransform: "uppercase",
            color: config.badgeColor,
            display: "inline-block", marginBottom: 6,
          }}>
            {config.badge}
          </span>

          <div data-testid={`move-action-${priority.program_id}`} style={{
            fontSize: 15, fontWeight: 600, color: "#0f172a",
            lineHeight: 1.4, marginBottom: 4,
          }}>
            {priority.action}
          </div>

          <div data-testid={`move-reason-${priority.program_id}`} style={{
            fontSize: 13, fontWeight: 400, color: "#64748b",
            lineHeight: 1.5,
          }}>
            {priority.reason?.startsWith("\u2192") ? priority.reason : `\u2192 ${priority.reason}`}
          </div>

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
  // Recap priorities excluding hero, ordered by urgency
  const RANK_ORDER = { top: 0, secondary: 1, watch: 2 };
  const priorities = (recapData?.priorities || [])
    .filter(p => p.program_id !== heroItemId)
    .sort((a, b) => (RANK_ORDER[a.rank] ?? 9) - (RANK_ORDER[b.rank] ?? 9));

  // Also include attention items not in recap
  const recapIds = new Set(priorities.map(p => p.program_id));
  const extraItems = (items || [])
    .filter(i => i.programId !== heroItemId && !recapIds.has(i.programId))
    .map(i => ({
      program_id: i.programId,
      rank: i.tier === "high" ? "top" : i.tier === "medium" ? "secondary" : "watch",
      action: i.primaryAction || `Follow up with ${i.program?.university_name || "school"}`,
      reason: i.reasonShort || i.reason || "Keep your pipeline moving",
      urgency_note: i.riskContext || null,
    }));

  const allCards = [...priorities, ...extraItems]
    .sort((a, b) => (RANK_ORDER[a.rank] ?? 9) - (RANK_ORDER[b.rank] ?? 9));

  // Promote top 2–3 items to "Needs attention now" (regardless of original rank)
  const IMMEDIATE_COUNT = Math.min(3, Math.max(1, allCards.filter(c => c.rank !== "watch").length));
  const immediateItems = allCards.slice(0, IMMEDIATE_COUNT);
  const remainingItems = allCards.slice(IMMEDIATE_COUNT);

  // Override rank for immediate items to show urgent styling
  const immediateCards = immediateItems.map(c => ({ ...c, rank: "top" }));

  // Split remaining into follow-up and on-track
  const followUpCards = remainingItems.filter(c => c.rank === "top" || c.rank === "secondary");
  const onTrackCards = remainingItems.filter(c => c.rank === "watch");

  // Build section data
  const sectionData = [
    { ...SECTIONS[0], items: immediateCards },
    { ...SECTIONS[1], items: followUpCards },
    { ...SECTIONS[2], items: onTrackCards },
  ].filter(s => s.items.length > 0);

  // Counts for header
  const urgentCount = immediateCards.length;
  const followUpCount = followUpCards.length;
  const totalAttention = urgentCount + followUpCount;
  const allOnTrack = allCards.length > 0 && immediateCards.length === 0 && followUpCards.length === 0;

  if (allCards.length === 0) return null;

  return (
    <div data-testid="priority-board" style={{ marginTop: 4, fontFamily: FONT }}>
      {/* ── Smart header ── */}
      {totalAttention > 0 ? (
        <div style={{
          display: "flex", alignItems: "center", gap: 6,
          marginBottom: 14,
        }} data-testid="attention-header">
          <AlertTriangle style={{ width: 14, height: 14, color: "#d97706", flexShrink: 0 }} />
          <span style={{ fontSize: 13, fontWeight: 600, color: "#0f172a" }}>
            {urgentCount > 0 && (
              <span style={{ color: "#dc2626" }}>{urgentCount} urgent</span>
            )}
            {urgentCount > 0 && followUpCount > 0 && (
              <span style={{ color: "#cbd5e1" }}> · </span>
            )}
            {followUpCount > 0 && (
              <span style={{ color: "#d97706" }}>{followUpCount} need follow-up</span>
            )}
          </span>
        </div>
      ) : allOnTrack ? (
        <div style={{
          display: "flex", alignItems: "center", gap: 8,
          padding: "10px 14px", borderRadius: 10,
          background: "rgba(16,185,129,0.04)", border: "1px solid rgba(16,185,129,0.10)",
          marginBottom: 14,
        }} data-testid="all-on-track-banner">
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#10b981", flexShrink: 0 }} />
          <span style={{ fontSize: 13, fontWeight: 500, color: "#1e293b" }}>All schools on track</span>
          <span style={{ fontSize: 12, fontWeight: 400, color: "#64748b" }}>— no action needed right now</span>
        </div>
      ) : null}

      {/* ── Sections ── */}
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        {sectionData.map(section => {
          const isPassive = section.key === "watch";
          const HeaderIcon = section.headerIcon;

          return (
            <div
              key={section.key}
              data-testid={`urgency-group-${section.key}`}
              style={{
                background: section.wrapBg,
                border: `1px solid ${section.wrapBorder}`,
                borderRadius: section.wrapped ? 14 : 0,
                padding: section.wrapped ? "14px 14px 10px" : 0,
              }}
            >
              {/* Section header */}
              <div style={{
                display: "flex", alignItems: "center", gap: 7,
                marginBottom: 8,
              }}>
                <HeaderIcon style={{ width: 13, height: 13, color: section.headerColor }} />
                <span style={{
                  fontSize: 11, fontWeight: 800, letterSpacing: "0.05em",
                  textTransform: "uppercase", color: section.headerColor,
                }}>
                  {section.label}
                </span>
                <span style={{
                  fontSize: 10, fontWeight: 700,
                  padding: "1px 6px", borderRadius: 5,
                  background: section.countBg, color: section.headerColor,
                }}>
                  {section.items.length}
                </span>
              </div>

              {/* Cards */}
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {section.items.map((p) => (
                  <RecapMoveCard
                    key={p.program_id}
                    priority={p}
                    navigate={navigate}
                    passive={isPassive}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

import React from "react";
import { AlertCircle, ChevronRight, Eye, AlertTriangle } from "lucide-react";

const FONT = 'Inter, -apple-system, "SF Pro Text", ui-sans-serif, system-ui, sans-serif';

/* ── Website palette tokens ── */
const P = {
  bone:       "#f7f3ec",
  boneCard:   "#faf8f5",
  eerie:      "#0b1730",
  textDark:   "#1a1a1a",
  textMid:    "#4a453e",
  textMuted:  "#8a847a",
  ochre:      "#c75000",
  ochreSoft:  "rgba(199,80,0,0.07)",
  ochreBorder:"rgba(199,80,0,0.12)",
  lemon:      "#b08800",
  lemonSoft:  "rgba(176,136,0,0.05)",
  lemonBorder:"rgba(176,136,0,0.10)",
  thistle:    "#5e9470",
  thistleSoft:"rgba(94,148,112,0.045)",
  thistleBorder:"rgba(94,148,112,0.10)",
  borderWarm: "#e7dfd4",
  borderLight:"rgba(231,223,212,0.7)",
  shadowCard: "0 4px 16px rgba(80,60,30,0.04), 0 1px 3px rgba(80,60,30,0.03)",
  shadowHover:"0 8px 28px rgba(80,60,30,0.07), 0 2px 6px rgba(80,60,30,0.04)",
};

/* ── Tier config for card badges ── */
const TIER_CONFIG = {
  top: {
    badge: "NEEDS YOUR ATTENTION NOW",
    badgeColor: P.ochre,
    borderColor: "#d4783a",
    Icon: AlertCircle,
    iconBg: P.ochreSoft,
    iconColor: "#c06830",
    cardBg: P.boneCard,
    cardBorder: P.borderWarm,
  },
  secondary: {
    badge: "FOLLOW UP",
    badgeColor: P.lemon,
    borderColor: "#c9a845",
    Icon: ChevronRight,
    iconBg: P.lemonSoft,
    iconColor: "#a08520",
    cardBg: P.boneCard,
    cardBorder: P.borderWarm,
  },
  watch: {
    badge: "ON TRACK",
    badgeColor: P.thistle,
    borderColor: "#99c4a8",
    Icon: Eye,
    iconBg: P.thistleSoft,
    iconColor: P.thistle,
    cardBg: "rgba(94,148,112,0.025)",
    cardBorder: P.thistleBorder,
  },
};

/* ── Section definitions ── */
const SECTIONS = [
  {
    key: "top",
    label: "Needs attention now",
    ranks: ["top"],
    headerIcon: AlertCircle,
    headerColor: P.ochre,
    countBg: P.ochreSoft,
    wrapBg: P.ochreSoft,
    wrapBorder: P.ochreBorder,
    wrapped: true,
  },
  {
    key: "secondary",
    label: "Follow up soon",
    ranks: ["secondary"],
    headerIcon: ChevronRight,
    headerColor: P.lemon,
    countBg: P.lemonSoft,
    wrapBg: "transparent",
    wrapBorder: "transparent",
    wrapped: false,
  },
  {
    key: "watch",
    label: "On track",
    ranks: ["watch"],
    headerIcon: Eye,
    headerColor: P.thistle,
    countBg: P.thistleSoft,
    wrapBg: "transparent",
    wrapBorder: "transparent",
    wrapped: false,
  },
];

/* ── Single move card ── */
function RecapMoveCard({ priority, navigate, passive }) {
  const config = TIER_CONFIG[priority.rank] || TIER_CONFIG.watch;
  const { Icon } = config;

  return (
    <div
      data-testid={`next-move-card-${priority.program_id}`}
      onClick={() => navigate && navigate(`/pipeline/${priority.program_id}`)}
      style={{
        background: config.cardBg,
        border: `1px solid ${config.cardBorder}`,
        borderLeft: `4px solid ${config.borderColor}`,
        borderRadius: 16,
        padding: "18px 22px",
        cursor: "pointer",
        transition: "transform 100ms ease, box-shadow 100ms ease",
        boxShadow: P.shadowCard,
      }}
      onMouseEnter={e => {
        e.currentTarget.style.transform = "translateY(-2px)";
        e.currentTarget.style.boxShadow = P.shadowHover;
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = "";
        e.currentTarget.style.boxShadow = P.shadowCard;
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10,
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
            fontSize: 15, fontWeight: 650, color: P.textDark,
            lineHeight: 1.4, marginBottom: 4,
            letterSpacing: "-0.01em",
          }}>
            {priority.action}
          </div>

          <div data-testid={`move-reason-${priority.program_id}`} style={{
            fontSize: 13, fontWeight: 400, color: P.textMuted,
            lineHeight: 1.5,
          }}>
            {priority.reason?.startsWith("\u2192") ? priority.reason : `\u2192 ${priority.reason}`}
          </div>

          {priority.urgency_note && (
            <div data-testid="move-urgency-note" style={{
              fontSize: 12, fontWeight: 400, color: P.textMuted,
              fontStyle: "italic", marginTop: 8, opacity: 0.75,
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
  const RANK_ORDER = { top: 0, secondary: 1, watch: 2 };
  const priorities = (recapData?.priorities || [])
    .filter(p => p.program_id !== heroItemId)
    .sort((a, b) => (RANK_ORDER[a.rank] ?? 9) - (RANK_ORDER[b.rank] ?? 9));

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

  const IMMEDIATE_COUNT = Math.min(3, Math.max(1, allCards.filter(c => c.rank !== "watch").length));
  const immediateItems = allCards.slice(0, IMMEDIATE_COUNT);
  const remainingItems = allCards.slice(IMMEDIATE_COUNT);
  const immediateCards = immediateItems.map(c => ({ ...c, rank: "top" }));
  const followUpCards = remainingItems.filter(c => c.rank === "top" || c.rank === "secondary");
  const onTrackCards = remainingItems.filter(c => c.rank === "watch");

  const sectionData = [
    { ...SECTIONS[0], items: immediateCards },
    { ...SECTIONS[1], items: followUpCards },
    { ...SECTIONS[2], items: onTrackCards },
  ].filter(s => s.items.length > 0);

  const urgentCount = immediateCards.length;
  const followUpCount = followUpCards.length;
  const totalAttention = urgentCount + followUpCount;
  const allOnTrack = allCards.length > 0 && immediateCards.length === 0 && followUpCards.length === 0;

  if (allCards.length === 0) return null;

  return (
    <div data-testid="priority-board" style={{ marginTop: 6, fontFamily: FONT }}>
      {/* ── Smart header ── */}
      {totalAttention > 0 ? (
        <div style={{
          display: "flex", alignItems: "center", gap: 7,
          marginBottom: 16,
        }} data-testid="attention-header">
          <AlertTriangle style={{ width: 14, height: 14, color: P.lemon, flexShrink: 0 }} />
          <span style={{ fontSize: 13, fontWeight: 600, color: P.textDark }}>
            {urgentCount > 0 && (
              <span style={{ color: P.ochre }}>{urgentCount} urgent</span>
            )}
            {urgentCount > 0 && followUpCount > 0 && (
              <span style={{ color: P.borderWarm }}> · </span>
            )}
            {followUpCount > 0 && (
              <span style={{ color: P.lemon }}>{followUpCount} need follow-up</span>
            )}
          </span>
        </div>
      ) : allOnTrack ? (
        <div style={{
          display: "flex", alignItems: "center", gap: 8,
          padding: "10px 16px", borderRadius: 12,
          background: P.thistleSoft, border: `1px solid ${P.thistleBorder}`,
          marginBottom: 16,
        }} data-testid="all-on-track-banner">
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: P.thistle, flexShrink: 0 }} />
          <span style={{ fontSize: 13, fontWeight: 500, color: P.textDark }}>All schools on track</span>
          <span style={{ fontSize: 12, fontWeight: 400, color: P.textMuted }}>— no action needed right now</span>
        </div>
      ) : null}

      {/* ── Sections ── */}
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
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
                borderRadius: section.wrapped ? 16 : 0,
                padding: section.wrapped ? "16px 16px 12px" : 0,
              }}
            >
              {/* Section header */}
              <div style={{
                display: "flex", alignItems: "center", gap: 7,
                marginBottom: 10,
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
                  padding: "2px 7px", borderRadius: 6,
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

import React from "react";
import { AlertCircle, ChevronRight, Eye } from "lucide-react";

const FONT = 'Inter, -apple-system, "SF Pro Text", ui-sans-serif, system-ui, sans-serif';

/* ── Palette tokens ── */
const P = {
  bone:       "#f7f3ec",
  boneCard:   "#fbf9f6",
  textDark:   "#1a1a1a",
  textMid:    "#4a453e",
  textMuted:  "#9e978d",
  ochre:      "#c75000",
  ochreSoft:  "rgba(199,80,0,0.035)",
  lemon:      "#b08800",
  lemonSoft:  "rgba(176,136,0,0.03)",
  thistle:    "#5e9470",
  thistleSoft:"rgba(94,148,112,0.02)",
  borderWarm: "#e7dfd4",
  shadowRest: "0 2px 8px rgba(80,60,30,0.03), 0 0.5px 2px rgba(80,60,30,0.02)",
  shadowLift: "0 8px 24px rgba(80,60,30,0.06), 0 1px 4px rgba(80,60,30,0.03)",
};

/* ── Tier config ── */
const TIER_CONFIG = {
  top: {
    badge: "Attention needed",
    badgeColor: "rgba(199,80,0,0.40)",
    borderColor: "rgba(212,120,58,0.50)",
    Icon: AlertCircle,
    iconBg: "rgba(199,80,0,0.04)",
    iconColor: "#c06830",
    cardBg: P.boneCard,
  },
  secondary: {
    badge: "Follow up",
    badgeColor: "rgba(176,136,0,0.40)",
    borderColor: "rgba(201,168,69,0.45)",
    Icon: ChevronRight,
    iconBg: "rgba(176,136,0,0.03)",
    iconColor: "#a08520",
    cardBg: P.boneCard,
  },
  watch: {
    badge: "On track",
    badgeColor: "rgba(94,148,112,0.45)",
    borderColor: "rgba(176,212,187,0.55)",
    Icon: Eye,
    iconBg: "rgba(94,148,112,0.025)",
    iconColor: "#7aaa8c",
    cardBg: "rgba(94,148,112,0.012)",
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
    wrapBg: "transparent",
    wrapped: false,
  },
  {
    key: "secondary",
    label: "Follow up soon",
    ranks: ["secondary"],
    headerIcon: ChevronRight,
    headerColor: P.lemon,
    wrapBg: "transparent",
    wrapped: false,
  },
  {
    key: "watch",
    label: "On track",
    ranks: ["watch"],
    headerIcon: Eye,
    headerColor: P.thistle,
    wrapBg: "transparent",
    wrapped: false,
  },
];

/* ── Single move card ── */
function RecapMoveCard({ priority, navigate, isFirst }) {
  const config = TIER_CONFIG[priority.rank] || TIER_CONFIG.watch;
  const { Icon } = config;
  const isOnTrack = priority.rank === "watch";
  const firstOnTrackLift = isOnTrack && isFirst;

  return (
    <div
      data-testid={`next-move-card-${priority.program_id}`}
      onClick={() => navigate && navigate(`/pipeline/${priority.program_id}`)}
      style={{
        background: config.cardBg,
        borderLeft: `2px solid ${config.borderColor}`,
        borderRadius: 18,
        padding: "24px 24px",
        cursor: "pointer",
        transition: "transform 120ms ease, box-shadow 120ms ease",
        boxShadow: firstOnTrackLift
          ? "0 3px 12px rgba(80,60,30,0.04), 0 0.5px 2px rgba(80,60,30,0.02)"
          : P.shadowRest,
      }}
      onMouseEnter={e => {
        e.currentTarget.style.transform = "translateY(-2px)";
        e.currentTarget.style.boxShadow = P.shadowLift;
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = "";
        e.currentTarget.style.boxShadow = firstOnTrackLift
          ? "0 3px 12px rgba(80,60,30,0.04), 0 0.5px 2px rgba(80,60,30,0.02)"
          : P.shadowRest;
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
        <div style={{
          width: 34, height: 34, borderRadius: 10,
          background: config.iconBg,
          display: "flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0, marginTop: 3,
        }}>
          <Icon style={{ width: 15, height: 15, color: config.iconColor }} />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <span data-testid={`move-badge-${priority.rank}`} style={{
            fontSize: 10, fontWeight: 500, letterSpacing: "0.04em",
            textTransform: "uppercase",
            color: config.badgeColor,
            display: "inline-block", marginBottom: 5,
          }}>
            {config.badge}
          </span>

          <div data-testid={`move-action-${priority.program_id}`} style={{
            fontSize: 15, fontWeight: 700, color: P.textDark,
            lineHeight: 1.35, marginBottom: 5,
            letterSpacing: "-0.015em",
          }}>
            {priority.action}
          </div>

          <div data-testid={`move-reason-${priority.program_id}`} style={{
            fontSize: 13, fontWeight: 400, color: P.textMuted,
            lineHeight: 1.5, opacity: 0.85,
          }}>
            {priority.reason?.startsWith("\u2192") ? priority.reason : `\u2192 ${priority.reason}`}
          </div>

          {priority.urgency_note && (
            <div data-testid="move-urgency-note" style={{
              fontSize: 12, fontWeight: 400, color: P.textMuted,
              fontStyle: "italic", marginTop: 6, opacity: 0.55,
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

  const allOnTrack = allCards.length > 0 && immediateCards.length === 0 && followUpCards.length === 0;

  if (allCards.length === 0) return null;

  return (
    <div data-testid="priority-board" style={{ marginTop: 10, fontFamily: FONT }}>
      {/* ── All-on-track banner (only when no urgent items) ── */}
      {allOnTrack && (
        <div style={{
          display: "flex", alignItems: "center", gap: 8,
          padding: "10px 16px", borderRadius: 12,
          background: P.thistleSoft, marginBottom: 16,
        }} data-testid="all-on-track-banner">
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: P.thistle, flexShrink: 0 }} />
          <span style={{ fontSize: 13, fontWeight: 500, color: P.textDark }}>All schools on track</span>
          <span style={{ fontSize: 12, fontWeight: 400, color: P.textMuted }}>— no action needed right now</span>
        </div>
      )}

      {/* ── Sections ── */}
      <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
        {sectionData.map(section => {
          const HeaderIcon = section.headerIcon;

          return (
            <div key={section.key} data-testid={`urgency-group-${section.key}`}>
              {/* Section header */}
              <div style={{
                display: "flex", alignItems: "center", gap: 7,
                marginBottom: 14,
              }}>
                <HeaderIcon style={{ width: 13, height: 13, color: section.headerColor, opacity: 0.6 }} />
                <span style={{
                  fontSize: 12, fontWeight: 600, letterSpacing: "-0.01em",
                  color: section.headerColor,
                }}>
                  {section.label}
                </span>
                <span style={{
                  fontSize: 12, fontWeight: 400,
                  color: section.headerColor, opacity: 0.4,
                }}>
                  ({section.items.length})
                </span>
              </div>

              {/* Cards */}
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {section.items.map((p, idx) => (
                  <RecapMoveCard
                    key={p.program_id}
                    priority={p}
                    navigate={navigate}
                    isFirst={idx === 0}
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

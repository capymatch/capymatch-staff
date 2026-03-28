import React from "react";
import { AlertCircle, ChevronRight, Eye } from "lucide-react";
import { parseSignals } from "./signal-format";

const FONT = 'Inter, -apple-system, "SF Pro Text", ui-sans-serif, system-ui, sans-serif';

/* ── Palette tokens ── */
const P = {
  bone:       "#f7f3ec",
  boneCard:   "#fbf9f6",
  textDark:   "#1a1a1a",
  textBody:   "#3d3830",
  textSub:    "#6b6358",
  ochre:      "#c75000",
  ochreSoft:  "rgba(199,80,0,0.035)",
  lemon:      "#b08800",
  lemonSoft:  "rgba(176,136,0,0.03)",
  thistle:    "#408a5c",
  thistleSoft:"rgba(64,138,92,0.03)",
  borderWarm: "#e7dfd4",
  shadowRest: "0 2px 8px rgba(80,60,30,0.03), 0 0.5px 2px rgba(80,60,30,0.02)",
  shadowLift: "0 8px 24px rgba(80,60,30,0.06), 0 1px 4px rgba(80,60,30,0.03)",
  shadowHover: "0 10px 30px rgba(80,60,30,0.08), 0 2px 6px rgba(80,60,30,0.04)",
};

/* ── Tier config ── */
const TIER_CONFIG = {
  top: {
    badge: "Attention needed",
    badgeColor: "#b84a00",
    borderColor: "rgba(212,120,58,0.55)",
    Icon: AlertCircle,
    iconBg: "rgba(199,80,0,0.05)",
    iconColor: "#c06830",
    cardBg: P.boneCard,
    cardBorder: "1px solid rgba(212,120,58,0.12)",
  },
  secondary: {
    badge: "Follow up",
    badgeColor: "#957200",
    borderColor: "rgba(201,168,69,0.50)",
    Icon: ChevronRight,
    iconBg: "rgba(176,136,0,0.04)",
    iconColor: "#a08520",
    cardBg: P.boneCard,
    cardBorder: "1px solid rgba(201,168,69,0.10)",
  },
  watch: {
    badge: "On track",
    badgeColor: "#357a4d",
    borderColor: "rgba(100,180,140,0.65)",
    Icon: Eye,
    iconBg: "rgba(64,138,92,0.05)",
    iconColor: "#4a9468",
    cardBg: "rgba(64,138,92,0.025)",
    cardBorder: "1px solid rgba(64,138,92,0.12)",
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
function RecapMoveCard({ priority, navigate, isFirst, cardIndex = 0 }) {
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
        border: config.cardBorder,
        borderLeft: `3px solid ${config.borderColor}`,
        borderRadius: 16,
        padding: "20px 22px",
        cursor: "pointer",
        transition: "transform 120ms ease, box-shadow 120ms ease, border-color 120ms ease",
        boxShadow: firstOnTrackLift
          ? "0 3px 12px rgba(80,60,30,0.04), 0 0.5px 2px rgba(80,60,30,0.02)"
          : P.shadowRest,
      }}
      onMouseEnter={e => {
        e.currentTarget.style.transform = "translateY(-2px)";
        e.currentTarget.style.boxShadow = P.shadowHover;
        e.currentTarget.style.borderColor = config.borderColor;
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = "";
        e.currentTarget.style.boxShadow = firstOnTrackLift
          ? "0 3px 12px rgba(80,60,30,0.04), 0 0.5px 2px rgba(80,60,30,0.02)"
          : P.shadowRest;
        e.currentTarget.style.borderColor = "";
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
            fontSize: 10, fontWeight: 600, letterSpacing: "0.04em",
            textTransform: "uppercase",
            color: config.badgeColor,
            display: "inline-block", marginBottom: 4,
          }}>
            {config.badge}
          </span>

          <div data-testid={`move-action-${priority.program_id}`} style={{
            fontSize: 16, fontWeight: 650, color: P.textDark,
            lineHeight: 1.35, marginBottom: 5,
            letterSpacing: "-0.02em",
          }}>
            {(() => {
              const name = priority.school_name || "";
              const short = name.replace(/^University of /i, "").replace(/\bUniversity\b/gi, "").replace(/\bCollege\b/gi, "").replace(/\bInstitute\b/gi, "").replace(/\bof\s*$/i, "").trim() || name;
              const a = priority.action || "";
              if (/^re-?engage\b/i.test(a)) return `Re-engage ${short} now`;
              if (/^follow up\b/i.test(a)) return `Follow up with ${short}`;
              if (/^maintain contact/i.test(a) || /^monitor\b/i.test(a)) {
                const phrases = [`Maintain momentum with ${short}`, `Stay engaged with ${short}`, `Keep connection warm with ${short}`];
                return phrases[cardIndex % phrases.length];
              }
              if (/^review\b/i.test(a)) return `Follow up with ${short}`;
              if (/^check\b/i.test(a)) return `Follow up with ${short}`;
              if (short) return `${a.split(/\s+/).slice(0, 2).join(" ")} ${short}`;
              return a;
            })()}
          </div>

          <div data-testid={`move-reason-${priority.program_id}`} style={{
            fontSize: 14, fontWeight: 450, color: P.textSub,
            lineHeight: 1.5,
          }}>
            {(() => {
              const raw = priority.reason || "Keep your pipeline moving";
              const clean = raw.startsWith("\u2192") ? raw.slice(1).trim() : raw;
              const signals = parseSignals(clean);
              if (signals.length === 0) {
                return <span>{"\u2192"} {clean}</span>;
              }
              return (
                <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
                  {signals.map((s, i) => (
                    <li key={i} style={{
                      display: "flex", gap: 6, alignItems: "center",
                      marginBottom: i < signals.length - 1 ? 3 : 0,
                    }}>
                      <span style={{
                        width: 5, height: 5, borderRadius: "50%",
                        background: s.color, flexShrink: 0, opacity: 0.75,
                      }} />
                      <span>{s.text}</span>
                    </li>
                  ))}
                </ul>
              );
            })()}
          </div>

          {priority.urgency_note && (
            <div data-testid="move-urgency-note" style={{
              fontSize: 13, fontWeight: 400, color: P.textSub,
              fontStyle: "italic", marginTop: 6, opacity: 0.7,
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
    <div data-testid="priority-board" style={{ marginTop: 18, fontFamily: FONT }}>
      {/* ── All-on-track banner (only when no urgent items) ── */}
      {allOnTrack && (
        <div style={{
          display: "flex", alignItems: "center", gap: 8,
          padding: "10px 16px", borderRadius: 12,
          background: P.thistleSoft, marginBottom: 16,
        }} data-testid="all-on-track-banner">
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: P.thistle, flexShrink: 0 }} />
          <span style={{ fontSize: 13, fontWeight: 500, color: P.textDark }}>All schools on track</span>
          <span style={{ fontSize: 13, fontWeight: 400, color: P.textSub }}>— no action needed right now</span>
        </div>
      )}

      {/* ── Sections ── */}
      <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
        {sectionData.map((section, sIdx) => {
          const HeaderIcon = section.headerIcon;

          return (
            <div key={section.key} data-testid={`urgency-group-${section.key}`} style={{ paddingTop: sIdx > 0 ? 4 : 0 }}>
              {/* Section header */}
              <div style={{
                display: "flex", alignItems: "center", gap: 7,
                marginBottom: 14,
              }}>
                <HeaderIcon style={{ width: 14, height: 14, color: section.headerColor, opacity: 0.9 }} />
                <span style={{
                  fontSize: 14, fontWeight: 700, letterSpacing: "-0.01em",
                  color: section.headerColor,
                }}>
                  {section.label}
                </span>
                <span style={{
                  fontSize: 12, fontWeight: 700,
                  color: section.headerColor, opacity: 0.55,
                  background: `${section.headerColor}10`,
                  padding: "1px 6px",
                  borderRadius: 5,
                }}>
                  {section.items.length}
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
                    cardIndex={idx}
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

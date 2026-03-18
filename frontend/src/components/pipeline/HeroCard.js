/**
 * HeroCard — Individual action card, designed for dark hero container.
 *
 * Dark surface card with colored left accent, white text, and clear CTA.
 * Urgent cards: stronger accent + solid CTA.
 * Momentum cards: softer accent + outline CTA.
 */
import React from "react";
import { ArrowRight } from "lucide-react";
import UniversityLogo from "../UniversityLogo";

const ACCENT = {
  coach_flag:      "#ef4444",
  director_action: "#ef4444",
  past_due:        "#ef4444",
  reply_needed:    "#f59e0b",
  due_today:       "#f59e0b",
  first_outreach:  "#818cf8",
  cooling_off:     "#818cf8",
};

const OWNER = {
  athlete: { label: "You",    color: "#5eead4" },
  coach:   { label: "Coach",  color: "#fbbf24" },
  shared:  { label: "Shared", color: "#93c5fd" },
  parent:  { label: "Parent", color: "#c4b5fd" },
};

const STAGES = {
  added: "Added", outreach: "Outreach", in_conversation: "Talking",
  campus_visit: "Visit", offer: "Offer", committed: "Committed",
};

export default function HeroCard({ action, variant = "urgent", onClick }) {
  const accent = ACCENT[action.category] || "#94a3b8";
  const owner = OWNER[action.owner] || OWNER.athlete;
  const p = action.program;
  const matchPct = action.matchScore?.match_score ?? action.match_score;
  const stage = STAGES[p?.journey_stage] || STAGES[p?.board_group];
  const isUrgent = variant === "urgent";

  return (
    <div
      onClick={onClick}
      className="hero-card-dark"
      tabIndex={0}
      role="button"
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick?.(); } }}
      data-testid={`hero-card-${action.id}`}
      style={{
        position: "relative",
        background: "rgba(255,255,255,0.04)",
        borderRadius: 12,
        padding: isUrgent ? "16px 18px 14px" : "12px 14px 10px",
        cursor: "pointer",
        width: isUrgent ? 340 : 280,
        flexShrink: 0,
        scrollSnapAlign: "start",
        border: "1px solid rgba(255,255,255,0.06)",
        borderLeft: `3px solid ${accent}`,
        transition: "background 0.15s ease, transform 0.15s ease",
      }}
    >
      {/* Identity: Logo + Name + Match % */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
        {p && (
          <UniversityLogo
            domain={p.domain}
            name={p.university_name}
            logoUrl={action.matchScore?.logo_url || p.logo_url}
            size={isUrgent ? 34 : 28}
            className="rounded-lg flex-shrink-0"
          />
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: isUrgent ? 15 : 13,
              fontWeight: 700,
              color: "#fff",
              lineHeight: 1.3,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
            data-testid={`hero-card-name-${action.id}`}
          >
            {p?.university_name || "Unknown"}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 2 }}>
            {p?.division && (
              <span style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.4)" }}>
                {p.division}
              </span>
            )}
            {p?.division && stage && (
              <span style={{ color: "rgba(255,255,255,0.15)", fontSize: 8 }}>·</span>
            )}
            {stage && (
              <span style={{ fontSize: 11, fontWeight: 500, color: "rgba(255,255,255,0.35)" }}>
                {stage}
              </span>
            )}
          </div>
        </div>
        {matchPct != null && (
          <span
            style={{
              fontSize: 12,
              fontWeight: 700,
              flexShrink: 0,
              color: matchPct >= 80 ? "#4ade80" : matchPct >= 60 ? "#fbbf24" : "rgba(255,255,255,0.4)",
            }}
            data-testid={`hero-card-match-${action.id}`}
          >
            {matchPct}%
          </span>
        )}
      </div>

      {/* Explanation */}
      <p
        style={{
          fontSize: isUrgent ? 13 : 12,
          fontWeight: 500,
          color: "rgba(255,255,255,0.65)",
          lineHeight: 1.5,
          margin: `${isUrgent ? 10 : 8}px 0 ${isUrgent ? 14 : 10}px`,
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
        }}
        data-testid={`hero-card-explanation-${action.id}`}
      >
        {action.context || "Review this program"}
      </p>

      {/* Footer: Owner + CTA */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span
          style={{
            fontSize: 10,
            fontWeight: 700,
            padding: "2px 8px",
            borderRadius: 6,
            background: "rgba(255,255,255,0.06)",
            color: owner.color,
            textTransform: "uppercase",
            letterSpacing: "0.04em",
          }}
          data-testid={`hero-card-owner-${action.id}`}
        >
          {owner.label}
        </span>
        <button
          onClick={(e) => { e.stopPropagation(); onClick?.(); }}
          className="hero-cta-dark"
          data-testid={`hero-card-cta-${action.id}`}
          style={{
            padding: isUrgent ? "6px 14px" : "5px 12px",
            borderRadius: 8,
            border: isUrgent ? "none" : `1px solid ${accent}44`,
            background: isUrgent ? accent : "transparent",
            color: isUrgent ? "#fff" : accent,
            fontSize: isUrgent ? 12 : 11,
            fontWeight: 700,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 4,
            fontFamily: "inherit",
            transition: "opacity 0.15s",
          }}
        >
          {action.cta?.label || "View"}
          <ArrowRight style={{ width: isUrgent ? 13 : 11, height: isUrgent ? 13 : 11 }} />
        </button>
      </div>
    </div>
  );
}

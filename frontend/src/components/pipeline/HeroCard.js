/**
 * HeroCard — Individual action card for the 2-tier pipeline hero.
 *
 * Design rationale:
 * - Left accent bar = urgency signal (warm = act now, cool = proactive)
 * - 4 visual elements max: identity, explanation, owner, CTA
 * - Typography carries the hierarchy, not color
 * - Card is fully clickable (navigates to school journey)
 * - CTA button is a redundant affordance for clarity
 */
import React from "react";
import { ArrowRight } from "lucide-react";
import UniversityLogo from "../UniversityLogo";

/* ── Color mapping: category → accent ── */
const ACCENT = {
  coach_flag:      "#ef4444",
  director_action: "#ef4444",
  past_due:        "#ef4444",
  reply_needed:    "#f59e0b",
  due_today:       "#f59e0b",
  first_outreach:  "#6366f1",
  cooling_off:     "#6366f1",
};

/* ── Owner labels ── */
const OWNER = {
  athlete: { label: "You",    color: "#0d9488", bg: "rgba(13,148,136,0.08)" },
  coach:   { label: "Coach",  color: "#d97706", bg: "rgba(217,119,6,0.08)" },
  shared:  { label: "Shared", color: "#6366f1", bg: "rgba(99,102,241,0.08)" },
  parent:  { label: "Parent", color: "#8b5cf6", bg: "rgba(139,92,246,0.08)" },
};

const STAGES = {
  added: "Added",
  outreach: "Outreach",
  in_conversation: "Talking",
  campus_visit: "Visit",
  offer: "Offer",
  committed: "Committed",
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
      className="hero-card"
      tabIndex={0}
      role="button"
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick?.(); } }}
      data-testid={`hero-card-${action.id}`}
      style={{
        position: "relative",
        background: "var(--cm-surface)",
        borderRadius: 14,
        padding: isUrgent ? "18px 20px 16px" : "14px 16px 12px",
        cursor: "pointer",
        width: isUrgent ? 320 : 280,
        flexShrink: 0,
        scrollSnapAlign: "start",
        border: "1px solid var(--cm-border)",
        borderLeft: `3px solid ${accent}`,
        transition: "box-shadow 0.2s ease, transform 0.15s ease",
      }}
    >
      {/* ── Identity row: Logo + Name + Match % ── */}
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
              color: "var(--cm-text)",
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
              <span style={{ fontSize: 11, fontWeight: 600, color: "var(--cm-text-3)" }}>
                {p.division}
              </span>
            )}
            {p?.division && stage && (
              <span style={{ color: "var(--cm-text-4)", fontSize: 8 }}>·</span>
            )}
            {stage && (
              <span style={{ fontSize: 11, fontWeight: 500, color: "var(--cm-text-3)" }}>
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
              color: matchPct >= 80 ? "#10b981" : matchPct >= 60 ? "#d97706" : "var(--cm-text-3)",
            }}
            data-testid={`hero-card-match-${action.id}`}
          >
            {matchPct}%
          </span>
        )}
      </div>

      {/* ── Explanation: the core "what to do" directive ── */}
      <p
        style={{
          fontSize: isUrgent ? 13 : 12,
          fontWeight: 500,
          color: "var(--cm-text-2)",
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

      {/* ── Footer: Owner pill + CTA ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span
          style={{
            fontSize: 10,
            fontWeight: 700,
            padding: "2px 8px",
            borderRadius: 6,
            background: owner.bg,
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
          className="hero-card-cta"
          data-testid={`hero-card-cta-${action.id}`}
          style={{
            padding: isUrgent ? "6px 14px" : "5px 12px",
            borderRadius: 8,
            border: isUrgent ? "none" : `1px solid ${accent}30`,
            background: isUrgent ? accent : `${accent}0d`,
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

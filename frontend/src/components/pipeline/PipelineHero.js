/**
 * PipelineHero — Single-card carousel styled to match Journey PrimaryHeroCard.
 *
 * Dark card, horizontal accent bar, compact icon+content layout.
 * Filter pills + carousel arrows preserved at top.
 */
import React, { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, ArrowRight, CheckCircle2 } from "lucide-react";
import UniversityLogo from "../UniversityLogo";
import PipelineCapacityStrip from "./PipelineCapacityStrip";

/* ── Classification ── */
const URGENT_CATS = new Set(["coach_flag", "director_action", "past_due", "reply_needed", "due_today"]);
const MOMENTUM_CATS = new Set(["cooling_off", "first_outreach"]);

function classifyActions(actions) {
  const urgent = [], momentum = [];
  let onTrackCount = 0;
  for (const a of actions) {
    if (URGENT_CATS.has(a.category)) urgent.push(a);
    else if (MOMENTUM_CATS.has(a.category)) momentum.push(a);
    else onTrackCount++;
  }
  return { urgent, momentum, onTrackCount };
}

/* ── Stage labels ── */
const STAGE_LABELS = {
  added: "Added", outreach: "Outreach", in_conversation: "Talking",
  campus_visit: "Visit", offer: "Offer", committed: "Committed",
  needs_outreach: "Added", waiting_on_reply: "Outreach", overdue: "Outreach",
};

/* ── Accent colors by category ── */
const CAT_ACCENT = {
  coach_flag: "#ef4444", director_action: "#ef4444", past_due: "#ef4444",
  reply_needed: "#f59e0b", due_today: "#f59e0b",
  first_outreach: "#818cf8", cooling_off: "#818cf8",
};

export default function PipelineHero({ actions, matchScores, navigate, usage }) {
  const [filter, setFilter] = useState("all");
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    const onKey = (e) => {
      const tag = document.activeElement?.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea" || tag === "select") return;
      if (e.key === "ArrowLeft") { e.preventDefault(); setIdx((i) => Math.max(0, i - 1)); }
      else if (e.key === "ArrowRight") { e.preventDefault(); setIdx((i) => i + 1); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (!actions || actions.length === 0) return null;

  const { urgent, momentum, onTrackCount } = classifyActions(actions);
  const allActionable = [...urgent, ...momentum];
  const filtered = filter === "attention" ? urgent : filter === "momentum" ? momentum : allActionable;
  const total = filtered.length;

  if (total === 0 && onTrackCount === 0) return null;

  const safeIdx = total > 0 ? Math.min(idx, total - 1) : 0;
  const current = filtered[safeIdx];
  const prev = () => setIdx((i) => (i - 1 + total) % total);
  const next = () => setIdx((i) => (i + 1) % total);
  const handleFilter = (f) => { setFilter(f); setIdx(0); };

  const handleCTA = () => {
    if (!current) return;
    if (current.type === "growth") navigate("/schools");
    else if (current.program) navigate(`/pipeline/${current.program.program_id}`);
  };

  /* Derived data */
  const p = current?.program;
  const ms = current ? (current.matchScore || matchScores[p?.program_id]) : null;
  const matchPct = ms?.match_score ?? current?.match_score;
  const accent = CAT_ACCENT[current?.category] || "#818cf8";
  const isUrgent = current ? URGENT_CATS.has(current.category) : false;
  const tierLabel = isUrgent ? "Needs attention now" : "Keep momentum going";
  const stageLabel = p ? (STAGE_LABELS[p.journey_stage] || STAGE_LABELS[p.board_group] || "") : "";

  /* Filter pills */
  const pills = [
    { key: "all", label: "All", count: allActionable.length, countBg: "#0d9488" },
    { key: "attention", label: "Needs Attention", count: urgent.length, countBg: "#ef4444" },
    { key: "momentum", label: "Losing Momentum", count: momentum.length, countBg: "#6366f1" },
  ].filter((pill) => pill.key === "all" || pill.count > 0);

  /* Metadata pills for current school */
  const metaPills = [];
  if (p?.division) metaPills.push(p.division);
  if (stageLabel) metaPills.push(stageLabel);
  if (p?.conference) metaPills.push(p.conference);
  if (matchPct != null) metaPills.push(`${matchPct}% match`);

  return (
    <div
      data-testid="pipeline-hero"
      style={{ background: "#1e1e2e", borderRadius: 10, overflow: "hidden", marginBottom: 20 }}
    >
      {/* ── Top accent bar (horizontal, matching Journey hero) ── */}
      <div style={{ height: 3, background: `linear-gradient(90deg, ${accent}, ${accent}33)` }} />

      {/* ═══ TOP BAR: Filter pills + Carousel nav ═══ */}
      <div
        style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "10px 16px 10px 20px",
          borderBottom: "1px solid rgba(255,255,255,0.04)",
        }}
        data-testid="hero-top-bar"
      >
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }} data-testid="hero-filter-pills">
          {pills.map((pill) => (
            <button
              key={pill.key}
              onClick={() => handleFilter(pill.key)}
              data-testid={`hero-filter-${pill.key}`}
              style={{
                padding: "4px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600,
                cursor: "pointer", border: "1px solid", fontFamily: "inherit",
                display: "flex", alignItems: "center", gap: 6, transition: "all 0.15s",
                background: filter === pill.key ? "rgba(255,255,255,0.08)" : "transparent",
                borderColor: filter === pill.key ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.06)",
                color: filter === pill.key ? "#fff" : "rgba(255,255,255,0.45)",
              }}
            >
              {pill.label}
              <span style={{
                fontSize: 9, fontWeight: 800, padding: "1px 5px", borderRadius: 6,
                background: filter === pill.key ? pill.countBg : "rgba(255,255,255,0.06)",
                color: filter === pill.key ? "#fff" : "rgba(255,255,255,0.35)",
              }}>{pill.count}</span>
            </button>
          ))}
        </div>
        {total > 1 && (
          <div style={{ display: "flex", alignItems: "center", gap: 6 }} data-testid="hero-carousel-nav">
            <button onClick={prev} data-testid="carousel-prev" style={{ width: 26, height: 26, borderRadius: 6, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "rgba(255,255,255,0.45)" }}>
              <ChevronLeft style={{ width: 13, height: 13 }} />
            </button>
            <span style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.4)", fontVariantNumeric: "tabular-nums", minWidth: 28, textAlign: "center" }} data-testid="carousel-counter">
              {safeIdx + 1}/{total}
            </span>
            <button onClick={next} data-testid="carousel-next" style={{ width: 26, height: 26, borderRadius: 6, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "rgba(255,255,255,0.45)" }}>
              <ChevronRight style={{ width: 13, height: 13 }} />
            </button>
          </div>
        )}
      </div>

      {/* ═══ MAIN CONTENT: Journey-style layout ═══ */}
      {current && (
        <div style={{ padding: "16px 20px" }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
            {/* University logo (icon position) */}
            {p && (
              <div
                style={{
                  width: 40, height: 40, borderRadius: 12,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  flexShrink: 0, marginTop: 2, overflow: "hidden",
                  background: "rgba(255,255,255,0.04)",
                }}
              >
                <UniversityLogo
                  domain={p.domain} name={p.university_name}
                  logoUrl={ms?.logo_url || p.logo_url}
                  size={32} className="rounded-[8px]"
                />
              </div>
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              {/* Kicker */}
              <p
                style={{
                  fontSize: 10, fontWeight: 700, textTransform: "uppercase",
                  letterSpacing: "0.12em", marginBottom: 4, color: accent, margin: 0,
                }}
                data-testid="hero-kicker"
              >
                {tierLabel}
              </p>

              {/* Title */}
              <h3
                style={{
                  fontSize: 14, fontWeight: 700, marginBottom: 4, color: "#ffffff",
                  margin: "0 0 4px", lineHeight: 1.35,
                  whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                }}
                data-testid="hero-school-name"
              >
                {current.title || p?.university_name || "Take Action"}
              </h3>

              {/* Subtitle */}
              <p
                style={{
                  fontSize: 12, color: "rgba(255,255,255,0.5)", margin: "0 0 12px",
                  lineHeight: 1.5,
                }}
                data-testid="hero-subtitle"
              >
                {current.context || "Review this program and take the next step."}
              </p>

              {/* Metadata pills */}
              {metaPills.length > 0 && (
                <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>
                  {metaPills.map((pill, i) => (
                    <span
                      key={i}
                      style={{
                        fontSize: 9, fontWeight: 500, padding: "2px 8px", borderRadius: 99,
                        background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.5)",
                      }}
                    >
                      {pill}
                    </span>
                  ))}
                </div>
              )}

              {/* CTA */}
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button
                  onClick={handleCTA}
                  data-testid="hero-cta-btn"
                  style={{
                    display: "inline-flex", alignItems: "center", gap: 6,
                    padding: "0 12px", height: 32, borderRadius: 6,
                    fontSize: 12, fontWeight: 600, color: "#fff",
                    background: accent, border: "none", cursor: "pointer",
                    fontFamily: "inherit", transition: "opacity 0.15s",
                    boxShadow: `0 2px 8px ${accent}40`,
                  }}
                >
                  {current.cta?.label || "Take Action"}
                  <ArrowRight style={{ width: 13, height: 13 }} />
                </button>
                <button
                  onClick={() => p && navigate(`/pipeline/${p.program_id}`)}
                  data-testid="hero-secondary-cta"
                  style={{
                    display: "inline-flex", alignItems: "center", gap: 6,
                    padding: "0 12px", height: 32, borderRadius: 6,
                    fontSize: 12, fontWeight: 600,
                    color: "rgba(255,255,255,0.6)", background: "transparent",
                    border: "1px solid rgba(255,255,255,0.1)",
                    cursor: "pointer", fontFamily: "inherit", transition: "opacity 0.15s",
                  }}
                >
                  View School
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══ FOOTER: On-track + Capacity ═══ */}
      <div style={{ padding: "0 20px 14px" }}>
        {onTrackCount > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 0" }} data-testid="hero-on-track-summary">
            <CheckCircle2 style={{ width: 14, height: 14, color: "#4ade80", flexShrink: 0, opacity: 0.6 }} />
            <span style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.3)" }}>
              {onTrackCount} program{onTrackCount !== 1 ? "s" : ""} on track
            </span>
          </div>
        )}
        {usage && (
          <PipelineCapacityStrip
            current={usage.used || 0}
            limit={usage.unlimited ? 0 : usage.limit || 0}
          />
        )}
      </div>

      {/* ── No actionable items state ── */}
      {total === 0 && onTrackCount > 0 && (
        <div style={{ padding: "40px 28px", display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
          <CheckCircle2 style={{ width: 28, height: 28, color: "#4ade80" }} />
          <span style={{ fontSize: 15, fontWeight: 700, color: "#fff" }}>You're all clear</span>
          <span style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>
            All {onTrackCount} programs are on track — nothing needs your attention.
          </span>
        </div>
      )}
    </div>
  );
}

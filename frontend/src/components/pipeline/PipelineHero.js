/**
 * PipelineHero — Single-card carousel inside a dark hero container.
 *
 * One school at a time, full width. Filter pills + carousel arrows to navigate.
 * Accent bar on the left, progress rail, "What to do next", owner badge, CTA.
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

/* ── Progress Rail ── */
const RAIL = [
  { key: "added", label: "Added" },
  { key: "outreach", label: "Outreach" },
  { key: "in_conversation", label: "Talking" },
  { key: "campus_visit", label: "Visit" },
  { key: "offer", label: "Offer" },
  { key: "committed", label: "Committed" },
];

function getActiveRailIdx(program) {
  if (!program) return 0;
  const stage = program.journey_stage || program.board_group;
  const map = { needs_outreach: "added", waiting_on_reply: "outreach", overdue: "outreach" };
  const idx = RAIL.findIndex((s) => s.key === (map[stage] || stage));
  return idx >= 0 ? idx : 0;
}

/* ── Accent colors by category ── */
const CAT_ACCENT = {
  coach_flag: "#ef4444", director_action: "#ef4444", past_due: "#ef4444",
  reply_needed: "#f59e0b", due_today: "#f59e0b",
  first_outreach: "#818cf8", cooling_off: "#818cf8",
};

/* ── Owner badge ── */
const OWNER_LABEL = {
  athlete: { text: "YOU", color: "#5eead4" },
  coach: { text: "COACH", color: "#fbbf24" },
  shared: { text: "SHARED", color: "#93c5fd" },
  parent: { text: "PARENT", color: "#c4b5fd" },
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
  const owner = OWNER_LABEL[current?.owner] || OWNER_LABEL.athlete;
  const railIdx = getActiveRailIdx(p);
  const tierLabel = isUrgent ? "NEEDS ATTENTION NOW" : "KEEP MOMENTUM GOING";
  const tierDotColor = isUrgent ? "#ef4444" : "#818cf8";

  /* Filter pills */
  const pills = [
    { key: "all", label: "All", count: allActionable.length, countBg: "#0d9488" },
    { key: "attention", label: "Needs Attention", count: urgent.length, countBg: "#ef4444" },
    { key: "momentum", label: "Losing Momentum", count: momentum.length, countBg: "#6366f1" },
  ].filter((pill) => pill.key === "all" || pill.count > 0);

  return (
    <div
      data-testid="pipeline-hero"
      style={{
        background: "linear-gradient(145deg, #1a2332 0%, #0f1a26 100%)",
        borderRadius: 14,
        overflow: "hidden",
        marginBottom: 20,
        position: "relative",
      }}
    >
      {/* ── Accent bar on left edge ── */}
      <div
        style={{
          position: "absolute", top: 0, left: 0, bottom: 0, width: 5,
          background: accent, borderRadius: "14px 0 0 14px", zIndex: 3,
        }}
      />
      {/* ── Ambient glow ── */}
      <div
        style={{
          position: "absolute", top: 0, left: 0, width: "40%", height: "100%",
          background: `radial-gradient(ellipse at 0% 50%, ${accent}18 0%, ${accent}08 35%, transparent 65%)`,
          pointerEvents: "none", zIndex: 0, borderRadius: "14px 0 0 14px",
        }}
      />

      {/* ═══ TOP BAR: Filter pills + Carousel nav ═══ */}
      <div
        style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "12px 20px", borderBottom: "1px solid rgba(255,255,255,0.04)",
          position: "relative", zIndex: 1,
        }}
        data-testid="hero-top-bar"
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }} data-testid="hero-filter-pills">
          {pills.map((pill) => (
            <button
              key={pill.key}
              onClick={() => handleFilter(pill.key)}
              data-testid={`hero-filter-${pill.key}`}
              style={{
                padding: "5px 12px", borderRadius: 20, fontSize: 12, fontWeight: 600,
                cursor: "pointer", border: "1px solid", fontFamily: "inherit",
                display: "flex", alignItems: "center", gap: 7, transition: "all 0.15s",
                background: filter === pill.key ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.03)",
                borderColor: filter === pill.key ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.06)",
                color: filter === pill.key ? "#fff" : "rgba(255,255,255,0.5)",
              }}
            >
              {pill.label}
              <span style={{
                fontSize: 10, fontWeight: 800, padding: "1px 6px", borderRadius: 8,
                background: filter === pill.key ? pill.countBg : "rgba(255,255,255,0.06)",
                color: filter === pill.key ? "#fff" : "rgba(255,255,255,0.4)",
              }}>{pill.count}</span>
            </button>
          ))}
        </div>
        {total > 1 && (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }} data-testid="hero-carousel-nav">
            <button onClick={prev} data-testid="carousel-prev" style={{ width: 28, height: 28, borderRadius: 7, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "rgba(255,255,255,0.5)" }}>
              <ChevronLeft style={{ width: 14, height: 14 }} />
            </button>
            <span style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.5)", fontVariantNumeric: "tabular-nums", minWidth: 30, textAlign: "center" }} data-testid="carousel-counter">
              {safeIdx + 1} / {total}
            </span>
            <button onClick={next} data-testid="carousel-next" style={{ width: 28, height: 28, borderRadius: 7, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "rgba(255,255,255,0.5)" }}>
              <ChevronRight style={{ width: 14, height: 14 }} />
            </button>
          </div>
        )}
      </div>

      {/* ═══ MAIN CONTENT: Single card view ═══ */}
      {current && (
        <div style={{ padding: "20px 24px 8px", position: "relative", zIndex: 1 }}>
          {/* Tier label */}
          <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 16 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: tierDotColor }} />
            <span style={{ fontSize: 11, fontWeight: 800, color: tierDotColor, letterSpacing: "0.08em", textTransform: "uppercase" }}>
              {tierLabel}
            </span>
          </div>

          {/* School identity row: logo + name + metadata + match % */}
          <div style={{ display: "flex", alignItems: "flex-start", gap: 14, marginBottom: 4 }}>
            {p && (
              <UniversityLogo
                domain={p.domain} name={p.university_name}
                logoUrl={ms?.logo_url || p.logo_url}
                size={44} className="rounded-[10px] flex-shrink-0"
              />
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <h2 style={{ fontSize: 24, fontWeight: 800, color: "#fff", letterSpacing: -0.3, lineHeight: 1.2, margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} data-testid="hero-school-name">
                {p?.university_name || "Take Action"}
              </h2>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4, flexWrap: "wrap" }}>
                {p?.division && <span style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.45)" }}>{p.division}</span>}
                {p?.division && <span style={{ fontSize: 9, color: "rgba(255,255,255,0.15)" }}>·</span>}
                {p?.journey_stage && <span style={{ fontSize: 13, fontWeight: 500, color: "rgba(255,255,255,0.4)" }}>{RAIL.find((s) => s.key === p.journey_stage)?.label || ""}</span>}
                {p?.conference && (
                  <>
                    <span style={{ fontSize: 9, color: "rgba(255,255,255,0.15)" }}>·</span>
                    <span style={{ fontSize: 13, fontWeight: 500, color: "rgba(255,255,255,0.4)" }}>{p.conference}</span>
                  </>
                )}
              </div>
            </div>
            {matchPct != null && (
              <span style={{ fontSize: 24, fontWeight: 800, color: "#fbbf24", flexShrink: 0, lineHeight: 1 }} data-testid="hero-match-pct">
                {matchPct}%
              </span>
            )}
          </div>

          {/* Progress rail */}
          <div style={{ margin: "20px 0", display: "flex", alignItems: "center", maxWidth: 500 }} data-testid="hero-progress-rail">
            {RAIL.map((stage, i) => {
              const isActive = i === railIdx;
              const isPast = i < railIdx;
              return (
                <React.Fragment key={stage.key}>
                  {i > 0 && <div style={{ flex: 1, height: 2, background: isPast || isActive ? "rgba(13,148,136,0.4)" : "rgba(255,255,255,0.08)", borderRadius: 1 }} />}
                  <div style={{
                    width: isActive ? 14 : 10, height: isActive ? 14 : 10, borderRadius: "50%",
                    background: isActive ? "#0d9488" : isPast ? "rgba(148,163,184,0.5)" : "#1e293b",
                    border: isActive ? "2.5px solid rgba(13,148,136,0.35)" : isPast ? "none" : "1.5px solid rgba(255,255,255,0.12)",
                    boxShadow: isActive ? "0 0 10px rgba(13,148,136,0.5)" : "none", flexShrink: 0,
                  }} title={stage.label} />
                </React.Fragment>
              );
            })}
          </div>

          {/* "What to do next" + CTA row */}
          <div style={{ display: "flex", alignItems: "stretch", gap: 14, marginBottom: 6 }}>
            <div style={{ flex: 1, padding: "14px 16px", borderRadius: 10, border: "1px solid rgba(13,148,136,0.25)", background: "rgba(13,148,136,0.06)" }} data-testid="hero-advice-box">
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 5 }}>
                <span style={{ fontSize: 13 }}>💡</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: "#5eead4", letterSpacing: "0.02em" }}>What to do next</span>
              </div>
              <p style={{ fontSize: 14, fontWeight: 500, color: "rgba(255,255,255,0.8)", lineHeight: 1.5, margin: 0 }} data-testid="hero-advice-text">
                {current.context || "Review this program and take the next step."}
              </p>
            </div>
            <button
              onClick={handleCTA}
              data-testid="hero-cta-btn"
              style={{
                padding: "14px 24px", borderRadius: 10, border: "none",
                background: accent, color: "#fff", fontSize: 14, fontWeight: 700,
                cursor: "pointer", display: "flex", alignItems: "center", gap: 7,
                fontFamily: "inherit", transition: "all 0.2s", flexShrink: 0,
                boxShadow: `0 4px 20px ${accent}40`, alignSelf: "center",
              }}
            >
              {current.cta?.label || "Take Action"}
              <ArrowRight style={{ width: 15, height: 15 }} />
            </button>
          </div>

          {/* Owner badge */}
          <div style={{ marginBottom: 4 }}>
            <span style={{ fontSize: 11, fontWeight: 800, padding: "4px 12px", borderRadius: 8, background: "rgba(255,255,255,0.06)", color: owner.color, letterSpacing: "0.04em" }} data-testid="hero-owner-badge">
              {owner.text}
            </span>
          </div>
        </div>
      )}

      {/* ═══ FOOTER: On-track + Capacity ═══ */}
      <div style={{ padding: "4px 24px 14px", position: "relative", zIndex: 1 }}>
        {onTrackCount > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 0" }} data-testid="hero-on-track-summary">
            <CheckCircle2 style={{ width: 16, height: 16, color: "#4ade80", flexShrink: 0, opacity: 0.7 }} />
            <span style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.35)" }}>
              {onTrackCount} program{onTrackCount !== 1 ? "s" : ""} on track — no action needed
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
        <div style={{ padding: "40px 28px", display: "flex", flexDirection: "column", alignItems: "center", gap: 12, position: "relative", zIndex: 1 }}>
          <CheckCircle2 style={{ width: 32, height: 32, color: "#4ade80" }} />
          <span style={{ fontSize: 16, fontWeight: 700, color: "#fff" }}>You're all clear</span>
          <span style={{ fontSize: 13, color: "rgba(255,255,255,0.45)" }}>
            All {onTrackCount} programs are on track — nothing needs your attention right now.
          </span>
        </div>
      )}
    </div>
  );
}

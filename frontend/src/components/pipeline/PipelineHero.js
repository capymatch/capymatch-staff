/**
 * PipelineHero — Single-column dark carousel. One school at a time.
 *
 * Each slide: category label, school identity, match score, progress rail,
 * "what to do next" box, owner badge, CTA button.
 * No side panels. No capacity strip. Focused + calm + premium.
 */
import React, { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, ArrowRight } from "lucide-react";
import UniversityLogo from "../UniversityLogo";
import { ProgressRail } from "../journey/ProgressRail";
import { RAIL_STAGES } from "../journey/constants";

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

/* ── Accent + glow per category ── */
const CAT_STYLE = {
  coach_flag:       { accent: "#ef4444", glow: "rgba(239,68,68,0.12)", label: "Needs Attention Now" },
  director_action:  { accent: "#ef4444", glow: "rgba(239,68,68,0.12)", label: "Needs Attention Now" },
  past_due:         { accent: "#ef4444", glow: "rgba(239,68,68,0.10)", label: "Needs Attention Now" },
  reply_needed:     { accent: "#f59e0b", glow: "rgba(245,158,11,0.08)", label: "Needs Attention Now" },
  due_today:        { accent: "#f59e0b", glow: "rgba(245,158,11,0.08)", label: "Needs Attention Now" },
  first_outreach:   { accent: "#818cf8", glow: "rgba(129,140,248,0.08)", label: "Keep Momentum Going" },
  cooling_off:      { accent: "#818cf8", glow: "rgba(129,140,248,0.08)", label: "Keep Momentum Going" },
};
const DEFAULT_STYLE = { accent: "#0d9488", glow: "rgba(13,148,136,0.06)", label: "Take Action" };

/* ── Owner badge config ── */
const OWNER_CFG = {
  athlete: { text: "YOU",    color: "#5eead4" },
  coach:   { text: "COACH",  color: "#fbbf24" },
  shared:  { text: "SHARED", color: "#93c5fd" },
  parent:  { text: "PARENT", color: "#c4b5fd" },
};

/* ── Build rail from program stage ── */
function buildRail(program) {
  if (!program) return null;
  const stage = program.journey_stage || program.board_group;
  const map = { needs_outreach: "added", waiting_on_reply: "outreach", overdue: "outreach" };
  const active = map[stage] || stage || "added";
  const activeIdx = RAIL_STAGES.findIndex(s => s.key === active);
  const stages = {};
  RAIL_STAGES.forEach((s, i) => { if (i <= activeIdx) stages[s.key] = true; });
  return { active, stages, line_fill: active };
}

/* ── Stage label for pills ── */
const STAGE_LABEL = {
  added: "Added", outreach: "Outreach", in_conversation: "Talking",
  campus_visit: "Visit", offer: "Offer", committed: "Committed",
  needs_outreach: "Added", waiting_on_reply: "Outreach", overdue: "Outreach",
};

export default function PipelineHero({ actions, matchScores, navigate }) {
  const [filter, setFilter] = useState("all");
  const [idx, setIdx] = useState(0);

  /* Keyboard nav */
  useEffect(() => {
    const onKey = (e) => {
      const tag = document.activeElement?.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea" || tag === "select") return;
      if (e.key === "ArrowLeft")  { e.preventDefault(); setIdx(i => Math.max(0, i - 1)); }
      if (e.key === "ArrowRight") { e.preventDefault(); setIdx(i => i + 1); }
      if (e.key === "Enter")      { e.preventDefault(); handleCTA(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!actions || actions.length === 0) return null;

  const { urgent, momentum } = classifyActions(actions);
  const allActionable = [...urgent, ...momentum];
  const filtered = filter === "attention" ? urgent : filter === "momentum" ? momentum : allActionable;
  const total = filtered.length;

  if (total === 0) return null;

  const safeIdx = Math.min(idx, total - 1);
  const current = filtered[safeIdx];
  const prev = () => setIdx(i => (i - 1 + total) % total);
  const next = () => setIdx(i => (i + 1) % total);
  const handleFilter = (f) => { setFilter(f); setIdx(0); };

  const handleCTA = () => {
    if (!current) return;
    if (current.type === "growth") navigate("/schools");
    else if (current.program) navigate(`/pipeline/${current.program.program_id}`);
  };

  /* Derived */
  const p = current?.program;
  const ms = current?.matchScore || matchScores[p?.program_id];
  const matchPct = ms?.match_score ?? current?.match_score;
  const style = CAT_STYLE[current?.category] || DEFAULT_STYLE;
  const owner = OWNER_CFG[current?.owner] || OWNER_CFG.athlete;
  const rail = buildRail(p);
  const stageLabel = p ? (STAGE_LABEL[p.journey_stage] || STAGE_LABEL[p.board_group] || "") : "";

  /* Metadata pills */
  const metaPills = [p?.division, p?.conference, stageLabel].filter(Boolean);
  // Add action-specific context pill
  if (current?.category === "coach_flag") metaPills.push("Coach task open");
  else if (current?.category === "past_due") metaPills.push("Follow-up overdue");
  else if (current?.category === "reply_needed") metaPills.push("Reply needed");
  else if (current?.category === "first_outreach") metaPills.push("No contact yet");
  else if (current?.category === "cooling_off") metaPills.push("Cooling off");

  /* Filter pills */
  const pills = [
    { key: "all", label: "All", count: allActionable.length },
    { key: "attention", label: "Needs Attention", count: urgent.length },
    { key: "momentum", label: "Keep Momentum Going", count: momentum.length },
  ].filter(pill => pill.key === "all" || pill.count > 0);

  return (
    <div
      data-testid="pipeline-hero"
      style={{
        background: "linear-gradient(145deg, #1a2332 0%, #0f1a26 100%)",
        borderRadius: 14,
        overflow: "hidden",
        position: "relative",
      }}
    >
      {/* Ambient glow */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
        background: `radial-gradient(ellipse at 20% 30%, ${style.glow} 0%, transparent 60%)`,
        pointerEvents: "none", zIndex: 0,
      }} />

      {/* ═══ TOP BAR: Filter pills + Carousel nav ═══ */}
      <div
        style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "14px 24px 12px",
          borderBottom: "1px solid rgba(255,255,255,0.04)",
          position: "relative", zIndex: 1,
        }}
        data-testid="hero-top-bar"
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }} data-testid="hero-filter-pills">
          {pills.map(pill => (
            <button
              key={pill.key}
              onClick={() => handleFilter(pill.key)}
              data-testid={`hero-filter-${pill.key}`}
              style={{
                padding: "6px 14px", borderRadius: 20, fontSize: 13, fontWeight: 600,
                cursor: "pointer", border: "none", fontFamily: "inherit",
                display: "flex", alignItems: "center", gap: 8,
                transition: "all 0.15s",
                background: filter === pill.key ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.04)",
                color: filter === pill.key ? "#fff" : "rgba(255,255,255,0.45)",
              }}
            >
              {pill.label}
              <span style={{
                fontSize: 11, fontWeight: 800, padding: "1px 7px", borderRadius: 8,
                background: filter === pill.key ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.06)",
                color: filter === pill.key ? "#fff" : "rgba(255,255,255,0.35)",
              }}>{pill.count}</span>
            </button>
          ))}
        </div>
        {total > 1 && (
          <div style={{ display: "flex", alignItems: "center", gap: 10 }} data-testid="hero-carousel-nav">
            <button onClick={prev} data-testid="carousel-prev" style={{
              width: 30, height: 30, borderRadius: 8,
              background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)",
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", color: "rgba(255,255,255,0.45)",
            }}>
              <ChevronLeft style={{ width: 15, height: 15 }} />
            </button>
            <span style={{
              fontSize: 14, fontWeight: 700, color: "rgba(255,255,255,0.5)",
              fontVariantNumeric: "tabular-nums", minWidth: 36, textAlign: "center",
            }} data-testid="carousel-counter">
              {safeIdx + 1} / {total}
            </span>
            <button onClick={next} data-testid="carousel-next" style={{
              width: 30, height: 30, borderRadius: 8,
              background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)",
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", color: "rgba(255,255,255,0.45)",
            }}>
              <ChevronRight style={{ width: 15, height: 15 }} />
            </button>
          </div>
        )}
      </div>

      {/* ═══ SLIDE CONTENT ═══ */}
      <div style={{ padding: "20px 28px 24px", position: "relative", zIndex: 1 }}>

        {/* 1. Category label + "Top priority" */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: style.accent, boxShadow: `0 0 8px ${style.accent}66` }} />
            <span style={{ fontSize: 11, fontWeight: 800, color: style.accent, letterSpacing: "0.08em", textTransform: "uppercase" }} data-testid="hero-category-label">
              {style.label}
            </span>
          </div>
          <span style={{ fontSize: 11, fontWeight: 500, color: "rgba(255,255,255,0.3)", letterSpacing: "0.02em" }}>
            Top priority across your schools
          </span>
        </div>

        {/* 2. School identity + Match score */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 6 }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 16, flex: 1, minWidth: 0 }}>
            {p && (
              <UniversityLogo
                name={p.university_name}
                logoUrl={ms?.logo_url || p.logo_url}
                domain={ms?.domain || p.domain}
                size={52}
                className="rounded-xl flex-shrink-0"
              />
            )}
            <div style={{ minWidth: 0 }}>
              <h2 style={{
                fontSize: 26, fontWeight: 800, color: "#fff", letterSpacing: -0.3,
                lineHeight: 1.2, margin: 0,
                whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 500,
              }} data-testid="hero-school-name">
                {p?.university_name || "Take Action"}
              </h2>
              {/* Metadata pills */}
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
                {metaPills.map((pill, i) => (
                  <span key={i} style={{
                    fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 6,
                    background: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.55)",
                  }}>{pill}</span>
                ))}
              </div>
            </div>
          </div>

          {/* 3. Match score (right aligned) */}
          {matchPct != null && (
            <div style={{ textAlign: "right", flexShrink: 0, paddingLeft: 20 }} data-testid="hero-match-score">
              <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.3)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 2 }}>
                Match
              </div>
              <div style={{ fontSize: 38, fontWeight: 800, lineHeight: 1, letterSpacing: -1 }}>
                <span style={{ color: matchPct >= 80 ? "#4ade80" : matchPct >= 60 ? "#fbbf24" : "#94a3b8" }}>
                  {matchPct}
                </span>
                <span style={{ fontSize: 18, fontWeight: 600, color: "rgba(255,255,255,0.3)", marginLeft: 2 }}>%</span>
              </div>
            </div>
          )}
        </div>

        {/* 4. Progress rail */}
        {rail && (
          <div style={{ margin: "18px 0 20px", maxWidth: 420 }} data-testid="hero-progress-rail">
            <ProgressRail
              rail={rail}
              onStageClick={() => p && navigate(`/pipeline/${p.program_id}`)}
            />
          </div>
        )}

        {/* 5. "What to do next" box */}
        <div style={{
          background: "rgba(255,255,255,0.03)",
          border: `1px solid ${style.accent}30`,
          borderRadius: 12,
          padding: "16px 20px",
          marginBottom: 18,
        }} data-testid="hero-advice-box">
          <div style={{ fontSize: 10, fontWeight: 800, color: style.accent, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8 }}>
            What to do next
          </div>
          <p style={{ fontSize: 15, fontWeight: 500, color: "rgba(255,255,255,0.8)", lineHeight: 1.55, margin: 0 }} data-testid="hero-advice-text">
            {current.context || "Review this program and take the next step."}
          </p>
        </div>

        {/* 6 + 7. Owner badge + CTA */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{
            fontSize: 11, fontWeight: 800, padding: "5px 14px", borderRadius: 8,
            background: "rgba(255,255,255,0.06)", color: owner.color,
            letterSpacing: "0.06em",
          }} data-testid="hero-owner-badge">
            {owner.text}
          </span>
          <button
            onClick={handleCTA}
            data-testid="hero-cta-btn"
            style={{
              padding: "12px 28px", borderRadius: 28, border: "none",
              background: style.accent, color: "#fff",
              fontSize: 15, fontWeight: 700, cursor: "pointer",
              display: "flex", alignItems: "center", gap: 8,
              fontFamily: "inherit", transition: "all 0.2s",
              boxShadow: `0 4px 24px ${style.accent}50`,
            }}
          >
            {current.cta?.label || "Take Action"}
            <ArrowRight style={{ width: 16, height: 16 }} />
          </button>
        </div>
      </div>
    </div>
  );
}

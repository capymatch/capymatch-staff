/**
 * PipelineHero — Single-column dark carousel with motion system.
 *
 * Motion: 2-phase exit/enter transitions, CTA press feedback,
 * ambient glow crossfade, filter pill animation.
 */
import React, { useState, useEffect, useRef, useCallback } from "react";
import { ChevronLeft, ChevronRight, ArrowRight } from "lucide-react";
import UniversityLogo from "../UniversityLogo";
import { ProgressRail } from "../journey/ProgressRail";
import { RAIL_STAGES } from "../journey/constants";
import PipelineHeroEmptyState from "./PipelineHeroEmptyState";
import "./pipeline-motion.css";

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

/* ── Build rail ── */
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

const STATUS_CHIP = {
  coach_flag: "Coach task open", past_due: "Follow-up overdue",
  reply_needed: "Reply needed", first_outreach: "No contact yet",
  cooling_off: "Cooling off", due_today: "Due today",
};

const HELPER_HINTS = {
  coach_flag: "Coaches typically review follow-ups within 48 hours",
  past_due: "Programs with recent follow-ups stay 2x more engaged",
  reply_needed: "Responding within 24 hours shows strong interest",
  first_outreach: "Early outreach builds the strongest recruiting relationships",
  cooling_off: "A short check-in now can prevent losing momentum",
  due_today: "Completing tasks on time keeps your pipeline healthy",
};

export default function PipelineHero({ actions, matchScores, navigate }) {
  const [filter, setFilter] = useState("all");
  const [idx, setIdx] = useState(0);
  const [phase, setPhase] = useState("idle"); // idle | exit | enter
  const [ctaPressed, setCtaPressed] = useState(false);
  const pendingRef = useRef(null);

  /* 2-phase transition: exit → update → enter → idle */
  const transitionTo = useCallback((updateFn) => {
    setPhase("exit");
    pendingRef.current = updateFn;
    setTimeout(() => {
      if (pendingRef.current) pendingRef.current();
      pendingRef.current = null;
      setPhase("enter");
      setTimeout(() => setPhase("idle"), 220);
    }, 140);
  }, []);

  /* Keyboard nav */
  useEffect(() => {
    const onKey = (e) => {
      const tag = document.activeElement?.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea" || tag === "select") return;
      if (e.key === "ArrowLeft")  { e.preventDefault(); goTo(-1); }
      if (e.key === "ArrowRight") { e.preventDefault(); goTo(1); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!actions || actions.length === 0) {
    return <PipelineHeroEmptyState onTrackCount={0} navigate={navigate} />;
  }

  const { urgent, momentum, onTrackCount } = classifyActions(actions);
  const allActionable = [...urgent, ...momentum];
  const filtered = filter === "attention" ? urgent : filter === "momentum" ? momentum : allActionable;
  const total = filtered.length;

  if (total === 0) {
    return <PipelineHeroEmptyState onTrackCount={onTrackCount} navigate={navigate} />;
  }

  const safeIdx = Math.min(idx, total - 1);
  const current = filtered[safeIdx];

  const goTo = (dir) => {
    if (phase !== "idle") return;
    transitionTo(() => setIdx(i => dir === -1 ? (i - 1 + total) % total : (i + 1) % total));
  };

  const handleFilter = (f) => {
    if (phase !== "idle" || f === filter) return;
    transitionTo(() => { setFilter(f); setIdx(0); });
  };

  const handleCTA = () => {
    if (!current) return;
    setCtaPressed(true);
    setTimeout(() => setCtaPressed(false), 120);
    setTimeout(() => {
      if (current.type === "growth") navigate("/schools");
      else if (current.program) navigate(`/pipeline/${current.program.program_id}`);
    }, 60);
  };

  /* Derived */
  const p = current?.program;
  const ms = current?.matchScore || matchScores[p?.program_id];
  const matchPct = ms?.match_score ?? current?.match_score;
  const style = CAT_STYLE[current?.category] || DEFAULT_STYLE;
  const rail = buildRail(p);
  const inlineMeta = [p?.division, p?.conference].filter(Boolean).join(" \u00b7 ");
  const statusChip = STATUS_CHIP[current?.category] || null;
  const helperHint = HELPER_HINTS[current?.category] || null;

  const pills = [
    { key: "all", label: "All", count: allActionable.length },
    { key: "attention", label: "Attention", count: urgent.length },
    { key: "momentum", label: "Momentum", count: momentum.length },
  ].filter(pill => pill.key === "all" || pill.count > 0);

  /* Phase → CSS class */
  const slideClass = phase === "exit" ? "pm-slide-exit"
                   : phase === "enter" ? "pm-slide-enter"
                   : "pm-slide-idle";

  return (
    <div
      data-testid="pipeline-hero"
      className="rounded-xl sm:rounded-2xl overflow-hidden relative pm-hero-hover"
      style={{ background: "linear-gradient(145deg, #1a2332 0%, #0f1a26 100%)" }}
    >
      {/* Ambient glow — smooth crossfade */}
      <div className="absolute inset-0 pointer-events-none pm-glow"
        style={{ background: `radial-gradient(ellipse at 20% 30%, ${style.glow} 0%, transparent 60%)` }} />

      {/* ═══ TOP BAR ═══ */}
      <div
        className="flex items-center justify-between px-4 sm:px-6 pt-3 pb-3 relative z-[1]"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}
        data-testid="hero-top-bar"
      >
        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap" data-testid="hero-filter-pills">
          {pills.map(pill => (
            <button
              key={pill.key}
              onClick={() => handleFilter(pill.key)}
              data-testid={`hero-filter-${pill.key}`}
              className="flex items-center gap-1.5 px-2.5 sm:px-3.5 py-1.5 rounded-2xl text-[11px] sm:text-[13px] font-semibold pm-pill"
              style={{
                background: filter === pill.key ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.04)",
                color: filter === pill.key ? "#fff" : "rgba(255,255,255,0.45)",
                border: "none", cursor: "pointer", fontFamily: "inherit",
              }}
            >
              {pill.label}
              <span className="text-[9px] sm:text-[11px] font-extrabold px-1.5 py-0.5 rounded-md pm-pill-badge"
                style={{
                  background: filter === pill.key ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.06)",
                  color: filter === pill.key ? "#fff" : "rgba(255,255,255,0.35)",
                }}>{pill.count}</span>
            </button>
          ))}
        </div>
        {total > 1 && (
          <div className="flex items-center gap-2 sm:gap-2.5 flex-shrink-0" data-testid="hero-carousel-nav">
            <button onClick={() => goTo(-1)} data-testid="carousel-prev"
              className="w-7 h-7 rounded-lg flex items-center justify-center cursor-pointer pm-nav-hover"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.45)" }}>
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="text-xs sm:text-sm font-bold tabular-nums min-w-[28px] text-center" style={{ color: "rgba(255,255,255,0.5)" }} data-testid="carousel-counter">
              {safeIdx + 1} / {total}
            </span>
            <button onClick={() => goTo(1)} data-testid="carousel-next"
              className="w-7 h-7 rounded-lg flex items-center justify-center cursor-pointer pm-nav-hover"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.45)" }}>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* ═══ SLIDE CONTENT — 2-phase motion ═══ */}
      <div className={`px-4 sm:px-7 pt-4 sm:pt-5 pb-5 sm:pb-6 relative z-[1] ${slideClass}`}>

        {/* Category label */}
        <div className="flex items-center justify-between mb-3 sm:mb-4">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full" style={{ background: style.accent, boxShadow: `0 0 8px ${style.accent}66` }} />
            <span className="text-[10px] sm:text-[11px] font-extrabold tracking-wider uppercase" style={{ color: style.accent }} data-testid="hero-category-label">
              {style.label}
            </span>
          </div>
          <span className="hidden sm:inline text-[11px] font-medium" style={{ color: "rgba(255,255,255,0.25)" }}>
            Top priority right now
          </span>
        </div>

        {/* School identity + Match score */}
        <div className="flex items-start justify-between gap-3 sm:gap-4 mb-1">
          <div className="flex items-start gap-3 sm:gap-4 flex-1 min-w-0">
            {p && (
              <UniversityLogo
                name={p.university_name}
                logoUrl={ms?.logo_url || p.logo_url}
                domain={ms?.domain || p.domain}
                size={44}
                className="rounded-lg sm:rounded-xl flex-shrink-0"
              />
            )}
            <div className="min-w-0">
              <h2 className="text-base sm:text-2xl font-extrabold text-white tracking-tight truncate" data-testid="hero-school-name">
                {p?.university_name || "Take Action"}
              </h2>
              <div className="flex items-center gap-2 mt-1.5" data-testid="hero-metadata">
                {inlineMeta && (
                  <span className="text-[11px] sm:text-xs font-medium" style={{ color: "rgba(255,255,255,0.4)" }}>
                    {inlineMeta}
                  </span>
                )}
                {statusChip && (
                  <span className="text-[10px] sm:text-[11px] font-semibold px-2 py-0.5 rounded-md"
                    style={{ background: `${style.accent}18`, color: style.accent }}>
                    {statusChip}
                  </span>
                )}
              </div>
            </div>
          </div>

          {matchPct != null && (
            <div className="text-right flex-shrink-0" data-testid="hero-match-score">
              <div className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider mb-0.5" style={{ color: "rgba(255,255,255,0.3)" }}>Match</div>
              <div className="flex items-baseline justify-end">
                <span className="text-2xl sm:text-4xl font-extrabold leading-none" style={{ color: matchPct >= 80 ? "#4ade80" : matchPct >= 60 ? "#fbbf24" : "#94a3b8" }}>
                  {matchPct}
                </span>
                <span className="text-sm sm:text-lg font-semibold ml-0.5" style={{ color: "rgba(255,255,255,0.3)" }}>%</span>
              </div>
            </div>
          )}
        </div>

        {/* Progress rail */}
        {rail && (
          <div className="mt-2 sm:mt-3 max-w-md" data-testid="hero-progress-rail">
            <ProgressRail rail={rail} onStageClick={() => p && navigate(`/pipeline/${p.program_id}`)} />
          </div>
        )}

        {/* What to do next */}
        <div className="mt-3 sm:mt-4 mb-3" data-testid="hero-advice-box">
          <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.5)" }}>
            What to do next
          </span>
          <p className="text-[14px] sm:text-[16px] font-semibold leading-snug mt-1 mb-0" style={{ color: "rgba(255,255,255,0.85)" }} data-testid="hero-advice-text">
            {current.context || "Review this program and take the next step."}
          </p>
          {helperHint && (
            <p className="text-[11px] sm:text-xs mt-1 mb-0" style={{ color: "rgba(255,255,255,0.38)" }}>
              {helperHint}
            </p>
          )}
        </div>

        {/* CTA — with press feedback */}
        <button
          onClick={handleCTA}
          data-testid="hero-cta-btn"
          className={`flex items-center gap-2 px-6 sm:px-7 py-2.5 sm:py-3 rounded-full text-[13px] sm:text-[15px] font-bold text-white cursor-pointer pm-btn-hover ${ctaPressed ? "pm-cta-press" : ""}`}
          style={{
            background: style.accent, border: "none", fontFamily: "inherit",
            boxShadow: `0 4px 24px ${style.accent}50`,
          }}
        >
          {current.cta?.label || "Take Action"}
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

import React, { useState, useEffect, useRef, useCallback } from "react";
import { ChevronLeft, ChevronRight, ArrowRight } from "lucide-react";
import UniversityLogo from "../UniversityLogo";
import { ProgressRail } from "../journey/ProgressRail";
import { RAIL_STAGES } from "../journey/constants";
import PipelineHeroEmptyState from "./PipelineHeroEmptyState";
import "./pipeline-motion.css";

const LEVEL_STYLE = {
  high:   { accent: "#ef4444", glow: "rgba(239,68,68,0.12)", label: "High" },
  medium: { accent: "#d97706", glow: "rgba(217,119,6,0.08)", label: "Med" },
  low:    { accent: "#10b981", glow: "rgba(16,185,129,0.06)", label: "On track" },
};

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

function getShortAction(item) {
  if (!item) return 'Take action';
  if (item.reasonShort) return item.reasonShort;
  if (item.attentionLevel === 'high') return 'Needs attention';
  if (item.attentionLevel === 'medium') return 'Coming up';
  return 'On track';
}

export default function PipelineHero({ heroItems, matchScores, navigate }) {
  const [filter, setFilter] = useState("all");
  const [idx, setIdx] = useState(0);
  const [phase, setPhase] = useState("idle");
  const [ctaPressed, setCtaPressed] = useState(false);
  const pendingRef = useRef(null);

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

  const goTo = useCallback((dir) => {
    if (phase !== "idle") return;
    transitionTo(() => setIdx(i => dir === -1 ? Math.max(0, i - 1) : i + 1));
  }, [phase, transitionTo]);

  useEffect(() => {
    const onKey = (e) => {
      const tag = document.activeElement?.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea" || tag === "select") return;
      if (e.key === "ArrowLeft")  { e.preventDefault(); goTo(-1); }
      if (e.key === "ArrowRight") { e.preventDefault(); goTo(1); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goTo]);

  if (!heroItems || heroItems.length === 0) {
    return <PipelineHeroEmptyState onTrackCount={0} navigate={navigate} />;
  }

  const highItems = heroItems.filter(h => h.attentionLevel === 'high');
  const medItems = heroItems.filter(h => h.attentionLevel === 'medium');
  const filtered = filter === 'high' ? highItems : filter === 'medium' ? medItems : heroItems;
  const total = filtered.length;

  if (total === 0) {
    return <PipelineHeroEmptyState onTrackCount={0} navigate={navigate} />;
  }

  const safeIdx = ((idx % total) + total) % total;
  const current = filtered[safeIdx];

  const handleGoTo = (dir) => {
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
      if (current.program) navigate(`/pipeline/${current.program.program_id}`);
    }, 60);
  };

  const p = current.program;
  const ms = matchScores[p?.program_id];
  const matchPct = ms?.match_score;
  const style = LEVEL_STYLE[current.attentionLevel] || LEVEL_STYLE.low;
  const rail = buildRail(p);
  const ownerLabel = current.owner === 'coach' ? 'Coach' : current.owner === 'director' ? 'Director' : 'You';

  const pills = [
    { key: "all", label: "All", count: heroItems.length },
    { key: "high", label: "Attention", count: highItems.length },
    { key: "medium", label: "Momentum", count: medItems.length },
  ].filter(pill => pill.key === "all" || pill.count > 0);

  const slideClass = phase === "exit" ? "pm-slide-exit"
                   : phase === "enter" ? "pm-slide-enter"
                   : "pm-slide-idle";

  const peekItems = [];
  for (let i = 0; i < filtered.length && peekItems.length < 4; i++) {
    if (i !== safeIdx && filtered[i].program) peekItems.push({ item: filtered[i], filteredIdx: i });
  }

  return (
    <>
    <div
      data-testid="pipeline-hero"
      className="rounded-xl sm:rounded-2xl overflow-hidden relative pm-hero-hover"
      style={{ background: "linear-gradient(145deg, #1a2332 0%, #0f1a26 100%)" }}
    >
      <div className="absolute inset-0 pointer-events-none pm-glow"
        style={{ background: `radial-gradient(ellipse at 20% 30%, ${style.glow} 0%, transparent 60%)` }} />

      {/* TOP BAR: Filter pills + Carousel nav */}
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
            <button onClick={() => handleGoTo(-1)} data-testid="carousel-prev"
              className="w-7 h-7 rounded-lg flex items-center justify-center cursor-pointer pm-nav-hover"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.45)" }}>
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="text-xs sm:text-sm font-bold tabular-nums min-w-[28px] text-center" style={{ color: "rgba(255,255,255,0.5)" }} data-testid="carousel-counter">
              {safeIdx + 1} / {total}
            </span>
            <button onClick={() => handleGoTo(1)} data-testid="carousel-next"
              className="w-7 h-7 rounded-lg flex items-center justify-center cursor-pointer pm-nav-hover"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.45)" }}>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* SLIDE CONTENT */}
      <div className={`px-4 sm:px-7 pt-4 sm:pt-5 pb-5 sm:pb-6 relative z-[1] ${slideClass}`}>

        {/* Row 1: ● HIGH  |  Overdue 10d */}
        <div className="flex items-center justify-between" data-testid="hero-status-row">
          <div className="flex items-center gap-2">
            <div className="w-[5px] h-[5px] rounded-full" style={{ background: style.accent, boxShadow: `0 0 6px ${style.accent}66` }} />
            <span className="text-[10px] sm:text-[11px] font-extrabold tracking-wider uppercase" style={{ color: style.accent }} data-testid="hero-category-label">
              {style.label}
            </span>
          </div>
          {current.timingLabel && (
            <span className="text-[10px] sm:text-[11px] font-bold" style={{ color: style.accent, opacity: 0.7 }} data-testid="hero-timing-label">
              {current.timingLabel}
            </span>
          )}
        </div>

        {/* Row 2: School name + logo  |  Match % */}
        <div className="flex items-center justify-between gap-3 mt-3" data-testid="hero-school-row">
          <div className="flex items-center gap-3 min-w-0">
            {p && (
              <UniversityLogo
                name={p.university_name}
                logoUrl={ms?.logo_url || p.logo_url}
                domain={ms?.domain || p.domain}
                size={32}
                className="rounded-lg flex-shrink-0"
              />
            )}
            <span className="text-[14px] sm:text-[16px] font-bold text-white truncate" data-testid="hero-school-name">
              {p?.university_name || "Take Action"}
            </span>
          </div>
          {matchPct != null && (
            <span className="text-[13px] sm:text-[14px] font-bold flex-shrink-0" style={{ color: matchPct >= 80 ? "#4ade80" : matchPct >= 60 ? "#fbbf24" : "#94a3b8" }} data-testid="hero-match-score">
              {matchPct}% match
            </span>
          )}
        </div>

        {/* Progress rail — reduced weight */}
        {rail && (
          <div className="mt-2 max-w-xs" style={{ opacity: 0.45 }} data-testid="hero-progress-rail">
            <ProgressRail rail={rail} onStageClick={() => p && navigate(`/pipeline/${p.program_id}`)} />
          </div>
        )}

        {/* Main action — LARGEST element */}
        <div className="mt-4 sm:mt-5" data-testid="hero-advice-box">
          <div className="text-[18px] sm:text-[22px] font-extrabold leading-tight" style={{ color: "#fff", display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }} data-testid="hero-advice-text">
            {current.primaryAction}
          </div>
        </div>

        {/* Owner badge */}
        <div className="flex items-center gap-2 mt-2" data-testid="hero-meta-line">
          <span className="text-[9.5px] font-bold px-1.5 py-0.5 rounded" style={{ background: ownerLabel === 'You' ? 'rgba(13,148,136,0.15)' : 'rgba(99,102,241,0.15)', color: ownerLabel === 'You' ? '#5eead4' : '#a5b4fc' }}>
            {ownerLabel}
          </span>
        </div>

        {/* CTA row: Primary + Secondary */}
        <div className="flex items-center gap-3 mt-4 sm:mt-5" data-testid="hero-cta-row">
          <button
            onClick={handleCTA}
            data-testid="hero-cta-btn"
            className={`flex items-center gap-2 px-5 sm:px-6 py-2 sm:py-2.5 rounded-lg text-[12px] sm:text-[13px] font-bold text-white cursor-pointer pm-btn-hover ${ctaPressed ? "pm-cta-press" : ""}`}
            style={{
              background: style.accent, border: "none", fontFamily: "inherit",
              boxShadow: `0 4px 20px ${style.accent}40`,
            }}
          >
            {current.ctaLabel || "Take Action"} <ArrowRight className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => p && navigate(`/pipeline/${p.program_id}`)}
            data-testid="hero-secondary-btn"
            className="text-[11px] sm:text-[12px] font-semibold cursor-pointer pm-nav-hover"
            style={{ background: "none", border: "none", color: "rgba(255,255,255,0.35)", fontFamily: "inherit", padding: '4px 0' }}
          >
            View details
          </button>
        </div>
      </div>
    </div>

    {/* PEEK ROW */}
    {peekItems.length > 0 && (
      <div data-testid="peek-row" style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--cm-text-3, #94a3b8)', textTransform: 'uppercase', letterSpacing: '0.05em', flexShrink: 0 }}>Also needs attention:</span>
        {peekItems.map(({ item, filteredIdx }) => (
          <button
            key={item.programId}
            onClick={() => transitionTo(() => setIdx(filteredIdx))}
            data-testid={`peek-item-${item.programId}`}
            style={{ padding: '3px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600, background: 'var(--cm-surface-2, #f1f5f9)', color: 'var(--cm-text-2, #475569)', border: '1px solid var(--cm-border, #e2e8f0)', cursor: 'pointer', fontFamily: 'inherit', transition: 'all 120ms ease-out', whiteSpace: 'nowrap' }}
          >
            {item.program?.university_name} &middot; {getShortAction(item)}
          </button>
        ))}
      </div>
    )}
    </>
  );
}

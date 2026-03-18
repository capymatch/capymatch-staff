import React, { useState, useEffect, useRef, useCallback } from "react";
import { ChevronLeft, ChevronRight, ArrowRight } from "lucide-react";
import UniversityLogo from "../UniversityLogo";
import { ProgressRail } from "../journey/ProgressRail";
import { RAIL_STAGES } from "../journey/constants";
import PipelineHeroEmptyState from "./PipelineHeroEmptyState";
import "./pipeline-motion.css";

const LEVEL_STYLE = {
  high:   { accent: "#ef4444", glow: "rgba(239,68,68,0.10)", label: "High" },
  medium: { accent: "#d97706", glow: "rgba(217,119,6,0.06)", label: "Med" },
  low:    { accent: "#10b981", glow: "rgba(16,185,129,0.04)", label: "On track" },
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
  if (item.timingLabel) return item.timingLabel;
  if (item.attentionLevel === 'high') return 'Needs attention';
  if (item.attentionLevel === 'medium') return 'Coming up';
  return 'On track';
}

export default function PipelineHero({ heroItems, matchScores, navigate }) {
  const [filter, setFilter] = useState("all");
  const [idx, setIdx] = useState(0);
  const [phase, setPhase] = useState("idle");
  const [compact, setCompact] = useState(false);
  const heroRef = useRef(null);
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

  /* Scroll-based compact mode */
  useEffect(() => {
    const el = heroRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => setCompact(entry.intersectionRatio < 0.85),
      { threshold: [0.85, 1] }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

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

  const p = current.program;
  const ms = matchScores[p?.program_id];
  const matchPct = ms?.match_score;
  const style = LEVEL_STYLE[current.attentionLevel] || LEVEL_STYLE.low;
  const rail = buildRail(p);
  const ownerLabel = current.owner === 'coach' ? 'Coach' : current.owner === 'director' ? 'Director' : 'You';

  const pills = [
    { key: "all", label: "All", count: heroItems.length },
    { key: "high", label: "Urgent", count: highItems.length },
    { key: "medium", label: "Soon", count: medItems.length },
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
      ref={heroRef}
      data-testid="pipeline-hero"
      className="rounded-xl sm:rounded-2xl overflow-hidden relative pm-hero-hover"
      style={{
        background: "linear-gradient(145deg, #1a2332 0%, #0f1a26 100%)",
        transition: "padding 180ms ease-out",
      }}
    >
      <div className="absolute inset-0 pointer-events-none pm-glow"
        style={{ background: `radial-gradient(ellipse at 20% 30%, ${style.glow} 0%, transparent 60%)` }} />

      {/* TOP BAR: Filter pills + Carousel nav */}
      <div
        className="flex items-center justify-between px-4 sm:px-6 pt-3 pb-2 relative z-[1]"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}
        data-testid="hero-top-bar"
      >
        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap" data-testid="hero-filter-pills">
          {pills.map(pill => (
            <button
              key={pill.key}
              onClick={() => handleFilter(pill.key)}
              data-testid={`hero-filter-${pill.key}`}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-2xl text-[10px] sm:text-[12px] font-semibold pm-pill"
              style={{
                background: filter === pill.key ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.04)",
                color: filter === pill.key ? "#fff" : "rgba(255,255,255,0.4)",
                border: "none", cursor: "pointer", fontFamily: "inherit",
              }}
            >
              {pill.label}
              <span className="text-[9px] sm:text-[10px] font-extrabold px-1 py-0.5 rounded-md pm-pill-badge"
                style={{
                  background: filter === pill.key ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.06)",
                  color: filter === pill.key ? "#fff" : "rgba(255,255,255,0.3)",
                }}>{pill.count}</span>
            </button>
          ))}
        </div>
        {total > 1 && (
          <div className="flex items-center gap-2 flex-shrink-0" data-testid="hero-carousel-nav">
            <button onClick={() => handleGoTo(-1)} data-testid="carousel-prev"
              className="w-6 h-6 rounded-md flex items-center justify-center cursor-pointer pm-nav-hover"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.4)" }}>
              <ChevronLeft className="w-3 h-3" />
            </button>
            <span className="text-[10px] sm:text-[11px] font-bold tabular-nums min-w-[24px] text-center" style={{ color: "rgba(255,255,255,0.4)" }} data-testid="carousel-counter">
              {safeIdx + 1}/{total}
            </span>
            <button onClick={() => handleGoTo(1)} data-testid="carousel-next"
              className="w-6 h-6 rounded-md flex items-center justify-center cursor-pointer pm-nav-hover"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.4)" }}>
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>

      {/* SLIDE CONTENT */}
      <div className={`relative z-[1] ${slideClass}`}
        style={{
          padding: compact ? '12px 16px 14px' : '16px 16px 20px',
          transition: 'padding 180ms ease-out',
        }}
      >
        {/* Row 1: ● HIGH · Overdue 10d — unified single line like cards */}
        <div className="flex items-center gap-1.5" data-testid="hero-status-row">
          <div className="w-[5px] h-[5px] rounded-full flex-shrink-0" style={{ background: style.accent }} />
          <span className="text-[10px] sm:text-[11px] font-extrabold tracking-wider uppercase" style={{ color: style.accent }} data-testid="hero-category-label">
            {style.label}
          </span>
          {current.timingLabel && (
            <>
              <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.15)" }}>·</span>
              <span className="text-[10px] sm:text-[11px] font-bold" style={{ color: style.accent, opacity: 0.7 }} data-testid="hero-timing-label">
                {current.timingLabel}
              </span>
            </>
          )}
        </div>

        {/* Row 2: School info — hero-only enhancement */}
        {!compact && (
          <div className="flex items-center justify-between gap-3 mt-2.5" data-testid="hero-school-row">
            <div className="flex items-center gap-2.5 min-w-0">
              {p && (
                <UniversityLogo
                  name={p.university_name}
                  logoUrl={ms?.logo_url || p.logo_url}
                  domain={ms?.domain || p.domain}
                  size={26}
                  className="rounded-md flex-shrink-0"
                />
              )}
              <span className="text-[13px] sm:text-[14px] font-semibold text-white/70 truncate" data-testid="hero-school-name">
                {p?.university_name || "School"}
              </span>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {matchPct != null && (
                <span className="text-[11px] sm:text-[12px] font-bold" style={{ color: matchPct >= 80 ? "rgba(74,222,128,0.7)" : matchPct >= 60 ? "rgba(251,191,36,0.7)" : "rgba(148,163,184,0.5)" }} data-testid="hero-match-score">
                  {matchPct}%
                </span>
              )}
            </div>
          </div>
        )}

        {/* Progress rail — subtle, hidden when compact */}
        {!compact && rail && (
          <div className="mt-1.5 max-w-[180px]" style={{ opacity: 0.3 }} data-testid="hero-progress-rail">
            <ProgressRail rail={rail} onStageClick={() => p && navigate(`/pipeline/${p.program_id}`)} />
          </div>
        )}

        {/* Main action — LARGEST, same prominence as card action */}
        <div className={compact ? "mt-2" : "mt-3 sm:mt-4"} data-testid="hero-advice-box">
          <div className={`${compact ? 'text-[16px]' : 'text-[18px] sm:text-[20px]'} font-extrabold leading-tight`}
            style={{ color: "#fff", display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', transition: 'font-size 180ms ease-out' }}
            data-testid="hero-advice-text"
          >
            {current.primaryAction}
          </div>
        </div>

        {/* Owner + ghost CTA — same row */}
        <div className="flex items-center justify-between mt-3" data-testid="hero-meta-line">
          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded" style={{ background: ownerLabel === 'You' ? 'rgba(13,148,136,0.12)' : 'rgba(99,102,241,0.12)', color: ownerLabel === 'You' ? '#5eead4' : '#a5b4fc' }}>
            {ownerLabel}
          </span>
          <button
            onClick={(e) => { e.stopPropagation(); if (p) navigate(`/pipeline/${p.program_id}`); }}
            data-testid="hero-cta-btn"
            className="flex items-center gap-1.5 text-[11px] sm:text-[12px] font-bold cursor-pointer pm-nav-hover"
            style={{ background: "none", border: "none", fontFamily: "inherit", color: style.accent, padding: '2px 0', opacity: 0.85 }}
          >
            {current.ctaLabel || "Take Action"} <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>

    {/* PEEK ROW */}
    {peekItems.length > 0 && (
      <div data-testid="peek-row" style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--cm-text-3, #94a3b8)', textTransform: 'uppercase', letterSpacing: '0.05em', flexShrink: 0 }}>Also:</span>
        {peekItems.map(({ item, filteredIdx }) => (
          <button
            key={item.programId}
            onClick={() => transitionTo(() => setIdx(filteredIdx))}
            data-testid={`peek-item-${item.programId}`}
            style={{ padding: '3px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600, background: 'var(--cm-surface-2, #f1f5f9)', color: 'var(--cm-text-2, #475569)', border: '1px solid var(--cm-border, #e2e8f0)', cursor: 'pointer', fontFamily: 'inherit', transition: 'all 120ms ease-out', whiteSpace: 'nowrap' }}
          >
            {item.program?.university_name} · {getShortAction(item)}
          </button>
        ))}
      </div>
    )}
    </>
  );
}

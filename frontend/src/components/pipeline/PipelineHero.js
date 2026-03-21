import React, { useState, useEffect, useRef, useCallback } from "react";
import { ChevronLeft, ChevronRight, ArrowRight, Info } from "lucide-react";
import { trackEvent } from "../../lib/analytics";
import UniversityLogo from "../UniversityLogo";
import { RAIL_STAGES } from "../journey/constants";
import PipelineHeroEmptyState from "./PipelineHeroEmptyState";
import "./pipeline-motion.css";
import "./pipeline-premium.css";

const LEVEL_STYLE = {
  high: {
    accent: "#ff6b7f", glow: "rgba(255,107,127,0.10)", label: "Needs attention",
    badgeBg: "rgba(255,107,127,0.16)", badgeText: "#ffd2d9",
  },
  medium: {
    accent: "#ff9b52", glow: "rgba(255,155,82,0.06)", label: "Coming soon",
    badgeBg: "rgba(255,155,82,0.14)", badgeText: "#ffd29f",
  },
  low: {
    accent: "#16b57f", glow: "rgba(22,181,127,0.04)", label: "On track",
    badgeBg: "rgba(22,181,127,0.14)", badgeText: "#b9fff8",
  },
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
  const [swipeDir, setSwipeDir] = useState(null);
  const [whyExpanded, setWhyExpanded] = useState(false);
  const heroRef = useRef(null);
  const pendingRef = useRef(null);
  const touchRef = useRef({ startX: 0, startY: 0 });

  const transitionTo = useCallback((updateFn, dir = null) => {
    setSwipeDir(dir);
    setPhase("exit");
    setWhyExpanded(false);
    pendingRef.current = updateFn;
    setTimeout(() => {
      if (pendingRef.current) pendingRef.current();
      pendingRef.current = null;
      setPhase("enter");
      setTimeout(() => { setPhase("idle"); setSwipeDir(null); }, 220);
    }, 140);
  }, []);

  const goTo = useCallback((dir) => {
    if (phase !== "idle") return;
    const swipe = dir === 1 ? "left" : "right";
    transitionTo(() => setIdx(i => dir === -1 ? Math.max(0, i - 1) : i + 1), swipe);
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

  const onTouchStart = useCallback((e) => {
    touchRef.current.startX = e.touches[0].clientX;
    touchRef.current.startY = e.touches[0].clientY;
  }, []);

  const onTouchEnd = useCallback((e) => {
    const dx = e.changedTouches[0].clientX - touchRef.current.startX;
    const dy = e.changedTouches[0].clientY - touchRef.current.startY;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      if (dx < 0) goTo(1);
      else goTo(-1);
    }
  }, [goTo]);

  /* Compact mode disabled — card stays full size on scroll */
  const compact = false;

  const prevTrackedRef = useRef(null);
  const highItems = (heroItems || []).filter(h => h.attentionLevel === 'high');
  const medItems = (heroItems || []).filter(h => h.attentionLevel === 'medium');
  const filtered = filter === 'high' ? highItems : filter === 'medium' ? medItems : (heroItems || []);
  const total = filtered.length;
  const safeIdx = total > 0 ? ((idx % total) + total) % total : 0;
  const current = total > 0 ? filtered[safeIdx] : null;

  useEffect(() => {
    if (!current?.programId || current.programId === prevTrackedRef.current) return;
    prevTrackedRef.current = current.programId;
    trackEvent("hero_viewed", {
      program_id: current.programId,
      school_name: current.program?.university_name || "",
      priority_source: current.prioritySource || "live",
      recap_rank: current.recapRank || null,
      attention_level: current.attentionLevel,
      position: safeIdx + 1,
    });
  }, [current, safeIdx]);

  if (!heroItems || heroItems.length === 0 || total === 0) {
    return <PipelineHeroEmptyState onTrackCount={0} navigate={navigate} />;
  }

  const handleGoTo = (dir) => {
    if (phase !== "idle") return;
    const swipe = dir === 1 ? "left" : "right";
    transitionTo(() => setIdx(i => (i + dir + total) % total), swipe);
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

  const slideClass = phase === "exit"
    ? (swipeDir === "left" ? "pm-swipe-exit-left" : swipeDir === "right" ? "pm-swipe-exit-right" : "pm-slide-exit")
    : phase === "enter"
      ? (swipeDir === "left" ? "pm-swipe-enter-left" : swipeDir === "right" ? "pm-swipe-enter-right" : "pm-slide-enter")
      : "pm-slide-idle";

  const peekItems = [];
  for (let i = 0; i < filtered.length && peekItems.length < 4; i++) {
    if (i !== safeIdx && filtered[i].program) peekItems.push({ item: filtered[i], filteredIdx: i });
  }

  const activeStageKey = rail?.active;
  const activeStageIdx = RAIL_STAGES.findIndex(s => s.key === activeStageKey);

  return (
    <>
    <div
      ref={heroRef}
      data-testid="pipeline-hero"
      className="overflow-hidden relative pm-hero-hover rounded-[18px] sm:rounded-[28px]"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      style={{
        background: "linear-gradient(135deg, #111b34 0%, #17254a 55%, #1c3568 100%)",
        borderRadius: undefined,
        border: "1px solid rgba(255,255,255,0.08)",
        boxShadow: "0 24px 70px rgba(19, 33, 58, 0.10)",
      }}
    >
      {/* Glow orbs */}
      <div className="ds-glow-teal" />
      <div className="ds-glow-purple" />

      {/* ── TOP BAR: Filter pills + Carousel nav ── */}
      <div
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between px-4 sm:px-7 pt-3 sm:pt-3.5 pb-2.5 sm:pb-3 relative z-[1] gap-2 sm:gap-0"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
        data-testid="hero-top-bar"
      >
        <div className="flex items-center gap-1.5 sm:gap-2.5 flex-wrap" data-testid="hero-filter-pills">
          {pills.map(pill => (
            <button
              key={pill.key}
              onClick={() => handleFilter(pill.key)}
              data-testid={`hero-filter-${pill.key}`}
              className="flex items-center gap-1 sm:gap-1.5 rounded-full text-[12px] sm:text-[13px] font-bold pm-pill"
              style={{
                padding: "6px 10px",
                borderRadius: 999,
                background: filter === pill.key ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.03)",
                color: filter === pill.key ? "#fff" : "rgba(255,255,255,0.4)",
                border: `1px solid ${filter === pill.key ? "rgba(255,255,255,0.08)" : "transparent"}`,
                cursor: "pointer", fontFamily: "inherit",
              }}
            >
              {pill.label}
              <span className="pm-pill-badge" style={{
                fontSize: 10, fontWeight: 800, padding: "1px 5px", borderRadius: 6,
                background: filter === pill.key ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.06)",
                color: filter === pill.key ? "#fff" : "rgba(255,255,255,0.3)",
              }}>{pill.count}</span>
            </button>
          ))}
        </div>
        {total > 1 && (
          <div className="flex items-center gap-2 sm:gap-2.5 flex-shrink-0" data-testid="hero-carousel-nav">
            <button onClick={() => handleGoTo(-1)} data-testid="carousel-prev"
              className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center cursor-pointer pm-nav-hover"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.4)" }}>
              <ChevronLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
            <span className="text-[11px] sm:text-[12px] font-bold tabular-nums min-w-[24px] sm:min-w-[28px] text-center" style={{ color: "rgba(255,255,255,0.4)" }} data-testid="carousel-counter">
              {safeIdx + 1}/{total}
            </span>
            <button onClick={() => handleGoTo(1)} data-testid="carousel-next"
              className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center cursor-pointer pm-nav-hover"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.4)" }}>
              <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
          </div>
        )}
      </div>

      {/* ── SLIDE CONTENT ── */}
      <div className={`relative z-[1] ds-hero-content ${slideClass} px-4 sm:px-7 py-4 sm:py-6`}
      >
        {/* BADGE ROW */}
        <div className="flex items-center gap-2.5 flex-wrap mb-4" data-testid="hero-status-row">
          <span className="ds-badge" style={{
            background: style.badgeBg,
            color: style.badgeText,
          }} data-testid="hero-category-label">
            {style.label}
          </span>
          {current.timingLabel && (
            <span className="ds-badge" style={{
              background: "rgba(255,255,255,0.06)",
              color: "rgba(255,255,255,0.68)",
            }} data-testid="hero-timing-label">
              {current.timingLabel}
            </span>
          )}
          {current.explainFactors?.length > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                const next = !whyExpanded;
                setWhyExpanded(next);
                if (next) trackEvent("hero_expanded_why", {
                  program_id: current.programId,
                  priority_source: current.prioritySource || "live",
                  factors_count: current.explainFactors?.length || 0,
                });
              }}
              data-testid="hero-why-btn"
              className="ds-badge"
              style={{
                background: whyExpanded ? "rgba(25,195,178,0.20)" : "rgba(25,195,178,0.14)",
                color: "#b9fff8",
                border: "none", cursor: "pointer", fontFamily: "inherit",
                transition: "background 120ms ease",
              }}
            >
              <Info size={11} />
              Why this surfaced
            </button>
          )}
        </div>

        {/* SCHOOL NAME — large, prominent */}
        {!compact && (
          <div className="flex items-center gap-3 mb-1" data-testid="hero-school-row">
            {p && (
              <UniversityLogo
                name={p.university_name}
                logoUrl={ms?.logo_url || p.logo_url}
                domain={ms?.domain || p.domain}
                size={28}
                className="rounded-lg flex-shrink-0"
              />
            )}
            <h3 className="text-[22px] sm:text-[30px]" style={{ fontWeight: 600, color: "#fff", letterSpacing: "-0.045em", margin: 0, lineHeight: 1.02 }} data-testid="hero-school-name">
              {p?.university_name || "School"}
            </h3>
            {matchPct != null && (
              <span className="flex-shrink-0" style={{
                fontSize: 14, fontWeight: 500,
                color: matchPct >= 80 ? "#8df0e6" : matchPct >= 60 ? "#ffd29f" : "#9aa5b8",
                opacity: 0.8,
              }} data-testid="hero-match-score">
                {matchPct}%
              </span>
            )}
          </div>
        )}

        {/* PRIMARY ACTION / TASK */}
        <div data-testid="hero-advice-box">
          <div style={{
            fontSize: compact ? 18 : 20,
            fontWeight: 500,
            letterSpacing: "-0.03em",
            color: "#fff",
            lineHeight: 1.2,
            margin: "8px 0 10px",
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }} data-testid="hero-advice-text">
            {current.primaryAction}
          </div>
          {current.heroReason && current.heroReason !== current.reason && (
            <div style={{ color: "rgba(255,255,255,0.55)", fontSize: 14, fontWeight: 400, lineHeight: 1.45 }} data-testid="hero-recap-reason">
              {current.heroReason.replace(/\s*[—–-]\s*also your recap['']s top focus\.?/gi, "").replace(/also your recap['']s top focus\.?/gi, "").trim()}
            </div>
          )}
        </div>

        {/* META: Owner */}
        <div className="mt-2 flex items-center gap-2" data-testid="hero-meta-line">
          <span className="text-[10px] font-bold px-2 py-1 rounded-md" style={{
            background: ownerLabel === 'You' ? 'rgba(25,195,178,0.12)' : 'rgba(93,135,255,0.12)',
            color: ownerLabel === 'You' ? '#8df0e6' : '#8facff',
          }}>
            {ownerLabel}
          </span>
        </div>

        {/* PROGRESS TRACK — premium inline dots */}
        {!compact && rail && (
          <>
          <div className="ds-eyebrow mt-4 mb-1" style={{ color: "rgba(255,255,255,0.30)", fontSize: 10, letterSpacing: "0.1em" }}>
            Where you are in the process
          </div>
          <div className="ds-progress-track" data-testid="hero-progress-rail">
            {RAIL_STAGES.map((s, stIdx) => {
              const isActive = stIdx === activeStageIdx;
              const isPast = stIdx < activeStageIdx;
              return (
                <div key={s.key}
                  className={`ds-progress-step${isActive ? " active" : ""}${isPast ? " past" : ""}`}
                  onClick={() => p && navigate(`/pipeline/${p.program_id}`)}
                  data-testid={`rail-stage-${s.key}`}
                >
                  <div className="ds-progress-dot" />
                  {s.label}
                </div>
              );
            })}
          </div>
          </>
        )}

        {/* CTA ROW */}
        <div className="flex gap-2 sm:gap-3 mt-1 sm:mt-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (p) {
                trackEvent("hero_action_clicked", {
                  program_id: current.programId,
                  school_name: p.university_name || "",
                  priority_source: current.prioritySource || "live",
                  recap_rank: current.recapRank || null,
                  cta_label: current.ctaLabel || "View School",
                  why_was_expanded: whyExpanded,
                });
                navigate(`/pipeline/${p.program_id}`);
              }
            }}
            data-testid="hero-cta-btn"
            className="ds-btn-primary text-[13px] sm:text-[14px] py-2.5 px-4 sm:py-3 sm:px-5"
          >
            {current.ctaLabel || "View School"} <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              const next = !whyExpanded;
              setWhyExpanded(next);
              if (next) trackEvent("hero_expanded_why", { program_id: current.programId });
            }}
            data-testid="hero-secondary-btn"
            className="ds-btn-secondary text-[13px] sm:text-[14px] py-2.5 px-4 sm:py-3 sm:px-5"
          >
            Why this?
          </button>
        </div>

        {/* WHY THIS? — expandable explainability panel */}
        {whyExpanded && current.explainFactors?.length > 0 && (
          <div
            data-testid="hero-why-panel"
            className="mt-4 pt-3"
            style={{
              borderTop: "1px solid rgba(255,255,255,0.06)",
              animation: "pm-why-in 180ms ease-out both",
            }}
          >
            <div className="ds-eyebrow mb-2" style={{ color: "rgba(255,255,255,0.3)" }}>
              Priority factors
            </div>
            {current.explainFactors.map((f, i) => {
              const isOutranked = f.type === "recap-outranked";
              const isStale = f.type === "recap-stale";
              const isSecondary = isOutranked || isStale;
              return (
                <div key={i} className="flex items-center gap-2 mb-1.5" style={{
                  fontSize: isSecondary ? 12 : 13,
                  color: isOutranked ? "rgba(200,194,255,0.50)"
                    : isStale ? "rgba(200,194,255,0.45)"
                    : "rgba(255,255,255,0.65)",
                  fontWeight: isSecondary ? 400 : 500,
                  fontStyle: isSecondary ? "italic" : "normal",
                  lineHeight: 1.5,
                }}>
                  <span style={{
                    width: 7, height: 7, borderRadius: "50%", flexShrink: 0,
                    background: f.type === "overdue" || f.type === "due" ? "#ff6b7f"
                      : f.type === "coach" ? "#ff9b52"
                      : f.type === "recap" ? "#8b7bff"
                      : f.type === "recap-outranked" || f.type === "recap-stale" ? "#c8c2ff"
                      : f.type === "stale" ? "#5d87ff"
                      : f.type === "risk" ? "#ff9b52"
                      : "#9aa5b8",
                    opacity: isSecondary ? 0.5 : 1,
                  }} />
                  {f.label}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
    </>
  );
}

import React, { useState, useEffect, useRef, useCallback } from "react";
import { ChevronLeft, ChevronRight, ArrowRight } from "lucide-react";
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
  const heroRef = useRef(null);
  const pendingRef = useRef(null);
  const touchRef = useRef({ startX: 0, startY: 0 });

  const transitionTo = useCallback((updateFn, dir = null) => {
    setSwipeDir(dir);
    setPhase("exit");
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
  const urgentItems = (heroItems || []).filter(h => h.urgency === 'critical');
  const soonItems = (heroItems || []).filter(h => h.urgency === 'soon');
  const filtered = filter === 'high' ? urgentItems : filter === 'medium' ? soonItems : (heroItems || []);
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
    { key: "high", label: "Urgent", count: urgentItems.length },
    { key: "medium", label: "Soon", count: soonItems.length },
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
      className="overflow-hidden relative pm-hero-hover rounded-[12px] sm:rounded-[28px]"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      style={{
        background: "#161921",
        borderRadius: undefined,
        border: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      {/* ── Carousel nav — absolute top-right ── */}
      {total > 1 && (
        <div className="absolute top-3 right-3 sm:top-4 sm:right-5 z-[2] flex items-center gap-2 sm:gap-2.5" style={{ opacity: 0.5 }} data-testid="hero-carousel-nav">
          <button onClick={() => handleGoTo(-1)} data-testid="carousel-prev"
            className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg flex items-center justify-center cursor-pointer pm-nav-hover"
            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.35)" }}>
            <ChevronLeft className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
          </button>
          <span className="text-[10px] sm:text-[11px] font-bold tabular-nums min-w-[20px] text-center" style={{ color: "rgba(255,255,255,0.3)" }} data-testid="carousel-counter">
            {safeIdx + 1}/{total}
          </span>
          <button onClick={() => handleGoTo(1)} data-testid="carousel-next"
            className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg flex items-center justify-center cursor-pointer pm-nav-hover"
            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.35)" }}>
            <ChevronRight className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
          </button>
        </div>
      )}

      {/* ── TOP BAR: Filter pills ── */}
      <div
        className="flex items-center px-4 sm:px-7 pt-3 sm:pt-3.5 pb-2.5 sm:pb-3 relative z-[1]"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}
        data-testid="hero-top-bar"
      >
        <div className="flex items-center gap-1.5 sm:gap-2.5 flex-wrap" style={{ opacity: 0.7 }} data-testid="hero-filter-pills">
          {pills.map(pill => (
            <button
              key={pill.key}
              onClick={() => handleFilter(pill.key)}
              data-testid={`hero-filter-${pill.key}`}
              className="flex items-center gap-1 sm:gap-1.5 rounded-full text-[11px] sm:text-[12px] font-bold pm-pill"
              style={{
                padding: "5px 9px",
                borderRadius: 999,
                background: filter === pill.key ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.02)",
                color: filter === pill.key ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.3)",
                border: `1px solid ${filter === pill.key ? "rgba(255,255,255,0.06)" : "transparent"}`,
                cursor: "pointer", fontFamily: "inherit",
              }}
            >
              {pill.label}
              <span className="pm-pill-badge" style={{
                fontSize: 9, fontWeight: 800, padding: "1px 4px", borderRadius: 5,
                background: filter === pill.key ? "rgba(255,255,255,0.10)" : "rgba(255,255,255,0.04)",
                color: filter === pill.key ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.25)",
              }}>{pill.count}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── SLIDE CONTENT ── */}
      <div className={`relative z-[1] ds-hero-content ${slideClass} px-4 sm:px-6 py-3 sm:py-4`}
      >
        <div className="flex gap-4">
        {/* LEFT: signal, headline, risk, CTA */}
        <div className="flex-1 min-w-0">

        {/* SIGNAL ROW — 1 primary + 1 merged secondary */}
        <div className="flex items-center gap-2 flex-wrap mb-2" data-testid="hero-status-row">
          <span className="ds-badge" style={{
            background: "rgba(239,68,68,0.12)",
            color: "#fca5a5",
          }} data-testid="hero-top-priority-badge">
            Top Priority
          </span>
          {(current.coachWaiting || current.timingLabel) && (
            <span className="text-[11px]" style={{ color: "rgba(255,255,255,0.35)" }} data-testid="hero-merged-signal">
              {[current.coachWaiting ? "Coach waiting" : null, current.timingLabel].filter(Boolean).join(" · ")}
            </span>
          )}
        </div>

        {/* HEADLINE — conversational action with school logo inline */}
        {!compact && (
          <div className="flex items-center gap-2.5 mb-0.5" data-testid="hero-school-row">
            {p && (
              <UniversityLogo
                name={p.university_name}
                logoUrl={ms?.logo_url || p.logo_url}
                domain={ms?.domain || p.domain}
                size={24}
                className="rounded-lg flex-shrink-0"
              />
            )}
            <h3 className="text-[16px] sm:text-[19px]" style={{ fontWeight: 700, color: "#fff", letterSpacing: "-0.03em", margin: 0, lineHeight: 1.15 }} data-testid="hero-school-name">
              {current.primaryAction || `Follow up with ${p?.university_name || "School"}`}
            </h3>
          </div>
        )}

        {/* RISK CONTEXT — elevated, right under headline */}
        <div data-testid="hero-advice-box">
          {current.riskContext && (
            <div style={{ color: "#f87171", fontSize: 12, fontWeight: 600, lineHeight: 1.4, marginTop: 2, marginBottom: 2 }} data-testid="hero-risk-context">
              {current.riskContext}
            </div>
          )}
          {/* Supporting context */}
          <div style={{ color: "rgba(255,255,255,0.40)", fontSize: 13, fontWeight: 400, lineHeight: 1.4, marginTop: 2 }} data-testid="hero-descriptive-reason">
            {(() => {
              const hr = (current.heroReason || "").trim();
              if (hr) return hr;
              if (current.tier === "high") {
                const days = p?.signals?.days_since_activity || p?.signals?.days_since_last_activity;
                return days ? `No response in ${days} day${days !== 1 ? 's' : ''}` : "Needs your attention now";
              }
              return "On track \u2014 keep momentum";
            })()}
          </div>
        </div>

        {/* META: Owner — only show when it's not the athlete's own task */}
        {ownerLabel !== 'You' && (
        <div className="mt-2 flex items-center gap-2" data-testid="hero-meta-line">
          <span className="text-[10px] font-bold px-2 py-1 rounded-md" style={{
            background: 'rgba(93,135,255,0.12)',
            color: '#8facff',
          }}>
            {ownerLabel}
          </span>
        </div>
        )}

        {/* CTA ROW */}
        <div className="flex items-center gap-4 mt-3">
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (p) {
                trackEvent("hero_action_clicked", {
                  program_id: current.programId,
                  school_name: p.university_name || "",
                  priority_source: current.prioritySource || "live",
                  recap_rank: current.recapRank || null,
                  cta_label: current.ctaLabel || "Open school",
                });
                navigate(`/pipeline/${p.program_id}`);
              }
            }}
            data-testid="hero-cta-btn"
            className="ds-btn-primary text-[12px] sm:text-[13px] py-2 px-3.5 sm:py-2 sm:px-4"
          >
            {current.coachWaiting ? "Reply to coach" : (current.ctaLabel || "Open school")} <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>
        </div>

        </div>{/* end LEFT */}

        {/* RIGHT: Vertical stage rail */}
        {!compact && rail && (
          <div className="hidden sm:flex flex-col items-start pt-1 pl-4 flex-shrink-0" style={{ borderLeft: "1px solid rgba(255,255,255,0.04)", minWidth: 130 }} data-testid="hero-progress-rail">
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(255,255,255,0.20)", marginBottom: 10 }}>
              Where you are
            </div>
            <div className="flex flex-col gap-0">
              {RAIL_STAGES.map((s, stIdx) => {
                const isActive = stIdx === activeStageIdx;
                const isPast = stIdx < activeStageIdx;
                const isLast = stIdx === RAIL_STAGES.length - 1;
                return (
                  <div key={s.key} className="flex items-start gap-2.5" data-testid={`rail-stage-${s.key}`}>
                    <div className="flex flex-col items-center" style={{ width: 12 }}>
                      <div style={{
                        width: isActive ? 10 : 6,
                        height: isActive ? 10 : 6,
                        borderRadius: "50%",
                        background: isActive ? "#2ec4b6" : isPast ? "rgba(255,255,255,0.25)" : "rgba(255,255,255,0.10)",
                        boxShadow: isActive ? "0 0 8px rgba(46,196,182,0.5)" : "none",
                        flexShrink: 0,
                        marginTop: isActive ? 3 : 5,
                      }} />
                      {!isLast && (
                        <div style={{
                          width: 1.5,
                          height: 14,
                          background: isPast ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.06)",
                        }} />
                      )}
                    </div>
                    <span style={{
                      fontSize: 12,
                      fontWeight: isActive ? 700 : 400,
                      color: isActive ? "#2ec4b6" : isPast ? "rgba(255,255,255,0.45)" : "rgba(255,255,255,0.20)",
                      lineHeight: isActive ? "16px" : "22px",
                    }}>
                      {s.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        </div>{/* end flex row */}

        {/* Carousel dot indicators */}
        {total > 1 && (
          <div style={{ display: "flex", justifyContent: "center", gap: 5, marginTop: 10, opacity: 0.5 }} data-testid="hero-carousel-dots">
            {Array.from({ length: total }).map((_, i) => (
              <button key={i} onClick={() => { setIdx(i); setFilter("all"); }} style={{
                width: i === safeIdx ? 14 : 5, height: 5, borderRadius: 3,
                background: i === safeIdx ? "rgba(255,255,255,0.5)" : "rgba(255,255,255,0.12)",
                border: "none", cursor: "pointer", padding: 0,
                transition: "all 200ms ease",
              }} />
            ))}
          </div>
        )}
      </div>
    </div>
    </>
  );
}

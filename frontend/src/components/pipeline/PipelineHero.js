/**
 * PipelineHero — Single-card carousel styled to match the Journey page header.
 *
 * Dark card (#1e1e2e), horizontal accent bar, large logo + name + badges,
 * metadata row, progress rail with labels.
 * Filter pills + carousel arrows preserved at top.
 */
import React, { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, ArrowRight, CheckCircle2, Target } from "lucide-react";
import UniversityLogo from "../UniversityLogo";
import { ProgressRail } from "../journey/ProgressRail";
import { RAIL_STAGES } from "../journey/constants";
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

/* ── Accent colors by category ── */
const CAT_ACCENT = {
  coach_flag: "#ef4444", director_action: "#ef4444", past_due: "#ef4444",
  reply_needed: "#f59e0b", due_today: "#f59e0b",
  first_outreach: "#0d9488", cooling_off: "#818cf8",
  on_track: "#0d9488",
};

/* ── Priority label mapping ── */
const PRIORITY_LABEL = {
  coach_flag: "Coach Flag", director_action: "Director Action",
  past_due: "Overdue", reply_needed: "Reply Needed", due_today: "Due Today",
  first_outreach: "First Outreach", cooling_off: "Cooling Off",
  on_track: "On Track",
};

/* ── Build rail object from program stage ── */
function buildRail(program) {
  if (!program) return null;
  const stage = program.journey_stage || program.board_group;
  const stageMap = { needs_outreach: "added", waiting_on_reply: "outreach", overdue: "outreach" };
  const active = stageMap[stage] || stage || "added";
  const activeIdx = RAIL_STAGES.findIndex(s => s.key === active);

  const stages = {};
  RAIL_STAGES.forEach((s, i) => {
    if (i < activeIdx) stages[s.key] = true;
    if (i === activeIdx) stages[s.key] = true;
  });

  return { active, stages, line_fill: active };
}

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
  const accent = CAT_ACCENT[current?.category] || "#0d9488";
  const priorityLabel = PRIORITY_LABEL[current?.category] || "";
  const rail = buildRail(p);

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
        background: "#1e1e2e",
        borderRadius: 12,
        overflow: "hidden",
        marginBottom: 20,
        border: "1px solid rgba(255,255,255,0.04)",
        position: "relative",
      }}
    >
      {/* ── Top accent bar (matching Journey header) ── */}
      <div style={{ height: 3, background: `linear-gradient(90deg, ${accent}, ${accent}88)` }} />

      <div className="px-5 sm:px-7 pt-4 pb-5" style={{ position: "relative", zIndex: 1 }}>

        {/* ═══ TOP ROW: Filter pills + Carousel nav ═══ */}
        <div
          className="flex items-center justify-between mb-4"
          data-testid="hero-top-bar"
        >
          <div className="flex items-center gap-2 flex-wrap" data-testid="hero-filter-pills">
            {pills.map((pill) => (
              <button
                key={pill.key}
                onClick={() => handleFilter(pill.key)}
                data-testid={`hero-filter-${pill.key}`}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold border transition-colors"
                style={{
                  background: filter === pill.key ? "rgba(255,255,255,0.08)" : "transparent",
                  borderColor: filter === pill.key ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.06)",
                  color: filter === pill.key ? "#fff" : "rgba(255,255,255,0.4)",
                  cursor: "pointer", fontFamily: "inherit",
                }}
              >
                {pill.label}
                <span
                  className="text-[9px] font-extrabold px-1.5 py-0.5 rounded-md"
                  style={{
                    background: filter === pill.key ? pill.countBg : "rgba(255,255,255,0.06)",
                    color: filter === pill.key ? "#fff" : "rgba(255,255,255,0.35)",
                  }}
                >{pill.count}</span>
              </button>
            ))}
          </div>
          {total > 1 && (
            <div className="flex items-center gap-2" data-testid="hero-carousel-nav">
              <button onClick={prev} data-testid="carousel-prev"
                className="w-7 h-7 rounded-lg flex items-center justify-center border transition-colors hover:bg-white/5"
                style={{ background: "rgba(255,255,255,0.04)", borderColor: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.4)", cursor: "pointer" }}>
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <span className="text-xs font-bold tabular-nums min-w-[28px] text-center" style={{ color: "rgba(255,255,255,0.4)" }} data-testid="carousel-counter">
                {safeIdx + 1}/{total}
              </span>
              <button onClick={next} data-testid="carousel-next"
                className="w-7 h-7 rounded-lg flex items-center justify-center border transition-colors hover:bg-white/5"
                style={{ background: "rgba(255,255,255,0.04)", borderColor: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.4)", cursor: "pointer" }}>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* ═══ SCHOOL IDENTITY: Logo + Name + Badges (matching Journey) ═══ */}
        {current && (
          <>
            <div className="flex items-start gap-4 mb-3">
              {p && (
                <UniversityLogo
                  name={p.university_name}
                  logoUrl={ms?.logo_url || p.logo_url}
                  domain={ms?.domain || p.domain}
                  size={48}
                  className="rounded-lg"
                />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2.5 mb-1 flex-wrap">
                  <h1
                    className="text-lg sm:text-xl font-extrabold tracking-tight truncate"
                    style={{ color: "#ffffff" }}
                    data-testid="hero-school-name"
                  >
                    {p?.university_name || "Take Action"}
                  </h1>
                  {/* Priority badge */}
                  {priorityLabel && (
                    <span
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold"
                      style={{ background: `${accent}18`, color: accent }}
                      data-testid="hero-priority-badge"
                    >
                      {priorityLabel}
                    </span>
                  )}
                  {/* Match score badge */}
                  {matchPct != null && (
                    <span
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold"
                      style={{
                        background: "rgba(255,255,255,0.06)",
                        color: matchPct >= 80 ? "#4ade80" : matchPct >= 60 ? "#fbbf24" : "#94a3b8",
                      }}
                      data-testid="hero-match-pct"
                    >
                      <Target className="w-3 h-3" /> {matchPct}% Match
                    </span>
                  )}
                </div>
                {/* Metadata row */}
                <div className="flex items-center gap-3 flex-wrap">
                  {p?.division && (
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-teal-700/20 text-teal-500">
                      {p.division}
                    </span>
                  )}
                  {p?.conference && (
                    <span className="text-[11px]" style={{ color: "rgba(255,255,255,0.5)" }}>{p.conference}</span>
                  )}
                  {p?.location && (
                    <span className="text-[11px]" style={{ color: "rgba(255,255,255,0.35)" }}>{p.location}</span>
                  )}
                </div>
              </div>
            </div>

            {/* ═══ ACTION CONTEXT: "What to do next" ═══ */}
            <div
              className="ml-16 mb-4 rounded-lg px-4 py-3"
              style={{ background: `${accent}0a`, border: `1px solid ${accent}20` }}
              data-testid="hero-advice-box"
            >
              <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: accent }}>
                What to do next
              </p>
              <p className="text-xs font-medium" style={{ color: "rgba(255,255,255,0.7)", lineHeight: 1.5 }} data-testid="hero-advice-text">
                {current.context || "Review this program and take the next step."}
              </p>
              <div className="flex gap-2 mt-3">
                <button
                  onClick={handleCTA}
                  data-testid="hero-cta-btn"
                  className="inline-flex items-center gap-1.5 px-3 h-8 rounded-md text-xs font-medium text-white transition-colors shadow-md"
                  style={{ backgroundColor: accent }}
                >
                  {current.cta?.label || "Take Action"}
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => p && navigate(`/pipeline/${p.program_id}`)}
                  data-testid="hero-secondary-cta"
                  className="inline-flex items-center gap-1.5 px-3 h-8 rounded-md text-xs font-medium transition-colors"
                  style={{ color: "rgba(255,255,255,0.6)", border: "1px solid rgba(255,255,255,0.1)" }}
                >
                  View School
                </button>
              </div>
            </div>

            {/* ═══ PROGRESS RAIL (same as Journey page) ═══ */}
            {rail && (
              <div data-testid="hero-progress-rail">
                <ProgressRail
                  rail={rail}
                  onStageClick={(stageKey) => {
                    if (p) navigate(`/pipeline/${p.program_id}`);
                  }}
                />
              </div>
            )}
          </>
        )}

        {/* ═══ FOOTER: On-track + Capacity ═══ */}
        <div style={{ marginTop: current ? 16 : 0 }}>
          {onTrackCount > 0 && (
            <div className="flex items-center gap-2 py-2" data-testid="hero-on-track-summary">
              <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "#4ade80", opacity: 0.6 }} />
              <span className="text-[11px] font-semibold" style={{ color: "rgba(255,255,255,0.3)" }}>
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
      </div>

      {/* ── No actionable items state ── */}
      {total === 0 && onTrackCount > 0 && (
        <div className="flex flex-col items-center gap-3 py-10 px-7">
          <CheckCircle2 className="w-7 h-7" style={{ color: "#4ade80" }} />
          <span className="text-base font-bold text-white">You're all clear</span>
          <span className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
            All {onTrackCount} programs are on track — nothing needs your attention.
          </span>
        </div>
      )}
    </div>
  );
}

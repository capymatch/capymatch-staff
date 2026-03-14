import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import {
  ChevronRight, ChevronLeft, Loader2,
  AlertTriangle, ArrowRight,
  Archive, RotateCcw, CheckSquare, Clock,
} from "lucide-react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { toast } from "sonner";
import UniversityLogo from "../../components/UniversityLogo";
import { RAIL_STAGES } from "../../components/journey/constants";
import { PulseIndicator } from "../../components/journey";
import { useSubscription, getUsage } from "../../lib/subscription";
import UpgradeModal from "../../components/UpgradeModal";
import OnboardingEmptyBoard from "../../components/onboarding/EmptyBoardState";
import { PipelineHealthBadge } from "../../components/PipelineHealthBadge";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(window.innerWidth < breakpoint);
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < breakpoint);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, [breakpoint]);
  return isMobile;
}

/* ═══════════════════════════════════════════ */
/* ── Helpers                                 */
/* ═══════════════════════════════════════════ */

function computeRail(journeyStage) {
  const activeIdx = journeyStage ? RAIL_STAGES.findIndex(st => st.key === journeyStage) : 0;
  const idx = activeIdx >= 0 ? activeIdx : 0;
  return RAIL_STAGES.map((st, i) => ({ ...st, state: i < idx ? "past" : i === idx ? "active" : "future" }));
}

function getDueInfo(p) {
  if (p.next_action_due) {
    const today = new Date().toISOString().split("T")[0];
    const diff = Math.ceil((new Date(p.next_action_due + "T00:00:00") - new Date(today + "T00:00:00")) / 86400000);
    if (diff < 0) return { text: `Overdue ${Math.abs(diff)}d`, color: "#dc2626", urgent: true };
    if (diff === 0) return { text: "Due today", color: "#d97706", urgent: true };
    if (diff <= 3) return { text: `Due in ${diff}d`, color: "#d97706", urgent: false };
  }
  const sig = p.signals || {};
  if (sig.days_since_activity != null && sig.days_since_activity > 0)
    return { text: `${sig.days_since_activity}d ago`, color: "#94a3b8", urgent: false };
  return null;
}

/* ── Kanban column config ── */
const KANBAN_COLS = [
  { key: "added", label: "Added", color: "#94a3b8" },
  { key: "outreach", label: "Outreach", color: "#0d9488" },
  { key: "in_conversation", label: "Talking", color: "#22c55e" },
  { key: "campus_visit", label: "Visit", color: "#3b82f6" },
  { key: "offer", label: "Offered", color: "#a855f7" },
];

function programToKanbanCol(p) {
  if (p.recruiting_status === "Committed" || p.journey_stage === "committed") return null; // shown in banner
  if (p.journey_stage === "campus_visit") return "campus_visit";
  if (p.journey_stage === "offer") return "offer";
  if (p.journey_stage === "in_conversation" || p.board_group === "in_conversation") return "in_conversation";
  if (p.journey_stage === "outreach" || p.board_group === "waiting_on_reply" || p.board_group === "overdue") return "outreach";
  return "added";
}

/* Status dot color for kanban cards */
function getStatusDot(p) {
  const due = getDueInfo(p);
  if (due?.urgent) return "#dc2626"; // red
  if (p.board_group === "overdue") return "#dc2626";
  if (p.board_group === "waiting_on_reply") return "#f59e0b"; // amber
  if (p.board_group === "in_conversation" || p.signals?.has_coach_reply) return "#22c55e"; // green
  if (p.board_group === "needs_outreach") return "#22c55e";
  return "#d1d5db"; // grey
}

/* Generate action items — now driven by topActionsMap from the Top Action Engine.
   Falls back to legacy generation when topActionsMap is empty (loading).
*/
const ALERT_CATEGORIES = {
  coach_flag:     { label: "Coach Flag",         color: "#f59e0b", bg: "rgba(245,158,11,0.12)", border: "rgba(245,158,11,0.25)", priority: 0 },
  director_action:{ label: "Director Action",    color: "#ef4444", bg: "rgba(239,68,68,0.10)",  border: "rgba(239,68,68,0.22)",  priority: 1 },
  past_due:       { label: "Past Due",           color: "#ef4444", bg: "rgba(239,68,68,0.12)",  border: "rgba(239,68,68,0.25)",  priority: 2 },
  reply_needed:   { label: "Reply Needed",       color: "#d97706", bg: "rgba(217,119,6,0.12)",  border: "rgba(217,119,6,0.25)",  priority: 3 },
  due_today:      { label: "Due Today",          color: "#d97706", bg: "rgba(217,119,6,0.10)",  border: "rgba(217,119,6,0.22)",  priority: 4 },
  first_outreach: { label: "First Outreach",     color: "#3b82f6", bg: "rgba(59,130,246,0.10)", border: "rgba(59,130,246,0.22)", priority: 5 },
  cooling_off:    { label: "Re-engage",          color: "#fb923c", bg: "rgba(251,146,60,0.10)", border: "rgba(251,146,60,0.22)", priority: 6 },
  on_track:       { label: "On Track",           color: "#22c55e", bg: "rgba(34,197,94,0.10)",  border: "rgba(34,197,94,0.22)",  priority: 7 },
};

function generateActions(programs, matchScores, tasks, healthMap, topActionsMap) {
  const active = programs.filter(p =>
    p.board_group !== "archived" && p.recruiting_status !== "Committed" && p.journey_stage !== "committed"
  );

  // If top actions available, use them (skip "on_track" for hero)
  if (topActionsMap && Object.keys(topActionsMap).length > 0) {
    const alerts = [];
    for (const p of active) {
      const ta = topActionsMap[p.program_id];
      if (!ta || ta.action_key === "no_action_needed") continue;
      alerts.push({
        id: p.program_id,
        type: "school",
        program: p,
        category: ta.category,
        title: `${p.university_name} — ${ta.label}`,
        context: ta.explanation,
        owner: ta.owner,
        cta: { label: ta.cta_label, style: ta.priority <= 3 ? "warn" : "primary" },
        matchScore: matchScores[p.program_id],
        due: getDueInfo(p),
        priority: ta.priority,
      });
    }
    alerts.sort((a, b) => a.priority - b.priority);
    return alerts;
  }

  // Legacy fallback (during loading)
  const seen = new Set();
  const alerts = [];

  for (const p of active) {
    const due = getDueInfo(p);
    if (due?.color === "#dc2626") {
      seen.add(p.program_id);
      const days = p.next_action_due ? Math.abs(Math.ceil((new Date(p.next_action_due + "T00:00:00") - new Date()) / 86400000)) : null;
      alerts.push({
        id: p.program_id, type: "school", program: p, category: "past_due",
        title: `Follow up with ${p.university_name}`,
        context: days ? `Overdue by ${days} day${days !== 1 ? "s" : ""}. A short follow-up keeps momentum going.` : "This follow-up is overdue.",
        cta: { label: "Follow Up", style: "warn" },
        matchScore: matchScores[p.program_id], due,
      });
    }
  }
  for (const p of active) {
    if (seen.has(p.program_id)) continue;
    if (p.board_group === "needs_outreach") {
      seen.add(p.program_id);
      alerts.push({
        id: p.program_id, type: "school", program: p, category: "first_outreach",
        title: `Send intro email to ${p.university_name}`,
        context: "This school is on your board but hasn't been contacted yet.",
        cta: { label: "Start Outreach", style: "primary" },
        matchScore: matchScores[p.program_id], due: getDueInfo(p),
      });
    }
  }
  return alerts;
}


/* ═══════════════════════════════════════════ */
/* ── Hero Card = Actions Carousel           ── */
/* ═══════════════════════════════════════════ */
function HeroActionsCarousel({ actions, matchScores, navigate, schoolPct, usage, aiUsage }) {
  const [idx, setIdx] = useState(0);
  const [filter, setFilter] = useState("all");
  const [seenCategories, setSeenCategories] = useState(new Set(["all"]));
  const heroRef = useRef(null);
  const callbacksRef = useRef({ prev: null, next: null, cta: null });

  const handleFilter = (key) => {
    setFilter(key);
    setSeenCategories(prev => new Set([...prev, key]));
  };

  const filtered = useMemo(() => {
    if (filter === "all") return actions;
    return actions.filter(a => a.category === filter);
  }, [actions, filter]);

  const total = filtered.length;
  const prevFilter = React.useRef(filter);
  useEffect(() => { if (prevFilter.current !== filter) { setIdx(0); prevFilter.current = filter; } }, [filter]);

  // Keyboard shortcuts: Arrow keys to navigate, Enter to execute CTA
  useEffect(() => {
    const handleKey = (e) => {
      const tag = document.activeElement?.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea" || tag === "select") return;
      const cb = callbacksRef.current;
      if (e.key === "ArrowLeft" && cb.prev) { e.preventDefault(); cb.prev(); }
      else if (e.key === "ArrowRight" && cb.next) { e.preventDefault(); cb.next(); }
      else if (e.key === "Enter" && cb.cta) { e.preventDefault(); cb.cta(); }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  if (actions.length === 0) return null;

  const displayActions = total > 0 ? filtered : actions;
  const displayTotal = displayActions.length;
  const safeIdx = Math.min(idx, Math.max(0, displayTotal - 1));
  const prev = () => setIdx(i => (i - 1 + displayTotal) % displayTotal);
  const next = () => setIdx(i => (i + 1) % displayTotal);
  const action = displayActions[safeIdx];
  if (!action) return null;

  const isSchool = action.type === "school";
  const p = action.program;
  const ms = isSchool ? (action.matchScore || matchScores[p?.program_id]) : null;
  const matchPct = ms?.match_score ?? action.match_score;
  const advice = action.context;
  const stages = isSchool ? computeRail(p.journey_stage || (p.board_group === "needs_outreach" ? "added" : "outreach")) : null;
  const stageLabels = { added: "Added", outreach: "Outreach", in_conversation: "Talking", campus_visit: "Visit", offer: "Offer", committed: "Committed" };
  const cat = ALERT_CATEGORIES[action.category] || ALERT_CATEGORIES.past_due;
  const isUrgent = action.priority <= 3;

  const handleCTA = () => {
    if (action.type === "growth") navigate("/schools");
    else if (p) navigate(`/pipeline/${p.program_id}`);
  };

  // Keep refs up to date for keyboard handler
  callbacksRef.current = { prev, next, cta: handleCTA };

  const catCounts = {};
  for (const a of actions) { catCounts[a.category] = (catCounts[a.category] || 0) + 1; }

  const FILTER_PILLS = [
    { key: "all", label: "All", count: actions.length },
    { key: "coach_flag", label: "Coach Flags" },
    { key: "director_action", label: "Director" },
    { key: "past_due", label: "Past Due" },
    { key: "reply_needed", label: "Reply Needed" },
    { key: "due_today", label: "Due Today" },
    { key: "first_outreach", label: "First Outreach" },
    { key: "cooling_off", label: "Re-engage" },
  ].filter(pill => pill.key === "all" || (catCounts[pill.key] || 0) > 0)
   .map(pill => ({ ...pill, count: pill.key === "all" ? actions.length : catCounts[pill.key] || 0 }));

  // Owner badge config
  const owColors = { athlete: "#5eead4", parent: "#a78bfa", coach: "#fbbf24", shared: "#93c5fd" };
  const oc = owColors[action.owner] || "rgba(255,255,255,0.5)";

  return (
    <div ref={heroRef} tabIndex={-1} style={{ background: "linear-gradient(145deg, #1a2332 0%, #0f1a26 100%)", borderRadius: 14, overflow: "hidden", position: "relative", border: "1px solid rgba(255,255,255,0.04)", outline: "none" }} data-testid="pipeline-hero-card">
      {/* Accent bar — thicker for urgent */}
      <div style={{ height: isUrgent ? 4 : 3, background: `linear-gradient(90deg, ${cat.color}, ${cat.color}66)` }} />
      {/* Ambient glow — stronger for urgent */}
      <div style={{ position: "absolute", top: "-30%", right: "-5%", width: 350, height: 350, background: `radial-gradient(circle, ${cat.color}${isUrgent ? "18" : "0a"} 0%, transparent 70%)`, pointerEvents: "none" }} />

      <div style={{ padding: "20px 24px 0", position: "relative", zIndex: 1 }} className="pipeline-hero-card">
        {/* Filter pills */}
        {FILTER_PILLS.length > 2 && (
          <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 16 }} data-testid="hero-filter-pills">
            {FILTER_PILLS.map(pill => {
              const URGENT_CATS = new Set(["past_due", "due_today", "coach_flag"]);
              const shouldPulse = pill.key !== "all" && URGENT_CATS.has(pill.key) && pill.count > 0 && !seenCategories.has(pill.key);
              const pillCat = ALERT_CATEGORIES[pill.key];
              return (
              <button
                key={pill.key}
                onClick={() => handleFilter(pill.key)}
                data-testid={`hero-filter-${pill.key}`}
                style={{
                  padding: "4px 10px", borderRadius: 20, fontSize: 10, fontWeight: 700,
                  cursor: "pointer", transition: "all 0.15s", border: "1px solid", fontFamily: "inherit",
                  background: filter === pill.key ? "rgba(13,148,136,0.15)" : "rgba(255,255,255,0.04)",
                  borderColor: filter === pill.key ? "rgba(13,148,136,0.35)" : "rgba(255,255,255,0.08)",
                  color: filter === pill.key ? "#5eead4" : "rgba(255,255,255,0.4)",
                  display: "flex", alignItems: "center", gap: 5, position: "relative",
                }}
              >
                {shouldPulse && (
                  <span style={{ position: "relative", width: 6, height: 6, flexShrink: 0 }}>
                    <span style={{ position: "absolute", inset: 0, borderRadius: "50%", background: pillCat?.color || "#ef4444" }} />
                    <span style={{ position: "absolute", inset: -2, borderRadius: "50%", border: `1.5px solid ${pillCat?.color || "#ef4444"}`, animation: "pillPulse 2s ease-out infinite", pointerEvents: "none" }} data-testid={`pill-pulse-${pill.key}`} />
                  </span>
                )}
                {pill.label}
                <span style={{ fontSize: 9, fontWeight: 800, padding: "1px 5px", borderRadius: 8, background: filter === pill.key ? "rgba(13,148,136,0.25)" : "rgba(255,255,255,0.06)", color: filter === pill.key ? "#5eead4" : "rgba(255,255,255,0.3)" }}>{pill.count}</span>
              </button>
              );
            })}
          </div>
        )}

        {/* ── Category label + Carousel nav ── */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", color: cat.color }}>{cat.label}</span>
            <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 7px", borderRadius: 6, background: `${oc}15`, color: oc, textTransform: "uppercase", letterSpacing: "0.04em" }}>{action.owner}</span>
            <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 7px", borderRadius: 6, background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.35)", border: "1px solid rgba(255,255,255,0.06)" }}>{safeIdx + 1}/{displayTotal}</span>
          </div>
          {displayTotal > 1 && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
              <button onClick={prev} style={{ width: 26, height: 26, borderRadius: 7, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "rgba(255,255,255,0.4)" }} data-testid="carousel-prev"><ChevronLeft style={{ width: 13, height: 13 }} /></button>
              <div style={{ display: "flex", gap: 3 }}>
                {displayActions.slice(0, 12).map((a, i) => {
                  const aCat = ALERT_CATEGORIES[a.category] || ALERT_CATEGORIES.past_due;
                  return (
                    <div key={i} onClick={() => setIdx(i)} style={{
                      width: i === safeIdx ? 16 : 5, height: 5,
                      borderRadius: i === safeIdx ? 3 : "50%",
                      background: i === safeIdx ? aCat.color : "rgba(255,255,255,0.15)",
                      cursor: "pointer", transition: "all 0.2s",
                    }} data-testid={`carousel-dot-${i}`} />
                  );
                })}
                {displayActions.length > 12 && <span style={{ fontSize: 8, color: "rgba(255,255,255,0.25)", lineHeight: "5px" }}>+{displayActions.length - 12}</span>}
              </div>
              <button onClick={next} style={{ width: 26, height: 26, borderRadius: 7, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "rgba(255,255,255,0.4)" }} data-testid="carousel-next"><ChevronRight style={{ width: 13, height: 13 }} /></button>
            </div>
          )}
        </div>

        {/* ── School-First Layout (matching reference design) ── */}
        {/* Row 1: Logo + School Name (left) | Progress Rail (right) */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 24, marginBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, flex: 1, minWidth: 0 }}>
            {isSchool && p && (
              <UniversityLogo domain={p.domain} name={p.university_name} logoUrl={ms?.logo_url} size={52} className="rounded-[10px] flex-shrink-0" />
            )}
            <h2 style={{ fontSize: 26, fontWeight: 800, color: "#fff", letterSpacing: -0.5, lineHeight: 1.2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} data-testid="hero-school-name">
              {isSchool && p ? p.university_name : (action.cta?.label || "Take Action")}
            </h2>
          </div>
          {/* Progress Rail — large, with labels */}
          {isSchool && stages && (
            <div style={{ display: "flex", alignItems: "center", gap: 0, flexShrink: 0 }} className="hidden sm:flex" data-testid="hero-progress-rail">
              {stages.map((s, i) => {
                const stageColors = { past: "#94a3b8", active: { added: "#94a3b8", outreach: "#0d9488", in_conversation: "#22c55e", campus_visit: "#3b82f6", offer: "#a855f7", committed: "#0d9488" }[s.key] || "#0d9488", future: "transparent" };
                const dotColor = s.state === "active" ? stageColors.active : s.state === "past" ? stageColors.past : stageColors.future;
                const lineActive = s.state === "past" || (stages[i - 1]?.state === "past" && s.state === "active");
                return (
                  <React.Fragment key={s.key}>
                    {i > 0 && <div style={{ width: 28, height: 2, background: lineActive ? "rgba(255,255,255,0.25)" : "rgba(255,255,255,0.08)" }} />}
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                      <div style={{ position: "relative" }}>
                        <div style={{
                          width: s.state === "active" ? 18 : 10,
                          height: s.state === "active" ? 18 : 10,
                          borderRadius: "50%",
                          background: s.state === "future" ? "transparent" : dotColor,
                          border: s.state === "future" ? "1.5px solid rgba(255,255,255,0.15)" : s.state === "active" ? `3px solid ${dotColor}44` : "none",
                          boxShadow: s.state === "active" ? `0 0 12px ${dotColor}50` : "none",
                        }} />
                        {s.state === "active" && <div style={{ position: "absolute", inset: -4, borderRadius: "50%", border: `1.5px solid ${dotColor}40`, animation: "heroPulse 2s ease-out infinite", pointerEvents: "none" }} />}
                      </div>
                      <span style={{ fontSize: 9, fontWeight: s.state === "active" ? 700 : 500, color: s.state === "active" ? dotColor : "rgba(255,255,255,0.3)", textTransform: "capitalize", whiteSpace: "nowrap" }}>
                        {stageLabels[s.key] || s.label}
                      </span>
                    </div>
                  </React.Fragment>
                );
              })}
            </div>
          )}
        </div>

        {/* Row 2: Metadata badges + social */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
          <PulseIndicator pulse={stages?.find(s => s.state === "active")?.pulse || "neutral"} />
          {isSchool && p?.division && (
            <span style={{ padding: "2px 8px", borderRadius: 4, fontSize: 10, fontWeight: 700, background: "rgba(13,148,136,0.2)", color: "#5eead4" }}>{p.division}</span>
          )}
          {matchPct != null && (
            <span style={{ padding: "2px 8px", borderRadius: 4, fontSize: 10, fontWeight: 700, background: "rgba(255,255,255,0.06)", color: matchPct >= 80 ? "#4ade80" : matchPct >= 60 ? "#fbbf24" : "#94a3b8" }}>
              {matchPct}% Match
            </span>
          )}
          {isSchool && p?.conference && (
            <span style={{ fontSize: 11, fontWeight: 500, color: "rgba(255,255,255,0.4)" }}>{p.conference}</span>
          )}
          {isSchool && p?.social_links && typeof p.social_links === "object" && Object.keys(p.social_links).length > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginLeft: 4 }}>
              {Object.entries(p.social_links).slice(0, 4).map(([platform, url]) => (
                <a key={platform} href={url} target="_blank" rel="noopener noreferrer" style={{ color: "rgba(255,255,255,0.3)", display: "flex" }} title={platform}>
                  {platform === "twitter" ? <span style={{ fontSize: 12, fontWeight: 700 }}>𝕏</span>
                    : platform === "instagram" ? <span style={{ fontSize: 11 }}>◎</span>
                    : platform === "facebook" ? <span style={{ fontSize: 11 }}>ⓕ</span>
                    : <span style={{ fontSize: 10 }}>{platform[0].toUpperCase()}</span>}
                </a>
              ))}
            </div>
          )}
        </div>

        {/* Row 3: "What to do next" advice box + CTA */}
        <div style={{ display: "flex", alignItems: "stretch", gap: 16, marginBottom: 4 }}>
          <div style={{ flex: 1, padding: "14px 18px", borderRadius: 10, border: "1px solid rgba(13,148,136,0.2)", background: "rgba(13,148,136,0.04)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
              <span style={{ fontSize: 14, color: "rgba(255,255,255,0.3)" }}>💡</span>
              <span style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.5)" }}>What to do next</span>
            </div>
            <p style={{ fontSize: 13, fontWeight: 500, color: "rgba(255,255,255,0.65)", lineHeight: 1.5, margin: 0 }} data-testid="hero-advice-text">
              {advice || "Keep the momentum going with this program."}
            </p>
          </div>
          <button onClick={handleCTA} style={{
            padding: "14px 28px", borderRadius: 10, border: "none",
            background: "#0d9488", color: "#fff",
            fontSize: 14, fontWeight: 700, cursor: "pointer", display: "flex",
            alignItems: "center", justifyContent: "center", gap: 8, fontFamily: "inherit",
            transition: "all 0.2s", flexShrink: 0, minWidth: 130,
            boxShadow: "0 4px 16px rgba(13,148,136,0.3)",
          }} data-testid="hero-cta-btn">
            <ArrowRight style={{ width: 16, height: 16 }} />
            {action.cta.label}
          </button>
        </div>
      </div>

      {/* Usage bar */}
      <div style={{ padding: "8px 24px 12px", display: "flex", alignItems: "center", gap: 10, position: "relative", zIndex: 1 }} className="pipeline-hero-card" data-testid="hero-usage-bar">
        <span style={{ fontSize: 10, fontWeight: 600, color: schoolPct >= 1 ? "rgba(245,158,11,0.8)" : "rgba(255,255,255,0.25)" }} data-testid="hero-school-usage">
          {usage.unlimited ? `${usage.used} schools` : `${usage.used}/${usage.limit} schools`}
        </span>
        {!aiUsage.unlimited && aiUsage.limit > 0 && (
          <>
            <span style={{ width: 3, height: 3, borderRadius: "50%", background: "rgba(255,255,255,0.1)" }} />
            <span style={{ fontSize: 10, fontWeight: 600, color: "rgba(255,255,255,0.25)" }} data-testid="hero-ai-usage">
              {aiUsage.limit - aiUsage.used} AI drafts left
            </span>
          </>
        )}
        {aiUsage.limit === 0 && (
          <>
            <span style={{ width: 3, height: 3, borderRadius: "50%", background: "rgba(255,255,255,0.1)" }} />
            <span style={{ fontSize: 10, fontWeight: 600, color: "rgba(255,255,255,0.2)" }} data-testid="hero-ai-usage">
              AI drafts: Pro
            </span>
          </>
        )}
        {displayTotal > 1 && (
          <span className="hidden md:inline-flex" style={{ marginLeft: "auto", fontSize: 9, fontWeight: 600, color: "rgba(255,255,255,0.18)", display: "inline-flex", alignItems: "center", gap: 4 }} data-testid="keyboard-hint">
            <kbd style={{ padding: "1px 4px", borderRadius: 3, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)", fontSize: 8, lineHeight: "12px" }}>&larr;</kbd>
            <kbd style={{ padding: "1px 4px", borderRadius: 3, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)", fontSize: 8, lineHeight: "12px" }}>&rarr;</kbd>
            <span style={{ marginLeft: 2 }}>navigate</span>
            <span style={{ margin: "0 2px", color: "rgba(255,255,255,0.1)" }}>|</span>
            <kbd style={{ padding: "1px 4px", borderRadius: 3, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)", fontSize: 8, lineHeight: "12px" }}>Enter</kbd>
            <span style={{ marginLeft: 2 }}>open</span>
          </span>
        )}
      </div>
    </div>
  );
}


/* ═══════════════════════════════════════════ */
/* ── Upcoming Tasks (due in 1-3 days)       ── */
/* ═══════════════════════════════════════════ */

function UpcomingTasksSection({ tasks, navigate }) {
  if (!tasks || tasks.length === 0) return null;

  const systemTasks = tasks.filter(t => t.source !== "coach");
  if (systemTasks.length === 0) return null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 20 }}>
      {/* System Tasks */}
      {systemTasks.length > 0 && (
        <div style={{ background: "var(--cm-surface)", border: "1px solid var(--cm-border)", borderRadius: 10, padding: "16px 20px" }} data-testid="upcoming-tasks">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 700, color: "var(--cm-text)" }}>
              <CheckSquare style={{ width: 15, height: 15, color: "#3b82f6" }} /> Upcoming Tasks
            </div>
            <span style={{ fontSize: 11, fontWeight: 600, color: "var(--cm-text-3)" }}>{systemTasks.length} coming up</span>
          </div>
          {systemTasks.map((task) => (
            <div
              key={task.task_id}
              onClick={() => navigate(task.link)}
              style={{
                display: "flex", alignItems: "center", gap: 12,
                padding: "10px 0", borderTop: "1px solid var(--cm-border)",
                cursor: "pointer",
              }}
              data-testid={`task-item-${task.task_id}`}
            >
              <div style={{
                width: 28, height: 28, borderRadius: 7,
                background: "rgba(59,130,246,0.1)", display: "flex",
                alignItems: "center", justifyContent: "center", flexShrink: 0,
              }}>
                <Clock style={{ width: 14, height: 14, color: "#3b82f6" }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "var(--cm-text)", lineHeight: 1.4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{task.title}</div>
                <div style={{ fontSize: 11, color: "var(--cm-text-3)", marginTop: 1 }}>{task.description}</div>
              </div>
              <span style={{
                fontSize: 10, fontWeight: 700, padding: "2px 8px",
                borderRadius: 5, background: "rgba(59,130,246,0.1)", color: "#3b82f6",
                flexShrink: 0,
              }}>In {task.days_diff}d</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


/* ═══════════════════════════════════════════ */
/* ── Pro Kanban Board (Drag & Drop)         ── */
/* ═══════════════════════════════════════════ */
const DIV_TAG_STYLES = {
  D1: { bg: "#e0f2fe", color: "#0369a1" },
  D2: { bg: "#dcfce7", color: "#15803d" },
  D3: { bg: "#fef3c7", color: "#92400e" },
};

const COL_TO_STAGE = {
  added: { journey_stage: "added", recruiting_status: "Not Contacted" },
  outreach: { journey_stage: "outreach", recruiting_status: "Contacted" },
  in_conversation: { journey_stage: "in_conversation", recruiting_status: "In Conversation" },
  campus_visit: { journey_stage: "campus_visit", recruiting_status: "Campus Visit" },
  offer: { journey_stage: "offer", recruiting_status: "Offer" },
};

const OWNER_STYLES = {
  athlete: { bg: "rgba(13,148,136,0.1)", color: "#0d9488", label: "Athlete" },
  parent:  { bg: "rgba(139,92,246,0.1)", color: "#8b5cf6", label: "Parent" },
  coach:   { bg: "rgba(245,158,11,0.1)", color: "#d97706", label: "Coach" },
  shared:  { bg: "rgba(59,130,246,0.1)", color: "#3b82f6", label: "Shared" },
};

function KanbanCard({ program: p, matchScore, navigate, index, healthMetrics, topAction }) {
  const due = getDueInfo(p);
  const hasUrgent = due?.urgent && due?.color === "#dc2626";
  const ownerStyle = topAction ? (OWNER_STYLES[topAction.owner] || OWNER_STYLES.athlete) : null;
  const showAction = topAction && topAction.action_key !== "no_action_needed";

  return (
    <Draggable draggableId={p.program_id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          onClick={() => navigate(`/pipeline/${p.program_id}`)}
          className="kanban-card"
          style={{
            background: "var(--cm-surface)", borderRadius: 2,
            padding: "14px 14px 12px", cursor: "grab", transition: "box-shadow 0.15s ease",
            boxShadow: snapshot.isDragging ? "0 8px 24px rgba(0,0,0,0.12)" : undefined,
            opacity: snapshot.isDragging ? 0.95 : 1,
            ...provided.draggableProps.style,
          }}
          data-testid={`kanban-card-${p.program_id}`}
        >
          <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
            <UniversityLogo domain={p.domain} name={p.university_name} logoUrl={p.logo_url} size={28} className="rounded-[6px] mt-[2px] flex-shrink-0" />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "var(--cm-text)", lineHeight: 1.35 }}>{p.university_name}</div>
                {hasUrgent && <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#ef4444", flexShrink: 0, marginTop: 5 }} />}
              </div>
              <div style={{ fontSize: 11, color: "var(--cm-text-3)", marginTop: 2 }}>{[p.division, p.conference].filter(Boolean).join(" · ")}</div>
              {healthMetrics && (
                <div style={{ marginTop: 5 }}>
                  <PipelineHealthBadge metrics={healthMetrics} variant="compact" />
                </div>
              )}
            </div>
          </div>
          {showAction && (
            <div style={{ marginTop: 8, padding: "8px 10px", borderRadius: 8, background: "var(--cm-surface-2)", border: "1px solid var(--cm-border)" }} data-testid={`top-action-${p.program_id}`}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: "var(--cm-text)" }}>{topAction.label}</span>
                <span style={{ fontSize: 9, fontWeight: 700, padding: "1px 6px", borderRadius: 4, background: ownerStyle.bg, color: ownerStyle.color, textTransform: "uppercase", letterSpacing: "0.05em" }} data-testid={`owner-${p.program_id}`}>{ownerStyle.label}</span>
              </div>
              <div style={{ fontSize: 10, color: "var(--cm-text-3)", marginTop: 3, lineHeight: 1.4 }}>{topAction.explanation}</div>
            </div>
          )}
        </div>
      )}
    </Draggable>
  );
}

function KanbanBoard({ programs, matchScores, navigate, onDragEnd, healthMap, topActionsMap }) {
  const isMobile = useIsMobile();
  const columns = {};
  KANBAN_COLS.forEach(c => { columns[c.key] = []; });
  for (const p of programs) {
    if (p.board_group === "archived") continue;
    const col = programToKanbanCol(p);
    if (col && columns[col]) columns[col].push(p);
  }

  const gridStyle = isMobile
    ? { display: "flex", gap: 10, overflowX: "auto", WebkitOverflowScrolling: "touch", scrollSnapType: "x mandatory", paddingBottom: 8 }
    : { display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 14 };

  const colStyle = isMobile ? { minWidth: 240, flexShrink: 0, scrollSnapAlign: "start" } : {};

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div style={gridStyle} className="kanban-grid" data-testid="kanban-board">
        {KANBAN_COLS.map(col => (
          <Droppable droppableId={col.key} key={col.key}>
            {(provided, snapshot) => (
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                style={{
                  background: snapshot.isDraggingOver ? "var(--cm-surface-3, var(--cm-surface-2))" : "var(--cm-surface-2)",
                  borderRadius: 4, minHeight: 200, overflow: "hidden",
                  transition: "background 0.2s ease",
                  outline: snapshot.isDraggingOver ? "2px dashed rgba(13,148,136,0.3)" : "none",
                  ...colStyle,
                }}
              >
                <div style={{ height: 3, background: col.color }} />
                <div style={{ padding: "14px 14px 10px", display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--cm-text-2)" }}>{col.label}</span>
                  <span style={{ fontSize: 11, fontWeight: 600, color: "var(--cm-text-4)" }}>{columns[col.key].length}</span>
                </div>
                <div style={{ padding: "0 8px 10px", display: "flex", flexDirection: "column", gap: 6, minHeight: 60 }}>
                  {columns[col.key].length > 0 ? (
                    columns[col.key].map((p, idx) => <KanbanCard key={p.program_id} program={p} matchScore={matchScores[p.program_id]} navigate={navigate} index={idx} healthMetrics={healthMap[p.program_id]} topAction={topActionsMap[p.program_id]} />)
                  ) : (
                    <div style={{ padding: "30px 14px", textAlign: "center", fontSize: 12, color: "var(--cm-text-4)", fontWeight: 500 }}>No schools yet</div>
                  )}
                  {provided.placeholder}
                </div>
              </div>
            )}
          </Droppable>
        ))}
      </div>
    </DragDropContext>
  );
}


/* ═══════════════════════════════════════════ */
/* ── Guidance Banner                        ── */
/* ═══════════════════════════════════════════ */
function MeasurablesGuidanceBanner({ guidance, navigate }) {
  if (!guidance) return null;
  return (
    <div style={{ background: "var(--cm-surface)", border: "1px solid rgba(245,158,11,0.2)", borderLeft: "3px solid #f59e0b", borderRadius: 12, padding: "14px 18px", display: "flex", alignItems: "center", gap: 14, marginBottom: 16 }} data-testid="measurables-guidance-banner">
      <div style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(245,158,11,0.1)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <AlertTriangle style={{ width: 16, height: 16, color: "#f59e0b" }} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "var(--cm-text)", marginBottom: 2 }}>Improve your match accuracy</div>
        <div style={{ fontSize: 11, color: "var(--cm-text-3)", lineHeight: 1.5 }}>{guidance}</div>
      </div>
      <button onClick={() => navigate("/profile")} style={{ padding: "8px 16px", borderRadius: 8, fontSize: 11, fontWeight: 700, background: "rgba(245,158,11,0.1)", color: "#f59e0b", border: "1px solid rgba(245,158,11,0.2)", cursor: "pointer", fontFamily: "inherit", flexShrink: 0 }} data-testid="update-profile-btn">Update Profile</button>
    </div>
  );
}


/* ═══════════════════════════════════════════ */
/* ── Committed Banner                       ── */
/* ═══════════════════════════════════════════ */
function CommittedBanner({ programs, navigate }) {
  if (programs.length === 0) return null;
  return (
    <div style={{ marginBottom: 16 }} data-testid="committed-banner">
      {programs.map(p => (
        <div key={p.program_id} onClick={() => navigate(`/pipeline/${p.program_id}`)} style={{
          background: "linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)",
          borderRadius: 10, padding: "18px 24px", cursor: "pointer",
          display: "flex", alignItems: "center", gap: 16, marginBottom: 8,
        }} data-testid={`committed-card-${p.program_id}`}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: "rgba(255,255,255,0.25)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <UniversityLogo domain={p.domain} name={p.university_name} size={32} className="rounded-[8px]" />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "rgba(255,255,255,0.7)", marginBottom: 2 }}>Committed</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: "#fff" }}>{p.university_name}</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {p.division && <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 6, background: "rgba(255,255,255,0.2)", color: "#fff" }}>{p.division}</span>}
            <ChevronRight style={{ width: 18, height: 18, color: "rgba(255,255,255,0.6)" }} />
          </div>
        </div>
      ))}
    </div>
  );
}


/* ═══════════════════════════════════════════ */
/* ── Styles + Empty State                   ── */
/* ═══════════════════════════════════════════ */
function PipelineStyles() {
  return (
    <style>{`
      @keyframes heroPulse { 0%{opacity:1;transform:scale(1)} 100%{opacity:0;transform:scale(2.2)} }
      @keyframes pillPulse { 0%{opacity:0.8;transform:scale(1)} 50%{opacity:0.4;transform:scale(1.8)} 100%{opacity:0;transform:scale(2.5)} }
      .kanban-card:hover { box-shadow: 0 4px 12px rgba(0,0,0,0.06); }
      .kanban-grid::-webkit-scrollbar { height: 4px; }
      .kanban-grid::-webkit-scrollbar-thumb { background: var(--cm-border); border-radius: 4px; }
      @media (max-width: 768px) {
        .kanban-grid {
          display: flex !important;
          grid-template-columns: none !important;
          overflow-x: auto !important;
          -webkit-overflow-scrolling: touch !important;
          scroll-snap-type: x mandatory !important;
          gap: 10px !important;
          padding-bottom: 8px !important;
        }
        .kanban-grid > div {
          min-width: 240px !important;
          flex-shrink: 0 !important;
          scroll-snap-align: start !important;
        }
        .pipeline-hero-card { padding: 14px 14px 0 !important; }
        .hero-advice-row { flex-wrap: wrap !important; }
        .hero-advice-row button { flex: 1 !important; min-width: 120px !important; }
        .pipeline-events-row { flex-direction: column !important; gap: 8px !important; }
      }
    `}</style>
  );
}

/* EmptyBoardState replaced by onboarding/EmptyBoardState component */


/* ═══════════════════════════════════════════ */
/* ── Main Page                              ── */
/* ═══════════════════════════════════════════ */
export default function PipelinePage() {
  const [allPrograms, setAllPrograms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [matchScores, setMatchScores] = useState({});
  const [tasks, setTasks] = useState([]);
  const [healthMap, setHealthMap] = useState({});
  const [topActionsMap, setTopActionsMap] = useState({});
  const [collapsedArchived, setCollapsedArchived] = useState(true);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const navigate = useNavigate();
  const { subscription, refresh: refreshSub } = useSubscription();

  const fetchPrograms = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/athlete/programs`);
      setAllPrograms(Array.isArray(res.data) ? res.data : []);
    } catch { toast.error("Failed to load programs"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchPrograms(); }, [fetchPrograms]);
  useEffect(() => {
    axios.get(`${API}/match-scores`).then(res => {
      const byId = {};
      (res.data?.scores || []).forEach(s => { byId[s.program_id] = s; });
      setMatchScores(byId);
    }).catch(() => {});
  }, [allPrograms.length]);
  useEffect(() => { axios.get(`${API}/athlete/tasks`).then(res => setTasks(res.data?.tasks || [])).catch(() => {}); }, [allPrograms.length]);

  // Fetch pipeline health metrics in batch
  useEffect(() => {
    const ids = allPrograms.map(p => p.program_id).filter(Boolean);
    if (ids.length === 0) return;
    axios.post(`${API}/internal/programs/batch-metrics`, { program_ids: ids })
      .then(res => {
        const m = res.data?.metrics || {};
        const mapped = {};
        for (const [pid, data] of Object.entries(m)) {
          mapped[pid] = { ...data, program_id: pid };
        }
        setHealthMap(mapped);
      })
      .catch(() => {});
  }, [allPrograms.length]);

  // Fetch top actions
  useEffect(() => {
    if (allPrograms.length === 0) return;
    axios.get(`${API}/internal/programs/top-actions`)
      .then(res => {
        const map = {};
        (res.data?.actions || []).forEach(a => { map[a.program_id] = a; });
        setTopActionsMap(map);
      })
      .catch(() => {});
  }, [allPrograms.length]);

  /* ── Drag & Drop handler ── */
  const handleDragEnd = useCallback(async (result) => {
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId) return;

    const newCol = destination.droppableId;
    const stageUpdate = COL_TO_STAGE[newCol];
    if (!stageUpdate) return;

    // Optimistic update
    setAllPrograms(prev => prev.map(p =>
      p.program_id === draggableId
        ? { ...p, journey_stage: stageUpdate.journey_stage, recruiting_status: stageUpdate.recruiting_status }
        : p
    ));

    try {
      await axios.put(`${API}/athlete/programs/${draggableId}`, stageUpdate);
      toast.success(`Moved to ${KANBAN_COLS.find(c => c.key === newCol)?.label || newCol}`);
    } catch {
      toast.error("Failed to update stage");
      fetchPrograms(); // revert
    }
  }, [fetchPrograms]);

  /* ── Add school with limit check ── */
  const handleAddSchool = useCallback(() => {
    if (!subscription) { navigate("/schools"); return; }
    const usage = getUsage(subscription, "schools");
    if (!usage.unlimited && usage.remaining !== undefined && usage.remaining <= 0) {
      setShowUpgrade(true);
      return;
    }
    navigate("/schools");
  }, [subscription, navigate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24" data-testid="board-loading">
        <div className="flex flex-col items-center gap-3"><Loader2 className="w-8 h-8 animate-spin" style={{ color: "#999" }} /><span className="text-sm" style={{ color: "#999" }}>Loading your board...</span></div>
      </div>
    );
  }

  const activePrograms = allPrograms.filter(p => p.board_group !== "archived");
  const archivedPrograms = allPrograms.filter(p => p.board_group === "archived");
  const committedPrograms = allPrograms.filter(p => p.recruiting_status === "Committed" || p.journey_stage === "committed");

  if (activePrograms.length === 0 && archivedPrograms.length === 0) {
    return <div style={{ maxWidth: 1120, margin: "0 auto" }}><PipelineStyles /><OnboardingEmptyBoard onSchoolAdded={fetchPrograms} /></div>;
  }

  const actions = generateActions(allPrograms, matchScores, tasks, healthMap, topActionsMap);
  const guidance = Object.values(matchScores).find(s => s.confidence_guidance)?.confidence_guidance;
  const usage = getUsage(subscription, "schools");
  const aiUsage = getUsage(subscription, "ai_drafts");
  const schoolPct = usage.limit > 0 && !usage.unlimited ? usage.used / usage.limit : 0;
  const nearLimit = schoolPct >= 0.8;

  return (
    <div style={{ maxWidth: 1120, margin: "0 auto" }} data-testid="recruiting-board">
      <PipelineStyles />

      {/* Hero Card = Actions Carousel */}
      {actions.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <HeroActionsCarousel actions={actions} matchScores={matchScores} navigate={navigate} schoolPct={schoolPct} usage={usage} aiUsage={aiUsage} />
        </div>
      )}

      {/* Upgrade prompt — shows at 80%+ of limit */}
      {nearLimit && !usage.unlimited && usage.limit > 0 && (
        <div style={{ background: usage.used >= usage.limit ? "rgba(245,158,11,0.06)" : "rgba(255,255,255,0.02)", border: `1px solid ${usage.used >= usage.limit ? "rgba(245,158,11,0.2)" : "var(--cm-border)"}`, borderRadius: 10, padding: "14px 20px", marginBottom: 16, display: "flex", alignItems: "center", gap: 14 }}
          data-testid="over-limit-banner">
          <div style={{ width: 36, height: 36, borderRadius: 8, background: usage.used >= usage.limit ? "rgba(245,158,11,0.15)" : "rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <AlertTriangle style={{ width: 18, height: 18, color: usage.used >= usage.limit ? "#f59e0b" : "var(--cm-text-3)" }} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--cm-text)", marginBottom: 1 }}>
              {usage.used >= usage.limit
                ? `You've reached your ${usage.limit}-school limit`
                : `${usage.used} of ${usage.limit} schools used`}
            </div>
            <div style={{ fontSize: 11, color: "var(--cm-text-3)" }}>
              {usage.used >= usage.limit
                ? "Upgrade to add more schools and unlock AI drafts."
                : "You're approaching your plan limit. Upgrade for more schools and AI drafts."}
            </div>
          </div>
          <button onClick={() => setShowUpgrade(true)}
            style={{ padding: "7px 14px", borderRadius: 8, background: usage.used >= usage.limit ? "#f59e0b" : "var(--cm-surface-2)", color: usage.used >= usage.limit ? "#000" : "var(--cm-text-2)", fontSize: 11, fontWeight: 700, cursor: "pointer", flexShrink: 0, border: usage.used >= usage.limit ? "none" : "1px solid var(--cm-border)" }}
            data-testid="upgrade-from-banner">
            Upgrade
          </button>
        </div>
      )}

      {/* 3. Upcoming Tasks */}
      <UpcomingTasksSection tasks={tasks} navigate={navigate} />

      {/* Committed Banner */}
      <CommittedBanner programs={committedPrograms} navigate={navigate} />

      {/* 4. Kanban Board (Drag & Drop) */}
      <KanbanBoard programs={allPrograms} matchScores={matchScores} navigate={navigate} onDragEnd={handleDragEnd} healthMap={healthMap} topActionsMap={topActionsMap} />

      {/* Archived */}
      {archivedPrograms.length > 0 && (
        <div data-testid="section-archived" style={{ marginTop: 24 }}>
          <div onClick={() => setCollapsedArchived(!collapsedArchived)} style={{ display: "flex", alignItems: "center", gap: 8, padding: "16px 0 10px", cursor: "pointer" }} data-testid="section-header-archived">
            <ChevronRight style={{ width: 14, height: 14, color: "#94a3b8", transition: "transform 0.2s", transform: collapsedArchived ? "none" : "rotate(90deg)" }} />
            <Archive style={{ width: 13, height: 13, color: "#94a3b8" }} />
            <span style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: 1, color: "#94a3b8" }}>Archived</span>
            <span style={{ fontSize: 10, fontWeight: 700, padding: "1px 7px", borderRadius: 6, background: "var(--cm-surface-2)", color: "#94a3b8" }}>{archivedPrograms.length}</span>
            <div style={{ flex: 1, height: 1, background: "var(--cm-border)", marginLeft: 6 }} />
          </div>
          {!collapsedArchived && archivedPrograms.map(p => (
            <div key={p.program_id} style={{ background: "var(--cm-surface)", border: "1px solid var(--cm-border)", borderRadius: 12, padding: "12px 16px", marginBottom: 8, display: "flex", alignItems: "center", gap: 12, opacity: 0.7 }} data-testid={`archived-card-${p.program_id}`}>
              <UniversityLogo domain={p.domain} name={p.university_name} size={34} className="rounded-[10px] grayscale" />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "var(--cm-text)" }}>{p.university_name}</div>
                <div style={{ fontSize: 10, color: "var(--cm-text-3)", marginTop: 1 }}>{[p.division, p.conference, p.state].filter(Boolean).join(" · ")}</div>
              </div>
              <button onClick={async (e) => { e.stopPropagation(); try { await axios.put(`${API}/athlete/programs/${p.program_id}`, { is_active: true }); toast.success(`${p.university_name} reactivated`); fetchPrograms(); } catch { toast.error("Failed"); } }} style={{ padding: "6px 14px", borderRadius: 8, fontSize: 11, fontWeight: 700, background: "rgba(13,148,136,0.08)", color: "#0d9488", border: "1px solid rgba(13,148,136,0.15)", cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 5, flexShrink: 0 }} data-testid={`reactivate-btn-${p.program_id}`}>
                <RotateCcw style={{ width: 12, height: 12 }} /> Reactivate
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Upgrade Modal */}
      <UpgradeModal
        isOpen={showUpgrade}
        onClose={() => setShowUpgrade(false)}
        message={`You've reached your limit of ${usage.limit || 5} schools. Upgrade to add more.`}
        currentTier={subscription?.tier || "basic"}
      />
    </div>
  );
}

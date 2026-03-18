/**
 * PipelineHero — Two-column dark hero card matching the reference design.
 *
 * Layout:
 * ┌──────────────────────────────────────────────────────────────────┐
 * │  [All 3] [Needs Attention 1] [Losing Momentum 2]    < 1/3 >    │
 * │                                                                  │
 * │  ┌─── Left Column ──────────┐  ┌─── Right Column ────────────┐ │
 * │  │ ● NEEDS ATTENTION NOW    │  │ UP NEXT IN QUEUE            │ │
 * │  │ [UF] Univ of Florida 68% │  │ Stanford - Re-engage        │ │
 * │  │ D1 · Outreach · SEC      │  │ UCLA - Momentum             │ │
 * │  │ ○──●──○──○──○ progress   │  │                             │ │
 * │  │                          │  │ ✓ 4 programs on track       │ │
 * │  │ 💡 What to do next       │  │                             │ │
 * │  │ Coach assigned a task... │  │ ─────────────────           │ │
 * │  │ [YOU]  [Take Action →]   │  │ 7 programs on your board    │ │
 * │  └──────────────────────────┘  └─────────────────────────────┘ │
 * └──────────────────────────────────────────────────────────────────┘
 */
import React, { useState, useEffect, useCallback } from "react";
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

/* ── Progress Rail Stages ── */
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
  const normalized = map[stage] || stage;
  const idx = RAIL.findIndex((s) => s.key === normalized);
  return idx >= 0 ? idx : 0;
}

/* ── Category accent colors ── */
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

  // Keyboard shortcuts — must be before any early return
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

  const filtered =
    filter === "attention" ? urgent : filter === "momentum" ? momentum : allActionable;

  const total = filtered.length;
  if (total === 0 && onTrackCount === 0) return null;

  const safeIdx = total > 0 ? Math.min(idx, total - 1) : 0;
  const current = filtered[safeIdx];
  const queue = [];
  if (total > 1) {
    for (let i = 1; i <= Math.min(2, total - 1); i++) {
      queue.push(filtered[(safeIdx + i) % total]);
    }
  }

  const prev = () => setIdx((i) => (i - 1 + total) % total);
  const next = () => setIdx((i) => (i + 1) % total);

  const handleCTA = () => {
    if (!current) return;
    if (current.type === "growth") navigate("/schools");
    else if (current.program) navigate(`/pipeline/${current.program.program_id}`);
  };

  const handleFilter = (f) => { setFilter(f); setIdx(0); };

  /* ── Derived data for current card ── */
  const p = current?.program;
  const ms = current ? (current.matchScore || matchScores[p?.program_id]) : null;
  const matchPct = ms?.match_score ?? current?.match_score;
  const accent = CAT_ACCENT[current?.category] || "#818cf8";
  const isUrgent = current ? URGENT_CATS.has(current.category) : false;
  const owner = OWNER_LABEL[current?.owner] || OWNER_LABEL.athlete;
  const railIdx = getActiveRailIdx(p);
  const tierLabel = isUrgent ? "NEEDS ATTENTION NOW" : "KEEP MOMENTUM GOING";
  const tierDotColor = isUrgent ? "#ef4444" : "#818cf8";

  /* ── Filter pill config ── */
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
        borderLeft: "none",
        marginBottom: 20,
        position: "relative",
      }}
    >
      {/* ── Ambient glow from accent ── */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "35%",
          height: "100%",
          background: `radial-gradient(ellipse at 0% 50%, ${accent}18 0%, ${accent}0a 35%, transparent 65%)`,
          pointerEvents: "none",
          zIndex: 0,
          borderRadius: "14px 0 0 14px",
        }}
      />
      {/* ═══ TOP BAR: Filter pills + Carousel nav ═══ */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 20px",
          borderBottom: "1px solid rgba(255,255,255,0.04)",
        }}
        data-testid="hero-top-bar"
      >
        {/* Filter pills */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }} data-testid="hero-filter-pills">
          {pills.map((pill) => (
            <button
              key={pill.key}
              onClick={() => handleFilter(pill.key)}
              data-testid={`hero-filter-${pill.key}`}
              style={{
                padding: "5px 12px",
                borderRadius: 20,
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
                border: "1px solid",
                fontFamily: "inherit",
                display: "flex",
                alignItems: "center",
                gap: 7,
                transition: "all 0.15s",
                background: filter === pill.key ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.03)",
                borderColor: filter === pill.key ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.06)",
                color: filter === pill.key ? "#fff" : "rgba(255,255,255,0.5)",
              }}
            >
              {pill.label}
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 800,
                  padding: "1px 6px",
                  borderRadius: 8,
                  background: filter === pill.key ? pill.countBg : "rgba(255,255,255,0.06)",
                  color: filter === pill.key ? "#fff" : "rgba(255,255,255,0.4)",
                }}
              >
                {pill.count}
              </span>
            </button>
          ))}
        </div>

        {/* Carousel navigation */}
        {total > 1 && (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }} data-testid="hero-carousel-nav">
            <button
              onClick={prev}
              style={{
                width: 28, height: 28, borderRadius: 7,
                background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)",
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer", color: "rgba(255,255,255,0.5)",
              }}
              data-testid="carousel-prev"
            >
              <ChevronLeft style={{ width: 14, height: 14 }} />
            </button>
            <span
              style={{
                fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.5)",
                fontVariantNumeric: "tabular-nums", minWidth: 30, textAlign: "center",
              }}
              data-testid="carousel-counter"
            >
              {safeIdx + 1} / {total}
            </span>
            <button
              onClick={next}
              style={{
                width: 28, height: 28, borderRadius: 7,
                background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)",
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer", color: "rgba(255,255,255,0.5)",
              }}
              data-testid="carousel-next"
            >
              <ChevronRight style={{ width: 14, height: 14 }} />
            </button>
          </div>
        )}
      </div>

      {/* ═══ CONTENT: Two-column layout ═══ */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: current ? "60% 1fr" : "1fr",
          gap: 12,
          minHeight: 340,
          overflow: "hidden",
          padding: "8px 10px 10px",
        }}
        className="hero-grid"
      >
        {/* ─── LEFT COLUMN: Rounded card with gradient ─── */}
        {current && (
          <div
            style={{
              padding: "24px 28px 20px",
              display: "flex",
              flexDirection: "column",
              position: "relative",
              borderRadius: 14,
              background: `linear-gradient(165deg, ${accent}12 0%, rgba(255,255,255,0.04) 40%, rgba(255,255,255,0.02) 100%)`,
              border: "1px solid rgba(255,255,255,0.06)",
              overflow: "hidden",
            }}
            data-testid="hero-left-col"
          >
            {/* Accent line — inside the left panel on its left edge */}
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                bottom: 0,
                width: 4,
                background: `linear-gradient(180deg, ${accent} 0%, ${accent}99 100%)`,
                borderRadius: "14px 0 0 14px",
                zIndex: 2,
              }}
            />
            {/* Tier label */}
            <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 20, position: "relative", zIndex: 1 }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: tierDotColor }} />
              <span style={{ fontSize: 11, fontWeight: 800, color: tierDotColor, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                {tierLabel}
              </span>
            </div>

            {/* School identity: logo + name + match % */}
            <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 6, position: "relative", zIndex: 1 }}>
              {p && (
                <UniversityLogo
                  domain={p.domain}
                  name={p.university_name}
                  logoUrl={ms?.logo_url || p.logo_url}
                  size={42}
                  className="rounded-[10px] flex-shrink-0"
                />
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <h2
                  style={{
                    fontSize: 22, fontWeight: 800, color: "#fff",
                    letterSpacing: -0.3, lineHeight: 1.2, margin: 0,
                    whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                  }}
                  data-testid="hero-school-name"
                >
                  {p?.university_name || "Take Action"}
                </h2>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
                  {p?.division && <span style={{ fontSize: 13, fontWeight: 500, color: "rgba(255,255,255,0.4)" }}>{p.division}</span>}
                  {p?.journey_stage && (
                    <span style={{ fontSize: 13, fontWeight: 500, color: "rgba(255,255,255,0.4)" }}>
                      {RAIL.find((s) => s.key === p.journey_stage)?.label || ""}
                    </span>
                  )}
                  {p?.conference && <span style={{ fontSize: 13, fontWeight: 500, color: "rgba(255,255,255,0.4)" }}>{p.conference}</span>}
                </div>
              </div>
              {matchPct != null && (
                <span
                  style={{ fontSize: 22, fontWeight: 800, color: "#fbbf24", flexShrink: 0, lineHeight: 1 }}
                  data-testid="hero-match-pct"
                >
                  {matchPct}%
                </span>
              )}
            </div>

            {/* Progress rail */}
            <div style={{ margin: "20px 0 24px", display: "flex", alignItems: "center" }} data-testid="hero-progress-rail">
              {RAIL.map((stage, i) => {
                const isActive = i === railIdx;
                const isPast = i < railIdx;
                return (
                  <React.Fragment key={stage.key}>
                    {i > 0 && (
                      <div
                        style={{
                          flex: 1, height: 2,
                          background: isPast || isActive
                            ? "rgba(13,148,136,0.4)"
                            : "rgba(255,255,255,0.08)",
                          borderRadius: 1,
                        }}
                      />
                    )}
                    <div
                      style={{
                        width: isActive ? 14 : 10,
                        height: isActive ? 14 : 10,
                        borderRadius: "50%",
                        background: isActive ? "#0d9488" : isPast ? "rgba(148,163,184,0.5)" : "#1e293b",
                        border: isActive
                          ? "2.5px solid rgba(13,148,136,0.35)"
                          : isPast ? "none" : "1.5px solid rgba(255,255,255,0.12)",
                        boxShadow: isActive ? "0 0 10px rgba(13,148,136,0.5)" : "none",
                        flexShrink: 0,
                        transition: "all 0.2s",
                      }}
                      title={stage.label}
                    />
                  </React.Fragment>
                );
              })}
            </div>

            {/* Spacer to push bottom content down */}
            <div style={{ flex: 1 }} />

            {/* "What to do next" box */}
            <div
              style={{
                padding: "14px 16px",
                borderRadius: 10,
                border: "1px solid rgba(13,148,136,0.25)",
                background: "rgba(13,148,136,0.06)",
                marginBottom: 16,
              }}
              data-testid="hero-advice-box"
            >
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                <span style={{ fontSize: 13 }}>💡</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: "#5eead4", letterSpacing: "0.02em" }}>
                  What to do next
                </span>
              </div>
              <p
                style={{
                  fontSize: 14, fontWeight: 500, color: "rgba(255,255,255,0.8)",
                  lineHeight: 1.5, margin: 0,
                }}
                data-testid="hero-advice-text"
              >
                {current.context || "Review this program and take the next step."}
              </p>
            </div>

            {/* Owner + CTA */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span
                style={{
                  fontSize: 11, fontWeight: 800, padding: "4px 12px", borderRadius: 8,
                  background: "rgba(255,255,255,0.06)", color: owner.color,
                  letterSpacing: "0.04em",
                }}
                data-testid="hero-owner-badge"
              >
                {owner.text}
              </span>
              <button
                onClick={handleCTA}
                style={{
                  padding: "10px 22px", borderRadius: 10, border: "none",
                  background: accent,
                  color: "#fff", fontSize: 14, fontWeight: 700,
                  cursor: "pointer", display: "flex", alignItems: "center",
                  gap: 7, fontFamily: "inherit", transition: "all 0.2s",
                  boxShadow: `0 4px 20px ${accent}40`,
                }}
                data-testid="hero-cta-btn"
              >
                {current.cta?.label || "Take Action"}
                <ArrowRight style={{ width: 15, height: 15 }} />
              </button>
            </div>
          </div>
        )}

        {/* ─── RIGHT COLUMN: Queue + On-track + Capacity ─── */}
        <div
          style={{
            padding: "16px 16px 16px 4px",
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
          data-testid="hero-right-col"
        >
          {/* UP NEXT IN QUEUE */}
          {queue.length > 0 && (
            <div
              style={{
                background: "rgba(255,255,255,0.02)",
                borderRadius: 12,
                border: "1px solid rgba(255,255,255,0.05)",
                padding: "16px",
              }}
              data-testid="hero-queue"
            >
              <span style={{ fontSize: 10, fontWeight: 800, color: "rgba(255,255,255,0.35)", letterSpacing: "0.1em", textTransform: "uppercase" }}>
                Up Next in Queue
              </span>
              <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 10 }}>
                {queue.map((a) => {
                  const qp = a.program;
                  const qms = a.matchScore || matchScores[qp?.program_id];
                  const qIsUrgent = URGENT_CATS.has(a.category);
                  const btnColor = qIsUrgent ? "#ef4444" : "#7c3aed";
                  return (
                    <div
                      key={a.id}
                      onClick={() => { if (qp) navigate(`/pipeline/${qp.program_id}`); }}
                      style={{
                        display: "flex", alignItems: "center", gap: 12,
                        padding: "10px 14px", borderRadius: 10,
                        background: "rgba(255,255,255,0.03)",
                        border: "1px solid rgba(255,255,255,0.04)",
                        cursor: "pointer", transition: "background 0.15s",
                      }}
                      className="queue-row"
                      data-testid={`queue-item-${a.id}`}
                    >
                      {qp && (
                        <UniversityLogo
                          domain={qp.domain}
                          name={qp.university_name}
                          logoUrl={qms?.logo_url || qp.logo_url}
                          size={32}
                          className="rounded-full flex-shrink-0"
                        />
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: "#fff", lineHeight: 1.3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {qp?.university_name || "Unknown"}
                        </div>
                        <div style={{ fontSize: 11, fontWeight: 500, color: "rgba(255,255,255,0.4)", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {a.context?.split("—")[0]?.trim() || "Review program"}
                        </div>
                      </div>
                      <span
                        style={{
                          padding: "5px 12px", borderRadius: 8, fontSize: 11, fontWeight: 700,
                          background: btnColor, color: "#fff", flexShrink: 0,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {a.cta?.label || "View"}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ON TRACK summary */}
          {onTrackCount > 0 && (
            <div
              style={{
                background: "rgba(255,255,255,0.02)",
                borderRadius: 12,
                border: "1px solid rgba(255,255,255,0.05)",
                padding: "16px 18px",
                display: "flex", alignItems: "flex-start", gap: 12,
              }}
              data-testid="hero-on-track-summary"
            >
              <CheckCircle2 style={{ width: 22, height: 22, color: "#4ade80", flexShrink: 0, marginTop: 1 }} />
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: "#fff", lineHeight: 1.3 }}>
                  {onTrackCount} program{onTrackCount !== 1 ? "s" : ""} are on track
                </div>
                <div style={{ fontSize: 12, fontWeight: 500, color: "rgba(255,255,255,0.4)", marginTop: 3 }}>
                  No immediate action needed.
                </div>
              </div>
            </div>
          )}

          {/* Spacer to push capacity strip to bottom */}
          <div style={{ flex: 1 }} />

          {/* CAPACITY STRIP (replaces Quick Context) */}
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
        <div style={{ padding: "40px 28px", display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
          <CheckCircle2 style={{ width: 32, height: 32, color: "#4ade80" }} />
          <span style={{ fontSize: 16, fontWeight: 700, color: "#fff" }}>You're all clear</span>
          <span style={{ fontSize: 13, color: "rgba(255,255,255,0.45)" }}>
            All {onTrackCount} programs are on track — nothing needs your attention right now.
          </span>
        </div>
      )}

      {/* ── Styles ── */}
      <style>{`
        .queue-row:hover { background: rgba(255,255,255,0.06) !important; }
        @media (max-width: 768px) {
          .hero-grid {
            grid-template-columns: 1fr !important;
          }
          .hero-grid > div:first-child {
            border-right: none !important;
            border-bottom: 1px solid rgba(255,255,255,0.04);
          }
        }
      `}</style>
    </div>
  );
}

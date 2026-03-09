import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import {
  Plus, ChevronRight, ChevronLeft, Loader2,
  Send, GraduationCap, AlertTriangle,
  Archive, RotateCcw, Calendar,
} from "lucide-react";
import { Button } from "../../components/ui/button";
import { toast } from "sonner";
import UniversityLogo from "../../components/UniversityLogo";
import { RAIL_STAGES } from "../../components/journey/constants";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

/* ═══════════════════════════════════════════ */
/* ── Helpers (unchanged)                     */
/* ═══════════════════════════════════════════ */
const FIT_COLORS = {
  "Strong Fit": { bg: "rgba(22,163,74,0.15)", text: "#4ade80", border: "rgba(22,163,74,0.2)" },
  "Possible Fit": { bg: "rgba(13,148,136,0.15)", text: "#5eead4", border: "rgba(13,148,136,0.2)" },
  "Stretch": { bg: "rgba(245,158,11,0.12)", text: "#fbbf24", border: "rgba(245,158,11,0.2)" },
  "Less Likely Fit": { bg: "rgba(239,68,68,0.1)", text: "#f87171", border: "rgba(239,68,68,0.15)" },
  "Not Enough Data": { bg: "var(--cm-surface-2)", text: "var(--cm-text-3)", border: "var(--cm-border)" },
};

function computeRail(journeyStage) {
  const activeIdx = journeyStage ? RAIL_STAGES.findIndex(st => st.key === journeyStage) : 0;
  const idx = activeIdx >= 0 ? activeIdx : 0;
  return RAIL_STAGES.map((st, i) => ({
    ...st,
    state: i < idx ? "past" : i === idx ? "active" : "future",
  }));
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
  if (sig.days_since_activity != null && sig.days_since_activity > 0) {
    return { text: `${sig.days_since_activity}d since last activity`, color: "#94a3b8", urgent: false };
  }
  return null;
}

function getCTA(p) {
  if (p.board_group === "needs_outreach") return { label: "Start Outreach", style: "primary" };
  if (p.board_group === "waiting_on_reply" || p.board_group === "overdue") return { label: "Follow Up", style: "warn" };
  return { label: "View Journey", style: "outline" };
}

function getActionContext(p) {
  const g = p.board_group;
  const s = p.signals || {};
  if (g === "overdue") {
    const days = p.next_action_due
      ? Math.abs(Math.ceil((new Date(p.next_action_due + "T00:00:00") - new Date()) / 86400000))
      : "several";
    return `It's been ${days} days since your last contact. A short follow-up would help keep momentum going.`;
  }
  if (g === "needs_outreach") return "This school matches your profile well. Send an introductory email with your highlight reel.";
  if (g === "waiting_on_reply") {
    return s.days_since_outreach > 5
      ? "It's been a while since your outreach. A brief follow-up would help."
      : "Give the coach a bit more time, then follow up with a quick check-in.";
  }
  if (g === "in_conversation") return "You've got momentum here — keep the conversation going and ask about next steps.";
  return "Review this school's program and plan your next outreach.";
}

/* ── Journey stage → kanban column mapping ── */
const KANBAN_COLS = [
  { key: "added", label: "Added", dot: "#94a3b8" },
  { key: "outreach", label: "Outreach", dot: "#0d9488" },
  { key: "in_conversation", label: "Talking", dot: "#22c55e" },
  { key: "campus_visit", label: "Visit", dot: "#3b82f6" },
  { key: "offer", label: "Offer", dot: "#a855f7" },
  { key: "committed", label: "Committed", dot: "#fbbf24" },
];

function programToKanbanCol(p) {
  if (p.recruiting_status === "Committed" || p.journey_stage === "committed") return "committed";
  if (p.journey_stage === "campus_visit") return "campus_visit";
  if (p.journey_stage === "offer") return "offer";
  if (p.journey_stage === "in_conversation" || p.board_group === "in_conversation") return "in_conversation";
  if (p.journey_stage === "outreach" || p.board_group === "waiting_on_reply" || p.board_group === "overdue") return "outreach";
  return "added";
}

/* ── Generate action items from programs ── */
function generateActions(programs, matchScores) {
  const actions = [];
  const priorityOrder = ["overdue", "waiting_on_reply", "needs_outreach", "in_conversation"];

  // Sort programs by urgency
  const sorted = [...programs]
    .filter(p => p.board_group !== "archived" && p.recruiting_status !== "Committed" && p.journey_stage !== "committed")
    .sort((a, b) => {
      const ai = priorityOrder.indexOf(a.board_group);
      const bi = priorityOrder.indexOf(b.board_group);
      return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
    });

  for (const p of sorted.slice(0, 6)) {
    const ms = matchScores[p.program_id];
    const cta = getCTA(p);
    const due = getDueInfo(p);
    actions.push({
      id: p.program_id,
      type: "school",
      program: p,
      title: cta.label === "Start Outreach" ? `Start outreach to ${p.university_name}` : `Follow up with ${p.university_name}`,
      context: getActionContext(p),
      match_score: ms?.match_score,
      stage: p.journey_stage || "added",
      division: p.division,
      due,
      cta,
      matchScore: ms,
    });
  }

  // Add "add more schools" if pipeline is small
  const activeCount = programs.filter(p => p.board_group !== "archived").length;
  if (activeCount < 8) {
    const needed = Math.max(3, 8 - activeCount);
    actions.push({
      id: "add-schools",
      type: "growth",
      title: "Grow Your Target List",
      context: `You need ${needed} more target schools to keep your pipeline healthy. A wider net gives you better options.`,
      cta: { label: "Browse Schools", style: "primary" },
    });
  }

  return actions;
}


/* ═══════════════════════════════════════════ */
/* ── Hero Progress Rail                     ── */
/* ═══════════════════════════════════════════ */
function HeroRail({ journeyStage }) {
  const stages = computeRail(journeyStage || "added");
  const stageLabels = { added: "Added", outreach: "Outreach", in_conversation: "Talking", campus_visit: "Visit", offer: "Offer", committed: "Commit" };
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", height: 22 }}>
        {stages.map((s, i) => (
          <React.Fragment key={s.key}>
            {i > 0 && <div style={{ flex: 1, height: 2, background: s.state === "past" || (stages[i-1]?.state === "past" && s.state === "active") ? "rgba(13,148,136,0.4)" : "rgba(255,255,255,0.08)" }} />}
            <div style={{
              width: s.state === "active" ? 12 : 10, height: s.state === "active" ? 12 : 10,
              borderRadius: "50%",
              background: s.state === "future" ? "rgba(255,255,255,0.12)" : s.state === "active" ? "#0d9488" : "rgba(13,148,136,0.5)",
              boxShadow: s.state === "active" ? "0 0 10px rgba(13,148,136,0.4)" : "none",
            }} />
          </React.Fragment>
        ))}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 5 }}>
        {stages.map(s => (
          <span key={s.key} style={{
            flex: 1, textAlign: "center", fontSize: 9, fontWeight: s.state === "active" ? 700 : 600,
            color: s.state === "active" ? "#0d9488" : "rgba(255,255,255,0.25)",
          }}>
            {stageLabels[s.key] || s.label}
          </span>
        ))}
      </div>
    </div>
  );
}


/* ═══════════════════════════════════════════ */
/* ── Actions Hero Carousel                  ── */
/* ═══════════════════════════════════════════ */
function ActionsHeroCarousel({ actions, matchScores, navigate }) {
  const [idx, setIdx] = useState(0);
  const total = actions.length;
  if (total === 0) return null;

  const prev = () => setIdx(i => (i - 1 + total) % total);
  const next = () => setIdx(i => (i + 1) % total);
  const action = actions[idx];
  const isSchool = action.type === "school";
  const p = action.program;
  const ms = action.matchScore;
  const socialLinks = ms?.social_links || p?.social_links;

  const ctaStyles = {
    primary: { background: "#0d9488", color: "white" },
    warn: { background: "#f59e0b", color: "white" },
    outline: { background: "transparent", color: "rgba(255,255,255,0.7)", border: "1px solid rgba(255,255,255,0.15)" },
  };

  const handleCTA = () => {
    if (action.type === "growth") navigate("/schools");
    else if (p) navigate(`/pipeline/${p.program_id}`);
  };

  return (
    <div style={{
      background: "linear-gradient(145deg, #1a2332 0%, #0f1a26 100%)",
      borderRadius: 20, marginBottom: 16, position: "relative", overflow: "hidden",
      border: "1px solid rgba(255,255,255,0.04)",
    }} data-testid="actions-hero-carousel">
      {/* Subtle glow */}
      <div style={{ position: "absolute", top: "-40%", right: "-10%", width: 400, height: 400, background: "radial-gradient(circle, rgba(13,148,136,0.06) 0%, transparent 70%)", pointerEvents: "none" }} />

      {/* Header */}
      <div style={{ padding: "22px 28px 0", display: "flex", alignItems: "center", justifyContent: "space-between", position: "relative", zIndex: 1 }}>
        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(255,255,255,0.3)" }}>
          Actions Needed Today
        </span>
      </div>

      {/* Slide */}
      <div style={{ padding: "18px 28px 0", display: "flex", alignItems: "flex-start", gap: 28, position: "relative", zIndex: 1 }}>
        {/* Left: content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {isSchool && p && (
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
              <UniversityLogo domain={p.domain} name={p.university_name} logoUrl={ms?.logo_url} size={44} className="rounded-[12px]" />
              <span style={{ fontSize: 21, fontWeight: 800, color: "#fff", letterSpacing: -0.3 }}>{p.university_name}</span>
            </div>
          )}
          {!isSchool && (
            <div style={{ fontSize: 21, fontWeight: 800, color: "#fff", letterSpacing: -0.3, marginBottom: 10 }}>{action.title}</div>
          )}

          {/* Badges */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
            {isSchool && p?.journey_stage && (
              <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 10px", borderRadius: 6, background: "rgba(13,148,136,0.2)", color: "#5eead4" }}>
                {KANBAN_COLS.find(c => c.key === programToKanbanCol(p))?.label || p.journey_stage}
              </span>
            )}
            {action.match_score != null && (
              <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 10px", borderRadius: 6, background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.6)" }}>
                {action.match_score}% Match
              </span>
            )}
            {action.division && (
              <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 10px", borderRadius: 6, background: "rgba(99,102,241,0.15)", color: "#a5b4fc" }}>
                {action.division}
              </span>
            )}
            {action.due && (
              <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 10px", borderRadius: 6, background: action.due.urgent ? "rgba(245,158,11,0.15)" : "rgba(255,255,255,0.06)", color: action.due.urgent ? "#fcd34d" : "rgba(255,255,255,0.4)" }}>
                {action.due.text}
              </span>
            )}
          </div>

          <p style={{ fontSize: 13, lineHeight: 1.65, color: "rgba(255,255,255,0.45)", marginBottom: 20, maxWidth: 520 }}>
            {action.context}
          </p>

          <button
            onClick={handleCTA}
            style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              padding: "12px 24px", borderRadius: 10, fontSize: 13, fontWeight: 700,
              border: "none", cursor: "pointer", letterSpacing: -0.2, fontFamily: "inherit",
              transition: "all 0.2s",
              ...(ctaStyles[action.cta.style] || ctaStyles.primary),
            }}
            data-testid="hero-action-cta"
          >
            <Send style={{ width: 15, height: 15 }} />
            {action.cta.label}
          </button>
        </div>

        {/* Right: rail + social */}
        {isSchool && p && (
          <div style={{ flexShrink: 0, paddingTop: 8, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 14, width: 260 }} className="hidden md:flex">
            <HeroRail journeyStage={p.journey_stage || "added"} />
            {socialLinks && (
              <div style={{ display: "flex", gap: 8 }}>
                {socialLinks.twitter && (
                  <a href={socialLinks.twitter} target="_blank" rel="noopener noreferrer" style={{ width: 24, height: 24, borderRadius: 7, background: "rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(255,255,255,0.3)", fontSize: 9, fontWeight: 700 }}>X</a>
                )}
                {socialLinks.instagram && (
                  <a href={socialLinks.instagram} target="_blank" rel="noopener noreferrer" style={{ width: 24, height: 24, borderRadius: 7, background: "rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(255,255,255,0.3)", fontSize: 9, fontWeight: 700 }}>IG</a>
                )}
                {socialLinks.facebook && (
                  <a href={socialLinks.facebook} target="_blank" rel="noopener noreferrer" style={{ width: 24, height: 24, borderRadius: 7, background: "rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(255,255,255,0.3)", fontSize: 9, fontWeight: 700 }}>FB</a>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer: Next preview + carousel controls */}
      <div style={{ padding: "14px 28px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "relative", zIndex: 1 }}>
        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.22)", display: "flex", alignItems: "center", gap: 6 }}>
          {idx + 1 < total && (
            <>Next: <span style={{ color: "rgba(255,255,255,0.35)", fontWeight: 600 }}>{actions[(idx + 1) % total]?.title}</span></>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button onClick={prev} style={{ width: 28, height: 28, borderRadius: 8, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "rgba(255,255,255,0.4)" }} data-testid="carousel-prev">
            <ChevronLeft style={{ width: 14, height: 14 }} />
          </button>
          <div style={{ display: "flex", gap: 6 }}>
            {actions.map((_, i) => (
              <div key={i} onClick={() => setIdx(i)} style={{
                width: i === idx ? 18 : 6, height: 6, borderRadius: i === idx ? 4 : "50%",
                background: i === idx ? "#0d9488" : "rgba(255,255,255,0.15)",
                cursor: "pointer", transition: "all 0.2s",
              }} data-testid={`carousel-dot-${i}`} />
            ))}
          </div>
          <button onClick={next} style={{ width: 28, height: 28, borderRadius: 8, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "rgba(255,255,255,0.4)" }} data-testid="carousel-next">
            <ChevronRight style={{ width: 14, height: 14 }} />
          </button>
        </div>
      </div>
    </div>
  );
}


/* ═══════════════════════════════════════════ */
/* ── Upcoming Events Section                ── */
/* ═══════════════════════════════════════════ */
function UpcomingEventsSection({ events, navigate }) {
  if (!events || events.length === 0) return null;
  const upcoming = events
    .filter(e => new Date(e.date || e.start_date || e.event_date) >= new Date(new Date().toDateString()))
    .sort((a, b) => new Date(a.date || a.start_date || a.event_date) - new Date(b.date || b.start_date || b.event_date))
    .slice(0, 3);

  if (upcoming.length === 0) return null;

  const dotColors = ["#0d9488", "#f59e0b", "#3b82f6"];

  return (
    <div style={{ background: "var(--cm-surface)", border: "1px solid var(--cm-border)", borderRadius: 14, padding: "16px 20px", marginBottom: 20 }} data-testid="upcoming-events">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 700, color: "var(--cm-text)" }}>
          <Calendar style={{ width: 15, height: 15, color: "#0d9488" }} />
          Upcoming Events
        </div>
        <button onClick={() => navigate("/calendar")} style={{ fontSize: 11, fontWeight: 600, color: "#0d9488", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 3 }}>
          View Calendar <ChevronRight style={{ width: 12, height: 12 }} />
        </button>
      </div>
      {upcoming.map((ev, i) => {
        const d = new Date(ev.date || ev.start_date || ev.event_date);
        const dateStr = d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
        return (
          <div key={ev.event_id || i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 0", borderTop: "1px solid var(--cm-border)" }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: dotColors[i % 3], flexShrink: 0 }} />
            <span style={{ fontSize: 12, fontWeight: 600, color: "var(--cm-text)", flex: 1 }}>{ev.title || ev.name || "Event"}</span>
            <span style={{ fontSize: 11, fontWeight: 500, color: "var(--cm-text-3)" }}>{dateStr}</span>
          </div>
        );
      })}
    </div>
  );
}


/* ═══════════════════════════════════════════ */
/* ── Kanban School Card                     ── */
/* ═══════════════════════════════════════════ */
function KanbanCard({ program: p, matchScore, navigate }) {
  const ms = matchScore?.match_score;
  const due = getDueInfo(p);
  const cta = getCTA(p);
  const meta = [p.division, p.conference, p.state].filter(Boolean);

  const ctaClass = {
    primary: { background: "#0d9488", color: "white", border: "none" },
    warn: { background: "#f59e0b", color: "white", border: "none" },
    outline: { background: "transparent", color: "#0d9488", border: "1px solid rgba(13,148,136,0.2)" },
  };

  return (
    <div
      onClick={() => navigate(`/pipeline/${p.program_id}`)}
      style={{
        background: "var(--cm-surface)", border: "1px solid var(--cm-border)", borderRadius: 12,
        padding: 14, marginBottom: 8, cursor: "pointer", transition: "all 0.15s",
      }}
      className="hover:shadow-sm"
      data-testid={`kanban-card-${p.program_id}`}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
        <UniversityLogo domain={p.domain} name={p.university_name} size={34} className="rounded-[9px] flex-shrink-0" />
        <span style={{ fontSize: 12, fontWeight: 700, color: "var(--cm-text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.university_name}</span>
        {ms != null && <span style={{ fontSize: 10, fontWeight: 700, color: "#0d9488", marginLeft: "auto", flexShrink: 0 }}>{ms}%</span>}
      </div>
      <div style={{ display: "flex", gap: 5, marginBottom: 10, flexWrap: "wrap" }}>
        {meta.slice(0, 3).map(m => (
          <span key={m} style={{ fontSize: 9, fontWeight: 700, padding: "2px 7px", borderRadius: 4, background: "var(--cm-surface-2)", color: "var(--cm-text-3)" }}>{m}</span>
        ))}
      </div>
      {due && (
        <div style={{ fontSize: 10, color: due.urgent ? due.color : "var(--cm-text-3)", fontWeight: due.urgent ? 700 : 500, marginBottom: 10 }}>
          {due.text}
        </div>
      )}
      <button
        onClick={e => { e.stopPropagation(); navigate(`/pipeline/${p.program_id}`); }}
        style={{
          display: "block", width: "100%", padding: "8px 0", borderRadius: 8,
          fontSize: 11, fontWeight: 700, textAlign: "center", cursor: "pointer",
          fontFamily: "inherit", transition: "all 0.15s",
          ...(ctaClass[cta.style] || ctaClass.outline),
        }}
        data-testid={`kanban-cta-${p.program_id}`}
      >
        {cta.label}
      </button>
    </div>
  );
}


/* ═══════════════════════════════════════════ */
/* ── Kanban Board                           ── */
/* ═══════════════════════════════════════════ */
function KanbanBoard({ programs, matchScores, navigate }) {
  const columns = {};
  KANBAN_COLS.forEach(c => { columns[c.key] = []; });

  for (const p of programs) {
    if (p.board_group === "archived") continue;
    const col = programToKanbanCol(p);
    if (columns[col]) columns[col].push(p);
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 10, minHeight: 200 }} className="kanban-grid" data-testid="kanban-board">
      {KANBAN_COLS.map(col => (
        <div key={col.key} style={{ minWidth: 0 }}>
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "10px 12px", borderRadius: 10, marginBottom: 8,
            background: "var(--cm-surface)", border: "1px solid var(--cm-border)",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ width: 7, height: 7, borderRadius: "50%", background: col.dot }} />
              <span style={{ fontSize: 12, fontWeight: 700, color: "var(--cm-text)" }}>{col.label}</span>
            </div>
            <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 5, background: "var(--cm-surface-2)", color: "var(--cm-text-3)" }}>
              {columns[col.key].length}
            </span>
          </div>
          {columns[col.key].length > 0 ? (
            columns[col.key].map(p => (
              <KanbanCard key={p.program_id} program={p} matchScore={matchScores[p.program_id]} navigate={navigate} />
            ))
          ) : (
            <div style={{ textAlign: "center", padding: "30px 10px", color: "var(--cm-text-3)", fontSize: 11 }}>
              {col.key === "offer" ? "No offers yet" : col.key === "committed" ? "—" : ""}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}


/* ═══════════════════════════════════════════ */
/* ── Guidance Banner                        ── */
/* ═══════════════════════════════════════════ */
function MeasurablesGuidanceBanner({ guidance, navigate }) {
  if (!guidance) return null;
  return (
    <div style={{
      background: "var(--cm-surface)", border: "1px solid rgba(245,158,11,0.2)",
      borderLeft: "3px solid #f59e0b", borderRadius: 12, padding: "14px 18px",
      display: "flex", alignItems: "center", gap: 14, marginBottom: 16,
    }} data-testid="measurables-guidance-banner">
      <div style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(245,158,11,0.1)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <AlertTriangle style={{ width: 16, height: 16, color: "#f59e0b" }} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "var(--cm-text)", marginBottom: 2 }}>Improve your match accuracy</div>
        <div style={{ fontSize: 11, color: "var(--cm-text-3)", lineHeight: 1.5 }}>{guidance}</div>
      </div>
      <button onClick={() => navigate("/profile")} style={{
        padding: "8px 16px", borderRadius: 8, fontSize: 11, fontWeight: 700,
        background: "rgba(245,158,11,0.1)", color: "#f59e0b", border: "1px solid rgba(245,158,11,0.2)",
        cursor: "pointer", fontFamily: "inherit", flexShrink: 0, whiteSpace: "nowrap",
      }} data-testid="update-profile-btn">Update Profile</button>
    </div>
  );
}


/* ═══════════════════════════════════════════ */
/* ── Empty State                            ── */
/* ═══════════════════════════════════════════ */
function EmptyBoardState({ navigate }) {
  return (
    <div className="text-center py-20" data-testid="empty-pipeline">
      <GraduationCap className="w-12 h-12 mx-auto mb-3" style={{ color: "var(--cm-text-4)" }} />
      <p className="text-sm font-medium mb-1" style={{ color: "var(--cm-text-2)" }}>No schools in your pipeline yet</p>
      <p className="text-xs mb-6" style={{ color: "var(--cm-text-3)" }}>Browse the Knowledge Base to find volleyball programs that match your profile</p>
      <Button onClick={() => navigate("/schools")} style={{ background: "#0d9488", color: "white", padding: "10px 24px", height: "auto", borderRadius: 10, fontSize: 14, fontWeight: 700 }} data-testid="find-schools-btn">
        <Plus className="w-4 h-4 mr-1.5" /> Find Schools
      </Button>
    </div>
  );
}


/* ═══════════════════════════════════════════ */
/* ── Responsive styles                      ── */
/* ═══════════════════════════════════════════ */
function PipelineStyles() {
  return (
    <style>{`
      @keyframes heroPulse { 0%{opacity:1;transform:scale(1)} 100%{opacity:0;transform:scale(2.2)} }
      @media (max-width: 1024px) {
        .kanban-grid { grid-template-columns: repeat(3, 1fr) !important; }
      }
      @media (max-width: 640px) {
        .kanban-grid { grid-template-columns: repeat(2, 1fr) !important; }
      }
    `}</style>
  );
}


/* ═══════════════════════════════════════════ */
/* ── Main Page                              ── */
/* ═══════════════════════════════════════════ */
export default function PipelinePage() {
  const [allPrograms, setAllPrograms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [matchScores, setMatchScores] = useState({});
  const [events, setEvents] = useState([]);
  const [collapsedArchived, setCollapsedArchived] = useState(true);
  const navigate = useNavigate();

  const fetchPrograms = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/athlete/programs`);
      setAllPrograms(Array.isArray(res.data) ? res.data : []);
    } catch {
      toast.error("Failed to load programs");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPrograms(); }, [fetchPrograms]);

  useEffect(() => {
    axios.get(`${API}/match-scores`).then(res => {
      const byId = {};
      (res.data?.scores || []).forEach(s => { byId[s.program_id] = s; });
      setMatchScores(byId);
    }).catch(() => {});
  }, [allPrograms.length]);

  useEffect(() => {
    axios.get(`${API}/athlete/events`).then(res => {
      setEvents(Array.isArray(res.data) ? res.data : []);
    }).catch(() => {});
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24" data-testid="board-loading">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin" style={{ color: "#999" }} />
          <span className="text-sm" style={{ color: "#999" }}>Loading your board...</span>
        </div>
      </div>
    );
  }

  const activePrograms = allPrograms.filter(p => p.board_group !== "archived");
  const archivedPrograms = allPrograms.filter(p => p.board_group === "archived");

  if (activePrograms.length === 0 && archivedPrograms.length === 0) {
    return (
      <div style={{ maxWidth: 1120, margin: "0 auto" }}>
        <PipelineStyles />
        <EmptyBoardState navigate={navigate} />
      </div>
    );
  }

  const actions = generateActions(allPrograms, matchScores);
  const guidance = Object.values(matchScores).find(s => s.confidence_guidance)?.confidence_guidance;

  return (
    <div style={{ maxWidth: 1120, margin: "0 auto" }} data-testid="recruiting-board">
      <PipelineStyles />

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 16, marginBottom: 20 }}>
        <button
          onClick={() => navigate("/schools")}
          style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            padding: "10px 20px", borderRadius: 10, border: "1px solid var(--cm-border)",
            background: "var(--cm-surface)", fontSize: 13, fontWeight: 700,
            color: "var(--cm-text)", cursor: "pointer", fontFamily: "inherit",
          }}
          data-testid="add-school-btn"
        >
          <Plus style={{ width: 14, height: 14 }} /> Add School
        </button>
      </div>

      {/* 1. Hero = Actions Needed Today carousel */}
      <ActionsHeroCarousel actions={actions} matchScores={matchScores} navigate={navigate} />

      {/* Guidance Banner */}
      {guidance && <MeasurablesGuidanceBanner guidance={guidance} navigate={navigate} />}

      {/* 2. Upcoming Events */}
      <UpcomingEventsSection events={events} navigate={navigate} />

      {/* 3. Kanban Board */}
      <KanbanBoard programs={allPrograms} matchScores={matchScores} navigate={navigate} />

      {/* Archived */}
      {archivedPrograms.length > 0 && (
        <div data-testid="section-archived" style={{ marginTop: 24 }}>
          <div
            onClick={() => setCollapsedArchived(!collapsedArchived)}
            style={{ display: "flex", alignItems: "center", gap: 8, padding: "16px 0 10px", cursor: "pointer" }}
            data-testid="section-header-archived"
          >
            <ChevronRight style={{ width: 14, height: 14, color: "#94a3b8", transition: "transform 0.2s", transform: collapsedArchived ? "none" : "rotate(90deg)" }} />
            <Archive style={{ width: 13, height: 13, color: "#94a3b8" }} />
            <span style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: 1, color: "#94a3b8" }}>Archived</span>
            <span style={{ fontSize: 10, fontWeight: 700, padding: "1px 7px", borderRadius: 6, background: "var(--cm-surface-2)", color: "#94a3b8" }}>{archivedPrograms.length}</span>
            <div style={{ flex: 1, height: 1, background: "var(--cm-border)", marginLeft: 6 }} />
          </div>
          {!collapsedArchived && archivedPrograms.map(p => (
            <div key={p.program_id}
              style={{
                background: "var(--cm-surface)", border: "1px solid var(--cm-border)", borderRadius: 12,
                padding: "12px 16px", marginBottom: 8, display: "flex", alignItems: "center", gap: 12, opacity: 0.7,
              }}
              data-testid={`archived-card-${p.program_id}`}
            >
              <UniversityLogo domain={p.domain} name={p.university_name} size={34} className="rounded-[10px] grayscale" />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "var(--cm-text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.university_name}</div>
                <div style={{ fontSize: 10, color: "var(--cm-text-3)", marginTop: 1 }}>
                  {[p.division, p.conference, p.state].filter(Boolean).join(" · ")}
                </div>
              </div>
              <button
                onClick={async (e) => {
                  e.stopPropagation();
                  try {
                    await axios.put(`${API}/athlete/programs/${p.program_id}`, { is_active: true });
                    toast.success(`${p.university_name} reactivated`);
                    fetchPrograms();
                  } catch { toast.error("Failed to reactivate"); }
                }}
                style={{
                  padding: "6px 14px", borderRadius: 8, fontSize: 11, fontWeight: 700,
                  background: "rgba(13,148,136,0.08)", color: "#0d9488", border: "1px solid rgba(13,148,136,0.15)",
                  cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 5, flexShrink: 0,
                }}
                data-testid={`reactivate-btn-${p.program_id}`}
              >
                <RotateCcw style={{ width: 12, height: 12 }} /> Reactivate
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

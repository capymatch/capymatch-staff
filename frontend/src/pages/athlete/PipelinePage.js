import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import {
  Plus, ChevronRight, ChevronLeft, Loader2,
  Send, GraduationCap, AlertTriangle, Lightbulb,
  Archive, RotateCcw, Calendar,
} from "lucide-react";
import { Button } from "../../components/ui/button";
import { toast } from "sonner";
import UniversityLogo from "../../components/UniversityLogo";
import { RAIL_STAGES } from "../../components/journey/constants";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

/* ═══════════════════════════════════════════ */
/* ── Helpers                                 */
/* ═══════════════════════════════════════════ */
const FIT_COLORS = {
  "Strong Fit": { bg: "rgba(22,163,74,0.15)", text: "#4ade80", border: "rgba(22,163,74,0.2)" },
  "Possible Fit": { bg: "rgba(13,148,136,0.15)", text: "#5eead4", border: "rgba(13,148,136,0.2)" },
  "Stretch": { bg: "rgba(245,158,11,0.12)", text: "#fbbf24", border: "rgba(245,158,11,0.2)" },
  "Less Likely Fit": { bg: "rgba(239,68,68,0.1)", text: "#f87171", border: "rgba(239,68,68,0.15)" },
  "Not Enough Data": { bg: "var(--cm-surface-2)", text: "var(--cm-text-3)", border: "var(--cm-border)" },
};

const CONFIDENCE_LABELS = { high: "High Confidence", medium: "Medium Confidence", low: "Low Confidence", estimated: "Estimated" };

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

function getCTA(p) {
  if (p.board_group === "needs_outreach") return { label: "Start Outreach", style: "primary" };
  if (p.board_group === "waiting_on_reply" || p.board_group === "overdue") return { label: "Follow Up", style: "warn" };
  return { label: "View Journey", style: "outline" };
}

function getHeroAdvice(p) {
  if (!p) return "";
  const g = p.board_group;
  const s = p.signals || {};
  if (g === "overdue") {
    const days = p.next_action_due ? Math.abs(Math.ceil((new Date(p.next_action_due + "T00:00:00") - new Date()) / 86400000)) : "several";
    return `Coach hasn't heard from you in ${days} days. Send a short follow-up mentioning your recent results.`;
  }
  if (g === "needs_outreach") return "This school matches your profile well. Send an introductory email with your highlight reel.";
  if (g === "waiting_on_reply") return s.days_since_outreach > 5 ? "It's been a while since your outreach. Consider a brief follow-up." : "Give the coach a bit more time, then follow up with a quick check-in.";
  if (g === "in_conversation") return "You've got momentum here — keep the conversation going and ask about a campus visit.";
  return "Review this school's program and plan your next outreach.";
}

function getActionContext(p) {
  const g = p.board_group;
  if (g === "overdue") return "A short follow-up would help keep momentum going with the coaching staff.";
  if (g === "needs_outreach") return "Send an introductory email with your highlight reel.";
  if (g === "waiting_on_reply") return "Consider a brief follow-up to keep the conversation alive.";
  if (g === "in_conversation") return "Keep the conversation going and ask about next steps.";
  return "Plan your next outreach.";
}

/* ── Kanban column config ── */
const KANBAN_COLS = [
  { key: "added", label: "Added", color: "#94a3b8" },
  { key: "outreach", label: "Outreach", color: "#0d9488" },
  { key: "in_conversation", label: "Talking", color: "#22c55e" },
  { key: "campus_visit", label: "Visit", color: "#3b82f6" },
  { key: "offer", label: "Offer", color: "#a855f7" },
  { key: "committed", label: "Committed", color: "#fbbf24" },
];

function programToKanbanCol(p) {
  if (p.recruiting_status === "Committed" || p.journey_stage === "committed") return "committed";
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

/* Generate action items */
function generateActions(programs, matchScores) {
  const actions = [];
  const order = ["overdue", "waiting_on_reply", "needs_outreach", "in_conversation"];
  const sorted = [...programs]
    .filter(p => p.board_group !== "archived" && p.recruiting_status !== "Committed" && p.journey_stage !== "committed")
    .sort((a, b) => {
      const ai = order.indexOf(a.board_group); const bi = order.indexOf(b.board_group);
      return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
    });

  for (const p of sorted.slice(0, 6)) {
    const ms = matchScores[p.program_id];
    const cta = getCTA(p);
    const due = getDueInfo(p);
    actions.push({ id: p.program_id, type: "school", program: p, title: cta.label === "Start Outreach" ? `Start outreach to ${p.university_name}` : `Follow up with ${p.university_name}`, context: getActionContext(p), match_score: ms?.match_score, stage: p.journey_stage || "added", division: p.division, due, cta, matchScore: ms });
  }
  const activeCount = programs.filter(p => p.board_group !== "archived").length;
  if (activeCount < 8) {
    actions.push({ id: "add-schools", type: "growth", title: "Grow Your Target List", context: `Add ${Math.max(3, 8 - activeCount)} more target schools to keep your pipeline healthy.`, cta: { label: "Browse Schools", style: "primary" } });
  }
  return actions;
}


/* ═══════════════════════════════════════════ */
/* ── Hero Card = Actions Carousel           ── */
/* ═══════════════════════════════════════════ */
function HeroActionsCarousel({ actions, matchScores, navigate }) {
  const [idx, setIdx] = useState(0);
  const total = actions.length;
  if (total === 0) return null;

  const prev = () => setIdx(i => (i - 1 + total) % total);
  const next = () => setIdx(i => (i + 1) % total);
  const action = actions[idx];
  const isSchool = action.type === "school";
  const p = action.program;
  const ms = isSchool ? (action.matchScore || matchScores[p?.program_id]) : null;
  const matchPct = ms?.match_score ?? action.match_score;
  const socialLinks = ms?.social_links || p?.social_links;
  const sig = p?.signals || {};
  const meta = p ? [p.conference, sig.total_interactions ? `${sig.total_interactions} events` : null].filter(Boolean).join(" · ") : "";
  const fitLabel = ms?.measurables_fit?.label;
  const fitColor = FIT_COLORS[fitLabel] || FIT_COLORS["Not Enough Data"];
  const confidence = ms?.confidence;
  const confLabel = CONFIDENCE_LABELS[confidence] || "";
  const advice = isSchool ? getHeroAdvice(p) : action.context;
  const stages = isSchool ? computeRail(p.journey_stage || (p.board_group === "needs_outreach" ? "added" : "outreach")) : null;
  const stageLabels = { added: "Added", outreach: "Outreach", in_conversation: "Talking", campus_visit: "Visit", offer: "Offer", committed: "Committed" };

  const handleCTA = () => {
    if (action.type === "growth") navigate("/schools");
    else if (p) navigate(`/pipeline/${p.program_id}`);
  };

  return (
    <div style={{ background: "linear-gradient(145deg, #1a2332 0%, #0f1a26 100%)", borderRadius: 18, overflow: "hidden", position: "relative", border: "1px solid rgba(255,255,255,0.04)" }} data-testid="pipeline-hero-card">
      {/* Teal accent bar */}
      <div style={{ height: 3, background: "linear-gradient(90deg, #0d9488, #14b8a6)" }} />
      {/* Subtle glow */}
      <div style={{ position: "absolute", top: "-40%", right: "-10%", width: 400, height: 400, background: "radial-gradient(circle, rgba(13,148,136,0.06) 0%, transparent 70%)", pointerEvents: "none" }} />

      <div style={{ padding: "24px 28px 0", position: "relative", zIndex: 1 }}>
        {/* Header: label + carousel nav */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(255,255,255,0.3)" }}>Actions Needed Today</span>
          {total > 1 && (
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <button onClick={prev} style={{ width: 28, height: 28, borderRadius: 8, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "rgba(255,255,255,0.4)" }} data-testid="carousel-prev"><ChevronLeft style={{ width: 14, height: 14 }} /></button>
              <div style={{ display: "flex", gap: 6 }}>
                {actions.map((_, i) => (
                  <div key={i} onClick={() => setIdx(i)} style={{ width: i === idx ? 18 : 6, height: 6, borderRadius: i === idx ? 4 : "50%", background: i === idx ? "#0d9488" : "rgba(255,255,255,0.15)", cursor: "pointer", transition: "all 0.2s" }} data-testid={`carousel-dot-${i}`} />
                ))}
              </div>
              <button onClick={next} style={{ width: 28, height: 28, borderRadius: 8, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "rgba(255,255,255,0.4)" }} data-testid="carousel-next"><ChevronRight style={{ width: 14, height: 14 }} /></button>
            </div>
          )}
        </div>

        {/* Top row: logo + name on left, progress rail on right */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 20, marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            {isSchool && p ? (
              <>
                <UniversityLogo domain={p.domain} name={p.university_name} logoUrl={ms?.logo_url} size={48} className="rounded-[14px]" />
                <span style={{ fontSize: 22, fontWeight: 800, color: "#fff", letterSpacing: -0.3 }}>{p.university_name}</span>
              </>
            ) : (
              <span style={{ fontSize: 22, fontWeight: 800, color: "#fff", letterSpacing: -0.3 }}>{action.title}</span>
            )}
          </div>
          {/* Progress Rail */}
          {isSchool && stages && (
            <div style={{ width: 320, flexShrink: 0 }} className="hidden md:block">
              <div style={{ display: "flex", alignItems: "center", height: 24 }}>
                {stages.map((s, i) => (
                  <React.Fragment key={s.key}>
                    {i > 0 && <div style={{ flex: 1, height: 2, background: s.state === "past" || (stages[i-1]?.state === "past" && s.state === "active") ? "rgba(13,148,136,0.4)" : "rgba(255,255,255,0.08)" }} />}
                    <div style={{ position: "relative" }}>
                      <div style={{
                        width: s.state === "active" ? 16 : 10, height: s.state === "active" ? 16 : 10,
                        borderRadius: "50%",
                        background: s.state === "future" ? "transparent" : s.state === "active" ? "#0d9488" : "rgba(13,148,136,0.5)",
                        border: s.state === "future" ? "2px solid rgba(255,255,255,0.15)" : "none",
                        boxShadow: s.state === "active" ? "0 0 12px rgba(13,148,136,0.5)" : "none",
                      }} />
                      {s.state === "active" && <div style={{ position: "absolute", inset: -4, borderRadius: "50%", border: "2px solid rgba(13,148,136,0.4)", animation: "heroPulse 2s ease-out infinite", pointerEvents: "none" }} />}
                    </div>
                  </React.Fragment>
                ))}
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
                {stages.map(s => (
                  <span key={s.key} style={{ flex: 1, textAlign: "center", fontSize: 9, fontWeight: s.state === "active" ? 800 : 600, color: s.state === "active" ? "#5eead4" : "rgba(255,255,255,0.25)" }}>
                    {stageLabels[s.key] || s.label}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Badges row */}
        {isSchool && p && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.4)" }}>
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#94a3b8" }} />
              {sig.has_coach_reply ? "Interested" : "Neutral"}
            </span>
            {p.division && <span style={{ padding: "3px 10px", borderRadius: 6, fontSize: 11, fontWeight: 700, background: "rgba(13,148,136,0.2)", color: "#5eead4" }}>{p.division}</span>}
            {matchPct != null && <span style={{ padding: "3px 10px", borderRadius: 6, fontSize: 11, fontWeight: 700, background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.6)" }}>{matchPct}% Match</span>}
            {fitLabel && <span style={{ padding: "3px 10px", borderRadius: 6, fontSize: 11, fontWeight: 700, background: fitColor.bg, color: fitColor.text, border: `1px solid ${fitColor.border}` }}>{fitLabel}</span>}
            {confLabel && confidence !== "high" && <span style={{ fontSize: 10, fontWeight: 600, color: "rgba(255,255,255,0.3)", fontStyle: "italic" }}>{confLabel}</span>}
            {meta && <span style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.3)" }}>{meta}</span>}
            {socialLinks && (
              <div style={{ display: "flex", gap: 8, marginLeft: 4 }}>
                {socialLinks.twitter && <a href={socialLinks.twitter} target="_blank" rel="noopener noreferrer" style={{ width: 22, height: 22, borderRadius: 6, background: "rgba(255,255,255,0.06)", display: "inline-flex", alignItems: "center", justifyContent: "center", color: "rgba(255,255,255,0.35)", fontSize: 9, fontWeight: 700, textDecoration: "none" }}>X</a>}
                {socialLinks.instagram && <a href={socialLinks.instagram} target="_blank" rel="noopener noreferrer" style={{ width: 22, height: 22, borderRadius: 6, background: "rgba(255,255,255,0.06)", display: "inline-flex", alignItems: "center", justifyContent: "center", color: "rgba(255,255,255,0.35)", fontSize: 9, fontWeight: 700, textDecoration: "none" }}>IG</a>}
                {socialLinks.facebook && <a href={socialLinks.facebook} target="_blank" rel="noopener noreferrer" style={{ width: 22, height: 22, borderRadius: 6, background: "rgba(255,255,255,0.06)", display: "inline-flex", alignItems: "center", justifyContent: "center", color: "rgba(255,255,255,0.35)", fontSize: 9, fontWeight: 700, textDecoration: "none" }}>FB</a>}
              </div>
            )}
          </div>
        )}

        {/* Bottom: Advice box + CTA button */}
        <div style={{ display: "flex", gap: 16, alignItems: "stretch" }}>
          {advice && (
            <div style={{ flex: 1, minWidth: 0, background: "rgba(13,148,136,0.06)", border: "1px solid rgba(13,148,136,0.15)", borderRadius: 12, padding: "16px 18px", display: "flex", gap: 12, alignItems: "flex-start" }} data-testid="hero-advice-card">
              <Lightbulb style={{ width: 16, height: 16, color: "rgba(255,255,255,0.3)", flexShrink: 0, marginTop: 2 }} />
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.5)", marginBottom: 4 }}>What to do next</div>
                <div style={{ fontSize: 13, fontWeight: 500, color: "rgba(255,255,255,0.7)", lineHeight: 1.55 }}>{advice}</div>
              </div>
            </div>
          )}
          <button onClick={handleCTA} style={{
            padding: "16px 28px", borderRadius: 12, border: "none",
            background: action.cta.style === "warn" ? "#f59e0b" : "#0d9488",
            color: "white", fontSize: 14, fontWeight: 700, cursor: "pointer", display: "flex",
            alignItems: "center", justifyContent: "center", gap: 8, fontFamily: "inherit", flexShrink: 0,
            minWidth: 140, transition: "all 0.2s",
          }} data-testid="hero-cta-btn">
            <Send style={{ width: 15, height: 15 }} />
            {action.cta.label}
          </button>
        </div>
      </div>

      {/* Footer: Next preview */}
      {total > 1 && idx + 1 < total && (
        <div style={{ padding: "12px 28px 18px", position: "relative", zIndex: 1 }}>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.22)" }}>
            Next: <span style={{ color: "rgba(255,255,255,0.35)", fontWeight: 600 }}>{actions[(idx + 1) % total]?.title}</span>
          </div>
        </div>
      )}
      {(!total || total <= 1 || idx + 1 >= total) && <div style={{ height: 18 }} />}
    </div>
  );
}


/* ═══════════════════════════════════════════ */
/* ── Upcoming Events                        ── */
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
          <Calendar style={{ width: 15, height: 15, color: "#0d9488" }} /> Upcoming Events
        </div>
        <button onClick={() => navigate("/calendar")} style={{ fontSize: 11, fontWeight: 600, color: "#0d9488", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 3 }}>View Calendar <ChevronRight style={{ width: 12, height: 12 }} /></button>
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
/* ── CRM-style Kanban Board                 ── */
/* ═══════════════════════════════════════════ */
function KanbanCard({ program: p, matchScore, navigate }) {
  const ms = matchScore?.match_score;
  const dotColor = getStatusDot(p);
  const meta = [p.division, p.conference].filter(Boolean).join(" · ");

  return (
    <div onClick={() => navigate(`/pipeline/${p.program_id}`)} style={{
      background: "var(--cm-surface)", border: "1px solid var(--cm-border)", borderRadius: 10,
      padding: "14px 16px", marginBottom: 6, cursor: "pointer", transition: "all 0.15s",
    }} className="hover:shadow-sm" data-testid={`kanban-card-${p.program_id}`}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--cm-text)", marginBottom: 3, lineHeight: 1.3 }}>{p.university_name}</div>
          {meta && <div style={{ fontSize: 11, color: "var(--cm-text-3)", marginBottom: 6 }}>{meta}</div>}
          {ms != null && (
            <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 700, color: "var(--cm-text-2)" }}>
              <UniversityLogo domain={p.domain} name={p.university_name} size={18} className="rounded-[5px]" />
              {ms}%
            </div>
          )}
        </div>
        <div style={{ width: 10, height: 10, borderRadius: "50%", background: dotColor, flexShrink: 0, marginTop: 4 }} />
      </div>
    </div>
  );
}

function KanbanBoard({ programs, matchScores, navigate }) {
  const columns = {};
  KANBAN_COLS.forEach(c => { columns[c.key] = []; });
  for (const p of programs) {
    if (p.board_group === "archived") continue;
    const col = programToKanbanCol(p);
    if (columns[col]) columns[col].push(p);
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 0, minHeight: 200, border: "1px solid var(--cm-border)", borderRadius: 14, overflow: "hidden", background: "var(--cm-surface)" }} className="kanban-grid" data-testid="kanban-board">
      {KANBAN_COLS.map((col, ci) => (
        <div key={col.key} style={{ borderRight: ci < 5 ? "1px solid var(--cm-border)" : "none", minWidth: 0 }}>
          {/* Thin colored bar */}
          <div style={{ height: 3, background: col.color }} />
          {/* Header */}
          <div style={{ padding: "14px 14px 10px" }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: "var(--cm-text)", marginBottom: 2 }}>{col.label}</div>
            <div style={{ fontSize: 11, color: "var(--cm-text-3)" }}>{columns[col.key].length} school{columns[col.key].length !== 1 ? "s" : ""}</div>
          </div>
          {/* Cards */}
          <div style={{ padding: "0 8px 8px" }}>
            {columns[col.key].length > 0 ? (
              columns[col.key].map(p => <KanbanCard key={p.program_id} program={p} matchScore={matchScores[p.program_id]} navigate={navigate} />)
            ) : (
              <div style={{ padding: "20px 8px", textAlign: "center", fontSize: 11, color: "var(--cm-text-4)" }}>—</div>
            )}
          </div>
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
/* ── Styles + Empty State                   ── */
/* ═══════════════════════════════════════════ */
function PipelineStyles() {
  return (
    <style>{`
      @keyframes heroPulse { 0%{opacity:1;transform:scale(1)} 100%{opacity:0;transform:scale(2.2)} }
      @media (max-width: 1024px) { .kanban-grid { grid-template-columns: repeat(3, 1fr) !important; } }
      @media (max-width: 640px) { .kanban-grid { grid-template-columns: repeat(2, 1fr) !important; } }
    `}</style>
  );
}

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
  useEffect(() => { axios.get(`${API}/athlete/events`).then(res => setEvents(Array.isArray(res.data) ? res.data : [])).catch(() => {}); }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24" data-testid="board-loading">
        <div className="flex flex-col items-center gap-3"><Loader2 className="w-8 h-8 animate-spin" style={{ color: "#999" }} /><span className="text-sm" style={{ color: "#999" }}>Loading your board...</span></div>
      </div>
    );
  }

  const activePrograms = allPrograms.filter(p => p.board_group !== "archived");
  const archivedPrograms = allPrograms.filter(p => p.board_group === "archived");

  if (activePrograms.length === 0 && archivedPrograms.length === 0) {
    return <div style={{ maxWidth: 1120, margin: "0 auto" }}><PipelineStyles /><EmptyBoardState navigate={navigate} /></div>;
  }

  /* Focus program = most urgent */
  const priorityOrder = ["overdue", "waiting_on_reply", "needs_outreach", "in_conversation"];
  const focusProgram = [...activePrograms].sort((a, b) => {
    const ai = priorityOrder.indexOf(a.board_group); const bi = priorityOrder.indexOf(b.board_group);
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  })[0];

  const actions = generateActions(allPrograms, matchScores);
  const guidance = Object.values(matchScores).find(s => s.confidence_guidance)?.confidence_guidance;

  return (
    <div style={{ maxWidth: 1120, margin: "0 auto" }} data-testid="recruiting-board">
      <PipelineStyles />

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 16, marginBottom: 20 }}>
        <button onClick={() => navigate("/schools")} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "10px 20px", borderRadius: 10, border: "1px solid var(--cm-border)", background: "var(--cm-surface)", fontSize: 13, fontWeight: 700, color: "var(--cm-text)", cursor: "pointer", fontFamily: "inherit" }} data-testid="add-school-btn">
          <Plus style={{ width: 14, height: 14 }} /> Add School
        </button>
      </div>

      {/* 1. Hero Card */}
      {focusProgram && (
        <div style={{ marginBottom: 16 }}>
          <PipelineHeroCard program={focusProgram} matchScore={matchScores[focusProgram.program_id]} navigate={navigate} />
        </div>
      )}

      {/* 2. Actions Carousel */}
      <ActionsCarousel actions={actions} navigate={navigate} />

      {/* Guidance Banner */}
      {guidance && <MeasurablesGuidanceBanner guidance={guidance} navigate={navigate} />}

      {/* 3. Upcoming Events */}
      <UpcomingEventsSection events={events} navigate={navigate} />

      {/* 4. Kanban Board */}
      <KanbanBoard programs={allPrograms} matchScores={matchScores} navigate={navigate} />

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
    </div>
  );
}

import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import {
  ChevronRight, Loader2,
  AlertTriangle,
  Archive, RotateCcw, CheckSquare, Clock,
} from "lucide-react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { toast } from "sonner";
import UniversityLogo from "../../components/UniversityLogo";
import { useSubscription, getUsage } from "../../lib/subscription";
import UpgradeModal from "../../components/UpgradeModal";
import OnboardingEmptyBoard from "../../components/onboarding/EmptyBoardState";
import { PipelineHealthBadge } from "../../components/PipelineHealthBadge";
import PipelineHero from "../../components/pipeline/PipelineHero";
import ComingUpTimeline, { buildTimelineItems } from "../../components/pipeline/ComingUpTimeline";

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
  if (p.recruiting_status === "Committed" || p.journey_stage === "committed") return null;
  if (p.journey_stage === "campus_visit") return "campus_visit";
  if (p.journey_stage === "offer") return "offer";
  if (p.journey_stage === "in_conversation" || p.board_group === "in_conversation") return "in_conversation";
  if (p.journey_stage === "outreach" || p.board_group === "waiting_on_reply" || p.board_group === "overdue") return "outreach";
  return "added";
}

/* Generate action items — driven by topActionsMap from the Top Action Engine.
   Falls back to legacy generation when topActionsMap is empty (loading).
*/
function generateActions(programs, matchScores, tasks, healthMap, topActionsMap) {
  const active = programs.filter(p =>
    p.board_group !== "archived" && p.recruiting_status !== "Committed" && p.journey_stage !== "committed"
  );

  // If top actions available, use them (skip "on_track" for hero)
  if (topActionsMap && Object.keys(topActionsMap).length > 0) {
    const alerts = [];
    for (const p of active) {
      const ta = topActionsMap[p.program_id];
      if (ta && ta.action_key !== "no_action_needed") {
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
      } else {
        // On track — no specific action needed
        alerts.push({
          id: p.program_id,
          type: "school",
          program: p,
          category: "on_track",
          title: `${p.university_name} — On Track`,
          context: "Everything looks good — keep the momentum going.",
          owner: "athlete",
          cta: { label: "View School", style: "primary" },
          matchScore: matchScores[p.program_id],
          due: getDueInfo(p),
          priority: 99,
        });
      }
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

/* ── Card status detection + visual cues ── */
const STATUS_VISUAL = {
  coach_flag:     { border: "rgba(239,68,68,0.22)", chip: "#ef4444", chipBg: "rgba(239,68,68,0.08)", label: "Coach task" },
  director_action:{ border: "rgba(239,68,68,0.22)", chip: "#ef4444", chipBg: "rgba(239,68,68,0.08)", label: "Action needed" },
  past_due:       { border: "rgba(239,68,68,0.22)", chip: "#ef4444", chipBg: "rgba(239,68,68,0.08)", label: "Overdue" },
  reply_needed:   { border: "rgba(59,130,246,0.18)", chip: "#3b82f6", chipBg: "rgba(59,130,246,0.07)", label: "Awaiting reply" },
  due_today:      { border: "rgba(245,158,11,0.22)", chip: "#d97706", chipBg: "rgba(245,158,11,0.08)", label: "Due today" },
  cooling_off:    { border: "rgba(245,158,11,0.18)", chip: "#d97706", chipBg: "rgba(245,158,11,0.07)", label: "No recent engagement" },
  first_outreach: { border: "rgba(129,140,248,0.18)", chip: "#818cf8", chipBg: "rgba(129,140,248,0.07)", label: "No contact yet" },
  on_track:       { border: "transparent", chip: "#10b981", chipBg: "rgba(16,185,129,0.06)", label: "On track" },
};
const NEUTRAL_STATUS = { border: "transparent", chip: null, chipBg: null, label: null };

/* ── Short insight from top action (max 1 line) ── */
function getShortInsight(topAction) {
  if (!topAction || topAction.action_key === "no_action_needed") return null;
  const map = {
    coach_assigned_action: "Coach assigned a follow-up",
    overdue_follow_up: "Follow-up is overdue",
    stale_reply: "Awaiting reply",
    first_outreach_needed: "Ready for first contact",
    relationship_cooling: "No recent engagement",
    due_today_follow_up: "Follow-up due today",
  };
  return map[topAction.action_key] || topAction.label || null;
}

/* ── Column header contextual insights ── */
function getColInsight(colKey, count) {
  if (count === 0) return "";
  const insights = {
    added: `${count} ready to outreach`,
    outreach: `${count} waiting on coaches`,
    in_conversation: "Active conversations",
    campus_visit: count === 1 ? "Visit planned" : `${count} visits planned`,
    offer: count === 1 ? "Offer to review" : `${count} offers to review`,
  };
  return insights[colKey] || "";
}

/* #6 Empty column helpful copy */
function getEmptyColCopy(colKey) {
  const copy = {
    added: "Add schools to start building your list",
    outreach: "Schools move here after first contact",
    in_conversation: "Active conversations will appear here",
    campus_visit: "No visits scheduled yet",
    offer: "Offers will appear here when received",
  };
  return copy[colKey] || "No schools yet";
}

function KanbanCard({ program: p, matchScore, navigate, index, healthMetrics, topAction, isHighlighted, justDroppedId }) {
  const category = topAction?.category || "on_track";
  const isUrgent = ["coach_flag", "director_action", "past_due", "due_today"].includes(category);
  const isPassive = !isUrgent && (category === "on_track" || category === "cooling_off" || category === "first_outreach");
  const sv = STATUS_VISUAL[category] || NEUTRAL_STATUS;
  const insight = getShortInsight(topAction);
  const inlineMeta = [p.division, p.conference].filter(Boolean).join(" \u00b7 ");

  const baseShadow = "0 1px 2px rgba(0,0,0,0.04), 0 1px 3px rgba(0,0,0,0.03)";
  const activeBorder = sv.border !== "transparent" ? sv.border : "var(--cm-border, #e2e8f0)";
  const heroBorder = isHighlighted ? `${sv.chip || "rgba(13,148,136,0.3)"}` : null;

  let cardShadow = baseShadow;
  if (isUrgent) cardShadow = `${baseShadow}, inset 0 0 0 1px ${sv.border}`;
  else if (isHighlighted && !isPassive) cardShadow = `${baseShadow}, 0 0 0 1px ${heroBorder}, 0 0 8px ${heroBorder}22`;
  else if (isHighlighted) cardShadow = `${baseShadow}, 0 0 0 1px ${heroBorder}55`;

  const isJustDropped = justDroppedId === p.program_id;

  return (
    <Draggable draggableId={p.program_id} index={index}>
      {(provided, snapshot) => {
        const isActiveDrag = snapshot.isDragging && !snapshot.isDropAnimating;
        const libStyle = provided.draggableProps.style || {};
        const baseTransform = libStyle.transform || '';
        const composedTransform = isActiveDrag
          ? `${baseTransform} scale(1.04) rotate(1.5deg)`.trim()
          : baseTransform || undefined;
        const dragShadow = "0 24px 48px rgba(0,0,0,0.12), 0 8px 24px rgba(0,0,0,0.08), 0 0 0 1px rgba(13,148,136,0.08)";

        return (
          <div
            ref={provided.innerRef}
            {...provided.draggableProps}
            {...provided.dragHandleProps}
            onClick={() => !snapshot.isDragging && navigate(`/pipeline/${p.program_id}`)}
            className={`kanban-card${isJustDropped ? ' kanban-card-settled' : ''}`}
            style={{
              ...libStyle,
              transform: composedTransform,
              background: "var(--cm-surface)",
              borderRadius: 10,
              padding: "12px 14px",
              cursor: isActiveDrag ? "grabbing" : "grab",
              border: `1px solid ${isActiveDrag ? "rgba(13,148,136,0.12)" : isPassive ? "var(--cm-border, #e8ecf1)" : activeBorder}`,
              borderLeft: sv.border !== "transparent" && !isActiveDrag ? `${isUrgent ? 4 : 3}px solid ${sv.border}` : isActiveDrag ? "3px solid rgba(13,148,136,0.2)" : undefined,
              boxShadow: isActiveDrag ? dragShadow : cardShadow,
              opacity: isActiveDrag ? 1 : isPassive && !isHighlighted ? 0.72 : 1,
              zIndex: isActiveDrag ? 9999 : undefined,
            }}
            data-testid={`kanban-card-${p.program_id}`}
          >
            {/* Row 1: Logo + Name + Metadata */}
            <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
              <UniversityLogo domain={p.domain} name={p.university_name} logoUrl={p.logo_url} size={28} className="rounded-[6px] mt-[2px] flex-shrink-0" />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "var(--cm-text)", lineHeight: 1.35 }}>{p.university_name}</div>
                {inlineMeta && (
                  <div style={{ fontSize: 11, color: "var(--cm-text-4, var(--cm-text-3))", marginTop: 2 }}>{inlineMeta}</div>
                )}
              </div>
            </div>

            {/* Row 2: Status chip */}
            {sv.label && category !== "on_track" && (
              <div style={{ marginTop: 8 }}>
                <span style={{
                  fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 6,
                  background: sv.chipBg, color: sv.chip,
                  letterSpacing: "0.02em",
                }}>{sv.label}</span>
              </div>
            )}

            {/* Row 3: Short insight (max 1 line) */}
            {insight && (
              <div style={{ fontSize: 11, color: isPassive ? "var(--cm-text-4)" : "var(--cm-text-3)", marginTop: 6, lineHeight: 1.4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {insight}
              </div>
            )}
          </div>
        );
      }}
    </Draggable>
  );
}

function KanbanBoard({ programs, matchScores, navigate, onDragEnd, healthMap, topActionsMap, highlightedIds, justDroppedId }) {
  const isMobile = useIsMobile();
  const columns = {};
  KANBAN_COLS.forEach(c => { columns[c.key] = []; });
  for (const p of programs) {
    if (p.board_group === "archived") continue;
    const col = programToKanbanCol(p);
    if (col && columns[col]) columns[col].push(p);
  }

  const gridStyle = isMobile
    ? { display: "flex", gap: 12, overflowX: "auto", WebkitOverflowScrolling: "touch", scrollSnapType: "x mandatory", paddingBottom: 8 }
    : { display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 20 };

  const colStyle = isMobile ? { minWidth: 240, flexShrink: 0, scrollSnapAlign: "start" } : {};
  const hlSet = new Set(highlightedIds || []);

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div style={gridStyle} className="kanban-grid" data-testid="kanban-board">
        {KANBAN_COLS.map(col => {
          const count = columns[col.key].length;
          const insight = getColInsight(col.key, count);
          return (
            <Droppable droppableId={col.key} key={col.key}>
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  style={{
                    background: snapshot.isDraggingOver ? "rgba(13,148,136,0.05)" : "transparent",
                    borderRadius: 10, minHeight: 200, overflow: "hidden",
                    transition: "background 250ms cubic-bezier(0.22,1,0.36,1), box-shadow 250ms cubic-bezier(0.22,1,0.36,1), border-color 250ms cubic-bezier(0.22,1,0.36,1)",
                    border: snapshot.isDraggingOver ? "1.5px solid rgba(13,148,136,0.2)" : "1.5px solid transparent",
                    boxShadow: snapshot.isDraggingOver ? "inset 0 2px 20px rgba(13,148,136,0.06), 0 0 0 1px rgba(13,148,136,0.04)" : "none",
                    ...colStyle,
                  }}
                >
                  {/* Lane top bar */}
                  <div style={{ height: 2, background: col.color, opacity: snapshot.isDraggingOver ? 1 : 0.65, borderRadius: "10px 10px 0 0", boxShadow: snapshot.isDraggingOver ? `0 0 12px ${col.color}55` : "none", transition: "opacity 250ms ease, box-shadow 250ms ease" }} />

                  {/* Header */}
                  <div style={{ padding: "16px 10px 14px" }}>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 5 }}>
                      <span style={{ fontSize: 12.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", color: snapshot.isDraggingOver ? "var(--cm-text, #0f172a)" : "var(--cm-text-2, #334155)", transition: "color 250ms ease" }}>{col.label}</span>
                      <span style={{ fontSize: 11.5, fontWeight: 600, color: "var(--cm-text-3, #94a3b8)" }}>{count}</span>
                    </div>
                    {insight && (
                      <div style={{ fontSize: 10.5, color: "var(--cm-text-3, #94a3b8)", marginTop: 4, fontWeight: 500 }}>{insight}</div>
                    )}
                  </div>

                  {/* Cards — #5 more vertical spacing */}
                  <div style={{ padding: "0 6px 12px", display: "flex", flexDirection: "column", gap: 8, minHeight: 60 }}>
                    {count > 0 ? (
                      columns[col.key].map((p, idx) => (
                        <KanbanCard
                          key={p.program_id}
                          program={p}
                          matchScore={matchScores[p.program_id]}
                          navigate={navigate}
                          index={idx}
                          healthMetrics={healthMap[p.program_id]}
                          topAction={topActionsMap[p.program_id]}
                          isHighlighted={hlSet.has(p.program_id)}
                          justDroppedId={justDroppedId}
                        />
                      ))
                    ) : (
                      <div style={{ padding: "28px 12px", textAlign: "center" }}>
                        <div style={{ fontSize: 11, color: "var(--cm-text-4)", fontWeight: 500 }}>{getEmptyColCopy(col.key)}</div>
                      </div>
                    )}
                    {provided.placeholder}
                  </div>
                </div>
              )}
            </Droppable>
          );
        })}
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
      .kanban-card {
        transition: transform 200ms cubic-bezier(0.22, 1, 0.36, 1),
                    box-shadow 200ms cubic-bezier(0.22, 1, 0.36, 1),
                    opacity 200ms cubic-bezier(0.22, 1, 0.36, 1),
                    border-color 200ms cubic-bezier(0.22, 1, 0.36, 1);
      }
      .kanban-card:hover {
        transform: translateY(-2px);
        box-shadow: 0 6px 20px rgba(0,0,0,0.07), 0 2px 6px rgba(0,0,0,0.04) !important;
        opacity: 1 !important;
      }
      .kanban-card:active { transform: translateY(0); }
      .kanban-card-settled {
        animation: kanban-settle 400ms cubic-bezier(0.22, 1, 0.36, 1) both;
      }
      @keyframes kanban-settle {
        0%   { box-shadow: 0 0 0 3px rgba(13,148,136,0.25), 0 6px 24px rgba(13,148,136,0.12); }
        50%  { box-shadow: 0 0 0 2px rgba(13,148,136,0.12), 0 3px 12px rgba(13,148,136,0.05); }
        100% { box-shadow: 0 1px 2px rgba(0,0,0,0.04), 0 1px 3px rgba(0,0,0,0.03); }
      }
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
  const [justDroppedId, setJustDroppedId] = useState(null);
  const navigate = useNavigate();
  const { subscription, refresh: refreshSub, loading: subLoading } = useSubscription();

  const fetchAll = useCallback(async () => {
    try {
      // Fire all 5 requests in parallel instead of waterfall
      const [programsRes, matchRes, tasksRes, topActionsRes] = await Promise.all([
        axios.get(`${API}/athlete/programs`),
        axios.get(`${API}/match-scores`).catch(() => ({ data: { scores: [] } })),
        axios.get(`${API}/athlete/tasks`).catch(() => ({ data: { tasks: [] } })),
        axios.get(`${API}/internal/programs/top-actions`).catch(() => ({ data: { actions: [] } })),
      ]);

      const programs = Array.isArray(programsRes.data) ? programsRes.data : [];
      setAllPrograms(programs);

      const byId = {};
      (matchRes.data?.scores || []).forEach(s => { byId[s.program_id] = s; });
      setMatchScores(byId);

      setTasks(tasksRes.data?.tasks || []);

      const actionsMap = {};
      (topActionsRes.data?.actions || []).forEach(a => { actionsMap[a.program_id] = a; });
      setTopActionsMap(actionsMap);

      // Batch metrics needs program IDs — fire after we have them
      const ids = programs.map(p => p.program_id).filter(Boolean);
      if (ids.length > 0) {
        try {
          const metricsRes = await axios.post(`${API}/internal/programs/batch-metrics`, { program_ids: ids });
          const m = metricsRes.data?.metrics || {};
          const mapped = {};
          for (const [pid, data] of Object.entries(m)) {
            mapped[pid] = { ...data, program_id: pid };
          }
          setHealthMap(mapped);
        } catch {}
      }
    } catch { toast.error("Failed to load programs"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  /* ── Drag & Drop handler ── */
  const handleDragEnd = useCallback(async (result) => {
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId) return;

    const newCol = destination.droppableId;
    const stageUpdate = COL_TO_STAGE[newCol];
    if (!stageUpdate) return;

    // Post-drop settle animation
    setJustDroppedId(draggableId);
    setTimeout(() => setJustDroppedId(null), 500);

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
      fetchAll(); // revert
    }
  }, [fetchAll]);

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
    return <div style={{ maxWidth: 1120, margin: "0 auto" }}><PipelineStyles /><OnboardingEmptyBoard onSchoolAdded={fetchAll} /></div>;
  }

  const actions = generateActions(allPrograms, matchScores, tasks, healthMap, topActionsMap);
  const guidance = Object.values(matchScores).find(s => s.confidence_guidance)?.confidence_guidance;
  const usage = getUsage(subscription, "schools");
  const schoolPct = usage.limit > 0 && !usage.unlimited ? usage.used / usage.limit : 0;
  const nearLimit = schoolPct >= 0.8;

  /* Classify for summary chips */
  const URGENT_CATS = new Set(["coach_flag", "director_action", "past_due", "reply_needed", "due_today"]);
  const MOMENTUM_CATS = new Set(["cooling_off", "first_outreach"]);
  const urgentCount = actions.filter(a => URGENT_CATS.has(a.category)).length;
  const momentumCount = actions.filter(a => MOMENTUM_CATS.has(a.category)).length;
  const onTrackCount = actions.filter(a => a.category === "on_track").length;

  /* Build timeline items for "Coming Up Next" */
  const timelineItems = buildTimelineItems(allPrograms, topActionsMap, matchScores);

  /* Build highlighted program IDs for board connection (#8) */
  const heroIds = actions.filter(a => URGENT_CATS.has(a.category) || MOMENTUM_CATS.has(a.category)).map(a => a.program?.program_id).filter(Boolean);
  const timelineIds = timelineItems.map(t => t.programId);
  const highlightedIds = [...new Set([...heroIds, ...timelineIds])];

  return (
    <div style={{ maxWidth: 1120, margin: "0 auto" }} data-testid="recruiting-board">
      <PipelineStyles />

      {/* ═══ PAGE HEADER: Title + Summary Chips ═══ */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-0 mb-4 sm:mb-5" data-testid="pipeline-header">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight m-0" style={{ color: "var(--cm-text, #0f172a)" }}>
            Your Pipeline
          </h1>
          <p className="text-[12px] sm:text-[13px] font-medium mt-1 m-0 hidden sm:block" style={{ color: "var(--cm-text-3, #94a3b8)" }}>
            One focused hero for what matters now, plus a forward-looking timeline for what's next.
          </p>
        </div>
        <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap flex-shrink-0" data-testid="summary-chips">
          {urgentCount > 0 && (
            <span className="flex items-center gap-1.5 text-[10px] sm:text-[11px] font-medium px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full" data-testid="chip-attention"
              style={{ color: "var(--cm-text-3, #94a3b8)", background: "transparent" }}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#ef4444" }} />
              {urgentCount} needs attention
            </span>
          )}
          {momentumCount > 0 && (
            <span className="flex items-center gap-1.5 text-[10px] sm:text-[11px] font-medium px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full" data-testid="chip-momentum"
              style={{ color: "var(--cm-text-3, #94a3b8)", background: "transparent" }}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#818cf8" }} />
              {momentumCount} losing momentum
            </span>
          )}
          {onTrackCount > 0 && (
            <span className="flex items-center gap-1.5 text-[10px] sm:text-[11px] font-medium px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full" data-testid="chip-on-track"
              style={{ color: "var(--cm-text-3, #94a3b8)", background: "transparent" }}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#10b981" }} />
              {onTrackCount} on track
            </span>
          )}
        </div>
      </div>

      {/* ═══ HERO: What to do now ═══ */}
      <PipelineHero actions={actions} matchScores={matchScores} navigate={navigate} />

      {/* ═══ COMING UP NEXT: What's next ═══ */}
      <div style={{ marginTop: 20, marginBottom: 0 }}>
        <ComingUpTimeline items={timelineItems} />
      </div>

      {/* #7 BOARD SEPARATOR — subtle divider between timeline and board */}
      <div className="flex items-center gap-3 my-5 sm:my-6 px-1" data-testid="board-separator">
        <div className="flex-1 h-px" style={{ background: "var(--cm-border, #e2e8f0)" }} />
        <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider flex-shrink-0" style={{ color: "var(--cm-text-3, #94a3b8)" }}>
          Manage all programs
        </span>
        <div className="flex-1 h-px" style={{ background: "var(--cm-border, #e2e8f0)" }} />
      </div>

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
      <KanbanBoard programs={allPrograms} matchScores={matchScores} navigate={navigate} onDragEnd={handleDragEnd} healthMap={healthMap} topActionsMap={topActionsMap} highlightedIds={highlightedIds} justDroppedId={justDroppedId} />

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
              <button onClick={async (e) => { e.stopPropagation(); try { await axios.put(`${API}/athlete/programs/${p.program_id}`, { is_active: true }); toast.success(`${p.university_name} reactivated`); fetchAll(); } catch { toast.error("Failed"); } }} style={{ padding: "6px 14px", borderRadius: 8, fontSize: 11, fontWeight: 700, background: "rgba(13,148,136,0.08)", color: "#0d9488", border: "1px solid rgba(13,148,136,0.15)", cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 5, flexShrink: 0 }} data-testid={`reactivate-btn-${p.program_id}`}>
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
        currentTier={subscription?.tier || (subLoading ? "premium" : "basic")}
      />
    </div>
  );
}

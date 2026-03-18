/**
 * Pipeline shared constants and helpers.
 * Used by KanbanBoard, PriorityBoard, and PipelinePage.
 */

export const KANBAN_COLS = [
  { key: "added", label: "Added", color: "#94a3b8" },
  { key: "outreach", label: "Outreach", color: "#0d9488" },
  { key: "in_conversation", label: "Talking", color: "#22c55e" },
  { key: "campus_visit", label: "Visit", color: "#3b82f6" },
  { key: "offer", label: "Offered", color: "#a855f7" },
];

export const COL_TO_STAGE = {
  added: { journey_stage: "added", recruiting_status: "Not Contacted" },
  outreach: { journey_stage: "outreach", recruiting_status: "Contacted" },
  in_conversation: { journey_stage: "in_conversation", recruiting_status: "In Conversation" },
  campus_visit: { journey_stage: "campus_visit", recruiting_status: "Campus Visit" },
  offer: { journey_stage: "offer", recruiting_status: "Offer" },
};

export const ATTENTION_META = {
  high: { label: 'Needs attention', dot: '#ef4444', color: '#dc2626', bg: 'rgba(239,68,68,0.06)' },
  medium: { label: 'Needs action', dot: '#f59e0b', color: '#b45309', bg: 'rgba(245,158,11,0.06)' },
  low: { label: 'On track', dot: '#10b981', color: '#047857', bg: 'rgba(16,185,129,0.05)' },
};

export const ATTENTION_LABEL = { high: 'Needs attention', medium: 'Needs action', low: 'On track' };

export function programToKanbanCol(p) {
  if (p.recruiting_status === "Committed" || p.journey_stage === "committed") return null;
  if (p.journey_stage === "campus_visit") return "campus_visit";
  if (p.journey_stage === "offer") return "offer";
  if (p.journey_stage === "in_conversation" || p.board_group === "in_conversation") return "in_conversation";
  if (p.journey_stage === "outreach" || p.board_group === "waiting_on_reply" || p.board_group === "overdue") return "outreach";
  return "added";
}

export function getColInsight(colKey, count) {
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

export function getEmptyColCopy(colKey) {
  const copy = {
    added: "No schools added yet",
    outreach: "No outreach started",
    in_conversation: "No active conversations",
    campus_visit: "No visits scheduled",
    offer: "No offers yet",
  };
  return copy[colKey] || "No schools yet";
}

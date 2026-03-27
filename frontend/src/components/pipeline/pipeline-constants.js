/**
 * Pipeline shared constants and helpers.
 * Used by KanbanBoard, PriorityBoard, and PipelinePage.
 *
 * Sprint 3 SSOT: programToKanbanCol() uses pipeline_stage exclusively.
 * No fallback to journey_stage or board_group.
 */

export const KANBAN_COLS = [
  { key: "added", label: "Added", color: "#e05555" },
  { key: "outreach", label: "Outreach", color: "#2f80ed" },
  { key: "in_conversation", label: "Talking", color: "#e8862a" },
  { key: "campus_visit", label: "Visit", color: "#8b5cf6" },
  { key: "offer", label: "Offered", color: "#27ae60" },
];

export const COL_TO_STAGE = {
  added: { recruiting_status: "Not Contacted" },
  outreach: { recruiting_status: "Contacted" },
  in_conversation: { recruiting_status: "In Conversation" },
  campus_visit: { recruiting_status: "Campus Visit" },
  offer: { recruiting_status: "Offer" },
};

export const ATTENTION_META = {
  high: { label: 'Needs attention', dot: '#ef4444', color: '#dc2626', bg: 'rgba(239,68,68,0.06)' },
  medium: { label: 'Needs action', dot: '#f59e0b', color: '#b45309', bg: 'rgba(245,158,11,0.06)' },
  low: { label: 'On track', dot: '#10b981', color: '#047857', bg: 'rgba(16,185,129,0.05)' },
};

export const ATTENTION_LABEL = { high: 'Needs attention', medium: 'Needs action', low: 'On track' };

export function programToKanbanCol(p) {
  // Sprint 3 SSOT: use pipeline_stage exclusively
  const stage = p.pipeline_stage;
  if (stage === "committed" || stage === "archived") return null;
  if (stage === "offer") return "offer";
  if (stage === "campus_visit") return "campus_visit";
  if (stage === "in_conversation") return "in_conversation";
  if (stage === "outreach") return "outreach";
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

import { Send, UserPlus, FileText, MessageCircle, RefreshCw } from "lucide-react";

export const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export const DOT_COLOR = { high: "#b91c1c", medium: "#78716c" };

/* ── Trajectory display ── */
export const TRAJECTORY = {
  worsening: { symbol: "\u2198", label: "Worsening", color: "#dc2626" },
  stable:    { symbol: "\u2192", label: "Stable",    color: "#64748b" },
  improving: { symbol: "\u2197", label: "Improving", color: "rgba(74,222,128,0.6)" },
};

/* ── Nudge mapping: issue → suggestion + icon + route + autopilot action ── */
const NUDGE_MAP = {
  "Overdue follow-up": {
    label: "Send follow-ups",
    icon: Send,
    actionType: "follow_up",
    getUrl: (item) => `/support-pods/${extractAthleteId(item)}`,
    getTemplate: (item) => `Hi ${item.athleteName.split(" ")[0]}, just following up on some overdue school outreach${item.schoolName ? ` regarding ${item.schoolName}` : ""}. Let's make sure we don't lose momentum.`,
  },
  "Awaiting reply": {
    label: "Send follow-up message",
    icon: Send,
    actionType: "follow_up",
    getUrl: (item) => `/messages?to=${encodeURIComponent(item.athleteName)}&draft=${encodeURIComponent(`Hi ${item.athleteName.split(" ")[0]}, just following up${item.schoolName ? ` regarding ${item.schoolName}` : ""} — would love to hear your thoughts. Let us know if you had a chance to review.`)}`,
    getTemplate: (item) => `Hi ${item.athleteName.split(" ")[0]}, just following up${item.schoolName ? ` regarding ${item.schoolName}` : ""} — would love to hear your thoughts. Let us know if you had a chance to review.`,
  },
  "No activity": {
    label: "Check in with athlete",
    icon: MessageCircle,
    actionType: "check_in",
    getUrl: (item) => `/support-pods/${extractAthleteId(item)}`,
    getTemplate: (item) => `Hi ${item.athleteName.split(" ")[0]}, just checking in${item.schoolName ? ` regarding ${item.schoolName}` : ""} — wanted to see how things are going on your end. Let us know if there's anything you need.`,
  },
  "Missing requirement": {
    label: "Request missing document",
    icon: FileText,
    actionType: "request_doc",
    getUrl: (item) => `/support-pods/${extractAthleteId(item)}`,
    getTemplate: (item) => `Hi ${item.athleteName.split(" ")[0]}, we noticed a required document is still missing${item.schoolName ? ` for ${item.schoolName}` : ""} from your profile. Please upload it at your earliest convenience so we can keep things moving.`,
  },
  "No coach assigned": {
    label: "Assign coach",
    icon: UserPlus,
    actionType: "assign_coach",
    getUrl: () => "/roster",
    getTemplate: () => null,
  },
  "Needs follow-up": {
    label: "Review and follow up",
    icon: RefreshCw,
    actionType: "follow_up",
    getUrl: () => "/advocacy",
    getTemplate: (item) => `Hi ${item.athleteName.split(" ")[0]}, just following up${item.schoolName ? ` regarding ${item.schoolName}` : ""} on our last conversation. Let us know how things are progressing.`,
  },
  "Escalated issue": {
    label: "Review and take action",
    icon: RefreshCw,
    actionType: "check_in",
    getUrl: (item) => item.cta.url,
    getTemplate: (item) => `Hi ${item.athleteName.split(" ")[0]}, just checking in${item.schoolName ? ` regarding ${item.schoolName}` : ""} — wanted to see how things are going. Let us know if there's anything you need.`,
  },
};

export function extractAthleteId(item) {
  return (item.id || "").replace(/^inbox_/, "").split("_")[0];
}

export function getNudge(item) {
  const issues = item.issues || [];
  const order = ["No coach assigned", "Missing requirement", "Overdue follow-up", "Awaiting reply", "No activity", "Needs follow-up", "Escalated issue"];
  for (const key of order) {
    if (issues.includes(key) && NUDGE_MAP[key]) {
      const n = NUDGE_MAP[key];
      return {
        label: n.label,
        Icon: n.icon,
        url: n.getUrl(item),
        actionType: n.actionType,
        template: n.getTemplate ? n.getTemplate(item) : null,
      };
    }
  }
  return null;
}

/* ── Scoring logic for Top Priority ── */
const HIGH_ISSUES = new Set(["Escalated issue", "Missing requirement", "No coach assigned", "Overdue follow-up"]);
const MED_ISSUES = new Set(["Awaiting reply", "No activity"]);
const LOW_ISSUES = new Set(["Needs follow-up"]);

export function scoreItem(item) {
  let score = 0;
  for (const issue of (item.issues || [])) {
    if (HIGH_ISSUES.has(issue)) score += 3;
    else if (MED_ISSUES.has(issue)) score += 2;
    else if (LOW_ISSUES.has(issue)) score += 1;
  }
  if ((item.issues || []).length > 1) score += 1;
  if (item.timestamp) {
    const age = Date.now() - new Date(item.timestamp).getTime();
    if (age > 14 * 86400000) score += 1;
  }
  if (item.schoolName) score += 1;
  return score;
}

/* ── Primary headline: "{N} schools overdue" or "{N} schools at risk" ── */
export function getPrimaryHeadline(item) {
  const schools = item.schoolIssues || item.schoolBreakdown || [];
  const issues = item.issues || [];

  if (issues.includes("Overdue follow-up") && schools.length > 0) {
    const overdueSchools = schools.filter(s =>
      (s.issue || "").toLowerCase().includes("overdue")
    );
    const uniqueNames = new Set((overdueSchools.length > 0 ? overdueSchools : schools).map(s => s.school).filter(Boolean));
    const count = uniqueNames.size || 1;
    return `${count} school${count !== 1 ? "s" : ""} overdue`;
  }
  if (item.schoolCount > 1 && issues.some(i => i === "No activity" || i === "Needs follow-up")) {
    return `${item.schoolCount} schools at risk`;
  }
  if (issues.includes("No coach assigned")) return "No coach assigned";
  if (issues.includes("Missing requirement")) return "Missing requirement";
  if (issues.includes("Escalated issue")) return "Escalated to director";
  if (issues.includes("Awaiting reply")) return "Awaiting reply";
  if (issues.includes("No activity")) return "Inactive, losing momentum";
  return item.primaryRisk || "Needs attention";
}

/* ── Short 1-line explanation (max ~8 words, no dashes) ── */
export function getShortExplanation(item) {
  const issues = item.issues || [];
  const has = (s) => issues.includes(s);

  if (has("Overdue follow-up") && has("No activity")) return "Follow-ups missed, momentum dropping";
  if (has("Overdue follow-up")) return "Follow-ups past due, relationships cooling";
  if (has("No activity") && has("No coach assigned")) return "No coach, no recent activity";
  if (has("Escalated issue") && has("No activity")) return "Flagged, needs re-engagement";
  if (has("Missing requirement")) return "Requirement missing, blocking progress";
  if (has("Awaiting reply")) return "Waiting for response";
  if (has("No coach assigned")) return "Unmanaged, needs assignment";
  if (has("No activity")) return "Momentum dropping, check in needed";
  if (has("Needs follow-up")) return "Conversation may stall";
  if (has("Escalated issue")) return "Flagged for review";
  return "Review recommended";
}

/* ── Contextual CTA label (specific action + count) ── */
export function getContextualCta(item) {
  const issues = item.issues || [];
  const schools = item.schoolIssues || item.schoolBreakdown || [];
  const primary = issues[0] || item.primaryRisk || "";

  if (issues.includes("Overdue follow-up") && schools.length > 0) {
    const uniqueSchools = new Set(schools.map(s => s.school).filter(Boolean));
    return `Send follow-ups (${uniqueSchools.size})`;
  }
  if (primary === "No coach assigned") return "Assign coach";
  if (primary === "Missing requirement") return "Complete requirement";
  if (primary === "Awaiting reply") return "Send follow-up";
  if (primary === "Needs follow-up") return "Send follow-up";
  if (primary === "No activity") return "Check in";
  if (primary === "Escalated issue") return "Review escalation";
  if (item.schoolCount > 1) return "Review schools";
  return "Open pod";
}

export function generateWhy(item) {
  return getShortExplanation(item);
}

export function getTopPriority(items) {
  if (!items || items.length === 0) return null;
  return items[0];
}

/* ── Context-aware CTA label (legacy compat) ── */
export function ctaWithContext(item) {
  return getContextualCta(item);
}

/* ── Build title: just athlete name, no suffix ── */
export function buildTitle(item) {
  return item.athleteName || "Unknown";
}

/* ── Extract unique school names from schoolIssues or schoolBreakdown ── */
export function getSchoolNames(item) {
  const schools = item.schoolIssues || item.schoolBreakdown || [];
  const seen = new Set();
  return schools.map(s => s.school).filter(name => {
    if (!name || seen.has(name)) return false;
    seen.add(name);
    return true;
  });
}

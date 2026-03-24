import { Send, UserPlus, FileText, MessageCircle, RefreshCw } from "lucide-react";

export const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export const DOT_COLOR = { high: "#b91c1c", medium: "#78716c" };

/* ── Trajectory display ── */
export const TRAJECTORY = {
  worsening: { symbol: "\u2198", label: "Worsening", color: "#dc2626" },
  stable:    { symbol: "\u2192", label: "Stable",    color: "#64748b" },
  improving: { symbol: "\u2197", label: "Improving", color: "rgba(74,222,128,0.6)" },
};

/* ── Short explanation for high priority rows ── */
export const WHY_SHORT = {
  "Escalated issue": "Momentum may be dropping",
  "No activity": "Momentum may be dropping",
  "Awaiting reply": "Waiting for response",
  "Missing requirement": "Blocking progress",
  "No coach assigned": "Not being actively managed",
  "Needs follow-up": "Conversation may stall",
};

/* ── Nudge mapping: issue → suggestion + icon + route + autopilot action ── */
const NUDGE_MAP = {
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
  const order = ["No coach assigned", "Missing requirement", "Awaiting reply", "No activity", "Needs follow-up", "Escalated issue"];
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
const HIGH_ISSUES = new Set(["Escalated issue", "Missing requirement", "No coach assigned"]);
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

export function generateWhy(item) {
  const issues = item.issues || [];
  const has = (s) => issues.includes(s);
  const daysStr = item.timeAgo || "";

  if (has("No activity") && has("No coach assigned"))
    return "No activity and no coach assigned — athlete is at risk of falling behind.";
  if (has("Escalated issue") && has("No activity"))
    return `Flagged and inactive ${daysStr ? "for " + daysStr.replace(" ago", "") : ""} — momentum may be dropping.`.replace("for now", "");
  if (has("Escalated issue") && has("Missing requirement"))
    return "Flagged with missing requirements — may block applications.";
  if (has("No coach assigned"))
    return "No coach assigned — athlete is not being actively managed.";
  if (has("Missing requirement"))
    return "Missing requirement — may block applications.";
  if (has("Awaiting reply"))
    return "Waiting for response — opportunity may go cold.";
  if (has("No activity"))
    return `No activity ${daysStr ? "in " + daysStr.replace(" ago", "") : ""} — recruiting momentum may be dropping.`.replace("in now", "recently");
  if (has("Needs follow-up"))
    return "Follow-up needed — don't let this conversation stall.";
  if (has("Escalated issue"))
    return "Flagged for attention — review and take action.";
  return "This item needs your attention.";
}

export function getTopPriority(items) {
  if (!items || items.length === 0) return null;
  return items[0];
}

/* ── Context-aware CTA label ── */
export function ctaWithContext(item) {
  const school = item.schoolName;
  const multi = item.schoolCount > 1;
  const primary = item.primaryRisk || (item.issues || [])[0] || "";

  if (primary === "No coach assigned") return "Assign coach";
  if (primary === "Awaiting reply") return school ? `Follow up with ${school}` : multi ? "Follow up across schools" : "Follow up";
  if (primary === "Missing requirement") return school ? `Review ${school}` : "Review";
  if (primary === "Needs follow-up") return school ? `Follow up with ${school}` : "Follow up";
  return school ? `Check in about ${school}` : multi ? "Check in across schools" : "Check in";
}

/* ── Build title from item ── */
export function buildTitle(item) {
  if (item.titleSuffix) return `${item.athleteName} — ${item.titleSuffix}`;
  if (item.schoolName) return `${item.athleteName} — ${item.schoolName}`;
  return item.athleteName;
}

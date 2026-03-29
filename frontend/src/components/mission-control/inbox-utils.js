import { Send, UserPlus, FileText, MessageCircle, RefreshCw } from "lucide-react";

export const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export const DOT_COLOR = { high: "#b91c1c", medium: "#78716c" };

/* ── Trajectory display ── */
export const TRAJECTORY = {
  worsening: { symbol: "\u2198", label: "Worsening", color: "#dc2626" },
  stable:    { symbol: "\u2192", label: "Stable",    color: "#64748b" },
  improving: { symbol: "\u2197", label: "Improving", color: "rgba(74,222,128,0.6)" },
};

/* ═══════════════════════════════════════════════════ */
/* School name normalization + deduplication           */
/* ═══════════════════════════════════════════════════ */

function normalizeKey(name) {
  return (name || "")
    .toLowerCase()
    .replace(/\buniversity\b/g, "")
    .replace(/\buniv\.?\b/g, "")
    .replace(/\bthe\b/g, "")
    .replace(/[^a-z0-9]/g, "")
    .trim();
}

/**
 * Deduplicates school entries by normalized name.
 * Keeps the longest (most official) variant of each name.
 * Merges issues into a Set per school.
 */
export function dedupeSchools(schools) {
  if (!schools || schools.length === 0) return [];
  const map = new Map();
  for (const s of schools) {
    const key = normalizeKey(s.school);
    if (!key) continue;
    const existing = map.get(key);
    if (!existing) {
      map.set(key, { school: s.school, issues: new Set([s.issue || s.label || ""]) });
    } else {
      // Keep longer (more official) name
      if ((s.school || "").length > existing.school.length) {
        existing.school = s.school;
      }
      existing.issues.add(s.issue || s.label || "");
    }
  }
  return Array.from(map.values()).map(e => ({
    school: e.school,
    issues: Array.from(e.issues).filter(Boolean),
    hasOverdue: Array.from(e.issues).some(i => i.toLowerCase().includes("overdue")),
  }));
}

/* ═══════════════════════════════════════════════════ */
/* Nudge mapping                                       */
/* ═══════════════════════════════════════════════════ */

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
    getUrl: (item) => `/messages?to=${encodeURIComponent(item.athleteName)}&draft=${encodeURIComponent(`Hi ${item.athleteName.split(" ")[0]}, just following up${item.schoolName ? ` regarding ${item.schoolName}` : ""}.`)}`,
    getTemplate: (item) => `Hi ${item.athleteName.split(" ")[0]}, just following up${item.schoolName ? ` regarding ${item.schoolName}` : ""}.`,
  },
  "No activity": {
    label: "Check in with athlete",
    icon: MessageCircle,
    actionType: "check_in",
    getUrl: (item) => `/support-pods/${extractAthleteId(item)}`,
    getTemplate: (item) => `Hi ${item.athleteName.split(" ")[0]}, checking in${item.schoolName ? ` regarding ${item.schoolName}` : ""}.`,
  },
  "Missing requirement": {
    label: "Request missing document",
    icon: FileText,
    actionType: "request_doc",
    getUrl: (item) => `/support-pods/${extractAthleteId(item)}`,
    getTemplate: (item) => `Hi ${item.athleteName.split(" ")[0]}, a required document is still missing${item.schoolName ? ` for ${item.schoolName}` : ""}.`,
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
    getTemplate: (item) => `Hi ${item.athleteName.split(" ")[0]}, following up${item.schoolName ? ` regarding ${item.schoolName}` : ""}.`,
  },
  "Escalated issue": {
    label: "Review and take action",
    icon: RefreshCw,
    actionType: "check_in",
    getUrl: (item) => item.cta?.url || `/support-pods/${extractAthleteId(item)}`,
    getTemplate: (item) => `Hi ${item.athleteName.split(" ")[0]}, checking in${item.schoolName ? ` regarding ${item.schoolName}` : ""}.`,
  },
};

export function extractAthleteId(item) {
  return (item.athleteId || item.id || "").replace(/^inbox_/, "");
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

/* ═══════════════════════════════════════════════════ */
/* Display helpers — OPTION A: count = overdue actions */
/* ═══════════════════════════════════════════════════ */

/**
 * Returns deduped schools from item data.
 */
function _getDeduped(item) {
  const raw = item.schoolIssues || item.schoolBreakdown || [];
  return dedupeSchools(raw);
}

/**
 * Primary headline.
 * For overdue: "{N} overdue actions" where N = deduped overdue school count.
 */
export function getPrimaryHeadline(item) {
  const issues = item.issues || [];
  const deduped = _getDeduped(item);
  const overdueCount = deduped.filter(s => s.hasOverdue).length;

  if (issues.includes("Overdue follow-up") && overdueCount > 0) {
    return `${overdueCount} overdue action${overdueCount !== 1 ? "s" : ""}`;
  }
  if (issues.includes("No coach assigned")) return "No coach assigned";
  if (issues.includes("Missing requirement")) return "Missing requirement";
  if (issues.includes("Escalated issue")) return "Escalated to director";
  if (issues.includes("Awaiting reply")) return "Awaiting reply";
  if (issues.includes("No activity")) return "Inactive, losing momentum";
  return item.primaryRisk || "Needs attention";
}

/**
 * Secondary context: "Across {Y} schools" — only shown when Y > 1 and differs from headline count.
 */
export function getSecondaryContext(item) {
  const deduped = _getDeduped(item);
  if (deduped.length > 1) return `Across ${deduped.length} schools`;
  if (deduped.length === 1) return deduped[0].school;
  if (item.schoolName) return item.schoolName;
  return "";
}

/**
 * Compressed single-line: "↘ Worsening · Momentum dropping"
 */
export function getCompressedLine(item) {
  const issues = item.issues || [];
  const has = (s) => issues.includes(s);
  const traj = TRAJECTORY[item.trajectory];
  const showTraj = item.trajectory && item.trajectory !== "stable" && traj;

  let reason = "";
  if (has("Overdue follow-up") && has("No activity")) reason = "Momentum dropping";
  else if (has("Overdue follow-up")) reason = "Relationships cooling";
  else if (has("No activity") && has("No coach assigned")) reason = "No coach, drifting";
  else if (has("Escalated issue") && has("No activity")) reason = "Flagged, needs re-engagement";
  else if (has("Missing requirement")) reason = "Blocking progress";
  else if (has("Awaiting reply")) reason = "Waiting for response";
  else if (has("No coach assigned")) reason = "Unmanaged";
  else if (has("No activity")) reason = "Check in needed";
  else if (has("Escalated issue")) reason = "Flagged for review";
  else reason = "Review recommended";

  if (showTraj) return `${traj.symbol} ${traj.label} · ${reason}`;
  return reason;
}

/**
 * Contextual CTA label — count always matches headline.
 * "Send follow-ups ({N})" where N = overdue actions count.
 */
export function getContextualCta(item) {
  const issues = item.issues || [];
  const deduped = _getDeduped(item);
  const overdueCount = deduped.filter(s => s.hasOverdue).length;

  if (issues.includes("Overdue follow-up") && overdueCount > 0) {
    return `Send follow-ups (${overdueCount})`;
  }
  if (issues.includes("No coach assigned")) return "Assign coach";
  if (issues.includes("Missing requirement")) return "Complete requirement";
  if (issues.includes("Awaiting reply")) return "Send follow-up";
  if (issues.includes("No activity")) return "Check in";
  if (issues.includes("Escalated issue")) return "Review escalation";
  if (deduped.length > 1) return "Review schools";
  return "Open pod";
}

/**
 * Extract unique deduped school names (display-ready).
 */
export function getSchoolNames(item) {
  return _getDeduped(item).map(s => s.school);
}

/* ── Legacy compat ── */
export function generateWhy(item) { return getCompressedLine(item); }
export function getTopPriority(items) { return items?.[0] || null; }
export function ctaWithContext(item) { return getContextualCta(item); }
export function buildTitle(item) { return item.athleteName || "Unknown"; }

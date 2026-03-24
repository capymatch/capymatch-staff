import {
  ClipboardCheck, Flag, Flame, MessageCircle,
  AlertCircle, Clock, Mail, Check, Send, User,
  Trophy, FileText, ExternalLink,
} from "lucide-react";
import { NEXT_STEP_RULES } from "./constants";

const NS_LABELS = { email: "Email Coach", log: "Log Notes", followup: "Schedule Follow-up" };
const NS_ICONS = { email: Mail, log: FileText, followup: Clock };

export function computeHeroSelection({
  assignedActions, coachFlags, coachWatch, program,
  followUpOverdue, followUpUpcoming, daysOverdue, daysUntilDue,
  hasCoachReply, isCommitted, latestEvent, nextStepDismissed,
  coaches, questNudgeDismissed, completingFlag,
  handlers,
}) {
  const all = [];
  const uni = program?.university_name || "this school";
  const signals = program?.signals || {};
  const rail = program?.journey_rail || {};

  // ── Build contextual "why this" signals from program data ──
  function buildWhyThis(extras) {
    const reasons = [];
    const daysSince = signals.days_since_activity;
    if (daysSince != null && daysSince > 0) reasons.push(`No response in ${daysSince} day${daysSince === 1 ? "" : "s"} — time to follow up`);
    if (signals.has_coach_reply) reasons.push("Coach showed interest");
    if (signals.coach_engagement === "high") reasons.push("Coach engagement is high");
    if (rail.active && rail.active !== "added") {
      const stageName = rail.active.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
      reasons.push(`${stageName} stage is active`);
    }
    if (program?.risk_badges?.some(b => b.key === "roster_tight")) reasons.push("Roster is filling quickly");
    if (program?.risk_badges?.some(b => b.key === "timeline_awareness")) reasons.push("Recruiting window is active");
    if (extras) reasons.push(...extras);
    return reasons.slice(0, 3);
  }

  // ── Build a suggested message based on context ──
  function buildSuggestedReply(taskTitle) {
    const coachName = program?.college_coaches?.[0]?.coach_name;
    const greeting = coachName ? `Hi Coach ${coachName.split(" ").pop()}` : "Hi Coach";

    if ((taskTitle || "").toLowerCase().includes("follow up") || (taskTitle || "").toLowerCase().includes("follow-up")) {
      return `${greeting},\n\nJust checking in — I'm still very interested in your program. I've been working hard this season and would love to share some updates.\n\nWould you have a few minutes to connect this week?`;
    }
    if ((taskTitle || "").toLowerCase().includes("visit") || (taskTitle || "").toLowerCase().includes("campus")) {
      return `${greeting},\n\nI'd love to visit campus and learn more about the program in person.\n\nWould there be a good time in the coming weeks to schedule an unofficial visit?`;
    }
    if ((taskTitle || "").toLowerCase().includes("schedule call") || (taskTitle || "").toLowerCase().includes("schedule")) {
      return `${greeting},\n\nI'd love to set up a call to discuss the program and next steps.\n\nI'm available most afternoons this week — what works best for you?`;
    }
    return `${greeting},\n\nI wanted to reach out and express my continued interest in your program.\n\nI'd really appreciate any chance to connect — let me know what works.`;
  }

  // ── P1 — Committed ──
  if (isCommitted) {
    all.push({
      id: "committed", priority: 1, type: "committed",
      kicker: "Milestone", title: `Committed to ${uni}`,
      subtitle: "The hard work paid off. Congratulations!",
      accent: "#fbbf24", icon: Trophy, iconColor: "#fbbf24", iconBg: "rgba(251,191,36,0.15)",
      pills: [], primaryCta: null, secondaryCta: null,
      dot: "bg-amber-400", tag: "Milestone",
    });
  }

  // ── P2 — Coach Tasks ──
  (assignedActions || []).forEach((a, i) => {
    const ctaMap = {
      send_email: { label: "Compose Email", icon: Mail },
      log_visit: { label: "Log Visit", icon: ClipboardCheck },
      log_interaction: { label: "Log It", icon: ClipboardCheck },
      reply: { label: "Reply", icon: Send },
      profile_update: { label: "Update Profile", icon: User },
      preparation: { label: "Mark Done", icon: Check },
      research: { label: "Mark Done", icon: Check },
      general: { label: "Mark Done", icon: Check },
    };

    // Smart CTA: detect communication / outreach tasks regardless of action_type
    const titleLower = (a.title || "").toLowerCase();
    const isCommunication = titleLower.includes("follow up") || titleLower.includes("follow-up")
      || titleLower.includes("email") || titleLower.includes("reach out")
      || titleLower.includes("send") || titleLower.includes("message")
      || titleLower.includes("contact") || titleLower.includes("schedule call")
      || titleLower.includes("reply") || titleLower.includes("schedule")
      || ["send_email", "reply"].includes(a.action_type);
    const effectiveType = isCommunication && a.action_type !== "send_email" && a.action_type !== "reply" ? "send_email" : a.action_type;

    const cta = ctaMap[effectiveType] || ctaMap.general;
    const h = effectiveType === "send_email" ? handlers.onEmail
      : effectiveType === "reply" ? () => handlers.onNavigate("/messages")
      : effectiveType === "profile_update" ? () => handlers.onNavigate("/profile")
      : ["log_visit", "log_interaction"].includes(effectiveType) ? handlers.onLog
      : () => handlers.onMarkActionDone(a.id);

    // Build a more personal, action-driven title
    const personalTitle = (() => {
      const t = a.title || "";
      // "Schedule call to discuss X campus visit" → "Schedule your X campus visit call"
      const scheduleMatch = t.match(/schedule\s+call\s+to\s+discuss\s+(.+?)(?:\s+campus)?\s*visit/i);
      if (scheduleMatch) return `Schedule your ${scheduleMatch[1].trim()} campus visit call`;
      // "Follow up with X" → "Follow up with X"  (already personal)
      return t;
    })();

    all.push({
      id: `task-${a.id}`, priority: 2 + i * 0.1, type: "coach_task",
      kicker: `Coach Task${a.due_date ? ` \u00B7 Due ${new Date(a.due_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}` : ""}`,
      title: personalTitle,
      subtitle: a.note_text
        ? `"${a.note_text}" — ${a.created_by || "your coach"}`
        : `Added by ${a.created_by ? "your coach" : "your coach"} for ${a.school_name || uni}`,
      accent: "#0d9488", icon: ClipboardCheck, iconColor: "#0d9488", iconBg: "rgba(13,148,136,0.15)",
      pills: [
        a.due_date && { label: `Due ${new Date(a.due_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}` },
        { label: `From ${a.created_by || "Coach"}` },
      ].filter(Boolean),
      isCommunication,
      suggestedMessage: isCommunication ? buildSuggestedReply(a.title) : null,
      emailHandler: handlers.onEmail,
      markDoneHandler: () => handlers.onMarkActionDone(a.id),
      primaryCta: isCommunication
        ? { label: "Send message", icon: Send, handler: handlers.onEmail }
        : { label: cta.label, icon: cta.icon, handler: h },
      secondaryCta: isCommunication
        ? { label: "Mark done", icon: Check, handler: () => handlers.onMarkActionDone(a.id) }
        : null,
      whyThis: buildWhyThis(a.due_date ? [`Due ${new Date(a.due_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`] : []),
      dot: "bg-teal-500", tag: "Supporting",
    });
  });

  // ── P3 — Coach Flags ──
  (coachFlags || []).forEach((f, i) => {
    const dl = f.due === "today" ? "Due today" : f.due === "this_week" ? "Due this week" : f.due_date ? `Due ${f.due_date}` : null;
    all.push({
      id: `flag-${f.flag_id}`, priority: 3 + i * 0.1, type: "coach_flag",
      kicker: `Coach Directive${dl ? ` \u00B7 ${dl}` : ""}`,
      title: f.reason_label,
      subtitle: f.note || `Flagged by ${f.flagged_by_name || "Coach"}`,
      accent: "#f59e0b", icon: Flag, iconColor: "#f59e0b", iconBg: "rgba(245,158,11,0.15)",
      pills: [dl && { label: dl }, { label: `From ${f.flagged_by_name || "Coach"}` }].filter(Boolean),
      primaryCta: { label: "Mark Complete", icon: Check, handler: () => handlers.onCompleteFlag(f.flag_id), loading: completingFlag === f.flag_id },
      secondaryCta: null,
      whyThis: buildWhyThis([`Flagged by ${f.flagged_by_name || "Coach"}`]),
      dot: "bg-amber-500", tag: "Supporting",
    });
  });

  // ── P4 — Hot Opportunity (Coach Watch) ──
  if (coachWatch?.state === "hot_opportunity") {
    all.push({
      id: "cw-hot", priority: 4, type: "hot_opportunity",
      kicker: "Hot Opportunity",
      title: coachWatch.whyThisMatters || "Act now — this is a high-opportunity moment.",
      subtitle: coachWatch.summary,
      accent: "#22c55e", icon: Flame, iconColor: "#22c55e", iconBg: "rgba(34,197,94,0.15)",
      pills: [{ label: "High confidence" }],
      isCommunication: true,
      suggestedMessage: buildSuggestedReply("follow up"),
      primaryCta: { label: "Send message", icon: Send, handler: handlers.onEmail },
      secondaryCta: null,
      whyThis: buildWhyThis(["High-opportunity moment"]),
      dot: "bg-green-500", tag: "Supporting",
    });
  }

  // ── P5 — Active Conversation (Coach Watch) ──
  if (coachWatch?.state === "active_conversation") {
    all.push({
      id: "cw-active", priority: 5, type: "active_conversation",
      kicker: "Active Conversation",
      title: coachWatch.whyThisMatters || "Reply quickly to keep the conversation moving.",
      subtitle: coachWatch.summary,
      accent: "#3b82f6", icon: MessageCircle, iconColor: "#3b82f6", iconBg: "rgba(59,130,246,0.15)",
      pills: [{ label: "High confidence" }],
      isCommunication: true,
      suggestedMessage: buildSuggestedReply("reply"),
      primaryCta: { label: "Send message", icon: Send, handler: handlers.onEmail },
      secondaryCta: null,
      whyThis: buildWhyThis(["Conversation is active"]),
      dot: "bg-blue-500", tag: "Supporting",
    });
  }

  // ── P6 — Overdue Follow-Up ──
  if (followUpOverdue) {
    all.push({
      id: "overdue", priority: 6, type: "overdue_followup",
      kicker: daysOverdue > 0 ? `${daysOverdue} day${daysOverdue === 1 ? "" : "s"} overdue` : "Due today",
      title: `Follow up with ${uni}`,
      subtitle: program?.next_action || "Send a follow-up to stay on their radar and show continued interest.",
      accent: "#f97316", icon: AlertCircle, iconColor: "#f97316", iconBg: "rgba(249,115,22,0.15)",
      pills: [{ label: `${daysOverdue}d overdue` }],
      isCommunication: true,
      suggestedMessage: buildSuggestedReply("follow up"),
      primaryCta: { label: "Send message", icon: Mail, handler: handlers.onEmail },
      secondaryCta: { label: "Reschedule", icon: Clock, handler: handlers.onFollowup },
      whyThis: buildWhyThis([`${daysOverdue} day${daysOverdue === 1 ? "" : "s"} overdue`]),
      dot: "bg-orange-500", tag: "Supporting",
    });
  }

  // ── P7 — Celebration (Coach Reply) ──
  if (hasCoachReply && !isCommitted) {
    const cn = coaches?.[0]?.coach_name || "The coach";
    const da = program?.signals?.days_since_reply;
    const tt = da === 0 ? "today" : da === 1 ? "yesterday" : da != null ? `${da} days ago` : "recently";
    all.push({
      id: "celebration", priority: 7, type: "celebration",
      kicker: `Coach replied ${tt}`, title: `${cn} is interested!`,
      subtitle: "Keep the momentum going — respond quickly to show you're serious.",
      accent: "#10b981", icon: Mail, iconColor: "#10b981", iconBg: "rgba(16,185,129,0.15)",
      pills: [],
      isCommunication: true,
      suggestedMessage: buildSuggestedReply("reply"),
      primaryCta: { label: "Send message", icon: Mail, handler: handlers.onEmail },
      secondaryCta: { label: "Log a Note", icon: FileText, handler: handlers.onLog },
      whyThis: buildWhyThis([`Coach replied ${tt}`]),
      dot: "bg-emerald-500", tag: "Supporting",
    });
  }

  // ── P8 — Upcoming Follow-Up ──
  if (followUpUpcoming && !followUpOverdue) {
    all.push({
      id: "upcoming", priority: 9, type: "upcoming_followup",
      kicker: daysUntilDue === 0 ? "Due today" : daysUntilDue === 1 ? "Due tomorrow" : `Due in ${daysUntilDue} days`,
      title: `Follow up with ${uni}`,
      subtitle: program?.next_action || "You have a follow-up coming up. Get ahead of it.",
      accent: "#1a8a80", icon: Clock, iconColor: "#2dd4bf", iconBg: "rgba(26,138,128,0.15)",
      pills: [{ label: daysUntilDue === 0 ? "Today" : `In ${daysUntilDue}d` }],
      primaryCta: { label: "Send Email", icon: Mail, handler: handlers.onEmail },
      secondaryCta: { label: "Reschedule", icon: Clock, handler: handlers.onFollowup },
      whyThis: buildWhyThis([`Follow-up due ${daysUntilDue === 0 ? "today" : `in ${daysUntilDue}d`}`]),
      dot: "bg-teal-500", tag: "Optional",
    });
  }

  // ── P9 — Questionnaire Nudge ──
  if (program?.questionnaire_url && !program?.questionnaire_completed && !questNudgeDismissed) {
    all.push({
      id: "questionnaire", priority: 10, type: "questionnaire",
      kicker: "Action Required",
      title: `Complete ${uni}'s questionnaire`,
      subtitle: "Filling out the recruiting questionnaire shows coaches you're genuinely interested.",
      accent: "#f59e0b", icon: ClipboardCheck, iconColor: "#f59e0b", iconBg: "rgba(245,158,11,0.12)",
      pills: [],
      primaryCta: { label: "Open Questionnaire", icon: ExternalLink, handler: () => window.open(program.questionnaire_url, "_blank") },
      secondaryCta: null,
      whyThis: buildWhyThis(["Questionnaire boosts your visibility"]),
      dot: "bg-amber-400", tag: "Optional",
    });
  }

  // ── P10 — Next Step ──
  if (latestEvent && !isCommitted && !nextStepDismissed) {
    const et = (latestEvent?.event_type || latestEvent?.type || "").toLowerCase().replace(/\s+/g, "_");
    const rule = NEXT_STEP_RULES[et];
    if (rule) {
      const ah = { email: handlers.onEmail, log: handlers.onLog, followup: handlers.onFollowup };
      const pa = rule.actions[0];
      all.push({
        id: "next-step", priority: 11, type: "next_step",
        kicker: "What's Next", title: rule.title, subtitle: rule.desc,
        accent: "#1a8a80", icon: rule.icon, iconColor: rule.iconColor, iconBg: rule.iconBg,
        pills: [],
        primaryCta: { label: NS_LABELS[pa], icon: NS_ICONS[pa], handler: ah[pa] },
        secondaryCta: rule.actions[1] ? { label: NS_LABELS[rule.actions[1]], icon: NS_ICONS[rule.actions[1]], handler: ah[rule.actions[1]] } : null,
        whyThis: buildWhyThis(),
        dot: "bg-teal-500", tag: "Optional",
      });
    }
  }

  all.sort((a, b) => a.priority - b.priority);

  // Empty state fallback
  if (all.length === 0) {
    return {
      featuredHero: {
        id: "empty", priority: 999, type: "empty",
        kicker: "Get Started", title: "Start outreach to this program",
        subtitle: "Send your first email to get on the coach's radar.",
        accent: "#0d9488", icon: Mail, iconColor: "#0d9488", iconBg: "rgba(13,148,136,0.15)",
        pills: [], primaryCta: { label: "Send First Email", icon: Send, handler: handlers.onEmail },
        secondaryCta: null, dot: "bg-gray-400", tag: "Optional",
      },
      radarItems: [],
    };
  }

  return { featuredHero: all[0], radarItems: all.slice(1) };
}

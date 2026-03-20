/**
 * Action Reinforcement Engine
 *
 * Generates context-aware feedback messages based on:
 * - Priority awareness (Hero Card integration)
 * - Attention level changes
 * - Stage progression
 * - Inactivity recovery
 *
 * Tone: calm, premium, intelligent — never gamified.
 */

/* ── Particle color palette ── */
export const PARTICLE_COLORS = {
  neutral: "rgba(255,255,255,0.9)",
  momentum: "rgba(96,165,250,0.85)",
  riskResolved: "rgba(52,211,153,0.85)",
  highImpact: "rgba(251,191,36,0.8)",
};

/* ── Indicator dot colors ── */
export const INDICATOR = {
  neutral: "#ffffff",
  momentum: "#60a5fa",
  riskResolved: "#34d399",
  highImpact: "#fbbf24",
};

/* ── Stage labels ── */
const STAGE_LABELS = {
  added: "Added",
  outreach: "Outreach",
  in_conversation: "In Conversation",
  campus_visit: "Campus Visit",
  offer: "Offer",
  committed: "Committed",
};

/* ── Message pools (randomly picked for variety) ── */
const HERO_PRIORITY_MESSAGES = [
  "Top priority handled",
  "You moved this forward at the right time",
  "Critical issue cleared",
  "This was the most important thing to do",
];

const ATTENTION_CLEARED = [
  "Risk cleared — back in motion",
  "Caught in time — momentum restored",
  "Crisis averted, pipeline stabilized",
];

const INACTIVITY_RECOVERY = [
  "Response window reopened",
  "Momentum restarted after {days} days",
  "Back in play — good timing",
];

const SOFT_PROGRESS = [
  "Momentum building",
  "Good progress here",
  "Steady movement forward",
  "Pipeline warming up",
];

const STAGE_MESSAGES = {
  outreach: ["First move made", "Outreach in motion"],
  in_conversation: ["This one's warming up", "Dialogue opened — stay present"],
  campus_visit: ["Major milestone — campus visit", "Face time matters, well played"],
  offer: ["Big moment — stay sharp here", "An offer on the table — exciting"],
  committed: ["Committed — congratulations", "A decision made — well earned"],
};

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Generate a reinforcement message from trigger context.
 *
 * @param {object} ctx
 * @param {string} ctx.type           — "taskComplete" | "stageChange" | "attentionImprove" | "overdueCleared"
 * @param {boolean} ctx.isHeroPriority
 * @param {string}  ctx.heroReason
 * @param {number}  ctx.priorityRank  — 1 = top priority
 * @param {string}  ctx.attentionBefore — "high" | "medium" | "low" | null
 * @param {string}  ctx.attentionAfter
 * @param {number}  ctx.daysSinceLastActivity
 * @param {string}  ctx.stageBefore
 * @param {string}  ctx.stageAfter
 * @param {string}  ctx.schoolName
 *
 * @returns {{ message: string, subtext: string|null, indicator: string, particleColor: string }}
 */
export function generateFeedback(ctx) {
  const {
    type,
    isHeroPriority = false,
    heroReason = "",
    priorityRank = 99,
    attentionBefore,
    attentionAfter,
    daysSinceLastActivity = 0,
    stageBefore,
    stageAfter,
    schoolName = "",
  } = ctx;

  // ─── Priority-aware: Hero Card top priority ───
  if (isHeroPriority && priorityRank === 1) {
    const msg = pick(HERO_PRIORITY_MESSAGES);
    const sub = heroReason || "This was your most urgent action";
    return {
      message: msg,
      subtext: sub,
      indicator: "highImpact",
      particleColor: PARTICLE_COLORS.highImpact,
    };
  }

  // ─── Attention improvement: Critical → non-critical ───
  if (attentionBefore === "high" && attentionAfter && attentionAfter !== "high") {
    return {
      message: pick(ATTENTION_CLEARED),
      subtext: "You caught this in time",
      indicator: "riskResolved",
      particleColor: PARTICLE_COLORS.riskResolved,
    };
  }

  // ─── Overdue cleared ───
  if (type === "overdueCleared") {
    return {
      message: "Overdue cleared — pipeline breathing again",
      subtext: schoolName ? `${schoolName} is back on track` : null,
      indicator: "riskResolved",
      particleColor: PARTICLE_COLORS.riskResolved,
    };
  }

  // ─── Stage progression ───
  if (type === "stageChange" && stageAfter) {
    const stageKey = stageAfter;
    const msgs = STAGE_MESSAGES[stageKey];

    // Special handling for offer stage
    if (stageKey === "offer" || stageKey === "committed") {
      return {
        message: msgs ? pick(msgs) : `Moved to ${STAGE_LABELS[stageKey] || stageKey}`,
        subtext: schoolName || null,
        indicator: "highImpact",
        particleColor: PARTICLE_COLORS.highImpact,
      };
    }

    return {
      message: msgs ? pick(msgs) : `Stage progressed`,
      subtext: schoolName ? `${schoolName} — ${STAGE_LABELS[stageKey] || stageKey}` : null,
      indicator: "momentum",
      particleColor: PARTICLE_COLORS.momentum,
    };
  }

  // ─── Inactivity recovery ───
  if (daysSinceLastActivity > 5) {
    const msg = pick(INACTIVITY_RECOVERY).replace("{days}", String(daysSinceLastActivity));
    return {
      message: msg,
      subtext: "Momentum restarted",
      indicator: "momentum",
      particleColor: PARTICLE_COLORS.momentum,
    };
  }

  // ─── Hero priority (non-top) ───
  if (isHeroPriority) {
    return {
      message: "Priority addressed",
      subtext: heroReason || null,
      indicator: "momentum",
      particleColor: PARTICLE_COLORS.momentum,
    };
  }

  // ─── Soft / non-priority progress ───
  return {
    message: pick(SOFT_PROGRESS),
    subtext: schoolName || null,
    indicator: "neutral",
    particleColor: PARTICLE_COLORS.neutral,
  };
}

/* ── Debounced event bus ── */
let _listeners = [];
let _debounceTimer = null;
const DEBOUNCE_MS = 300;

export function onReinforcement(listener) {
  _listeners.push(listener);
  return () => { _listeners = _listeners.filter(l => l !== listener); };
}

export function triggerReinforcement(ctx) {
  clearTimeout(_debounceTimer);
  _debounceTimer = setTimeout(() => {
    const feedback = generateFeedback(ctx);
    _listeners.forEach(l => l({ ...feedback, ctx }));
  }, DEBOUNCE_MS > 150 ? 150 : DEBOUNCE_MS);
}

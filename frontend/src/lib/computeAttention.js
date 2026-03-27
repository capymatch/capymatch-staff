/**
 * Attention Engine V2 — Single source of truth for all pipeline classification.
 *
 * Every program is scored once. The result drives:
 * Hero carousel, Peek row, Priority board, Coming Up timeline, Kanban cards.
 *
 * Recap integration: When recap priorities are provided, they boost scores
 * for programs identified in the latest Momentum Recap. Live urgency always wins.
 */

/**
 * Compute recap freshness factor (0-1).
 * Full weight within 3 days, decays to 0 at 14 days.
 */
function recapFreshness(createdAt) {
  if (!createdAt) return 0;
  const age = (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24);
  if (age <= 3) return 1;
  if (age <= 7) return 0.75;
  if (age <= 14) return 0.4;
  return 0;
}

const RECAP_BOOST = { top: 65, secondary: 25, watch: 5 };

export function computeAttention(program, topAction, recapCtx) {
  const p = program;
  const ta = topAction;
  const name = p.university_name || '';

  // ── Compute daysUntil from due date ──
  let daysUntil = null;
  if (p.next_action_due) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const raw = typeof p.next_action_due === 'string' ? p.next_action_due.split('T')[0] : '';
    if (raw) {
      const due = new Date(raw + 'T00:00:00');
      daysUntil = Math.round((due - today) / (1000 * 60 * 60 * 24));
    }
  }

  const lastActivity = p.signals?.days_since_activity ?? null;

  // ── Score ──
  let score = 0;

  // Coach signals
  if (ta?.action_key === 'coach_assigned_action') score += 100;
  else if (ta?.category === 'coach_flag') score += 90;

  // Due date
  if (daysUntil !== null) {
    if (daysUntil < 0) score += 80;
    else if (daysUntil === 0) score += 70;
    else if (daysUntil === 1) score += 50;
    else if (daysUntil <= 3) score += 30;
    else if (daysUntil <= 7) score += 15;
  }

  // Activity
  if (lastActivity !== null && lastActivity > 0) {
    if (lastActivity >= 7) score += 40;
    else if (lastActivity >= 3) score += 20;
  }

  // Stage bonus — Sprint 3 SSOT: use pipeline_stage exclusively
  const effectiveStage = p.pipeline_stage || 'added';
  if (effectiveStage === 'campus_visit') score += 15;
  else if (effectiveStage === 'in_conversation') score += 10;
  else if (effectiveStage === 'outreach') score += 5;

  // ── Recap priority boost ──
  let recapRank = null;
  let recapAction = null;
  let recapReason = null;
  let recapBoostApplied = 0;
  let recapFreshnessValue = 1;
  if (recapCtx) {
    const priority = recapCtx.priorities?.find(pr => pr.program_id === p.program_id);
    if (priority) {
      recapFreshnessValue = recapFreshness(recapCtx.createdAt);
      const boost = Math.round((RECAP_BOOST[priority.rank] || 0) * recapFreshnessValue);
      if (boost > 0) {
        score += boost;
        recapBoostApplied = boost;
        recapRank = priority.rank;
        recapAction = priority.action;
        recapReason = priority.reason;
      }
    }
  }

  // ── CRITICAL: daysUntil <= 0 → MUST NOT be on track ──
  if (daysUntil !== null && daysUntil <= 0 && score < 40) {
    score = 40;
  }

  // ── Hard triggers ──
  const hardTriggers = {
    overdue: daysUntil !== null && daysUntil < 0,
    dueSoon: daysUntil !== null && daysUntil >= 0 && daysUntil <= 3,
    coachFlag: ta?.category === 'coach_flag' || ta?.action_key === 'coach_assigned_action',
    escalation: ta?.priority === 1 || ta?.priority === 2 || ta?.priority === 3,
  };

  // ── Tier (classification — respects hard triggers) ──
  const tier =
    (hardTriggers.overdue || hardTriggers.coachFlag || hardTriggers.escalation || score >= 80)
      ? 'high'
      : score >= 40
        ? 'medium'
        : 'low';

  // ── Hero eligibility (strict — only truly urgent items) ──
  const heroEligible =
    hardTriggers.overdue ||
    hardTriggers.dueSoon ||
    hardTriggers.coachFlag ||
    hardTriggers.escalation ||
    score >= 80;

  // ── Urgency (placement signal) ──
  const urgency =
    (hardTriggers.overdue || hardTriggers.coachFlag || hardTriggers.escalation || score >= 80)
      ? 'critical'
      : (hardTriggers.dueSoon || score >= 40)
        ? 'soon'
        : 'monitor';

  // ── Momentum (tone signal) ──
  const momentum =
    (lastActivity !== null && lastActivity >= 7) ? 'cooling'
      : (lastActivity !== null && lastActivity >= 3) ? 'steady'
        : 'building';

  // ── Attention level (kept for backward compat) ──
  const attentionLevel = tier;

  // ── Timing label ──
  let timingLabel = null;
  if (lastActivity > 0) {
    timingLabel = `${lastActivity}d since last activity`;
  } else if (daysUntil !== null) {
    if (daysUntil < 0) timingLabel = `${Math.abs(daysUntil)}d overdue`;
    else if (daysUntil === 0) timingLabel = 'Due today';
    else if (daysUntil === 1) timingLabel = 'Due tomorrow';
    else if (daysUntil <= 3) timingLabel = `Due in ${daysUntil}d`;
  }
  if (!timingLabel && ta?.category === 'first_outreach') {
    timingLabel = 'New';
  }

  // ── Primary action — verb-first, school name then urgency ──
  const actionMap = {
    coach_assigned_action: `Follow up with ${name} now`,
    coach_flag_reply_needed: `Follow up with ${name} now`,
    coach_flag_general: `Follow up with ${name} now`,
    overdue_follow_up: `Follow up with ${name} now`,
    stale_reply: `Follow up with ${name} now`,
    first_outreach_needed: `Send your intro to ${name}`,
    send_intro_email: `Send your intro to ${name}`,
    relationship_cooling: `Re-engage ${name} now`,
    reengage_relationship: `Re-engage ${name} now`,
    due_today_follow_up: `Follow up with ${name} today`,
  };
  let primaryAction = actionMap[ta?.action_key];
  if (!primaryAction) {
    if (ta?.cta_label && ta.action_key !== 'no_action_needed') {
      primaryAction = `${ta.cta_label} — ${name}`;
    } else {
      primaryAction = `${name} is on track`;
    }
  }
  // Override if due date creates urgency but top-action says on_track
  if (daysUntil !== null && daysUntil <= 0 && ta?.action_key === 'no_action_needed') {
    primaryAction = daysUntil < 0 ? `Follow up with ${name} now` : `Follow up with ${name} today`;
  }
  // Override for upcoming items — use time-based guidance
  if (daysUntil !== null && daysUntil > 0 && daysUntil <= 7 && primaryAction.endsWith('is on track')) {
    primaryAction = `Follow up with ${name} in ${daysUntil} day${daysUntil !== 1 ? 's' : ''}`;
  }

  // ── Reason — context line: "No response in X days — follow up now" ──
  const reasonMap = {
    coach_assigned_action: 'Coach is expecting a response',
    coach_flag_reply_needed: 'Coach is expecting a response',
    coach_flag_general: 'Coach flagged this for follow-up',
    overdue_follow_up: lastActivity ? `No response in ${lastActivity} day${lastActivity !== 1 ? 's' : ''} \u2014 follow up now` : 'Follow-up is overdue',
    stale_reply: 'Waiting on coach reply \u2014 follow up this week',
    first_outreach_needed: 'Ready for first contact',
    send_intro_email: 'Ready for first contact',
    relationship_cooling: `No response in ${lastActivity || 'several'} day${lastActivity !== 1 ? 's' : ''} \u2014 re-engage now`,
    reengage_relationship: `No response in ${lastActivity || 'several'} day${lastActivity !== 1 ? 's' : ''} \u2014 re-engage now`,
    due_today_follow_up: 'Follow-up due today',
  };
  let reason = reasonMap[ta?.action_key] || 'On track';
  if (daysUntil !== null && daysUntil <= 0 && reason === 'On track') {
    reason = lastActivity ? `No response in ${lastActivity} day${lastActivity !== 1 ? 's' : ''} \u2014 follow up now` : 'Follow-up due now';
  }
  // Fix contradiction: if primaryAction says follow up, reason can't say "On track"
  if (reason === 'On track' && primaryAction && !primaryAction.includes('is on track')) {
    if (daysUntil !== null && daysUntil > 0 && daysUntil <= 3) {
      reason = `Due in ${daysUntil} day${daysUntil !== 1 ? 's' : ''} \u00b7 stay ahead`;
    } else if (daysUntil !== null && daysUntil > 3 && daysUntil <= 7) {
      reason = `Due in ${daysUntil} days \u00b7 keep momentum`;
    } else if (lastActivity !== null && lastActivity > 0) {
      reason = `${lastActivity} days since last activity \u00b7 keep momentum`;
    } else {
      reason = 'Keep things moving';
    }
  }

  // ── Micro-signal ──
  let microSignal = null;
  if (daysUntil !== null && daysUntil < 0) microSignal = { text: 'Now overdue', color: '#dc2626' };
  else if (daysUntil === 0) microSignal = { text: 'Due today', color: '#d97706' };
  else if (ta?.category === 'first_outreach') microSignal = { text: 'New', color: '#94a3b8' };

  // ── reasonShort — single human-readable reason shown everywhere ──
  let reasonShort = null;
  if (ta?.action_key === 'coach_assigned_action') {
    reasonShort = 'Coach assigned a task';
  } else if (ta?.category === 'coach_flag') {
    reasonShort = 'Flagged by coach';
  } else if (daysUntil !== null && daysUntil < 0) {
    const abs = Math.abs(daysUntil);
    reasonShort = `Overdue by ${abs} day${abs !== 1 ? 's' : ''}`;
  } else if (daysUntil === 0) {
    reasonShort = 'Due today';
  } else if (daysUntil === 1) {
    reasonShort = 'Due tomorrow';
  } else if (daysUntil !== null && daysUntil <= 3) {
    reasonShort = `Due in ${daysUntil} days`;
  } else if (recapRank === 'top') {
    reasonShort = 'Recap: top priority';
  } else if (recapRank === 'secondary') {
    reasonShort = 'Recap: flagged';
  } else if (lastActivity !== null && lastActivity >= 7) {
    reasonShort = `No response in ${lastActivity} days`;
  } else if (lastActivity !== null && lastActivity >= 3) {
    reasonShort = `${lastActivity} days since last activity`;
  } else if (ta?.action_key === 'first_outreach_needed' || ta?.action_key === 'send_intro_email') {
    reasonShort = 'Ready for first contact';
  } else if (ta?.action_key === 'relationship_cooling' || ta?.action_key === 'reengage_relationship') {
    reasonShort = 'No recent engagement';
  } else if (recapRank === 'watch') {
    reasonShort = 'On your watch list';
  } else if (attentionLevel === 'low') {
    reasonShort = 'On track';
  }

  // ── heroReason — single merged context line for Hero card ──
  let heroReason = null;
  const hasLiveUrgency = (daysUntil !== null && daysUntil <= 0) || ta?.category === 'coach_flag';
  const isCoachWaiting = ta?.category === 'coach_flag' || ta?.action_key === 'coach_assigned_action' || ta?.action_key === 'coach_flag_reply_needed';

  if (hasLiveUrgency) {
    const parts = [];
    if (lastActivity) parts.push(`No response in ${lastActivity} day${lastActivity !== 1 ? 's' : ''}`);
    else if (daysUntil !== null && daysUntil < 0) parts.push(`${Math.abs(daysUntil)} day${Math.abs(daysUntil) !== 1 ? 's' : ''} overdue`);
    else parts.push('Due now');
    if (isCoachWaiting) parts.push('Coach is expecting a reply');
    heroReason = parts.join(' \u00b7 ');
  } else if (recapRank === 'top') {
    heroReason = lastActivity ? `No response in ${lastActivity} days \u2014 momentum slipping` : 'Needs attention \u2014 momentum slipping';
  } else if (recapRank === 'secondary') {
    heroReason = 'Building momentum \u2014 stay active';
  }

  // ── riskContext — one-line risk signal for high-urgency items ──
  let riskContext = null;
  if (tier === 'high' && lastActivity && lastActivity >= 7) {
    riskContext = 'This conversation is at risk of stalling';
  } else if (tier === 'high' && daysUntil !== null && daysUntil < -3) {
    riskContext = 'This conversation is at risk of stalling';
  }

  // ── ctaLabel — action-aligned CTA ──
  let ctaLabel = 'Open school';
  if (tier === 'high') {
    if (isCoachWaiting || ta?.action_key === 'coach_flag_reply_needed') ctaLabel = 'Reply now';
    else if (ta?.action_key === 'first_outreach_needed' || ta?.action_key === 'send_intro_email') ctaLabel = 'Send intro';
    else ctaLabel = 'Follow up now';
  }

  // ── prioritySource — what's driving this hero position ──
  let prioritySource = 'live';
  if (recapRank && !hasLiveUrgency) prioritySource = 'recap';
  else if (recapRank && hasLiveUrgency) prioritySource = 'merged';

  // ── explainFactors — structured reasons for "Why this?" panel ──
  const explainFactors = [];
  if (daysUntil !== null && daysUntil < 0)
    explainFactors.push({ type: 'overdue', label: `Overdue by ${Math.abs(daysUntil)} days` });
  if (daysUntil !== null && daysUntil === 0)
    explainFactors.push({ type: 'due', label: 'Due today' });
  if (ta?.category === 'coach_flag')
    explainFactors.push({ type: 'coach', label: 'Flagged by coach' });
  if (ta?.action_key === 'coach_assigned_action')
    explainFactors.push({ type: 'coach', label: 'Coach assigned action' });
  if (recapRank === 'top') {
    const label = recapFreshnessValue >= 0.75
      ? 'Top priority in Momentum Recap'
      : `Top priority in Momentum Recap (fading — ${Math.round(recapFreshnessValue * 100)}% weight)`;
    explainFactors.push({ type: recapFreshnessValue >= 0.75 ? 'recap' : 'recap-stale', label });
  } else if (recapRank === 'secondary') {
    const label = recapFreshnessValue >= 0.75
      ? 'Identified in Momentum Recap'
      : `Identified in Momentum Recap (fading — ${Math.round(recapFreshnessValue * 100)}% weight)`;
    explainFactors.push({ type: recapFreshnessValue >= 0.75 ? 'recap' : 'recap-stale', label });
  } else if (recapRank === 'watch') {
    explainFactors.push({ type: 'recap', label: 'On recap watch list' });
  }
  if (lastActivity !== null && lastActivity >= 5)
    explainFactors.push({ type: 'stale', label: `${lastActivity} days since last activity` });
  if (ta?.action_key === 'relationship_cooling' || ta?.action_key === 'reengage_relationship')
    explainFactors.push({ type: 'risk', label: 'Engagement cooling off' });

  // ── Structured reasons list (user-meaningful only, no system jargon) ──
  const reasons = [];
  if (hardTriggers.overdue) reasons.push(`Overdue by ${Math.abs(daysUntil)} day${Math.abs(daysUntil) !== 1 ? 's' : ''}`);
  if (hardTriggers.coachFlag) reasons.push('Flagged by coach');
  if (hardTriggers.dueSoon && !hardTriggers.overdue) reasons.push(daysUntil === 0 ? 'Due today' : `Due in ${daysUntil} day${daysUntil !== 1 ? 's' : ''}`);
  // Only show inactivity if it adds information beyond the overdue signal
  if (lastActivity !== null && lastActivity >= 7 && !hardTriggers.overdue) reasons.push(`No activity in ${lastActivity} days`);

  return {
    programId: p.program_id,
    attentionScore: score,
    attentionLevel,
    tier,
    heroEligible,
    urgency,
    momentum,
    hardTriggers,
    reasons,
    timingLabel,
    // Coach flag/hard trigger actions take priority over recap text
    primaryAction: (hardTriggers.coachFlag || hardTriggers.overdue || hardTriggers.escalation) ? primaryAction
      : recapRank === 'top' && recapAction ? recapAction : primaryAction,
    reason,
    reasonShort,
    heroReason,
    recapRank,
    prioritySource,
    explainFactors,
    daysUntil,
    owner: ta?.owner || 'athlete',
    ctaLabel,
    coachWaiting: isCoachWaiting,
    riskContext,
    microSignal,
    program: p,
    topAction: ta,
  };
}

/**
 * Stage priority for stable sort tie-breaking (higher = more advanced).
 */
const STAGE_PRIORITY = {
  offer: 5,
  campus_visit: 4,
  in_conversation: 3,
  outreach: 2,
  added: 1,
};

/**
 * Compute attention for all active programs, sorted by score descending
 * with stable tie-breaking: earliest due date → higher stage → alphabetical.
 *
 * @param {Array} programs — all pipeline programs
 * @param {Object} topActionsMap — keyed by program_id
 * @param {Object} [recapCtx] — { priorities: [...], createdAt: string }
 */
export function computeAllAttention(programs, topActionsMap, recapCtx) {
  const active = programs.filter(p =>
    p.board_group !== 'archived' &&
    p.recruiting_status !== 'Committed' &&
    p.pipeline_stage !== 'committed'
  );
  const results = active.map(p => computeAttention(p, topActionsMap[p.program_id], recapCtx));
  results.sort((a, b) => {
    // Primary: higher score first
    if (b.attentionScore !== a.attentionScore) return b.attentionScore - a.attentionScore;
    // Tie-break 1: earliest due date first (null = last)
    const aDue = a.daysUntil ?? 9999;
    const bDue = b.daysUntil ?? 9999;
    if (aDue !== bDue) return aDue - bDue;
    // Tie-break 2: higher-priority stage first (Sprint 3 SSOT: pipeline_stage)
    const aStage = STAGE_PRIORITY[a.program?.pipeline_stage] || 0;
    const bStage = STAGE_PRIORITY[b.program?.pipeline_stage] || 0;
    if (bStage !== aStage) return bStage - aStage;
    // Tie-break 3: alphabetical by name
    const aName = a.program?.university_name || '';
    const bName = b.program?.university_name || '';
    return aName.localeCompare(bName);
  });

  // ── Post-sort: if hero is live-urgent and a recap top priority exists
  //    elsewhere, add an explicit "recap outranked" explainability factor ──
  if (results.length > 0) {
    const hero = results[0];
    if (hero.prioritySource === 'live') {
      const recapTop = results.find(r =>
        r.recapRank === 'top' && r.programId !== hero.programId
      );
      if (recapTop) {
        const schoolName = recapTop.program?.university_name || 'another school';
        hero.explainFactors.push({
          type: 'recap-outranked',
          label: `Recap suggested ${schoolName} — this is more urgent`,
        });
      }
    }
  }

  return results;
}

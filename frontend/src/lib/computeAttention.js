/**
 * Attention Engine V2 — Single source of truth for all pipeline classification.
 *
 * Every program is scored once. The result drives:
 * Hero carousel, Peek row, Priority board, Coming Up timeline, Kanban cards.
 */

export function computeAttention(program, topAction) {
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
  }

  // Activity
  if (lastActivity !== null && lastActivity > 0) {
    if (lastActivity >= 7) score += 40;
    else if (lastActivity >= 3) score += 20;
  }

  // Stage bonus
  if (p.journey_stage === 'campus_visit') score += 15;
  else if (p.journey_stage === 'in_conversation') score += 10;

  // ── CRITICAL: daysUntil <= 0 → MUST NOT be on track ──
  if (daysUntil !== null && daysUntil <= 0 && score < 40) {
    score = 40;
  }

  // ── Attention level ──
  const attentionLevel = score >= 80 ? 'high' : score >= 40 ? 'medium' : 'low';

  // ── Timing label ──
  let timingLabel = null;
  if (daysUntil !== null) {
    if (daysUntil < 0) timingLabel = `Overdue ${Math.abs(daysUntil)}d`;
    else if (daysUntil === 0) timingLabel = 'Due today';
    else if (daysUntil === 1) timingLabel = 'Tomorrow';
    else if (daysUntil <= 3) timingLabel = `In ${daysUntil} days`;
  }
  if (!timingLabel && lastActivity > 0) {
    timingLabel = `No response in ${lastActivity} day${lastActivity !== 1 ? 's' : ''}`;
  }
  if (!timingLabel && ta?.category === 'first_outreach') {
    timingLabel = 'No contact yet';
  }

  // ── Primary action ──
  const actionMap = {
    coach_assigned_action: `Follow up with ${name} coach`,
    overdue_follow_up: `Follow up with ${name}`,
    stale_reply: `Follow up with ${name}`,
    first_outreach_needed: `Send intro to ${name}`,
    send_intro_email: `Send intro to ${name}`,
    relationship_cooling: `Re-engage ${name}`,
    reengage_relationship: `Re-engage ${name}`,
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
    primaryAction = daysUntil < 0 ? `Follow up with ${name}` : `Follow up with ${name} today`;
  }

  // ── Reason ──
  const reasonMap = {
    coach_assigned_action: 'Coach assigned a follow-up',
    overdue_follow_up: 'Follow-up is overdue',
    stale_reply: 'Awaiting coach reply',
    first_outreach_needed: 'Ready for first contact',
    send_intro_email: 'Ready for first contact',
    relationship_cooling: 'No recent engagement',
    reengage_relationship: 'No recent engagement',
    due_today_follow_up: 'Follow-up due today',
  };
  let reason = reasonMap[ta?.action_key] || 'No action needed';
  if (daysUntil !== null && daysUntil <= 0 && reason === 'No action needed') {
    reason = daysUntil < 0 ? 'Follow-up overdue' : 'Follow-up due today';
  }

  // ── Micro-signal ──
  let microSignal = null;
  if (daysUntil !== null && daysUntil < 0) microSignal = { text: 'Now overdue', color: '#dc2626' };
  else if (daysUntil === 0) microSignal = { text: 'Due today', color: '#d97706' };
  else if (ta?.category === 'first_outreach') microSignal = { text: 'New', color: '#94a3b8' };

  return {
    programId: p.program_id,
    attentionScore: score,
    attentionLevel,
    timingLabel,
    primaryAction,
    reason,
    daysUntil,
    owner: ta?.owner || 'athlete',
    ctaLabel: ta?.cta_label || (attentionLevel === 'low' ? 'View School' : 'Take Action'),
    microSignal,
    program: p,
    topAction: ta,
  };
}

/**
 * Compute attention for all active programs, sorted by score descending.
 */
export function computeAllAttention(programs, topActionsMap) {
  const active = programs.filter(p =>
    p.board_group !== 'archived' &&
    p.recruiting_status !== 'Committed' &&
    p.journey_stage !== 'committed'
  );
  const results = active.map(p => computeAttention(p, topActionsMap[p.program_id]));
  results.sort((a, b) => b.attentionScore - a.attentionScore);
  return results;
}

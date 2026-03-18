import React, { useCallback } from "react";
import axios from "axios";
import { toast } from "sonner";
import SwipeableCard from "./SwipeableCard";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

/* ── HIGH row: action-first list item ── */
function HighRow({ item, navigate, isLast }) {
  const { primaryAction, timingLabel, owner, ctaLabel, program: prog } = item;
  const ownerLabel = owner === 'coach' ? 'Coach' : owner === 'director' ? 'Director' : 'You';

  return (
    <div
      className="kanban-card"
      style={{
        display: 'flex', alignItems: 'center', gap: 14,
        padding: '10px 4px',
        cursor: 'pointer',
        borderBottom: isLast ? 'none' : '1px solid var(--cm-border, #e8ecf1)',
        background: 'transparent', borderRadius: 0,
      }}
      data-testid={`priority-card-${prog.program_id}`}
    >
      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Line 1: action — school */}
        <div style={{
          fontSize: 13, fontWeight: 700, color: 'var(--cm-text, #0f172a)',
          lineHeight: 1.35, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }} data-testid={`priority-action-${prog.program_id}`}>
          {primaryAction}
          <span style={{ fontWeight: 500, color: 'var(--cm-text-3, #94a3b8)', marginLeft: 6 }}>— {prog.university_name}</span>
        </div>
        {/* Line 2: metadata */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3 }}>
          {timingLabel && (
            <span style={{ fontSize: 10, fontWeight: 700, color: '#dc2626' }} data-testid={`timing-label-${prog.program_id}`}>{timingLabel}</span>
          )}
          <span style={{ fontSize: 9, fontWeight: 700, padding: '0px 5px', borderRadius: 3, background: ownerLabel === 'You' ? 'rgba(13,148,136,0.06)' : 'rgba(99,102,241,0.06)', color: ownerLabel === 'You' ? '#0d9488' : '#6366f1' }}>{ownerLabel}</span>
        </div>
      </div>

      {/* CTA */}
      <span style={{ fontSize: 11, fontWeight: 700, color: '#dc2626', opacity: 0.75, flexShrink: 0, whiteSpace: 'nowrap' }} data-testid={`cta-btn-${prog.program_id}`}>
        {ctaLabel || 'Take Action'} →
      </span>
    </div>
  );
}

/* ── MED row: same list style, softer color ── */
function MedRow({ item, navigate, isLast }) {
  const { primaryAction, timingLabel, owner, ctaLabel, program: prog } = item;
  const ownerLabel = owner === 'coach' ? 'Coach' : owner === 'director' ? 'Director' : 'You';

  return (
    <div
      className="kanban-card"
      style={{
        display: 'flex', alignItems: 'center', gap: 14,
        padding: '10px 4px',
        cursor: 'pointer',
        borderBottom: isLast ? 'none' : '1px solid var(--cm-border, #e8ecf1)',
        background: 'transparent', borderRadius: 0,
      }}
      data-testid={`priority-card-${prog.program_id}`}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Line 1: action — school */}
        <div style={{
          fontSize: 13, fontWeight: 600, color: 'var(--cm-text, #0f172a)',
          lineHeight: 1.35, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }} data-testid={`priority-action-${prog.program_id}`}>
          {primaryAction}
          <span style={{ fontWeight: 500, color: 'var(--cm-text-4, #cbd5e1)', marginLeft: 6 }}>— {prog.university_name}</span>
        </div>
        {/* Line 2: metadata */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3 }}>
          {timingLabel && (
            <span style={{ fontSize: 10, fontWeight: 600, color: '#92400e', opacity: 0.7 }} data-testid={`timing-label-${prog.program_id}`}>{timingLabel}</span>
          )}
          <span style={{ fontSize: 9, fontWeight: 700, padding: '0px 5px', borderRadius: 3, background: ownerLabel === 'You' ? 'rgba(13,148,136,0.06)' : 'rgba(99,102,241,0.06)', color: ownerLabel === 'You' ? '#0d9488' : '#6366f1' }}>{ownerLabel}</span>
        </div>
      </div>

      {/* CTA — subtler */}
      <span style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--cm-text-3, #94a3b8)', flexShrink: 0, whiteSpace: 'nowrap' }} data-testid={`cta-btn-${prog.program_id}`}>
        {ctaLabel || 'View'} →
      </span>
    </div>
  );
}

/* ── LOW card: minimal, no swipe ── */
function LowCard({ item, navigate }) {
  const { primaryAction, program: prog } = item;

  return (
    <div
      onClick={() => navigate(`/pipeline/${prog.program_id}`)}
      className="kanban-card"
      style={{
        background: 'var(--cm-surface, #fff)',
        borderRadius: 7,
        padding: '8px 11px',
        cursor: 'pointer',
        border: '1px solid var(--cm-border, #e8ecf1)',
        opacity: 0.7,
      }}
      data-testid={`priority-card-${prog.program_id}`}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <span style={{ width: 4, height: 4, borderRadius: '50%', background: '#10b981', flexShrink: 0 }} />
        <span style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#047857' }}>On track</span>
      </div>
      <div style={{
        fontSize: 12, fontWeight: 600, color: 'var(--cm-text-2, #475569)',
        marginTop: 3, lineHeight: 1.3,
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }} data-testid={`priority-action-${prog.program_id}`}>
        {primaryAction}
      </div>
    </div>
  );
}

/* ── Swipeable wrapper ── */
function SwipePriorityCard({ item, navigate, section, cardIdx, isLast }) {
  const prog = item.program;
  const programId = prog?.program_id;

  const handleAction = useCallback(() => {
    if (programId) navigate(`/pipeline/${programId}`);
  }, [programId, navigate]);

  const handleSnooze = useCallback(async (days) => {
    if (!programId) return;
    const snoozeDate = new Date();
    snoozeDate.setDate(snoozeDate.getDate() + days);
    const label = days === 1 ? 'tomorrow' : days === 3 ? 'in 3 days' : 'next week';
    try {
      await axios.put(`${API}/athlete/programs/${programId}`, {
        snoozed_until: snoozeDate.toISOString(),
      });
      toast.success(`Snoozed to ${label}`);
    } catch {
      toast.error("Couldn't snooze — try again");
    }
  }, [programId]);

  const handleTap = useCallback(() => {
    if (programId) navigate(`/pipeline/${programId}`);
  }, [programId, navigate]);

  if (section === 'attention') {
    return (
      <SwipeableCard onAction={handleAction} onSnooze={handleSnooze} actionLabel={item.ctaLabel || 'Take Action'} programId={programId}>
        <div onClick={handleTap}>
          <HighRow item={item} navigate={navigate} isLast={isLast} />
        </div>
      </SwipeableCard>
    );
  }

  if (section === 'coming-up') {
    return (
      <SwipeableCard onAction={handleAction} onSnooze={handleSnooze} actionLabel={item.ctaLabel || 'Take Action'} programId={programId}>
        <div onClick={handleTap}>
          <MedRow item={item} navigate={navigate} isLast={isLast} />
        </div>
      </SwipeableCard>
    );
  }

  return <LowCard item={item} navigate={navigate} />;
}

export default function PriorityBoard({ items, navigate }) {
  const high = items.filter(i => i.attentionLevel === 'high');
  const medium = items.filter(i => i.attentionLevel === 'medium');
  const low = items.filter(i => i.attentionLevel === 'low');

  const allOnTrack = high.length === 0 && medium.length === 0 && low.length > 0;

  const GRID = {
    attention: { display: 'flex', flexDirection: 'column', gap: 0 },
    'coming-up': { display: 'flex', flexDirection: 'column', gap: 0 },
    'on-track': { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 6 },
  };

  const sections = [
    { key: 'attention', label: 'Next actions', color: '#64748b', items: high, empty: 'Nothing urgent right now', headerOpacity: 1 },
    { key: 'coming-up', label: 'Coming up', color: '#94a3b8', items: medium, empty: 'No upcoming actions', headerOpacity: 0.7 },
    { key: 'on-track', label: 'On Track', color: '#10b981', items: low, empty: 'No programs on track yet', headerOpacity: 0.55 },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }} data-testid="priority-board">
      {allOnTrack && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 18px', borderRadius: 10, background: 'rgba(16,185,129,0.04)', border: '1px solid rgba(16,185,129,0.10)' }} data-testid="all-on-track-banner">
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981', flexShrink: 0 }} />
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--cm-text-2, #475569)' }}>Everything is on track</span>
          <span style={{ fontSize: 11, color: 'var(--cm-text-3, #94a3b8)' }}>&mdash; no programs need immediate attention</span>
        </div>
      )}
      {sections.map(sec => (
        <div key={sec.key} data-testid={`priority-section-${sec.key}`}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6, opacity: sec.headerOpacity }}>
            <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: sec.color }}>{sec.label}</span>
            <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--cm-text-4)' }}>{sec.items.length}</span>
          </div>
          {sec.items.length > 0 ? (
            <div style={GRID[sec.key]} className={sec.key === 'coming-up' ? 'priority-grid-coming-up' : undefined}>
              {sec.items.map((item, i) => (
                <SwipePriorityCard key={item.programId} item={item} navigate={navigate} section={sec.key} cardIdx={i} isLast={i === sec.items.length - 1} />
              ))}
            </div>
          ) : (
            <div style={{ padding: '16px', fontSize: 11, color: 'var(--cm-text-4)', fontWeight: 500 }} data-testid={`empty-state-${sec.key}`}>
              {sec.empty}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

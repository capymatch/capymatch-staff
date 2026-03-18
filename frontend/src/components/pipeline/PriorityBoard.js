import React from "react";
import { ATTENTION_META } from "./pipeline-constants";

/* ── HIGH card: full-width, action-first task row ── */
function HighCard({ item, navigate }) {
  const { primaryAction, reasonShort, microSignal, timingLabel, owner, ctaLabel, program: prog } = item;
  const ownerLabel = owner === 'coach' ? 'Coach' : owner === 'director' ? 'Director' : 'You';
  /* Hide reasonShort when it just restates timing already shown in top row */
  const isTimingDupe = reasonShort && (/^Overdue by/i.test(reasonShort) || /^Due /i.test(reasonShort));
  const metaReason = isTimingDupe ? null : reasonShort;

  return (
    <div
      onClick={() => navigate(`/pipeline/${prog.program_id}`)}
      className="kanban-card"
      style={{
        display: 'flex', alignItems: 'center', gap: 14,
        background: 'rgba(239,68,68,0.03)',
        borderRadius: 10,
        padding: '14px 16px',
        cursor: 'pointer',
        border: '1px solid rgba(239,68,68,0.10)',
        borderLeft: '4px solid #ef4444',
      }}
      data-testid={`priority-card-${prog.program_id}`}
    >
      {/* Left: content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Top row: level + micro-signal  |  timing */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#ef4444', flexShrink: 0 }} />
            <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#dc2626' }}>High</span>
            {microSignal && (
              <span style={{ fontSize: 9.5, fontWeight: 600, color: microSignal.color, opacity: 0.7 }} data-testid={`micro-signal-${prog.program_id}`}>
                {'\u00b7'} {microSignal.text}
              </span>
            )}
          </div>
          {timingLabel && (
            <span style={{ fontSize: 10, fontWeight: 700, color: '#dc2626', opacity: 0.7, flexShrink: 0 }} data-testid={`timing-label-${prog.program_id}`}>
              {timingLabel}
            </span>
          )}
        </div>

        {/* Main action — largest text, max 2 lines */}
        <div style={{
          fontSize: 14, fontWeight: 700, color: 'var(--cm-text, #0f172a)',
          marginTop: 6, lineHeight: 1.35,
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
        }} data-testid={`priority-action-${prog.program_id}`}>
          {primaryAction}
        </div>

        {/* Meta line: non-timing reason · owner */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 5 }} data-testid={`priority-reason-${prog.program_id}`}>
          {metaReason && (
            <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--cm-text-3, #94a3b8)' }}>{metaReason}</span>
          )}
          <span style={{ fontSize: 9.5, fontWeight: 700, padding: '1px 6px', borderRadius: 3, background: ownerLabel === 'You' ? 'rgba(13,148,136,0.08)' : 'rgba(99,102,241,0.08)', color: ownerLabel === 'You' ? '#0d9488' : '#6366f1' }}>{ownerLabel}</span>
        </div>
      </div>

      {/* Right: CTA */}
      <button
        style={{
          padding: '7px 14px', borderRadius: 7,
          fontSize: 11, fontWeight: 700,
          background: '#ef4444', color: '#fff',
          border: 'none', cursor: 'pointer', fontFamily: 'inherit',
          flexShrink: 0, whiteSpace: 'nowrap',
        }}
        data-testid={`cta-btn-${prog.program_id}`}
      >
        {ctaLabel || 'Take Action'} →
      </button>
    </div>
  );
}

/* ── MED card: compact, amber tint ── */
function MedCard({ item, navigate }) {
  const { primaryAction, reasonShort, microSignal, timingLabel, owner, program: prog } = item;
  const ownerLabel = owner === 'coach' ? 'Coach' : owner === 'director' ? 'Director' : 'You';
  const isTimingDupe = reasonShort && (/^Overdue by/i.test(reasonShort) || /^Due /i.test(reasonShort));
  const metaReason = isTimingDupe ? null : reasonShort;

  return (
    <div
      onClick={() => navigate(`/pipeline/${prog.program_id}`)}
      className="kanban-card"
      style={{
        background: 'rgba(217,119,6,0.02)',
        borderRadius: 8,
        padding: '11px 13px',
        cursor: 'pointer',
        border: '1px solid rgba(217,119,6,0.10)',
        borderLeft: '3px solid #d97706',
      }}
      data-testid={`priority-card-${prog.program_id}`}
    >
      {/* Top row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#d97706', flexShrink: 0 }} />
          <span style={{ fontSize: 9.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#92400e' }}>Med</span>
          {microSignal && (
            <span style={{ fontSize: 9, fontWeight: 600, color: microSignal.color, opacity: 0.65 }} data-testid={`micro-signal-${prog.program_id}`}>
              {'\u00b7'} {microSignal.text}
            </span>
          )}
        </div>
        {timingLabel && (
          <span style={{ fontSize: 9.5, fontWeight: 600, color: '#92400e', opacity: 0.6, flexShrink: 0 }} data-testid={`timing-label-${prog.program_id}`}>
            {timingLabel}
          </span>
        )}
      </div>

      {/* Action */}
      <div style={{
        fontSize: 13, fontWeight: 650, color: 'var(--cm-text, #0f172a)',
        marginTop: 5, lineHeight: 1.35,
        display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
      }} data-testid={`priority-action-${prog.program_id}`}>
        {primaryAction}
      </div>

      {/* Meta */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }} data-testid={`priority-reason-${prog.program_id}`}>
        {metaReason && (
          <span style={{ fontSize: 10.5, fontWeight: 500, color: 'var(--cm-text-4, #cbd5e1)' }}>{metaReason}</span>
        )}
        <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 3, background: ownerLabel === 'You' ? 'rgba(13,148,136,0.06)' : 'rgba(99,102,241,0.06)', color: ownerLabel === 'You' ? '#0d9488' : '#6366f1' }}>{ownerLabel}</span>
      </div>
    </div>
  );
}

/* ── LOW card: minimal, no CTA ── */
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
        opacity: 0.75,
      }}
      data-testid={`priority-card-${prog.program_id}`}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
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

/* ── Card router ── */
function PriorityCard({ item, navigate, section }) {
  if (section === 'attention') return <HighCard item={item} navigate={navigate} />;
  if (section === 'coming-up') return <MedCard item={item} navigate={navigate} />;
  return <LowCard item={item} navigate={navigate} />;
}

export default function PriorityBoard({ items, navigate }) {
  const high = items.filter(i => i.attentionLevel === 'high');
  const medium = items.filter(i => i.attentionLevel === 'medium');
  const low = items.filter(i => i.attentionLevel === 'low');

  const allOnTrack = high.length === 0 && medium.length === 0 && low.length > 0;

  const GRID = {
    attention: { display: 'flex', flexDirection: 'column', gap: 10 },
    'coming-up': { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 },
    'on-track': { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 6 },
  };

  const sections = [
    { key: 'attention', label: 'Needs Attention', color: '#dc2626', items: high, empty: 'Nothing urgent right now', headerOpacity: 1 },
    { key: 'coming-up', label: 'Coming Up Soon', color: '#d97706', items: medium, empty: 'No upcoming actions', headerOpacity: 0.75 },
    { key: 'on-track', label: 'On Track', color: '#10b981', items: low, empty: 'No programs on track yet', headerOpacity: 0.6 },
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: sec.key === 'attention' ? 12 : 8, opacity: sec.headerOpacity }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: sec.color }} />
            <span style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: sec.color }}>{sec.label}</span>
            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--cm-text-3)' }}>{sec.items.length}</span>
          </div>
          {sec.items.length > 0 ? (
            <div style={GRID[sec.key]} className={sec.key === 'coming-up' ? 'priority-grid-coming-up' : undefined}>
              {sec.items.map(item => (
                <PriorityCard key={item.programId} item={item} navigate={navigate} section={sec.key} />
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

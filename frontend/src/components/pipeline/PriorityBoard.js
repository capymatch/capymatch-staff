import React from "react";
import { ATTENTION_META } from "./pipeline-constants";

function PriorityCard({ item, navigate, section }) {
  const { attentionLevel, primaryAction, reasonShort, microSignal, owner, ctaLabel, program: prog } = item;
  const meta = ATTENTION_META[attentionLevel];
  const ownerLabel = owner === 'coach' ? 'Coach' : owner === 'director' ? 'Director' : 'You';
  const isCompact = section === 'on-track';
  const isSubdued = section === 'coming-up' || section === 'on-track';

  return (
    <div
      onClick={() => navigate(`/pipeline/${prog.program_id}`)}
      className="kanban-card"
      style={{
        background: 'var(--cm-surface, #fff)',
        borderRadius: 8,
        padding: isCompact ? '8px 10px' : '10px 12px',
        cursor: 'pointer',
        border: `1px solid ${attentionLevel === 'high' ? 'rgba(239,68,68,0.12)' : 'var(--cm-border, #e8ecf1)'}`,
        boxShadow: attentionLevel === 'high' ? '0 1px 3px rgba(239,68,68,0.06)' : '0 1px 2px rgba(0,0,0,0.04)',
        opacity: isSubdued ? 0.88 : 1,
      }}
      data-testid={`priority-card-${prog.program_id}`}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
        <span style={{ width: 5, height: 5, borderRadius: '50%', background: meta.dot }} />
        <span style={{ fontSize: isCompact ? 9.5 : 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: meta.color }}>{meta.label}</span>
        {microSignal && <span style={{ fontSize: 9, fontWeight: 600, color: microSignal.color, opacity: 0.65 }} data-testid={`micro-signal-${prog.program_id}`}>{'\u00b7'} {microSignal.text}</span>}
      </div>
      <div style={{ fontSize: isCompact ? 12 : 13, fontWeight: 600, color: 'var(--cm-text)', marginTop: isCompact ? 3 : 4, lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} data-testid={`priority-action-${prog.program_id}`}>
        {primaryAction}
      </div>
      {attentionLevel !== 'low' && (reasonShort || ctaLabel) && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: isCompact ? 3 : 4 }} data-testid={`priority-reason-${prog.program_id}`}>
          <span style={{ fontSize: 10.5, fontWeight: 600, color: attentionLevel === 'high' ? '#dc2626' : 'var(--cm-text-2, #475569)' }}>{'\u2192'} {reasonShort || ctaLabel}</span>
          <span style={{ fontSize: 9.5, fontWeight: 700, padding: '1px 5px', borderRadius: 3, background: ownerLabel === 'You' ? 'rgba(13,148,136,0.08)' : 'rgba(99,102,241,0.08)', color: ownerLabel === 'You' ? '#0d9488' : '#6366f1' }}>{ownerLabel}</span>
        </div>
      )}
    </div>
  );
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

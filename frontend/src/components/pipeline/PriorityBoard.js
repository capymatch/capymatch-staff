import React, { useState, useCallback } from "react";
import axios from "axios";
import { toast } from "sonner";
import { ChevronRight } from "lucide-react";
import SwipeableCard from "./SwipeableCard";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

/* ── Timing color helper ── */
function getTimingColor(timingLabel) {
  if (!timingLabel) return null;
  const lower = timingLabel.toLowerCase();
  if (lower.includes('overdue')) return '#dc2626';
  return '#64748b';
}

/* ── HIGH row: action-first list item ── */
function HighRow({ item, navigate, isLast }) {
  const { primaryAction, timingLabel, owner, ctaLabel, program: prog } = item;
  const ownerLabel = owner === 'coach' ? 'Coach' : owner === 'director' ? 'Director' : 'You';
  const timingColor = getTimingColor(timingLabel);

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
        <div style={{
          fontSize: 13, fontWeight: 700, color: 'var(--cm-text, #0f172a)',
          lineHeight: 1.35, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }} data-testid={`priority-action-${prog.program_id}`}>
          {primaryAction}
          <span style={{ fontWeight: 500, color: 'var(--cm-text-3, #94a3b8)', marginLeft: 6 }}>— {prog.university_name}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3 }}>
          {timingLabel && (
            <span style={{ fontSize: 10, fontWeight: 700, color: timingColor }} data-testid={`timing-label-${prog.program_id}`}>{timingLabel}</span>
          )}
          <span style={{ fontSize: 9, fontWeight: 700, padding: '0px 5px', borderRadius: 3, background: ownerLabel === 'You' ? 'rgba(13,148,136,0.06)' : 'rgba(99,102,241,0.06)', color: ownerLabel === 'You' ? '#0d9488' : '#6366f1' }}>{ownerLabel}</span>
        </div>
      </div>
      <span style={{ fontSize: 11, fontWeight: 700, color: '#dc2626', opacity: 0.75, flexShrink: 0, whiteSpace: 'nowrap' }} data-testid={`cta-btn-${prog.program_id}`}>
        {ctaLabel || 'Take Action'} →
      </span>
    </div>
  );
}

/* ── MED row: same list style, neutral timing ── */
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
        <div style={{
          fontSize: 13, fontWeight: 600, color: 'var(--cm-text, #0f172a)',
          lineHeight: 1.35, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }} data-testid={`priority-action-${prog.program_id}`}>
          {primaryAction}
          <span style={{ fontWeight: 500, color: 'var(--cm-text-3, #94a3b8)', marginLeft: 6 }}>— {prog.university_name}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3 }}>
          {timingLabel && (
            <span style={{ fontSize: 10, fontWeight: 600, color: '#64748b' }} data-testid={`timing-label-${prog.program_id}`}>{timingLabel}</span>
          )}
          <span style={{ fontSize: 9, fontWeight: 700, padding: '0px 5px', borderRadius: 3, background: ownerLabel === 'You' ? 'rgba(13,148,136,0.06)' : 'rgba(99,102,241,0.06)', color: ownerLabel === 'You' ? '#0d9488' : '#6366f1' }}>{ownerLabel}</span>
        </div>
      </div>
      <span style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--cm-text-3, #94a3b8)', flexShrink: 0, whiteSpace: 'nowrap' }} data-testid={`cta-btn-${prog.program_id}`}>
        {ctaLabel || 'View'} →
      </span>
    </div>
  );
}

/* ── LOW row: same list style, muted ── */
function LowRow({ item, navigate, isLast }) {
  const { primaryAction, program: prog } = item;

  return (
    <div
      onClick={() => navigate(`/pipeline/${prog.program_id}`)}
      className="kanban-card"
      style={{
        display: 'flex', alignItems: 'center', gap: 14,
        padding: '9px 4px',
        cursor: 'pointer',
        borderBottom: isLast ? 'none' : '1px solid var(--cm-border, #e8ecf1)',
        background: 'transparent', borderRadius: 0,
      }}
      data-testid={`priority-card-${prog.program_id}`}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 13, fontWeight: 500, color: 'var(--cm-text-2, #475569)',
          lineHeight: 1.35, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }} data-testid={`priority-action-${prog.program_id}`}>
          {primaryAction}
          <span style={{ fontWeight: 400, color: 'var(--cm-text-4, #cbd5e1)', marginLeft: 6 }}>— {prog.university_name}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3 }}>
          <span style={{ fontSize: 10, fontWeight: 600, color: 'rgba(16,185,129,0.55)' }}>On track</span>
        </div>
      </div>
      <span style={{ fontSize: 10.5, fontWeight: 500, color: 'var(--cm-text-4, #cbd5e1)', flexShrink: 0, whiteSpace: 'nowrap' }} data-testid={`cta-btn-${prog.program_id}`}>
        View →
      </span>
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

  return (
    <div onClick={() => { if (prog?.program_id) navigate(`/pipeline/${prog.program_id}`); }}>
      <LowRow item={item} navigate={navigate} isLast={isLast} />
    </div>
  );
}

/* ── Section header ── */
function SectionHeader({ label, count, color, opacity }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 8, opacity }}>
      <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.01em', color }}>{label}</span>
      <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--cm-text-4, #cbd5e1)' }}>({count})</span>
    </div>
  );
}

export default function PriorityBoard({ items, navigate }) {
  const high = items.filter(i => i.attentionLevel === 'high');
  const medium = items.filter(i => i.attentionLevel === 'medium');
  const low = items.filter(i => i.attentionLevel === 'low');

  const allOnTrack = high.length === 0 && medium.length === 0 && low.length > 0;

  const [onTrackCollapsed, setOnTrackCollapsed] = useState(low.length > 3);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }} data-testid="priority-board">
      {allOnTrack && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 18px', borderRadius: 10, background: 'rgba(16,185,129,0.04)', border: '1px solid rgba(16,185,129,0.10)' }} data-testid="all-on-track-banner">
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981', flexShrink: 0 }} />
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--cm-text-2, #475569)' }}>Everything is on track</span>
          <span style={{ fontSize: 11, color: 'var(--cm-text-3, #94a3b8)' }}>&mdash; no programs need immediate attention</span>
        </div>
      )}

      {/* ── Next actions (high) ── */}
      <div data-testid="priority-section-attention">
        <SectionHeader label="Next actions" count={high.length} color="#475569" opacity={1} />
        {high.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {high.map((item, i) => (
              <SwipePriorityCard key={item.programId} item={item} navigate={navigate} section="attention" cardIdx={i} isLast={i === high.length - 1} />
            ))}
          </div>
        ) : (
          <div style={{ padding: '16px 4px', fontSize: 12, color: 'var(--cm-text-3, #94a3b8)', fontWeight: 500 }} data-testid="empty-state-attention">
            Nothing urgent right now
          </div>
        )}
      </div>

      {/* ── Coming up (medium) ── */}
      <div data-testid="priority-section-coming-up">
        <SectionHeader label="Coming up" count={medium.length} color="#64748b" opacity={0.85} />
        {medium.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {medium.map((item, i) => (
              <SwipePriorityCard key={item.programId} item={item} navigate={navigate} section="coming-up" cardIdx={i} isLast={i === medium.length - 1} />
            ))}
          </div>
        ) : (
          <div style={{ padding: '16px 4px', fontSize: 12, color: 'var(--cm-text-3, #94a3b8)', fontWeight: 500 }} data-testid="empty-state-coming-up">
            No upcoming actions
          </div>
        )}
      </div>

      {/* ── On track (low) — collapsible ── */}
      <div data-testid="priority-section-on-track">
        <div
          onClick={() => setOnTrackCollapsed(c => !c)}
          style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: onTrackCollapsed ? 0 : 8, cursor: 'pointer', opacity: 0.7 }}
          data-testid="on-track-header"
        >
          <ChevronRight style={{
            width: 13, height: 13, color: '#10b981',
            transition: 'transform 0.2s',
            transform: onTrackCollapsed ? 'none' : 'rotate(90deg)',
            flexShrink: 0,
          }} />
          <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.01em', color: '#10b981' }}>On track</span>
          <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--cm-text-4, #cbd5e1)' }}>({low.length})</span>
        </div>
        {!onTrackCollapsed && (
          low.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {low.map((item, i) => (
                <SwipePriorityCard key={item.programId} item={item} navigate={navigate} section="on-track" cardIdx={i} isLast={i === low.length - 1} />
              ))}
            </div>
          ) : (
            <div style={{ padding: '16px 4px', fontSize: 12, color: 'var(--cm-text-3, #94a3b8)', fontWeight: 500 }} data-testid="empty-state-on-track">
              No programs on track yet
            </div>
          )
        )}
      </div>
    </div>
  );
}

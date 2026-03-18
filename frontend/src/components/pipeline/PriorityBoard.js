import React, { useState, useCallback } from "react";
import axios from "axios";
import { toast } from "sonner";
import { ChevronRight } from "lucide-react";
import SwipeableCard from "./SwipeableCard";
import {
  LogoBox, OwnerTag, StatusIndicator, PipelineRowStyles,
  shortenName, getTimingColor, STATUS,
  ROW_GAP, DIVIDER, FONT,
} from "./pipeline-design";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

/* ── HIGH row ── */
function HighRow({ item, isLast }) {
  const { primaryAction, timingLabel, owner, ctaLabel, program: prog } = item;
  const timingColor = getTimingColor(timingLabel);
  const short = shortenName(prog.university_name);

  return (
    <div
      className="pb-row"
      style={{
        display: 'flex', alignItems: 'flex-start', gap: ROW_GAP,
        padding: '8px 4px', cursor: 'pointer',
        borderBottom: isLast ? 'none' : DIVIDER,
      }}
      data-testid={`priority-card-${prog.program_id}`}
    >
      <div style={{ paddingTop: 1 }}>
        <LogoBox domain={prog.domain} name={prog.university_name} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ ...FONT.actionHigh, lineHeight: 1.35, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} data-testid={`priority-action-${prog.program_id}`}>
          {primaryAction}
          <span style={FONT.schoolSuffix}>— {short}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 1 }}>
          {timingLabel && (
            <span style={{ fontSize: 10, fontWeight: 700, color: timingColor }} data-testid={`timing-label-${prog.program_id}`}>{timingLabel}</span>
          )}
          <OwnerTag owner={owner} />
        </div>
      </div>
      <span className="pb-cta" style={{ fontSize: 11, fontWeight: 700, color: '#dc2626', opacity: 0.85, flexShrink: 0, whiteSpace: 'nowrap', paddingTop: 1 }} data-testid={`cta-btn-${prog.program_id}`}>
        {ctaLabel || 'Take Action'} →
      </span>
    </div>
  );
}

/* ── MED row ── */
function MedRow({ item, isLast }) {
  const { primaryAction, timingLabel, owner, ctaLabel, program: prog } = item;
  const short = shortenName(prog.university_name);

  return (
    <div
      className="pb-row"
      style={{
        display: 'flex', alignItems: 'flex-start', gap: ROW_GAP,
        padding: '8px 4px', cursor: 'pointer',
        borderBottom: isLast ? 'none' : DIVIDER,
      }}
      data-testid={`priority-card-${prog.program_id}`}
    >
      <div style={{ paddingTop: 1 }}>
        <LogoBox domain={prog.domain} name={prog.university_name} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ ...FONT.actionMed, lineHeight: 1.35, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} data-testid={`priority-action-${prog.program_id}`}>
          {primaryAction}
          <span style={FONT.schoolSuffix}>— {short}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 1 }}>
          {timingLabel && (
            <span style={{ fontSize: 10, fontWeight: 600, color: '#64748b' }} data-testid={`timing-label-${prog.program_id}`}>{timingLabel}</span>
          )}
          <OwnerTag owner={owner} />
        </div>
      </div>
      <span className="pb-cta" style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--cm-text-3, #94a3b8)', opacity: 0.65, flexShrink: 0, whiteSpace: 'nowrap', paddingTop: 1 }} data-testid={`cta-btn-${prog.program_id}`}>
        {ctaLabel || 'View'} →
      </span>
    </div>
  );
}

/* ── LOW row ── */
function LowRow({ item, navigate, isLast }) {
  const { primaryAction, program: prog } = item;
  const short = shortenName(prog.university_name);

  return (
    <div
      onClick={() => navigate(`/pipeline/${prog.program_id}`)}
      className="pb-row"
      style={{
        display: 'flex', alignItems: 'flex-start', gap: ROW_GAP,
        padding: '8px 4px', cursor: 'pointer',
        borderBottom: isLast ? 'none' : DIVIDER,
      }}
      data-testid={`priority-card-${prog.program_id}`}
    >
      <div style={{ paddingTop: 1 }}>
        <LogoBox domain={prog.domain} name={prog.university_name} muted />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ ...FONT.actionLow, lineHeight: 1.35, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} data-testid={`priority-action-${prog.program_id}`}>
          {primaryAction}
          <span style={FONT.schoolSuffixLow}>— {short}</span>
        </div>
        <div style={{ marginTop: 1 }}>
          <StatusIndicator level="low" />
        </div>
      </div>
      <span className="pb-cta" style={{ fontSize: 10.5, fontWeight: 500, color: 'var(--cm-text-4, #cbd5e1)', opacity: 0.55, flexShrink: 0, whiteSpace: 'nowrap', paddingTop: 1 }} data-testid={`cta-btn-${prog.program_id}`}>
        View →
      </span>
    </div>
  );
}

/* ── Swipeable wrapper ── */
function SwipePriorityCard({ item, navigate, section, isLast }) {
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
      await axios.put(`${API}/athlete/programs/${programId}`, { snoozed_until: snoozeDate.toISOString() });
      toast.success(`Snoozed to ${label}`);
    } catch { toast.error("Couldn't snooze — try again"); }
  }, [programId]);

  const handleTap = useCallback(() => {
    if (programId) navigate(`/pipeline/${programId}`);
  }, [programId, navigate]);

  if (section === 'attention') {
    return (
      <SwipeableCard onAction={handleAction} onSnooze={handleSnooze} actionLabel={item.ctaLabel || 'Take Action'} programId={programId}>
        <div onClick={handleTap}><HighRow item={item} isLast={isLast} /></div>
      </SwipeableCard>
    );
  }
  if (section === 'coming-up') {
    return (
      <SwipeableCard onAction={handleAction} onSnooze={handleSnooze} actionLabel={item.ctaLabel || 'Take Action'} programId={programId}>
        <div onClick={handleTap}><MedRow item={item} isLast={isLast} /></div>
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
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 6, opacity }}>
      <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.02em', color }}>{label}</span>
      <span style={{ fontSize: 10, fontWeight: 500, color: 'var(--cm-text-4, #cbd5e1)' }}>({count})</span>
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }} data-testid="priority-board">
      <PipelineRowStyles />

      {allOnTrack && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', borderRadius: 8, background: 'rgba(16,185,129,0.03)', border: '1px solid rgba(16,185,129,0.08)' }} data-testid="all-on-track-banner">
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981', flexShrink: 0 }} />
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--cm-text-2, #475569)' }}>Everything is on track</span>
          <span style={{ fontSize: 11, color: 'var(--cm-text-3, #94a3b8)' }}>&mdash; no programs need immediate attention</span>
        </div>
      )}

      <div data-testid="priority-section-attention">
        <SectionHeader label="Next actions" count={high.length} color="#475569" opacity={1} />
        {high.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {high.map((item, i) => <SwipePriorityCard key={item.programId} item={item} navigate={navigate} section="attention" isLast={i === high.length - 1} />)}
          </div>
        ) : (
          <div style={{ padding: '14px 4px', fontSize: 12, color: 'var(--cm-text-3, #94a3b8)', fontWeight: 500 }} data-testid="empty-state-attention">Nothing urgent right now</div>
        )}
      </div>

      <div data-testid="priority-section-coming-up" style={{ background: 'rgba(241,245,249,0.35)', borderRadius: 8, padding: '10px 8px 6px', margin: '0 -8px' }}>
        <div style={{ paddingLeft: 4 }}>
          <SectionHeader label="Coming up" count={medium.length} color="#64748b" opacity={0.9} />
        </div>
        {medium.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {medium.map((item, i) => <SwipePriorityCard key={item.programId} item={item} navigate={navigate} section="coming-up" isLast={i === medium.length - 1} />)}
          </div>
        ) : (
          <div style={{ padding: '14px 4px', fontSize: 12, color: 'var(--cm-text-3, #94a3b8)', fontWeight: 500 }} data-testid="empty-state-coming-up">No upcoming actions</div>
        )}
      </div>

      <div data-testid="priority-section-on-track">
        <div onClick={() => setOnTrackCollapsed(c => !c)} style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: onTrackCollapsed ? 0 : 6, cursor: 'pointer', opacity: 0.7 }} data-testid="on-track-header">
          <ChevronRight style={{ width: 12, height: 12, color: '#10b981', transition: 'transform 0.2s', transform: onTrackCollapsed ? 'none' : 'rotate(90deg)', flexShrink: 0 }} />
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.02em', color: '#10b981' }}>On track</span>
          <span style={{ fontSize: 10, fontWeight: 500, color: 'var(--cm-text-4, #cbd5e1)' }}>({low.length})</span>
        </div>
        {!onTrackCollapsed && (
          low.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {low.map((item, i) => <SwipePriorityCard key={item.programId} item={item} navigate={navigate} section="on-track" isLast={i === low.length - 1} />)}
            </div>
          ) : (
            <div style={{ padding: '14px 4px', fontSize: 12, color: 'var(--cm-text-3, #94a3b8)', fontWeight: 500 }} data-testid="empty-state-on-track">No programs on track yet</div>
          )
        )}
      </div>
    </div>
  );
}

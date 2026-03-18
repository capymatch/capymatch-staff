/**
 * Pipeline Design System — shared visual primitives.
 * Single source of truth for logo, status, owner, and typography tokens.
 * Used by PriorityBoard (list) and KanbanBoard (kanban).
 */
import React from "react";
import UniversityLogo from "../UniversityLogo";

/* ── Tokens ── */
export const STATUS = {
  high:   { dot: '#ef4444', color: '#dc2626', label: 'Needs attention' },
  medium: { dot: '#f59e0b', color: '#b45309', label: 'Needs action' },
  low:    { dot: '#10b981', color: '#047857', label: 'On track' },
};

/* ── Helpers ── */
export function shortenName(name) {
  if (!name) return '';
  return name
    .replace(/^University of\s+/i, '')
    .replace(/^The\s+/i, '')
    .replace(/\s+University$/i, '')
    .replace(/\s+College$/i, '')
    .replace(/\s+Institute\s+of\s+Technology$/i, ' Tech');
}

export function getTimingColor(timingLabel) {
  if (!timingLabel) return null;
  if (timingLabel.toLowerCase().includes('overdue')) return '#dc2626';
  return '#64748b';
}

/* ── 24px Logo Container ── */
export function LogoBox({ domain, name, muted }) {
  return (
    <div style={{
      width: 24, height: 24, borderRadius: 5, flexShrink: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--cm-surface-2, #f1f5f9)',
      opacity: muted ? 0.5 : 1,
    }} data-testid={`logo-box-${domain || 'unknown'}`}>
      <UniversityLogo domain={domain} name={name} size={18} className="rounded-sm" />
    </div>
  );
}

/* ── Status Indicator: dot + label ── */
export function StatusIndicator({ level }) {
  const s = STATUS[level] || STATUS.low;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: s.dot, flexShrink: 0 }} />
      <span style={{ fontSize: 10, fontWeight: 600, color: s.color }}>{s.label}</span>
    </div>
  );
}

/* ── Owner Tag ── */
export function OwnerTag({ owner }) {
  const label = owner === 'coach' ? 'Coach' : owner === 'director' ? 'Director' : 'You';
  const isYou = label === 'You';
  return (
    <span style={{
      fontSize: 8, fontWeight: 700, padding: '0px 4px', borderRadius: 3, lineHeight: '14px',
      background: isYou ? 'rgba(13,148,136,0.05)' : 'rgba(99,102,241,0.05)',
      color: isYou ? 'rgba(13,148,136,0.6)' : 'rgba(99,102,241,0.6)',
    }}>{label}</span>
  );
}

/* ── Shared hover styles ── */
export function PipelineRowStyles() {
  return (
    <style>{`
      .pb-row {
        transition: background 100ms ease-out;
        border-radius: 6px;
        margin: 0 -8px;
        padding-left: 12px !important;
        padding-right: 12px !important;
      }
      .pb-row:hover { background: rgba(241,245,249,0.55); }
      .pb-row .pb-cta { transition: opacity 100ms ease-out; }
      .pb-row:hover .pb-cta { opacity: 1 !important; }
    `}</style>
  );
}

/* ── Design constants ── */
export const ROW_PADDING = '8px 4px';
export const ROW_GAP = 10;
export const DIVIDER = '1px solid rgba(226,232,240,0.6)';
export const FONT = {
  actionHigh: { fontSize: 13, fontWeight: 700, color: 'var(--cm-text, #0f172a)' },
  actionMed:  { fontSize: 13, fontWeight: 600, color: 'var(--cm-text, #0f172a)' },
  actionLow:  { fontSize: 13, fontWeight: 500, color: 'var(--cm-text-2, #475569)' },
  schoolSuffix: { fontWeight: 500, color: 'var(--cm-text-3, #94a3b8)', marginLeft: 5 },
  schoolSuffixLow: { fontWeight: 400, color: 'var(--cm-text-4, #cbd5e1)', marginLeft: 5 },
  stage: { fontSize: 10, fontWeight: 500, color: 'var(--cm-text-3, #94a3b8)' },
};

import React, { useState, useEffect } from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import {
  KANBAN_COLS, programToKanbanCol, getColInsight, getEmptyColCopy,
} from "./pipeline-constants";
import { LogoBox, StatusIndicator, PipelineRowStyles, FONT } from "./pipeline-design";

function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(window.innerWidth < breakpoint);
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < breakpoint);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, [breakpoint]);
  return isMobile;
}

/* ── Context: state-only ── */
function getCardContext(reasonShort) {
  if (!reasonShort) return null;
  const lower = reasonShort.toLowerCase();
  if (lower.includes('overdue') || lower.includes('due ') || lower.includes('days since')) return null;
  if (lower === 'on track') return null;
  return reasonShort;
}

/* ── Time: normalized format + urgency level ── */
function getCardTime(timingLabel) {
  if (!timingLabel) return null;
  const lower = timingLabel.toLowerCase();
  const m = lower.match(/overdue (\d+)d/);
  if (m) return { text: `${m[1]}d overdue`, urgency: 'high' };
  if (lower === 'due today') return { text: 'Due today', urgency: 'medium' };
  if (lower === 'tomorrow') return { text: 'Due tomorrow', urgency: 'low' };
  const inM = lower.match(/in (\d+) days/);
  if (inM) return { text: `In ${inM[1]}d`, urgency: 'none' };
  const nrM = lower.match(/no response in (\d+)/);
  if (nrM) return { text: `${nrM[1]}d no reply`, urgency: 'none' };
  if (lower === 'no contact yet') return { text: 'No outreach', urgency: 'none' };
  return null;
}

const TIME_STYLE = {
  high:   { color: '#dc2626', fontWeight: 600 },
  medium: { color: '#d97706', fontWeight: 600 },
  low:    { color: '#94a3b8', fontWeight: 500 },
  none:   { color: 'rgba(148,163,184,0.5)', fontWeight: 500 },
};

/* ── Last activity helper ── */
function getLastActivity(program) {
  const d = program.signals?.days_since_activity;
  if (d === null || d === undefined) return 'No activity';
  if (d === 0) return 'Active today';
  return `${d}d ago`;
}

/* ── Priority badge color ── */
const PRIORITY_COLORS = {
  'Top Choice': '#94a3b8',
  'High': '#94a3b8',
  'Medium': '#cbd5e1',
  'Low': '#cbd5e1',
};

/* ── Card: 3-section layout ── */
function KanbanCard({ program: p, navigate, index, attention: attn, justDroppedId, activeDragId }) {
  const level = attn?.attentionLevel || 'low';
  const context = getCardContext(attn?.reasonShort);
  const time = getCardTime(attn?.timingLabel);
  const lastActivity = getLastActivity(p);
  const nextStep = attn?.ctaLabel || null;
  const priority = p.priority;
  const priorityColor = PRIORITY_COLORS[priority] || '#cbd5e1';
  const isJustDropped = justDroppedId === p.program_id;
  const isFaded = activeDragId && activeDragId !== p.program_id;

  return (
    <Draggable draggableId={p.program_id} index={index}>
      {(provided, snapshot) => {
        const isLifted = snapshot.isDragging && !snapshot.isDropAnimating;
        const isDropping = snapshot.isDropAnimating;
        const libStyle = provided.draggableProps.style || {};
        const baseTransform = libStyle.transform || '';
        const composedTransform = isLifted
          ? `${baseTransform} scale(1.02)`.trim()
          : isDropping
            ? `${baseTransform} scale(0.98)`.trim()
            : baseTransform || undefined;

        return (
          <div
            ref={provided.innerRef}
            {...provided.draggableProps}
            {...provided.dragHandleProps}
            onClick={() => !snapshot.isDragging && navigate(`/pipeline/${p.program_id}`)}
            className="kb-card"
            style={{
              ...libStyle,
              transform: composedTransform,
              transition: isLifted
                ? 'transform 80ms ease-out, box-shadow 100ms ease-out'
                : isDropping
                  ? 'transform 160ms cubic-bezier(0.22,1,0.36,1), box-shadow 160ms ease-out'
                  : undefined,
              padding: 14,
              cursor: isLifted ? 'grabbing' : 'grab',
              background: isLifted ? '#fff' : undefined,
              boxShadow: isLifted
                ? '0 12px 32px rgba(0,0,0,0.14), 0 4px 12px rgba(0,0,0,0.06)'
                : undefined,
              borderColor: isLifted ? 'rgba(226,232,240,0.9)' : undefined,
              opacity: isFaded ? 0.4 : 1,
              zIndex: isLifted ? 9999 : undefined,
              pointerEvents: isFaded ? 'none' : undefined,
            }}
            data-testid={`kanban-card-${p.program_id}`}
          >
            {/* ── HEADER: Logo + Name + Priority ── */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <LogoBox domain={p.domain} name={p.university_name} muted={level === 'low'} />
              <div style={{
                fontSize: 12.5, fontWeight: 600, color: 'var(--cm-text, #0f172a)',
                lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                flex: 1, minWidth: 0,
              }} data-testid={`card-name-${p.program_id}`}>
                {p.university_name}
              </div>
              {priority && (
                <span style={{
                  fontSize: 8, fontWeight: 700, color: priorityColor,
                  flexShrink: 0, letterSpacing: '0.02em',
                }} data-testid={`card-priority-${p.program_id}`}>
                  {priority === 'Top Choice' ? 'TOP' : priority.toUpperCase()}
                </span>
              )}
            </div>

            {/* ── STATUS: single line ── */}
            <div style={{ paddingLeft: 32, marginTop: 5, overflow: 'hidden', whiteSpace: 'nowrap' }} data-testid={`card-status-${p.program_id}`}>
              <StatusIndicator level={level} />
            </div>

            {/* ── CONTEXT: single line, max 1 ── */}
            {context && (
              <div style={{
                paddingLeft: 32, marginTop: 2,
                fontSize: 9.5, fontWeight: 500, color: 'var(--cm-text-4, #cbd5e1)',
                lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }} data-testid={`card-context-${p.program_id}`}>
                {context}
              </div>
            )}

            {/* ── BOTTOM: Next left + Time right ── */}
            <div style={{
              marginTop: 8, paddingTop: 6, paddingLeft: 32,
              borderTop: '1px solid rgba(226,232,240,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }} data-testid={`card-action-section-${p.program_id}`}>
              {nextStep && level !== 'low' ? (
                <span style={{
                  fontSize: 10, fontWeight: 600, color: 'var(--cm-text-2, #475569)',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  flex: 1, minWidth: 0,
                }} data-testid={`card-next-${p.program_id}`}>
                  {nextStep}
                </span>
              ) : (
                <span />
              )}
              {time && (() => {
                const ts = TIME_STYLE[time.urgency] || TIME_STYLE.none;
                return (
                  <span style={{
                    fontSize: 9, fontWeight: ts.fontWeight, color: ts.color,
                    display: 'flex', alignItems: 'center', gap: 3,
                    flexShrink: 0, whiteSpace: 'nowrap', marginLeft: 8,
                  }} data-testid={`card-time-${p.program_id}`}>
                    {time.urgency !== 'none' && (
                      <span style={{ width: 4, height: 4, borderRadius: '50%', background: ts.color, opacity: 0.7 }} />
                    )}
                    {time.text}
                  </span>
                );
              })()}
            </div>
          </div>
        );
      }}
    </Draggable>
  );
}

export default function KanbanBoard({ programs, navigate, onDragEnd, onDragUpdate, onDragStart, attentionMap, justDroppedId, dragDest, pulsingColumnId, activeDragId }) {
  const isMobile = useIsMobile();
  const columns = {};
  KANBAN_COLS.forEach(c => { columns[c.key] = []; });
  for (const p of programs) {
    if (p.board_group === "archived") continue;
    const col = programToKanbanCol(p);
    if (col && columns[col]) columns[col].push(p);
  }

  for (const key of Object.keys(columns)) {
    columns[key].sort((a, b) => {
      const aScore = attentionMap[a.program_id]?.attentionScore ?? 0;
      const bScore = attentionMap[b.program_id]?.attentionScore ?? 0;
      return bScore - aScore;
    });
  }

  const COL_GAP = 16;
  const gridStyle = isMobile
    ? { display: "flex", gap: COL_GAP, overflowX: "auto", WebkitOverflowScrolling: "touch", scrollSnapType: "x mandatory", paddingBottom: 8 }
    : { display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: COL_GAP };

  const colStyle = isMobile ? { minWidth: 240, flexShrink: 0, scrollSnapAlign: "start" } : {};

  const activeSourceCol = activeDragId
    ? Object.entries(columns).find(([, list]) => list.some(p => p.program_id === activeDragId))?.[0] || null
    : null;

  return (
    <DragDropContext onDragEnd={onDragEnd} onDragUpdate={onDragUpdate} onDragStart={onDragStart}>
      <style>{`
        .kb-card {
          transition: box-shadow 120ms ease-out, transform 80ms ease-out;
          background: #fff;
          border: 1px solid rgba(226,232,240,0.7);
          border-radius: 10px;
          box-shadow: 0 1px 2px rgba(0,0,0,0.05);
          cursor: grab;
        }
        .kb-card:hover {
          box-shadow: 0 3px 8px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04);
          border-color: rgba(226,232,240,0.9);
        }
      `}</style>
      <div style={gridStyle} className="kanban-grid" data-testid="kanban-board">
        {KANBAN_COLS.map(col => {
          const cards = columns[col.key];
          const count = cards.length;
          const insight = getColInsight(col.key, count);
          const insertAt = dragDest && dragDest.droppableId === col.key && dragDest.sourceId !== col.key ? dragDest.index : null;
          const isTarget = activeDragId && activeSourceCol !== col.key;

          return (
            <Droppable droppableId={col.key} key={col.key}>
              {(provided, snapshot) => {
                const isHovering = snapshot.isDraggingOver && !snapshot.draggingFromThisWith;

                return (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className={pulsingColumnId === col.key ? 'kanban-col-pulse' : ''}
                  style={{
                    background: isHovering ? 'rgba(241,245,249,0.55)' : 'transparent',
                    borderRadius: 8, minHeight: 200,
                    transition: 'background 150ms ease-out, border-color 150ms ease-out',
                    border: `1px ${isTarget && !isHovering ? 'dashed' : 'solid'} ${isHovering ? 'rgba(226,232,240,0.8)' : isTarget ? 'rgba(226,232,240,0.4)' : 'transparent'}`,
                    ...colStyle,
                  }}
                  data-testid={`kanban-col-${col.key}`}
                >
                  {/* Accent line */}
                  <div style={{
                    height: 2, borderRadius: '8px 8px 0 0',
                    background: col.color,
                    opacity: isHovering ? 0.8 : 0.25,
                    transition: 'opacity 150ms ease-out',
                  }} />

                  {/* Column header */}
                  <div style={{ padding: '10px 10px 8px' }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 5 }}>
                      <span style={{
                        fontSize: 11, fontWeight: 800, letterSpacing: '0.04em', textTransform: 'uppercase',
                        color: isHovering ? 'var(--cm-text, #0f172a)' : 'var(--cm-text-2, #475569)',
                        transition: 'color 120ms ease-out',
                      }}>{col.label}</span>
                      <span style={{ fontSize: 10, fontWeight: 500, color: 'var(--cm-text-4, #cbd5e1)' }}>{count}</span>
                    </div>
                    {insight && !activeDragId && (
                      <div style={{ fontSize: 10, fontWeight: 500, color: 'var(--cm-text-4, #cbd5e1)', marginTop: 2 }}>{insight}</div>
                    )}
                  </div>

                  {/* Cards */}
                  <div style={{ padding: '0 6px 10px', display: 'flex', flexDirection: 'column', gap: 8, minHeight: 60 }}>
                    {count > 0 ? (
                      cards.map((p, idx) => (
                        <div key={p.program_id} style={{ position: 'relative' }}>
                          {insertAt === idx && (
                            <div className="kanban-insert-line" data-testid="insertion-line" style={{ position: 'absolute', top: -5, left: 4, right: 4, height: 2, background: col.color, borderRadius: 1, zIndex: 10 }} />
                          )}
                          <KanbanCard
                            program={p}
                            navigate={navigate}
                            index={idx}
                            attention={attentionMap[p.program_id]}
                            justDroppedId={justDroppedId}
                            activeDragId={activeDragId}
                          />
                        </div>
                      ))
                    ) : (
                      <div style={{ padding: '24px 10px', textAlign: 'center' }}>
                        <div style={{ fontSize: 11, color: 'var(--cm-text-4, #cbd5e1)', fontWeight: 500 }} data-testid={`empty-col-${col.key}`}>
                          {isTarget ? 'Drop here' : getEmptyColCopy(col.key)}
                        </div>
                      </div>
                    )}
                    {insertAt !== null && insertAt >= count && <div className="kanban-insert-line" data-testid="insertion-line" style={{ height: 2, margin: '2px 4px 0', background: col.color, borderRadius: 1, position: 'relative', zIndex: 10 }} />}
                    {provided.placeholder}
                  </div>
                </div>
              )}}
            </Droppable>
          );
        })}
      </div>
    </DragDropContext>
  );
}

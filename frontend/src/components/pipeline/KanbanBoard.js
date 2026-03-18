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

/* ── Context filter: state-only, no timing, no duplicates of status ── */
function getCardContext(reasonShort) {
  if (!reasonShort) return null;
  const lower = reasonShort.toLowerCase();
  if (lower.includes('overdue') || lower.includes('due ') || lower.includes('days since') || lower.includes('no response')) return null;
  if (lower === 'on track' || lower === 'no recent engagement') return null;
  return reasonShort;
}

/* ── Card: strict 3-line layout ── */
const CARD_PAD = 8;

function KanbanCard({ program: p, navigate, index, attention: attn, justDroppedId, activeDragId }) {
  const level = attn?.attentionLevel || 'low';
  const context = getCardContext(attn?.reasonShort);
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
              padding: CARD_PAD,
              cursor: isLifted ? 'grabbing' : 'grab',
              background: isLifted ? '#fff' : 'transparent',
              boxShadow: isLifted
                ? '0 12px 32px rgba(0,0,0,0.12), 0 4px 12px rgba(0,0,0,0.06)'
                : 'none',
              opacity: isFaded ? 0.4 : 1,
              zIndex: isLifted ? 9999 : undefined,
              pointerEvents: isFaded ? 'none' : undefined,
              borderRadius: 6,
            }}
            data-testid={`kanban-card-${p.program_id}`}
          >
            {/* Line 1: Logo + School name */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <LogoBox domain={p.domain} name={p.university_name} muted={level === 'low'} />
              <div style={{
                fontSize: 12.5, fontWeight: 600, color: 'var(--cm-text, #0f172a)',
                lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                flex: 1, minWidth: 0,
              }} data-testid={`card-name-${p.program_id}`}>
                {p.university_name}
              </div>
            </div>

            {/* Line 2: Status — one signal only */}
            <div style={{ paddingLeft: 32, marginTop: 3 }} data-testid={`card-status-${p.program_id}`}>
              <StatusIndicator level={level} />
            </div>

            {/* Line 3: Context (optional, smaller, muted) */}
            {context && (
              <div style={{
                paddingLeft: 32, marginTop: 1,
                fontSize: 9.5, fontWeight: 500, color: 'var(--cm-text-4, #cbd5e1)',
                lineHeight: 1.3,
              }} data-testid={`card-context-${p.program_id}`}>
                {context}
              </div>
            )}
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
        .kb-card { transition: background 100ms ease-out, box-shadow 100ms ease-out; }
        .kb-card:hover { background: rgba(241,245,249,0.5) !important; }
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
                  <div style={{ padding: '0 6px 10px', display: 'flex', flexDirection: 'column', gap: 2, minHeight: 60 }}>
                    {count > 0 ? (
                      cards.map((p, idx) => (
                        <div key={p.program_id} style={{ position: 'relative' }}>
                          {insertAt === idx && (
                            <div className="kanban-insert-line" data-testid="insertion-line" style={{ position: 'absolute', top: -2, left: 4, right: 4, height: 2, background: col.color, borderRadius: 1, zIndex: 10 }} />
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

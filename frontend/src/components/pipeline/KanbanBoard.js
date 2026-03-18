import React, { useState, useEffect } from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import {
  KANBAN_COLS, ATTENTION_META, ATTENTION_LABEL,
  programToKanbanCol, getColInsight, getEmptyColCopy,
} from "./pipeline-constants";

function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(window.innerWidth < breakpoint);
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < breakpoint);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, [breakpoint]);
  return isMobile;
}

function KanbanCard({ program: p, navigate, index, attention: attn, justDroppedId, activeDragId }) {
  const level = attn?.attentionLevel || 'low';
  const meta = ATTENTION_META[level];
  const ctaLabel = attn?.ctaLabel;
  const isJustDropped = justDroppedId === p.program_id;
  const isFaded = activeDragId && activeDragId !== p.program_id;
  const stageKey = programToKanbanCol(p);
  const stageLabel = KANBAN_COLS.find(c => c.key === stageKey)?.label || '';

  return (
    <Draggable draggableId={p.program_id} index={index}>
      {(provided, snapshot) => {
        const isLifted = snapshot.isDragging && !snapshot.isDropAnimating;
        const isDropping = snapshot.isDropAnimating;
        const libStyle = provided.draggableProps.style || {};
        const baseTransform = libStyle.transform || '';
        const composedTransform = isLifted
          ? `${baseTransform} scale(1.03)`.trim()
          : isDropping
            ? `${baseTransform} scale(0.98)`.trim()
            : baseTransform || undefined;

        return (
          <div
            ref={provided.innerRef}
            {...provided.draggableProps}
            {...provided.dragHandleProps}
            onClick={() => !snapshot.isDragging && navigate(`/pipeline/${p.program_id}`)}
            className={`kanban-card${isJustDropped ? ' kanban-card-settled' : ''}`}
            style={{
              ...libStyle,
              transform: composedTransform,
              transition: isLifted
                ? 'transform 80ms ease-out, box-shadow 100ms ease-out'
                : isDropping
                  ? 'transform 160ms cubic-bezier(0.22,1,0.36,1), box-shadow 160ms ease-out'
                  : undefined,
              background: 'var(--cm-surface, #fff)',
              borderRadius: 8,
              padding: '10px 12px',
              cursor: isLifted ? 'grabbing' : 'grab',
              border: `1px solid ${isLifted ? 'rgba(0,0,0,0.08)' : 'var(--cm-border, #e8ecf1)'}`,
              boxShadow: isLifted
                ? '0 12px 32px rgba(0,0,0,0.12), 0 4px 12px rgba(0,0,0,0.08)'
                : isJustDropped ? undefined
                : '0 1px 2px rgba(0,0,0,0.04)',
              opacity: isFaded ? 0.6 : 1,
              zIndex: isLifted ? 9999 : undefined,
              pointerEvents: isFaded ? 'none' : undefined,
            }}
            data-testid={`kanban-card-${p.program_id}`}
          >
            {isLifted ? (
              <>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--cm-text)' }}>{p.university_name}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 4 }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: meta.dot, flexShrink: 0 }} />
                  <span style={{ fontSize: 10.5, fontWeight: 600, color: meta.color }}>{meta.label}</span>
                </div>
              </>
            ) : (
              <>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--cm-text)', lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} data-testid={`card-name-${p.program_id}`}>{p.university_name}</div>
                <div style={{ fontSize: 10.5, color: 'var(--cm-text-3, #94a3b8)', marginTop: 3, fontWeight: 500 }} data-testid={`card-stage-${p.program_id}`}>{stageLabel} stage</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
                  <span style={{ width: 5, height: 5, borderRadius: '50%', background: meta.dot }} />
                  <span style={{ fontSize: 10, fontWeight: 600, color: meta.color }} data-testid={`card-attention-${p.program_id}`}>{level === 'high' ? 'High attention' : level === 'medium' ? 'Needs action' : 'On track'}</span>
                </div>
                {ctaLabel && level !== 'low' && (
                  <div style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--cm-text-2, #475569)', marginTop: 4 }} data-testid={`card-action-${p.program_id}`}>→ {ctaLabel}</div>
                )}
              </>
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

  const gridStyle = isMobile
    ? { display: "flex", gap: 12, overflowX: "auto", WebkitOverflowScrolling: "touch", scrollSnapType: "x mandatory", paddingBottom: 8 }
    : { display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 16 };

  const colStyle = isMobile ? { minWidth: 240, flexShrink: 0, scrollSnapAlign: "start" } : {};

  const activeSourceCol = activeDragId
    ? Object.entries(columns).find(([, list]) => list.some(p => p.program_id === activeDragId))?.[0] || null
    : null;

  return (
    <DragDropContext onDragEnd={onDragEnd} onDragUpdate={onDragUpdate} onDragStart={onDragStart}>
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
                let prevAttention = null;

                return (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className={pulsingColumnId === col.key ? 'kanban-col-pulse' : ''}
                  style={{
                    background: isHovering ? 'rgba(0,0,0,0.012)' : 'transparent',
                    borderRadius: 10, minHeight: 200,
                    transition: 'background 120ms ease-out, border-color 120ms ease-out',
                    border: `1px ${isTarget && !isHovering ? 'dashed' : 'solid'} ${isHovering ? 'rgba(0,0,0,0.1)' : isTarget ? 'rgba(0,0,0,0.06)' : 'transparent'}`,
                    ...colStyle,
                  }}
                >
                  <div style={{ height: 2, background: col.color, opacity: isHovering ? 0.85 : 0.4, borderRadius: "10px 10px 0 0", transition: "opacity 120ms ease-out" }} />

                  <div style={{ padding: "14px 10px 10px" }}>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 5 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", color: isHovering ? "var(--cm-text)" : "var(--cm-text-2, #475569)", transition: "color 120ms ease-out" }}>{col.label}</span>
                      <span style={{ fontSize: 11, fontWeight: 600, color: "var(--cm-text-3, #94a3b8)" }}>{count}</span>
                    </div>
                    {insight && !activeDragId && (
                      <div style={{ fontSize: 10.5, color: "var(--cm-text-3, #94a3b8)", marginTop: 3, fontWeight: 500 }}>{insight}</div>
                    )}
                  </div>

                  <div style={{ padding: "0 6px 12px", display: "flex", flexDirection: "column", gap: 6, minHeight: 60 }}>
                    {count > 0 ? (
                      cards.map((p, idx) => {
                        const level = attentionMap[p.program_id]?.attentionLevel || 'low';
                        const showHeader = level !== prevAttention;
                        prevAttention = level;

                        return (
                          <div key={p.program_id} style={{ position: 'relative' }}>
                            {showHeader && (
                              <div style={{ fontSize: 9.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: ATTENTION_META[level].color, padding: idx === 0 ? '0 2px 5px' : '8px 2px 5px', opacity: activeDragId ? 0 : 0.65, transition: 'opacity 100ms ease-out' }} data-testid={`group-header-${col.key}-${level}`}>
                                {ATTENTION_LABEL[level]}
                              </div>
                            )}
                            {insertAt === idx && (
                              <div className="kanban-insert-line" data-testid="insertion-line" style={{ position: 'absolute', top: showHeader ? (idx === 0 ? 14 : 22) : -4, left: 4, right: 4, height: 2, background: col.color, color: col.color, borderRadius: 1, zIndex: 10 }} />
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
                        );
                      })
                    ) : (
                      <div style={{ padding: "24px 12px", textAlign: "center" }}>
                        <div style={{ fontSize: 11, color: "var(--cm-text-4)", fontWeight: 500 }}>
                          {isTarget ? 'Drop here' : getEmptyColCopy(col.key)}
                        </div>
                      </div>
                    )}
                    {insertAt !== null && insertAt >= count && <div className="kanban-insert-line" data-testid="insertion-line" style={{ height: 2, margin: '4px 4px 0', background: col.color, color: col.color, borderRadius: 1, position: 'relative', zIndex: 10 }} />}
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

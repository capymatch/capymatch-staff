import React, { useState, useEffect } from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import {
  KANBAN_COLS, programToKanbanCol, getColInsight, getEmptyColCopy,
} from "./pipeline-constants";
import {
  LogoBox, StatusIndicator, OwnerTag, PipelineRowStyles,
  shortenName, getTimingColor, STATUS,
  ROW_GAP, DIVIDER, FONT,
} from "./pipeline-design";

function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(window.innerWidth < breakpoint);
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < breakpoint);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, [breakpoint]);
  return isMobile;
}

/* ── Kanban card — uses SAME design system as list rows ── */
function KanbanCard({ program: p, navigate, index, attention: attn, justDroppedId, activeDragId }) {
  const level = attn?.attentionLevel || 'low';
  const ctaLabel = attn?.ctaLabel;
  const owner = attn?.owner;
  const timingLabel = attn?.timingLabel;
  const timingColor = getTimingColor(timingLabel);
  const isJustDropped = justDroppedId === p.program_id;
  const isFaded = activeDragId && activeDragId !== p.program_id;
  const short = shortenName(p.university_name);

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
            className="pb-row"
            style={{
              ...libStyle,
              transform: composedTransform,
              transition: isLifted
                ? 'transform 80ms ease-out, box-shadow 100ms ease-out'
                : isDropping
                  ? 'transform 160ms cubic-bezier(0.22,1,0.36,1), box-shadow 160ms ease-out'
                  : undefined,
              display: 'flex', alignItems: 'flex-start', gap: ROW_GAP,
              padding: '8px 4px',
              cursor: isLifted ? 'grabbing' : 'grab',
              borderBottom: DIVIDER,
              background: isLifted ? 'rgba(255,255,255,0.97)' : 'transparent',
              boxShadow: isLifted
                ? '0 12px 32px rgba(0,0,0,0.12), 0 4px 12px rgba(0,0,0,0.06)'
                : isJustDropped ? undefined : 'none',
              opacity: isFaded ? 0.45 : 1,
              zIndex: isLifted ? 9999 : undefined,
              pointerEvents: isFaded ? 'none' : undefined,
              borderRadius: isLifted ? 8 : undefined,
              margin: isLifted ? 0 : undefined,
              paddingLeft: isLifted ? '12px' : undefined,
              paddingRight: isLifted ? '12px' : undefined,
            }}
            data-testid={`kanban-card-${p.program_id}`}
          >
            <div style={{ paddingTop: 1 }}>
              <LogoBox domain={p.domain} name={p.university_name} muted={level === 'low'} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              {/* Line 1: School name (primary) */}
              <div style={{
                ...(level === 'high' ? FONT.actionHigh : level === 'medium' ? FONT.actionMed : FONT.actionLow),
                lineHeight: 1.35, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }} data-testid={`card-name-${p.program_id}`}>
                {p.university_name}
              </div>

              {/* Line 2: Status + timing + owner */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 1, flexWrap: 'wrap' }}>
                <StatusIndicator level={level} />
                {timingLabel && (
                  <span style={{ fontSize: 10, fontWeight: 600, color: timingColor }}>{timingLabel}</span>
                )}
                {owner && <OwnerTag owner={owner} />}
              </div>
            </div>

            {/* CTA — same hierarchy as list */}
            {!isLifted && ctaLabel && level !== 'low' && (
              <span className="pb-cta" style={{
                fontSize: level === 'high' ? 11 : 10.5,
                fontWeight: level === 'high' ? 700 : 600,
                color: level === 'high' ? '#dc2626' : 'var(--cm-text-3, #94a3b8)',
                opacity: level === 'high' ? 0.85 : 0.65,
                flexShrink: 0, whiteSpace: 'nowrap', paddingTop: 1,
              }} data-testid={`card-action-${p.program_id}`}>
                {ctaLabel} →
              </span>
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
    : { display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 14 };

  const colStyle = isMobile ? { minWidth: 240, flexShrink: 0, scrollSnapAlign: "start" } : {};

  const activeSourceCol = activeDragId
    ? Object.entries(columns).find(([, list]) => list.some(p => p.program_id === activeDragId))?.[0] || null
    : null;

  return (
    <DragDropContext onDragEnd={onDragEnd} onDragUpdate={onDragUpdate} onDragStart={onDragStart}>
      <PipelineRowStyles />
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
                    opacity: isHovering ? 0.8 : 0.3,
                    transition: 'opacity 150ms ease-out',
                  }} />

                  {/* Column header — same typography scale as list section headers */}
                  <div style={{ padding: '10px 10px 6px' }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                      <span style={{
                        fontSize: 11, fontWeight: 700, letterSpacing: '0.02em',
                        color: isHovering ? 'var(--cm-text, #0f172a)' : 'var(--cm-text-2, #475569)',
                        transition: 'color 120ms ease-out',
                      }}>{col.label}</span>
                      <span style={{ fontSize: 10, fontWeight: 500, color: 'var(--cm-text-4, #cbd5e1)' }}>({count})</span>
                    </div>
                    {insight && !activeDragId && (
                      <div style={{ ...FONT.stage, marginTop: 1 }}>{insight}</div>
                    )}
                  </div>

                  {/* Cards list */}
                  <div style={{ padding: '0 4px 8px', display: 'flex', flexDirection: 'column', minHeight: 60 }}>
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
                      <div style={{ padding: '20px 10px', textAlign: 'center' }}>
                        <div style={{ fontSize: 10.5, color: 'var(--cm-text-4, #cbd5e1)', fontWeight: 500 }}>
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

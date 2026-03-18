import React, { useState, useEffect } from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import {
  KANBAN_COLS, ATTENTION_META,
  programToKanbanCol, getColInsight, getEmptyColCopy,
} from "./pipeline-constants";
import UniversityLogo from "../UniversityLogo";

function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(window.innerWidth < breakpoint);
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < breakpoint);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, [breakpoint]);
  return isMobile;
}

/* ── Kanban-specific styles ── */
function KanbanStyles() {
  return (
    <style>{`
      .kb-card {
        transition: box-shadow 120ms ease-out, transform 80ms ease-out, background 100ms ease-out;
      }
      .kb-card:hover {
        box-shadow: 0 3px 10px rgba(0,0,0,0.07), 0 1px 3px rgba(0,0,0,0.04) !important;
        background: var(--cm-surface, #fff) !important;
      }
      .kb-card:hover .kb-ghost-cta {
        opacity: 1 !important;
      }
    `}</style>
  );
}

/* ── Logo container (matches list view) ── */
function LogoBox({ domain, name }) {
  return (
    <div style={{
      width: 24, height: 24, borderRadius: 5, flexShrink: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--cm-surface-2, #f1f5f9)',
    }}>
      <UniversityLogo domain={domain} name={name} size={18} className="rounded-sm" />
    </div>
  );
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
            className={`kb-card${isJustDropped ? ' kanban-card-settled' : ''}`}
            style={{
              ...libStyle,
              transform: composedTransform,
              transition: isLifted
                ? 'transform 80ms ease-out, box-shadow 100ms ease-out'
                : isDropping
                  ? 'transform 160ms cubic-bezier(0.22,1,0.36,1), box-shadow 160ms ease-out'
                  : undefined,
              background: isLifted ? '#fff' : 'var(--cm-surface, #fafbfc)',
              borderRadius: 10,
              padding: '9px 10px',
              cursor: isLifted ? 'grabbing' : 'grab',
              border: `1px solid ${isLifted ? 'rgba(0,0,0,0.06)' : 'rgba(226,232,240,0.7)'}`,
              boxShadow: isLifted
                ? '0 16px 40px rgba(0,0,0,0.14), 0 4px 14px rgba(0,0,0,0.08)'
                : isJustDropped ? undefined
                : '0 1px 3px rgba(0,0,0,0.03)',
              opacity: isFaded ? 0.5 : 1,
              zIndex: isLifted ? 9999 : undefined,
              pointerEvents: isFaded ? 'none' : undefined,
            }}
            data-testid={`kanban-card-${p.program_id}`}
          >
            {/* Row 1: Logo + School name */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <LogoBox domain={p.domain} name={p.university_name} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: 12.5, fontWeight: 700, color: 'var(--cm-text, #0f172a)',
                  lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }} data-testid={`card-name-${p.program_id}`}>
                  {p.university_name}
                </div>
              </div>
            </div>

            {!isLifted && (
              <>
                {/* Row 2: Stage label */}
                <div style={{
                  fontSize: 10, color: 'var(--cm-text-3, #94a3b8)', marginTop: 4,
                  fontWeight: 500, paddingLeft: 32,
                }} data-testid={`card-stage-${p.program_id}`}>
                  {stageLabel} stage
                </div>

                {/* Row 3: Status dot + label */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 5, paddingLeft: 32 }}>
                  <span style={{ width: 5, height: 5, borderRadius: '50%', background: meta.dot, flexShrink: 0 }} />
                  <span style={{ fontSize: 10, fontWeight: 600, color: meta.color }} data-testid={`card-attention-${p.program_id}`}>
                    {meta.label}
                  </span>
                </div>

                {/* Row 4: Ghost CTA (only for high/medium) */}
                {ctaLabel && level !== 'low' && (
                  <div style={{ paddingLeft: 32, marginTop: 6 }}>
                    <span className="kb-ghost-cta" style={{
                      display: 'inline-block', fontSize: 10, fontWeight: 600,
                      color: level === 'high' ? '#dc2626' : '#64748b',
                      padding: '2px 8px', borderRadius: 4,
                      background: level === 'high' ? 'rgba(220,38,38,0.05)' : 'rgba(100,116,139,0.05)',
                      border: `1px solid ${level === 'high' ? 'rgba(220,38,38,0.1)' : 'rgba(100,116,139,0.08)'}`,
                      opacity: 0.7,
                      transition: 'opacity 100ms ease-out',
                    }} data-testid={`card-action-${p.program_id}`}>
                      {ctaLabel}
                    </span>
                  </div>
                )}
              </>
            )}

            {/* Drag preview: simplified */}
            {isLifted && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 4, paddingLeft: 32 }}>
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: meta.dot, flexShrink: 0 }} />
                <span style={{ fontSize: 10, fontWeight: 600, color: meta.color }}>{meta.label}</span>
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

  const gridStyle = isMobile
    ? { display: "flex", gap: 12, overflowX: "auto", WebkitOverflowScrolling: "touch", scrollSnapType: "x mandatory", paddingBottom: 8 }
    : { display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 14 };

  const colStyle = isMobile ? { minWidth: 240, flexShrink: 0, scrollSnapAlign: "start" } : {};

  const activeSourceCol = activeDragId
    ? Object.entries(columns).find(([, list]) => list.some(p => p.program_id === activeDragId))?.[0] || null
    : null;

  return (
    <DragDropContext onDragEnd={onDragEnd} onDragUpdate={onDragUpdate} onDragStart={onDragStart}>
      <KanbanStyles />
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
                    background: isHovering
                      ? `linear-gradient(180deg, ${col.color}08 0%, ${col.color}03 100%)`
                      : 'transparent',
                    borderRadius: 10, minHeight: 200,
                    transition: 'background 150ms ease-out, border-color 150ms ease-out',
                    border: `1px ${isTarget && !isHovering ? 'dashed' : 'solid'} ${isHovering ? `${col.color}30` : isTarget ? 'rgba(0,0,0,0.04)' : 'transparent'}`,
                    ...colStyle,
                  }}
                  data-testid={`kanban-col-${col.key}`}
                >
                  {/* Accent line */}
                  <div style={{
                    height: 2, borderRadius: '10px 10px 0 0',
                    background: col.color,
                    opacity: isHovering ? 1 : 0.35,
                    transition: 'opacity 150ms ease-out',
                  }} />

                  {/* Column header */}
                  <div style={{ padding: '12px 10px 8px' }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 5 }}>
                      <span style={{
                        fontSize: 11, fontWeight: 800, textTransform: 'uppercase',
                        letterSpacing: '0.06em',
                        color: isHovering ? 'var(--cm-text, #0f172a)' : 'var(--cm-text-2, #475569)',
                        transition: 'color 120ms ease-out',
                      }}>{col.label}</span>
                      <span style={{
                        fontSize: 10, fontWeight: 600,
                        color: 'var(--cm-text-4, #cbd5e1)',
                      }}>{count}</span>
                    </div>
                    {insight && !activeDragId && (
                      <div style={{ fontSize: 10, color: 'var(--cm-text-3, #94a3b8)', marginTop: 2, fontWeight: 500 }}>{insight}</div>
                    )}
                  </div>

                  {/* Cards */}
                  <div style={{ padding: '0 5px 10px', display: 'flex', flexDirection: 'column', gap: 5, minHeight: 60 }}>
                    {count > 0 ? (
                      cards.map((p, idx) => {
                        return (
                          <div key={p.program_id} style={{ position: 'relative' }}>
                            {insertAt === idx && (
                              <div className="kanban-insert-line" data-testid="insertion-line" style={{ position: 'absolute', top: -3, left: 4, right: 4, height: 2, background: col.color, borderRadius: 1, zIndex: 10 }} />
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
                      <div style={{ padding: '20px 10px', textAlign: 'center' }}>
                        <div style={{ fontSize: 10.5, color: 'var(--cm-text-4, #cbd5e1)', fontWeight: 500 }}>
                          {isTarget ? 'Drop here' : getEmptyColCopy(col.key)}
                        </div>
                      </div>
                    )}
                    {insertAt !== null && insertAt >= count && <div className="kanban-insert-line" data-testid="insertion-line" style={{ height: 2, margin: '3px 4px 0', background: col.color, borderRadius: 1, position: 'relative', zIndex: 10 }} />}
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

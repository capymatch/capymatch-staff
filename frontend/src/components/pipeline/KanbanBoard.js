import React, { useState, useEffect } from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import {
  KANBAN_COLS, programToKanbanCol, getEmptyColCopy,
} from "./pipeline-constants";
import { STATUS, shortenName } from "./pipeline-design";
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

/* ── Short action label from attention data ── */
function getShortAction(attn) {
  if (!attn) return "No action needed";
  const rs = (attn.reasonShort || "").toLowerCase();
  if (rs.includes("coach assigned")) return "Take action";
  if (rs.includes("flagged by coach")) return "Review flag";
  if (rs.includes("overdue")) return "Follow up";
  if (rs.includes("due today") || rs.includes("due tomorrow") || rs.includes("due in")) return "Follow up";
  if (rs.includes("no response") || rs.includes("no recent")) return "Re-engage";
  if (rs.includes("ready for first contact")) return "Start outreach";
  if (rs === "on track") return "No action needed";
  return attn.ctaLabel || "View details";
}

/* ── Time line from attention data ── */
function getTimeLine(attn) {
  const tl = attn?.timingLabel;
  if (!tl) return null;
  const lower = tl.toLowerCase();
  const m = lower.match(/overdue (\d+)d/);
  if (m) return { text: `${m[1]}d overdue`, color: "#dc2626" };
  if (lower === "due today") return { text: "Due today", color: "#d97706" };
  if (lower === "tomorrow") return { text: "Due tomorrow", color: "#64748b" };
  const inM = lower.match(/in (\d+) days/);
  if (inM) return { text: `In ${inM[1]} days`, color: "#8993a4" };
  const nrM = lower.match(/no response in (\d+)/);
  if (nrM) return { text: `${nrM[1]}d since contact`, color: "#8993a4" };
  if (lower === "no contact yet") return { text: "No outreach yet", color: "#c1c7d0" };
  return null;
}

/* ── Owner helper ── */
const OWNER_STYLE = {
  athlete:  { bg: "#7c3aed", letter: "Y", label: "Owner: You" },
  coach:    { bg: "#2563eb", letter: "C", label: "Coach assigned task" },
  director: { bg: "#4f46e5", letter: "D", label: "Director action" },
};

function OwnerBadge({ owner }) {
  const o = OWNER_STYLE[owner] || OWNER_STYLE.athlete;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 5, fontSize: 10.5, color: "#8993a4", fontWeight: 500 }}>
      <div style={{
        width: 18, height: 18, borderRadius: "50%", background: o.bg,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 8, fontWeight: 700, color: "#fff", flexShrink: 0,
      }}>{o.letter}</div>
      {o.label}
    </div>
  );
}

/* ── Card ── */
function KanbanCard({ program: p, navigate, index, attention: attn, activeDragId }) {
  const level = attn?.attentionLevel || "low";
  const s = STATUS[level] || STATUS.low;
  const time = getTimeLine(attn);
  const action = getShortAction(attn);
  const owner = attn?.owner || "athlete";
  const isFaded = activeDragId && activeDragId !== p.program_id;
  const lastActivity = p.signals?.days_since_activity;

  return (
    <Draggable draggableId={p.program_id} index={index}>
      {(provided, snapshot) => {
        const isLifted = snapshot.isDragging && !snapshot.isDropAnimating;
        const isDropping = snapshot.isDropAnimating;
        const libStyle = provided.draggableProps.style || {};
        const baseTransform = libStyle.transform || "";
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
            className="kb-card-v2"
            style={{
              ...libStyle,
              transform: composedTransform,
              transition: isLifted
                ? "transform 80ms ease-out, box-shadow 100ms ease-out"
                : isDropping
                  ? "transform 160ms cubic-bezier(0.22,1,0.36,1), box-shadow 160ms ease-out"
                  : undefined,
              cursor: isLifted ? "grabbing" : "grab",
              boxShadow: isLifted
                ? "0 18px 50px rgba(0,0,0,0.18), 0 6px 16px rgba(0,0,0,0.10)"
                : undefined,
              borderColor: isLifted ? "#e0e3e8" : undefined,
              opacity: isFaded ? 0.35 : 1,
              zIndex: isLifted ? 9999 : undefined,
              pointerEvents: isFaded ? "none" : undefined,
            }}
            data-testid={`kanban-card-${p.program_id}`}
          >
            {/* 1. School Row */}
            <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
              <div style={{
                width: 24, height: 24, borderRadius: "50%", flexShrink: 0,
                overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center",
                background: "#f1f5f9",
              }}>
                <UniversityLogo domain={p.domain} name={p.university_name} size={24} className="rounded-full" />
              </div>
              <div style={{
                fontSize: 13, fontWeight: 700, color: "#172b4d", lineHeight: 1.2,
                flex: 1, minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
              }} data-testid={`card-name-${p.program_id}`}>
                {shortenName(p.university_name)}
              </div>
            </div>

            {/* 2. Status Line */}
            <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 5, fontSize: 11, fontWeight: 500 }}
              data-testid={`card-status-${p.program_id}`}>
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: s.dot, flexShrink: 0 }} />
              <span style={{ color: s.color }}>{s.label}</span>
            </div>

            {/* 3. Time Line */}
            {time && (
              <div style={{ marginTop: 3, fontSize: 10.5, color: time.color, fontWeight: 500, paddingLeft: 12 }}
                data-testid={`card-time-${p.program_id}`}>
                {time.text}
              </div>
            )}

            {/* 4. Action Line */}
            <div style={{
              marginTop: 5, fontSize: 12, fontWeight: 700,
              color: action === "No action needed" ? "#8993a4" : "#172b4d",
              lineHeight: 1.3,
            }} data-testid={`card-action-${p.program_id}`}>
              {action}
            </div>

            {/* 5. Owner Line */}
            <OwnerBadge owner={owner} />

            {/* Optional: Metrics Row */}
            {lastActivity !== null && lastActivity !== undefined && lastActivity > 0 && (
              <div style={{
                display: "flex", alignItems: "center", gap: 10, marginTop: 5, paddingTop: 5,
                borderTop: "1px solid #f3f4f6", fontSize: 10, color: "#8993a4", fontWeight: 500,
              }}>
                <span style={{ display: "flex", alignItems: "center", gap: 3 }}>
                  <svg width="11" height="11" viewBox="0 0 16 16" fill="#a0aec0"><path d="M8 15A7 7 0 1 0 8 1a7 7 0 0 0 0 14zm.5-11v4.793l2.854 2.853-.708.708L7.5 9.207V4h1z" /></svg>
                  {lastActivity}d ago
                </span>
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

  const activeSourceCol = activeDragId
    ? Object.entries(columns).find(([, list]) => list.some(p => p.program_id === activeDragId))?.[0] || null
    : null;

  const gridStyle = isMobile
    ? { display: "flex", gap: 12, overflowX: "auto", WebkitOverflowScrolling: "touch", scrollSnapType: "x mandatory", paddingBottom: 8 }
    : { display: "flex", gap: 12, alignItems: "flex-start" };

  return (
    <DragDropContext onDragEnd={onDragEnd} onDragUpdate={onDragUpdate} onDragStart={onDragStart}>
      <style>{`
        .kb-card-v2 {
          background: #fff;
          border: 1px solid #e8eaed;
          border-radius: 5px;
          padding: 9px 10px;
          cursor: grab;
          transition: box-shadow 120ms ease, transform 120ms ease;
        }
        .kb-card-v2:hover {
          box-shadow: 0 3px 10px rgba(0,0,0,0.08);
          transform: translateY(-1px);
        }
        .kb-col-v2 {
          flex: 1;
          min-width: 0;
          background: #fff;
          border-radius: 6px;
          box-shadow: 0 1px 2px rgba(0,0,0,0.06);
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }
        .kb-add-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 8px 12px;
          font-size: 11.5px;
          font-weight: 500;
          color: #8993a4;
          border-bottom: 1px solid #f0f1f3;
          cursor: pointer;
          transition: background 100ms;
        }
        .kb-add-row:hover { background: #f9fafb; color: #5e6c84; }
        .kb-col-pulse .kb-col-v2 { animation: kb-pulse 200ms ease-out; }
        @keyframes kb-pulse {
          0% { box-shadow: 0 1px 2px rgba(0,0,0,0.06); }
          50% { box-shadow: 0 1px 12px rgba(0,0,0,0.12); }
          100% { box-shadow: 0 1px 2px rgba(0,0,0,0.06); }
        }
        .kb-insert-line {
          height: 2px;
          border-radius: 1px;
          margin: 2px 4px;
          position: relative;
          z-index: 10;
          animation: kb-line-in 80ms ease-out;
        }
        @keyframes kb-line-in {
          from { opacity: 0; transform: scaleX(0.5); }
          to { opacity: 1; transform: scaleX(1); }
        }
      `}</style>

      <div style={gridStyle} data-testid="kanban-board">
        {KANBAN_COLS.map(col => {
          const cards = columns[col.key];
          const count = cards.length;
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
                    className={`kb-col-v2 ${pulsingColumnId === col.key ? "kb-col-pulse" : ""}`}
                    style={{
                      ...(isMobile ? { minWidth: 256, flexShrink: 0, scrollSnapAlign: "start" } : {}),
                      transition: "box-shadow 150ms ease-out",
                      boxShadow: isHovering
                        ? "0 1px 8px rgba(0,0,0,0.1)"
                        : "0 1px 2px rgba(0,0,0,0.06)",
                    }}
                    data-testid={`kanban-col-${col.key}`}
                  >
                    {/* Colored Header */}
                    <div style={{
                      height: 36, display: "flex", alignItems: "center", justifyContent: "space-between",
                      padding: "0 12px", background: col.color, color: "#fff",
                      fontSize: 12.5, fontWeight: 700, letterSpacing: "0.02em",
                      opacity: isHovering ? 1 : 0.95,
                      transition: "opacity 120ms ease-out",
                    }}>
                      <span>{col.label}</span>
                      <span style={{
                        background: "rgba(255,255,255,0.25)", padding: "1px 7px",
                        borderRadius: 10, fontSize: 11, fontWeight: 600,
                      }}>{count}</span>
                    </div>

                    {/* Add Task Row */}
                    <div className="kb-add-row" data-testid={`add-task-${col.key}`}>
                      <span>+ Add New Task</span>
                      <span style={{ fontSize: 14, opacity: 0.5 }}>&#8942;</span>
                    </div>

                    {/* Cards */}
                    <div style={{
                      padding: "6px 8px 10px", display: "flex", flexDirection: "column",
                      gap: 6, flex: 1, minHeight: 80,
                      background: isHovering ? "rgba(59,130,246,0.03)" : "transparent",
                      borderRadius: "0 0 6px 6px",
                      transition: "background 120ms ease-out",
                    }}>
                      {count > 0 ? (
                        cards.map((p, idx) => (
                          <div key={p.program_id} style={{ position: "relative" }}>
                            {insertAt === idx && (
                              <div className="kb-insert-line" style={{ background: col.color }} data-testid="insertion-line" />
                            )}
                            <KanbanCard
                              program={p}
                              navigate={navigate}
                              index={idx}
                              attention={attentionMap[p.program_id]}
                              activeDragId={activeDragId}
                            />
                          </div>
                        ))
                      ) : (
                        !isTarget && (
                          <div style={{ padding: "20px 12px", textAlign: "center", fontSize: 11, color: "#c1c7d0", fontWeight: 500 }}
                            data-testid={`empty-col-${col.key}`}>
                            {getEmptyColCopy(col.key)}
                          </div>
                        )
                      )}
                      {insertAt !== null && insertAt >= count && (
                        <div className="kb-insert-line" style={{ background: col.color }} data-testid="insertion-line" />
                      )}
                      {provided.placeholder}
                    </div>
                  </div>
                );
              }}
            </Droppable>
          );
        })}

        {/* Add New Column */}
        <div style={{
          minWidth: isMobile ? 100 : 80, flex: isMobile ? "0 0 100px" : "0 0 80px",
          background: "transparent", border: "2px dashed #d5d9e0", borderRadius: 6,
          display: "flex", alignItems: "center", justifyContent: "center",
          minHeight: 120, cursor: "pointer", opacity: 0.5,
          transition: "opacity 150ms",
        }}
          onMouseEnter={e => e.currentTarget.style.opacity = 0.8}
          onMouseLeave={e => e.currentTarget.style.opacity = 0.5}
          data-testid="kanban-add-col"
        >
          <span style={{ fontSize: 12, fontWeight: 600, color: "#8993a4" }}>+</span>
        </div>
      </div>
    </DragDropContext>
  );
}

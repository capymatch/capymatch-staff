import React from "react";

export default function PipelineStyles() {
  return (
    <style>{`
      .kanban-card {
        transition: transform 100ms ease-out,
                    box-shadow 100ms ease-out,
                    opacity 100ms ease-out;
      }
      .kanban-card:hover {
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(0,0,0,0.06) !important;
      }
      .kanban-card:active { transform: translateY(0); }
      .kanban-insert-line {
        animation: insert-line-in 80ms ease-out both;
      }
      .kanban-insert-line::before,
      .kanban-insert-line::after {
        content: '';
        position: absolute;
        top: 50%;
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: inherit;
        transform: translateY(-50%);
      }
      .kanban-insert-line::before { left: -2px; }
      .kanban-insert-line::after { right: -2px; }
      @keyframes insert-line-in {
        from { opacity: 0; }
        to { opacity: 0.5; }
      }
      .kanban-col-pulse {
        animation: kanban-col-pulse 160ms ease-out both;
      }
      @keyframes kanban-col-pulse {
        0%   { box-shadow: inset 0 0 16px rgba(0,0,0,0.02); }
        100% { box-shadow: none; }
      }
      .kanban-card-settled {
        animation: kanban-settle 300ms ease-out both;
      }
      @keyframes kanban-settle {
        0%   { box-shadow: 0 0 0 2px rgba(0,0,0,0.06), 0 6px 16px rgba(0,0,0,0.08); }
        100% { box-shadow: 0 1px 2px rgba(0,0,0,0.04); }
      }
      .kanban-grid::-webkit-scrollbar { height: 4px; }
      .kanban-grid::-webkit-scrollbar-thumb { background: var(--cm-border); border-radius: 4px; }
      @media (max-width: 768px) {
        .kanban-grid {
          display: flex !important;
          grid-template-columns: none !important;
          overflow-x: auto !important;
          -webkit-overflow-scrolling: touch !important;
          scroll-snap-type: x mandatory !important;
          gap: 10px !important;
          padding-bottom: 8px !important;
        }
        .kanban-grid > div {
          min-width: 240px !important;
          flex-shrink: 0 !important;
          scroll-snap-align: start !important;
        }
        .pipeline-events-row { flex-direction: column !important; gap: 8px !important; }
        .priority-grid-coming-up { grid-template-columns: 1fr !important; }
      }
    `}</style>
  );
}

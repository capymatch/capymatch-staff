import React from "react";
import { useNavigate } from "react-router-dom";
import ComingUpTimelineEmptyState from "./ComingUpTimelineEmptyState";
import "./pipeline-motion.css";

const LEVEL_DOT = {
  high:   "#ef4444",
  medium: "#d97706",
  low:    "#10b981",
};

export default function ComingUpTimeline({ items }) {
  const navigate = useNavigate();

  if (!items || items.length === 0) return <ComingUpTimelineEmptyState />;

  return (
    <div data-testid="coming-up-timeline" className="px-1">
      <div className="mb-3">
        <span className="text-[10px] font-bold tracking-wider uppercase" style={{ color: "var(--cm-text-4, #cbd5e1)" }}>
          Coming Up
        </span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
        {items.slice(0, 3).map(item => {
          const dotColor = LEVEL_DOT[item.attentionLevel] || LEVEL_DOT.low;
          return (
            <div
              key={item.programId}
              onClick={() => navigate(`/pipeline/${item.programId}`)}
              className="rounded-lg p-3 cursor-pointer pm-stagger-card pm-card-hover group"
              style={{ background: `${dotColor}04`, border: `1px solid ${dotColor}10` }}
              data-testid={`timeline-card-${item.programId}`}
            >
              <div className="flex items-center gap-1.5 mb-1">
                <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: dotColor }} />
                <span className="text-[10px] font-bold uppercase tracking-wide" style={{ color: dotColor, opacity: 0.8 }}>
                  {item.timingLabel || 'Soon'}
                </span>
              </div>
              <div className="text-[13px] font-semibold leading-snug group-hover:underline" style={{ color: "var(--cm-text-2, #475569)" }}>
                {item.program?.university_name}
              </div>
              <div className="text-[10px] mt-0.5" style={{ color: "var(--cm-text-4, #cbd5e1)" }}>
                {item.reason}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

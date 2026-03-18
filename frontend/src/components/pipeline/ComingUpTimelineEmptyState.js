/**
 * ComingUpTimelineEmptyState — Calm forecast state when nothing is upcoming.
 * Same container as the active timeline, replaced content.
 */
import React from "react";
import { CheckCircle2 } from "lucide-react";

export default function ComingUpTimelineEmptyState() {
  return (
    <div
      data-testid="coming-up-timeline-empty"
      className="rounded-xl sm:rounded-2xl p-5 sm:p-7 mb-5"
      style={{ background: "var(--cm-surface, #ffffff)", border: "1px solid var(--cm-border, #e2e8f0)" }}
    >
      <div className="flex items-start gap-5 sm:gap-8">
        {/* Left: Text content */}
        <div className="flex-1 min-w-0">
          <div className="text-[10px] font-extrabold tracking-wider uppercase mb-2" style={{ color: "var(--cm-text-3, #94a3b8)" }}>
            Coming Up Next
          </div>
          <h3 className="text-base sm:text-lg font-extrabold leading-tight mb-1.5" style={{ color: "var(--cm-text, #0f172a)" }}>
            Nothing needs attention soon
          </h3>
          <p className="text-[12px] sm:text-[13px] leading-relaxed mb-0" style={{ color: "var(--cm-text-3, #94a3b8)" }}>
            No programs are at risk of losing momentum in the next few days.
            Keep doing what you're doing.
          </p>
          <p className="text-[11px] mt-2 mb-0" style={{ color: "var(--cm-text-3, #b0b8c4)" }}>
            We'll surface the next important shift before it becomes urgent.
          </p>
        </div>

        {/* Right: Subtle status marker */}
        <div className="flex-shrink-0 hidden sm:flex items-center justify-center w-11 h-11 rounded-xl mt-1"
          style={{ background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.10)" }}>
          <CheckCircle2 className="w-5 h-5" style={{ color: "#34d399", opacity: 0.7 }} />
        </div>
      </div>
    </div>
  );
}

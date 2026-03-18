/**
 * ComingUpTimeline — "Coming Up Next" forecast section.
 * Refined: removed duplicate chip row, human time labels, stronger card hierarchy.
 */
import React from "react";
import { useNavigate } from "react-router-dom";
import ComingUpTimelineEmptyState from "./ComingUpTimelineEmptyState";

/* ── Color per urgency ── */
const URGENCY_DOT = {
  today:   "#ef4444",
  soon:    "#f59e0b",
  later:   "#10b981",
};

/**
 * Build timeline items from programs + top-actions data.
 */
export function buildTimelineItems(programs, topActionsMap, matchScores) {
  const items = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (const p of programs) {
    if (p.board_group === "archived" || p.recruiting_status === "Committed" || p.journey_stage === "committed") continue;

    const ta = topActionsMap[p.program_id];
    if (ta && ta.action_key !== "no_action_needed" && ta.category !== "on_track") continue;

    const sig = p.signals || {};
    let daysUntil = null;
    let reason = "";

    if (p.next_action_due) {
      const dueStr = typeof p.next_action_due === "string" ? p.next_action_due.split("T")[0] : "";
      if (dueStr) {
        const due = new Date(dueStr + "T00:00:00");
        const diff = Math.round((due - today) / (1000 * 60 * 60 * 24));
        if (diff >= 1 && diff <= 7) {
          daysUntil = diff;
          reason = `Follow-up scheduled in ${diff} day${diff !== 1 ? "s" : ""}. Stay ahead of the deadline.`;
        } else if (diff === 0) {
          daysUntil = 0;
          reason = "Follow-up is due today and may become overdue if ignored.";
        } else if (diff < 0 && diff >= -7) {
          daysUntil = Math.min(Math.abs(diff), 5);
          reason = "Follow-up was recently due. A quick check-in keeps things on track.";
        }
      }
    }

    if (daysUntil === null && sig.days_since_activity != null && sig.days_since_activity > 0) {
      const daysSince = sig.days_since_activity;
      if (daysSince >= 10) {
        daysUntil = Math.max(0, 14 - daysSince);
        reason = "Relationship is starting to cool off. A check-in would help preserve momentum.";
      } else if (daysSince >= 5) {
        daysUntil = Math.max(1, 10 - daysSince);
        reason = "No recent touchpoints. Consider reaching out to maintain engagement.";
      }
    }

    if (daysUntil === null && sig.total_interactions === 0) {
      daysUntil = 3;
      reason = "No contact yet. Making a first touchpoint early builds momentum.";
    }

    if (daysUntil !== null && reason) {
      const urgency = daysUntil === 0 ? "today" : daysUntil <= 3 ? "soon" : "later";

      /* #5 Human-friendly time labels */
      let timeLabel;
      if (daysUntil === 0) timeLabel = "Today";
      else if (daysUntil === 1) timeLabel = "Tomorrow";
      else timeLabel = `In ${daysUntil} days`;

      items.push({
        programId: p.program_id,
        university: p.university_name,
        daysUntil,
        reason,
        urgency,
        timeLabel,
      });
    }
  }

  items.sort((a, b) => a.daysUntil - b.daysUntil);
  return items.slice(0, 4);
}

export default function ComingUpTimeline({ items }) {
  const navigate = useNavigate();

  if (!items || items.length === 0) return <ComingUpTimelineEmptyState />;

  return (
    <div
      data-testid="coming-up-timeline"
      className="rounded-xl sm:rounded-2xl p-4 sm:p-6"
      style={{ background: "var(--cm-surface, #ffffff)", border: "1px solid var(--cm-border, #e2e8f0)" }}
    >
      {/* Header — compact */}
      <div className="mb-4">
        <div className="text-[10px] font-extrabold tracking-wider uppercase mb-1" style={{ color: "var(--cm-text-3, #94a3b8)" }}>
          Coming Up Next
        </div>
        <h3 className="text-sm sm:text-base font-bold leading-tight" style={{ color: "var(--cm-text, #0f172a)" }}>
          What may need attention soon
        </h3>
      </div>

      {/* #4 REMOVED duplicate chip row — cards only */}
      {/* #6 STRONGER card hierarchy — time label dominant, more spacing */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {items.slice(0, 3).map(item => {
          const dotColor = URGENCY_DOT[item.urgency] || URGENCY_DOT.later;
          return (
            <div
              key={item.programId}
              onClick={() => navigate(`/pipeline/${item.programId}`)}
              className="rounded-lg sm:rounded-xl p-3.5 sm:p-4 cursor-pointer transition-all hover:shadow-md group"
              style={{ background: `${dotColor}05`, border: `1px solid ${dotColor}14` }}
              data-testid={`timeline-card-${item.programId}`}
            >
              {/* Time label — strongest visual */}
              <div className="flex items-center gap-2 mb-2.5">
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: dotColor }} />
                <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wide" style={{ color: dotColor }}>
                  {item.timeLabel}
                </span>
              </div>
              {/* School name — secondary emphasis */}
              <div className="text-[14px] sm:text-[15px] font-bold mb-1.5 leading-snug group-hover:underline" style={{ color: "var(--cm-text, #0f172a)" }}>
                {item.university}
              </div>
              {/* Reason — supporting */}
              <div className="text-[11px] sm:text-xs leading-relaxed" style={{ color: "var(--cm-text-3, #94a3b8)" }}>
                {item.reason}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

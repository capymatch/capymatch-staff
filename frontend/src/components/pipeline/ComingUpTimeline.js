/**
 * ComingUpTimeline — "Coming Up Next" forecast section.
 * Refined: removed duplicate chip row, human time labels, stronger card hierarchy.
 */
import React from "react";
import { useNavigate } from "react-router-dom";
import ComingUpTimelineEmptyState from "./ComingUpTimelineEmptyState";
import "./pipeline-motion.css";

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
          reason = `Follow up — due in ${diff} day${diff !== 1 ? "s" : ""}`;
        } else if (diff === 0) {
          daysUntil = 0;
          reason = "Follow up — due today";
        } else if (diff < 0 && diff >= -7) {
          daysUntil = Math.min(Math.abs(diff), 5);
          reason = "Check in — recently overdue";
        }
      }
    }

    if (daysUntil === null && sig.days_since_activity != null && sig.days_since_activity > 0) {
      const daysSince = sig.days_since_activity;
      if (daysSince >= 10) {
        daysUntil = Math.max(0, 14 - daysSince);
        reason = `Check in — no activity in ${daysSince} days`;
      } else if (daysSince >= 5) {
        daysUntil = Math.max(1, 10 - daysSince);
        reason = `Reach out — ${daysSince} days since last contact`;
      }
    }

    if (daysUntil === null && sig.total_interactions === 0) {
      daysUntil = 3;
      reason = "Send first message";
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
      className="px-1"
    >
      <div className="mb-3">
        <span className="text-[10px] font-bold tracking-wider uppercase" style={{ color: "var(--cm-text-4, #cbd5e1)" }}>
          Coming Up
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
        {items.slice(0, 3).map(item => {
          const dotColor = URGENCY_DOT[item.urgency] || URGENCY_DOT.later;
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
                  {item.timeLabel}
                </span>
              </div>
              <div className="text-[13px] font-semibold leading-snug group-hover:underline" style={{ color: "var(--cm-text-2, #475569)" }}>
                {item.university}
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

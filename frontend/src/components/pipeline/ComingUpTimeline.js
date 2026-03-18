/**
 * ComingUpTimeline — "Coming Up Next" forecast section.
 * Fully responsive: stacks vertically on mobile.
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
      const nameParts = p.university_name.split(" ");
      const shortName = nameParts.length > 2 ? nameParts.slice(0, 2).join(" ") : nameParts[0];
      const shortLabel = daysUntil === 0
        ? `${shortName} follow-up`
        : daysUntil <= 3
          ? `${shortName} cools off`
          : `${shortName} touchpoint`;

      items.push({
        programId: p.program_id,
        university: p.university_name,
        daysUntil,
        reason,
        urgency,
        shortLabel,
        timeLabel: daysUntil === 0 ? "Today" : `In ${daysUntil} day${daysUntil !== 1 ? "s" : ""}`,
      });
    }
  }

  items.sort((a, b) => a.daysUntil - b.daysUntil);
  return items.slice(0, 4);
}

/* ── Timeline markers ── */
const TIME_MARKS = [
  { label: "Today", day: 0 },
  { label: "2d", day: 2 },
  { label: "5d", day: 5 },
  { label: "7d", day: 7 },
];

export default function ComingUpTimeline({ items }) {
  const navigate = useNavigate();

  if (!items || items.length === 0) return <ComingUpTimelineEmptyState />;

  const maxDay = 7;

  return (
    <div
      data-testid="coming-up-timeline"
      className="rounded-xl sm:rounded-2xl p-4 sm:p-6 mb-5"
      style={{ background: "var(--cm-surface, #ffffff)", border: "1px solid var(--cm-border, #e2e8f0)" }}
    >
      {/* Header */}
      <div className="mb-4">
        <div className="text-[10px] font-extrabold tracking-wider uppercase mb-1.5" style={{ color: "var(--cm-text-3, #94a3b8)" }}>
          Coming Up Next
        </div>
        <h3 className="text-base sm:text-lg font-extrabold leading-tight mb-1" style={{ color: "var(--cm-text, #0f172a)" }}>
          What may need attention soon
        </h3>
        <p className="text-[11px] sm:text-xs hidden sm:block" style={{ color: "var(--cm-text-3, #94a3b8)", lineHeight: 1.5 }}>
          A forward-looking view so you can see what's about to slip before it becomes urgent.
        </p>
      </div>

      {/* Timeline track */}
      <div className="mb-4">
        {/* Labels */}
        <div className="flex justify-between mb-2 px-1">
          {TIME_MARKS.map((m, i) => (
            <span key={m.day} className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wide"
              style={{ color: "var(--cm-text-3, #94a3b8)", textAlign: i === 0 ? "left" : i === TIME_MARKS.length - 1 ? "right" : "center" }}>
              {m.label}
            </span>
          ))}
        </div>

        {/* Track line with dots */}
        <div className="relative h-[2px] rounded-full mb-3" style={{ background: "var(--cm-border, #e2e8f0)" }}>
          {TIME_MARKS.map(m => {
            const pct = (m.day / maxDay) * 100;
            return (
              <div key={m.day} className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full"
                style={{ left: `${pct}%`, background: "var(--cm-border, #cbd5e1)", border: "2px solid var(--cm-surface, #fff)" }} />
            );
          })}
        </div>

        {/* Pills row */}
        <div className="flex gap-1.5 sm:gap-2 flex-wrap">
          {items.map((item) => {
            const dotColor = URGENCY_DOT[item.urgency] || URGENCY_DOT.later;
            return (
              <div
                key={item.programId}
                onClick={() => navigate(`/pipeline/${item.programId}`)}
                className="flex items-center gap-1.5 px-2 sm:px-2.5 py-1 rounded-full cursor-pointer text-[10px] sm:text-[11px] font-semibold whitespace-nowrap"
                style={{ background: `${dotColor}10`, border: `1px solid ${dotColor}20`, color: "var(--cm-text, #0f172a)" }}
                data-testid={`timeline-pill-${item.programId}`}
              >
                <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: dotColor }} />
                {item.shortLabel}
              </div>
            );
          })}
        </div>
      </div>

      {/* Cards grid — 1 col on mobile, 3 on desktop */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {items.slice(0, 3).map(item => {
          const dotColor = URGENCY_DOT[item.urgency] || URGENCY_DOT.later;
          return (
            <div
              key={item.programId}
              onClick={() => navigate(`/pipeline/${item.programId}`)}
              className="rounded-lg sm:rounded-xl p-3 sm:p-4 cursor-pointer transition-shadow hover:shadow-sm"
              style={{ background: `${dotColor}06`, border: `1px solid ${dotColor}18` }}
              data-testid={`timeline-card-${item.programId}`}
            >
              <div className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wide mb-1" style={{ color: dotColor }}>
                {item.timeLabel}
              </div>
              <div className="text-[13px] sm:text-sm font-bold mb-1 leading-snug" style={{ color: "var(--cm-text, #0f172a)" }}>
                {item.university}
              </div>
              <div className="text-[11px] sm:text-xs leading-relaxed" style={{ color: "var(--cm-text-3, #64748b)" }}>
                {item.reason}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

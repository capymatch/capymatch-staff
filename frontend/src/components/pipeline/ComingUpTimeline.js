/**
 * ComingUpTimeline — "Coming Up Next" forecast section.
 *
 * Shows what will need attention soon (not urgent yet).
 * Horizontal timeline: Today → 2d → 5d → 7d with event cards.
 * Light background, visually separate from the dark hero.
 */
import React from "react";
import { useNavigate } from "react-router-dom";
import UniversityLogo from "../UniversityLogo";

/* ── Color per urgency ── */
const URGENCY_DOT = {
  today:   "#ef4444",
  soon:    "#f59e0b",
  later:   "#10b981",
};

/**
 * Build timeline items from programs + top-actions data.
 * Shows on-track programs that may need attention soon,
 * generating forecast estimates from available signals.
 */
export function buildTimelineItems(programs, topActionsMap, matchScores) {
  const items = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (const p of programs) {
    if (p.board_group === "archived" || p.recruiting_status === "Committed" || p.journey_stage === "committed") continue;

    const ta = topActionsMap[p.program_id];

    // Skip programs that are already actionable (shown in hero)
    if (ta && ta.action_key !== "no_action_needed" && ta.category !== "on_track") continue;

    const sig = p.signals || {};
    let daysUntil = null;
    let reason = "";

    // 1. Check follow-up due date
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
          // Recently overdue on-track programs — show as upcoming (spread out)
          daysUntil = Math.min(Math.abs(diff), 5);
          reason = "Follow-up was recently due. A quick check-in keeps things on track.";
        }
      }
    }

    // 2. Check days since last activity
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

    // 3. Programs with zero interactions — need first outreach soon
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
        domain: p.domain,
        logoUrl: matchScores[p.program_id]?.logo_url || p.logo_url,
        daysUntil,
        reason,
        urgency,
        shortLabel,
        timeLabel: daysUntil === 0 ? "Today" : `In ${daysUntil} day${daysUntil !== 1 ? "s" : ""}`,
      });
    }
  }

  // Sort by urgency (soonest first), limit to 4
  items.sort((a, b) => a.daysUntil - b.daysUntil);
  return items.slice(0, 4);
}

/* ── Timeline markers for the horizontal track ── */
const TIME_MARKS = [
  { label: "Today", day: 0 },
  { label: "2 Days", day: 2 },
  { label: "5 Days", day: 5 },
  { label: "7 Days", day: 7 },
];

export default function ComingUpTimeline({ items }) {
  const navigate = useNavigate();

  if (!items || items.length === 0) return null;

  const maxDay = 7;

  return (
    <div
      data-testid="coming-up-timeline"
      style={{
        background: "var(--cm-surface, #ffffff)",
        border: "1px solid var(--cm-border, #e2e8f0)",
        borderRadius: 14,
        padding: "24px 28px 28px",
        marginBottom: 20,
      }}
    >
      <div style={{ display: "flex", gap: 32 }}>
        {/* Left: Header text */}
        <div style={{ width: 180, flexShrink: 0 }}>
          <div style={{
            fontSize: 10, fontWeight: 800, color: "var(--cm-text-3, #94a3b8)",
            letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8,
          }}>
            Coming Up Next
          </div>
          <h3 style={{
            fontSize: 18, fontWeight: 800, color: "var(--cm-text, #0f172a)",
            lineHeight: 1.3, margin: "0 0 8px",
          }}>
            What may need attention soon
          </h3>
          <p style={{
            fontSize: 12, color: "var(--cm-text-3, #94a3b8)",
            lineHeight: 1.5, margin: 0,
          }}>
            A forward-looking view so you can see what's about to slip before it becomes urgent.
          </p>
        </div>

        {/* Right: Timeline */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Timeline track */}
          <div style={{ position: "relative", marginBottom: 20, paddingTop: 4 }}>
            {/* Labels row */}
            <div style={{ display: "flex", marginBottom: 14, paddingLeft: 4, paddingRight: 4 }}>
              {TIME_MARKS.map((m, i) => (
                <span key={m.day} style={{
                  flex: 1,
                  fontSize: 10, fontWeight: 700, color: "var(--cm-text-3, #94a3b8)",
                  letterSpacing: "0.06em", textTransform: "uppercase",
                  textAlign: i === 0 ? "left" : i === TIME_MARKS.length - 1 ? "right" : "center",
                }}>
                  {m.label}
                </span>
              ))}
            </div>

            {/* Track line with pills */}
            <div style={{
              height: 2, background: "var(--cm-border, #e2e8f0)", borderRadius: 1,
              position: "relative", marginBottom: 14,
            }}>
              {/* Time mark dots */}
              {TIME_MARKS.map(m => {
                const pct = (m.day / maxDay) * 100;
                return (
                  <div key={m.day} style={{
                    position: "absolute", left: `${pct}%`, top: "50%",
                    transform: "translate(-50%, -50%)",
                    width: 6, height: 6, borderRadius: "50%",
                    background: "var(--cm-border, #cbd5e1)",
                    border: "2px solid var(--cm-surface, #fff)",
                  }} />
                );
              })}
            </div>

            {/* Pills row below the track */}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {items.map((item) => {
                const dotColor = URGENCY_DOT[item.urgency] || URGENCY_DOT.later;
                return (
                  <div
                    key={item.programId}
                    onClick={() => navigate(`/pipeline/${item.programId}`)}
                    style={{
                      display: "flex", alignItems: "center", gap: 5,
                      padding: "4px 10px", borderRadius: 16,
                      background: `${dotColor}10`,
                      border: `1px solid ${dotColor}20`,
                      cursor: "pointer", whiteSpace: "nowrap",
                      transition: "background 0.15s",
                    }}
                    data-testid={`timeline-pill-${item.programId}`}
                  >
                    <div style={{ width: 6, height: 6, borderRadius: "50%", background: dotColor, flexShrink: 0 }} />
                    <span style={{ fontSize: 11, fontWeight: 600, color: "var(--cm-text, #0f172a)" }}>
                      {item.shortLabel}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Cards below timeline */}
          <div style={{
            display: "grid",
            gridTemplateColumns: `repeat(${Math.min(items.length, 3)}, 1fr)`,
            gap: 14,
          }}>
            {items.slice(0, 3).map(item => {
              const dotColor = URGENCY_DOT[item.urgency] || URGENCY_DOT.later;
              return (
                <div
                  key={item.programId}
                  onClick={() => navigate(`/pipeline/${item.programId}`)}
                  style={{
                    background: `${dotColor}06`,
                    border: `1px solid ${dotColor}18`,
                    borderRadius: 10,
                    padding: "14px 16px",
                    cursor: "pointer",
                    transition: "box-shadow 0.15s",
                  }}
                  data-testid={`timeline-card-${item.programId}`}
                >
                  <div style={{
                    fontSize: 10, fontWeight: 700, color: dotColor,
                    letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 6,
                  }}>
                    {item.timeLabel}
                  </div>
                  <div style={{
                    fontSize: 14, fontWeight: 700, color: "var(--cm-text, #0f172a)",
                    marginBottom: 4, lineHeight: 1.3,
                  }}>
                    {item.university}
                  </div>
                  <div style={{
                    fontSize: 12, color: "var(--cm-text-3, #64748b)",
                    lineHeight: 1.5,
                  }}>
                    {item.reason}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

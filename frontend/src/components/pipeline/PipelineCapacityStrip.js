/**
 * PipelineCapacityStrip — Minimal inline capacity indicator.
 *
 * Shows only: "7 / 20 programs on your board"
 * with an optional subtle progress bar.
 *
 * Design: text-only, low visual weight, no boxes, no cards.
 * Numbers are bold; label text is muted.
 */
import React from "react";

export default function PipelineCapacityStrip({ current, limit }) {
  const isUnlimited = !limit || limit <= 0;
  const pct = !isUnlimited ? Math.min((current / limit) * 100, 100) : 0;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "12px 2px 0",
        marginTop: 8,
      }}
      data-testid="pipeline-capacity-strip"
    >
      <span style={{ fontSize: 12, lineHeight: 1, color: "var(--cm-text-3)" }}>
        <span style={{ fontWeight: 700, color: "var(--cm-text-2)" }}>
          {current}
          {!isUnlimited && <> / {limit}</>}
        </span>{" "}
        programs on your board
      </span>

      {/* Subtle progress bar */}
      {!isUnlimited && (
        <div
          style={{
            width: 80,
            height: 3,
            borderRadius: 2,
            background: "var(--cm-border)",
            flexShrink: 0,
          }}
          data-testid="capacity-progress-bar"
        >
          <div
            style={{
              width: `${pct}%`,
              height: "100%",
              borderRadius: 2,
              background:
                pct >= 90
                  ? "#f59e0b"
                  : "var(--cm-accent)",
              transition: "width 0.3s ease",
            }}
          />
        </div>
      )}
    </div>
  );
}

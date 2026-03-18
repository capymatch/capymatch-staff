/**
 * PipelineCapacityStrip — Inline capacity indicator for dark hero card.
 *
 * Shows: "7 / 20 programs on your board" with optional progress bar.
 * Styled for dark background.
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
        padding: "12px 0 2px",
        marginTop: 4,
        borderTop: "1px solid rgba(255,255,255,0.06)",
      }}
      data-testid="pipeline-capacity-strip"
    >
      <span style={{ fontSize: 12, lineHeight: 1, color: "rgba(255,255,255,0.3)" }}>
        <span style={{ fontWeight: 700, color: "rgba(255,255,255,0.6)" }}>
          {current}
          {!isUnlimited && <> / {limit}</>}
        </span>{" "}
        programs on your board
      </span>

      {!isUnlimited && (
        <div
          style={{
            width: 80,
            height: 3,
            borderRadius: 2,
            background: "rgba(255,255,255,0.08)",
            flexShrink: 0,
          }}
          data-testid="capacity-progress-bar"
        >
          <div
            style={{
              width: `${pct}%`,
              height: "100%",
              borderRadius: 2,
              background: pct >= 90 ? "#f59e0b" : "#5eead4",
              transition: "width 0.3s ease",
            }}
          />
        </div>
      )}
    </div>
  );
}

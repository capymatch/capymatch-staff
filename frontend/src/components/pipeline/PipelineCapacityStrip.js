/**
 * PipelineCapacityStrip — Minimal inline capacity indicator.
 *
 * Shows: "7 / 20 programs on your board" with subtle progress bar.
 * Sits at the bottom of the hero as a distinct, thin horizontal strip.
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
        gap: 14,
        padding: "14px 0 4px",
        marginTop: 12,
        borderTop: "1px solid var(--cm-border)",
      }}
      data-testid="pipeline-capacity-strip"
    >
      <span style={{ fontSize: 13, lineHeight: 1, color: "var(--cm-text-3)", opacity: 0.7 }}>
        <span style={{ fontWeight: 700, color: "var(--cm-text)", opacity: 1 }}>
          {current}
          {!isUnlimited && <> / {limit}</>}
        </span>{" "}
        programs on your board
      </span>

      {/* Subtle progress bar — only for limited plans */}
      {!isUnlimited && (
        <div
          style={{
            width: 100,
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
              background: pct >= 90 ? "#f59e0b" : "var(--cm-accent)",
              transition: "width 0.3s ease",
            }}
          />
        </div>
      )}
    </div>
  );
}

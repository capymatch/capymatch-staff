import { TRAJECTORY } from "./inbox-utils";

export function TrajectoryHint({ trajectory, style }) {
  const t = TRAJECTORY[trajectory];
  if (!t) return null;
  return (
    <span
      className="inline-flex items-center gap-0.5"
      style={{ fontSize: 10, fontWeight: 600, color: t.color, letterSpacing: "0.01em", ...style }}
      data-testid={`trajectory-${trajectory}`}
    >
      {t.symbol} {t.label}
    </span>
  );
}

import { usePlan } from "@/PlanContext";
import UpgradeNudge from "@/components/UpgradeNudge";

/**
 * PlanGate — three gating modes, zero conditional spaghetti.
 *
 * Mode 1: Access gate (binary show/hide)
 *   <PlanGate access="events_create_access" upgrade="Growth">...</PlanGate>
 *
 * Mode 2: Depth gate (show content, nudge if depth is lower)
 *   <PlanGate depth="signal_detail_level" min="detailed" upgrade="Growth">...</PlanGate>
 *
 * Mode 3: Limit gate (render children, they handle the limit internally)
 *   Always renders children — limit values passed via usePlan().getLimit()
 *
 * Props:
 *   access    — entitlement key for boolean gate
 *   depth     — entitlement key for depth gate
 *   min       — minimum depth level required (used with depth)
 *   upgrade   — plan label for upgrade prompt (e.g., "Growth")
 *   upgradeMsg — custom message for the nudge
 *   name      — human-friendly feature name
 *   fallback  — custom fallback component
 */
export default function PlanGate({ access, depth, min, upgrade, upgradeMsg, name, fallback, children }) {
  const { can, hasDepth } = usePlan();

  // Mode 1: Access gate
  if (access) {
    if (can(access)) return children;
    if (fallback) return fallback;
    return <UpgradeNudge featureName={name || access} planLabel={upgrade || "Growth"} />;
  }

  // Mode 2: Depth gate
  if (depth && min) {
    if (hasDepth(depth, min)) return children;
    // Depth not met — still show children but with a nudge below
    return (
      <>
        {children}
        <UpgradeNudge
          featureName={name || depth}
          planLabel={upgrade || "Growth"}
          message={upgradeMsg}
          inline
        />
      </>
    );
  }

  // Default: render children
  return children;
}

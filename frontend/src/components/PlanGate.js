import { usePlan } from "@/PlanContext";
import UpgradePrompt from "@/components/UpgradePrompt";

/**
 * PlanGate — wraps children and shows upgrade prompt if feature is locked.
 *
 * Props:
 *   feature: feature_id string (e.g. "director_inbox")
 *   name: human-friendly feature name for the prompt
 *   minPlan: override for the minimum plan label (auto-detected if omitted)
 *   fallback: custom fallback component (overrides default UpgradePrompt)
 *   inline: if true, renders compact badge instead of full card
 */
export default function PlanGate({ feature, name, minPlan, fallback, inline = false, children }) {
  const { can } = usePlan();

  if (can(feature)) {
    return children;
  }

  if (fallback) return fallback;

  return <UpgradePrompt featureName={name || feature} minPlan={minPlan || "growth"} compact={inline} />;
}

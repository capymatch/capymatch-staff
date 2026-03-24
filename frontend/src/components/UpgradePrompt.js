import { Lock } from "lucide-react";

const PLAN_CONFIG = {
  starter: { label: "Starter", color: "#64748b" },
  growth: { label: "Growth", color: "#10b981" },
  club_pro: { label: "Club Pro", color: "#3b82f6" },
  elite: { label: "Elite", color: "#8b5cf6" },
  enterprise: { label: "Enterprise", color: "#f59e0b" },
};

/**
 * UpgradePrompt — shown inline when a feature is locked.
 */
export default function UpgradePrompt({ featureName, minPlan = "growth", compact = false }) {
  const cfg = PLAN_CONFIG[minPlan] || PLAN_CONFIG.growth;

  if (compact) {
    return (
      <span
        data-testid={`upgrade-badge-${minPlan}`}
        className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full"
        style={{ backgroundColor: `${cfg.color}1a`, color: cfg.color, border: `1px solid ${cfg.color}33` }}
      >
        <Lock className="w-3 h-3" />
        {cfg.label}
      </span>
    );
  }

  return (
    <div
      data-testid={`upgrade-prompt-${minPlan}`}
      className="relative overflow-hidden rounded-xl p-6 text-center"
      style={{ border: "1px solid rgba(51,65,85,0.6)", backgroundColor: "rgba(30,41,59,0.6)", backdropFilter: "blur(8px)" }}
    >
      <div className="flex flex-col items-center gap-3">
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center"
          style={{ backgroundColor: `${cfg.color}26` }}
        >
          <Lock className="w-5 h-5" style={{ color: cfg.color }} />
        </div>
        <div>
          <h3 className="text-sm font-semibold" style={{ color: "#e2e8f0" }}>{featureName}</h3>
          <p className="text-xs mt-1" style={{ color: "#94a3b8" }}>
            Available on <span className="font-semibold" style={{ color: cfg.color }}>{cfg.label}</span> and above
          </p>
        </div>
        <a
          href="/club-billing"
          className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-colors"
          style={{ backgroundColor: `${cfg.color}26`, color: cfg.color, border: `1px solid ${cfg.color}33` }}
        >
          Upgrade to {cfg.label}
        </a>
      </div>
    </div>
  );
}

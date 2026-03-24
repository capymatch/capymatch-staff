import { ArrowUpRight, Lock } from "lucide-react";

const PLAN_ACCENTS = {
  Starter: "#64748b",
  Growth: "#10b981",
  "Club Pro": "#3b82f6",
  Elite: "#8b5cf6",
  Enterprise: "#f59e0b",
};

/**
 * UpgradeNudge — tasteful, inline upgrade prompt. NOT a wall.
 *
 * Two variants:
 *   inline=false (default): Card-style prompt replacing locked content
 *   inline=true: Subtle footer bar below visible content
 *
 * Props:
 *   featureName — human label, e.g. "AI Program Brief"
 *   planLabel   — "Growth", "Club Pro", "Elite"
 *   message     — custom copy (overrides default)
 *   inline      — if true, renders as a subtle footer bar
 *   remaining   — number of hidden items (for limit nudges)
 */
export default function UpgradeNudge({ featureName, planLabel = "Growth", message, inline = false, remaining }) {
  const accent = PLAN_ACCENTS[planLabel] || "#10b981";

  const defaultMsg = remaining
    ? `See ${remaining} more with ${planLabel}`
    : inline
    ? `Unlock deeper ${featureName.toLowerCase()} with ${planLabel}`
    : `Available on ${planLabel} and above`;

  const copy = message || defaultMsg;

  if (inline) {
    return (
      <div
        data-testid={`upgrade-nudge-inline`}
        className="flex items-center justify-between px-4 py-2.5 mt-2 rounded-lg"
        style={{ backgroundColor: `${accent}0d`, border: `1px solid ${accent}20` }}
      >
        <p className="text-xs font-medium" style={{ color: accent }}>
          {copy}
        </p>
        <a
          href="/club-billing"
          className="flex items-center gap-1 text-xs font-semibold transition-opacity hover:opacity-80"
          style={{ color: accent }}
        >
          Upgrade <ArrowUpRight className="w-3 h-3" />
        </a>
      </div>
    );
  }

  return (
    <div
      data-testid={`upgrade-nudge-card`}
      className="rounded-xl p-5 text-center"
      style={{ backgroundColor: `${accent}08`, border: `1px solid ${accent}18` }}
    >
      <div
        className="w-9 h-9 rounded-full mx-auto mb-3 flex items-center justify-center"
        style={{ backgroundColor: `${accent}15` }}
      >
        <Lock className="w-4 h-4" style={{ color: accent }} />
      </div>
      <h3 className="text-sm font-semibold" style={{ color: "#1e293b" }}>{featureName}</h3>
      <p className="text-xs mt-1 mb-3" style={{ color: "#64748b" }}>{copy}</p>
      <a
        href="/club-billing"
        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-opacity hover:opacity-80"
        style={{ backgroundColor: `${accent}15`, color: accent, border: `1px solid ${accent}25` }}
      >
        Upgrade to {planLabel} <ArrowUpRight className="w-3.5 h-3.5" />
      </a>
    </div>
  );
}

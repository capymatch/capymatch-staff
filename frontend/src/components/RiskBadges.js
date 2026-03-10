import { useState } from "react";
import { AlertTriangle, Info, Clock, DollarSign, CheckCircle2, X } from "lucide-react";

const BADGE_CONFIG = {
  academic_reach: {
    icon: AlertTriangle,
    bg: "rgba(234,88,12,0.12)",
    text: "#fb923c",
    border: "rgba(234,88,12,0.25)",
  },
  roster_tight: {
    icon: Info,
    bg: "rgba(148,163,184,0.1)",
    text: "#94a3b8",
    border: "rgba(148,163,184,0.2)",
  },
  timeline_risk: {
    icon: Clock,
    bg: "rgba(139,92,246,0.12)",
    text: "#a78bfa",
    border: "rgba(139,92,246,0.25)",
  },
  funding_dependent: {
    icon: DollarSign,
    bg: "rgba(34,197,94,0.12)",
    text: "#4ade80",
    border: "rgba(34,197,94,0.25)",
  },
};

export function RiskBadgePill({ badge, onClick }) {
  const config = BADGE_CONFIG[badge.key] || BADGE_CONFIG.roster_tight;
  const Icon = config.icon;
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold transition-opacity hover:opacity-80 cursor-pointer"
      style={{ backgroundColor: config.bg, color: config.text, border: `1px solid ${config.border}` }}
      data-testid={`risk-badge-${badge.key}`}
    >
      <Icon className="w-3 h-3 flex-shrink-0" />
      {badge.label}
    </button>
  );
}

export function RiskBadgeRow({ badges, onBadgeClick }) {
  if (!badges || badges.length === 0) return null;
  return (
    <div className="flex items-center gap-1.5 flex-wrap" data-testid="risk-badges-row">
      {badges.map((b) => (
        <RiskBadgePill key={b.key} badge={b} onClick={() => onBadgeClick?.(b)} />
      ))}
    </div>
  );
}

export function RiskBadgeEmpty() {
  return (
    <div
      className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold"
      style={{ backgroundColor: "rgba(34,197,94,0.1)", color: "#4ade80", border: "1px solid rgba(34,197,94,0.15)" }}
      data-testid="risk-badge-clear"
    >
      <CheckCircle2 className="w-3 h-3" />
      No major risks identified
    </div>
  );
}

export function RiskExplainerDrawer({ badges, activeBadge, onClose }) {
  const [selected, setSelected] = useState(activeBadge || (badges?.[0] || null));
  if (!badges || badges.length === 0) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end" data-testid="risk-explainer-drawer">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div
        className="relative w-full max-w-md h-full overflow-y-auto shadow-2xl animate-in slide-in-from-right duration-200"
        style={{ backgroundColor: "var(--cm-surface)" }}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: "var(--cm-border)", backgroundColor: "var(--cm-surface)" }}>
          <h2 className="text-base font-bold" style={{ color: "var(--cm-text)" }}>Risk Assessment</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg transition-colors hover:bg-white/5" data-testid="close-risk-drawer">
            <X className="w-5 h-5" style={{ color: "var(--cm-text-3)" }} />
          </button>
        </div>

        <div className="p-6 space-y-3">
          {badges.map((badge) => {
            const config = BADGE_CONFIG[badge.key] || BADGE_CONFIG.roster_tight;
            const Icon = config.icon;
            const isSelected = selected?.key === badge.key;
            return (
              <button
                key={badge.key}
                onClick={() => setSelected(badge)}
                className="w-full text-left rounded-xl p-4 transition-all duration-150"
                style={{
                  backgroundColor: isSelected ? config.bg : "transparent",
                  border: `2px solid ${isSelected ? config.border : "var(--cm-border)"}`,
                }}
                data-testid={`drawer-badge-${badge.key}`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: config.bg }}>
                    <Icon className="w-4 h-4" style={{ color: config.text }} />
                  </div>
                  <span className="text-sm font-bold" style={{ color: config.text }}>{badge.label}</span>
                </div>
                {isSelected && badge.summary && (
                  <p className="text-[12px] leading-relaxed mt-2 pl-9" style={{ color: "var(--cm-text-2)" }}>
                    {badge.summary}
                  </p>
                )}
              </button>
            );
          })}
        </div>

        <div className="px-6 py-4 border-t" style={{ borderColor: "var(--cm-border)" }}>
          <p className="text-[11px] leading-relaxed" style={{ color: "var(--cm-text-3)" }}>
            Risk badges are based on publicly available data and NCAA roster rules. They are informational only and do not guarantee outcomes.
          </p>
        </div>
      </div>
    </div>
  );
}

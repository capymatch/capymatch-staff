import { AlertTriangle, TrendingDown, Zap, Eye, Lightbulb, CheckCircle, ShieldAlert, FileWarning } from "lucide-react";

const TYPE_CONFIG = {
  alert: { icon: AlertTriangle, color: "#ef4444", bg: "rgba(239,68,68,0.06)", border: "rgba(239,68,68,0.12)" },
  warning: { icon: Zap, color: "#f59e0b", bg: "rgba(245,158,11,0.06)", border: "rgba(245,158,11,0.12)" },
  insight: { icon: Eye, color: "#3b82f6", bg: "rgba(59,130,246,0.06)", border: "rgba(59,130,246,0.12)" },
  positive: { icon: CheckCircle, color: "#10b981", bg: "rgba(16,185,129,0.06)", border: "rgba(16,185,129,0.12)" },
};

const PRIORITY_BADGE = {
  critical: { label: "Critical", color: "#ef4444", bg: "rgba(239,68,68,0.1)" },
  high: { label: "High", color: "#f59e0b", bg: "rgba(245,158,11,0.1)" },
  medium: { label: "Medium", color: "#3b82f6", bg: "rgba(59,130,246,0.1)" },
  low: { label: "Low", color: "#6b7280", bg: "rgba(107,114,128,0.1)" },
};

function RecruitingIntelligence({ signals }) {
  if (!signals || signals.length === 0) return null;

  // Sort: critical > high > medium > low
  const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  const sorted = [...signals].sort((a, b) => (priorityOrder[a.priority] ?? 9) - (priorityOrder[b.priority] ?? 9));

  return (
    <div className="rounded-xl border p-5" style={{ backgroundColor: "var(--cm-surface, #fff)", borderColor: "var(--cm-border, #f1f5f9)" }} data-testid="recruiting-intelligence">
      <h3 className="text-[11px] font-bold uppercase tracking-widest mb-4" style={{ color: "var(--cm-text-3, #94a3b8)" }}>
        Recruiting Intelligence
      </h3>

      <div className="space-y-3">
        {sorted.map((signal) => {
          const config = TYPE_CONFIG[signal.type] || TYPE_CONFIG.insight;
          const Icon = config.icon;
          const priority = PRIORITY_BADGE[signal.priority] || PRIORITY_BADGE.medium;

          return (
            <div
              key={signal.id}
              className="rounded-lg p-3.5"
              style={{ backgroundColor: config.bg, border: `1px solid ${config.border}` }}
              data-testid={`signal-${signal.id}`}
            >
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                  style={{ backgroundColor: `${config.color}15` }}>
                  <Icon className="w-4 h-4" style={{ color: config.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-semibold" style={{ color: "var(--cm-text, #1e293b)" }}>
                      {signal.title}
                    </span>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded"
                      style={{ backgroundColor: priority.bg, color: priority.color }}>
                      {priority.label}
                    </span>
                  </div>
                  <p className="text-xs mb-2" style={{ color: "var(--cm-text-2, #64748b)" }}>
                    {signal.description}
                  </p>
                  <div className="flex items-center gap-1.5">
                    <Lightbulb className="w-3 h-3" style={{ color: config.color }} />
                    <span className="text-xs font-medium" style={{ color: config.color }}>
                      {signal.recommendation}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default RecruitingIntelligence;

import { AlertTriangle } from "lucide-react";
import { PRIORITY_ICON, PRIORITY_COLOR, SEVERITY_LABEL, SEVERITY_BG } from "./constants";

export function SignalCard({ signal }) {
  const Icon = PRIORITY_ICON[signal.priority] || AlertTriangle;
  const color = PRIORITY_COLOR[signal.priority] || "#64748b";
  const label = SEVERITY_LABEL[signal.priority] || "";
  const badgeBg = SEVERITY_BG[signal.priority] || "";
  return (
    <div className="flex items-start gap-3 py-2.5" data-testid={`signal-${signal.id}`}>
      <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5" style={{ backgroundColor: `${color}15` }}>
        <Icon className="w-3.5 h-3.5" style={{ color }} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-xs font-semibold" style={{ color: "var(--cm-text, #1e293b)" }}>{signal.title}</p>
          <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full" style={{ backgroundColor: badgeBg, color }} data-testid={`signal-severity-${signal.id}`}>
            {label}
          </span>
        </div>
        <p className="text-[11px] mt-0.5" style={{ color: "var(--cm-text-3, #94a3b8)" }}>{signal.description}</p>
        {signal.recommendation && (
          <p className="text-[11px] mt-1 font-medium" style={{ color }}>&#8594; {signal.recommendation}</p>
        )}
      </div>
    </div>
  );
}

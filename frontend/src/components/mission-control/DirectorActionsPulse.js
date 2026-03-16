import { Send, AlertTriangle, Eye, CheckCircle2 } from "lucide-react";

function Stat({ value, label, color, icon: Icon }) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-lg min-w-0" style={{ backgroundColor: `${color}08` }}>
      <Icon className="w-3.5 h-3.5 flex-shrink-0" style={{ color }} />
      <span className="text-base font-bold tabular-nums" style={{ color }}>{value}</span>
      <span className="text-[10px] font-medium whitespace-nowrap" style={{ color: "var(--cm-text-3)" }}>{label}</span>
    </div>
  );
}

export default function DirectorActionsPulse({ outboxSummary }) {
  if (!outboxSummary) return null;

  const { awaiting_response, critical_pending, in_progress, resolved_this_week } = outboxSummary;
  const allClear = awaiting_response === 0 && in_progress === 0;
  const hasActivity = awaiting_response > 0 || critical_pending > 0 || in_progress > 0 || resolved_this_week > 0;

  // Insight text — priority: critical > awaiting > in progress > resolved > empty
  let insight = "";
  let insightColor = "var(--cm-text-3)";
  if (critical_pending > 0) {
    insight = `${critical_pending} critical escalation${critical_pending > 1 ? "s" : ""} unacknowledged by coach`;
    insightColor = "#ef4444";
  } else if (awaiting_response > 0) {
    insight = `${awaiting_response} request${awaiting_response > 1 ? "s" : ""} awaiting coach response`;
    insightColor = "#f59e0b";
  } else if (in_progress > 0) {
    insight = `All outbound actions acknowledged — ${in_progress} in progress`;
  } else if (resolved_this_week > 0) {
    insight = "Coaches are responsive — all recent actions resolved";
  } else {
    insight = "No active outbound actions";
  }

  if (!hasActivity) return null;

  const borderColor = critical_pending > 0
    ? "rgba(239,68,68,0.2)"
    : awaiting_response > 0
      ? "rgba(245,158,11,0.15)"
      : "var(--cm-border)";

  return (
    <div data-testid="your-outbox-pulse">
      <div className="flex items-center gap-2 mb-2">
        <Send className="w-3 h-3" style={{ color: "var(--cm-text-3)" }} />
        <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--cm-text-3)" }}>
          Your Outbox
        </span>
      </div>
      <div
        className="rounded-xl border px-4 py-3"
        style={{ backgroundColor: "var(--cm-surface)", borderColor }}
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center sm:gap-2">
            <Stat value={awaiting_response} label="Awaiting Response" color="#f59e0b" icon={Send} />
            {critical_pending > 0 && (
              <Stat value={critical_pending} label="Critical Pending" color="#ef4444" icon={AlertTriangle} />
            )}
            <Stat value={in_progress} label="In Progress" color="#3b82f6" icon={Eye} />
            <Stat value={resolved_this_week} label="Resolved This Week" color="#10b981" icon={CheckCircle2} />
          </div>
          <span className="text-[11px] font-medium" style={{ color: insightColor }}>
            {insight}
          </span>
        </div>
      </div>
    </div>
  );
}

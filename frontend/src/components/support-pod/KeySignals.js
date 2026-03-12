import { AlertTriangle, Zap, Eye, CheckCircle } from "lucide-react";

const TYPE_ICON = {
  alert: AlertTriangle,
  warning: Zap,
  insight: Eye,
  positive: CheckCircle,
};

const TYPE_DOT = {
  alert: "bg-red-400",
  warning: "bg-amber-400",
  insight: "bg-blue-400",
  positive: "bg-emerald-400",
};

function KeySignals({ signals }) {
  if (!signals || signals.length === 0) return null;

  const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  const sorted = [...signals].sort((a, b) => (priorityOrder[a.priority] ?? 9) - (priorityOrder[b.priority] ?? 9));

  return (
    <div className="rounded-2xl border border-slate-100 bg-white divide-y divide-slate-50 overflow-hidden" data-testid="key-signals">
      {sorted.map((signal) => {
        const dot = TYPE_DOT[signal.type] || TYPE_DOT.insight;

        return (
          <div key={signal.id} className="px-4 py-3" data-testid={`signal-${signal.id}`}>
            <div className="flex items-start gap-3">
              <span className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${dot}`} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-800">{signal.title}</p>
                <p className="text-[12px] text-slate-400 mt-0.5 leading-relaxed">{signal.description}</p>
                {signal.recommendation && (
                  <p className="text-[12px] text-slate-500 mt-1 font-medium">{signal.recommendation}</p>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default KeySignals;

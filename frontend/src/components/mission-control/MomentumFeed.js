import { CheckCircle2, AlertCircle, Mail, Calendar, ArrowRight } from "lucide-react";

function MomentumFeed({ signals }) {
  if (!signals || signals.length === 0) return null;

  const getIcon = (iconName, sentiment) => {
    const colorClass = sentiment === "positive" ? "text-emerald-500" : sentiment === "negative" ? "text-red-500" : "text-slate-400";
    switch (iconName) {
      case "mail": return <Mail className={`w-3.5 h-3.5 ${colorClass}`} />;
      case "calendar": return <Calendar className={`w-3.5 h-3.5 ${colorClass}`} />;
      case "alert": return <AlertCircle className={`w-3.5 h-3.5 ${colorClass}`} />;
      case "arrow-right": return <ArrowRight className={`w-3.5 h-3.5 ${colorClass}`} />;
      default: return <CheckCircle2 className={`w-3.5 h-3.5 ${colorClass}`} />;
    }
  };

  const getTimeLabel = (hoursAgo) => {
    if (hoursAgo < 1) return "now";
    if (hoursAgo < 2) return "1h";
    if (hoursAgo < 24) return `${Math.floor(hoursAgo)}h`;
    return "1d";
  };

  return (
    <section data-testid="momentum-feed-section">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.1em]">Live Feed</span>
        <button className="text-[11px] text-primary hover:underline font-medium" data-testid="view-all-activity">
          View all
        </button>
      </div>

      <div className="bg-white rounded-lg overflow-hidden divide-y divide-slate-50">
        {signals.map((signal) => (
          <div
            key={signal.id}
            data-testid={`momentum-signal-${signal.id}`}
            className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50/50 transition-colors cursor-pointer"
          >
            <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
              signal.sentiment === "positive" ? "bg-emerald-50" :
              signal.sentiment === "negative" ? "bg-red-50" : "bg-slate-50"
            }`}>
              {getIcon(signal.icon, signal.sentiment)}
            </div>

            <div className="flex-1 min-w-0 flex items-baseline gap-2">
              <span className="text-xs font-semibold text-slate-700 shrink-0">{signal.athleteName}</span>
              <span className="text-xs text-slate-500 truncate">{signal.description}</span>
            </div>

            <span className="text-[10px] text-slate-400 font-mono shrink-0">{getTimeLabel(signal.hoursAgo)}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

export default MomentumFeed;

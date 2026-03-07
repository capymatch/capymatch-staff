import { CheckCircle2, AlertCircle, Mail, Calendar, ArrowRight } from "lucide-react";

const ICON_MAP = {
  mail: Mail,
  calendar: Calendar,
  alert: AlertCircle,
  "arrow-right": ArrowRight,
};

const SENTIMENT_STYLES = {
  positive: { dot: "bg-emerald-50", icon: "text-emerald-500" },
  negative: { dot: "bg-red-50", icon: "text-red-500" },
  neutral: { dot: "bg-slate-50", icon: "text-slate-400" },
};

export default function ActivityFeed({ items = [], title = "Recent Activity" }) {
  if (!items.length) {
    return (
      <section data-testid="activity-feed">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">{title}</span>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-8 text-center">
          <p className="text-sm text-slate-400">No recent activity</p>
        </div>
      </section>
    );
  }

  const getTimeLabel = (hoursAgo) => {
    if (hoursAgo < 1) return "now";
    if (hoursAgo < 2) return "1h ago";
    if (hoursAgo < 24) return `${Math.floor(hoursAgo)}h ago`;
    return "1d ago";
  };

  return (
    <section data-testid="activity-feed">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">{title}</span>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        {items.map((item, idx) => {
          const style = SENTIMENT_STYLES[item.sentiment] || SENTIMENT_STYLES.neutral;
          const Icon = ICON_MAP[item.icon] || CheckCircle2;

          return (
            <div
              key={item.id || idx}
              data-testid={`activity-item-${item.id || idx}`}
              className={`flex items-center gap-3 px-5 py-3 hover:bg-slate-50/40 transition-colors ${
                idx < items.length - 1 ? "border-b border-gray-50" : ""
              }`}
            >
              <div className={`w-7 h-7 rounded-full ${style.dot} flex items-center justify-center shrink-0`}>
                <Icon className={`w-3.5 h-3.5 ${style.icon}`} />
              </div>

              <div className="flex-1 min-w-0 flex items-baseline gap-2">
                <span className="text-xs font-semibold text-slate-700 shrink-0">{item.athleteName}</span>
                <span className="text-xs text-slate-500 truncate">{item.description}</span>
              </div>

              <span className="text-[10px] text-slate-300 font-medium shrink-0">
                {getTimeLabel(item.hoursAgo)}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

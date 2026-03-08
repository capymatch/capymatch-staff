import { TrendingUp, TrendingDown, Minus, Flame, Mail, FileText } from "lucide-react";

export default function RecruitingSignalsCard({ signals }) {
  if (!signals) return null;

  const items = [
    {
      value: signals.schoolInterests || 0,
      label: "New school interests",
      icon: Flame,
      color: "text-orange-500",
      bg: "bg-orange-50",
      trend: "up",
      delta: "+6 this week",
    },
    {
      value: signals.newRecommendations || 0,
      label: "Recommendations sent",
      icon: Mail,
      color: "text-blue-500",
      bg: "bg-blue-50",
      trend: "flat",
      delta: "same as last week",
    },
    {
      value: signals.coachNotes || 0,
      label: "Coach notes logged",
      icon: FileText,
      color: "text-violet-500",
      bg: "bg-violet-50",
      trend: "up",
      delta: "+12 this week",
    },
  ];

  const TrendIcon = { up: TrendingUp, down: TrendingDown, flat: Minus };
  const trendColor = { up: "text-emerald-500", down: "text-red-400", flat: "text-slate-400" };
  const trendArrow = { up: "\u2191", down: "\u2193", flat: "\u2192" };

  const hasSignals = items.some((i) => i.value > 0);

  return (
    <section data-testid="recruiting-signals-card">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Recruiting Signals</span>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden shadow-sm">
        {hasSignals ? (
          <div className="grid grid-cols-3 divide-x divide-gray-100">
            {items.map((item, idx) => {
              const arrowColor = trendColor[item.trend] || trendColor.flat;
              const arrow = trendArrow[item.trend] || "\u2192";
              return (
                <div key={idx} className="px-6 py-6 text-center" data-testid={`signal-item-${idx}`}>
                  {/* Big prominent number */}
                  <p className="text-4xl font-extrabold text-slate-900 tracking-tight leading-none">{item.value}</p>

                  {/* Label */}
                  <p className="text-sm text-slate-500 mt-2">{item.label}</p>

                  {/* Trend with arrow */}
                  <div className="flex items-center justify-center gap-1.5 mt-3">
                    <span className={`text-sm font-semibold ${arrowColor}`}>{arrow}</span>
                    <span className={`text-xs font-medium ${arrowColor}`}>{item.delta}</span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="px-6 py-8 text-center">
            <TrendingUp className="w-5 h-5 text-slate-300 mx-auto mb-2" />
            <p className="text-sm text-slate-400">No new recruiting signals this week</p>
          </div>
        )}
      </div>
    </section>
  );
}

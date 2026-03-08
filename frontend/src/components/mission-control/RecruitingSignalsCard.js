import { TrendingUp, TrendingDown, Minus, Flame, Mail, FileText } from "lucide-react";

export default function RecruitingSignalsCard({ signals }) {
  if (!signals) return null;

  const items = [
    {
      value: signals.schoolInterests || 0,
      label: "new school interests this week",
      icon: Flame,
      color: "text-orange-500",
      bg: "bg-orange-50",
      trend: "up",
      show: true,
    },
    {
      value: signals.newRecommendations || 0,
      label: "recommendations sent",
      icon: Mail,
      color: "text-blue-500",
      bg: "bg-blue-50",
      trend: "flat",
      show: true,
    },
    {
      value: signals.coachNotes || 0,
      label: "coach notes logged",
      icon: FileText,
      color: "text-violet-500",
      bg: "bg-violet-50",
      trend: "up",
      show: true,
    },
  ];

  const TrendIcon = { up: TrendingUp, down: TrendingDown, flat: Minus };
  const trendColor = { up: "text-emerald-500", down: "text-red-400", flat: "text-slate-300" };

  const hasSignals = items.some((i) => i.value > 0);

  return (
    <section data-testid="recruiting-signals-card">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Recruiting Signals</span>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden shadow-sm">
        {hasSignals ? (
          <div className="px-6 py-5 space-y-4">
            {items.map((item, idx) => {
              const Icon = item.icon;
              const Arrow = TrendIcon[item.trend] || Minus;
              const arrowColor = trendColor[item.trend] || trendColor.flat;
              return (
                <div key={idx} className="flex items-center gap-3" data-testid={`signal-item-${idx}`}>
                  <div className={`w-8 h-8 rounded-lg ${item.bg} flex items-center justify-center shrink-0`}>
                    <Icon className={`w-4 h-4 ${item.color}`} />
                  </div>
                  <p className="text-sm text-slate-600 flex-1">
                    <span className="font-bold text-slate-800">{item.value}</span>{" "}
                    {item.label}
                  </p>
                  <Arrow className={`w-4 h-4 shrink-0 ${arrowColor}`} />
                </div>
              );
            })}
            {signals.hotInterests > 0 && (
              <p className="text-xs text-slate-400 pl-11">
                Including {signals.hotInterests} hot interest{signals.hotInterests > 1 ? "s" : ""}
              </p>
            )}
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

import { Users, TrendingUp, Calendar, Target } from "lucide-react";

function ProgramSnapshot({ snapshot }) {
  const stats = [
    { label: "Athletes", value: snapshot.totalAthletes || 0, icon: Users, color: "text-blue-600" },
    { label: "Need attention", value: snapshot.needingAttention || 0, icon: Target, color: "text-orange-600" },
    { label: "Positive momentum", value: snapshot.positiveMomentum || 0, icon: TrendingUp, color: "text-emerald-600" },
    { label: "Events ahead", value: snapshot.upcomingEvents || 0, icon: Calendar, color: "text-purple-600" },
  ];

  return (
    <section data-testid="program-snapshot-section">
      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.1em]">Program</span>

      <div className="bg-white rounded-lg mt-3 p-4 space-y-3">
        {stats.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div key={i} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Icon className={`w-4 h-4 ${stat.color}`} />
                <span className="text-xs text-slate-500">{stat.label}</span>
              </div>
              <span className="text-sm font-bold text-slate-800">{stat.value}</span>
            </div>
          );
        })}

        {/* Compact grad year breakdown */}
        {snapshot.byGradYear && (
          <div className="pt-2 border-t border-slate-50">
            <div className="flex items-center gap-3 text-[11px]">
              {Object.entries(snapshot.byGradYear).map(([year, count]) => (
                <span key={year} className="text-slate-400">
                  <span className="font-semibold text-slate-600">{year}:</span> {count}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

export default ProgramSnapshot;

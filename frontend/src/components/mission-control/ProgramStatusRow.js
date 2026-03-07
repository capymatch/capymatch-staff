import { Users, Calendar, AlertTriangle, UserX, TrendingUp } from "lucide-react";

export default function ProgramStatusRow({ status }) {
  if (!status) return null;

  const pills = [
    {
      label: "Athletes",
      value: status.totalAthletes || 0,
      icon: Users,
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      label: "Coaches",
      value: status.activeCoaches || 0,
      icon: TrendingUp,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
    },
    {
      label: "Unassigned",
      value: status.unassignedCount || 0,
      icon: UserX,
      color: status.unassignedCount > 0 ? "text-red-600" : "text-slate-500",
      bg: status.unassignedCount > 0 ? "bg-red-50" : "bg-slate-50",
      alert: status.unassignedCount > 0,
    },
    {
      label: "Need Attention",
      value: status.needingAttention || 0,
      icon: AlertTriangle,
      color: status.needingAttention > 0 ? "text-amber-600" : "text-slate-500",
      bg: status.needingAttention > 0 ? "bg-amber-50" : "bg-slate-50",
      alert: status.needingAttention > 3,
    },
    {
      label: "Events",
      value: status.upcomingEvents || 0,
      icon: Calendar,
      color: "text-violet-600",
      bg: "bg-violet-50",
    },
  ];

  return (
    <section data-testid="program-status-row">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {pills.map((pill) => {
          const Icon = pill.icon;
          return (
            <div
              key={pill.label}
              data-testid={`status-pill-${pill.label.toLowerCase().replace(/\s/g, "-")}`}
              className="flex items-center gap-3 bg-white rounded-xl px-4 py-3.5 border border-gray-100 transition-all hover:border-gray-200 hover:shadow-sm"
            >
              <div className={`w-8 h-8 rounded-lg ${pill.bg} flex items-center justify-center shrink-0`}>
                <Icon className={`w-4 h-4 ${pill.color}`} />
              </div>
              <div className="min-w-0">
                <p className="text-lg font-bold text-slate-900 leading-none tracking-tight">
                  {pill.value}
                </p>
                <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider mt-0.5">
                  {pill.label}
                </p>
              </div>
              {pill.alert && (
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse ml-auto shrink-0" />
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

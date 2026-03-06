import { Users, TrendingUp, Calendar, Target } from "lucide-react";

function ProgramSnapshot({ snapshot }) {
  const stats = [
    {
      label: 'Total Athletes',
      value: snapshot.totalAthletes || 0,
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      label: 'Needing Attention',
      value: snapshot.needingAttention || 0,
      icon: Target,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
    },
    {
      label: 'Positive Momentum',
      value: snapshot.positiveMomentum || 0,
      icon: TrendingUp,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
    },
    {
      label: 'Upcoming Events',
      value: snapshot.upcomingEvents || 0,
      icon: Calendar,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
  ];

  return (
    <section className="space-y-4" data-testid="program-snapshot-section">
      <h2 className="text-xl font-bold tracking-tight" style={{fontFamily: 'Manrope'}}>
        Program Snapshot
      </h2>

      <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm space-y-4">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div key={index} className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className={`w-10 h-10 ${stat.bgColor} rounded-lg flex items-center justify-center flex-shrink-0`}>
                  <Icon className={`w-5 h-5 ${stat.color}`} />
                </div>
                <span className="text-sm font-medium text-gray-700">{stat.label}</span>
              </div>
              <span className="text-2xl font-bold" style={{fontFamily: 'Manrope'}}>
                {stat.value}
              </span>
            </div>
          );
        })}
      </div>

      {/* Grad Year Breakdown */}
      {snapshot.byGradYear && Object.keys(snapshot.byGradYear).length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">By Grad Year</h3>
          <div className="space-y-3">
            {Object.entries(snapshot.byGradYear).map(([year, count]) => (
              <div key={year} className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Class of {year}</span>
                <span className="font-semibold text-gray-900">{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stage Breakdown */}
      {snapshot.byStage && Object.keys(snapshot.byStage).length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">By Stage</h3>
          <div className="space-y-3">
            {Object.entries(snapshot.byStage).map(([stage, count]) => {
              const stageLabels = {
                exploring: 'Exploring',
                actively_recruiting: 'Active',
                narrowing: 'Narrowing',
              };
              return (
                <div key={stage} className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">{stageLabels[stage] || stage}</span>
                  <span className="font-semibold text-gray-900">{count}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}

export default ProgramSnapshot;

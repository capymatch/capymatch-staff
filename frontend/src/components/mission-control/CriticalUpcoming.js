import { Calendar, MapPin, Users, CheckCircle2, Clock, AlertCircle } from "lucide-react";

function CriticalUpcoming({ events }) {
  if (!events || events.length === 0) return null;

  const getDateLabel = (daysAway) => {
    if (daysAway === 0) return "Today";
    if (daysAway === 1) return "Tomorrow";
    return `${daysAway}d`;
  };

  const getStatusDot = (status) => {
    switch (status) {
      case "ready": return <span className="flex items-center gap-1 text-emerald-600 text-[10px] font-semibold"><CheckCircle2 className="w-3 h-3" />Ready</span>;
      case "in_progress": return <span className="flex items-center gap-1 text-amber-600 text-[10px] font-semibold"><Clock className="w-3 h-3" />In Progress</span>;
      default: return <span className="flex items-center gap-1 text-red-600 text-[10px] font-semibold"><AlertCircle className="w-3 h-3" />Not Started</span>;
    }
  };

  return (
    <section data-testid="critical-upcoming-section">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.1em]">Events Ahead</span>
        <span className="text-[10px] text-slate-400 uppercase tracking-wider font-medium">Next 14 days</span>
      </div>

      <div className="bg-white rounded-lg overflow-hidden divide-y divide-slate-50">
        {events.map((event) => (
          <div
            key={event.id}
            data-testid={`event-card-${event.id}`}
            className="flex items-center gap-4 px-4 py-3 hover:bg-slate-50/50 transition-colors cursor-pointer"
          >
            <div className="w-10 text-center shrink-0">
              <span className={`text-lg font-bold ${event.daysAway <= 2 ? "text-red-600" : "text-slate-700"}`}>
                {event.daysAway}
              </span>
              <p className="text-[9px] uppercase text-slate-400 font-medium tracking-wider">days</p>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-sm font-semibold text-slate-800">{event.name}</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 font-medium">{event.type}</span>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-slate-400">
                <span className="flex items-center gap-0.5"><MapPin className="w-3 h-3" />{event.location}</span>
                <span>·</span>
                <span>{event.athleteCount} athletes</span>
                <span>·</span>
                <span>{event.expectedSchools} schools</span>
              </div>
            </div>

            <div className="shrink-0">{getStatusDot(event.prepStatus)}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

export default CriticalUpcoming;

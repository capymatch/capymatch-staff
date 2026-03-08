import { Calendar, MapPin, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

function getDateLabel(daysAway) {
  if (daysAway === 0) return "Today";
  if (daysAway === 1) return "Tomorrow";
  if (daysAway < 7) return `${daysAway} days`;
  return `${Math.floor(daysAway / 7)} week${daysAway >= 14 ? "s" : ""}`;
}

function getReadiness(event) {
  const checklist = event.checklist || [];
  if (!checklist.length) return null;
  const done = checklist.filter((c) => c.completed).length;
  const pct = Math.round((done / checklist.length) * 100);
  return { pct, done, total: checklist.length };
}

export default function UpcomingEventsCard({ events = [] }) {
  const navigate = useNavigate();

  if (!events.length) {
    return (
      <section data-testid="upcoming-events-card">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Upcoming Events</span>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-8 text-center">
          <Calendar className="w-5 h-5 text-slate-300 mx-auto mb-2" />
          <p className="text-sm text-slate-400">No upcoming events</p>
        </div>
      </section>
    );
  }

  return (
    <section data-testid="upcoming-events-card">
      <div className="flex items-center justify-between mb-4">
        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Upcoming Events</span>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden divide-y divide-gray-50">
        {events.map((event) => {
          const readiness = getReadiness(event);
          const timeLabel = getDateLabel(event.daysAway);
          const urgent = event.daysAway <= 2;

          return (
            <div
              key={event.id}
              data-testid={`event-row-${event.id}`}
              onClick={() => navigate(`/events/${event.id}/prep`)}
              className="flex items-center gap-4 px-5 py-4 cursor-pointer hover:bg-slate-50/60 transition-colors group"
            >
              {/* Event info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-sm font-semibold text-slate-800 group-hover:text-slate-900 transition-colors truncate">
                    {event.name}
                  </span>
                  <span className={`text-xs font-semibold ${urgent ? "text-red-500" : "text-slate-400"}`}>
                    — {timeLabel}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-[11px] text-slate-400">
                  <span className="flex items-center gap-0.5">
                    <MapPin className="w-3 h-3" />
                    {event.location}
                  </span>
                  <span>{event.athleteCount || event.athlete_ids?.length || 0} athletes</span>
                  <span>{event.expectedSchools} schools</span>
                  {readiness && (
                    <span className={readiness.pct < 50 ? "text-amber-500 font-medium" : "text-emerald-500"}>
                      {readiness.pct}% ready
                    </span>
                  )}
                </div>
              </div>

              <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 transition-colors shrink-0" />
            </div>
          );
        })}
      </div>
    </section>
  );
}

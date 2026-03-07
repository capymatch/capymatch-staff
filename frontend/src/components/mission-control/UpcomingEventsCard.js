import { Calendar, MapPin, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

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

  const getDateLabel = (daysAway) => {
    if (daysAway === 0) return "Today";
    if (daysAway === 1) return "Tomorrow";
    return `${daysAway}d`;
  };

  return (
    <section data-testid="upcoming-events-card">
      <div className="flex items-center justify-between mb-4">
        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Upcoming Events</span>
        <button
          onClick={() => navigate("/events")}
          className="text-[11px] text-primary hover:underline font-medium"
          data-testid="view-all-events"
        >
          View all
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden divide-y divide-gray-50">
        {events.map((event) => (
          <div
            key={event.id}
            data-testid={`event-row-${event.id}`}
            onClick={() => navigate(`/events/${event.id}/prep`)}
            className="flex items-center gap-4 px-5 py-4 cursor-pointer hover:bg-slate-50/60 transition-colors group"
          >
            {/* Days countdown */}
            <div className="w-12 text-center shrink-0">
              <span className={`text-xl font-bold tracking-tight ${
                event.daysAway <= 2 ? "text-red-600" : event.daysAway <= 5 ? "text-amber-600" : "text-slate-700"
              }`}>
                {getDateLabel(event.daysAway)}
              </span>
              {event.daysAway > 1 && (
                <p className="text-[9px] uppercase text-slate-400 font-medium tracking-wider">away</p>
              )}
            </div>

            {/* Event info */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-800 group-hover:text-primary transition-colors truncate">
                {event.name}
              </p>
              <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-400">
                <span className="flex items-center gap-0.5">
                  <MapPin className="w-3 h-3" />
                  {event.location}
                </span>
                <span className="text-slate-200">|</span>
                <span>{event.athleteCount} athletes</span>
                <span className="text-slate-200">|</span>
                <span>{event.expectedSchools} schools</span>
              </div>
            </div>

            <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 transition-colors shrink-0" />
          </div>
        ))}
      </div>
    </section>
  );
}

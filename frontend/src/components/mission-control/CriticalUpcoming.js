import { Calendar, MapPin, Users, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

function CriticalUpcoming({ events }) {
  if (!events || events.length === 0) {
    return (
      <section className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm" data-testid="critical-upcoming-section">
        <h2 className="text-xl font-bold tracking-tight mb-4" style={{fontFamily: 'Manrope'}}>
          Critical Upcoming
        </h2>
        <p className="text-gray-500 text-sm text-center py-8">
          No events scheduled in the next two weeks.
        </p>
      </section>
    );
  }

  const getDateLabel = (daysAway) => {
    if (daysAway === 0) return 'Today';
    if (daysAway === 1) return 'Tomorrow';
    if (daysAway <= 7) return `${daysAway} days away`;
    return `${daysAway} days away`;
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'ready':
        return (
          <span className="inline-flex items-center space-x-1 bg-emerald-50 text-emerald-700 border border-emerald-100 px-2 py-0.5 rounded-full text-xs font-medium">
            <CheckCircle2 className="w-3 h-3" />
            <span>Ready</span>
          </span>
        );
      case 'in_progress':
        return (
          <span className="inline-flex items-center space-x-1 bg-amber-50 text-amber-700 border border-amber-100 px-2 py-0.5 rounded-full text-xs font-medium">
            <Clock className="w-3 h-3" />
            <span>In Progress</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center space-x-1 bg-red-50 text-red-700 border border-red-100 px-2 py-0.5 rounded-full text-xs font-medium">
            <AlertCircle className="w-3 h-3" />
            <span>Not Started</span>
          </span>
        );
    }
  };

  const getEventTypeBadge = (type) => {
    const types = {
      tournament: { label: 'Tournament', color: 'bg-blue-100 text-blue-700 border-blue-200' },
      showcase: { label: 'Showcase', color: 'bg-purple-100 text-purple-700 border-purple-200' },
      camp: { label: 'Camp', color: 'bg-green-100 text-green-700 border-green-200' },
    };
    const typeInfo = types[type] || types.tournament;
    return (
      <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${typeInfo.color}`}>
        {typeInfo.label}
      </span>
    );
  };

  return (
    <section className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm" data-testid="critical-upcoming-section">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold tracking-tight" style={{fontFamily: 'Manrope'}}>
          Critical Upcoming
        </h2>
        <span className="text-xs text-gray-500 uppercase tracking-wider font-semibold">
          Next 14 Days
        </span>
      </div>

      <div className="space-y-3">
        {events.map((event) => (
          <div
            key={event.id}
            data-testid={`event-card-${event.id}`}
            className="flex items-start justify-between p-4 rounded-lg border border-gray-100 hover:border-primary/30 hover:bg-gray-50 transition-all cursor-pointer group"
          >
            <div className="flex items-start space-x-3 flex-1">
              <div className="flex-shrink-0 w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                <Calendar className="w-5 h-5 text-primary" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2 mb-1">
                  <h3 className="font-semibold text-gray-900 text-sm group-hover:text-primary transition-colors">
                    {event.name}
                  </h3>
                  {getEventTypeBadge(event.type)}
                </div>

                <div className="flex items-center space-x-3 text-xs text-gray-500 mb-2">
                  <span className="flex items-center space-x-1">
                    <MapPin className="w-3 h-3" />
                    <span>{event.location}</span>
                  </span>
                  <span>•</span>
                  <span>{getDateLabel(event.daysAway)}</span>
                </div>

                <div className="flex items-center space-x-3 text-xs">
                  <span className="text-gray-600">
                    <Users className="w-3 h-3 inline mr-1" />
                    {event.athleteCount} athletes
                  </span>
                  <span className="text-gray-400">•</span>
                  <span className="text-gray-600">{event.expectedSchools} schools expected</span>
                </div>
              </div>
            </div>

            <div className="flex-shrink-0 ml-4">
              {getStatusBadge(event.prepStatus)}
            </div>
          </div>
        ))}
      </div>

      <Button 
        variant="outline" 
        className="w-full mt-4 rounded-full font-medium text-sm"
        data-testid="view-all-events"
      >
        View All Events
      </Button>
    </section>
  );
}

export default CriticalUpcoming;

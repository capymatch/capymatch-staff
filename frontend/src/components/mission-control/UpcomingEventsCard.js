import { Calendar, MapPin, ChevronRight, Users, AlertTriangle, CheckCircle2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

function getDateLabel(daysAway) {
  if (daysAway === 0) return "Today";
  if (daysAway === 1) return "Tomorrow";
  if (daysAway < 0) return "Past";
  if (daysAway < 7) return `In ${daysAway} days`;
  return `In ${Math.floor(daysAway / 7)} week${daysAway >= 14 ? "s" : ""}`;
}

function getReadiness(event) {
  const checklist = event.checklist || [];
  if (!checklist.length) return null;
  const done = checklist.filter(c => c.completed).length;
  return Math.round((done / checklist.length) * 100);
}

function ProgressBar({ pct }) {
  const color = pct < 50 ? "#f59e0b" : pct < 80 ? "#3b82f6" : "#10b981";
  return (
    <div className="flex items-center gap-2 shrink-0">
      <div className="w-16 h-1.5 rounded-full" style={{ backgroundColor: "var(--cm-surface-2)" }}>
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <span className="text-[10px] font-semibold" style={{ color }}>{pct}%</span>
    </div>
  );
}

export default function UpcomingEventsCard({ events = [], roster = [] }) {
  const navigate = useNavigate();

  // Build a lookup: athlete_id -> roster item
  const rosterMap = {};
  for (const a of roster) { rosterMap[a.id] = a; }

  if (!events.length) {
    return (
      <section data-testid="upcoming-events-card">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-[11px] font-bold uppercase tracking-widest" style={{ color: "var(--cm-text-3)" }}>Upcoming Events</span>
        </div>
        <div className="rounded-xl border p-8 text-center" style={{ backgroundColor: "var(--cm-surface)", borderColor: "var(--cm-border)" }}>
          <Calendar className="w-5 h-5 mx-auto mb-2" style={{ color: "var(--cm-text-3)" }} />
          <p className="text-sm" style={{ color: "var(--cm-text-3)" }}>No upcoming events</p>
        </div>
      </section>
    );
  }

  return (
    <section data-testid="upcoming-events-card">
      <div className="flex items-center justify-between mb-4">
        <span className="text-[11px] font-bold uppercase tracking-widest" style={{ color: "var(--cm-text-3)" }}>Upcoming Events</span>
      </div>

      <div className="space-y-3">
        {events.map(event => {
          const readiness = getReadiness(event);
          const timeLabel = getDateLabel(event.daysAway);
          const urgent = event.daysAway >= 0 && event.daysAway <= 2;
          const isPast = event.daysAway < 0;

          // Cross-reference athletes attending with roster
          const attendingAthletes = (event.athlete_ids || []).map(id => rosterMap[id]).filter(Boolean);
          const athletesWithIssues = attendingAthletes.filter(a => a.category);
          const needsOutreach = attendingAthletes.filter(a =>
            a.category === "momentum_drop" || a.category === "engagement_drop" ||
            (a.days_since_activity && a.days_since_activity > 14)
          );

          // Checklist items not done
          const checklistTotal = (event.checklist || []).length;
          const checklistDone = (event.checklist || []).filter(c => c.completed).length;
          const checklistRemaining = checklistTotal - checklistDone;

          return (
            <div
              key={event.id}
              data-testid={`event-row-${event.id}`}
              className="rounded-xl border overflow-hidden cursor-pointer hover:shadow-sm transition-shadow group"
              style={{ backgroundColor: "var(--cm-surface)", borderColor: "var(--cm-border)", opacity: isPast ? 0.6 : 1 }}
              onClick={() => navigate(`/events/${event.id}/prep`)}
            >
              {/* Event header */}
              <div className="flex items-center justify-between px-3 sm:px-5 py-3 sm:py-3.5" style={{ borderBottom: "1px solid var(--cm-border)" }}>
                <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                  <div className={`w-2 h-8 rounded-full flex-shrink-0 ${urgent ? "bg-red-500 animate-pulse" : isPast ? "bg-gray-300" : "bg-emerald-500"}`} />
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 sm:gap-2">
                      <span className="text-xs sm:text-sm font-semibold truncate" style={{ color: "var(--cm-text)" }}>{event.name}</span>
                      <span className={`text-[10px] sm:text-xs font-semibold ${urgent ? "text-red-500" : "text-slate-400"}`}>{timeLabel}</span>
                    </div>
                    <div className="flex items-center gap-2 sm:gap-3 text-[10px] sm:text-[11px]" style={{ color: "var(--cm-text-3)" }}>
                      <span className="flex items-center gap-0.5 truncate">
                        <MapPin className="w-3 h-3 shrink-0" />{event.location}
                      </span>
                      <span className="hidden sm:inline">{event.expectedSchools} schools</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                  {readiness != null && <span className="hidden sm:block"><ProgressBar pct={readiness} /></span>}
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" style={{ color: "var(--cm-text-3)" }} />
                </div>
              </div>

              {/* Athlete readiness details */}
              {attendingAthletes.length > 0 && !isPast && (
                <div className="px-3 sm:px-5 py-2 sm:py-3 space-y-2">
                  {/* Athletes summary row */}
                  <div className="flex items-center gap-3 sm:gap-4 text-[10px] sm:text-[11px] flex-wrap" style={{ color: "var(--cm-text-3)" }}>
                    <span className="flex items-center gap-1.5">
                      <Users className="w-3 h-3" />
                      <span className="font-semibold" style={{ color: "var(--cm-text-2)" }}>
                        {attendingAthletes.length} athletes
                      </span>
                    </span>
                    {athletesWithIssues.length > 0 && (
                      <span className="flex items-center gap-1 text-amber-600 font-medium">
                        <AlertTriangle className="w-3 h-3" />
                        {athletesWithIssues.length} need attention
                      </span>
                    )}
                    {checklistRemaining > 0 && (
                      <span className="flex items-center gap-1 font-medium hidden sm:flex" style={{ color: "var(--cm-text-3)" }}>
                        <CheckCircle2 className="w-3 h-3" />
                        {checklistRemaining} prep left
                      </span>
                    )}
                  </div>

                  {/* Athletes with issues — show names */}
                  {needsOutreach.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {needsOutreach.slice(0, 4).map(a => (
                        <span key={a.id} className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium"
                          style={{ backgroundColor: "rgba(245,158,11,0.08)", color: "#f59e0b", border: "1px solid rgba(245,158,11,0.15)" }}>
                          {a.name.split(" ")[0]} — {a.category ? a.category.replace(/_/g, " ") : "inactive " + a.days_since_activity + "d"}
                        </span>
                      ))}
                      {needsOutreach.length > 4 && (
                        <span className="text-[10px] px-2 py-0.5 font-medium" style={{ color: "var(--cm-text-3)" }}>
                          +{needsOutreach.length - 4} more
                        </span>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

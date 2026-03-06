import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import Header from "@/components/mission-control/Header";
import { toast } from "sonner";
import { Calendar, MapPin, Users, GraduationCap, ChevronRight, Plus, AlertCircle, Clock, CheckCircle2 } from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const URGENCY = {
  red: { bg: "bg-red-50 border-red-200", dot: "bg-red-500", text: "text-red-700" },
  yellow: { bg: "bg-amber-50 border-amber-200", dot: "bg-amber-500", text: "text-amber-700" },
  green: { bg: "bg-emerald-50 border-emerald-200", dot: "bg-emerald-500", text: "text-emerald-600" },
  gray: { bg: "bg-gray-50 border-gray-200", dot: "bg-gray-400", text: "text-gray-500" },
};

const PREP_BADGE = {
  not_started: { label: "Not Started", cls: "bg-red-100 text-red-700" },
  in_progress: { label: "In Progress", cls: "bg-amber-100 text-amber-700" },
  ready: { label: "Ready", cls: "bg-emerald-100 text-emerald-700" },
};

function formatTiming(daysAway) {
  if (daysAway < 0) return `${Math.abs(daysAway)}d ago`;
  if (daysAway === 0) return "TODAY";
  if (daysAway === 1) return "TOMORROW";
  if (daysAway <= 7) return `IN ${daysAway} DAYS`;
  return `IN ${daysAway}D`;
}

function EventCard({ event }) {
  const navigate = useNavigate();
  const u = URGENCY[event.urgency] || URGENCY.green;
  const prep = PREP_BADGE[event.prepStatus] || PREP_BADGE.not_started;
  const isPast = event.daysAway < 0 || event.status === "past";
  const needsDebrief = isPast && event.summaryStatus === "pending";

  const primaryAction = () => {
    if (needsDebrief) return navigate(`/events/${event.id}/summary`);
    if (isPast) return navigate(`/events/${event.id}/summary`);
    if (event.prepStatus === "ready") return navigate(`/events/${event.id}/live`);
    return navigate(`/events/${event.id}/prep`);
  };

  const primaryLabel = () => {
    if (needsDebrief) return "Write Summary";
    if (isPast) return "View Summary";
    if (event.daysAway <= 1) return "Go Live";
    if (event.prepStatus === "not_started") return "Start Prep";
    if (event.prepStatus === "in_progress") return "Continue Prep";
    return "Review Prep";
  };

  return (
    <div
      className={`border rounded-lg p-4 transition-all hover:shadow-sm ${u.bg} cursor-pointer`}
      onClick={primaryAction}
      data-testid={`event-card-${event.id}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`w-2 h-2 rounded-full ${u.dot}`} />
            <h3 className="font-semibold text-gray-900 text-sm truncate">{event.name}</h3>
            <span className={`text-[10px] font-bold tracking-wider ${u.text}`}>
              {formatTiming(event.daysAway)}
            </span>
          </div>
          <div className="flex items-center gap-3 text-xs text-gray-500">
            <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{event.location}</span>
            <span className="flex items-center gap-1"><Users className="w-3 h-3" />{event.athleteCount} athletes</span>
            <span className="flex items-center gap-1"><GraduationCap className="w-3 h-3" />{event.expectedSchools} schools</span>
          </div>
          <div className="flex items-center gap-2 mt-2">
            {!isPast && <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${prep.cls}`}>{prep.label}</span>}
            {isPast && event.capturedNotesCount > 0 && (
              <span className="text-[10px] text-gray-500">{event.capturedNotesCount} notes captured</span>
            )}
            {needsDebrief && (
              <span className="flex items-center gap-1 text-[10px] font-medium text-amber-600">
                <AlertCircle className="w-3 h-3" /> No summary yet
              </span>
            )}
          </div>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); primaryAction(); }}
          className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-white border border-gray-200 rounded-md hover:bg-gray-50 transition-colors shrink-0"
          data-testid={`event-action-${event.id}`}
        >
          {primaryLabel()} <ChevronRight className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}

function EventHome() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({ upcoming: [], past: [] });
  const [tab, setTab] = useState("upcoming");
  const [typeFilter, setTypeFilter] = useState("all");

  useEffect(() => {
    (async () => {
      try {
        const params = new URLSearchParams();
        if (typeFilter !== "all") params.set("type", typeFilter);
        const res = await axios.get(`${API}/events?${params}`);
        setData(res.data);
      } catch (err) {
        toast.error("Failed to load events");
      } finally {
        setLoading(false);
      }
    })();
  }, [typeFilter]);

  const events = tab === "upcoming" ? data.upcoming : data.past;

  // Group upcoming by timing
  const grouped = { today: [], thisWeek: [], later: [] };
  if (tab === "upcoming") {
    for (const e of events) {
      if (e.daysAway <= 1) grouped.today.push(e);
      else if (e.daysAway <= 7) grouped.thisWeek.push(e);
      else grouped.later.push(e);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50" data-testid="event-home-page">
      <Header selectedGradYear="all" setSelectedGradYear={() => {}} stats={null} />

      <main className="max-w-[1200px] mx-auto px-4 sm:px-6 py-6">
        {/* Title + Filters */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-lg font-semibold text-gray-900" data-testid="events-title">Events</h1>
            <p className="text-xs text-gray-500 mt-0.5">Capture recruiting moments. Organize later.</p>
          </div>
        </div>

        {/* Tab + Type filter */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5" data-testid="event-tabs">
            {["upcoming", "past"].map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                data-testid={`tab-${t}`}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                  tab === t ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {t === "upcoming" ? `Upcoming (${data.upcoming.length})` : `Past (${data.past.length})`}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              data-testid="type-filter"
              className="text-xs border border-gray-200 rounded-md px-2 py-1.5 bg-white text-gray-700"
            >
              <option value="all">All Types</option>
              <option value="showcase">Showcase</option>
              <option value="tournament">Tournament</option>
              <option value="camp">Camp</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-400" />
          </div>
        ) : tab === "upcoming" ? (
          <div className="space-y-6">
            {grouped.today.length > 0 && (
              <section>
                <h2 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2" data-testid="section-today">Happening Now / Today</h2>
                <div className="space-y-2">{grouped.today.map((e) => <EventCard key={e.id} event={e} />)}</div>
              </section>
            )}
            {grouped.thisWeek.length > 0 && (
              <section>
                <h2 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2" data-testid="section-thisweek">This Week</h2>
                <div className="space-y-2">{grouped.thisWeek.map((e) => <EventCard key={e.id} event={e} />)}</div>
              </section>
            )}
            {grouped.later.length > 0 && (
              <section>
                <h2 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2" data-testid="section-later">Later</h2>
                <div className="space-y-2">{grouped.later.map((e) => <EventCard key={e.id} event={e} />)}</div>
              </section>
            )}
            {events.length === 0 && <p className="text-sm text-gray-400 text-center py-12">No upcoming events</p>}
          </div>
        ) : (
          <div className="space-y-2" data-testid="past-events-list">
            {events.length > 0 ? events.map((e) => <EventCard key={e.id} event={e} />) : (
              <p className="text-sm text-gray-400 text-center py-12">No past events</p>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

export default EventHome;

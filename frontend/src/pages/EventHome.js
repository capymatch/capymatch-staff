import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { useAuth } from "@/AuthContext";
import { toast } from "sonner";
import {
  Calendar, MapPin, Users, GraduationCap, ChevronRight,
  AlertTriangle, Clock, CheckCircle2, Zap, FileText, ArrowRight, Plus
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

function formatTiming(daysAway) {
  if (daysAway < 0) return `${Math.abs(daysAway)}d ago`;
  if (daysAway === 0) return "TODAY";
  if (daysAway === 1) return "TOMORROW";
  if (daysAway <= 7) return `IN ${daysAway} DAYS`;
  return `IN ${daysAway}D`;
}

function EventCard({ event }) {
  const navigate = useNavigate();
  const isPast = event.daysAway < 0 || event.status === "past";
  const needsDebrief = isPast && event.summaryStatus === "pending";
  const readiness = event.readiness || {};
  const hasBlockers = readiness.blockers > 0;
  const needsAttention = readiness.needs_attention > 0;
  const prepProgress = event.prepProgress || { completed: 0, total: 5 };
  const prepPct = prepProgress.total > 0 ? Math.round((prepProgress.completed / prepProgress.total) * 100) : 0;

  // CTA logic
  const getCTA = () => {
    if (needsDebrief) return { label: "Review Summary", icon: FileText, color: "bg-amber-500 hover:bg-amber-600", action: () => navigate(`/events/${event.id}/summary`) };
    if (isPast) return { label: "View Summary", icon: FileText, color: "bg-slate-600 hover:bg-slate-700", action: () => navigate(`/events/${event.id}/summary`) };
    if (event.daysAway <= 1 && event.prepStatus === "ready") return { label: "Go Live", icon: Zap, color: "bg-red-500 hover:bg-red-600", action: () => navigate(`/events/${event.id}/live`) };
    if (event.daysAway <= 1) return { label: "Go Live", icon: Zap, color: "bg-red-500 hover:bg-red-600", action: () => navigate(`/events/${event.id}/live`) };
    if (event.prepStatus === "not_started") return { label: "Start Prep", icon: ArrowRight, color: "bg-slate-800 hover:bg-slate-900", action: () => navigate(`/events/${event.id}/prep`) };
    if (event.prepStatus === "in_progress") return { label: "Finish Prep", icon: ArrowRight, color: "bg-amber-500 hover:bg-amber-600", action: () => navigate(`/events/${event.id}/prep`) };
    return { label: "Review Prep", icon: CheckCircle2, color: "bg-emerald-500 hover:bg-emerald-600", action: () => navigate(`/events/${event.id}/prep`) };
  };
  const cta = getCTA();
  const CTAIcon = cta.icon;

  // Urgency border
  const urgencyBorder = event.urgency === "red" ? "border-l-red-500" :
    event.urgency === "yellow" ? "border-l-amber-400" :
    event.urgency === "gray" ? "border-l-slate-300" : "border-l-emerald-400";

  return (
    <div
      className={`bg-white border border-slate-100 border-l-[3px] ${urgencyBorder} rounded-xl transition-all hover:shadow-md cursor-pointer`}
      onClick={cta.action}
      data-testid={`event-card-${event.id}`}
    >
      <div className="px-4 py-3.5 sm:px-5">
        {/* Row 1: Name + timing */}
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-2 min-w-0">
            <h3 className="font-semibold text-slate-900 text-sm truncate">{event.name}</h3>
            <span className={`text-[10px] font-bold tracking-wider px-1.5 py-0.5 rounded ${
              event.daysAway <= 1 && !isPast ? "bg-red-100 text-red-700" :
              isPast ? "bg-slate-100 text-slate-500" :
              "bg-amber-50 text-amber-700"
            }`}>
              {formatTiming(event.daysAway)}
            </span>
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); cta.action(); }}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white rounded-lg transition-colors shrink-0 ${cta.color}`}
            data-testid={`event-action-${event.id}`}
          >
            <CTAIcon className="w-3.5 h-3.5" />
            {cta.label}
          </button>
        </div>

        {/* Row 2: Location + core stats + athlete photos */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-4 text-xs text-slate-500">
            <span className="flex items-center gap-1"><MapPin className="w-3 h-3 text-slate-400" />{event.location}</span>
            <span className="flex items-center gap-1"><GraduationCap className="w-3 h-3 text-slate-400" />{event.expectedSchools} schools</span>
          </div>
          {/* Athlete photo stack */}
          {event.athlete_photos?.length > 0 && (
            <div className="flex items-center gap-1.5" data-testid={`event-athlete-photos-${event.id}`}>
              <div className="flex -space-x-2">
                {event.athlete_photos.slice(0, 5).map((a) => (
                  a.photo_url ? (
                    <img
                      key={a.id}
                      src={a.photo_url}
                      alt={a.name}
                      className="w-7 h-7 rounded-full object-cover border-2 border-white"
                      title={a.name}
                    />
                  ) : (
                    <div
                      key={a.id}
                      className="w-7 h-7 rounded-full bg-gray-200 border-2 border-white flex items-center justify-center text-[9px] font-bold text-gray-500"
                      title={a.name}
                    >
                      {(a.name || "").split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2)}
                    </div>
                  )
                ))}
              </div>
              <span className="text-[10px] text-slate-400">{event.athleteCount}</span>
            </div>
          )}
        </div>

        {/* Row 3: Status pills */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Blockers */}
          {hasBlockers && (
            <span className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium bg-red-50 text-red-700 border border-red-100" data-testid={`event-blockers-${event.id}`}>
              <AlertTriangle className="w-3 h-3" />
              {readiness.blockers} blocker{readiness.blockers > 1 ? "s" : ""}
            </span>
          )}

          {/* Needs attention */}
          {needsAttention && (
            <span className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-100">
              <Clock className="w-3 h-3" />
              {readiness.needs_attention} need{readiness.needs_attention > 1 ? "" : "s"} attention
            </span>
          )}

          {/* Ready athletes */}
          {!isPast && readiness.ready > 0 && (
            <span className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-100">
              <CheckCircle2 className="w-3 h-3" />
              {readiness.ready} ready
            </span>
          )}

          {/* Prep progress (upcoming only) */}
          {!isPast && (
            <span className="flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-medium bg-slate-50 text-slate-600 border border-slate-100">
              <div className="w-10 h-1 rounded-full bg-slate-200 overflow-hidden">
                <div className="h-full rounded-full bg-slate-600 transition-all" style={{ width: `${prepPct}%` }} />
              </div>
              {prepProgress.completed}/{prepProgress.total} prep
            </span>
          )}

          {/* Past event: notes + follow-ups */}
          {isPast && event.capturedNotesCount > 0 && (
            <span className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium bg-slate-50 text-slate-600 border border-slate-100">
              <FileText className="w-3 h-3" />
              {event.capturedNotesCount} notes
            </span>
          )}
          {isPast && event.followUpsPending > 0 && (
            <span className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-100" data-testid={`event-followups-${event.id}`}>
              <Clock className="w-3 h-3" />
              {event.followUpsPending} follow-up{event.followUpsPending > 1 ? "s" : ""} pending
            </span>
          )}
          {needsDebrief && (
            <span className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-100">
              <AlertTriangle className="w-3 h-3" />
              No summary yet
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function CreateEventDialog({ open, onOpenChange, onCreated }) {
  const [form, setForm] = useState({ name: "", type: "showcase", date: "", location: "", expectedSchools: 5 });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.date || !form.location.trim()) {
      toast.error("Please fill in name, date, and location");
      return;
    }
    setSaving(true);
    try {
      await axios.post(`${API}/events`, {
        ...form,
        name: form.name.trim(),
        location: form.location.trim(),
        expectedSchools: Number(form.expectedSchools) || 0,
      });
      toast.success("Event created");
      setForm({ name: "", type: "showcase", date: "", location: "", expectedSchools: 5 });
      onOpenChange(false);
      onCreated();
    } catch {
      toast.error("Failed to create event");
    } finally {
      setSaving(false);
    }
  };

  const inputCls = "w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 transition-colors";
  const labelCls = "block text-xs font-semibold text-gray-600 mb-1.5";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[460px] bg-white" data-testid="create-event-dialog">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold text-gray-900">Create Event</DialogTitle>
          <DialogDescription className="text-xs text-gray-500">Add a new recruiting event to your calendar.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div>
            <label className={labelCls}>Event Name *</label>
            <input
              type="text"
              placeholder="e.g. College Exposure Camp"
              className={inputCls}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              data-testid="create-event-name"
              autoFocus
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Type *</label>
              <select
                className={inputCls}
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
                data-testid="create-event-type"
              >
                <option value="showcase">Showcase</option>
                <option value="tournament">Tournament</option>
                <option value="camp">Camp</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Date *</label>
              <input
                type="date"
                className={inputCls}
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                data-testid="create-event-date"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Location *</label>
              <input
                type="text"
                placeholder="e.g. Irvine, CA"
                className={inputCls}
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                data-testid="create-event-location"
              />
            </div>
            <div>
              <label className={labelCls}>Expected Schools</label>
              <input
                type="number"
                min="0"
                className={inputCls}
                value={form.expectedSchools}
                onChange={(e) => setForm({ ...form, expectedSchools: e.target.value })}
                data-testid="create-event-schools"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors"
              data-testid="create-event-cancel"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-lg transition-colors"
              data-testid="create-event-submit"
            >
              {saving ? "Creating..." : "Create Event"}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EventHome() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({ upcoming: [], past: [] });
  const [tab, setTab] = useState("upcoming");
  const [typeFilter, setTypeFilter] = useState("all");
  const [showCreate, setShowCreate] = useState(false);

  const fetchEvents = async () => {
    try {
      const params = new URLSearchParams();
      if (typeFilter !== "all") params.set("type", typeFilter);
      const res = await axios.get(`${API}/events?${params}`);
      setData(res.data);
    } catch {
      toast.error("Failed to load events");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.role === "club_coach") {
      axios.post(`${API}/onboarding/complete-step`, { step: "events" }).catch(() => {});
    }
  }, [user]);

  useEffect(() => { fetchEvents(); }, [typeFilter]);

  const events = tab === "upcoming" ? data.upcoming : data.past;

  const grouped = { today: [], thisWeek: [], later: [] };
  if (tab === "upcoming") {
    for (const e of events) {
      if (e.daysAway <= 1) grouped.today.push(e);
      else if (e.daysAway <= 7) grouped.thisWeek.push(e);
      else grouped.later.push(e);
    }
  }

  return (
    <div data-testid="event-home-page">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg font-semibold text-gray-900" data-testid="events-title">Events</h1>
          <p className="text-xs text-gray-500 mt-0.5">Capture recruiting moments. Organize later.</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors"
          data-testid="create-event-button"
        >
          <Plus className="w-4 h-4" />
          Create Event
        </button>
      </div>

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

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-400" />
        </div>
      ) : tab === "upcoming" ? (
        <div className="space-y-6">
          {grouped.today.length > 0 && (
            <section>
              <h2 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2" data-testid="section-today">Happening Now / Today</h2>
              <div className="space-y-2.5">{grouped.today.map((e) => <EventCard key={e.id} event={e} />)}</div>
            </section>
          )}
          {grouped.thisWeek.length > 0 && (
            <section>
              <h2 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2" data-testid="section-thisweek">This Week</h2>
              <div className="space-y-2.5">{grouped.thisWeek.map((e) => <EventCard key={e.id} event={e} />)}</div>
            </section>
          )}
          {grouped.later.length > 0 && (
            <section>
              <h2 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2" data-testid="section-later">Later</h2>
              <div className="space-y-2.5">{grouped.later.map((e) => <EventCard key={e.id} event={e} />)}</div>
            </section>
          )}
          {events.length === 0 && <p className="text-sm text-gray-400 text-center py-12">No upcoming events</p>}
        </div>
      ) : (
        <div className="space-y-2.5" data-testid="past-events-list">
          {events.length > 0 ? events.map((e) => <EventCard key={e.id} event={e} />) : (
            <p className="text-sm text-gray-400 text-center py-12">No past events</p>
          )}
        </div>
      )}

      <CreateEventDialog
        open={showCreate}
        onOpenChange={setShowCreate}
        onCreated={fetchEvents}
      />
    </div>
  );
}

export default EventHome;

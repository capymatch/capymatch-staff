import { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "sonner";
import {
  ChevronLeft, ChevronRight, Clock, Plus, X, MapPin,
  Calendar, Trash2, Loader2, GraduationCap,
} from "lucide-react";
import NcaaTimeline from "../../components/calendar/NcaaTimeline";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const EVENT_TYPES = ["Camp", "Showcase", "Tournament", "Visit", "Tryout", "Meeting", "Deadline", "Other"];
const EVENT_COLORS = {
  Camp: "bg-teal-600", Showcase: "bg-blue-500", Tournament: "bg-amber-500",
  Visit: "bg-slate-500", Tryout: "bg-slate-500", Meeting: "bg-cyan-500",
  Deadline: "bg-red-500", Other: "bg-gray-500",
};

/* ── Event Modal ── */
function EventModal({ onClose, onSaved, editEvent, programs }) {
  const [form, setForm] = useState({
    title: editEvent?.title || "",
    event_type: editEvent?.event_type || "Camp",
    location: editEvent?.location || "",
    description: editEvent?.description || "",
    start_date: editEvent?.start_date || "",
    end_date: editEvent?.end_date || "",
    start_time: editEvent?.start_time || "",
    end_time: editEvent?.end_time || "",
    program_id: editEvent?.program_id || "",
  });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleSave = async () => {
    if (!form.title.trim()) return toast.error("Event name is required");
    if (!form.start_date) return toast.error("Start date is required");
    setSaving(true);
    try {
      if (editEvent?.event_id) {
        await axios.put(`${API}/athlete/events/${editEvent.event_id}`, form);
        toast.success("Event updated");
      } else {
        await axios.post(`${API}/athlete/events`, form);
        toast.success("Event created");
      }
      onSaved();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!editEvent?.event_id) return;
    setDeleting(true);
    try {
      await axios.delete(`${API}/athlete/events/${editEvent.event_id}`);
      toast.success("Event deleted");
      onSaved();
      onClose();
    } catch {
      toast.error("Failed to delete");
    } finally {
      setDeleting(false);
    }
  };

  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" data-testid="event-modal">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-lg rounded-lg border shadow-2xl overflow-hidden" style={{ backgroundColor: "var(--cm-surface)", borderColor: "var(--cm-border)" }}>
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: "var(--cm-border)" }}>
          <h3 className="text-lg font-semibold" style={{ color: "var(--cm-text)" }}>{editEvent?.event_id ? "Edit Event" : "New Event"}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg" style={{ color: "var(--cm-text-3)" }}><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="text-xs font-medium mb-1.5 block" style={{ color: "var(--cm-text-3)" }}>Event Name *</label>
            <input data-testid="event-title" value={form.title} onChange={(e) => set("title", e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg text-sm border focus:outline-none focus:border-emerald-400"
              style={{ backgroundColor: "var(--cm-input-bg)", borderColor: "var(--cm-border)", color: "var(--cm-text)" }} placeholder="e.g. Nebraska Volleyball Camp" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium mb-1.5 block" style={{ color: "var(--cm-text-3)" }}>Type</label>
              <select data-testid="event-type" value={form.event_type} onChange={(e) => set("event_type", e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg text-sm border focus:outline-none"
                style={{ backgroundColor: "var(--cm-input-bg)", borderColor: "var(--cm-border)", color: "var(--cm-text)" }}>
                {EVENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium mb-1.5 block" style={{ color: "var(--cm-text-3)" }}>Location</label>
              <input data-testid="event-location" value={form.location} onChange={(e) => set("location", e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg text-sm border focus:outline-none focus:border-emerald-400"
                style={{ backgroundColor: "var(--cm-input-bg)", borderColor: "var(--cm-border)", color: "var(--cm-text)" }} placeholder="City, State" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium mb-1.5 block" style={{ color: "var(--cm-text-3)" }}>Start Date *</label>
              <input data-testid="event-start-date" type="date" value={form.start_date} onChange={(e) => set("start_date", e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg text-sm border focus:outline-none"
                style={{ backgroundColor: "var(--cm-input-bg)", borderColor: "var(--cm-border)", color: "var(--cm-text)" }} />
            </div>
            <div>
              <label className="text-xs font-medium mb-1.5 block" style={{ color: "var(--cm-text-3)" }}>End Date</label>
              <input data-testid="event-end-date" type="date" value={form.end_date} onChange={(e) => set("end_date", e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg text-sm border focus:outline-none"
                style={{ backgroundColor: "var(--cm-input-bg)", borderColor: "var(--cm-border)", color: "var(--cm-text)" }} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium mb-1.5 block" style={{ color: "var(--cm-text-3)" }}>Start Time</label>
              <input data-testid="event-start-time" type="time" value={form.start_time} onChange={(e) => set("start_time", e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg text-sm border focus:outline-none"
                style={{ backgroundColor: "var(--cm-input-bg)", borderColor: "var(--cm-border)", color: "var(--cm-text)" }} />
            </div>
            <div>
              <label className="text-xs font-medium mb-1.5 block" style={{ color: "var(--cm-text-3)" }}>End Time</label>
              <input data-testid="event-end-time" type="time" value={form.end_time} onChange={(e) => set("end_time", e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg text-sm border focus:outline-none"
                style={{ backgroundColor: "var(--cm-input-bg)", borderColor: "var(--cm-border)", color: "var(--cm-text)" }} />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium mb-1.5 block" style={{ color: "var(--cm-text-3)" }}>Linked School (optional)</label>
            <select data-testid="event-program" value={form.program_id} onChange={(e) => set("program_id", e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg text-sm border focus:outline-none"
              style={{ backgroundColor: "var(--cm-input-bg)", borderColor: "var(--cm-border)", color: "var(--cm-text)" }}>
              <option value="">None</option>
              {programs.map((p) => <option key={p.program_id} value={p.program_id}>{p.university_name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium mb-1.5 block" style={{ color: "var(--cm-text-3)" }}>Notes</label>
            <textarea data-testid="event-description" value={form.description} onChange={(e) => set("description", e.target.value)} rows={3}
              className="w-full px-3 py-2.5 rounded-lg text-sm border focus:outline-none focus:border-emerald-400 resize-none"
              style={{ backgroundColor: "var(--cm-input-bg)", borderColor: "var(--cm-border)", color: "var(--cm-text)" }} placeholder="Any details..." />
          </div>
        </div>
        <div className="flex items-center justify-between px-6 py-4 border-t" style={{ borderColor: "var(--cm-border)" }}>
          {editEvent?.event_id ? (
            <button data-testid="event-delete-btn" onClick={handleDelete} disabled={deleting}
              className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg text-red-500 transition-colors">
              <Trash2 className="w-4 h-4" /> {deleting ? "Deleting..." : "Delete"}
            </button>
          ) : <div />}
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="px-4 py-2 text-sm rounded-lg" style={{ color: "var(--cm-text-3)" }}>Cancel</button>
            <button data-testid="event-save-btn" onClick={handleSave} disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 transition-colors">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {saving ? "Saving..." : editEvent?.event_id ? "Update" : "Create Event"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Main Calendar ── */
export default function CalendarPage() {
  const [tab, setTab] = useState("calendar");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [programs, setPrograms] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editEvent, setEditEvent] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const fetchData = () => {
    Promise.all([
      axios.get(`${API}/athlete/programs`),
      axios.get(`${API}/athlete/events`),
    ])
      .then(([progRes, evtRes]) => {
        setPrograms(Array.isArray(progRes.data) ? progRes.data : []);
        setEvents(Array.isArray(evtRes.data) ? evtRes.data : []);
      })
      .catch(() => toast.error("Failed to load calendar data"))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, []);

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startPadding = firstDay.getDay();
  const daysInMonth = lastDay.getDate();

  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const getEventsForDate = (day) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const followUps = programs.filter(
      (p) => p.next_action_due === dateStr
    ).map((p) => ({ ...p, _type: "followup", _color: "bg-blue-500" }));
    const userEvents = events.filter((e) => {
      if (e.start_date === dateStr) return true;
      if (e.end_date && e.start_date <= dateStr && e.end_date >= dateStr) return true;
      return false;
    }).map((e) => ({ ...e, _type: "event", _color: EVENT_COLORS[e.event_type] || "bg-gray-500" }));
    return [...userEvents, ...followUps];
  };

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const goToToday = () => setCurrentDate(new Date());

  const isToday = (day) => {
    const t = new Date();
    return day === t.getDate() && month === t.getMonth() && year === t.getFullYear();
  };

  const handleDayClick = (day) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    setSelectedDate(dateStr);
  };

  const fmtDate = (d) => {
    if (!d) return "";
    return new Date(d + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const today = new Date().toISOString().split("T")[0];
  const upcomingUserEvents = events.filter((e) => e.start_date >= today).sort((a, b) => a.start_date.localeCompare(b.start_date)).slice(0, 6);
  const selectedDateEvents = selectedDate
    ? getEventsForDate(parseInt(selectedDate.split("-")[2]))
    : [];

  if (loading) return (
    <div className="flex items-center justify-center py-32" data-testid="calendar-loading">
      <div className="w-8 h-8 border-2 border-t-emerald-600 rounded-full animate-spin" style={{ borderColor: "var(--cm-border)", borderTopColor: "#059669" }} />
    </div>
  );

  return (
    <div data-testid="calendar-page" className="space-y-6">
      {/* Tab Switcher */}
      <div className="flex items-center gap-1 p-1 rounded-xl w-fit" style={{ backgroundColor: "var(--cm-surface-2)" }} data-testid="calendar-tabs">
        <button
          onClick={() => setTab("calendar")}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all"
          style={{
            backgroundColor: tab === "calendar" ? "var(--cm-surface)" : "transparent",
            color: tab === "calendar" ? "var(--cm-text)" : "var(--cm-text-3)",
            boxShadow: tab === "calendar" ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
          }}
          data-testid="tab-my-calendar"
        >
          <Calendar className="w-4 h-4" />
          My Calendar
        </button>
        <button
          onClick={() => setTab("ncaa")}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all"
          style={{
            backgroundColor: tab === "ncaa" ? "#1a8a80" : "transparent",
            color: tab === "ncaa" ? "#fff" : "var(--cm-text-3)",
          }}
          data-testid="tab-ncaa-timeline"
        >
          <GraduationCap className="w-4 h-4" />
          NCAA Timeline
        </button>
      </div>

      {tab === "ncaa" ? (
        <NcaaTimeline />
      ) : (
      <>
      <div className="flex items-center justify-end">
        <button data-testid="add-event-btn" onClick={() => { setEditEvent(null); setShowModal(true); }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 transition-colors">
          <Plus className="w-4 h-4" /> Add Event
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Calendar Grid */}
        <div className="lg:col-span-8">
          <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: "var(--cm-surface)", borderColor: "var(--cm-border)" }}>
            <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: "var(--cm-border)" }}>
              <div className="flex items-center gap-4">
                <h3 className="text-xl font-semibold" style={{ color: "var(--cm-text)" }}>{monthNames[month]} {year}</h3>
                <button onClick={goToToday} className="px-3 py-1.5 text-sm rounded-lg" style={{ backgroundColor: "var(--cm-surface-2)", color: "var(--cm-text-3)" }}>Today</button>
              </div>
              <div className="flex items-center gap-2">
                <div className="hidden md:flex items-center gap-4 mr-4 text-[10px]">
                  {Object.entries(EVENT_COLORS).slice(0, 5).map(([type, cls]) => (
                    <span key={type} className="flex items-center gap-1"><span className={`w-2 h-2 rounded-full ${cls}`} /><span style={{ color: "var(--cm-text-3)" }}>{type}</span></span>
                  ))}
                </div>
                <button onClick={prevMonth} className="p-2 rounded-lg" style={{ color: "var(--cm-text-3)" }}><ChevronLeft className="w-5 h-5" /></button>
                <button onClick={nextMonth} className="p-2 rounded-lg" style={{ color: "var(--cm-text-3)" }}><ChevronRight className="w-5 h-5" /></button>
              </div>
            </div>

            <div className="grid grid-cols-7 border-b" style={{ borderColor: "var(--cm-border)" }}>
              {dayNames.map((d) => <div key={d} className="p-3 text-center text-sm font-medium" style={{ color: "var(--cm-text-3)" }}>{d}</div>)}
            </div>

            <div className="grid grid-cols-7">
              {Array.from({ length: startPadding }).map((_, i) => (
                <div key={`pad-${i}`} className="h-20 p-3 border-b border-r" style={{ borderColor: "var(--cm-border)", backgroundColor: "var(--cm-surface-2)", opacity: 0.5 }} />
              ))}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const dayEvents = getEventsForDate(day);
                const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                const isSelected = selectedDate === dateStr;
                return (
                  <div key={day} onClick={() => handleDayClick(day)} data-testid={`calendar-day-${day}`}
                    className="h-20 p-3 border-b border-r transition-colors cursor-pointer"
                    style={{
                      borderColor: "var(--cm-border)",
                      backgroundColor: isToday(day) ? "rgba(16,185,129,0.08)" : isSelected ? "rgba(16,185,129,0.04)" : "transparent",
                    }}>
                    <div className="flex items-center justify-between">
                      <span className={`text-sm ${isToday(day) ? "font-bold text-emerald-600" : "font-medium"}`} style={isToday(day) ? {} : { color: "var(--cm-text-2)" }}>{day}</span>
                      {dayEvents.length > 0 && (
                        <div className="flex gap-0.5">
                          {dayEvents.slice(0, 4).map((e, idx) => <span key={idx} className={`w-2 h-2 rounded-full ${e._color}`} />)}
                          {dayEvents.length > 4 && <span className="text-[9px]" style={{ color: "var(--cm-text-3)" }}>+{dayEvents.length - 4}</span>}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-4 space-y-4">
          {selectedDate && selectedDateEvents.length > 0 && (
            <div className="rounded-xl p-4 border" style={{ backgroundColor: "var(--cm-surface)", borderColor: "var(--cm-border)" }}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-sm" style={{ color: "var(--cm-text)" }}>{fmtDate(selectedDate)}</h3>
                <button data-testid="add-event-date-btn" onClick={() => { setEditEvent({ start_date: selectedDate }); setShowModal(true); }}
                  className="p-1 rounded-lg text-emerald-600 hover:bg-emerald-50"><Plus className="w-4 h-4" /></button>
              </div>
              <div className="space-y-2">
                {selectedDateEvents.map((evt, i) => (
                  <div key={i} onClick={() => { if (evt._type === "event") { setEditEvent(evt); setShowModal(true); } }}
                    className="flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors"
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = "var(--cm-surface-hover)"}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = "transparent"}>
                    <div className={`w-1 h-8 rounded-full ${evt._color} shrink-0`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: "var(--cm-text)" }}>{evt._type === "event" ? evt.title : evt.university_name}</p>
                      <p className="text-xs" style={{ color: "var(--cm-text-3)" }}>{evt._type === "event" ? evt.event_type : "Follow-up"}{evt.location && ` · ${evt.location}`}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="rounded-xl p-4 border" style={{ backgroundColor: "var(--cm-surface)", borderColor: "var(--cm-border)" }} data-testid="upcoming-events-sidebar">
            <h3 className="font-semibold text-sm mb-3" style={{ color: "var(--cm-text)" }}>Upcoming Events</h3>
            {upcomingUserEvents.length > 0 ? (
              <div className="space-y-2">
                {upcomingUserEvents.map((evt) => (
                  <div key={evt.event_id} onClick={() => { setEditEvent(evt); setShowModal(true); }}
                    className="flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors"
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = "var(--cm-surface-hover)"}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = "transparent"}>
                    <div className={`w-1 h-10 rounded-full ${EVENT_COLORS[evt.event_type] || "bg-gray-500"} shrink-0`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: "var(--cm-text)" }}>{evt.title}</p>
                      <p className="text-xs" style={{ color: "var(--cm-text-3)" }}>{fmtDate(evt.start_date)}{evt.location && ` · ${evt.location}`}</p>
                    </div>
                    <span className={`text-[10px] font-medium px-2 py-1 rounded ${
                      evt.event_type === "Camp" ? "bg-teal-50 text-teal-600"
                      : evt.event_type === "Tournament" ? "bg-amber-50 text-amber-600"
                      : evt.event_type === "Meeting" ? "bg-cyan-50 text-cyan-600"
                      : ""
                    }`}
                    >{evt.event_type}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4">
                <Calendar className="w-6 h-6 mx-auto mb-2" style={{ color: "var(--cm-text-4)" }} />
                <p className="text-sm" style={{ color: "var(--cm-text-3)" }}>No upcoming events</p>
                <button onClick={() => { setEditEvent(null); setShowModal(true); }}
                  className="mt-2 text-sm text-emerald-600 hover:text-emerald-700">+ Create event</button>
              </div>
            )}
          </div>
        </div>
      </div>

      {showModal && (
        <EventModal
          onClose={() => { setShowModal(false); setEditEvent(null); }}
          onSaved={fetchData}
          editEvent={editEvent}
          programs={programs}
        />
      )}
      </>
      )}
    </div>
  );
}

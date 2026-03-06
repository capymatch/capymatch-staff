import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { ArrowLeft, FileText, GraduationCap, Users, ListChecks, ExternalLink, Check, ArrowRight } from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const INTEREST_BADGE = {
  hot: { cls: "bg-red-100 text-red-700", label: "Hot" },
  warm: { cls: "bg-amber-100 text-amber-700", label: "Warm" },
  cool: { cls: "bg-sky-100 text-sky-700", label: "Cool" },
  none: { cls: "bg-gray-100 text-gray-500", label: "—" },
};

function EventSummary() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [routing, setRouting] = useState(false);

  const fetchSummary = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/events/${eventId}/summary`);
      setData(res.data);
    } catch {
      toast.error("Failed to load summary");
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => { fetchSummary(); }, [fetchSummary]);

  const routeNote = async (noteId) => {
    try {
      await axios.post(`${API}/events/${eventId}/notes/${noteId}/route`);
      toast.success("Routed to Support Pod");
      fetchSummary();
    } catch {
      toast.error("Failed to route");
    }
  };

  const routeAll = async () => {
    setRouting(true);
    try {
      const res = await axios.post(`${API}/events/${eventId}/route-to-pods`);
      toast.success(`Routed ${res.data.routed_notes} notes to ${res.data.athletes_affected} Support Pods`);
      fetchSummary();
    } catch {
      toast.error("Failed to bulk route");
    } finally {
      setRouting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-400" />
      </div>
    );
  }

  if (!data || data.error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-gray-500">No summary data available. Capture notes in Live Mode first.</p>
      </div>
    );
  }

  const { event, stats, hottestInterest, followUpActions, schoolsSeen, allNotes } = data;
  const unroutedActions = followUpActions.filter((a) => !a.routed);

  return (
    <div className="min-h-screen bg-slate-50" data-testid="event-summary-page">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-100">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate("/events")} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors" data-testid="back-to-events-summary">
              <ArrowLeft className="w-4 h-4" /><span className="hidden sm:inline">Events</span>
            </button>
            <div className="h-5 w-px bg-gray-200" />
            <div>
              <h1 className="font-semibold text-gray-900 text-base leading-tight" data-testid="summary-event-name">{event?.name} — Summary</h1>
              <p className="text-xs text-gray-500">{event?.location} · {stats.totalNotes} notes captured</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-[1200px] mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Event Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3" data-testid="event-stats">
          {[
            { label: "Notes Captured", value: stats.totalNotes, icon: FileText },
            { label: "Schools Interacted", value: stats.schoolsInteracted, icon: GraduationCap },
            { label: "Athletes Seen", value: stats.athletesSeen, icon: Users },
            { label: "Follow-ups Needed", value: stats.followUpsNeeded, icon: ListChecks },
          ].map((s) => (
            <div key={s.label} className="bg-white border border-gray-100 rounded-lg p-4 text-center">
              <s.icon className="w-4 h-4 text-gray-400 mx-auto mb-1" />
              <div className="text-xl font-bold text-gray-900">{s.value}</div>
              <div className="text-[10px] text-gray-400 uppercase tracking-wider">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Hottest Interest */}
        {hottestInterest.length > 0 && (
          <section className="bg-white border border-gray-100 rounded-lg p-5" data-testid="hottest-interest-section">
            <h2 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-4">Hottest Interest</h2>
            <div className="space-y-3">
              {hottestInterest.map((n) => {
                const badge = INTEREST_BADGE[n.interest_level] || INTEREST_BADGE.none;
                return (
                  <div key={n.id} className="flex items-start justify-between py-2 border-b border-gray-50 last:border-0" data-testid={`hot-note-${n.id}`}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-medium text-sm text-gray-900">{n.athlete_name}</span>
                        {n.school_name && (
                          <>
                            <span className="text-gray-400">×</span>
                            <span className="text-sm text-gray-600">{n.school_name}</span>
                          </>
                        )}
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${badge.cls}`}>{badge.label}</span>
                      </div>
                      {n.note_text && <p className="text-xs text-gray-500 mb-1">"{n.note_text}"</p>}
                      {n.follow_ups?.length > 0 && (
                        <div className="flex gap-1">
                          {n.follow_ups.map((f) => (
                            <span key={f} className="text-[9px] px-1.5 py-0.5 bg-gray-100 rounded text-gray-500">{f.replace(/_/g, " ")}</span>
                          ))}
                        </div>
                      )}
                    </div>
                    {!n.routed_to_pod ? (
                      <button
                        onClick={() => routeNote(n.id)}
                        className="flex items-center gap-1 px-2.5 py-1.5 text-[10px] font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors shrink-0 ml-3"
                        data-testid={`route-note-${n.id}`}
                      >
                        Route to Pod <ArrowRight className="w-3 h-3" />
                      </button>
                    ) : (
                      <span className="flex items-center gap-1 text-[10px] text-emerald-600 shrink-0 ml-3">
                        <Check className="w-3 h-3" /> Routed
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Follow-Up Actions */}
        {followUpActions.length > 0 && (
          <section className="bg-white border border-gray-100 rounded-lg p-5" data-testid="follow-up-actions-section">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Follow-Up Actions ({followUpActions.length})</h2>
              {unroutedActions.length > 0 && (
                <button
                  onClick={routeAll}
                  disabled={routing}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-slate-900 text-white rounded-md hover:bg-slate-800 transition-colors disabled:opacity-50"
                  data-testid="route-all-btn"
                >
                  {routing ? "Routing..." : "Route All to Support Pods"} <ArrowRight className="w-3 h-3" />
                </button>
              )}
            </div>
            <div className="space-y-2">
              {followUpActions.map((a) => (
                <div key={a.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0" data-testid={`followup-action-${a.id}`}>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-800">{a.title}</p>
                    <p className="text-[11px] text-gray-400">Owner: {a.owner} · {a.athlete_name}</p>
                  </div>
                  {a.routed ? (
                    <span className="text-[10px] text-emerald-600 flex items-center gap-0.5"><Check className="w-3 h-3" /> Routed</span>
                  ) : (
                    <span className="text-[10px] text-gray-400">Pending</span>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Schools Seen */}
        {schoolsSeen.length > 0 && (
          <section className="bg-white border border-gray-100 rounded-lg p-5" data-testid="schools-seen-section">
            <h2 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-4">Schools Seen</h2>
            <div className="space-y-2">
              {schoolsSeen.map((s) => (
                <div key={s.name} className="flex items-center justify-between py-1.5">
                  <span className="text-sm font-medium text-gray-900">{s.name}</span>
                  <div className="flex items-center gap-3 text-[11px] text-gray-500">
                    <span>{s.interactions} interaction{s.interactions > 1 ? "s" : ""}</span>
                    {s.hot > 0 && <span className="text-red-600 font-medium">Hot: {s.hot}</span>}
                    {s.warm > 0 && <span className="text-amber-600 font-medium">Warm: {s.warm}</span>}
                    {s.cool > 0 && <span className="text-sky-600">Cool: {s.cool}</span>}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* All Notes */}
        {allNotes.length > 0 && (
          <section className="bg-white border border-gray-100 rounded-lg p-5" data-testid="all-notes-section">
            <h2 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-4">All Notes ({allNotes.length})</h2>
            <div className="space-y-2">
              {allNotes.map((n) => {
                const badge = INTEREST_BADGE[n.interest_level] || INTEREST_BADGE.none;
                return (
                  <div key={n.id} className="py-2 border-b border-gray-50 last:border-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-sm font-medium text-gray-800">{n.athlete_name}</span>
                      {n.school_name && <><span className="text-gray-400">×</span><span className="text-sm text-gray-500">{n.school_name}</span></>}
                      <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${badge.cls}`}>{badge.label}</span>
                    </div>
                    {n.note_text && <p className="text-xs text-gray-500">{n.note_text}</p>}
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

export default EventSummary;

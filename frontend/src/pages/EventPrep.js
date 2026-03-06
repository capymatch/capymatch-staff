import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { ArrowLeft, Check, AlertTriangle, ExternalLink, ChevronRight, MapPin, GraduationCap, Users } from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const PREP_STATUS = {
  ready: { label: "Ready", cls: "text-emerald-600", icon: Check },
  needs_attention: { label: "Needs Attention", cls: "text-amber-600", icon: AlertTriangle },
  blocker: { label: "Blocker", cls: "text-red-600", icon: AlertTriangle },
};

function EventPrep() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

  const fetchPrep = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/events/${eventId}/prep`);
      setData(res.data);
    } catch (err) {
      toast.error("Failed to load prep data");
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => { fetchPrep(); }, [fetchPrep]);

  const toggleCheck = async (itemId) => {
    try {
      const res = await axios.patch(`${API}/events/${eventId}/checklist/${itemId}`);
      setData((prev) => ({
        ...prev,
        checklist: prev.checklist.map((c) => c.id === itemId ? res.data.item : c),
        event: { ...prev.event, prepStatus: res.data.prepStatus },
      }));
    } catch {
      toast.error("Failed to update checklist");
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
        <p className="text-gray-500">Event not found</p>
      </div>
    );
  }

  const { event, athletes, targetSchools, checklist, blockers } = data;
  const completed = checklist.filter((c) => c.completed).length;

  return (
    <div className="min-h-screen bg-slate-50" data-testid="event-prep-page">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-100">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate("/events")} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors" data-testid="back-to-events">
              <ArrowLeft className="w-4 h-4" /><span className="hidden sm:inline">Events</span>
            </button>
            <div className="h-5 w-px bg-gray-200" />
            <div>
              <h1 className="font-semibold text-gray-900 text-base leading-tight" data-testid="prep-event-name">{event.name}</h1>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{event.location}</span>
                <span>{event.daysAway <= 1 ? "TOMORROW" : `IN ${event.daysAway} DAYS`}</span>
                <span className="flex items-center gap-1"><GraduationCap className="w-3 h-3" />{event.expectedSchools} schools expected</span>
              </div>
            </div>
          </div>
          <button
            onClick={() => navigate(`/events/${eventId}/live`)}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium bg-slate-900 text-white rounded-md hover:bg-slate-800 transition-colors"
            data-testid="go-live-btn"
          >
            Go Live <ChevronRight className="w-3 h-3" />
          </button>
        </div>
      </header>

      <main className="max-w-[1200px] mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Athletes Attending */}
        <section className="bg-white border border-gray-100 rounded-lg p-5" data-testid="prep-athletes-section">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Athletes Attending ({athletes.length})</h2>
          </div>
          <div className="space-y-2">
            {athletes.map((a) => {
              const ps = PREP_STATUS[a.prepStatus] || PREP_STATUS.ready;
              const Icon = ps.icon;
              return (
                <div key={a.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0" data-testid={`prep-athlete-${a.id}`}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm text-gray-900">{a.fullName}</span>
                      <span className="text-xs text-gray-400">{a.gradYear} · {a.position}</span>
                      <span className={`flex items-center gap-1 text-[10px] font-medium ${ps.cls}`}>
                        <Icon className="w-3 h-3" /> {ps.label}
                      </span>
                    </div>
                    {a.targetSchoolsAtEvent.length > 0 && (
                      <p className="text-[11px] text-gray-400 mt-0.5">Targets: {a.targetSchoolsAtEvent.join(", ")}</p>
                    )}
                  </div>
                  <button
                    onClick={() => navigate(`/support-pods/${a.id}`)}
                    className="text-[10px] text-gray-400 hover:text-gray-700 flex items-center gap-0.5 transition-colors"
                  >
                    Open Pod <ExternalLink className="w-3 h-3" />
                  </button>
                </div>
              );
            })}
          </div>
        </section>

        {/* Target Schools + Prep Checklist side by side */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Target Schools */}
          <section className="bg-white border border-gray-100 rounded-lg p-5" data-testid="prep-schools-section">
            <h2 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-4">Target Schools ({targetSchools.length})</h2>
            <div className="space-y-2">
              {targetSchools.slice(0, 8).map((s) => (
                <div key={s.id} className="flex items-center justify-between py-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-900">{s.name}</span>
                    <span className="text-[10px] px-1.5 py-0.5 bg-gray-100 rounded text-gray-500">{s.division}</span>
                  </div>
                  <span className="text-[11px] text-gray-400">
                    {s.athleteOverlap > 0 ? `${s.athleteOverlap} of your athletes targeting` : "No overlap"}
                  </span>
                </div>
              ))}
              {targetSchools.length > 8 && (
                <p className="text-[11px] text-gray-400">+ {targetSchools.length - 8} more schools expected</p>
              )}
            </div>
          </section>

          {/* Prep Checklist */}
          <section className="bg-white border border-gray-100 rounded-lg p-5" data-testid="prep-checklist-section">
            <h2 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-4">
              Prep Checklist ({completed}/{checklist.length})
            </h2>
            <div className="space-y-2 mb-4">
              {checklist.map((item) => (
                <label key={item.id} className="flex items-center gap-3 py-1.5 cursor-pointer group" data-testid={`checklist-${item.id}`}>
                  <button
                    onClick={() => toggleCheck(item.id)}
                    className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                      item.completed ? "bg-emerald-500 border-emerald-500" : "border-gray-300 group-hover:border-emerald-400"
                    }`}
                  >
                    {item.completed && <Check className="w-3 h-3 text-white" />}
                  </button>
                  <span className={`text-sm ${item.completed ? "text-gray-400 line-through" : "text-gray-700"}`}>{item.label}</span>
                </label>
              ))}
            </div>
            {/* Progress bar */}
            <div className="w-full bg-gray-100 rounded-full h-1.5">
              <div className="bg-emerald-500 h-1.5 rounded-full transition-all" style={{ width: `${(completed / checklist.length) * 100}%` }} />
            </div>
          </section>
        </div>

        {/* Blockers */}
        {blockers.length > 0 && (
          <section className="bg-red-50 border border-red-100 rounded-lg p-5" data-testid="prep-blockers-section">
            <h2 className="text-[11px] font-bold text-red-400 uppercase tracking-wider mb-3">Blockers ({blockers.length})</h2>
            <div className="space-y-3">
              {blockers.map((b, i) => (
                <div key={i} className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
                      <span className="text-sm font-medium text-gray-900">{b.athleteName}</span>
                    </div>
                    <p className="text-xs text-gray-600 mt-0.5 ml-5.5">{b.impact}</p>
                  </div>
                  <button
                    onClick={() => navigate(`/support-pods/${b.athleteId}`)}
                    className="text-[10px] text-red-600 hover:text-red-800 flex items-center gap-0.5 shrink-0"
                  >
                    Open Pod <ExternalLink className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

export default EventPrep;

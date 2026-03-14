import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import {
  ArrowLeft, FileText, GraduationCap, Users, ListChecks,
  ExternalLink, Check, ArrowRight, Send, CheckCircle2,
  ChevronDown, ChevronUp
} from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const token = () => localStorage.getItem("capymatch_token");
const authHeaders = () => ({ headers: { Authorization: `Bearer ${token()}` } });

const INTEREST_BADGE = {
  hot: { cls: "bg-red-100 text-red-700 border-red-200", label: "Hot", dot: "bg-red-500" },
  warm: { cls: "bg-amber-100 text-amber-700 border-amber-200", label: "Warm", dot: "bg-amber-400" },
  cool: { cls: "bg-sky-100 text-sky-700 border-sky-200", label: "Cool", dot: "bg-sky-400" },
  none: { cls: "bg-gray-100 text-gray-500 border-gray-200", label: "—", dot: "bg-gray-300" },
};

const INTEREST_ORDER = { hot: 0, warm: 1, cool: 2, none: 3 };

// ─── Routing Progress Bar ──────────────────────────────
function RoutingProgress({ allNotes }) {
  const total = allNotes.length;
  const sentToAthlete = allNotes.filter(n => n.sent_to_athlete).length;
  const pct = total > 0 ? 100 : 0; // All auto-routed

  return (
    <div className="bg-white border border-gray-100 rounded-xl p-4" data-testid="routing-progress">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Debrief Progress</span>
        <span className="text-xs font-semibold text-gray-700">{total} signals captured</span>
      </div>
      <div className="w-full bg-gray-100 rounded-full h-2 mb-2">
        <div className="h-2 rounded-full transition-all bg-emerald-500" style={{ width: `${pct}%` }} />
      </div>
      <div className="flex items-center gap-4 text-[11px] text-gray-500">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-blue-500" /> {total} auto-routed to pods
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-violet-500" /> {sentToAthlete} assigned to athletes
        </span>
      </div>
    </div>
  );
}

// ─── Note Action Buttons ───────────────────────────────
function NoteActions({ note, eventId, onRefresh }) {
  const [sendingToAthlete, setSendingToAthlete] = useState(false);

  const sendToAthlete = async () => {
    setSendingToAthlete(true);
    try {
      await axios.post(`${API}/events/${eventId}/notes/${note.id}/send-to-athlete`, {}, authHeaders());
      toast.success(`Sent to ${note.athlete_name?.split(" ")[0] || "athlete"}`);
      onRefresh();
    } catch {
      toast.error("Failed to send to athlete");
    } finally {
      setSendingToAthlete(false);
    }
  };

  const isSent = note.sent_to_athlete;

  return (
    <div className="flex items-center gap-1.5 shrink-0 ml-2">
      {/* Always In Pod (auto-routed) */}
      <span className="flex items-center gap-0.5 text-[10px] text-blue-600 font-medium px-2 py-1 bg-blue-50 rounded-md border border-blue-100" data-testid={`routed-badge-${note.id}`}>
        <Check className="w-3 h-3" /> In Pod
      </span>
      {/* Send to Athlete */}
      {isSent ? (
        <span className="flex items-center gap-0.5 text-[10px] text-violet-600 font-medium px-2 py-1 bg-violet-50 rounded-md border border-violet-100" data-testid={`sent-badge-${note.id}`}>
          <Check className="w-3 h-3" /> Assigned
        </span>
      ) : (
        <button
          onClick={(e) => { e.stopPropagation(); sendToAthlete(); }}
          disabled={sendingToAthlete}
          className="flex items-center gap-1 px-2 py-1.5 text-[10px] font-medium text-violet-700 bg-violet-50 hover:bg-violet-100 rounded-md transition-colors border border-violet-100 disabled:opacity-50"
          data-testid={`send-to-athlete-${note.id}`}
          title="Send action to athlete — shows in their hero card and messages"
        >
          <Send className="w-3 h-3" />
          {sendingToAthlete ? "..." : "Send to Athlete"}
        </button>
      )}
    </div>
  );
}

// ─── Athlete Card ──────────────────────────────────────
function AthleteCard({ athleteId, athleteName, notes, eventId, onRefresh, navigate }) {
  const [expanded, setExpanded] = useState(true);

  const sortedNotes = useMemo(() =>
    [...notes].sort((a, b) => INTEREST_ORDER[a.interest_level || "none"] - INTEREST_ORDER[b.interest_level || "none"]),
    [notes]
  );

  const hotCount = notes.filter(n => n.interest_level === "hot").length;
  const warmCount = notes.filter(n => n.interest_level === "warm").length;
  const followUpCount = notes.reduce((sum, n) => sum + (n.follow_ups?.length || 0), 0);
  const allActioned = notes.every(n => n.routed_to_pod || n.sent_to_athlete);

  return (
    <div className="bg-white border border-gray-100 rounded-xl overflow-hidden" data-testid={`athlete-card-${athleteId}`}>
      {/* Athlete header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50/50 transition-colors"
        data-testid={`athlete-card-toggle-${athleteId}`}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm text-gray-900">{athleteName}</span>
            {allActioned && (
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            )}
          </div>
          <div className="flex items-center gap-1.5">
            {hotCount > 0 && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-red-100 text-red-700">{hotCount} hot</span>}
            {warmCount > 0 && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700">{warmCount} warm</span>}
            <span className="text-[10px] text-gray-400">{notes.length} notes</span>
            {followUpCount > 0 && <span className="text-[10px] text-gray-400">· {followUpCount} follow-ups</span>}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span
            role="link"
            tabIndex={0}
            onClick={(e) => { e.stopPropagation(); navigate(`/support-pods/${athleteId}`); }}
            onKeyDown={(e) => { if (e.key === "Enter") { e.stopPropagation(); navigate(`/support-pods/${athleteId}`); } }}
            className="text-[10px] text-gray-400 hover:text-gray-700 flex items-center gap-0.5 transition-colors cursor-pointer"
            data-testid={`open-pod-${athleteId}`}
          >
            Pod <ExternalLink className="w-3 h-3" />
          </span>
          {expanded ? <ChevronUp className="w-4 h-4 text-gray-300" /> : <ChevronDown className="w-4 h-4 text-gray-300" />}
        </div>
      </button>

      {/* Notes list */}
      {expanded && (
        <div className="border-t border-gray-50 divide-y divide-gray-50">
          {sortedNotes.map((n) => {
            const badge = INTEREST_BADGE[n.interest_level] || INTEREST_BADGE.none;
            return (
              <div key={n.id} className="px-4 py-2.5 flex items-start justify-between gap-2" data-testid={`summary-note-${n.id}`}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                    {n.school_name && (
                      <span className="text-xs font-medium text-gray-700">{n.school_name}</span>
                    )}
                    <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold border ${badge.cls}`}>{badge.label}</span>
                    {n.follow_ups?.length > 0 && (
                      <div className="flex gap-1">
                        {n.follow_ups.map((f) => (
                          <span key={f} className="text-[9px] px-1.5 py-0.5 bg-gray-100 rounded text-gray-500">{f.replace(/_/g, " ")}</span>
                        ))}
                      </div>
                    )}
                  </div>
                  {n.note_text && <p className="text-[11px] text-gray-500 line-clamp-2">"{n.note_text}"</p>}
                </div>
                <NoteActions note={n} eventId={eventId} onRefresh={onRefresh} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── School Engagement Summary ─────────────────────────
function SchoolHeatmap({ schoolsSeen }) {
  if (schoolsSeen.length === 0) return null;
  const maxInteractions = Math.max(...schoolsSeen.map(s => s.interactions), 1);

  return (
    <div className="bg-white border border-gray-100 rounded-xl p-4" data-testid="school-heatmap">
      <h2 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-3">School Engagement</h2>
      <div className="space-y-2">
        {schoolsSeen.map((s) => {
          const pct = Math.round((s.interactions / maxInteractions) * 100);
          return (
            <div key={s.name} className="flex items-center gap-3" data-testid={`school-bar-${s.name.toLowerCase().replace(/\s+/g, "-")}`}>
              <span className="text-xs font-medium text-gray-700 w-28 truncate shrink-0">{s.name}</span>
              <div className="flex-1 flex items-center gap-1.5">
                <div className="flex-1 bg-gray-100 rounded-full h-3 overflow-hidden flex">
                  {s.hot > 0 && <div className="h-full bg-red-400" style={{ width: `${(s.hot / s.interactions) * pct}%` }} />}
                  {s.warm > 0 && <div className="h-full bg-amber-300" style={{ width: `${(s.warm / s.interactions) * pct}%` }} />}
                  {s.cool > 0 && <div className="h-full bg-sky-300" style={{ width: `${(s.cool / s.interactions) * pct}%` }} />}
                  {(s.interactions - s.hot - s.warm - s.cool) > 0 && (
                    <div className="h-full bg-gray-300" style={{ width: `${((s.interactions - s.hot - s.warm - s.cool) / s.interactions) * pct}%` }} />
                  )}
                </div>
                <span className="text-[10px] text-gray-400 w-3 text-right shrink-0">{s.interactions}</span>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {s.hot > 0 && <span className="w-2 h-2 rounded-full bg-red-400" title={`${s.hot} hot`} />}
                {s.warm > 0 && <span className="w-2 h-2 rounded-full bg-amber-400" title={`${s.warm} warm`} />}
                {s.cool > 0 && <span className="w-2 h-2 rounded-full bg-sky-400" title={`${s.cool} cool`} />}
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex items-center gap-3 mt-3 text-[10px] text-gray-400">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400" /> Hot</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400" /> Warm</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-sky-400" /> Cool</span>
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────
function EventSummary() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [completing, setCompleting] = useState(false);

  const fetchSummary = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/events/${eventId}/summary`, authHeaders());
      setData(res.data);
    } catch {
      toast.error("Failed to load summary");
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => { fetchSummary(); }, [fetchSummary]);

  const completeDebrief = async () => {
    setCompleting(true);
    try {
      await axios.post(`${API}/events/${eventId}/debrief-complete`, {}, authHeaders());
      toast.success("Debrief marked as complete");
      fetchSummary();
    } catch {
      toast.error("Failed to complete debrief");
    } finally {
      setCompleting(false);
    }
  };

  // Group notes by athlete
  const athleteGroups = useMemo(() => {
    if (!data?.allNotes) return [];
    const groups = {};
    for (const n of data.allNotes) {
      const key = n.athlete_id;
      if (!groups[key]) {
        groups[key] = { athleteId: key, athleteName: n.athlete_name || "Unknown", notes: [] };
      }
      groups[key].notes.push(n);
    }
    // Sort by priority: most hot/warm notes first
    return Object.values(groups).sort((a, b) => {
      const scoreA = a.notes.filter(n => n.interest_level === "hot").length * 10 + a.notes.filter(n => n.interest_level === "warm").length * 5;
      const scoreB = b.notes.filter(n => n.interest_level === "hot").length * 10 + b.notes.filter(n => n.interest_level === "warm").length * 5;
      return scoreB - scoreA;
    });
  }, [data?.allNotes]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-400" />
      </div>
    );
  }

  if (!data || data.error) {
    return (
      <div className="flex items-center justify-center py-32">
        <p className="text-gray-500">No summary data available. Capture notes in Live Mode first.</p>
      </div>
    );
  }

  const { event, stats, schoolsSeen, allNotes } = data;
  const isDebriefed = event?.summaryStatus === "complete";

  return (
    <div data-testid="event-summary-page">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-100">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate("/events")} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors" data-testid="back-to-events-summary">
              <ArrowLeft className="w-4 h-4" /><span className="hidden sm:inline">Events</span>
            </button>
            <div className="h-5 w-px bg-gray-200" />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-semibold text-gray-900 text-base leading-tight" data-testid="summary-event-name">{event?.name} — Summary</h1>
                {isDebriefed && (
                  <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full" data-testid="debriefed-badge">
                    <CheckCircle2 className="w-3 h-3" /> Debriefed
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500">{event?.location} · {stats.totalNotes} notes captured</p>
            </div>
          </div>
          {!isDebriefed && (
            <button
              onClick={completeDebrief}
              disabled={completing}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50"
              data-testid="complete-debrief-btn"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              {completing ? "Completing..." : "Complete Debrief"}
            </button>
          )}
        </div>
      </header>

      <main className="max-w-[1200px] mx-auto px-4 sm:px-6 py-6 space-y-5">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3" data-testid="event-stats">
          {[
            { label: "Notes Captured", value: stats.totalNotes, icon: FileText },
            { label: "Schools Interacted", value: stats.schoolsInteracted, icon: GraduationCap },
            { label: "Athletes Seen", value: stats.athletesSeen, icon: Users },
            { label: "Follow-ups Needed", value: stats.followUpsNeeded, icon: ListChecks },
          ].map((s) => (
            <div key={s.label} className="bg-white border border-gray-100 rounded-xl p-4 text-center">
              <s.icon className="w-4 h-4 text-gray-400 mx-auto mb-1" />
              <div className="text-xl font-bold text-gray-900">{s.value}</div>
              <div className="text-[10px] text-gray-400 uppercase tracking-wider">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Routing Progress */}
        <RoutingProgress allNotes={allNotes} />

        {/* Two-column: Athletes + Schools */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Athletes — Main Column */}
          <div className="lg:col-span-2 space-y-3">
            <h2 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
              Athletes ({athleteGroups.length})
              <span className="ml-2 text-gray-300 normal-case font-normal">sorted by interest priority</span>
            </h2>
            {athleteGroups.map((g) => (
              <AthleteCard
                key={g.athleteId}
                athleteId={g.athleteId}
                athleteName={g.athleteName}
                notes={g.notes}
                eventId={eventId}
                onRefresh={fetchSummary}
                navigate={navigate}
              />
            ))}
          </div>

          {/* Right Sidebar — Schools + Actions Legend */}
          <div className="space-y-4">
            <SchoolHeatmap schoolsSeen={schoolsSeen} />

            {/* Action Paths Legend */}
            <div className="bg-white border border-gray-100 rounded-xl p-4" data-testid="action-paths-legend">
              <h2 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-3">Action Paths</h2>
              <div className="space-y-3">
                <div className="flex items-start gap-2.5">
                  <div className="w-6 h-6 rounded-md bg-violet-50 border border-violet-100 flex items-center justify-center shrink-0 mt-0.5">
                    <Send className="w-3 h-3 text-violet-600" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-800">Send to Athlete</p>
                    <p className="text-[10px] text-gray-500 leading-relaxed">
                      For urgent, athlete-owned actions. Creates a message to the athlete with action items.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-2.5">
                  <div className="w-6 h-6 rounded-md bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0 mt-0.5">
                    <ArrowRight className="w-3 h-3 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-800">Add to School Pod</p>
                    <p className="text-[10px] text-gray-500 leading-relaxed">
                      For school-specific follow-ups. Creates a pod action with school context.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default EventSummary;

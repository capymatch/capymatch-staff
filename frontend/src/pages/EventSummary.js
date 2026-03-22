import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import {
  ArrowLeft, FileText, GraduationCap, Users, ListChecks,
  ExternalLink, Check, ArrowRight, Send, CheckCircle2,
  ChevronDown, ChevronUp, Megaphone, Flame, AlertTriangle,
  Clock, Zap, Eye, Film
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

/* ─── Action hint logic ─── */
function getSchoolHint(interest, followUps) {
  const hasFilm = followUps?.includes("send_film") || followUps?.includes("needs_film");
  if (interest === "hot") return { text: "Follow up within 24h", color: "text-red-600", bg: "bg-red-50" };
  if (hasFilm) return { text: "Send film", color: "text-amber-600", bg: "bg-amber-50" };
  if (interest === "warm") return { text: "Monitor and engage", color: "text-amber-600", bg: "bg-amber-50" };
  if (interest === "cool") return { text: "Low priority", color: "text-gray-500", bg: "bg-gray-50" };
  return null;
}

function deriveActions(allNotes) {
  const actions = [];
  for (const n of allNotes) {
    if (!n.school_name) continue;
    const isHot = n.interest_level === "hot";
    const needsFilm = n.follow_ups?.some(f => f.includes("film"));
    const notSent = !n.sent_to_athlete;

    if (isHot && notSent) {
      actions.push({ id: n.id, school: n.school_name, athlete: n.athlete_name?.split(" ")[0], action: "Send highlight to athlete", deadline: "Today", priority: 0, icon: Send, color: "text-red-600", borderColor: "border-l-red-500" });
    } else if (needsFilm) {
      actions.push({ id: n.id, school: n.school_name, athlete: n.athlete_name?.split(" ")[0], action: "Send film", deadline: "Within 72h", priority: 1, icon: Film, color: "text-amber-600", borderColor: "border-l-amber-400" });
    } else if (isHot) {
      actions.push({ id: n.id, school: n.school_name, athlete: n.athlete_name?.split(" ")[0], action: "Schedule call", deadline: "Within 48h", priority: 2, icon: Clock, color: "text-red-500", borderColor: "border-l-red-400" });
    }
  }
  actions.sort((a, b) => a.priority - b.priority);
  return actions.slice(0, 5);
}

/* ─── 1. Actions Needed Today ─── */
function ActionsNeeded({ allNotes }) {
  const actions = useMemo(() => deriveActions(allNotes), [allNotes]);
  if (actions.length === 0) return null;

  return (
    <div className="bg-white border border-red-100 rounded-xl overflow-hidden" data-testid="actions-needed">
      <div className="px-4 py-2.5 bg-red-50/60 border-b border-red-100 flex items-center gap-2">
        <Flame className="w-4 h-4 text-red-500" />
        <span className="text-[11px] font-bold text-red-700 uppercase tracking-wider">Actions Needed Today</span>
        <span className="text-[10px] text-red-400 ml-auto">{actions.length} pending</span>
      </div>
      <div className="divide-y divide-gray-50">
        {actions.map((a, i) => {
          const Icon = a.icon;
          return (
            <div key={a.id + i} className={`px-4 py-2.5 flex items-center gap-3 border-l-3 ${a.borderColor}`} data-testid={`action-item-${i}`}
              style={{ borderLeftWidth: 3 }}>
              <Icon className={`w-4 h-4 shrink-0 ${a.color}`} />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-gray-800">
                  <span className="font-semibold">{a.school}</span>
                  {a.athlete && <span className="text-gray-400"> · {a.athlete}</span>}
                </p>
                <p className="text-[10px] text-gray-500">{a.action}</p>
              </div>
              <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                a.priority === 0 ? "bg-red-100 text-red-700" : a.priority === 1 ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-600"
              }`}>{a.deadline}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Routing Progress ─── */
function RoutingProgress({ allNotes }) {
  const total = allNotes.length;
  const sentToAthlete = allNotes.filter(n => n.sent_to_athlete).length;
  const pct = total > 0 ? 100 : 0;

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

/* ─── 3. Smart Note Actions (Primary/Secondary hierarchy) ─── */
function NoteActions({ note, eventId, onRefresh, isUrgent }) {
  const navigate = useNavigate();
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

  const advocateForNote = () => {
    const params = new URLSearchParams();
    if (note.athlete_id) params.set("athlete", note.athlete_id);
    if (note.school_name) params.set("schoolName", note.school_name);
    navigate(`/advocacy/new?${params.toString()}`);
  };

  const isSent = note.sent_to_athlete;
  const showPrimaryHighlight = isUrgent && !isSent;

  return (
    <div className="mt-1.5">
      {/* Primary action — highlighted when urgent */}
      {showPrimaryHighlight ? (
        <div className="mb-1.5">
          <button
            onClick={(e) => { e.stopPropagation(); sendToAthlete(); }}
            disabled={sendingToAthlete}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold text-red-700 bg-red-50 hover:bg-red-100 rounded-lg transition-colors border border-red-200 disabled:opacity-50 w-full sm:w-auto"
            data-testid={`send-to-athlete-${note.id}`}
          >
            <Flame className="w-3.5 h-3.5" />
            {sendingToAthlete ? "Sending..." : "Send to Athlete"}
          </button>
        </div>
      ) : null}
      {/* Secondary actions row */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className="flex items-center gap-0.5 text-[10px] text-blue-600 font-medium px-2 py-1 bg-blue-50 rounded-md border border-blue-100" data-testid={`routed-badge-${note.id}`}>
          <Check className="w-3 h-3" /> In Pod
        </span>
        {!showPrimaryHighlight && (
          isSent ? (
            <span className="flex items-center gap-0.5 text-[10px] text-violet-600 font-medium px-2 py-1 bg-violet-50 rounded-md border border-violet-100" data-testid={`sent-badge-${note.id}`}>
              <Check className="w-3 h-3" /> Assigned
            </span>
          ) : (
            <button
              onClick={(e) => { e.stopPropagation(); sendToAthlete(); }}
              disabled={sendingToAthlete}
              className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium text-violet-700 bg-violet-50 hover:bg-violet-100 rounded-md transition-colors border border-violet-100 disabled:opacity-50"
              data-testid={`send-to-athlete-${note.id}`}
            >
              <Send className="w-3 h-3" />
              {sendingToAthlete ? "..." : "Send to Athlete"}
            </button>
          )
        )}
        {isSent && showPrimaryHighlight && (
          <span className="flex items-center gap-0.5 text-[10px] text-violet-600 font-medium px-2 py-1 bg-violet-50 rounded-md border border-violet-100" data-testid={`sent-badge-${note.id}`}>
            <Check className="w-3 h-3" /> Assigned
          </span>
        )}
        {note.school_name && (
          <button
            onClick={(e) => { e.stopPropagation(); advocateForNote(); }}
            className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-md transition-colors border border-amber-100"
            data-testid={`advocate-note-${note.id}`}
          >
            <Megaphone className="w-3 h-3" />
            Advocate
          </button>
        )}
      </div>
    </div>
  );
}

/* ─── 2. Athlete Card with urgency labels ─── */
function AthleteCard({ athleteId, athleteName, notes, eventId, onRefresh, navigate }) {
  const [expanded, setExpanded] = useState(true);

  const sortedNotes = useMemo(() =>
    [...notes].sort((a, b) => INTEREST_ORDER[a.interest_level || "none"] - INTEREST_ORDER[b.interest_level || "none"]),
    [notes]
  );

  const urgentCount = notes.filter(n => n.interest_level === "hot" && !n.sent_to_athlete).length;
  const riskCount = notes.filter(n => n.follow_ups?.some(f => f.includes("film"))).length;
  const followUpCount = notes.reduce((sum, n) => sum + (n.follow_ups?.length || 0), 0);
  const allActioned = notes.every(n => n.sent_to_athlete);

  return (
    <div className={`bg-white border rounded-xl overflow-hidden ${urgentCount > 0 ? "border-red-200" : "border-gray-100"}`} data-testid={`athlete-card-${athleteId}`}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-3 hover:bg-gray-50/50 transition-colors text-left"
        data-testid={`athlete-card-toggle-${athleteId}`}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm text-gray-900">{athleteName}</span>
              {allActioned && <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />}
            </div>
            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
              {urgentCount > 0 && (
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 flex items-center gap-0.5" data-testid={`urgent-badge-${athleteId}`}>
                  <Flame className="w-2.5 h-2.5" />{urgentCount} urgent
                </span>
              )}
              {riskCount > 0 && (
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 flex items-center gap-0.5" data-testid={`risk-badge-${athleteId}`}>
                  <AlertTriangle className="w-2.5 h-2.5" />{riskCount} risk
                </span>
              )}
              <span className="text-[10px] text-gray-400">{notes.length} notes</span>
              {followUpCount > 0 && <span className="text-[10px] text-gray-400">· {followUpCount} follow-ups</span>}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 mt-0.5">
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
        </div>
      </button>

      {expanded && (
        <div className="border-t border-gray-50 divide-y divide-gray-50">
          {sortedNotes.map((n) => {
            const badge = INTEREST_BADGE[n.interest_level] || INTEREST_BADGE.none;
            const isHot = n.interest_level === "hot";
            const hint = getSchoolHint(n.interest_level, n.follow_ups);
            // Visual priority border
            const borderCls = isHot && !n.sent_to_athlete ? "border-l-red-400" : n.follow_ups?.some(f => f.includes("film")) ? "border-l-amber-300" : "border-l-transparent";

            return (
              <div key={n.id} className={`px-4 py-2.5 ${borderCls}`} style={{ borderLeftWidth: 3 }} data-testid={`summary-note-${n.id}`}>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                    {n.school_name && (
                      <span className="text-xs font-medium text-gray-700">{n.school_name}</span>
                    )}
                    <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold border ${badge.cls}`}>{badge.label}</span>
                    {n.follow_ups?.length > 0 && (
                      <div className="flex gap-1 flex-wrap">
                        {n.follow_ups.map((f) => (
                          <span key={f} className="text-[9px] px-1.5 py-0.5 bg-gray-100 rounded text-gray-500">{f.replace(/_/g, " ")}</span>
                        ))}
                      </div>
                    )}
                  </div>
                  {/* 4. Action hint */}
                  {hint && (
                    <p className={`text-[10px] font-medium mt-0.5 flex items-center gap-1 ${hint.color}`} data-testid={`school-hint-${n.id}`}>
                      <ArrowRight className="w-3 h-3" />
                      {hint.text}
                    </p>
                  )}
                  {n.note_text && <p className="text-[11px] text-gray-500 line-clamp-2 mt-0.5">"{n.note_text}"</p>}
                </div>
                <NoteActions note={n} eventId={eventId} onRefresh={onRefresh} isUrgent={isHot} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ─── 4. School Engagement with hints ─── */
function SchoolHeatmap({ schoolsSeen }) {
  if (schoolsSeen.length === 0) return null;
  const maxInteractions = Math.max(...schoolsSeen.map(s => s.interactions), 1);

  return (
    <div className="bg-white border border-gray-100 rounded-xl p-4" data-testid="school-heatmap">
      <h2 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-3">School Engagement</h2>
      <div className="space-y-2.5">
        {schoolsSeen.map((s) => {
          const pct = Math.round((s.interactions / maxInteractions) * 100);
          const hint = s.hot > 0 ? "Follow up within 24h" : s.warm > 0 ? "Monitor and engage" : "Low priority";
          const hintColor = s.hot > 0 ? "text-red-500" : s.warm > 0 ? "text-amber-500" : "text-gray-400";
          return (
            <div key={s.name} data-testid={`school-bar-${s.name.toLowerCase().replace(/\s+/g, "-")}`}>
              <div className="flex items-center gap-3">
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
              <p className={`text-[9px] font-medium mt-0.5 ml-[7.5rem] ${hintColor}`} data-testid={`school-hint-bar-${s.name.toLowerCase().replace(/\s+/g, "-")}`}>
                {hint}
              </p>
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

/* ─── Main Page ─── */
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
  const pendingActions = deriveActions(allNotes);

  return (
    <div data-testid="event-summary-page">
      {/* Header */}
      <header className="bg-white/95 border-b border-gray-100">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <button onClick={() => navigate("/events")} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors shrink-0" data-testid="back-to-events-summary">
                <ArrowLeft className="w-4 h-4" /><span className="hidden sm:inline">Events</span>
              </button>
              <div className="h-5 w-px bg-gray-200 shrink-0" />
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
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
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 shrink-0"
                data-testid="complete-debrief-btn"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                {completing ? "..." : "Complete Debrief"}
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-[1200px] mx-auto px-4 sm:px-6 py-5 space-y-4">
        {/* 1. Actions Needed Today — TOP PRIORITY */}
        <ActionsNeeded allNotes={allNotes} />

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3" data-testid="event-stats">
          {[
            { label: "Notes Captured", value: stats.totalNotes, icon: FileText },
            { label: "Schools Interacted", value: stats.schoolsInteracted, icon: GraduationCap },
            { label: "Athletes Seen", value: stats.athletesSeen, icon: Users },
            { label: "Follow-ups Needed", value: stats.followUpsNeeded, icon: ListChecks },
          ].map((s) => (
            <div key={s.label} className="bg-white border border-gray-100 rounded-xl p-3 sm:p-4 text-center">
              <s.icon className="w-4 h-4 text-gray-400 mx-auto mb-1" />
              <div className="text-xl font-bold text-gray-900">{s.value}</div>
              <div className="text-[10px] text-gray-400 uppercase tracking-wider">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Routing Progress */}
        <RoutingProgress allNotes={allNotes} />

        {/* 5. Tournament Mode Banner */}
        {pendingActions.length >= 2 && !isDebriefed && (
          <div className="bg-gradient-to-r from-gray-800 to-gray-900 rounded-xl p-4 flex items-center gap-3" data-testid="tournament-mode-banner">
            <Zap className="w-5 h-5 text-amber-400 shrink-0" />
            <div className="min-w-0">
              <p className="text-xs font-semibold text-white">Tournament Mode could have automated {Math.min(pendingActions.length, 3)} of these actions</p>
              <p className="text-[10px] text-gray-400 mt-0.5">Auto-send highlights, schedule calls, and notify athletes in real-time</p>
            </div>
          </div>
        )}

        {/* Two-column: Athletes + Schools */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
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

          <div className="space-y-4">
            <SchoolHeatmap schoolsSeen={schoolsSeen} />

            <div className="bg-white border border-gray-100 rounded-xl p-4" data-testid="action-paths-legend">
              <h2 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-3">Action Paths</h2>
              <div className="space-y-3">
                <div className="flex items-start gap-2.5">
                  <div className="w-6 h-6 rounded-md bg-violet-50 border border-violet-100 flex items-center justify-center shrink-0 mt-0.5">
                    <Send className="w-3 h-3 text-violet-600" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-800">Send to Athlete</p>
                    <p className="text-[10px] text-gray-500 leading-relaxed">For urgent, athlete-owned actions.</p>
                  </div>
                </div>
                <div className="flex items-start gap-2.5">
                  <div className="w-6 h-6 rounded-md bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0 mt-0.5">
                    <ArrowRight className="w-3 h-3 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-800">Add to School Pod</p>
                    <p className="text-[10px] text-gray-500 leading-relaxed">For school-specific follow-ups.</p>
                  </div>
                </div>
                <div className="flex items-start gap-2.5">
                  <div className="w-6 h-6 rounded-md bg-amber-50 border border-amber-100 flex items-center justify-center shrink-0 mt-0.5">
                    <Megaphone className="w-3 h-3 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-800">Advocate</p>
                    <p className="text-[10px] text-gray-500 leading-relaxed">Send a recommendation to the college coach.</p>
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

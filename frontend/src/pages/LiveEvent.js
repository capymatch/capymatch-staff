import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { ArrowLeft, Radio, Send, Clock, Check, Zap, Users, FileText, X } from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const INTEREST = [
  { value: "hot", label: "Hot", cls: "bg-red-500 text-white", ring: "ring-red-300", key: "1" },
  { value: "warm", label: "Warm", cls: "bg-amber-400 text-white", ring: "ring-amber-200", key: "2" },
  { value: "cool", label: "Cool", cls: "bg-sky-400 text-white", ring: "ring-sky-200", key: "3" },
  { value: "none", label: "None", cls: "bg-gray-200 text-gray-600", ring: "ring-gray-200", key: "4" },
];

const FOLLOW_UPS = [
  { value: "send_film", label: "Send film" },
  { value: "schedule_call", label: "Schedule call" },
  { value: "add_to_targets", label: "Add to target list" },
  { value: "route_to_pod", label: "Route to Support Pod" },
];

const QUICK_TEMPLATES = [
  { label: "Strong performance", text: "Strong performance today — stood out on the court." },
  { label: "Coach showed interest", text: "Coach showed clear interest, asked for more info." },
  { label: "Needs more film", text: "Coach wants to see updated highlight reel before next step." },
  { label: "Good conversation", text: "Had a productive conversation with coaching staff." },
  { label: "Offered visit", text: "Coach invited athlete for an unofficial campus visit." },
  { label: "Standout skill", text: "Displayed standout skill that caught attention." },
];

function timeAgo(iso) {
  const diff = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

function formatElapsed(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${String(s).padStart(2, "0")}s`;
  return `${s}s`;
}

function LiveEvent() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const noteRef = useRef(null);

  const [event, setEvent] = useState(null);
  const [athletes, setAthletes] = useState([]);
  const [schools, setSchools] = useState([]);
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);

  // Capture form state
  const [selectedAthlete, setSelectedAthlete] = useState(null);
  const [selectedSchool, setSelectedSchool] = useState(null);
  const [interest, setInterest] = useState(null);
  const [noteText, setNoteText] = useState("");
  const [followUps, setFollowUps] = useState([]);
  const [saving, setSaving] = useState(false);
  const [lastSavedId, setLastSavedId] = useState(null);

  // Session timer
  const [sessionStart] = useState(() => Date.now());
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setElapsed(Math.floor((Date.now() - sessionStart) / 1000)), 1000);
    return () => clearInterval(timer);
  }, [sessionStart]);

  const fetchData = useCallback(async () => {
    try {
      const [prepRes, notesRes] = await Promise.all([
        axios.get(`${API}/events/${eventId}/prep`),
        axios.get(`${API}/events/${eventId}/notes`),
      ]);
      setEvent(prepRes.data.event);
      setAthletes(prepRes.data.athletes);
      setSchools(prepRes.data.targetSchools);
      setNotes(notesRes.data);
    } catch {
      toast.error("Failed to load event data");
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Smart school sorting: athlete's target schools first
  const sortedSchools = useMemo(() => {
    if (!selectedAthlete) return schools.slice(0, 12);
    const ath = athletes.find(a => a.id === selectedAthlete);
    const targetNames = (ath?.targetSchoolsAtEvent || []).map(n => n.toLowerCase());
    const isTarget = (s) => targetNames.some(t => s.name.toLowerCase().includes(t) || t.includes(s.name.toLowerCase()));
    const targets = schools.filter(s => isTarget(s));
    const others = schools.filter(s => !isTarget(s));
    return [...targets, ...others].slice(0, 12);
  }, [selectedAthlete, athletes, schools]);

  // Track which athletes have been covered
  const athletesCovered = useMemo(() => {
    return new Set(notes.map(n => n.athlete_id));
  }, [notes]);

  const toggleFollowUp = (val) => {
    setFollowUps((prev) => prev.includes(val) ? prev.filter((f) => f !== val) : [...prev, val]);
  };

  const clearForm = () => {
    setSelectedSchool(null);
    setInterest(null);
    setNoteText("");
    setFollowUps([]);
    noteRef.current?.focus();
  };

  const logNote = async () => {
    if (!selectedAthlete) {
      toast.error("Select an athlete first");
      return;
    }
    setSaving(true);
    try {
      const school = schools.find((s) => s.id === selectedSchool);
      const res = await axios.post(`${API}/events/${eventId}/notes`, {
        athlete_id: selectedAthlete,
        school_id: selectedSchool || null,
        school_name: school?.name || "",
        interest_level: interest || "none",
        note_text: noteText,
        follow_ups: followUps,
      });
      setNotes((prev) => [res.data, ...prev]);
      setLastSavedId(res.data.id);
      setTimeout(() => setLastSavedId(null), 3000);
      // Clear form but keep athlete selected for rapid entry
      clearForm();
      const ath = athletes.find((a) => a.id === selectedAthlete);
      toast.success(`Saved — ${ath?.full_name || "Athlete"} × ${school?.name || "—"}`);
    } catch {
      toast.error("Failed to save note");
    } finally {
      setSaving(false);
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e) => {
      // Enter (not in textarea or with shift) = log note
      if (e.key === "Enter" && e.ctrlKey) {
        e.preventDefault();
        logNote();
        return;
      }
      // Escape = clear form
      if (e.key === "Escape") {
        clearForm();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white" />
      </div>
    );
  }

  const targetSchoolIds = (() => {
    if (!selectedAthlete) return new Set();
    const ath = athletes.find(a => a.id === selectedAthlete);
    const targetNames = (ath?.targetSchoolsAtEvent || []).map(n => n.toLowerCase());
    return new Set(schools.filter(s => targetNames.some(t => s.name.toLowerCase().includes(t) || t.includes(s.name.toLowerCase()))).map(s => s.id));
  })();

  return (
    <div className="min-h-screen bg-gray-900 text-white" data-testid="live-event-page">
      {/* Compact header */}
      <header className="sticky top-0 z-50 bg-gray-900/95 backdrop-blur-sm border-b border-gray-700/50">
        <div className="max-w-[900px] mx-auto px-4 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(`/events/${eventId}/prep`)} className="text-gray-400 hover:text-white transition-colors" data-testid="back-from-live">
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-semibold text-sm">{event?.name}</h1>
                <span className="flex items-center gap-1 text-[10px] font-bold text-red-400 uppercase tracking-wider">
                  <Radio className="w-3 h-3 animate-pulse" /> LIVE
                </span>
              </div>
            </div>
          </div>
          <span className="text-xs text-gray-400" data-testid="note-counter">{notes.length} notes</span>
        </div>
      </header>

      {/* Live Stats Bar */}
      <div className="bg-gray-800/60 border-b border-gray-700/30" data-testid="live-stats-bar">
        <div className="max-w-[900px] mx-auto px-4 py-2 flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-1.5 text-[11px]">
            <Clock className="w-3 h-3 text-gray-500" />
            <span className="text-gray-400">Session:</span>
            <span className="font-mono font-medium text-gray-200" data-testid="session-timer">{formatElapsed(elapsed)}</span>
          </div>
          <div className="w-px h-3 bg-gray-700" />
          <div className="flex items-center gap-1.5 text-[11px]">
            <FileText className="w-3 h-3 text-gray-500" />
            <span className="font-medium text-gray-200" data-testid="stat-notes-count">{notes.length}</span>
            <span className="text-gray-400">notes</span>
          </div>
          <div className="w-px h-3 bg-gray-700" />
          <div className="flex items-center gap-1.5 text-[11px]">
            <Users className="w-3 h-3 text-gray-500" />
            <span className="font-medium text-gray-200" data-testid="stat-athletes-covered">{athletesCovered.size}/{athletes.length}</span>
            <span className="text-gray-400">athletes covered</span>
          </div>
          <div className="w-px h-3 bg-gray-700" />
          <div className="flex items-center gap-1.5 text-[11px]">
            <Zap className="w-3 h-3 text-gray-500" />
            <span className="font-medium text-gray-200" data-testid="stat-rate">
              {elapsed > 60 ? `${(notes.length / (elapsed / 60)).toFixed(1)}/min` : "—"}
            </span>
            <span className="text-gray-400">rate</span>
          </div>
          <div className="ml-auto text-[10px] text-gray-500 hidden sm:block">
            <kbd className="px-1 py-0.5 bg-gray-700 rounded text-gray-400 font-mono">Ctrl+Enter</kbd> log · <kbd className="px-1 py-0.5 bg-gray-700 rounded text-gray-400 font-mono">Esc</kbd> clear
          </div>
        </div>
      </div>

      <div className="max-w-[900px] mx-auto px-4 py-4">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Left: Capture form */}
          <div className="lg:col-span-3 space-y-4">
            {/* Athlete chips */}
            <div>
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2 block">Athlete</label>
              <div className="flex flex-wrap gap-1.5" data-testid="athlete-chips">
                {athletes.map((a) => {
                  const covered = athletesCovered.has(a.id);
                  return (
                    <button
                      key={a.id}
                      onClick={() => { setSelectedAthlete(a.id); setSelectedSchool(null); noteRef.current?.focus(); }}
                      data-testid={`athlete-chip-${a.id}`}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all relative ${
                        selectedAthlete === a.id
                          ? "bg-white text-gray-900 ring-2 ring-white/30"
                          : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                      }`}
                    >
                      {covered && selectedAthlete !== a.id && (
                        <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400" />
                      )}
                      {a.full_name.split(" ")[0]} {a.full_name.split(" ")[1]?.[0]}.
                    </button>
                  );
                })}
              </div>
            </div>

            {/* School chips — smart sorted */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">School</label>
                {selectedAthlete && targetSchoolIds.size > 0 && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-900/40 text-emerald-400 font-medium" data-testid="target-hint">
                    Target schools first
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5" data-testid="school-chips">
                {sortedSchools.map((s) => {
                  const isTarget = targetSchoolIds.has(s.id);
                  return (
                    <button
                      key={s.id}
                      onClick={() => setSelectedSchool(selectedSchool === s.id ? null : s.id)}
                      data-testid={`school-chip-${s.id}`}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                        selectedSchool === s.id
                          ? "bg-white text-gray-900 ring-2 ring-white/30"
                          : isTarget
                            ? "bg-emerald-800/40 text-emerald-300 border border-emerald-600/30 hover:bg-emerald-700/50"
                            : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                      }`}
                    >
                      {s.name}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Interest level */}
            <div>
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2 block">Interest</label>
              <div className="flex gap-2" data-testid="interest-selector">
                {INTEREST.map((i) => (
                  <button
                    key={i.value}
                    onClick={() => setInterest(interest === i.value ? null : i.value)}
                    data-testid={`interest-${i.value}`}
                    className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                      interest === i.value ? `${i.cls} ring-2 ${i.ring}` : "bg-gray-700 text-gray-400 hover:bg-gray-600"
                    }`}
                  >
                    {i.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Quick Templates */}
            <div>
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2 block">Quick Note</label>
              <div className="flex flex-wrap gap-1.5 mb-2" data-testid="quick-templates">
                {QUICK_TEMPLATES.map((t) => (
                  <button
                    key={t.label}
                    onClick={() => { setNoteText(t.text); noteRef.current?.focus(); }}
                    data-testid={`template-${t.label.toLowerCase().replace(/\s+/g, "-")}`}
                    className={`px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all border ${
                      noteText === t.text
                        ? "bg-gray-600 text-white border-gray-500"
                        : "bg-gray-800 text-gray-400 border-gray-700 hover:border-gray-500 hover:text-gray-300"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
              <textarea
                ref={noteRef}
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="Coach said..."
                maxLength={280}
                rows={2}
                data-testid="note-text"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-gray-500 resize-none"
              />
            </div>

            {/* Follow-ups */}
            <div>
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2 block">Follow-up</label>
              <div className="flex flex-wrap gap-2" data-testid="follow-ups">
                {FOLLOW_UPS.map((f) => (
                  <label key={f.value} className="flex items-center gap-1.5 cursor-pointer" data-testid={`followup-${f.value}`}>
                    <input
                      type="checkbox"
                      checked={followUps.includes(f.value)}
                      onChange={() => toggleFollowUp(f.value)}
                      className="w-4 h-4 rounded border-gray-600 bg-gray-800 text-white accent-white"
                    />
                    <span className="text-xs text-gray-300">{f.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Log button + clear */}
            <div className="flex items-center gap-2">
              <button
                onClick={logNote}
                disabled={saving || !selectedAthlete}
                data-testid="log-note-btn"
                className="flex-1 py-3 bg-white text-gray-900 font-bold text-sm rounded-lg hover:bg-gray-100 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <Send className="w-4 h-4" /> LOG NOTE
              </button>
              <button
                onClick={clearForm}
                data-testid="clear-form-btn"
                className="p-3 bg-gray-800 text-gray-400 rounded-lg hover:bg-gray-700 hover:text-gray-200 transition-colors border border-gray-700"
                title="Clear form (Esc)"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Right: Recent notes */}
          <div className="lg:col-span-2" data-testid="recent-notes-feed">
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-3 block">Recent</label>
            <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
              {notes.length === 0 ? (
                <p className="text-xs text-gray-500 text-center py-8">No notes yet. Start capturing.</p>
              ) : (
                notes.map((n) => {
                  const intStyle = INTEREST.find((i) => i.value === n.interest_level);
                  const isJustSaved = lastSavedId === n.id;
                  return (
                    <div
                      key={n.id}
                      className={`border rounded-lg p-3 transition-all ${
                        isJustSaved
                          ? "bg-emerald-900/20 border-emerald-600/40"
                          : "bg-gray-800 border-gray-700/50"
                      }`}
                      data-testid={`recent-note-${n.id}`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-white">{n.athlete_name?.split(" ")[0]}</span>
                          {n.school_name && (
                            <>
                              <span className="text-gray-600">&times;</span>
                              <span className="text-xs text-gray-300">{n.school_name}</span>
                            </>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {isJustSaved && (
                            <span className="flex items-center gap-0.5 text-[9px] text-emerald-400 font-bold animate-pulse" data-testid="saved-indicator">
                              <Check className="w-3 h-3" /> SAVED
                            </span>
                          )}
                          {intStyle && n.interest_level !== "none" && (
                            <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${intStyle.cls}`}>{intStyle.label}</span>
                          )}
                          <span className="text-[10px] text-gray-500 flex items-center gap-0.5">
                            <Clock className="w-2.5 h-2.5" /> {timeAgo(n.captured_at)}
                          </span>
                        </div>
                      </div>
                      {n.note_text && <p className="text-xs text-gray-400 line-clamp-2">{n.note_text}</p>}
                      {n.follow_ups?.length > 0 && (
                        <div className="flex gap-1 mt-1.5">
                          {n.follow_ups.map((f) => (
                            <span key={f} className="text-[9px] px-1.5 py-0.5 bg-gray-700 rounded text-gray-400">{f.replace(/_/g, " ")}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LiveEvent;

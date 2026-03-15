import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import {
  ArrowLeft, Radio, Send, Clock, Check, Zap, Users, FileText, X,
  Plus, ArrowRight, Eye, Film, MessageSquare, Star
} from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const INTEREST = [
  { value: "hot", label: "Hot", cls: "bg-red-500 text-white", ring: "ring-red-300" },
  { value: "warm", label: "Warm", cls: "bg-amber-400 text-white", ring: "ring-amber-200" },
  { value: "cool", label: "Cool", cls: "bg-sky-400 text-white", ring: "ring-sky-200" },
  { value: "none", label: "None", cls: "bg-gray-200 text-gray-600", ring: "ring-gray-200" },
];

const SIGNAL_TYPES = [
  { value: "coach_interest", label: "Coach Interest", icon: Eye, color: "text-red-400", desc: "Pipeline: Engaged" },
  { value: "strong_performance", label: "Strong Performance", icon: Star, color: "text-amber-400", desc: "" },
  { value: "needs_film", label: "Needs Film", icon: Film, color: "text-sky-400", desc: "Action: Send film" },
  { value: "offered_visit", label: "Offered Visit", icon: ArrowRight, color: "text-emerald-400", desc: "Pipeline: Campus Visit" },
  { value: "good_conversation", label: "Good Conversation", icon: MessageSquare, color: "text-violet-400", desc: "Action: Thank-you" },
  { value: "standout_skill", label: "Standout Skill", icon: Zap, color: "text-yellow-400", desc: "" },
];

function timeAgo(iso) {
  const diff = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
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

  // Capture form
  const [selectedAthlete, setSelectedAthlete] = useState(null);
  const [selectedSchool, setSelectedSchool] = useState(null);
  const [interest, setInterest] = useState(null);
  const [signalType, setSignalType] = useState(null);
  const [noteText, setNoteText] = useState("");
  const [saving, setSaving] = useState(false);
  const [lastSavedId, setLastSavedId] = useState(null);

  // Add school
  const [showAddSchool, setShowAddSchool] = useState(false);
  const [newSchoolName, setNewSchoolName] = useState("");
  const [schoolSuggestions, setSchoolSuggestions] = useState([]);
  const [addingSchool, setAddingSchool] = useState(false);

  // Signals filter + mobile tab
  const [showAllSignals, setShowAllSignals] = useState(false);
  const [mobileTab, setMobileTab] = useState("capture"); // "capture" | "signals"

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

  const sortedSchools = useMemo(() => {
    if (!selectedAthlete) return schools.slice(0, 12);
    const ath = athletes.find(a => a.id === selectedAthlete);
    const targetNames = (ath?.targetSchoolsAtEvent || []).map(n => n.toLowerCase());
    const isTarget = (s) => targetNames.some(t => s.name.toLowerCase().includes(t) || t.includes(s.name.toLowerCase()));
    return [...schools.filter(s => isTarget(s)), ...schools.filter(s => !isTarget(s))].slice(0, 12);
  }, [selectedAthlete, athletes, schools]);

  const targetSchoolIds = useMemo(() => {
    if (!selectedAthlete) return new Set();
    const ath = athletes.find(a => a.id === selectedAthlete);
    const targetNames = (ath?.targetSchoolsAtEvent || []).map(n => n.toLowerCase());
    return new Set(schools.filter(s => targetNames.some(t => s.name.toLowerCase().includes(t) || t.includes(s.name.toLowerCase()))).map(s => s.id));
  }, [selectedAthlete, athletes, schools]);

  const athletesCovered = useMemo(() => new Set(notes.map(n => n.athlete_id)), [notes]);

  const groupedNotes = useMemo(() => {
    const groups = {};
    for (const n of notes) {
      const key = `${n.athlete_id}__${n.school_name || "general"}`;
      if (!groups[key]) {
        groups[key] = { athleteId: n.athlete_id, athleteName: n.athlete_name || "Unknown", schoolName: n.school_name || "", signals: [] };
      }
      groups[key].signals.push(n);
    }
    return Object.values(groups);
  }, [notes]);

  const filteredGroups = useMemo(() => {
    return selectedAthlete && !showAllSignals
      ? groupedNotes.filter(g => g.athleteId === selectedAthlete)
      : groupedNotes;
  }, [groupedNotes, selectedAthlete, showAllSignals]);

  const clearForm = () => {
    setSelectedSchool(null);
    setInterest(null);
    setSignalType(null);
    setNoteText("");
    noteRef.current?.focus();
  };

  const logSignal = async (sendToAthlete = false) => {
    if (!selectedAthlete) { toast.error("Select an athlete"); return; }
    if (!signalType) { toast.error("Select a signal type"); return; }
    if (!noteText.trim()) { toast.error("Note is required"); return; }
    setSaving(true);
    try {
      const school = schools.find((s) => s.id === selectedSchool);
      const res = await axios.post(`${API}/events/${eventId}/signals`, {
        athlete_id: selectedAthlete,
        school_id: selectedSchool || null,
        school_name: school?.name || "",
        interest_level: interest || "none",
        signal_type: signalType,
        note_text: noteText,
        send_to_athlete: sendToAthlete,
      });
      setNotes((prev) => [res.data, ...prev]);
      setLastSavedId(res.data.id);
      setTimeout(() => setLastSavedId(null), 3000);
      const ath = athletes.find((a) => a.id === selectedAthlete);
      let msg = `${ath?.full_name?.split(" ")[0] || "Athlete"}`;
      if (school?.name) msg += ` × ${school.name}`;
      if (res.data.school_added) msg += " · Added to pipeline";
      if (res.data.pipeline_updated) msg += " · Pipeline updated";
      if (res.data.action_created) msg += " · Action created";
      if (sendToAthlete && !res.data.upgrade_needed) msg += " · Sent to athlete";
      toast.success(msg);
      if (res.data.upgrade_needed) {
        toast.warning("Athlete has reached their school limit. They've been notified to upgrade.", { duration: 5000 });
      }
      clearForm();
    } catch {
      toast.error("Failed to log signal");
    } finally {
      setSaving(false);
    }
  };

  const addSchool = async () => {
    if (!selectedAthlete || !newSchoolName.trim()) return;
    setAddingSchool(true);
    try {
      const res = await axios.post(`${API}/events/${eventId}/add-school`, {
        athlete_id: selectedAthlete,
        school_id: newSchoolName.trim().toLowerCase().replace(/\s+/g, "-").slice(0, 30),
        school_name: newSchoolName.trim(),
      });
      if (res.data.added) {
        toast.success(`${newSchoolName.trim()} added to event`);
        fetchData();
      } else {
        toast.info("School already in event");
      }
      setNewSchoolName("");
      setShowAddSchool(false);
    } catch {
      toast.error("Failed to add school");
    } finally {
      setAddingSchool(false);
    }
  };

  useEffect(() => {
    const handler = (e) => {
      if (e.key === "Enter" && e.ctrlKey) { e.preventDefault(); logSignal(false); }
      if (e.key === "Escape") clearForm();
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

  // ─── Signals Panel (reused in both layouts) ──────────────
  const signalsPanel = (
    <div data-testid="recent-signals-feed">
      <div className="flex items-center justify-between mb-3">
        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
          Signals ({filteredGroups.reduce((s, g) => s + g.signals.length, 0)})
        </label>
        {selectedAthlete && (
          <button
            onClick={() => setShowAllSignals(!showAllSignals)}
            className={`text-[10px] font-medium px-2 py-1 rounded transition-colors ${showAllSignals ? "bg-gray-700 text-gray-200" : "text-gray-500 hover:text-gray-300"}`}
            data-testid="toggle-all-signals"
          >
            {showAllSignals ? "All Athletes" : "Show All"}
          </button>
        )}
      </div>
      <div className="space-y-2.5 max-h-[50vh] lg:max-h-[60vh] overflow-y-auto pr-1">
        {filteredGroups.length === 0 ? (
          <p className="text-xs text-gray-500 text-center py-8">
            {selectedAthlete && !showAllSignals ? "No signals for this athlete yet." : "No signals yet. Start capturing."}
          </p>
        ) : (
          filteredGroups.map((g, gi) => (
            <div key={gi} className="bg-gray-800 border border-gray-700/50 rounded-lg overflow-hidden" data-testid={`signal-group-${gi}`}>
              <div className="px-3 py-2 bg-gray-800/80 border-b border-gray-700/40 flex items-center gap-2">
                <span className="text-xs font-semibold text-white">{g.athleteName?.split(" ")[0]}</span>
                {g.schoolName && (
                  <>
                    <span className="text-gray-600 text-xs">—</span>
                    <span className="text-xs text-gray-300 truncate">{g.schoolName}</span>
                  </>
                )}
                <span className="text-[10px] text-gray-500 ml-auto shrink-0">{g.signals.length}</span>
              </div>
              <div className="divide-y divide-gray-700/30">
                {g.signals.map((n) => {
                  const intStyle = INTEREST.find((i) => i.value === n.interest_level);
                  const sigDef = SIGNAL_TYPES.find(s => s.value === n.signal_type);
                  const SigIcon = sigDef?.icon;
                  const isJustSaved = lastSavedId === n.id;
                  return (
                    <div key={n.id} className={`px-3 py-2 transition-all ${isJustSaved ? "bg-emerald-900/15" : ""}`} data-testid={`recent-signal-${n.id}`}>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {SigIcon && <SigIcon className={`w-3 h-3 shrink-0 ${sigDef.color}`} />}
                        {sigDef && <span className="text-[11px] font-medium text-gray-200">{sigDef.label}</span>}
                        {intStyle && n.interest_level !== "none" && (
                          <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${intStyle.cls}`}>{intStyle.label}</span>
                        )}
                        {n.routed_to_pod && (
                          <span className="text-[9px] px-1 py-0.5 rounded bg-blue-900/30 text-blue-400 font-medium flex items-center gap-0.5">
                            <ArrowRight className="w-2.5 h-2.5" /> Pod
                          </span>
                        )}
                        {n.pipeline_updated && (
                          <span className="text-[9px] px-1 py-0.5 rounded bg-emerald-900/30 text-emerald-400 font-medium">Pipeline</span>
                        )}
                        {isJustSaved && (
                          <span className="text-[9px] text-emerald-400 font-bold flex items-center gap-0.5 animate-pulse" data-testid="saved-indicator">
                            <Check className="w-3 h-3" /> SAVED
                          </span>
                        )}
                        <span className="text-[10px] text-gray-500 ml-auto shrink-0 flex items-center gap-0.5">
                          <Clock className="w-2.5 h-2.5" /> {timeAgo(n.captured_at)}
                        </span>
                      </div>
                      {n.note_text && <p className="text-[11px] text-gray-400 mt-0.5 line-clamp-2">{n.note_text}</p>}
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );

  // ─── Capture Form (reused in both layouts) ──────────────
  const captureForm = (
    <div className="space-y-4">
      {/* Athlete chips */}
      <div>
        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2 block">Athlete</label>
        <div className="flex flex-wrap gap-1.5" data-testid="athlete-chips">
          {athletes.map((a) => {
            const covered = athletesCovered.has(a.id);
            return (
              <button
                key={a.id}
                onClick={() => { setSelectedAthlete(a.id); setSelectedSchool(null); setShowAddSchool(false); noteRef.current?.focus(); }}
                data-testid={`athlete-chip-${a.id}`}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium transition-all relative ${
                  selectedAthlete === a.id
                    ? "bg-white text-gray-900 ring-2 ring-white/30"
                    : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                }`}
              >
                {a.photo_url ? (
                  <img src={a.photo_url} alt="" className="w-5 h-5 rounded-full object-cover" />
                ) : (
                  <div className="w-5 h-5 rounded-full bg-gray-500 flex items-center justify-center text-[8px] font-bold text-white">
                    {(a.full_name || "").split(" ").map(w => w[0]).join("").slice(0, 2)}
                  </div>
                )}
                <span className="hidden xs:inline sm:inline">{a.full_name.split(" ")[0]}</span>
                <span className="xs:hidden sm:hidden">{a.full_name.split(" ")[0][0]}{a.full_name.split(" ")[1]?.[0] || ""}</span>
                {covered && selectedAthlete !== a.id && (
                  <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* School chips + Add School */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">School</label>
          {selectedAthlete && targetSchoolIds.size > 0 && (
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-900/40 text-emerald-400 font-medium" data-testid="target-hint">
              Targets first
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
                className={`px-2.5 sm:px-3 py-1.5 rounded-full text-[11px] sm:text-xs font-medium transition-all ${
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
          {!showAddSchool && (
            <button
              onClick={() => setShowAddSchool(true)}
              className="px-2.5 sm:px-3 py-1.5 rounded-full text-[11px] sm:text-xs font-medium border border-dashed border-gray-600 text-gray-400 hover:text-gray-200 hover:border-gray-400 transition-all flex items-center gap-1"
              data-testid="add-school-btn"
            >
              <Plus className="w-3 h-3" /> Add
            </button>
          )}
        </div>
        {showAddSchool && (
          <div className="relative mt-2" data-testid="add-school-form">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newSchoolName}
                onChange={(e) => {
                  setNewSchoolName(e.target.value);
                  if (e.target.value.length >= 2) {
                    axios.get(`${API}/schools/search?q=${encodeURIComponent(e.target.value)}&limit=8`)
                      .then(r => setSchoolSuggestions(r.data.schools || []))
                      .catch(() => setSchoolSuggestions([]));
                  } else {
                    setSchoolSuggestions([]);
                  }
                }}
                placeholder="Search university..."
                className="flex-1 bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-gray-400"
                data-testid="add-school-input"
                autoFocus
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addSchool(); } }}
              />
              <button onClick={addSchool} disabled={addingSchool || !newSchoolName.trim()} className="px-3 py-2 bg-emerald-600 text-white text-xs font-semibold rounded-lg disabled:opacity-50" data-testid="add-school-confirm">
                {addingSchool ? "..." : "Add"}
              </button>
              <button onClick={() => { setShowAddSchool(false); setNewSchoolName(""); setSchoolSuggestions([]); }} className="p-2 text-gray-500 hover:text-gray-300">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            {schoolSuggestions.length > 0 && (
              <div className="absolute left-0 right-12 top-full mt-1 bg-gray-800 border border-gray-600 rounded-lg overflow-hidden z-50 shadow-xl max-h-48 overflow-y-auto" data-testid="school-suggestions">
                {schoolSuggestions.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => { setNewSchoolName(s.university_name); setSchoolSuggestions([]); }}
                    className="w-full text-left px-3 py-2 text-xs text-white hover:bg-gray-700 transition-colors flex items-center gap-2 border-b border-gray-700 last:border-0"
                    data-testid={`school-suggestion-${i}`}
                  >
                    <span className="font-medium">{s.university_name}</span>
                    {s.division && <span className="text-[10px] text-gray-400">{s.division}</span>}
                    {s.conference && <span className="text-[10px] text-gray-500">{s.conference}</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Interest + Signal side by side on larger mobile */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:grid-cols-1">
        {/* Interest level */}
        <div>
          <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2 block">Interest</label>
          <div className="grid grid-cols-4 gap-1.5 sm:flex sm:gap-2" data-testid="interest-selector">
            {INTEREST.map((i) => (
              <button
                key={i.value}
                onClick={() => setInterest(interest === i.value ? null : i.value)}
                data-testid={`interest-${i.value}`}
                className={`px-2 sm:px-4 py-2 rounded-lg text-[11px] sm:text-xs font-bold transition-all text-center ${
                  interest === i.value ? `${i.cls} ring-2 ${i.ring}` : "bg-gray-700 text-gray-400 hover:bg-gray-600"
                }`}
              >
                {i.label}
              </button>
            ))}
          </div>
        </div>

        {/* Signal Type */}
        <div>
          <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2 block">Signal</label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5" data-testid="signal-types">
            {SIGNAL_TYPES.map((s) => {
              const Icon = s.icon;
              const selected = signalType === s.value;
              return (
                <button
                  key={s.value}
                  onClick={() => setSignalType(selected ? null : s.value)}
                  data-testid={`signal-${s.value}`}
                  className={`flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-2 sm:py-2.5 rounded-lg text-left transition-all border ${
                    selected
                      ? "bg-gray-700 border-gray-500 text-white"
                      : "bg-gray-800/50 border-gray-700/50 text-gray-400 hover:border-gray-600 hover:text-gray-300"
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 ${selected ? s.color : ""}`} />
                  <div className="min-w-0">
                    <div className="text-[10px] sm:text-[11px] font-semibold truncate">{s.label}</div>
                    {s.desc && <div className="text-[8px] sm:text-[9px] text-gray-500 truncate hidden sm:block">{s.desc}</div>}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Note (required) */}
      <div>
        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2 block">Note <span className="text-red-400 font-normal">*</span></label>
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

      {/* Log buttons */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
        <button
          onClick={() => logSignal(false)}
          disabled={saving || !selectedAthlete || !signalType || !noteText.trim()}
          data-testid="log-to-pod-btn"
          className="flex-1 py-3 bg-gray-700 text-gray-100 font-bold text-sm rounded-lg hover:bg-gray-600 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 border border-gray-600"
        >
          <FileText className="w-4 h-4" /> LOG TO POD
        </button>
        <div className="flex items-center gap-2">
          <button
            onClick={() => logSignal(true)}
            disabled={saving || !selectedAthlete || !signalType || !noteText.trim()}
            data-testid="send-to-athlete-btn"
            className="flex-1 py-3 bg-white text-gray-900 font-bold text-sm rounded-lg hover:bg-gray-100 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <Send className="w-4 h-4" /> SEND TO ATHLETE
          </button>
          <button
            onClick={clearForm}
            data-testid="clear-form-btn"
            className="p-3 bg-gray-800 text-gray-400 rounded-lg hover:bg-gray-700 hover:text-gray-200 transition-colors border border-gray-700 shrink-0"
            title="Clear form (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-900 text-white" data-testid="live-event-page">
      {/* Header */}
      <header className="bg-gray-900/95 border-b border-gray-700/50">
        <div className="max-w-[960px] mx-auto px-3 sm:px-4 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <button onClick={() => navigate(`/events/${eventId}/prep`)} className="text-gray-400 hover:text-white transition-colors shrink-0" data-testid="back-from-live">
              <ArrowLeft className="w-4 h-4" />
            </button>
            <h1 className="font-semibold text-sm truncate">{event?.name}</h1>
            <span className="flex items-center gap-1 text-[10px] font-bold text-red-400 uppercase tracking-wider shrink-0">
              <Radio className="w-3 h-3 animate-pulse" /> LIVE
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[11px] text-gray-400" data-testid="note-counter">{notes.length}</span>
            <FileText className="w-3.5 h-3.5 text-gray-500" />
          </div>
        </div>
      </header>

      {/* Stats Bar */}
      <div className="bg-gray-800/60 border-b border-gray-700/30" data-testid="live-stats-bar">
        <div className="max-w-[960px] mx-auto px-3 sm:px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="flex items-center gap-1.5 text-[11px]">
              <FileText className="w-3 h-3 text-gray-500" />
              <span className="font-medium text-gray-200" data-testid="stat-notes-count">{notes.length}</span>
              <span className="text-gray-400 hidden sm:inline">signals captured</span>
              <span className="text-gray-400 sm:hidden">signals</span>
            </div>
            <div className="w-px h-3 bg-gray-700" />
            <div className="flex items-center gap-1.5 text-[11px]">
              <Users className="w-3 h-3 text-gray-500" />
              <span className="font-medium text-gray-200" data-testid="stat-athletes-covered">{athletesCovered.size}/{athletes.length}</span>
              <span className="text-gray-400 hidden sm:inline">athletes</span>
            </div>
          </div>
          <div className="text-[10px] text-gray-500 hidden md:block">
            <kbd className="px-1 py-0.5 bg-gray-700 rounded text-gray-400 font-mono">Ctrl+Enter</kbd> log · <kbd className="px-1 py-0.5 bg-gray-700 rounded text-gray-400 font-mono">Esc</kbd> clear
          </div>
        </div>
      </div>

      {/* Mobile Tab Toggle */}
      <div className="lg:hidden bg-gray-900 border-b border-gray-700/30">
        <div className="max-w-[960px] mx-auto px-3 sm:px-4 flex">
          <button
            onClick={() => setMobileTab("capture")}
            data-testid="tab-capture"
            className={`flex-1 py-2.5 text-xs font-semibold text-center transition-colors border-b-2 ${
              mobileTab === "capture" ? "text-white border-white" : "text-gray-500 border-transparent hover:text-gray-300"
            }`}
          >
            Capture
          </button>
          <button
            onClick={() => setMobileTab("signals")}
            data-testid="tab-signals"
            className={`flex-1 py-2.5 text-xs font-semibold text-center transition-colors border-b-2 flex items-center justify-center gap-1.5 ${
              mobileTab === "signals" ? "text-white border-white" : "text-gray-500 border-transparent hover:text-gray-300"
            }`}
          >
            Signals
            {notes.length > 0 && (
              <span className="text-[9px] font-bold bg-gray-700 text-gray-200 px-1.5 py-0.5 rounded-full">{notes.length}</span>
            )}
          </button>
        </div>
      </div>

      <div className="max-w-[960px] mx-auto px-3 sm:px-4 py-4">
        {/* Desktop: side-by-side */}
        <div className="hidden lg:grid lg:grid-cols-5 gap-6">
          <div className="lg:col-span-3">{captureForm}</div>
          <div className="lg:col-span-2">{signalsPanel}</div>
        </div>

        {/* Mobile: tabbed */}
        <div className="lg:hidden">
          {mobileTab === "capture" ? captureForm : signalsPanel}
        </div>
      </div>
    </div>
  );
}

export default LiveEvent;

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
  const [addingSchool, setAddingSchool] = useState(false);

  // Signals filter
  const [showAllSignals, setShowAllSignals] = useState(false);

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

  // Smart sort: target schools first
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

  // Group notes by athlete + school
  const groupedNotes = useMemo(() => {
    const groups = {};
    for (const n of notes) {
      const key = `${n.athlete_id}__${n.school_name || "general"}`;
      if (!groups[key]) {
        groups[key] = {
          athleteId: n.athlete_id,
          athleteName: n.athlete_name || "Unknown",
          schoolName: n.school_name || "",
          signals: [],
        };
      }
      groups[key].signals.push(n);
    }
    return Object.values(groups);
  }, [notes]);

  const clearForm = () => {
    setSelectedSchool(null);
    setInterest(null);
    setSignalType(null);
    setNoteText("");
    noteRef.current?.focus();
  };

  const logSignal = async () => {
    if (!selectedAthlete) { toast.error("Select an athlete"); return; }
    if (!signalType) { toast.error("Select a signal type"); return; }
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
      });
      setNotes((prev) => [res.data, ...prev]);
      setLastSavedId(res.data.id);
      setTimeout(() => setLastSavedId(null), 3000);
      const ath = athletes.find((a) => a.id === selectedAthlete);
      let msg = `${ath?.full_name?.split(" ")[0] || "Athlete"}`;
      if (school?.name) msg += ` × ${school.name}`;
      if (res.data.pipeline_updated) msg += " · Pipeline updated";
      if (res.data.action_created) msg += " · Action created";
      toast.success(msg);
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
      const schoolId = newSchoolName.trim().toLowerCase().replace(/\s+/g, "_").slice(0, 30);
      const res = await axios.post(`${API}/events/${eventId}/add-school`, {
        athlete_id: selectedAthlete,
        school_id: schoolId,
        school_name: newSchoolName.trim(),
      });
      if (res.data.added) {
        toast.success(`${newSchoolName.trim()} added to pipeline`);
        fetchData(); // Refresh to get updated schools
      } else {
        toast.info("School already in pipeline");
      }
      setNewSchoolName("");
      setShowAddSchool(false);
    } catch {
      toast.error("Failed to add school");
    } finally {
      setAddingSchool(false);
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e) => {
      if (e.key === "Enter" && e.ctrlKey) { e.preventDefault(); logSignal(); }
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

  return (
    <div className="min-h-screen bg-gray-900 text-white" data-testid="live-event-page">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-gray-900/95 backdrop-blur-sm border-b border-gray-700/50">
        <div className="max-w-[960px] mx-auto px-4 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(`/events/${eventId}/prep`)} className="text-gray-400 hover:text-white transition-colors" data-testid="back-from-live">
              <ArrowLeft className="w-4 h-4" />
            </button>
            <h1 className="font-semibold text-sm">{event?.name}</h1>
            <span className="flex items-center gap-1 text-[10px] font-bold text-red-400 uppercase tracking-wider">
              <Radio className="w-3 h-3 animate-pulse" /> LIVE
            </span>
          </div>
          <span className="text-xs text-gray-400" data-testid="note-counter">{notes.length} signals</span>
        </div>
      </header>

      {/* Stats Bar */}
      <div className="bg-gray-800/60 border-b border-gray-700/30" data-testid="live-stats-bar">
        <div className="max-w-[960px] mx-auto px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 text-[11px]">
              <FileText className="w-3 h-3 text-gray-500" />
              <span className="font-medium text-gray-200" data-testid="stat-notes-count">{notes.length}</span>
              <span className="text-gray-400">signals captured</span>
            </div>
            <div className="w-px h-3 bg-gray-700" />
            <div className="flex items-center gap-1.5 text-[11px]">
              <Users className="w-3 h-3 text-gray-500" />
              <span className="font-medium text-gray-200" data-testid="stat-athletes-covered">{athletesCovered.size}/{athletes.length}</span>
              <span className="text-gray-400">athletes</span>
            </div>
          </div>
          <div className="text-[10px] text-gray-500 hidden sm:block">
            <kbd className="px-1 py-0.5 bg-gray-700 rounded text-gray-400 font-mono">Ctrl+Enter</kbd> log · <kbd className="px-1 py-0.5 bg-gray-700 rounded text-gray-400 font-mono">Esc</kbd> clear
          </div>
        </div>
      </div>

      <div className="max-w-[960px] mx-auto px-4 py-4">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Left: Signal Capture Form */}
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
                      {a.full_name.split(" ")[0]}
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
                {/* Add School */}
                {selectedAthlete && !showAddSchool && (
                  <button
                    onClick={() => setShowAddSchool(true)}
                    className="px-3 py-1.5 rounded-full text-xs font-medium border border-dashed border-gray-600 text-gray-400 hover:text-gray-200 hover:border-gray-400 transition-all flex items-center gap-1"
                    data-testid="add-school-btn"
                  >
                    <Plus className="w-3 h-3" /> Add School
                  </button>
                )}
              </div>
              {/* Add School inline form */}
              {showAddSchool && (
                <div className="flex items-center gap-2 mt-2" data-testid="add-school-form">
                  <input
                    type="text"
                    value={newSchoolName}
                    onChange={(e) => setNewSchoolName(e.target.value)}
                    placeholder="University name..."
                    className="flex-1 bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-gray-400"
                    data-testid="add-school-input"
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addSchool(); } }}
                  />
                  <button
                    onClick={addSchool}
                    disabled={addingSchool || !newSchoolName.trim()}
                    className="px-3 py-2 bg-emerald-600 text-white text-xs font-semibold rounded-lg hover:bg-emerald-500 transition-colors disabled:opacity-50"
                    data-testid="add-school-confirm"
                  >
                    {addingSchool ? "..." : "Add"}
                  </button>
                  <button
                    onClick={() => { setShowAddSchool(false); setNewSchoolName(""); }}
                    className="p-2 text-gray-500 hover:text-gray-300"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>

            {/* Interest level */}
            <div>
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2 block">Interest Level</label>
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

            {/* Signal Type (replaces Quick Templates) */}
            <div>
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2 block">Signal Type</label>
              <div className="grid grid-cols-3 gap-1.5" data-testid="signal-types">
                {SIGNAL_TYPES.map((s) => {
                  const Icon = s.icon;
                  const selected = signalType === s.value;
                  return (
                    <button
                      key={s.value}
                      onClick={() => setSignalType(selected ? null : s.value)}
                      data-testid={`signal-${s.value}`}
                      className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-left transition-all border ${
                        selected
                          ? "bg-gray-700 border-gray-500 text-white"
                          : "bg-gray-800/50 border-gray-700/50 text-gray-400 hover:border-gray-600 hover:text-gray-300"
                      }`}
                    >
                      <Icon className={`w-4 h-4 shrink-0 ${selected ? s.color : ""}`} />
                      <div className="min-w-0">
                        <div className="text-[11px] font-semibold truncate">{s.label}</div>
                        {s.desc && <div className="text-[9px] text-gray-500 truncate">{s.desc}</div>}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Optional note */}
            <div>
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2 block">Note <span className="text-gray-600 font-normal">(optional)</span></label>
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

            {/* Log button */}
            <div className="flex items-center gap-2">
              <button
                onClick={logSignal}
                disabled={saving || !selectedAthlete || !signalType}
                data-testid="log-signal-btn"
                className="flex-1 py-3 bg-white text-gray-900 font-bold text-sm rounded-lg hover:bg-gray-100 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <Send className="w-4 h-4" /> LOG SIGNAL
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

          {/* Right: Grouped Recent Signals */}
          <div className="lg:col-span-2" data-testid="recent-signals-feed">
            <div className="flex items-center justify-between mb-3">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                Signals ({(selectedAthlete && !showAllSignals ? groupedNotes.filter(g => g.athleteId === selectedAthlete) : groupedNotes).reduce((s, g) => s + g.signals.length, 0)})
              </label>
              {selectedAthlete && (
                <button
                  onClick={() => setShowAllSignals(!showAllSignals)}
                  className={`text-[10px] font-medium px-2 py-1 rounded transition-colors ${
                    showAllSignals
                      ? "bg-gray-700 text-gray-200"
                      : "text-gray-500 hover:text-gray-300"
                  }`}
                  data-testid="toggle-all-signals"
                >
                  {showAllSignals ? "All Athletes" : "Show All"}
                </button>
              )}
            </div>
            <div className="space-y-2.5 max-h-[60vh] overflow-y-auto pr-1">
              {(() => {
                const filtered = selectedAthlete && !showAllSignals
                  ? groupedNotes.filter(g => g.athleteId === selectedAthlete)
                  : groupedNotes;
                return filtered.length === 0 ? (
                  <p className="text-xs text-gray-500 text-center py-8">
                    {selectedAthlete && !showAllSignals ? "No signals for this athlete yet." : "No signals yet. Start capturing."}
                  </p>
                ) : (
                  filtered.map((g, gi) => (
                  <div key={gi} className="bg-gray-800 border border-gray-700/50 rounded-lg overflow-hidden" data-testid={`signal-group-${gi}`}>
                    {/* Group header */}
                    <div className="px-3 py-2 bg-gray-800/80 border-b border-gray-700/40 flex items-center gap-2">
                      <span className="text-xs font-semibold text-white">{g.athleteName?.split(" ")[0]}</span>
                      {g.schoolName && (
                        <>
                          <span className="text-gray-600 text-xs">—</span>
                          <span className="text-xs text-gray-300">{g.schoolName}</span>
                        </>
                      )}
                      <span className="text-[10px] text-gray-500 ml-auto">{g.signals.length}</span>
                    </div>
                    {/* Signals in group */}
                    <div className="divide-y divide-gray-700/30">
                      {g.signals.map((n) => {
                        const intStyle = INTEREST.find((i) => i.value === n.interest_level);
                        const sigDef = SIGNAL_TYPES.find(s => s.value === n.signal_type);
                        const SigIcon = sigDef?.icon;
                        const isJustSaved = lastSavedId === n.id;
                        return (
                          <div key={n.id} className={`px-3 py-2 transition-all ${isJustSaved ? "bg-emerald-900/15" : ""}`} data-testid={`recent-signal-${n.id}`}>
                            <div className="flex items-center gap-2 flex-wrap">
                              {SigIcon && <SigIcon className={`w-3 h-3 ${sigDef.color}`} />}
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
                              <span className="text-[10px] text-gray-500 ml-auto flex items-center gap-0.5">
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
                );
              })()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LiveEvent;

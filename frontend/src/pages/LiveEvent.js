import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import {
  ArrowLeft, Radio, Send, Clock, Check, Zap, Users, FileText, X,
  Plus, ArrowRight, Eye, Film, MessageSquare, Star, Menu, Search,
  LayoutDashboard, Calendar, Megaphone, BarChart3,
  Flame, AlertTriangle, Target, Trophy, Bell, BellOff, ChevronRight
} from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

/* ─── Interest levels with micro-guidance ─── */
const INTEREST = [
  { value: "hot", label: "Hot", cls: "bg-red-500 text-white", ring: "ring-red-400/40", guide: "Active recruiting interest" },
  { value: "warm", label: "Warm", cls: "bg-amber-500 text-white", ring: "ring-amber-400/40", guide: "Monitor closely" },
  { value: "cool", label: "Cool", cls: "bg-sky-500 text-white", ring: "ring-sky-400/40", guide: "Low engagement" },
  { value: "none", label: "None", cls: "bg-gray-700 text-gray-300", ring: "ring-gray-500/40", guide: "No interest signal" },
];

/* ─── Grouped signals with intelligence triggers ─── */
const SIGNAL_CATEGORIES = [
  {
    key: "coach", title: "Coach Signals", icon: Eye,
    signals: [
      { value: "coach_interest", label: "Coach Interest", icon: Eye, color: "text-red-400", consequence: "Creates HIGH priority follow-up (48h)", suggest: "Send highlight + thank you message" },
      { value: "offered_visit", label: "Offered Visit", icon: ArrowRight, color: "text-emerald-400", consequence: "Pipeline advances to Campus Visit", suggest: "Confirm visit date and logistics" },
    ],
  },
  {
    key: "performance", title: "Performance", icon: Star,
    signals: [
      { value: "strong_performance", label: "Strong Performance", icon: Star, color: "text-amber-400", consequence: "Boosts athlete profile visibility", suggest: "Capture specific drill or play details" },
      { value: "standout_skill", label: "Standout Skill", icon: Zap, color: "text-yellow-400", consequence: "Highlights unique ability for coaches", suggest: "Note the specific skill observed" },
    ],
  },
  {
    key: "needs", title: "Needs / Risks", icon: AlertTriangle,
    signals: [
      { value: "needs_film", label: "Needs Film", icon: Film, color: "text-sky-400", consequence: "Momentum drops if not sent within 72h", suggest: "Request highlight reel from athlete" },
    ],
  },
  {
    key: "milestones", title: "Milestones", icon: Trophy,
    signals: [
      { value: "good_conversation", label: "Good Conversation", icon: MessageSquare, color: "text-violet-400", consequence: "Logs positive engagement milestone", suggest: "Send thank-you follow-up" },
    ],
  },
];

const ALL_SIGNALS = SIGNAL_CATEGORIES.flatMap(c => c.signals);

function getSignalDef(value) {
  return ALL_SIGNALS.find(s => s.value === value);
}

function timeAgo(iso) {
  const diff = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

/* ─── Live Impact Panel ─── */
function LiveImpactPanel({ athlete, school, interest, signalType, athletes, schools }) {
  const sig = signalType ? getSignalDef(signalType) : null;
  const athName = athlete ? (athletes.find(a => a.id === athlete)?.full_name?.split(" ")[0] || "Athlete") : null;
  const schlName = school ? (schools.find(s => s.id === school)?.name || "") : null;

  if (!athlete && !signalType) return null;

  let icon = Check;
  let iconColor = "text-gray-500";
  let borderColor = "border-gray-700/50";
  let bgColor = "bg-gray-900/60";
  let lines = [];

  if (sig) {
    const isHighPriority = ["coach_interest", "offered_visit"].includes(signalType);
    const isRisk = signalType === "needs_film";

    if (isHighPriority) {
      icon = Flame;
      iconColor = "text-red-400";
      borderColor = "border-red-500/20";
      bgColor = "bg-red-950/30";
    } else if (isRisk) {
      icon = AlertTriangle;
      iconColor = "text-amber-400";
      borderColor = "border-amber-500/20";
      bgColor = "bg-amber-950/30";
    } else {
      icon = Check;
      iconColor = "text-emerald-400";
      borderColor = "border-emerald-500/20";
      bgColor = "bg-emerald-950/30";
    }

    lines.push(sig.consequence);
    if (sig.suggest) lines.push(sig.suggest);
  } else if (athlete && !signalType) {
    lines.push("Select a signal to see what happens next");
  }

  if (schlName && interest === "hot") {
    lines.push(`${schlName} marked as actively recruiting`);
  }

  const Icon = icon;

  return (
    <div
      data-testid="live-impact-panel"
      className={`${bgColor} border ${borderColor} rounded-xl px-4 py-3 transition-all duration-200`}
      style={{ animation: "impactIn 200ms ease both" }}
    >
      <div className="flex items-start gap-3">
        <div className={`mt-0.5 ${iconColor}`}>
          <Icon className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          {lines.map((line, i) => (
            <p key={i} className={`text-[12px] leading-relaxed ${i === 0 ? "text-gray-200 font-medium" : "text-gray-400"}`}>
              {i === 1 && <span className="text-gray-500 mr-1">&rarr;</span>}
              {line}
            </p>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── Main Component ─── */
function LiveEvent() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const noteRef = useRef(null);

  const [event, setEvent] = useState(null);
  const [athletes, setAthletes] = useState([]);
  const [schools, setSchools] = useState([]);
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);

  const [selectedAthlete, setSelectedAthlete] = useState(null);
  const [selectedSchool, setSelectedSchool] = useState(null);
  const [interest, setInterest] = useState(null);
  const [signalType, setSignalType] = useState(null);
  const [noteText, setNoteText] = useState("");
  const [saving, setSaving] = useState(false);
  const [lastSavedId, setLastSavedId] = useState(null);
  const [notifyAthlete, setNotifyAthlete] = useState(false);

  const [showAddSchool, setShowAddSchool] = useState(false);
  const [newSchoolName, setNewSchoolName] = useState("");
  const [schoolSuggestions, setSchoolSuggestions] = useState([]);
  const [addingSchool, setAddingSchool] = useState(false);
  const [schoolSearch, setSchoolSearch] = useState("");

  const [showAllSignals, setShowAllSignals] = useState(false);
  const [mobileTab, setMobileTab] = useState("capture");
  const [navOpen, setNavOpen] = useState(false);

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

  const filteredSchools = useMemo(() => {
    if (!schoolSearch.trim()) return sortedSchools;
    const q = schoolSearch.toLowerCase();
    return sortedSchools.filter(s => s.name.toLowerCase().includes(q));
  }, [sortedSchools, schoolSearch]);

  const targetSchoolIds = useMemo(() => {
    if (!selectedAthlete) return new Set();
    const ath = athletes.find(a => a.id === selectedAthlete);
    const targetNames = (ath?.targetSchoolsAtEvent || []).map(n => n.toLowerCase());
    return new Set(schools.filter(s => targetNames.some(t => s.name.toLowerCase().includes(t) || t.includes(s.name.toLowerCase()))).map(s => s.id));
  }, [selectedAthlete, athletes, schools]);

  const athletesCovered = useMemo(() => new Set(notes.map(n => n.athlete_id)), [notes]);

  // Recent schools = schools that appear in recent signals for this athlete
  const recentSchoolIds = useMemo(() => {
    if (!selectedAthlete) return [];
    const athNotes = notes.filter(n => n.athlete_id === selectedAthlete);
    const seen = new Set();
    const ids = [];
    for (const n of athNotes) {
      if (n.school_id && !seen.has(n.school_id)) { seen.add(n.school_id); ids.push(n.school_id); }
      if (ids.length >= 3) break;
    }
    return ids;
  }, [selectedAthlete, notes]);

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
    setNotifyAthlete(false);
    setSchoolSearch("");
  };

  const logSignal = async () => {
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
        send_to_athlete: notifyAthlete,
      });
      setNotes((prev) => [res.data, ...prev]);
      setLastSavedId(res.data.id);
      setTimeout(() => setLastSavedId(null), 3000);
      const ath = athletes.find((a) => a.id === selectedAthlete);
      let msg = `${ath?.full_name?.split(" ")[0] || "Athlete"}`;
      if (school?.name) msg += ` + ${school.name}`;
      if (res.data.school_added) msg += " · Pipeline updated";
      if (res.data.action_created) msg += " · Action created";
      if (notifyAthlete && !res.data.upgrade_needed) msg += " · Notified";
      toast.success(msg);
      if (res.data.upgrade_needed) {
        toast.warning("Athlete reached school limit. Notified to upgrade.", { duration: 5000 });
      }
      clearForm();
    } catch {
      toast.error("Failed to save signal");
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
        toast.success(`${newSchoolName.trim()} added`);
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
      if (e.key === "Enter" && e.ctrlKey) { e.preventDefault(); logSignal(); }
      if (e.key === "Escape") clearForm();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white" />
      </div>
    );
  }

  const canSave = selectedAthlete && signalType && noteText.trim();
  const selectedSig = signalType ? getSignalDef(signalType) : null;

  /* ─── Signals Feed Panel ─── */
  const signalsPanel = (
    <div data-testid="recent-signals-feed">
      <div className="flex items-center justify-between mb-3">
        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
          Signals ({filteredGroups.reduce((s, g) => s + g.signals.length, 0)})
        </label>
        {selectedAthlete && (
          <button onClick={() => setShowAllSignals(!showAllSignals)}
            className={`text-[10px] font-medium px-2 py-1 rounded transition-colors ${showAllSignals ? "bg-gray-700 text-gray-200" : "text-gray-500 hover:text-gray-300"}`}
            data-testid="toggle-all-signals">
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
            <div key={gi} className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden" data-testid={`signal-group-${gi}`}>
              <div className="px-3 py-2 bg-gray-900/80 border-b border-gray-800/60 flex items-center gap-2">
                <span className="text-xs font-semibold text-white">{g.athleteName?.split(" ")[0]}</span>
                {g.schoolName && (
                  <>
                    <span className="text-gray-600 text-xs">&mdash;</span>
                    <span className="text-xs text-gray-300 truncate">{g.schoolName}</span>
                  </>
                )}
                <span className="text-[10px] text-gray-500 ml-auto shrink-0">{g.signals.length}</span>
              </div>
              <div className="divide-y divide-gray-800/40">
                {g.signals.map((n) => {
                  const intStyle = INTEREST.find((i) => i.value === n.interest_level);
                  const sigDef = getSignalDef(n.signal_type);
                  const SigIcon = sigDef?.icon;
                  const isJustSaved = lastSavedId === n.id;
                  return (
                    <div key={n.id} className={`px-3 py-2 transition-all duration-200 ${isJustSaved ? "bg-emerald-900/15" : ""}`} data-testid={`recent-signal-${n.id}`}>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {SigIcon && <SigIcon className={`w-3 h-3 shrink-0 ${sigDef.color}`} />}
                        {sigDef && <span className="text-[11px] font-medium text-gray-200">{sigDef.label}</span>}
                        {intStyle && n.interest_level !== "none" && (
                          <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${intStyle.cls}`}>{intStyle.label}</span>
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

  /* ─── Capture Form ─── */
  const captureForm = (
    <div className="space-y-5">

      {/* ═══ ATHLETE ═══ */}
      <section>
        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2 block">Athlete</label>
        <div className="flex flex-wrap gap-2" data-testid="athlete-chips">
          {athletes.map((a) => {
            const covered = athletesCovered.has(a.id);
            const isSelected = selectedAthlete === a.id;
            return (
              <button key={a.id}
                onClick={() => { setSelectedAthlete(a.id); setSelectedSchool(null); setShowAddSchool(false); setSchoolSearch(""); }}
                data-testid={`athlete-chip-${a.id}`}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-all duration-200 active:scale-95 relative ${
                  isSelected
                    ? "bg-white text-gray-900 ring-2 ring-white/30 shadow-lg shadow-white/5"
                    : "bg-gray-800 text-gray-300 hover:bg-gray-700 border border-gray-700/50"
                }`}
              >
                {a.photo_url ? (
                  <img src={a.photo_url} alt="" className="w-7 h-7 rounded-full object-cover" />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-gray-600 flex items-center justify-center text-[10px] font-bold text-white">
                    {(a.full_name || "").split(" ").map(w => w[0]).join("").slice(0, 2)}
                  </div>
                )}
                <span className="font-semibold">{a.full_name?.split(" ")[0]}</span>
                {/* Status indicator */}
                <span className={`absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 ${
                  isSelected ? "border-white" : "border-gray-800"
                } ${covered ? "bg-emerald-400" : "bg-gray-600"}`} />
              </button>
            );
          })}
        </div>
      </section>

      {/* ═══ SCHOOL ═══ */}
      <section>
        <div className="flex items-center gap-2 mb-2">
          <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">School</label>
          {selectedAthlete && targetSchoolIds.size > 0 && (
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-900/40 text-emerald-400 font-medium" data-testid="target-hint">
              <Target className="w-2.5 h-2.5 inline mr-0.5" />Targets first
            </span>
          )}
        </div>

        {/* Search */}
        <div className="relative mb-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
          <input
            type="text"
            value={schoolSearch}
            onChange={(e) => setSchoolSearch(e.target.value)}
            placeholder="Search schools..."
            data-testid="school-search-input"
            className="w-full bg-gray-800/60 border border-gray-700/50 rounded-lg pl-8 pr-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-gray-500 transition-colors"
          />
        </div>

        {/* Recent schools */}
        {recentSchoolIds.length > 0 && !schoolSearch && (
          <div className="flex items-center gap-1.5 mb-2 flex-wrap" data-testid="recent-schools">
            <span className="text-[9px] text-gray-500 font-medium">Recent:</span>
            {recentSchoolIds.map(id => {
              const s = schools.find(x => x.id === id);
              if (!s) return null;
              return (
                <button key={id}
                  onClick={() => setSelectedSchool(selectedSchool === id ? null : id)}
                  data-testid={`recent-school-${id}`}
                  className={`px-2 py-1 rounded-lg text-[10px] font-medium transition-all duration-150 active:scale-95 ${
                    selectedSchool === id ? "bg-white text-gray-900" : "bg-gray-800/80 text-gray-400 hover:text-gray-200"
                  }`}
                >
                  {s.name}
                </button>
              );
            })}
          </div>
        )}

        {/* School chips */}
        <div className="flex flex-wrap gap-1.5" data-testid="school-chips">
          {filteredSchools.map((s) => {
            const isTarget = targetSchoolIds.has(s.id);
            return (
              <button key={s.id}
                onClick={() => setSelectedSchool(selectedSchool === s.id ? null : s.id)}
                data-testid={`school-chip-${s.id}`}
                className={`px-3 py-2 rounded-lg text-[11px] font-medium transition-all duration-150 active:scale-95 min-h-[36px] ${
                  selectedSchool === s.id
                    ? "bg-white text-gray-900 ring-2 ring-white/30 shadow-lg shadow-white/5"
                    : isTarget
                      ? "bg-emerald-900/30 text-emerald-300 border border-emerald-600/30 hover:bg-emerald-800/40"
                      : "bg-gray-800 text-gray-300 border border-gray-700/50 hover:bg-gray-700"
                }`}
              >
                {s.name}
              </button>
            );
          })}
          {/* Add school button */}
          {!showAddSchool && (
            <button
              onClick={() => setShowAddSchool(true)}
              data-testid="add-school-btn"
              className="px-3 py-2 rounded-lg text-[11px] font-semibold border-2 border-dashed border-gray-600 text-gray-400 hover:text-white hover:border-gray-400 transition-all duration-150 active:scale-95 flex items-center gap-1.5 min-h-[36px]"
            >
              <Plus className="w-3.5 h-3.5" /> Add School
            </button>
          )}
        </div>

        {/* Add school form */}
        {showAddSchool && (
          <div className="relative mt-2" data-testid="add-school-form">
            <div className="flex items-center gap-2">
              <input type="text" value={newSchoolName}
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
                data-testid="add-school-input" autoFocus
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addSchool(); } }}
              />
              <button onClick={addSchool} disabled={addingSchool || !newSchoolName.trim()} className="px-3 py-2 bg-emerald-600 text-white text-xs font-semibold rounded-lg disabled:opacity-50 active:scale-95 transition-transform" data-testid="add-school-confirm">
                {addingSchool ? "..." : "Add"}
              </button>
              <button onClick={() => { setShowAddSchool(false); setNewSchoolName(""); setSchoolSuggestions([]); }} className="p-2 text-gray-500 hover:text-gray-300">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            {schoolSuggestions.length > 0 && (
              <div className="absolute left-0 right-12 top-full mt-1 bg-gray-800 border border-gray-600 rounded-lg overflow-hidden z-50 shadow-xl max-h-48 overflow-y-auto" data-testid="school-suggestions">
                {schoolSuggestions.map((s, i) => (
                  <button key={i}
                    onClick={() => { setNewSchoolName(s.university_name); setSchoolSuggestions([]); }}
                    className="w-full text-left px-3 py-2 text-xs text-white hover:bg-gray-700 transition-colors flex items-center gap-2 border-b border-gray-700 last:border-0"
                    data-testid={`school-suggestion-${i}`}>
                    <span className="font-medium">{s.university_name}</span>
                    {s.division && <span className="text-[10px] text-gray-400">{s.division}</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </section>

      {/* ═══ INTEREST + SIGNAL ═══ */}
      <div className="grid grid-cols-1 gap-5">

        {/* Interest */}
        <section>
          <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2 block">Interest</label>
          <div className="grid grid-cols-4 gap-1.5" data-testid="interest-selector">
            {INTEREST.map((i) => (
              <button key={i.value}
                onClick={() => setInterest(interest === i.value ? null : i.value)}
                data-testid={`interest-${i.value}`}
                className={`px-2 py-2.5 rounded-lg text-[11px] font-bold transition-all duration-150 active:scale-95 text-center min-h-[44px] ${
                  interest === i.value ? `${i.cls} ring-2 ${i.ring}` : "bg-gray-800 text-gray-400 border border-gray-700/50 hover:bg-gray-700"
                }`}
              >
                {i.label}
              </button>
            ))}
          </div>
          {/* Micro-guidance */}
          {interest && (
            <p data-testid="interest-guidance" className="text-[11px] text-gray-400 mt-1.5 pl-0.5"
              style={{ animation: "impactIn 150ms ease both" }}>
              {INTEREST.find(i => i.value === interest)?.guide}
            </p>
          )}
        </section>

        {/* Grouped Signals */}
        <section>
          <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-3 block">Signal</label>
          <div className="space-y-3" data-testid="signal-categories">
            {SIGNAL_CATEGORIES.map((cat) => {
              const CatIcon = cat.icon;
              return (
                <div key={cat.key} data-testid={`signal-cat-${cat.key}`}>
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <CatIcon className="w-3 h-3 text-gray-500" />
                    <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">{cat.title}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {cat.signals.map((s) => {
                      const Icon = s.icon;
                      const selected = signalType === s.value;
                      return (
                        <button key={s.value}
                          onClick={() => setSignalType(selected ? null : s.value)}
                          data-testid={`signal-${s.value}`}
                          className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-left transition-all duration-150 active:scale-95 border min-h-[44px] ${
                            selected
                              ? "bg-gray-700 border-gray-500 text-white shadow-lg"
                              : "bg-gray-800/50 border-gray-700/40 text-gray-400 hover:border-gray-600 hover:text-gray-300"
                          }`}
                        >
                          <Icon className={`w-4 h-4 shrink-0 ${selected ? s.color : ""}`} />
                          <span className="text-[11px] font-semibold truncate">{s.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Intelligence trigger - shown when a signal is selected */}
          {selectedSig && (
            <div data-testid="signal-intelligence" className="mt-3 px-3 py-2.5 rounded-lg bg-gray-800/60 border border-gray-700/40"
              style={{ animation: "impactIn 150ms ease both" }}>
              <p className="text-[11px] text-gray-300 font-medium flex items-center gap-1.5">
                <ChevronRight className="w-3 h-3 text-gray-500" />
                {selectedSig.consequence}
              </p>
              {selectedSig.suggest && (
                <p className="text-[11px] text-gray-500 mt-0.5 pl-[18px]">
                  Suggested: {selectedSig.suggest}
                </p>
              )}
            </div>
          )}
        </section>
      </div>

      {/* ═══ NOTE ═══ */}
      <section>
        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2 block">
          Note <span className="text-red-400 font-normal">*</span>
        </label>
        <textarea
          ref={noteRef}
          value={noteText}
          onChange={(e) => setNoteText(e.target.value)}
          placeholder="Coach said..."
          maxLength={280}
          rows={2}
          data-testid="note-text"
          className="w-full bg-gray-800/60 border border-gray-700/50 rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-gray-500 resize-none transition-colors"
        />
      </section>

      {/* ═══ LIVE IMPACT PANEL ═══ */}
      <LiveImpactPanel
        athlete={selectedAthlete}
        school={selectedSchool}
        interest={interest}
        signalType={signalType}
        athletes={athletes}
        schools={schools}
      />

      {/* ═══ CTA ═══ */}
      <div className="space-y-3" data-testid="capture-cta">
        {/* Notify checkbox */}
        <label className="flex items-center gap-2.5 cursor-pointer group" data-testid="notify-athlete-toggle">
          <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all duration-150 ${
            notifyAthlete
              ? "bg-emerald-500 border-emerald-500"
              : "border-gray-600 group-hover:border-gray-400"
          }`}
            onClick={() => setNotifyAthlete(!notifyAthlete)}>
            {notifyAthlete && <Check className="w-3 h-3 text-white" />}
          </div>
          <span className="text-[12px] text-gray-400 font-medium flex items-center gap-1.5" onClick={() => setNotifyAthlete(!notifyAthlete)}>
            {notifyAthlete ? <Bell className="w-3.5 h-3.5 text-emerald-400" /> : <BellOff className="w-3.5 h-3.5" />}
            Notify athlete
          </span>
        </label>

        {/* Save button */}
        <button
          onClick={logSignal}
          disabled={saving || !canSave}
          data-testid="save-trigger-btn"
          className={`w-full py-3.5 font-bold text-sm rounded-xl transition-all duration-200 active:scale-[0.98] flex items-center justify-center gap-2 min-h-[48px] ${
            canSave
              ? "bg-white text-gray-900 hover:bg-gray-100 shadow-lg shadow-white/10"
              : "bg-gray-800 text-gray-500 cursor-not-allowed border border-gray-700/50"
          }`}
        >
          {saving ? (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900" />
          ) : (
            <>
              <Send className="w-4 h-4" />
              Save & Trigger Actions
            </>
          )}
        </button>
      </div>
    </div>
  );

  const NAV_LINKS = [
    { to: "/mission-control", label: "Dashboard", icon: LayoutDashboard },
    { to: "/events", label: "Events", icon: Calendar },
    { to: `/events/${eventId}/prep`, label: "Event Prep", icon: FileText },
    { to: "/roster", label: "Roster", icon: Users },
    { to: "/advocacy", label: "Advocacy", icon: Megaphone },
    { to: "/program", label: "Insights", icon: BarChart3 },
  ];

  return (
    <div className="min-h-screen bg-gray-950 text-white" data-testid="live-event-page">
      {/* Nav overlay */}
      {navOpen && (
        <>
          <div data-testid="nav-backdrop" onClick={() => setNavOpen(false)}
            className="fixed inset-0 z-[998] bg-black/50 backdrop-blur-sm"
            style={{ animation: "fadeIn 150ms ease both" }} />
          <div data-testid="nav-overlay"
            className="fixed top-0 left-0 bottom-0 z-[999] bg-gray-900 border-r border-white/5 overflow-y-auto"
            style={{ width: "min(260px, 75vw)", animation: "slideInLeft 200ms cubic-bezier(0.16,1,0.3,1) both", padding: "16px 0" }}>
            <div className="px-4 pb-4 flex items-center justify-between">
              <span className="text-[13px] font-semibold text-gray-200">Navigate</span>
              <button onClick={() => setNavOpen(false)} data-testid="nav-close-btn" className="text-gray-500 hover:text-white p-1 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex flex-col gap-0.5">
              {NAV_LINKS.map(({ to, label, icon: Icon }) => (
                <button key={to}
                  onClick={() => { setNavOpen(false); navigate(to); }}
                  data-testid={`nav-link-${label.toLowerCase().replace(/\s/g, "-")}`}
                  className="flex items-center gap-2.5 px-4 py-2.5 text-[13px] font-medium text-gray-400 hover:text-white hover:bg-white/5 transition-colors text-left w-full">
                  <Icon className="w-4 h-4 shrink-0" />
                  {label}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Header */}
      <header className="bg-gray-950/95 border-b border-gray-800/60 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-[960px] mx-auto px-3 sm:px-4 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <button onClick={() => setNavOpen(true)} className="text-gray-400 hover:text-white transition-colors shrink-0" data-testid="nav-toggle-btn" title="Menu">
              <Menu className="w-4 h-4" />
            </button>
            <button onClick={() => navigate(`/events/${eventId}/prep`)} className="text-gray-400 hover:text-white transition-colors shrink-0" data-testid="back-from-live">
              <ArrowLeft className="w-4 h-4" />
            </button>
            <h1 className="font-bold text-sm truncate" style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700 }}>{event?.name}</h1>
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
      <div className="bg-gray-900/60 border-b border-gray-800/40" data-testid="live-stats-bar">
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
            <kbd className="px-1 py-0.5 bg-gray-800 rounded text-gray-400 font-mono">Ctrl+Enter</kbd> save &middot; <kbd className="px-1 py-0.5 bg-gray-800 rounded text-gray-400 font-mono">Esc</kbd> clear
          </div>
        </div>
      </div>

      {/* Mobile Tab Toggle */}
      <div className="lg:hidden bg-gray-950 border-b border-gray-800/40">
        <div className="max-w-[960px] mx-auto px-3 sm:px-4 flex">
          <button onClick={() => setMobileTab("capture")} data-testid="tab-capture"
            className={`flex-1 py-2.5 text-xs font-semibold text-center transition-colors border-b-2 ${
              mobileTab === "capture" ? "text-white border-white" : "text-gray-500 border-transparent hover:text-gray-300"
            }`}>
            Capture
          </button>
          <button onClick={() => setMobileTab("signals")} data-testid="tab-signals"
            className={`flex-1 py-2.5 text-xs font-semibold text-center transition-colors border-b-2 flex items-center justify-center gap-1.5 ${
              mobileTab === "signals" ? "text-white border-white" : "text-gray-500 border-transparent hover:text-gray-300"
            }`}>
            Signals
            {notes.length > 0 && (
              <span className="text-[9px] font-bold bg-gray-800 text-gray-200 px-1.5 py-0.5 rounded-full">{notes.length}</span>
            )}
          </button>
        </div>
      </div>

      <div className="max-w-[960px] mx-auto px-3 sm:px-4 py-4 pb-8">
        <div className="hidden lg:grid lg:grid-cols-5 gap-6">
          <div className="lg:col-span-3">{captureForm}</div>
          <div className="lg:col-span-2">{signalsPanel}</div>
        </div>
        <div className="lg:hidden">
          {mobileTab === "capture" ? captureForm : signalsPanel}
        </div>
      </div>

      {/* CSS Animations */}
      <style>{`
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes slideInLeft { from { transform: translateX(-100%) } to { transform: translateX(0) } }
        @keyframes impactIn { from { opacity: 0; transform: translateY(4px) } to { opacity: 1; transform: translateY(0) } }
      `}</style>
    </div>
  );
}

export default LiveEvent;

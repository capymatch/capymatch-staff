import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { ArrowLeft, Radio, Send, Clock, Check } from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const INTEREST = [
  { value: "hot", label: "Hot", cls: "bg-red-500 text-white", ring: "ring-red-300" },
  { value: "warm", label: "Warm", cls: "bg-amber-400 text-white", ring: "ring-amber-200" },
  { value: "cool", label: "Cool", cls: "bg-sky-400 text-white", ring: "ring-sky-200" },
  { value: "none", label: "None", cls: "bg-gray-200 text-gray-600", ring: "ring-gray-200" },
];

const FOLLOW_UPS = [
  { value: "send_film", label: "Send film" },
  { value: "schedule_call", label: "Schedule call" },
  { value: "add_to_targets", label: "Add to target list" },
  { value: "route_to_pod", label: "Route to Support Pod" },
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

  // Capture form state
  const [selectedAthlete, setSelectedAthlete] = useState(null);
  const [selectedSchool, setSelectedSchool] = useState(null);
  const [interest, setInterest] = useState(null);
  const [noteText, setNoteText] = useState("");
  const [followUps, setFollowUps] = useState([]);
  const [saving, setSaving] = useState(false);
  const [lastSavedId, setLastSavedId] = useState(null);

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

  const toggleFollowUp = (val) => {
    setFollowUps((prev) => prev.includes(val) ? prev.filter((f) => f !== val) : [...prev, val]);
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
      // Clear form but keep athlete selected
      setSelectedSchool(null);
      setInterest(null);
      setNoteText("");
      setFollowUps([]);
      const ath = athletes.find((a) => a.id === selectedAthlete);
      toast.success(`Saved — ${ath?.full_name || "Athlete"} × ${school?.name || "—"}`);
      noteRef.current?.focus();
    } catch {
      toast.error("Failed to save note");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white" />
      </div>
    );
  }

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

      <div className="max-w-[900px] mx-auto px-4 py-4">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Left: Capture form */}
          <div className="lg:col-span-3 space-y-4">
            {/* Athlete chips */}
            <div>
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2 block">Athlete</label>
              <div className="flex flex-wrap gap-1.5" data-testid="athlete-chips">
                {athletes.map((a) => (
                  <button
                    key={a.id}
                    onClick={() => setSelectedAthlete(a.id)}
                    data-testid={`athlete-chip-${a.id}`}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                      selectedAthlete === a.id
                        ? "bg-white text-gray-900 ring-2 ring-white/30"
                        : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                    }`}
                  >
                    {a.full_name.split(" ")[0]} {a.full_name.split(" ")[1]?.[0]}.
                  </button>
                ))}
              </div>
            </div>

            {/* School chips */}
            <div>
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2 block">School</label>
              <div className="flex flex-wrap gap-1.5" data-testid="school-chips">
                {schools.slice(0, 10).map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setSelectedSchool(selectedSchool === s.id ? null : s.id)}
                    data-testid={`school-chip-${s.id}`}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                      selectedSchool === s.id
                        ? "bg-white text-gray-900 ring-2 ring-white/30"
                        : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                    }`}
                  >
                    {s.name}
                  </button>
                ))}
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

            {/* Quick note */}
            <div>
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2 block">Quick Note</label>
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

            {/* Log button */}
            <button
              onClick={logNote}
              disabled={saving || !selectedAthlete}
              data-testid="log-note-btn"
              className="w-full py-3 bg-white text-gray-900 font-bold text-sm rounded-lg hover:bg-gray-100 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Send className="w-4 h-4" /> LOG NOTE
            </button>
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
                  return (
                    <div key={n.id} className="bg-gray-800 border border-gray-700/50 rounded-lg p-3" data-testid={`recent-note-${n.id}`}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-white">{n.athlete_name?.split(" ")[0]}</span>
                          {n.school_name && (
                            <>
                              <span className="text-gray-600">×</span>
                              <span className="text-xs text-gray-300">{n.school_name}</span>
                            </>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {lastSavedId === n.id && (
                            <span className="flex items-center gap-0.5 text-[9px] text-emerald-400 font-medium animate-pulse" data-testid="saved-indicator">
                              <Check className="w-2.5 h-2.5" /> Saved
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

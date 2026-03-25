import { useState, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import {
  ArrowLeft, User, GraduationCap, Check, Send, Save, ExternalLink,
  Sparkles, Search, Link2, Video, FileText, Paperclip, X, Clock,
  TrendingUp, TrendingDown, Minus, Users, Megaphone,
} from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const FIT_OPTIONS = [
  { value: "athletic_ability", label: "Athletic ability" },
  { value: "tactical_awareness", label: "Tactical awareness" },
  { value: "academic_fit", label: "Academic fit" },
  { value: "character_leadership", label: "Character / leadership" },
  { value: "coachability", label: "Coachability" },
  { value: "program_need_match", label: "Program need match" },
];

const NEXT_STEPS = [
  { value: "evaluate_at_event", label: "Evaluate at upcoming event" },
  { value: "review_film", label: "Review film / highlight reel" },
  { value: "schedule_call", label: "Schedule call with family" },
  { value: "visit_campus", label: "Visit campus" },
  { value: "attend_camp", label: "Attend ID camp / clinic" },
];

const INTEREST_DOT = { hot: "bg-red-500", warm: "bg-amber-400", cool: "bg-sky-400" };

const TREND_ICON = { rising: TrendingUp, dropping: TrendingDown, stable: Minus };
const TREND_COLOR = { rising: "#10b981", dropping: "#ef4444", stable: "#94a3b8" };

/* ── Athlete Context Card ── */
function AthleteContextCard({ context }) {
  if (!context?.athlete) return null;
  const a = context.athlete;
  const TrendIcon = TREND_ICON[a.momentum_trend] || Minus;
  const trendColor = TREND_COLOR[a.momentum_trend] || "#94a3b8";

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-3" data-testid="athlete-context-card">
      <div className="flex items-center gap-3 mb-2.5">
        {a.photo_url ? (
          <img src={a.photo_url} alt={a.name} className="w-10 h-10 rounded-full object-cover" />
        ) : (
          <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-500">
            {a.name?.split(" ").map(w => w[0]).join("").slice(0, 2)}
          </div>
        )}
        <div>
          <p className="text-sm font-semibold text-gray-900">{a.name}</p>
          <p className="text-[11px] text-gray-500">
            {a.position || "—"} · {a.grad_year || "—"} · {a.team || "No team"}
          </p>
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
        <div className="bg-white rounded-md px-2.5 py-1.5 border border-slate-100">
          <span className="text-gray-400 block">Pipeline Status</span>
          <span className="font-semibold text-gray-700 capitalize">{(context.pipeline_status || "not in pipeline").replace(/_/g, " ")}</span>
        </div>
        <div className="bg-white rounded-md px-2.5 py-1.5 border border-slate-100">
          <span className="text-gray-400 block">Last Contact</span>
          <span className="font-semibold text-gray-700">{context.last_contact ? new Date(context.last_contact).toLocaleDateString() : "None"}</span>
        </div>
        <div className="bg-white rounded-md px-2.5 py-1.5 border border-slate-100">
          <span className="text-gray-400 block">Momentum</span>
          <span className="font-semibold flex items-center gap-1" style={{ color: trendColor }}>
            <TrendIcon className="w-3 h-3" />{a.momentum_score || 0}
          </span>
        </div>
        <div className="bg-white rounded-md px-2.5 py-1.5 border border-slate-100">
          <span className="text-gray-400 block">Targets</span>
          <span className="font-semibold text-gray-700">{a.school_targets || 0} schools</span>
        </div>
      </div>
    </div>
  );
}

/* ── Attachment Row ── */
function AttachmentInput({ attachment, onChange, onRemove }) {
  const TYPES = [
    { value: "highlight_reel", label: "Highlight Reel", icon: Video },
    { value: "profile_link", label: "Athlete Profile", icon: User },
    { value: "video_clip", label: "Video Clip", icon: FileText },
  ];
  const Icon = TYPES.find(t => t.value === attachment.type)?.icon || Link2;

  return (
    <div className="flex items-center gap-2" data-testid={`attachment-row-${attachment.type}`}>
      <div className="w-7 h-7 rounded-md bg-slate-100 flex items-center justify-center shrink-0">
        <Icon className="w-3.5 h-3.5 text-slate-500" />
      </div>
      <select
        value={attachment.type}
        onChange={(e) => onChange({ ...attachment, type: e.target.value })}
        className="text-xs border border-gray-200 rounded-md px-2 py-1.5 bg-white text-gray-700 shrink-0"
        data-testid={`attachment-type-${attachment.type}`}
      >
        {TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
      </select>
      <input
        value={attachment.url}
        onChange={(e) => onChange({ ...attachment, url: e.target.value })}
        placeholder="Paste URL..."
        className="flex-1 text-xs border border-gray-200 rounded-md px-2.5 py-1.5 text-gray-700 placeholder-gray-400"
        data-testid={`attachment-url-${attachment.type}`}
      />
      <button onClick={onRemove} className="p-1 hover:bg-red-50 rounded" data-testid={`remove-attachment-${attachment.type}`}>
        <X className="w-3.5 h-3.5 text-gray-400 hover:text-red-500" />
      </button>
    </div>
  );
}

/* ── Main Builder ── */
function RecommendationBuilder() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Pre-fill from URL params (from SchoolPod, pipeline, etc.)
  const prefillAthlete = searchParams.get("athlete") || "";
  const prefillSchool = searchParams.get("school") || "";
  const prefillSchoolName = searchParams.get("schoolName") || "";

  const [athletes, setAthletes] = useState([]);
  const [schools, setSchools] = useState([]);
  const [athleteContext, setAthleteContext] = useState(null);
  const [eventNotes, setEventNotes] = useState([]);

  const [selectedAthlete, setSelectedAthlete] = useState(prefillAthlete);
  const [selectedSchool, setSelectedSchool] = useState(prefillSchool);
  const [selectedSchoolName, setSelectedSchoolName] = useState(prefillSchoolName);
  const [coachName, setCoachName] = useState("");
  const [fitReasons, setFitReasons] = useState([]);
  const [fitNote, setFitNote] = useState("");
  const [introMessage, setIntroMessage] = useState("");
  const [nextStep, setNextStep] = useState("");
  const [selectedEventNotes, setSelectedEventNotes] = useState([]);
  const [attachments, setAttachments] = useState([]);
  const [saving, setSaving] = useState(false);
  const [aiDrafting, setAiDrafting] = useState(false);

  // Athlete search
  const [athleteQuery, setAthleteQuery] = useState("");
  const [athleteResults, setAthleteResults] = useState([]);
  const [showAthleteDropdown, setShowAthleteDropdown] = useState(false);

  // School search
  const [schoolQuery, setSchoolQuery] = useState("");
  const [schoolResults, setSchoolResults] = useState([]);
  const [showSchoolDropdown, setShowSchoolDropdown] = useState(false);

  // Load athletes list + schools
  useEffect(() => {
    Promise.all([
      axios.get(`${API}/advocacy/athletes`),
      axios.get(`${API}/schools`),
    ]).then(([athRes, schoolsRes]) => {
      setAthletes(athRes.data);
      setSchools(schoolsRes.data);
      // If we have a prefilled school by ID, resolve its name
      if (prefillSchool && !prefillSchoolName) {
        const match = schoolsRes.data.find(s => s.id === prefillSchool);
        if (match) setSelectedSchoolName(match.name);
      }
    }).catch(() => {});
  }, [prefillSchool, prefillSchoolName]);

  // Load context when athlete + school selected
  useEffect(() => {
    const schoolIdOrName = selectedSchool || selectedSchoolName;
    if (!selectedAthlete || !schoolIdOrName) {
      setAthleteContext(null);
      setEventNotes([]);
      return;
    }
    axios.get(`${API}/advocacy/athlete-context/${selectedAthlete}/${encodeURIComponent(schoolIdOrName)}`)
      .then((res) => {
        setAthleteContext(res.data);
        setEventNotes(res.data.event_notes || []);
        // Auto-populate highlight video as attachment if available
        if (res.data.highlight_video && attachments.length === 0) {
          setAttachments([{ type: "highlight_reel", url: res.data.highlight_video }]);
        }
      })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAthlete, selectedSchool, selectedSchoolName]);

  // Athlete search
  useEffect(() => {
    if (athleteQuery.length < 2) { setAthleteResults([]); return; }
    const timeout = setTimeout(() => {
      axios.get(`${API}/advocacy/athletes`, { params: { q: athleteQuery } })
        .then((res) => setAthleteResults(res.data))
        .catch(() => {});
    }, 250);
    return () => clearTimeout(timeout);
  }, [athleteQuery]);

  // School search
  useEffect(() => {
    if (schoolQuery.length < 2) { setSchoolResults([]); return; }
    const timeout = setTimeout(() => {
      axios.get(`${API}/schools/search`, { params: { q: schoolQuery, limit: 10 } })
        .then((res) => setSchoolResults(res.data.schools || []))
        .catch(() => {});
    }, 250);
    return () => clearTimeout(timeout);
  }, [schoolQuery]);

  const selectAthlete = (a) => {
    setSelectedAthlete(a.id);
    setAthleteQuery(a.name);
    setShowAthleteDropdown(false);
  };

  const selectSchool = (s) => {
    const name = s.university_name || s.name;
    setSelectedSchool(name);
    setSelectedSchoolName(name);
    setSchoolQuery(name);
    setShowSchoolDropdown(false);
  };

  const toggleFit = (val) => setFitReasons((prev) => prev.includes(val) ? prev.filter(f => f !== val) : [...prev, val]);
  const toggleEventNote = (id) => setSelectedEventNotes((prev) => prev.includes(id) ? prev.filter(n => n !== id) : [...prev, id]);

  const addAttachment = () => {
    setAttachments(prev => [...prev, { type: "highlight_reel", url: "" }]);
  };

  const draftWithAi = async () => {
    const schoolIdOrName = selectedSchool || selectedSchoolName;
    if (!selectedAthlete || !schoolIdOrName) {
      toast.error("Select an athlete and school first");
      return;
    }
    setAiDrafting(true);
    try {
      const res = await axios.post(`${API}/ai/advocacy-draft/${selectedAthlete}/${encodeURIComponent(schoolIdOrName)}`, {
        fit_reasons: fitReasons,
        fit_note: fitNote,
        highlight_video: attachments.find(a => a.type === "highlight_reel")?.url || "",
      }, { timeout: 50000 });
      setIntroMessage(res.data.text);
      toast.success("AI draft generated — review and personalize before sending");
    } catch (err) {
      const status = err.response?.status;
      const detail = err.response?.data?.detail;
      if (err.code === "ECONNABORTED" || err.message?.includes("timeout")) {
        toast.error("Request timed out — the AI service is busy. Please try again.");
      } else if (status === 503) {
        toast.error(detail || "AI service temporarily unavailable. Please try again.");
      } else {
        toast.error(detail || "Failed to generate AI draft");
      }
    } finally {
      setAiDrafting(false);
    }
  };

  const saveOrSend = async (send = false) => {
    if (!selectedAthlete) { toast.error("Select an athlete"); return; }
    if (!selectedSchool && !selectedSchoolName) { toast.error("Select a school"); return; }
    if (send && !introMessage.trim()) { toast.error("Write an intro message before sending"); return; }

    setSaving(true);
    try {
      const validAttachments = attachments.filter(a => a.url.trim());
      const res = await axios.post(`${API}/advocacy/recommendations`, {
        athlete_id: selectedAthlete,
        school_id: selectedSchool,
        school_name: selectedSchoolName || "",
        college_coach_name: coachName,
        fit_reasons: fitReasons,
        fit_note: fitNote,
        supporting_event_notes: selectedEventNotes,
        intro_message: introMessage,
        desired_next_step: nextStep,
        attachments: validAttachments,
      });

      if (send) {
        await axios.post(`${API}/advocacy/recommendations/${res.data.id}/send`);
        toast.success(`Recommendation sent to ${selectedSchoolName || "school"}`);
      } else {
        toast.success("Draft saved");
      }
      navigate("/advocacy");
    } catch {
      toast.error("Failed to save");
    } finally {
      setSaving(false);
    }
  };

  // Resolve pre-filled athlete name
  const selectedAthleteName = athletes.find(a => a.id === selectedAthlete)?.name
    || athleteContext?.athlete?.name
    || athleteQuery || "";

  return (
    <div className="min-h-screen bg-slate-50" data-testid="recommendation-builder-page">
      <header className="bg-white/95 border-b border-gray-100">
        <div className="max-w-[900px] mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate("/advocacy")} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800" data-testid="back-to-advocacy">
              <ArrowLeft className="w-4 h-4" /><span className="hidden sm:inline">Advocacy</span>
            </button>
            <div className="h-5 w-px bg-gray-200" />
            <h1 className="font-semibold text-gray-900 text-base">New Recommendation</h1>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => saveOrSend(false)} disabled={saving} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-white border border-gray-200 rounded-md hover:bg-gray-50 disabled:opacity-50" data-testid="save-draft-btn">
              <Save className="w-3.5 h-3.5" />Draft
            </button>
            <button onClick={() => saveOrSend(true)} disabled={saving} className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium bg-slate-900 text-white rounded-md hover:bg-slate-800 disabled:opacity-50" data-testid="send-recommendation-btn">
              <Send className="w-3.5 h-3.5" />Send
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-[900px] mx-auto px-4 sm:px-6 py-6 space-y-4">
        {/* ── Athlete + School Selection ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Athlete */}
          <section className="bg-white border border-gray-100 rounded-lg p-4" data-testid="builder-athlete-section">
            <h2 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5" />Athlete
            </h2>
            {prefillAthlete && selectedAthleteName ? (
              <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 border border-slate-200 rounded-md">
                <Users className="w-3.5 h-3.5 text-slate-500" />
                <span className="text-sm font-medium text-gray-800">{selectedAthleteName}</span>
                <button onClick={() => { setSelectedAthlete(""); setAthleteQuery(""); }} className="ml-auto p-0.5 hover:bg-slate-200 rounded">
                  <X className="w-3 h-3 text-gray-400" />
                </button>
              </div>
            ) : (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                <input
                  value={athleteQuery}
                  onChange={(e) => { setAthleteQuery(e.target.value); setShowAthleteDropdown(true); }}
                  onFocus={() => setShowAthleteDropdown(true)}
                  placeholder="Search athlete..."
                  className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-md bg-white text-gray-700 placeholder-gray-400"
                  data-testid="athlete-search"
                />
                {showAthleteDropdown && (athleteResults.length > 0 || athletes.length > 0) && (
                  <div className="absolute z-20 mt-1 w-full max-h-48 overflow-y-auto bg-white border border-gray-200 rounded-md shadow-lg">
                    {(athleteQuery.length >= 2 ? athleteResults : athletes).map(a => (
                      <button key={a.id} onClick={() => selectAthlete(a)} className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center gap-2 text-xs" data-testid={`athlete-option-${a.id}`}>
                        {a.photo_url ? <img src={a.photo_url} alt="" className="w-6 h-6 rounded-full object-cover" /> : <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-[9px] font-bold text-slate-500">{a.name?.charAt(0)}</div>}
                        <span className="font-medium text-gray-800">{a.name}</span>
                        <span className="text-gray-400">{a.position} · {a.grad_year}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </section>

          {/* School */}
          <section className="bg-white border border-gray-100 rounded-lg p-4" data-testid="builder-school-section">
            <h2 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <GraduationCap className="w-3.5 h-3.5" />School / Program
            </h2>
            {selectedSchoolName ? (
              <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 border border-slate-200 rounded-md">
                <GraduationCap className="w-3.5 h-3.5 text-slate-500" />
                <span className="text-sm font-medium text-gray-800">{selectedSchoolName}</span>
                <button onClick={() => { setSelectedSchool(""); setSelectedSchoolName(""); setSchoolQuery(""); }} className="ml-auto p-0.5 hover:bg-slate-200 rounded">
                  <X className="w-3 h-3 text-gray-400" />
                </button>
              </div>
            ) : (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                <input
                  value={schoolQuery}
                  onChange={(e) => { setSchoolQuery(e.target.value); setShowSchoolDropdown(true); }}
                  onFocus={() => setShowSchoolDropdown(true)}
                  placeholder="Search school..."
                  className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-md bg-white text-gray-700 placeholder-gray-400"
                  data-testid="school-search"
                />
                {showSchoolDropdown && schoolResults.length > 0 && (
                  <div className="absolute z-20 mt-1 w-full max-h-48 overflow-y-auto bg-white border border-gray-200 rounded-md shadow-lg">
                    {schoolResults.map((s, i) => (
                      <button key={i} onClick={() => selectSchool(s)} className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center gap-2 text-xs" data-testid={`school-option-${i}`}>
                        <GraduationCap className="w-4 h-4 text-slate-400 shrink-0" />
                        <span className="font-medium text-gray-800">{s.university_name}</span>
                        <span className="text-gray-400">{s.division} · {s.conference}</span>
                      </button>
                    ))}
                  </div>
                )}
                {showSchoolDropdown && schoolQuery.length >= 2 && schoolResults.length === 0 && (
                  <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg px-3 py-2 text-xs text-gray-400">No schools found</div>
                )}
              </div>
            )}
          </section>
        </div>

        {/* ── Athlete Recruiting Context ── */}
        {athleteContext && <AthleteContextCard context={athleteContext} />}

        {/* ── Relationship Context ── */}
        {athleteContext && (athleteContext.previous_advocacy?.length > 0 || athleteContext.event_notes?.length > 0) && (
          <section className="bg-white border border-gray-100 rounded-lg p-4" data-testid="relationship-context">
            <h2 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-3">Relationship History</h2>
            <div className="space-y-2">
              {athleteContext.previous_advocacy?.length > 0 && (
                <div>
                  <p className="text-[10px] font-semibold text-gray-500 mb-1.5">Previous Advocacy</p>
                  {athleteContext.previous_advocacy.map((a) => (
                    <div key={a.id} className="flex items-center gap-2 px-3 py-1.5 bg-amber-50/50 border border-amber-100 rounded-md mb-1" data-testid={`prev-advocacy-${a.id}`}>
                      <Megaphone className="w-3 h-3 text-amber-500 shrink-0" />
                      <span className="text-xs text-gray-700 capitalize">{a.status?.replace(/_/g, " ")}</span>
                      {a.fit_summary && <span className="text-[10px] text-gray-400 truncate">— {a.fit_summary}</span>}
                      {a.created_at && <span className="text-[10px] text-gray-400 ml-auto shrink-0">{new Date(a.created_at).toLocaleDateString()}</span>}
                    </div>
                  ))}
                </div>
              )}
              {athleteContext.event_notes?.length > 0 && (
                <div>
                  <p className="text-[10px] font-semibold text-gray-500 mb-1.5">Event Interactions ({athleteContext.event_notes.length})</p>
                  {athleteContext.event_notes.slice(0, 3).map((n) => (
                    <div key={n.id} className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-100 rounded-md mb-1" data-testid={`event-interaction-${n.id}`}>
                      <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                      <span className="text-xs text-gray-700 truncate">{n.event_name}</span>
                      {n.interest_level && <span className={`w-2 h-2 rounded-full shrink-0 ${INTEREST_DOT[n.interest_level] || "bg-gray-300"}`} />}
                      <span className="text-[10px] text-gray-400 truncate">"{n.note_text}"</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}

        {/* ── Fit Reasons ── */}
        <section className="bg-white border border-gray-100 rounded-lg p-5" data-testid="builder-fit-section">
          <h2 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-3">Why This Athlete Fits</h2>
          <div className="flex flex-wrap gap-2 mb-3" data-testid="fit-reason-chips">
            {FIT_OPTIONS.map(f => (
              <button key={f.value} onClick={() => toggleFit(f.value)} data-testid={`fit-${f.value}`}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${fitReasons.includes(f.value) ? "bg-slate-900 text-white border-slate-900" : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"}`}>
                {fitReasons.includes(f.value) && <Check className="w-3 h-3 inline mr-1" />}{f.label}
              </button>
            ))}
          </div>
          <textarea value={fitNote} onChange={(e) => setFitNote(e.target.value)} placeholder="Why is this athlete a strong fit for this program..." rows={2} data-testid="fit-note"
            className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm text-gray-700 placeholder-gray-400 resize-none" />
        </section>

        {/* ── Supporting Context (event notes) ── */}
        {eventNotes.length > 0 && (
          <section className="bg-white border border-gray-100 rounded-lg p-5" data-testid="builder-context-section">
            <h2 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-3">Supporting Context</h2>
            <p className="text-xs text-gray-400 mb-2">Select event notes to attach as evidence:</p>
            <div className="space-y-2">
              {eventNotes.map(n => (
                <label key={n.id} className={`flex items-start gap-3 p-2.5 rounded-md border cursor-pointer transition-all ${selectedEventNotes.includes(n.id) ? "border-slate-900 bg-slate-50" : "border-gray-100 hover:border-gray-300"}`} data-testid={`context-note-${n.id}`}>
                  <input type="checkbox" checked={selectedEventNotes.includes(n.id)} onChange={() => toggleEventNote(n.id)} className="mt-0.5 accent-slate-900" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${INTEREST_DOT[n.interest_level] || "bg-gray-300"}`} />
                      <span className="text-xs font-medium text-gray-700">{n.event_name}</span>
                      {n.school_name && <span className="text-xs text-gray-400">- {n.school_name}</span>}
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">"{n.note_text}"</p>
                  </div>
                </label>
              ))}
            </div>
          </section>
        )}

        {/* ── Attachments ── */}
        <section className="bg-white border border-gray-100 rounded-lg p-5" data-testid="builder-attachments-section">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
              <Paperclip className="w-3.5 h-3.5" />Attachments
            </h2>
            <button onClick={addAttachment} className="flex items-center gap-1 text-[11px] font-medium text-teal-600 hover:text-teal-700" data-testid="add-attachment-btn">
              <Paperclip className="w-3 h-3" />Add
            </button>
          </div>
          {attachments.length === 0 ? (
            <p className="text-xs text-gray-400">No attachments. Add a highlight reel, profile link, or video clip.</p>
          ) : (
            <div className="space-y-2">
              {attachments.map((a, i) => (
                <AttachmentInput key={i} attachment={a}
                  onChange={(updated) => setAttachments(prev => prev.map((att, j) => j === i ? updated : att))}
                  onRemove={() => setAttachments(prev => prev.filter((_, j) => j !== i))} />
              ))}
            </div>
          )}
        </section>

        {/* ── Intro Message + AI Draft ── */}
        <section className="bg-white border border-gray-100 rounded-lg p-5" data-testid="builder-message-section">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Intro Message</h2>
            <button onClick={draftWithAi} disabled={aiDrafting || !selectedAthlete || (!selectedSchool && !selectedSchoolName)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-all ${aiDrafting || !selectedAthlete || (!selectedSchool && !selectedSchoolName) ? "bg-gray-50 text-gray-400 border-gray-200 cursor-not-allowed" : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:border-slate-300"}`} data-testid="ai-draft-btn">
              {aiDrafting ? <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-slate-400" /> : <Sparkles className="w-3 h-3 text-amber-500" />}
              {aiDrafting ? "Drafting..." : "Draft with AI"}
            </button>
          </div>
          {fitReasons.length > 0 && (
            <p className="text-[10px] text-emerald-600 mb-2">AI will use: {fitReasons.map(r => FIT_OPTIONS.find(f => f.value === r)?.label).join(", ")}</p>
          )}
          <input value={coachName} onChange={(e) => setCoachName(e.target.value)} placeholder="College coach name (optional)" data-testid="coach-name-input"
            className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm text-gray-700 placeholder-gray-400 mb-2" />
          <textarea value={introMessage} onChange={(e) => setIntroMessage(e.target.value)} placeholder="Your personal introduction and recommendation..." rows={6} data-testid="intro-message"
            className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm text-gray-700 placeholder-gray-400 resize-none" />
        </section>

        {/* ── Desired Next Step ── */}
        <section className="bg-white border border-gray-100 rounded-lg p-5" data-testid="builder-nextstep-section">
          <h2 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-3">Desired Next Step</h2>
          <div className="space-y-1.5" data-testid="next-step-options">
            {NEXT_STEPS.map(s => (
              <label key={s.value} className="flex items-center gap-2 cursor-pointer" data-testid={`step-${s.value}`}>
                <input type="radio" name="nextStep" value={s.value} checked={nextStep === s.value} onChange={() => setNextStep(s.value)} className="accent-slate-900" />
                <span className="text-sm text-gray-700">{s.label}</span>
              </label>
            ))}
          </div>
        </section>

        {/* ── Bottom Actions (mobile) ── */}
        <div className="flex items-center justify-end gap-3 pt-2 pb-8 sm:hidden">
          <button onClick={() => saveOrSend(false)} disabled={saving} className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium bg-white border border-gray-200 rounded-md hover:bg-gray-50 disabled:opacity-50" data-testid="save-draft-btn-mobile">
            <Save className="w-3.5 h-3.5" />Save Draft
          </button>
          <button onClick={() => saveOrSend(true)} disabled={saving} className="flex items-center gap-1.5 px-5 py-2.5 text-xs font-medium bg-slate-900 text-white rounded-md hover:bg-slate-800 disabled:opacity-50" data-testid="send-btn-mobile">
            <Send className="w-3.5 h-3.5" />Send
          </button>
        </div>
      </main>
    </div>
  );
}

export default RecommendationBuilder;

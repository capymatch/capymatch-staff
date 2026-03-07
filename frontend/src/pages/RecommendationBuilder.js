import { useState, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { ArrowLeft, User, GraduationCap, Check, Send, Save, ExternalLink, Sparkles } from "lucide-react";

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

function RecommendationBuilder() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [athletes, setAthletes] = useState([]);
  const [schools, setSchools] = useState([]);
  const [eventContext, setEventContext] = useState({ event_notes: [], athlete_snapshot: null });

  const [selectedAthlete, setSelectedAthlete] = useState(searchParams.get("athlete") || "");
  const [selectedSchool, setSelectedSchool] = useState(searchParams.get("school") || "");
  const [coachName, setCoachName] = useState("");
  const [fitReasons, setFitReasons] = useState([]);
  const [fitNote, setFitNote] = useState("");
  const [introMessage, setIntroMessage] = useState("");
  const [nextStep, setNextStep] = useState("");
  const [selectedEventNotes, setSelectedEventNotes] = useState([]);
  const [saving, setSaving] = useState(false);
  const [aiDrafting, setAiDrafting] = useState(false);

  // Load athletes + schools
  useEffect(() => {
    Promise.all([
      axios.get(`${API}/mission-control`),
      axios.get(`${API}/schools`),
    ]).then(([mcRes, schoolsRes]) => {
      // Extract unique athletes from interventions
      const athleteMap = {};
      (mcRes.data.priorityAlerts || []).concat(mcRes.data.athletesNeedingAttention || []).forEach((item) => {
        if (item.athlete_id && !athleteMap[item.athlete_id]) {
          athleteMap[item.athlete_id] = { id: item.athlete_id, name: item.athlete_name, gradYear: item.grad_year, position: item.position, team: item.team };
        }
      });
      setAthletes(Object.values(athleteMap));
      setSchools(schoolsRes.data);
    });
  }, []);

  // Load event context when athlete + school selected
  useEffect(() => {
    if (!selectedAthlete) return;
    const url = selectedSchool
      ? `${API}/advocacy/context/${selectedAthlete}/${selectedSchool}`
      : `${API}/advocacy/context/${selectedAthlete}`;
    axios.get(url).then((res) => setEventContext(res.data)).catch(() => {});
  }, [selectedAthlete, selectedSchool]);

  const toggleFit = (val) => setFitReasons((prev) => prev.includes(val) ? prev.filter((f) => f !== val) : [...prev, val]);
  const toggleEventNote = (id) => setSelectedEventNotes((prev) => prev.includes(id) ? prev.filter((n) => n !== id) : [...prev, id]);

  const draftWithAi = async () => {
    if (!selectedAthlete || !selectedSchool) {
      toast.error("Select an athlete and school first");
      return;
    }
    setAiDrafting(true);
    try {
      const res = await axios.post(`${API}/ai/advocacy-draft/${selectedAthlete}/${selectedSchool}`);
      setIntroMessage(res.data.text);
      toast.success("AI draft generated — review and personalize before sending");
    } catch (err) {
      const msg = err.response?.data?.detail || "Failed to generate AI draft";
      toast.error(msg);
    } finally {
      setAiDrafting(false);
    }
  };

  const saveOrSend = async (send = false) => {
    if (!selectedAthlete) { toast.error("Select an athlete"); return; }
    if (!selectedSchool) { toast.error("Select a school"); return; }
    if (send && !introMessage.trim()) { toast.error("Write an intro message before sending"); return; }

    setSaving(true);
    try {
      const school = schools.find((s) => s.id === selectedSchool);
      const res = await axios.post(`${API}/advocacy/recommendations`, {
        athlete_id: selectedAthlete,
        school_id: selectedSchool,
        school_name: school?.name || "",
        college_coach_name: coachName,
        fit_reasons: fitReasons,
        fit_note: fitNote,
        supporting_event_notes: selectedEventNotes,
        intro_message: introMessage,
        desired_next_step: nextStep,
      });

      if (send) {
        await axios.post(`${API}/advocacy/recommendations/${res.data.id}/send`);
        toast.success(`Sent to ${school?.name} — saved`);
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

  const INTEREST_DOT = { hot: "bg-red-500", warm: "bg-amber-400", cool: "bg-sky-400" };
  const snap = eventContext.athlete_snapshot;

  return (
    <div className="min-h-screen bg-slate-50" data-testid="recommendation-builder-page">
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-100">
        <div className="max-w-[900px] mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate("/advocacy")} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800" data-testid="back-to-advocacy">
              <ArrowLeft className="w-4 h-4" /><span className="hidden sm:inline">Advocacy</span>
            </button>
            <div className="h-5 w-px bg-gray-200" />
            <h1 className="font-semibold text-gray-900 text-base">New Recommendation</h1>
          </div>
        </div>
      </header>

      <main className="max-w-[900px] mx-auto px-4 sm:px-6 py-6 space-y-5">
        {/* Athlete selection */}
        <section className="bg-white border border-gray-100 rounded-lg p-5" data-testid="builder-athlete-section">
          <h2 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-1.5"><User className="w-3.5 h-3.5" />Athlete</h2>
          <select
            value={selectedAthlete}
            onChange={(e) => setSelectedAthlete(e.target.value)}
            data-testid="athlete-select"
            className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm text-gray-700 bg-white"
          >
            <option value="">Select athlete...</option>
            {athletes.map((a) => <option key={a.id} value={a.id}>{a.name} · {a.gradYear} · {a.position}</option>)}
          </select>
          {snap && (
            <div className="mt-3 flex items-center gap-4 text-xs text-gray-500">
              <span>Momentum: {snap.momentumTrend === "rising" ? "↗" : snap.momentumTrend === "dropping" ? "↘" : "→"} {snap.momentumScore}</span>
              <span>Stage: {snap.recruitingStage?.replace(/_/g, " ")}</span>
              <span>{snap.schoolTargets} target schools</span>
            </div>
          )}
        </section>

        {/* School selection */}
        <section className="bg-white border border-gray-100 rounded-lg p-5" data-testid="builder-school-section">
          <h2 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-1.5"><GraduationCap className="w-3.5 h-3.5" />School / Program</h2>
          <select
            value={selectedSchool}
            onChange={(e) => setSelectedSchool(e.target.value)}
            data-testid="school-select"
            className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm text-gray-700 bg-white"
          >
            <option value="">Select school...</option>
            {schools.map((s) => <option key={s.id} value={s.id}>{s.name} · {s.division}</option>)}
          </select>
          {selectedSchool && (
            <button
              onClick={() => navigate(`/advocacy/relationships/${selectedSchool}`)}
              className="mt-2 text-[11px] text-gray-400 hover:text-gray-700 flex items-center gap-0.5"
            >
              View full relationship <ExternalLink className="w-3 h-3" />
            </button>
          )}
        </section>

        {/* Fit reasons */}
        <section className="bg-white border border-gray-100 rounded-lg p-5" data-testid="builder-fit-section">
          <h2 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-3">Why This Athlete Fits</h2>
          <div className="flex flex-wrap gap-2 mb-3" data-testid="fit-reason-chips">
            {FIT_OPTIONS.map((f) => (
              <button
                key={f.value}
                onClick={() => toggleFit(f.value)}
                data-testid={`fit-${f.value}`}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
                  fitReasons.includes(f.value)
                    ? "bg-slate-900 text-white border-slate-900"
                    : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"
                }`}
              >
                {fitReasons.includes(f.value) && <Check className="w-3 h-3 inline mr-1" />}{f.label}
              </button>
            ))}
          </div>
          <textarea
            value={fitNote}
            onChange={(e) => setFitNote(e.target.value)}
            placeholder="Why is this athlete a strong fit for this program..."
            rows={3}
            data-testid="fit-note"
            className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm text-gray-700 placeholder-gray-400 resize-none"
          />
        </section>

        {/* Supporting context (auto-populated from events) */}
        {eventContext.event_notes.length > 0 && (
          <section className="bg-white border border-gray-100 rounded-lg p-5" data-testid="builder-context-section">
            <h2 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-3">Supporting Context</h2>
            <p className="text-xs text-gray-400 mb-2">Select event notes to attach as evidence:</p>
            <div className="space-y-2">
              {eventContext.event_notes.map((n) => (
                <label
                  key={n.id}
                  className={`flex items-start gap-3 p-2.5 rounded-md border cursor-pointer transition-all ${
                    selectedEventNotes.includes(n.id) ? "border-slate-900 bg-slate-50" : "border-gray-100 hover:border-gray-300"
                  }`}
                  data-testid={`context-note-${n.id}`}
                >
                  <input
                    type="checkbox"
                    checked={selectedEventNotes.includes(n.id)}
                    onChange={() => toggleEventNote(n.id)}
                    className="mt-0.5 accent-slate-900"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${INTEREST_DOT[n.interest_level] || "bg-gray-300"}`} />
                      <span className="text-xs font-medium text-gray-700">{n.event_name}</span>
                      {n.school_name && <span className="text-xs text-gray-400">× {n.school_name}</span>}
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">"{n.note_text}"</p>
                  </div>
                </label>
              ))}
            </div>
          </section>
        )}

        {/* Intro message */}
        <section className="bg-white border border-gray-100 rounded-lg p-5" data-testid="builder-message-section">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Intro Message</h2>
            <button
              onClick={draftWithAi}
              disabled={aiDrafting || !selectedAthlete || !selectedSchool}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-all ${
                aiDrafting || !selectedAthlete || !selectedSchool
                  ? "bg-gray-50 text-gray-400 border-gray-200 cursor-not-allowed"
                  : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:border-slate-300"
              }`}
              data-testid="ai-draft-btn"
            >
              {aiDrafting ? (
                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-slate-400" />
              ) : (
                <Sparkles className="w-3 h-3 text-amber-500" />
              )}
              {aiDrafting ? "Drafting..." : "Draft with AI"}
            </button>
          </div>
          <input
            value={coachName}
            onChange={(e) => setCoachName(e.target.value)}
            placeholder="College coach name (optional)"
            data-testid="coach-name-input"
            className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm text-gray-700 placeholder-gray-400 mb-2"
          />
          <textarea
            value={introMessage}
            onChange={(e) => setIntroMessage(e.target.value)}
            placeholder="Your personal introduction and recommendation..."
            rows={5}
            data-testid="intro-message"
            className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm text-gray-700 placeholder-gray-400 resize-none"
          />
        </section>

        {/* Desired next step */}
        <section className="bg-white border border-gray-100 rounded-lg p-5" data-testid="builder-nextstep-section">
          <h2 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-3">Desired Next Step</h2>
          <div className="space-y-1.5" data-testid="next-step-options">
            {NEXT_STEPS.map((s) => (
              <label key={s.value} className="flex items-center gap-2 cursor-pointer" data-testid={`step-${s.value}`}>
                <input
                  type="radio"
                  name="nextStep"
                  value={s.value}
                  checked={nextStep === s.value}
                  onChange={() => setNextStep(s.value)}
                  className="accent-slate-900"
                />
                <span className="text-sm text-gray-700">{s.label}</span>
              </label>
            ))}
          </div>
        </section>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-2 pb-8">
          <button
            onClick={() => saveOrSend(false)}
            disabled={saving}
            className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium bg-white border border-gray-200 rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50"
            data-testid="save-draft-btn"
          >
            <Save className="w-3.5 h-3.5" /> Save Draft
          </button>
          <button
            onClick={() => saveOrSend(true)}
            disabled={saving}
            className="flex items-center gap-1.5 px-5 py-2.5 text-xs font-medium bg-slate-900 text-white rounded-md hover:bg-slate-800 transition-colors disabled:opacity-50"
            data-testid="send-recommendation-btn"
          >
            <Send className="w-3.5 h-3.5" /> Send Recommendation
          </button>
        </div>
      </main>
    </div>
  );
}

export default RecommendationBuilder;

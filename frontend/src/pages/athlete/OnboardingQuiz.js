import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight, Check, Sparkles, Loader2, Target, Clock, Shield } from "lucide-react";
import { Button } from "../../components/ui/button";
import { toast } from "sonner";
import axios from "axios";
import { useAuth } from "../../AuthContext";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const QUESTIONS = [
  {
    id: "position",
    emoji: "\uD83C\uDFD0",
    title: "What position(s) do you play?",
    sub: "Select all that apply. This helps us understand your playing style and match you with programs looking for your skill set.",
    type: "multi",
    max: 6,
    options: [
      { value: "Setter", icon: "\uD83C\uDFAF", desc: "Floor general" },
      { value: "Outside Hitter", icon: "\u26A1", desc: "Primary attacker" },
      { value: "Middle Blocker", icon: "\uD83D\uDEE1\uFE0F", desc: "Net presence" },
      { value: "Opposite Hitter", icon: "\uD83D\uDCA5", desc: "Right-side power" },
      { value: "Libero", icon: "\uD83D\uDC2C", desc: "Defensive specialist" },
      { value: "Defensive Specialist", icon: "\uD83E\uDDF1", desc: "Back-row expert" },
    ],
  },
  {
    id: "division",
    emoji: "\uD83C\uDFC6",
    title: "What division(s) are you targeting?",
    sub: "Select all that interest you. You can always update this later.",
    type: "multi",
    max: 4,
    options: [
      { value: "D1", icon: "\uD83E\uDD47", label: "NCAA Division I", desc: "Highest competition level" },
      { value: "D2", icon: "\u26BD", label: "NCAA Division II", desc: "Competitive with scholarships" },
      { value: "D3", icon: "\uD83D\uDCDA", label: "NCAA Division III", desc: "Academics-first focus" },
      { value: "NAIA", icon: "\u2B50", label: "NAIA", desc: "Flexible eligibility" },
    ],
  },
  {
    id: "priorities",
    emoji: "\u2728",
    title: "What matters most to you?",
    sub: "Pick your top 3 priorities. We'll use these to match you with the right programs.",
    type: "multi",
    max: 3,
    options: [
      { value: "Strong Academics", icon: "\uD83C\uDF93" },
      { value: "Top Athletics Program", icon: "\uD83C\uDFC6" },
      { value: "Location / Region", icon: "\uD83D\uDCCD" },
      { value: "Scholarship Availability", icon: "\uD83D\uDCB0" },
      { value: "Campus Life & Culture", icon: "\uD83C\uDFE0" },
      { value: "Coaching Staff Quality", icon: "\uD83D\uDC65" },
      { value: "Conference Level", icon: "\uD83C\uDFC8" },
      { value: "Playing Time / Roster Depth", icon: "\uD83D\uDCC8" },
    ],
  },
  {
    id: "regions",
    emoji: "\uD83D\uDCCD",
    title: "Where would you like to play?",
    sub: "Select all regions you're open to. This helps us match you with programs in your preferred areas.",
    type: "multi",
    max: 6,
    options: [
      { value: "Northeast", icon: "\uD83C\uDFD7\uFE0F", desc: "NY, MA, PA, CT, NJ..." },
      { value: "Southeast", icon: "\uD83C\uDF34", desc: "FL, GA, NC, VA, SC..." },
      { value: "Midwest", icon: "\uD83C\uDF3E", desc: "OH, IL, MI, IN, WI..." },
      { value: "Southwest", icon: "\uD83C\uDFDC\uFE0F", desc: "TX, AZ, NM, OK..." },
      { value: "Mountain West", icon: "\u26F0\uFE0F", desc: "CO, UT, MT, ID..." },
      { value: "West Coast", icon: "\uD83C\uDF0A", desc: "CA, OR, WA, HI..." },
    ],
    allowAll: true,
  },
  {
    id: "academics",
    emoji: "\uD83C\uDF93",
    title: "Tell us about your academics",
    sub: "Your GPA, ACT, and SAT scores help us match you with schools where you'll be a strong academic fit.",
    type: "input_group",
    fields: [
      { key: "gpa", label: "GPA", placeholder: "e.g. 3.5", inputType: "number", step: "0.01", min: "0", max: "5.0" },
      { key: "act_score", label: "ACT Score", placeholder: "e.g. 28", inputType: "number", step: "1", min: "1", max: "36" },
      { key: "sat_score", label: "SAT Score", placeholder: "e.g. 1200", inputType: "number", step: "10", min: "400", max: "1600" },
    ],
  },
  {
    id: "academic_interests",
    emoji: "\uD83D\uDCDA",
    title: "What do you want to study?",
    sub: "Select your academic area of interest. We'll consider this when matching programs.",
    type: "single",
    options: [
      { value: "Business / Finance", icon: "\uD83D\uDCBC" },
      { value: "Engineering / Tech", icon: "\u2699\uFE0F" },
      { value: "Health Sciences", icon: "\uD83E\uDE7A" },
      { value: "Education", icon: "\uD83C\uDF4E" },
      { value: "Communications / Media", icon: "\uD83C\uDFA4" },
      { value: "Liberal Arts", icon: "\uD83C\uDFA8" },
      { value: "Sciences", icon: "\uD83D\uDD2C" },
      { value: "Undecided", icon: "\uD83E\uDD14" },
    ],
  },
];

export default function OnboardingQuiz() {
  const navigate = useNavigate();
  const { completeOnboarding } = useAuth();
  const [step, setStep] = useState(-1);
  const [answers, setAnswers] = useState({});
  const [saving, setSaving] = useState(false);
  const [showComplete, setShowComplete] = useState(false);
  const [matchScores, setMatchScores] = useState([]);
  const [matchError, setMatchError] = useState(false);

  const isIntro = step === -1;
  const q = isIntro ? null : QUESTIONS[step];
  const progress = isIntro ? 0 : ((step + 1) / QUESTIONS.length) * 100;
  const current = q ? answers[q.id] : null;

  const select = (value) => {
    if (q.type === "single") {
      setAnswers((p) => ({ ...p, [q.id]: value }));
    } else {
      const arr = current || [];
      if (arr.includes(value)) {
        setAnswers((p) => ({ ...p, [q.id]: arr.filter((v) => v !== value) }));
      } else if (!q.max || arr.length < q.max) {
        setAnswers((p) => ({ ...p, [q.id]: [...arr, value] }));
      }
    }
  };

  const selectAll = () => {
    const allValues = q.options.map((o) => o.value);
    setAnswers((p) => ({ ...p, [q.id]: allValues }));
  };

  const canProceed = isIntro
    ? true
    : q?.type === "single"
    ? !!current
    : q?.type === "input_group"
    ? !!(current?.gpa || current?.act_score || current?.sat_score)
    : (current?.length || 0) > 0;

  const next = () => {
    if (isIntro) { setStep(0); return; }
    if (!canProceed) return;
    if (step < QUESTIONS.length - 1) setStep(step + 1);
    else saveProfile();
  };

  const back = () => { if (step > -1) setStep(step - 1); };

  useEffect(() => {
    const handler = (e) => {
      if (e.key === "Enter" && canProceed) next();
      if (e.key === "Backspace" && step > -1 && !e.target.tagName.match(/INPUT|TEXTAREA/)) back();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  });

  const saveProfile = async () => {
    setSaving(true);
    try {
      const academics = answers.academics || {};
      await axios.post(`${API}/athlete/recruiting-profile`, {
        position: answers.position || [],
        division: answers.division || [],
        priorities: answers.priorities || [],
        regions: answers.regions || [],
        gpa: academics.gpa ? parseFloat(academics.gpa) : null,
        act_score: academics.act_score ? parseInt(academics.act_score) : null,
        sat_score: academics.sat_score ? parseInt(academics.sat_score) : null,
        academic_interests: answers.academic_interests,
      });
      try {
        const res = await axios.get(`${API}/athlete/suggested-schools?limit=3`);
        setMatchScores((res.data?.suggestions || []).slice(0, 3));
      } catch {
        setMatchError(true);
      }
      completeOnboarding();
      setShowComplete(true);
    } catch {
      toast.error("Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  // ─── Completion Screen ───
  if (showComplete) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 bg-slate-50">
        <div className="w-full max-w-xl">
          <div className="mb-6 sm:mb-10">
            <div className="flex justify-between items-center mb-3">
              <span className="text-[11px] font-semibold uppercase tracking-widest text-emerald-600">Your Volleyball Journey</span>
              <span className="text-xs font-medium text-slate-500">Complete!</span>
            </div>
            <div className="w-full h-[3px] rounded-full bg-slate-200">
              <div className="h-full rounded-full bg-gradient-to-r from-emerald-600 to-emerald-500" style={{ width: "100%" }} />
            </div>
            <div className="flex gap-1.5 justify-center mt-2.5">
              {QUESTIONS.map((_, i) => <div key={i} className="w-1.5 h-1.5 rounded-full bg-emerald-600" />)}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-10 text-center relative overflow-hidden" data-testid="quiz-complete">
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-slate-300/40 to-transparent" />
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full mx-auto mb-5 sm:mb-6 flex items-center justify-center text-3xl sm:text-4xl bg-gradient-to-br from-emerald-50 to-emerald-100/50" style={{ boxShadow: "0 0 40px rgba(52,211,153,0.15)" }}>
              {"\uD83C\uDF89"}
            </div>
            <h1 className="text-xl sm:text-2xl font-bold mb-2 text-slate-900">
              Your profile is <span className="bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">ready!</span>
            </h1>
            <p className="text-sm mb-6 sm:mb-8 max-w-sm mx-auto text-slate-500">
              We've built your recruiting profile. Here's a preview of how we'll match you with programs.
            </p>

            {/* Profile summary */}
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 sm:p-5 text-left mb-5">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-600 mb-3 sm:mb-4">Your Profile</p>
              <div className="grid grid-cols-2 gap-2 sm:gap-3">
                <div><p className="text-[10px] uppercase tracking-wide text-slate-400">Position</p><p className="text-sm font-semibold text-slate-900">{(answers.position || []).join(", ")}</p></div>
                <div><p className="text-[10px] uppercase tracking-wide text-slate-400">Division</p><p className="text-sm font-semibold text-slate-900">{(answers.division || []).join(", ")}</p></div>
                <div><p className="text-[10px] uppercase tracking-wide text-slate-400">Regions</p><p className="text-sm font-semibold text-slate-900">{(answers.regions || []).join(", ") || "Any"}</p></div>
                <div><p className="text-[10px] uppercase tracking-wide text-slate-400">Study</p><p className="text-sm font-semibold text-slate-900">{answers.academic_interests || "Undecided"}</p></div>
                <div className="col-span-2">
                  <p className="text-[10px] uppercase tracking-wide mb-1.5 text-slate-400">Top Priorities</p>
                  <div className="flex flex-wrap gap-1.5">
                    {(answers.priorities || []).map((p) => (
                      <span key={p} className="text-[10px] px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 font-medium">{p}</span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Match scores */}
            {matchScores.length > 0 ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 text-left">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-600 mb-4 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />Top Suggested Matches
                </p>
                <div className="space-y-1">
                  {matchScores.map((m) => (
                    <div key={m.domain} className="flex items-center gap-3 py-2.5 border-b border-slate-200 last:border-0">
                      <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-sm font-extrabold flex-shrink-0 ${
                        m.match_score >= 80 ? "bg-emerald-50 text-emerald-600" : m.match_score >= 60 ? "bg-amber-50 text-amber-600" : "bg-slate-100 text-slate-500"
                      }`}>
                        {m.match_score}%
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold truncate text-slate-900">{m.university_name}</p>
                        <p className="text-[10px] text-slate-500">{m.division} {m.conference ? `\u2022 ${m.conference}` : ""} {m.region ? `\u2022 ${m.region}` : ""}</p>
                        {m.match_reasons?.length > 0 && (
                          <div className="flex gap-1 mt-1">
                            {m.match_reasons.map((r) => <span key={r} className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-600 font-medium">{r}</span>)}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 text-left">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-600 mb-3 flex items-center gap-1.5">
                  <Target className="w-3.5 h-3.5" />Matching Ready
                </p>
                <p className="text-sm text-slate-500">
                  {matchError
                    ? "We couldn't load matches right now. Head to Find Schools to discover programs that fit your profile."
                    : "Your profile is set. Head to Find Schools to discover programs matched to your preferences."}
                </p>
              </div>
            )}

            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white mt-8 h-11 px-8 text-sm font-semibold shadow-lg shadow-emerald-600/20" onClick={() => navigate("/pipeline")} data-testid="start-recruiting-btn">
              Start Recruiting <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
            <p className="text-[11px] mt-3 cursor-pointer hover:underline text-slate-400" onClick={() => navigate("/board")}>
              Go to Dashboard instead
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ─── Intro Screen ───
  if (isIntro) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 bg-slate-50" data-testid="quiz-intro">
        <div className="w-full max-w-xl">
          <div className="mb-6 sm:mb-10">
            <div className="flex justify-between items-center mb-3">
              <span className="text-[11px] font-semibold uppercase tracking-widest text-emerald-600">Your Volleyball Journey</span>
            </div>
            <div className="w-full h-[3px] rounded-full bg-slate-200">
              <div className="h-full rounded-full bg-gradient-to-r from-emerald-600 to-emerald-500 transition-all duration-500" style={{ width: "0%" }} />
            </div>
            <div className="flex gap-1.5 justify-center mt-2.5">
              {QUESTIONS.map((_, i) => <div key={i} className="w-1.5 h-1.5 rounded-full bg-slate-200" />)}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-10 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-emerald-500/30 to-transparent" />
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl mx-auto mb-5 sm:mb-6 flex items-center justify-center text-4xl sm:text-5xl bg-gradient-to-br from-emerald-50 to-teal-50" style={{ boxShadow: "0 0 40px rgba(52,211,153,0.1)" }}>
              {"\uD83C\uDFD0"}
            </div>

            <h1 className="text-xl sm:text-2xl font-bold mb-3 text-center text-slate-900">
              Let's Build Your <span className="bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">Volleyball Journey</span>
            </h1>
            <p className="text-sm text-center mb-6 sm:mb-8 max-w-md mx-auto leading-relaxed text-slate-500">
              Answer 6 quick questions so we can match you with the right volleyball programs and coaches.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-6 sm:mb-8">
              <div className="text-center p-3 sm:p-4 rounded-xl bg-slate-50">
                <div className="w-10 h-10 rounded-full mx-auto mb-2 sm:mb-3 flex items-center justify-center bg-emerald-50">
                  <Target className="w-5 h-5 text-emerald-600" />
                </div>
                <p className="text-xs font-semibold mb-1 text-slate-900">Personalized Matches</p>
                <p className="text-[10px] leading-relaxed text-slate-500">See schools that fit your playing style & goals</p>
              </div>
              <div className="text-center p-3 sm:p-4 rounded-xl bg-slate-50">
                <div className="w-10 h-10 rounded-full mx-auto mb-2 sm:mb-3 flex items-center justify-center bg-amber-50">
                  <Clock className="w-5 h-5 text-amber-600" />
                </div>
                <p className="text-xs font-semibold mb-1 text-slate-900">Save Time</p>
                <p className="text-[10px] leading-relaxed text-slate-500">Skip programs that aren't a good fit</p>
              </div>
              <div className="text-center p-3 sm:p-4 rounded-xl bg-slate-50">
                <div className="w-10 h-10 rounded-full mx-auto mb-2 sm:mb-3 flex items-center justify-center bg-blue-50">
                  <Shield className="w-5 h-5 text-blue-500" />
                </div>
                <p className="text-xs font-semibold mb-1 text-slate-900">Private & Secure</p>
                <p className="text-[10px] leading-relaxed text-slate-500">Your info is never shared without permission</p>
              </div>
            </div>

            <div className="text-center">
              <Button onClick={next} className="bg-emerald-600 hover:bg-emerald-700 text-white h-12 px-10 text-sm font-semibold shadow-lg shadow-emerald-600/20" data-testid="quiz-start-btn">
                Get Started <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
              <p className="text-[11px] mt-4 flex items-center justify-center gap-1.5 text-slate-400">
                <Clock className="w-3 h-3" /> Takes about 2 minutes
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── Quiz Steps ───
  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 bg-slate-50" data-testid="athlete-quiz">
      <div className="w-full max-w-xl">
        {/* Progress */}
        <div className="mb-6 sm:mb-10">
          <div className="flex justify-between items-center mb-3">
            <span className="text-[11px] font-semibold uppercase tracking-widest text-emerald-600">Your Volleyball Journey</span>
            <span className="text-xs font-medium text-slate-500">{step + 1} of {QUESTIONS.length}</span>
          </div>
          <div className="w-full h-[3px] rounded-full bg-slate-200">
            <div className="h-full rounded-full bg-gradient-to-r from-emerald-600 to-emerald-500 transition-all duration-500 ease-out" style={{ width: `${progress}%` }} />
          </div>
          <div className="flex gap-1.5 justify-center mt-2.5">
            {QUESTIONS.map((_, i) => (
              <div key={i} className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
                i < step ? "bg-emerald-700" : i === step ? "bg-emerald-600 shadow-[0_0_6px_rgba(52,211,153,0.5)]" : "bg-slate-200"
              }`} />
            ))}
          </div>
        </div>

        {/* Question Card */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-10 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-emerald-500/30 to-transparent" />
          <span className="text-3xl sm:text-4xl block mb-4 sm:mb-5">{q.emoji}</span>
          <p className="text-[10px] uppercase tracking-[1.5px] font-semibold mb-2 text-slate-400">Question {step + 1} of {QUESTIONS.length}</p>
          <h1 className="text-xl sm:text-2xl font-bold mb-2 text-slate-900">{q.title}</h1>
          <p className="text-sm mb-6 sm:mb-8 leading-relaxed text-slate-500">{q.sub}</p>

          {/* Options */}
          {q.type === "input_group" ? (
            <div className="space-y-5">
              {q.fields.map((field) => (
                <div key={field.key}>
                  <label className="text-[10px] font-bold uppercase tracking-[0.12em] block mb-2 text-slate-400">{field.label}</label>
                  <input
                    type={field.inputType}
                    step={field.step}
                    min={field.min}
                    max={field.max}
                    placeholder={field.placeholder}
                    value={(current || {})[field.key] || ""}
                    onChange={(e) => setAnswers((p) => ({ ...p, [q.id]: { ...(p[q.id] || {}), [field.key]: e.target.value } }))}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-base font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500/40 transition-all"
                    data-testid={`input-${field.key}`}
                  />
                </div>
              ))}
              <p className="text-[11px] italic text-slate-400">Fill in at least one field. Leave blank if you haven't taken a test yet.</p>
            </div>
          ) : q.type === "single" ? (
            <div className={`grid gap-2.5 ${q.options.length <= 4 ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-2 sm:grid-cols-3"}`}>
              {q.options.map((opt) => {
                const isSelected = current === opt.value;
                return (
                  <button key={opt.value} onClick={() => select(opt.value)}
                    className={`relative rounded-xl border p-4 text-center transition-all duration-200 hover:-translate-y-0.5 ${
                      isSelected
                        ? "border-emerald-500 bg-emerald-50/50 shadow-[0_0_20px_rgba(52,211,153,0.1)]"
                        : "border-slate-200 bg-slate-50 hover:border-slate-300"
                    }`}
                    data-testid={`option-${opt.value.toLowerCase().replace(/[^a-z0-9]/g, "-")}`}
                  >
                    {isSelected && <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center"><Check className="w-2.5 h-2.5 text-white" /></div>}
                    <span className="text-2xl block mb-2">{opt.icon}</span>
                    <p className="text-sm font-semibold text-slate-900">{opt.label || opt.value}</p>
                    {opt.desc && <p className="text-[10px] mt-1 text-slate-500">{opt.desc}</p>}
                  </button>
                );
              })}
            </div>
          ) : (
            <>
              {q.id === "regions" ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {q.options.map((opt) => {
                    const isSelected = (current || []).includes(opt.value);
                    return (
                      <button key={opt.value} onClick={() => select(opt.value)}
                        className={`relative rounded-xl border p-4 text-center transition-all duration-200 hover:-translate-y-0.5 ${
                          isSelected
                            ? "border-emerald-500 bg-emerald-50/50 shadow-[0_0_20px_rgba(52,211,153,0.1)]"
                            : "border-slate-200 bg-slate-50 hover:border-slate-300"
                        }`}
                        data-testid={`option-${opt.value.toLowerCase().replace(/[^a-z0-9]/g, "-")}`}
                      >
                        {isSelected && <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center"><Check className="w-2.5 h-2.5 text-white" /></div>}
                        <span className="text-xl block mb-1.5">{opt.icon}</span>
                        <p className="text-xs font-semibold text-slate-900">{opt.value}</p>
                        {opt.desc && <p className="text-[10px] mt-0.5 text-slate-500">{opt.desc}</p>}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-wrap gap-2.5">
                  {q.options.map((opt) => {
                    const isSelected = (current || []).includes(opt.value);
                    return (
                      <button key={opt.value} onClick={() => select(opt.value)}
                        className={`flex items-center gap-2 rounded-full border px-4 py-2.5 transition-all duration-200 ${
                          isSelected
                            ? "border-emerald-500 bg-emerald-50/50 shadow-[0_0_12px_rgba(52,211,153,0.1)]"
                            : "border-slate-200 bg-slate-50 hover:border-slate-300"
                        }`}
                        data-testid={`option-${opt.value.toLowerCase().replace(/[^a-z0-9]/g, "-")}`}
                      >
                        <span className="text-base">{opt.icon}</span>
                        <span className={`text-sm font-medium ${isSelected ? "text-slate-900" : "text-slate-600"}`}>{opt.value}</span>
                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center flex-shrink-0 transition-all ${
                          isSelected ? "bg-gradient-to-br from-emerald-500 to-emerald-600 border-emerald-500" : "border-slate-300"
                        }`}>
                          {isSelected && <Check className="w-2.5 h-2.5 text-white" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
              {q.allowAll && (
                <button onClick={selectAll} className="w-full mt-3 py-3 rounded-xl border-2 border-dashed border-slate-200 text-sm text-slate-500 transition-colors hover:border-slate-300" data-testid="select-all-regions">
                  {"\uD83C\uDF0E"} I'm open to anywhere
                </button>
              )}
              {q.max && <p className="text-[11px] mt-3 italic text-slate-400">{(current || []).length} of {q.max} selected</p>}
            </>
          )}
        </div>

        {/* Navigation */}
        <div className="flex justify-between items-center mt-8">
          <button onClick={back} disabled={step === 0}
            className="flex items-center gap-1.5 text-sm font-medium text-slate-400 disabled:opacity-0 transition-opacity"
            data-testid="quiz-back-btn"
          >
            <ChevronLeft className="w-4 h-4" /> Back
          </button>
          <Button onClick={next} disabled={!canProceed || saving}
            className="bg-emerald-600 hover:bg-emerald-700 text-white h-10 px-7 text-sm font-semibold shadow-lg shadow-emerald-600/20 disabled:opacity-50"
            data-testid="quiz-next-btn"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : null}
            {step === QUESTIONS.length - 1 ? "Finish" : "Continue"}
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>

        <p className="hidden sm:block text-center mt-5 text-[11px] text-slate-400">
          Press <kbd className="px-1.5 py-0.5 rounded border border-slate-200 bg-slate-50 text-[10px]">Enter</kbd> to continue
        </p>
      </div>
    </div>
  );
}

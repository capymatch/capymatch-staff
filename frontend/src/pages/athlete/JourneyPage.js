import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import {
  ArrowLeft, Archive, RotateCcw, User, Mail, Phone,
  Edit2, Trash2, Plus, AlertCircle, Clock, BookOpen, ExternalLink,
  Sparkles, Loader2, Target, X, CheckCircle2, ClipboardCheck,
} from "lucide-react";
import { Button } from "../../components/ui/button";
import {
  ProgressRail, PulseIndicator, GettingStartedChecklist,
  CommittedHero, CelebrationHero, NextStepCard, ConversationBubble,
  FloatingActionBar, StageLogModal, LogInteractionForm,
  EmailComposer, FollowUpScheduler, MarkAsRepliedModal, CoachForm,
} from "../../components/journey";
import { RAIL_STAGES, STAGE_LABELS } from "../../components/journey/constants";
import UniversityLogo from "../../components/UniversityLogo";
import { RiskBadgeRow, RiskBadgeEmpty, RiskExplainerDrawer } from "../../components/RiskBadges";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function JourneyPage() {
  const { programId } = useParams();
  const navigate = useNavigate();
  const [program, setProgram] = useState(null);
  const [timeline, setTimeline] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showStageLog, setShowStageLog] = useState(null);
  const [showEmail, setShowEmail] = useState(false);
  const [showLog, setShowLog] = useState(false);
  const [showReplied, setShowReplied] = useState(false);
  const [showCoachForm, setShowCoachForm] = useState(null);
  const [showFollowup, setShowFollowup] = useState(false);
  const [nextStepDismissed, setNextStepDismissed] = useState(false);
  const [activeAction, setActiveAction] = useState(null);
  const [aiNextStep, setAiNextStep] = useState(null);
  const [aiNextStepLoading, setAiNextStepLoading] = useState(false);
  const [aiSummary, setAiSummary] = useState(null);
  const [aiSummaryLoading, setAiSummaryLoading] = useState(false);
  const [aiInsight, setAiInsight] = useState(null);
  const [aiInsightLoading, setAiInsightLoading] = useState(false);

  // J1: Match score + risk badges
  const [matchScore, setMatchScore] = useState(null);
  const [riskBadges, setRiskBadges] = useState([]);
  const [riskDrawer, setRiskDrawer] = useState(false);

  // J1: Questionnaire
  const [questLoading, setQuestLoading] = useState(false);
  const [questNudgeDismissed, setQuestNudgeDismissed] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [pRes, jRes, msRes] = await Promise.allSettled([
        axios.get(`${API}/athlete/programs/${programId}`),
        axios.get(`${API}/athlete/programs/${programId}/journey`),
        axios.get(`${API}/match-scores`),
      ]);
      if (pRes.status !== "fulfilled") throw new Error("Failed to load program");
      setProgram(pRes.value.data);
      if (jRes.status === "fulfilled") setTimeline(jRes.value.data.timeline || []);

      // Match score lookup
      if (msRes.status === "fulfilled") {
        const scores = msRes.value.data?.scores || [];
        const found = scores.find(s => s.program_id === programId);
        if (found) {
          setMatchScore(found);
          setRiskBadges(found.risk_badges || []);
        }
      }
    } catch (e) {
      toast.error("Failed to load program");
    } finally { setLoading(false); }
  }, [programId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const refresh = () => { setLoading(false); fetchData(); };
  const closeAll = () => { setShowEmail(false); setShowLog(false); setShowReplied(false); setShowCoachForm(null); setShowFollowup(false); setActiveAction(null); };

  const fetchAiNextStep = async () => {
    setAiNextStepLoading(true);
    try {
      const res = await axios.post(`${API}/ai/next-step`, { program_id: programId });
      setAiNextStep(res.data);
    } catch { toast.error("Failed to get AI recommendation"); }
    finally { setAiNextStepLoading(false); }
  };

  const fetchAiSummary = async () => {
    setAiSummaryLoading(true);
    try {
      const res = await axios.post(`${API}/ai/journey-summary`, { program_id: programId });
      setAiSummary(res.data);
    } catch { toast.error("Failed to generate summary"); }
    finally { setAiSummaryLoading(false); }
  };

  const fetchAiInsight = async () => {
    setAiInsightLoading(true);
    try {
      const res = await axios.post(`${API}/ai/school-insight/${programId}`);
      setAiInsight(res.data);
    } catch { toast.error("Failed to get school insight"); }
    finally { setAiInsightLoading(false); }
  };

  const handleStageClick = (stageKey) => {
    if (!program) return;
    const rail = program.journey_rail || {};
    const currentActive = rail.active || "added";
    const currentIdx = RAIL_STAGES.findIndex(s => s.key === currentActive);
    const clickIdx = RAIL_STAGES.findIndex(s => s.key === stageKey);
    if (clickIdx <= currentIdx) return;
    setShowStageLog(stageKey);
  };

  const confirmStageAdvance = async (note) => {
    try {
      await axios.put(`${API}/athlete/programs/${programId}`, { journey_stage: showStageLog });
      if (note) {
        await axios.post(`${API}/athlete/interactions`, {
          program_id: programId,
          university_name: program.university_name,
          type: "Stage Update",
          notes: `Advanced to ${STAGE_LABELS[showStageLog] || showStageLog}: ${note}`,
          outcome: "Positive",
        });
      }
      setShowStageLog(null);
      refresh();
    } catch { toast.error("Failed to update stage"); }
  };

  const handleArchiveToggle = async () => {
    const isArchived = program.recruiting_status === "archived";
    try {
      await axios.put(`${API}/athlete/programs/${programId}`, {
        recruiting_status: isArchived ? "active" : "archived",
      });
      toast.success(isArchived ? "Reactivated" : "Archived");
      refresh();
    } catch { toast.error("Failed to update"); }
  };

  const handleSaveCoach = async (data) => {
    try {
      if (data.coach_id) {
        await axios.put(`${API}/athlete/college-coaches/${data.coach_id}`, data);
      } else {
        await axios.post(`${API}/athlete/college-coaches`, data);
      }
      toast.success("Coach saved");
      closeAll();
      refresh();
    } catch { toast.error("Failed to save coach"); }
  };

  const handleDeleteCoach = async (coachId) => {
    try {
      await axios.delete(`${API}/athlete/college-coaches/${coachId}`);
      toast.success("Coach removed");
      refresh();
    } catch { toast.error("Failed to delete coach"); }
  };

  // J1: Questionnaire toggle
  const toggleQuestionnaire = async () => {
    setQuestLoading(true);
    try {
      const newVal = !program.questionnaire_completed;
      await axios.put(`${API}/athlete/programs/${programId}`, {
        questionnaire_completed: newVal,
        questionnaire_completed_at: newVal ? new Date().toISOString() : null,
      });
      setProgram(prev => ({
        ...prev,
        questionnaire_completed: newVal,
        questionnaire_completed_at: newVal ? new Date().toISOString() : null,
      }));
      toast.success(newVal ? "Questionnaire marked complete" : "Questionnaire unmarked");
    } catch { toast.error("Failed to update"); }
    setQuestLoading(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "var(--cm-bg)" }}>
        <div className="w-8 h-8 border-2 border-teal-700 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!program) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "var(--cm-bg)" }}>
        <p style={{ color: "var(--cm-text-2)" }}>Program not found</p>
      </div>
    );
  }

  const coaches = program.college_coaches || [];
  const signals = program.signals || {};
  const rail = program.journey_rail || {};
  const isArchived = program.recruiting_status === "archived";
  const isCommitted = rail.active === "committed";
  const hasCoachReply = signals.has_coach_reply;
  const isNewSchool = !isCommitted && !hasCoachReply && timeline.length < 2;
  const latestEvent = timeline[0];

  // J1: Follow-up computation (expanded to 5 days)
  const followUpDue = program.next_action_due;
  let followUpOverdue = false;
  let followUpUpcoming = false;
  let daysOverdue = 0;
  let daysUntilDue = 0;
  if (followUpDue) {
    const dueDate = new Date(followUpDue + "T00:00:00");
    const today = new Date(new Date().toISOString().split("T")[0] + "T00:00:00");
    const diffDays = Math.round((dueDate - today) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) { followUpOverdue = true; daysOverdue = Math.abs(diffDays); }
    else if (diffDays <= 5) { followUpUpcoming = true; daysUntilDue = diffDays; }
  }

  const profileComplete = !!(program.athlete_name || program.athlete_video);

  // Resolve logo from match score data
  const logoUrl = matchScore?.logo_url || program.logo_url || null;
  const domain = matchScore?.domain || program.domain || null;

  return (
    <div className="min-h-screen pb-28" style={{ backgroundColor: "var(--cm-bg)" }} data-testid="journey-page">
      {/* ─── HEADER ─── */}
      <div style={{ background: "linear-gradient(180deg, var(--cm-hero-from) 0%, var(--cm-bg) 100%)", borderBottom: "1px solid var(--cm-border)" }}>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-4 pb-5">
          {/* Back & Actions */}
          <div className="flex items-center justify-between mb-4">
            <button onClick={() => navigate("/pipeline")} className="flex items-center gap-1.5 text-xs font-medium transition-colors" style={{ color: "var(--cm-text-3)" }} data-testid="back-to-pipeline">
              <ArrowLeft className="w-3.5 h-3.5" />Pipeline
            </button>
            <div className="flex items-center gap-2">
              {program.questionnaire_url && (
                <a href={program.questionnaire_url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold border transition-colors hover:bg-teal-700/10 text-teal-600 border-teal-700/20"
                  data-testid="questionnaire-link">
                  <ExternalLink className="w-3 h-3" />Questionnaire
                </a>
              )}
              <Button variant="outline" size="sm" onClick={handleArchiveToggle}
                className="text-xs h-7 px-3"
                style={{ color: isArchived ? "#0d9488" : "var(--cm-text-3)", borderColor: isArchived ? "rgba(13,148,136,0.3)" : "var(--cm-border)" }}
                data-testid="archive-toggle-btn">
                {isArchived ? <RotateCcw className="w-3 h-3 mr-1" /> : <Archive className="w-3 h-3 mr-1" />}
                {isArchived ? "Reactivate" : "Archive"}
              </Button>
            </div>
          </div>

          {/* School Info + Logo + Match Score */}
          <div className="flex items-start gap-4 mb-3">
            {/* J1: Real university logo */}
            <UniversityLogo name={program.university_name} logoUrl={logoUrl} domain={domain} size={48} className="rounded-xl" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2.5 mb-1 flex-wrap">
                <h1 className="text-lg sm:text-xl font-extrabold tracking-tight" style={{ color: "var(--cm-text)" }} data-testid="journey-school-name">
                  {program.university_name}
                </h1>
                <PulseIndicator pulse={rail.pulse} />
                {/* J1: Match score badge */}
                {matchScore && (
                  <span
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold"
                    style={{
                      background: "rgba(255,255,255,0.06)",
                      color: matchScore.match_score >= 80 ? "#4ade80" : matchScore.match_score >= 60 ? "#fbbf24" : "#94a3b8",
                    }}
                    data-testid="journey-match-score"
                  >
                    <Target className="w-3 h-3" /> {matchScore.match_score}% Match
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                {program.division && (
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-teal-700/20 text-teal-500">{program.division}</span>
                )}
                {program.conference && (
                  <span className="text-[11px]" style={{ color: "var(--cm-text-2)" }}>{program.conference}</span>
                )}
                {program.location && (
                  <span className="text-[11px]" style={{ color: "var(--cm-text-3)" }}>{program.location}</span>
                )}
                <span className="text-[11px]" style={{ color: "var(--cm-text-3)" }}>{timeline.length} interactions</span>
              </div>
            </div>
          </div>

          {/* J1: Risk Badges */}
          <div className="ml-16 mb-3" data-testid="journey-risk-badges">
            {riskBadges.length > 0 ? (
              <RiskBadgeRow badges={riskBadges} onBadgeClick={(b) => setRiskDrawer(b)} />
            ) : matchScore ? (
              <RiskBadgeEmpty />
            ) : null}
          </div>

          {/* Progress Rail */}
          <ProgressRail rail={rail} onStageClick={handleStageClick} />
        </div>
      </div>

      {/* ─── MAIN CONTENT ─── */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 mt-6">

        {/* J1: Overdue Follow-Up Card (rich dark style) */}
        {followUpOverdue && !activeAction && (
          <div className="mb-5 rounded-xl overflow-hidden" style={{ background: "#1e1e2e" }} data-testid="overdue-followup-card">
            <div style={{ height: 2, background: "linear-gradient(90deg, #f97316, rgba(249,115,22,0.2))" }} />
            <div className="p-4 sm:p-5">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
                  style={{ backgroundColor: "rgba(249,115,22,0.15)" }}>
                  <AlertCircle className="w-5 h-5" style={{ color: "#f97316" }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: "#f97316" }}>
                    {daysOverdue > 0 ? `${daysOverdue} day${daysOverdue === 1 ? "" : "s"} overdue` : "Due today"}
                  </p>
                  <h3 className="text-sm font-bold mb-1" style={{ color: "#ffffff" }}>
                    Follow up with {program.university_name}
                  </h3>
                  <p className="text-xs mb-4" style={{ color: "rgba(255,255,255,0.5)" }}>
                    {program.next_action || "Send a follow-up to stay on their radar and show continued interest."}
                  </p>
                  <div className="flex gap-2 flex-wrap">
                    <button onClick={() => { setShowEmail(true); setActiveAction("email"); }}
                      className="inline-flex items-center gap-1.5 px-3 h-8 rounded-md text-xs font-medium bg-orange-600 hover:bg-orange-700 text-white transition-colors shadow-md"
                      data-testid="overdue-email-btn">
                      <Mail className="w-3.5 h-3.5" /> Send Email
                    </button>
                    <button onClick={() => { setShowFollowup(true); setActiveAction("followup"); }}
                      className="inline-flex items-center gap-1.5 px-3 h-8 rounded-md text-xs font-medium transition-colors"
                      style={{ color: "rgba(255,255,255,0.6)", border: "1px solid rgba(255,255,255,0.1)" }}
                      data-testid="overdue-reschedule-btn">
                      <Clock className="w-3.5 h-3.5" /> Reschedule
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* J1: Upcoming Follow-Up Card (due within 5 days) */}
        {followUpUpcoming && !followUpOverdue && !activeAction && (
          <div className="mb-5 rounded-xl overflow-hidden" style={{ background: "#1e1e2e" }} data-testid="upcoming-followup-card">
            <div style={{ height: 2, background: "linear-gradient(90deg, #1a8a80, rgba(26,138,128,0.2))" }} />
            <div className="p-4 sm:p-5">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
                  style={{ backgroundColor: "rgba(26,138,128,0.15)" }}>
                  <Clock className="w-5 h-5" style={{ color: "#2dd4bf" }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: "#2dd4bf" }}>
                    {daysUntilDue === 0 ? "Due today" : daysUntilDue === 1 ? "Due tomorrow" : `Due in ${daysUntilDue} days`}
                  </p>
                  <h3 className="text-sm font-bold mb-1" style={{ color: "#ffffff" }}>
                    Follow up with {program.university_name}
                  </h3>
                  <p className="text-xs mb-4" style={{ color: "rgba(255,255,255,0.5)" }}>
                    {program.next_action || "You have a follow-up coming up. Get ahead of it to show coaches you're organized and committed."}
                  </p>
                  <div className="flex gap-2 flex-wrap">
                    <button onClick={() => { setShowEmail(true); setActiveAction("email"); }}
                      className="inline-flex items-center gap-1.5 px-3 h-8 rounded-md text-xs font-medium text-white transition-colors shadow-md"
                      style={{ backgroundColor: "#1a8a80" }}
                      data-testid="upcoming-email-btn">
                      <Mail className="w-3.5 h-3.5" /> Send Email
                    </button>
                    <button onClick={() => { setShowFollowup(true); setActiveAction("followup"); }}
                      className="inline-flex items-center gap-1.5 px-3 h-8 rounded-md text-xs font-medium transition-colors"
                      style={{ color: "rgba(255,255,255,0.6)", border: "1px solid rgba(255,255,255,0.1)" }}
                      data-testid="upcoming-reschedule-btn">
                      <Clock className="w-3.5 h-3.5" /> Reschedule
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* J1: Questionnaire Section */}
        {program.questionnaire_url && (
          <div className="mb-5 rounded-xl border p-4 sm:p-5" style={{ backgroundColor: "var(--cm-surface)", borderColor: "var(--cm-border)" }} data-testid="questionnaire-section">
            <div className="flex items-start sm:items-center justify-between gap-3 flex-col sm:flex-row">
              <div className="flex items-center gap-3 min-w-0">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${program.questionnaire_completed ? "bg-green-500/10" : "bg-teal-600/10"}`}>
                  {program.questionnaire_completed
                    ? <CheckCircle2 className="w-4 h-4 text-green-500" />
                    : <ClipboardCheck className="w-4 h-4 text-teal-600" />}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold" style={{ color: "var(--cm-text)" }}>Recruiting Questionnaire</p>
                  {program.questionnaire_completed ? (
                    <p className="text-xs text-green-500 mt-0.5">
                      Completed {program.questionnaire_completed_at ? new Date(program.questionnaire_completed_at).toLocaleDateString() : ""}
                    </p>
                  ) : (
                    <p className="text-xs mt-0.5" style={{ color: "var(--cm-text-3)" }}>Required by most programs — fill it out to show interest</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0 w-full sm:w-auto">
                <a href={program.questionnaire_url} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors hover:opacity-80"
                  style={{ color: "#0d9488", borderColor: "rgba(13,148,136,0.3)" }}
                  data-testid="questionnaire-open-link">
                  <ExternalLink className="w-3.5 h-3.5" /> Open Form
                </a>
                <button onClick={toggleQuestionnaire} disabled={questLoading}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    program.questionnaire_completed
                      ? "bg-green-500/10 text-green-500 hover:bg-green-500/20"
                      : "text-white hover:opacity-90"
                  }`}
                  style={program.questionnaire_completed ? {} : { backgroundColor: "#0d9488" }}
                  data-testid="questionnaire-toggle-btn">
                  {questLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                  {program.questionnaire_completed ? "Completed" : "Mark Complete"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* J1: Questionnaire Nudge (incomplete) */}
        {program.questionnaire_url && !program.questionnaire_completed && !questNudgeDismissed && !activeAction && (
          <div className="mb-5 rounded-xl overflow-hidden relative"
            style={{ borderColor: "rgba(245,158,11,0.3)", background: "#1e1e2e", border: "1px solid rgba(245,158,11,0.3)" }}
            data-testid="questionnaire-nudge">
            <button onClick={() => setQuestNudgeDismissed(true)}
              className="absolute top-3 right-3 p-1 rounded-lg hover:bg-white/10 transition-colors"
              style={{ color: "rgba(255,255,255,0.35)" }} data-testid="quest-nudge-dismiss">
              <X className="w-4 h-4" />
            </button>
            <div className="p-4 sm:p-5">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
                  style={{ backgroundColor: "rgba(245,158,11,0.12)" }}>
                  <ClipboardCheck className="w-5 h-5" style={{ color: "#f59e0b" }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: "#f59e0b" }}>Action Required</p>
                  <h3 className="text-sm font-bold mb-1" style={{ color: "#ffffff" }}>Complete {program.university_name}'s questionnaire</h3>
                  <p className="text-xs mb-4" style={{ color: "rgba(255,255,255,0.5)" }}>
                    Filling out the recruiting questionnaire shows coaches you're genuinely interested. Most programs require it.
                  </p>
                  <div className="flex gap-2 flex-wrap">
                    <a href={program.questionnaire_url} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 h-8 rounded-md text-xs font-medium bg-amber-600 hover:bg-amber-700 text-white transition-colors shadow-md"
                      data-testid="quest-nudge-open">
                      <ExternalLink className="w-3.5 h-3.5" /> Open Questionnaire
                    </a>
                    <button onClick={toggleQuestionnaire}
                      className="inline-flex items-center gap-1.5 px-3 h-8 rounded-md text-xs font-medium transition-colors"
                      style={{ color: "rgba(255,255,255,0.6)", border: "1px solid rgba(255,255,255,0.1)" }}
                      data-testid="quest-nudge-complete">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Mark as Done
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Contextual Hero Section */}
        {isCommitted ? (
          <div className="mb-6"><CommittedHero program={program} /></div>
        ) : isNewSchool ? (
          <div className="mb-6">
            <GettingStartedChecklist
              program={program} coaches={coaches} timeline={timeline}
              profileComplete={profileComplete}
              onAddCoach={() => { setShowCoachForm({}); }}
              onSendEmail={() => { setShowEmail(true); setActiveAction("email"); }}
            />
          </div>
        ) : hasCoachReply ? (
          <div className="mb-6">
            <CelebrationHero program={program} coaches={coaches}
              onEmail={() => { setShowEmail(true); setActiveAction("email"); }}
              onLog={() => { setShowLog(true); setActiveAction("log"); }}
              onCall={() => { setShowLog(true); setActiveAction("log"); }}
            />
          </div>
        ) : null}

        {/* Next Step Automation Card */}
        {latestEvent && !isCommitted && !nextStepDismissed && (
          <div className="mb-6">
            <NextStepCard
              latestEvent={latestEvent}
              universityName={program.university_name}
              onEmail={() => { setShowEmail(true); setActiveAction("email"); }}
              onLog={() => { setShowLog(true); setActiveAction("log"); }}
              onFollowup={() => { setShowFollowup(true); setActiveAction("followup"); }}
              onDismiss={() => setNextStepDismissed(true)}
            />
          </div>
        )}

        {/* Knowledge Base link */}
        {program.school_id && (
          <div className="mb-6">
            <button onClick={() => navigate(`/schools/${program.school_id}`)}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-colors"
              style={{ backgroundColor: "var(--cm-surface)", borderColor: "var(--cm-border)" }}
              data-testid="school-intel-link">
              <BookOpen className="w-4 h-4 text-teal-700 flex-shrink-0" />
              <div className="text-left">
                <p className="text-xs font-bold" style={{ color: "var(--cm-text)" }}>School Intelligence</p>
                <p className="text-[10px]" style={{ color: "var(--cm-text-2)" }}>View recruiting requirements, roster info, and more</p>
              </div>
            </button>
          </div>
        )}

        {/* ─── GRID: Timeline + Sidebar ─── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* LEFT: Timeline */}
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold" style={{ color: "var(--cm-text)" }}>Timeline</h2>
              <span className="text-[10px] font-semibold text-teal-600" data-testid="timeline-count">{timeline.length} interactions</span>
            </div>
            {timeline.length === 0 ? (
              <div className="text-center py-16 rounded-2xl border border-dashed" style={{ backgroundColor: "var(--cm-surface)", borderColor: "var(--cm-border)" }} data-testid="empty-timeline">
                <p className="text-sm font-semibold mb-1" style={{ color: "var(--cm-text-2)" }}>No interactions yet</p>
                <p className="text-xs mb-4" style={{ color: "var(--cm-text-3)" }}>Start your journey by reaching out to a coach</p>
                <Button size="sm" onClick={() => { setShowEmail(true); setActiveAction("email"); }}
                  className="bg-teal-700 hover:bg-teal-800 text-white text-xs h-8 px-4"
                  data-testid="empty-timeline-email-btn">
                  <Mail className="w-3.5 h-3.5 mr-1.5" />Send First Email
                </Button>
              </div>
            ) : (
              <div className="space-y-1" data-testid="timeline-list">
                {timeline.map((ev, idx) => (
                  <ConversationBubble key={ev.id || idx} event={ev} />
                ))}
              </div>
            )}
          </div>

          {/* RIGHT: Sidebar */}
          <div className="space-y-5">
            {/* Coaches */}
            <div className="rounded-2xl border p-4" style={{ backgroundColor: "var(--cm-surface)", borderColor: "var(--cm-border)" }} data-testid="coaches-sidebar">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--cm-text-3)" }}>Coaching Staff</h3>
                <button onClick={() => setShowCoachForm({})} className="flex items-center gap-1 text-[10px] font-semibold text-teal-600 hover:text-teal-500 transition-colors" data-testid="add-coach-btn">
                  <Plus className="w-3 h-3" />Add
                </button>
              </div>
              {coaches.length === 0 ? (
                <p className="text-xs text-center py-4" style={{ color: "var(--cm-text-3)" }}>No coaches added yet</p>
              ) : (
                <div className="space-y-2">
                  {coaches.map(c => (
                    <div key={c.coach_id} className="flex items-start gap-3 p-3 rounded-xl border transition-colors" style={{ backgroundColor: "var(--cm-surface-2)", borderColor: "var(--cm-border)" }} data-testid={`coach-card-${c.coach_id}`}>
                      <div className="w-8 h-8 rounded-full bg-teal-700/15 flex items-center justify-center flex-shrink-0">
                        <User className="w-3.5 h-3.5 text-teal-700" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold truncate" style={{ color: "var(--cm-text)" }}>{c.coach_name}</p>
                        <p className="text-[10px]" style={{ color: "var(--cm-text-2)" }}>{c.role || "Coach"}</p>
                        {c.email && (
                          <div className="flex items-center gap-1 mt-1">
                            <Mail className="w-2.5 h-2.5" style={{ color: "var(--cm-text-3)" }} />
                            <a href={`mailto:${c.email}`} className="text-[10px] text-teal-600 truncate hover:underline">{c.email}</a>
                          </div>
                        )}
                        {c.phone && (
                          <div className="flex items-center gap-1 mt-0.5">
                            <Phone className="w-2.5 h-2.5" style={{ color: "var(--cm-text-3)" }} />
                            <span className="text-[10px]" style={{ color: "var(--cm-text-2)" }}>{c.phone}</span>
                          </div>
                        )}
                      </div>
                      <div className="flex gap-1 flex-shrink-0">
                        <button onClick={() => setShowCoachForm(c)} className="p-1 rounded" style={{ color: "var(--cm-text-3)" }} data-testid={`edit-coach-${c.coach_id}`}>
                          <Edit2 className="w-3 h-3" />
                        </button>
                        <button onClick={() => handleDeleteCoach(c.coach_id)} className="p-1 rounded" style={{ color: "var(--cm-text-3)" }} data-testid={`delete-coach-${c.coach_id}`}>
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Engagement Stats */}
            <div className="rounded-2xl border p-4" style={{ backgroundColor: "var(--cm-surface)", borderColor: "var(--cm-border)" }} data-testid="engagement-stats">
              <h3 className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: "var(--cm-text-3)" }}>Engagement</h3>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: "Total Outreach", value: signals.outreach_count || 0 },
                  { label: "Coach Replies", value: signals.reply_count || 0 },
                  { label: "Days Since Activity", value: signals.days_since_activity != null ? signals.days_since_activity : "\u2014" },
                  { label: "Interactions", value: timeline.length },
                ].map(stat => (
                  <div key={stat.label} className="p-3 rounded-xl" style={{ backgroundColor: "var(--cm-card-stat)" }} data-testid={`stat-${stat.label.toLowerCase().replace(/\s/g, "-")}`}>
                    <p className="text-[10px] font-medium mb-0.5" style={{ color: "var(--cm-text-3)" }}>{stat.label}</p>
                    <p className="text-lg font-extrabold" style={{ color: "var(--cm-text)" }}>{stat.value}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Next Follow-up */}
            {program.next_action_due && (
              <div className="rounded-2xl border p-4" style={{ backgroundColor: "var(--cm-surface)", borderColor: "var(--cm-border)" }} data-testid="next-followup-sidebar">
                <h3 className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: "var(--cm-text-3)" }}>Next Follow-up</h3>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-teal-700/10">
                    <Clock className="w-4 h-4 text-teal-700" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold" style={{ color: "var(--cm-text)" }}>{program.next_action || "Follow-up"}</p>
                    <p className="text-[10px]" style={{ color: "var(--cm-text-2)" }}>{program.next_action_due}</p>
                  </div>
                </div>
              </div>
            )}

            {/* AI Section */}
            <div className="rounded-2xl border p-4" style={{ backgroundColor: "var(--cm-surface)", borderColor: "rgba(26,138,128,0.2)" }} data-testid="ai-section">
              <h3 className="text-xs font-bold uppercase tracking-wider mb-3 flex items-center gap-1.5 text-[#1a8a80]">
                <Sparkles className="w-3.5 h-3.5" /> AI Insights
              </h3>
              <div className="space-y-2">
                {/* AI Next Step */}
                <button onClick={fetchAiNextStep} disabled={aiNextStepLoading}
                  className="w-full text-left p-3 rounded-xl border transition-colors"
                  style={{ backgroundColor: "var(--cm-surface-2)", borderColor: "var(--cm-border)" }}
                  data-testid="ai-next-step-btn">
                  {aiNextStepLoading ? (
                    <div className="flex items-center gap-2"><Loader2 className="w-3.5 h-3.5 animate-spin text-[#1a8a80]" /><span className="text-[11px]" style={{ color: "var(--cm-text-3)" }}>Analyzing...</span></div>
                  ) : aiNextStep ? (
                    <>
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`w-2 h-2 rounded-full ${aiNextStep.urgency === "high" ? "bg-red-400" : aiNextStep.urgency === "medium" ? "bg-amber-400" : "bg-green-400"}`} />
                        <span className="text-[10px] font-bold uppercase tracking-wide text-[#1a8a80]">AI Recommended</span>
                      </div>
                      <p className="text-[12px] font-semibold mb-1" style={{ color: "var(--cm-text)" }}>{aiNextStep.next_step}</p>
                      <p className="text-[10px]" style={{ color: "var(--cm-text-2)" }}>{aiNextStep.reasoning}</p>
                    </>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-3.5 h-3.5 text-[#1a8a80]" />
                      <span className="text-[11px] font-semibold" style={{ color: "var(--cm-text-3)" }}>Get AI Next Step</span>
                    </div>
                  )}
                </button>

                {/* AI Journey Summary */}
                <button onClick={fetchAiSummary} disabled={aiSummaryLoading}
                  className="w-full text-left p-3 rounded-xl border transition-colors"
                  style={{ backgroundColor: "var(--cm-surface-2)", borderColor: "var(--cm-border)" }}
                  data-testid="ai-journey-summary-btn">
                  {aiSummaryLoading ? (
                    <div className="flex items-center gap-2"><Loader2 className="w-3.5 h-3.5 animate-spin text-[#1a8a80]" /><span className="text-[11px]" style={{ color: "var(--cm-text-3)" }}>Summarizing...</span></div>
                  ) : aiSummary ? (
                    <>
                      <p className="text-[10px] font-bold uppercase tracking-wide text-[#1a8a80] mb-1">Journey Summary</p>
                      <p className="text-[12px] mb-1" style={{ color: "var(--cm-text-2)" }}>{aiSummary.relationship_summary}</p>
                      {aiSummary.suggested_action && <p className="text-[11px] text-[#1a8a80] font-semibold mt-2">Next: {aiSummary.suggested_action}</p>}
                    </>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-3.5 h-3.5 text-[#1a8a80]" />
                      <span className="text-[11px] font-semibold" style={{ color: "var(--cm-text-3)" }}>Get Journey Summary</span>
                    </div>
                  )}
                </button>

                {/* AI School Insight */}
                <button onClick={fetchAiInsight} disabled={aiInsightLoading}
                  className="w-full text-left p-3 rounded-xl border transition-colors"
                  style={{ backgroundColor: "var(--cm-surface-2)", borderColor: "var(--cm-border)" }}
                  data-testid="ai-school-insight-btn">
                  {aiInsightLoading ? (
                    <div className="flex items-center gap-2"><Loader2 className="w-3.5 h-3.5 animate-spin text-[#1a8a80]" /><span className="text-[11px]" style={{ color: "var(--cm-text-3)" }}>Analyzing school...</span></div>
                  ) : aiInsight?.insight ? (
                    <>
                      <p className="text-[10px] font-bold uppercase tracking-wide text-[#1a8a80] mb-1">School Fit Analysis</p>
                      <p className="text-[12px] mb-2" style={{ color: "var(--cm-text-2)" }}>{aiInsight.insight.summary}</p>
                      {aiInsight.insight.strengths?.slice(0, 2).map((s, i) => (
                        <div key={i} className="flex items-start gap-1.5 mb-1">
                          <span className="text-[9px] text-emerald-400 mt-0.5">+</span>
                          <span className="text-[11px] text-emerald-400/70">{s.text}</span>
                        </div>
                      ))}
                      {aiInsight.insight.concerns?.slice(0, 1).map((c, i) => (
                        <div key={i} className="flex items-start gap-1.5 mt-1">
                          <span className="text-[9px] text-amber-400 mt-0.5">!</span>
                          <span className="text-[11px] text-amber-400/70">{c.text}</span>
                        </div>
                      ))}
                    </>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-3.5 h-3.5 text-[#1a8a80]" />
                      <span className="text-[11px] font-semibold" style={{ color: "var(--cm-text-3)" }}>Get School Insight</span>
                    </div>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── FLOATING ACTION BAR ─── */}
      {!isCommitted && !isArchived && (
        <FloatingActionBar
          activeAction={activeAction}
          onEmail={() => { closeAll(); setShowEmail(true); setActiveAction("email"); }}
          onLog={() => { closeAll(); setShowLog(true); setActiveAction("log"); }}
          onReplied={() => { closeAll(); setShowReplied(true); setActiveAction("replied"); }}
          onFollowup={() => { closeAll(); setShowFollowup(true); setActiveAction("followup"); }}
        />
      )}

      {/* ─── MODALS ─── */}
      {showStageLog && (
        <StageLogModal
          stageKey={showStageLog}
          currentStage={rail.active}
          universityName={program.university_name}
          onConfirm={confirmStageAdvance}
          onCancel={() => setShowStageLog(null)}
        />
      )}
      {showEmail && (
        <EmailComposer
          coaches={coaches}
          programId={programId}
          universityName={program.university_name}
          onSent={() => { closeAll(); refresh(); }}
          onCancel={closeAll}
        />
      )}
      {showLog && (
        <LogInteractionForm
          programId={programId}
          universityName={program.university_name}
          onSaved={() => { closeAll(); refresh(); }}
          onCancel={closeAll}
        />
      )}
      {showReplied && (
        <MarkAsRepliedModal
          programId={programId}
          onSaved={() => { closeAll(); refresh(); }}
          onCancel={closeAll}
        />
      )}
      {showCoachForm !== null && (
        <CoachForm
          initial={showCoachForm.coach_id ? showCoachForm : null}
          programId={programId}
          onSave={handleSaveCoach}
          onCancel={closeAll}
        />
      )}
      {showFollowup && (
        <FollowUpScheduler
          program={program}
          onSaved={() => { closeAll(); refresh(); }}
          onCancel={closeAll}
        />
      )}

      {/* J1: Risk Explainer Drawer */}
      {riskDrawer && (
        <RiskExplainerDrawer
          badges={riskBadges}
          activeBadge={riskDrawer}
          onClose={() => setRiskDrawer(false)}
        />
      )}
    </div>
  );
}

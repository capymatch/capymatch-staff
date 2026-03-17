import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import {
  ArrowLeft, Archive, RotateCcw, User, Mail, Phone,
  Edit2, Trash2, Plus, AlertCircle, Clock, BookOpen, ExternalLink,
  Sparkles, Loader2, Target, X, CheckCircle2, ClipboardCheck,
  Eye, Send, Share2,
  GitCompare, ChevronDown, ChevronUp, Lock, Flag, Check,
} from "lucide-react";
import { Button } from "../../components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "../../components/ui/alert-dialog";
import {
  ProgressRail, PulseIndicator, GettingStartedChecklist,
  CommittedHero, CelebrationHero, NextStepCard, ConversationBubble,
  FloatingActionBar, StageLogModal, LogInteractionForm,
  EmailComposer, FollowUpScheduler, MarkAsRepliedModal, CoachForm,
} from "../../components/journey";
import { RAIL_STAGES, STAGE_LABELS } from "../../components/journey/constants";
import UniversityLogo from "../../components/UniversityLogo";
import { RiskBadgeRow, RiskBadgeEmpty, RiskExplainerDrawer } from "../../components/RiskBadges";
import { CoachSocialLinks } from "../../components/CoachSocialLinks";
import CoachWatchCard from "../../components/journey/CoachWatchCard";
import NotesSidebar from "../../components/NotesSidebar";
// Intelligence cards removed — School Intelligence is now single source in main column
import { useSubscription } from "../../lib/subscription";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

/* J4: School Social Links icons */
function SchoolSocialLinks({ links }) {
  const icons = {
    twitter: <svg viewBox="0 0 24 24" className="w-3 h-3" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>,
    instagram: <svg viewBox="0 0 24 24" className="w-3 h-3" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>,
    facebook: <svg viewBox="0 0 24 24" className="w-3 h-3" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>,
    youtube: <svg viewBox="0 0 24 24" className="w-3 h-3" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>,
    tiktok: <svg viewBox="0 0 24 24" className="w-3 h-3" fill="currentColor"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/></svg>,
  };
  const entries = Object.entries(links).filter(([, url]) => url);
  if (entries.length === 0) return null;
  return (
    <span className="flex items-center gap-1.5 ml-1" data-testid="school-social-links">
      {entries.map(([platform, url]) => (
        <a key={platform} href={url} target="_blank" rel="noopener noreferrer" title={platform}
          className="w-5 h-5 rounded flex items-center justify-center transition-colors hover:bg-white/10"
          style={{ color: "var(--cm-text-3)" }} data-testid={`social-${platform}`}
          onClick={e => e.stopPropagation()}>
          {icons[platform] || <ExternalLink className="w-3 h-3" />}
        </a>
      ))}
    </span>
  );
}

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

  // J2: Engagement data
  const [showAllStaff, setShowAllStaff] = useState(false);
  const [engagement, setEngagement] = useState(null);

  // J3: Gmail connected check + email initial (for Send Profile)
  const [gmailConnected, setGmailConnected] = useState(true);
  const [emailInitial, setEmailInitial] = useState({});

  // J4: Subscription + committed toggle
  const { subscription, loading: subLoading } = useSubscription();
  const isBasic = !subLoading && (subscription?.tier === "basic" || !subscription);
  const isPremium = !subLoading && subscription?.tier === "premium";
  const [showJourneyDetails, setShowJourneyDetails] = useState(false);

  // Coach Watch (real API)
  const [coachWatch, setCoachWatch] = useState(null);

  // Coach flags for this program
  const [coachFlags, setCoachFlags] = useState([]);
  const [completingFlag, setCompletingFlag] = useState(null);

  // Coach-assigned action items
  const [assignedActions, setAssignedActions] = useState([]);

  const markActionDone = async (actionId) => {
    try {
      await axios.patch(`${API}/athletes/me/assigned-actions/${actionId}/complete`);
      toast.success("Marked as done!");
      setAssignedActions(prev => prev.filter(a => a.id !== actionId));
    } catch { toast.error("Failed to mark as done"); }
  };

  // Profile data for checklist
  const [profileData, setProfileData] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      const [pRes, jRes, msRes, engRes, gmailRes, profRes] = await Promise.allSettled([
        axios.get(`${API}/athlete/programs/${programId}`),
        axios.get(`${API}/athlete/programs/${programId}/journey`),
        axios.get(`${API}/match-scores`),
        axios.get(`${API}/athlete/engagement/${programId}`),
        axios.get(`${API}/athlete/gmail/status`),
        axios.get(`${API}/athlete/profile`),
      ]);
      if (pRes.status !== "fulfilled") throw new Error("Failed to load program");
      setProgram(pRes.value.data);
      if (jRes.status === "fulfilled") setTimeline(jRes.value.data.timeline || []);
      if (profRes.status === "fulfilled") setProfileData(profRes.value.data);

      // Match score lookup
      if (msRes.status === "fulfilled") {
        const scores = msRes.value.data?.scores || [];
        const found = scores.find(s => s.program_id === programId);
        if (found) {
          setMatchScore(found);
          setRiskBadges(found.risk_badges || []);
        }
      }

      // Engagement data
      if (engRes.status === "fulfilled") setEngagement(engRes.value.data);

      // Gmail connection status
      setGmailConnected(gmailRes.status === "fulfilled" && gmailRes.value.data?.connected === true);

      // Coach Watch alert (fire-and-forget after program loads)
      const uniName = pRes.value.data?.university_name;
      if (uniName) {
        axios.get(`${API}/ai/coach-watch/alert/${encodeURIComponent(uniName)}`)
          .then(r => setCoachWatch(r.data))
          .catch(() => {});
      }

      // Fetch coach flags for this program
      axios.get(`${API}/athlete/flags`)
        .then(r => {
          const flags = (r.data?.flags || []).filter(f => f.program_id === programId);
          setCoachFlags(flags);
        })
        .catch(() => {});

      // Fetch coach-assigned actions for this school
      axios.get(`${API}/athletes/me/school/${programId}/assigned-actions`)
        .then(r => setAssignedActions(r.data?.actions || []))
        .catch(() => {});
    } catch (e) {
      toast.error("Failed to load program");
    } finally { setLoading(false); }
  }, [programId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const refresh = () => { setLoading(false); fetchData(); };
  const closeAll = () => { setShowEmail(false); setShowLog(false); setShowReplied(false); setShowCoachForm(null); setShowFollowup(false); setActiveAction(null); setEmailInitial({}); };

  // Complete a coach flag
  const handleCompleteFlag = async (flagId) => {
    setCompletingFlag(flagId);
    try {
      await axios.post(`${API}/athlete/flags/${flagId}/complete`, { resolution_note: "" });
      toast.success("Flag marked as complete");
      setCoachFlags(prev => prev.filter(f => f.flag_id !== flagId));
      refresh();
    } catch { toast.error("Failed to complete flag"); }
    finally { setCompletingFlag(null); }
  };

  // J3: Send Profile — open email composer with profile template
  const openEmailWithProfile = () => {
    if (isBasic) { toast.info("Email integration is available on Pro and Premium plans", { action: { label: "Upgrade", onClick: () => navigate("/settings") } }); return; }
    setEmailInitial({
      subject: `My Recruiting Profile — ${program?.university_name || ""}`,
      body: `Coach,\n\nI wanted to share my recruiting profile with you.\n\nIt includes my athletic measurables, academics, highlight video, and upcoming tournament schedule. I'd love the opportunity to discuss how I can contribute to your program.\n\nThank you for your time!`,
    });
    setShowEmail(true);
    setActiveAction("email");
  };

  // J4: Gated email open
  const openGatedEmail = () => {
    if (isBasic) { toast.info("Email integration is available on Pro and Premium plans", { action: { label: "Upgrade", onClick: () => navigate("/settings") } }); return; }
    setShowEmail(true);
    setActiveAction("email");
  };

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

  const profileComplete = !!(profileData && profileData.athlete_name && profileData.position && profileData.height && profileData.graduation_year);

  // Resolve logo from match score data
  const logoUrl = matchScore?.logo_url || program.logo_url || null;
  const domain = matchScore?.domain || program.domain || null;

  return (
    <div className="min-h-screen pb-28" style={{ backgroundColor: "var(--cm-bg)" }} data-testid="journey-page">
      {/* ─── HEADER ─── */}
      <div style={{ maxWidth: 1120, margin: "0 auto" }} className="px-4 sm:px-6 pt-6 pb-4">
        <div style={{ background: "#1e1e2e", borderRadius: 12, overflow: "hidden", position: "relative", border: "1px solid rgba(255,255,255,0.04)" }}>
          {/* Teal accent bar */}
          <div style={{ height: 3, background: "linear-gradient(90deg, #0d9488, #14b8a6)" }} />
          <div className="px-5 sm:px-7 pt-4 pb-5" style={{ position: "relative", zIndex: 1 }}>
          {/* Back & Actions */}
          <div className="flex items-center justify-between mb-4">
            <button onClick={() => navigate("/pipeline")} className="flex items-center gap-1.5 text-xs font-medium transition-colors" style={{ color: "rgba(255,255,255,0.4)" }} data-testid="back-to-pipeline">
              <ArrowLeft className="w-3.5 h-3.5" />Pipeline
            </button>
            <div className="flex items-center gap-2">
              {/* J4: Compare button */}
              <button onClick={() => navigate(`/compare?selected=${programId}`)}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold border transition-colors hover:bg-white/5"
                style={{ color: "rgba(255,255,255,0.4)", borderColor: "rgba(255,255,255,0.08)" }}
                data-testid="compare-btn">
                <GitCompare className="w-3 h-3" />Compare
              </button>
              {program.questionnaire_url && (
                <a href={program.questionnaire_url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold border transition-colors hover:bg-teal-700/10 text-teal-600 border-teal-700/20"
                  data-testid="questionnaire-link">
                  <ExternalLink className="w-3 h-3" />Questionnaire
                </a>
              )}
              {isArchived ? (
                <Button variant="outline" size="sm" onClick={handleArchiveToggle}
                  className="text-xs h-7 px-3"
                  style={{ color: "#0d9488", borderColor: "rgba(13,148,136,0.3)" }}
                  data-testid="reactivate-btn">
                  <RotateCcw className="w-3 h-3 mr-1" />Reactivate
                </Button>
              ) : (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <button className="px-3 py-1 rounded-full text-[11px] font-semibold transition-colors flex items-center gap-1.5"
                      style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.4)", border: "1px solid rgba(255,255,255,0.08)" }}
                      data-testid="archive-btn">
                      <Archive className="w-3 h-3" />Archive
                    </button>
                  </AlertDialogTrigger>
                  <AlertDialogContent style={{ background: "var(--cm-surface)", borderColor: "var(--cm-border)" }}>
                    <AlertDialogHeader>
                      <AlertDialogTitle style={{ color: "var(--cm-text)" }}>Archive {program.university_name}?</AlertDialogTitle>
                      <AlertDialogDescription style={{ color: "var(--cm-text-3)" }}>
                        This school will be moved to your Archived section on the pipeline. You can reactivate it anytime — nothing is deleted.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel style={{ color: "var(--cm-text-3)" }}>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={async () => {
                          try {
                            await axios.put(`${API}/athlete/programs/${programId}`, { recruiting_status: "archived" });
                            toast.success(`${program.university_name} archived`);
                            navigate("/pipeline");
                          } catch { toast.error("Failed to archive"); }
                        }}
                        style={{ background: "#94a3b8", color: "white" }}
                        data-testid="confirm-archive-btn"
                      >Archive</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          </div>

          {/* School Info + Logo + Match Score */}
          <div className="flex items-start gap-4 mb-3">
            {/* J1: Real university logo */}
            <UniversityLogo name={program.university_name} logoUrl={logoUrl} domain={domain} size={48} className="rounded-lg" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2.5 mb-1 flex-wrap">
                <h1 className="text-lg sm:text-xl font-extrabold tracking-tight" style={{ color: "#ffffff" }} data-testid="journey-school-name">
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
                  <span className="text-[11px]" style={{ color: "rgba(255,255,255,0.5)" }}>{program.conference}</span>
                )}
                {program.location && (
                  <span className="text-[11px]" style={{ color: "rgba(255,255,255,0.35)" }}>{program.location}</span>
                )}
                <span className="text-[11px]" style={{ color: "rgba(255,255,255,0.35)" }}>{timeline.length} interactions</span>
                {/* J4: School Social Links */}
                {program.social_links && typeof program.social_links === "object" && Object.keys(program.social_links).length > 0 && (
                  <SchoolSocialLinks links={program.social_links} />
                )}
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
      </div>

      {/* ─── MAIN CONTENT ─── */}
      <div style={{ maxWidth: 1120, margin: "0 auto" }} className="px-4 sm:px-6 mt-4">

        {/* Coach-Assigned Action Items Hero Card */}
        {assignedActions.length > 0 && (
          <div className="mb-4 space-y-3" data-testid="journey-assigned-actions">
            {assignedActions.map(action => {
              const aType = action.action_type || "general";
              const ctaMap = {
                send_email: { label: "Compose Email", icon: Mail, handler: () => { setShowEmail(true); setActiveAction("email"); } },
                log_visit: { label: "Log Visit", icon: ClipboardCheck, handler: () => { setShowInteraction(true); } },
                log_interaction: { label: "Log It", icon: ClipboardCheck, handler: () => { setShowInteraction(true); } },
                reply: { label: "Reply", icon: Send, handler: () => navigate("/messages") },
                profile_update: { label: "Update Profile", icon: User, handler: () => navigate("/profile") },
                preparation: { label: "Mark Done", icon: Check, handler: () => markActionDone(action.id) },
                research: { label: "Mark Done", icon: Check, handler: () => markActionDone(action.id) },
                general: { label: "Mark Done", icon: Check, handler: () => markActionDone(action.id) },
              };
              const cta = ctaMap[aType] || ctaMap.general;
              const CtaIcon = cta.icon;
              return (
                <div key={action.id} className="rounded-lg overflow-hidden"
                  style={{ background: "#1e1e2e", border: "1px solid rgba(13,148,136,0.25)", borderRadius: 10 }}
                  data-testid={`assigned-action-${action.id}`}>
                  <div style={{ height: 2, background: "linear-gradient(90deg, #0d9488, rgba(13,148,136,0.2))" }} />
                  <div className="p-4 sm:p-5">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                        style={{ backgroundColor: "rgba(13,148,136,0.15)" }}>
                        <ClipboardCheck className="w-5 h-5" style={{ color: "#0d9488" }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: "#0d9488" }}>
                          Coach Task {action.due_date ? `\u00B7 Due ${new Date(action.due_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}` : ""}
                        </p>
                        <h3 className="text-sm font-bold mb-1" style={{ color: "#ffffff" }}>
                          {action.title}
                        </h3>
                        <p className="text-xs mb-3" style={{ color: "rgba(255,255,255,0.5)" }}>
                          Assigned by {action.created_by || "your coach"} for {action.school_name || program?.university_name}
                        </p>
                        <button
                          onClick={cta.handler}
                          className="inline-flex items-center gap-1.5 px-3 h-8 rounded-md text-xs font-medium transition-colors shadow-sm"
                          style={{ backgroundColor: "#0d9488", color: "#fff" }}
                          data-testid={`action-cta-${action.id}`}>
                          <CtaIcon className="w-3.5 h-3.5" />
                          {cta.label}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Coach Flag Card */}
        {coachFlags.length > 0 && (
          <div className="mb-4 space-y-4" data-testid="journey-coach-flags">
            {coachFlags.map(flag => {
              const dueLabel = flag.due === "today" ? "Due today"
                : flag.due === "this_week" ? "Due this week"
                : flag.due_date ? `Due ${flag.due_date}` : null;
              return (
                <div key={flag.flag_id} className="rounded-lg overflow-hidden"
                  style={{ background: "rgba(245,158,11,0.04)", border: "1px solid rgba(245,158,11,0.2)", borderRadius: 10 }}
                  data-testid={`journey-flag-${flag.flag_id}`}>
                  <div style={{ height: 2, background: "linear-gradient(90deg, #f59e0b, rgba(245,158,11,0.2))" }} />
                  <div className="p-4 sm:p-5">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                        style={{ backgroundColor: "rgba(245,158,11,0.15)" }}>
                        <Flag className="w-5 h-5" style={{ color: "#f59e0b" }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: "#f59e0b" }}>
                          Coach Directive {dueLabel ? `\u00B7 ${dueLabel}` : ""}
                        </p>
                        <h3 className="text-sm font-bold mb-1" style={{ color: "var(--cm-text)" }}>
                          {flag.reason_label}
                        </h3>
                        {flag.note && (
                          <p className="text-xs mb-3" style={{ color: "var(--cm-text-2)" }}>
                            {flag.note}
                          </p>
                        )}
                        <div className="flex items-center gap-3 flex-wrap">
                          <button onClick={() => handleCompleteFlag(flag.flag_id)}
                            disabled={completingFlag === flag.flag_id}
                            className="inline-flex items-center gap-1.5 px-3 h-8 rounded-md text-xs font-medium transition-colors shadow-sm"
                            style={{ backgroundColor: "#f59e0b", color: "#000", opacity: completingFlag === flag.flag_id ? 0.6 : 1 }}
                            data-testid={`complete-flag-${flag.flag_id}`}>
                            {completingFlag === flag.flag_id
                              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              : <Check className="w-3.5 h-3.5" />}
                            Mark Complete
                          </button>
                          <span className="text-[10px] font-medium" style={{ color: "var(--cm-text-3)" }}>
                            Flagged by {flag.flagged_by_name || "Coach"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Getting Started Checklist — shows right under hero for new schools */}
        {isNewSchool && (
          <div className="mb-4">
            <GettingStartedChecklist
              program={program} coaches={coaches} timeline={timeline}
              profileComplete={profileComplete}
              onAddCoach={() => { setShowCoachForm({}); }}
              onSendEmail={openGatedEmail}
            />
          </div>
        )}

        {/* J1: Overdue Follow-Up Card (rich dark style) */}
        {followUpOverdue && !activeAction && (
          <div className="mb-4 rounded-lg overflow-hidden" style={{ background: "#1e1e2e", borderRadius: 10 }} data-testid="overdue-followup-card">
            <div style={{ height: 2, background: "linear-gradient(90deg, #f97316, rgba(249,115,22,0.2))" }} />
            <div className="p-4 sm:p-5">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
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
                    <button onClick={openGatedEmail}
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
          <div className="mb-4 rounded-lg overflow-hidden" style={{ background: "#1e1e2e", borderRadius: 10 }} data-testid="upcoming-followup-card">
            <div style={{ height: 2, background: "linear-gradient(90deg, #1a8a80, rgba(26,138,128,0.2))" }} />
            <div className="p-4 sm:p-5">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
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
                    <button onClick={openGatedEmail}
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
          <div className="mb-5 rounded-lg border p-4 sm:p-5" style={{ backgroundColor: "var(--cm-surface)", borderColor: "var(--cm-border)" }} data-testid="questionnaire-section">
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
          <div className="mb-5 rounded-lg overflow-hidden relative"
            style={{ borderColor: "rgba(245,158,11,0.3)", background: "#1e1e2e", border: "1px solid rgba(245,158,11,0.3)" }}
            data-testid="questionnaire-nudge">
            <button onClick={() => setQuestNudgeDismissed(true)}
              className="absolute top-3 right-3 p-1 rounded-lg hover:bg-white/10 transition-colors"
              style={{ color: "rgba(255,255,255,0.35)" }} data-testid="quest-nudge-dismiss">
              <X className="w-4 h-4" />
            </button>
            <div className="p-4 sm:p-5">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
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
          <div className="mb-6">
            <CommittedHero program={program} />
            {/* J4: View full journey toggle */}
            <button onClick={() => setShowJourneyDetails(prev => !prev)}
              className="mx-auto mt-4 flex items-center gap-1.5 px-4 py-2 rounded-lg border text-xs font-medium transition-colors hover:bg-white/5"
              style={{ color: "var(--cm-text-3)", borderColor: "var(--cm-border)" }}
              data-testid="toggle-journey-details">
              {showJourneyDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              {showJourneyDetails ? "Hide journey details" : "View full journey"}
            </button>
          </div>
        ) : hasCoachReply ? (
          <div className="mb-8">
            <CelebrationHero program={program} coaches={coaches}
              onEmail={isBasic ? null : openGatedEmail}
              onLog={() => { setShowLog(true); setActiveAction("log"); }}
              onCall={() => { setShowLog(true); setActiveAction("log"); }}
            />
          </div>
        ) : null}

        {/* Next Step Automation Card */}
        {latestEvent && !isCommitted && !nextStepDismissed && (
          <div className="mb-8">
            <NextStepCard
              latestEvent={latestEvent}
              universityName={program.university_name}
              onEmail={openGatedEmail}
              onLog={() => { setShowLog(true); setActiveAction("log"); }}
              onFollowup={() => { setShowFollowup(true); setActiveAction("followup"); }}
              onDismiss={() => setNextStepDismissed(true)}
            />
          </div>
        )}

        {/* J4: Hide remaining content when committed and toggle is off */}
        {(!isCommitted || showJourneyDetails) && (
          <>
        {/* Knowledge Base / School Intelligence — single source of truth */}
        {!isBasic && (program.school_id || domain) && (
          <div className="mb-6" id="school-intelligence">
            <button onClick={() => navigate(domain ? `/school/${domain}` : `/schools/${program.school_id}`)}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg border transition-colors hover:bg-white/[0.02]"
              style={{ backgroundColor: "var(--cm-surface)", borderColor: "var(--cm-border)" }}
              data-testid="school-intel-link">
              <BookOpen className="w-4 h-4 text-teal-700 flex-shrink-0" />
              <div className="text-left flex-1">
                <p className="text-xs font-bold" style={{ color: "var(--cm-text)" }}>School Intelligence</p>
                <p className="text-[10px]" style={{ color: "var(--cm-text-2)" }}>
                  {program.match_score
                    ? `${program.match_score}% match — recruiting requirements, roster info, and opportunity signals`
                    : "View recruiting requirements, roster info, and more"}
                </p>
              </div>
              <span className="text-[10px] font-semibold text-teal-600 flex-shrink-0">View full analysis &rarr;</span>
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

            {/* J3: Gmail Connect Nudge */}
            {!gmailConnected && (
              <div className="flex items-start gap-3 rounded-lg p-3.5 mb-4" style={{ backgroundColor: "rgba(26,138,128,0.08)", border: "1px solid rgba(26,138,128,0.18)" }} data-testid="gmail-nudge-banner">
                <Mail className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: "#1a8a80" }} />
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium" style={{ color: "var(--cm-text)" }}>
                    Connect Gmail to automatically track your emails with coaches, detect replies, and get smart follow-up reminders.
                  </p>
                  <a href="/settings" className="inline-flex items-center gap-1 text-xs font-semibold mt-1.5 transition-colors hover:underline" style={{ color: "#1a8a80" }} data-testid="gmail-nudge-connect-btn">
                    Connect Gmail <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            )}

            {/* J3: Send Profile Card */}
            {!isCommitted && !isArchived && coaches.length > 0 && (
              <div className="rounded-lg border p-4 mb-4" style={{ backgroundColor: "var(--cm-surface)", borderColor: "var(--cm-border)" }} data-testid="send-profile-card">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: "rgba(26,138,128,0.15)" }}>
                    <Share2 className="w-3.5 h-3.5" style={{ color: "#1a8a80" }} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold" style={{ color: "var(--cm-text)" }}>Share Profile</h3>
                    <p className="text-[11px]" style={{ color: "var(--cm-text-3)" }}>Send your recruiting profile to {program.university_name}'s coaches</p>
                  </div>
                </div>
                <button onClick={openEmailWithProfile}
                  className="flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg transition-all text-white"
                  style={{ backgroundColor: "#1a8a80" }}
                  data-testid="send-profile-btn">
                  <Send className="w-3.5 h-3.5" />Send Profile to Coach
                </button>
              </div>
            )}
            {timeline.length === 0 ? (
              <div className="text-center py-16 rounded-lg border border-dashed" style={{ backgroundColor: "var(--cm-surface)", borderColor: "var(--cm-border)" }} data-testid="empty-timeline">
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

          {/* RIGHT: Sidebar — Coach Watch Intelligence Layer */}
          <div className="space-y-5">
            {/* Section 1: Coach Watch Summary (NEW TOP CARD) */}
            <CoachWatchCard
              signals={signals}
              engagement={engagement}
              coaches={coaches}
              coachWatch={coachWatch}
              timeline={timeline}
              onEmail={openGatedEmail}
              onFollowUp={() => { setShowFollowup(true); setActiveAction("followup"); }}
            />

            {/* Section 2: Key Contacts (compact, max 2) */}
            <div className="rounded-xl border px-4 py-3" style={{ backgroundColor: "var(--cm-surface)", borderColor: "var(--cm-border)" }} data-testid="key-contacts-card">
              <div className="flex items-center justify-between mb-2.5">
                <h3 className="text-[9px] font-extrabold uppercase tracking-widest" style={{ color: "var(--cm-text-3)" }}>Key Contacts</h3>
                <button onClick={() => setShowCoachForm({})} className="flex items-center gap-1 text-[9px] font-semibold text-teal-600 hover:text-teal-500 transition-colors" data-testid="add-coach-btn">
                  <Plus className="w-2.5 h-2.5" />Add
                </button>
              </div>

              {coaches.length === 0 ? (
                <p className="text-[10px] text-center py-3" style={{ color: "var(--cm-text-3)" }}>No contacts added yet</p>
              ) : (
                <div className="space-y-2">
                  {coaches.slice(0, 2).map((c, idx) => {
                    const engOpens = engagement?.total_opens || 0;
                    const engClicks = engagement?.total_clicks || 0;
                    const hasReply = signals.has_coach_reply;
                    const hasOutreach = (signals.outreach_count || 0) > 0;

                    // Engagement-interpreted status line (click > open > no engagement)
                    let statusLine, statusColor;
                    if (hasReply && idx === 0) {
                      statusLine = "Replied to your message";
                      statusColor = "#22c55e";
                    } else if (engClicks > 0 && idx === 0) {
                      statusLine = "Engaged with your highlight link";
                      statusColor = "#22c55e";
                    } else if (engOpens > 2 && idx === 0) {
                      statusLine = "Viewed your message multiple times";
                      statusColor = "#3b82f6";
                    } else if (engOpens > 0 && idx === 0) {
                      statusLine = "Opened your last message";
                      statusColor = "#3b82f6";
                    } else if (idx === 0 && coaches.length > 1) {
                      statusLine = hasOutreach && engOpens === 0 ? "No engagement with your outreach" : "Primary decision maker";
                      statusColor = hasOutreach && engOpens === 0 ? "#f59e0b" : "#94a3b8";
                    } else if (hasOutreach && engOpens === 0) {
                      statusLine = "No engagement yet";
                      statusColor = "#64748b";
                    } else {
                      statusLine = "No engagement yet";
                      statusColor = "#64748b";
                    }

                    return (
                      <div key={c.coach_id} className="flex items-start gap-2.5 p-2.5 rounded-lg"
                        style={{ backgroundColor: "var(--cm-surface-2)" }}
                        data-testid={`coach-card-${c.coach_id}`}>
                        <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                          style={{ backgroundColor: `${statusColor}12` }}>
                          <User className="w-3 h-3" style={{ color: statusColor }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="text-[11px] font-semibold truncate" style={{ color: "var(--cm-text)" }}>{c.coach_name}</p>
                            <span className="text-[9px] flex-shrink-0" style={{ color: "var(--cm-text-3)" }}>{c.role || "Coach"}</span>
                          </div>
                          <p className="text-[9px] mt-0.5" style={{ color: statusColor }}>{statusLine}</p>
                          {c.email && (
                            <a href={`mailto:${c.email}`} className="text-[9px] text-teal-600 truncate hover:underline mt-0.5 block">{c.email}</a>
                          )}
                        </div>
                        <div className="flex gap-0.5 flex-shrink-0">
                          <button onClick={() => setShowCoachForm(c)} className="p-1 rounded" style={{ color: "var(--cm-text-3)" }} data-testid={`edit-coach-${c.coach_id}`}><Edit2 className="w-2.5 h-2.5" /></button>
                          <button onClick={() => handleDeleteCoach(c.coach_id)} className="p-1 rounded" style={{ color: "var(--cm-text-3)" }} data-testid={`delete-coach-${c.coach_id}`}><Trash2 className="w-2.5 h-2.5" /></button>
                        </div>
                      </div>
                    );
                  })}
                  {coaches.length > 2 && (
                    <button onClick={() => setShowAllStaff(prev => !prev)}
                      className="w-full text-[9px] font-semibold text-teal-600 hover:text-teal-500 py-1 transition-colors"
                      data-testid="view-all-staff-btn">
                      {showAllStaff ? "Show less" : `View all staff (${coaches.length})`}
                    </button>
                  )}
                  {showAllStaff && coaches.slice(2).map(c => (
                    <div key={c.coach_id} className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg"
                      style={{ backgroundColor: "var(--cm-surface-2)" }}
                      data-testid={`coach-card-${c.coach_id}`}>
                      <User className="w-3 h-3 flex-shrink-0" style={{ color: "#64748b" }} />
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-semibold truncate" style={{ color: "var(--cm-text)" }}>{c.coach_name}</p>
                        <p className="text-[9px]" style={{ color: "var(--cm-text-3)" }}>{c.role || "Coach"}</p>
                      </div>
                      <div className="flex gap-0.5 flex-shrink-0">
                        <button onClick={() => setShowCoachForm(c)} className="p-1 rounded" style={{ color: "var(--cm-text-3)" }}><Edit2 className="w-2.5 h-2.5" /></button>
                        <button onClick={() => handleDeleteCoach(c.coach_id)} className="p-1 rounded" style={{ color: "var(--cm-text-3)" }}><Trash2 className="w-2.5 h-2.5" /></button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Section 3: Communication & Activity (compact, low emphasis) */}
            <div className="rounded-xl border px-4 py-3" style={{ backgroundColor: "var(--cm-surface)", borderColor: "var(--cm-border)" }} data-testid="communication-activity-card">
              <h3 className="text-[9px] font-extrabold uppercase tracking-widest mb-2" style={{ color: "var(--cm-text-3)" }}>Communication & Activity</h3>
              <div className="grid grid-cols-4 gap-1.5">
                {[
                  { label: "Outreach", value: signals.outreach_count || 0 },
                  { label: "Replies", value: signals.reply_count || 0 },
                  { label: "Interactions", value: timeline.length },
                  { label: "Last Active", value: signals.days_since_activity != null ? `${signals.days_since_activity}d` : "\u2014" },
                ].map(stat => (
                  <div key={stat.label} className="text-center py-2 rounded-lg" style={{ backgroundColor: "var(--cm-card-stat)" }}
                    data-testid={`stat-${stat.label.toLowerCase().replace(/\s/g, "-")}`}>
                    <p className="text-sm font-extrabold" style={{ color: "var(--cm-text)" }}>{stat.value}</p>
                    <p className="text-[8px] font-medium uppercase" style={{ color: "var(--cm-text-3)" }}>{stat.label}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Section 4: School Fit (compact preview → links to main column) */}
            <div className="rounded-xl border px-4 py-3" style={{ backgroundColor: "var(--cm-surface)", borderColor: "var(--cm-border)" }} data-testid="school-fit-preview">
              <h3 className="text-[9px] font-extrabold uppercase tracking-widest mb-2" style={{ color: "var(--cm-text-3)" }}>School Fit</h3>
              <p className="text-[10.5px] leading-snug mb-1" style={{ color: "var(--cm-text)" }}>
                {program.match_score
                  ? program.match_score >= 70
                    ? "Strong academic and athletic match"
                    : program.match_score >= 40
                      ? "Moderate fit — review roster and requirements"
                      : "Limited match signals — explore alternatives"
                  : "Analysis available in School Intelligence"}
              </p>
              {signals.days_since_activity != null && signals.days_since_activity > 7 && (
                <p className="text-[9px] mb-2" style={{ color: "#f59e0b" }}>Limited engagement so far</p>
              )}
              <button
                onClick={() => {
                  const el = document.getElementById("school-intelligence");
                  if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
                }}
                className="text-[9px] font-semibold text-teal-600 hover:text-teal-500 transition-colors"
                data-testid="school-fit-view-analysis">
                View full analysis &rarr;
              </button>
            </div>

            {/* Section 5: AI Assist (lightweight tools) */}
            <div className="rounded-xl border px-4 py-3" style={{ backgroundColor: "var(--cm-surface)", borderColor: isPremium ? "rgba(13,148,136,0.12)" : "var(--cm-border)" }} data-testid="ai-section">
              <h3 className="text-[9px] font-extrabold uppercase tracking-widest mb-2 flex items-center gap-1.5" style={{ color: "var(--cm-text-3)" }}>
                <Sparkles className="w-3 h-3 text-[#1a8a80]" /> AI Assist
                {!isPremium && <span className="text-[8px] font-bold px-1 py-px rounded bg-amber-500/15 text-amber-400 ml-auto">PREMIUM</span>}
              </h3>

              {isPremium ? (
                <div className="space-y-1.5">
                  <button onClick={fetchAiNextStep} disabled={aiNextStepLoading}
                    className="w-full flex items-center gap-2 p-2 rounded-lg transition-colors hover:bg-white/[0.02]"
                    style={{ backgroundColor: "var(--cm-surface-2)" }}
                    data-testid="ai-next-step-btn">
                    {aiNextStepLoading ? (
                      <Loader2 className="w-3 h-3 animate-spin text-[#1a8a80]" />
                    ) : aiNextStep ? (
                      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${aiNextStep.urgency === "high" ? "bg-red-400" : aiNextStep.urgency === "medium" ? "bg-amber-400" : "bg-green-400"}`} />
                    ) : (
                      <Sparkles className="w-3 h-3 text-[#1a8a80] flex-shrink-0" />
                    )}
                    <div className="text-left flex-1 min-w-0">
                      {aiNextStep ? (
                        <p className="text-[10px] font-semibold truncate" style={{ color: "var(--cm-text)" }}>{aiNextStep.next_step}</p>
                      ) : (
                        <>
                          <p className="text-[10px] font-semibold" style={{ color: "var(--cm-text)" }}>Get Next Step</p>
                          <p className="text-[8px]" style={{ color: "var(--cm-text-3)" }}>Based on Coach Watch and activity</p>
                        </>
                      )}
                    </div>
                  </button>
                  <button onClick={fetchAiSummary} disabled={aiSummaryLoading}
                    className="w-full flex items-center gap-2 p-2 rounded-lg transition-colors hover:bg-white/[0.02]"
                    style={{ backgroundColor: "var(--cm-surface-2)" }}
                    data-testid="ai-journey-summary-btn">
                    {aiSummaryLoading ? (
                      <Loader2 className="w-3 h-3 animate-spin text-[#1a8a80]" />
                    ) : (
                      <Sparkles className="w-3 h-3 text-[#1a8a80] flex-shrink-0" />
                    )}
                    <div className="text-left flex-1 min-w-0">
                      {aiSummary ? (
                        <p className="text-[10px] truncate" style={{ color: "var(--cm-text-2)" }}>{aiSummary.relationship_summary}</p>
                      ) : (
                        <>
                          <p className="text-[10px] font-semibold" style={{ color: "var(--cm-text)" }}>Summarize Relationship</p>
                          <p className="text-[8px]" style={{ color: "var(--cm-text-3)" }}>Full journey overview</p>
                        </>
                      )}
                    </div>
                  </button>
                  <button onClick={fetchAiInsight} disabled={aiInsightLoading}
                    className="w-full flex items-center gap-2 p-2 rounded-lg transition-colors hover:bg-white/[0.02]"
                    style={{ backgroundColor: "var(--cm-surface-2)" }}
                    data-testid="ai-school-insight-btn">
                    {aiInsightLoading ? (
                      <Loader2 className="w-3 h-3 animate-spin text-[#1a8a80]" />
                    ) : (
                      <Sparkles className="w-3 h-3 text-[#1a8a80] flex-shrink-0" />
                    )}
                    <div className="text-left flex-1 min-w-0">
                      {aiInsight?.insight ? (
                        <p className="text-[10px] truncate" style={{ color: "var(--cm-text-2)" }}>{aiInsight.insight.summary}</p>
                      ) : (
                        <>
                          <p className="text-[10px] font-semibold" style={{ color: "var(--cm-text)" }}>Explore School Intelligence</p>
                          <p className="text-[8px]" style={{ color: "var(--cm-text-3)" }}>Roster, fit, and timing signals</p>
                        </>
                      )}
                    </div>
                  </button>
                </div>
              ) : (
                <div className="py-3 text-center">
                  <Lock className="w-4 h-4 mx-auto mb-1.5" style={{ color: "var(--cm-text-3)" }} />
                  <p className="text-[10px] font-semibold mb-0.5" style={{ color: "var(--cm-text-2)" }}>AI-powered insights</p>
                  <p className="text-[8px] mb-2" style={{ color: "var(--cm-text-3)" }}>Next steps, summaries, and fit analysis</p>
                  <button onClick={() => navigate("/settings")}
                    className="text-[10px] font-semibold px-3 py-1 rounded-lg text-white"
                    style={{ backgroundColor: "#1a8a80" }}
                    data-testid="ai-upgrade-btn">
                    Upgrade
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
          </>
        )}
      </div>

      {/* ─── FLOATING ACTION BAR ─── */}
      {!isCommitted && !isArchived && (
        <FloatingActionBar
          activeAction={activeAction}
          onEmail={() => { closeAll(); openGatedEmail(); }}
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
          initialSubject={emailInitial.subject}
          initialBody={emailInitial.body}
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

      {/* J3: Notes Sidebar */}
      <NotesSidebar programId={programId} universityName={program.university_name} />
    </div>
  );
}

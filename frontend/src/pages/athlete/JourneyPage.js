import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import "../../components/pipeline/pipeline-premium.css";
import {
  ArrowLeft, Archive, RotateCcw, User, Mail, Phone,
  Edit2, Trash2, Plus, AlertCircle, Clock, ExternalLink,
  Sparkles, Loader2, X, CheckCircle2, ClipboardCheck,
  Eye, Send, Share2,
  GitCompare, ChevronDown, ChevronUp, Lock, Flag, Check,
  ShieldCheck, ShieldAlert, RefreshCw, Activity,
} from "lucide-react";
import { Button } from "../../components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "../../components/ui/alert-dialog";
import {
  ProgressRail, GettingStartedChecklist,
  ConversationBubble, computeHeroSelection, PrimaryHeroCard,
  FloatingActionBar, StageLogModal, LogInteractionForm,
  EmailComposer, FollowUpScheduler, MarkAsRepliedModal, CoachForm,
} from "../../components/journey";
import { RAIL_STAGES, STAGE_LABELS } from "../../components/journey/constants";
import UniversityLogo from "../../components/UniversityLogo";
import { RiskBadgeRow, RiskBadgeEmpty, RiskExplainerDrawer } from "../../components/RiskBadges";
import { CoachSocialLinks } from "../../components/CoachSocialLinks";
import CoachWatchCardV2 from "../../components/journey/CoachWatchCardV2";
import SchoolIntelligenceDrawer from "../../components/journey/SchoolIntelligenceDrawer";
import NotesSidebar from "../../components/NotesSidebar";
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

/* ── Coaching Stability Badge ── */
const STABILITY_CONFIG = {
  departure:        { label: "Coach Departed",   color: "#ef4444", bg: "rgba(239,68,68,0.10)",  border: "rgba(239,68,68,0.25)",  Icon: ShieldAlert },
  new_hire:         { label: "New Head Coach",   color: "#f59e0b", bg: "rgba(245,158,11,0.10)", border: "rgba(245,158,11,0.25)", Icon: AlertCircle },
  staff_change:     { label: "Staff Change",     color: "#f59e0b", bg: "rgba(245,158,11,0.10)", border: "rgba(245,158,11,0.25)", Icon: AlertCircle },
  contract_update:  { label: "Contract Update",  color: "#3b82f6", bg: "rgba(59,130,246,0.10)", border: "rgba(59,130,246,0.25)", Icon: Clock },
  extension:        { label: "Stable (Extended)", color: "#22c55e", bg: "rgba(34,197,94,0.10)",  border: "rgba(34,197,94,0.25)",  Icon: ShieldCheck },
  stable:           { label: "Stable",           color: "#22c55e", bg: "rgba(34,197,94,0.10)",  border: "rgba(34,197,94,0.25)",  Icon: ShieldCheck },
};

function CoachingStabilityBadge({ stability, programId, onRefreshed }) {
  const [refreshing, setRefreshing] = useState(false);
  const [expanded, setExpanded] = useState(false);

  if (!stability) return null;

  const changeType = stability.change_type || "stable";
  const config = STABILITY_CONFIG[changeType] || STABILITY_CONFIG.stable;
  const BadgeIcon = config.Icon;

  const handleRefresh = async (e) => {
    e.stopPropagation();
    setRefreshing(true);
    try {
      const res = await axios.post(`${API}/coaching-stability/${programId}/refresh`);
      if (onRefreshed) onRefreshed(res.data?.stability || null);
    } catch { /* silent */ }
    setRefreshing(false);
  };

  return (
    <div
      className="rounded-[18px] border px-5 py-4"
      style={{ backgroundColor: "#fff", borderColor: "#e7dfd4", boxShadow: "0 2px 8px rgba(80,60,30,0.03), 0 0.5px 2px rgba(80,60,30,0.02)" }}
      data-testid="coaching-stability-card"
    >
      {/* Collapsed: header + badge + learn more */}
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-[9px] font-extrabold uppercase tracking-widest" style={{ color: "var(--cm-text-3)" }}>
          Coaching Stability
        </h3>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="p-1 rounded transition-colors hover:bg-white/5"
          style={{ color: "var(--cm-text-3)" }}
          data-testid="coaching-stability-refresh-btn"
        >
          <RefreshCw className={`w-3 h-3 ${refreshing ? "animate-spin" : ""}`} />
        </button>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: config.bg, border: `1px solid ${config.border}` }}
          >
            <BadgeIcon className="w-4 h-4" style={{ color: config.color }} />
          </div>
          <span
            className="text-[11px] font-bold px-2 py-0.5 rounded-full"
            style={{ color: config.color, backgroundColor: config.bg, border: `1px solid ${config.border}` }}
            data-testid="coaching-stability-badge"
          >
            {config.label}
          </span>
        </div>
        <button
          onClick={() => setExpanded(prev => !prev)}
          className="text-[10px] font-semibold transition-colors hover:underline"
          style={{ color: "var(--cm-text-3)" }}
          data-testid="coaching-stability-learn-more"
        >
          {expanded ? "Show less" : "Learn more"}
        </button>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="mt-3 pt-3" style={{ borderTop: "1px solid var(--cm-border)" }}>
          {stability.headline && (
            <p className="text-[11px] font-medium mb-1" style={{ color: "var(--cm-text)" }} data-testid="coaching-stability-headline">
              {stability.headline}
            </p>
          )}
          {stability.summary && (
            <p className="text-[10px] leading-relaxed mb-1.5" style={{ color: "var(--cm-text-2)" }} data-testid="coaching-stability-summary">
              {stability.summary}
            </p>
          )}
          {stability.recommendation && (
            <p className="text-[9px] leading-relaxed" style={{ color: "var(--cm-text-3)" }} data-testid="coaching-stability-recommendation">
              {stability.recommendation}
            </p>
          )}
          {stability.created_at && (
            <p className="text-[8px] mt-2 opacity-50" style={{ color: "var(--cm-text-3)" }}>
              Last checked: {new Date(stability.created_at).toLocaleDateString()}
            </p>
          )}
        </div>
      )}
    </div>
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
  const [autoInsight, setAutoInsight] = useState(null);
  const [autoInsightLoading, setAutoInsightLoading] = useState(false);
  const [siDrawerOpen, setSiDrawerOpen] = useState(false);

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

  // Coaching Stability
  const [coachingStability, setCoachingStability] = useState(null);

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
      // Refresh timeline so the completion shows up
      const jRes = await axios.get(`${API}/athlete/programs/${programId}/journey`);
      setTimeline(jRes.data.timeline || []);
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

      // Coach Watch — new relationship state engine
      axios.get(`${API}/coach-watch/${programId}`)
        .then(r => setCoachWatch(r.data))
        .catch(() => {});

      // Coaching Stability — head coach job stability
      axios.get(`${API}/coaching-stability/${programId}`)
        .then(r => setCoachingStability(r.data?.stability || null))
        .catch(() => {});

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

  // J4: Gated email open — accepts optional prefill from hero cards
  const openGatedEmail = (prefill) => {
    if (isBasic) { toast.info("Email integration is available on Pro and Premium plans", { action: { label: "Upgrade", onClick: () => navigate("/settings") } }); return; }
    if (prefill && (prefill.subject || prefill.body)) {
      setEmailInitial({ subject: prefill.subject || "", body: prefill.body || "" });
    }
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

  // Auto-fetch insight on page load for premium users
  useEffect(() => {
    if (!programId || !isPremium) return;
    setAutoInsightLoading(true);
    axios.post(`${API}/ai/auto-insight`, { program_id: programId })
      .then(res => setAutoInsight(res.data))
      .catch(() => {})
      .finally(() => setAutoInsightLoading(false));
  }, [programId, isPremium]);

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
        <p style={{ color: "#3d3830" }}>Program not found</p>
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

  // ── Hero Orchestrator ──
  const heroHandlers = {
    onEmail: openGatedEmail,
    onLog: () => { setShowLog(true); setActiveAction("log"); },
    onFollowup: () => { setShowFollowup(true); setActiveAction("followup"); },
    onMarkActionDone: markActionDone,
    onCompleteFlag: handleCompleteFlag,
    onNavigate: navigate,
  };
  const { featuredHero, radarItems } = computeHeroSelection({
    assignedActions, coachFlags, coachWatch, program,
    followUpOverdue, followUpUpcoming, daysOverdue, daysUntilDue,
    hasCoachReply, isCommitted, latestEvent, nextStepDismissed,
    coaches, questNudgeDismissed, completingFlag,
    handlers: heroHandlers,
    athleteName: profileData?.athlete_name || profileData?.full_name || profileData?.name || "",
  });

  return (
    <div className="min-h-screen pb-28" style={{
      '--cm-text': '#1a1a1a',
      '--cm-text-2': '#3d3830',
      '--cm-text-3': '#6b6358',
      '--cm-text-4': '#9c917f',
      '--cm-surface': '#ffffff',
      '--cm-surface-2': '#f8fafc',
      '--cm-border': '#e7dfd4',
      '--cm-border-subtle': 'rgba(231,223,212,0.5)',
      '--cm-card-stat': '#f8fafc',
      backgroundColor: 'var(--cm-bg)',
    }} data-testid="journey-page">
      {/* ─── HEADER BAR ─── */}
      <header className="bg-white/95 border-b border-gray-100" data-testid="journey-header-bar">
        <div className="px-2 sm:px-4 py-2.5 sm:py-3" style={{ maxWidth: 1120, margin: "0 auto" }}>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <button
              onClick={() => navigate("/pipeline")}
              className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors shrink-0"
              data-testid="back-to-pipeline"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Pipeline</span>
            </button>
            <div className="h-5 w-px bg-gray-200 hidden sm:block" />
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <UniversityLogo name={program.university_name} logoUrl={logoUrl} domain={domain} size={36} className="rounded-full shrink-0" style={{ border: "1px solid #e5e7eb" }} />
              <div className="min-w-0">
                <h1 className="font-semibold text-gray-900 text-sm sm:text-base leading-tight truncate" data-testid="journey-school-name">
                  {program.university_name}
                </h1>
                <p className="text-[11px] sm:text-xs text-gray-500 truncate">
                  {[program.division, program.conference, `${timeline.length} interactions`].filter(Boolean).join(" · ")}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2 ml-auto">
              {matchScore && (
                <span className="flex items-center gap-1.5 px-2 py-1 text-xs font-medium text-teal-600 bg-teal-50 rounded-full shrink-0"
                  data-testid="journey-match-score">
                  {matchScore.match_score}%
                </span>
              )}
              <button onClick={() => navigate(`/compare?selected=${programId}`)}
                className="hidden sm:flex p-1.5 rounded-full hover:bg-gray-100 transition-colors"
                data-testid="compare-btn"
                title="Compare">
                <GitCompare className="w-3.5 h-3.5 text-gray-400" />
              </button>
              {program.questionnaire_url && (
                <a href={program.questionnaire_url} target="_blank" rel="noopener noreferrer"
                  className="p-1.5 rounded-full hover:bg-gray-100 transition-colors"
                  data-testid="questionnaire-link"
                  title="Questionnaire">
                  <ExternalLink className="w-3.5 h-3.5 text-gray-400" />
                </a>
              )}
              {isArchived ? (
                <button onClick={handleArchiveToggle}
                  className="flex items-center gap-1.5 px-2 py-1.5 text-xs font-medium text-teal-600 bg-teal-50 hover:bg-teal-100 rounded-full transition-colors"
                  data-testid="reactivate-btn">
                  <RotateCcw className="w-3 h-3" />
                  <span className="hidden sm:inline">Reactivate</span>
                </button>
              ) : (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <button className="p-1.5 rounded-full hover:bg-gray-100 transition-colors"
                      data-testid="archive-btn"
                      title="Archive">
                      <Archive className="w-3.5 h-3.5 text-gray-400" />
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
              {coachWatch?.state && (
                <div className="flex items-center gap-1.5 px-2 py-1 rounded-full"
                  style={{
                    backgroundColor: coachWatch.state === "hot" ? "rgba(239,68,68,0.08)"
                      : coachWatch.state === "warm" ? "rgba(245,158,11,0.08)"
                      : coachWatch.state === "active" ? "rgba(13,148,136,0.08)"
                      : "rgba(100,116,139,0.08)"
                  }}
                  data-testid="journey-health-badge">
                  <div className="w-2 h-2 rounded-full"
                    style={{
                      backgroundColor: coachWatch.state === "hot" ? "#ef4444"
                        : coachWatch.state === "warm" ? "#f59e0b"
                        : coachWatch.state === "active" ? "#0d9488"
                        : "#64748b"
                    }} />
                  <Activity className="w-3.5 h-3.5"
                    style={{
                      color: coachWatch.state === "hot" ? "#ef4444"
                        : coachWatch.state === "warm" ? "#f59e0b"
                        : coachWatch.state === "active" ? "#0d9488"
                        : "#64748b"
                    }} />
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* ─── MAIN CONTENT ─── */}
      <div style={{ maxWidth: 1120, margin: "0 auto" }} className="px-1 sm:px-6 mt-2">

        {/* ═══ ORCHESTRATED HERO SECTION ═══ */}
        <PrimaryHeroCard hero={featuredHero} program={program} />

        {/* Signal chips — inline context replacing floating blocks */}
        <div className="flex flex-wrap items-center gap-2 mt-3 mb-4" data-testid="journey-signal-chips">
          {featuredHero?.badge && (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-[11px] font-semibold"
              style={{ background: "rgba(199,80,0,0.06)", color: "#c75000" }}
              data-testid="chip-hero-badge">
              {featuredHero.badge}
            </span>
          )}
          {(() => {
            if (!timeline || timeline.length === 0) return null;
            const latest = new Date(Math.max(...timeline.map(t => new Date(t.date || t.created_at || 0))));
            const days = Math.floor((Date.now() - latest.getTime()) / 86400000);
            return (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-[11px] font-medium"
                style={{ background: "#f8fafc", color: "#475569", border: "1px solid #e7dfd4" }}
                data-testid="chip-last-activity">
                {days === 0 ? "Active today" : `Last activity \u00b7 ${days}d ago`}
              </span>
            );
          })()}
          {matchScore?.match_score != null && (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-[11px] font-medium"
              style={{ background: "#f8fafc", color: "#475569", border: "1px solid #e7dfd4" }}
              data-testid="chip-match-score">
              Match score: {matchScore.match_score}
            </span>
          )}
          {rail?.active && rail.active !== "added" && (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-[11px] font-medium"
              style={{ background: "rgba(94,148,112,0.06)", color: "#5e9470", border: "1px solid rgba(94,148,112,0.15)" }}
              data-testid="chip-stage">
              {rail.active.charAt(0).toUpperCase() + rail.active.slice(1).replace(/_/g, " ")}
            </span>
          )}
        </div>

        {/* Committed toggle */}
        {featuredHero?.type === "committed" && (
          <div className="mb-4 flex justify-center">
            <button onClick={() => setShowJourneyDetails(prev => !prev)}
              className="mx-auto flex items-center gap-1.5 px-4 py-2 rounded-lg border text-xs font-medium transition-colors hover:bg-white/5"
              style={{ color: "var(--cm-text-3)", borderColor: "var(--cm-border)" }}
              data-testid="toggle-journey-details">
              {showJourneyDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              {showJourneyDetails ? "Hide journey details" : "View full journey"}
            </button>
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

        {/* Questionnaire Status (inline status section — not a hero card) */}
        {program.questionnaire_url && (
          <div className="mb-5 rounded-[18px] border p-5 sm:p-6" style={{ backgroundColor: "#fff", borderColor: "#e7dfd4", boxShadow: "0 2px 8px rgba(80,60,30,0.03), 0 0.5px 2px rgba(80,60,30,0.02)" }} data-testid="questionnaire-section">
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

        {/* J4: Hide remaining content when committed and toggle is off */}
        {(!isCommitted || showJourneyDetails) && (
          <>

        {/* ─── GRID: Timeline + Sidebar ─── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* LEFT: Timeline */}
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[11px] font-extrabold uppercase tracking-[1.5px]" style={{ color: "#6b6358" }}>Timeline</h2>
              <span className="text-[10px] font-medium" style={{ color: "#6b6358" }} data-testid="timeline-count">{timeline.length} interactions</span>
            </div>

            {/* J3: Gmail Connect Nudge */}
            {!gmailConnected && (
              <div className="flex items-start gap-3 rounded-[18px] p-4 mb-4" style={{ backgroundColor: "#fff", border: "1px solid #e7dfd4", boxShadow: "0 2px 8px rgba(80,60,30,0.03), 0 0.5px 2px rgba(80,60,30,0.02)" }} data-testid="gmail-nudge-banner">
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
              <div className="rounded-[18px] border p-5 mb-5" style={{ backgroundColor: "#fff", borderColor: "#e7dfd4", boxShadow: "0 2px 8px rgba(80,60,30,0.03), 0 0.5px 2px rgba(80,60,30,0.02)" }} data-testid="send-profile-card">
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
              <div className="text-center py-16 rounded-[18px] border border-dashed" style={{ backgroundColor: "#fff", borderColor: "#e7dfd4" }} data-testid="empty-timeline">
                <p className="text-sm font-semibold mb-1" style={{ color: "var(--cm-text-2)" }}>No interactions yet</p>
                <p className="text-xs mb-4" style={{ color: "var(--cm-text-3)" }}>Start your journey by reaching out to a coach</p>
                <Button size="sm" onClick={() => { setShowEmail(true); setActiveAction("email"); }}
                  className="bg-teal-700 hover:bg-teal-800 text-white text-xs h-8 px-4"
                  data-testid="empty-timeline-email-btn">
                  <Mail className="w-3.5 h-3.5 mr-1.5" />Send First Email
                </Button>
              </div>
            ) : (
              <div className="space-y-2" data-testid="timeline-list">
                {timeline.map((ev, idx) => (
                  <ConversationBubble key={ev.id || idx} event={ev} />
                ))}
              </div>
            )}
          </div>

          {/* RIGHT: Sidebar — Coach Watch Intelligence Layer */}
          <div className="space-y-4">
            {/* Section 1: Unified Coach Watch V2 (Coach Watch + AI Insight) */}
            <CoachWatchCardV2 insight={autoInsight} loading={autoInsightLoading} coachWatch={coachWatch} />

            {/* Section 1.5: Coaching Stability Badge */}
            <CoachingStabilityBadge
              stability={coachingStability}
              programId={programId}
              onRefreshed={setCoachingStability}
            />

            {/* Section 2: Key Contacts (compact, max 2) */}
            <div className="rounded-[18px] border px-5 py-4" style={{ backgroundColor: "#fff", borderColor: "#e7dfd4", boxShadow: "0 2px 8px rgba(80,60,30,0.03), 0 0.5px 2px rgba(80,60,30,0.02)" }} data-testid="key-contacts-card">
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
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <p className="text-[11px] font-semibold truncate" style={{ color: "var(--cm-text)" }}>{c.coach_name}</p>
                            <span className="text-[9px] flex-shrink-0" style={{ color: "var(--cm-text-3)" }}>{c.role || "Coach"}</span>
                            {coachingStability && (
                              <span
                                className="text-[8px] font-bold px-1.5 py-px rounded-full flex-shrink-0"
                                style={{
                                  color: (STABILITY_CONFIG[coachingStability.change_type] || STABILITY_CONFIG.stable).color,
                                  backgroundColor: (STABILITY_CONFIG[coachingStability.change_type] || STABILITY_CONFIG.stable).bg,
                                  border: `1px solid ${(STABILITY_CONFIG[coachingStability.change_type] || STABILITY_CONFIG.stable).border}`,
                                }}
                                data-testid={`coach-stability-inline-${c.coach_id}`}
                              >
                                {(STABILITY_CONFIG[coachingStability.change_type] || STABILITY_CONFIG.stable).label}
                              </span>
                            )}
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
            <div className="rounded-[18px] border px-5 py-4" style={{ backgroundColor: "#fff", borderColor: "#e7dfd4", boxShadow: "0 2px 8px rgba(80,60,30,0.03), 0 0.5px 2px rgba(80,60,30,0.02)" }} data-testid="communication-activity-card">
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

            {/* Section 5: Explore deeper (School Intelligence drawer) */}
            {isPremium && (
              <div className="rounded-[18px] border px-5 py-4" style={{ backgroundColor: "#fff", borderColor: "#e7dfd4", boxShadow: "0 2px 8px rgba(80,60,30,0.03), 0 0.5px 2px rgba(80,60,30,0.02)" }} data-testid="ai-section">
                <button onClick={() => setSiDrawerOpen(true)}
                  className="w-full flex items-center gap-2 p-2 rounded-lg transition-colors hover:bg-white/[0.02]"
                  style={{ backgroundColor: "var(--cm-surface-2)" }}
                  data-testid="ai-school-insight-btn">
                  <Sparkles className="w-3 h-3 text-[#1a8a80] flex-shrink-0" />
                  <div className="text-left flex-1 min-w-0">
                    <p className="text-[10px] font-semibold" style={{ color: "var(--cm-text)" }}>Explore School Intelligence</p>
                    <p className="text-[8px]" style={{ color: "var(--cm-text-3)" }}>Fit, timing, and strategy analysis</p>
                  </div>
                </button>
              </div>
            )}
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

      {/* School Intelligence Drawer */}
      <SchoolIntelligenceDrawer
        open={siDrawerOpen}
        onClose={() => setSiDrawerOpen(false)}
        matchScore={matchScore}
        signals={signals}
        engagement={engagement}
        coaches={coaches}
        coachWatch={coachWatch}
        timeline={timeline}
        program={program}
        onEmail={openGatedEmail}
        onFollowUp={() => { setShowFollowup(true); setActiveAction("followup"); }}
        onNavigateToSchool={() => {
          const d = matchScore?.domain || program.domain;
          if (d) navigate(`/schools/${d}`);
          else if (program.school_id) navigate(`/schools/${program.school_id}`);
        }}
      />
    </div>
  );
}

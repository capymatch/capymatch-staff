import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import axios from "axios";
import {
  School, ChevronRight, Loader2, ArrowLeft, RefreshCw,
  Activity, User, UserCircle, Send,
  Megaphone
} from "lucide-react";
import { toast } from "sonner";
import UniversityLogo from "../components/UniversityLogo";
import StatusIntelligence from "../components/support-pod/StatusIntelligence";
import EscalationBanner from "../components/support-pod/EscalationBanner";
import { useAuth } from "../AuthContext";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const token = () => localStorage.getItem("capymatch_token");
const authHeaders = () => ({ headers: { Authorization: `Bearer ${token()}` } });

// ─── Profile Completeness Alert ─────────────────────
function ProfileAlert({ completeness, athleteId, athleteName }) {
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  if (!completeness || completeness.score >= 80) return null;
  const isCritical = completeness.score < 50;
  const color = isCritical ? "#ef4444" : "#f59e0b";
  const bg = isCritical ? "rgba(239,68,68,0.04)" : "rgba(245,158,11,0.04)";
  const border = isCritical ? "rgba(239,68,68,0.15)" : "rgba(245,158,11,0.15)";
  const top3 = (completeness.missing || []).slice(0, 3);

  const sendReminder = async () => {
    setSending(true);
    try {
      const missingList = completeness.missing.join(", ");
      await axios.post(`${API}/support-messages`, {
        athlete_id: athleteId,
        subject: "Complete Your Profile",
        body: `Hi ${athleteName || "there"},\n\nYour recruiting profile is ${completeness.score}% complete. To improve your visibility with college coaches, please update the following: ${missingList}.\n\nA complete profile makes a strong first impression. Log in and update your profile when you get a chance!`,
      }, authHeaders());
      setSent(true);
      toast.success("Reminder sent to " + (athleteName || "athlete"));
    } catch {
      toast.error("Failed to send reminder");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="rounded-xl border relative overflow-hidden" style={{ backgroundColor: bg, borderColor: border }} data-testid="profile-alert">
      <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-xl" style={{ backgroundColor: color }} />
      <div className="px-4 py-3 sm:px-5 sm:py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: `${color}12` }}>
              <UserCircle className="w-4.5 h-4.5" style={{ color }} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color }}>
                  Profile {isCritical ? "Incomplete" : "Needs Attention"}
                </span>
              </div>
              <p className="text-sm font-bold mt-0.5" style={{ color: "var(--cm-text, #1e293b)" }}>
                {completeness.score}% complete — {completeness.filled} of {completeness.total} fields
              </p>
              {top3.length > 0 && (
                <p className="text-xs mt-1" style={{ color: "var(--cm-text-3, #94a3b8)" }}>
                  Missing: {top3.join(", ")}{completeness.missing.length > 3 ? ` +${completeness.missing.length - 3} more` : ""}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0 ml-3">
            <button
              onClick={sendReminder}
              disabled={sending || sent}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-colors"
              style={{
                backgroundColor: sent ? "rgba(16,185,129,0.1)" : `${color}12`,
                color: sent ? "#10b981" : color,
                opacity: sending ? 0.6 : 1,
              }}
              data-testid="profile-send-reminder"
            >
              <Send className="w-3 h-3" />
              {sent ? "Sent" : sending ? "Sending..." : "Send Reminder"}
            </button>
            <div className="w-11 h-11 rounded-full flex items-center justify-center" style={{ background: `conic-gradient(${color} ${completeness.score * 3.6}deg, ${color}15 0deg)` }}>
              <div className="w-8 h-8 rounded-full flex items-center justify-center bg-white">
                <span className="text-[11px] font-bold" style={{ color }}>{completeness.score}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── School Row ─────────────────────────────────────
function SchoolRow({ school, athleteId }) {
  const navigate = useNavigate();
  const healthColors = {
    at_risk: { bg: "rgba(239,68,68,0.08)", text: "#ef4444" },
    cooling_off: { bg: "rgba(245,158,11,0.08)", text: "#f59e0b" },
    needs_attention: { bg: "rgba(245,158,11,0.08)", text: "#f59e0b" },
    needs_follow_up: { bg: "rgba(245,158,11,0.08)", text: "#f59e0b" },
    awaiting_reply: { bg: "rgba(59,130,246,0.08)", text: "#3b82f6" },
    active: { bg: "rgba(13,148,136,0.08)", text: "#0d9488" },
    strong_momentum: { bg: "rgba(16,185,129,0.08)", text: "#10b981" },
    still_early: { bg: "rgba(100,116,139,0.08)", text: "#64748b" },
  };
  const c = healthColors[school.health] || healthColors.still_early;

  return (
    <div className="flex items-center gap-3 px-4 py-3 group hover:bg-slate-50/80 transition-colors" data-testid={`school-row-${school.program_id}`}>
      <button
        onClick={() => navigate(`/support-pods/${athleteId}/school/${school.program_id}`)}
        className="flex-1 flex items-center gap-3 text-left min-w-0"
      >
        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 overflow-hidden" style={{ backgroundColor: c.bg }}>
          <UniversityLogo domain={school.domain} name={school.university_name} logoUrl={school.logo_url} size={32} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-xs sm:text-sm font-semibold truncate" style={{ color: "var(--cm-text, #1e293b)" }}>
              {school.university_name}
            </p>
            <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded shrink-0" style={{ backgroundColor: c.bg, color: c.text }}>
              {school.health_label}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-0.5 text-[11px]" style={{ color: "var(--cm-text-3, #94a3b8)" }}>
            <span>{school.recruiting_status}</span>
            <span>·</span>
            <span>{school.reply_status}</span>
            {school.days_since_last_engagement != null && school.days_since_last_engagement < 999 && school.days_since_last_engagement > 0 && (
              <>
                <span>·</span>
                <span>{school.days_since_last_engagement}d ago</span>
              </>
            )}
          </div>
        </div>
      </button>
      <div className="flex items-center gap-1.5 shrink-0">
        <button
          onClick={(e) => { e.stopPropagation(); navigate(`/advocacy/new?athlete=${athleteId}&schoolName=${encodeURIComponent(school.university_name)}`); }}
          className="flex items-center gap-1 px-2 py-1.5 text-[10px] font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-md transition-colors border border-amber-100 opacity-0 group-hover:opacity-100"
          data-testid={`advocate-school-${school.program_id}`}
          title="Send advocacy recommendation"
        >
          <Megaphone className="w-3 h-3" />
          <span className="hidden sm:inline">Advocate</span>
        </button>
        {school.next_action && (
          <span className="hidden sm:block text-[10px] max-w-[160px] truncate px-2 py-1 rounded-lg border" style={{ color: "var(--cm-text-2, #64748b)", borderColor: "var(--cm-border, #e2e8f0)" }}>
            {school.next_action}
          </span>
        )}
        {school.overdue_followups > 0 && (
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-red-50 text-red-600 shrink-0">
            {school.overdue_followups} overdue
          </span>
        )}
        <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 transition-colors shrink-0" />
      </div>
    </div>
  );
}

// ─── Main Page ──────────────────────────────────────
function SupportPod() {
  const { athleteId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const isDirector = user?.role === "director" || user?.role === "platform_admin";
  const escalationId = searchParams.get("escalation");
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [schools, setSchools] = useState([]);
  const [schoolsLoading, setSchoolsLoading] = useState(true);
  const [isPolling, setIsPolling] = useState(false);
  const pollRef = useRef(null);

  const fetchPodData = useCallback(async (showRefresh = false) => {
    if (showRefresh) setIsPolling(true);
    try {
      const res = await axios.get(`${API}/support-pods/${athleteId}`);
      setData(res.data);
    } catch {
      toast.error("Failed to load pod data");
    } finally {
      setLoading(false);
      setIsPolling(false);
    }
  }, [athleteId]);

  const fetchSchools = useCallback(async (refresh = false) => {
    try {
      const token = localStorage.getItem("capymatch_token");
      const res = await axios.get(`${API}/support-pods/${athleteId}/schools${refresh ? "?refresh=true" : ""}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSchools(res.data.schools || []);
    } catch {
      console.error("Failed to load schools");
    } finally {
      setSchoolsLoading(false);
    }
  }, [athleteId]);

  useEffect(() => {
    fetchPodData();
    fetchSchools();
    pollRef.current = setInterval(() => fetchPodData(), 60000);
    return () => clearInterval(pollRef.current);
  }, [fetchPodData, fetchSchools]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen" data-testid="pod-loading">
        <div className="w-6 h-6 border-2 border-slate-300 border-t-slate-800 rounded-full animate-spin" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-center px-4" data-testid="pod-error">
        <p className="text-sm text-slate-500 mb-2">Could not load pod data</p>
        <button onClick={() => fetchPodData(true)} className="text-sm font-medium text-slate-800 underline">Retry</button>
      </div>
    );
  }

  const { athlete, profile_completeness, status_intelligence, escalations } = data;
  const needsAttention = schools.filter(s => ["at_risk", "needs_attention", "cooling_off", "needs_follow_up"].includes(s.health));

  // Find the specific escalation from URL param, or the most recent open one
  const activeEscalation = escalationId
    ? (escalations || []).find(e => e.action_id === escalationId)
    : (escalations || []).find(e => e.status === "open");

  // Header badge — derived from attention status (new unified model)
  const attentionPrimary = status_intelligence?.attention?.primary;
  const headerBadge = attentionPrimary
    ? { label: attentionPrimary.label, dot: attentionPrimary.color, text: attentionPrimary.color, bg: attentionPrimary.bg }
    : { label: "On Track", dot: "#10b981", text: "#10b981", bg: "rgba(16,185,129,0.08)" };

  return (
    <div className="-mx-4 -mt-4 sm:-mx-6 sm:-mt-6 bg-slate-50/30 min-h-screen overflow-x-hidden" data-testid="support-pod-page">
      {/* Header */}
      <header className="bg-white/95 border-b border-gray-100" data-testid="pod-header">
        <div className="px-2 sm:px-4 py-2.5 sm:py-3">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <button
              onClick={() => navigate("/mission-control")}
              className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors shrink-0"
              data-testid="back-to-mc"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Mission Control</span>
            </button>
            <div className="h-5 w-px bg-gray-200 hidden sm:block" />
            <div className="flex items-center gap-3 min-w-0 flex-1">
              {athlete?.photo_url ? (
                <img
                  src={athlete.photo_url}
                  alt={athlete?.full_name}
                  className="w-9 h-9 rounded-full object-cover shrink-0 border border-gray-100"
                  data-testid="pod-athlete-avatar"
                />
              ) : (
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 font-bold text-white text-sm"
                  style={{ backgroundColor: "#0d9488" }}
                  data-testid="pod-athlete-avatar"
                >
                  {(athlete?.full_name || "").split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2)}
                </div>
              )}
              <div className="min-w-0">
                <h1 className="font-semibold text-gray-900 text-sm sm:text-base leading-tight truncate" data-testid="pod-athlete-name">
                  {athlete?.full_name}
                </h1>
                <p className="text-[11px] sm:text-xs text-gray-500 truncate">
                  {athlete?.grad_year} · {athlete?.position} · {athlete?.team}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2 ml-auto">
              <button
                onClick={() => { fetchPodData(true); fetchSchools(true); }}
                disabled={isPolling}
                className="p-1.5 rounded-full hover:bg-gray-100 transition-colors disabled:opacity-50"
                title="Refresh"
                data-testid="manual-refresh-btn"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-gray-400 ${isPolling ? "animate-spin" : ""}`} />
              </button>
              {athleteId && (
                <button
                  onClick={() => navigate(`/internal/athlete/${athleteId}/profile`)}
                  className="flex items-center gap-1.5 px-2 py-1.5 text-xs font-medium text-teal-600 bg-teal-50 hover:bg-teal-100 rounded-full transition-colors"
                  data-testid="pod-view-profile-btn"
                  title="View Profile"
                >
                  <User className="w-3.5 h-3.5" />
                </button>
              )}
              <div className="flex items-center gap-1.5 px-2 py-1 rounded-full" style={{ backgroundColor: headerBadge.bg }} data-testid="pod-health-badge" title={headerBadge.label}>
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: headerBadge.dot }} />
                <Activity className="w-3.5 h-3.5" style={{ color: headerBadge.text }} />
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Content — just hero + schools */}
      <main className="max-w-5xl mx-auto px-2 sm:px-4 py-4 sm:py-5 space-y-4">
        {/* Escalation banner for directors */}
        {activeEscalation && (
          <EscalationBanner
            escalation={activeEscalation}
            athleteId={athleteId}
            onRefresh={() => { fetchPodData(true); fetchSchools(true); }}
            isDirector={isDirector}
          />
        )}

        {/* Status Intelligence — Journey + Attention explanation (authoritative display) */}
        <StatusIntelligence data={status_intelligence} escalations={escalations} />

        {/* Profile Completeness Alert */}
        <ProfileAlert completeness={profile_completeness} athleteId={athleteId} athleteName={athlete?.full_name} />

        {/* Target Schools */}
        <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: "var(--cm-surface, white)", borderColor: "var(--cm-border, #e2e8f0)" }} data-testid="school-list-section">
          <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: "var(--cm-border, #e2e8f0)" }}>
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--cm-text-3, #94a3b8)" }}>Target Schools</h3>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold" style={{ backgroundColor: "var(--cm-surface-2, #f1f5f9)", color: "var(--cm-text-3)" }}>{schools.length}</span>
              {needsAttention.length > 0 && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold bg-red-50 text-red-600">
                  {needsAttention.length} need attention
                </span>
              )}
            </div>
          </div>

          {schoolsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin" style={{ color: "var(--cm-text-3)" }} />
            </div>
          ) : schools.length > 0 ? (
            <div className="divide-y" style={{ borderColor: "var(--cm-border, #e2e8f0)" }}>
              {schools.map(s => <SchoolRow key={s.program_id} school={s} athleteId={athleteId} />)}
            </div>
          ) : (
            <p className="text-xs py-6 text-center" style={{ color: "var(--cm-text-3)" }}>No target schools found</p>
          )}
        </div>
      </main>
    </div>
  );
}

export default SupportPod;

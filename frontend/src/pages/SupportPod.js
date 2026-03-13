import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import {
  School, ChevronRight, Loader2, ArrowLeft, RefreshCw,
  AlertTriangle, Activity, User
} from "lucide-react";
import { toast } from "sonner";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// ─── Athlete-Level Hero (only for athlete-level issues) ─────
function AthleteHero({ currentIssue, signals }) {
  // No issue and no critical signals → don't show hero at all
  const hasCriticalSignals = (signals || []).some(s => s.priority === "critical" || s.priority === "high");
  if (!currentIssue && !hasCriticalSignals) return null;

  const issue = currentIssue;
  const worst = !issue ? (signals || []).find(s => s.priority === "critical") || (signals || []).find(s => s.priority === "high") : null;
  const isCritical = issue?.severity === "critical" || worst?.priority === "critical";
  const color = isCritical ? "#dc2626" : "#d97706";

  return (
    <div className="rounded-xl border relative overflow-hidden" style={{
      backgroundColor: isCritical ? "rgba(239,68,68,0.04)" : "rgba(245,158,11,0.04)",
      borderColor: isCritical ? "rgba(239,68,68,0.15)" : "rgba(245,158,11,0.15)",
    }} data-testid="athlete-hero">
      <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-xl" style={{ backgroundColor: color }} />
      <div className="px-4 py-3 sm:px-5 sm:py-4">
        <div className="flex items-center gap-2 mb-1">
          {isCritical && <span className="w-1.5 h-1.5 rounded-full animate-pulse bg-red-500" />}
          <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color }}>
            {issue ? `${issue.severity}` : "Athlete-Level Alert"}
          </span>
        </div>
        <h2 className="text-sm sm:text-base font-bold" style={{ color: "var(--cm-text, #1e293b)" }} data-testid="athlete-hero-title">
          {issue?.title || worst?.title || "Needs Attention"}
        </h2>
        <p className="text-xs mt-1" style={{ color: "var(--cm-text-3, #94a3b8)" }}>
          {issue?.description || worst?.description || "Review the signals and take action."}
        </p>
      </div>
    </div>
  );
}

// ─── School Row ─────────────────────────────────────
function SchoolRow({ school, athleteId }) {
  const navigate = useNavigate();
  const healthColors = {
    at_risk: { bg: "rgba(239,68,68,0.08)", text: "#ef4444" },
    needs_attention: { bg: "rgba(245,158,11,0.08)", text: "#f59e0b" },
    awaiting_reply: { bg: "rgba(59,130,246,0.08)", text: "#3b82f6" },
    active: { bg: "rgba(13,148,136,0.08)", text: "#0d9488" },
    strong_momentum: { bg: "rgba(16,185,129,0.08)", text: "#10b981" },
    still_early: { bg: "rgba(100,116,139,0.08)", text: "#64748b" },
  };
  const c = healthColors[school.health] || healthColors.still_early;

  return (
    <button
      onClick={() => navigate(`/support-pods/${athleteId}/school/${school.program_id}`)}
      className="w-full flex items-center gap-3 px-4 py-3 text-left group hover:bg-slate-50/80 transition-colors"
      data-testid={`school-row-${school.program_id}`}
    >
      <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: c.bg }}>
        <School className="w-4 h-4" style={{ color: c.text }} />
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
          {school.days_since_last_engagement != null && (
            <>
              <span>·</span>
              <span>{school.days_since_last_engagement}d ago</span>
            </>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
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
    </button>
  );
}

// ─── Main Page ──────────────────────────────────────
function SupportPod() {
  const { athleteId } = useParams();
  const navigate = useNavigate();
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

  const { athlete, current_issue, recruiting_signals, pod_health } = data;
  const needsAttention = schools.filter(s => s.health === "at_risk" || s.health === "needs_attention");

  // Health badge config
  const healthMap = {
    healthy: { label: "On Track", dot: "bg-emerald-400", text: "text-emerald-600", bg: "bg-emerald-50" },
    monitor: { label: "Monitor", dot: "bg-amber-400", text: "text-amber-600", bg: "bg-amber-50" },
    at_risk: { label: "At Risk", dot: "bg-red-500", text: "text-red-600", bg: "bg-red-50" },
  };
  const health = healthMap[pod_health] || healthMap.monitor;

  return (
    <div className="-mx-4 -mt-4 sm:-mx-6 sm:-mt-6 bg-slate-50/30 min-h-screen overflow-x-hidden" data-testid="support-pod-page">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-100" data-testid="pod-header">
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
            <div className="min-w-0 flex-1">
              <h1 className="font-semibold text-gray-900 text-sm sm:text-base leading-tight truncate" data-testid="pod-athlete-name">
                {athlete?.full_name}
              </h1>
              <p className="text-[11px] sm:text-xs text-gray-500 truncate">
                {athlete?.grad_year} · {athlete?.position} · {athlete?.team}
              </p>
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
              <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full ${health.bg}`} data-testid="pod-health-badge" title={health.label}>
                <div className={`w-2 h-2 rounded-full ${health.dot}`} />
                <Activity className={`w-3.5 h-3.5 ${health.text}`} />
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Content — just hero + schools */}
      <main className="max-w-5xl mx-auto px-2 sm:px-4 py-4 sm:py-5 space-y-4">
        {/* Athlete-level hero (only shows if there's an issue or critical signals) */}
        <AthleteHero currentIssue={current_issue} signals={recruiting_signals} />

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

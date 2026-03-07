import { useState, useEffect } from "react";
import axios from "axios";
import {
  Users, Clock, Zap, AlertTriangle, CheckCircle,
  ChevronDown, ChevronUp, UserCheck,
} from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const STATUS_CONFIG = {
  pending: {
    label: "Pending",
    bg: "bg-slate-100",
    text: "text-slate-600",
    dot: "bg-slate-400",
    icon: Clock,
  },
  activating: {
    label: "Activating",
    bg: "bg-amber-50",
    text: "text-amber-700",
    dot: "bg-amber-400",
    icon: Zap,
  },
  active: {
    label: "Active",
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    dot: "bg-emerald-500",
    icon: CheckCircle,
  },
  needs_support: {
    label: "Needs Support",
    bg: "bg-red-50",
    text: "text-red-700",
    dot: "bg-red-500",
    icon: AlertTriangle,
  },
};

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold rounded-full ${cfg.bg} ${cfg.text}`}
      data-testid={`activation-status-${status}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

function formatDate(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  } catch {
    return "—";
  }
}

function formatAgo(iso) {
  if (!iso) return "Never";
  try {
    const d = new Date(iso);
    const now = new Date();
    const days = Math.floor((now - d) / 86400000);
    if (days === 0) return "Today";
    if (days === 1) return "Yesterday";
    if (days < 7) return `${days}d ago`;
    if (days < 30) return `${Math.floor(days / 7)}w ago`;
    return formatDate(iso);
  } catch {
    return "—";
  }
}

export default function CoachActivationPanel() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await axios.get(`${API}/roster/activation`);
        setData(res.data);
        // Auto-expand if there are coaches needing support
        if (res.data.summary?.needs_support > 0) setExpanded(true);
      } catch { /* silent */ }
      finally { setLoading(false); }
    })();
  }, []);

  if (loading || !data) return null;

  const { coaches, summary } = data;
  if (coaches.length === 0) return null;

  const summaryParts = [];
  if (summary.active > 0) summaryParts.push(`${summary.active} active`);
  if (summary.activating > 0) summaryParts.push(`${summary.activating} activating`);
  if (summary.pending > 0) summaryParts.push(`${summary.pending} pending`);
  if (summary.needs_support > 0) summaryParts.push(`${summary.needs_support} needs support`);

  return (
    <div className="mb-6" data-testid="coach-activation-panel">
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        {/* Header */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-slate-50/50 transition-colors"
          data-testid="activation-panel-toggle"
        >
          <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center shrink-0">
            <UserCheck className="w-4 h-4 text-slate-600" />
          </div>
          <div className="flex-1 text-left">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-slate-800">Coach Activation</span>
              {summary.needs_support > 0 && (
                <span className="text-[10px] font-medium text-red-600 bg-red-50 px-1.5 py-0.5 rounded-full">
                  {summary.needs_support} need{summary.needs_support !== 1 ? "" : "s"} support
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">{summaryParts.join(" · ")}</p>
          </div>
          {expanded ? (
            <ChevronUp className="w-4 h-4 text-slate-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-400" />
          )}
        </button>

        {/* Coach list */}
        {expanded && (
          <div className="border-t border-gray-100" data-testid="activation-coach-list">
            {/* Column headers */}
            <div className="grid grid-cols-12 gap-2 px-5 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-gray-50">
              <div className="col-span-3">Coach</div>
              <div className="col-span-1 text-center">Status</div>
              <div className="col-span-1 text-center">Accepted</div>
              <div className="col-span-2 text-center">Onboarding</div>
              <div className="col-span-1 text-center">Athletes</div>
              <div className="col-span-2 text-center">First Activity</div>
              <div className="col-span-2 text-center">Last Active</div>
            </div>

            {coaches.map((coach) => (
              <div
                key={coach.id}
                className={`grid grid-cols-12 gap-2 px-5 py-3 items-center border-b border-gray-50 last:border-0 transition-colors
                  ${coach.status === "needs_support" ? "bg-red-50/30" : "hover:bg-slate-50/50"}`}
                data-testid={`activation-coach-${coach.id}`}
              >
                {/* Name + email */}
                <div className="col-span-3 min-w-0">
                  <div className="text-sm font-medium text-slate-800 truncate">{coach.name}</div>
                  <div className="text-[11px] text-slate-400 truncate">{coach.email}</div>
                </div>

                {/* Status */}
                <div className="col-span-1 flex justify-center">
                  <StatusBadge status={coach.status} />
                </div>

                {/* Accepted date */}
                <div className="col-span-1 text-center text-[11px] text-slate-500">
                  {coach.invite_status === "pending" ? (
                    <span className="text-slate-300">Waiting</span>
                  ) : (
                    formatDate(coach.accepted_at || coach.created_at)
                  )}
                </div>

                {/* Onboarding progress */}
                <div className="col-span-2 flex items-center justify-center gap-2">
                  <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        coach.onboarding_progress >= coach.onboarding_total
                          ? "bg-emerald-500"
                          : coach.onboarding_progress > 0
                            ? "bg-amber-400"
                            : "bg-slate-200"
                      }`}
                      style={{ width: `${(coach.onboarding_progress / coach.onboarding_total) * 100}%` }}
                    />
                  </div>
                  <span className="text-[11px] text-slate-500 tabular-nums">
                    {coach.onboarding_progress}/{coach.onboarding_total}
                  </span>
                </div>

                {/* Athlete count */}
                <div className="col-span-1 text-center">
                  <span className={`text-sm font-medium ${coach.athlete_count > 0 ? "text-slate-700" : "text-slate-300"}`}>
                    {coach.athlete_count}
                  </span>
                </div>

                {/* First activity */}
                <div className="col-span-2 text-center text-[11px] text-slate-500">
                  {coach.has_first_activity ? (
                    formatDate(coach.first_activity_at)
                  ) : (
                    <span className="text-slate-300">None yet</span>
                  )}
                </div>

                {/* Last active */}
                <div className="col-span-2 text-center text-[11px]">
                  <span className={
                    !coach.last_active ? "text-slate-300"
                    : formatAgo(coach.last_active) === "Today" ? "text-emerald-600 font-medium"
                    : "text-slate-500"
                  }>
                    {formatAgo(coach.last_active)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

import { useState, useEffect } from "react";
import axios from "axios";
import {
  Users, Clock, Zap, AlertTriangle, CheckCircle,
  ChevronDown, ChevronUp, UserCheck, Send, X, Mail,
} from "lucide-react";
import { toast } from "sonner";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const STATUS_CONFIG = {
  pending: {
    label: "Pending",
    bg: "bg-slate-100",
    text: "text-slate-600",
    dot: "bg-slate-400",
  },
  activating: {
    label: "Activating",
    bg: "bg-amber-50",
    text: "text-amber-700",
    dot: "bg-amber-400",
  },
  active: {
    label: "Active",
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    dot: "bg-emerald-500",
  },
  needs_support: {
    label: "Needs Support",
    bg: "bg-red-50",
    text: "text-red-700",
    dot: "bg-red-500",
  },
};

const REASON_PRESETS = [
  { key: "onboarding_incomplete", label: "Onboarding incomplete" },
  { key: "no_recent_activity", label: "No recent activity" },
  { key: "needs_help", label: "Needs help getting started" },
  { key: "custom", label: "Custom" },
];

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

function hoursAgo(iso) {
  if (!iso) return Infinity;
  try {
    return (Date.now() - new Date(iso).getTime()) / 3600000;
  } catch {
    return Infinity;
  }
}

function NudgeModal({ coach, directorName, onClose, onSent }) {
  const [reason, setReason] = useState("onboarding_incomplete");
  const [subject, setSubject] = useState(`Quick check-in from ${directorName}`);
  const [message, setMessage] = useState(
    `Hi ${coach.name},\n\nJust wanted to check in and see how things are going. If you need any help getting set up or have questions about your athletes, I'm here to help.\n\nFeel free to log in anytime — your team is waiting for you at CapyMatch.\n\nBest,\n${directorName}`
  );
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!subject.trim() || !message.trim()) {
      toast.error("Subject and message are required");
      return;
    }
    setSending(true);
    try {
      const res = await axios.post(`${API}/roster/nudge`, {
        coach_id: coach.id,
        subject,
        message,
        reason,
      });
      if (res.data.status === "sent") {
        toast.success(`Check-in sent to ${coach.name}`);
      } else {
        toast.warning(`Nudge created but email delivery failed`);
      }
      onSent();
    } catch (err) {
      const detail = err.response?.data?.detail || "Failed to send";
      toast.error(detail);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-xl max-w-lg w-full overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        data-testid="nudge-modal"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-slate-100 rounded-full flex items-center justify-center">
              <Mail className="w-3.5 h-3.5 text-slate-600" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-900">Send check-in to {coach.name}</h3>
              <p className="text-[11px] text-gray-400">{coach.email}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 rounded" data-testid="nudge-close-btn">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-3">
          {/* Reason preset */}
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Reason</label>
            <div className="flex flex-wrap gap-1.5">
              {REASON_PRESETS.map((r) => (
                <button
                  key={r.key}
                  onClick={() => setReason(r.key)}
                  className={`px-2.5 py-1 text-[11px] rounded-full border transition-colors ${
                    reason === r.key
                      ? "bg-slate-900 text-white border-slate-900"
                      : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
                  }`}
                  data-testid={`nudge-reason-${r.key}`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          {/* Subject */}
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Subject</label>
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-300"
              data-testid="nudge-subject-input"
            />
          </div>

          {/* Message */}
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Message</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={7}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-300 resize-none leading-relaxed"
              data-testid="nudge-message-input"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 bg-gray-50/50">
          <p className="text-[10px] text-gray-400">Sent via Resend · Coach can reply to this email</p>
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700" data-testid="nudge-cancel-btn">
              Cancel
            </button>
            <button
              onClick={handleSend}
              disabled={sending}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium bg-slate-900 text-white rounded-lg hover:bg-slate-800 disabled:opacity-50 transition-colors"
              data-testid="nudge-send-btn"
            >
              {sending ? (
                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white" />
              ) : (
                <Send className="w-3 h-3" />
              )}
              {sending ? "Sending..." : "Send Check-in"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CoachActivationPanel({ directorName }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [nudgeTarget, setNudgeTarget] = useState(null);

  const fetchData = async () => {
    try {
      const res = await axios.get(`${API}/roster/activation`);
      setData(res.data);
      if (res.data.summary?.needs_support > 0) setExpanded(true);
    } catch { /* silent */ }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  if (loading || !data) return null;

  const { coaches, summary } = data;
  if (coaches.length === 0) return null;

  const summaryParts = [];
  if (summary.active > 0) summaryParts.push(`${summary.active} active`);
  if (summary.activating > 0) summaryParts.push(`${summary.activating} activating`);
  if (summary.pending > 0) summaryParts.push(`${summary.pending} pending`);
  if (summary.needs_support > 0) summaryParts.push(`${summary.needs_support} needs support`);

  const canNudge = (coach) =>
    coach.status === "needs_support" || coach.status === "activating";

  const inCooldown = (coach) =>
    coach.last_nudge_at && hoursAgo(coach.last_nudge_at) < 24;

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
              <div className="col-span-1 text-center">Onboarding</div>
              <div className="col-span-1 text-center">Athletes</div>
              <div className="col-span-1 text-center">Last Active</div>
              <div className="col-span-2 text-center">Last Nudge</div>
              <div className="col-span-3 text-center">Action</div>
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

                {/* Onboarding progress */}
                <div className="col-span-1 flex items-center justify-center gap-1.5">
                  <div className="w-10 h-1.5 bg-slate-100 rounded-full overflow-hidden">
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
                  <span className="text-[10px] text-slate-500 tabular-nums">
                    {coach.onboarding_progress}/{coach.onboarding_total}
                  </span>
                </div>

                {/* Athlete count */}
                <div className="col-span-1 text-center">
                  <span className={`text-sm font-medium ${coach.athlete_count > 0 ? "text-slate-700" : "text-slate-300"}`}>
                    {coach.athlete_count}
                  </span>
                </div>

                {/* Last active */}
                <div className="col-span-1 text-center text-[11px]">
                  <span className={
                    !coach.last_active ? "text-slate-300"
                    : formatAgo(coach.last_active) === "Today" ? "text-emerald-600 font-medium"
                    : "text-slate-500"
                  }>
                    {formatAgo(coach.last_active)}
                  </span>
                </div>

                {/* Last nudge */}
                <div className="col-span-2 text-center text-[11px]">
                  {coach.last_nudge_at ? (
                    <span className={`inline-flex items-center gap-1 ${
                      coach.last_nudge_status === "sent" ? "text-slate-500" : "text-red-400"
                    }`}>
                      <Mail className="w-3 h-3" />
                      {formatAgo(coach.last_nudge_at)}
                      {coach.last_nudge_status === "failed" && (
                        <span className="text-red-400 text-[9px]">(failed)</span>
                      )}
                    </span>
                  ) : (
                    <span className="text-slate-300">—</span>
                  )}
                </div>

                {/* Nudge action */}
                <div className="col-span-3 flex justify-center">
                  {canNudge(coach) ? (
                    inCooldown(coach) ? (
                      <span className="text-[10px] text-slate-400 bg-slate-50 px-2 py-1 rounded" data-testid={`nudge-cooldown-${coach.id}`}>
                        Sent {formatAgo(coach.last_nudge_at)}
                      </span>
                    ) : (
                      <button
                        onClick={() => setNudgeTarget(coach)}
                        className="flex items-center gap-1 px-3 py-1.5 text-[11px] font-medium text-slate-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors"
                        data-testid={`nudge-btn-${coach.id}`}
                      >
                        <Send className="w-3 h-3" />
                        Nudge
                      </button>
                    )
                  ) : (
                    <span className="text-[10px] text-slate-300">—</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Nudge modal */}
      {nudgeTarget && (
        <NudgeModal
          coach={nudgeTarget}
          directorName={directorName || "Director"}
          onClose={() => setNudgeTarget(null)}
          onSent={() => { setNudgeTarget(null); fetchData(); }}
        />
      )}
    </div>
  );
}

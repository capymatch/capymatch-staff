import { useState } from "react";
import { AlertTriangle, ShieldAlert, Clock, Zap, Users, Target, CheckCircle, MessageSquare, ClipboardCheck, Send, ArrowRight, UserPlus, Loader2 } from "lucide-react";
import axios from "axios";
import { toast } from "sonner";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const URGENCY_STYLE = {
  critical: {
    bg: "rgba(239,68,68,0.06)",
    border: "rgba(239,68,68,0.18)",
    accent: "#ef4444",
    accentBg: "rgba(239,68,68,0.10)",
    pulse: true,
  },
  follow_up: {
    bg: "rgba(245,158,11,0.05)",
    border: "rgba(245,158,11,0.15)",
    accent: "#f59e0b",
    accentBg: "rgba(245,158,11,0.10)",
    pulse: false,
  },
  on_track: {
    bg: "rgba(16,185,129,0.04)",
    border: "rgba(16,185,129,0.15)",
    accent: "#10b981",
    accentBg: "rgba(16,185,129,0.10)",
    pulse: false,
  },
};

const CATEGORY_ICON = {
  blocker: ShieldAlert,
  momentum_drop: Zap,
  past_due: Clock,
  deadline_proximity: Clock,
  engagement_drop: AlertTriangle,
  ownership_gap: Users,
  family_inactive: MessageSquare,
  readiness_issue: Target,
  on_track: CheckCircle,
};

const CTA_ICON = {
  "Resolve Blocker": ShieldAlert,
  "Log Check-In": ClipboardCheck,
  "View Actions": Clock,
  "Prep Now": Clock,
  "Send Follow-Up": Send,
  "Assign Actions": Users,
  "Message Family": MessageSquare,
  "Review Profile": Target,
  "View Details": ArrowRight,
};

const QUICK_RESOLVE_ICON = {
  "Assign Owner": UserPlus,
  "Assign Coach": UserPlus,
  "Assign Follow-up": UserPlus,
  "Mark Fixed": CheckCircle,
};

export default function PodHeroCard({ topAction, athleteId, onLogCheckin, onSendMessage, onEscalate, onRefresh }) {
  const [resolving, setResolving] = useState(false);

  if (!topAction) return null;

  const style = URGENCY_STYLE[topAction.urgency] || URGENCY_STYLE.follow_up;
  const CategoryIcon = CATEGORY_ICON[topAction.category] || AlertTriangle;
  const CtaIcon = CTA_ICON[topAction.cta_label] || ArrowRight;
  const isOnTrack = topAction.urgency === "on_track";
  const qr = topAction.quick_resolve;

  const handleCta = () => {
    if (topAction.category === "momentum_drop" || topAction.category === "family_inactive") {
      onSendMessage?.();
    } else if (topAction.category === "past_due") {
      const el = document.querySelector('[data-testid="next-actions"]');
      el?.scrollIntoView({ behavior: "smooth", block: "start" });
    } else {
      onLogCheckin?.();
    }
  };

  const handleQuickResolve = async () => {
    if (!qr || resolving) return;
    setResolving(true);
    try {
      const res = await axios.post(`${API}/support-pods/${athleteId}/quick-resolve`, {
        action: qr.action,
        target_ids: qr.target_ids,
      });
      const data = res.data;
      toast.success(`Done — ${data.updated_count} action${data.updated_count !== 1 ? "s" : ""} assigned to ${data.assigned_to}`);
      onRefresh?.();
    } catch {
      toast.error("Quick resolve failed");
    } finally {
      setResolving(false);
    }
  };

  return (
    <div
      data-testid="pod-hero-card"
      className="rounded-xl border overflow-hidden"
      style={{ backgroundColor: style.bg, borderColor: style.border }}
    >
      <div className="px-4 sm:px-6 py-4 sm:py-5">
        {/* Top row: urgency badge + issue type */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2.5">
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
              style={{ backgroundColor: style.accentBg }}
            >
              <CategoryIcon className="w-4.5 h-4.5" style={{ color: style.accent }} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                {style.pulse && (
                  <span className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: style.accent }} />
                )}
                <span
                  className="text-[10px] font-bold uppercase tracking-wider"
                  style={{ color: style.accent }}
                >
                  {topAction.urgency === "critical" ? "Critical" : topAction.urgency === "follow_up" ? "Needs Attention" : "On Track"}
                </span>
              </div>
              <p className="text-xs mt-0.5" style={{ color: "var(--cm-text-3, #94a3b8)" }}>
                {topAction.issue_type}
              </p>
            </div>
          </div>

          {/* Owner badge */}
          <span
            className="text-[10px] font-semibold px-2.5 py-1 rounded-full shrink-0"
            style={{ backgroundColor: "rgba(0,0,0,0.04)", color: "var(--cm-text-2, #64748b)" }}
          >
            {topAction.owner === "coach" ? "Coach" : topAction.owner === "shared" ? "Shared" : topAction.owner === "athlete" ? "Athlete" : topAction.owner}
          </span>
        </div>

        {/* Main action + explanation */}
        <h2
          className="text-base sm:text-lg font-bold leading-snug"
          style={{ color: "var(--cm-text, #1e293b)" }}
          data-testid="pod-hero-action"
        >
          {topAction.top_action}
        </h2>
        <p
          className="text-sm mt-1 leading-relaxed"
          style={{ color: "var(--cm-text-2, #64748b)" }}
          data-testid="pod-hero-explanation"
        >
          {topAction.explanation}
        </p>

        {/* CTA buttons */}
        {!isOnTrack && (
          <div className="flex items-center gap-2 mt-4 flex-wrap">
            {qr ? (
              <button
                onClick={handleQuickResolve}
                disabled={resolving}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-all hover:shadow-lg disabled:opacity-50"
                style={{ backgroundColor: style.accent }}
                data-testid="pod-hero-quick-resolve"
              >
                {resolving
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : (() => { const QrIcon = QUICK_RESOLVE_ICON[qr.label] || CheckCircle; return <QrIcon className="w-4 h-4" />; })()
                }
                {resolving ? "Resolving..." : qr.label}
              </button>
            ) : (
              <button
                onClick={handleCta}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-all hover:shadow-lg"
                style={{ backgroundColor: style.accent }}
                data-testid="pod-hero-cta"
              >
                <CtaIcon className="w-4 h-4" />
                {topAction.cta_label}
              </button>
            )}

            {topAction.urgency === "critical" && (
              <button
                onClick={onEscalate}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors hover:bg-slate-100"
                style={{ color: "var(--cm-text-3, #94a3b8)", border: "1px solid var(--cm-border, #e2e8f0)" }}
                data-testid="pod-hero-escalate"
              >
                Escalate
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

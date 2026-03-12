import { useState } from "react";
import { CheckCircle2, ArrowUpRight, MessageSquare, Phone, FileText } from "lucide-react";
import axios from "axios";
import { toast } from "sonner";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const SEVERITY_CONFIG = {
  critical: {
    color: "#dc2626",
    bg: "rgba(239,68,68,0.04)",
    border: "rgba(239,68,68,0.15)",
    barColor: "#dc2626",
    label: "Critical",
    dot: true,
  },
  high: {
    color: "#d97706",
    bg: "rgba(245,158,11,0.04)",
    border: "rgba(245,158,11,0.15)",
    barColor: "#d97706",
    label: "Needs Attention",
    dot: false,
  },
  medium: {
    color: "#3b82f6",
    bg: "rgba(59,130,246,0.04)",
    border: "rgba(59,130,246,0.12)",
    barColor: "#3b82f6",
    label: "Monitor",
    dot: false,
  },
};

// ─── Healthy State ─────────────────────────────────
function HealthyHero({ onAddNote, onLogInteraction }) {
  return (
    <div
      data-testid="pod-hero-card"
      className="rounded-xl border relative overflow-hidden"
      style={{ backgroundColor: "rgba(16,185,129,0.03)", borderColor: "rgba(16,185,129,0.15)" }}
    >
      <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-xl" style={{ backgroundColor: "#10b981" }} />
      <div className="px-4 py-3 sm:px-5 sm:py-4">
        <div className="flex items-center gap-2.5 mb-2 sm:mb-0 sm:flex-row sm:justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <CheckCircle2 className="w-5 h-5 shrink-0" style={{ color: "#10b981" }} />
            <div className="min-w-0">
              <h2 className="text-sm font-bold" style={{ color: "var(--cm-text, #1e293b)" }} data-testid="pod-hero-title">
                On Track
              </h2>
              <p className="text-xs mt-0.5" style={{ color: "var(--cm-text-3, #94a3b8)" }} data-testid="pod-hero-description">
                No urgent intervention needed. Athlete momentum is healthy.
              </p>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-2 shrink-0">
            <button
              onClick={onLogInteraction}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border"
              style={{ color: "var(--cm-text-2, #64748b)", backgroundColor: "var(--cm-surface, white)", borderColor: "var(--cm-border, #e2e8f0)" }}
              data-testid="pod-hero-log-interaction"
            >
              <Phone className="w-3.5 h-3.5" />
              Log Interaction
            </button>
            <button
              onClick={onAddNote}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border"
              style={{ color: "var(--cm-text-2, #64748b)", backgroundColor: "var(--cm-surface, white)", borderColor: "var(--cm-border, #e2e8f0)" }}
              data-testid="pod-hero-add-note"
            >
              <FileText className="w-3.5 h-3.5" />
              Add Note
            </button>
          </div>
        </div>
        <div className="flex sm:hidden gap-2 mt-2 pl-7">
          <button
            onClick={onLogInteraction}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border"
            style={{ color: "var(--cm-text-2, #64748b)", backgroundColor: "var(--cm-surface, white)", borderColor: "var(--cm-border, #e2e8f0)" }}
            data-testid="pod-hero-log-interaction-mobile"
          >
            <Phone className="w-3.5 h-3.5" />
            Log Interaction
          </button>
          <button
            onClick={onAddNote}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border"
            style={{ color: "var(--cm-text-2, #64748b)", backgroundColor: "var(--cm-surface, white)", borderColor: "var(--cm-border, #e2e8f0)" }}
            data-testid="pod-hero-add-note-mobile"
          >
            <FileText className="w-3.5 h-3.5" />
            Add Note
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Active Issue State ────────────────────────────
function ActiveIssueHero({ issue, athleteId, onLogCheckin, onSendMessage, onEscalate, onResolve, onRefresh }) {
  const [resolving, setResolving] = useState(false);
  const cfg = SEVERITY_CONFIG[issue.severity] || SEVERITY_CONFIG.high;

  const handleManualResolve = async () => {
    setResolving(true);
    try {
      await axios.post(`${API}/support-pods/${athleteId}/issues/${issue.id}/resolve`, {});
      toast.success("Issue resolved");
      onRefresh?.();
    } catch {
      toast.error("Failed to resolve issue");
    } finally {
      setResolving(false);
    }
  };

  // Determine primary CTA based on issue type
  const getCta = () => {
    switch (issue.type) {
      case "momentum_drop":
        return { label: "Log Check-In", icon: Phone, action: onLogCheckin };
      case "engagement_drop":
      case "follow_up_overdue":
        return { label: "Send Message", icon: MessageSquare, action: onSendMessage };
      default:
        return { label: "Log Check-In", icon: Phone, action: onLogCheckin };
    }
  };
  const cta = getCta();

  // Build context string from source_context
  const contextStr = (() => {
    const ctx = issue.source_context || {};
    if (ctx.days_inactive) return `No activity in ${ctx.days_inactive} days`;
    if (ctx.count) return `${ctx.count} action${ctx.s || "s"}`;
    if (ctx.detail) return ctx.detail;
    return "";
  })();

  return (
    <div
      data-testid="pod-hero-card"
      className="rounded-xl border relative overflow-hidden"
      style={{ backgroundColor: cfg.bg, borderColor: cfg.border }}
    >
      <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-xl" style={{ backgroundColor: cfg.barColor }} />
      <div className="px-4 py-3 sm:px-5 sm:py-4">
        {/* Urgency line */}
        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
          {cfg.dot && <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: cfg.color }} />}
          <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: cfg.color }}>
            {cfg.label}
          </span>
          {contextStr && (
            <>
              <span className="text-[10px]" style={{ color: "var(--cm-text-4, #cbd5e1)" }}>·</span>
              <span className="text-[10px]" style={{ color: "var(--cm-text-3, #94a3b8)" }}>{contextStr}</span>
            </>
          )}
          {issue.instance_number > 1 && (
            <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded" style={{ backgroundColor: "rgba(139,92,246,0.08)", color: "#8b5cf6" }}>
              Instance #{issue.instance_number}
            </span>
          )}
        </div>

        {/* Title + Description */}
        <div>
          <h2 className="text-sm sm:text-base font-bold leading-snug" style={{ color: "var(--cm-text, #1e293b)" }} data-testid="pod-hero-title">
            {issue.title}
          </h2>
          <p className="text-xs mt-1 leading-relaxed" style={{ color: "var(--cm-text-3, #94a3b8)" }} data-testid="pod-hero-description">
            {issue.description}
          </p>
        </div>

        {/* Actions — stacked on mobile, inline on desktop */}
        <div className="flex flex-wrap items-center gap-2 mt-3">
          <button
            onClick={cta.action}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold text-white transition-all hover:opacity-90"
            style={{ backgroundColor: cfg.color }}
            data-testid="pod-hero-cta"
          >
            <cta.icon className="w-3.5 h-3.5" />
            {cta.label}
          </button>
          {issue.severity === "critical" && (
            <button
              onClick={onEscalate}
              className="inline-flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-medium transition-colors border"
              style={{ color: "var(--cm-text-2, #64748b)", backgroundColor: "var(--cm-surface, white)", borderColor: "var(--cm-border, #e2e8f0)" }}
              data-testid="pod-hero-escalate"
            >
              <ArrowUpRight className="w-3.5 h-3.5" />
              Escalate
            </button>
          )}
          <button
            onClick={handleManualResolve}
            disabled={resolving}
            className="px-3 py-2 rounded-lg text-xs font-medium transition-colors border disabled:opacity-50"
            style={{ color: "var(--cm-text-3, #94a3b8)", backgroundColor: "transparent", borderColor: "var(--cm-border, #e2e8f0)" }}
            data-testid="pod-hero-resolve"
          >
            {resolving ? "Resolving..." : "Resolve"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Export ────────────────────────────────────
export default function PodHeroCard({ currentIssue, athleteId, onLogCheckin, onSendMessage, onEscalate, onOpenNotes, onRefresh }) {
  if (!currentIssue) {
    return <HealthyHero onLogInteraction={onLogCheckin} onAddNote={onOpenNotes} />;
  }

  return (
    <ActiveIssueHero
      issue={currentIssue}
      athleteId={athleteId}
      onLogCheckin={onLogCheckin}
      onSendMessage={onSendMessage}
      onEscalate={onEscalate}
      onRefresh={onRefresh}
    />
  );
}

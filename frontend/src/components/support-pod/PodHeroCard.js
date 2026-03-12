import { useState } from "react";
import { Loader2, UserPlus, CheckCircle } from "lucide-react";
import axios from "axios";
import { toast } from "sonner";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const URGENCY = {
  critical: { label: "Critical", color: "#dc2626", bg: "rgba(239,68,68,0.04)", border: "rgba(239,68,68,0.15)", dot: true },
  follow_up: { label: "Needs Attention", color: "#d97706", bg: "rgba(245,158,11,0.04)", border: "rgba(245,158,11,0.15)", dot: false },
  on_track: { label: "On Track", color: "#059669", bg: "rgba(16,185,129,0.04)", border: "rgba(16,185,129,0.15)", dot: false },
};

export default function PodHeroCard({ topAction, athleteId, onLogCheckin, onSendMessage, onEscalate, onRefresh }) {
  const [resolving, setResolving] = useState(false);

  if (!topAction) return null;

  const u = URGENCY[topAction.urgency] || URGENCY.follow_up;
  const qr = topAction.quick_resolve;
  const isOnTrack = topAction.urgency === "on_track";

  const handleCta = () => {
    if (topAction.category === "momentum_drop") onSendMessage?.();
    else if (topAction.category === "past_due") document.querySelector('[data-testid="next-actions"]')?.scrollIntoView({ behavior: "smooth" });
    else onLogCheckin?.();
  };

  const handleQuickResolve = async () => {
    if (!qr || resolving) return;
    setResolving(true);
    try {
      const { data } = await axios.post(`${API}/support-pods/${athleteId}/quick-resolve`, { action: qr.action, target_ids: qr.target_ids });
      toast.success(`Done — ${data.updated_count} action${data.updated_count !== 1 ? "s" : ""} assigned to ${data.assigned_to}`);
      onRefresh?.();
    } catch { toast.error("Quick resolve failed"); }
    finally { setResolving(false); }
  };

  return (
    <div data-testid="pod-hero-card" className="rounded-xl border" style={{ backgroundColor: u.bg, borderColor: u.border }}>
      <div className="px-4 py-3.5">
        {/* Urgency badge + issue type — compact single line */}
        <div className="flex items-center gap-2 mb-2">
          {u.dot && <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: u.color }} />}
          <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: u.color }}>
            {u.label}
          </span>
          <span className="text-[10px]" style={{ color: "var(--cm-text-3, #94a3b8)" }}>·</span>
          <span className="text-[10px]" style={{ color: "var(--cm-text-3, #94a3b8)" }}>
            {topAction.issue_type}
          </span>
        </div>

        {/* Top action + CTA — same row on desktop */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-bold leading-snug" style={{ color: "var(--cm-text, #1e293b)" }} data-testid="pod-hero-action">
              {topAction.top_action}
            </h2>
            <p className="text-xs mt-1 leading-relaxed" style={{ color: "var(--cm-text-3, #94a3b8)" }} data-testid="pod-hero-explanation">
              {topAction.explanation}
            </p>
            <span className="inline-block text-[10px] font-medium mt-1.5 px-2 py-0.5 rounded-full" style={{ backgroundColor: "var(--cm-surface-2, #f1f5f9)", color: "var(--cm-text-3, #94a3b8)" }}>
              Owner: {topAction.owner === "coach" ? "Coach" : topAction.owner === "shared" ? "Shared" : topAction.owner === "athlete" ? "Athlete" : topAction.owner}
            </span>
          </div>

          {/* CTAs */}
          {!isOnTrack && (
            <div className="flex items-center gap-2 shrink-0 pt-0.5">
              {qr ? (
                <button onClick={handleQuickResolve} disabled={resolving}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold text-white transition-all hover:opacity-90 disabled:opacity-50"
                  style={{ backgroundColor: u.color }} data-testid="pod-hero-quick-resolve">
                  {resolving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserPlus className="w-3.5 h-3.5" />}
                  {resolving ? "Resolving..." : qr.label}
                </button>
              ) : (
                <button onClick={handleCta}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold text-white transition-all hover:opacity-90"
                  style={{ backgroundColor: u.color }} data-testid="pod-hero-cta">
                  {topAction.cta_label}
                </button>
              )}
              {topAction.urgency === "critical" && (
                <button onClick={onEscalate}
                  className="px-3.5 py-2 rounded-lg text-xs font-medium transition-colors border"
                  style={{ color: "var(--cm-text-2, #64748b)", backgroundColor: "var(--cm-surface, white)", borderColor: "var(--cm-border, #e2e8f0)" }}
                  data-testid="pod-hero-escalate">
                  Escalate
                </button>
              )}
            </div>
          )}

          {isOnTrack && (
            <div className="flex items-center gap-1.5 text-xs shrink-0 pt-0.5" style={{ color: u.color }}>
              <CheckCircle className="w-4 h-4" />
              <span className="font-medium">All good</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

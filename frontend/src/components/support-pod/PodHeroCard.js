import { useState } from "react";
import { Loader2, UserPlus, CheckCircle } from "lucide-react";
import axios from "axios";
import { toast } from "sonner";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const URGENCY = {
  critical: { label: "Critical", color: "#dc2626", bg: "#fef2f2", border: "#fecaca", dot: true },
  follow_up: { label: "Needs Attention", color: "#d97706", bg: "#fffbeb", border: "#fde68a", dot: false },
  on_track: { label: "On Track", color: "#059669", bg: "#ecfdf5", border: "#a7f3d0", dot: false },
};

export default function PodHeroCard({ topAction, athleteId, onLogCheckin, onSendMessage, onEscalate, onRefresh }) {
  const [resolving, setResolving] = useState(false);

  if (!topAction) return null;

  const u = URGENCY[topAction.urgency] || URGENCY.follow_up;
  const qr = topAction.quick_resolve;
  const isOnTrack = topAction.urgency === "on_track";

  const handleCta = () => {
    const c = topAction.category;
    if (c === "momentum_drop" || c === "family_inactive") onSendMessage?.();
    else if (c === "past_due") document.querySelector('[data-testid="next-actions"]')?.scrollIntoView({ behavior: "smooth" });
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
    <div data-testid="pod-hero-card" className="rounded-2xl border" style={{ backgroundColor: u.bg, borderColor: u.border }}>
      <div className="px-5 py-5">
        {/* Urgency badge */}
        <div className="flex items-center gap-2 mb-3">
          {u.dot && <span className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: u.color }} />}
          <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: u.color }}>
            {u.label}
          </span>
          <span className="text-[11px]" style={{ color: "var(--cm-text-3, #94a3b8)" }}>·</span>
          <span className="text-[11px]" style={{ color: "var(--cm-text-3, #94a3b8)" }}>
            {topAction.issue_type}
          </span>
        </div>

        {/* Top action */}
        <h2 className="text-lg font-bold leading-snug text-slate-900" data-testid="pod-hero-action">
          {topAction.top_action}
        </h2>

        {/* Explanation */}
        <p className="text-sm text-slate-500 mt-1.5 leading-relaxed" data-testid="pod-hero-explanation">
          {topAction.explanation}
        </p>

        {/* Owner */}
        <div className="mt-3 mb-4">
          <span className="text-[11px] font-medium text-slate-400 bg-slate-100 px-2.5 py-1 rounded-full">
            Owner: {topAction.owner === "coach" ? "Coach" : topAction.owner === "shared" ? "Shared" : topAction.owner === "athlete" ? "Athlete" : topAction.owner}
          </span>
        </div>

        {/* CTAs */}
        {!isOnTrack && (
          <div className="flex items-center gap-2.5">
            {qr ? (
              <button
                onClick={handleQuickResolve}
                disabled={resolving}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 disabled:opacity-50"
                style={{ backgroundColor: u.color }}
                data-testid="pod-hero-quick-resolve"
              >
                {resolving ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                {resolving ? "Resolving..." : qr.label}
              </button>
            ) : (
              <button
                onClick={handleCta}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90"
                style={{ backgroundColor: u.color }}
                data-testid="pod-hero-cta"
              >
                {topAction.cta_label}
              </button>
            )}

            {topAction.urgency === "critical" && (
              <button
                onClick={onEscalate}
                className="px-4 py-2.5 rounded-xl text-sm font-medium text-slate-500 bg-white border border-slate-200 hover:bg-slate-50 transition-colors"
                data-testid="pod-hero-escalate"
              >
                Escalate
              </button>
            )}
          </div>
        )}

        {isOnTrack && (
          <div className="flex items-center gap-2 text-sm" style={{ color: u.color }}>
            <CheckCircle className="w-4 h-4" />
            <span className="font-medium">Everything looks good</span>
          </div>
        )}
      </div>
    </div>
  );
}

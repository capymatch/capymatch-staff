import { useEffect, useRef } from "react";
import { X, ArrowRight, FileText, MessageSquare, UserPlus, Clock, ShieldAlert, Users, Target, Zap, AlertTriangle, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

const CATEGORY_META = {
  momentum_drop: { label: "Momentum Drop", icon: Zap, color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-200" },
  blocker: { label: "Blocker", icon: ShieldAlert, color: "text-red-600", bg: "bg-red-50", border: "border-red-200" },
  deadline_proximity: { label: "Deadline", icon: Clock, color: "text-red-600", bg: "bg-red-50", border: "border-red-200" },
  engagement_drop: { label: "Engagement Drop", icon: AlertTriangle, color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-200" },
  ownership_gap: { label: "Unassigned", icon: Users, color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-200" },
  readiness_issue: { label: "Readiness", icon: Target, color: "text-purple-600", bg: "bg-purple-50", border: "border-purple-200" },
};

function PeekPanel({ intervention, onClose }) {
  const panelRef = useRef(null);

  useEffect(() => {
    const handleEscape = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [onClose]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) onClose();
    };
    const timer = setTimeout(() => document.addEventListener("mousedown", handleClickOutside), 100);
    return () => { clearTimeout(timer); document.removeEventListener("mousedown", handleClickOutside); };
  }, [onClose]);

  if (!intervention) return null;

  const meta = CATEGORY_META[intervention.category] || CATEGORY_META.momentum_drop;
  const Icon = meta.icon;
  const details = intervention.details || {};

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/20 backdrop-blur-[2px] z-[60] transition-opacity duration-200" data-testid="peek-backdrop" />

      {/* Panel */}
      <div
        ref={panelRef}
        data-testid="peek-panel"
        className="fixed top-0 right-0 h-full w-full sm:w-[420px] bg-white shadow-2xl z-[70] flex flex-col animate-in slide-in-from-right duration-200"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <div className={`w-8 h-8 rounded-lg ${meta.bg} flex items-center justify-center`}>
              <Icon className={`w-4 h-4 ${meta.color}`} />
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{meta.label}</p>
              <h3 className="font-semibold text-gray-900 text-sm leading-tight" data-testid="peek-athlete-name">
                {intervention.athlete_name}
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center transition-colors"
            data-testid="peek-close-btn"
          >
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        {/* Content — scrollable */}
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
          {/* Athlete context bar */}
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span className="font-medium text-gray-700">{intervention.grad_year}</span>
            <span>·</span>
            <span>{intervention.position}</span>
            <span>·</span>
            <span>{intervention.team}</span>
            <span>·</span>
            <span>{intervention.school_targets} target schools</span>
          </div>

          {/* WHY THIS SURFACED */}
          <section>
            <h4 className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Why this surfaced</h4>
            <p className="text-sm text-gray-800 leading-relaxed" data-testid="peek-why">
              {intervention.why_this_surfaced}
            </p>
          </section>

          {/* WHAT CHANGED */}
          <section>
            <h4 className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">What changed</h4>
            <p className="text-sm text-gray-700 leading-relaxed" data-testid="peek-what-changed">
              {intervention.what_changed}
            </p>
          </section>

          {/* RECOMMENDED ACTION */}
          <section className={`p-3.5 rounded-lg ${meta.bg} border ${meta.border}`}>
            <h4 className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Recommended action</h4>
            <p className={`text-sm font-medium ${meta.color}`} data-testid="peek-recommended-action">
              {intervention.recommended_action}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Owner: <span className="font-medium text-gray-700">{intervention.owner}</span>
            </p>
          </section>

          {/* CONTEXT: Schools / Events / Deadlines */}
          {(details.affected_schools || details.event_name || details.school_name || details.deadline_dates) && (
            <section>
              <h4 className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Relevant context</h4>
              <div className="space-y-2">
                {details.event_name && (
                  <div className="flex items-start gap-2 text-sm">
                    <Clock className="w-3.5 h-3.5 text-gray-400 mt-0.5 shrink-0" />
                    <span className="text-gray-700">{details.event_name} — {details.expected_schools} schools expected</span>
                  </div>
                )}
                {details.school_name && (
                  <div className="flex items-start gap-2 text-sm">
                    <ExternalLink className="w-3.5 h-3.5 text-gray-400 mt-0.5 shrink-0" />
                    <span className="text-gray-700">{details.school_name} — {details.response_type?.replace(/_/g, " ")}</span>
                  </div>
                )}
                {details.affected_schools && (
                  <div className="flex items-start gap-2 text-sm">
                    <Target className="w-3.5 h-3.5 text-gray-400 mt-0.5 shrink-0" />
                    <span className="text-gray-700">{details.affected_schools.join(", ")}</span>
                  </div>
                )}
                {details.deadline_dates && (
                  <div className="flex items-start gap-2 text-sm">
                    <Clock className="w-3.5 h-3.5 text-gray-400 mt-0.5 shrink-0" />
                    <span className="text-gray-700">Deadlines: {details.deadline_dates.join(", ")}</span>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* SUGGESTED STEPS */}
          {details.suggested_steps && details.suggested_steps.length > 0 && (
            <section>
              <h4 className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Next steps</h4>
              <ol className="space-y-2">
                {details.suggested_steps.map((step, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm text-gray-700">
                    <span className="w-5 h-5 rounded-full bg-gray-100 text-gray-500 text-xs font-medium flex items-center justify-center shrink-0 mt-0.5">
                      {i + 1}
                    </span>
                    {step}
                  </li>
                ))}
              </ol>
            </section>
          )}

          {/* Score detail — subtle */}
          <div className="flex items-center gap-3 text-xs text-gray-400 pt-2 border-t border-gray-100">
            <span>Score: {intervention.score}</span>
            <span>·</span>
            <span>Urgency: {intervention.urgency}/10</span>
            <span>·</span>
            <span>Impact: {intervention.impact}/10</span>
          </div>
        </div>

        {/* Footer — quick actions + main CTA */}
        <div className="border-t border-gray-100 px-5 py-4 space-y-3">
          {/* Quick actions row */}
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="flex-1 text-xs rounded-full gap-1.5" data-testid="peek-action-log-note">
              <FileText className="w-3.5 h-3.5" />
              Log Note
            </Button>
            <Button variant="outline" size="sm" className="flex-1 text-xs rounded-full gap-1.5" data-testid="peek-action-message">
              <MessageSquare className="w-3.5 h-3.5" />
              Message
            </Button>
            <Button variant="outline" size="sm" className="flex-1 text-xs rounded-full gap-1.5" data-testid="peek-action-assign">
              <UserPlus className="w-3.5 h-3.5" />
              Assign
            </Button>
          </div>

          {/* Main CTA */}
          <Button
            className="w-full bg-primary hover:bg-primary/90 text-white rounded-full font-medium gap-2"
            data-testid="peek-open-pod-btn"
          >
            Open Support Pod
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </>
  );
}

export default PeekPanel;

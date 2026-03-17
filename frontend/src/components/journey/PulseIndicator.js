import { PULSE_CONFIG } from "./constants";

/* ── Coach Watch state → compact hero badge ── */
const CW_STATE_BADGE = {
  no_signals:           { label: "No Signals",     dot: "bg-gray-500",    text: "text-gray-400" },
  waiting_for_signal:   { label: "Waiting",         dot: "bg-slate-400",   text: "text-slate-400" },
  follow_up_window_open:{ label: "Follow Up",       dot: "bg-amber-500",   text: "text-amber-400" },
  emerging_interest:    { label: "Emerging",         dot: "bg-teal-500",    text: "text-teal-500" },
  active_conversation:  { label: "Active",           dot: "bg-blue-500",    text: "text-blue-400" },
  hot_opportunity:      { label: "Hot Opportunity",  dot: "bg-green-500",   text: "text-green-400" },
  cooling:              { label: "Cooling",          dot: "bg-amber-500",   text: "text-amber-400" },
  re_engaged:           { label: "Re-engaged",       dot: "bg-teal-500",    text: "text-teal-500" },
  stalled:              { label: "Stalled",          dot: "bg-amber-500",   text: "text-amber-400" },
  deprioritize:         { label: "Low Priority",     dot: "bg-gray-500",    text: "text-gray-400" },
};

/* Pulse states that get the animated ping effect */
const ANIMATE_STATES = new Set([
  "hot_opportunity", "active_conversation", "emerging_interest", "re_engaged",
]);

export function PulseIndicator({ pulse, coachWatchState }) {
  /* Coach Watch state takes priority when available */
  if (coachWatchState) {
    const badge = CW_STATE_BADGE[coachWatchState] || CW_STATE_BADGE.no_signals;
    const shouldAnimate = ANIMATE_STATES.has(coachWatchState);
    return (
      <div className="flex items-center gap-2" data-testid="pulse-indicator">
        <span className="relative flex h-2.5 w-2.5">
          {shouldAnimate && (
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-40 ${badge.dot}`} />
          )}
          <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${badge.dot}`} />
        </span>
        <span className={`text-[11px] font-semibold ${badge.text}`} data-testid="pulse-label">{badge.label}</span>
      </div>
    );
  }

  /* Legacy fallback for pages that still pass pulse prop */
  const cfg = PULSE_CONFIG[pulse] || PULSE_CONFIG.neutral;
  const dotColor = { teal: "bg-teal-700", amber: "bg-amber-500", gray: "bg-gray-500" }[cfg.color];
  const textColor = { teal: "text-teal-600", amber: "text-amber-400", gray: "text-gray-400" }[cfg.color];
  return (
    <div className="flex items-center gap-2" data-testid="pulse-indicator">
      <span className="relative flex h-2.5 w-2.5">
        <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-40 ${dotColor}`} />
        <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${dotColor}`} />
      </span>
      <span className={`text-[11px] font-semibold ${textColor}`} data-testid="pulse-label">{cfg.label}</span>
    </div>
  );
}

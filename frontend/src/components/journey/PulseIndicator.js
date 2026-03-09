import { PULSE_CONFIG } from "./constants";

export function PulseIndicator({ pulse }) {
  const cfg = PULSE_CONFIG[pulse] || PULSE_CONFIG.neutral;
  const dotColor = { teal: "bg-teal-700", amber: "bg-amber-500", gray: "bg-gray-500" }[cfg.color];
  const textColor = { teal: "text-teal-600", amber: "text-amber-400", gray: "text-gray-400" }[cfg.color];
  return (
    <div className="flex items-center gap-2" data-testid="pulse-indicator">
      <span className="relative flex h-2.5 w-2.5">
        <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-40 ${dotColor}`} />
        <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${dotColor}`} />
      </span>
      <span className={`text-[11px] font-semibold ${textColor}`}>{cfg.label}</span>
    </div>
  );
}

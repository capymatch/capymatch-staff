export function TimelineItem({ event }) {
  const d = event.created_at ? new Date(event.created_at) : null;
  return (
    <div className="flex items-start gap-3 py-2" data-testid="timeline-event">
      <div className="w-1.5 h-1.5 rounded-full bg-slate-300 mt-1.5 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-xs" style={{ color: "var(--cm-text, #1e293b)" }}>{event.description}</p>
        <p className="text-[10px] mt-0.5" style={{ color: "var(--cm-text-3, #94a3b8)" }}>
          {event.actor}{d ? ` · ${d.toLocaleDateString("en-US", { month: "short", day: "numeric" })} at ${d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}` : ""}
        </p>
      </div>
    </div>
  );
}

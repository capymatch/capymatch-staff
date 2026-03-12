import { Calendar } from "lucide-react";

function QuickSummary({ athlete, events }) {
  if (!athlete) return null;

  const daysInactive = athlete.days_since_activity ?? 0;
  const responding = athlete.active_interest ?? 0;
  const targets = athlete.school_targets ?? 0;

  const stageLabel = {
    exploring: "Exploring",
    actively_recruiting: "Contacted",
    narrowing: "Engaged",
    committed: "Committed",
  }[athlete.recruiting_stage] || "Exploring";

  const nextEvent = (events || []).find(e => e.daysAway > 0);
  const nextEventLabel = nextEvent ? `${nextEvent.daysAway}d` : "None";

  const activityColor = daysInactive > 14 ? "text-red-600" : daysInactive > 7 ? "text-amber-600" : "text-slate-900";

  return (
    <div className="rounded-2xl border border-slate-100 bg-white" data-testid="quick-summary">
      <div className="grid grid-cols-2 sm:grid-cols-4">
        {/* Activity */}
        <div className="px-4 py-3.5 border-b sm:border-b-0 sm:border-r border-slate-100">
          <p className="text-[11px] text-slate-400 font-medium mb-0.5">Activity</p>
          <p className={`text-base font-bold ${activityColor}`} data-testid="qs-activity">
            {daysInactive === 0 ? "Today" : `${daysInactive}d ago`}
          </p>
        </div>

        {/* Responses */}
        <div className="px-4 py-3.5 border-b sm:border-b-0 sm:border-r border-slate-100">
          <p className="text-[11px] text-slate-400 font-medium mb-0.5">Responses</p>
          <p className="text-base font-bold text-slate-900" data-testid="qs-responses">
            {responding} of {targets}
          </p>
        </div>

        {/* Stage */}
        <div className="px-4 py-3.5 sm:border-r border-slate-100">
          <p className="text-[11px] text-slate-400 font-medium mb-0.5">Stage</p>
          <p className="text-base font-bold text-slate-900" data-testid="qs-stage">
            {stageLabel}
          </p>
        </div>

        {/* Next Event */}
        <div className="px-4 py-3.5">
          <p className="text-[11px] text-slate-400 font-medium mb-0.5">Next Event</p>
          <div className="flex items-center gap-1.5">
            {nextEvent && <Calendar className="w-3.5 h-3.5 text-slate-400" />}
            <p className="text-base font-bold text-slate-900" data-testid="qs-next-event">
              {nextEventLabel}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default QuickSummary;

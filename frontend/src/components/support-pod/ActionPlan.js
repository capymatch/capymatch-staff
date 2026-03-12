import { useState } from "react";
import { CheckCircle, Circle, Clock, User, Users } from "lucide-react";

function ActionPlan({ playbook }) {
  const [checkedSteps, setCheckedSteps] = useState(new Set());

  if (!playbook) return null;

  const toggleStep = (stepNum) => {
    setCheckedSteps(prev => {
      const next = new Set(prev);
      if (next.has(stepNum)) next.delete(stepNum);
      else next.add(stepNum);
      return next;
    });
  };

  const completedCount = checkedSteps.size;
  const totalSteps = playbook.steps.length;
  const progressPct = totalSteps > 0 ? Math.round((completedCount / totalSteps) * 100) : 0;

  return (
    <div className="rounded-2xl border border-slate-100 bg-white overflow-hidden" data-testid="action-plan">
      {/* Title + progress */}
      <div className="px-4 py-3 border-b border-slate-50">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-semibold text-slate-800">{playbook.title}</p>
          <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
            <Clock className="w-3 h-3" />
            <span>{playbook.estimated_days}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex-1 h-1 rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-slate-800 transition-all" style={{ width: `${progressPct}%` }} />
          </div>
          <span className="text-[11px] text-slate-400 shrink-0">{completedCount}/{totalSteps}</span>
        </div>
      </div>

      {/* Steps */}
      <div className="divide-y divide-slate-50">
        {playbook.steps.map((s) => {
          const done = checkedSteps.has(s.step);
          const OwnerIcon = (s.owner.includes("+") || s.owner === "Shared") ? Users : User;

          return (
            <button
              key={s.step}
              onClick={() => toggleStep(s.step)}
              className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-slate-50/50 transition-colors"
              data-testid={`playbook-step-${s.step}`}
            >
              {done
                ? <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                : <Circle className="w-5 h-5 text-slate-200 shrink-0 mt-0.5" />
              }
              <div className="flex-1 min-w-0">
                <p className={`text-sm ${done ? "line-through text-slate-300" : "text-slate-700"}`}>
                  {s.action}
                </p>
                <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-400">
                  <span className="flex items-center gap-1">
                    <OwnerIcon className="w-3 h-3" />
                    {s.owner}
                  </span>
                  <span>·</span>
                  <span>{s.days}</span>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Done when */}
      <div className="px-4 py-3 border-t border-slate-50">
        <p className="text-[11px] text-slate-400">
          <span className="font-semibold text-slate-500">Done when: </span>
          {playbook.success_criteria}
        </p>
      </div>
    </div>
  );
}

export default ActionPlan;

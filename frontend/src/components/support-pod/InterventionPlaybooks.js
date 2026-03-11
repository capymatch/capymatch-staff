import { useState } from "react";
import { CheckCircle, Circle, Clock, User, Users, ChevronDown, ChevronUp, BookOpen } from "lucide-react";

function InterventionPlaybooks({ playbook, interventionCategory }) {
  const [expanded, setExpanded] = useState(true);
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

  const OWNER_ICON = {
    "Coach": User,
    "Athlete": User,
    "Parent": User,
    "Shared": Users,
  };

  const getOwnerIcon = (owner) => {
    if (owner.includes("+") || owner === "Shared") return Users;
    return User;
  };

  return (
    <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: "var(--cm-surface, #fff)", borderColor: "var(--cm-border, #f1f5f9)" }} data-testid="intervention-playbook">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-50/50 transition-colors"
        style={{ borderBottom: expanded ? "1px solid var(--cm-border, #f1f5f9)" : "none" }}
        data-testid="playbook-toggle"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: "rgba(139,92,246,0.08)" }}>
            <BookOpen className="w-4 h-4" style={{ color: "#8b5cf6" }} />
          </div>
          <div className="text-left">
            <h3 className="text-sm font-semibold" style={{ color: "var(--cm-text, #1e293b)" }}>
              {playbook.title}
            </h3>
            <p className="text-xs" style={{ color: "var(--cm-text-3, #94a3b8)" }}>
              {playbook.description}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {completedCount > 0 && (
            <span className="text-xs font-medium" style={{ color: "#10b981" }}>
              {completedCount}/{totalSteps}
            </span>
          )}
          {expanded ? <ChevronUp className="w-4 h-4" style={{ color: "var(--cm-text-3, #94a3b8)" }} /> : <ChevronDown className="w-4 h-4" style={{ color: "var(--cm-text-3, #94a3b8)" }} />}
        </div>
      </button>

      {expanded && (
        <div className="px-5 py-4">
          {/* Progress bar */}
          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 h-1.5 rounded-full" style={{ backgroundColor: "var(--cm-surface-2, #f1f5f9)" }}>
              <div className="h-full rounded-full transition-all" style={{ width: `${progressPct}%`, backgroundColor: "#8b5cf6" }} />
            </div>
            <div className="flex items-center gap-2 text-xs shrink-0" style={{ color: "var(--cm-text-3, #94a3b8)" }}>
              <Clock className="w-3 h-3" />
              <span>{playbook.estimated_days}</span>
            </div>
          </div>

          {/* Steps */}
          <div className="space-y-2">
            {playbook.steps.map((s) => {
              const done = checkedSteps.has(s.step);
              const OwnerIcon = getOwnerIcon(s.owner);
              return (
                <button
                  key={s.step}
                  onClick={() => toggleStep(s.step)}
                  className="w-full flex items-start gap-3 p-2.5 rounded-lg text-left transition-colors hover:bg-slate-50/50"
                  data-testid={`playbook-step-${s.step}`}
                >
                  {done
                    ? <CheckCircle className="w-5 h-5 shrink-0 mt-0.5" style={{ color: "#10b981" }} />
                    : <Circle className="w-5 h-5 shrink-0 mt-0.5" style={{ color: "var(--cm-border, #e2e8f0)" }} />
                  }
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm ${done ? "line-through" : ""}`} style={{ color: done ? "var(--cm-text-3, #94a3b8)" : "var(--cm-text, #1e293b)" }}>
                      {s.action}
                    </p>
                    <div className="flex items-center gap-3 mt-1 text-[11px]" style={{ color: "var(--cm-text-3, #94a3b8)" }}>
                      <span className="flex items-center gap-1">
                        <OwnerIcon className="w-3 h-3" />
                        {s.owner}
                      </span>
                      <span>{s.days}</span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Success criteria */}
          <div className="mt-4 pt-3 flex items-start gap-2" style={{ borderTop: "1px solid var(--cm-border, #f1f5f9)" }}>
            <CheckCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" style={{ color: "#10b981" }} />
            <p className="text-xs" style={{ color: "var(--cm-text-3, #94a3b8)" }}>
              <span className="font-medium" style={{ color: "var(--cm-text-2, #64748b)" }}>Done when: </span>
              {playbook.success_criteria}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default InterventionPlaybooks;

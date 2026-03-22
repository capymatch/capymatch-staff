import { useState } from "react";
import { CheckCircle2, ChevronDown, ChevronUp } from "lucide-react";
import ActionPlan from "@/components/support-pod/ActionPlan";

export function PlaybookSection({ playbook, initialChecked, onSave }) {
  const totalSteps = playbook?.steps?.length || 0;
  const checkedCount = (initialChecked || []).length;
  const allDone = totalSteps > 0 && checkedCount >= totalSteps;
  const [collapsed, setCollapsed] = useState(allDone);

  const lastUpdate = initialChecked?.length > 0
    ? new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" })
    : null;

  if (!playbook) return null;

  return (
    <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: "var(--cm-surface, white)", borderColor: "var(--cm-border, #e2e8f0)" }} data-testid="school-playbook">
      <div
        className="flex items-center justify-between px-4 py-3 border-b cursor-pointer hover:bg-slate-50/50 transition-colors"
        style={{ borderColor: "var(--cm-border, #e2e8f0)" }}
        onClick={() => setCollapsed(!collapsed)}
        data-testid="playbook-toggle"
      >
        <div className="flex items-center gap-2">
          <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--cm-text-3, #94a3b8)" }}>Playbook</h3>
          {allDone ? (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold bg-emerald-50 text-emerald-600">Complete</span>
          ) : (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold" style={{ backgroundColor: "var(--cm-surface-2, #f1f5f9)", color: "var(--cm-text-3)" }}>
              {checkedCount}/{totalSteps}
            </span>
          )}
        </div>
        {collapsed ? <ChevronDown className="w-4 h-4" style={{ color: "var(--cm-text-3)" }} /> : <ChevronUp className="w-4 h-4" style={{ color: "var(--cm-text-3)" }} />}
      </div>

      {collapsed ? (
        <div className="px-4 py-3" data-testid="playbook-collapsed-summary">
          {allDone ? (
            <div className="flex items-center gap-2 text-xs text-emerald-600">
              <CheckCircle2 className="w-4 h-4" />
              <span className="font-medium">{playbook.title} completed</span>
              {lastUpdate && <span className="text-[10px]" style={{ color: "var(--cm-text-3)" }}>Last update: {lastUpdate}</span>}
            </div>
          ) : (
            <p className="text-xs" style={{ color: "var(--cm-text-3)" }}>
              {playbook.title} &#8212; {checkedCount} of {totalSteps} steps done
            </p>
          )}
        </div>
      ) : (
        <div className="px-4 py-2">
          <ActionPlan playbook={playbook} initialChecked={initialChecked || []} onSave={onSave} />
        </div>
      )}
    </div>
  );
}

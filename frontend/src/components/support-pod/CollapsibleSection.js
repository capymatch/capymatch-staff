import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

export function CollapsibleSection({ title, children, defaultOpen = false, count, testId }) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div data-testid={testId}>
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between py-2 group"
        data-testid={testId ? `${testId}-toggle` : undefined}
      >
        <span className="text-xs font-bold uppercase tracking-widest text-slate-400 group-hover:text-slate-500 transition-colors">
          {title}
        </span>
        <div className="flex items-center gap-2">
          {count != null && (
            <span className="text-[11px] text-slate-400">{count}</span>
          )}
          {open
            ? <ChevronDown className="w-3.5 h-3.5 text-slate-300" />
            : <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
          }
        </div>
      </button>
      {open && <div className="mt-1">{children}</div>}
    </div>
  );
}

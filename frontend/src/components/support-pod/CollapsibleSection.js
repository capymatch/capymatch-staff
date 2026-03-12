import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

export function CollapsibleSection({ title, icon: Icon, children, defaultOpen = false, badge, testId }) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div data-testid={testId}>
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-2 mb-2 group"
        data-testid={testId ? `${testId}-toggle` : undefined}
      >
        {open
          ? <ChevronDown className="w-3.5 h-3.5 transition-transform" style={{ color: "var(--cm-text-3, #94a3b8)" }} />
          : <ChevronRight className="w-3.5 h-3.5 transition-transform" style={{ color: "var(--cm-text-3, #94a3b8)" }} />
        }
        {Icon && <Icon className="w-3.5 h-3.5" style={{ color: "var(--cm-text-3, #94a3b8)" }} />}
        <span className="text-[11px] font-bold uppercase tracking-widest group-hover:opacity-80 transition-opacity" style={{ color: "var(--cm-text-3, #94a3b8)" }}>
          {title}
        </span>
        {badge && (
          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full" style={{ backgroundColor: "rgba(0,0,0,0.04)", color: "var(--cm-text-3, #94a3b8)" }}>
            {badge}
          </span>
        )}
      </button>
      {open && children}
    </div>
  );
}

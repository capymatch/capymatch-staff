import { useEffect, useCallback } from "react";
import { X } from "lucide-react";
import SchoolIntelligencePanel from "./SchoolIntelligencePanel";

export default function SchoolIntelligenceDrawer({
  open, onClose,
  matchScore, signals, engagement, coaches, coachWatch, timeline,
  program, onEmail, onFollowUp, onNavigateToSchool,
}) {
  /* ── Close on ESC ── */
  const handleKey = useCallback((e) => {
    if (e.key === "Escape") onClose();
  }, [onClose]);

  useEffect(() => {
    if (open) {
      document.addEventListener("keydown", handleKey);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = "";
    };
  }, [open, handleKey]);

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 z-[60] transition-opacity duration-250 ease-in-out"
        style={{
          backgroundColor: "rgba(0,0,0,0.45)",
          opacity: open ? 1 : 0,
          pointerEvents: open ? "auto" : "none",
          backdropFilter: open ? "blur(2px)" : "none",
        }}
        data-testid="si-drawer-backdrop"
      />

      {/* Drawer */}
      <div
        className="fixed top-0 right-0 z-[70] h-full flex flex-col transition-transform duration-250 ease-in-out"
        style={{
          width: "min(480px, 100vw)",
          transform: open ? "translateX(0)" : "translateX(100%)",
          backgroundColor: "var(--cm-bg, #0c0f14)",
          borderLeft: "1px solid var(--cm-border)",
          boxShadow: open ? "-8px 0 32px rgba(0,0,0,0.35)" : "none",
        }}
        data-testid="si-drawer"
        role="dialog"
        aria-label="School Intelligence"
      >
        {/* Drawer header */}
        <div className="flex items-center justify-between px-5 py-3 flex-shrink-0"
          style={{ borderBottom: "1px solid var(--cm-border)" }}>
          <span className="text-xs font-bold" style={{ color: "var(--cm-text)" }}>
            School Intelligence
          </span>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors hover:bg-white/[0.06]"
            data-testid="si-drawer-close"
            aria-label="Close drawer"
          >
            <X className="w-4 h-4" style={{ color: "var(--cm-text-2)" }} />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto overscroll-contain" data-testid="si-drawer-content">
          <div className="p-1">
            <SchoolIntelligencePanel
              matchScore={matchScore}
              signals={signals}
              engagement={engagement}
              coaches={coaches}
              coachWatch={coachWatch}
              timeline={timeline}
              program={program}
              onEmail={() => { onEmail?.(); onClose(); }}
              onFollowUp={() => { onFollowUp?.(); onClose(); }}
              onNavigateToSchool={() => { onNavigateToSchool?.(); onClose(); }}
            />
          </div>
        </div>
      </div>
    </>
  );
}

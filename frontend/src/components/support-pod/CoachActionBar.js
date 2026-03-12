import { Mail, FileText, Clock, PenLine, ArrowUpRight } from "lucide-react";

export function CoachActionBar({ activeAction, onToggle, notesOpen, onToggleNotes }) {
  const btnBase = "flex items-center gap-1.5 px-3 sm:px-3.5 py-2.5 rounded-xl text-xs font-medium transition-colors";
  const btnActive = "bg-teal-600 text-white font-semibold hover:bg-teal-700";
  const btnInactive = "hover:bg-white/5 text-slate-300";
  const divider = <div className="w-px h-6 shrink-0" style={{ background: "rgba(255,255,255,0.08)" }} />;

  return (
    <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 flex items-center gap-0.5 sm:gap-1 px-1.5 sm:px-2 py-1.5 rounded-lg border shadow-[0_8px_32px_rgba(0,0,0,0.4)]"
      style={{ background: "rgba(22,27,37,0.92)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", borderColor: "rgba(255,255,255,0.08)" }}
      data-testid="coach-action-bar">
      <button className={`${btnBase} ${activeAction === "log" ? btnActive : btnInactive}`}
        onClick={() => onToggle("log")} data-testid="cab-log">
        <FileText className="w-3.5 h-3.5" /><span className="hidden sm:inline">Log</span>
      </button>
      {divider}
      <button className={`${btnBase} ${activeAction === "email" ? btnActive : btnInactive}`}
        onClick={() => onToggle("email")} data-testid="cab-email">
        <Mail className="w-3.5 h-3.5" /><span className="hidden sm:inline">Email</span>
      </button>
      {divider}
      <button className={`${btnBase} ${activeAction === "followup" ? btnActive : btnInactive}`}
        onClick={() => onToggle("followup")} data-testid="cab-followup">
        <Clock className="w-3.5 h-3.5" /><span className="hidden sm:inline">Follow-up</span>
      </button>
      {divider}
      <button className={`${btnBase} ${notesOpen ? btnActive : btnInactive}`}
        onClick={onToggleNotes} data-testid="cab-notes">
        <PenLine className="w-3.5 h-3.5" /><span className="hidden sm:inline">Notes</span>
      </button>
      {divider}
      <button className={`${btnBase} ${activeAction === "escalate" ? btnActive : btnInactive}`}
        onClick={() => onToggle("escalate")} data-testid="cab-escalate">
        <ArrowUpRight className="w-3.5 h-3.5" /><span className="hidden sm:inline">Escalate</span>
      </button>
    </div>
  );
}

import { Mail, FileText, CheckCircle2, Clock } from "lucide-react";

export function FloatingActionBar({ onEmail, onLog, onReplied, onFollowup, activeAction }) {
  const btnBase = "flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-colors";
  const btnActive = "bg-teal-600 text-white font-semibold hover:bg-teal-700";
  const btnInactive = "hover:bg-white/5 text-slate-300";
  return (
    <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1 px-2 py-1.5 rounded-lg border shadow-[0_8px_32px_rgba(0,0,0,0.4)]"
      style={{ background: "rgba(22,27,37,0.92)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", borderColor: "rgba(255,255,255,0.08)" }}
      data-testid="floating-action-bar">
      <button className={`${btnBase} ${activeAction === "email" ? btnActive : btnInactive}`}
        onClick={onEmail} data-testid="fab-email">
        <Mail className="w-3.5 h-3.5" />Email
      </button>
      <div className="w-px h-6" style={{ background: "rgba(255,255,255,0.08)" }} />
      <button className={`${btnBase} ${activeAction === "log" ? btnActive : btnInactive}`}
        onClick={onLog} data-testid="fab-log">
        <FileText className="w-3.5 h-3.5" />Log
      </button>
      <div className="w-px h-6" style={{ background: "rgba(255,255,255,0.08)" }} />
      <button className={`${btnBase} ${activeAction === "replied" ? btnActive : btnInactive}`}
        onClick={onReplied} data-testid="fab-replied">
        <CheckCircle2 className="w-3.5 h-3.5" />Replied
      </button>
      <div className="w-px h-6" style={{ background: "rgba(255,255,255,0.08)" }} />
      <button className={`${btnBase} ${activeAction === "followup" ? btnActive : btnInactive}`}
        onClick={onFollowup} data-testid="fab-followup">
        <Clock className="w-3.5 h-3.5" />Follow-up
      </button>
    </div>
  );
}

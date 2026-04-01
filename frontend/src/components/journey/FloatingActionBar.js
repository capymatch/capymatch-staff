import { Mail, ClipboardList, CheckCircle2, Clock } from "lucide-react";

export function FloatingActionBar({ onEmail, onLog, onReplied, onFollowup, activeAction }) {
  return (
    <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 flex items-center rounded-2xl"
      style={{
        backgroundColor: "#1a1a1e",
        boxShadow: "0 8px 32px rgba(0,0,0,0.28), 0 2px 8px rgba(0,0,0,0.12)",
      }}
      data-testid="floating-action-bar">
      <button onClick={onEmail}
        className="flex items-center gap-2 px-5 py-3 text-sm font-medium transition-colors hover:bg-white/10 rounded-l-2xl"
        style={{ color: "#ffffff" }}
        data-testid="fab-email">
        <Mail className="w-4 h-4" />Email
      </button>
      <div className="w-px h-5" style={{ backgroundColor: "rgba(255,255,255,0.15)" }} />
      <button onClick={onLog}
        className="flex items-center gap-2 px-5 py-3 text-sm font-medium transition-colors hover:bg-white/10"
        style={{ color: "#ffffff" }}
        data-testid="fab-log">
        <ClipboardList className="w-4 h-4" />Log
      </button>
      <div className="w-px h-5" style={{ backgroundColor: "rgba(255,255,255,0.15)" }} />
      <button onClick={onReplied}
        className="flex items-center gap-2 px-5 py-3 text-sm font-medium transition-colors hover:bg-white/10"
        style={{ color: "#ffffff" }}
        data-testid="fab-replied">
        <CheckCircle2 className="w-4 h-4" />Mark as Replied
      </button>
      <div className="w-px h-5" style={{ backgroundColor: "rgba(255,255,255,0.15)" }} />
      <button onClick={onFollowup}
        className="flex items-center gap-2 px-5 py-3 text-sm font-medium transition-colors hover:bg-white/10 rounded-r-2xl"
        style={{ color: "#ffffff" }}
        data-testid="fab-followup">
        <Clock className="w-4 h-4" />Follow-up
      </button>
    </div>
  );
}

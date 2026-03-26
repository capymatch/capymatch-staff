import { Mail, Phone, ClipboardList, MessageSquare, ChevronRight } from "lucide-react";

export function FloatingActionBar({ onEmail, onCall, onLog, onFollowUp }) {
  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2.5 rounded-full border shadow-lg"
      style={{
        backgroundColor: "rgba(255,255,255,0.95)",
        borderColor: "rgba(20,37,68,0.08)",
        boxShadow: "0 -2px 0 rgba(0,0,0,0.02), 0 6px 28px rgba(15,23,42,0.16), 0 2px 8px rgba(15,23,42,0.08)",
        backdropFilter: "blur(16px)",
      }}
      data-testid="floating-action-bar">
      <button onClick={onEmail}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors"
        style={{ color: "#fff", backgroundColor: "#0d9488" }}
        data-testid="fab-email">
        <Mail className="w-3.5 h-3.5" />Email
      </button>
      <button onClick={onCall}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors border hover:bg-slate-50"
        style={{ color: "#475569", borderColor: "#e2e8f0" }}
        data-testid="fab-call">
        <Phone className="w-3.5 h-3.5" />Call
      </button>
      <button onClick={onLog}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors border hover:bg-slate-50"
        style={{ color: "#475569", borderColor: "#e2e8f0" }}
        data-testid="fab-log">
        <ClipboardList className="w-3.5 h-3.5" />Log
      </button>
      <button onClick={onFollowUp}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors border hover:bg-slate-50"
        style={{ color: "#475569", borderColor: "#e2e8f0" }}
        data-testid="fab-followup">
        <MessageSquare className="w-3.5 h-3.5" />Follow-up
      </button>
    </div>
  );
}

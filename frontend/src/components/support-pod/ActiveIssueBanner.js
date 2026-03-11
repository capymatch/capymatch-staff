import { useState } from "react";
import { X, Zap, ShieldAlert, Clock, AlertTriangle, Users, Target, FileText, MessageSquare, CheckCircle, ArrowRight, Timer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const CATEGORY_META = {
  momentum_drop: { label: "Momentum Drop", icon: Zap, color: "#f59e0b", bg: "rgba(245,158,11,0.08)", border: "rgba(245,158,11,0.2)" },
  blocker: { label: "Blocker", icon: ShieldAlert, color: "#ef4444", bg: "rgba(239,68,68,0.08)", border: "rgba(239,68,68,0.2)" },
  deadline_proximity: { label: "Deadline", icon: Clock, color: "#ef4444", bg: "rgba(239,68,68,0.08)", border: "rgba(239,68,68,0.2)" },
  engagement_drop: { label: "Engagement Drop", icon: AlertTriangle, color: "#f59e0b", bg: "rgba(245,158,11,0.08)", border: "rgba(245,158,11,0.2)" },
  ownership_gap: { label: "Unassigned", icon: Users, color: "#3b82f6", bg: "rgba(59,130,246,0.08)", border: "rgba(59,130,246,0.2)" },
  readiness_issue: { label: "Readiness Issue", icon: Target, color: "#8b5cf6", bg: "rgba(139,92,246,0.08)", border: "rgba(139,92,246,0.2)" },
};

function ActiveIssueBanner({ intervention, athleteId, onResolve, onDismiss }) {
  const [resolving, setResolving] = useState(false);
  const [showNoteForm, setShowNoteForm] = useState(false);
  const [noteText, setNoteText] = useState("");

  if (!intervention) return null;

  const meta = CATEGORY_META[intervention.category] || CATEGORY_META.momentum_drop;
  const Icon = meta.icon;
  const isUrgent = intervention.score >= 70 || intervention.urgency >= 7;

  const handleResolve = async () => {
    setResolving(true);
    try {
      await axios.post(`${API}/support-pods/${athleteId}/resolve`, {
        category: intervention.category,
        resolution_note: `Resolved ${meta.label} issue`,
      });
      toast.success(`${meta.label} issue resolved`);
      onResolve?.();
    } catch {
      toast.error("Failed to resolve");
    }
    setResolving(false);
  };

  const handleLogCall = async () => {
    if (!showNoteForm) { setShowNoteForm(true); return; }
    if (!noteText.trim()) return;
    try {
      await axios.post(`${API}/athletes/${athleteId}/notes`, { text: noteText.trim(), tag: "Check-in" });
      toast.success("Note logged");
      setNoteText("");
      setShowNoteForm(false);
    } catch {
      toast.error("Failed to log note");
    }
  };

  return (
    <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${meta.border}`, backgroundColor: meta.bg }} data-testid="active-issue-banner">
      {/* Top accent bar */}
      <div style={{ height: 4, backgroundColor: meta.color }} />

      <div className="p-5">
        {/* Header: Issue type + urgency badge + dismiss */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: meta.color + "18" }}>
              <Icon className="w-5 h-5" style={{ color: meta.color }} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: meta.color }}>Active Issue</span>
                {isUrgent && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full animate-pulse"
                    style={{ backgroundColor: "rgba(239,68,68,0.12)", color: "#ef4444" }}
                    data-testid="urgency-badge">
                    <Timer className="w-3 h-3" />
                    Act Now
                  </span>
                )}
              </div>
              <p className="text-sm font-semibold" style={{ color: "var(--cm-text)" }}>{meta.label}</p>
            </div>
          </div>
          <button onClick={onDismiss} className="text-gray-400 hover:text-gray-600 p-1" data-testid="banner-dismiss">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* RECOMMENDED ACTION — the star element, more prominent */}
        <div className="rounded-lg p-5 mb-4" style={{ backgroundColor: "var(--cm-surface)", border: `2px solid ${meta.color}40` }} data-testid="banner-recommended-action">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: meta.color + "18" }}>
              <ArrowRight className="w-5 h-5" style={{ color: meta.color }} />
            </div>
            <div className="flex-1">
              <p className="text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: meta.color }}>What to do now</p>
              <p className="text-base sm:text-xl font-bold leading-snug" style={{ color: "var(--cm-text)" }} data-testid="banner-recommended-text">
                {intervention.recommended_action}
              </p>
              <p className="text-xs mt-2" style={{ color: "var(--cm-text-3)" }}>
                Owner: <span className="font-semibold" style={{ color: "var(--cm-text-2)" }}>{intervention.owner}</span>
              </p>
            </div>
          </div>
        </div>

        {/* Context: Why + What Changed */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
          <div className="rounded-lg p-3" style={{ backgroundColor: "var(--cm-surface)" }}>
            <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: "var(--cm-text-3)" }}>What is wrong</p>
            <p className="text-sm font-medium" style={{ color: "var(--cm-text)" }} data-testid="banner-why">{intervention.why_this_surfaced}</p>
          </div>
          <div className="rounded-lg p-3" style={{ backgroundColor: "var(--cm-surface)" }}>
            <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: "var(--cm-text-3)" }}>What changed</p>
            <p className="text-sm" style={{ color: "var(--cm-text-2)" }} data-testid="banner-what-changed">{intervention.what_changed}</p>
          </div>
        </div>

        {/* Note form */}
        {showNoteForm && (
          <div className="mb-3 flex gap-2">
            <input
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Quick note about this check-in..."
              className="flex-1 text-sm border rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary/20"
              style={{ borderColor: "var(--cm-border)" }}
              autoFocus
              data-testid="banner-note-input"
              onKeyDown={(e) => e.key === "Enter" && handleLogCall()}
            />
            <Button size="sm" onClick={handleLogCall} className="rounded-full text-xs" data-testid="banner-note-submit">Save</Button>
            <Button size="sm" variant="ghost" onClick={() => setShowNoteForm(false)} className="text-xs">Cancel</Button>
          </div>
        )}

        {/* Actions row */}
        <div className="flex items-center gap-2 flex-wrap">
          <Button size="sm" variant="outline" className="rounded-full text-xs gap-1.5" onClick={handleLogCall} data-testid="banner-log-call">
            <FileText className="w-3.5 h-3.5" /> Log Check-in
          </Button>
          <Button size="sm" variant="outline" className="rounded-full text-xs gap-1.5" data-testid="banner-send-message">
            <MessageSquare className="w-3.5 h-3.5" /> Send Message
          </Button>
          <div className="flex-1" />
          <Button
            size="sm"
            className="rounded-full text-xs gap-1.5"
            style={{ backgroundColor: "#10b981", color: "#fff" }}
            onClick={handleResolve}
            disabled={resolving}
            data-testid="banner-resolve"
          >
            <CheckCircle className="w-3.5 h-3.5" /> {resolving ? "Resolving..." : "Mark Resolved"}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default ActiveIssueBanner;

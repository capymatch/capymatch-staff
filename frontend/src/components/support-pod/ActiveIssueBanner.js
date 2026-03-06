import { useState } from "react";
import { X, ArrowLeft, Zap, ShieldAlert, Clock, AlertTriangle, Users, Target, FileText, MessageSquare, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const CATEGORY_META = {
  momentum_drop: { label: "Momentum Drop", icon: Zap, bar: "border-l-amber-500 bg-amber-50/60" },
  blocker: { label: "Blocker", icon: ShieldAlert, bar: "border-l-red-500 bg-red-50/60" },
  deadline_proximity: { label: "Deadline", icon: Clock, bar: "border-l-red-500 bg-red-50/60" },
  engagement_drop: { label: "Engagement Drop", icon: AlertTriangle, bar: "border-l-amber-500 bg-amber-50/60" },
  ownership_gap: { label: "Unassigned", icon: Users, bar: "border-l-blue-500 bg-blue-50/60" },
  readiness_issue: { label: "Readiness", icon: Target, bar: "border-l-purple-500 bg-purple-50/60" },
};

function ActiveIssueBanner({ intervention, athleteId, onResolve, onDismiss }) {
  const [resolving, setResolving] = useState(false);
  const [showNoteForm, setShowNoteForm] = useState(false);
  const [noteText, setNoteText] = useState("");

  if (!intervention) return null;

  const meta = CATEGORY_META[intervention.category] || CATEGORY_META.momentum_drop;
  const Icon = meta.icon;

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
    <div className={`rounded-xl border-l-4 p-5 shadow-sm ${meta.bar}`} data-testid="active-issue-banner">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <Icon className="w-5 h-5 text-gray-600" />
          <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Active Issue: {meta.label}</span>
        </div>
        <button onClick={onDismiss} className="text-gray-400 hover:text-gray-600" data-testid="banner-dismiss">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="space-y-2 mb-4">
        <div>
          <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Why</span>
          <p className="text-sm font-medium text-gray-800" data-testid="banner-why">{intervention.why_this_surfaced}</p>
        </div>
        <div>
          <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">What changed</span>
          <p className="text-sm text-gray-700" data-testid="banner-what-changed">{intervention.what_changed}</p>
        </div>
        <div>
          <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Recommended</span>
          <p className="text-sm font-medium text-gray-800">{intervention.recommended_action}</p>
        </div>
        <p className="text-xs text-gray-500">Owner: <span className="font-medium text-gray-700">{intervention.owner}</span></p>
      </div>

      {showNoteForm && (
        <div className="mb-3 flex gap-2">
          <input
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            placeholder="Quick note..."
            className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary/20"
            autoFocus
            data-testid="banner-note-input"
            onKeyDown={(e) => e.key === "Enter" && handleLogCall()}
          />
          <Button size="sm" onClick={handleLogCall} className="rounded-full text-xs" data-testid="banner-note-submit">Save</Button>
          <Button size="sm" variant="ghost" onClick={() => setShowNoteForm(false)} className="text-xs">Cancel</Button>
        </div>
      )}

      <div className="flex items-center gap-2 flex-wrap">
        <Button size="sm" variant="outline" className="rounded-full text-xs gap-1.5" onClick={handleLogCall} data-testid="banner-log-call">
          <FileText className="w-3.5 h-3.5" /> Log Call
        </Button>
        <Button size="sm" variant="outline" className="rounded-full text-xs gap-1.5" data-testid="banner-send-message">
          <MessageSquare className="w-3.5 h-3.5" /> Send Message
        </Button>
        <Button
          size="sm"
          className="rounded-full text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
          onClick={handleResolve}
          disabled={resolving}
          data-testid="banner-resolve"
        >
          <CheckCircle className="w-3.5 h-3.5" /> {resolving ? "Resolving..." : "Mark Resolved"}
        </Button>
      </div>
    </div>
  );
}

export default ActiveIssueBanner;

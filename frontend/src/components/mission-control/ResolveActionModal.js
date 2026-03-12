import { useState } from "react";
import { X, Loader2, CheckCircle2, Bell, ClipboardList, Plus } from "lucide-react";

export function ResolveActionModal({ action, onResolve, onCancel }) {
  const [notes, setNotes] = useState("");
  const [notifyDirector, setNotifyDirector] = useState(true);
  const [addToTimeline, setAddToTimeline] = useState(true);
  const [followUpTitle, setFollowUpTitle] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = notes.trim().length > 0 && !submitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    await onResolve(action.action_id, {
      note: notes.trim(),
      notify_director: notifyDirector,
      add_to_timeline: addToTimeline,
      follow_up_title: followUpTitle.trim() || null,
    });
    setSubmitting(false);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center" data-testid="resolve-action-modal">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onCancel} />

      {/* Modal */}
      <div className="relative w-full max-w-md mx-auto bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Resolve Action</h3>
              <p className="text-[11px] text-slate-400">{action.athlete_name}</p>
            </div>
          </div>
          <button onClick={onCancel} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-4">
          {/* Context */}
          <div className="rounded-lg bg-slate-50 px-3.5 py-2.5">
            <p className="text-[11px] text-slate-400 font-medium mb-0.5">{action.reason_label}</p>
            {action.note && <p className="text-xs text-slate-500">{action.note}</p>}
          </div>

          {/* Resolution notes */}
          <div>
            <label className="text-xs font-semibold text-slate-700 mb-1.5 block">
              How was this resolved? <span className="text-red-400">*</span>
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Describe what was done to resolve this..."
              className="w-full px-3.5 py-2.5 text-sm text-slate-800 bg-white border border-slate-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 transition-all placeholder:text-slate-300"
              rows={3}
              maxLength={500}
              autoFocus
              data-testid="resolve-notes-input"
            />
            <p className="text-[10px] text-slate-300 text-right mt-0.5">{notes.length}/500</p>
          </div>

          {/* Checkboxes */}
          <div className="space-y-2.5">
            <label className="flex items-center gap-3 cursor-pointer group" data-testid="resolve-notify-director">
              <input
                type="checkbox"
                checked={notifyDirector}
                onChange={(e) => setNotifyDirector(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500/20"
              />
              <div className="flex items-center gap-1.5">
                <Bell className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-sm text-slate-600 group-hover:text-slate-800">Notify director</span>
              </div>
            </label>

            <label className="flex items-center gap-3 cursor-pointer group" data-testid="resolve-add-timeline">
              <input
                type="checkbox"
                checked={addToTimeline}
                onChange={(e) => setAddToTimeline(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500/20"
              />
              <div className="flex items-center gap-1.5">
                <ClipboardList className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-sm text-slate-600 group-hover:text-slate-800">Add to athlete timeline</span>
              </div>
            </label>
          </div>

          {/* Optional follow-up */}
          <div>
            <label className="text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5 text-slate-400" />
              Add follow-up task
              <span className="text-[10px] text-slate-400 font-normal">(optional)</span>
            </label>
            <input
              type="text"
              value={followUpTitle}
              onChange={(e) => setFollowUpTitle(e.target.value)}
              placeholder="e.g., Check back in 1 week"
              className="w-full px-3.5 py-2.5 text-sm text-slate-800 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 transition-all placeholder:text-slate-300"
              maxLength={200}
              data-testid="resolve-followup-input"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-slate-100 flex items-center gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl text-sm font-medium text-slate-500 bg-slate-50 hover:bg-slate-100 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            data-testid="resolve-submit-btn"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            {submitting ? "Resolving..." : "Resolve"}
          </button>
        </div>
      </div>
    </div>
  );
}

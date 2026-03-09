import { useState } from "react";
import { X, ChevronRight, Loader2 } from "lucide-react";
import { Button } from "../ui/button";
import { STAGE_LABELS } from "./constants";

export function StageLogModal({ stageKey, currentStage, universityName, onConfirm, onCancel }) {
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const newLabel = STAGE_LABELS[stageKey] || stageKey;
  const fromLabel = STAGE_LABELS[currentStage] || currentStage || "\u2014";

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!note.trim()) return;
    setSaving(true);
    await onConfirm(note.trim());
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center" data-testid="stage-log-modal">
      <div className="absolute inset-0 bg-black/50" onClick={onCancel} />
      <div className="relative w-full max-w-md mx-4 rounded-2xl border p-6 bg-slate-900 border-slate-700">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-white">
            Log progress: <span className="text-teal-500">{newLabel}</span>
          </h3>
          <button onClick={onCancel} className="p-1 rounded-lg hover:bg-white/5">
            <X className="w-4 h-4 text-slate-400" />
          </button>
        </div>
        <div className="flex items-center gap-2 mb-4 px-3 py-2 rounded-lg bg-slate-800">
          <span className="text-xs font-medium text-slate-400">{fromLabel}</span>
          <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
          <span className="text-xs font-semibold text-teal-500">{newLabel}</span>
        </div>
        <p className="text-xs mb-4 text-slate-400">
          What happened with {universityName}? This will be added to the timeline.
        </p>
        <form onSubmit={handleSubmit}>
          <textarea value={note} onChange={e => setNote(e.target.value)}
            placeholder={`e.g. "Had a great campus visit, met Coach Williams..."`}
            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white outline-none focus:ring-1 focus:ring-teal-600 resize-none leading-relaxed placeholder-slate-500"
            rows={3} autoFocus
            data-testid="stage-log-textarea" />
          <div className="flex justify-end gap-2 mt-4">
            <Button type="button" variant="ghost" size="sm" onClick={onCancel}
              className="text-xs h-8 px-4 text-slate-400">Cancel</Button>
            <Button type="submit" size="sm" disabled={saving || !note.trim()}
              className="bg-teal-700 hover:bg-teal-800 text-white text-xs h-8 px-4"
              data-testid="stage-log-submit">
              {saving ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
              Save & Update
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

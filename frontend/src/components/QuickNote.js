import { useState, useRef, useEffect } from "react";
import axios from "axios";
import { PenLine, X, Send } from "lucide-react";
import { toast } from "sonner";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const CATEGORIES = [
  { key: "recruiting", label: "Recruiting" },
  { key: "event", label: "Event" },
  { key: "parent", label: "Parent" },
  { key: "follow-up", label: "Follow-up" },
  { key: "other", label: "Other" },
];

export default function QuickNote({ athleteId, athleteName, onSaved, compact }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [category, setCategory] = useState("other");
  const [saving, setSaving] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const handleSave = async () => {
    if (!text.trim()) return;
    setSaving(true);
    try {
      await axios.post(`${API}/athletes/${athleteId}/notes`, {
        text: text.trim(),
        category,
      });
      toast.success(`Note added for ${athleteName || "athlete"}`);
      setText("");
      setCategory("other");
      setOpen(false);
      onSaved?.();
    } catch {
      toast.error("Failed to save note");
    } finally {
      setSaving(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSave();
    if (e.key === "Escape") { setOpen(false); setText(""); }
  };

  if (!open) {
    return (
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(true); }}
        className={`inline-flex items-center gap-1 text-slate-400 hover:text-slate-600 transition-colors ${
          compact ? "px-1.5 py-1" : "px-2 py-1"
        }`}
        title="Add quick note"
        data-testid={`quick-note-trigger-${athleteId}`}
      >
        <PenLine className="w-3 h-3" />
        {!compact && <span className="text-[10px] font-medium">Note</span>}
      </button>
    );
  }

  return (
    <div
      className="bg-white border border-slate-200 rounded-lg p-3 shadow-sm"
      onClick={(e) => e.stopPropagation()}
      data-testid={`quick-note-form-${athleteId}`}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Quick Note</span>
        <button
          onClick={() => { setOpen(false); setText(""); }}
          className="text-slate-300 hover:text-slate-500"
          data-testid="quick-note-close"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <textarea
        ref={inputRef}
        value={text}
        onChange={(e) => setText(e.target.value.slice(0, 300))}
        onKeyDown={handleKeyDown}
        placeholder="What did you observe or want to remember?"
        rows={2}
        className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-300 resize-none"
        data-testid="quick-note-text"
      />
      <div className="flex items-center justify-between mt-2">
        <div className="flex gap-1 flex-wrap">
          {CATEGORIES.map((c) => (
            <button
              key={c.key}
              onClick={() => setCategory(c.key)}
              className={`px-2 py-0.5 text-[10px] rounded-full border transition-colors ${
                category === c.key
                  ? "bg-slate-900 text-white border-slate-900"
                  : "text-slate-500 border-slate-200 hover:border-slate-300"
              }`}
              data-testid={`quick-note-cat-${c.key}`}
            >
              {c.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[9px] text-slate-300">{text.length}/300</span>
          <button
            onClick={handleSave}
            disabled={saving || !text.trim()}
            className="flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-medium bg-slate-900 text-white rounded-lg hover:bg-slate-800 disabled:opacity-40 transition-colors"
            data-testid="quick-note-save"
          >
            {saving ? (
              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white" />
            ) : (
              <Send className="w-3 h-3" />
            )}
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

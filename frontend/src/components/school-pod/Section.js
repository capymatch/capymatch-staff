import { useState } from "react";
import { Button } from "@/components/ui/button";

export function Section({ title, count, children, action, testId }) {
  return (
    <div className="rounded-xl border" style={{ backgroundColor: "var(--cm-surface, white)", borderColor: "var(--cm-border, #e2e8f0)" }} data-testid={testId}>
      <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: "var(--cm-border, #e2e8f0)" }}>
        <div className="flex items-center gap-2">
          <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--cm-text-3, #94a3b8)" }}>{title}</h3>
          {count != null && <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold" style={{ backgroundColor: "var(--cm-surface-2, #f1f5f9)", color: "var(--cm-text-3)" }}>{count}</span>}
        </div>
        {action}
      </div>
      <div className="px-4 py-2">{children}</div>
    </div>
  );
}

export function AddNoteForm({ onSubmit, onCancel }) {
  const [text, setText] = useState("");
  return (
    <div className="py-2">
      <textarea
        autoFocus
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder="Add a note about this school..."
        rows={3}
        className="w-full text-xs px-3 py-2 rounded-lg border outline-none focus:ring-1 focus:ring-teal-500 resize-none"
        style={{ backgroundColor: "var(--cm-surface, white)", borderColor: "var(--cm-border, #e2e8f0)", color: "var(--cm-text, #1e293b)" }}
        data-testid="new-note-input"
      />
      <div className="flex justify-end gap-2 mt-2">
        <button onClick={onCancel} className="text-xs px-3 py-1.5 rounded-lg" style={{ color: "var(--cm-text-3)" }}>Cancel</button>
        <Button size="sm" onClick={() => text.trim() && onSubmit(text.trim())} disabled={!text.trim()} data-testid="save-note-btn">Save Note</Button>
      </div>
    </div>
  );
}

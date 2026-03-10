import { useState, useEffect, useCallback, useRef } from "react";
import axios from "axios";
import {
  PenLine, X, Pin, PinOff, Pencil, Trash2, Loader2, Save,
} from "lucide-react";
import { Button } from "./ui/button";
import { toast } from "sonner";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const MAX_CHARS = 500;

function NoteItem({ note, onPin, onEdit, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(note.content);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!text.trim()) return;
    setSaving(true);
    await onEdit(note.note_id, text.trim());
    setSaving(false);
    setEditing(false);
  };

  const formatDate = (d) => {
    try { return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }); }
    catch { return d; }
  };

  return (
    <div className={`rounded-xl border p-3.5 relative group transition-colors ${note.is_pinned ? "border-amber-500/20" : ""}`}
      style={{ backgroundColor: "var(--cm-surface)", borderColor: note.is_pinned ? undefined : "var(--cm-border)" }}
      data-testid={`note-item-${note.note_id}`}>
      {note.is_pinned && (
        <span className="absolute -top-2 right-3 px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider bg-amber-500 text-black">
          Pinned
        </span>
      )}
      {editing ? (
        <div className="space-y-2">
          <textarea value={text} onChange={e => setText(e.target.value.slice(0, MAX_CHARS))}
            className="w-full border rounded-lg px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-teal-600 resize-none"
            style={{ borderColor: "var(--cm-border)", color: "var(--cm-text)", backgroundColor: "var(--cm-bg)" }} rows={3}
            data-testid="note-edit-textarea" />
          <div className="flex gap-2">
            <Button size="sm" className="bg-teal-700 hover:bg-teal-800 text-white text-xs h-7 px-3" onClick={handleSave} disabled={saving}
              data-testid="note-edit-save">
              {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3 mr-1" />}Save
            </Button>
            <Button size="sm" variant="ghost" className="text-xs h-7 px-3" onClick={() => { setEditing(false); setText(note.content); }}
              style={{ color: "var(--cm-text-3)" }}>Cancel</Button>
          </div>
        </div>
      ) : (
        <>
          <p className="text-[13px] leading-relaxed whitespace-pre-wrap" style={{ color: "var(--cm-text-2)" }}>{note.content}</p>
          <div className="flex items-center justify-between mt-2.5 pt-2 border-t" style={{ borderColor: "var(--cm-border)" }}>
            <span className="text-[10px]" style={{ color: "var(--cm-text-3)" }}>{formatDate(note.created_at)}</span>
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={() => onPin(note.note_id, !note.is_pinned)} className="p-1 rounded-md hover:bg-white/5 transition-colors"
                title={note.is_pinned ? "Unpin" : "Pin"} data-testid={`note-pin-${note.note_id}`}>
                {note.is_pinned ? <PinOff className="w-3.5 h-3.5 text-amber-400" /> : <Pin className="w-3.5 h-3.5" style={{ color: "var(--cm-text-3)" }} />}
              </button>
              <button onClick={() => setEditing(true)} className="p-1 rounded-md hover:bg-white/5 transition-colors" title="Edit"
                data-testid={`note-edit-${note.note_id}`}>
                <Pencil className="w-3.5 h-3.5" style={{ color: "var(--cm-text-3)" }} />
              </button>
              <button onClick={() => onDelete(note.note_id)} className="p-1 rounded-md hover:bg-red-500/10 transition-colors" title="Delete"
                data-testid={`note-delete-${note.note_id}`}>
                <Trash2 className="w-3.5 h-3.5 text-red-400" />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default function NotesSidebar({ programId, universityName, onNoteChange }) {
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState({ pinned: [], recent: [] });
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const textareaRef = useRef(null);

  const totalCount = notes.pinned.length + notes.recent.length;

  const fetchNotes = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/athlete/programs/${programId}/notes`);
      setNotes(res.data);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [programId]);

  useEffect(() => { fetchNotes(); }, [fetchNotes]);

  useEffect(() => {
    if (open && textareaRef.current) {
      setTimeout(() => textareaRef.current?.focus(), 300);
    }
  }, [open]);

  const saveNote = async () => {
    if (!content.trim()) return;
    setSaving(true);
    try {
      await axios.post(`${API}/athlete/programs/${programId}/notes`, { content: content.trim() });
      setContent("");
      toast.success("Note saved");
      fetchNotes();
      if (onNoteChange) onNoteChange();
    } catch { toast.error("Failed to save note"); }
    finally { setSaving(false); }
  };

  const pinNote = async (noteId, pin) => {
    try {
      await axios.put(`${API}/athlete/notes/${noteId}`, { is_pinned: pin });
      fetchNotes();
    } catch { toast.error("Failed to update"); }
  };

  const editNote = async (noteId, newContent) => {
    try {
      await axios.put(`${API}/athlete/notes/${noteId}`, { content: newContent });
      toast.success("Note updated");
      fetchNotes();
    } catch { toast.error("Failed to update"); }
  };

  const deleteNote = async (noteId) => {
    try {
      await axios.delete(`${API}/athlete/notes/${noteId}`);
      toast.success("Note deleted");
      fetchNotes();
      if (onNoteChange) onNoteChange();
    } catch { toast.error("Failed to delete"); }
  };

  return (
    <>
      {/* Collapsed tab */}
      {!open && (
        <button onClick={() => setOpen(true)}
          className="fixed right-0 top-1/2 -translate-y-1/2 z-40 flex flex-col items-center gap-2 px-2.5 py-3 rounded-l-xl border border-r-0 transition-all"
          style={{ backgroundColor: "var(--cm-surface)", borderColor: "var(--cm-border)", boxShadow: "-4px 0 20px rgba(0,0,0,0.3)" }}
          data-testid="notes-tab">
          <PenLine className="w-4 h-4 text-amber-400" />
          <span className="text-[10px] font-semibold" style={{ writingMode: "vertical-rl", color: "var(--cm-text-3)" }}>My Notes</span>
          {totalCount > 0 && (
            <span className="rounded-full bg-teal-600 text-white text-[9px] font-bold flex items-center justify-center"
              style={{ minWidth: 18, minHeight: 18 }}>{totalCount}</span>
          )}
        </button>
      )}

      {/* Overlay */}
      {open && (
        <div className="fixed inset-0 bg-black/40 z-40" onClick={() => setOpen(false)} data-testid="notes-overlay" />
      )}

      {/* Panel */}
      <div className={`fixed right-0 top-0 bottom-0 w-[360px] z-50 flex flex-col transition-transform duration-300 ease-out ${open ? "translate-x-0" : "translate-x-full"}`}
        style={{ backgroundColor: "var(--cm-surface)", borderLeft: "1px solid var(--cm-border)", boxShadow: open ? "-8px 0 40px rgba(0,0,0,0.15)" : "none" }}
        data-testid="notes-panel">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b flex-shrink-0" style={{ borderColor: "var(--cm-border)" }}>
          <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: "var(--cm-text)" }}>
            <PenLine className="w-4 h-4 text-amber-400" />
            My Notes
            <span className="text-[11px] font-normal" style={{ color: "var(--cm-text-3)" }}>{universityName}</span>
          </h3>
          <button onClick={() => setOpen(false)} className="p-1.5 rounded-lg hover:bg-white/5 transition-colors" style={{ color: "var(--cm-text-3)" }}
            data-testid="notes-close">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Composer */}
        <div className="px-5 py-4 border-b flex-shrink-0" style={{ borderColor: "var(--cm-border)" }}>
          <textarea ref={textareaRef} value={content}
            onChange={e => setContent(e.target.value.slice(0, MAX_CHARS))}
            placeholder="Jot down thoughts, impressions, pros/cons..."
            className="w-full border rounded-xl px-3.5 py-3 text-[13px] outline-none focus:ring-1 focus:ring-amber-500/40 resize-none leading-relaxed"
            style={{ borderColor: "var(--cm-border)", color: "var(--cm-text)", backgroundColor: "var(--cm-bg)" }} rows={3}
            data-testid="notes-composer-textarea"
            onKeyDown={e => { if (e.key === "Enter" && e.metaKey) saveNote(); }} />
          <div className="flex items-center justify-between mt-2.5">
            <span className="text-[10px]" style={{ color: "var(--cm-text-3)" }}>{content.length} / {MAX_CHARS}</span>
            <Button size="sm" className="bg-teal-700 hover:bg-teal-800 text-white text-xs h-7 px-4" onClick={saveNote}
              disabled={saving || !content.trim()} data-testid="notes-save-btn">
              {saving ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
              Save Note
            </Button>
          </div>
        </div>

        {/* Notes list */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-2" data-testid="notes-list">
          {loading && totalCount === 0 ? (
            <div className="flex items-center justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-teal-600" /></div>
          ) : totalCount === 0 ? (
            <div className="text-center py-10">
              <PenLine className="w-8 h-8 mx-auto mb-2 opacity-15" style={{ color: "var(--cm-text-3)" }} />
              <p className="text-xs" style={{ color: "var(--cm-text-3)" }}>No notes yet</p>
              <p className="text-[10px] mt-1" style={{ color: "var(--cm-text-3)" }}>Your private notes about this school will appear here</p>
            </div>
          ) : (
            <>
              {notes.pinned.length > 0 && (
                <>
                  <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--cm-text-3)" }}>Pinned</p>
                  {notes.pinned.map(n => (
                    <NoteItem key={n.note_id} note={n} onPin={pinNote} onEdit={editNote} onDelete={deleteNote} />
                  ))}
                </>
              )}
              {notes.recent.length > 0 && (
                <>
                  {notes.pinned.length > 0 && <div className="pt-1" />}
                  <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--cm-text-3)" }}>Recent</p>
                  {notes.recent.map(n => (
                    <NoteItem key={n.note_id} note={n} onPin={pinNote} onEdit={editNote} onDelete={deleteNote} />
                  ))}
                </>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}

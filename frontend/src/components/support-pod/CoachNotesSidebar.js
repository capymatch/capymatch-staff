import { useState, useEffect, useCallback, useRef } from "react";
import axios from "axios";
import { PenLine, X, Pin, PinOff, Pencil, Trash2, Loader2, Save } from "lucide-react";
import { Button } from "../ui/button";
import { toast } from "sonner";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const MAX_CHARS = 500;

function NoteItem({ note, onPin, onEdit, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(note.content || note.text);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!text.trim()) return;
    setSaving(true);
    await onEdit(note.note_id || note.id, text.trim());
    setSaving(false);
    setEditing(false);
  };

  const formatDate = (d) => {
    try { return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }); }
    catch { return d; }
  };

  return (
    <div className={`rounded-xl border p-3.5 relative group transition-colors ${note.is_pinned ? "border-amber-500/20" : ""}`}
      style={{ backgroundColor: "rgba(255,255,255,0.02)", borderColor: note.is_pinned ? undefined : "rgba(255,255,255,0.06)" }}
      data-testid={`pod-note-${note.note_id || note.id}`}>
      {note.is_pinned && (
        <span className="absolute -top-2 right-3 px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider bg-amber-500 text-black">Pinned</span>
      )}
      {editing ? (
        <div className="space-y-2">
          <textarea value={text} onChange={e => setText(e.target.value.slice(0, MAX_CHARS))}
            className="w-full border rounded-lg px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-teal-600 resize-none"
            style={{ borderColor: "rgba(255,255,255,0.1)", color: "#e2e8f0", backgroundColor: "rgba(255,255,255,0.03)" }} rows={3} />
          <div className="flex gap-2">
            <Button size="sm" className="bg-teal-700 hover:bg-teal-800 text-white text-xs h-7 px-3" onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3 mr-1" />}Save
            </Button>
            <Button size="sm" variant="ghost" className="text-xs h-7 px-3 text-white/30" onClick={() => { setEditing(false); setText(note.content || note.text); }}>Cancel</Button>
          </div>
        </div>
      ) : (
        <>
          <p className="text-[13px] leading-relaxed whitespace-pre-wrap" style={{ color: "rgba(255,255,255,0.7)" }}>{note.content || note.text}</p>
          {note.tag && <span className="inline-block mt-1.5 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-teal-600/15 text-teal-400">{note.tag}</span>}
          <div className="flex items-center justify-between mt-2.5 pt-2 border-t" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
            <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.25)" }}>{formatDate(note.created_at)}</span>
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {onPin && (
                <button onClick={() => onPin(note.note_id || note.id, !note.is_pinned)} className="p-1 rounded-md hover:bg-white/5" title={note.is_pinned ? "Unpin" : "Pin"}>
                  {note.is_pinned ? <PinOff className="w-3.5 h-3.5 text-amber-400" /> : <Pin className="w-3.5 h-3.5 text-white/30" />}
                </button>
              )}
              <button onClick={() => setEditing(true)} className="p-1 rounded-md hover:bg-white/5"><Pencil className="w-3.5 h-3.5 text-white/30" /></button>
              <button onClick={() => onDelete(note.note_id || note.id)} className="p-1 rounded-md hover:bg-red-500/10"><Trash2 className="w-3.5 h-3.5 text-red-400" /></button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export function CoachNotesSidebar({ athleteId, athleteName, open, onClose }) {
  const [notes, setNotes] = useState([]);
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const textareaRef = useRef(null);

  const fetchNotes = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/athletes/${athleteId}/notes`);
      setNotes(res.data?.notes || res.data || []);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [athleteId]);

  useEffect(() => { if (open) fetchNotes(); }, [open, fetchNotes]);

  useEffect(() => {
    if (open && textareaRef.current) setTimeout(() => textareaRef.current?.focus(), 300);
  }, [open]);

  const saveNote = async () => {
    if (!content.trim()) return;
    setSaving(true);
    try {
      await axios.post(`${API}/athletes/${athleteId}/notes`, { text: content.trim(), tag: "Coach Note" });
      setContent("");
      toast.success("Note saved");
      fetchNotes();
    } catch { toast.error("Failed to save"); }
    finally { setSaving(false); }
  };

  const deleteNote = async (noteId) => {
    try {
      await axios.delete(`${API}/athletes/${athleteId}/notes/${noteId}`);
      toast.success("Note deleted");
      fetchNotes();
    } catch { toast.error("Failed to delete"); }
  };

  const editNote = async (noteId, newContent) => {
    try {
      await axios.patch(`${API}/athletes/${athleteId}/notes/${noteId}`, { text: newContent });
      toast.success("Note updated");
      fetchNotes();
    } catch { toast.error("Failed to update"); }
  };

  return (
    <>
      {/* Overlay */}
      {open && <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} data-testid="pod-notes-overlay" />}

      {/* Panel */}
      <div className={`fixed right-0 top-0 bottom-0 w-[340px] sm:w-[380px] z-50 flex flex-col transition-transform duration-300 ease-out ${open ? "translate-x-0" : "translate-x-full"}`}
        style={{ backgroundColor: "#161b25", borderLeft: "1px solid rgba(255,255,255,0.06)", boxShadow: open ? "-8px 0 40px rgba(0,0,0,0.4)" : "none" }}
        data-testid="pod-notes-panel">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b flex-shrink-0" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
          <h3 className="text-sm font-bold flex items-center gap-2 text-white">
            <PenLine className="w-4 h-4 text-amber-400" />
            Pod Notes
            <span className="text-[11px] font-normal text-slate-500">{athleteName}</span>
          </h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/5 transition-colors text-white/30" data-testid="pod-notes-close">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Composer */}
        <div className="px-5 py-4 border-b flex-shrink-0" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
          <textarea ref={textareaRef} value={content}
            onChange={e => setContent(e.target.value.slice(0, MAX_CHARS))}
            placeholder="Observations, concerns, progress updates..."
            className="w-full border rounded-xl px-3.5 py-3 text-[13px] outline-none focus:ring-1 focus:ring-amber-500/40 resize-none leading-relaxed"
            style={{ borderColor: "rgba(255,255,255,0.08)", color: "#e2e8f0", backgroundColor: "rgba(255,255,255,0.03)" }} rows={3}
            data-testid="pod-notes-textarea"
            onKeyDown={e => { if (e.key === "Enter" && e.metaKey) saveNote(); }} />
          <div className="flex items-center justify-between mt-2.5">
            <span className="text-[10px] text-white/20">{content.length} / {MAX_CHARS}</span>
            <Button size="sm" className="bg-teal-700 hover:bg-teal-800 text-white text-xs h-7 px-4" onClick={saveNote}
              disabled={saving || !content.trim()} data-testid="pod-notes-save">
              {saving ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}Save Note
            </Button>
          </div>
        </div>

        {/* Notes list */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-2" data-testid="pod-notes-list">
          {loading && notes.length === 0 ? (
            <div className="flex items-center justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-teal-600" /></div>
          ) : notes.length === 0 ? (
            <div className="text-center py-10">
              <PenLine className="w-8 h-8 mx-auto mb-2 opacity-15 text-white/20" />
              <p className="text-xs text-white/30">No pod notes yet</p>
              <p className="text-[10px] mt-1 text-white/20">Coach and pod notes about this athlete will appear here</p>
            </div>
          ) : (
            notes.map(n => (
              <NoteItem key={n.note_id || n.id} note={n} onEdit={editNote} onDelete={deleteNote} />
            ))
          )}
        </div>
      </div>
    </>
  );
}

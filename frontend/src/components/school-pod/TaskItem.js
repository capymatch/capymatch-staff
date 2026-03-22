import { useState, useEffect, useRef } from "react";
import {
  CheckCircle2, Bell, MoreHorizontal, Pencil, UserCheck, MessageSquare,
} from "lucide-react";
import axios from "axios";
import { toast } from "sonner";
import { API, headers, ACTION_TYPES } from "./constants";

export function TaskItem({ action, onComplete, onUpdate, athleteId, programId }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(action.title);
  const [nudging, setNudging] = useState(false);
  const menuRef = useRef(null);

  const isOpen = action.status === "ready" || action.status === "open";
  const isAthlete = action.assigned_to_athlete || (action.owner || "").toLowerCase().includes("athlete");
  const ownerLabel = isAthlete ? "Athlete" : action.owner || "Coach";

  const isOverdue = (() => {
    if (!isOpen || !action.due_date) return false;
    return new Date(action.due_date) < new Date();
  })();

  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  const handleSaveEdit = async () => {
    if (!editTitle.trim() || editTitle === action.title) { setEditing(false); return; }
    try {
      await axios.patch(`${API}/support-pods/${athleteId}/school/${programId}/actions/${action.id}`, { title: editTitle.trim() }, { headers: headers() });
      toast.success("Task updated");
      onUpdate?.();
    } catch { toast.error("Failed to update"); }
    setEditing(false);
  };

  const handleReassign = async (newOwner) => {
    try {
      await axios.patch(`${API}/support-pods/${athleteId}/school/${programId}/actions/${action.id}`, { owner: newOwner }, { headers: headers() });
      toast.success(`Reassigned to ${newOwner}`);
      onUpdate?.();
    } catch { toast.error("Failed to reassign"); }
    setMenuOpen(false);
  };

  const handleNudge = async () => {
    setNudging(true);
    try {
      await axios.post(`${API}/support-messages`, {
        athlete_id: athleteId,
        subject: `Reminder: ${action.title}`,
        body: `Friendly reminder — this task is ${isOverdue ? "overdue" : "pending"}: "${action.title}". Let me know if you need anything!`,
      }, { headers: headers() });
      toast.success("Reminder sent");
    } catch { toast.error("Failed to send reminder"); }
    setNudging(false);
    setMenuOpen(false);
  };

  const ownerColors = {
    athlete: { bg: "rgba(20,184,166,0.08)", color: "#0d9488", border: "rgba(20,184,166,0.15)" },
    coach: { bg: "rgba(99,102,241,0.06)", color: "#6366f1", border: "rgba(99,102,241,0.12)" },
    director: { bg: "rgba(168,85,247,0.06)", color: "#a855f7", border: "rgba(168,85,247,0.12)" },
  };
  const ownerKey = isAthlete ? "athlete" : ownerLabel.toLowerCase().includes("director") ? "director" : "coach";
  const oc = ownerColors[ownerKey];

  return (
    <div className="flex items-start gap-3 py-2.5 px-1 group relative" data-testid={`task-${action.id}`}>
      {/* Checkbox */}
      <button
        onClick={() => isOpen && onComplete(action.id)}
        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors mt-0.5 ${isOpen ? "border-slate-300 hover:border-teal-500 hover:bg-teal-50 cursor-pointer" : "border-emerald-400 bg-emerald-50"}`}
        data-testid={`task-complete-${action.id}`}
      >
        {!isOpen && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />}
      </button>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {editing ? (
          <div className="flex items-center gap-2">
            <input
              autoFocus
              value={editTitle}
              onChange={e => setEditTitle(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") handleSaveEdit(); if (e.key === "Escape") setEditing(false); }}
              className="flex-1 text-xs font-medium px-2 py-1 rounded border outline-none focus:ring-1 focus:ring-teal-500"
              style={{ backgroundColor: "var(--cm-surface, white)", borderColor: "var(--cm-border, #e2e8f0)", color: "var(--cm-text, #1e293b)" }}
              data-testid={`task-edit-input-${action.id}`}
            />
            <button onClick={handleSaveEdit} className="text-[10px] font-semibold text-teal-600 hover:text-teal-700">Save</button>
            <button onClick={() => { setEditing(false); setEditTitle(action.title); }} className="text-[10px] font-medium" style={{ color: "var(--cm-text-3)" }}>Esc</button>
          </div>
        ) : (
          <>
            <p className={`text-xs font-medium leading-snug ${!isOpen ? "line-through" : ""}`} style={{ color: isOpen ? "var(--cm-text, #1e293b)" : "var(--cm-text-3, #94a3b8)" }}>
              {action.title}
            </p>
            {/* Meta row: overdue badge + date + nudge */}
            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
              {isOverdue && (
                <span className="text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded" style={{ backgroundColor: "rgba(239,68,68,0.08)", color: "#dc2626" }} data-testid={`task-overdue-${action.id}`}>
                  Overdue
                </span>
              )}
              {action.due_date && !editing && (
                <span className="text-[10px]" style={{ color: isOverdue ? "#dc2626" : "var(--cm-text-3, #94a3b8)" }}>
                  {new Date(action.due_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </span>
              )}
              {isOpen && isOverdue && isAthlete && !editing && (
                <button
                  onClick={handleNudge}
                  disabled={nudging}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold transition-colors hover:opacity-90 disabled:opacity-50"
                  style={{ backgroundColor: "rgba(217,119,6,0.08)", color: "#d97706", border: "1px solid rgba(217,119,6,0.15)" }}
                  data-testid={`task-nudge-${action.id}`}
                >
                  <Bell className="w-3 h-3" />
                  {nudging ? "..." : "Nudge"}
                </button>
              )}
            </div>
            {/* Owner badge */}
            <div className="flex items-center gap-2 mt-0.5">
              <span className="inline-flex items-center text-[9px] font-semibold px-1.5 py-0.5 rounded" style={{ backgroundColor: oc.bg, color: oc.color, border: `1px solid ${oc.border}` }}>
                {ownerLabel}
              </span>
              {action.action_type && action.action_type !== "general" && (
                <span className="text-[9px]" style={{ color: "var(--cm-text-4, #cbd5e1)" }}>
                  {ACTION_TYPES.find(t => t.value === action.action_type)?.label || action.action_type}
                </span>
              )}
            </div>
          </>
        )}
      </div>

      {/* Overflow menu — visible on hover */}
      {isOpen && !editing && (
        <div className="relative shrink-0" ref={menuRef}>
          <button
            onClick={(e) => { e.stopPropagation(); setMenuOpen(!menuOpen); }}
            className="p-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-slate-100"
            data-testid={`task-menu-${action.id}`}
          >
            <MoreHorizontal className="w-3.5 h-3.5" style={{ color: "var(--cm-text-3, #94a3b8)" }} />
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-full mt-1 w-44 rounded-lg border shadow-xl overflow-hidden z-20"
              style={{ backgroundColor: "#1e2535", borderColor: "rgba(255,255,255,0.1)", boxShadow: "0 12px 40px rgba(0,0,0,0.5)" }}
              data-testid={`task-menu-dropdown-${action.id}`}
            >
              <button onClick={() => { setEditing(true); setMenuOpen(false); }}
                className="w-full text-left px-3 py-2 text-xs flex items-center gap-2 transition-colors hover:bg-white/5"
                style={{ color: "rgba(255,255,255,0.7)" }} data-testid={`task-edit-${action.id}`}>
                <Pencil className="w-3 h-3" style={{ color: "rgba(255,255,255,0.4)" }} />Edit
              </button>
              <button onClick={() => onComplete(action.id)}
                className="w-full text-left px-3 py-2 text-xs flex items-center gap-2 transition-colors hover:bg-white/5"
                style={{ color: "rgba(255,255,255,0.7)" }} data-testid={`task-mark-done-${action.id}`}>
                <CheckCircle2 className="w-3 h-3" style={{ color: "#10b981" }} />Mark Complete
              </button>
              <div className="border-t" style={{ borderColor: "rgba(255,255,255,0.06)" }} />
              {!isAthlete ? (
                <button onClick={() => handleReassign("Athlete")}
                  className="w-full text-left px-3 py-2 text-xs flex items-center gap-2 transition-colors hover:bg-white/5"
                  style={{ color: "rgba(255,255,255,0.7)" }}>
                  <UserCheck className="w-3 h-3" style={{ color: "#0d9488" }} />Reassign to Athlete
                </button>
              ) : (
                <button onClick={() => handleReassign("Coach")}
                  className="w-full text-left px-3 py-2 text-xs flex items-center gap-2 transition-colors hover:bg-white/5"
                  style={{ color: "rgba(255,255,255,0.7)" }}>
                  <UserCheck className="w-3 h-3" style={{ color: "#6366f1" }} />Reassign to Coach
                </button>
              )}
              {isAthlete && (
                <button onClick={handleNudge} disabled={nudging}
                  className="w-full text-left px-3 py-2 text-xs flex items-center gap-2 transition-colors hover:bg-white/5 disabled:opacity-50"
                  style={{ color: "rgba(255,255,255,0.7)" }}>
                  <Bell className="w-3 h-3" style={{ color: "#d97706" }} />{nudging ? "Sending..." : "Remind / Nudge"}
                </button>
              )}
              <button onClick={() => { handleNudge(); }}
                className="w-full text-left px-3 py-2 text-xs flex items-center gap-2 transition-colors hover:bg-white/5"
                style={{ color: "rgba(255,255,255,0.7)" }}>
                <MessageSquare className="w-3 h-3" style={{ color: "rgba(255,255,255,0.4)" }} />Follow Up
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

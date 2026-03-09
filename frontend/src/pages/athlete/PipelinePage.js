import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import {
  Search, Filter, ChevronDown, Plus, X, Loader2,
  AlertTriangle, Clock, MessageSquare, Send, Archive,
  Mail, MailOpen, Phone, Eye, MapPin, Star, StarOff,
  MoreHorizontal, CheckCircle, ArrowRight, Users,
  GraduationCap, Zap, ChevronRight,
} from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

/* ── Board column config ── */
const COLUMNS = [
  { key: "overdue",           label: "Overdue",           icon: AlertTriangle, color: "rose",   dot: "bg-rose-500" },
  { key: "needs_outreach",    label: "Needs Outreach",    icon: Send,          color: "amber",  dot: "bg-amber-500" },
  { key: "waiting_on_reply",  label: "Waiting on Reply",  icon: Clock,         color: "blue",   dot: "bg-blue-500" },
  { key: "in_conversation",   label: "In Conversation",   icon: MessageSquare, color: "emerald",dot: "bg-emerald-500" },
  { key: "archived",          label: "Archived",          icon: Archive,       color: "slate",  dot: "bg-slate-400" },
];

const PRIORITY_COLORS = {
  High:   "text-rose-600 bg-rose-50",
  Medium: "text-amber-600 bg-amber-50",
  Low:    "text-slate-500 bg-slate-50",
};

const INTERACTION_TYPES = [
  "Email Sent", "Phone Call", "Video Call", "Camp",
  "Campus Visit", "Showcase", "Text Message",
];

/* ── Helpers ── */
function timeAgo(iso) {
  if (!iso) return "";
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

/* ── Add Program Modal ── */
function AddProgramModal({ onClose, onAdded }) {
  const [form, setForm] = useState({
    university_name: "", division: "D1", conference: "", region: "",
    priority: "Medium", notes: "",
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!form.university_name.trim()) return toast.error("School name is required");
    setSaving(true);
    try {
      const { data } = await axios.post(`${API}/athlete/programs`, form);
      toast.success(`${data.university_name} added to pipeline`);
      onAdded();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to add program");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h2 className="text-sm font-semibold text-slate-900">Add School to Pipeline</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="text-xs font-medium text-slate-600 mb-1 block">School Name *</label>
            <input
              data-testid="add-program-name"
              value={form.university_name}
              onChange={(e) => setForm({ ...form, university_name: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-300"
              placeholder="University of..."
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">Division</label>
              <select
                data-testid="add-program-division"
                value={form.division}
                onChange={(e) => setForm({ ...form, division: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              >
                {["D1", "D2", "D3", "NAIA", "JUCO"].map((d) => <option key={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">Priority</label>
              <select
                data-testid="add-program-priority"
                value={form.priority}
                onChange={(e) => setForm({ ...form, priority: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              >
                {["High", "Medium", "Low"].map((p) => <option key={p}>{p}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600 mb-1 block">Conference</label>
            <input
              value={form.conference}
              onChange={(e) => setForm({ ...form, conference: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              placeholder="e.g. Big Ten, ACC..."
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600 mb-1 block">Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={2}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 resize-none"
              placeholder="Why this school?"
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 px-5 py-4 border-t border-slate-100 bg-slate-50/50">
          <button onClick={onClose} className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800">Cancel</button>
          <button
            data-testid="add-program-submit"
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
            Add School
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Log Interaction Modal ── */
function LogInteractionModal({ program, onClose, onLogged }) {
  const [form, setForm] = useState({ type: "Email Sent", notes: "", outcome: "No Response" });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await axios.post(`${API}/athlete/interactions`, {
        program_id: program.program_id,
        type: form.type,
        notes: form.notes,
        outcome: form.outcome,
      });
      toast.success("Interaction logged");
      onLogged();
      onClose();
    } catch (err) {
      toast.error("Failed to log interaction");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Log Interaction</h2>
            <p className="text-xs text-slate-500">{program.university_name}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="text-xs font-medium text-slate-600 mb-1 block">Type</label>
            <select
              data-testid="log-interaction-type"
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            >
              {INTERACTION_TYPES.map((t) => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600 mb-1 block">Notes</label>
            <textarea
              data-testid="log-interaction-notes"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 resize-none"
              placeholder="What happened?"
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 px-5 py-4 border-t border-slate-100 bg-slate-50/50">
          <button onClick={onClose} className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800">Cancel</button>
          <button
            data-testid="log-interaction-submit"
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
            Log
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Mark Replied Modal ── */
function MarkRepliedModal({ program, onClose, onDone }) {
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!note.trim()) return toast.error("A note is required");
    setSaving(true);
    try {
      await axios.post(`${API}/athlete/programs/${program.program_id}/mark-replied`, { note });
      toast.success("Reply logged!");
      onDone();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to mark replied");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Coach Replied!</h2>
            <p className="text-xs text-slate-500">{program.university_name}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-5">
          <label className="text-xs font-medium text-slate-600 mb-1 block">What did they say?</label>
          <textarea
            data-testid="mark-replied-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 resize-none"
            placeholder="Summarize the coach's response..."
          />
        </div>
        <div className="flex justify-end gap-2 px-5 py-4 border-t border-slate-100 bg-slate-50/50">
          <button onClick={onClose} className="px-4 py-2 text-xs font-medium text-slate-600">Cancel</button>
          <button
            data-testid="mark-replied-submit"
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <MailOpen className="w-3.5 h-3.5" />}
            Log Reply
          </button>
        </div>
      </div>
    </div>
  );
}


/* ── Program Card ── */
function ProgramCard({ program, onLogInteraction, onMarkReplied, onViewJourney }) {
  const signals = program.signals || {};
  const priorityClass = PRIORITY_COLORS[program.priority] || PRIORITY_COLORS.Medium;

  return (
    <div
      data-testid={`program-card-${program.program_id}`}
      className="bg-white rounded-lg border border-slate-200 p-3.5 hover:shadow-sm transition-shadow cursor-pointer group"
      onClick={() => onViewJourney(program)}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-2">
        <div className="min-w-0 flex-1">
          <h4 className="text-sm font-semibold text-slate-900 truncate group-hover:text-emerald-700 transition-colors">
            {program.university_name}
          </h4>
          <div className="flex items-center gap-2 mt-0.5">
            {program.division && (
              <span className="text-[10px] font-bold text-slate-500">{program.division}</span>
            )}
            {program.conference && (
              <span className="text-[10px] text-slate-400">{program.conference}</span>
            )}
          </div>
        </div>
        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${priorityClass}`}>
          {program.priority}
        </span>
      </div>

      {/* Coach */}
      {program.primary_college_coach && (
        <div className="flex items-center gap-1.5 mb-2 text-xs text-slate-500">
          <Users className="w-3 h-3" />
          <span className="truncate">{program.primary_college_coach}</span>
        </div>
      )}

      {/* Signals */}
      <div className="flex items-center gap-3 mb-3 text-[10px] text-slate-400">
        {signals.total_interactions > 0 && (
          <span className="flex items-center gap-1">
            <MessageSquare className="w-3 h-3" /> {signals.total_interactions}
          </span>
        )}
        {signals.outreach_count > 0 && (
          <span className="flex items-center gap-1">
            <Send className="w-3 h-3" /> {signals.outreach_count} sent
          </span>
        )}
        {signals.days_since_activity != null && (
          <span>{signals.days_since_activity}d ago</span>
        )}
      </div>

      {/* Follow-up due */}
      {program.next_action_due && (
        <div className={`text-[10px] mb-2 flex items-center gap-1 ${
          program.board_group === "overdue" ? "text-rose-600 font-medium" : "text-slate-400"
        }`}>
          <Clock className="w-3 h-3" />
          Follow up: {program.next_action_due}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-1.5 pt-2 border-t border-slate-100">
        <button
          data-testid={`log-interaction-btn-${program.program_id}`}
          onClick={(e) => { e.stopPropagation(); onLogInteraction(program); }}
          className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded transition-colors"
        >
          <Plus className="w-3 h-3" /> Log
        </button>
        {!signals.has_coach_reply && signals.outreach_count > 0 && (
          <button
            data-testid={`mark-replied-btn-${program.program_id}`}
            onClick={(e) => { e.stopPropagation(); onMarkReplied(program); }}
            className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
          >
            <MailOpen className="w-3 h-3" /> Replied
          </button>
        )}
        <button
          onClick={(e) => { e.stopPropagation(); onViewJourney(program); }}
          className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium text-slate-500 hover:text-slate-700 rounded transition-colors ml-auto"
        >
          View <ChevronRight className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}


/* ── Board Column ── */
function BoardColumn({ col, programs, onLogInteraction, onMarkReplied, onViewJourney }) {
  const Icon = col.icon;
  const colorMap = {
    rose:    { bg: "bg-rose-50",    text: "text-rose-700",    border: "border-rose-100" },
    amber:   { bg: "bg-amber-50",   text: "text-amber-700",   border: "border-amber-100" },
    blue:    { bg: "bg-blue-50",    text: "text-blue-700",    border: "border-blue-100" },
    emerald: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-100" },
    slate:   { bg: "bg-slate-50",   text: "text-slate-600",   border: "border-slate-200" },
  };
  const c = colorMap[col.color] || colorMap.slate;

  return (
    <div className="flex flex-col min-w-[280px] max-w-[320px] flex-1" data-testid={`board-column-${col.key}`}>
      {/* Column header */}
      <div className={`flex items-center gap-2 px-3 py-2.5 rounded-t-xl ${c.bg} border ${c.border} border-b-0`}>
        <div className={`w-2 h-2 rounded-full ${col.dot}`} />
        <Icon className={`w-3.5 h-3.5 ${c.text}`} />
        <span className={`text-xs font-semibold ${c.text}`}>{col.label}</span>
        <span className={`ml-auto text-[10px] font-bold ${c.text} bg-white/60 px-1.5 py-0.5 rounded-full`}>
          {programs.length}
        </span>
      </div>

      {/* Cards */}
      <div className={`flex-1 p-2 space-y-2 rounded-b-xl border ${c.border} bg-slate-50/30 min-h-[200px] overflow-y-auto max-h-[calc(100vh-280px)]`}>
        {programs.length === 0 ? (
          <div className="text-center py-8 text-xs text-slate-400">
            No schools here
          </div>
        ) : (
          programs.map((p) => (
            <ProgramCard
              key={p.program_id}
              program={p}
              onLogInteraction={onLogInteraction}
              onMarkReplied={onMarkReplied}
              onViewJourney={onViewJourney}
            />
          ))
        )}
      </div>
    </div>
  );
}


/* ── Main Pipeline Page ── */
export default function PipelinePage() {
  const nav = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [interactionTarget, setInteractionTarget] = useState(null);
  const [repliedTarget, setRepliedTarget] = useState(null);
  const [viewMode, setViewMode] = useState("board"); // board | list

  const fetchPrograms = useCallback(async () => {
    try {
      const { data: d } = await axios.get(`${API}/athlete/programs?grouped=true`);
      setData(d);
    } catch (err) {
      toast.error("Failed to load pipeline");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPrograms(); }, [fetchPrograms]);

  const handleViewJourney = (program) => {
    nav(`/pipeline/${program.program_id}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
      </div>
    );
  }

  const groups = data?.groups || {};
  const total = data?.total || 0;
  const counts = data?.counts || {};

  return (
    <div className="space-y-5" data-testid="pipeline-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900" data-testid="pipeline-title">Recruiting Pipeline</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {total} school{total !== 1 ? "s" : ""} in your pipeline
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex items-center bg-slate-100 rounded-lg p-0.5">
            <button
              data-testid="view-board"
              onClick={() => setViewMode("board")}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                viewMode === "board" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"
              }`}
            >
              Board
            </button>
            <button
              data-testid="view-list"
              onClick={() => setViewMode("list")}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                viewMode === "list" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"
              }`}
            >
              List
            </button>
          </div>
          <button
            data-testid="add-program-btn"
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> Add School
          </button>
        </div>
      </div>

      {/* Summary chips */}
      <div className="flex items-center gap-2 flex-wrap" data-testid="pipeline-summary">
        {COLUMNS.filter((c) => counts[c.key] > 0).map((c) => (
          <div key={c.key} className="flex items-center gap-1.5 px-2.5 py-1 bg-white border border-slate-200 rounded-full text-[10px] font-medium text-slate-600">
            <div className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
            {c.label}: {counts[c.key]}
          </div>
        ))}
      </div>

      {total === 0 ? (
        <div className="text-center py-20" data-testid="empty-pipeline">
          <GraduationCap className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-sm font-medium text-slate-700 mb-1">No schools in your pipeline yet</p>
          <p className="text-xs text-slate-500 mb-4">Browse the Knowledge Base to add schools, or add one manually</p>
          <div className="flex items-center justify-center gap-2">
            <button
              onClick={() => nav("/schools")}
              className="px-4 py-2 text-xs font-medium text-emerald-600 bg-emerald-50 rounded-lg hover:bg-emerald-100"
            >
              Browse Schools
            </button>
            <button
              onClick={() => setShowAdd(true)}
              className="px-4 py-2 text-xs font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700"
            >
              Add Manually
            </button>
          </div>
        </div>
      ) : viewMode === "board" ? (
        /* Kanban Board */
        <div className="flex gap-3 overflow-x-auto pb-4" data-testid="pipeline-board">
          {COLUMNS.map((col) => (
            <BoardColumn
              key={col.key}
              col={col}
              programs={groups[col.key] || []}
              onLogInteraction={setInteractionTarget}
              onMarkReplied={setRepliedTarget}
              onViewJourney={handleViewJourney}
            />
          ))}
        </div>
      ) : (
        /* List View */
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden" data-testid="pipeline-list">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50">
                <th className="text-left px-4 py-2.5 text-[10px] font-bold tracking-widest uppercase text-slate-400">School</th>
                <th className="text-left px-4 py-2.5 text-[10px] font-bold tracking-widest uppercase text-slate-400">Status</th>
                <th className="text-left px-4 py-2.5 text-[10px] font-bold tracking-widest uppercase text-slate-400">Coach</th>
                <th className="text-left px-4 py-2.5 text-[10px] font-bold tracking-widest uppercase text-slate-400">Activity</th>
                <th className="text-left px-4 py-2.5 text-[10px] font-bold tracking-widest uppercase text-slate-400">Priority</th>
                <th className="px-4 py-2.5"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {COLUMNS.flatMap((col) =>
                (groups[col.key] || []).map((p) => {
                  const signals = p.signals || {};
                  const priorityClass = PRIORITY_COLORS[p.priority] || PRIORITY_COLORS.Medium;
                  const colDef = COLUMNS.find((c) => c.key === p.board_group);
                  return (
                    <tr
                      key={p.program_id}
                      data-testid={`list-row-${p.program_id}`}
                      className="hover:bg-slate-50 cursor-pointer transition-colors"
                      onClick={() => handleViewJourney(p)}
                    >
                      <td className="px-4 py-3">
                        <div className="text-sm font-semibold text-slate-900">{p.university_name}</div>
                        <div className="text-[10px] text-slate-400">{p.division} {p.conference}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="flex items-center gap-1.5 text-xs">
                          <span className={`w-1.5 h-1.5 rounded-full ${colDef?.dot || "bg-slate-400"}`} />
                          {colDef?.label || p.board_group}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600">{p.primary_college_coach || "—"}</td>
                      <td className="px-4 py-3 text-xs text-slate-500">
                        {signals.total_interactions || 0} interaction{signals.total_interactions !== 1 ? "s" : ""}
                        {signals.days_since_activity != null && <span className="text-slate-400 ml-1">({signals.days_since_activity}d)</span>}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${priorityClass}`}>{p.priority}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => setInteractionTarget(p)}
                            className="p-1 text-slate-400 hover:text-emerald-600 rounded"
                            title="Log interaction"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleViewJourney(p)}
                            className="p-1 text-slate-400 hover:text-slate-700 rounded"
                            title="View journey"
                          >
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Modals */}
      {showAdd && <AddProgramModal onClose={() => setShowAdd(false)} onAdded={fetchPrograms} />}
      {interactionTarget && (
        <LogInteractionModal
          program={interactionTarget}
          onClose={() => setInteractionTarget(null)}
          onLogged={fetchPrograms}
        />
      )}
      {repliedTarget && (
        <MarkRepliedModal
          program={repliedTarget}
          onClose={() => setRepliedTarget(null)}
          onDone={fetchPrograms}
        />
      )}
    </div>
  );
}

import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import {
  ArrowLeft, Mail, MailOpen, Phone, Send, Users, MapPin,
  Calendar, Clock, Plus, X, Loader2, CheckCircle,
  MessageSquare, Eye, Video, Tent, Building, ChevronDown,
  AlertTriangle, Edit3, Trash2, ExternalLink,
} from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const INTERACTION_TYPES = [
  "Email Sent", "Phone Call", "Video Call", "Camp",
  "Campus Visit", "Showcase", "Text Message",
];

const INTERACTION_ICONS = {
  email_sent: Send,
  coach_reply: MailOpen,
  email_received: MailOpen,
  phone_call: Phone,
  video_call: Video,
  camp: Tent,
  campus_visit: Building,
  showcase: Eye,
  text_message: MessageSquare,
  "follow up": Send,
};

const INTERACTION_COLORS = {
  email_sent:     "bg-blue-100 text-blue-700",
  coach_reply:    "bg-emerald-100 text-emerald-700",
  email_received: "bg-emerald-100 text-emerald-700",
  phone_call:     "bg-amber-100 text-amber-700",
  video_call:     "bg-purple-100 text-purple-700",
  camp:           "bg-teal-100 text-teal-700",
  campus_visit:   "bg-slate-100 text-slate-700",
  showcase:       "bg-rose-100 text-rose-700",
  text_message:   "bg-cyan-100 text-cyan-700",
  "follow up":    "bg-indigo-100 text-indigo-700",
};

function fmtDate(iso) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return iso;
  }
}

function fmtTime(iso) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  } catch {
    return "";
  }
}

function timeAgo(iso) {
  if (!iso) return "";
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}


/* ── Log Interaction Inline ── */
function LogInteractionForm({ programId, onLogged }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ type: "Email Sent", notes: "" });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await axios.post(`${API}/athlete/interactions`, {
        program_id: programId,
        type: form.type,
        notes: form.notes,
      });
      toast.success("Interaction logged");
      setForm({ type: "Email Sent", notes: "" });
      setOpen(false);
      onLogged();
    } catch (err) {
      toast.error("Failed to log interaction");
    } finally {
      setSaving(false);
    }
  };

  if (!open) {
    return (
      <button
        data-testid="open-log-form"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-emerald-600 bg-emerald-50 rounded-lg hover:bg-emerald-100 transition-colors"
      >
        <Plus className="w-3.5 h-3.5" /> Log Interaction
      </button>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3" data-testid="log-interaction-form">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold tracking-widest uppercase text-slate-400">Log Interaction</h3>
        <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-600">
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="flex gap-3">
        <select
          data-testid="journey-log-type"
          value={form.type}
          onChange={(e) => setForm({ ...form, type: e.target.value })}
          className="flex-shrink-0 px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
        >
          {INTERACTION_TYPES.map((t) => <option key={t}>{t}</option>)}
        </select>
        <input
          data-testid="journey-log-notes"
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
          placeholder="What happened?"
          className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
        />
        <button
          data-testid="journey-log-submit"
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-1 px-3 py-2 text-xs font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-50 shrink-0"
        >
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
          Log
        </button>
      </div>
    </div>
  );
}


/* ── Timeline Item ── */
function TimelineItem({ interaction, isLast }) {
  const typeKey = (interaction.type || "").toLowerCase().replace(/\s+/g, "_");
  const Icon = INTERACTION_ICONS[typeKey] || MessageSquare;
  const colorClass = INTERACTION_COLORS[typeKey] || "bg-slate-100 text-slate-700";

  return (
    <div className="flex gap-3" data-testid={`timeline-item-${interaction.interaction_id}`}>
      {/* Dot + Line */}
      <div className="flex flex-col items-center">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${colorClass}`}>
          <Icon className="w-3.5 h-3.5" />
        </div>
        {!isLast && <div className="w-px flex-1 bg-slate-200 mt-1" />}
      </div>

      {/* Content */}
      <div className={`flex-1 pb-5 ${isLast ? "" : ""}`}>
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-slate-900">{interaction.type}</p>
            {interaction.notes && (
              <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">{interaction.notes}</p>
            )}
          </div>
          <div className="text-right shrink-0 ml-3">
            <p className="text-[10px] text-slate-400">{fmtDate(interaction.date_time)}</p>
            <p className="text-[10px] text-slate-400">{fmtTime(interaction.date_time)}</p>
          </div>
        </div>
        {interaction.outcome && interaction.outcome !== "No Response" && (
          <span className="inline-block mt-1 text-[10px] font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
            {interaction.outcome}
          </span>
        )}
      </div>
    </div>
  );
}


/* ── Main Journey Page ── */
export default function JourneyPage() {
  const { programId } = useParams();
  const nav = useNavigate();
  const [program, setProgram] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchProgram = useCallback(async () => {
    try {
      const { data } = await axios.get(`${API}/athlete/programs/${programId}`);
      setProgram(data);
    } catch (err) {
      if (err.response?.status === 404) {
        toast.error("Program not found");
        nav("/pipeline");
      } else {
        toast.error("Failed to load program");
      }
    } finally {
      setLoading(false);
    }
  }, [programId, nav]);

  useEffect(() => { fetchProgram(); }, [fetchProgram]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
      </div>
    );
  }

  if (!program) return null;

  const signals = program.signals || {};
  const coaches = program.college_coaches || [];
  const interactions = program.interactions || [];

  const BOARD_LABELS = {
    overdue: { label: "Overdue", color: "text-rose-700 bg-rose-50" },
    needs_outreach: { label: "Needs Outreach", color: "text-amber-700 bg-amber-50" },
    waiting_on_reply: { label: "Waiting on Reply", color: "text-blue-700 bg-blue-50" },
    in_conversation: { label: "In Conversation", color: "text-emerald-700 bg-emerald-50" },
    archived: { label: "Archived", color: "text-slate-600 bg-slate-100" },
  };
  const boardInfo = BOARD_LABELS[program.board_group] || BOARD_LABELS.needs_outreach;

  return (
    <div className="space-y-6" data-testid="journey-page">
      {/* Back */}
      <button
        data-testid="back-to-pipeline"
        onClick={() => nav("/pipeline")}
        className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Back to Pipeline
      </button>

      {/* School header */}
      <div className="bg-white rounded-xl border border-slate-200 p-5" data-testid="journey-header">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900" data-testid="journey-school-name">
              {program.university_name}
            </h1>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              {program.division && (
                <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                  {program.division}
                </span>
              )}
              {program.conference && (
                <span className="text-xs text-slate-400">{program.conference}</span>
              )}
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${boardInfo.color}`}>
                {boardInfo.label}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {program.website && (
              <a
                href={program.website}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 px-3 py-1.5 text-xs text-slate-500 border border-slate-200 rounded-lg hover:bg-slate-50"
              >
                <ExternalLink className="w-3 h-3" /> Website
              </a>
            )}
          </div>
        </div>

        {/* Signals bar */}
        <div className="flex items-center gap-4 mt-4 pt-4 border-t border-slate-100 flex-wrap">
          <div className="text-center">
            <div className="text-lg font-bold text-slate-900">{signals.total_interactions || 0}</div>
            <div className="text-[10px] text-slate-400">Interactions</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-slate-900">{signals.outreach_count || 0}</div>
            <div className="text-[10px] text-slate-400">Outreach</div>
          </div>
          <div className="text-center">
            <div className={`text-lg font-bold ${signals.has_coach_reply ? "text-emerald-600" : "text-slate-300"}`}>
              {signals.has_coach_reply ? "Yes" : "No"}
            </div>
            <div className="text-[10px] text-slate-400">Coach Reply</div>
          </div>
          {signals.days_since_activity != null && (
            <div className="text-center">
              <div className="text-lg font-bold text-slate-900">{signals.days_since_activity}d</div>
              <div className="text-[10px] text-slate-400">Since Last</div>
            </div>
          )}
          {program.next_action_due && (
            <div className="text-center ml-auto">
              <div className={`text-sm font-bold ${program.board_group === "overdue" ? "text-rose-600" : "text-slate-700"}`}>
                {program.next_action_due}
              </div>
              <div className={`text-[10px] ${program.board_group === "overdue" ? "text-rose-500" : "text-slate-400"}`}>
                {program.board_group === "overdue" ? "Overdue!" : "Next Follow-up"}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Timeline (2/3 width) */}
        <div className="lg:col-span-2 space-y-4">
          {/* Log interaction */}
          <LogInteractionForm programId={programId} onLogged={fetchProgram} />

          {/* Timeline */}
          <div className="bg-white rounded-xl border border-slate-200 p-5" data-testid="journey-timeline">
            <h2 className="text-xs font-bold tracking-widest uppercase text-slate-400 mb-4">
              Timeline ({interactions.length})
            </h2>
            {interactions.length === 0 ? (
              <div className="text-center py-10">
                <MessageSquare className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs text-slate-500">No interactions yet</p>
                <p className="text-[10px] text-slate-400 mt-1">Log your first outreach above</p>
              </div>
            ) : (
              <div>
                {interactions.map((ix, i) => (
                  <TimelineItem
                    key={ix.interaction_id}
                    interaction={ix}
                    isLast={i === interactions.length - 1}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar (1/3 width) */}
        <div className="space-y-4">
          {/* Coaching Staff */}
          <div className="bg-white rounded-xl border border-slate-200 p-5" data-testid="journey-coaches">
            <h2 className="text-xs font-bold tracking-widest uppercase text-slate-400 mb-3">
              Coaching Staff ({coaches.length})
            </h2>
            {coaches.length === 0 ? (
              <p className="text-xs text-slate-500">No coaches added yet</p>
            ) : (
              <div className="space-y-3">
                {coaches.map((c) => (
                  <div key={c.coach_id} className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{c.coach_name}</p>
                      <p className="text-[10px] text-slate-500">{c.role}</p>
                    </div>
                    {c.email && (
                      <a
                        href={`mailto:${c.email}`}
                        className="flex items-center gap-1 text-[10px] text-emerald-600 hover:text-emerald-700 shrink-0"
                        data-testid={`journey-coach-email-${c.coach_id}`}
                      >
                        <Mail className="w-3 h-3" /> Email
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Program Notes */}
          <div className="bg-white rounded-xl border border-slate-200 p-5" data-testid="journey-notes">
            <h2 className="text-xs font-bold tracking-widest uppercase text-slate-400 mb-3">
              Notes
            </h2>
            <p className="text-xs text-slate-600 leading-relaxed">
              {program.notes || "No notes yet. Add notes when editing this program."}
            </p>
          </div>

          {/* Quick Info */}
          <div className="bg-white rounded-xl border border-slate-200 p-5" data-testid="journey-info">
            <h2 className="text-xs font-bold tracking-widest uppercase text-slate-400 mb-3">
              Details
            </h2>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">Priority</span>
                <span className="font-medium text-slate-900">{program.priority || "Medium"}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">Status</span>
                <span className="font-medium text-slate-900">{program.recruiting_status || "—"}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">Follow-up Interval</span>
                <span className="font-medium text-slate-900">{program.follow_up_days || 14} days</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">Added</span>
                <span className="font-medium text-slate-900">{fmtDate(program.created_at)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

import { useState, useEffect, useMemo } from "react";
import axios from "axios";
import { useAuth } from "../AuthContext";
import {
  GraduationCap,
  TrendingUp,
  Mail,
  Clock,
  AlertTriangle,
  ArrowRight,
  Calendar,
  MapPin,
  MessageSquare,
  Send,
  Users,
  Target,
  Zap,
  CheckCircle,
  Eye,
  Shield,
  MailOpen,
} from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

/* ── Tiny helpers ───────────────────────────────────────────── */

function timeAgo(iso) {
  if (!iso) return "";
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function fmtDate(d) {
  if (!d) return "";
  try {
    return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  } catch {
    return d;
  }
}

const INTERACTION_ICONS = {
  email_sent: Send,
  coach_reply: MailOpen,
  email_received: MailOpen,
  camp: Users,
  campus_visit: MapPin,
  showcase: Eye,
  phone_call: MessageSquare,
  video_call: MessageSquare,
  "follow up": Send,
  default: MessageSquare,
};

function InteractionIcon({ type }) {
  const t = (type || "").toLowerCase().replace(" ", "_");
  const Icon = INTERACTION_ICONS[t] || INTERACTION_ICONS.default;
  const isReply = t === "coach_reply" || t === "email_received";
  return (
    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
      isReply ? "bg-emerald-50 text-emerald-600" : "bg-slate-50 text-slate-500"
    }`}>
      <Icon className="w-4 h-4" />
    </div>
  );
}

/* ── Dashboard sections ────────────────────────────────────── */

function PulseCard({ icon: Icon, label, value, sub, accent }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4" data-testid={`pulse-${label.toLowerCase().replace(/\s/g, "-")}`}>
      <div className="flex items-center gap-2 mb-2">
        <Icon className={`w-4 h-4 ${accent || "text-slate-400"}`} />
        <span className="text-[11px] uppercase tracking-wider text-gray-400 font-medium">{label}</span>
      </div>
      <p className="text-2xl font-bold text-slate-800">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}

function FollowUpRow({ program }) {
  const overdue = program.next_action_due && program.next_action_due < new Date().toISOString().slice(0, 10);
  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-gray-50 last:border-0" data-testid="follow-up-row">
      <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${overdue ? "bg-red-500" : "bg-amber-400"}`} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-700 truncate">{program.university_name}</p>
        <p className="text-xs text-gray-400 truncate">{program.next_action || "Follow up"}</p>
      </div>
      <div className="text-right shrink-0">
        <p className={`text-xs font-medium ${overdue ? "text-red-600" : "text-amber-600"}`}>
          {overdue ? "Overdue" : `Due ${fmtDate(program.next_action_due)}`}
        </p>
        <p className="text-[10px] text-gray-300">{program.division}</p>
      </div>
    </div>
  );
}

function OutreachRow({ program }) {
  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-gray-50 last:border-0" data-testid="outreach-row">
      <div className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-700 truncate">{program.university_name}</p>
        <p className="text-xs text-gray-400">{program.division} · {program.conference}</p>
      </div>
      <span className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full font-medium shrink-0">
        New
      </span>
    </div>
  );
}

function SpotlightCard({ program }) {
  const isOverdue = program.board_group === "overdue";
  return (
    <div
      className={`min-w-[220px] max-w-[240px] rounded-xl border p-4 shrink-0 ${
        isOverdue ? "border-red-100 bg-red-50/30" : "border-gray-100 bg-white"
      }`}
      data-testid="spotlight-card"
    >
      <div className="flex items-center gap-2 mb-2">
        <GraduationCap className="w-4 h-4 text-slate-400" />
        <span className="text-xs text-gray-400 font-medium">{program.division}</span>
        {isOverdue && <AlertTriangle className="w-3.5 h-3.5 text-red-500 ml-auto" />}
      </div>
      <p className="text-sm font-semibold text-slate-800 truncate">{program.university_name}</p>
      <p className="text-xs text-gray-400 mt-0.5">{program.conference}</p>
      <div className="flex items-center gap-1.5 mt-3">
        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
          program.reply_status === "Reply Received"
            ? "bg-emerald-50 text-emerald-600"
            : program.reply_status === "Awaiting Reply"
            ? "bg-amber-50 text-amber-600"
            : "bg-gray-50 text-gray-500"
        }`}>
          {program.reply_status || "No Reply"}
        </span>
      </div>
      {program.next_action && (
        <p className="text-[11px] text-gray-400 mt-2 flex items-center gap-1">
          <ArrowRight className="w-3 h-3" /> {program.next_action}
        </p>
      )}
    </div>
  );
}

function ActivityRow({ interaction }) {
  const t = (interaction.type || "").toLowerCase().replace(" ", "_");
  const isReply = t === "coach_reply" || t === "email_received";
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-gray-50 last:border-0" data-testid="activity-row">
      <InteractionIcon type={interaction.type} />
      <div className="flex-1 min-w-0">
        <p className="text-sm text-slate-700">
          <span className="font-medium">
            {isReply ? "Coach replied" : interaction.type || "Interaction"}
          </span>
          {interaction.university_name && (
            <span className="text-gray-400"> · {interaction.university_name}</span>
          )}
        </p>
        {interaction.notes && (
          <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{interaction.notes}</p>
        )}
      </div>
      <span className="text-[11px] text-gray-300 shrink-0 whitespace-nowrap">
        {timeAgo(interaction.date_time)}
      </span>
    </div>
  );
}

function EventCard({ event }) {
  const typeColors = {
    Camp: "bg-purple-50 text-purple-600 border-purple-100",
    Tournament: "bg-blue-50 text-blue-600 border-blue-100",
    Meeting: "bg-teal-50 text-teal-600 border-teal-100",
    Visit: "bg-emerald-50 text-emerald-600 border-emerald-100",
  };
  const cls = typeColors[event.event_type] || "bg-gray-50 text-gray-600 border-gray-100";
  return (
    <div className={`rounded-xl border p-3.5 ${cls.split(" ").slice(2).join(" ") || "border-gray-100"}`} data-testid="event-card">
      <div className="flex items-center gap-2 mb-1.5">
        <Calendar className="w-3.5 h-3.5" />
        <span className={`text-[10px] font-semibold uppercase ${cls.split(" ").slice(1, 2).join(" ")}`}>
          {event.event_type || "Event"}
        </span>
      </div>
      <p className="text-sm font-medium text-slate-800">{event.title}</p>
      <div className="flex items-center gap-3 mt-1.5">
        <span className="text-xs text-gray-400">{fmtDate(event.start_date)}</span>
        {event.location && (
          <span className="text-xs text-gray-400 flex items-center gap-1">
            <MapPin className="w-3 h-3" /> {event.location}
          </span>
        )}
      </div>
    </div>
  );
}

/* ── Main Dashboard ────────────────────────────────────────── */

export default function AthleteDashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    axios
      .get(`${API}/athlete/dashboard`)
      .then((r) => setData(r.data))
      .catch((e) => setError(e.response?.data?.detail || "Failed to load dashboard"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center" data-testid="athlete-dashboard-loading">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center" data-testid="athlete-dashboard-error">
        <p className="text-sm text-red-600">{error}</p>
      </div>
    );
  }

  if (!data) return null;

  const { profile, stats, follow_ups_due, needs_first_outreach, spotlight, recent_activity, upcoming_events, club_coach } = data;
  const hasActions = follow_ups_due.length > 0 || needs_first_outreach.length > 0;

  return (
    <div className="space-y-6 max-w-4xl" data-testid="athlete-dashboard">

      {/* ── Greeting ──────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800" data-testid="dashboard-greeting">
            Hey, {profile.firstName || user?.name || "Athlete"}
          </h1>
          <p className="text-sm text-slate-500 mt-0.5" data-testid="dashboard-meta">
            {[profile.position, profile.team, profile.gradYear && `Class of ${profile.gradYear}`]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
        {club_coach && (
          <div className="hidden sm:flex items-center gap-2 text-xs text-gray-400 bg-gray-50 px-3 py-2 rounded-lg">
            <Shield className="w-3.5 h-3.5" />
            <span>Coach: <strong className="text-slate-600">{club_coach.name}</strong></span>
          </div>
        )}
      </div>

      {/* ── Quick Pulse ───────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3" data-testid="dashboard-pulse">
        <PulseCard
          icon={GraduationCap}
          label="Schools"
          value={stats.total_schools}
          sub="on your board"
          accent="text-slate-500"
        />
        <PulseCard
          icon={TrendingUp}
          label="Response Rate"
          value={`${stats.response_rate}%`}
          sub={`${stats.replied_count} replied`}
          accent="text-emerald-500"
        />
        <PulseCard
          icon={Mail}
          label="Awaiting Reply"
          value={stats.awaiting_reply}
          accent="text-amber-500"
        />
        <PulseCard
          icon={Clock}
          label="Follow-ups Due"
          value={stats.follow_ups_due}
          sub={stats.follow_ups_due > 0 ? "action needed" : "all clear"}
          accent={stats.follow_ups_due > 0 ? "text-red-500" : "text-emerald-500"}
        />
      </div>

      {/* ── Today's Actions ───────────────────────────────── */}
      {hasActions && (
        <div data-testid="dashboard-actions">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3 flex items-center gap-2">
            <Zap className="w-3.5 h-3.5 text-amber-500" /> Today's Actions
          </h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {follow_ups_due.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-100 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Clock className="w-4 h-4 text-amber-500" />
                  <h3 className="text-xs font-semibold text-slate-600">Follow-ups Due</h3>
                  <span className="ml-auto text-[10px] text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full font-medium">
                    {follow_ups_due.length}
                  </span>
                </div>
                <div className="space-y-0">
                  {follow_ups_due.slice(0, 4).map((p) => (
                    <FollowUpRow key={p.program_id} program={p} />
                  ))}
                  {follow_ups_due.length > 4 && (
                    <p className="text-xs text-gray-400 pt-2 text-center">
                      +{follow_ups_due.length - 4} more
                    </p>
                  )}
                </div>
              </div>
            )}
            {needs_first_outreach.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-100 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Target className="w-4 h-4 text-blue-500" />
                  <h3 className="text-xs font-semibold text-slate-600">Needs First Outreach</h3>
                  <span className="ml-auto text-[10px] text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-full font-medium">
                    {needs_first_outreach.length}
                  </span>
                </div>
                <div className="space-y-0">
                  {needs_first_outreach.slice(0, 4).map((p) => (
                    <OutreachRow key={p.program_id} program={p} />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── School Spotlight ──────────────────────────────── */}
      {spotlight.length > 0 && (
        <div data-testid="dashboard-spotlight">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">
            School Spotlight
          </h2>
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1">
            {spotlight.map((p) => (
              <SpotlightCard key={p.program_id} program={p} />
            ))}
          </div>
        </div>
      )}

      {/* ── Activity Feed + Upcoming Events ───────────────── */}
      <div className="grid sm:grid-cols-2 gap-3">
        {/* Activity Feed */}
        <div className="bg-white rounded-xl border border-gray-100 p-4" data-testid="dashboard-activity">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">
            Recent Activity
          </h2>
          {recent_activity.length > 0 ? (
            <div className="space-y-0">
              {recent_activity.slice(0, 6).map((ix) => (
                <ActivityRow key={ix.interaction_id} interaction={ix} />
              ))}
            </div>
          ) : (
            <div className="py-8 text-center">
              <MessageSquare className="w-6 h-6 text-gray-200 mx-auto mb-2" />
              <p className="text-xs text-gray-400">No activity yet</p>
              <p className="text-[11px] text-gray-300 mt-1">Start by reaching out to a school</p>
            </div>
          )}
        </div>

        {/* Upcoming Events */}
        <div className="bg-white rounded-xl border border-gray-100 p-4" data-testid="dashboard-events">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">
            Upcoming Events
          </h2>
          {upcoming_events.length > 0 ? (
            <div className="space-y-2.5">
              {upcoming_events.map((e) => (
                <EventCard key={e.event_id} event={e} />
              ))}
            </div>
          ) : (
            <div className="py-8 text-center">
              <Calendar className="w-6 h-6 text-gray-200 mx-auto mb-2" />
              <p className="text-xs text-gray-400">No upcoming events</p>
              <p className="text-[11px] text-gray-300 mt-1">Camps, showcases, and visits will show here</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Empty state prompt when no schools ─────────────── */}
      {stats.total_schools === 0 && (
        <div className="bg-gradient-to-br from-slate-50 to-emerald-50/30 rounded-xl border border-gray-100 p-6 text-center" data-testid="dashboard-empty">
          <GraduationCap className="w-8 h-8 text-emerald-400 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-700 mb-1">Start your recruiting journey</h3>
          <p className="text-sm text-gray-500 max-w-sm mx-auto mb-4">
            Add schools to your board to track outreach, follow-ups, and conversations with college coaches.
          </p>
          <button
            className="px-5 py-2.5 bg-slate-800 text-white text-sm font-medium rounded-lg hover:bg-slate-700 transition-colors"
            data-testid="add-first-school-btn"
            disabled
          >
            Coming soon: Add School
          </button>
        </div>
      )}
    </div>
  );
}

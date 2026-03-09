import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../AuthContext";
import { toast } from "sonner";
import {
  ChevronRight, Target, MessageCircle, Mail, Clock,
  Zap, Send, Sparkles, CheckCircle,
  ArrowRight, Calendar, Activity, ChevronDown, ChevronUp,
  Eye, Flame
} from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

/* ── PulseStat ── */
function PulseStat({ icon: Icon, iconBg, iconColor, value, label, sub, onClick }) {
  return (
    <div className={`px-5 py-4 lg:px-6 lg:py-5 border-r last:border-r-0${onClick ? " cursor-pointer transition-opacity hover:opacity-80" : ""}`}
      style={{ borderColor: "var(--cm-border)" }} onClick={onClick}
      data-testid={`pulse-${label.toLowerCase().replace(/\s+/g, "-")}`}>
      <div className="flex items-center justify-between mb-1">
        <p className="text-2xl lg:text-3xl font-extrabold tracking-tight" style={{ color: iconColor }}>{value}</p>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: iconBg }}>
          <Icon className="w-4 h-4" style={{ color: iconColor }} strokeWidth={2} />
        </div>
      </div>
      <p className="text-[11px] font-medium uppercase tracking-wider" style={{ color: "var(--cm-text-3)" }}>{label}</p>
      {sub && <p className="text-[11px] mt-0.5" style={{ color: "var(--cm-text-4)" }}>{sub}</p>}
    </div>
  );
}

/* ── ActionRow ── */
function ActionRow({ school, detail, badge, badgeBg, badgeColor, onClick }) {
  return (
    <div className="flex items-center gap-3 px-5 py-3 cursor-pointer transition-colors border-b last:border-b-0"
      style={{ borderColor: "var(--cm-border)" }}
      onClick={onClick}
      onMouseEnter={e => e.currentTarget.style.backgroundColor = "var(--cm-surface-hover)"}
      onMouseLeave={e => e.currentTarget.style.backgroundColor = "transparent"}>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold truncate" style={{ color: "var(--cm-text)" }}>{school}</p>
        <p className="text-[11px] truncate" style={{ color: "var(--cm-text-2)" }}>{detail}</p>
      </div>
      <span className="text-[10px] font-semibold px-2.5 py-1 rounded-lg flex-shrink-0" style={{ backgroundColor: badgeBg, color: badgeColor }}>{badge}</span>
      <ChevronRight className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "var(--cm-text-3)" }} />
    </div>
  );
}

/* ── SpotlightCard ── */
function SpotlightCard({ program, onClick }) {
  const boardGroupLabels = {
    in_conversation: "Active Conversation",
    waiting_on_reply: "Awaiting Reply",
    needs_outreach: "Needs Outreach",
    overdue: "Follow-up Due",
    archived: "Archived",
  };
  const colorMap = {
    "Committed": { bg: "linear-gradient(135deg, rgba(251,191,36,0.18), rgba(245,158,11,0.12))", color: "#b45309", border: "rgba(251,191,36,0.4)" },
    "Active Conversation": { bg: "rgba(16,185,129,0.12)", color: "#059669" },
    "Awaiting Reply": { bg: "rgba(245,158,11,0.12)", color: "#d97706" },
    "Some Interest": { bg: "rgba(168,85,247,0.12)", color: "#7c3aed" },
    "Camp Attended": { bg: "rgba(26,138,128,0.12)", color: "#14b8a6" },
    "Contacted": { bg: "rgba(59,130,246,0.12)", color: "#2563eb" },
    "Offer Received": { bg: "rgba(245,158,11,0.12)", color: "#d97706" },
    "Follow-up Due": { bg: "rgba(239,68,68,0.12)", color: "#ef4444" },
    "Needs Outreach": { bg: "rgba(168,85,247,0.12)", color: "#a855f7" },
  };
  const rawStatus = program.recruiting_status || "";
  const displayStatus = rawStatus === "active" || rawStatus === "Active" || !rawStatus
    ? (boardGroupLabels[program.board_group] || rawStatus || "Active")
    : rawStatus;
  const statusStyle = colorMap[displayStatus] || { bg: "rgba(107,114,128,0.12)", color: "#4b5563" };
  const isCommitted = displayStatus === "Committed" || (program.journey_rail || {}).active === "committed";
  const nextStep = program.next_action || "Review this school's journey and plan your next move.";
  const today = new Date().toISOString().slice(0, 10);
  const isOverdue = program.next_action_due && program.next_action_due <= today;

  return (
    <div className="min-w-[250px] max-w-[250px] rounded-xl border p-5 flex-shrink-0 cursor-pointer transition-all hover:-translate-y-0.5"
      style={{
        backgroundColor: isCommitted ? "rgba(251,191,36,0.04)" : "var(--cm-surface)",
        borderColor: isCommitted ? "rgba(251,191,36,0.45)" : "var(--cm-border)",
        boxShadow: isCommitted ? "0 0 16px rgba(251,191,36,0.10)" : undefined,
      }}
      onClick={onClick}
      data-testid={`spotlight-${program.program_id}`}>
      <div className="flex items-center gap-3 mb-3">
        <div className="min-w-0">
          <p className="text-sm font-bold truncate" style={{ color: "var(--cm-text)" }}>{program.university_name}</p>
          <p className="text-[11px]" style={{ color: "var(--cm-text-2)" }}>{program.division || "\u2014"}{program.conference ? ` \u00B7 ${program.conference}` : ""}</p>
        </div>
      </div>
      <div className="flex gap-1.5 flex-wrap mb-3">
        {isCommitted ? (
          <span className="text-[10px] font-bold px-2.5 py-1 rounded-md" style={{ background: "linear-gradient(135deg, #fbbf24, #f59e0b)", color: "#fff" }}>Committed</span>
        ) : (
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md" style={{ backgroundColor: statusStyle.bg, color: statusStyle.color }}>{displayStatus}</span>
        )}
        {!isCommitted && isOverdue && (
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md" style={{ backgroundColor: "rgba(239,68,68,0.12)", color: "#ef4444" }}>Overdue</span>
        )}
      </div>
      <div className="pt-3 border-t" style={{ borderColor: isCommitted ? "rgba(251,191,36,0.25)" : "var(--cm-border)" }}>
        <p className="text-[11px] leading-relaxed" style={{ color: "var(--cm-text-2)" }}>
          <span className="font-semibold" style={{ color: isCommitted ? "#d97706" : "#1a8a80" }}>
            {isCommitted ? "Congratulations! " : "Next step: "}
          </span>
          {isCommitted ? "You're committed \u2014 the hard work paid off!" : nextStep}
        </p>
      </div>
    </div>
  );
}

/* ── FeedItem ── */
function FeedItem({ dotColor, title, titleHighlight, detail, time, showLine = true, onClick }) {
  return (
    <div className="flex gap-3.5 px-5 py-3.5 transition-colors border-b last:border-b-0"
      style={{ borderColor: "var(--cm-border)", cursor: onClick ? "pointer" : undefined }}
      onClick={onClick}
      onMouseEnter={e => e.currentTarget.style.backgroundColor = "var(--cm-surface-hover)"}
      onMouseLeave={e => e.currentTarget.style.backgroundColor = "transparent"}>
      <div className="flex flex-col items-center pt-1.5">
        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: dotColor }} />
        {showLine && <div className="w-px flex-1 mt-1.5" style={{ backgroundColor: "var(--cm-border)" }} />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold" style={{ color: "var(--cm-text)" }}>
          {title}{titleHighlight && <span style={{ color: "#1a8a80" }}>{titleHighlight}</span>}
        </p>
        {detail && <p className="text-[11px] mt-1 leading-relaxed line-clamp-1" style={{ color: "var(--cm-text-2)" }}>{detail}</p>}
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <span className="text-[10px] pt-0.5" style={{ color: "var(--cm-text-3)" }}>{time}</span>
        {onClick && <ChevronRight className="w-3.5 h-3.5" style={{ color: "var(--cm-text-3)" }} />}
      </div>
    </div>
  );
}

/* ── EventCard ── */
function EventCard({ event, onClick }) {
  const typeBg = {
    Camp: { bg: "rgba(26,138,128,0.12)", color: "#1a8a80" },
    Showcase: { bg: "rgba(59,130,246,0.12)", color: "#3b82f6" },
    Tournament: { bg: "rgba(245,158,11,0.12)", color: "#f59e0b" },
    Visit: { bg: "rgba(16,185,129,0.12)", color: "#10b981" },
    Tryout: { bg: "rgba(26,138,128,0.12)", color: "#1a8a80" },
    Meeting: { bg: "rgba(6,182,212,0.12)", color: "#06b6d4" },
    Deadline: { bg: "rgba(239,68,68,0.12)", color: "#ef4444" },
  };
  const style = typeBg[event.event_type] || { bg: "rgba(107,114,128,0.12)", color: "#6b7280" };
  const dt = new Date(event.start_date + "T00:00:00");
  const month = dt.toLocaleDateString("en-US", { month: "short" }).toUpperCase();
  const day = dt.getDate();

  return (
    <div className="flex-1 px-5 py-4 border-r last:border-r-0 cursor-pointer transition-colors"
      style={{ borderColor: "var(--cm-border)" }}
      onClick={onClick}
      onMouseEnter={e => e.currentTarget.style.backgroundColor = "var(--cm-surface-hover)"}
      onMouseLeave={e => e.currentTarget.style.backgroundColor = "transparent"}>
      <div className="w-11 h-12 rounded-lg flex flex-col items-center justify-center mb-3" style={{ backgroundColor: style.bg, color: style.color }}>
        <span className="text-[9px] font-bold tracking-wider">{month}</span>
        <span className="text-lg font-extrabold leading-none">{day}</span>
      </div>
      <p className="text-sm font-semibold mb-0.5" style={{ color: "var(--cm-text)" }}>{event.title}</p>
      <p className="text-[11px]" style={{ color: "var(--cm-text-2)" }}>
        {event.location || ""}
        {event.end_date && event.end_date !== event.start_date ? ` \u00B7 ${Math.ceil((new Date(event.end_date) - new Date(event.start_date)) / 86400000) + 1} days` : ""}
      </p>
      <span className="inline-block text-[10px] font-semibold px-2 py-0.5 rounded-md mt-2" style={{ backgroundColor: style.bg, color: style.color }}>{event.event_type}</span>
    </div>
  );
}

/* ── WhosWatching (empty state for now) ── */
function WhosWatching() {
  return (
    <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: "var(--cm-surface)", borderColor: "var(--cm-border)" }} data-testid="whos-watching">
      <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: "var(--cm-border)" }}>
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: "rgba(16,185,129,0.12)" }}>
            <Eye className="w-4 h-4" style={{ color: "#10b981" }} strokeWidth={2} />
          </div>
          <div>
            <h3 className="text-sm font-bold" style={{ color: "var(--cm-text)" }}>Who's Watching</h3>
            <p className="text-[10px]" style={{ color: "var(--cm-text-2)" }}>Coach engagement with your profile & emails</p>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-3 border-b" style={{ borderColor: "var(--cm-border)" }}>
        {[
          { label: "Email Opens", color: "#10b981", value: 0 },
          { label: "Link Clicks", color: "#3b82f6", value: 0 },
          { label: "Profile Views", color: "#a855f7", value: 0 },
        ].map((s, i) => (
          <div key={s.label} className={`px-4 py-3 text-center${i < 2 ? " border-r" : ""}`} style={{ borderColor: "var(--cm-border)" }}>
            <div className="text-lg font-extrabold" style={{ color: s.color }}>{s.value}</div>
            <div className="text-[10px] font-medium" style={{ color: "var(--cm-text-2)" }}>{s.label}</div>
          </div>
        ))}
      </div>
      <div className="text-center py-10 px-5">
        <Eye className="w-8 h-8 mx-auto mb-2" style={{ color: "var(--cm-text-3)" }} />
        <p className="text-sm" style={{ color: "var(--cm-text-2)" }}>No engagement yet</p>
        <p className="text-xs mt-1" style={{ color: "var(--cm-text-3)" }}>Send emails to coaches to start tracking</p>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════ */
/* ── Dashboard ── */
/* ══════════════════════════════════════════ */
export default function AthleteDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [programs, setPrograms] = useState([]);
  const [events, setEvents] = useState([]);
  const [interactions, setInteractions] = useState([]);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [gmailConnected, setGmailConnected] = useState(false);
  const [spotlightExpanded, setSpotlightExpanded] = useState(false);

  useEffect(() => {
    Promise.all([
      axios.get(`${API}/athlete/programs`).catch(() => ({ data: [] })),
      axios.get(`${API}/athlete/events`).catch(() => ({ data: [] })),
      axios.get(`${API}/athlete/interactions`).catch(() => ({ data: [] })),
      axios.get(`${API}/athlete/profile`).catch(() => ({ data: {} })),
      axios.get(`${API}/athlete/gmail/status`).catch(() => ({ data: { connected: false } })),
    ])
      .then(([progRes, evtRes, intRes, profRes, gmailRes]) => {
        setPrograms(progRes.data || []);
        setEvents(Array.isArray(evtRes.data) ? evtRes.data : []);
        setInteractions(Array.isArray(intRes.data) ? intRes.data : []);
        setProfile(profRes.data);
        setGmailConnected(gmailRes.data?.connected || false);
      })
      .catch(() => toast.error("Failed to load dashboard"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64" data-testid="athlete-dashboard-loading">
        <div className="w-8 h-8 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  /* ── Derived data ── */
  const athleteName = profile?.athlete_name || profile?.fullName || user?.name || "";
  const firstName = athleteName.split(" ")[0] || "Athlete";
  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const dateStr = now.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  const today = now.toISOString().split("T")[0];

  const totalSchools = programs.length;
  const activePrograms = programs.filter(p => p.recruiting_status !== "archived");
  const contacted = activePrograms.filter(p => {
    const s = p.signals || {};
    return (s.outreach_count || 0) > 0;
  });
  const replied = activePrograms.filter(p => {
    const s = p.signals || {};
    return s.has_coach_reply;
  });
  const responseRate = contacted.length > 0 ? Math.round((replied.length / contacted.length) * 100) : 0;

  // Replies this week
  const weekAgo = new Date(now.getTime() - 7 * 86400000).toISOString();
  const repliesThisWeek = interactions.filter(i =>
    (i.type === "coach_reply" || i.type === "email_received" || i.type === "Coach Reply") && i.date_time && i.date_time >= weekAgo
  );
  const lastReply = repliesThisWeek.length > 0
    ? repliesThisWeek.sort((a, b) => (b.date_time || "").localeCompare(a.date_time || ""))[0]
    : null;

  // Awaiting reply
  const awaitingReply = activePrograms.filter(p => {
    const s = p.signals || {};
    return (s.outreach_count || 0) > 0 && !s.has_coach_reply;
  });

  // Follow-ups due
  const followUpsDue = activePrograms.filter(p =>
    p.next_action_due && p.next_action_due <= today
  ).sort((a, b) => (a.next_action_due || "").localeCompare(b.next_action_due || ""));

  // Needs first outreach
  const needsOutreach = activePrograms.filter(p => {
    const s = p.signals || {};
    return (s.outreach_count || 0) === 0 && p.board_group === "needs_outreach";
  }).sort((a, b) => (b.created_at || "").localeCompare(a.created_at || ""));

  // Spotlight: active programs with signals
  const spotlightSchools = activePrograms.filter(p => {
    const s = p.signals || {};
    return (s.outreach_count || 0) > 0 || (p.journey_rail || {}).active !== "added";
  }).sort((a, b) => {
    const aOverdue = a.next_action_due && a.next_action_due <= today ? 0 : 1;
    const bOverdue = b.next_action_due && b.next_action_due <= today ? 0 : 1;
    return aOverdue - bOverdue || (b.updated_at || b.created_at || "").localeCompare(a.updated_at || a.created_at || "");
  });

  // Recent activity
  const recentActivity = interactions.slice(0, 7);

  // Upcoming events
  const upcoming = events.filter(e => e.start_date >= today).sort((a, b) => a.start_date.localeCompare(b.start_date)).slice(0, 4);

  const formatTimeAgo = (dateStr) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    const diff = (now - d) / 1000;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 172800) return "Yesterday";
    if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const getDaysAgo = (dateStr) => {
    if (!dateStr) return "";
    const d = new Date(dateStr + "T00:00:00");
    const diff = Math.ceil((now - d) / 86400000);
    if (diff === 0) return "today";
    if (diff === 1) return "1 day ago";
    return `${diff} days ago`;
  };

  const interactionDotColor = (type) => {
    const t = (type || "").toLowerCase();
    if (t.includes("reply") || t.includes("coach") || t === "email_received") return "#10b981";
    if (t.includes("email") || t.includes("follow")) return "#1a8a80";
    if (t.includes("camp")) return "#f59e0b";
    if (t.includes("visit")) return "#06b6d4";
    if (t.includes("note")) return "#3b82f6";
    return "#a855f7";
  };

  const interactionTitle = (ix) => {
    const t = (ix.type || "").toLowerCase();
    const school = ix.university_name || "";
    if (t.includes("coach_reply") || t.includes("reply")) return { text: "Coach replied \u2014 ", highlight: school };
    if (t === "email_received") return { text: "Coach replied \u2014 ", highlight: school };
    if (t.includes("email") || t.includes("intro")) return { text: "Sent email to ", highlight: school };
    if (t.includes("follow")) return { text: "Sent follow-up to ", highlight: school };
    if (t.includes("visit")) return { text: "Campus visit at ", highlight: school };
    if (t.includes("showcase")) return { text: "Showcase for ", highlight: school };
    if (t.includes("camp")) return { text: "Attended camp at ", highlight: school };
    if (t.includes("call") || t.includes("phone")) return { text: "Phone call with ", highlight: school };
    if (t.includes("stage")) return { text: "Stage update \u2014 ", highlight: school };
    return { text: `${ix.type || "Activity"} \u2014 `, highlight: school };
  };

  return (
    <div className="space-y-5" data-testid="athlete-dashboard">
      {/* ═══ Section 1: Greeting + Quick Pulse ═══ */}
      <div className="rounded-xl overflow-hidden cm-surface cm-shadow" style={{ background: "var(--cm-surface)" }} data-testid="greeting-pulse">
        <div style={{ height: 2, background: "linear-gradient(90deg, #1a8a80 0%, rgba(26,138,128,0.2) 100%)" }} />
        <div className="flex items-start justify-between px-6 py-5 lg:px-7 lg:py-6">
          <div>
            <h2 className="text-xl lg:text-2xl font-extrabold tracking-tight" style={{ color: "var(--cm-text)" }} data-testid="dashboard-greeting">
              {greeting}, <span style={{ color: "#1a8a80" }}>{firstName}</span>
            </h2>
            <p className="text-sm mt-1" style={{ color: "var(--cm-text-3)" }}>
              Here's what's happening with {firstName}'s recruiting today
            </p>
          </div>
          <div className="text-xs font-semibold px-3 py-1.5 rounded-lg flex-shrink-0" style={{ backgroundColor: "var(--cm-surface-2)", color: "var(--cm-text-3)" }}>
            {dateStr}
          </div>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 border-t" style={{ borderColor: "var(--cm-border)" }}>
          <PulseStat icon={Target} iconBg="rgba(26,138,128,0.15)" iconColor="#1a8a80" value={totalSchools} label="Schools Tracked" sub={needsOutreach.length > 0 ? `${needsOutreach.length} need outreach` : "All contacted"} onClick={() => navigate("/pipeline")} />
          <PulseStat icon={MessageCircle} iconBg="rgba(59,130,246,0.15)" iconColor="#60a5fa" value={`${responseRate}%`} label="Response Rate" sub={`${replied.length} of ${contacted.length} contacted`} />
          <PulseStat icon={Mail} iconBg="rgba(16,185,129,0.15)" iconColor="#34d399" value={repliesThisWeek.length} label="Replies This Week" sub={lastReply ? `Last: ${lastReply.university_name || ""}` : "\u2014"} />
          <PulseStat icon={Clock} iconBg="rgba(245,158,11,0.15)" iconColor="#fbbf24" value={awaitingReply.length} label="Awaiting Reply" sub={awaitingReply.length > 0 ? `Oldest: ${getDaysAgo(awaitingReply[0]?.created_at?.split("T")[0] || "")}` : "\u2014"} />
        </div>
      </div>

      {/* ═══ Section 2: Today's Actions ═══ */}
      <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: "var(--cm-surface)", borderColor: "var(--cm-border)" }} data-testid="todays-actions">
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: "var(--cm-border)" }}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: "rgba(239,68,68,0.12)" }}>
              <Zap className="w-4 h-4" style={{ color: "#ef4444" }} strokeWidth={2} />
            </div>
            <h3 className="text-sm font-bold" style={{ color: "var(--cm-text)" }}>Today's Actions</h3>
          </div>
          <button onClick={() => navigate("/pipeline")} className="text-xs font-semibold flex items-center gap-1 transition-opacity hover:opacity-80" style={{ color: "#1a8a80" }} data-testid="view-all-schools-btn">
            View all schools <ChevronRight className="w-3 h-3" />
          </button>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2">
          {/* Left: Follow-ups Due */}
          <div className="border-r-0 lg:border-r" style={{ borderColor: "var(--cm-border)" }}>
            <div className="flex items-center justify-between px-5 py-3 border-b" style={{ borderColor: "var(--cm-border)" }}>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: "#ef4444" }} />
                <span className="text-xs font-bold" style={{ color: "var(--cm-text)" }}>Follow-ups Due</span>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md" style={{ backgroundColor: "rgba(239,68,68,0.12)", color: "#ef4444" }}>{followUpsDue.length}</span>
            </div>
            {followUpsDue.length > 0 ? followUpsDue.slice(0, 4).map(p => (
              <ActionRow key={p.program_id}
                school={p.university_name}
                detail={p.next_action_due === today ? "Follow-up due today" : `Follow-up overdue \u00B7 ${getDaysAgo(p.next_action_due)}`}
                badge={p.next_action_due === today ? "Today" : "Overdue"}
                badgeBg={p.next_action_due === today ? "rgba(245,158,11,0.12)" : "rgba(239,68,68,0.12)"}
                badgeColor={p.next_action_due === today ? "#f59e0b" : "#ef4444"}
                onClick={() => navigate(`/pipeline/${p.program_id}`)}
              />
            )) : (
              <div className="text-center py-8 px-5">
                <CheckCircle className="w-7 h-7 mx-auto mb-2" style={{ color: "var(--cm-text-3)" }} />
                <p className="text-xs" style={{ color: "var(--cm-text-2)" }}>All caught up! No follow-ups due.</p>
              </div>
            )}
          </div>
          {/* Right: Needs First Outreach */}
          <div>
            <div className="flex items-center justify-between px-5 py-3 border-b border-t lg:border-t-0" style={{ borderColor: "var(--cm-border)" }}>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: "#3b82f6" }} />
                <span className="text-xs font-bold" style={{ color: "var(--cm-text)" }}>Needs First Outreach</span>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md" style={{ backgroundColor: "rgba(59,130,246,0.12)", color: "#3b82f6" }}>{needsOutreach.length}</span>
            </div>
            {needsOutreach.length > 0 ? needsOutreach.slice(0, 4).map(p => (
              <ActionRow key={p.program_id}
                school={p.university_name}
                detail={`${p.division || "\u2014"} \u00B7 Added ${getDaysAgo(p.created_at?.split("T")[0] || "")} \u00B7 No contact yet`}
                badge={p.division || "\u2014"}
                badgeBg="rgba(168,85,247,0.12)"
                badgeColor="#a855f7"
                onClick={() => navigate(`/pipeline/${p.program_id}`)}
              />
            )) : (
              <div className="text-center py-8 px-5">
                <Send className="w-7 h-7 mx-auto mb-2" style={{ color: "var(--cm-text-3)" }} />
                <p className="text-xs" style={{ color: "var(--cm-text-2)" }}>All schools contacted!</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ═══ Section 3: School Spotlight ═══ */}
      {spotlightSchools.length > 0 && (
        <div data-testid="school-spotlight" className="mt-6">
          <div className="flex items-center justify-between mb-3 px-1">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: "rgba(168,85,247,0.12)" }}>
                <Sparkles className="w-4 h-4" style={{ color: "#a855f7" }} strokeWidth={2} />
              </div>
              <h3 className="text-sm font-bold" style={{ color: "var(--cm-text)" }}>School Spotlight</h3>
            </div>
            {spotlightSchools.length > 4 && (
              <button onClick={() => setSpotlightExpanded(!spotlightExpanded)}
                className="text-xs font-semibold flex items-center gap-1 transition-opacity hover:opacity-80"
                style={{ color: "#1a8a80" }} data-testid="spotlight-toggle-btn">
                {spotlightExpanded ? "Show less" : `View all ${spotlightSchools.length}`}
                {spotlightExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
            )}
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2" style={{ scrollbarWidth: "none", WebkitOverflowScrolling: "touch" }}>
            {(spotlightExpanded ? spotlightSchools : spotlightSchools.slice(0, 6)).map(p => (
              <SpotlightCard key={p.program_id} program={p} onClick={() => navigate(`/pipeline/${p.program_id}`)} />
            ))}
            <div className="min-w-[250px] max-w-[250px] rounded-xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-colors flex-shrink-0 py-8"
              style={{ borderColor: "var(--cm-border)", color: "var(--cm-text-3)" }}
              onClick={() => navigate("/schools")}
              onMouseEnter={e => e.currentTarget.style.borderColor = "var(--cm-text-3)"}
              onMouseLeave={e => e.currentTarget.style.borderColor = "var(--cm-border)"}
              data-testid="add-school-spotlight">
              <span className="text-2xl mb-1" style={{ color: "var(--cm-text-3)" }}>+</span>
              <span className="text-xs font-semibold" style={{ color: "var(--cm-text-2)" }}>Browse Schools</span>
              <span className="text-[11px] mt-0.5" style={{ color: "var(--cm-text-3)" }}>Find more programs</span>
            </div>
          </div>
        </div>
      )}

      {/* ═══ Section 4 + 5: Who's Watching + Activity ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <WhosWatching />
        {/* Recent Activity Feed */}
        <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: "var(--cm-surface)", borderColor: "var(--cm-border)" }} data-testid="recent-activity">
          <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: "var(--cm-border)" }}>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: "rgba(59,130,246,0.12)" }}>
                <Activity className="w-4 h-4" style={{ color: "#3b82f6" }} strokeWidth={2} />
              </div>
              <h3 className="text-sm font-bold" style={{ color: "var(--cm-text)" }}>Recent Activity</h3>
            </div>
          </div>
          {recentActivity.length > 0 ? (
            <div>
              {recentActivity.map((ix, i) => {
                const t = interactionTitle(ix);
                return (
                  <FeedItem key={ix.interaction_id || i}
                    dotColor={interactionDotColor(ix.type)}
                    title={t.text} titleHighlight={t.highlight}
                    detail={ix.notes || ix.outcome || ""}
                    time={formatTimeAgo(ix.date_time || ix.created_at)}
                    showLine={i < recentActivity.length - 1}
                    onClick={ix.program_id ? () => navigate(`/pipeline/${ix.program_id}`) : undefined}
                  />
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12 px-5">
              <Activity className="w-8 h-8 mx-auto mb-2" style={{ color: "var(--cm-text-3)" }} />
              <p className="text-sm" style={{ color: "var(--cm-text-2)" }}>No activity yet</p>
              <p className="text-xs mt-1" style={{ color: "var(--cm-text-3)" }}>Start by contacting a school</p>
            </div>
          )}
        </div>
      </div>

      {/* ═══ Section 6: Upcoming Events ═══ */}
      <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: "var(--cm-surface)", borderColor: "var(--cm-border)" }} data-testid="upcoming-events">
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: "var(--cm-border)" }}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: "rgba(245,158,11,0.12)" }}>
              <Calendar className="w-4 h-4" style={{ color: "#f59e0b" }} strokeWidth={2} />
            </div>
            <h3 className="text-sm font-bold" style={{ color: "var(--cm-text)" }}>Coming Up</h3>
          </div>
          <button onClick={() => navigate("/calendar")} className="text-xs font-semibold flex items-center gap-1 transition-opacity hover:opacity-80" style={{ color: "#1a8a80" }} data-testid="open-calendar-btn">
            Open calendar <ChevronRight className="w-3 h-3" />
          </button>
        </div>
        {upcoming.length > 0 ? (
          <div className="flex flex-col lg:flex-row">
            {upcoming.map(evt => (
              <EventCard key={evt.event_id} event={evt} onClick={() => navigate("/calendar")} />
            ))}
          </div>
        ) : (
          <div className="text-center py-10 px-5">
            <Calendar className="w-8 h-8 mx-auto mb-2" style={{ color: "var(--cm-text-3)" }} />
            <p className="text-sm" style={{ color: "var(--cm-text-2)" }}>No upcoming events</p>
            <button onClick={() => navigate("/calendar")} className="mt-2 text-sm font-semibold transition-opacity hover:opacity-80" style={{ color: "#1a8a80" }}>+ Add event</button>
          </div>
        )}
      </div>

      {/* ═══ Empty state ═══ */}
      {totalSchools === 0 && (
        <div className="rounded-xl border-2 border-dashed p-8 text-center" style={{ borderColor: "rgba(26,138,128,0.2)" }} data-testid="dashboard-empty">
          <Target className="w-10 h-10 mx-auto mb-3" style={{ color: "#1a8a80" }} />
          <h3 className="text-base font-bold mb-1" style={{ color: "var(--cm-text)" }}>Start your recruiting journey</h3>
          <p className="text-sm max-w-sm mx-auto mb-4" style={{ color: "var(--cm-text-2)" }}>
            Add schools to your board to track outreach, follow-ups, and conversations with college coaches.
          </p>
          <button onClick={() => navigate("/schools")}
            className="px-5 py-2.5 text-white text-sm font-semibold rounded-lg transition-colors"
            style={{ background: "#1a8a80" }}
            data-testid="add-first-school-btn">
            Browse Schools
          </button>
        </div>
      )}
    </div>
  );
}

import { useState } from "react";
import {
  Eye, TrendingDown, TrendingUp, Minus, Clock, User, Mail, CalendarPlus,
  AlertCircle, Activity, MessageCircle, ArrowUpRight,
} from "lucide-react";

/* ── Signal Interpretation Engine ── */
function interpretSignals({ signals, engagement, coaches, coachWatch, timeline }) {
  const s = signals || {};
  const eng = engagement || {};
  const daysSince = s.days_since_activity;
  const outreach = s.outreach_count || 0;
  const replies = s.reply_count || 0;
  const hasReply = s.has_coach_reply;
  const opens = eng.total_opens || 0;
  const clicks = eng.total_clicks || 0;
  const uniqueOpens = eng.unique_opens || 0;
  const timelineLen = (timeline || []).length;

  // Determine interest level
  let interestLevel, interestColor;
  if (hasReply || replies > 0) { interestLevel = "Active"; interestColor = "#22c55e"; }
  else if (opens > 2 || clicks > 0) { interestLevel = "Moderate"; interestColor = "#f59e0b"; }
  else if (opens > 0 || uniqueOpens > 0) { interestLevel = "Low"; interestColor = "#f97316"; }
  else { interestLevel = "None yet"; interestColor = "#94a3b8"; }

  // Determine trend
  let trend, trendIcon, trendColor;
  if (hasReply && daysSince != null && daysSince <= 3) {
    trend = "Rising"; trendIcon = TrendingUp; trendColor = "#22c55e";
  } else if (daysSince != null && daysSince > 7) {
    trend = "Cooling"; trendIcon = TrendingDown; trendColor = "#ef4444";
  } else if (daysSince != null && daysSince > 3) {
    trend = "Slowing"; trendIcon = TrendingDown; trendColor = "#f59e0b";
  } else if (outreach > 0 || timelineLen > 0) {
    trend = "Stable"; trendIcon = Minus; trendColor = "#94a3b8";
  } else {
    trend = "No data"; trendIcon = Minus; trendColor = "#64748b";
  }

  // Most engaged contact
  let mostEngaged = "No contacts";
  if (coaches && coaches.length > 0) {
    const primary = coaches.find(c => (c.role || "").toLowerCase().includes("assistant"))
      || coaches.find(c => (c.role || "").toLowerCase().includes("recruiting"))
      || coaches[0];
    mostEngaged = primary ? `${primary.role || "Coach"}` : "Head Coach";
  }

  // Last activity
  let lastActivity;
  if (daysSince == null) lastActivity = "No activity";
  else if (daysSince === 0) lastActivity = "Today";
  else if (daysSince === 1) lastActivity = "Yesterday";
  else lastActivity = `${daysSince} days`;

  // Status headline + pill
  let headline, pill, pillColor, pillBg;
  if (hasReply) {
    headline = "Interest is increasing";
    pill = "High interest"; pillColor = "#22c55e"; pillBg = "rgba(34,197,94,0.1)";
  } else if (daysSince != null && daysSince > 14) {
    headline = "Interest is cooling";
    pill = "At risk"; pillColor = "#ef4444"; pillBg = "rgba(239,68,68,0.08)";
  } else if (daysSince != null && daysSince > 7) {
    headline = "Interest is cooling";
    pill = "Monitor closely"; pillColor = "#f59e0b"; pillBg = "rgba(245,158,11,0.1)";
  } else if (opens > 0 && !hasReply) {
    headline = "Passive interest detected";
    pill = "Watching"; pillColor = "#3b82f6"; pillBg = "rgba(59,130,246,0.1)";
  } else if (outreach > 0 && daysSince != null && daysSince <= 7) {
    headline = "Momentum is stable";
    pill = "Stable"; pillColor = "#94a3b8"; pillBg = "rgba(148,163,184,0.08)";
  } else if (timelineLen === 0 && outreach === 0) {
    headline = "No relationship started";
    pill = "New"; pillColor = "#64748b"; pillBg = "rgba(100,116,139,0.1)";
  } else {
    headline = "Relationship forming";
    pill = "Early stage"; pillColor = "#0d9488"; pillBg = "rgba(13,148,136,0.1)";
  }

  // Plain-language summary
  let summary;
  if (coachWatch?.summary) {
    summary = coachWatch.summary;
  } else if (hasReply) {
    summary = "A coach has responded to your outreach. This is a strong positive signal. Keep the conversation going.";
  } else if (daysSince != null && daysSince > 7 && outreach > 0) {
    summary = `No meaningful coach engagement in the last ${daysSince} days. Activity exists, but it has not turned into a reply yet.`;
  } else if (opens > 0 && !hasReply) {
    summary = `This school is showing passive interest with ${opens} email open${opens > 1 ? "s" : ""}, but no direct response yet.`;
  } else if (outreach > 0 && daysSince != null && daysSince <= 7) {
    summary = "Your recent outreach is still fresh. Give coaches a few more days to respond before following up.";
  } else if (timelineLen === 0) {
    summary = "No outreach or interactions yet. Start by adding a coach contact and sending a personalized email.";
  } else {
    summary = "Early activity recorded. Continue building the relationship with consistent, thoughtful outreach.";
  }

  // Recommended action
  let action;
  if (coachWatch?.recommendation) {
    action = coachWatch.recommendation;
  } else if (hasReply) {
    action = "Follow up within 24 hours while interest is high.";
  } else if (daysSince != null && daysSince > 7) {
    action = "Send a short follow-up with an updated highlight this week while the relationship is still warm enough to re-engage.";
  } else if (opens > 0 && !hasReply && outreach > 0) {
    action = "Your emails are getting opened. Try a different angle or mention a recent achievement in your next message.";
  } else if (outreach > 0 && daysSince != null && daysSince <= 7) {
    action = "Pause outreach for now and wait for a reply signal. If no response in 5 days, send a brief follow-up.";
  } else if (timelineLen === 0) {
    action = "Add the coaching staff and send your first personalized introduction email.";
  } else {
    action = "Keep building momentum with consistent outreach. Quality over quantity.";
  }

  // Recent signals
  const recentSignals = [];
  if (opens > 0) {
    recentSignals.push({
      color: "#3b82f6", icon: Eye,
      title: `Email opened ${opens} time${opens > 1 ? "s" : ""}`,
      detail: uniqueOpens > 0 ? `${uniqueOpens} unique coach open${uniqueOpens > 1 ? "s" : ""}` : "Passive interest detected",
      time: "This month",
    });
  }
  if (clicks > 0) {
    recentSignals.push({
      color: "#22c55e", icon: ArrowUpRight,
      title: `Link clicked ${clicks} time${clicks > 1 ? "s" : ""}`,
      detail: "Coaches are engaging with your content",
      time: "Recent",
    });
  }
  if (hasReply) {
    recentSignals.push({
      color: "#22c55e", icon: MessageCircle,
      title: "Coach replied",
      detail: "Direct engagement confirmed",
      time: s.last_reply_date ? formatRelative(s.last_reply_date) : "Recent",
    });
  }
  if (outreach > 0 && !hasReply) {
    recentSignals.push({
      color: "#f59e0b", icon: AlertCircle,
      title: "No reply after outreach",
      detail: outreach === 1 ? "Your first message hasn't received a response yet" : `${outreach} messages sent without a reply`,
      time: s.last_outreach_date ? formatRelative(s.last_outreach_date) : "",
    });
  }
  if (daysSince != null && daysSince > 5) {
    recentSignals.push({
      color: "#94a3b8", icon: Clock,
      title: `${daysSince} days since last activity`,
      detail: "Relationship may need re-engagement",
      time: "",
    });
  }
  if (recentSignals.length === 0) {
    recentSignals.push({
      color: "#64748b", icon: Activity,
      title: "No signals yet",
      detail: "Start outreach to generate relationship signals",
      time: "",
    });
  }

  return {
    headline, pill, pillColor, pillBg, summary, action,
    stats: [
      { label: "Interest level", value: interestLevel, color: interestColor },
      { label: "Trend", value: trend, Icon: trendIcon, color: trendColor },
      { label: "Last activity", value: lastActivity, color: daysSince != null && daysSince > 7 ? "#f59e0b" : "var(--cm-text)" },
      { label: "Most engaged", value: mostEngaged, color: "var(--cm-text)" },
    ],
    recentSignals: recentSignals.slice(0, 4),
  };
}

function formatRelative(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  const diff = Math.floor((Date.now() - d.getTime()) / 86400000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  if (diff < 7) return `${diff} days ago`;
  if (diff < 30) return `${Math.floor(diff / 7)}w ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/* ── Coach Watch Card ── */
export default function CoachWatchCard({ signals, engagement, coaches, coachWatch, timeline, onEmail, onFollowUp }) {
  const [expanded, setExpanded] = useState(false);
  const data = interpretSignals({ signals, engagement, coaches, coachWatch, timeline });

  return (
    <div className="rounded-xl overflow-hidden" style={{ backgroundColor: "var(--cm-surface)", border: "1px solid var(--cm-border)" }} data-testid="coach-watch-card">
      {/* Accent bar */}
      <div style={{ height: 2, background: `linear-gradient(90deg, ${data.pillColor}, ${data.pillColor}33)` }} />

      <div className="p-4 pb-3">
        {/* Header */}
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-2">
            <Eye className="w-3.5 h-3.5" style={{ color: data.pillColor }} />
            <span className="text-[10px] font-extrabold uppercase tracking-widest" style={{ color: "var(--cm-text-3)" }}>Coach Watch</span>
          </div>
          <span className="text-[9px] font-bold px-2 py-0.5 rounded-full"
            style={{ color: data.pillColor, backgroundColor: data.pillBg, border: `1px solid ${data.pillColor}22` }}
            data-testid="coach-watch-status-pill">
            {data.pill}
          </span>
        </div>

        {/* Status headline */}
        <h4 className="text-sm font-bold mb-1.5" style={{ color: "var(--cm-text)" }} data-testid="coach-watch-headline">
          {data.headline}
        </h4>

        {/* Summary */}
        <p className="text-[11px] leading-relaxed mb-4" style={{ color: "var(--cm-text-2)" }} data-testid="coach-watch-summary">
          {data.summary}
        </p>

        {/* 2x2 Stats Grid */}
        <div className="grid grid-cols-2 gap-2 mb-4" data-testid="coach-watch-stats">
          {data.stats.map(stat => (
            <div key={stat.label} className="px-3 py-2.5 rounded-lg" style={{ backgroundColor: "var(--cm-card-stat)" }}>
              <p className="text-[9px] font-semibold uppercase tracking-wide mb-1" style={{ color: "var(--cm-text-3)" }}>{stat.label}</p>
              <div className="flex items-center gap-1.5">
                {stat.Icon && <stat.Icon className="w-3 h-3" style={{ color: stat.color }} />}
                <span className="text-xs font-bold" style={{ color: stat.color }}>{stat.value}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Recommended Action */}
        <div className="rounded-lg px-3.5 py-3 mb-3.5"
          style={{ backgroundColor: "rgba(13,148,136,0.06)", border: "1px solid rgba(13,148,136,0.15)" }}
          data-testid="coach-watch-recommendation">
          <p className="text-[9px] font-bold uppercase tracking-wide mb-1.5" style={{ color: "#0d9488" }}>Recommended action</p>
          <p className="text-[11px] font-medium leading-relaxed" style={{ color: "var(--cm-text)" }}>
            {data.action}
          </p>
        </div>

        {/* CTA Buttons */}
        <div className="flex gap-2 mb-3" data-testid="coach-watch-ctas">
          <button onClick={onEmail}
            className="flex-1 flex items-center justify-center gap-1.5 h-8 rounded-lg text-[11px] font-semibold transition-colors"
            style={{ backgroundColor: "#0d9488", color: "#fff" }}
            data-testid="coach-watch-email-btn">
            <Mail className="w-3 h-3" /> Email now
          </button>
          <button onClick={onFollowUp}
            className="flex-1 flex items-center justify-center gap-1.5 h-8 rounded-lg text-[11px] font-semibold transition-colors"
            style={{ color: "var(--cm-text-2)", border: "1px solid var(--cm-border)", backgroundColor: "transparent" }}
            data-testid="coach-watch-followup-btn">
            <CalendarPlus className="w-3 h-3" /> Create follow-up
          </button>
        </div>
      </div>

      {/* Recent Signals */}
      <div style={{ borderTop: "1px solid var(--cm-border)" }}>
        <button onClick={() => setExpanded(!expanded)}
          className="w-full px-4 py-2.5 flex items-center justify-between text-[10px] font-bold uppercase tracking-wide transition-colors hover:bg-white/[0.02]"
          style={{ color: "var(--cm-text-3)" }}
          data-testid="coach-watch-signals-toggle">
          <span>Recent signals ({data.recentSignals.length})</span>
          <span style={{ fontSize: 8, transform: expanded ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}>&#9660;</span>
        </button>

        {expanded && (
          <div className="px-4 pb-3.5 space-y-2.5" data-testid="coach-watch-signals-list">
            {data.recentSignals.map((sig, i) => (
              <div key={i} className="flex items-start gap-2.5">
                <div className="w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 mt-0.5"
                  style={{ backgroundColor: `${sig.color}15` }}>
                  <sig.icon className="w-2.5 h-2.5" style={{ color: sig.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-semibold" style={{ color: "var(--cm-text)" }}>{sig.title}</p>
                  <p className="text-[10px]" style={{ color: "var(--cm-text-3)" }}>{sig.detail}</p>
                </div>
                {sig.time && (
                  <span className="text-[9px] font-medium flex-shrink-0 mt-0.5" style={{ color: "var(--cm-text-4, var(--cm-text-3))" }}>{sig.time}</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

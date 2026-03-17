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

  // Interest level
  let interestLevel, interestColor;
  if (hasReply || replies > 0) { interestLevel = "Active"; interestColor = "#22c55e"; }
  else if (opens > 2 || clicks > 0) { interestLevel = "Moderate"; interestColor = "#f59e0b"; }
  else if (opens > 0 || uniqueOpens > 0) { interestLevel = "Low"; interestColor = "#f97316"; }
  else { interestLevel = "None yet"; interestColor = "#94a3b8"; }

  // Trend
  let trend, trendIcon, trendColor;
  if (hasReply && daysSince != null && daysSince <= 3) {
    trend = "Increasing"; trendIcon = TrendingUp; trendColor = "#22c55e";
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
  else lastActivity = `${daysSince} days ago`;

  // Status headline + pill
  let headline, pill, pillColor, pillBg;
  if (hasReply) {
    headline = "Interest is increasing";
    pill = "High Interest"; pillColor = "#22c55e"; pillBg = "rgba(34,197,94,0.1)";
  } else if (daysSince != null && daysSince > 14) {
    headline = "Interest is cooling";
    pill = "At Risk"; pillColor = "#ef4444"; pillBg = "rgba(239,68,68,0.08)";
  } else if (daysSince != null && daysSince > 7) {
    headline = "Interest is cooling";
    pill = "Monitor"; pillColor = "#f59e0b"; pillBg = "rgba(245,158,11,0.1)";
  } else if (opens > 0 && !hasReply) {
    headline = "Passive interest detected";
    pill = "Monitor"; pillColor = "#3b82f6"; pillBg = "rgba(59,130,246,0.1)";
  } else if (outreach > 0 && daysSince != null && daysSince <= 7) {
    headline = "Stable but early";
    pill = "Early Stage"; pillColor = "#94a3b8"; pillBg = "rgba(148,163,184,0.08)";
  } else if (timelineLen === 0 && outreach === 0) {
    headline = "No relationship started";
    pill = "Early Stage"; pillColor = "#64748b"; pillBg = "rgba(100,116,139,0.1)";
  } else {
    headline = "Stable but early";
    pill = "Early Stage"; pillColor = "#0d9488"; pillBg = "rgba(13,148,136,0.1)";
  }

  // Summary — 1-2 short lines
  let summary;
  if (coachWatch?.summary) {
    summary = coachWatch.summary;
  } else if (hasReply) {
    summary = "A coach has responded. Keep the conversation going.";
  } else if (daysSince != null && daysSince > 7 && outreach > 0) {
    summary = `No meaningful coach engagement in the last ${daysSince} days. Activity has not converted into replies.`;
  } else if (opens > 0 && !hasReply) {
    summary = clicks > 0
      ? "A coach engaged with your content but hasn't replied yet. Interest is building."
      : opens > 2
        ? "Your message was viewed multiple times. Passive interest is present but no reply yet."
        : "A coach opened your message but hasn't responded yet.";
  } else if (outreach > 0 && opens === 0 && !hasReply) {
    summary = "No engagement with your last outreach. Your message hasn't been opened yet.";
  } else if (outreach > 0 && daysSince != null && daysSince <= 7) {
    summary = "Recent outreach is still fresh. Give coaches a few more days to respond.";
  } else if (timelineLen === 0) {
    summary = "No outreach yet. Add a coach contact and send your first email.";
  } else {
    summary = "Early activity recorded. Continue with consistent outreach.";
  }

  // Recommended action — one clear sentence
  let action;
  if (coachWatch?.recommendation) {
    action = coachWatch.recommendation;
  } else if (hasReply) {
    action = "Follow up within 24 hours while interest is high.";
  } else if (daysSince != null && daysSince > 7) {
    action = "Send a short follow-up with updated highlight this week.";
  } else if (opens > 0 && !hasReply && outreach > 0) {
    action = clicks > 0
      ? "They're engaging with your content. Send a direct follow-up referencing what they clicked."
      : "Your emails are getting opened. Try a different angle or share a recent highlight.";
  } else if (outreach > 0 && opens === 0 && !hasReply) {
    action = "Your message hasn't been opened. Try a new subject line or a different contact.";
  } else if (outreach > 0 && daysSince != null && daysSince <= 7) {
    action = "Pause outreach and wait for reply signal.";
  } else if (timelineLen === 0) {
    action = "Add coaching staff and send your first introduction.";
  } else {
    action = "Keep building momentum with consistent outreach.";
  }

  // Recent signals — max 2, plain-language engagement signals
  const recentSignals = [];
  if (hasReply) {
    recentSignals.push({ color: "#22c55e", icon: MessageCircle, title: "Coach replied to your message", detail: "Direct conversation started" });
  }
  if (clicks > 0 && recentSignals.length < 2) {
    recentSignals.push({ color: "#22c55e", icon: ArrowUpRight, title: "Coach engaged with your content", detail: "Your highlight link was clicked" });
  }
  if (opens > 2 && recentSignals.length < 2) {
    recentSignals.push({ color: "#3b82f6", icon: Eye, title: "Coach viewed your message multiple times", detail: "Repeat interest is a strong signal" });
  } else if (opens > 0 && recentSignals.length < 2) {
    recentSignals.push({ color: "#3b82f6", icon: Eye, title: "Coach opened your message", detail: opens > 1 ? `Opened ${opens} times` : "Passive interest detected" });
  }
  if (outreach > 0 && opens === 0 && !hasReply && recentSignals.length < 2) {
    recentSignals.push({ color: "#f59e0b", icon: AlertCircle, title: "No engagement with your last message", detail: "Your outreach hasn't been opened yet" });
  }
  if (daysSince != null && daysSince > 5 && recentSignals.length < 2) {
    recentSignals.push({ color: "#94a3b8", icon: Clock, title: `${daysSince} days since last activity`, detail: "May need re-engagement" });
  }
  if (recentSignals.length === 0) {
    recentSignals.push({ color: "#64748b", icon: Activity, title: "No signals yet", detail: "Start outreach to generate signals" });
  }

  return {
    headline, pill, pillColor, pillBg, summary, action,
    stats: [
      { label: "Interest", value: interestLevel, color: interestColor },
      { label: "Trend", value: trend, Icon: trendIcon, color: trendColor },
      { label: "Last Activity", value: lastActivity, color: daysSince != null && daysSince > 7 ? "#f59e0b" : "var(--cm-text)" },
      { label: "Most Engaged", value: mostEngaged, color: "var(--cm-text)" },
    ],
    recentSignals: recentSignals.slice(0, 2),
  };
}

/* ── Coach Watch Card ── */
export default function CoachWatchCard({ signals, engagement, coaches, coachWatch, timeline, onEmail, onFollowUp }) {
  const [showSignals, setShowSignals] = useState(false);
  const data = interpretSignals({ signals, engagement, coaches, coachWatch, timeline });

  return (
    <div className="rounded-xl overflow-hidden" style={{ backgroundColor: "var(--cm-surface)", border: "1px solid var(--cm-border)" }} data-testid="coach-watch-card">
      <div style={{ height: 2, background: `linear-gradient(90deg, ${data.pillColor}, ${data.pillColor}33)` }} />

      <div className="px-4 pt-3.5 pb-3">
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <Eye className="w-3 h-3" style={{ color: data.pillColor }} />
            <span className="text-[9px] font-extrabold uppercase tracking-widest" style={{ color: "var(--cm-text-3)" }}>Coach Watch</span>
          </div>
          <span className="text-[8px] font-bold px-1.5 py-px rounded-full"
            style={{ color: data.pillColor, backgroundColor: data.pillBg, border: `1px solid ${data.pillColor}22` }}
            data-testid="coach-watch-status-pill">
            {data.pill}
          </span>
        </div>

        {/* Headline */}
        <h4 className="text-[13px] font-bold mb-1" style={{ color: "var(--cm-text)" }} data-testid="coach-watch-headline">
          {data.headline}
        </h4>

        {/* Summary — 1-2 lines max */}
        <p className="text-[10.5px] leading-snug mb-1.5" style={{ color: "var(--cm-text-2)" }} data-testid="coach-watch-summary">
          {data.summary}
        </p>

        {/* Raw engagement metrics — subtle supporting data */}
        {(engagement?.total_opens > 0 || engagement?.total_clicks > 0) && (
          <p className="text-[8px] mb-3" style={{ color: "var(--cm-text-3)", opacity: 0.7 }} data-testid="coach-watch-raw-metrics">
            {[
              engagement.total_opens > 0 && `${engagement.total_opens} open${engagement.total_opens > 1 ? "s" : ""}`,
              engagement.total_clicks > 0 && `${engagement.total_clicks} click${engagement.total_clicks > 1 ? "s" : ""}`,
              engagement.unique_opens > 0 && `${engagement.unique_opens} unique`,
            ].filter(Boolean).join(" · ")}
          </p>
        )}
        {(!engagement?.total_opens && !engagement?.total_clicks) && <div className="mb-1.5" />}

        {/* 2x2 Stats */}
        <div className="grid grid-cols-2 gap-1.5 mb-3" data-testid="coach-watch-stats">
          {data.stats.map(stat => (
            <div key={stat.label} className="px-2.5 py-2 rounded-lg" style={{ backgroundColor: "var(--cm-card-stat)" }}>
              <p className="text-[8px] font-semibold uppercase tracking-wide mb-0.5" style={{ color: "var(--cm-text-3)" }}>{stat.label}</p>
              <div className="flex items-center gap-1">
                {stat.Icon && <stat.Icon className="w-2.5 h-2.5" style={{ color: stat.color }} />}
                <span className="text-[11px] font-bold" style={{ color: stat.color }}>{stat.value}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Recommended Action */}
        <div className="rounded-lg px-3 py-2.5 mb-3"
          style={{ backgroundColor: "rgba(13,148,136,0.06)", border: "1px solid rgba(13,148,136,0.12)" }}
          data-testid="coach-watch-recommendation">
          <p className="text-[8px] font-bold uppercase tracking-wide mb-1" style={{ color: "#0d9488" }}>Recommended action</p>
          <p className="text-[10.5px] font-medium leading-snug" style={{ color: "var(--cm-text)" }}>{data.action}</p>
        </div>

        {/* CTAs */}
        <div className="flex gap-2" data-testid="coach-watch-ctas">
          <button onClick={onEmail}
            className="flex-1 flex items-center justify-center gap-1.5 h-7 rounded-lg text-[10px] font-semibold transition-colors"
            style={{ backgroundColor: "#0d9488", color: "#fff" }}
            data-testid="coach-watch-email-btn">
            <Mail className="w-3 h-3" /> Email Coach
          </button>
          <button onClick={onFollowUp}
            className="flex-1 flex items-center justify-center gap-1.5 h-7 rounded-lg text-[10px] font-semibold transition-colors"
            style={{ color: "var(--cm-text-2)", border: "1px solid var(--cm-border)", backgroundColor: "transparent" }}
            data-testid="coach-watch-followup-btn">
            <CalendarPlus className="w-3 h-3" /> Create Follow-up
          </button>
        </div>
      </div>

      {/* Signals — collapsed by default, max 2 */}
      <div style={{ borderTop: "1px solid var(--cm-border)" }}>
        <button onClick={() => setShowSignals(!showSignals)}
          className="w-full px-4 py-2 flex items-center justify-between text-[9px] font-bold uppercase tracking-wide transition-colors hover:bg-white/[0.02]"
          style={{ color: "var(--cm-text-3)" }}
          data-testid="coach-watch-signals-toggle">
          <span>View signals</span>
          <span style={{ fontSize: 7, transform: showSignals ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}>&#9660;</span>
        </button>
        {showSignals && (
          <div className="px-4 pb-3 space-y-2" data-testid="coach-watch-signals-list">
            {data.recentSignals.map((sig, i) => (
              <div key={i} className="flex items-start gap-2">
                <div className="w-4 h-4 rounded flex items-center justify-center flex-shrink-0 mt-0.5"
                  style={{ backgroundColor: `${sig.color}12` }}>
                  <sig.icon className="w-2 h-2" style={{ color: sig.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-semibold" style={{ color: "var(--cm-text)" }}>{sig.title}</p>
                  <p className="text-[9px]" style={{ color: "var(--cm-text-3)" }}>{sig.detail}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

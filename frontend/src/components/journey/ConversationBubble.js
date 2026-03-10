import { useState } from "react";
import { MapPin, Star, Loader2, Eye, ExternalLink } from "lucide-react";
import { CONV_CONFIG } from "./constants";

const API = process.env.REACT_APP_BACKEND_URL;

function decodeEntities(text) {
  if (!text) return "";
  const el = document.createElement("textarea");
  el.innerHTML = text;
  return el.value;
}

function getEmailEngagement(event, engagement) {
  if (!engagement?.timeline?.length) return null;
  const evtType = (event.event_type || event.type || "").toLowerCase().replace(/\s+/g, "_");
  if (evtType !== "email_sent") return null;

  const title = event.title || "";
  const subject = title.replace(/^You sent:\s*/i, "").trim();
  let matched = [];

  if (subject && subject !== title) {
    const subjectLower = subject.toLowerCase();
    matched = engagement.timeline.filter(e => {
      const es = (e.email_subject || "").toLowerCase().trim();
      return es && (es === subjectLower || subjectLower.includes(es) || es.includes(subjectLower));
    });
  }

  if (matched.length === 0) {
    const content = (event.content || event.notes || "").toLowerCase();
    if (content.length > 20) {
      matched = engagement.timeline.filter(e => {
        const es = (e.email_subject || "").toLowerCase().trim();
        if (!es) return false;
        const words = es.split(/[\s\W]+/).filter(w => w.length > 3);
        return words.length > 0 && words.filter(w => content.includes(w)).length >= Math.ceil(words.length * 0.4);
      });
    }
  }

  return matched.length > 0 ? matched : null;
}

function EngagementBadge({ events }) {
  if (!events || events.length === 0) return null;
  const formatDate = (d) => {
    try { return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" }); }
    catch { return ""; }
  };
  return (
    <div className="absolute top-2.5 right-3 group/badge z-10" data-testid="engagement-badge">
      <div className="inline-flex items-center gap-1 px-2 py-1 rounded-full cursor-default transition-all"
        style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.2)" }}>
        <Eye className="w-3 h-3" style={{ color: "#10b981" }} />
        <span className="text-[10px] font-bold" style={{ color: "#059669" }}>{events.length}</span>
      </div>
      <div className="absolute bottom-full right-0 mb-2 w-56 rounded-xl p-2.5 opacity-0 pointer-events-none group-hover/badge:opacity-100 group-hover/badge:pointer-events-auto transition-opacity shadow-xl"
        style={{ background: "#1a1a2e", zIndex: 100 }}>
        <p className="text-[9px] font-bold uppercase tracking-wider mb-2" style={{ color: "rgba(255,255,255,0.4)" }}>Engagement</p>
        <div className="space-y-0.5">
          {events.slice(0, 6).map((ev, i) => (
            <div key={i} className="flex items-center gap-2 py-1" style={i > 0 ? { borderTop: "1px solid rgba(255,255,255,0.06)" } : {}}>
              <div className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0"
                style={{ background: ev.event_type === "email_open" ? "rgba(16,185,129,0.15)" : "rgba(59,130,246,0.15)" }}>
                {ev.event_type === "email_open"
                  ? <Eye className="w-2.5 h-2.5" style={{ color: "#10b981" }} />
                  : <ExternalLink className="w-2.5 h-2.5" style={{ color: "#3b82f6" }} />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-semibold text-white">{ev.event_type === "email_open" ? "Opened" : "Clicked link"}</p>
                {ev.coach_email && <p className="text-[9px] truncate" style={{ color: "rgba(255,255,255,0.4)" }}>{ev.coach_email}</p>}
              </div>
              <span className="text-[9px] flex-shrink-0" style={{ color: "rgba(255,255,255,0.25)" }}>{formatDate(ev.created_at)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function ConversationBubble({ event, engagement }) {
  const [expanded, setExpanded] = useState(false);
  const [fullBody, setFullBody] = useState(null);
  const [loading, setLoading] = useState(false);

  const evtType = (event.event_type || event.type || "interaction").toLowerCase().replace(/\s+/g, "_");
  const cfg = CONV_CONFIG[evtType] || CONV_CONFIG.interaction;

  const formatDate = (d) => {
    try { return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }); }
    catch { return d; }
  };

  const snippet = decodeEntities(event.content || event.notes || "");
  const isGmail = (event.id || "").startsWith("gmail_");
  const gmailId = isGmail ? event.id.replace("gmail_", "") : null;
  const hasLong = snippet.length > 150;
  const displayText = fullBody || snippet;
  const isExpanded = expanded && (fullBody || !isGmail);
  const matchedEngagement = getEmailEngagement(event, engagement);

  async function handleShowMore(e) {
    e.stopPropagation();
    if (fullBody) { setExpanded(true); return; }
    if (isGmail && gmailId) {
      setLoading(true);
      try {
        const token = localStorage.getItem("session_token");
        const res = await fetch(`${API}/api/gmail/emails/${gmailId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          const body = data.body_text || data.body_html?.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim() || snippet;
          setFullBody(decodeEntities(body));
        }
      } catch { /* fallback to snippet */ }
      setLoading(false);
    }
    setExpanded(true);
  }

  if (cfg.side === "center") {
    return (
      <div className="flex justify-center my-2" data-testid="conv-milestone">
        <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl border" style={{ backgroundColor: "var(--cm-surface)", borderColor: "var(--cm-border)" }}>
          <div className={`w-7 h-7 rounded-lg flex items-center justify-center bg-${cfg.color}-500/10`}>
            {evtType === "camp" || evtType === "camp_meeting" ? <span className="text-base">&#127947;&#65039;</span>
            : evtType === "visit" || evtType === "campus_visit" ? <MapPin className={`w-3.5 h-3.5 text-${cfg.color}-400`} />
            : <Star className={`w-3.5 h-3.5 text-${cfg.color}-400`} />}
          </div>
          <div>
            <p className="text-xs font-semibold" style={{ color: "var(--cm-text)" }}>{event.title || cfg.label}</p>
            <p className="text-[10px]" style={{ color: "var(--cm-text-3)" }}>{formatDate(event.date || event.date_time)}</p>
          </div>
        </div>
      </div>
    );
  }

  const isRight = cfg.side === "right";
  const isAiInsight = evtType === "ai_gmail_insight";

  return (
    <div className={`flex ${isRight ? "justify-end" : "justify-start"} my-1`} data-testid={`conv-bubble-${isRight ? "right" : "left"}`}>
      <div className={`max-w-[80%] sm:max-w-[70%] rounded-2xl px-4 py-3 border relative ${
        isAiInsight
          ? "rounded-bl-md border-violet-500/25"
          : isRight
            ? "rounded-br-md bg-teal-800/[0.10] border-teal-700/25"
            : "rounded-bl-md bg-teal-700/[0.08] border-slate-500/20"
      }`} style={isAiInsight ? { background: "rgba(139,92,246,0.08)" } : undefined}>
        {isRight && <EngagementBadge events={matchedEngagement} />}
        <p className={`text-[10px] font-bold uppercase tracking-wider mb-1 ${isAiInsight ? "text-violet-500" : isRight ? "text-teal-700" : "text-slate-500"}`}
          style={isRight && matchedEngagement ? { paddingRight: "48px" } : {}}>
          {isAiInsight ? "AI Intelligence" : isRight ? "You" : (event.coach_name || "Coach")}
        </p>
        {displayText && (
          <div className="text-[13px] leading-relaxed" style={{ color: "var(--cm-text-2)" }}>
            {hasLong && !isExpanded ? (
              <>
                <p className="line-clamp-3">{snippet}</p>
                <button
                  type="button"
                  onClick={handleShowMore}
                  className="text-teal-600 text-[11px] mt-1 font-semibold cursor-pointer hover:underline flex items-center gap-1"
                  data-testid="show-more-btn"
                >
                  {loading ? <><Loader2 className="w-3 h-3 animate-spin" /> Loading...</> : "Show more"}
                </button>
              </>
            ) : isExpanded ? (
              <>
                <p className="whitespace-pre-wrap">{displayText}</p>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setExpanded(false); }}
                  className="text-teal-600 text-[11px] mt-1 font-semibold cursor-pointer hover:underline"
                  data-testid="show-less-btn"
                >
                  Show less
                </button>
              </>
            ) : <p>{snippet}</p>}
          </div>
        )}
        {!displayText && <p className="text-xs" style={{ color: "var(--cm-text-2)" }}>{event.title || cfg.label}</p>}
        <p className="text-[10px] mt-1.5" style={{ color: "var(--cm-text-3)" }}>{formatDate(event.date || event.date_time)} &middot; {cfg.label}</p>
      </div>
    </div>
  );
}

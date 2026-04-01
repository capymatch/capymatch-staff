import { useState } from "react";
import { MapPin, Star, Loader2, Eye, ExternalLink, Flag, CheckCircle2, MousePointerClick, Radio } from "lucide-react";
import { CONV_CONFIG } from "./constants";

const API = process.env.REACT_APP_BACKEND_URL;

function decodeEntities(text) {
  if (!text) return "";
  const el = document.createElement("textarea");
  el.innerHTML = text;
  return el.value;
}

/* Per-message engagement signal badges */
function EngagementSignals({ opens, clicks }) {
  if (!opens && !clicks) return null;
  return (
    <div className="flex items-center gap-1.5 mt-1.5" data-testid="engagement-signals">
      {opens > 0 && (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-semibold"
          style={{ backgroundColor: "rgba(16,185,129,0.1)", color: "#059669", border: "1px solid rgba(16,185,129,0.15)" }}
          data-testid="signal-opened">
          <Eye className="w-2.5 h-2.5" />
          {opens > 1 ? `Opened ${opens}x` : "Opened"}
        </span>
      )}
      {clicks > 0 && (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-semibold"
          style={{ backgroundColor: "rgba(59,130,246,0.1)", color: "#3b82f6", border: "1px solid rgba(59,130,246,0.15)" }}
          data-testid="signal-clicked">
          <MousePointerClick className="w-2.5 h-2.5" />
          Link clicked
        </span>
      )}
    </div>
  );
}

export function ConversationBubble({ event }) {
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
  const opens = event.opens || 0;
  const clicks = event.clicks || 0;

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

  /* ── Center-aligned milestone/event bubbles ── */
  if (cfg.side === "center") {
    const isCoachDirective = evtType === "coach_directive";
    const isFlagCompleted = evtType === "flag_completed";
    const isCoachSignal = evtType === "coach_signal";
    const isFlagRelated = isCoachDirective || isFlagCompleted || isCoachSignal;

    return (
      <div className="flex justify-center my-4" data-testid={isFlagRelated ? `conv-flag-${evtType}` : "conv-milestone"}>
        <div className="flex items-center gap-2.5 px-5 py-3 rounded-2xl"
          style={{
            backgroundColor: "#ffffff",
            border: `1px solid ${isCoachSignal ? "rgba(59,130,246,0.15)" : isCoachDirective ? "rgba(245,158,11,0.15)" : isFlagCompleted ? "rgba(16,185,129,0.15)" : "rgba(0,0,0,0.06)"}`,
            boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
          }}>
          <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
            isCoachSignal ? "bg-blue-500/10" : isCoachDirective ? "bg-amber-500/10" : isFlagCompleted ? "bg-emerald-500/10" : `bg-${cfg.color}-500/10`
          }`}>
            {isCoachSignal ? <Radio className="w-3.5 h-3.5 text-blue-400" />
            : isCoachDirective ? <Flag className="w-3.5 h-3.5 text-amber-400" />
            : isFlagCompleted ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            : evtType === "camp" || evtType === "camp_meeting" ? <span className="text-base">&#127947;&#65039;</span>
            : evtType === "visit" || evtType === "campus_visit" ? <MapPin className={`w-3.5 h-3.5 text-${cfg.color}-400`} />
            : <Star className={`w-3.5 h-3.5 text-${cfg.color}-400`} />}
          </div>
          <div>
            <p className="text-xs font-semibold" style={{ color: isCoachSignal ? "#3b82f6" : isCoachDirective ? "#f59e0b" : isFlagCompleted ? "#10b981" : "#1a1a1a" }}>
              {event.title || cfg.label}
            </p>
            {(event.content || event.notes) && (
              <p className="text-[10px] mt-0.5" style={{ color: "#8a8a8a" }}>
                {(event.content || event.notes).slice(0, 120)}
              </p>
            )}
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[10px]" style={{ color: "#b0b0b0" }}>{formatDate(event.date || event.date_time)}</span>
              {(event.created_by_name || event.coach_name) && (
                <span className="text-[10px] font-medium" style={{ color: isCoachSignal ? "rgba(59,130,246,0.6)" : isCoachDirective ? "rgba(245,158,11,0.6)" : isFlagCompleted ? "rgba(16,185,129,0.6)" : "#b0b0b0" }}>
                  {event.created_by_name || event.coach_name}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ── Chat-style conversation bubbles ── */
  const isRight = cfg.side === "right";
  const isAiInsight = evtType === "ai_gmail_insight";

  return (
    <div className={`flex ${isRight ? "justify-end" : "justify-start"} my-3`} data-testid={`conv-bubble-${isRight ? "right" : "left"}`}>
      <div className={`max-w-[85%] sm:max-w-[75%] px-5 py-4 relative`}
        style={{
          background: isAiInsight
            ? "rgba(139,92,246,0.06)"
            : isRight
              ? "#e8f5f1"
              : "#f0faf7",
          borderRadius: isRight
            ? "20px 20px 6px 20px"
            : "20px 20px 20px 6px",
          border: `1px solid ${isAiInsight ? "rgba(139,92,246,0.12)" : "rgba(0,0,0,0.04)"}`,
        }}>
        <p className="text-xs font-bold uppercase tracking-wider mb-1.5"
          style={{ color: isAiInsight ? "#8b5cf6" : isRight ? "#0d9488" : "#0d9488" }}>
          {isAiInsight ? "AI Intelligence" : isRight ? "You" : (event.coach_name || "Coach")}
        </p>
        {displayText && (
          <div className="text-sm leading-relaxed" style={{ color: "#333333" }}>
            {hasLong && !isExpanded ? (
              <>
                <p className="line-clamp-3">{snippet}</p>
                <button
                  type="button"
                  onClick={handleShowMore}
                  className="text-teal-600 text-[11px] mt-1.5 font-semibold cursor-pointer hover:underline flex items-center gap-1"
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
                  className="text-teal-600 text-[11px] mt-1.5 font-semibold cursor-pointer hover:underline"
                  data-testid="show-less-btn"
                >
                  Show less
                </button>
              </>
            ) : <p>{snippet}</p>}
          </div>
        )}
        {!displayText && <p className="text-xs" style={{ color: "#8a8a8a" }}>{event.title || cfg.label}</p>}
        {isRight && <EngagementSignals opens={opens} clicks={clicks} />}
        <p className="text-[11px] mt-2" style={{ color: "#9ca3af" }}>
          {formatDate(event.date || event.date_time)} &middot; {cfg.label}
        </p>
      </div>
    </div>
  );
}

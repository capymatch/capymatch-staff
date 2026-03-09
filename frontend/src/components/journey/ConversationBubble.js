import { useState } from "react";
import { MapPin, Star } from "lucide-react";
import { CONV_CONFIG } from "./constants";

function formatDate(d) {
  try { return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }); }
  catch { return d; }
}

export function ConversationBubble({ event }) {
  const [expanded, setExpanded] = useState(false);
  const evtType = (event.event_type || event.type || "interaction").toLowerCase().replace(/\s+/g, "_");
  const cfg = CONV_CONFIG[evtType] || CONV_CONFIG.interaction;

  const snippet = event.content || event.notes || "";
  const hasLong = snippet.length > 150;
  const displayText = snippet;

  if (cfg.side === "center") {
    return (
      <div className="flex justify-center my-2" data-testid="conv-milestone">
        <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl border bg-slate-800/50 border-slate-700">
          <div className={`w-7 h-7 rounded-lg flex items-center justify-center bg-${cfg.color}-500/10`}>
            {evtType === "camp" || evtType === "camp_meeting" ? <span className="text-base">&#127947;</span>
            : evtType === "visit" || evtType === "campus_visit" ? <MapPin className={`w-3.5 h-3.5 text-${cfg.color}-400`} />
            : <Star className={`w-3.5 h-3.5 text-${cfg.color}-400`} />}
          </div>
          <div>
            <p className="text-xs font-semibold text-white">{event.title || cfg.label}</p>
            <p className="text-[10px] text-slate-400">{formatDate(event.date || event.date_time)}</p>
          </div>
        </div>
      </div>
    );
  }

  const isRight = cfg.side === "right";
  return (
    <div className={`flex ${isRight ? "justify-end" : "justify-start"} my-1`} data-testid={`conv-bubble-${isRight ? "right" : "left"}`}>
      <div className={`max-w-[80%] sm:max-w-[70%] rounded-2xl px-4 py-3 border relative ${
        isRight
          ? "rounded-br-md bg-teal-800/[0.10] border-teal-700/25"
          : "rounded-bl-md bg-teal-700/[0.08] border-slate-500/20"
      }`}>
        <p className={`text-[10px] font-bold uppercase tracking-wider mb-1 ${isRight ? "text-teal-700" : "text-slate-500"}`}>
          {isRight ? "You" : (event.coach_name || "Coach")}
        </p>
        {displayText && (
          <div className="text-[13px] leading-relaxed text-slate-300">
            {hasLong && !expanded ? (
              <>
                <p className="line-clamp-3">{snippet}</p>
                <button onClick={() => setExpanded(true)}
                  className="text-teal-600 text-[11px] mt-1 font-semibold cursor-pointer hover:underline"
                  data-testid="show-more-btn">Show more</button>
              </>
            ) : expanded ? (
              <>
                <p className="whitespace-pre-wrap">{displayText}</p>
                <button onClick={() => setExpanded(false)}
                  className="text-teal-600 text-[11px] mt-1 font-semibold cursor-pointer hover:underline"
                  data-testid="show-less-btn">Show less</button>
              </>
            ) : <p>{snippet}</p>}
          </div>
        )}
        {!displayText && <p className="text-xs text-slate-300">{event.title || cfg.label}</p>}
        <p className="text-[10px] mt-1.5 text-slate-500">{formatDate(event.date || event.date_time)} &middot; {cfg.label}</p>
      </div>
    </div>
  );
}

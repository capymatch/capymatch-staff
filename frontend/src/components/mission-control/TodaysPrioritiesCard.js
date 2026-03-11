import { useNavigate } from "react-router-dom";
import { AlertTriangle, Clock, MessageCircle, Calendar, ChevronRight, Zap, ShieldAlert, Target } from "lucide-react";

const URGENCY_CONFIG = {
  critical: {
    label: "Critical",
    color: "#ef4444",
    bg: "rgba(239,68,68,0.08)",
    border: "rgba(239,68,68,0.15)",
    icon: AlertTriangle,
  },
  follow_up: {
    label: "Follow-Up Needed",
    color: "#f59e0b",
    bg: "rgba(245,158,11,0.08)",
    border: "rgba(245,158,11,0.15)",
    icon: Clock,
  },
  director_request: {
    label: "Director Requests",
    color: "#3b82f6",
    bg: "rgba(59,130,246,0.08)",
    border: "rgba(59,130,246,0.15)",
    icon: MessageCircle,
  },
  event_prep: {
    label: "Event Prep",
    color: "#8b5cf6",
    bg: "rgba(139,92,246,0.08)",
    border: "rgba(139,92,246,0.15)",
    icon: Calendar,
  },
};

const ACTION_ICONS = {
  "Check in with athlete": Zap,
  "Remove blocker": ShieldAlert,
  "Re-engage athlete": MessageCircle,
  "Review readiness gaps": Target,
  "Review upcoming deadline": Clock,
};

function PriorityRow({ item, isLast }) {
  const navigate = useNavigate();
  const urgency = URGENCY_CONFIG[item.urgency] || URGENCY_CONFIG.follow_up;
  const ActionIcon = ACTION_ICONS[item.action] || urgency.icon;

  return (
    <div
      onClick={() => item.cta_path && navigate(item.cta_path)}
      className="flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-3 sm:py-3.5 cursor-pointer hover:bg-slate-50/60 transition-colors group"
      style={{ borderBottom: isLast ? "none" : "1px solid var(--cm-border)" }}
      data-testid={`priority-row-${item.athlete_id || item.event_id}`}
    >
      {/* Urgency dot + icon */}
      <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ backgroundColor: urgency.bg }}>
        <ActionIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" style={{ color: urgency.color }} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 sm:gap-2 mb-0.5 flex-wrap">
          <span className="text-xs sm:text-sm font-semibold truncate" style={{ color: "var(--cm-text)" }}>
            {item.athlete_name || item.event_name}
          </span>
          <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded hidden sm:inline"
            style={{ backgroundColor: urgency.bg, color: urgency.color }}>
            {item.action}
          </span>
        </div>
        <p className="text-[11px] sm:text-xs truncate" style={{ color: "var(--cm-text-3)" }}>{item.reason}</p>
      </div>

      {/* CTA */}
      <button
        onClick={(e) => { e.stopPropagation(); if (item.cta_path) navigate(item.cta_path); }}
        className="flex items-center gap-1 px-2 sm:px-3 py-1.5 rounded-lg text-[11px] sm:text-xs font-semibold transition-all opacity-70 group-hover:opacity-100 flex-shrink-0"
        style={{
          backgroundColor: urgency.bg,
          color: urgency.color,
          border: `1px solid ${urgency.border}`,
        }}
        data-testid={`priority-cta-${item.athlete_id || item.event_id}`}
      >
        <span className="hidden sm:inline">{item.cta_label}</span>
        <ChevronRight className="w-3 h-3" />
      </button>
    </div>
  );
}

export default function TodaysPrioritiesCard({ priorities = [] }) {
  if (!priorities.length) {
    return (
      <section data-testid="todays-priorities-card">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-[11px] font-bold uppercase tracking-widest" style={{ color: "var(--cm-text-3)" }}>
            Today's Priorities
          </span>
        </div>
        <div className="rounded-xl border px-6 py-8 text-center" style={{ backgroundColor: "var(--cm-surface)", borderColor: "var(--cm-border)" }}>
          <div className="w-9 h-9 rounded-full flex items-center justify-center mx-auto mb-2.5" style={{ backgroundColor: "rgba(16,185,129,0.1)" }}>
            <Target className="w-4 h-4" style={{ color: "#10b981" }} />
          </div>
          <p className="text-sm font-medium" style={{ color: "var(--cm-text-2)" }}>All clear</p>
          <p className="text-xs mt-1" style={{ color: "var(--cm-text-3)" }}>
            No urgent priorities right now. Your athletes are on track.
          </p>
        </div>
      </section>
    );
  }

  // Group by urgency
  const groups = {};
  for (const item of priorities) {
    const key = item.urgency || "follow_up";
    if (!groups[key]) groups[key] = [];
    groups[key].push(item);
  }

  const ORDER = ["critical", "follow_up", "director_request", "event_prep"];
  const orderedKeys = ORDER.filter(k => groups[k]);

  return (
    <section data-testid="todays-priorities-card">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          {priorities.some(p => p.urgency === "critical") && (
            <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
          )}
          <span className="text-[11px] font-bold uppercase tracking-widest" style={{ color: "var(--cm-text-3)" }}>
            Today's Priorities
          </span>
          <span className="text-xs font-medium" style={{ color: "var(--cm-text-3)" }}>
            {priorities.length} item{priorities.length !== 1 ? "s" : ""}
          </span>
        </div>
      </div>

      <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: "var(--cm-surface)", borderColor: "var(--cm-border)" }}>
        {orderedKeys.map(key => {
          const items = groups[key];
          const config = URGENCY_CONFIG[key];
          return (
            <div key={key}>
              {/* Group header */}
              <div className="px-4 py-2 flex items-center gap-2"
                style={{ backgroundColor: config.bg, borderBottom: `1px solid ${config.border}` }}>
                <config.icon className="w-3 h-3" style={{ color: config.color }} />
                <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: config.color }}>
                  {config.label}
                </span>
                <span className="text-[10px] font-medium" style={{ color: config.color, opacity: 0.7 }}>
                  {items.length}
                </span>
              </div>
              {items.map((item, idx) => (
                <PriorityRow key={item.athlete_id || item.event_id || idx} item={item} isLast={idx === items.length - 1} />
              ))}
            </div>
          );
        })}
      </div>
    </section>
  );
}

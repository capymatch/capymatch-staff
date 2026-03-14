import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { TrendingUp, TrendingDown, Minus, ChevronRight, ChevronDown, ChevronUp, Zap, ShieldAlert, Clock, AlertTriangle, Users, Target, Calendar, CheckCircle } from "lucide-react";
import QuickNote from "@/components/QuickNote";

const CATEGORY_CONFIG = {
  momentum_drop: { icon: Zap, label: "Momentum Drop", color: "#ef4444", bg: "rgba(239,68,68,0.08)" },
  blocker: { icon: ShieldAlert, label: "Blocker", color: "#ef4444", bg: "rgba(239,68,68,0.08)" },
  deadline_proximity: { icon: Clock, label: "Deadline", color: "#f59e0b", bg: "rgba(245,158,11,0.08)" },
  engagement_drop: { icon: AlertTriangle, label: "Engagement Drop", color: "#f59e0b", bg: "rgba(245,158,11,0.08)" },
  ownership_gap: { icon: Users, label: "Unassigned", color: "#3b82f6", bg: "rgba(59,130,246,0.08)" },
  readiness_issue: { icon: Target, label: "Readiness Issue", color: "#8b5cf6", bg: "rgba(139,92,246,0.08)" },
};

const INITIALS_COLORS = ["#0d9488", "#6366f1", "#2563eb", "#dc2626", "#d97706", "#7c3aed", "#059669"];

function AthleteAvatar({ name, photoUrl, size = 32 }) {
  const initials = (name || "").split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
  const colorIdx = (name || "").length % INITIALS_COLORS.length;
  if (photoUrl) {
    return (
      <img
        src={photoUrl}
        alt={name}
        className="rounded-full object-cover shrink-0"
        style={{ width: size, height: size }}
        data-testid={`avatar-${name?.toLowerCase().replace(/\s+/g, "-")}`}
      />
    );
  }
  return (
    <div
      className="rounded-full flex items-center justify-center shrink-0 font-bold text-white"
      style={{ width: size, height: size, backgroundColor: INITIALS_COLORS[colorIdx], fontSize: size * 0.38 }}
      data-testid={`avatar-${name?.toLowerCase().replace(/\s+/g, "-")}`}
    >
      {initials}
    </div>
  );
}

function MomentumIndicator({ trend }) {
  if (trend === "rising") return <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />;
  if (trend === "declining") return <TrendingDown className="w-3.5 h-3.5 text-red-500" />;
  return <Minus className="w-3.5 h-3.5 text-slate-300" />;
}

function AthleteRow({ athlete, isLast }) {
  const navigate = useNavigate();
  const cat = athlete.category ? CATEGORY_CONFIG[athlete.category] : null;
  const CatIcon = cat?.icon || AlertTriangle;
  const hasIssue = !!cat;

  return (
    <div
      data-testid={`roster-athlete-${athlete.id}`}
      className="flex items-start gap-2 sm:gap-3 px-3 sm:px-4 py-2.5 sm:py-3 cursor-pointer hover:bg-slate-50/60 transition-colors group"
      style={{
        borderBottom: isLast ? "none" : "1px solid var(--cm-border)",
        backgroundColor: "transparent",
      }}
      onClick={() => navigate(`/support-pods/${athlete.id}`)}
    >
      {/* Avatar */}
      <div className="shrink-0 relative">
        <AthleteAvatar name={athlete.name} photoUrl={athlete.photo_url} size={34} />
        {hasIssue && (
          <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 flex items-center justify-center"
            style={{ borderColor: "var(--cm-surface, white)", backgroundColor: cat.color }}>
            <CatIcon className="w-1.5 h-1.5 text-white" />
          </span>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Row 1: Name + badge */}
        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
          <span className="text-xs sm:text-sm font-semibold group-hover:text-primary transition-colors" style={{ color: "var(--cm-text)" }}>
            {athlete.name}
          </span>
          {hasIssue && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] sm:text-[10px] font-bold uppercase tracking-wider"
              style={{ backgroundColor: cat.bg, color: cat.color }}>
              <CatIcon className="w-2.5 h-2.5" />
              {cat.label}
            </span>
          )}
        </div>

        {/* Row 2: Why (reason) */}
        {athlete.why && (
          <p className="text-[10px] sm:text-[11px] mt-0.5 truncate" style={{ color: "var(--cm-text-3)" }}>{athlete.why}</p>
        )}

        {/* Row 3: Next action - visually prominent */}
        {athlete.next_step && hasIssue && (
          <div className="flex items-center gap-1.5 mt-1">
            <span className="text-[9px] sm:text-[10px] font-extrabold uppercase tracking-wider" style={{ color: "#0d9488" }}>Next:</span>
            <span className="text-[10px] sm:text-[11px] font-semibold truncate" style={{ color: "#0d9488" }}>{athlete.next_step}</span>
          </div>
        )}
      </div>

      {/* Right side */}
      <div className="flex items-center gap-1.5 shrink-0 pt-0.5">
        <span className="hidden sm:block"><QuickNote athleteId={athlete.id} athleteName={athlete.name} compact /></span>
        <button
          onClick={(e) => { e.stopPropagation(); navigate(`/support-pods/${athlete.id}`); }}
          className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold transition-all sm:opacity-0 sm:group-hover:opacity-100"
          style={{
            backgroundColor: hasIssue ? "rgba(13,148,136,0.1)" : "transparent",
            color: "#0d9488",
            border: "1px solid rgba(13,148,136,0.2)",
          }}
          data-testid={`open-pod-${athlete.id}`}
        >
          <span className="hidden sm:inline">Open Pod</span>
          <ChevronRight className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}

function OnTrackRow({ athlete, isLast }) {
  const navigate = useNavigate();
  return (
    <div
      data-testid={`roster-athlete-${athlete.id}`}
      className="flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2 cursor-pointer hover:bg-slate-50/60 transition-colors group"
      style={{ borderBottom: isLast ? "none" : "1px solid var(--cm-border)" }}
      onClick={() => navigate(`/support-pods/${athlete.id}`)}
    >
      <div className="shrink-0 relative">
        <AthleteAvatar name={athlete.name} photoUrl={athlete.photo_url} size={28} />
        <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2" style={{ borderColor: "var(--cm-surface, white)" }} />
      </div>
      <span className="text-xs sm:text-sm font-medium flex-1 min-w-0 truncate" style={{ color: "var(--cm-text-2)" }}>
        {athlete.name}
      </span>
      <ChevronRight className="w-3 h-3 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity" style={{ color: "var(--cm-text-3)" }} />
    </div>
  );
}

export default function RosterSection({ athletes = [], eventPrep = [] }) {
  const navigate = useNavigate();
  const [onTrackOpen, setOnTrackOpen] = useState(false);

  const needsAction = athletes.filter(a => a.category);
  const onTrack = athletes.filter(a => !a.category);

  return (
    <section data-testid="roster-section">
      {/* ── Athletes Requiring Attention ── */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2.5">
          {needsAction.length > 0 && <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />}
          <span className="text-[11px] font-bold uppercase tracking-widest" style={{ color: "var(--cm-text-3)" }}>
            Athletes Requiring Attention
          </span>
          {needsAction.length > 0 && (
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded" style={{ backgroundColor: "rgba(239,68,68,0.08)", color: "#ef4444" }}>
              {needsAction.length}
            </span>
          )}
        </div>
      </div>

      {needsAction.length > 0 ? (
        <div className="rounded-xl border overflow-hidden mb-4" style={{ backgroundColor: "var(--cm-surface)", borderColor: "var(--cm-border)" }}>
          {needsAction.map((athlete, idx) => (
            <AthleteRow key={athlete.id} athlete={athlete} isLast={idx === needsAction.length - 1} />
          ))}
        </div>
      ) : (
        <div className="rounded-xl border px-5 py-6 text-center mb-4" style={{ backgroundColor: "var(--cm-surface)", borderColor: "var(--cm-border)" }}>
          <div className="w-8 h-8 rounded-full flex items-center justify-center mx-auto mb-2" style={{ backgroundColor: "rgba(16,185,129,0.1)" }}>
            <CheckCircle className="w-4 h-4" style={{ color: "#10b981" }} />
          </div>
          <p className="text-sm font-medium" style={{ color: "var(--cm-text-2)" }}>All athletes are on track</p>
        </div>
      )}

      {/* ── On Track (collapsed) ── */}
      {onTrack.length > 0 && (
        <div className="mb-4">
          <button
            onClick={() => setOnTrackOpen(!onTrackOpen)}
            className="flex items-center gap-2 mb-2 group"
            data-testid="toggle-on-track"
          >
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-400" />
            <span className="text-[11px] font-bold uppercase tracking-widest" style={{ color: "var(--cm-text-3)" }}>
              On Track
            </span>
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded" style={{ backgroundColor: "rgba(16,185,129,0.08)", color: "#10b981" }}>
              {onTrack.length}
            </span>
            {onTrackOpen
              ? <ChevronUp className="w-3 h-3" style={{ color: "var(--cm-text-3)" }} />
              : <ChevronDown className="w-3 h-3" style={{ color: "var(--cm-text-3)" }} />}
          </button>
          {onTrackOpen && (
            <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: "var(--cm-surface)", borderColor: "var(--cm-border)" }}>
              {onTrack.map((athlete, idx) => (
                <OnTrackRow key={athlete.id} athlete={athlete} isLast={idx === onTrack.length - 1} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Event Prep ── */}
      {eventPrep.length > 0 && (
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="w-3.5 h-3.5" style={{ color: "#8b5cf6" }} />
            <span className="text-[11px] font-bold uppercase tracking-widest" style={{ color: "var(--cm-text-3)" }}>
              Events Requiring Prep
            </span>
            <span className="text-xs font-medium" style={{ color: "var(--cm-text-3)" }}>
              {eventPrep.length}
            </span>
          </div>
          <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: "var(--cm-surface)", borderColor: "var(--cm-border)" }}>
            {eventPrep.map((item, idx) => (
              <div
                key={item.event_id || idx}
                className="flex items-center gap-3 px-3 sm:px-4 py-2.5 cursor-pointer hover:bg-slate-50/60 transition-colors group"
                style={{ borderBottom: idx < eventPrep.length - 1 ? "1px solid var(--cm-border)" : "none" }}
                onClick={() => item.cta_path && navigate(item.cta_path)}
                data-testid={`event-prep-${item.event_id || idx}`}
              >
                <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: "rgba(139,92,246,0.08)" }}>
                  <Calendar className="w-3.5 h-3.5" style={{ color: "#8b5cf6" }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm font-medium group-hover:text-primary transition-colors" style={{ color: "var(--cm-text)" }}>
                    {item.action || item.title}
                  </p>
                  <p className="text-[10px] sm:text-[11px]" style={{ color: "var(--cm-text-3)" }}>{item.reason}</p>
                </div>
                <button
                  className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold transition-all sm:opacity-0 sm:group-hover:opacity-100"
                  style={{ backgroundColor: "rgba(139,92,246,0.08)", color: "#8b5cf6", border: "1px solid rgba(139,92,246,0.15)" }}
                >
                  <span className="hidden sm:inline">{item.cta_label || "Prep"}</span>
                  <ChevronRight className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

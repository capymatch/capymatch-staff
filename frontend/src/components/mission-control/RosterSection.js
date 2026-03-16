import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronRight, ChevronDown, ChevronUp, Calendar, CheckCircle } from "lucide-react";
import QuickNote from "@/components/QuickNote";

const INITIALS_COLORS = ["#0d9488", "#6366f1", "#2563eb", "#dc2626", "#d97706", "#7c3aed", "#059669"];

function AthleteAvatar({ name, photoUrl, size = 32 }) {
  const initials = (name || "").split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
  const colorIdx = (name || "").length % INITIALS_COLORS.length;
  if (photoUrl) {
    return (
      <img src={photoUrl} alt={name} className="rounded-full object-cover shrink-0"
        style={{ width: size, height: size }}
        data-testid={`avatar-${name?.toLowerCase().replace(/\s+/g, "-")}`} />
    );
  }
  return (
    <div className="rounded-full flex items-center justify-center shrink-0 font-bold text-white"
      style={{ width: size, height: size, backgroundColor: INITIALS_COLORS[colorIdx], fontSize: size * 0.38 }}
      data-testid={`avatar-${name?.toLowerCase().replace(/\s+/g, "-")}`}>
      {initials}
    </div>
  );
}

function AthleteRow({ athlete, isLast }) {
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(false);

  const journey = athlete.journey_state || {};
  const attention = athlete.attention_status || {};
  const primary = attention.primary;
  const secondary = attention.secondary || [];
  const totalIssues = attention.total_issues || 0;

  return (
    <div
      data-testid={`roster-athlete-${athlete.id}`}
      className="px-3 sm:px-4 py-2.5 sm:py-3 cursor-pointer hover:bg-slate-50/60 transition-colors group"
      style={{ borderBottom: isLast ? "none" : "1px solid var(--cm-border)" }}
      onClick={() => navigate(`/support-pods/${athlete.id}`)}
    >
      <div className="flex items-start gap-2 sm:gap-3">
        {/* Avatar */}
        <div className="shrink-0 mt-0.5">
          <AthleteAvatar name={athlete.name} photoUrl={athlete.photo_url} size={34} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Row 1: Name + Journey badge */}
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
            <span className="text-xs sm:text-sm font-semibold group-hover:text-primary transition-colors" style={{ color: "var(--cm-text)" }}>
              {athlete.name}
            </span>
            {journey.label && (
              <span data-testid={`journey-badge-${athlete.id}`}
                className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] sm:text-[10px] font-medium"
                style={{ backgroundColor: journey.bg, color: journey.color }}>
                {journey.label}
              </span>
            )}
          </div>

          {/* Row 2: Attention status (only if issues exist) */}
          {primary && (
            <div className="mt-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span data-testid={`attention-badge-${athlete.id}`}
                  className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] sm:text-[10px] font-bold uppercase tracking-wider"
                  style={{ backgroundColor: primary.bg, color: primary.color, border: `1px solid ${primary.color}22` }}>
                  {primary.label}
                </span>
                <span className="text-[10px] sm:text-[11px] truncate" style={{ color: "var(--cm-text-2)" }}>
                  {primary.reason}
                </span>
              </div>

              {/* Secondary: "+N more" */}
              {secondary.length > 0 && (
                <button
                  data-testid={`more-issues-${athlete.id}`}
                  className="text-[9px] sm:text-[10px] font-medium mt-0.5 hover:underline"
                  style={{ color: "var(--cm-text-3)" }}
                  onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
                >
                  +{secondary.length} more issue{secondary.length !== 1 ? "s" : ""}
                  {expanded ? " ▴" : " ▾"}
                </button>
              )}

              {/* Expanded secondary issues */}
              {expanded && secondary.length > 0 && (
                <div className="mt-1 pl-1 space-y-0.5" onClick={(e) => e.stopPropagation()}>
                  {secondary.map((s, i) => (
                    <p key={i} className="text-[9px] sm:text-[10px]" style={{ color: "var(--cm-text-3)" }}>
                      {s.reason}
                    </p>
                  ))}
                </div>
              )}
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
              backgroundColor: primary ? "rgba(13,148,136,0.1)" : "transparent",
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
    </div>
  );
}

function AllClearRow({ athlete, isLast }) {
  const navigate = useNavigate();
  const journey = athlete.journey_state || {};

  return (
    <div
      data-testid={`roster-athlete-${athlete.id}`}
      className="flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2 cursor-pointer hover:bg-slate-50/60 transition-colors group"
      style={{ borderBottom: isLast ? "none" : "1px solid var(--cm-border)" }}
      onClick={() => navigate(`/support-pods/${athlete.id}`)}
    >
      <AthleteAvatar name={athlete.name} photoUrl={athlete.photo_url} size={28} />
      <div className="flex-1 min-w-0">
        <span className="text-xs sm:text-sm font-medium truncate block" style={{ color: "var(--cm-text-2)" }}>
          {athlete.name}
        </span>
      </div>
      {journey.label && (
        <span data-testid={`journey-badge-${athlete.id}`}
          className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-medium shrink-0"
          style={{ backgroundColor: journey.bg, color: journey.color }}>
          {journey.label}
        </span>
      )}
      <ChevronRight className="w-3 h-3 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity shrink-0" style={{ color: "var(--cm-text-3)" }} />
    </div>
  );
}

export default function RosterSection({ athletes = [], eventPrep = [] }) {
  const navigate = useNavigate();
  const [allClearOpen, setAllClearOpen] = useState(true);

  const needsAction = athletes.filter(a => a.attention_status?.primary);
  const allClear = athletes.filter(a => !a.attention_status?.primary);

  // Sort needs-action by urgency score descending
  needsAction.sort((a, b) => (b.attention_status?.primary?.score || 0) - (a.attention_status?.primary?.score || 0));

  return (
    <section data-testid="roster-section">
      {/* Athletes Needing Attention */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2.5">
          {needsAction.length > 0 && <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />}
          <span className="text-[11px] font-bold uppercase tracking-widest" style={{ color: "var(--cm-text-3)" }}>
            Needs Attention
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

      {/* All Clear */}
      {allClear.length > 0 && (
        <div className="mb-4">
          <button onClick={() => setAllClearOpen(!allClearOpen)} className="flex items-center gap-2 mb-2 group" data-testid="toggle-all-clear">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-400" />
            <span className="text-[11px] font-bold uppercase tracking-widest" style={{ color: "var(--cm-text-3)" }}>All Clear</span>
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded" style={{ backgroundColor: "rgba(16,185,129,0.08)", color: "#10b981" }}>{allClear.length}</span>
            {allClearOpen ? <ChevronUp className="w-3 h-3" style={{ color: "var(--cm-text-3)" }} /> : <ChevronDown className="w-3 h-3" style={{ color: "var(--cm-text-3)" }} />}
          </button>
          {allClearOpen && (
            <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: "var(--cm-surface)", borderColor: "var(--cm-border)" }}>
              {allClear.map((athlete, idx) => (
                <AllClearRow key={athlete.id} athlete={athlete} isLast={idx === allClear.length - 1} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Event Prep */}
      {eventPrep.length > 0 && (
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="w-3.5 h-3.5" style={{ color: "#8b5cf6" }} />
            <span className="text-[11px] font-bold uppercase tracking-widest" style={{ color: "var(--cm-text-3)" }}>Events Requiring Prep</span>
            <span className="text-xs font-medium" style={{ color: "var(--cm-text-3)" }}>{eventPrep.length}</span>
          </div>
          <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: "var(--cm-surface)", borderColor: "var(--cm-border)" }}>
            {eventPrep.map((item, idx) => (
              <div key={item.event_id || idx}
                className="flex items-center gap-3 px-3 sm:px-4 py-2.5 cursor-pointer hover:bg-slate-50/60 transition-colors group"
                style={{ borderBottom: idx < eventPrep.length - 1 ? "1px solid var(--cm-border)" : "none" }}
                onClick={() => item.cta_path && navigate(item.cta_path)}
                data-testid={`event-prep-${item.event_id || idx}`}>
                <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: "rgba(139,92,246,0.08)" }}>
                  <Calendar className="w-3.5 h-3.5" style={{ color: "#8b5cf6" }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm font-medium group-hover:text-primary transition-colors" style={{ color: "var(--cm-text)" }}>{item.action || item.title}</p>
                  <p className="text-[10px] sm:text-[11px]" style={{ color: "var(--cm-text-3)" }}>{item.reason}</p>
                </div>
                <button className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold transition-all sm:opacity-0 sm:group-hover:opacity-100"
                  style={{ backgroundColor: "rgba(139,92,246,0.08)", color: "#8b5cf6", border: "1px solid rgba(139,92,246,0.15)" }}>
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

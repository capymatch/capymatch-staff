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

function AllClearRow({ athlete, isLast }) {
  const navigate = useNavigate();

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
      <ChevronRight className="w-3 h-3 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity shrink-0" style={{ color: "var(--cm-text-3)" }} />
    </div>
  );
}

export default function RosterSection({ athletes = [], eventPrep = [], excludeIds = [] }) {
  const navigate = useNavigate();
  const [allClearOpen, setAllClearOpen] = useState(true);

  /* Only show athletes NOT needing action and NOT in CoachInbox */
  const excludeSet = new Set(excludeIds);
  const allClear = athletes.filter(a => !a.attention_status?.primary && !excludeSet.has(a.id));

  return (
    <section data-testid="roster-section">
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

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Shield, ChevronRight, Clock, CheckCircle2, AlertTriangle, User } from "lucide-react";

/**
 * EscalationsCard — top of director's Mission Control.
 * Shows open escalations first, recently resolved below.
 */
export default function EscalationsCard({ escalations = [] }) {
  const navigate = useNavigate();
  const [showResolved, setShowResolved] = useState(false);

  const open = escalations.filter(e => e.status !== "resolved");
  const resolved = escalations.filter(e => e.status === "resolved");

  const urgencyColors = {
    critical: { bg: "rgba(239,68,68,0.12)", color: "#ef4444", label: "Critical" },
    high: { bg: "rgba(217,119,6,0.1)", color: "#d97706", label: "High" },
    medium: { bg: "rgba(99,102,241,0.1)", color: "#6366f1", label: "Medium" },
    low: { bg: "rgba(148,163,184,0.1)", color: "#94a3b8", label: "Low" },
  };

  const formatAgo = (iso) => {
    if (!iso) return "";
    const diff = Date.now() - new Date(iso).getTime();
    const hrs = Math.floor(diff / 3600000);
    if (hrs < 1) return "just now";
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  };

  const openPod = (esc) => {
    navigate(`/support-pods/${esc.athlete_id}?escalation=${esc.action_id}`);
  };

  if (escalations.length === 0) {
    return (
      <section className="rounded-xl border" style={{ backgroundColor: "#1E2433", borderColor: "#2D3548" }} data-testid="escalations-section">
        <div className="px-5 py-4 flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: "rgba(99,102,241,0.1)" }}>
            <Shield className="w-4 h-4" style={{ color: "#6366f1" }} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Escalations</h3>
            <p className="text-[11px]" style={{ color: "#8A92A3" }}>No open escalations</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-xl border" style={{ backgroundColor: "#1E2433", borderColor: open.length > 0 ? "rgba(99,102,241,0.2)" : "#2D3548" }} data-testid="escalations-section">
      {/* Header */}
      <div className="px-5 py-3.5 flex items-center justify-between border-b" style={{ borderColor: "#2D3548" }}>
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: "rgba(99,102,241,0.12)" }}>
            <Shield className="w-4 h-4" style={{ color: "#818cf8" }} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              Escalations
              {open.length > 0 && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ backgroundColor: "rgba(239,68,68,0.12)", color: "#ef4444" }}>
                  {open.length} open
                </span>
              )}
            </h3>
          </div>
        </div>
      </div>

      {/* Open escalations */}
      <div className="divide-y" style={{ borderColor: "#2D3548" }}>
        {open.map((esc) => {
          const urg = urgencyColors[esc.urgency] || urgencyColors.medium;
          const isAcknowledged = !!esc.acknowledged_at;
          return (
            <div
              key={esc.action_id}
              onClick={() => openPod(esc)}
              className="flex items-center gap-3 px-5 py-3 cursor-pointer transition-colors hover:bg-white/[0.02] group"
              data-testid={`escalation-row-${esc.action_id}`}
            >
              {/* Status indicator */}
              <div className="w-2 h-2 rounded-full shrink-0" style={{
                backgroundColor: isAcknowledged ? "#6366f1" : "#ef4444",
                boxShadow: isAcknowledged ? "none" : "0 0 6px rgba(239,68,68,0.4)",
              }} />

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="text-xs font-semibold text-white truncate">
                    {esc.athlete_name || "Athlete"}
                  </p>
                  <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded" style={{ backgroundColor: urg.bg, color: urg.color }}>
                    {urg.label}
                  </span>
                  {isAcknowledged && (
                    <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded" style={{ backgroundColor: "rgba(99,102,241,0.1)", color: "#818cf8" }}>
                      Acknowledged
                    </span>
                  )}
                </div>
                <p className="text-[11px] truncate" style={{ color: "#8A92A3" }}>
                  {esc.reason_label || esc.reason || "Escalated by coach"}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[10px] flex items-center gap-1" style={{ color: "#6B7280" }}>
                    <User className="w-2.5 h-2.5" />
                    {esc.coach_name || "Coach"}
                  </span>
                  <span className="text-[10px] flex items-center gap-1" style={{ color: "#6B7280" }}>
                    <Clock className="w-2.5 h-2.5" />
                    {formatAgo(esc.created_at)}
                  </span>
                </div>
              </div>

              {/* Open pod arrow */}
              <div className="flex items-center gap-1.5 shrink-0 opacity-50 group-hover:opacity-100 transition-opacity">
                <span className="text-[10px] font-medium" style={{ color: "#818cf8" }}>Open Pod</span>
                <ChevronRight className="w-3.5 h-3.5" style={{ color: "#818cf8" }} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Recently resolved */}
      {resolved.length > 0 && (
        <div className="border-t" style={{ borderColor: "#2D3548" }}>
          <button
            onClick={() => setShowResolved(!showResolved)}
            className="w-full px-5 py-2 text-[10px] font-semibold uppercase tracking-wider text-left transition-colors hover:bg-white/[0.02] flex items-center gap-2"
            style={{ color: "#6B7280" }}
            data-testid="escalations-show-resolved"
          >
            <CheckCircle2 className="w-3 h-3" style={{ color: "#10b981" }} />
            {resolved.length} recently resolved
            <ChevronRight className={`w-3 h-3 ml-auto transition-transform ${showResolved ? "rotate-90" : ""}`} />
          </button>
          {showResolved && (
            <div className="divide-y" style={{ borderColor: "#2D3548" }}>
              {resolved.map(esc => (
                <div key={esc.action_id} onClick={() => openPod(esc)}
                  className="flex items-center gap-3 px-5 py-2.5 cursor-pointer hover:bg-white/[0.02] opacity-60"
                  data-testid={`escalation-resolved-${esc.action_id}`}>
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" style={{ color: "#10b981" }} />
                  <p className="text-[11px] text-white/70 truncate flex-1">{esc.athlete_name || "Athlete"} — {esc.reason_label || esc.reason || "Resolved"}</p>
                  <span className="text-[10px] shrink-0" style={{ color: "#6B7280" }}>{formatAgo(esc.resolved_at)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}

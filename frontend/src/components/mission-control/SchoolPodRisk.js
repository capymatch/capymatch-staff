import { useState, useEffect } from "react";
import { AlertTriangle, ArrowRight } from "lucide-react";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const TRAJECTORY = {
  worsening: { symbol: "\u2197", label: "Worsening", color: "#dc2626" },
  stable:    { symbol: "\u2192", label: "Stable",    color: "#94a3b8" },
  improving: { symbol: "\u2198", label: "Improving", color: "#10b981" },
};

const SEV_STYLE = {
  critical: { color: "#991b1b", bg: "rgba(239,68,68,0.08)", border: "rgba(239,68,68,0.15)" },
  high:     { color: "#92400e", bg: "rgba(245,158,11,0.08)", border: "rgba(245,158,11,0.15)" },
  medium:   { color: "#1e40af", bg: "rgba(59,130,246,0.06)", border: "rgba(59,130,246,0.1)" },
  low:      { color: "#64748b", bg: "rgba(100,116,139,0.05)", border: "rgba(100,116,139,0.1)" },
};

export default function SchoolPodRisk({ programId }) {
  const [risk, setRisk] = useState(null);

  useEffect(() => {
    if (!programId) return;
    const token = localStorage.getItem("capymatch_token");
    axios.get(`${API}/school-pod-risk/${programId}`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then(res => setRisk(res.data)).catch(() => {});
  }, [programId]);

  if (!risk || !risk.primaryRisk) return null;

  const sev = SEV_STYLE[risk.severity] || SEV_STYLE.low;
  const traj = TRAJECTORY[risk.trajectory];
  const hasSecondary = risk.secondaryRisks && risk.secondaryRisks.length > 0;

  return (
    <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: sev.bg, borderColor: sev.border }} data-testid="school-pod-risk">
      <div className="px-4 py-3">
        {/* Header row */}
        <div className="flex items-center gap-2 mb-1.5">
          {(risk.severity === "critical" || risk.severity === "high") && (
            <AlertTriangle className="w-3.5 h-3.5" style={{ color: sev.color }} />
          )}
          <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: sev.color }} data-testid="pod-risk-severity">
            {risk.severity === "critical" ? "Critical Risk" : risk.severity === "high" ? "High Risk" : risk.severity === "medium" ? "Moderate Risk" : "Low Risk"}
          </span>
          {traj && risk.trajectory !== "stable" && (
            <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold" style={{ color: traj.color }} data-testid={`pod-trajectory-${risk.trajectory}`}>
              {traj.symbol} {traj.label}
            </span>
          )}
        </div>

        {/* Primary risk + whyNow */}
        <p className="text-xs font-semibold" style={{ color: "var(--cm-text, #1e293b)" }} data-testid="pod-risk-primary">
          {risk.primaryRisk}
        </p>
        <p className="text-[11px] mt-1" style={{ color: "var(--cm-text-3, #78716c)", lineHeight: 1.4 }} data-testid="pod-risk-why-now">
          {risk.whyNow}
        </p>

        {/* Recommended next action */}
        {risk.recommendedNextAction && (
          <div className="flex items-center gap-1 mt-2">
            <ArrowRight className="w-3 h-3" style={{ color: "#0d9488" }} />
            <span className="text-[11px] font-semibold" style={{ color: "#0d9488" }} data-testid="pod-risk-action">
              {risk.recommendedNextAction}
            </span>
          </div>
        )}

        {/* Secondary risks (up to 2) */}
        {hasSecondary && (
          <div className="mt-2 pt-2" style={{ borderTop: `1px solid ${sev.border}` }}>
            <p className="text-[9px] font-bold uppercase tracking-wider mb-1" style={{ color: sev.color, opacity: 0.5 }}>Also watching</p>
            {risk.secondaryRisks.slice(0, 2).map((sr, i) => (
              <p key={i} className="text-[11px]" style={{ color: "var(--cm-text-3, #94a3b8)", lineHeight: 1.5 }}>
                {sr}
              </p>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

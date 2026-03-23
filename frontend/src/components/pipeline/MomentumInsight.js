import { useRef, useEffect } from "react";
import { trackEvent } from "../../lib/analytics";
import { Flame, AlertTriangle, ArrowRight } from "lucide-react";

export default function MomentumInsight({ attention, recapData, onViewBreakdown }) {
  const trackedRef = useRef(false);

  const highItems = (attention || []).filter(a => a.tier === "high");
  const medItems = (attention || []).filter(a => a.tier === "medium");
  const lowItems = (attention || []).filter(a => a.tier === "low");
  const total = (attention || []).length;

  useEffect(() => {
    if (total > 0 && !trackedRef.current) {
      trackedRef.current = true;
      trackEvent("live_summary_viewed", {
        high: highItems.length, medium: medItems.length, low: lowItems.length,
      });
    }
  }, [total, highItems.length, medItems.length, lowItems.length]);

  if (total === 0) return null;

  const headline = highItems.length >= total
    ? `${highItems.length} school${highItems.length !== 1 ? "s" : ""} need${highItems.length === 1 ? "s" : ""} your attention now`
    : highItems.length > 0
    ? `${highItems.length} school${highItems.length !== 1 ? "s" : ""} need${highItems.length === 1 ? "s" : ""} attention \u2014 ${total - highItems.length} on track`
    : medItems.length > 0
    ? `${medItems.length} school${medItems.length !== 1 ? "s" : ""} to check on soon`
    : `All ${total} schools are on track`;

  const chips = [
    highItems.length > 0 && { label: `${highItems.length} now`, color: "#b5435a", bg: "rgba(239,68,68,0.06)" },
    medItems.length > 0 && { label: `${medItems.length} soon`, color: "#b87330", bg: "rgba(245,158,11,0.06)" },
    lowItems.length > 0 && { label: `${lowItems.length} on track`, color: "rgba(16,150,100,0.65)", bg: "rgba(16,185,129,0.06)" },
  ].filter(Boolean);

  const signals = buildSignals(recapData);

  return (
    <div data-testid="live-summary" style={{
      padding: "10px 0 12px",
      marginBottom: 8,
    }}>
      {/* Line 1: headline */}
      <p data-testid="summary-headline" style={{
        fontSize: 14, fontWeight: 500, color: "#334155",
        lineHeight: 1.4, margin: "0 0 6px",
      }}>
        {headline}
      </p>

      {/* Line 2: chips + CTA */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
        {chips.map((c, i) => (
          <span key={i} data-testid={`status-chip-${i}`} style={{
            fontSize: 11, fontWeight: 600, padding: "2px 7px",
            borderRadius: 4, background: c.bg, color: c.color,
            lineHeight: 1.3,
          }}>
            {c.label}
          </span>
        ))}

        <button
          data-testid="view-breakdown-btn"
          onClick={() => { trackEvent("view_full_breakdown_clicked"); onViewBreakdown?.(); }}
          style={{
            background: "none", border: "none", cursor: "pointer",
            fontSize: 11, fontWeight: 600, color: "#94a3b8",
            padding: 0, marginLeft: "auto",
            display: "inline-flex", alignItems: "center", gap: 3,
            transition: "color 100ms", whiteSpace: "nowrap",
          }}
          onMouseEnter={e => { e.currentTarget.style.color = "#475569"; }}
          onMouseLeave={e => { e.currentTarget.style.color = "#94a3b8"; }}
        >
          View full breakdown <ArrowRight style={{ width: 11, height: 11 }} />
        </button>
      </div>
    </div>
  );
}

function buildSignals(recapData) {
  if (!recapData?.momentum) return [];
  const signals = [];
  const coolingOff = recapData.momentum.cooling_off || [];
  const heatedUp = recapData.momentum.heated_up || [];

  if (heatedUp.length > 0 && signals.length < 2) {
    const names = heatedUp.slice(0, 2).map(s => s.school_name.replace(/University of /g, "").replace(/ University/g, ""));
    signals.push({
      type: "positive",
      text: `${names.join(" & ")} gaining momentum`,
      color: "#b87330",
    });
  }

  if (coolingOff.length > 0) {
    const s = coolingOff[0];
    const name = s.school_name.replace(/University of /g, "").replace(/ University/g, "");
    const days = s.days_since_last;
    signals.push({
      type: "risk",
      text: `${name} quiet${days ? ` (${days}d)` : ""}`,
      color: "#b5435a",
    });
  }

  return signals.slice(0, 2);
}

import { useRef, useEffect } from "react";
import { trackEvent } from "../../lib/analytics";

const FONT = '-apple-system, "SF Pro Text", Inter, ui-sans-serif, system-ui, sans-serif';

export default function MomentumInsight({ attention }) {
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

  /* Header */
  const header = highItems.length > 0
    ? `You\u2019re in a good position \u2014 ${highItems.length} school${highItems.length !== 1 ? 's' : ''} need${highItems.length === 1 ? 's' : ''} attention`
    : `All ${total} schools are on track \u2014 keep it going`;

  /* Breakdown pills */
  const pills = [
    highItems.length > 0 && { label: `${highItems.length} need${highItems.length === 1 ? 's' : ''} attention now`, bg: "rgba(239,68,68,0.06)", color: "#b5435a" },
    medItems.length > 0 && { label: `${medItems.length} need${medItems.length === 1 ? 's' : ''} a follow-up soon`, bg: "rgba(245,158,11,0.06)", color: "#b87330" },
    lowItems.length > 0 && { label: `${lowItems.length} ${lowItems.length === 1 ? 'is' : 'are'} on track`, bg: "rgba(16,185,129,0.06)", color: "rgba(16,150,100,0.7)" },
  ].filter(Boolean);

  /* Biggest shift — from live data */
  const overdue = highItems.find(h => h.hardTriggers?.overdue);
  const biggestShift = overdue
    ? `${overdue.program?.university_name} has gone quiet (${overdue.program?.signals?.days_since_activity || 'several'} days)`
    : null;

  /* Insight */
  const urgentNames = highItems.slice(0, 2).map(h => h.program?.university_name).filter(Boolean);
  const insight = urgentNames.length >= 2
    ? `${urgentNames[0]} and ${urgentNames[1]} require action first.`
    : urgentNames.length === 1
      ? `${urgentNames[0]} requires action first.`
      : "";

  return (
    <div data-testid="live-summary" style={{
      background: "#fff", borderRadius: 18, padding: "28px 30px",
      marginTop: 12, marginBottom: 28,
      border: "1px solid rgba(20,37,68,0.05)",
      boxShadow: "0 1px 4px rgba(19,33,58,0.03)", fontFamily: FONT,
    }}>
      <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "#94a3b8", marginBottom: 16 }}>
        Pipeline summary
      </div>
      <p data-testid="summary-headline" style={{ fontSize: 16, fontWeight: 500, color: "#0f172a", lineHeight: 1.55, margin: "0 0 14px" }}>
        {header}
      </p>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: (biggestShift || insight) ? 16 : 0 }}>
        {pills.map((p, i) => (
          <span key={i} style={{ fontSize: 12, fontWeight: 500, padding: "5px 11px", borderRadius: 999, background: p.bg, color: p.color }}>
            {p.label}
          </span>
        ))}
      </div>
      {biggestShift && (
        <p data-testid="biggest-shift" style={{ fontSize: 13, fontWeight: 500, color: "#64748b", margin: "0 0 4px", lineHeight: 1.5 }}>
          Biggest shift: {biggestShift}
        </p>
      )}
      {insight && (
        <p style={{ fontSize: 13, fontWeight: 400, color: "#94a3b8", margin: 0, lineHeight: 1.5 }}>
          {insight}
        </p>
      )}
    </div>
  );
}

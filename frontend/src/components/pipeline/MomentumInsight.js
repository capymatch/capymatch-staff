import { useRef, useEffect } from "react";
import { trackEvent } from "../../lib/analytics";
import { Flame, AlertTriangle, ArrowRight } from "lucide-react";

const FONT = '-apple-system, "SF Pro Text", Inter, ui-sans-serif, system-ui, sans-serif';

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

  /* ── Headline ── */
  const header = highItems.length > 0
    ? `You\u2019re in a good position \u2014 ${highItems.length} school${highItems.length !== 1 ? 's' : ''} need${highItems.length === 1 ? 's' : ''} attention`
    : `All ${total} schools are on track \u2014 keep it going`;

  /* ── Status chips (live data) ── */
  const pills = [
    highItems.length > 0 && { label: `${highItems.length} need${highItems.length === 1 ? 's' : ''} attention now`, bg: "rgba(239,68,68,0.06)", color: "#b5435a" },
    medItems.length > 0 && { label: `${medItems.length} need${medItems.length === 1 ? 's' : ''} a follow-up soon`, bg: "rgba(245,158,11,0.06)", color: "#b87330" },
    lowItems.length > 0 && { label: `${lowItems.length} ${lowItems.length === 1 ? 'is' : 'are'} on track`, bg: "rgba(16,185,129,0.06)", color: "rgba(16,150,100,0.7)" },
  ].filter(Boolean);

  /* ── Momentum signals (from recap data, max 2) ── */
  const signals = buildMomentumSignals(recapData);

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

      {/* Headline */}
      <p data-testid="summary-headline" style={{ fontSize: 16, fontWeight: 500, color: "#0f172a", lineHeight: 1.55, margin: "0 0 14px" }}>
        {header}
      </p>

      {/* Status chips */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: signals.length > 0 ? 16 : 0 }}>
        {pills.map((p, i) => (
          <span key={i} data-testid={`status-chip-${i}`} style={{ fontSize: 12, fontWeight: 500, padding: "5px 11px", borderRadius: 999, background: p.bg, color: p.color }}>
            {p.label}
          </span>
        ))}
      </div>

      {/* Momentum signals */}
      {signals.length > 0 && (
        <div data-testid="momentum-signals" style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 16 }}>
          {signals.map((sig, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 500, color: sig.color, lineHeight: 1.5 }}>
              {sig.type === "risk" ? (
                <AlertTriangle style={{ width: 13, height: 13, flexShrink: 0 }} />
              ) : (
                <Flame style={{ width: 13, height: 13, flexShrink: 0 }} />
              )}
              <span>{sig.text}</span>
            </div>
          ))}
        </div>
      )}

      {/* CTA */}
      <button
        data-testid="view-breakdown-btn"
        onClick={() => {
          trackEvent("view_full_breakdown_clicked");
          onViewBreakdown?.();
        }}
        style={{
          background: "none", border: "none", cursor: "pointer",
          fontSize: 13, fontWeight: 600, color: "#475569",
          padding: 0, fontFamily: "inherit",
          display: "inline-flex", alignItems: "center", gap: 6,
          transition: "color 120ms ease",
        }}
        onMouseEnter={e => { e.currentTarget.style.color = "#0f172a"; }}
        onMouseLeave={e => { e.currentTarget.style.color = "#475569"; }}
      >
        View full breakdown
        <ArrowRight style={{ width: 14, height: 14 }} />
      </button>
    </div>
  );
}

/* ── Build 1-2 momentum signals from recap data ── */
function buildMomentumSignals(recapData) {
  if (!recapData?.momentum) return [];

  const signals = [];
  const coolingOff = recapData.momentum.cooling_off || [];
  const heatedUp = recapData.momentum.heated_up || [];

  // Priority 1: Risk signal
  if (coolingOff.length > 0) {
    const names = coolingOff.slice(0, 2).map(s => s.school_name);
    const days = coolingOff[0].days_since_last;
    const nameStr = names.join(" and ");
    const suffix = days ? ` (${days} days)` : "";
    signals.push({
      type: "risk",
      text: `${nameStr} ${coolingOff.length === 1 ? "has" : "have"} gone quiet${suffix}`,
      color: "#b5435a",
    });
  }

  // Priority 2: Positive momentum
  if (heatedUp.length > 0 && signals.length < 2) {
    const names = heatedUp.slice(0, 2).map(s => s.school_name);
    const nameStr = names.join(" and ");
    signals.push({
      type: "positive",
      text: `${nameStr} ${heatedUp.length === 1 ? "is" : "are"} gaining momentum`,
      color: "#b87330",
    });
  }

  return signals.slice(0, 2);
}

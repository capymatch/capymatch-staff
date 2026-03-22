import { useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { trackEvent } from "../../lib/analytics";
import { Flame, AlertTriangle, ArrowRight, Target } from "lucide-react";

export default function MomentumInsight({ attention, recapData, onViewBreakdown }) {
  const trackedRef = useRef(false);
  const navigate = useNavigate();

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

  const headline = highItems.length > 0
    ? `You\u2019re in a good position \u2014 ${highItems.length} school${highItems.length !== 1 ? "s" : ""} need${highItems.length === 1 ? "s" : ""} attention`
    : `All ${total} schools are on track`;

  const chips = [
    highItems.length > 0 && { label: `${highItems.length} now`, color: "#b5435a", bg: "rgba(239,68,68,0.06)" },
    medItems.length > 0 && { label: `${medItems.length} soon`, color: "#b87330", bg: "rgba(245,158,11,0.06)" },
    lowItems.length > 0 && { label: `${lowItems.length} on track`, color: "rgba(16,150,100,0.65)", bg: "rgba(16,185,129,0.06)" },
  ].filter(Boolean);

  const signals = buildSignals(recapData);

  // Determine top priority: highest-urgency "high" tier school with an action
  const topPriority = highItems.length > 0
    ? highItems.sort((a, b) => (b.attentionScore || 0) - (a.attentionScore || 0))[0]
    : null;
  const topSchoolName = topPriority?.program?.university_name
    ?.replace(/University of /g, "").replace(/ University/g, "") || null;
  const topAction = topPriority?.primaryAction || topPriority?.topAction?.action || null;

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

      {/* Line 2: chips + signals + CTA */}
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

        {signals.length > 0 && (
          <span style={{ fontSize: 11, color: "#94a3b8", margin: "0 2px" }}>&middot;</span>
        )}

        {signals.map((sig, i) => (
          <span key={i} style={{
            display: "inline-flex", alignItems: "center", gap: 3,
            fontSize: 11, fontWeight: 500, color: sig.color, lineHeight: 1.3,
          }}>
            {sig.type === "risk"
              ? <AlertTriangle style={{ width: 11, height: 11, flexShrink: 0 }} />
              : <Flame style={{ width: 11, height: 11, flexShrink: 0 }} />}
            {sig.text}
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

      {/* Line 3: Top priority action (deterministic from Coach Watch) */}
      {topPriority && topAction && (
        <button
          data-testid="top-priority-line"
          onClick={() => {
            trackEvent("top_priority_clicked", { program_id: topPriority.programId, school: topSchoolName });
            navigate(`/pipeline/${topPriority.programId}`);
          }}
          style={{
            display: "flex", alignItems: "center", gap: 6,
            marginTop: 10, padding: "6px 10px",
            background: "rgba(239,68,68,0.04)", border: "1px solid rgba(239,68,68,0.10)",
            borderRadius: 8, cursor: "pointer", width: "100%",
            transition: "background 150ms, border-color 150ms",
          }}
          onMouseEnter={e => { e.currentTarget.style.background = "rgba(239,68,68,0.08)"; e.currentTarget.style.borderColor = "rgba(239,68,68,0.18)"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "rgba(239,68,68,0.04)"; e.currentTarget.style.borderColor = "rgba(239,68,68,0.10)"; }}
        >
          <Target style={{ width: 12, height: 12, color: "#ef4444", flexShrink: 0 }} />
          <span style={{ fontSize: 12, fontWeight: 600, color: "#334155" }}>
            Top priority:{" "}
            <span style={{ fontWeight: 500 }}>{topAction}{topSchoolName ? ` \u2014 ${topSchoolName}` : ""}</span>
          </span>
          <ArrowRight style={{ width: 11, height: 11, color: "#94a3b8", marginLeft: "auto", flexShrink: 0 }} />
        </button>
      )}
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

import { useNavigate } from "react-router-dom";
import { useEffect, useRef } from "react";
import { ArrowRight } from "lucide-react";
import { trackEvent } from "../../lib/analytics";

const FONT = '-apple-system, "SF Pro Text", Inter, ui-sans-serif, system-ui, sans-serif';

export default function MomentumInsight({ data: recap, attention }) {
  const navigate = useNavigate();
  const trackedRef = useRef(false);

  useEffect(() => {
    if (recap?.recap_hero && !trackedRef.current) {
      trackedRef.current = true;
      trackEvent("recap_teaser_viewed", {
        heated_count: recap.momentum?.heated_up?.length || 0,
        cooling_count: recap.momentum?.cooling_off?.length || 0,
      });
    }
  }, [recap]);

  if (!recap || !recap.recap_hero) return null;

  const heated = recap.momentum?.heated_up?.length || 0;
  const cooling = recap.momentum?.cooling_off?.length || 0;
  const steady = recap.momentum?.holding_steady?.length || 0;

  const highItems = (attention || []).filter(a => a.attentionLevel === "high");
  const topSchool = highItems[0]?.program?.university_name;
  const topDays = highItems[0]?.program?.signals?.days_since_last_activity;
  const improving = heated > cooling;

  /* Narrative decision sentence */
  let decision = "";
  if (improving && topSchool) {
    decision = `Your pipeline is improving, but ${topSchool} needs immediate attention.`;
  } else if (improving) {
    decision = "Your pipeline is improving \u2014 keep the momentum going.";
  } else if (topSchool) {
    decision = `${topSchool} needs your attention \u2014 don\u2019t let momentum slip.`;
  } else {
    decision = "Your pipeline is holding steady \u2014 stay consistent.";
  }

  /* Biggest shift insight */
  const coolingSchools = recap.momentum?.cooling_off || [];
  let biggestShift = "";
  if (coolingSchools.length > 0) {
    const topCooling = coolingSchools[0];
    const name = topCooling?.university_name || topSchool;
    const days = topCooling?.days_since_last_activity || topDays;
    if (name && days) {
      biggestShift = `Biggest shift: ${name} cooled after ${days} days of inactivity`;
    } else if (name) {
      biggestShift = `Biggest shift: ${name} cooled off recently`;
    }
  } else if (topSchool && topDays) {
    biggestShift = `Biggest shift: ${topSchool} cooled after ${topDays} days of inactivity`;
  }

  const pills = [
    heated > 0 && { label: `${heated} gaining momentum`, bg: "rgba(255,155,82,0.06)", color: "rgba(184,115,48,0.7)" },
    highItems.length > 0 && { label: `${highItems.length} needs attention`, bg: "rgba(255,107,127,0.06)", color: "rgba(181,67,90,0.7)" },
    steady > 0 && { label: `${steady} steady`, bg: "rgba(148,163,184,0.07)", color: "rgba(100,116,139,0.65)" },
  ].filter(Boolean);

  return (
    <div
      data-testid="recap-teaser"
      style={{
        background: "#fff",
        borderRadius: 18,
        padding: "28px 30px",
        marginTop: 40,
        marginBottom: 40,
        border: "1px solid rgba(20,37,68,0.05)",
        boxShadow: "0 1px 4px rgba(19, 33, 58, 0.03)",
        fontFamily: FONT,
      }}
    >
      <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "#94a3b8", marginBottom: 16 }}>
        What changed since your last update
      </div>

      <p data-testid="momentum-decision" style={{ fontSize: 16, fontWeight: 500, color: "#0f172a", lineHeight: 1.55, margin: "0 0 14px" }}>
        {decision}
      </p>

      {/* Supporting pills — smaller, softer */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: biggestShift ? 16 : 20 }}>
        {pills.map((pill, i) => (
          <span key={i} style={{
            fontSize: 12, fontWeight: 500, padding: "5px 11px",
            borderRadius: 999, background: pill.bg, color: pill.color,
          }}>
            {pill.label}
          </span>
        ))}
      </div>

      {/* Biggest shift insight */}
      {biggestShift && (
        <p data-testid="biggest-shift" style={{
          fontSize: 13, fontWeight: 500, color: "#64748b",
          margin: "0 0 20px", lineHeight: 1.5,
          fontStyle: "italic",
        }}>
          {biggestShift}
        </p>
      )}

      <button
        onClick={() => navigate("/recap")}
        data-testid="recap-cta"
        style={{
          fontSize: 13, fontWeight: 600, color: "#19c3b2",
          background: "none", border: "none", cursor: "pointer",
          display: "inline-flex", alignItems: "center", gap: 5,
          padding: 0, fontFamily: FONT,
        }}
      >
        View full breakdown <ArrowRight size={14} />
      </button>
    </div>
  );
}

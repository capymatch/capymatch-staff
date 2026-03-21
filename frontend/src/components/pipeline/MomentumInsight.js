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
  const improving = heated > cooling;

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

  const pills = [
    heated > 0 && { label: `${heated} gaining momentum`, bg: "rgba(255,155,82,0.08)", color: "#b87330" },
    highItems.length > 0 && { label: `${highItems.length} needs attention`, bg: "rgba(255,107,127,0.08)", color: "#b5435a" },
    steady > 0 && { label: `${steady} steady`, bg: "rgba(148,163,184,0.10)", color: "#64748b" },
  ].filter(Boolean);

  return (
    <div
      data-testid="recap-teaser"
      style={{
        background: "#fff",
        borderRadius: 18,
        padding: "26px 28px",
        marginTop: 36,
        marginBottom: 36,
        border: "1px solid rgba(20,37,68,0.06)",
        boxShadow: "0 1px 6px rgba(19, 33, 58, 0.04)",
        fontFamily: FONT,
      }}
    >
      <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "#94a3b8", marginBottom: 14 }}>
        What changed since your last update
      </div>

      <p style={{ fontSize: 16, fontWeight: 500, color: "#0f172a", lineHeight: 1.5, margin: "0 0 18px" }}>
        {decision}
      </p>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
        {pills.map((pill, i) => (
          <span key={i} style={{
            fontSize: 13, fontWeight: 500, padding: "8px 14px",
            borderRadius: 999, background: pill.bg, color: pill.color,
          }}>
            {pill.label}
          </span>
        ))}
      </div>

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

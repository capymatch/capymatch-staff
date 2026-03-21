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

  const highItems = (attention || []).filter(a => a.tier === "high");
  const medItems = (attention || []).filter(a => a.tier === "medium");
  const lowItems = (attention || []).filter(a => a.tier === "low");
  const total = (attention || []).length;

  /* Header — position-aware */
  const header = highItems.length > 0
    ? `You\u2019re in a good position \u2014 ${highItems.length} school${highItems.length !== 1 ? 's' : ''} need${highItems.length === 1 ? 's' : ''} attention`
    : total > 0
      ? `All ${total} schools are on track \u2014 keep it going`
      : "Your pipeline is ready to build";

  /* Breakdown pills */
  const breakdownPills = [
    highItems.length > 0 && { label: `${highItems.length} need${highItems.length === 1 ? 's' : ''} attention now`, bg: "rgba(239,68,68,0.06)", color: "#b5435a" },
    medItems.length > 0 && { label: `${medItems.length} need${medItems.length === 1 ? 's' : ''} a follow-up soon`, bg: "rgba(245,158,11,0.06)", color: "#b87330" },
    lowItems.length > 0 && { label: `${lowItems.length} ${lowItems.length === 1 ? 'is' : 'are'} on track`, bg: "rgba(16,185,129,0.06)", color: "rgba(16,150,100,0.7)" },
  ].filter(Boolean);

  /* Insight — name the urgent schools */
  const urgentNames = highItems.slice(0, 2).map(h => h.program?.university_name).filter(Boolean);
  let insight = "";
  if (urgentNames.length >= 2) insight = `${urgentNames[0]} and ${urgentNames[1]} require action first.`;
  else if (urgentNames.length === 1) insight = `${urgentNames[0]} requires action first.`;

  return (
    <div
      data-testid="recap-teaser"
      style={{
        background: "#fff",
        borderRadius: 18,
        padding: "28px 30px",
        marginTop: 12,
        marginBottom: 28,
        border: "1px solid rgba(20,37,68,0.05)",
        boxShadow: "0 1px 4px rgba(19, 33, 58, 0.03)",
        fontFamily: FONT,
      }}
    >
      <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "#94a3b8", marginBottom: 16 }}>
        Pipeline summary
      </div>

      <p data-testid="momentum-decision" style={{ fontSize: 16, fontWeight: 500, color: "#0f172a", lineHeight: 1.55, margin: "0 0 14px" }}>
        {header}
      </p>

      {/* Breakdown pills */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: insight ? 16 : 20 }}>
        {breakdownPills.map((pill, i) => (
          <span key={i} style={{
            fontSize: 12, fontWeight: 500, padding: "5px 11px",
            borderRadius: 999, background: pill.bg, color: pill.color,
          }}>
            {pill.label}
          </span>
        ))}
      </div>

      {/* Insight */}
      {insight && (
        <p data-testid="biggest-shift" style={{
          fontSize: 13, fontWeight: 500, color: "#64748b",
          margin: "0 0 20px", lineHeight: 1.5,
        }}>
          {insight}
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

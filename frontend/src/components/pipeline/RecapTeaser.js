import { useNavigate } from "react-router-dom";
import { useEffect, useRef } from "react";
import { Sparkles, ChevronRight } from "lucide-react";
import { trackEvent } from "../../lib/analytics";
import "./pipeline-premium.css";

export default function RecapTeaser({ data: recap }) {
  const navigate = useNavigate();
  const trackedRef = useRef(false);

  useEffect(() => {
    if (recap?.recap_hero && !trackedRef.current) {
      trackedRef.current = true;
      trackEvent("recap_teaser_viewed", {
        heated_count: recap.momentum?.heated_up?.length || 0,
        cooling_count: recap.momentum?.cooling_off?.length || 0,
        has_top_priority: !!recap.priorities?.find(p => p.rank === "top"),
      });
    }
  }, [recap]);

  if (!recap || !recap.recap_hero) return null;

  const heated = recap.momentum?.heated_up?.length || 0;
  const cooling = recap.momentum?.cooling_off?.length || 0;
  const steady = recap.momentum?.holding_steady?.length || 0;
  const topPriority = recap.priorities?.find((p) => p.rank === "top");

  return (
    <div
      data-testid="recap-teaser"
      onClick={() => navigate("/recap")}
      style={{
        background: "linear-gradient(135deg, rgba(16,30,59,0.98), rgba(18,32,63,0.96))",
        borderRadius: 26,
        padding: "24px 26px",
        marginTop: 20,
        marginBottom: 20,
        cursor: "pointer",
        position: "relative",
        overflow: "hidden",
        boxShadow: "0 24px 70px rgba(19, 33, 58, 0.10)",
        border: "1px solid rgba(255,255,255,0.06)",
        transition: "transform 120ms ease, box-shadow 120ms ease",
      }}
      onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 28px 70px rgba(19,33,58,0.15)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = "0 24px 70px rgba(19, 33, 58, 0.10)"; }}
    >
      {/* Decorative glow */}
      <div style={{
        position: "absolute", top: -60, right: -60, width: 200, height: 200,
        borderRadius: "50%", background: "radial-gradient(circle, rgba(139,123,255,0.15), transparent 60%)",
        pointerEvents: "none",
      }} />

      {/* Eyebrow */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <Sparkles size={14} style={{ color: "#c8c2ff" }} />
        <span className="ds-eyebrow" style={{ color: "#c8c2ff", opacity: 0.72 }}>
          Momentum Recap
        </span>
        <span style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", fontWeight: 500, marginLeft: "auto" }}>
          {recap.period_label}
        </span>
      </div>

      {/* Recap Summary — large */}
      <div style={{
        fontSize: 26, lineHeight: 1.08, letterSpacing: "-0.045em",
        fontWeight: 800, color: "#fff", margin: "0 0 18px",
        maxWidth: 760,
      }}>
        {recap.recap_hero}
      </div>

      {/* Top Priority Callout */}
      {topPriority && (
        <div style={{
          fontSize: 13, color: "#ff9b52", fontWeight: 600, marginBottom: 14,
          display: "flex", alignItems: "center", gap: 6,
        }}>
          <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#ff6b7f", flexShrink: 0 }} />
          {topPriority.action}
        </div>
      )}

      {/* Trend pills */}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        {heated > 0 && (
          <div className="ds-trend-pill">
            <strong style={{ color: "#fff" }}>{heated} heated</strong>
            <span>Recent activity strengthening</span>
          </div>
        )}
        {steady > 0 && (
          <div className="ds-trend-pill">
            <strong style={{ color: "#fff" }}>{steady} steady</strong>
            <span>Maintain your cadence</span>
          </div>
        )}
        {cooling > 0 && (
          <div className="ds-trend-pill">
            <strong style={{ color: "#fff" }}>{cooling} cooling</strong>
            <span>Needs attention now</span>
          </div>
        )}
      </div>

      {/* Footer CTA */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "flex-end",
        paddingTop: 16, marginTop: 16,
        borderTop: "1px solid rgba(255,255,255,0.06)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 13, color: "#c8c2ff", fontWeight: 700 }}>
          View full recap <ChevronRight size={15} />
        </div>
      </div>
    </div>
  );
}

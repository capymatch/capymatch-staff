import { useRef, useEffect } from "react";
import { trackEvent } from "../../lib/analytics";
import { ArrowRight } from "lucide-react";

export default function MomentumInsight({ attention, recapData, onViewBreakdown }) {
  const trackedRef = useRef(false);

  const items = attention || [];
  const highItems = items.filter(a => a.tier === "high");
  const total = items.length;

  useEffect(() => {
    if (total > 0 && !trackedRef.current) {
      trackedRef.current = true;
      trackEvent("live_summary_viewed", { high: highItems.length, total });
    }
  }, [total, highItems.length]);

  if (total === 0) return null;

  // Build action-driven headline
  const topSchool = highItems[0]?.program?.university_name;
  const shortName = topSchool ? topSchool.replace(/University of /g, "").replace(/ University/g, "") : null;
  const others = total - 1;

  let headline;
  if (highItems.length > 0 && shortName) {
    const suffix = others > 0
      ? ` \u2014 ${others} other${others !== 1 ? "s" : ""} need follow-up`
      : "";
    headline = `${shortName} needs immediate attention${suffix}`;
  } else if (highItems.length > 1) {
    headline = `${highItems.length} critical conversation${highItems.length !== 1 ? "s are" : " is"} at risk \u2022 ${others > 0 ? `${total - highItems.length} others need follow-up` : "act now"}`;
  } else {
    headline = `${total} school${total !== 1 ? "s" : ""} on your radar \u2014 stay active`;
  }

  return (
    <div data-testid="live-summary" style={{ padding: "10px 0 12px", marginBottom: 8 }}>
      {/* Headline */}
      <p data-testid="summary-headline" style={{
        fontSize: 14, fontWeight: 500, color: "#334155",
        lineHeight: 1.4, margin: "0 0 6px",
      }}>
        {headline}
      </p>

      {/* CTA */}
      <div style={{ display: "flex", alignItems: "center" }}>
        <button
          data-testid="view-breakdown-btn"
          onClick={() => { trackEvent("view_full_breakdown_clicked"); onViewBreakdown?.(); }}
          style={{
            background: "none", border: "none", cursor: "pointer",
            fontSize: 11, fontWeight: 600, color: "#94a3b8",
            padding: 0, display: "inline-flex", alignItems: "center", gap: 3,
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

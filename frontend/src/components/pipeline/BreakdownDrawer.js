import React from "react";
import { X, Flame, TrendingDown, Minus, Lightbulb, Clock } from "lucide-react";

const FONT = '-apple-system, "SF Pro Text", Inter, ui-sans-serif, system-ui, sans-serif';

/* ── Per-school explanation card ── */
function SchoolExplanation({ item }) {
  const reasons = [];
  const ht = item.hardTriggers || {};
  const prog = item.program || {};
  const days = prog.signals?.days_since_activity || prog.signals?.days_since_last_activity;

  if (ht.overdue) {
    const overdueDays = Math.abs(item.daysUntil || 0);
    reasons.push(`Overdue follow-up (${overdueDays} day${overdueDays !== 1 ? "s" : ""})`);
  }
  if (days && days >= 5) {
    reasons.push(`No response after last outreach`);
  }
  if (ht.coachFlag) {
    reasons.push("Coach flagged this");
  }
  if (ht.dueSoon && !ht.overdue) {
    reasons.push(item.daysUntil === 0 ? "Task due today" : `Task due in ${item.daysUntil} day${item.daysUntil !== 1 ? "s" : ""}`);
  }
  if (reasons.length === 0 && item.tier === "medium") {
    reasons.push("Needs a follow-up to maintain momentum");
  }
  if (reasons.length === 0 && item.tier === "low") {
    reasons.push("On track — no action needed right now");
  }

  const tierLabel = item.tier === "high" ? "High" : item.tier === "medium" ? "Medium" : "Low";
  const tierColor = item.tier === "high" ? "#dc2626" : item.tier === "medium" ? "#d97706" : "#16a34a";

  return (
    <div style={{
      padding: "14px 0",
      borderBottom: "1px solid rgba(20,37,68,0.05)",
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: "#0f172a" }}>
          {prog.university_name || "Unknown"}
        </span>
        <span style={{
          fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em",
          color: tierColor, padding: "2px 8px", borderRadius: 6,
          background: `${tierColor}10`,
        }}>
          Priority: {tierLabel}
        </span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {reasons.slice(0, 3).map((r, i) => (
          <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 13, color: "#64748b", lineHeight: 1.5 }}>
            <span style={{ width: 4, height: 4, borderRadius: "50%", background: "#94a3b8", flexShrink: 0, marginTop: 7 }} />
            {r}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Momentum group ── */
function MomentumGroup({ title, icon: Icon, iconColor, items }) {
  if (!items || items.length === 0) return null;
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
        <Icon style={{ width: 14, height: 14, color: iconColor }} />
        <span style={{ fontSize: 13, fontWeight: 600, color: iconColor }}>
          {title}
        </span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 4, paddingLeft: 4 }}>
        {items.map((item, i) => (
          <div key={item.program_id || i} style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 13, color: "#475569", lineHeight: 1.55 }}>
            <span style={{ width: 4, height: 4, borderRadius: "50%", background: iconColor, flexShrink: 0, marginTop: 7, opacity: 0.7 }} />
            <span>
              <span style={{ fontWeight: 500 }}>{item.school_name}</span>
              {item.stage_label && (
                <span style={{ color: "#94a3b8", fontWeight: 400 }}> — {item.what_changed?.toLowerCase() || item.stage_label?.toLowerCase()}</span>
              )}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Main Drawer ── */
export default function BreakdownDrawer({ isOpen, onClose, recapData, attentionItems }) {
  if (!isOpen) return null;

  const momentum = recapData?.momentum || {};
  const heatedUp = momentum.heated_up || [];
  const coolingOff = momentum.cooling_off || [];
  const holdingSteady = momentum.holding_steady || [];
  const aiInsights = recapData?.ai_insights || [];
  const narrative = recapData?.ai_summary || "";
  const createdAt = recapData?.created_at;

  // Sort attention items by tier for per-school explanations
  const sorted = [...(attentionItems || [])].sort((a, b) => {
    const order = { high: 0, medium: 1, low: 2 };
    return (order[a.tier] ?? 3) - (order[b.tier] ?? 3);
  });

  // Format freshness
  const freshness = formatFreshness(createdAt);

  return (
    <>
      {/* Backdrop */}
      <div
        data-testid="breakdown-backdrop"
        onClick={onClose}
        style={{
          position: "fixed", inset: 0, zIndex: 998,
          background: "rgba(15,23,42,0.25)",
          backdropFilter: "blur(2px)",
          animation: "bd-fade-in 200ms ease both",
        }}
      />

      {/* Drawer panel */}
      <div
        data-testid="breakdown-drawer"
        style={{
          position: "fixed", top: 0, right: 0, bottom: 0,
          width: "min(480px, 90vw)", zIndex: 999,
          background: "#fff",
          borderLeft: "1px solid rgba(20,37,68,0.06)",
          boxShadow: "-8px 0 40px rgba(15,23,42,0.12)",
          overflowY: "auto",
          animation: "bd-slide-in 250ms cubic-bezier(0.16,1,0.3,1) both",
          fontFamily: FONT,
        }}
      >
        {/* Header */}
        <div style={{
          position: "sticky", top: 0, zIndex: 1,
          background: "#fff",
          borderBottom: "1px solid rgba(20,37,68,0.05)",
          padding: "20px 24px",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <span style={{ fontSize: 15, fontWeight: 600, color: "#0f172a" }}>
            Full breakdown
          </span>
          <button
            data-testid="breakdown-close-btn"
            onClick={onClose}
            style={{
              background: "none", border: "none", cursor: "pointer",
              width: 32, height: 32, borderRadius: 8,
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "#94a3b8", transition: "background 100ms",
            }}
            onMouseEnter={e => { e.currentTarget.style.background = "rgba(20,37,68,0.04)"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "none"; }}
          >
            <X style={{ width: 18, height: 18 }} />
          </button>
        </div>

        <div style={{ padding: "24px 24px 40px" }}>

          {/* ═══ 1. PIPELINE NARRATIVE ═══ */}
          {narrative && (
            <section data-testid="breakdown-narrative" style={{ marginBottom: 32 }}>
              <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "#94a3b8", marginBottom: 12 }}>
                Since your last update
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {parseNarrative(narrative).map((line, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 13, color: "#475569", lineHeight: 1.6 }}>
                    <span style={{ width: 4, height: 4, borderRadius: "50%", background: "#94a3b8", flexShrink: 0, marginTop: 8 }} />
                    {line}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ═══ 2. MOMENTUM BREAKDOWN ═══ */}
          {(heatedUp.length > 0 || coolingOff.length > 0 || holdingSteady.length > 0) && (
            <section data-testid="breakdown-momentum" style={{ marginBottom: 32 }}>
              <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "#94a3b8", marginBottom: 14 }}>
                Momentum breakdown
              </div>
              <MomentumGroup title="Gaining momentum" icon={Flame} iconColor="#f59e0b" items={heatedUp} />
              <MomentumGroup title="Cooling off" icon={TrendingDown} iconColor="#ef4444" items={coolingOff} />
              <MomentumGroup title="Holding steady" icon={Minus} iconColor="#94a3b8" items={holdingSteady} />
            </section>
          )}

          {/* ═══ 3. PER-SCHOOL EXPLANATION ═══ */}
          {sorted.length > 0 && (
            <section data-testid="breakdown-schools" style={{ marginBottom: 32 }}>
              <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "#94a3b8", marginBottom: 8 }}>
                Per-school details
              </div>
              {sorted.map(item => (
                <SchoolExplanation key={item.programId} item={item} />
              ))}
            </section>
          )}

          {/* ═══ 4. COACHING INSIGHTS ═══ */}
          {aiInsights.length > 0 && (
            <section data-testid="breakdown-insights" style={{ marginBottom: 32 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12 }}>
                <Lightbulb style={{ width: 13, height: 13, color: "#94a3b8" }} />
                <span style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "#94a3b8" }}>
                  Coaching insights
                </span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {aiInsights.slice(0, 3).map((ins, i) => (
                  <div key={i} style={{
                    fontSize: 13, color: "#475569", lineHeight: 1.6,
                    padding: "10px 14px", borderRadius: 10,
                    background: "rgba(100,116,139,0.03)",
                    borderLeft: "3px solid rgba(100,116,139,0.12)",
                  }}>
                    {typeof ins === "string" ? ins : ins.text || ins.insight || ""}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ═══ 5. FRESHNESS TIMESTAMP ═══ */}
          {freshness && (
            <div data-testid="breakdown-freshness" style={{
              display: "flex", alignItems: "center", gap: 6,
              fontSize: 12, color: "#94a3b8",
              paddingTop: 16,
              borderTop: "1px solid rgba(20,37,68,0.04)",
            }}>
              <Clock style={{ width: 12, height: 12 }} />
              Insights updated {freshness}
            </div>
          )}
        </div>
      </div>

      {/* Animations */}
      <style>{`
        @keyframes bd-fade-in { from { opacity: 0; } to { opacity: 1; } }
        @keyframes bd-slide-in { from { transform: translateX(100%); } to { transform: translateX(0); } }
      `}</style>
    </>
  );
}

/* ── Parse the AI summary into bullet lines ── */
function parseNarrative(summary) {
  if (!summary) return [];
  // Split on bullet chars or sentences
  return summary
    .split(/[•\n]/)
    .map(s => s.trim())
    .filter(s => s.length > 3);
}

/* ── Format freshness timestamp ── */
function formatFreshness(isoStr) {
  if (!isoStr) return null;
  try {
    const d = new Date(isoStr);
    const now = new Date();
    const diffMs = now - d;
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins} minute${mins !== 1 ? "s" : ""} ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs} hour${hrs !== 1 ? "s" : ""} ago`;
    const days = Math.floor(hrs / 24);
    return `${days} day${days !== 1 ? "s" : ""} ago`;
  } catch {
    return null;
  }
}

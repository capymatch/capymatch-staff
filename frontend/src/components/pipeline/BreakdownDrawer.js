import React, { useState } from "react";
import { X, Flame, TrendingDown, Minus, Lightbulb, Clock, ChevronDown } from "lucide-react";

const FONT = '-apple-system, "SF Pro Text", Inter, ui-sans-serif, system-ui, sans-serif';

/* ── Per-school: max 2 human-readable reasons ── */
function SchoolExplanation({ item, style }) {
  const reasons = [];
  const ht = item.hardTriggers || {};
  const prog = item.program || {};
  const days = prog.signals?.days_since_activity || prog.signals?.days_since_last_activity;

  if (ht.overdue) {
    const d = Math.abs(item.daysUntil || 0);
    reasons.push(`Follow-up is ${d} day${d !== 1 ? "s" : ""} overdue`);
  } else if (days && days >= 5) {
    reasons.push(`No response after ${days} days`);
  }
  if (ht.coachFlag && reasons.length < 2) reasons.push("Coach flagged for attention");
  if (ht.dueSoon && !ht.overdue && reasons.length < 2) {
    reasons.push(item.daysUntil === 0 ? "Task due today" : `Task due in ${item.daysUntil} day${item.daysUntil !== 1 ? "s" : ""}`);
  }
  if (reasons.length === 0 && item.tier === "medium") reasons.push("Needs a follow-up to stay warm");
  if (reasons.length === 0 && item.tier === "low") reasons.push("On track — no action needed");

  const tierColor = item.tier === "high" ? "#ef4444" : item.tier === "medium" ? "#f59e0b" : "#10b981";

  return (
    <div style={{ padding: "10px 0", borderBottom: "1px solid rgba(20,37,68,0.04)", ...style }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ width: 5, height: 5, borderRadius: "50%", background: tierColor, flexShrink: 0 }} />
        <span style={{ fontSize: 13, fontWeight: 600, color: "#0f172a" }}>{prog.university_name || "Unknown"}</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 2, marginTop: 4, paddingLeft: 13 }}>
        {reasons.slice(0, 2).map((r, i) => (
          <span key={i} style={{ fontSize: 12, color: "#64748b", lineHeight: 1.5 }}>{r}</span>
        ))}
      </div>
    </div>
  );
}

/* ── "Show more" toggle ── */
function ShowMoreToggle({ label, expanded, onToggle }) {
  return (
    <button onClick={onToggle}
      style={{ background: "none", border: "none", cursor: "pointer", padding: "6px 0", fontSize: 11.5, fontWeight: 500, color: "#94a3b8", display: "flex", alignItems: "center", gap: 4, transition: "color 100ms" }}
      onMouseEnter={e => { e.currentTarget.style.color = "#64748b"; }}
      onMouseLeave={e => { e.currentTarget.style.color = "#94a3b8"; }}>
      {label}
      <ChevronDown style={{
        width: 12, height: 12,
        transition: "transform 200ms ease",
        transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
      }} />
    </button>
  );
}

/* ── Main Drawer ── */
export default function BreakdownDrawer({ isOpen, onClose, recapData, attentionItems }) {
  const [showAllSchools, setShowAllSchools] = useState(false);

  if (!isOpen) return null;

  const momentum = recapData?.momentum || {};
  const heatedUp = momentum.heated_up || [];
  const coolingOff = momentum.cooling_off || [];
  const holdingSteady = momentum.holding_steady || [];
  const aiInsights = (recapData?.ai_insights || []).slice(0, 2);
  const freshness = formatFreshness(recapData?.created_at);
  const hasMomentum = heatedUp.length > 0 || coolingOff.length > 0 || holdingSteady.length > 0;

  const sorted = [...(attentionItems || [])].sort((a, b) => {
    const order = { high: 0, medium: 1, low: 2 };
    return (order[a.tier] ?? 3) - (order[b.tier] ?? 3);
  });
  const visibleSchools = showAllSchools ? sorted : sorted.slice(0, 3);
  const hasMoreSchools = sorted.length > 3;

  const topReasons = buildTopReasons(recapData, attentionItems, coolingOff, heatedUp);

  return (
    <>
      <div data-testid="breakdown-backdrop" onClick={onClose}
        className="bd-backdrop"
        style={{ position: "fixed", inset: 0, zIndex: 998, background: "rgba(15,23,42,0.18)", backdropFilter: "blur(2px)" }} />

      <div data-testid="breakdown-drawer" className="bd-panel"
        style={{ position: "fixed", top: 0, right: 0, bottom: 0, width: "min(440px, 90vw)", zIndex: 999, background: "#fff", borderLeft: "1px solid rgba(20,37,68,0.04)", boxShadow: "-6px 0 28px rgba(15,23,42,0.08)", overflowY: "auto", fontFamily: FONT }}>

        {/* Header */}
        <div style={{ position: "sticky", top: 0, zIndex: 1, background: "#fff", borderBottom: "1px solid rgba(20,37,68,0.04)", padding: "14px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span className="bd-stagger-1" style={{ fontSize: 14, fontWeight: 600, color: "#0f172a" }}>What's going on</span>
          <button data-testid="breakdown-close-btn" onClick={onClose}
            style={{ background: "none", border: "none", cursor: "pointer", width: 28, height: 28, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", color: "#94a3b8", transition: "background 100ms" }}
            onMouseEnter={e => { e.currentTarget.style.background = "rgba(20,37,68,0.04)"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "none"; }}>
            <X style={{ width: 16, height: 16 }} />
          </button>
        </div>

        <div style={{ padding: "20px 20px 32px" }}>

          {/* ═══ 1. TOP REASONS (max 3) ═══ */}
          {topReasons.length > 0 && (
            <section data-testid="breakdown-narrative" className="bd-stagger-1" style={{ marginBottom: 24 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {topReasons.map((line, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 13.5, color: "#1e293b", lineHeight: 1.5, fontWeight: 500 }}>
                    <span style={{ width: 4, height: 4, borderRadius: "50%", background: "#334155", flexShrink: 0, marginTop: 8 }} />
                    {line}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ═══ 2. PIPELINE RIGHT NOW (merged momentum) ═══ */}
          {hasMomentum && (
            <section data-testid="breakdown-momentum" className="bd-stagger-2" style={{ marginBottom: 24, padding: "12px 14px", borderRadius: 10, background: "rgba(15,23,42,0.02)", border: "1px solid rgba(20,37,68,0.04)" }}>
              <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "#94a3b8", marginBottom: 8 }}>
                Your pipeline right now
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {heatedUp.length > 0 && (
                  <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "#334155" }}>
                    <Flame style={{ width: 13, height: 13, color: "#d97706" }} />
                    <span><strong>{heatedUp.length}</strong> gaining momentum</span>
                  </div>
                )}
                {coolingOff.length > 0 && (
                  <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "#334155" }}>
                    <TrendingDown style={{ width: 13, height: 13, color: "#dc2626" }} />
                    <span><strong>{coolingOff.length}</strong> cooling off</span>
                  </div>
                )}
                {holdingSteady.length > 0 && (
                  <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "#334155" }}>
                    <Minus style={{ width: 13, height: 13, color: "#94a3b8" }} />
                    <span><strong>{holdingSteady.length}</strong> steady</span>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* ═══ 3. WHAT'S DRIVING YOUR PIPELINE (per-school, 2 reasons max) ═══ */}
          {sorted.length > 0 && (
            <section data-testid="breakdown-schools" className="bd-stagger-3" style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "#94a3b8", marginBottom: 6 }}>
                What's driving your pipeline
              </div>
              {visibleSchools.map((item, i) => (
                <SchoolExplanation key={item.programId} item={item}
                  style={showAllSchools && i >= 3 ? { animation: "bd-content-in 250ms ease both", animationDelay: `${(i - 3) * 60}ms` } : undefined} />
              ))}
              {hasMoreSchools && (
                <ShowMoreToggle
                  label={showAllSchools ? "Show less" : `+${sorted.length - 3} more`}
                  expanded={showAllSchools}
                  onToggle={() => setShowAllSchools(!showAllSchools)}
                />
              )}
            </section>
          )}

          {/* ═══ 4. INSIGHT (max 2, short) ═══ */}
          {aiInsights.length > 0 && (
            <section data-testid="breakdown-insights" className="bd-stagger-4" style={{ marginBottom: 22 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 8 }}>
                <Lightbulb style={{ width: 12, height: 12, color: "#94a3b8" }} />
                <span style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "#94a3b8" }}>Insight</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                {aiInsights.map((ins, i) => (
                  <div key={i} style={{
                    fontSize: 12.5, color: "#475569", lineHeight: 1.5,
                    padding: "8px 12px", borderRadius: 8,
                    background: "rgba(100,116,139,0.03)",
                    borderLeft: "2px solid rgba(100,116,139,0.10)",
                  }}>
                    {typeof ins === "string" ? ins : ins.text || ins.insight || ""}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ═══ 5. FRESHNESS ═══ */}
          {freshness && (
            <div data-testid="breakdown-freshness" className="bd-stagger-5" style={{
              display: "flex", alignItems: "center", gap: 5,
              fontSize: 11, color: "#cbd5e1",
              paddingTop: 12, borderTop: "1px solid rgba(20,37,68,0.03)",
            }}>
              <Clock style={{ width: 11, height: 11 }} />
              Updated {freshness}
            </div>
          )}
        </div>
      </div>

      <style>{`
        .bd-backdrop { animation: bd-fade-in 180ms ease both; }
        .bd-panel { animation: bd-slide-in 280ms cubic-bezier(0.16,1,0.3,1) both; }
        .bd-stagger-1 { animation: bd-content-in 250ms ease both; animation-delay: 80ms; }
        .bd-stagger-2 { animation: bd-content-in 250ms ease both; animation-delay: 140ms; }
        .bd-stagger-3 { animation: bd-content-in 250ms ease both; animation-delay: 200ms; }
        .bd-stagger-4 { animation: bd-content-in 250ms ease both; animation-delay: 260ms; }
        .bd-stagger-5 { animation: bd-content-in 250ms ease both; animation-delay: 320ms; }
        .bd-reveal { animation: bd-content-in 200ms ease both; }
        @keyframes bd-fade-in { from { opacity: 0; } to { opacity: 1; } }
        @keyframes bd-slide-in { from { transform: translateX(100%); } to { transform: translateX(0); } }
        @keyframes bd-content-in { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </>
  );
}

/* Build top 2-3 reasons from all available data */
function buildTopReasons(data, attentionItems, coolingOff, heatedUp) {
  const reasons = [];
  const items = attentionItems || [];
  const highItems = items.filter(a => a.tier === "high");

  // Most urgent school situation
  if (highItems.length > 0) {
    const worst = highItems[0];
    const prog = worst.program || {};
    const name = (prog.university_name || "").replace(/University of /g, "").replace(/ University/g, "");
    const days = prog.signals?.days_since_activity || prog.signals?.days_since_last_activity;
    if (days && days >= 5) {
      reasons.push(`${name} has gone quiet for ${days} days`);
    } else if (worst.hardTriggers?.overdue) {
      const d = Math.abs(worst.daysUntil || 0);
      reasons.push(`${name} has an overdue follow-up (${d}d)`);
    }
  }

  // Momentum signals
  if (heatedUp.length > 0) {
    reasons.push(`${heatedUp.length} school${heatedUp.length !== 1 ? "s are" : " is"} gaining momentum — your outreach is working`);
  }
  if (coolingOff.length > 0 && reasons.length < 3) {
    reasons.push(`${coolingOff.length} school${coolingOff.length !== 1 ? "s are" : " is"} cooling off — reach out before they go cold`);
  }

  // Recap headline if we still have room
  if (data?.recap_hero && reasons.length < 3) {
    reasons.push(data.recap_hero);
  }

  return reasons.slice(0, 3);
}

function formatFreshness(isoStr) {
  if (!isoStr) return null;
  try {
    const d = new Date(isoStr);
    const mins = Math.floor((Date.now() - d) / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  } catch { return null; }
}

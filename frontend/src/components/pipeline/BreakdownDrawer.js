import React, { useState } from "react";
import { X, Flame, TrendingDown, Minus, Lightbulb, Clock, ChevronDown } from "lucide-react";

const FONT = '-apple-system, "SF Pro Text", Inter, ui-sans-serif, system-ui, sans-serif';

/* ── Per-school explanation ── */
function SchoolExplanation({ item, style }) {
  const reasons = [];
  const ht = item.hardTriggers || {};
  const prog = item.program || {};
  const days = prog.signals?.days_since_activity || prog.signals?.days_since_last_activity;

  if (ht.overdue) { const d = Math.abs(item.daysUntil || 0); reasons.push(`Overdue follow-up (${d} day${d !== 1 ? "s" : ""})`); }
  if (days && days >= 5) reasons.push("No response after last outreach");
  if (ht.coachFlag) reasons.push("Coach flagged this");
  if (ht.dueSoon && !ht.overdue) reasons.push(item.daysUntil === 0 ? "Task due today" : `Task due in ${item.daysUntil} day${item.daysUntil !== 1 ? "s" : ""}`);
  if (reasons.length === 0 && item.tier === "medium") reasons.push("Needs a follow-up to maintain momentum");
  if (reasons.length === 0 && item.tier === "low") reasons.push("On track — no action needed right now");

  return (
    <div style={{ padding: "10px 0", borderBottom: "1px solid rgba(20,37,68,0.04)", ...style }}>
      <span style={{ fontSize: 13, fontWeight: 600, color: "#0f172a" }}>{prog.university_name || "Unknown"}</span>
      <div style={{ display: "flex", flexDirection: "column", gap: 3, marginTop: 5 }}>
        {reasons.slice(0, 3).map((r, i) => (
          <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 7, fontSize: 12.5, color: "#64748b", lineHeight: 1.5 }}>
            <span style={{ width: 3.5, height: 3.5, borderRadius: "50%", background: "#cbd5e1", flexShrink: 0, marginTop: 7 }} />
            {r}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Compressed momentum group with progressive reveal ── */
function MomentumGroup({ title, icon: Icon, iconColor, items }) {
  const [expanded, setExpanded] = useState(false);
  if (!items || items.length === 0) return null;
  const visible = expanded ? items : items.slice(0, 2);
  const hasMore = items.length > 2;

  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 6 }}>
        <Icon style={{ width: 12, height: 12, color: iconColor }} />
        <span style={{ fontSize: 12, fontWeight: 600, color: iconColor }}>{title}</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 3, paddingLeft: 2 }}>
        {visible.map((item, i) => {
          const name = item.school_name;
          const detail = compressDetail(item);
          const isRevealed = i >= 2;
          return (
            <div key={item.program_id || i} className={isRevealed ? "bd-reveal" : ""}
              style={{ fontSize: 12.5, color: "#475569", lineHeight: 1.4 }}>
              <span style={{ fontWeight: 500 }}>{name}</span>
              {detail && <span style={{ color: "#94a3b8" }}> — {detail}</span>}
            </div>
          );
        })}
      </div>
      {hasMore && !expanded && (
        <button onClick={() => setExpanded(true)}
          style={{ background: "none", border: "none", cursor: "pointer", padding: "4px 0 0 2px", fontSize: 11, fontWeight: 500, color: "#94a3b8", display: "flex", alignItems: "center", gap: 3, transition: "color 100ms" }}
          onMouseEnter={e => { e.currentTarget.style.color = "#64748b"; }}
          onMouseLeave={e => { e.currentTarget.style.color = "#94a3b8"; }}>
          +{items.length - 2} more
          <ChevronDown style={{ width: 10, height: 10 }} />
        </button>
      )}
    </div>
  );
}

function compressDetail(item) {
  const parts = [];
  if (item.what_changed) parts.push(item.what_changed.toLowerCase().replace("completed", "").trim());
  if (item.stage_label && !parts.length) parts.push(item.stage_label.toLowerCase());
  if (item.days_since_last) parts.push(`${item.days_since_last}d inactive`);
  return parts.filter(Boolean).join(", ") || null;
}

/* ── "Show more" toggle for schools ── */
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
  const aiInsights = (recapData?.ai_insights || []).slice(0, 3);
  const freshness = formatFreshness(recapData?.created_at);
  const hasMomentum = heatedUp.length > 0 || coolingOff.length > 0 || holdingSteady.length > 0;

  const sorted = [...(attentionItems || [])].sort((a, b) => {
    const order = { high: 0, medium: 1, low: 2 };
    return (order[a.tier] ?? 3) - (order[b.tier] ?? 3);
  });
  const visibleSchools = showAllSchools ? sorted : sorted.slice(0, 3);
  const hasMoreSchools = sorted.length > 3;

  const narrativeBullets = buildNarrative(recapData).slice(0, 3);

  return (
    <>
      <div data-testid="breakdown-backdrop" onClick={onClose}
        className="bd-backdrop"
        style={{ position: "fixed", inset: 0, zIndex: 998, background: "rgba(15,23,42,0.18)", backdropFilter: "blur(2px)" }} />

      <div data-testid="breakdown-drawer" className="bd-panel"
        style={{ position: "fixed", top: 0, right: 0, bottom: 0, width: "min(440px, 90vw)", zIndex: 999, background: "#fff", borderLeft: "1px solid rgba(20,37,68,0.04)", boxShadow: "-6px 0 28px rgba(15,23,42,0.08)", overflowY: "auto", fontFamily: FONT }}>

        {/* Header */}
        <div style={{ position: "sticky", top: 0, zIndex: 1, background: "#fff", borderBottom: "1px solid rgba(20,37,68,0.04)", padding: "14px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span className="bd-stagger-1" style={{ fontSize: 14, fontWeight: 600, color: "#0f172a" }}>Why this matters</span>
          <button data-testid="breakdown-close-btn" onClick={onClose}
            style={{ background: "none", border: "none", cursor: "pointer", width: 28, height: 28, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", color: "#94a3b8", transition: "background 100ms" }}
            onMouseEnter={e => { e.currentTarget.style.background = "rgba(20,37,68,0.04)"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "none"; }}>
            <X style={{ width: 16, height: 16 }} />
          </button>
        </div>

        <div style={{ padding: "20px 20px 32px" }}>

          {/* ═══ 1. NARRATIVE ═══ */}
          {narrativeBullets.length > 0 && (
            <section data-testid="breakdown-narrative" className="bd-stagger-1" style={{ marginBottom: 26 }}>
              <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "#64748b", marginBottom: 10 }}>
                Since your last update
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                {narrativeBullets.map((line, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 13, color: "#334155", lineHeight: 1.55 }}>
                    <span style={{ width: 4, height: 4, borderRadius: "50%", background: "#94a3b8", flexShrink: 0, marginTop: 8 }} />
                    {line}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ═══ 2. MOMENTUM ═══ */}
          {hasMomentum && (
            <section data-testid="breakdown-momentum" className="bd-stagger-2" style={{ marginBottom: 26 }}>
              <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "#94a3b8", marginBottom: 10 }}>
                Momentum
              </div>
              <MomentumGroup title="Gaining momentum" icon={Flame} iconColor="#d97706" items={heatedUp} />
              <MomentumGroup title="Cooling off" icon={TrendingDown} iconColor="#dc2626" items={coolingOff} />
              <MomentumGroup title="Holding steady" icon={Minus} iconColor="#94a3b8" items={holdingSteady} />
            </section>
          )}

          {/* ═══ 3. PER-SCHOOL ═══ */}
          {sorted.length > 0 && (
            <section data-testid="breakdown-schools" className="bd-stagger-3" style={{ marginBottom: 26 }}>
              <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "#94a3b8", marginBottom: 6 }}>
                Why each school is here
              </div>
              {visibleSchools.map((item, i) => (
                <SchoolExplanation key={item.programId} item={item}
                  style={showAllSchools && i >= 3 ? { animation: "bd-content-in 250ms ease both", animationDelay: `${(i - 3) * 60}ms` } : undefined} />
              ))}
              {hasMoreSchools && (
                <ShowMoreToggle
                  label={showAllSchools ? "Show less" : `Show ${sorted.length - 3} more school${sorted.length - 3 !== 1 ? "s" : ""}`}
                  expanded={showAllSchools}
                  onToggle={() => setShowAllSchools(!showAllSchools)}
                />
              )}
            </section>
          )}

          {/* ═══ 4. INSIGHTS ═══ */}
          {aiInsights.length > 0 && (
            <section data-testid="breakdown-insights" className="bd-stagger-4" style={{ marginBottom: 22 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 10 }}>
                <Lightbulb style={{ width: 12, height: 12, color: "#94a3b8" }} />
                <span style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "#94a3b8" }}>Insights</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {aiInsights.map((ins, i) => (
                  <div key={i} style={{
                    fontSize: 12.5, color: "#64748b", lineHeight: 1.55,
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
              Insights updated {freshness}
            </div>
          )}
        </div>
      </div>

      <style>{`
        /* Backdrop fade */
        .bd-backdrop { animation: bd-fade-in 180ms ease both; }

        /* Panel slide */
        .bd-panel { animation: bd-slide-in 280ms cubic-bezier(0.16,1,0.3,1) both; }

        /* Staged content reveal */
        .bd-stagger-1 { animation: bd-content-in 250ms ease both; animation-delay: 80ms; }
        .bd-stagger-2 { animation: bd-content-in 250ms ease both; animation-delay: 140ms; }
        .bd-stagger-3 { animation: bd-content-in 250ms ease both; animation-delay: 200ms; }
        .bd-stagger-4 { animation: bd-content-in 250ms ease both; animation-delay: 260ms; }
        .bd-stagger-5 { animation: bd-content-in 250ms ease both; animation-delay: 320ms; }

        /* Revealed items */
        .bd-reveal { animation: bd-content-in 200ms ease both; }

        @keyframes bd-fade-in {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes bd-slide-in {
          from { transform: translateX(100%); }
          to   { transform: translateX(0); }
        }
        @keyframes bd-content-in {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </>
  );
}

function buildNarrative(data) {
  if (!data) return [];
  const bullets = [];
  if (data.recap_hero) bullets.push(data.recap_hero);
  if (data.biggest_shift) bullets.push(data.biggest_shift);
  if (data.period_label) bullets.push(`Based on activity ${data.period_label.toLowerCase()}`);
  return bullets;
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

import React from "react";
import { AlertCircle, ChevronRight, Eye, Flame, Minus } from "lucide-react";
import UniversityLogo from "../UniversityLogo";

const FONT = '-apple-system, "SF Pro Text", Inter, ui-sans-serif, system-ui, sans-serif';

/* ── Tier config for YOUR NEXT MOVES cards ── */
const TIER_CONFIG = {
  top: {
    badge: "NEEDS YOUR ATTENTION NOW",
    badgeBg: "rgba(239,68,68,0.08)",
    badgeColor: "#dc2626",
    borderColor: "#ef4444",
    Icon: AlertCircle,
    iconBg: "rgba(239,68,68,0.08)",
    iconColor: "#ef4444",
  },
  secondary: {
    badge: "SECONDARY",
    badgeBg: "rgba(245,158,11,0.08)",
    badgeColor: "#d97706",
    borderColor: "#f59e0b",
    Icon: ChevronRight,
    iconBg: "rgba(245,158,11,0.08)",
    iconColor: "#f59e0b",
  },
  watch: {
    badge: "WATCH",
    badgeBg: "rgba(100,116,139,0.08)",
    badgeColor: "#64748b",
    borderColor: "#94a3b8",
    Icon: Eye,
    iconBg: "rgba(100,116,139,0.08)",
    iconColor: "#94a3b8",
  },
};

/* ── Single recap-driven move card ── */
function RecapMoveCard({ priority, navigate }) {
  const config = TIER_CONFIG[priority.rank] || TIER_CONFIG.watch;
  const { Icon } = config;

  return (
    <div
      data-testid={`next-move-card-${priority.program_id}`}
      onClick={() => navigate && navigate(`/pipeline/${priority.program_id}`)}
      style={{
        background: "#fff",
        border: "1px solid rgba(20,37,68,0.06)",
        borderLeft: `4px solid ${config.borderColor}`,
        borderRadius: 14,
        padding: "18px 20px",
        cursor: "pointer",
        transition: "transform 80ms ease, box-shadow 80ms ease",
      }}
      onMouseEnter={e => {
        e.currentTarget.style.transform = "translateY(-1px)";
        e.currentTarget.style.boxShadow = "0 6px 20px rgba(19,33,58,0.08)";
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = "";
        e.currentTarget.style.boxShadow = "none";
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
        {/* Icon */}
        <div style={{
          width: 36, height: 36, borderRadius: "50%",
          background: config.iconBg,
          display: "flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0, marginTop: 2,
        }}>
          <Icon style={{ width: 16, height: 16, color: config.iconColor }} />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Badge */}
          <span data-testid={`move-badge-${priority.rank}`} style={{
            fontSize: 10, fontWeight: 700, letterSpacing: "0.06em",
            textTransform: "uppercase",
            color: config.badgeColor,
            display: "inline-block", marginBottom: 6,
          }}>
            {config.badge}
          </span>

          {/* Action title */}
          <div data-testid={`move-action-${priority.program_id}`} style={{
            fontSize: 15, fontWeight: 600, color: "#0f172a",
            lineHeight: 1.4, marginBottom: 4,
          }}>
            {priority.action}
          </div>

          {/* Reason */}
          <div data-testid={`move-reason-${priority.program_id}`} style={{
            fontSize: 13, fontWeight: 400, color: "#64748b",
            lineHeight: 1.5,
          }}>
            {priority.reason?.startsWith("→") ? priority.reason : `→ ${priority.reason}`}
          </div>

          {/* Urgency note (top priority only) */}
          {priority.urgency_note && (
            <div data-testid="move-urgency-note" style={{
              fontSize: 12, fontWeight: 400, color: "#94a3b8",
              fontStyle: "italic", marginTop: 8,
            }}>
              {priority.urgency_note}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Traction item (Heated Up / Holding Steady rows) ── */
function TractionItem({ item, accentColor }) {
  return (
    <div style={{
      borderLeft: `3px solid ${accentColor}`,
      padding: "10px 14px",
      marginBottom: 2,
      borderRadius: "0 8px 8px 0",
      background: "rgba(255,255,255,0.6)",
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: accentColor }}>+</span>
          <span style={{ fontSize: 14, fontWeight: 600, color: "#0f172a" }}>
            {item.school_name}
          </span>
        </div>
        <span style={{
          fontSize: 11, fontWeight: 500, color: "#94a3b8",
          padding: "2px 8px", borderRadius: 6,
          background: "rgba(100,116,139,0.06)",
        }}>
          {item.stage_label}
        </span>
      </div>
      <div style={{ fontSize: 13, fontWeight: 400, color: "#64748b", marginTop: 4, paddingLeft: 22 }}>
        {item.action_guidance}
      </div>
    </div>
  );
}

/* ── Main PriorityBoard ── */
export default function PriorityBoard({ items, navigate, heroItemIds = [], recapData }) {
  const heroSet = new Set(heroItemIds);
  const priorities = (recapData?.priorities || []).filter(p => !heroSet.has(p.program_id));
  const hasPriorities = priorities.length > 0;

  /* Momentum data */
  const momentum = recapData?.momentum;
  const heatedUp = momentum?.heated_up || [];
  const holdingSteady = momentum?.holding_steady || [];
  const hasTraction = heatedUp.length > 0 || holdingSteady.length > 0;

  /* AI insights */
  const aiInsights = recapData?.ai_insights || [];

  /* All on track state */
  const allOnTrack = items?.every(i => i.tier === "low") && items?.length > 0;

  return (
    <div data-testid="priority-board" style={{ marginTop: 8, fontFamily: FONT }}>
      {allOnTrack && !hasPriorities && (
        <div style={{
          display: "flex", alignItems: "center", gap: 10,
          padding: "14px 18px", borderRadius: 12,
          background: "rgba(16,185,129,0.04)", border: "1px solid rgba(16,185,129,0.10)",
          marginBottom: 20,
        }} data-testid="all-on-track-banner">
          <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#10b981", flexShrink: 0 }} />
          <span style={{ fontSize: 14, fontWeight: 500, color: "#1e293b" }}>Everything is on track</span>
          <span style={{ fontSize: 13, fontWeight: 400, color: "#64748b" }}> — no programs need immediate attention</span>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 36 }}>

        {/* ═══ YOUR NEXT MOVES — AI-generated priorities ═══ */}
        {hasPriorities && (
          <div data-testid="next-moves-section">
            <div style={{
              fontSize: 12, fontWeight: 700, letterSpacing: "0.06em",
              textTransform: "uppercase", color: "#475569",
              marginBottom: 16, padding: "0 2px",
            }}>
              Your next moves
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {priorities.map((p) => (
                <RecapMoveCard key={p.program_id} priority={p} navigate={navigate} />
              ))}
            </div>
          </div>
        )}

        {/* ═══ WHERE YOU'RE GAINING TRACTION ═══ */}
        {hasTraction && (
          <div data-testid="traction-section">
            <div style={{
              fontSize: 12, fontWeight: 500, color: "#475569",
              marginBottom: 16, padding: "0 2px",
            }}>
              Where you're gaining traction
            </div>

            {heatedUp.length > 0 && (
              <div style={{ marginBottom: 18 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
                  <Flame style={{ width: 14, height: 14, color: "#f59e0b" }} />
                  <span data-testid="heated-up-label" style={{ fontSize: 13, fontWeight: 600, color: "#f59e0b" }}>
                    Heated Up
                  </span>
                  <span style={{ fontSize: 12, fontWeight: 400, color: "#94a3b8" }}>({heatedUp.length})</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {heatedUp.map((item, i) => (
                    <TractionItem key={item.program_id || i} item={item} accentColor="#f59e0b" />
                  ))}
                </div>
              </div>
            )}

            {holdingSteady.length > 0 && (
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
                  <Minus style={{ width: 14, height: 14, color: "#94a3b8" }} />
                  <span data-testid="holding-steady-label" style={{ fontSize: 13, fontWeight: 600, color: "#475569" }}>
                    Holding Steady
                  </span>
                  <span style={{ fontSize: 12, fontWeight: 400, color: "#94a3b8" }}>({holdingSteady.length})</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {holdingSteady.map((item, i) => (
                    <TractionItem key={item.program_id || i} item={item} accentColor="#94a3b8" />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ═══ WHAT'S DRIVING YOUR PIPELINE RIGHT NOW ═══ */}
        {aiInsights.length > 0 && (
          <div data-testid="ai-insights-section">
            <div style={{
              fontSize: 12, fontWeight: 500, color: "#475569",
              marginBottom: 12, padding: "0 2px",
              display: "flex", alignItems: "center", gap: 6,
            }}>
              <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#94a3b8" }} />
              What's driving your pipeline right now
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {aiInsights.map((ins, i) => (
                <div key={i} style={{
                  display: "flex", alignItems: "flex-start", gap: 10,
                  fontSize: 13, lineHeight: 1.55, color: "#64748b",
                  padding: "0 2px",
                }}>
                  <span style={{
                    width: 5, height: 5, borderRadius: "50%",
                    background: "#cbd5e1", flexShrink: 0, marginTop: 7,
                  }} />
                  {typeof ins === 'string' ? ins : ins.text || ins.insight || ''}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

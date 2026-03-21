import React, { useState, useCallback } from "react";
import axios from "axios";
import { toast } from "sonner";
import { ChevronRight, AlertCircle, Clock, ArrowRight } from "lucide-react";
import SwipeableCard from "./SwipeableCard";
import ParticleBurst from "../reinforcement/ParticleBurst";
import { triggerReinforcement, PARTICLE_COLORS } from "../../lib/reinforcement";
import { LogoBox } from "./pipeline-design";
import UniversityLogo from "../UniversityLogo";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const FONT = '-apple-system, "SF Pro Text", Inter, ui-sans-serif, system-ui, sans-serif';

/* ── Shared: Mini Journey Rail ── */
const STAGE_CONTEXT = {
  added: "Added — getting started",
  outreach: "Outreach — waiting for response",
  in_conversation: "Talking — momentum building",
  campus_visit: "Visit — relationship deepening",
  offer: "Offer — decision pending",
};

function MiniRail({ journeyRail }) {
  if (!journeyRail?.stages) return null;
  const order = ["added", "outreach", "in_conversation", "campus_visit", "offer"];
  const activeIdx = order.indexOf(journeyRail.active);
  const stageCtx = STAGE_CONTEXT[journeyRail.active] || null;

  return (
    <div>
      <div style={{ display: "flex", gap: 3, marginTop: 10 }}>
        {order.map((s, i) => (
          <div key={s} style={{
            flex: 1, height: 3, borderRadius: 3,
            background: i <= activeIdx
              ? (i === activeIdx ? "rgba(25,195,178,0.5)" : "#19c3b2")
              : "rgba(20,37,68,0.06)",
          }} />
        ))}
      </div>
      {stageCtx && (
        <div data-testid="stage-context" style={{ fontSize: 11, color: "#94a3b8", fontWeight: 400, marginTop: 4 }}>
          {stageCtx}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════
   HERO PRIORITY CARD (dark, inline — top of list)
   ═══════════════════════════════════════════════ */
function HeroPriorityCard({ item, navigate }) {
  const { primaryAction, timingLabel, program: prog } = item;
  const reason = item.reason || item.heroReason || timingLabel || "Needs your attention";

  return (
    <div
      data-testid={`hero-priority-card-${prog.program_id}`}
      onClick={() => navigate(`/pipeline/${prog.program_id}`)}
      style={{
        background: "linear-gradient(135deg, #0f1c35 0%, #152547 50%, #1a2d5a 100%)",
        borderRadius: 18, padding: "24px 24px", marginBottom: 24,
        position: "relative", overflow: "hidden", cursor: "pointer",
        boxShadow: "0 8px 28px rgba(15, 28, 53, 0.12)",
        transition: "transform 80ms ease, box-shadow 80ms ease",
      }}
      onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = "0 12px 36px rgba(15,28,53,0.18)"; }}
      onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = "0 8px 28px rgba(15,28,53,0.12)"; }}
    >
      <div style={{ position: "absolute", top: -30, right: -30, width: 120, height: 120, borderRadius: "50%", background: "radial-gradient(circle, rgba(239,68,68,0.06), transparent 65%)", pointerEvents: "none" }} />

      {/* Header */}
      <div style={{ position: "relative", zIndex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 38, height: 38, borderRadius: 10, background: "rgba(255,255,255,0.08)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, border: "1px solid rgba(255,255,255,0.06)", overflow: "hidden" }}>
            <UniversityLogo domain={prog.domain} name={prog.university_name} size={26} className="rounded" />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 17, fontWeight: 600, color: "rgba(255,255,255,0.95)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {prog.university_name}
            </div>
          </div>
        </div>
        {timingLabel && (
          <div style={{ marginTop: 8, marginLeft: 50 }}>
            <span data-testid="hero-timing-badge" style={{
              fontSize: 10, fontWeight: 500, padding: "3px 8px", borderRadius: 999,
              background: "rgba(239,68,68,0.15)", color: "#fca5a5",
            }}>{timingLabel}</span>
          </div>
        )}
      </div>

      <div style={{ position: "relative", zIndex: 1, marginTop: 10 }}>
        <MiniRail journeyRail={prog.journey_rail} />
      </div>

      <p data-testid={`hero-reason-${prog.program_id}`} style={{ fontSize: 14, fontWeight: 400, lineHeight: 1.5, color: "rgba(255,255,255,0.60)", margin: "14px 0 0", padding: 0, position: "relative", zIndex: 1 }}>
        {reason}
      </p>

      <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 14, position: "relative", zIndex: 1 }}>
        <span data-testid={`hero-action-${prog.program_id}`} style={{ flex: 1, fontSize: 15, fontWeight: 500, lineHeight: 1.4, color: "rgba(255,255,255,0.90)" }}>
          {primaryAction}
        </span>
        <button data-testid={`hero-cta-${prog.program_id}`} style={{
          fontSize: 13, fontWeight: 500, border: "none", cursor: "pointer",
          padding: "8px 16px", borderRadius: 10, flexShrink: 0,
          display: "flex", alignItems: "center", gap: 4,
          background: "rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.90)",
          backdropFilter: "blur(8px)",
        }}>
          View school <ArrowRight style={{ width: 12, height: 12 }} />
        </button>
      </div>

      <div data-testid="hero-context-line" style={{ fontSize: 11, fontWeight: 400, color: "rgba(255,255,255,0.28)", fontStyle: "italic", marginTop: 12, position: "relative", zIndex: 1 }}>
        This is your most important action right now
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   ACT NOW CARD (high priority — red accent)
   ═══════════════════════════════════════════════ */
function ActNowCard({ item, isHeroPriority }) {
  const { primaryAction, timingLabel, program: prog } = item;
  // For Act Now cards, prefer the actual reason over heroReason (which is for the hero card)
  const rawReason = item.reason || item.heroReason || timingLabel || "Needs your attention";
  const reason = rawReason.replace(/\s*[—–-]\s*also your recap[''']s top focus\.?/gi, "").replace(/also your recap[''']s top focus\.?/gi, "").trim();

  return (
    <div data-testid={`priority-card-${prog.program_id}`} style={{
      background: isHeroPriority ? "rgba(239,68,68,0.02)" : "#fff",
      border: isHeroPriority ? "1px solid rgba(239,68,68,0.10)" : "1px solid rgba(20,37,68,0.06)",
      borderRadius: 16,
      borderLeft: isHeroPriority ? "5px solid #ef4444" : "3px solid #ef4444",
      boxShadow: isHeroPriority ? "0 3px 10px rgba(239,68,68,0.07)" : "0 1px 3px rgba(19,33,58,0.03)",
      transition: "transform 80ms ease, box-shadow 80ms ease",
      cursor: "pointer",
    }}
    onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = isHeroPriority ? "0 6px 16px rgba(239,68,68,0.10)" : "0 4px 12px rgba(19,33,58,0.06)"; }}
    onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = isHeroPriority ? "0 3px 10px rgba(239,68,68,0.07)" : "0 1px 3px rgba(19,33,58,0.03)"; }}
    >
      <div style={{ padding: isHeroPriority ? "24px 26px" : "18px 20px" }}>
        {/* School row */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: isHeroPriority ? 36 : 32, height: isHeroPriority ? 36 : 32, borderRadius: 8, background: "#fafbfd",
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            border: "1px solid rgba(20,37,68,0.05)", overflow: "hidden",
          }}>
            <UniversityLogo domain={prog.domain} name={prog.university_name} size={isHeroPriority ? 26 : 22} className="rounded" />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: isHeroPriority ? 17 : 15, fontWeight: 600, color: "#13213a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {prog.university_name}
            </div>
          </div>
          {!isHeroPriority && timingLabel && (
            <span data-testid="timing-badge" style={{
              fontSize: 11, fontWeight: 500, padding: "3px 10px", borderRadius: 999,
              background: timingLabel.toLowerCase().includes("overdue") ? "rgba(239,68,68,0.08)" : "rgba(100,116,139,0.06)",
              color: timingLabel.toLowerCase().includes("overdue") ? "#dc2626" : "#64748b",
            }}>{timingLabel}</span>
          )}
          {!isHeroPriority && item.topAction?.category === 'coach_flag' && (
            <span data-testid="coach-flag-badge" style={{
              fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 999,
              background: "rgba(245,158,11,0.10)", color: "#d97706",
            }}>Coach flagged</span>
          )}
        </div>

        {/* Badges row for hero card */}
        {isHeroPriority && (
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
            <span data-testid="top-priority-tag" style={{
              fontSize: 10, fontWeight: 600, padding: "3px 8px", borderRadius: 999,
              background: "rgba(239,68,68,0.08)", color: "#dc2626",
              letterSpacing: "0.02em",
            }}>Needs attention now</span>
            {timingLabel && (
              <span data-testid="timing-badge" style={{
                fontSize: 10, fontWeight: 500, padding: "3px 8px", borderRadius: 999,
                background: timingLabel.toLowerCase().includes("overdue") ? "rgba(239,68,68,0.08)" : "rgba(100,116,139,0.06)",
                color: timingLabel.toLowerCase().includes("overdue") ? "#dc2626" : "#64748b",
              }}>{timingLabel}</span>
            )}
            {item.topAction?.category === 'coach_flag' && (
              <span data-testid="coach-flag-badge" style={{
                fontSize: 10, fontWeight: 600, padding: "3px 8px", borderRadius: 999,
                background: "rgba(245,158,11,0.10)", color: "#d97706",
                letterSpacing: "0.02em",
              }}>Coach flagged</span>
            )}
          </div>
        )}

        <MiniRail journeyRail={prog.journey_rail} />

        {/* Reason */}
        <p data-testid={`priority-reason-${prog.program_id}`} style={{
          fontSize: 13, fontWeight: 400, lineHeight: 1.5, color: "#64748b",
          margin: "12px 0 0", padding: 0,
        }}>{reason}</p>

        {/* Action */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 12 }}>
          <span data-testid={`priority-action-${prog.program_id}`} style={{
            flex: 1, fontSize: isHeroPriority ? 15 : 14, fontWeight: 500, lineHeight: 1.4, color: "#1e293b",
          }}>{primaryAction}</span>
          <button data-testid={`cta-btn-${prog.program_id}`} style={{
            fontSize: 13, fontWeight: 500, border: "none", cursor: "pointer",
            padding: "8px 14px", borderRadius: 10, flexShrink: 0,
            display: "flex", alignItems: "center", gap: 4,
            background: "#13213a", color: "#fff",
          }}>
            View school <ArrowRight style={{ width: 12, height: 12 }} />
          </button>
        </div>

        {/* Context line for top priority */}
        {isHeroPriority && (
          <div data-testid="primary-context-line" style={{
            fontSize: 11, fontWeight: 400, color: "#94a3b8", fontStyle: "italic",
            marginTop: 10, paddingTop: 10, borderTop: "1px solid rgba(20,37,68,0.04)",
          }}>
            This is your most important action right now
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   KEEP MOMENTUM CARD (medium — ranked accent bar)
   ═══════════════════════════════════════════════ */
function MomentumCard({ item, rank }) {
  const { primaryAction, timingLabel, program: prog } = item;
  const rawReason = item.reason || item.heroReason || timingLabel || "Maintain engagement";
  const reason = rawReason.replace(/\s*[—–-]\s*also your recap[''']s top focus\.?/gi, "").replace(/also your recap[''']s top focus\.?/gi, "").trim();
  // Accent bar color intensity based on rank (0 = strongest)
  const accentOpacity = rank === 0 ? 1 : rank === 1 ? 0.6 : 0.4;
  const rankLabel = rank === 0 ? "Next best move" : null;
  // Momentum label
  const momentumText = item.momentum === 'building' ? "Building momentum \u2014 stay active"
    : item.momentum === 'cooling' ? "Momentum cooling \u2014 re-engage"
    : "Steady momentum";

  return (
    <div data-testid={`priority-card-${prog.program_id}`} style={{
      background: "rgba(255,255,255,0.95)",
      border: "1px solid rgba(20,37,68,0.05)",
      borderRadius: 14,
      borderLeft: `3px solid rgba(245,158,11,${accentOpacity})`,
      boxShadow: "0 1px 2px rgba(19,33,58,0.02)",
      transition: "transform 120ms ease, box-shadow 120ms ease",
      cursor: "pointer",
    }}
    onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 6px 16px rgba(19,33,58,0.07)"; }}
    onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = "0 1px 2px rgba(19,33,58,0.02)"; }}
    >
      <div style={{ padding: "16px 18px" }}>
        {/* School row */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 30, height: 30, borderRadius: 7, background: "#fafbfd",
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            border: "1px solid rgba(20,37,68,0.04)", overflow: "hidden",
          }}>
            <UniversityLogo domain={prog.domain} name={prog.university_name} size={20} className="rounded" />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: "#13213a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {prog.university_name}
            </div>
          </div>
          <div style={{ display: "flex", gap: 5, alignItems: "center", flexShrink: 0 }}>
            {rankLabel && (
              <span style={{
                fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 999,
                background: "rgba(245,158,11,0.08)", color: "#b45309",
                letterSpacing: "0.02em",
              }}>{rankLabel}</span>
            )}
            {timingLabel && (
              <span data-testid="timing-badge" style={{
                fontSize: 11, fontWeight: 500, padding: "3px 10px", borderRadius: 999,
                background: "rgba(100,116,139,0.05)", color: "#64748b",
              }}>{timingLabel}</span>
            )}
          </div>
        </div>

        {/* One-line: stage + momentum + next step */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10, fontSize: 12, color: "#94a3b8", fontWeight: 400 }}>
          <MiniRailInline journeyRail={prog.journey_rail} />
          <span style={{ color: "#cbd5e1" }}>{"\u00b7"}</span>
          <span>{momentumText}</span>
        </div>

        {/* Action row — secondary button, more visible on hover */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 12 }}>
          <span data-testid={`priority-action-${prog.program_id}`} style={{
            flex: 1, fontSize: 13, fontWeight: 500, lineHeight: 1.4, color: "#334155",
          }}>{primaryAction}</span>
          <button data-testid={`cta-btn-${prog.program_id}`} className="medium-cta-btn" style={{
            fontSize: 12, fontWeight: 500, border: "1px solid rgba(20,37,68,0.08)", cursor: "pointer",
            padding: "6px 12px", borderRadius: 8, flexShrink: 0,
            display: "flex", alignItems: "center", gap: 4,
            background: "transparent", color: "#64748b",
            transition: "all 120ms ease",
          }}
          onMouseEnter={e => { e.currentTarget.style.background = "#13213a"; e.currentTarget.style.color = "#fff"; e.currentTarget.style.borderColor = "#13213a"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#64748b"; e.currentTarget.style.borderColor = "rgba(20,37,68,0.08)"; }}
          >
            View <ArrowRight style={{ width: 11, height: 11 }} />
          </button>
        </div>
      </div>
    </div>
  );
}

/* Inline mini rail for medium cards — just stage name */
function MiniRailInline({ journeyRail }) {
  const stageName = journeyRail?.active || "added";
  const label = { added: "Added", outreach: "Outreach", in_conversation: "Talking", campus_visit: "Visit", offer: "Offer" }[stageName] || stageName;
  return <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
    <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#f59e0b" }} />
    {label}
  </span>;
}

/* ═══════════════════════════════════════════════
   MONITOR ROW (low priority — passive, minimal)
   ═══════════════════════════════════════════════ */
function MonitorRow({ item, navigate }) {
  const { program: prog } = item;
  const stageName = prog.journey_rail?.active || "added";
  const stageLabel = { added: "Added", outreach: "Outreach", in_conversation: "Talking", campus_visit: "Visit", offer: "Offer" }[stageName] || stageName;

  return (
    <div
      onClick={() => navigate(`/pipeline/${prog.program_id}`)}
      data-testid={`priority-card-${prog.program_id}`}
      style={{
        display: "flex", alignItems: "center", gap: 10,
        padding: "8px 12px", borderRadius: 8,
        background: "transparent",
        border: "1px solid rgba(20,37,68,0.03)",
        marginBottom: 2,
        transition: "background 80ms ease", cursor: "pointer",
      }}
      onMouseEnter={e => { e.currentTarget.style.background = "rgba(248,250,252,0.8)"; }}
      onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
    >
      <div style={{
        width: 24, height: 24, borderRadius: 6, background: "#fafbfd",
        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
        border: "1px solid rgba(20,37,68,0.03)",
      }}>
        <UniversityLogo domain={prog.domain} name={prog.university_name} size={16} className="rounded-sm" />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: "#94a3b8", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {prog.university_name}
        </div>
        <div style={{ fontSize: 11, color: "#cbd5e1", fontWeight: 400, display: "flex", alignItems: "center", gap: 4, marginTop: 1 }}>
          <span style={{ width: 4, height: 4, borderRadius: "50%", background: "#10b981" }} />
          No action needed · {stageLabel}
        </div>
      </div>
      <span style={{ fontSize: 11, fontWeight: 400, color: "#cbd5e1", flexShrink: 0, textDecoration: "underline", textDecorationColor: "rgba(203,213,225,0.4)", textUnderlineOffset: 2 }}>View</span>
    </div>
  );
}

/* ── Swipeable wrapper with reinforcement ── */
function SwipePriorityCard({ item, navigate, section, heroSet, rank }) {
  const prog = item.program;
  const programId = prog?.program_id;
  const [burstActive, setBurstActive] = useState(false);
  const [burstColor, setBurstColor] = useState(PARTICLE_COLORS.neutral);

  const fireReinforcement = useCallback(() => {
    const isActualHero = heroSet.has(programId);
    const isHigh = item.attentionLevel === "high";
    const isRecapTop = item.recapRank === "top";
    const ctx = {
      type: "taskComplete",
      isHeroPriority: isActualHero,
      heroReason: isActualHero ? (item.heroReason || item.primaryAction) : "",
      priorityRank: isActualHero ? 1 : 99,
      attentionBefore: item.attentionLevel,
      attentionAfter: "low",
      daysSinceLastActivity: prog?.signals?.days_since_last_activity || 0,
      stageBefore: prog?.journey_rail?.active || "added",
      stageAfter: prog?.journey_rail?.active || "added",
      schoolName: prog?.university_name || "",
      recapRank: item.recapRank || null,
      prioritySource: item.prioritySource || "live",
    };
    const color = isActualHero && isHigh
      ? PARTICLE_COLORS.riskResolved
      : isActualHero && isRecapTop
        ? PARTICLE_COLORS.highImpact
        : item.timingLabel?.toLowerCase().includes("overdue")
          ? PARTICLE_COLORS.riskResolved
          : PARTICLE_COLORS.momentum;
    setBurstColor(color);
    setBurstActive(true);
    triggerReinforcement(ctx);
  }, [item, prog, programId, heroSet]);

  const handleAction = useCallback(() => {
    fireReinforcement();
    setTimeout(() => { if (programId) navigate(`/pipeline/${programId}`); }, 400);
  }, [programId, navigate, fireReinforcement]);

  const handleSnooze = useCallback(async (days) => {
    if (!programId) return;
    const snoozeDate = new Date();
    snoozeDate.setDate(snoozeDate.getDate() + days);
    const label = days === 1 ? "tomorrow" : days === 3 ? "in 3 days" : "next week";
    try {
      await axios.put(`${API}/athlete/programs/${programId}`, { snoozed_until: snoozeDate.toISOString() });
      toast.success(`Snoozed to ${label}`);
    } catch { toast.error("Couldn't snooze — try again"); }
  }, [programId]);

  const handleTap = useCallback(() => {
    if (programId) navigate(`/pipeline/${programId}`);
  }, [programId, navigate]);

  const handleBurstComplete = useCallback(() => setBurstActive(false), []);

  if (section === "act-now") {
    return (
      <SwipeableCard onAction={handleAction} onSnooze={handleSnooze} actionLabel="View school" programId={programId}>
        <ParticleBurst active={burstActive} color={burstColor} onComplete={handleBurstComplete}>
          <div onClick={handleTap}><ActNowCard item={item} isHeroPriority={heroSet.has(programId)} /></div>
        </ParticleBurst>
      </SwipeableCard>
    );
  }
  if (section === "momentum") {
    return (
      <SwipeableCard onAction={handleAction} onSnooze={handleSnooze} actionLabel="View school" programId={programId}>
        <ParticleBurst active={burstActive} color={burstColor} onComplete={handleBurstComplete}>
          <div onClick={handleTap}><MomentumCard item={item} rank={rank} /></div>
        </ParticleBurst>
      </SwipeableCard>
    );
  }
  return (
    <div onClick={() => { if (programId) navigate(`/pipeline/${programId}`); }}>
      <MonitorRow item={item} navigate={navigate} />
    </div>
  );
}

/* ── Section header ── */
function SectionLabel({ label, count, color }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12, padding: "0 2px" }}>
      <span style={{ width: 8, height: 8, borderRadius: "50%", background: color, flexShrink: 0 }} />
      <span style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase", color: "#475569" }}>{label}</span>
      <span style={{ fontSize: 12, fontWeight: 400, color: "#94a3b8" }}>({count})</span>
    </div>
  );
}

export default function PriorityBoard({ items, navigate, heroItemIds = [], recapData }) {
  const heroSet = new Set(heroItemIds);
  const high = items.filter(i => i.tier === "high" && !heroSet.has(i.programId));
  const medium = items.filter(i => i.tier === "medium" && !heroSet.has(i.programId));
  const low = items.filter(i => i.tier === "low");
  const allOnTrack = items.every(i => i.tier === "low") && low.length > 0;
  const [monitorCollapsed, setMonitorCollapsed] = useState(low.length > 4);

  /* AI layer data */
  const momentum = recapData?.momentum;
  const heatedUp = momentum?.heated_up || [];
  const coolingOff = momentum?.cooling_off || [];
  const holdingSteady = momentum?.holding_steady || [];
  const hasAIData = heatedUp.length > 0 || coolingOff.length > 0 || holdingSteady.length > 0;
  const aiInsights = recapData?.ai_insights || recapData?.insights || [];
  const recapUpdatedAt = recapData?.created_at || recapData?.updated_at;

  return (
    <div data-testid="priority-board" style={{ marginTop: 8, fontFamily: FONT }}>

      {allOnTrack && (
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
        {/* ═══ [3] NEEDS ATTENTION NOW (high) ═══ */}
        {high.length > 0 && (
          <div data-testid="priority-section-attention">
            <SectionLabel label="Needs attention now" count={high.length} color="#ef4444" />
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {high.map((item) => <SwipePriorityCard key={item.programId} item={item} navigate={navigate} section="act-now" heroSet={heroSet} />)}
            </div>
          </div>
        )}

        {/* ═══ [4] KEEP THINGS MOVING (medium) ═══ */}
        {medium.length > 0 && (
          <div data-testid="priority-section-coming-up">
            <SectionLabel label="Keep things moving" count={medium.length} color="#f59e0b" />
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {medium.map((item, i) => <SwipePriorityCard key={item.programId} item={item} navigate={navigate} section="momentum" heroSet={heroSet} rank={i} />)}
            </div>
          </div>
        )}

        {/* ═══ [5] JUST KEEP AN EYE (low) ═══ */}
        {low.length > 0 && (
          <div data-testid="priority-section-on-track">
            <div
              onClick={() => setMonitorCollapsed(c => !c)}
              style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", padding: "0 2px", marginBottom: monitorCollapsed ? 0 : 8 }}
              data-testid="on-track-header"
            >
              <ChevronRight style={{
                width: 13, height: 13, color: "#10b981",
                transition: "transform 200ms",
                transform: monitorCollapsed ? "none" : "rotate(90deg)", flexShrink: 0,
              }} />
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#10b981", flexShrink: 0, opacity: 0.6 }} />
              <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase", color: "#94a3b8" }}>Just keep an eye</span>
              <span style={{ fontSize: 11, fontWeight: 400, color: "#cbd5e1" }}>({low.length})</span>
            </div>
            {!monitorCollapsed && (
              <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                {low.map((item) => <SwipePriorityCard key={item.programId} item={item} navigate={navigate} section="monitor" heroSet={heroSet} />)}
              </div>
            )}
          </div>
        )}

        {/* ═══ [6] WHAT CHANGED RECENTLY (AI layer) ═══ */}
        {hasAIData && (
          <div data-testid="what-changed-section" style={{
            background: "#fafbfd", borderRadius: 16, padding: "24px 24px 20px",
            border: "1px solid rgba(20,37,68,0.04)",
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#8b5cf6", flexShrink: 0 }} />
                <span style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase", color: "#475569" }}>What changed recently</span>
              </div>
              {recapUpdatedAt && (
                <span data-testid="ai-freshness" style={{ fontSize: 11, fontWeight: 400, color: "#cbd5e1" }}>
                  Insights updated {formatTimeAgo(recapUpdatedAt)}
                </span>
              )}
            </div>

            {/* Heated up */}
            {heatedUp.length > 0 && (
              <MomentumGroup label="Gaining momentum" color="#f59e0b" icon={"\u2191"} items={heatedUp} />
            )}

            {/* Cooling off */}
            {coolingOff.length > 0 && (
              <MomentumGroup label="Cooling off" color="#ef4444" icon={"\u2193"} items={coolingOff} />
            )}

            {/* Holding steady */}
            {holdingSteady.length > 0 && (
              <MomentumGroup label="Holding steady" color="#10b981" icon={"\u2014"} items={holdingSteady} />
            )}
          </div>
        )}

        {/* ═══ [7] AI COACHING INSIGHTS ═══ */}
        {aiInsights.length > 0 && (
          <div data-testid="ai-insights-section" style={{
            background: "#fafbfd", borderRadius: 16, padding: "24px 24px 20px",
            border: "1px solid rgba(20,37,68,0.04)",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#3b82f6", flexShrink: 0 }} />
              <span style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase", color: "#475569" }}>Coaching insights</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {aiInsights.slice(0, 5).map((ins, i) => (
                <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10, fontSize: 13, lineHeight: 1.55, color: "#475569" }}>
                  <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#3b82f6", flexShrink: 0, marginTop: 7, opacity: 0.5 }} />
                  {typeof ins === 'string' ? ins : ins.text || ins.insight || ''}
                </div>
              ))}
            </div>
            {recapUpdatedAt && (
              <div style={{ marginTop: 14, fontSize: 11, color: "#cbd5e1" }}>
                Based on your latest recap {"\u00b7"} updated {formatTimeAgo(recapUpdatedAt)}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* Momentum group — for "What changed recently" section */
function MomentumGroup({ label, color, icon, items }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color }}>{icon}</span>
        <span style={{ fontSize: 12, fontWeight: 600, color, letterSpacing: "0.01em" }}>{label}</span>
      </div>
      {items.map((item, i) => (
        <div key={i} style={{
          display: "flex", alignItems: "flex-start", gap: 8,
          padding: "6px 0", fontSize: 13, lineHeight: 1.5, color: "#475569",
        }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: "#0f172a", minWidth: 0 }}>
            {item.university_name || item.school_name || 'School'}
          </span>
          {(item.what_changed || item.reason) && (
            <>
              <span style={{ color: "#cbd5e1" }}>{"\u2014"}</span>
              <span style={{ color: "#64748b" }}>{item.what_changed || item.reason}</span>
            </>
          )}
        </div>
      ))}
    </div>
  );
}

/* Format relative time */
function formatTimeAgo(dateStr) {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now - d;
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  } catch { return ""; }
}

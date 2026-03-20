import React, { useState, useCallback } from "react";
import axios from "axios";
import { toast } from "sonner";
import { ChevronRight, AlertCircle, Clock, Mail, ArrowRight } from "lucide-react";
import SwipeableCard from "./SwipeableCard";
import ParticleBurst from "../reinforcement/ParticleBurst";
import { triggerReinforcement, PARTICLE_COLORS } from "../../lib/reinforcement";
import {
  LogoBox, OwnerTag, PipelineRowStyles, shortenName,
  STATUS, ROW_GAP, DIVIDER,
} from "./pipeline-design";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

/* ── Mini Journey Rail ── */
function MiniRail({ journeyRail }) {
  if (!journeyRail?.stages) return null;
  const stages = journeyRail.stages;
  const order = ["added", "outreach", "in_conversation", "campus_visit", "offer"];
  const activeIdx = order.indexOf(journeyRail.active);

  return (
    <div style={{ display: "flex", gap: 2, marginTop: 6 }}>
      {order.map((s, i) => (
        <div key={s} style={{
          flex: 1, height: 3, borderRadius: 2,
          background: i <= activeIdx
            ? (i === activeIdx ? "rgba(13,148,136,0.45)" : "#0d9488")
            : "var(--cm-surface-2, #f1f5f9)",
        }} />
      ))}
    </div>
  );
}

/* ── Timing Badge (replaces stage pill in top-right) ── */
function TimingBadge({ timingLabel, attentionLevel }) {
  if (!timingLabel) return null;
  const isOverdue = timingLabel.toLowerCase().includes("overdue");
  const isDueToday = timingLabel.toLowerCase().includes("today");
  const bg = isOverdue ? "rgba(239,68,68,0.08)" : isDueToday ? "rgba(245,158,11,0.08)" : "rgba(100,116,139,0.08)";
  const color = isOverdue ? "#dc2626" : isDueToday ? "#b45309" : "#64748b";

  return (
    <span data-testid="timing-badge" style={{
      fontSize: 9, fontWeight: 700, letterSpacing: "0.03em",
      padding: "2px 7px", borderRadius: 5, textTransform: "uppercase",
      flexShrink: 0, background: bg, color,
    }}>{timingLabel}</span>
  );
}

/* ── School Meta Line ── */
function SchoolMeta({ program }) {
  const parts = [];
  if (program.division) parts.push(program.division);
  if (program.conference) parts.push(program.conference);
  if (!parts.length) return null;
  return (
    <div style={{ fontSize: 10, color: "var(--cm-text-3, #94a3b8)", fontWeight: 500, display: "flex", alignItems: "center", gap: 5, marginTop: 1 }}>
      {parts.join(" · ")}
    </div>
  );
}

/* ═══════════════════════════════════════════════
   HIGH-PRIORITY CARD
   ═══════════════════════════════════════════════ */
function HighCard({ item }) {
  const { primaryAction, timingLabel, ctaLabel, program: prog } = item;

  return (
    <div data-testid={`priority-card-${prog.program_id}`} style={{
      background: "var(--cm-surface, white)",
      border: "1px solid rgba(239,68,68,0.15)",
      borderRadius: 14, overflow: "hidden",
      transition: "box-shadow 200ms, border-color 200ms",
      cursor: "pointer", position: "relative",
    }}
    onMouseEnter={e => { e.currentTarget.style.boxShadow = "0 2px 12px rgba(15,23,42,0.06)"; e.currentTarget.style.borderColor = "#fca5a5"; }}
    onMouseLeave={e => { e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.borderColor = "rgba(239,68,68,0.15)"; }}
    >
      {/* Left accent */}
      <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 3, borderRadius: "14px 0 0 14px", background: "#ef4444" }} />

      <div style={{ padding: "14px 16px 10px" }}>
        {/* Top: logo + school + timing */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10, background: "var(--cm-surface-2, #f1f5f9)",
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            border: "1px solid rgba(0,0,0,0.04)", overflow: "hidden",
          }}>
            <LogoBox domain={prog.domain} name={prog.university_name} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--cm-text, #0f172a)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {prog.university_name}
            </div>
            <SchoolMeta program={prog} />
          </div>
          <TimingBadge timingLabel={timingLabel} attentionLevel="high" />
        </div>

        <MiniRail journeyRail={prog.journey_rail} />

        {/* Action row */}
        <div style={{
          display: "flex", alignItems: "center", gap: 8,
          padding: "8px 12px", margin: "10px -16px -10px",
          borderTop: "1px solid rgba(226,232,240,0.5)",
          background: "rgba(248,250,252,0.6)",
          borderRadius: "0 0 14px 14px",
        }}>
          <div style={{
            width: 18, height: 18, borderRadius: 5, flexShrink: 0,
            display: "flex", alignItems: "center", justifyContent: "center",
            background: "rgba(239,68,68,0.06)", color: "#ef4444",
          }}>
            <AlertCircle style={{ width: 10, height: 10 }} />
          </div>
          <span data-testid={`priority-action-${prog.program_id}`} style={{
            flex: 1, fontSize: 12, fontWeight: 600, lineHeight: 1.35,
            color: "var(--cm-text-2, #475569)",
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>{primaryAction}</span>
          <button data-testid={`cta-btn-${prog.program_id}`} style={{
            fontSize: 11, fontWeight: 700, border: "none", cursor: "pointer",
            padding: "5px 10px", borderRadius: 8, flexShrink: 0,
            display: "flex", alignItems: "center", gap: 4,
            background: "rgba(239,68,68,0.06)", color: "#dc2626",
          }}>
            {ctaLabel || "Take Action"} <ArrowRight style={{ width: 12, height: 12 }} />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   MEDIUM-PRIORITY CARD (Coming Up)
   ═══════════════════════════════════════════════ */
function MedCard({ item }) {
  const { primaryAction, timingLabel, ctaLabel, program: prog } = item;

  return (
    <div data-testid={`priority-card-${prog.program_id}`} style={{
      background: "var(--cm-surface, white)",
      border: "1px solid var(--cm-border, #e2e8f0)",
      borderRadius: 14, overflow: "hidden",
      transition: "box-shadow 200ms, border-color 200ms",
      cursor: "pointer",
    }}
    onMouseEnter={e => { e.currentTarget.style.boxShadow = "0 2px 12px rgba(15,23,42,0.06)"; e.currentTarget.style.borderColor = "#cbd5e1"; }}
    onMouseLeave={e => { e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.borderColor = "var(--cm-border, #e2e8f0)"; }}
    >
      <div style={{ padding: "14px 16px 10px" }}>
        {/* Top: logo + school + timing */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10, background: "var(--cm-surface-2, #f1f5f9)",
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            border: "1px solid rgba(0,0,0,0.04)", overflow: "hidden",
          }}>
            <LogoBox domain={prog.domain} name={prog.university_name} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--cm-text, #0f172a)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {prog.university_name}
            </div>
            <SchoolMeta program={prog} />
          </div>
          <TimingBadge timingLabel={timingLabel} attentionLevel="medium" />
        </div>

        <MiniRail journeyRail={prog.journey_rail} />

        {/* Action row */}
        <div style={{
          display: "flex", alignItems: "center", gap: 8,
          padding: "8px 12px", margin: "10px -16px -10px",
          borderTop: "1px solid rgba(226,232,240,0.5)",
          background: "rgba(248,250,252,0.6)",
          borderRadius: "0 0 14px 14px",
        }}>
          <div style={{
            width: 18, height: 18, borderRadius: 5, flexShrink: 0,
            display: "flex", alignItems: "center", justifyContent: "center",
            background: "rgba(245,158,11,0.06)", color: "#f59e0b",
          }}>
            <Clock style={{ width: 10, height: 10 }} />
          </div>
          <span data-testid={`priority-action-${prog.program_id}`} style={{
            flex: 1, fontSize: 12, fontWeight: 600, lineHeight: 1.35,
            color: "var(--cm-text-2, #475569)",
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>{primaryAction}</span>
          <button data-testid={`cta-btn-${prog.program_id}`} style={{
            fontSize: 11, fontWeight: 700, border: "none", cursor: "pointer",
            padding: "5px 10px", borderRadius: 8, flexShrink: 0,
            display: "flex", alignItems: "center", gap: 4,
            background: "rgba(13,148,136,0.06)", color: "#0d9488",
          }}>
            {ctaLabel || "View School"} <ArrowRight style={{ width: 12, height: 12 }} />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   LOW-PRIORITY ROW (On Track — compact)
   ═══════════════════════════════════════════════ */
function LowRow({ item, navigate }) {
  const { program: prog } = item;
  const stageName = prog.journey_rail?.active || "added";
  const stageLabel = { added: "Just added", outreach: "Outreach", in_conversation: "Talking", campus_visit: "Visit", offer: "Offer" }[stageName] || stageName;

  return (
    <div
      onClick={() => navigate(`/pipeline/${prog.program_id}`)}
      data-testid={`priority-card-${prog.program_id}`}
      style={{
        display: "flex", alignItems: "center", gap: 10,
        padding: "10px 12px", borderRadius: 10,
        transition: "background 150ms", cursor: "pointer",
      }}
      onMouseEnter={e => { e.currentTarget.style.background = "rgba(241,245,249,0.65)"; }}
      onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
    >
      <div style={{
        width: 28, height: 28, borderRadius: 8, background: "var(--cm-surface-2, #f1f5f9)",
        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
        border: "1px solid rgba(0,0,0,0.03)",
      }}>
        <LogoBox domain={prog.domain} name={prog.university_name} muted />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: "var(--cm-text-2, #475569)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {prog.university_name}
        </div>
        <div style={{ fontSize: 10, color: "var(--cm-text-3, #94a3b8)", fontWeight: 500, display: "flex", alignItems: "center", gap: 4, marginTop: 1 }}>
          <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#10b981" }} />
          On track · {stageLabel}
        </div>
      </div>
      <span style={{ fontSize: 10, fontWeight: 600, color: "var(--cm-text-3, #94a3b8)", flexShrink: 0 }}>View →</span>
    </div>
  );
}

/* ── Swipeable wrapper with reinforcement ── */
function SwipePriorityCard({ item, navigate, section, heroProgramId }) {
  const prog = item.program;
  const programId = prog?.program_id;
  const [burstActive, setBurstActive] = useState(false);
  const [burstColor, setBurstColor] = useState(PARTICLE_COLORS.neutral);

  const fireReinforcement = useCallback(() => {
    const isActualHero = programId === heroProgramId;
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
  }, [item, prog, programId, heroProgramId]);

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

  if (section === "attention") {
    return (
      <SwipeableCard onAction={handleAction} onSnooze={handleSnooze} actionLabel={item.ctaLabel || "Take Action"} programId={programId}>
        <ParticleBurst active={burstActive} color={burstColor} onComplete={handleBurstComplete}>
          <div onClick={handleTap}><HighCard item={item} /></div>
        </ParticleBurst>
      </SwipeableCard>
    );
  }
  if (section === "coming-up") {
    return (
      <SwipeableCard onAction={handleAction} onSnooze={handleSnooze} actionLabel={item.ctaLabel || "View School"} programId={programId}>
        <ParticleBurst active={burstActive} color={burstColor} onComplete={handleBurstComplete}>
          <div onClick={handleTap}><MedCard item={item} /></div>
        </ParticleBurst>
      </SwipeableCard>
    );
  }
  return (
    <div onClick={() => { if (programId) navigate(`/pipeline/${programId}`); }}>
      <LowRow item={item} navigate={navigate} />
    </div>
  );
}

/* ── Section header ── */
function SectionHeader({ label, count, color, icon: Icon, iconBg }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, padding: "0 2px" }}>
      {Icon && (
        <div style={{
          width: 20, height: 20, borderRadius: 6,
          display: "flex", alignItems: "center", justifyContent: "center",
          background: iconBg, color,
        }}>
          <Icon style={{ width: 10, height: 10 }} />
        </div>
      )}
      <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase", color: "var(--cm-text-2, #475569)" }}>{label}</span>
      <span style={{ fontSize: 10, fontWeight: 500, color: "var(--cm-text-4, #cbd5e1)" }}>({count})</span>
    </div>
  );
}

export default function PriorityBoard({ items, navigate, heroProgramId }) {
  const high = items.filter(i => i.attentionLevel === "high");
  const medium = items.filter(i => i.attentionLevel === "medium");
  const low = items.filter(i => i.attentionLevel === "low");
  const allOnTrack = high.length === 0 && medium.length === 0 && low.length > 0;
  const [onTrackCollapsed, setOnTrackCollapsed] = useState(low.length > 3);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }} data-testid="priority-board">

      {allOnTrack && (
        <div style={{
          display: "flex", alignItems: "center", gap: 10,
          padding: "12px 16px", borderRadius: 8,
          background: "rgba(16,185,129,0.03)", border: "1px solid rgba(16,185,129,0.08)",
        }} data-testid="all-on-track-banner">
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#10b981", flexShrink: 0 }} />
          <span style={{ fontSize: 12, fontWeight: 600, color: "var(--cm-text-2, #475569)" }}>Everything is on track</span>
          <span style={{ fontSize: 11, color: "var(--cm-text-3, #94a3b8)" }}>&mdash; no programs need immediate attention</span>
        </div>
      )}

      {/* Next Actions (High) */}
      <div data-testid="priority-section-attention">
        <SectionHeader label="Next actions" count={high.length} color="#ef4444" icon={AlertCircle} iconBg="rgba(239,68,68,0.06)" />
        {high.length > 0 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {high.map((item) => <SwipePriorityCard key={item.programId} item={item} navigate={navigate} section="attention" heroProgramId={heroProgramId} />)}
          </div>
        ) : (
          <div style={{ padding: "14px 4px", fontSize: 12, color: "var(--cm-text-3, #94a3b8)", fontWeight: 500 }} data-testid="empty-state-attention">Nothing urgent right now</div>
        )}
      </div>

      {/* Coming Up (Medium) */}
      <div data-testid="priority-section-coming-up">
        <SectionHeader label="Coming up" count={medium.length} color="#f59e0b" icon={Clock} iconBg="rgba(245,158,11,0.06)" />
        {medium.length > 0 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {medium.map((item) => <SwipePriorityCard key={item.programId} item={item} navigate={navigate} section="coming-up" heroProgramId={heroProgramId} />)}
          </div>
        ) : (
          <div style={{ padding: "14px 4px", fontSize: 12, color: "var(--cm-text-3, #94a3b8)", fontWeight: 500 }} data-testid="empty-state-coming-up">No upcoming actions</div>
        )}
      </div>

      {/* On Track (Low) */}
      <div data-testid="priority-section-on-track">
        <div
          onClick={() => setOnTrackCollapsed(c => !c)}
          style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", padding: "4px 2px", marginBottom: onTrackCollapsed ? 0 : 8 }}
          data-testid="on-track-header"
        >
          <ChevronRight style={{
            width: 14, height: 14, color: "#10b981",
            transition: "transform 200ms",
            transform: onTrackCollapsed ? "none" : "rotate(90deg)", flexShrink: 0,
          }} />
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.02em", color: "#10b981" }}>On track</span>
          <span style={{ fontSize: 10, fontWeight: 500, color: "var(--cm-text-4, #cbd5e1)" }}>({low.length})</span>
        </div>
        {!onTrackCollapsed && (
          low.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column" }}>
              {low.map((item) => <SwipePriorityCard key={item.programId} item={item} navigate={navigate} section="on-track" heroProgramId={heroProgramId} />)}
            </div>
          ) : (
            <div style={{ padding: "14px 4px", fontSize: 12, color: "var(--cm-text-3, #94a3b8)", fontWeight: 500 }} data-testid="empty-state-on-track">No programs on track yet</div>
          )
        )}
      </div>
    </div>
  );
}

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
    <div style={{ display: "flex", gap: 3, marginTop: 8 }}>
      {order.map((s, i) => (
        <div key={s} style={{
          flex: 1, height: 3, borderRadius: 3,
          background: i <= activeIdx
            ? (i === activeIdx ? "rgba(25,195,178,0.45)" : "#19c3b2")
            : "rgba(20,37,68,0.06)",
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
  const bg = isOverdue ? "rgba(255,107,127,0.10)" : isDueToday ? "rgba(255,155,82,0.10)" : "rgba(100,116,139,0.08)";
  const color = isOverdue ? "#ff6b7f" : isDueToday ? "#ff9b52" : "#5f6c84";

  return (
    <span data-testid="timing-badge" style={{
      fontSize: 10, fontWeight: 800, letterSpacing: "0.06em",
      padding: "4px 10px", borderRadius: 999, textTransform: "uppercase",
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
    <div style={{ fontSize: 11, color: "#5f6c84", fontWeight: 500, display: "flex", alignItems: "center", gap: 5, marginTop: 2 }}>
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
      background: "rgba(255,255,255,0.86)",
      border: "1px solid rgba(20,37,68,0.08)",
      borderRadius: 22, overflow: "hidden",
      boxShadow: "inset 4px 0 0 #ff6b7f, 0 10px 30px rgba(19, 33, 58, 0.08)",
      transition: "transform 120ms ease, box-shadow 120ms ease",
      cursor: "pointer", position: "relative",
    }}
    onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "inset 4px 0 0 #ff6b7f, 0 14px 36px rgba(19,33,58,0.12)"; }}
    onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = "inset 4px 0 0 #ff6b7f, 0 10px 30px rgba(19,33,58,0.08)"; }}
    >
      <div style={{ padding: "18px 20px 14px" }}>
        {/* Tiny label */}
        <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.15em", color: "#cc475d", fontWeight: 700, marginBottom: 10 }}>Act now</div>
        {/* Top: logo + school + timing */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 12, background: "rgba(255,255,255,0.9)",
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            border: "1px solid rgba(20,37,68,0.06)", overflow: "hidden",
          }}>
            <LogoBox domain={prog.domain} name={prog.university_name} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: "#13213a", letterSpacing: "-0.02em", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {prog.university_name}
            </div>
            <SchoolMeta program={prog} />
          </div>
          <TimingBadge timingLabel={timingLabel} attentionLevel="high" />
        </div>

        <MiniRail journeyRail={prog.journey_rail} />

        {/* Action row */}
        <div style={{
          display: "flex", alignItems: "center", gap: 10,
          paddingTop: 12, marginTop: 12,
          borderTop: "1px solid rgba(20,37,68,0.06)",
        }}>
          <div style={{
            width: 22, height: 22, borderRadius: 7, flexShrink: 0,
            display: "flex", alignItems: "center", justifyContent: "center",
            background: "rgba(255,107,127,0.08)", color: "#ff6b7f",
          }}>
            <AlertCircle style={{ width: 12, height: 12 }} />
          </div>
          <span data-testid={`priority-action-${prog.program_id}`} style={{
            flex: 1, fontSize: 14, fontWeight: 600, lineHeight: 1.4,
            color: "#5f6c84",
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>{primaryAction}</span>
          <button data-testid={`cta-btn-${prog.program_id}`} style={{
            fontSize: 12, fontWeight: 700, border: "none", cursor: "pointer",
            padding: "8px 14px", borderRadius: 14, flexShrink: 0,
            display: "flex", alignItems: "center", gap: 5,
            background: "linear-gradient(135deg, #19c3b2, #5d87ff)", color: "#fff",
            fontFamily: "inherit", boxShadow: "0 8px 20px rgba(29,160,191,0.20)",
          }}>
            {ctaLabel || "Take Action"} <ArrowRight style={{ width: 13, height: 13 }} />
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
      background: "rgba(255,255,255,0.86)",
      border: "1px solid rgba(20,37,68,0.08)",
      borderRadius: 22, overflow: "hidden",
      boxShadow: "inset 4px 0 0 #ff9b52, 0 10px 30px rgba(19, 33, 58, 0.08)",
      transition: "transform 120ms ease, box-shadow 120ms ease",
      cursor: "pointer",
    }}
    onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "inset 4px 0 0 #ff9b52, 0 14px 36px rgba(19,33,58,0.12)"; }}
    onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = "inset 4px 0 0 #ff9b52, 0 10px 30px rgba(19,33,58,0.08)"; }}
    >
      <div style={{ padding: "18px 20px 14px" }}>
        {/* Tiny label */}
        <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.15em", color: "#cc6c22", fontWeight: 700, marginBottom: 10 }}>Keep momentum</div>
        {/* Top: logo + school + timing */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 12, background: "rgba(255,255,255,0.9)",
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            border: "1px solid rgba(20,37,68,0.06)", overflow: "hidden",
          }}>
            <LogoBox domain={prog.domain} name={prog.university_name} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: "#13213a", letterSpacing: "-0.02em", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {prog.university_name}
            </div>
            <SchoolMeta program={prog} />
          </div>
          <TimingBadge timingLabel={timingLabel} attentionLevel="medium" />
        </div>

        <MiniRail journeyRail={prog.journey_rail} />

        {/* Action row */}
        <div style={{
          display: "flex", alignItems: "center", gap: 10,
          paddingTop: 12, marginTop: 12,
          borderTop: "1px solid rgba(20,37,68,0.06)",
        }}>
          <div style={{
            width: 22, height: 22, borderRadius: 7, flexShrink: 0,
            display: "flex", alignItems: "center", justifyContent: "center",
            background: "rgba(255,155,82,0.08)", color: "#ff9b52",
          }}>
            <Clock style={{ width: 12, height: 12 }} />
          </div>
          <span data-testid={`priority-action-${prog.program_id}`} style={{
            flex: 1, fontSize: 14, fontWeight: 600, lineHeight: 1.4,
            color: "#5f6c84",
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>{primaryAction}</span>
          <button data-testid={`cta-btn-${prog.program_id}`} style={{
            fontSize: 12, fontWeight: 700, border: "none", cursor: "pointer",
            padding: "8px 14px", borderRadius: 14, flexShrink: 0,
            display: "flex", alignItems: "center", gap: 5,
            background: "rgba(255,255,255,0.82)", color: "#13213a",
            fontFamily: "inherit", boxShadow: "inset 0 0 0 1px rgba(19,33,58,.08), 0 4px 12px rgba(19,33,58,0.06)",
          }}>
            {ctaLabel || "View School"} <ArrowRight style={{ width: 13, height: 13 }} />
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
        display: "flex", alignItems: "center", gap: 12,
        padding: "12px 16px", borderRadius: 16,
        background: "rgba(255,255,255,0.5)",
        border: "1px solid rgba(20,37,68,0.04)",
        marginBottom: 4,
        transition: "all 120ms ease", cursor: "pointer",
      }}
      onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.82)"; e.currentTarget.style.boxShadow = "0 4px 12px rgba(19,33,58,0.06)"; }}
      onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.5)"; e.currentTarget.style.boxShadow = "none"; }}
    >
      <div style={{
        width: 32, height: 32, borderRadius: 10, background: "rgba(255,255,255,0.9)",
        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
        border: "1px solid rgba(20,37,68,0.06)",
      }}>
        <LogoBox domain={prog.domain} name={prog.university_name} muted />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: "#13213a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {prog.university_name}
        </div>
        <div style={{ fontSize: 11, color: "#5f6c84", fontWeight: 500, display: "flex", alignItems: "center", gap: 5, marginTop: 2 }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#16b57f" }} />
          On track · {stageLabel}
        </div>
      </div>
      <span style={{ fontSize: 11, fontWeight: 600, color: "#9aa5b8", flexShrink: 0 }}>View →</span>
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
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14, padding: "0 2px" }}>
      {Icon && (
        <div style={{
          width: 24, height: 24, borderRadius: 8,
          display: "flex", alignItems: "center", justifyContent: "center",
          background: iconBg, color,
        }}>
          <Icon style={{ width: 12, height: 12 }} />
        </div>
      )}
      <span style={{ fontSize: 13, fontWeight: 800, letterSpacing: "-0.01em", color: "#13213a" }}>{label}</span>
      <span style={{ fontSize: 12, fontWeight: 500, color: "#9aa5b8" }}>({count})</span>
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
    <div style={{ display: "flex", flexDirection: "column", gap: 28 }} data-testid="priority-board">

      {allOnTrack && (
        <div style={{
          display: "flex", alignItems: "center", gap: 12,
          padding: "16px 20px", borderRadius: 18,
          background: "rgba(22,181,127,0.04)", border: "1px solid rgba(22,181,127,0.10)",
        }} data-testid="all-on-track-banner">
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#16b57f", flexShrink: 0 }} />
          <span style={{ fontSize: 14, fontWeight: 600, color: "#13213a" }}>Everything is on track</span>
          <span style={{ fontSize: 13, color: "#5f6c84" }}>&mdash; no programs need immediate attention</span>
        </div>
      )}

      {/* Next Actions (High) */}
      <div data-testid="priority-section-attention">
        <SectionHeader label="Next actions" count={high.length} color="#ff6b7f" icon={AlertCircle} iconBg="rgba(255,107,127,0.08)" />
        {high.length > 0 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {high.map((item) => <SwipePriorityCard key={item.programId} item={item} navigate={navigate} section="attention" heroProgramId={heroProgramId} />)}
          </div>
        ) : (
          <div style={{ padding: "18px 6px", fontSize: 13, color: "#9aa5b8", fontWeight: 500 }} data-testid="empty-state-attention">Nothing urgent right now</div>
        )}
      </div>

      {/* Coming Up (Medium) */}
      <div data-testid="priority-section-coming-up">
        <SectionHeader label="Coming up" count={medium.length} color="#ff9b52" icon={Clock} iconBg="rgba(255,155,82,0.08)" />
        {medium.length > 0 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {medium.map((item) => <SwipePriorityCard key={item.programId} item={item} navigate={navigate} section="coming-up" heroProgramId={heroProgramId} />)}
          </div>
        ) : (
          <div style={{ padding: "18px 6px", fontSize: 13, color: "#9aa5b8", fontWeight: 500 }} data-testid="empty-state-coming-up">No upcoming actions</div>
        )}
      </div>

      {/* On Track (Low) */}
      <div data-testid="priority-section-on-track">
        <div
          onClick={() => setOnTrackCollapsed(c => !c)}
          style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", padding: "4px 2px", marginBottom: onTrackCollapsed ? 0 : 10 }}
          data-testid="on-track-header"
        >
          <ChevronRight style={{
            width: 16, height: 16, color: "#16b57f",
            transition: "transform 200ms",
            transform: onTrackCollapsed ? "none" : "rotate(90deg)", flexShrink: 0,
          }} />
          <span style={{ fontSize: 13, fontWeight: 800, letterSpacing: "-0.01em", color: "#16b57f" }}>On track</span>
          <span style={{ fontSize: 12, fontWeight: 500, color: "#9aa5b8" }}>({low.length})</span>
        </div>
        {!onTrackCollapsed && (
          low.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {low.map((item) => <SwipePriorityCard key={item.programId} item={item} navigate={navigate} section="on-track" heroProgramId={heroProgramId} />)}
            </div>
          ) : (
            <div style={{ padding: "18px 6px", fontSize: 13, color: "#9aa5b8", fontWeight: 500 }} data-testid="empty-state-on-track">No programs on track yet</div>
          )
        )}
      </div>
    </div>
  );
}

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
   KEEP MOMENTUM CARD (medium — orange accent)
   ═══════════════════════════════════════════════ */
function MomentumCard({ item }) {
  const { primaryAction, timingLabel, program: prog } = item;
  // For momentum cards, prefer actual reason over heroReason
  const rawReason = item.reason || item.heroReason || timingLabel || "Maintain engagement";
  const reason = rawReason.replace(/\s*[—–-]\s*also your recap[''']s top focus\.?/gi, "").replace(/also your recap[''']s top focus\.?/gi, "").trim();

  return (
    <div data-testid={`priority-card-${prog.program_id}`} style={{
      background: "#fff",
      border: "1px solid rgba(20,37,68,0.06)",
      borderRadius: 16,
      borderLeft: "3px solid #f59e0b",
      boxShadow: "0 1px 3px rgba(19,33,58,0.03)",
      transition: "transform 80ms ease, box-shadow 80ms ease",
      cursor: "pointer",
    }}
    onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = "0 4px 12px rgba(19,33,58,0.06)"; }}
    onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = "0 1px 3px rgba(19,33,58,0.03)"; }}
    >
      <div style={{ padding: "18px 20px" }}>
        {/* School row */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8, background: "#fafbfd",
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            border: "1px solid rgba(20,37,68,0.05)", overflow: "hidden",
          }}>
            <UniversityLogo domain={prog.domain} name={prog.university_name} size={22} className="rounded" />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: "#13213a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {prog.university_name}
            </div>
          </div>
          {timingLabel && (
            <span data-testid="timing-badge" style={{
              fontSize: 11, fontWeight: 500, padding: "3px 10px", borderRadius: 999,
              background: "rgba(100,116,139,0.06)", color: "#64748b",
            }}>{timingLabel}</span>
          )}
        </div>

        <MiniRail journeyRail={prog.journey_rail} />

        {/* Reason */}
        <p data-testid={`priority-reason-${prog.program_id}`} style={{
          fontSize: 13, fontWeight: 400, lineHeight: 1.5, color: "#64748b",
          margin: "12px 0 0", padding: 0,
        }}>{reason}</p>

        {/* Action */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 12 }}>
          <span data-testid={`priority-action-${prog.program_id}`} style={{
            flex: 1, fontSize: 14, fontWeight: 500, lineHeight: 1.4, color: "#1e293b",
          }}>{primaryAction}</span>
          <button data-testid={`cta-btn-${prog.program_id}`} style={{
            fontSize: 13, fontWeight: 500, border: "1px solid rgba(20,37,68,0.10)", cursor: "pointer",
            padding: "8px 14px", borderRadius: 10, flexShrink: 0,
            display: "flex", alignItems: "center", gap: 4,
            background: "#fff", color: "#1e293b",
          }}>
            View school <ArrowRight style={{ width: 12, height: 12 }} />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   MONITOR ROW (low priority — compact neutral)
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
        padding: "10px 14px", borderRadius: 10,
        background: "#fff",
        border: "1px solid rgba(20,37,68,0.04)",
        marginBottom: 2,
        transition: "background 80ms ease", cursor: "pointer",
      }}
      onMouseEnter={e => { e.currentTarget.style.background = "#fafbfd"; }}
      onMouseLeave={e => { e.currentTarget.style.background = "#fff"; }}
    >
      <div style={{
        width: 28, height: 28, borderRadius: 7, background: "#fafbfd",
        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
        border: "1px solid rgba(20,37,68,0.05)",
      }}>
        <UniversityLogo domain={prog.domain} name={prog.university_name} size={18} className="rounded-sm" />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 500, color: "#1e293b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {prog.university_name}
        </div>
        <div style={{ fontSize: 12, color: "#94a3b8", fontWeight: 400, display: "flex", alignItems: "center", gap: 5, marginTop: 1 }}>
          <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#10b981" }} />
          On track · {stageLabel}
        </div>
      </div>
      <span style={{ fontSize: 12, fontWeight: 500, color: "#94a3b8", flexShrink: 0 }}>View school</span>
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

  if (section === "act-now") {
    return (
      <SwipeableCard onAction={handleAction} onSnooze={handleSnooze} actionLabel="View school" programId={programId}>
        <ParticleBurst active={burstActive} color={burstColor} onComplete={handleBurstComplete}>
          <div onClick={handleTap}><ActNowCard item={item} isHeroPriority={programId === heroProgramId} /></div>
        </ParticleBurst>
      </SwipeableCard>
    );
  }
  if (section === "momentum") {
    return (
      <SwipeableCard onAction={handleAction} onSnooze={handleSnooze} actionLabel="View school" programId={programId}>
        <ParticleBurst active={burstActive} color={burstColor} onComplete={handleBurstComplete}>
          <div onClick={handleTap}><MomentumCard item={item} /></div>
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

export default function PriorityBoard({ items, navigate, heroProgramId }) {
  const high = items.filter(i => i.attentionLevel === "high");
  const medium = items.filter(i => i.attentionLevel === "medium");
  const low = items.filter(i => i.attentionLevel === "low");
  const allOnTrack = high.length === 0 && medium.length === 0 && low.length > 0;
  const [monitorCollapsed, setMonitorCollapsed] = useState(low.length > 4);

  return (
    <div data-testid="priority-board" style={{ marginTop: 8, fontFamily: FONT }}>
      {/* Section title */}
      <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "#8190aa", marginBottom: 18 }}>
        Your pipeline
      </div>

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

      <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
        {/* ACT NOW (High) */}
        {(high.length > 0 || !allOnTrack) && (
          <div data-testid="priority-section-attention">
            <SectionLabel label="Act now" count={high.length} color="#ef4444" />
            {high.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {high.map((item) => <SwipePriorityCard key={item.programId} item={item} navigate={navigate} section="act-now" heroProgramId={heroProgramId} />)}
              </div>
            ) : (
              <div style={{ padding: "14px 4px", fontSize: 13, color: "#94a3b8", fontWeight: 400 }} data-testid="empty-state-attention">Nothing urgent right now</div>
            )}
          </div>
        )}

        {/* KEEP MOMENTUM (Medium) */}
        {(medium.length > 0 || !allOnTrack) && (
          <div data-testid="priority-section-coming-up">
            <SectionLabel label="Keep things moving" count={medium.length} color="#f59e0b" />
            {medium.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {medium.map((item) => <SwipePriorityCard key={item.programId} item={item} navigate={navigate} section="momentum" heroProgramId={heroProgramId} />)}
              </div>
            ) : (
              <div style={{ padding: "14px 4px", fontSize: 13, color: "#94a3b8", fontWeight: 400 }} data-testid="empty-state-coming-up">No upcoming actions</div>
            )}
          </div>
        )}

        {/* MONITOR (Low) */}
        <div data-testid="priority-section-on-track">
          <div
            onClick={() => setMonitorCollapsed(c => !c)}
            style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", padding: "0 2px", marginBottom: monitorCollapsed ? 0 : 10 }}
            data-testid="on-track-header"
          >
            <ChevronRight style={{
              width: 14, height: 14, color: "#10b981",
              transition: "transform 200ms",
              transform: monitorCollapsed ? "none" : "rotate(90deg)", flexShrink: 0,
            }} />
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#10b981", flexShrink: 0 }} />
            <span style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase", color: "#475569" }}>Just keep an eye</span>
            <span style={{ fontSize: 12, fontWeight: 400, color: "#94a3b8" }}>({low.length})</span>
          </div>
          {!monitorCollapsed && (
            low.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                {low.map((item) => <SwipePriorityCard key={item.programId} item={item} navigate={navigate} section="monitor" heroProgramId={heroProgramId} />)}
              </div>
            ) : (
              <div style={{ padding: "14px 4px", fontSize: 13, color: "#94a3b8", fontWeight: 400 }} data-testid="empty-state-on-track">No programs to monitor yet</div>
            )
          )}
        </div>
      </div>
    </div>
  );
}

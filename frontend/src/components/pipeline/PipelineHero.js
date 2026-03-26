import React from "react";
import { ArrowRight } from "lucide-react";
import { trackEvent } from "../../lib/analytics";
import UniversityLogo from "../UniversityLogo";
import { RAIL_STAGES } from "../journey/constants";
import PipelineHeroEmptyState from "./PipelineHeroEmptyState";
import "./pipeline-motion.css";
import "./pipeline-premium.css";

const LEVEL_STYLE = {
  high: {
    accent: "#ff6b7f", glow: "rgba(255,107,127,0.10)", label: "Needs attention",
    badgeBg: "rgba(255,107,127,0.16)", badgeText: "#ffd2d9",
  },
  medium: {
    accent: "#ff9b52", glow: "rgba(255,155,82,0.06)", label: "Coming soon",
    badgeBg: "rgba(255,155,82,0.14)", badgeText: "#ffd29f",
  },
  low: {
    accent: "#16b57f", glow: "rgba(22,181,127,0.04)", label: "On track",
    badgeBg: "rgba(22,181,127,0.14)", badgeText: "#b9fff8",
  },
};

function buildRail(program) {
  if (!program) return null;
  const stage = program.journey_stage || program.board_group;
  const map = { needs_outreach: "added", waiting_on_reply: "outreach", overdue: "outreach" };
  const active = map[stage] || stage || "added";
  const activeIdx = RAIL_STAGES.findIndex(s => s.key === active);
  return { active, activeIdx };
}

export default function PipelineHero({ heroItem, matchScores, navigate }) {
  // Track hero view — must be before any conditional return
  React.useEffect(() => {
    if (!heroItem?.programId) return;
    trackEvent("hero_viewed", {
      program_id: heroItem.programId,
      school_name: heroItem.program?.university_name || "",
      priority_source: heroItem.prioritySource || "live",
      attention_level: heroItem.attentionLevel,
      position: 1,
    });
  }, [heroItem?.programId, heroItem?.program?.university_name, heroItem?.prioritySource, heroItem?.attentionLevel]);

  if (!heroItem) {
    return <PipelineHeroEmptyState onTrackCount={0} navigate={navigate} />;
  }

  const current = heroItem;
  const p = current.program;
  const ms = matchScores[p?.program_id];
  const rail = buildRail(p);
  const activeStageIdx = rail?.activeIdx ?? -1;
  const ownerLabel = current.owner === 'coach' ? 'Coach' : current.owner === 'director' ? 'Director' : 'You';

  return (
    <div
      data-testid="pipeline-hero"
      className="overflow-hidden relative pm-hero-hover rounded-[12px] sm:rounded-[28px]"
      style={{
        background: "#161921",
        border: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      {/* ── CONTENT ── */}
      <div className="relative z-[1] ds-hero-content px-4 sm:px-6 py-4 sm:py-5">
        <div className="flex gap-4">
          {/* LEFT: signal, headline, risk, CTA */}
          <div className="flex-1 min-w-0">

            {/* SIGNAL ROW */}
            <div className="flex items-center gap-2 flex-wrap mb-2" data-testid="hero-status-row">
              <span className="ds-badge" style={{
                background: "rgba(239,68,68,0.12)",
                color: "#fca5a5",
              }} data-testid="hero-top-priority-badge">
                Top Priority
              </span>
              {(current.coachWaiting || current.timingLabel) && (
                <span className="text-[11px]" style={{ color: "rgba(255,255,255,0.35)" }} data-testid="hero-merged-signal">
                  {[current.coachWaiting ? "Coach waiting" : null, current.timingLabel].filter(Boolean).join(" · ")}
                </span>
              )}
            </div>

            {/* HEADLINE — school logo + action */}
            <div className="flex items-center gap-2.5 mb-0.5" data-testid="hero-school-row">
              {p && (
                <UniversityLogo
                  name={p.university_name}
                  logoUrl={ms?.logo_url || p.logo_url}
                  domain={ms?.domain || p.domain}
                  size={24}
                  className="rounded-lg flex-shrink-0"
                />
              )}
              <h3 className="text-[16px] sm:text-[19px]" style={{ fontWeight: 700, color: "#fff", letterSpacing: "-0.03em", margin: 0, lineHeight: 1.15 }} data-testid="hero-school-name">
                {current.primaryAction || `Follow up with ${p?.university_name || "School"}`}
              </h3>
            </div>

            {/* RISK CONTEXT */}
            <div data-testid="hero-advice-box">
              {current.riskContext && (
                <div style={{ color: "#f87171", fontSize: 12, fontWeight: 600, lineHeight: 1.4, marginTop: 2, marginBottom: 2 }} data-testid="hero-risk-context">
                  {current.riskContext}
                </div>
              )}
              <div style={{ color: "rgba(255,255,255,0.40)", fontSize: 13, fontWeight: 400, lineHeight: 1.4, marginTop: 2 }} data-testid="hero-descriptive-reason">
                {(() => {
                  const hr = (current.heroReason || "").trim();
                  if (hr) return hr;
                  if (current.tier === "high") {
                    const days = p?.signals?.days_since_activity || p?.signals?.days_since_last_activity;
                    return days ? `No response in ${days} day${days !== 1 ? 's' : ''}` : "Needs your attention now";
                  }
                  return "On track \u2014 keep momentum";
                })()}
              </div>
            </div>

            {/* META: Owner */}
            {ownerLabel !== 'You' && (
              <div className="mt-2 flex items-center gap-2" data-testid="hero-meta-line">
                <span className="text-[10px] font-bold px-2 py-1 rounded-md" style={{
                  background: 'rgba(93,135,255,0.12)',
                  color: '#8facff',
                }}>
                  {ownerLabel}
                </span>
              </div>
            )}

            {/* CTA ROW */}
            <div className="flex items-center gap-4 mt-3">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (p) {
                    trackEvent("hero_action_clicked", {
                      program_id: current.programId,
                      school_name: p.university_name || "",
                      priority_source: current.prioritySource || "live",
                      cta_label: current.ctaLabel || "Open school",
                    });
                    navigate(`/pipeline/${p.program_id}`);
                  }
                }}
                data-testid="hero-cta-btn"
                className="ds-btn-primary text-[12px] sm:text-[13px] py-2 px-3.5 sm:py-2 sm:px-4"
              >
                {current.coachWaiting ? "Reply to coach" : (current.ctaLabel || "Open school")} <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>
            </div>
          </div>

          {/* RIGHT: Vertical stage rail */}
          {rail && (
            <div className="hidden sm:flex flex-col items-start pt-1 pl-4 flex-shrink-0" style={{ borderLeft: "1px solid rgba(255,255,255,0.04)", minWidth: 130 }} data-testid="hero-progress-rail">
              <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(255,255,255,0.20)", marginBottom: 10 }}>
                Where you are
              </div>
              <div className="flex flex-col gap-0">
                {RAIL_STAGES.map((s, stIdx) => {
                  const isActive = stIdx === activeStageIdx;
                  const isPast = stIdx < activeStageIdx;
                  const isLast = stIdx === RAIL_STAGES.length - 1;
                  return (
                    <div key={s.key} className="flex items-start gap-2.5" data-testid={`rail-stage-${s.key}`}>
                      <div className="flex flex-col items-center" style={{ width: 12 }}>
                        <div style={{
                          width: isActive ? 10 : 6,
                          height: isActive ? 10 : 6,
                          borderRadius: "50%",
                          background: isActive ? "#2ec4b6" : isPast ? "rgba(255,255,255,0.25)" : "rgba(255,255,255,0.10)",
                          boxShadow: isActive ? "0 0 8px rgba(46,196,182,0.5)" : "none",
                          flexShrink: 0,
                          marginTop: isActive ? 3 : 5,
                        }} />
                        {!isLast && (
                          <div style={{
                            width: 1.5,
                            height: 14,
                            background: isPast ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.06)",
                          }} />
                        )}
                      </div>
                      <span style={{
                        fontSize: 12,
                        fontWeight: isActive ? 700 : 400,
                        color: isActive ? "#2ec4b6" : isPast ? "rgba(255,255,255,0.45)" : "rgba(255,255,255,0.20)",
                        lineHeight: isActive ? "16px" : "22px",
                      }}>
                        {s.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

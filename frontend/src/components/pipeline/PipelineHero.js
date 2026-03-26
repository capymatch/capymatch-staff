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
      className="overflow-hidden relative pm-hero-hover"
      style={{
        background: "linear-gradient(135deg, #0b1730 0%, #162036 50%, #1a2640 100%)",
        border: "1px solid rgba(255,255,255,0.05)",
        borderRadius: 20,
        boxShadow: "0 20px 50px rgba(11,23,48,0.25), 0 0 0 1px rgba(255,255,255,0.03) inset",
      }}
    >
      {/* Warm accent glow */}
      <div style={{
        position: "absolute", top: -60, right: -40, width: 200, height: 200,
        background: "radial-gradient(circle, rgba(255,90,31,0.06) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />

      <div className="relative z-[1] px-5 sm:px-7 py-5 sm:py-6">
        <div className="flex gap-5">
          <div className="flex-1 min-w-0">

            {/* SIGNAL ROW */}
            <div className="flex items-center gap-2.5 flex-wrap mb-3" data-testid="hero-status-row">
              <span style={{
                fontSize: 10, fontWeight: 800, letterSpacing: "0.08em",
                textTransform: "uppercase",
                padding: "5px 10px",
                borderRadius: 8,
                background: "rgba(199,80,0,0.15)",
                color: "#ffb088",
              }} data-testid="hero-top-priority-badge">
                Top Priority
              </span>
              {(current.coachWaiting || current.timingLabel) && (
                <span className="text-[11px]" style={{ color: "rgba(255,255,255,0.30)", fontWeight: 500 }} data-testid="hero-merged-signal">
                  {[current.coachWaiting ? "Coach waiting" : null, current.timingLabel].filter(Boolean).join(" · ")}
                </span>
              )}
            </div>

            {/* HEADLINE */}
            <div className="flex items-center gap-3 mb-1" data-testid="hero-school-row">
              {p && (
                <UniversityLogo
                  name={p.university_name}
                  logoUrl={ms?.logo_url || p.logo_url}
                  domain={ms?.domain || p.domain}
                  size={26}
                  className="rounded-lg flex-shrink-0"
                />
              )}
              <h3 style={{
                fontSize: "clamp(17px, 2vw, 20px)", fontWeight: 800,
                color: "#fff", letterSpacing: "-0.03em",
                margin: 0, lineHeight: 1.2,
              }} data-testid="hero-school-name">
                {current.primaryAction || `Follow up with ${p?.university_name || "School"}`}
              </h3>
            </div>

            {/* RISK CONTEXT */}
            <div data-testid="hero-advice-box">
              {current.riskContext && (
                <div style={{ color: "#ffb088", fontSize: 12, fontWeight: 600, lineHeight: 1.4, marginTop: 4, marginBottom: 2 }} data-testid="hero-risk-context">
                  {current.riskContext}
                </div>
              )}
              <div style={{ color: "rgba(255,255,255,0.35)", fontSize: 13, fontWeight: 400, lineHeight: 1.5, marginTop: 3 }} data-testid="hero-descriptive-reason">
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
              <div className="mt-2.5 flex items-center gap-2" data-testid="hero-meta-line">
                <span style={{
                  fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 6,
                  background: "rgba(140,170,255,0.10)", color: "#a0b8e8",
                  letterSpacing: "0.02em",
                }}>
                  {ownerLabel}
                </span>
              </div>
            )}

            {/* CTA ROW */}
            <div className="flex items-center gap-4 mt-4">
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
                style={{
                  display: "inline-flex", alignItems: "center", gap: 8,
                  padding: "10px 20px",
                  background: "#ff5a1f",
                  color: "#fff", fontSize: 13, fontWeight: 700,
                  border: "none", borderRadius: 12, cursor: "pointer",
                  boxShadow: "0 8px 24px rgba(255,90,31,0.25)",
                  transition: "transform 80ms ease, box-shadow 80ms ease",
                  letterSpacing: "-0.01em",
                }}
                onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-1px)"; }}
                onMouseLeave={e => { e.currentTarget.style.transform = ""; }}
              >
                {current.coachWaiting ? "Reply to coach" : (current.ctaLabel || "Open school")} <ArrowRight style={{ width: 15, height: 15 }} />
              </button>
            </div>
          </div>

          {/* RIGHT: Vertical stage rail */}
          {rail && (
            <div className="hidden sm:flex flex-col items-start pt-1 pl-5 flex-shrink-0" style={{ borderLeft: "1px solid rgba(255,255,255,0.05)", minWidth: 130 }} data-testid="hero-progress-rail">
              <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(255,255,255,0.18)", marginBottom: 12 }}>
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
                          background: isActive ? "#48c9a8" : isPast ? "rgba(255,255,255,0.22)" : "rgba(255,255,255,0.08)",
                          boxShadow: isActive ? "0 0 10px rgba(72,201,168,0.45)" : "none",
                          flexShrink: 0,
                          marginTop: isActive ? 3 : 5,
                        }} />
                        {!isLast && (
                          <div style={{
                            width: 1.5, height: 14,
                            background: isPast ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.05)",
                          }} />
                        )}
                      </div>
                      <span style={{
                        fontSize: 12,
                        fontWeight: isActive ? 700 : 400,
                        color: isActive ? "#48c9a8" : isPast ? "rgba(255,255,255,0.40)" : "rgba(255,255,255,0.16)",
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

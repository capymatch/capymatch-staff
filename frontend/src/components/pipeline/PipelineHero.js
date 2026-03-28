import React from "react";
import { ArrowRight } from "lucide-react";
import { trackEvent } from "../../lib/analytics";
import UniversityLogo from "../UniversityLogo";
import { RAIL_STAGES } from "../journey/constants";
import { parseSignals } from "./signal-format";
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
  // Sprint 3 SSOT: use pipeline_stage exclusively
  const active = program.pipeline_stage || "added";
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
        <div className="flex gap-3">
          <div className="flex-1 min-w-0">

            {/* SIGNAL ROW */}
            <div className="flex items-center gap-2.5 flex-wrap mb-2.5" data-testid="hero-status-row">
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
            </div>

            {/* SCHOOL IDENTITY */}
            <div className="flex items-center gap-3 mb-1.5" data-testid="hero-school-row">
              {p && (
                <UniversityLogo
                  name={p.university_name}
                  logoUrl={ms?.logo_url || p.logo_url}
                  domain={ms?.domain || p.domain}
                  size={34}
                  className="rounded-lg flex-shrink-0"
                />
              )}
              <span style={{
                fontSize: 18, fontWeight: 700,
                color: "#fff", letterSpacing: "-0.015em",
                lineHeight: 1.2,
              }} data-testid="hero-school-name">
                {p?.university_name || "School"}
              </span>
            </div>

            {/* ACTION TITLE */}
            <h3 style={{
              fontSize: 16, fontWeight: 500,
              color: "rgba(255,255,255,0.72)", letterSpacing: "-0.015em",
              margin: "0 0 8px", lineHeight: 1.3,
              paddingTop: 6,
              borderTop: "1px solid rgba(255,255,255,0.06)",
            }} data-testid="hero-action-title">
              {(() => {
                const name = p?.university_name || "School";
                const short = name.replace(/^University of /i, "").replace(/\bUniversity\b/gi, "").replace(/\bCollege\b/gi, "").replace(/\bInstitute\b/gi, "").replace(/\bof\s*$/i, "").trim() || name;
                const tier = current.tier || current.attentionLevel;
                if (tier === "high") return `Follow up with ${short} now`;
                if (tier === "medium") return `Follow up with ${short}`;
                if (tier === "low") return `Maintain momentum with ${short}`;
                return `Follow up with ${short} now`;
              })()}
            </h3>

            {/* REASON — clean, deduplicated signal bullets */}
            <div data-testid="hero-advice-box" style={{ marginBottom: 0 }}>
              <div data-testid="hero-descriptive-reason">
                {(() => {
                  const hr = (current.heroReason || "").trim();
                  const risk = (current.riskContext || "").trim();
                  let raw;
                  if (hr && risk) raw = `${hr} — ${risk.charAt(0).toLowerCase() + risk.slice(1)}`;
                  else if (hr) raw = hr;
                  else if (risk) raw = risk;
                  else if (current.tier === "high") {
                    const days = p?.signals?.days_since_activity || p?.signals?.days_since_last_activity;
                    raw = days ? `No response in ${days} days — coach is expecting a reply` : "Needs your attention now";
                  } else {
                    raw = "On track";
                  }
                  const signals = parseSignals(raw);
                  if (signals.length === 0) {
                    return <span style={{ color: "rgba(255,255,255,0.55)", fontSize: 13, fontWeight: 450, lineHeight: 1.5 }}>{raw}</span>;
                  }
                  return (
                    <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
                      {signals.map((s, i) => (
                        <li key={i} style={{
                          display: "flex", gap: 8, alignItems: "center",
                          marginBottom: i < signals.length - 1 ? 6 : 0,
                          color: "rgba(255,255,255,0.6)", fontSize: 13, fontWeight: 450, lineHeight: 1.4,
                        }}>
                          <span style={{
                            width: 6, height: 6, borderRadius: "50%",
                            background: s.color, flexShrink: 0, opacity: 0.85,
                          }} />
                          <span>{s.text}</span>
                        </li>
                      ))}
                    </ul>
                  );
                })()}
              </div>
            </div>

            {/* META: Owner */}
            {ownerLabel !== 'You' && (
              <div className="mt-2 flex items-center gap-2" data-testid="hero-meta-line">
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
            <div className="flex items-center gap-4 mt-3.5">
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
                  padding: "11px 22px",
                  background: "#ff5a1f",
                  color: "#fff", fontSize: 14, fontWeight: 700,
                  border: "none", borderRadius: 12, cursor: "pointer",
                  boxShadow: "0 8px 24px rgba(255,90,31,0.25)",
                  transition: "transform 80ms ease, box-shadow 80ms ease",
                  letterSpacing: "-0.01em",
                }}
                onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-1px)"; }}
                onMouseLeave={e => { e.currentTarget.style.transform = ""; }}
              >
                {(() => {
                  if (current.coachWaiting) return "Reply now";
                  const cta = current.ctaLabel || "";
                  if (/review|check|look/i.test(cta) || !cta) return "Follow up now";
                  return cta;
                })()} <ArrowRight style={{ width: 15, height: 15 }} />
              </button>
            </div>
          </div>

          {/* RIGHT: Vertical stage rail — balanced, integrated */}
          {rail && (
            <div className="hidden sm:flex flex-col items-start pt-1 pl-5 flex-shrink-0" style={{
              borderLeft: "1px solid rgba(255,255,255,0.06)",
              minWidth: 120,
              background: "rgba(255,255,255,0.02)",
              borderRadius: "0 16px 16px 0",
              marginRight: -20,
              marginTop: -20,
              marginBottom: -20,
              paddingTop: 22,
              paddingRight: 20,
              paddingBottom: 20,
            }} data-testid="hero-progress-rail">
              <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(255,255,255,0.22)", marginBottom: 12 }}>
                Pipeline stage
              </div>
              <div className="flex flex-col gap-0">
                {RAIL_STAGES.map((s, stIdx) => {
                  const isActive = stIdx === activeStageIdx;
                  const isPast = stIdx < activeStageIdx;
                  const isLast = stIdx === RAIL_STAGES.length - 1;
                  return (
                    <div key={s.key} className="flex items-start gap-2.5" data-testid={`rail-stage-${s.key}`}>
                      <div className="flex flex-col items-center" style={{ width: 10 }}>
                        <div style={{
                          width: isActive ? 9 : 5,
                          height: isActive ? 9 : 5,
                          borderRadius: "50%",
                          background: isActive ? "#48c9a8" : isPast ? "rgba(255,255,255,0.22)" : "rgba(255,255,255,0.07)",
                          boxShadow: isActive ? "0 0 10px rgba(72,201,168,0.4)" : "none",
                          flexShrink: 0,
                          marginTop: isActive ? 3 : 5,
                        }} />
                        {!isLast && (
                          <div style={{
                            width: 1.5, height: 13,
                            background: isPast ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.04)",
                          }} />
                        )}
                      </div>
                      <span style={{
                        fontSize: 11.5,
                        fontWeight: isActive ? 650 : 400,
                        color: isActive ? "#48c9a8" : isPast ? "rgba(255,255,255,0.35)" : "rgba(255,255,255,0.14)",
                        lineHeight: isActive ? "16px" : "20px",
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

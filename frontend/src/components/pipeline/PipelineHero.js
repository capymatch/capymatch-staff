import { useState, useRef, useEffect } from "react";
import { ArrowRight, Info } from "lucide-react";
import { trackEvent } from "../../lib/analytics";
import UniversityLogo from "../UniversityLogo";
import { RAIL_STAGES } from "../journey/constants";
import PipelineHeroEmptyState from "./PipelineHeroEmptyState";

const FONT = '-apple-system, "SF Pro Text", Inter, ui-sans-serif, system-ui, sans-serif';

export default function PipelineHero({ heroItems, matchScores, navigate }) {
  const [whyExpanded, setWhyExpanded] = useState(false);
  const trackedRef = useRef(null);

  const current = heroItems?.[0];

  useEffect(() => {
    if (!current?.programId || current.programId === trackedRef.current) return;
    trackedRef.current = current.programId;
    trackEvent("hero_viewed", {
      program_id: current.programId,
      school_name: current.program?.university_name || "",
      priority_source: current.prioritySource || "live",
      attention_level: current.attentionLevel,
    });
  }, [current]);

  if (!heroItems || heroItems.length === 0) {
    return <PipelineHeroEmptyState onTrackCount={0} navigate={navigate} />;
  }

  const p = current.program;
  const ms = matchScores[p?.program_id];
  const matchPct = ms?.match_score;

  // Progress rail
  const stage = p?.journey_stage || p?.board_group;
  const stageMap = { needs_outreach: "added", waiting_on_reply: "outreach", overdue: "outreach" };
  const activeKey = stageMap[stage] || stage || "added";
  const activeIdx = RAIL_STAGES.findIndex(s => s.key === activeKey);

  // Label config
  const lvl = current.attentionLevel;
  const label = lvl === "high" ? { text: "Needs attention", bg: "rgba(255,107,127,0.14)", color: "#ffc4cf" }
    : lvl === "medium" ? { text: "Gaining momentum", bg: "rgba(255,155,82,0.14)", color: "#ffd29f" }
    : { text: "On track", bg: "rgba(22,181,127,0.14)", color: "#a7f3d0" };

  const supportingText = current.heroReason || current.reason || "";

  return (
    <div
      data-testid="pipeline-hero"
      style={{
        background: "linear-gradient(135deg, #0f1c35 0%, #152547 50%, #1a2d5a 100%)",
        borderRadius: 20,
        padding: "30px 34px 28px",
        position: "relative",
        overflow: "hidden",
        boxShadow: "0 16px 48px rgba(15, 28, 53, 0.18)",
        fontFamily: FONT,
      }}
    >
      {/* Soft glow — top right only */}
      <div style={{
        position: "absolute", width: 280, height: 280, right: -80, top: -100,
        background: "radial-gradient(circle, rgba(25,195,178,0.12), transparent 65%)",
        borderRadius: "50%", pointerEvents: "none",
      }} />

      {/* ── Label row ── */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 22, position: "relative", zIndex: 1 }}>
        <span data-testid="hero-category-label" style={{
          fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600,
          padding: "7px 12px", borderRadius: 999, background: label.bg, color: label.color,
        }}>{label.text}</span>
        {current.timingLabel && (
          <span data-testid="hero-timing-label" style={{
            fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600,
            padding: "7px 12px", borderRadius: 999,
            background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.55)",
          }}>{current.timingLabel}</span>
        )}
        {current.explainFactors?.length > 0 && (
          <button
            onClick={() => { setWhyExpanded(v => !v); if (!whyExpanded) trackEvent("hero_expanded_why", { program_id: current.programId }); }}
            data-testid="hero-why-btn"
            style={{
              fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600,
              padding: "7px 12px", borderRadius: 999,
              background: whyExpanded ? "rgba(25,195,178,0.18)" : "rgba(25,195,178,0.10)",
              color: "#8df0e6", border: "none", cursor: "pointer", fontFamily: FONT,
              display: "inline-flex", alignItems: "center", gap: 5,
            }}
          >
            <Info size={11} /> Why this surfaced
          </button>
        )}
      </div>

      {/* ── School name ── */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6, position: "relative", zIndex: 1 }}>
        {p && <UniversityLogo name={p.university_name} logoUrl={ms?.logo_url || p.logo_url} domain={ms?.domain || p.domain} size={26} className="rounded-lg flex-shrink-0" />}
        <h2 data-testid="hero-school-name" style={{ fontSize: 28, fontWeight: 600, color: "#fff", letterSpacing: "-0.03em", margin: 0, lineHeight: 1.1 }}>
          {p?.university_name || "School"}
        </h2>
        {matchPct != null && (
          <span data-testid="hero-match-score" style={{ fontSize: 14, fontWeight: 500, color: "rgba(255,255,255,0.45)" }}>({matchPct}%)</span>
        )}
      </div>

      {/* ── Action ── */}
      <div data-testid="hero-advice-text" style={{
        fontSize: 18, fontWeight: 500, color: "rgba(255,255,255,0.92)", letterSpacing: "-0.015em",
        lineHeight: 1.3, margin: "10px 0 6px", position: "relative", zIndex: 1,
      }}>
        {current.primaryAction}
      </div>

      {/* ── Supporting text ── */}
      {supportingText && (
        <p data-testid="hero-recap-reason" style={{
          fontSize: 14, fontWeight: 400, color: "rgba(255,255,255,0.50)",
          margin: "0 0 26px", lineHeight: 1.55, position: "relative", zIndex: 1,
        }}>
          {supportingText}
        </p>
      )}

      {/* ── Rail label ── */}
      <div style={{
        fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em",
        color: "rgba(255,255,255,0.30)", marginBottom: 10, position: "relative", zIndex: 1,
      }}>
        Where you are in the process
      </div>

      {/* ── Progress rail ── */}
      <div data-testid="hero-progress-rail" style={{
        display: "grid", gridTemplateColumns: `repeat(${RAIL_STAGES.length}, 1fr)`,
        gap: 8, marginBottom: 26, position: "relative", zIndex: 1,
      }}>
        {RAIL_STAGES.map((s, i) => {
          const isActive = i === activeIdx;
          const isPast = i < activeIdx;
          return (
            <div key={s.key} style={{ textAlign: "center" }} data-testid={`rail-stage-${s.key}`}>
              <div style={{
                width: isActive ? 14 : 10, height: isActive ? 14 : 10,
                borderRadius: 999, margin: "0 auto 6px",
                background: isActive ? "#19c3b2" : isPast ? "rgba(255,255,255,0.35)" : "rgba(255,255,255,0.10)",
                border: isActive ? "none" : `1px solid ${isPast ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.06)"}`,
                boxShadow: isActive ? "0 0 0 5px rgba(25,195,178,0.10)" : "none",
                transition: "all 0.2s ease",
              }} />
              <span style={{ fontSize: 11, fontWeight: isActive ? 600 : 400, color: isActive ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.25)" }}>
                {s.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* ── CTA row ── */}
      <div style={{ display: "flex", gap: 10, position: "relative", zIndex: 1 }}>
        <button
          onClick={() => {
            if (p) {
              trackEvent("hero_action_clicked", {
                program_id: current.programId,
                school_name: p.university_name || "",
                priority_source: current.prioritySource || "live",
                recap_rank: current.recapRank || null,
              });
              navigate(`/pipeline/${p.program_id}`);
            }
          }}
          data-testid="hero-cta-btn"
          style={{
            padding: "11px 20px", borderRadius: 14, fontSize: 14, fontWeight: 600,
            background: "linear-gradient(135deg, #19c3b2, #4d7cff)",
            color: "#fff", border: "none", cursor: "pointer", fontFamily: FONT,
            display: "inline-flex", alignItems: "center", gap: 7,
            boxShadow: "0 10px 24px rgba(25,195,178,0.22)",
            transition: "transform 80ms ease, box-shadow 80ms ease",
          }}
        >
          View School <ArrowRight size={15} />
        </button>
        <button
          onClick={() => { setWhyExpanded(v => !v); if (!whyExpanded) trackEvent("hero_expanded_why", { program_id: current.programId }); }}
          data-testid="hero-secondary-btn"
          style={{
            padding: "11px 20px", borderRadius: 14, fontSize: 14, fontWeight: 600,
            background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.60)",
            border: "1px solid rgba(255,255,255,0.08)", cursor: "pointer", fontFamily: FONT,
            display: "inline-flex", alignItems: "center", gap: 7,
            transition: "background 80ms ease",
          }}
        >
          Why this?
        </button>
      </div>

      {/* ── Why panel ── */}
      {whyExpanded && current.explainFactors?.length > 0 && (
        <div data-testid="hero-why-panel" style={{
          marginTop: 22, paddingTop: 18,
          borderTop: "1px solid rgba(255,255,255,0.06)",
          position: "relative", zIndex: 1,
        }}>
          <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "rgba(255,255,255,0.28)", marginBottom: 10 }}>
            Priority factors
          </div>
          {current.explainFactors.map((f, i) => {
            const isSecondary = f.type === "recap-outranked" || f.type === "recap-stale";
            return (
              <div key={i} style={{
                display: "flex", alignItems: "center", gap: 8, marginBottom: 8,
                fontSize: 13, fontWeight: isSecondary ? 400 : 500, lineHeight: 1.5,
                color: isSecondary ? "rgba(255,255,255,0.35)" : "rgba(255,255,255,0.55)",
                fontStyle: isSecondary ? "italic" : "normal",
              }}>
                <span style={{
                  width: 6, height: 6, borderRadius: "50%", flexShrink: 0,
                  background: f.type === "overdue" || f.type === "due" ? "#ff6b7f"
                    : f.type === "coach" ? "#ff9b52"
                    : f.type === "recap" ? "#8b7bff"
                    : "#9aa5b8",
                  opacity: isSecondary ? 0.4 : 0.8,
                }} />
                {f.label}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

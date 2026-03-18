/**
 * PipelineHero — Dark hero card containing the 2-tier action system.
 *
 * Wraps urgent + momentum tiers, on-track summary, and capacity strip
 * inside a single dark card container.
 *
 * Answers 3 questions:
 *   1. What needs attention NOW?  → Tier 1 (urgent)
 *   2. What is starting to slip?  → Tier 2 (momentum)
 *   3. What should I do next?     → First card in highest tier
 */
import React from "react";
import { CheckCircle2 } from "lucide-react";
import HeroSection from "./HeroSection";
import HeroCard from "./HeroCard";
import PipelineCapacityStrip from "./PipelineCapacityStrip";

const URGENT_CATS = new Set([
  "coach_flag", "director_action", "past_due", "reply_needed", "due_today",
]);
const MOMENTUM_CATS = new Set(["cooling_off", "first_outreach"]);

function classifyActions(actions) {
  const urgent = [];
  const momentum = [];
  let onTrackCount = 0;
  for (const a of actions) {
    if (URGENT_CATS.has(a.category)) urgent.push(a);
    else if (MOMENTUM_CATS.has(a.category)) momentum.push(a);
    else onTrackCount++;
  }
  return { urgent, momentum, onTrackCount };
}

export default function PipelineHero({ actions, matchScores, navigate, usage }) {
  if (!actions || actions.length === 0) return null;

  const { urgent, momentum, onTrackCount } = classifyActions(actions);

  const handleNav = (action) => {
    if (action.type === "growth") navigate("/schools");
    else if (action.program) navigate(`/pipeline/${action.program.program_id}`);
  };

  const hasUrgent = urgent.length > 0;
  const hasMomentum = momentum.length > 0;

  return (
    <div
      style={{
        background: "linear-gradient(145deg, #1a2332 0%, #0f1a26 100%)",
        borderRadius: 14,
        overflow: "hidden",
        border: "1px solid rgba(255,255,255,0.04)",
        padding: "16px 20px 14px",
        marginBottom: 20,
      }}
      data-testid="pipeline-hero"
    >
      {/* ── Status summary ── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 16,
          marginBottom: 16,
          flexWrap: "wrap",
        }}
        data-testid="pipeline-hero-summary"
      >
        {hasUrgent && (
          <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.5)" }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#ef4444", flexShrink: 0 }} />
            {urgent.length} need{urgent.length === 1 ? "s" : ""} attention
          </span>
        )}
        {hasMomentum && (
          <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.5)" }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#818cf8", flexShrink: 0 }} />
            {momentum.length} losing momentum
          </span>
        )}
        {onTrackCount > 0 && (
          <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.5)" }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#4ade80", flexShrink: 0 }} />
            {onTrackCount} on track
          </span>
        )}
      </div>

      {/* ── Tier 1: Needs Attention Now ── */}
      {hasUrgent && (
        <HeroSection
          title="Needs Attention Now"
          count={urgent.length}
          dotColor="#ef4444"
          variant="urgent"
        >
          {urgent.slice(0, 10).map((a) => (
            <HeroCard key={a.id} action={a} variant="urgent" onClick={() => handleNav(a)} />
          ))}
        </HeroSection>
      )}

      {/* ── Calm state ── */}
      {!hasUrgent && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "12px 14px",
            borderRadius: 10,
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.05)",
            marginBottom: 16,
          }}
          data-testid="hero-no-urgent"
        >
          <CheckCircle2 style={{ width: 16, height: 16, color: "#4ade80", flexShrink: 0 }} />
          <span style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.55)" }}>
            You're on track. Nothing urgent right now.
          </span>
        </div>
      )}

      {/* ── Tier 2: Keep Momentum Going ── */}
      {hasMomentum && (
        <HeroSection
          title="Keep Momentum Going"
          count={momentum.length}
          dotColor="#818cf8"
          variant="momentum"
        >
          {momentum.map((a) => (
            <HeroCard key={a.id} action={a} variant="momentum" onClick={() => handleNav(a)} />
          ))}
        </HeroSection>
      )}

      {/* ── On-track summary ── */}
      {onTrackCount > 0 && (hasUrgent || hasMomentum) && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 7,
            padding: "8px 0 4px",
          }}
          data-testid="hero-on-track-summary"
        >
          <CheckCircle2 style={{ width: 14, height: 14, color: "#4ade80", flexShrink: 0, opacity: 0.7 }} />
          <span style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.35)" }}>
            {onTrackCount} program{onTrackCount !== 1 ? "s" : ""} on track — no action needed
          </span>
        </div>
      )}

      {/* ── Capacity strip ── */}
      {usage && (
        <PipelineCapacityStrip
          current={usage.used || 0}
          limit={usage.unlimited ? 0 : usage.limit || 0}
        />
      )}

      {/* ── Styles ── */}
      <style>{`
        .hero-card-dark:hover {
          background: rgba(255,255,255,0.07) !important;
          transform: translateY(-1px);
        }
        .hero-card-dark:focus-visible {
          outline: 2px solid #5eead4;
          outline-offset: 2px;
        }
        .hero-cta-dark:hover { opacity: 0.85; }
        .hero-scroll-container::-webkit-scrollbar { display: none; }
        @media (max-width: 768px) {
          .hero-nav-arrows { display: none !important; }
          .hero-card-dark { width: 85vw !important; max-width: 340px !important; }
        }
      `}</style>
    </div>
  );
}

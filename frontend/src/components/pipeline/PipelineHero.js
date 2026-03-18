/**
 * PipelineHero — 2-tier hero system for the recruiting pipeline.
 *
 * Answers 3 questions instantly:
 *   1. What needs attention NOW?        → Tier 1 (urgent)
 *   2. What is starting to slip?        → Tier 2 (momentum)
 *   3. What should I do next?           → First card in highest tier
 *
 * Actions are classified by category from the Top Action Engine:
 *   Tier 1 (urgent):   coach_flag, director_action, past_due, reply_needed, due_today
 *   Tier 2 (momentum): cooling_off, first_outreach
 *   Excluded:          on_track → counted, shown as calm summary
 *
 * Design rationale:
 * - Separation reduces cognitive overload (urgent vs. proactive)
 * - Calm empty state reduces anxiety when nothing is urgent
 * - On-track summary provides reassurance about the rest of the pipeline
 * - Typography hierarchy: title > section headers > card content
 */
import React from "react";
import { CheckCircle2 } from "lucide-react";
import HeroSection from "./HeroSection";
import HeroCard from "./HeroCard";

/* ── Tier classification sets ── */
const URGENT_CATS = new Set([
  "coach_flag",
  "director_action",
  "past_due",
  "reply_needed",
  "due_today",
]);
const MOMENTUM_CATS = new Set(["cooling_off", "first_outreach"]);

/**
 * Split a flat actions array into the 3 buckets.
 * Each action appears in exactly one bucket.
 */
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

/** Build human-readable summary fragments for the header. */
function buildSummary(urgentCount, momentumCount, onTrackCount) {
  const parts = [];
  if (urgentCount > 0) parts.push(`${urgentCount} need attention`);
  if (momentumCount > 0) parts.push(`${momentumCount} losing momentum`);
  if (onTrackCount > 0) parts.push(`${onTrackCount} on track`);
  return parts;
}

export default function PipelineHero({ actions, matchScores, navigate }) {
  if (!actions || actions.length === 0) return null;

  const { urgent, momentum, onTrackCount } = classifyActions(actions);
  const summary = buildSummary(urgent.length, momentum.length, onTrackCount);

  const handleNav = (action) => {
    if (action.type === "growth") navigate("/schools");
    else if (action.program) navigate(`/pipeline/${action.program.program_id}`);
  };

  const hasUrgent = urgent.length > 0;
  const hasMomentum = momentum.length > 0;

  return (
    <div style={{ marginBottom: 24 }} data-testid="pipeline-hero">
      {/* ── Header ── */}
      <div style={{ marginBottom: 16 }}>
        <h2
          style={{
            fontSize: 18,
            fontWeight: 800,
            color: "var(--cm-text)",
            letterSpacing: "-0.02em",
            margin: 0,
            lineHeight: 1.3,
          }}
          data-testid="pipeline-hero-title"
        >
          Your Pipeline
        </h2>
        {summary.length > 0 && (
          <p
            style={{
              fontSize: 12,
              fontWeight: 500,
              color: "var(--cm-text-3)",
              margin: "4px 0 0",
              lineHeight: 1.5,
            }}
            data-testid="pipeline-hero-summary"
          >
            {summary.join(" · ")}
          </p>
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
            <HeroCard
              key={a.id}
              action={a}
              variant="urgent"
              onClick={() => handleNav(a)}
            />
          ))}
        </HeroSection>
      )}

      {/* ── Calm state: nothing urgent ── */}
      {!hasUrgent && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "14px 18px",
            borderRadius: 12,
            background: "var(--cm-surface)",
            border: "1px solid var(--cm-border)",
            marginBottom: 20,
          }}
          data-testid="hero-no-urgent"
        >
          <CheckCircle2
            style={{ width: 18, height: 18, color: "#10b981", flexShrink: 0 }}
          />
          <span
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: "var(--cm-text-2)",
            }}
          >
            You're on track. Nothing urgent right now.
          </span>
        </div>
      )}

      {/* ── Tier 2: Keep Momentum Going ── */}
      {hasMomentum && (
        <HeroSection
          title="Keep Momentum Going"
          count={momentum.length}
          dotColor="#6366f1"
          variant="momentum"
        >
          {momentum.map((a) => (
            <HeroCard
              key={a.id}
              action={a}
              variant="momentum"
              onClick={() => handleNav(a)}
            />
          ))}
        </HeroSection>
      )}

      {/* ── On-track summary (shown when at least one tier is visible) ── */}
      {onTrackCount > 0 && (hasUrgent || hasMomentum) && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "10px 16px",
            borderRadius: 10,
            background: "rgba(16,185,129,0.04)",
            border: "1px solid rgba(16,185,129,0.1)",
          }}
          data-testid="hero-on-track-summary"
        >
          <CheckCircle2
            style={{ width: 15, height: 15, color: "#10b981", flexShrink: 0 }}
          />
          <span
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: "var(--cm-text-3)",
            }}
          >
            {onTrackCount} program{onTrackCount !== 1 ? "s" : ""} on track — no
            action needed
          </span>
        </div>
      )}

      {/* ── Styles ── */}
      <style>{`
        .hero-card:hover {
          box-shadow: 0 4px 16px rgba(0,0,0,0.06);
          transform: translateY(-1px);
        }
        .hero-card:focus-visible {
          outline: 2px solid var(--cm-accent);
          outline-offset: 2px;
        }
        .hero-card-cta:hover { opacity: 0.85; }
        .hero-scroll-container::-webkit-scrollbar { display: none; }
        @media (max-width: 768px) {
          .hero-nav-arrows { display: none !important; }
          .hero-card { width: 85vw !important; max-width: 320px !important; }
        }
      `}</style>
    </div>
  );
}

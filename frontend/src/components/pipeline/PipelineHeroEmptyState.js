/**
 * PipelineHeroEmptyState — Calm, premium success state when all programs are on track.
 * Rendered inside the same dark hero container. Centered, green accent.
 */
import React from "react";
import { CheckCircle2, ArrowRight, Compass } from "lucide-react";

const GREEN = "#34d399";
const GREEN_GLOW = "rgba(52,211,153,0.08)";

export default function PipelineHeroEmptyState({ onTrackCount, navigate }) {
  return (
    <div
      data-testid="pipeline-hero-empty"
      className="rounded-xl sm:rounded-2xl overflow-hidden relative"
      style={{ background: "linear-gradient(145deg, #1a2332 0%, #0f1a26 100%)" }}
    >
      {/* Soft green ambient glow */}
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: `radial-gradient(ellipse at 50% 40%, ${GREEN_GLOW} 0%, transparent 65%)` }} />

      <div className="relative z-[1] flex flex-col items-center text-center px-6 sm:px-10 py-12 sm:py-16">
        {/* Success icon */}
        <div
          className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center mb-5"
          style={{ background: "rgba(52,211,153,0.08)", border: "1px solid rgba(52,211,153,0.15)" }}
        >
          <CheckCircle2 className="w-6 h-6 sm:w-7 sm:h-7" style={{ color: GREEN }} />
        </div>

        {/* Headline */}
        <h2 className="text-lg sm:text-2xl font-extrabold text-white tracking-tight mb-2">
          You're in a great spot
        </h2>

        {/* Supporting text */}
        <p className="text-[13px] sm:text-[15px] font-medium leading-relaxed max-w-md mb-1" style={{ color: "rgba(255,255,255,0.55)" }}>
          All your active programs are on track.{"\n"}No follow-ups are needed right now.
        </p>

        {/* Tertiary line */}
        <p className="text-[11px] sm:text-xs mb-6" style={{ color: "rgba(255,255,255,0.3)" }}>
          We'll let you know if anything needs attention.
        </p>

        {/* Supporting metric */}
        {onTrackCount > 0 && (
          <div
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-7"
            style={{ background: "rgba(52,211,153,0.06)", border: "1px solid rgba(52,211,153,0.12)" }}
            data-testid="hero-empty-metric"
          >
            <div className="w-1.5 h-1.5 rounded-full" style={{ background: GREEN }} />
            <span className="text-[11px] sm:text-xs font-semibold" style={{ color: "rgba(255,255,255,0.5)" }}>
              {onTrackCount} program{onTrackCount !== 1 ? "s" : ""} actively progressing
            </span>
          </div>
        )}

        {/* CTAs */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              const board = document.querySelector('[data-testid="kanban-board"], [data-testid="recruiting-board"]');
              if (board) board.scrollIntoView({ behavior: "smooth", block: "start" });
            }}
            data-testid="hero-empty-primary-cta"
            className="flex items-center gap-2 px-5 sm:px-6 py-2.5 rounded-full text-[13px] sm:text-sm font-bold text-white cursor-pointer transition-all"
            style={{ background: GREEN, border: "none", fontFamily: "inherit", boxShadow: `0 4px 20px rgba(52,211,153,0.35)` }}
          >
            Review your schools
            <ArrowRight className="w-4 h-4" />
          </button>
          <button
            onClick={() => navigate("/schools")}
            data-testid="hero-empty-secondary-cta"
            className="flex items-center gap-2 px-5 sm:px-6 py-2.5 rounded-full text-[13px] sm:text-sm font-semibold cursor-pointer transition-all"
            style={{ color: "rgba(255,255,255,0.55)", border: "1px solid rgba(255,255,255,0.1)", background: "transparent", fontFamily: "inherit" }}
          >
            <Compass className="w-3.5 h-3.5" />
            Explore new programs
          </button>
        </div>
      </div>
    </div>
  );
}

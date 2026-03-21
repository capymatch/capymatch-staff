import React from "react";
import { CheckCircle2, ArrowRight, Compass } from "lucide-react";
import "./pipeline-motion.css";
import "./pipeline-premium.css";

export default function PipelineHeroEmptyState({ onTrackCount, navigate }) {
  return (
    <div
      data-testid="pipeline-hero-empty"
      className="overflow-hidden relative"
      style={{
        background: "linear-gradient(135deg, #111b34 0%, #17254a 55%, #1c3568 100%)",
        borderRadius: 28,
        border: "1px solid rgba(255,255,255,0.08)",
        boxShadow: "0 24px 70px rgba(19, 33, 58, 0.10)",
      }}
    >
      <div className="ds-glow-teal" style={{ opacity: 0.4, background: "radial-gradient(circle, rgba(22,181,127,0.18), transparent 60%)" }} />
      <div className="ds-glow-purple" />

      <div className="relative z-[1] flex flex-col items-center text-center px-6 sm:px-10 py-14 sm:py-20 pm-empty-enter">
        <div
          className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center mb-6"
          style={{ background: "rgba(22,181,127,0.08)", border: "1px solid rgba(22,181,127,0.15)" }}
        >
          <CheckCircle2 className="w-7 h-7 sm:w-8 sm:h-8" style={{ color: "#16b57f" }} />
        </div>

        <h2 className="text-xl sm:text-3xl font-extrabold text-white mb-3" style={{ letterSpacing: "-0.04em" }}>
          You're in a great spot
        </h2>

        <p className="text-[14px] sm:text-[16px] font-medium leading-relaxed max-w-md mb-2" style={{ color: "rgba(255,255,255,0.55)" }}>
          All your active programs are on track. No follow-ups are needed right now.
        </p>

        <p className="text-[12px] sm:text-[13px] mb-8" style={{ color: "rgba(255,255,255,0.3)" }}>
          We'll let you know if anything needs attention.
        </p>

        {onTrackCount > 0 && (
          <div
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full mb-8"
            style={{ background: "rgba(22,181,127,0.06)", border: "1px solid rgba(22,181,127,0.12)" }}
            data-testid="hero-empty-metric"
          >
            <div className="w-2 h-2 rounded-full" style={{ background: "#16b57f" }} />
            <span className="text-[12px] sm:text-[13px] font-semibold" style={{ color: "rgba(255,255,255,0.5)" }}>
              {onTrackCount} program{onTrackCount !== 1 ? "s" : ""} actively progressing
            </span>
          </div>
        )}

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              const board = document.querySelector('[data-testid="kanban-board"], [data-testid="recruiting-board"]');
              if (board) board.scrollIntoView({ behavior: "smooth", block: "start" });
            }}
            data-testid="hero-empty-primary-cta"
            className="ds-btn-primary"
            style={{ borderRadius: 999, padding: "12px 24px", background: "linear-gradient(135deg, #16b57f, #19c3b2)" }}
          >
            Review your schools <ArrowRight className="w-4 h-4" />
          </button>
          <button
            onClick={() => navigate("/schools")}
            data-testid="hero-empty-secondary-cta"
            className="ds-btn-secondary"
            style={{ borderRadius: 999, padding: "12px 24px", background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.55)", boxShadow: "none", border: "1px solid rgba(255,255,255,0.1)" }}
          >
            <Compass className="w-4 h-4" />
            Explore new programs
          </button>
        </div>
      </div>
    </div>
  );
}

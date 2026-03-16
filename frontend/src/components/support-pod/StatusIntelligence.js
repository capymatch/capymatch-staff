import { useState } from "react";
import { Compass, AlertCircle, ChevronDown, ChevronUp, Info } from "lucide-react";

/**
 * StatusIntelligence — explains the unified Journey State + Attention Status
 * for the Support Pod detail view. Human-readable, not a developer panel.
 */
export default function StatusIntelligence({ data }) {
  const [expanded, setExpanded] = useState(false);

  if (!data) return null;

  const { journey_state, attention, attention_explanation } = data;
  const journey = journey_state || {};
  const primary = attention?.primary;
  const secondary = attention?.secondary || [];

  return (
    <div
      className="rounded-xl border overflow-hidden"
      style={{ backgroundColor: "var(--cm-surface, white)", borderColor: "var(--cm-border, #e2e8f0)" }}
      data-testid="status-intelligence"
    >
      {/* Two-column: Journey + Attention */}
      <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x" style={{ borderColor: "var(--cm-border, #e2e8f0)" }}>

        {/* Journey State */}
        <div className="px-4 py-3 sm:py-4" data-testid="si-journey">
          <div className="flex items-center gap-2 mb-1.5">
            <Compass className="w-3.5 h-3.5" style={{ color: journey.color || "#94a3b8" }} />
            <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--cm-text-3, #94a3b8)" }}>
              Journey
            </span>
          </div>
          <div className="flex items-center gap-2 mb-1">
            <span
              className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold"
              style={{ backgroundColor: journey.bg, color: journey.color }}
              data-testid="si-journey-badge"
            >
              {journey.label || "Unknown"}
            </span>
          </div>
          <p className="text-[11px] leading-relaxed" style={{ color: "var(--cm-text-2, #64748b)" }}>
            {journey.explanation || ""}
          </p>
        </div>

        {/* Attention Status */}
        <div className="px-4 py-3 sm:py-4" data-testid="si-attention">
          <div className="flex items-center gap-2 mb-1.5">
            {primary ? (
              <AlertCircle className="w-3.5 h-3.5" style={{ color: primary.color }} />
            ) : (
              <Info className="w-3.5 h-3.5" style={{ color: "#10b981" }} />
            )}
            <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--cm-text-3, #94a3b8)" }}>
              Attention
            </span>
          </div>

          {primary ? (
            <>
              <div className="flex items-center gap-2 mb-1">
                <span
                  className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider"
                  style={{ backgroundColor: primary.bg, color: primary.color, border: `1px solid ${primary.color}22` }}
                  data-testid="si-attention-badge"
                >
                  {primary.label}
                </span>
              </div>
              <p className="text-[11px] font-medium mb-0.5" style={{ color: "var(--cm-text, #1e293b)" }}>
                {primary.reason}
              </p>
              <p className="text-[11px] leading-relaxed" style={{ color: "var(--cm-text-2, #64748b)" }}>
                {attention_explanation}
              </p>
            </>
          ) : (
            <>
              <span
                className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold mb-1"
                style={{ backgroundColor: "rgba(16,185,129,0.08)", color: "#10b981" }}
                data-testid="si-attention-badge"
              >
                All Clear
              </span>
              <p className="text-[11px] leading-relaxed" style={{ color: "var(--cm-text-2, #64748b)" }}>
                {attention_explanation || "No issues detected. All school relationships and actions are in good shape."}
              </p>
            </>
          )}
        </div>
      </div>

      {/* Secondary Signals (expandable) */}
      {secondary.length > 0 && (
        <div className="border-t" style={{ borderColor: "var(--cm-border, #e2e8f0)" }}>
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center justify-between w-full px-4 py-2 text-left hover:bg-slate-50/50 transition-colors"
            data-testid="si-toggle-secondary"
          >
            <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--cm-text-3, #94a3b8)" }}>
              {secondary.length} additional signal{secondary.length !== 1 ? "s" : ""} detected
            </span>
            {expanded ? (
              <ChevronUp className="w-3.5 h-3.5" style={{ color: "var(--cm-text-3)" }} />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" style={{ color: "var(--cm-text-3)" }} />
            )}
          </button>

          {expanded && (
            <div className="px-4 pb-3 space-y-1.5" data-testid="si-secondary-list">
              {secondary.map((sig, i) => {
                const natureColors = {
                  blocker: "#dc2626",
                  urgent_followup: "#d97706",
                  at_risk: "#ef4444",
                  needs_review: "#6366f1",
                };
                const color = natureColors[sig.nature] || "#94a3b8";
                const natureLabels = {
                  blocker: "Blocker",
                  urgent_followup: "Follow-up",
                  at_risk: "At Risk",
                  needs_review: "Review",
                };
                return (
                  <div key={i} className="flex items-start gap-2">
                    <span
                      className="inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider shrink-0 mt-0.5"
                      style={{ backgroundColor: `${color}10`, color }}
                    >
                      {natureLabels[sig.nature] || sig.nature}
                    </span>
                    <span className="text-[11px]" style={{ color: "var(--cm-text-2, #64748b)" }}>
                      {sig.reason}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

import { useState } from "react";
import { Compass, AlertCircle, ChevronDown, ChevronUp, Info, Eye, Shield } from "lucide-react";

/**
 * StatusIntelligence — explains the unified Journey State + Attention Status
 * for the Support Pod detail view. Human-readable, not a developer panel.
 */
export default function StatusIntelligence({ data, escalations }) {
  const [expanded, setExpanded] = useState(false);

  if (!data) return null;

  const { journey_state, attention, attention_explanation } = data;
  const journey = journey_state || {};
  const primary = attention?.primary;
  const secondary = attention?.secondary || [];
  const activeEscalations = (escalations || []).filter(e => e.status === "open");

  return (
    <div
      className="rounded-xl border overflow-hidden"
      style={{ backgroundColor: "var(--cm-surface, white)", borderColor: "var(--cm-border, #e2e8f0)" }}
      data-testid="status-intelligence"
    >
      {/* Persistent escalation chip */}
      {activeEscalations.length > 0 && (
        <div className="px-4 py-2 flex items-center gap-2 border-b" style={{ borderColor: "var(--cm-border, #e2e8f0)", backgroundColor: "rgba(99,102,241,0.04)" }} data-testid="si-escalation-chip">
          <Shield className="w-3 h-3 shrink-0" style={{ color: "#6366f1" }} />
          <span className="text-[10px] font-semibold" style={{ color: "#6366f1" }}>
            Escalated to Director
          </span>
          <span className="text-[10px]" style={{ color: "var(--cm-text-3, #94a3b8)" }}>
            &middot; {activeEscalations[0].reason_label || activeEscalations[0].reason || "Review needed"}
          </span>
        </div>
      )}

      {/* Two-column: Journey + Attention */}
      <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x" style={{ borderColor: "var(--cm-border, #e2e8f0)" }}>

        {/* Journey State — calm, contextual */}
        <div className="px-4 py-3 sm:py-4" data-testid="si-journey">
          <div className="flex items-center gap-2 mb-1.5">
            <Compass className="w-3.5 h-3.5" style={{ color: "#94a3b8" }} />
            <span className="text-[10px] font-medium uppercase tracking-wider" style={{ color: "var(--cm-text-3, #94a3b8)" }}>
              Journey
            </span>
          </div>
          <div className="flex items-center gap-2 mb-1">
            <span
              className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
              style={{ backgroundColor: journey.bg, color: journey.color }}
              data-testid="si-journey-badge"
            >
              {journey.label || "Unknown"}
            </span>
          </div>
          <p className="text-[11px] leading-relaxed" style={{ color: "var(--cm-text-3, #94a3b8)" }}>
            {journey.explanation || ""}
          </p>
        </div>

        {/* Attention Status — action-oriented */}
        <div className="px-4 py-3 sm:py-4" data-testid="si-attention">
          <div className="flex items-center gap-2 mb-1.5">
            {primary ? (
              <AlertCircle className="w-3.5 h-3.5" style={{ color: primary.color }} />
            ) : (
              <Info className="w-3.5 h-3.5" style={{ color: "#10b981" }} />
            )}
            <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: primary ? primary.color : "var(--cm-text-3, #94a3b8)" }}>
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

      {/* Secondary Signals — expandable with clear affordance */}
      {secondary.length > 0 && (
        <div className="border-t" style={{ borderColor: "var(--cm-border, #e2e8f0)" }}>
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center justify-between w-full px-4 py-2.5 text-left transition-colors group"
            style={{ backgroundColor: expanded ? "rgba(241,245,249,0.5)" : "transparent" }}
            data-testid="si-toggle-secondary"
          >
            <div className="flex items-center gap-2">
              <Eye className="w-3 h-3" style={{ color: "var(--cm-text-3, #94a3b8)" }} />
              <span className="text-[10px] font-semibold uppercase tracking-wider group-hover:underline" style={{ color: "var(--cm-text-3, #94a3b8)" }}>
                Also worth watching ({secondary.length})
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[9px] font-medium" style={{ color: "var(--cm-text-4, #cbd5e1)" }}>
                {expanded ? "Hide" : "Show"}
              </span>
              {expanded ? (
                <ChevronUp className="w-3.5 h-3.5" style={{ color: "var(--cm-text-3)" }} />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" style={{ color: "var(--cm-text-3)" }} />
              )}
            </div>
          </button>

          <div
            className="overflow-hidden transition-all duration-200"
            style={{ maxHeight: expanded ? "500px" : "0", opacity: expanded ? 1 : 0 }}
          >
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
          </div>
        </div>
      )}
    </div>
  );
}

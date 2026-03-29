import { useState } from "react";
import { Compass, AlertCircle, ChevronDown, ChevronUp, Eye, Shield, UserCog, MessageSquare, ClipboardCheck } from "lucide-react";

/**
 * StatusIntelligence — explains the unified Journey State + Attention Status
 * for the Support Pod detail view. Clean, Apple-level clarity.
 */
export default function StatusIntelligence({ data, escalations, athleteId, onAction }) {
  const [expanded, setExpanded] = useState(false);

  if (!data) return null;

  const { journey_state, attention } = data;
  const journey = journey_state || {};
  const primary = attention?.primary;
  const secondary = attention?.secondary || [];
  const activeEscalations = (escalations || []).filter(e => e.status === "open");

  /* ── Derive clean headline from primary reason ── */
  const primaryReason = primary?.reason || "";
  const cleanHeadline = primaryReason
    .replace(/^(\d+)\s+/, "$1 ")  // normalize spacing
    .replace(/\s*[-–—]\s*.*/, ""); // strip everything after dash

  /* ── Build compact subtext (1 line, actionable, not repeating headline) ── */
  const subtext = (() => {
    const reason = primaryReason.toLowerCase();
    if (reason.includes("overdue")) return "Follow-ups required to maintain momentum";
    if (reason.includes("missing") || reason.includes("requirement")) return "Blocking progress until resolved";
    if (reason.includes("momentum") || reason.includes("no activity")) return "Re-engagement needed to prevent drift";
    if (reason.includes("engagement")) return "Activity declining, outreach recommended";
    if (reason.includes("profile")) return "Incomplete profile limits visibility";
    if (reason.includes("escalat")) return "Flagged for urgent review";
    // Fallback: use first clause of explanation if available
    const explanation = data.attention_explanation || "";
    if (!explanation) return "";
    const first = explanation.split(".")[0] || "";
    if (first.length > 60) return first.slice(0, 57) + "...";
    return first;
  })();

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
        </div>
      )}

      {/* Two-column: Journey + Attention */}
      <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x" style={{ borderColor: "var(--cm-border, #e2e8f0)" }}>

        {/* Journey State */}
        <div className="px-4 py-3 sm:py-4" data-testid="si-journey">
          <div className="flex items-center gap-2 mb-2">
            <Compass className="w-3.5 h-3.5" style={{ color: "#94a3b8" }} />
            <span className="text-[10px] font-medium uppercase tracking-wider" style={{ color: "var(--cm-text-3, #94a3b8)" }}>
              Journey
            </span>
          </div>
          <span
            className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
            style={{ backgroundColor: journey.bg, color: journey.color }}
            data-testid="si-journey-badge"
          >
            {journey.label || "Unknown"}
          </span>
          {journey.explanation && (
            <p className="text-[11px] mt-1.5 leading-relaxed" style={{ color: "var(--cm-text-3, #94a3b8)" }}>
              {journey.explanation}
            </p>
          )}
        </div>

        {/* Attention Status — clean, decisive */}
        <div className="px-4 py-3 sm:py-4" data-testid="si-attention">
          <div className="flex items-center gap-2 mb-2">
            {primary ? (
              <AlertCircle className="w-3.5 h-3.5" style={{ color: primary.color }} />
            ) : (
              <Eye className="w-3.5 h-3.5" style={{ color: "#10b981" }} />
            )}
            <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: primary ? primary.color : "var(--cm-text-3, #94a3b8)" }}>
              Attention
            </span>
          </div>

          {primary ? (
            <>
              {/* Badge: BLOCKER / REVIEW / etc */}
              <span
                className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider"
                style={{ backgroundColor: primary.bg, color: primary.color, border: `1px solid ${primary.color}22` }}
                data-testid="si-attention-badge"
              >
                {primary.label}
              </span>

              {/* Headline: "3 Overdue Actions" (bold, dominant) */}
              <p className="text-sm font-bold mt-2" style={{ color: "var(--cm-text, #1e293b)" }} data-testid="si-attention-headline">
                {cleanHeadline}
              </p>

              {/* Subtext (1 line max) */}
              {subtext && (
                <p className="text-[11px] mt-0.5" style={{ color: "var(--cm-text-2, #64748b)", lineHeight: 1.4 }}>
                  {subtext}
                </p>
              )}

              {/* Action buttons */}
              <div className="flex items-center gap-2 mt-3 flex-wrap">
                {primary.nature === "blocker" && primaryReason.toLowerCase().includes("profile") && (
                  <button
                    onClick={() => onAction?.("nudge_profile", athleteId)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-semibold transition-colors"
                    style={{ background: "rgba(220,38,38,0.06)", color: "#dc2626", border: "1px solid rgba(220,38,38,0.12)" }}
                    data-testid="si-action-nudge-profile"
                  >
                    <UserCog className="w-3 h-3" /> Nudge to Complete
                  </button>
                )}
                {primary.nature === "blocker" && primaryReason.toLowerCase().includes("missing") && !primaryReason.toLowerCase().includes("profile") && (
                  <button
                    onClick={() => onAction?.("review_docs", athleteId)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-semibold transition-colors"
                    style={{ background: "rgba(220,38,38,0.06)", color: "#dc2626", border: "1px solid rgba(220,38,38,0.12)" }}
                    data-testid="si-action-review-docs"
                  >
                    <ClipboardCheck className="w-3 h-3" /> Review Missing Docs
                  </button>
                )}
                {(primary.nature === "needs_review" || primary.nature === "needs_follow_up") && (
                  <button
                    onClick={() => onAction?.("send_message", athleteId)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-semibold transition-colors"
                    style={{ background: "rgba(59,130,246,0.06)", color: "#3b82f6", border: "1px solid rgba(59,130,246,0.12)" }}
                    data-testid="si-action-message"
                  >
                    <MessageSquare className="w-3 h-3" /> Send Message
                  </button>
                )}
                <button
                  onClick={() => onAction?.("view_details", athleteId)}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-semibold transition-colors"
                  style={{ background: "rgba(100,116,139,0.06)", color: "#64748b", border: "1px solid rgba(100,116,139,0.12)" }}
                  data-testid="si-action-view"
                >
                  <Eye className="w-3 h-3" /> {primaryReason.toLowerCase().includes("overdue") ? "Review overdue actions" : "Open tasks"}
                </button>
              </div>
            </>
          ) : (
            <>
              <span
                className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold"
                style={{ backgroundColor: "rgba(16,185,129,0.08)", color: "#10b981" }}
                data-testid="si-attention-badge"
              >
                All Clear
              </span>
              <p className="text-[11px] mt-1.5" style={{ color: "var(--cm-text-2, #64748b)" }}>
                No issues detected. All school relationships are in good shape.
              </p>
            </>
          )}
        </div>
      </div>

      {/* Secondary Signals — expandable */}
      {secondary.length > 0 && (
        <div className="border-t" style={{ borderColor: "var(--cm-border, #e2e8f0)" }}>
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center justify-between w-full px-4 py-2 text-left transition-colors group"
            style={{ backgroundColor: expanded ? "rgba(241,245,249,0.5)" : "transparent" }}
            data-testid="si-toggle-secondary"
          >
            <span className="text-[10px] font-semibold uppercase tracking-wider group-hover:underline" style={{ color: "var(--cm-text-3, #94a3b8)" }}>
              {secondary.length} more signal{secondary.length !== 1 ? "s" : ""}
            </span>
            {expanded ? (
              <ChevronUp className="w-3.5 h-3.5" style={{ color: "var(--cm-text-3)" }} />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" style={{ color: "var(--cm-text-3)" }} />
            )}
          </button>

          <div
            className="overflow-hidden transition-all duration-200"
            style={{ maxHeight: expanded ? "500px" : "0", opacity: expanded ? 1 : 0 }}
          >
            <div className="px-4 pb-3 space-y-1" data-testid="si-secondary-list">
              {secondary.map((sig, i) => {
                const natureColors = {
                  blocker: "#dc2626",
                  urgent_followup: "#d97706",
                  at_risk: "#ef4444",
                  needs_review: "#6366f1",
                };
                const color = natureColors[sig.nature] || "#94a3b8";
                return (
                  <div key={i} className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: color }} />
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

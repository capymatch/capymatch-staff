import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Check, AlertTriangle } from "lucide-react";
import { getNudge, generateWhy, buildTitle } from "./inbox-utils";
import { TrajectoryHint } from "./TrajectoryHint";
import { ComposeModal } from "./ComposeModal";

export function TopPriorityCard({ item, onActionComplete }) {
  const navigate = useNavigate();
  const [completed, setCompleted] = useState(false);
  const [showCompose, setShowCompose] = useState(false);

  if (!item || completed) return null;

  const title = buildTitle(item);
  const parts = [...(item.issues || [])];
  if (item.timeAgo) parts.push(item.timeAgo);
  const issueLine = parts.join(" · ");

  const why = item.whyNow || generateWhy(item);
  const nudge = getNudge(item);
  const breakdown = item.schoolBreakdown || [];

  const intervention = item.interventionType || "nudge";
  const isCritical = item.severity === "critical";
  const isBlocker = intervention === "blocker";
  const isEscalate = intervention === "escalate";
  const showApprove = intervention === "nudge" || intervention === "escalate" || intervention === "blocker";
  const canAutoExecute = nudge && nudge.actionType !== "assign_coach" && showApprove;

  const severityLabel = isCritical ? "CRITICAL" : "HIGH PRIORITY";

  /* ── dark-theme palette ── */
  const cardBg = "#161921";
  const cardBorder = "rgba(255,255,255,0.06)";
  const badgeBg    = isCritical ? "rgba(239,68,68,0.12)" : "rgba(245,158,11,0.12)";
  const badgeBorder= isCritical ? "rgba(239,68,68,0.22)" : "rgba(245,158,11,0.22)";
  const labelColor = isCritical ? "#ef4444" : "#f59e0b";
  const issueColor = isCritical ? "#f87171" : "#fbbf24";
  const textPrimary   = "#f0f0f2";
  const textSecondary = "#8b8d98";
  const textMuted     = "#5c5e6a";
  const borderSubtle  = "rgba(255,255,255,0.06)";
  const accentTeal    = "#2dd4bf";

  function handleApprove(e) {
    e.stopPropagation();
    if (!nudge) return;
    if (nudge.actionType === "assign_coach") {
      navigate("/roster");
      return;
    }
    setShowCompose(true);
  }

  function handleEdit(e) {
    e.stopPropagation();
    if (nudge) navigate(nudge.url);
  }

  function handleSent() {
    setShowCompose(false);
    setCompleted(true);
    if (onActionComplete) onActionComplete(item.id);
  }

  /* button accent per intervention */
  const btnAccent = isBlocker ? "#ef4444" : isEscalate ? "#f59e0b" : "#ff6a3d";
  const btnGlow   = isBlocker ? "rgba(239,68,68,0.25)" : isEscalate ? "rgba(245,158,11,0.25)" : "rgba(255,106,61,0.25)";

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ background: cardBg, border: `1px solid ${cardBorder}` }}
      data-testid="top-priority-card"
    >
      <div className="px-5 py-4">
        {/* Severity badge + trajectory */}
        <div className="flex items-center gap-2.5 mb-3">
          <span
            className="text-[9.5px] font-bold uppercase tracking-[0.08em] px-2.5 py-1 rounded"
            style={{ background: badgeBg, color: labelColor, border: `1px solid ${badgeBorder}` }}
            data-testid="severity-label"
          >
            {severityLabel}
          </span>
          {item.trajectory && (
            <TrajectoryHint trajectory={item.trajectory} style={{ marginTop: -1 }} />
          )}
        </div>

        {/* Athlete identity row */}
        <div className="flex items-center gap-3 mb-2.5">
          {item.photoUrl ? (
            <img
              src={item.photoUrl}
              alt={item.athleteName}
              className="w-9 h-9 rounded-lg object-cover flex-shrink-0"
              style={{ border: `2px solid ${labelColor}20` }}
              data-testid="athlete-photo"
            />
          ) : (
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 text-[14px] font-bold"
              style={{ background: `${labelColor}18`, color: labelColor, border: `2px solid ${labelColor}20` }}
              data-testid="athlete-avatar"
            >
              {(item.athleteName || "?").charAt(0)}
            </div>
          )}
          <div className="min-w-0">
            <p className="text-[9px] font-bold uppercase tracking-[0.1em]" style={{ color: textMuted, margin: 0 }}>
              Athlete
            </p>
            <p className="text-[13px] font-semibold truncate" style={{ color: textPrimary, margin: 0, lineHeight: 1.2 }}>
              {item.athleteName}
            </p>
          </div>
        </div>

        {/* Title */}
        <p className="text-[16px] font-bold" style={{ color: textPrimary, margin: 0, lineHeight: 1.3, letterSpacing: "-0.01em" }}>
          {title}
        </p>

        {/* Issue line */}
        <p className="text-[12px] font-medium mt-1.5" style={{ color: issueColor, margin: 0 }}>
          {issueLine}
        </p>

        {/* Why now */}
        <p className="text-[12px] mt-2" style={{ color: textSecondary, margin: 0, lineHeight: 1.5 }} data-testid="why-now-text">
          {why}
        </p>

        {/* School breakdown */}
        {breakdown.length > 1 && (
          <div className="mt-3">
            <p className="text-[9px] font-bold uppercase tracking-[0.08em]" style={{ color: textMuted, margin: "0 0 5px" }}>
              Also affected
            </p>
            {breakdown.slice(0, 3).map((b, i) => (
              <p key={i} className="text-[11px] font-medium" style={{ color: textSecondary, margin: "2px 0", lineHeight: 1.4 }}>
                <span style={{ color: issueColor }}>{b.issue}</span>
                <span style={{ color: textMuted }}> — {b.school}</span>
              </p>
            ))}
          </div>
        )}

        {/* Suggested Action */}
        {nudge && (
          <div className="mt-4 pt-3" style={{ borderTop: `1px solid ${borderSubtle}` }}>
            <p className="text-[9px] font-bold uppercase tracking-[0.1em]" style={{ color: textMuted, margin: "0 0 8px" }}>
              Suggested action
            </p>
            {(item.schoolName || item.titleSuffix) && (
              <p className="text-[11px] font-medium mb-1.5" style={{ color: labelColor, opacity: 0.8, margin: 0 }}>
                {item.schoolName ? `Regarding ${item.schoolName} outreach` : `${item.titleSuffix}`}
              </p>
            )}
            <div className="flex items-center gap-2 mb-3">
              {isBlocker && <AlertTriangle className="w-3.5 h-3.5" style={{ color: "#ef4444" }} />}
              {!isBlocker && <nudge.Icon className="w-3.5 h-3.5" style={{ color: accentTeal }} />}
              <span className="text-[12.5px] font-semibold" style={{ color: textPrimary }}>
                {nudge.label}
              </span>
            </div>
            <div className="flex items-center gap-2.5">
              {canAutoExecute && (
                <button
                  onClick={handleApprove}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-[11.5px] font-bold uppercase tracking-[0.03em] cursor-pointer transition-all duration-150"
                  style={{
                    background: btnAccent,
                    color: "#fff",
                    border: "none",
                    fontFamily: "inherit",
                    boxShadow: `0 0 16px ${btnGlow}`,
                  }}
                  data-testid="autopilot-approve-btn"
                >
                  {isBlocker ? <AlertTriangle className="w-3 h-3" /> : <Check className="w-3 h-3" />}
                  {isBlocker ? "Act Now" : isEscalate ? "Escalate & Send" : "Approve & Send"}
                </button>
              )}
              {intervention === "review" && (
                <button
                  onClick={(e) => { e.stopPropagation(); navigate(item.cta.url); }}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-[11.5px] font-bold uppercase tracking-[0.03em] cursor-pointer transition-all duration-150"
                  style={{
                    background: "#ff6a3d",
                    color: "#fff",
                    border: "none",
                    fontFamily: "inherit",
                    boxShadow: "0 0 16px rgba(255,106,61,0.25)",
                  }}
                  data-testid="autopilot-review-btn"
                >
                  Open Pod <ArrowRight className="w-3 h-3" />
                </button>
              )}
              <button
                onClick={handleEdit}
                className="inline-flex items-center gap-1 px-4 py-2 rounded-lg text-[11.5px] font-semibold cursor-pointer transition-colors duration-150"
                style={{
                  background: "transparent",
                  color: textSecondary,
                  border: "1px solid rgba(255,255,255,0.12)",
                  fontFamily: "inherit",
                }}
                data-testid="autopilot-edit-btn"
              >
                Edit
              </button>
            </div>
          </div>
        )}

        {/* Secondary CTA */}
        <span
          className="inline-flex items-center gap-1 mt-3 text-[11px] font-medium cursor-pointer transition-colors duration-150"
          style={{ color: textMuted }}
          onClick={(e) => { e.stopPropagation(); navigate(item.cta.url); }}
          onMouseEnter={(e) => e.currentTarget.style.color = textSecondary}
          onMouseLeave={(e) => e.currentTarget.style.color = textMuted}
          data-testid="top-priority-cta"
        >
          {item.cta.label} <ArrowRight className="w-3 h-3" />
        </span>
      </div>

      {showCompose && nudge && (
        <ComposeModal
          nudge={nudge}
          item={item}
          onClose={() => setShowCompose(false)}
          onSent={handleSent}
        />
      )}
    </div>
  );
}

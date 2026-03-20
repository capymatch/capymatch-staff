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
  const cardBg = isCritical ? "#fef2f2" : "#fefce8";
  const cardBorder = isCritical ? "#fecaca" : "#fef08a";
  const labelColor = isCritical ? "#991b1b" : "#a16207";
  const issueColor = isCritical ? "#b91c1c" : "#92400e";

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

  return (
    <div
      className="rounded-lg overflow-hidden"
      style={{ background: cardBg, border: `1px solid ${cardBorder}` }}
      data-testid="top-priority-card"
    >
      <div className="px-5 py-3.5">
        {/* Severity label + trajectory */}
        <div className="flex items-center gap-2">
          <p className="text-[10px] font-bold uppercase tracking-[0.1em]" style={{ color: labelColor, margin: 0 }} data-testid="severity-label">
            {severityLabel}
          </p>
          {item.trajectory && (
            <TrajectoryHint trajectory={item.trajectory} style={{ marginTop: -1 }} />
          )}
        </div>
        <p className="text-[15px] font-bold mt-1.5" style={{ color: "#1e293b", margin: 0, lineHeight: 1.3 }}>
          {title}
        </p>
        <p className="text-[12px] font-medium mt-1" style={{ color: issueColor, margin: 0 }}>
          {issueLine}
        </p>
        <p className="text-[11.5px] mt-1.5" style={{ color: "#78716c", margin: 0, lineHeight: 1.4 }} data-testid="why-now-text">
          {why}
        </p>

        {/* School breakdown */}
        {breakdown.length > 1 && (
          <div className="mt-2">
            <p className="text-[9.5px] font-bold uppercase tracking-[0.08em]" style={{ color: labelColor, opacity: 0.5, margin: "0 0 4px" }}>
              Also affected
            </p>
            {breakdown.slice(0, 3).map((b, i) => (
              <p key={i} className="text-[11px] font-medium" style={{ color: "#78716c", margin: "1px 0", lineHeight: 1.4 }}>
                <span style={{ color: issueColor }}>{b.issue}</span>
                <span style={{ color: "#a8a29e" }}> — {b.school}</span>
              </p>
            ))}
          </div>
        )}

        {/* Suggested Action */}
        {nudge && (
          <div className="mt-3 pt-2.5" style={{ borderTop: `1px solid ${isCritical ? "rgba(254,202,202,0.6)" : "rgba(254,240,138,0.6)"}` }}>
            <p className="text-[9.5px] font-bold uppercase tracking-[0.1em] mb-1.5" style={{ color: labelColor, opacity: 0.6, margin: 0 }}>
              Suggested action
            </p>
            {(item.schoolName || item.titleSuffix) && (
              <p className="text-[11px] font-medium mb-1" style={{ color: labelColor, opacity: 0.7, margin: 0 }}>
                {item.schoolName ? `Regarding ${item.schoolName} outreach` : `${item.titleSuffix}`}
              </p>
            )}
            <div className="flex items-center gap-1.5 mb-2">
              {isBlocker && <AlertTriangle className="w-3.5 h-3.5" style={{ color: "#dc2626" }} />}
              {!isBlocker && <nudge.Icon className="w-3.5 h-3.5" style={{ color: "#0d9488" }} />}
              <span className="text-[12px] font-semibold" style={{ color: "#1e293b" }}>
                {nudge.label}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {canAutoExecute && (
                <button
                  onClick={handleApprove}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11.5px] font-semibold cursor-pointer transition-all duration-100"
                  style={{
                    background: isBlocker ? "#dc2626" : isEscalate ? "#b45309" : "#0d9488",
                    color: "#fff",
                    border: "none",
                    fontFamily: "inherit",
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
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11.5px] font-semibold cursor-pointer transition-all duration-100"
                  style={{
                    background: "#0d9488",
                    color: "#fff",
                    border: "none",
                    fontFamily: "inherit",
                  }}
                  data-testid="autopilot-review-btn"
                >
                  Open Pod <ArrowRight className="w-3 h-3" />
                </button>
              )}
              <button
                onClick={handleEdit}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-[11.5px] font-semibold cursor-pointer transition-colors duration-100"
                style={{
                  background: "transparent",
                  color: "#64748b",
                  border: "1px solid #e2e8f0",
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
          className="inline-flex items-center gap-1 mt-2.5 text-[11px] font-medium cursor-pointer"
          style={{ color: "#94a3b8" }}
          onClick={(e) => { e.stopPropagation(); navigate(item.cta.url); }}
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

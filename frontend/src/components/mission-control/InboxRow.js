import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, AlertTriangle } from "lucide-react";
import { DOT_COLOR, getNudge, ctaWithContext } from "./inbox-utils";
import { TrajectoryHint } from "./TrajectoryHint";
import { ComposeModal } from "./ComposeModal";

export function InboxRow({ item }) {
  const navigate = useNavigate();
  const [showCompose, setShowCompose] = useState(false);
  const dot = DOT_COLOR[item.priority] || "#94a3b8";
  const nudge = getNudge(item);
  const canCompose = nudge && nudge.actionType !== "assign_coach" && nudge.template;
  const intervention = item.interventionType || "nudge";

  const title = item.titleSuffix
    ? `${item.athleteName} — ${item.titleSuffix}`
    : item.schoolName
      ? `${item.athleteName} — ${item.schoolName}`
      : item.athleteName;

  const issues = (item.issues || []).filter(i => i !== "Escalated issue");
  const primary = issues[0] || item.primaryRisk || "";
  const context = item.schoolName || (item.schoolCount > 1 ? `across ${item.schoolCount} schools` : "");
  let subtitle = primary;
  if (context) subtitle += ` — ${context}`;
  if (item.timeAgo) subtitle += ` · ${item.timeAgo}`;

  const suggestedLabel = ctaWithContext(item);
  const showSuggestedAction = intervention !== "monitor";
  const isBlocker = intervention === "blocker";
  const isEscalate = intervention === "escalate";

  function handleSuggestedClick(e) {
    e.stopPropagation();
    if (intervention === "review") {
      navigate(item.cta.url);
      return;
    }
    if (canCompose) {
      setShowCompose(true);
    } else if (nudge) {
      navigate(nudge.url);
    }
  }

  return (
    <div className="inbox-row-wrap" data-testid={`inbox-row-${item.id}`}>
      <div className="inbox-row" style={{ height: 76 }}>
        <span className="inbox-dot" style={{ background: dot }} />
        <div className="inbox-text">
          <p className="inbox-title">{title}</p>
          <div className="flex items-center gap-2" style={{ marginTop: 2 }}>
            <p className="inbox-subtitle" style={{ margin: 0 }}>{subtitle}</p>
            {item.trajectory && item.trajectory !== "stable" && (
              <TrajectoryHint trajectory={item.trajectory} />
            )}
          </div>
          {showSuggestedAction && nudge && (
            <span
              className={`inbox-action-link${isBlocker ? " inbox-action-blocker" : ""}${isEscalate ? " inbox-action-escalate" : ""}`}
              onClick={handleSuggestedClick}
              data-testid={`suggested-action-${item.id}`}
            >
              {isBlocker && <AlertTriangle className="w-3 h-3" />}
              {suggestedLabel} <ArrowRight className="w-3 h-3" />
            </span>
          )}
        </div>
        <span
          className="inbox-cta"
          onClick={(e) => { e.stopPropagation(); navigate(item.cta.url); }}
          data-testid={`open-pod-${item.id}`}
        >
          Open Pod <ArrowRight className="w-3 h-3" />
        </span>
      </div>

      {showCompose && nudge && (
        <ComposeModal
          nudge={nudge}
          item={item}
          onClose={() => setShowCompose(false)}
          onSent={() => setShowCompose(false)}
        />
      )}
    </div>
  );
}

export function GroupLabel({ label }) {
  return (
    <div className="px-5 pt-4 pb-1.5">
      <span className="text-[9.5px] font-bold uppercase tracking-[0.12em]" style={{ color: "#94a3b8" }}>
        {label}
      </span>
    </div>
  );
}

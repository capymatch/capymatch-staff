import { ArrowRight } from "lucide-react";
import UniversityLogo from "../UniversityLogo";
import { RAIL_STAGES } from "../journey/constants";

const FONT = '-apple-system, "SF Pro Text", Inter, ui-sans-serif, system-ui, sans-serif';

const STAGE_LABEL = {
  added: "Added",
  outreach: "Outreach",
  in_conversation: "Talking",
  campus_visit: "Visit",
  offer: "Offer",
  committed: "Committed",
  needs_outreach: "Outreach",
  waiting_on_reply: "Outreach",
  overdue: "Outreach",
};

export default function PipelineList({ programs, attentionMap, matchScores, navigate }) {
  if (!programs || programs.length === 0) return null;

  const sorted = [...programs].sort((a, b) => {
    const isCommittedA = a.journey_stage === "committed" || a.recruiting_status === "Committed";
    const isCommittedB = b.journey_stage === "committed" || b.recruiting_status === "Committed";
    if (isCommittedA && !isCommittedB) return -1;
    if (!isCommittedA && isCommittedB) return 1;
    return 0;
  });

  return (
    <div style={{ marginTop: 48, fontFamily: FONT }} data-testid="pipeline-list">
      <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "#94a3b8", marginBottom: 14 }}>
        All programs
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {sorted.map(prog => {
          const attn = attentionMap[prog.program_id];
          const ms = matchScores[prog.program_id];
          const isCommitted = prog.journey_stage === "committed" || prog.recruiting_status === "Committed";

          const rawStage = prog.journey_stage || prog.board_group || "added";
          const stageLabel = STAGE_LABEL[rawStage] || rawStage;
          const stageIdx = RAIL_STAGES.findIndex(s => s.key === (rawStage === "needs_outreach" || rawStage === "waiting_on_reply" || rawStage === "overdue" ? "outreach" : rawStage));
          const progressPct = RAIL_STAGES.length > 1 ? ((stageIdx >= 0 ? stageIdx : 0) / (RAIL_STAGES.length - 1)) * 100 : 0;

          const nextStep = attn?.primaryAction || (isCommitted ? "Committed" : "Continue outreach");

          return (
            <div
              key={prog.program_id}
              onClick={() => navigate(`/pipeline/${prog.program_id}`)}
              data-testid={`pipeline-list-row-${prog.program_id}`}
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 80px 100px 1fr auto",
                gap: 16,
                alignItems: "center",
                padding: "12px 16px",
                borderRadius: 12,
                background: "#fff",
                border: "1px solid rgba(20,37,68,0.04)",
                cursor: "pointer",
                transition: "background 80ms ease",
              }}
              className="pipeline-list-row"
              onMouseEnter={e => { e.currentTarget.style.background = "#fafbfd"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "#fff"; }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                <UniversityLogo
                  domain={prog.domain}
                  name={prog.university_name}
                  logoUrl={ms?.logo_url || prog.logo_url}
                  size={26}
                  className="rounded-lg flex-shrink-0"
                />
                <span style={{ fontSize: 14, fontWeight: 500, color: "#334155", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {prog.university_name}
                </span>
              </div>

              <span style={{
                fontSize: 12, fontWeight: 500, color: isCommitted ? "#10b981" : "#94a3b8",
                textAlign: "center",
              }}>
                {isCommitted ? "Committed" : stageLabel}
              </span>

              <div style={{ height: 3, borderRadius: 2, background: "rgba(20,37,68,0.05)", overflow: "hidden" }}>
                <div style={{
                  height: "100%", borderRadius: 2,
                  width: isCommitted ? "100%" : `${progressPct}%`,
                  background: isCommitted ? "#10b981" : progressPct > 60 ? "#19c3b2" : "rgba(25,195,178,0.45)",
                  transition: "width 0.3s ease",
                }} />
              </div>

              <span style={{
                fontSize: 13, fontWeight: 400, color: "#94a3b8",
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              }}>
                {nextStep}
              </span>

              <span style={{
                fontSize: 12, fontWeight: 500, color: "#cbd5e1",
                display: "flex", alignItems: "center", gap: 3, flexShrink: 0,
              }}>
                View <ArrowRight size={11} />
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

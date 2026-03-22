import { PIPELINE_STAGES } from "./constants";

export function PipelineStatus({ pipeline }) {
  if (!pipeline) return null;
  const { stage_index } = pipeline;
  return (
    <div className="rounded-xl border px-4 py-3" style={{ backgroundColor: "var(--cm-surface, white)", borderColor: "var(--cm-border, #e2e8f0)" }} data-testid="pipeline-status">
      <div className="flex items-center justify-between mb-2">
        <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--cm-text-3)" }}>Pipeline Status</p>
        <span className="text-[11px] font-semibold" style={{ color: "var(--cm-text, #1e293b)" }}>
        
        </span>
      </div>
      <div className="flex items-center gap-1">
        {PIPELINE_STAGES.map((stage, i) => {
          const isActive = i <= stage_index;
          const isCurrent = i === stage_index;
          return (
            <div key={stage} className="flex-1 flex flex-col items-center gap-1">
              <div
                className="w-full h-1.5 rounded-full transition-all"
                style={{
                  backgroundColor: isCurrent ? "#0d9488" : isActive ? "#0d948880" : "var(--cm-border, #e2e8f0)",
                }}
              />
              <span className="text-[9px] font-medium" style={{ color: isCurrent ? "#0d9488" : isActive ? "var(--cm-text-2, #64748b)" : "var(--cm-text-4, #cbd5e1)" }}>
                {stage}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

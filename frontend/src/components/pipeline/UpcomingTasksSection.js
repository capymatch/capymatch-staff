import React from "react";
import { CheckSquare, Clock } from "lucide-react";

export default function UpcomingTasksSection({ tasks, navigate }) {
  if (!tasks || tasks.length === 0) return null;

  const systemTasks = tasks.filter(t => t.source !== "coach");
  if (systemTasks.length === 0) return null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 20 }}>
      <div style={{ background: "var(--cm-surface)", border: "1px solid var(--cm-border)", borderRadius: 10, padding: "16px 20px" }} data-testid="upcoming-tasks">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 700, color: "var(--cm-text)" }}>
            <CheckSquare style={{ width: 15, height: 15, color: "#3b82f6" }} /> Upcoming Tasks
          </div>
          <span style={{ fontSize: 11, fontWeight: 600, color: "var(--cm-text-3)" }}>{systemTasks.length} coming up</span>
        </div>
        {systemTasks.map((task) => (
          <div
            key={task.task_id}
            onClick={() => navigate(task.link)}
            style={{
              display: "flex", alignItems: "center", gap: 12,
              padding: "10px 0", borderTop: "1px solid var(--cm-border)",
              cursor: "pointer",
            }}
            data-testid={`task-item-${task.task_id}`}
          >
            <div style={{
              width: 28, height: 28, borderRadius: 7,
              background: "rgba(59,130,246,0.1)", display: "flex",
              alignItems: "center", justifyContent: "center", flexShrink: 0,
            }}>
              <Clock style={{ width: 14, height: 14, color: "#3b82f6" }} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--cm-text)", lineHeight: 1.4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{task.title}</div>
              <div style={{ fontSize: 11, color: "var(--cm-text-3)", marginTop: 1 }}>{task.description}</div>
            </div>
            <span style={{
              fontSize: 10, fontWeight: 700, padding: "2px 8px",
              borderRadius: 5, background: "rgba(59,130,246,0.1)", color: "#3b82f6",
              flexShrink: 0,
            }}>In {task.days_diff}d</span>
          </div>
        ))}
      </div>
    </div>
  );
}

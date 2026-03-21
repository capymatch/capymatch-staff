import React from "react";
import { CheckSquare, Clock } from "lucide-react";

export default function UpcomingTasksSection({ tasks, navigate }) {
  if (!tasks || tasks.length === 0) return null;

  const systemTasks = tasks.filter(t => t.source !== "coach");
  if (systemTasks.length === 0) return null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 20 }}>
      <div style={{
        background: "rgba(255,255,255,0.72)",
        backdropFilter: "blur(16px)",
        border: "1px solid rgba(20,37,68,0.08)",
        borderRadius: 22,
        padding: "20px 22px",
        boxShadow: "0 10px 30px rgba(19, 33, 58, 0.08)",
      }} data-testid="upcoming-tasks">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 15, fontWeight: 800, color: "#13213a", letterSpacing: "-0.02em" }}>
            <CheckSquare style={{ width: 16, height: 16, color: "#5d87ff" }} /> Upcoming Tasks
          </div>
          <span style={{ fontSize: 12, fontWeight: 700, color: "#9aa5b8" }}>{systemTasks.length} coming up</span>
        </div>
        {systemTasks.map((task) => (
          <div
            key={task.task_id}
            onClick={() => navigate(task.link)}
            style={{
              display: "flex", alignItems: "center", gap: 14,
              padding: "12px 0", borderTop: "1px solid rgba(20,37,68,0.06)",
              cursor: "pointer",
              transition: "background 100ms ease",
            }}
            data-testid={`task-item-${task.task_id}`}
          >
            <div style={{
              width: 34, height: 34, borderRadius: 12,
              background: "rgba(93,135,255,0.08)", display: "flex",
              alignItems: "center", justifyContent: "center", flexShrink: 0,
            }}>
              <Clock style={{ width: 16, height: 16, color: "#5d87ff" }} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: "#13213a", lineHeight: 1.4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{task.title}</div>
              <div style={{ fontSize: 12, color: "#5f6c84", marginTop: 2 }}>{task.description}</div>
            </div>
            <span style={{
              fontSize: 11, fontWeight: 800, padding: "4px 10px",
              borderRadius: 999, background: "rgba(93,135,255,0.08)", color: "#5d87ff",
              flexShrink: 0, letterSpacing: "0.02em",
            }}>In {task.days_diff}d</span>
          </div>
        ))}
      </div>
    </div>
  );
}

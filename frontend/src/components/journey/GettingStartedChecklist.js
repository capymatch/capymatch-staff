import { useNavigate } from "react-router-dom";
import { CheckCircle2, ChevronRight } from "lucide-react";

export function GettingStartedChecklist({ program, coaches, timeline, profileComplete, onAddCoach, onSendEmail }) {
  const navigate = useNavigate();
  const steps = [
    { key: "added", label: `Add ${program.university_name} to your pipeline`, desc: `School added on ${new Date(program.created_at || Date.now()).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`, done: true, action: null },
    { key: "profile", label: "Complete your athlete profile", desc: "Name, position, height, grad year, and video link", done: profileComplete, action: () => navigate("/athlete-profile") },
    { key: "coach", label: "Add the head coach's contact info", desc: "Find their name and email on the school's volleyball staff page", done: coaches.some(c => c.email), action: onAddCoach },
    { key: "email", label: "Send your first introduction email", desc: "Make a great first impression with a personalized intro", done: timeline.length > 0, action: onSendEmail },
  ];
  const doneCount = steps.filter(s => s.done).length;

  return (
    <div className="rounded-lg border p-5 sm:p-6" style={{ backgroundColor: "var(--cm-surface)", borderColor: "var(--cm-border)" }} data-testid="getting-started-checklist">
      <h3 className="text-base font-bold mb-1" style={{ color: "var(--cm-text)" }}>Start your {program.university_name} journey</h3>
      <p className="text-xs mb-5" style={{ color: "var(--cm-text-3)" }}>Complete these steps to kickstart your recruiting relationship</p>
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {steps.map(s => (
          <button key={s.key} className="w-full flex items-center gap-3.5 p-3.5 rounded-lg border transition-all text-left"
            style={{
              borderColor: "var(--cm-border)",
              backgroundColor: s.done ? "transparent" : "var(--cm-surface-2)",
              opacity: s.done ? 0.5 : 1,
            }}
            onClick={() => !s.done && s.action && s.action()} disabled={s.done}
            data-testid={`checklist-step-${s.key}`}>
            <div className="w-6 h-6 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all"
              style={{
                borderColor: s.done ? "#0d9488" : "var(--cm-border)",
                backgroundColor: s.done ? "#0d9488" : "transparent",
              }}>
              {s.done && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
            </div>
            <div className="min-w-0">
              <p className={`text-sm font-medium ${s.done ? "line-through" : ""}`} style={{ color: "var(--cm-text)" }}>{s.label}</p>
              <p className="text-[11px]" style={{ color: "var(--cm-text-3)" }}>{s.desc}</p>
            </div>
            {!s.done && s.action && <ChevronRight className="w-4 h-4 ml-auto flex-shrink-0" style={{ color: "var(--cm-text-3)" }} />}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-3 mt-4 pt-4" style={{ borderTop: "1px solid var(--cm-border)" }}>
        <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: "var(--cm-surface-2)" }}>
          <div className="h-full rounded-full transition-all duration-500" style={{ width: `${(doneCount / steps.length) * 100}%`, backgroundColor: "#0d9488" }} />
        </div>
        <span className="text-[11px] font-semibold" style={{ color: "#0d9488" }}>{doneCount} of {steps.length}</span>
      </div>
    </div>
  );
}

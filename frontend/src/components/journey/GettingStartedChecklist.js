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
    <div className="rounded-lg border p-5 sm:p-6 bg-slate-900 border-slate-700/50" data-testid="getting-started-checklist">
      <h3 className="text-base font-bold mb-1 text-white">Start your {program.university_name} journey</h3>
      <p className="text-xs mb-5 text-slate-400">Complete these steps to kickstart your recruiting relationship</p>
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {steps.map(s => (
          <button key={s.key} className={`w-full flex items-center gap-3.5 p-3.5 rounded-xl border transition-all text-left ${s.done ? "opacity-50 border-slate-700" : "border-slate-700 hover:border-teal-700/30 hover:bg-slate-800"}`}
            onClick={() => !s.done && s.action && s.action()} disabled={s.done}
            data-testid={`checklist-step-${s.key}`}>
            <div className={`w-6 h-6 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all ${s.done ? "bg-slate-500 border-slate-500" : "border-slate-600"}`}>
              {s.done && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
            </div>
            <div className="min-w-0">
              <p className={`text-sm font-medium text-white ${s.done ? "line-through" : ""}`}>{s.label}</p>
              <p className="text-[11px] text-slate-400">{s.desc}</p>
            </div>
            {!s.done && s.action && <ChevronRight className="w-4 h-4 ml-auto flex-shrink-0 text-slate-500" />}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-3 mt-4 pt-4 border-t border-slate-700">
        <div className="flex-1 h-1 rounded-full overflow-hidden bg-slate-800">
          <div className="h-full rounded-full bg-teal-700 transition-all duration-500" style={{ width: `${(doneCount / steps.length) * 100}%` }} />
        </div>
        <span className="text-[11px] font-semibold text-teal-700">{doneCount} of {steps.length}</span>
      </div>
    </div>
  );
}

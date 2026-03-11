import { UserPlus, Send, MessageCircle, MapPin, Award, Activity, GraduationCap } from "lucide-react";

const MILESTONE_CONFIG = {
  profile_created: { icon: UserPlus, color: "#6b7280", label: "Profile" },
  school_added: { icon: GraduationCap, color: "#3b82f6", label: "Schools" },
  outreach_sent: { icon: Send, color: "#8b5cf6", label: "Outreach" },
  coach_responded: { icon: MessageCircle, color: "#10b981", label: "Response" },
  visit_scheduled: { icon: MapPin, color: "#f59e0b", label: "Visit" },
  offer_received: { icon: Award, color: "#ef4444", label: "Offer" },
  last_activity: { icon: Activity, color: "#94a3b8", label: "Last Active" },
};

function RecruitingTimeline({ milestones }) {
  if (!milestones || milestones.length === 0) return null;

  // Sort chronologically
  const sorted = [...milestones].sort((a, b) => new Date(a.date) - new Date(b.date));

  return (
    <div className="rounded-xl border p-5" style={{ backgroundColor: "var(--cm-surface, #fff)", borderColor: "var(--cm-border, #f1f5f9)" }} data-testid="recruiting-timeline">
      <h3 className="text-[11px] font-bold uppercase tracking-widest mb-4" style={{ color: "var(--cm-text-3, #94a3b8)" }}>
        Recruiting Timeline
      </h3>

      <div className="relative pl-6">
        {/* Vertical line */}
        <div className="absolute left-[11px] top-2 bottom-2 w-px" style={{ backgroundColor: "var(--cm-border, #e2e8f0)" }} />

        <div className="space-y-4">
          {sorted.map((ms, idx) => {
            const config = MILESTONE_CONFIG[ms.type] || MILESTONE_CONFIG.profile_created;
            const Icon = config.icon;
            const isLast = idx === sorted.length - 1;
            const dateStr = new Date(ms.date).toLocaleDateString("en-US", { month: "short", day: "numeric" });

            return (
              <div key={ms.id} className="relative flex items-start gap-3" data-testid={`milestone-${ms.id}`}>
                {/* Dot on timeline */}
                <div className="absolute -left-6 w-[22px] h-[22px] rounded-full flex items-center justify-center bg-white"
                  style={{ border: `2px solid ${config.color}` }}>
                  <Icon className="w-2.5 h-2.5" style={{ color: config.color }} />
                </div>

                <div className="flex-1 min-w-0 pb-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium" style={{ color: "var(--cm-text, #1e293b)" }}>
                      {ms.label}
                    </span>
                    <span className="text-[11px]" style={{ color: "var(--cm-text-3, #94a3b8)" }}>
                      {dateStr}
                    </span>
                  </div>
                  <p className="text-xs mt-0.5" style={{ color: "var(--cm-text-2, #64748b)" }}>
                    {ms.detail}
                  </p>
                  {ms.school && (
                    <span className="inline-block mt-1 text-[10px] font-medium px-1.5 py-0.5 rounded"
                      style={{ backgroundColor: "rgba(59,130,246,0.08)", color: "#3b82f6" }}>
                      {ms.school}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default RecruitingTimeline;

import { MessageSquare, UserPlus, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

const ROLE_ORDER = { club_coach: 0, parent: 1, athlete: 2, assistant_coach: 3, advisor: 4 };

function PodMembers({ members, unassignedCount }) {
  if (!members || members.length === 0) return null;

  const sorted = [...members].sort((a, b) => (ROLE_ORDER[a.role] ?? 9) - (ROLE_ORDER[b.role] ?? 9));

  const getActivityDot = (status, lastActive) => {
    if (status === "active") return "bg-emerald-500";
    const days = lastActive ? Math.floor((Date.now() - new Date(lastActive).getTime()) / 86400000) : 99;
    if (days <= 7) return "bg-amber-400";
    return "bg-red-400";
  };

  const getActivityLabel = (lastActive) => {
    if (!lastActive) return "";
    const days = Math.floor((Date.now() - new Date(lastActive).getTime()) / 86400000);
    if (days === 0) return "Active today";
    if (days === 1) return "Active yesterday";
    return `${days} days ago`;
  };

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm" data-testid="pod-members">
      <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Support Team</h3>

      <div className="space-y-3">
        {sorted.map((member) => (
          <div key={member.id} className="flex items-start gap-3" data-testid={`pod-member-${member.role}`}>
            <div className="relative mt-0.5">
              <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-xs font-semibold text-gray-600">
                {member.name.charAt(0)}
              </div>
              <div className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white ${getActivityDot(member.status, member.last_active)}`} />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-900 truncate">{member.name}</span>
                {member.is_primary && (
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-primary/10 text-primary">Primary</span>
                )}
              </div>
              <p className="text-xs text-gray-500">{member.role_label}</p>
              <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-400">
                <span>{getActivityLabel(member.last_active)}</span>
                {member.tasks_owned > 0 && (
                  <span>
                    {member.tasks_owned} {member.tasks_owned === 1 ? "task" : "tasks"}
                    {member.tasks_overdue > 0 && <span className="text-red-500 font-medium"> ({member.tasks_overdue} overdue)</span>}
                  </span>
                )}
              </div>
            </div>

            <Button size="sm" variant="ghost" className="p-1.5 h-auto" data-testid={`message-member-${member.role}`}>
              <MessageSquare className="w-3.5 h-3.5 text-gray-400" />
            </Button>
          </div>
        ))}
      </div>

      {/* Ownership summary */}
      <div className="mt-4 pt-3 border-t border-gray-100">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-3 text-gray-500">
            {sorted.map((m) => (
              <span key={m.id}>
                <span className="font-medium text-gray-700">{m.name.split(" ")[0]}:</span> {m.tasks_owned}
              </span>
            ))}
          </div>
        </div>
        {unassignedCount > 0 && (
          <div className="flex items-center gap-1.5 mt-2 text-xs text-amber-700 font-medium" data-testid="ownership-gap-warning">
            <AlertTriangle className="w-3.5 h-3.5" />
            {unassignedCount} unassigned {unassignedCount === 1 ? "action" : "actions"}
          </div>
        )}
      </div>

      <Button variant="outline" size="sm" className="w-full mt-3 rounded-full text-xs gap-1.5" data-testid="add-pod-member">
        <UserPlus className="w-3.5 h-3.5" /> Add Pod Member
      </Button>
    </div>
  );
}

export default PodMembers;

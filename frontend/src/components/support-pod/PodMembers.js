import { MessageSquare, UserPlus, AlertTriangle, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";

const ROLE_ORDER = { club_coach: 0, parent: 1, athlete: 2, assistant_coach: 3, advisor: 4 };

function PodMembers({ members, unassignedCount }) {
  if (!members || members.length === 0) return null;

  const sorted = [...members].sort((a, b) => (ROLE_ORDER[a.role] ?? 9) - (ROLE_ORDER[b.role] ?? 9));
  const primary = sorted.find(m => m.is_primary);
  const others = sorted.filter(m => !m.is_primary);

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

  const renderMember = (member, isPrimary = false) => (
    <div key={member.id} className={`flex items-start gap-3 ${isPrimary ? "p-3 rounded-lg" : ""}`}
      style={isPrimary ? { backgroundColor: "rgba(13,148,136,0.04)", border: "1px solid rgba(13,148,136,0.12)" } : {}}
      data-testid={`pod-member-${member.role}`}>
      <div className="relative mt-0.5">
        <div className={`flex items-center justify-center text-xs font-semibold rounded-full ${isPrimary ? "w-10 h-10" : "w-8 h-8"}`}
          style={{ backgroundColor: isPrimary ? "rgba(13,148,136,0.15)" : "var(--cm-surface-2)", color: isPrimary ? "#0d9488" : "var(--cm-text-2)" }}>
          {member.name.charAt(0)}
        </div>
        <div className={`absolute -bottom-0.5 -right-0.5 rounded-full border-2 border-white ${isPrimary ? "w-3 h-3" : "w-2.5 h-2.5"} ${getActivityDot(member.status, member.last_active)}`} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={`font-medium truncate ${isPrimary ? "text-sm" : "text-sm"}`} style={{ color: "var(--cm-text)" }}>
            {member.name}
          </span>
          {isPrimary && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider"
              style={{ backgroundColor: "rgba(13,148,136,0.12)", color: "#0d9488" }}>
              <Crown className="w-2.5 h-2.5" />
              Primary Coach
            </span>
          )}
        </div>
        <p className="text-xs" style={{ color: "var(--cm-text-3)" }}>{member.role_label}</p>
        <div className="flex items-center gap-3 mt-0.5 text-xs" style={{ color: "var(--cm-text-3)" }}>
          <span>{getActivityLabel(member.last_active)}</span>
          {member.tasks_owned > 0 && (
            <span>
              {member.tasks_owned} task{member.tasks_owned !== 1 ? "s" : ""}
              {member.tasks_overdue > 0 && <span className="text-red-500 font-medium"> ({member.tasks_overdue} overdue)</span>}
            </span>
          )}
        </div>
      </div>

      <Button size="sm" variant="ghost" className="p-1.5 h-auto" data-testid={`message-member-${member.role}`}>
        <MessageSquare className="w-3.5 h-3.5" style={{ color: "var(--cm-text-3)" }} />
      </Button>
    </div>
  );

  return (
    <div className="rounded-xl border p-5" style={{ backgroundColor: "var(--cm-surface)", borderColor: "var(--cm-border)" }} data-testid="pod-members">
      <h3 className="text-[11px] font-bold uppercase tracking-widest mb-4" style={{ color: "var(--cm-text-3)" }}>Support Team</h3>

      {/* Primary coach — visually prominent */}
      {primary && (
        <div className="mb-4">
          {renderMember(primary, true)}
        </div>
      )}

      {/* Other members */}
      <div className="space-y-3">
        {others.map(m => renderMember(m))}
      </div>

      {/* Ownership summary */}
      <div className="mt-4 pt-3" style={{ borderTop: "1px solid var(--cm-border)" }}>
        <div className="flex items-center gap-3 text-xs flex-wrap" style={{ color: "var(--cm-text-3)" }}>
          {sorted.map(m => (
            <span key={m.id}>
              <span className="font-medium" style={{ color: "var(--cm-text-2)" }}>{m.name.split(" ")[0]}:</span> {m.tasks_owned}
            </span>
          ))}
        </div>
        {unassignedCount > 0 && (
          <div className="flex items-center gap-1.5 mt-2 text-xs text-amber-700 font-medium" data-testid="ownership-gap-warning">
            <AlertTriangle className="w-3.5 h-3.5" />
            {unassignedCount} unassigned action{unassignedCount !== 1 ? "s" : ""}
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

import { MessageSquare, Phone, Crown } from "lucide-react";

const ROLE_ORDER = { club_coach: 0, parent: 1, athlete: 2, assistant_coach: 3, advisor: 4 };

function PodMembers({ members, onMessage, onLogCall }) {
  if (!members || members.length === 0) return null;

  const sorted = [...members].sort((a, b) => (ROLE_ORDER[a.role] ?? 9) - (ROLE_ORDER[b.role] ?? 9));

  const dotColor = (status, lastActive) => {
    if (status === "active") return "bg-emerald-400";
    const days = lastActive ? Math.floor((Date.now() - new Date(lastActive).getTime()) / 86400000) : 99;
    return days <= 7 ? "bg-amber-400" : "bg-slate-300";
  };

  const lastSeen = (lastActive) => {
    if (!lastActive) return "";
    const days = Math.floor((Date.now() - new Date(lastActive).getTime()) / 86400000);
    if (days === 0) return "Today";
    if (days === 1) return "Yesterday";
    return `${days}d ago`;
  };

  return (
    <div className="rounded-2xl border border-slate-100 bg-white divide-y divide-slate-50 overflow-hidden" data-testid="pod-members">
      {sorted.map((m) => {
        const isPrimary = m.is_primary;
        return (
          <div key={m.id} className="flex items-center gap-3 px-4 py-3" data-testid={`pod-member-${m.role}`}>
            {/* Avatar + status dot */}
            <div className="relative shrink-0">
              <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-xs font-semibold text-slate-500">
                {m.name.charAt(0)}
              </div>
              <div className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white ${dotColor(m.status, m.last_active)}`} />
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-medium text-slate-800 truncate">{m.name}</span>
                {isPrimary && <Crown className="w-3 h-3 text-amber-400 shrink-0" />}
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                <span>{m.role_label}</span>
                {lastSeen(m.last_active) && (
                  <>
                    <span>·</span>
                    <span>{lastSeen(m.last_active)}</span>
                  </>
                )}
              </div>
            </div>

            {/* Quick actions */}
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={() => onMessage?.()}
                className="p-2 rounded-lg text-slate-300 hover:text-slate-500 hover:bg-slate-50 transition-colors"
                data-testid={`message-member-${m.role}`}
              >
                <MessageSquare className="w-4 h-4" />
              </button>
              <button
                onClick={() => onLogCall?.()}
                className="p-2 rounded-lg text-slate-300 hover:text-slate-500 hover:bg-slate-50 transition-colors"
                data-testid={`call-member-${m.role}`}
              >
                <Phone className="w-4 h-4" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default PodMembers;

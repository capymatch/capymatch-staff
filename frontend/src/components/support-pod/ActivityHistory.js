import { useState, useMemo } from "react";
import { FileText, UserPlus, MessageSquare, CheckCircle, Plus, ShieldAlert, ArrowRight, Phone } from "lucide-react";

const TYPE_META = {
  note: { icon: FileText, color: "text-slate-500", label: "Note" },
  assignment: { icon: UserPlus, color: "text-blue-500", label: "Reassignment" },
  message: { icon: MessageSquare, color: "text-emerald-500", label: "Message" },
  resolution: { icon: CheckCircle, color: "text-emerald-600", label: "Resolved" },
  action_created: { icon: Plus, color: "text-blue-500", label: "Action" },
  action_updated: { icon: CheckCircle, color: "text-emerald-500", label: "Updated" },
  blocker_flagged: { icon: ShieldAlert, color: "text-red-500", label: "Blocker" },
  stage_change: { icon: ArrowRight, color: "text-purple-500", label: "Stage Change" },
  call: { icon: Phone, color: "text-amber-500", label: "Call" },
};

function ActivityHistory({ timeline }) {
  const [filter, setFilter] = useState("all");

  const entries = useMemo(() => {
    if (!timeline) return [];
    const all = [];
    (timeline.notes || []).forEach(n => {
      const type = n.tag === "Call" ? "call" : n.tag === "Message" ? "message" : "note";
      all.push({ ...n, type, time: n.created_at });
    });
    (timeline.assignments || []).forEach(a => all.push({ ...a, type: "assignment", time: a.created_at }));
    (timeline.messages || []).forEach(m => all.push({ ...m, type: "message", time: m.created_at }));
    (timeline.resolutions || []).forEach(r => all.push({ ...r, type: "resolution", time: r.created_at }));
    (timeline.action_events || []).forEach(e => all.push({ ...e, time: e.created_at }));
    all.sort((a, b) => new Date(b.time) - new Date(a.time));
    return all;
  }, [timeline]);

  const filtered = filter === "all" ? entries : entries.filter(e => e.type === filter);

  const grouped = useMemo(() => {
    const groups = {};
    const today = new Date().toDateString();
    const yesterday = new Date(Date.now() - 86400000).toDateString();
    filtered.forEach(entry => {
      const ds = new Date(entry.time).toDateString();
      const label = ds === today ? "Today" : ds === yesterday ? "Yesterday" : new Date(entry.time).toLocaleDateString("en-US", { month: "short", day: "numeric" });
      if (!groups[label]) groups[label] = [];
      groups[label].push(entry);
    });
    return groups;
  }, [filtered]);

  const filters = [
    { value: "all", label: "All" },
    { value: "note", label: "Notes" },
    { value: "call", label: "Calls" },
    { value: "message", label: "Messages" },
    { value: "assignment", label: "Assigned" },
  ];

  const getDescription = (entry) => {
    switch (entry.type) {
      case "assignment": return `Reassigned to ${entry.new_owner || "—"}`;
      case "resolution": return entry.resolution_note || "Resolved";
      case "action_created":
      case "action_updated": return entry.description || "Action updated";
      case "blocker_flagged": return entry.description || entry.text || "Blocker";
      case "stage_change": return entry.description || "Stage changed";
      default: return entry.text || "";
    }
  };

  const getActor = (entry) => {
    return entry.created_by_name || entry.author || entry.actor || entry.sender || entry.resolved_by || "Coach";
  };

  return (
    <div className="rounded-2xl border border-slate-100 bg-white overflow-hidden" data-testid="activity-history">
      {/* Filters */}
      <div className="px-4 py-2.5 border-b border-slate-50 overflow-x-auto no-scrollbar">
        <div className="flex items-center gap-1">
          {filters.map(f => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`px-2.5 py-1 rounded-full text-[11px] font-medium whitespace-nowrap transition-colors ${
                filter === f.value ? "bg-slate-800 text-white" : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"
              }`}
              data-testid={`timeline-filter-${f.value}`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {entries.length === 0 ? (
        <div className="px-5 py-10 text-center">
          <p className="text-sm text-slate-400">No activity yet</p>
          <p className="text-[11px] text-slate-300 mt-1">Pod actions will appear here</p>
        </div>
      ) : (
        <div className="divide-y divide-slate-50">
          {Object.entries(grouped).map(([dateLabel, dateEntries]) => (
            <div key={dateLabel}>
              <div className="px-4 py-1.5 bg-slate-50/60">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-300">{dateLabel}</p>
              </div>
              {dateEntries.map(entry => {
                const meta = TYPE_META[entry.type] || TYPE_META.note;
                const Icon = meta.icon;
                const time = new Date(entry.time).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
                return (
                  <div key={entry.id} className="flex items-start gap-3 px-4 py-2.5" data-testid={`timeline-entry-${entry.id}`}>
                    <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${meta.color}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-700 leading-snug">{getDescription(entry)}</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {getActor(entry)} · {time}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default ActivityHistory;

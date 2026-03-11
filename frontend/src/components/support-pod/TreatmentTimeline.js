import { useState, useMemo } from "react";
import { FileText, UserPlus, MessageSquare, CheckCircle, Plus, ShieldAlert, ArrowRight, Phone } from "lucide-react";

const TYPE_META = {
  note: { icon: FileText, color: "#6b7280", bg: "bg-gray-100", borderColor: "#d1d5db", label: "Note" },
  assignment: { icon: UserPlus, color: "#3b82f6", bg: "bg-blue-100", borderColor: "#93c5fd", label: "Reassignment" },
  message: { icon: MessageSquare, color: "#10b981", bg: "bg-emerald-100", borderColor: "#6ee7b7", label: "Message" },
  resolution: { icon: CheckCircle, color: "#059669", bg: "bg-emerald-100", borderColor: "#6ee7b7", label: "Resolved" },
  action_created: { icon: Plus, color: "#3b82f6", bg: "bg-blue-100", borderColor: "#93c5fd", label: "Action" },
  action_updated: { icon: CheckCircle, color: "#10b981", bg: "bg-emerald-100", borderColor: "#6ee7b7", label: "Updated" },
  blocker_flagged: { icon: ShieldAlert, color: "#ef4444", bg: "bg-red-100", borderColor: "#fca5a5", label: "Blocker" },
  stage_change: { icon: ArrowRight, color: "#8b5cf6", bg: "bg-purple-100", borderColor: "#c4b5fd", label: "Stage Change" },
  call: { icon: Phone, color: "#f59e0b", bg: "bg-amber-100", borderColor: "#fcd34d", label: "Call" },
};

function TreatmentTimeline({ timeline }) {
  const [filter, setFilter] = useState("all");

  const entries = useMemo(() => {
    if (!timeline) return [];
    const all = [];

    (timeline.notes || []).forEach((n) => {
      const type = n.tag === "Call" ? "call" : n.tag === "Message" ? "message" : "note";
      all.push({ ...n, type, time: n.created_at });
    });
    (timeline.assignments || []).forEach((a) => all.push({ ...a, type: "assignment", time: a.created_at }));
    (timeline.messages || []).forEach((m) => all.push({ ...m, type: "message", time: m.created_at }));
    (timeline.resolutions || []).forEach((r) => all.push({ ...r, type: "resolution", time: r.created_at }));
    (timeline.action_events || []).forEach((e) => all.push({ ...e, time: e.created_at }));

    all.sort((a, b) => new Date(b.time) - new Date(a.time));
    return all;
  }, [timeline]);

  const filtered = filter === "all" ? entries : entries.filter((e) => e.type === filter);

  const grouped = useMemo(() => {
    const groups = {};
    const today = new Date().toDateString();
    const yesterday = new Date(Date.now() - 86400000).toDateString();

    filtered.forEach((entry) => {
      const dateStr = new Date(entry.time).toDateString();
      let label;
      if (dateStr === today) label = "Today";
      else if (dateStr === yesterday) label = "Yesterday";
      else label = new Date(entry.time).toLocaleDateString("en-US", { month: "short", day: "numeric" });

      if (!groups[label]) groups[label] = [];
      groups[label].push(entry);
    });

    return groups;
  }, [filtered]);

  const renderEntry = (entry) => {
    const meta = TYPE_META[entry.type] || TYPE_META.note;
    const Icon = meta.icon;
    const time = new Date(entry.time).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

    return (
      <div key={entry.id} className="flex gap-3 py-2.5" style={{ borderLeft: `3px solid ${meta.borderColor}`, paddingLeft: 12 }} data-testid={`timeline-entry-${entry.id}`}>
        <div className={`w-8 h-8 rounded-full ${meta.bg} flex items-center justify-center shrink-0 mt-0.5`}>
          <Icon className={`w-4 h-4`} style={{ color: meta.color }} />
        </div>
        <div className="flex-1 min-w-0">
          {entry.type === "note" && (
            <>
              <p className="text-sm text-gray-800">{entry.text}</p>
              <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-400">
                <span>{entry.created_by_name || entry.author || "Coach"}</span>
                <span>·</span>
                <span>{time}</span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-medium" style={{ backgroundColor: `${meta.color}15`, color: meta.color }}>
                  {meta.label}
                </span>
                {entry.category && entry.category !== "other" && (
                  <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 text-[10px] font-medium capitalize">{entry.category}</span>
                )}
                {entry.tag && entry.tag !== "Call" && entry.tag !== "Message" && (
                  <span className="px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 text-[10px] font-medium">{entry.tag}</span>
                )}
              </div>
            </>
          )}
          {entry.type === "call" && (
            <>
              <p className="text-sm text-gray-800">{entry.text}</p>
              <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-400">
                <span>{entry.created_by_name || entry.author || "Coach"}</span>
                <span>·</span>
                <span>{time}</span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-medium" style={{ backgroundColor: `${meta.color}15`, color: meta.color }}>
                  {meta.label}
                </span>
              </div>
            </>
          )}
          {entry.type === "assignment" && (
            <>
              <p className="text-sm text-gray-800">
                Reassigned to <span className="font-medium">{entry.new_owner}</span>
              </p>
              {entry.reason && <p className="text-xs text-gray-500 mt-0.5">{entry.reason}</p>}
              <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-400">
                <span>{entry.previous_owner || "Coach Martinez"}</span>
                <span>·</span>
                <span>{time}</span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-medium" style={{ backgroundColor: `${meta.color}15`, color: meta.color }}>
                  {meta.label}
                </span>
              </div>
            </>
          )}
          {entry.type === "message" && (
            <>
              <p className="text-sm text-gray-800">{entry.text}</p>
              <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-400">
                <span>{entry.sender || "Coach Martinez"} {entry.recipient ? `to ${entry.recipient}` : ""}</span>
                <span>·</span>
                <span>{time}</span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-medium" style={{ backgroundColor: `${meta.color}15`, color: meta.color }}>
                  {meta.label}
                </span>
              </div>
            </>
          )}
          {entry.type === "resolution" && (
            <>
              <p className="text-sm font-medium text-emerald-700">{entry.resolution_note}</p>
              <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-400">
                <span>{entry.resolved_by || "Coach Martinez"}</span>
                <span>·</span>
                <span>{time}</span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-medium" style={{ backgroundColor: `${meta.color}15`, color: meta.color }}>
                  {meta.label}
                </span>
              </div>
            </>
          )}
          {(entry.type === "action_created" || entry.type === "action_updated") && (
            <>
              <p className="text-sm text-gray-800">{entry.description}</p>
              <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-400">
                <span>{entry.actor || "Coach Martinez"}</span>
                <span>·</span>
                <span>{time}</span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-medium" style={{ backgroundColor: `${meta.color}15`, color: meta.color }}>
                  {meta.label}
                </span>
              </div>
            </>
          )}
          {entry.type === "blocker_flagged" && (
            <>
              <p className="text-sm text-red-700 font-medium">{entry.description || entry.text}</p>
              <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-400">
                <span>{entry.actor || "Coach"}</span>
                <span>·</span>
                <span>{time}</span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-medium" style={{ backgroundColor: `${meta.color}15`, color: meta.color }}>
                  {meta.label}
                </span>
              </div>
            </>
          )}
          {entry.type === "stage_change" && (
            <>
              <p className="text-sm text-purple-700 font-medium">{entry.description || entry.text}</p>
              <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-400">
                <span>{entry.actor || "System"}</span>
                <span>·</span>
                <span>{time}</span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-medium" style={{ backgroundColor: `${meta.color}15`, color: meta.color }}>
                  {meta.label}
                </span>
              </div>
            </>
          )}
        </div>
      </div>
    );
  };

  const filterOptions = [
    { value: "all", label: "All" },
    { value: "note", label: "Notes" },
    { value: "call", label: "Calls" },
    { value: "message", label: "Messages" },
    { value: "assignment", label: "Assignments" },
    { value: "resolution", label: "Resolutions" },
    { value: "blocker_flagged", label: "Blockers" },
    { value: "stage_change", label: "Stage Changes" },
  ];

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm" data-testid="treatment-timeline">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider shrink-0">Treatment History</h3>
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar w-full sm:w-auto pb-1 sm:pb-0">
          {filterOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setFilter(opt.value)}
              className={`px-2 py-0.5 rounded-full text-[11px] font-medium transition-colors ${
                filter === opt.value
                  ? "bg-primary text-white"
                  : "text-gray-400 hover:text-gray-600 hover:bg-gray-50"
              }`}
              data-testid={`timeline-filter-${opt.value}`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {entries.length === 0 ? (
        <div className="text-center py-8">
          <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-3">
            <FileText className="w-5 h-5 text-gray-300" />
          </div>
          <p className="text-sm text-gray-400">No treatment history yet</p>
          <p className="text-xs text-gray-300 mt-1">Actions taken in this pod will appear here</p>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(grouped).map(([dateLabel, dateEntries]) => (
            <div key={dateLabel}>
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2 border-b border-gray-50 pb-1">
                {dateLabel}
              </p>
              <div className="space-y-1">
                {dateEntries.map(renderEntry)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default TreatmentTimeline;

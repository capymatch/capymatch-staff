import { useState, useMemo } from "react";
import { FileText, UserPlus, MessageSquare, CheckCircle, Plus, ShieldAlert, ArrowRight, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";

const TYPE_META = {
  note: { icon: FileText, color: "text-gray-500", bg: "bg-gray-100", label: "Note" },
  assignment: { icon: UserPlus, color: "text-blue-500", bg: "bg-blue-100", label: "Reassignment" },
  message: { icon: MessageSquare, color: "text-emerald-500", bg: "bg-emerald-100", label: "Message" },
  resolution: { icon: CheckCircle, color: "text-emerald-600", bg: "bg-emerald-100", label: "Resolved" },
  action_created: { icon: Plus, color: "text-blue-500", bg: "bg-blue-100", label: "Action created" },
  action_updated: { icon: CheckCircle, color: "text-emerald-500", bg: "bg-emerald-100", label: "Action updated" },
  blocker_flagged: { icon: ShieldAlert, color: "text-red-500", bg: "bg-red-100", label: "Blocker" },
  stage_change: { icon: ArrowRight, color: "text-purple-500", bg: "bg-purple-100", label: "Stage change" },
};

function TreatmentTimeline({ timeline }) {
  const [filter, setFilter] = useState("all");

  // Flatten all timeline entries into a single sorted list
  const entries = useMemo(() => {
    if (!timeline) return [];

    const all = [];

    (timeline.notes || []).forEach((n) => all.push({ ...n, type: "note", time: n.created_at }));
    (timeline.assignments || []).forEach((a) => all.push({ ...a, type: "assignment", time: a.created_at }));
    (timeline.messages || []).forEach((m) => all.push({ ...m, type: "message", time: m.created_at }));
    (timeline.resolutions || []).forEach((r) => all.push({ ...r, type: "resolution", time: r.created_at }));
    (timeline.action_events || []).forEach((e) => all.push({ ...e, time: e.created_at }));

    // Sort newest first
    all.sort((a, b) => new Date(b.time) - new Date(a.time));

    return all;
  }, [timeline]);

  const filtered = filter === "all" ? entries : entries.filter((e) => e.type === filter);

  // Group by date
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
      <div key={entry.id} className="flex gap-3 py-2.5" data-testid={`timeline-entry-${entry.id}`}>
        <div className={`w-7 h-7 rounded-full ${meta.bg} flex items-center justify-center shrink-0 mt-0.5`}>
          <Icon className={`w-3.5 h-3.5 ${meta.color}`} />
        </div>
        <div className="flex-1 min-w-0">
          {entry.type === "note" && (
            <>
              <p className="text-sm text-gray-800">{entry.text}</p>
              <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-400">
                <span>{entry.created_by_name || entry.author || "Coach"}</span>
                <span>·</span>
                <span>{time}</span>
                {entry.category && entry.category !== "other" && (
                  <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 text-[10px] font-medium capitalize">{entry.category}</span>
                )}
                {entry.tag && (
                  <span className="px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 text-[10px] font-medium">{entry.tag}</span>
                )}
              </div>
            </>
          )}
          {entry.type === "assignment" && (
            <>
              <p className="text-sm text-gray-800">
                Reassigned to <span className="font-medium">{entry.new_owner}</span>
              </p>
              {entry.reason && <p className="text-xs text-gray-500 mt-0.5">{entry.reason}</p>}
              <p className="text-xs text-gray-400 mt-0.5">{entry.previous_owner || "Coach Martinez"} · {time}</p>
            </>
          )}
          {entry.type === "message" && (
            <>
              <p className="text-sm text-gray-800">{entry.text}</p>
              <p className="text-xs text-gray-400 mt-0.5">
                {entry.sender || "Coach Martinez"} → {entry.recipient} · {time}
              </p>
            </>
          )}
          {entry.type === "resolution" && (
            <>
              <p className="text-sm font-medium text-emerald-700">{entry.resolution_note}</p>
              <p className="text-xs text-gray-400 mt-0.5">{entry.resolved_by || "Coach Martinez"} · {time}</p>
            </>
          )}
          {(entry.type === "action_created" || entry.type === "action_updated") && (
            <>
              <p className="text-sm text-gray-800">{entry.description}</p>
              <p className="text-xs text-gray-400 mt-0.5">{entry.actor || "Coach Martinez"} · {time}</p>
            </>
          )}
        </div>
      </div>
    );
  };

  const filterOptions = [
    { value: "all", label: "All" },
    { value: "note", label: "Notes" },
    { value: "assignment", label: "Assignments" },
    { value: "message", label: "Messages" },
    { value: "resolution", label: "Resolutions" },
  ];

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm" data-testid="treatment-timeline">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Treatment History</h3>
        <div className="flex items-center gap-1">
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
              <div className="divide-y divide-gray-50">
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

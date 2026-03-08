import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ShieldAlert, Zap, AlertTriangle, Users, Mail,
  ExternalLink, UserPlus, Bell, ClipboardCheck, FileText,
  ChevronDown, ChevronUp,
} from "lucide-react";

const CATEGORY_CONFIG = {
  event_follow_up: { icon: Mail, label: "Follow-Up Overdue" },
  ownership_gap: { icon: Users, label: "Ownership Gap" },
  momentum_drop: { icon: Zap, label: "Momentum Drop" },
  blocker: { icon: ShieldAlert, label: "Blocker" },
  engagement_drop: { icon: AlertTriangle, label: "Engagement Drop" },
  deadline_proximity: { icon: AlertTriangle, label: "Event Prep Risk" },
  readiness_issue: { icon: ShieldAlert, label: "Readiness Issue" },
};

const SEVERITY = {
  red: { ring: "ring-red-200 bg-red-50", dot: "bg-red-500", text: "text-red-700", label: "Critical" },
  amber: { ring: "ring-orange-200 bg-orange-50", dot: "bg-orange-500", text: "text-orange-700", label: "Attention" },
  blue: { ring: "ring-yellow-200 bg-yellow-50", dot: "bg-yellow-500", text: "text-yellow-700", label: "Warning" },
};

const ACTIONS_BY_CATEGORY = {
  event_follow_up: [
    { key: "open", icon: ExternalLink, label: "Open Athlete" },
    { key: "assign", icon: UserPlus, label: "Assign Coach" },
    { key: "reminder", icon: Bell, label: "Send Reminder" },
  ],
  ownership_gap: [
    { key: "open", icon: ExternalLink, label: "Open Athlete" },
    { key: "assign", icon: UserPlus, label: "Assign Coach" },
    { key: "reminder", icon: Bell, label: "Send Reminder" },
  ],
  momentum_drop: [
    { key: "open", icon: ExternalLink, label: "Open Athlete" },
    { key: "checkin", icon: ClipboardCheck, label: "Log Check-In" },
    { key: "reminder", icon: Bell, label: "Send Reminder" },
  ],
  blocker: [
    { key: "open", icon: ExternalLink, label: "Open Athlete" },
    { key: "document", icon: FileText, label: "Request Document" },
    { key: "reminder", icon: Bell, label: "Send Reminder" },
  ],
  engagement_drop: [
    { key: "open", icon: ExternalLink, label: "Open Athlete" },
    { key: "reminder", icon: Bell, label: "Send Reminder" },
    { key: "checkin", icon: ClipboardCheck, label: "Log Check-In" },
  ],
  deadline_proximity: [
    { key: "open", icon: ExternalLink, label: "Open Athlete" },
    { key: "checkin", icon: ClipboardCheck, label: "Log Check-In" },
    { key: "reminder", icon: Bell, label: "Send Reminder" },
  ],
  readiness_issue: [
    { key: "open", icon: ExternalLink, label: "Open Athlete" },
    { key: "document", icon: FileText, label: "Request Document" },
    { key: "reminder", icon: Bell, label: "Send Reminder" },
  ],
};

function parseProblem(text) {
  if (!text) return { description: "", impact: "" };
  const parts = text.split(" \u2014 ");
  if (parts.length >= 2) return { description: parts[0], impact: parts.slice(1).join(" — ") };
  const dashParts = text.split(" — ");
  if (dashParts.length >= 2) return { description: dashParts[0], impact: dashParts.slice(1).join(" — ") };
  return { description: text, impact: "" };
}

function groupAlerts(items) {
  const groups = {};
  for (const item of items) {
    const key = item.category;
    const cat = CATEGORY_CONFIG[key] || CATEGORY_CONFIG.momentum_drop;
    if (!groups[key]) groups[key] = { ...cat, category: key, items: [] };
    groups[key].items.push(item);
  }
  return Object.values(groups);
}

function ActionButton({ icon: Icon, label, onClick }) {
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium text-slate-500 bg-slate-50 hover:bg-slate-100 hover:text-slate-700 transition-colors"
      data-testid={`quick-action-${label.toLowerCase().replace(/\s/g, "-")}`}
    >
      <Icon className="w-3 h-3" />
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

function AthleteRow({ item, navigate }) {
  const sev = SEVERITY[item.badge_color] || SEVERITY.amber;
  const { description, impact } = parseProblem(item.why_this_surfaced);
  const actions = ACTIONS_BY_CATEGORY[item.category] || ACTIONS_BY_CATEGORY.momentum_drop;

  const handleAction = (key) => {
    if (key === "open") navigate(`/support-pods/${item.athlete_id}`);
    else if (key === "assign") navigate("/roster");
    else navigate(`/support-pods/${item.athlete_id}`);
  };

  return (
    <div
      data-testid={`attention-item-${item.athlete_id}`}
      className="group px-5 py-4 hover:bg-slate-50/60 transition-colors cursor-pointer"
      onClick={() => navigate(`/support-pods/${item.athlete_id}`)}
    >
      <div className="flex items-start justify-between gap-4">
        {/* Left: severity dot + content */}
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <span className={`w-2 h-2 rounded-full shrink-0 mt-1.5 ${sev.dot}`} />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-900 leading-snug">{item.athlete_name}</p>
            <p className="text-[13px] text-slate-600 leading-snug mt-0.5">{description}</p>
            {impact && (
              <p className={`text-xs font-medium mt-1 ${sev.text}`}>{impact}</p>
            )}
          </div>
        </div>

        {/* Right: quick actions */}
        <div className="flex items-center gap-1.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
          {actions.map((a) => (
            <ActionButton key={a.key} icon={a.icon} label={a.label} onClick={() => handleAction(a.key)} />
          ))}
        </div>
      </div>
    </div>
  );
}

function CategoryGroup({ group, navigate }) {
  const [expanded, setExpanded] = useState(true);
  const GroupIcon = group.icon;
  const collapsible = group.items.length > 3;
  const visibleItems = expanded ? group.items : group.items.slice(0, 3);
  const hiddenCount = group.items.length - 3;

  return (
    <div
      data-testid={`attention-group-${group.label.toLowerCase().replace(/\s/g, "-")}`}
      className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden"
    >
      {/* Category header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-slate-100 flex items-center justify-center">
            <GroupIcon className="w-3.5 h-3.5 text-slate-500" />
          </div>
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">{group.label}</span>
          <span className="text-[11px] font-bold text-slate-400">({group.items.length})</span>
        </div>
        {collapsible && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 text-[11px] font-medium text-slate-400 hover:text-slate-600 transition-colors"
            data-testid={`toggle-${group.category}`}
          >
            {expanded ? "Collapse" : `Show ${hiddenCount} more`}
            {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        )}
      </div>

      {/* Athlete rows */}
      <div className="divide-y divide-slate-50">
        {visibleItems.map((item) => (
          <AthleteRow key={`${item.athlete_id}_${item.category}`} item={item} navigate={navigate} />
        ))}
      </div>

      {/* Collapsed indicator */}
      {collapsible && !expanded && (
        <button
          onClick={() => setExpanded(true)}
          className="w-full py-2.5 text-center text-[11px] font-medium text-slate-400 hover:text-slate-600 hover:bg-slate-50 border-t border-slate-50 transition-colors"
        >
          +{hiddenCount} more athlete{hiddenCount > 1 ? "s" : ""}
        </button>
      )}
    </div>
  );
}

export default function NeedsAttentionCard({ items = [] }) {
  const navigate = useNavigate();

  if (!items.length) {
    return (
      <section data-testid="needs-attention-card">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Needs Attention</span>
        </div>
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm px-6 py-10 text-center">
          <div className="w-9 h-9 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-2.5">
            <Zap className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-sm font-medium text-slate-600">All clear</p>
          <p className="text-xs text-slate-400 mt-1">No interventions right now.</p>
        </div>
      </section>
    );
  }

  const grouped = groupAlerts(items);
  const uniqueAthletes = new Set(items.map((i) => i.athlete_id)).size;

  return (
    <section data-testid="needs-attention-card">
      {/* Section header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <span className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Needs Attention</span>
        </div>
        <span className="text-xs text-slate-400">
          {items.length} issue{items.length !== 1 ? "s" : ""} across {uniqueAthletes} athlete{uniqueAthletes !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Category card groups */}
      <div className="space-y-3">
        {grouped.map((group) => (
          <CategoryGroup key={group.category} group={group} navigate={navigate} />
        ))}
      </div>
    </section>
  );
}

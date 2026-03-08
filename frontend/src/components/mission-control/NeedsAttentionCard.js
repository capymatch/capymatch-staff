import { useNavigate } from "react-router-dom";
import { ShieldAlert, Clock, Zap, AlertTriangle, Users, Target, Eye, UserPlus, Mail } from "lucide-react";

const CATEGORY_CONFIG = {
  momentum_drop: { icon: Zap, label: "Momentum Drop", group: "Momentum Drop" },
  blocker: { icon: ShieldAlert, label: "Blocker", group: "Blocker" },
  deadline_proximity: { icon: Clock, label: "Event Prep Risk", group: "Event Prep Risk" },
  engagement_drop: { icon: AlertTriangle, label: "Inactive Coach", group: "Inactive Coach" },
  ownership_gap: { icon: Users, label: "Unassigned Athlete", group: "Unassigned Athlete" },
  readiness_issue: { icon: Target, label: "Event Prep Risk", group: "Event Prep Risk" },
};

const COLOR_MAP = {
  red: { border: "border-l-red-500", badge: "bg-red-100 text-red-700", accent: "text-red-700" },
  amber: { border: "border-l-amber-500", badge: "bg-amber-100 text-amber-700", accent: "text-amber-700" },
  blue: { border: "border-l-blue-500", badge: "bg-blue-100 text-blue-700", accent: "text-blue-700" },
};

function QuickAction({ icon: Icon, label, onClick }) {
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold text-slate-500 hover:text-slate-700 bg-slate-50 hover:bg-slate-100 transition-colors"
      data-testid={`quick-action-${label.toLowerCase().replace(/\s/g, "-")}`}
    >
      <Icon className="w-3 h-3" />
      {label}
    </button>
  );
}

function groupAlerts(items) {
  const groups = {};
  for (const item of items) {
    const cat = CATEGORY_CONFIG[item.category] || CATEGORY_CONFIG.momentum_drop;
    const key = cat.group;
    if (!groups[key]) groups[key] = { ...cat, items: [], category: item.category, badge_color: item.badge_color };
    groups[key].items.push(item);
  }
  return Object.values(groups);
}

export default function NeedsAttentionCard({ items = [] }) {
  const navigate = useNavigate();

  if (!items.length) {
    return (
      <section data-testid="needs-attention-card">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Needs Attention</span>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-8 text-center">
          <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-3">
            <Zap className="w-5 h-5 text-emerald-500" />
          </div>
          <p className="text-sm font-medium text-slate-600">All clear</p>
          <p className="text-xs text-slate-400 mt-1">No critical interventions right now.</p>
        </div>
      </section>
    );
  }

  const grouped = groupAlerts(items);

  return (
    <section data-testid="needs-attention-card">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Needs Attention</span>
          <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-[11px] font-bold min-w-[22px]">
            {items.length}
          </span>
        </div>
      </div>

      <div className="space-y-3">
        {grouped.map((group) => {
          const GroupIcon = group.icon;
          const colors = COLOR_MAP[group.badge_color] || COLOR_MAP.amber;

          // Single item — show directly
          if (group.items.length === 1) {
            const item = group.items[0];
            const isUnassigned = item.category === "ownership_gap";
            return (
              <div
                key={`${item.athlete_id}_${item.category}`}
                data-testid={`attention-item-${item.athlete_id}`}
                className={`bg-white rounded-xl border border-gray-100 border-l-[3px] ${colors.border} px-5 py-4`}
              >
                <div className="flex items-start gap-3">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold uppercase tracking-wide ${colors.badge} shrink-0`}>
                    <GroupIcon className="w-3.5 h-3.5" />
                    {group.label}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-semibold leading-snug ${colors.accent}`}>
                      {item.athlete_name} — {item.why_this_surfaced}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-3">
                  <QuickAction icon={Eye} label="View" onClick={() => navigate(`/support-pods/${item.athlete_id}`)} />
                  {isUnassigned ? (
                    <QuickAction icon={UserPlus} label="Assign Coach" onClick={() => navigate("/roster")} />
                  ) : (
                    <QuickAction icon={Mail} label="Nudge" onClick={() => navigate("/roster")} />
                  )}
                </div>
              </div>
            );
          }

          // Multiple items in same category — grouped display
          return (
            <div
              key={group.group}
              data-testid={`attention-group-${group.group.toLowerCase().replace(/\s/g, "-")}`}
              className={`bg-white rounded-xl border border-gray-100 border-l-[3px] ${colors.border} px-5 py-4`}
            >
              <div className="flex items-start gap-3 mb-3">
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold uppercase tracking-wide ${colors.badge} shrink-0`}>
                  <GroupIcon className="w-3.5 h-3.5" />
                  {group.label}
                </span>
                <p className={`text-sm font-semibold ${colors.accent}`}>
                  {group.items.length} athletes
                </p>
              </div>
              <div className="space-y-2 ml-0">
                {group.items.map((item) => (
                  <div
                    key={item.athlete_id}
                    data-testid={`attention-item-${item.athlete_id}`}
                    className="flex items-center justify-between py-1.5 group cursor-pointer"
                    onClick={() => navigate(`/support-pods/${item.athlete_id}`)}
                  >
                    <p className="text-sm text-slate-600 group-hover:text-slate-800 transition-colors">
                      <span className="font-medium">{item.athlete_name}</span>
                      <span className="text-slate-400"> — {item.why_this_surfaced}</span>
                    </p>
                    <Eye className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-500 transition-colors shrink-0 ml-2" />
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

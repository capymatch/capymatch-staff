import { useNavigate } from "react-router-dom";
import { ShieldAlert, Clock, Zap, AlertTriangle, Users, Target, Eye, UserPlus, Mail, ChevronRight } from "lucide-react";

const CATEGORY_CONFIG = {
  momentum_drop: { icon: Zap, label: "Momentum Drop" },
  blocker: { icon: ShieldAlert, label: "Blocker" },
  deadline_proximity: { icon: Clock, label: "Event Prep Risk" },
  engagement_drop: { icon: AlertTriangle, label: "Engagement Drop" },
  ownership_gap: { icon: Users, label: "Ownership Gap" },
  readiness_issue: { icon: Target, label: "Readiness Issue" },
  event_follow_up: { icon: Mail, label: "Follow-Up Overdue" },
};

const SEVERITY_DOT = {
  red: "bg-rose-500",
  amber: "bg-amber-500",
  blue: "bg-blue-500",
};

function groupAlerts(items) {
  const groups = {};
  for (const item of items) {
    const cat = CATEGORY_CONFIG[item.category] || CATEGORY_CONFIG.momentum_drop;
    const key = item.category;
    if (!groups[key]) groups[key] = { ...cat, category: key, items: [] };
    groups[key].items.push(item);
  }
  return Object.values(groups);
}

export default function NeedsAttentionCard({ items = [] }) {
  const navigate = useNavigate();

  if (!items.length) {
    return (
      <section data-testid="needs-attention-card">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/30">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Needs Attention</span>
            </div>
          </div>
          <div className="px-6 py-10 text-center">
            <div className="w-9 h-9 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-2.5">
              <Zap className="w-4 h-4 text-emerald-500" />
            </div>
            <p className="text-sm font-medium text-slate-600">All clear</p>
            <p className="text-xs text-slate-400 mt-1">No interventions right now.</p>
          </div>
        </div>
      </section>
    );
  }

  const grouped = groupAlerts(items);

  return (
    <section data-testid="needs-attention-card">
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Panel header */}
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/30 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Needs Attention</span>
            <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-md bg-slate-900 text-white text-[10px] font-bold min-w-[22px]">
              {items.length}
            </span>
          </div>
        </div>

        {/* Grouped list */}
        <div className="divide-y divide-slate-100" role="list">
          {grouped.map((group) => {
            const GroupIcon = group.icon;
            return (
              <div key={group.category} data-testid={`attention-group-${group.label.toLowerCase().replace(/\s/g, "-")}`}>
                {/* Group header */}
                <div className="px-6 py-2 bg-slate-50/80 flex items-center gap-2">
                  <GroupIcon className="w-3.5 h-3.5 text-slate-400" />
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{group.label}</span>
                  {group.items.length > 1 && (
                    <span className="text-[10px] text-slate-400">{group.items.length}</span>
                  )}
                </div>

                {/* Items */}
                {group.items.map((item) => (
                  <div
                    key={`${item.athlete_id}_${item.category}`}
                    role="listitem"
                    data-testid={`attention-item-${item.athlete_id}`}
                    className="group flex items-center justify-between px-6 py-3 hover:bg-slate-50 transition-colors cursor-pointer"
                    onClick={() => navigate(`/support-pods/${item.athlete_id}`)}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${SEVERITY_DOT[item.badge_color] || "bg-slate-400"}`} />
                      <div className="min-w-0">
                        <span className="text-sm font-semibold text-slate-900">{item.athlete_name}</span>
                        <span className="text-sm text-slate-400 ml-1.5">— {item.why_this_surfaced}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0 ml-4 opacity-0 group-hover:opacity-100 transition-opacity">
                      {item.category === "ownership_gap" ? (
                        <button
                          onClick={(e) => { e.stopPropagation(); navigate("/roster"); }}
                          className="px-2.5 py-1 text-[11px] font-medium text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-md transition-colors"
                          data-testid={`quick-action-assign-${item.athlete_id}`}
                        >
                          Assign
                        </button>
                      ) : (
                        <button
                          onClick={(e) => { e.stopPropagation(); navigate("/roster"); }}
                          className="px-2.5 py-1 text-[11px] font-medium text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-md transition-colors"
                          data-testid={`quick-action-nudge-${item.athlete_id}`}
                        >
                          Nudge
                        </button>
                      )}
                      <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-500 transition-colors" />
                    </div>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

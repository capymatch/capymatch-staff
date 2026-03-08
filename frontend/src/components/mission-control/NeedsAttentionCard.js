import { useNavigate } from "react-router-dom";
import { ShieldAlert, Clock, Zap, AlertTriangle, Users, Target, Eye, UserPlus, Mail } from "lucide-react";

const CATEGORY_CONFIG = {
  momentum_drop: { icon: Zap, label: "Momentum Drop" },
  blocker: { icon: ShieldAlert, label: "Blocker" },
  deadline_proximity: { icon: Clock, label: "Deadline" },
  engagement_drop: { icon: AlertTriangle, label: "Engagement" },
  ownership_gap: { icon: Users, label: "Unassigned" },
  readiness_issue: { icon: Target, label: "Readiness" },
};

const COLOR_MAP = {
  red: { border: "border-l-red-500", badge: "bg-red-50 text-red-600", accent: "text-red-600" },
  amber: { border: "border-l-amber-500", badge: "bg-amber-50 text-amber-600", accent: "text-amber-600" },
  blue: { border: "border-l-blue-500", badge: "bg-blue-50 text-blue-600", accent: "text-blue-600" },
};

function QuickAction({ icon: Icon, label, onClick }) {
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium text-slate-400 hover:text-slate-600 bg-gray-50 hover:bg-gray-100 transition-colors"
      data-testid={`quick-action-${label.toLowerCase().replace(/\s/g, "-")}`}
    >
      <Icon className="w-3 h-3" />
      {label}
    </button>
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

  return (
    <section data-testid="needs-attention-card">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Needs Attention</span>
          <span className="text-[11px] text-slate-300 font-medium">{items.length}</span>
        </div>
      </div>

      <div className="space-y-2">
        {items.map((item, idx) => {
          const cat = CATEGORY_CONFIG[item.category] || CATEGORY_CONFIG.momentum_drop;
          const colors = COLOR_MAP[item.badge_color] || COLOR_MAP.amber;
          const CatIcon = cat.icon;
          const isUnassigned = item.category === "ownership_gap";

          return (
            <div
              key={`${item.athlete_id}_${item.category}_${idx}`}
              data-testid={`attention-item-${item.athlete_id}`}
              className={`bg-white rounded-xl border border-gray-100 border-l-[3px] ${colors.border} px-5 py-4`}
            >
              <div className="flex items-start gap-4 cursor-pointer" onClick={() => navigate(`/support-pods/${item.athlete_id}`)}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${colors.badge}`}>
                      <CatIcon className="w-3 h-3" />
                      {cat.label}
                    </span>
                    <span className="text-xs text-slate-400 font-medium">
                      {item.athlete_name} · {item.grad_year}
                    </span>
                  </div>

                  <p className={`text-sm font-semibold leading-snug ${colors.accent}`}>
                    {item.why_this_surfaced}
                  </p>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="flex items-center gap-2 mt-3 pl-0">
                <QuickAction icon={Eye} label="View" onClick={() => navigate(`/support-pods/${item.athlete_id}`)} />
                {isUnassigned && (
                  <QuickAction icon={UserPlus} label="Assign Coach" onClick={() => navigate("/roster")} />
                )}
                {!isUnassigned && (
                  <QuickAction icon={Mail} label="Nudge" onClick={() => navigate("/roster")} />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

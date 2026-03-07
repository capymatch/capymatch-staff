import { useNavigate } from "react-router-dom";
import { ShieldAlert, Clock, Zap, AlertTriangle, Users, Target, ChevronRight } from "lucide-react";

const CATEGORY_CONFIG = {
  momentum_drop: { icon: Zap, label: "Momentum Drop" },
  blocker: { icon: ShieldAlert, label: "Blocker" },
  deadline_proximity: { icon: Clock, label: "Deadline" },
  engagement_drop: { icon: AlertTriangle, label: "Engagement" },
  ownership_gap: { icon: Users, label: "Unassigned" },
  readiness_issue: { icon: Target, label: "Readiness" },
};

const COLOR_MAP = {
  red: {
    border: "border-l-red-500",
    badge: "bg-red-50 text-red-600",
    accent: "text-red-600",
  },
  amber: {
    border: "border-l-amber-500",
    badge: "bg-amber-50 text-amber-600",
    accent: "text-amber-600",
  },
  blue: {
    border: "border-l-blue-500",
    badge: "bg-blue-50 text-blue-600",
    accent: "text-blue-600",
  },
};

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

          return (
            <div
              key={`${item.athlete_id}_${item.category}_${idx}`}
              data-testid={`attention-item-${item.athlete_id}`}
              onClick={() => navigate(`/support-pods/${item.athlete_id}`)}
              className={`flex items-start gap-4 bg-white rounded-xl border border-gray-100 border-l-[3px] ${colors.border} px-5 py-4 cursor-pointer hover:shadow-md transition-all group`}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${colors.badge}`}>
                    <CatIcon className="w-3 h-3" />
                    {cat.label}
                  </span>
                  <span className="text-xs text-slate-400 font-medium">
                    {item.athlete_name} · {item.grad_year}
                  </span>
                </div>

                <p className={`text-sm font-semibold leading-snug ${colors.accent}`} data-testid="attention-why">
                  {item.why_this_surfaced}
                </p>

                <div className="flex items-center gap-3 mt-2">
                  <span className="text-[11px] text-slate-400">{item.what_changed}</span>
                  {item.pod_health && (
                    <span className="flex items-center gap-1 text-[11px]">
                      <span className={`w-1.5 h-1.5 rounded-full ${
                        item.pod_health.status === "red" ? "bg-red-500" :
                        item.pod_health.status === "yellow" ? "bg-amber-400" : "bg-emerald-500"
                      }`} />
                      <span className="text-slate-400">{item.pod_health.label}</span>
                    </span>
                  )}
                </div>
              </div>

              <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 transition-colors shrink-0 mt-1" />
            </div>
          );
        })}
      </div>
    </section>
  );
}

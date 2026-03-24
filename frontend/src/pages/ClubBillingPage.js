import { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "sonner";
import { usePlan } from "@/PlanContext";
import { Check, Zap, Shield, Crown, Building2, ChevronRight } from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const PLAN_META = {
  starter: {
    icon: Zap,
    accent: "#64748b",
    accentBg: "rgba(100,116,139,0.15)",
    gradient: "from-slate-600 to-slate-700",
    checkColor: "#64748b",
    features: [
      "Up to 25 athletes",
      "Up to 3 coaches",
      "Mission Control dashboard",
      "Athlete roster & assignments",
      "Support Pods (athlete deep-dive)",
      "School Pods (basic view)",
      "Notifications & messaging",
    ],
  },
  growth: {
    icon: Shield,
    accent: "#10b981",
    accentBg: "rgba(16,185,129,0.15)",
    gradient: "from-emerald-600 to-teal-700",
    checkColor: "#10b981",
    features: [
      "Up to 50 athletes",
      "Up to 6 coaches",
      "Director Inbox (risk-scored feed)",
      "Review Requests (outbox)",
      "Event creation & prep",
      "Advocacy (20 recs/month)",
      "School relationships",
      "Recruiting signals",
    ],
  },
  club_pro: {
    icon: Crown,
    accent: "#3b82f6",
    accentBg: "rgba(59,130,246,0.15)",
    gradient: "from-blue-600 to-indigo-700",
    checkColor: "#3b82f6",
    popular: true,
    features: [
      "Up to 75 athletes",
      "Up to 10 coaches",
      "Pipeline escalations",
      "Live Event Mode",
      "Unlimited advocacy",
      "Program Intelligence & trends",
      "AI email drafts (50/mo)",
      "Coach Watch AI",
      "Autopilot actions",
      "Coach health overview",
      "CSV export",
    ],
  },
  elite: {
    icon: Crown,
    accent: "#8b5cf6",
    accentBg: "rgba(139,92,246,0.15)",
    gradient: "from-violet-600 to-purple-700",
    checkColor: "#8b5cf6",
    features: [
      "Up to 125 athletes",
      "Up to 20 coaches",
      "Unlimited AI features",
      "AI Program Brief",
      "Weekly Director Digest",
      "Loop Insights",
      "Full trend analytics",
      "Priority support",
    ],
  },
  enterprise: {
    icon: Building2,
    accent: "#f59e0b",
    accentBg: "rgba(245,158,11,0.15)",
    gradient: "from-amber-600 to-orange-700",
    checkColor: "#f59e0b",
    features: [
      "Unlimited athletes & coaches",
      "Admin panel & dashboard",
      "Custom integrations",
      "Multi-location support",
      "Custom onboarding",
      "Dedicated support",
      "API access",
    ],
  },
};

const PLAN_ORDER = ["starter", "growth", "club_pro", "elite", "enterprise"];

export default function ClubBillingPage() {
  const { planData, refetch } = usePlan();
  const [plans, setPlans] = useState([]);
  const [currentPlan, setCurrentPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [switching, setSwitching] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [plansRes, currentRes] = await Promise.all([
          axios.get(`${API}/club-plans`),
          axios.get(`${API}/club-plans/current`),
        ]);
        setPlans(plansRes.data.plans);
        setCurrentPlan(currentRes.data);
      } catch {
        toast.error("Failed to load plan data");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleSelectPlan = async (planId) => {
    if (planId === "enterprise") {
      toast.info("Contact us for Enterprise pricing");
      return;
    }
    if (planId === currentPlan?.plan?.id) return;

    setSwitching(planId);
    try {
      await axios.post(`${API}/club-plans/set`, { plan_id: planId });
      const res = await axios.get(`${API}/club-plans/current`);
      setCurrentPlan(res.data);
      await refetch();
      toast.success(`Plan updated to ${res.data.plan.label}`);
    } catch {
      toast.error("Failed to update plan");
    } finally {
      setSwitching(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500" />
      </div>
    );
  }

  const activePlanId = currentPlan?.plan?.id || planData?.plan_id || "starter";
  const usage = currentPlan?.usage;

  return (
    <div data-testid="club-billing-page" className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Club Billing</h1>
        <p className="text-sm text-slate-400 mt-1">
          Manage your club's plan and usage
        </p>
      </div>

      {/* Current Plan + Usage */}
      {currentPlan && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="col-span-2 rounded-xl border border-slate-700/60 bg-slate-800/50 p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${PLAN_META[activePlanId]?.gradient || "from-slate-600 to-slate-700"} flex items-center justify-center`}>
                {(() => { const Icon = PLAN_META[activePlanId]?.icon || Zap; return <Icon className="w-5 h-5 text-white" />; })()}
              </div>
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wider">Current Plan</p>
                <p className="text-lg font-bold text-slate-100">{currentPlan.plan.label}</p>
              </div>
            </div>
            <p className="text-xs text-slate-500">{currentPlan.plan.tagline}</p>
          </div>

          <div className="rounded-xl border border-slate-700/60 bg-slate-800/50 p-5 space-y-3">
            <p className="text-xs text-slate-400 uppercase tracking-wider">Usage</p>
            {usage && (
              <>
                <UsageBar label="Athletes" current={usage.athletes} max={usage.max_athletes} />
                <UsageBar label="Coaches" current={usage.coaches} max={usage.max_coaches} />
              </>
            )}
          </div>
        </div>
      )}

      {/* Plan Cards */}
      <div>
        <h2 className="text-base font-semibold text-slate-200 mb-4">Choose your plan</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {PLAN_ORDER.map((pid) => {
            const plan = plans.find((p) => p.id === pid);
            if (!plan) return null;
            const meta = PLAN_META[pid] || {};
            const isActive = pid === activePlanId;
            const activeIdx = PLAN_ORDER.indexOf(activePlanId);
            const thisIdx = PLAN_ORDER.indexOf(pid);
            const isDowngrade = thisIdx < activeIdx;
            const Icon = meta.icon || Zap;

            return (
              <div
                key={pid}
                data-testid={`plan-card-${pid}`}
                className="relative rounded-xl border p-5 transition-all"
                style={{
                  borderColor: isActive ? meta.accent : "rgba(51,65,85,0.6)",
                  backgroundColor: isActive ? meta.accentBg : "rgba(30,41,59,0.4)",
                  boxShadow: isActive ? `0 0 0 1px ${meta.accent}33` : "none",
                }}
              >
                {meta.popular && (
                  <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-[10px] font-bold text-white uppercase tracking-wider" style={{ backgroundColor: "#3b82f6" }}>
                    Most Popular
                  </div>
                )}

                <div className="flex items-center gap-2.5 mb-3 mt-1">
                  <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${meta.gradient} flex items-center justify-center`}>
                    <Icon className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-bold" style={{ color: "#e2e8f0" }}>{plan.label}</p>
                    <p className="text-[10px]" style={{ color: "#94a3b8" }}>{plan.tagline}</p>
                  </div>
                </div>

                <div className="mb-4">
                  {plan.price_monthly ? (
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-bold" style={{ color: "#f1f5f9" }}>${plan.price_monthly}</span>
                      <span className="text-xs" style={{ color: "#94a3b8" }}>/month</span>
                    </div>
                  ) : (
                    <p className="text-sm font-semibold" style={{ color: "#cbd5e1" }}>Custom pricing</p>
                  )}
                </div>

                <ul className="space-y-1.5 mb-5">
                  {(meta.features || []).map((f, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs" style={{ color: "#94a3b8" }}>
                      <Check className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" style={{ color: meta.checkColor }} />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>

                <button
                  data-testid={`select-plan-${pid}`}
                  onClick={() => handleSelectPlan(pid)}
                  disabled={isActive || switching === pid}
                  className={`w-full py-2 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
                    isActive || isDowngrade ? "cursor-default" : "hover:opacity-90"
                  }`}
                  style={{
                    background: isActive ? "rgba(51,65,85,0.5)" : isDowngrade ? "rgba(51,65,85,0.5)" : `linear-gradient(135deg, ${meta.accent}, ${meta.accent}dd)`,
                    color: isActive ? "#94a3b8" : isDowngrade ? "#94a3b8" : "#ffffff",
                  }}
                >
                  {switching === pid ? (
                    <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-white" />
                  ) : isActive ? (
                    "Current Plan"
                  ) : isDowngrade ? (
                    "Downgrade"
                  ) : pid === "enterprise" ? (
                    <>Contact Sales <ChevronRight className="w-3.5 h-3.5" /></>
                  ) : (
                    <>Upgrade <ChevronRight className="w-3.5 h-3.5" /></>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function UsageBar({ label, current, max }) {
  const pct = max > 0 ? Math.min(100, Math.round((current / max) * 100)) : 0;
  const isHigh = pct >= 80;
  const isOver = current >= max && max > 0;

  return (
    <div>
      <div className="flex items-center justify-between text-xs mb-1">
        <span className="text-slate-400">{label}</span>
        <span className={isOver ? "text-red-400 font-semibold" : "text-slate-500"}>
          {current}{max > 0 ? ` / ${max}` : ""}
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-slate-700/60 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${isOver ? "bg-red-500" : isHigh ? "bg-amber-500" : "bg-emerald-500"}`}
          style={{ width: `${max > 0 ? pct : 0}%` }}
        />
      </div>
    </div>
  );
}

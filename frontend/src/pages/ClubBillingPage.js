import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { usePlan } from "@/PlanContext";
import { Check, Zap, Shield, Crown, Building2, ChevronRight, CreditCard, Calendar, AlertTriangle, ExternalLink } from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const PLAN_META = {
  starter: {
    icon: Zap, accent: "#64748b", accentBg: "rgba(100,116,139,0.15)",
    gradient: "from-slate-600 to-slate-700", checkColor: "#64748b",
    features: [
      "Full Director OS: Inbox, Outbox, Signals, Coach Health",
      "Up to 25 athletes, 3 coaches",
      "Basic signal & reporting depth",
      "30-day escalation history",
      "AI Brief preview",
    ],
  },
  growth: {
    icon: Shield, accent: "#10b981", accentBg: "rgba(16,185,129,0.15)",
    gradient: "from-emerald-600 to-teal-700", checkColor: "#10b981",
    features: [
      "Everything in Starter +",
      "Up to 50 athletes, 6 coaches",
      "100 inbox/outbox items",
      "Detailed signals & reporting",
      "Advanced filters, saved views, search",
      "CSV export, cross-team analytics",
      "Events & Advocacy (20 recs/mo)",
      "90-day history",
    ],
  },
  club_pro: {
    icon: Crown, accent: "#3b82f6", accentBg: "rgba(59,130,246,0.15)",
    gradient: "from-blue-600 to-indigo-700", checkColor: "#3b82f6", popular: true,
    features: [
      "Everything in Growth +",
      "Up to 75 athletes, 10 coaches",
      "Unlimited inbox/outbox",
      "Advanced signals, detailed coach health",
      "Bulk actions & bulk approve",
      "AI summaries & recommendations (50/mo)",
      "Coach comparison, approval flows",
      "Event mode, native integrations",
      "Program Intelligence, Autopilot",
    ],
  },
  elite: {
    icon: Crown, accent: "#8b5cf6", accentBg: "rgba(139,92,246,0.15)",
    gradient: "from-violet-600 to-purple-700", checkColor: "#8b5cf6",
    features: [
      "Everything in Club Pro +",
      "Up to 125 athletes, 20 coaches",
      "Full AI Brief access",
      "Unlimited AI actions",
      "Advanced coach health",
      "Automation & workflow rules",
      "Weekly digest, loop insights",
      "Live event intelligence",
      "API & webhooks",
    ],
  },
  enterprise: {
    icon: Building2, accent: "#f59e0b", accentBg: "rgba(245,158,11,0.15)",
    gradient: "from-amber-600 to-orange-700", checkColor: "#f59e0b",
    features: [
      "Everything in Elite +",
      "Unlimited athletes & coaches",
      "SSO & admin panel",
      "Custom integrations",
      "Multi-location support",
      "Dedicated onboarding & support",
    ],
  },
};

const PLAN_ORDER = ["starter", "growth", "club_pro", "elite", "enterprise"];

const STATUS_DISPLAY = {
  active: { label: "Active", color: "#10b981", bg: "#10b98115" },
  past_due: { label: "Past Due", color: "#f59e0b", bg: "#f59e0b15" },
  canceled: { label: "Canceled", color: "#ef4444", bg: "#ef444415" },
  pending: { label: "Pending", color: "#64748b", bg: "#64748b15" },
  paused: { label: "Paused", color: "#64748b", bg: "#64748b15" },
};

export default function ClubBillingPage() {
  const { planData, refetch } = usePlan();
  const [searchParams, setSearchParams] = useSearchParams();
  const [plans, setPlans] = useState([]);
  const [billingInfo, setBillingInfo] = useState(null);
  const [currentPlan, setCurrentPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [checkingOut, setCheckingOut] = useState(null);
  const [billingCycle, setBillingCycle] = useState("monthly");

  const loadData = useCallback(async () => {
    try {
      const [plansRes, currentRes, billingRes] = await Promise.all([
        axios.get(`${API}/stripe/plans`),
        axios.get(`${API}/club-plans/current`),
        axios.get(`${API}/stripe/billing-info`).catch(() => ({ data: null })),
      ]);
      setPlans(plansRes.data.plans);
      setCurrentPlan(currentRes.data);
      setBillingInfo(billingRes.data);
    } catch {
      toast.error("Failed to load billing data");
    } finally {
      setLoading(false);
    }
  }, []);

  // Handle return from Stripe checkout
  useEffect(() => {
    const sessionId = searchParams.get("session_id");
    const checkoutStatus = searchParams.get("checkout");

    if (sessionId && checkoutStatus === "success") {
      pollCheckoutStatus(sessionId);
      setSearchParams({}, { replace: true });
    } else if (checkoutStatus === "cancelled") {
      toast.info("Checkout cancelled");
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  useEffect(() => { loadData(); }, [loadData]);

  const pollCheckoutStatus = async (sessionId, attempt = 0) => {
    if (attempt >= 5) {
      toast.error("Payment status check timed out");
      return;
    }
    try {
      const res = await axios.get(`${API}/stripe/checkout/status/${sessionId}`);
      if (res.data.payment_status === "paid") {
        toast.success("Subscription activated!");
        await loadData();
        await refetch();
        return;
      }
      setTimeout(() => pollCheckoutStatus(sessionId, attempt + 1), 2000);
    } catch {
      toast.error("Error checking payment status");
    }
  };

  const handleSelectPlan = async (planId) => {
    if (planId === "enterprise") {
      toast.info("Contact us for Enterprise pricing");
      return;
    }

    const activePlanId = billingInfo?.plan_id || currentPlan?.plan?.id || "starter";
    if (planId === activePlanId && billingInfo?.has_subscription) return;

    setCheckingOut(planId);
    try {
      const res = await axios.post(`${API}/stripe/checkout`, {
        plan_id: planId,
        billing_cycle: billingCycle,
        origin_url: window.location.origin,
      });
      if (res.data.url) {
        window.location.href = res.data.url;
      } else if (res.data.activated_directly) {
        toast.success(res.data.message || `Plan activated: ${res.data.plan_label}`);
        await loadData();
        await refetch();
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to start checkout");
    } finally {
      setCheckingOut(null);
    }
  };

  const handleManageBilling = async () => {
    try {
      const res = await axios.post(`${API}/stripe/portal`, {
        return_url: window.location.href,
      });
      if (res.data.url) {
        window.location.href = res.data.url;
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || "Cannot open billing portal");
    }
  };

  const handleCancel = async () => {
    if (!window.confirm("Are you sure you want to cancel? Your plan will remain active until the end of the billing period.")) return;
    try {
      const res = await axios.post(`${API}/stripe/cancel`);
      toast.success(res.data.message);
      await loadData();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to cancel");
    }
  };

  const handleReactivate = async () => {
    try {
      const res = await axios.post(`${API}/stripe/reactivate`);
      toast.success(res.data.message);
      await loadData();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to reactivate");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500" />
      </div>
    );
  }

  const activePlanId = billingInfo?.plan_id || currentPlan?.plan?.id || "starter";
  const usage = currentPlan?.usage;
  const hasStripe = billingInfo?.has_subscription;
  const statusCfg = STATUS_DISPLAY[billingInfo?.status] || STATUS_DISPLAY.active;

  return (
    <div data-testid="club-billing-page" className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "#f1f5f9" }}>Club Billing</h1>
          <p className="text-sm mt-1" style={{ color: "#94a3b8" }}>Manage your club subscription</p>
        </div>
        {hasStripe && (
          <button
            onClick={handleManageBilling}
            data-testid="manage-billing-btn"
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-opacity hover:opacity-80"
            style={{ backgroundColor: "rgba(59,130,246,0.15)", color: "#3b82f6", border: "1px solid rgba(59,130,246,0.2)" }}
          >
            <ExternalLink className="w-3.5 h-3.5" /> Manage Billing
          </button>
        )}
      </div>

      {/* Current Plan + Billing Status */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="col-span-2 rounded-xl p-5" style={{ border: "1px solid rgba(51,65,85,0.6)", backgroundColor: "rgba(30,41,59,0.5)" }}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${PLAN_META[activePlanId]?.gradient || "from-slate-600 to-slate-700"} flex items-center justify-center`}>
                {(() => { const Icon = PLAN_META[activePlanId]?.icon || Zap; return <Icon className="w-5 h-5 text-white" />; })()}
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider" style={{ color: "#94a3b8" }}>Current Plan</p>
                <p className="text-lg font-bold" style={{ color: "#f1f5f9" }}>{billingInfo?.plan_label || "Starter"}</p>
              </div>
            </div>
            <span
              className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase"
              style={{ backgroundColor: statusCfg.bg, color: statusCfg.color }}
            >
              {statusCfg.label}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
            {billingInfo?.price > 0 && (
              <div className="flex items-center gap-2">
                <CreditCard className="w-3.5 h-3.5" style={{ color: "#64748b" }} />
                <div>
                  <p style={{ color: "#94a3b8" }}>Billing</p>
                  <p className="font-semibold" style={{ color: "#e2e8f0" }}>${billingInfo.price}/{billingInfo.billing_cycle === "annual" ? "yr" : "mo"}</p>
                </div>
              </div>
            )}
            {billingInfo?.current_period_end && (
              <div className="flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5" style={{ color: "#64748b" }} />
                <div>
                  <p style={{ color: "#94a3b8" }}>Next renewal</p>
                  <p className="font-semibold" style={{ color: "#e2e8f0" }}>{new Date(billingInfo.current_period_end).toLocaleDateString()}</p>
                </div>
              </div>
            )}
            {billingInfo?.cancel_at_period_end && (
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-3.5 h-3.5" style={{ color: "#f59e0b" }} />
                <div>
                  <p style={{ color: "#f59e0b" }}>Canceling</p>
                  <button
                    onClick={handleReactivate}
                    className="text-xs font-semibold underline" style={{ color: "#3b82f6" }}
                    data-testid="reactivate-btn"
                  >
                    Reactivate
                  </button>
                </div>
              </div>
            )}
          </div>

          {hasStripe && !billingInfo?.cancel_at_period_end && (
            <button
              onClick={handleCancel}
              className="mt-4 text-[11px] font-medium hover:underline"
              style={{ color: "#64748b" }}
              data-testid="cancel-subscription-btn"
            >
              Cancel subscription
            </button>
          )}
        </div>

        <div className="rounded-xl p-5 space-y-3" style={{ border: "1px solid rgba(51,65,85,0.6)", backgroundColor: "rgba(30,41,59,0.5)" }}>
          <p className="text-xs uppercase tracking-wider" style={{ color: "#94a3b8" }}>Usage</p>
          {usage && (
            <>
              <UsageBar label="Athletes" current={usage.athletes} max={usage.max_athletes} />
              <UsageBar label="Coaches" current={usage.coaches} max={usage.max_coaches} />
            </>
          )}
        </div>
      </div>

      {/* Billing Cycle Toggle */}
      <div className="flex items-center justify-center gap-3">
        <button
          onClick={() => setBillingCycle("monthly")}
          className="px-4 py-1.5 rounded-lg text-xs font-semibold transition-all"
          style={{
            backgroundColor: billingCycle === "monthly" ? "#3b82f6" : "transparent",
            color: billingCycle === "monthly" ? "#fff" : "#94a3b8",
            border: billingCycle === "monthly" ? "none" : "1px solid rgba(51,65,85,0.6)",
          }}
          data-testid="toggle-monthly"
        >
          Monthly
        </button>
        <button
          onClick={() => setBillingCycle("annual")}
          className="px-4 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5"
          style={{
            backgroundColor: billingCycle === "annual" ? "#3b82f6" : "transparent",
            color: billingCycle === "annual" ? "#fff" : "#94a3b8",
            border: billingCycle === "annual" ? "none" : "1px solid rgba(51,65,85,0.6)",
          }}
          data-testid="toggle-annual"
        >
          Annual <span className="px-1.5 py-0.5 rounded text-[9px] font-bold" style={{ backgroundColor: billingCycle === "annual" ? "rgba(255,255,255,0.2)" : "#10b98120", color: billingCycle === "annual" ? "#fff" : "#10b981" }}>Save ~15%</span>
        </button>
      </div>

      {/* Plan Cards */}
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

          const price = billingCycle === "annual"
            ? plan.annual_monthly
            : plan.monthly_price;
          const totalAnnual = plan.annual_price;

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
                {price ? (
                  <div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-bold" style={{ color: "#f1f5f9" }}>${Math.round(price)}</span>
                      <span className="text-xs" style={{ color: "#94a3b8" }}>/month</span>
                    </div>
                    {billingCycle === "annual" && totalAnnual && (
                      <p className="text-[10px] mt-0.5" style={{ color: "#64748b" }}>
                        ${totalAnnual.toLocaleString()}/year billed annually
                      </p>
                    )}
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
                disabled={isActive && hasStripe}
                className="w-full py-2 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5"
                style={{
                  background: (isActive && hasStripe) ? "rgba(51,65,85,0.5)" : isDowngrade ? "rgba(51,65,85,0.5)" : `linear-gradient(135deg, ${meta.accent}, ${meta.accent}dd)`,
                  color: (isActive && hasStripe) ? "#94a3b8" : isDowngrade ? "#94a3b8" : "#ffffff",
                  cursor: (isActive && hasStripe) ? "default" : "pointer",
                }}
              >
                {checkingOut === pid ? (
                  <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-white" />
                ) : (isActive && hasStripe) ? (
                  "Current Plan"
                ) : isDowngrade ? (
                  "Downgrade"
                ) : pid === "enterprise" ? (
                  <>Contact Sales <ChevronRight className="w-3.5 h-3.5" /></>
                ) : (
                  <>Subscribe <ChevronRight className="w-3.5 h-3.5" /></>
                )}
              </button>
            </div>
          );
        })}
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
        <span style={{ color: "#94a3b8" }}>{label}</span>
        <span style={{ color: isOver ? "#ef4444" : "#64748b" }} className={isOver ? "font-semibold" : ""}>
          {current}{max > 0 ? ` / ${max}` : ""}
        </span>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: "rgba(51,65,85,0.6)" }}>
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${max > 0 ? pct : 0}%`, backgroundColor: isOver ? "#ef4444" : isHigh ? "#f59e0b" : "#10b981" }}
        />
      </div>
    </div>
  );
}

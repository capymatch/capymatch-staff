import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { usePlan } from "@/PlanContext";
import { Check, Zap, Shield, Crown, Building2, ChevronRight, CreditCard, Calendar, AlertTriangle, ExternalLink } from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const PLAN_META = {
  starter: {
    icon: Zap, accent: "#64748b", accentBg: "rgba(100,116,139,0.08)",
    checkColor: "#64748b",
    tagline: "Get organized",
    outcomes: [
      "See every athlete and coach in one dashboard",
      "Know who needs attention right now",
      "Track outreach and engagement signals",
      "30-day history of all escalations",
    ],
    limits: "25 athletes, 3 coaches",
  },
  growth: {
    icon: Shield, accent: "#10b981", accentBg: "rgba(16,185,129,0.08)",
    checkColor: "#10b981",
    tagline: "Scale your program",
    outcomes: [
      "Everything in Starter, plus:",
      "Deeper signals and detailed reports",
      "Advanced filters, search, and saved views",
      "CSV export and cross-team analytics",
      "Events and advocacy recommendations",
    ],
    limits: "50 athletes, 6 coaches",
  },
  club_pro: {
    icon: Crown, accent: "#ff6a3d", accentBg: "rgba(255,106,61,0.06)",
    checkColor: "#ff6a3d",
    tagline: "Run recruiting like a system",
    outcomes: [
      "Approve and send follow-ups in one click",
      "AI writes summaries and recommends next steps",
      "Compare coaches and track approval flows",
      "Program Intelligence and Autopilot mode",
      "Unlimited inbox and outbox",
    ],
    limits: "75 athletes, 10 coaches",
  },
  elite: {
    icon: Crown, accent: "#8b5cf6", accentBg: "rgba(139,92,246,0.06)",
    checkColor: "#8b5cf6",
    tagline: "Full automation and intelligence",
    outcomes: [
      "Unlimited AI-powered actions and briefs",
      "Automation rules and custom workflows",
      "Weekly digest with loop insights",
      "Live event intelligence",
      "API and webhook access",
    ],
    limits: "125 athletes, 20 coaches",
  },
  enterprise: {
    icon: Building2, accent: "#f59e0b", accentBg: "rgba(245,158,11,0.06)",
    checkColor: "#f59e0b",
    tagline: "Full control across teams",
    outcomes: [],
    limits: "Unlimited",
  },
};

const VISIBLE_PLANS = ["starter", "club_pro", "elite"];
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

  const pollCheckoutStatus = useCallback(async (sessionId, attempt = 0) => {
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
  }, [loadData, refetch]);

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
  }, [searchParams, setSearchParams, pollCheckoutStatus]);

  useEffect(() => { loadData(); }, [loadData]);

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
  const activeMeta = PLAN_META[activePlanId] || PLAN_META.starter;
  const overAthletes = usage && usage.max_athletes > 0 && usage.athletes >= usage.max_athletes;
  const overCoaches = usage && usage.max_coaches > 0 && usage.coaches >= usage.max_coaches;
  const isOverLimit = overAthletes || overCoaches;

  return (
    <div data-testid="club-billing-page" className="max-w-5xl mx-auto space-y-5" style={{ color: "#f0f0f2" }}>

      {/* Current Plan Status Dashboard */}
      <div className="rounded-xl overflow-hidden" style={{ backgroundColor: "#161921", border: `1px solid ${activeMeta.accent}30` }}>
        <div className="px-6 py-5">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: `${activeMeta.accent}15`, border: `1px solid ${activeMeta.accent}25` }}>
                {(() => { const Icon = activeMeta.icon || Zap; return <Icon className="w-5 h-5" style={{ color: activeMeta.accent }} />; })()}
              </div>
              <div>
                <p className="text-[9px] font-bold uppercase tracking-[0.12em]" style={{ color: "#5c5e6a" }}>Your Plan</p>
                <p className="text-xl font-bold" style={{ color: "#f0f0f2" }}>{billingInfo?.plan_label || "Starter"}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider" style={{ backgroundColor: statusCfg.bg, color: statusCfg.color }}>{statusCfg.label}</span>
              {hasStripe && (
                <button onClick={handleManageBilling} data-testid="manage-billing-btn" className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-[11px] font-semibold transition-opacity hover:opacity-80" style={{ color: "#5c5e6a", border: "1px solid rgba(255,255,255,0.08)" }}>
                  <ExternalLink className="w-3 h-3" /> Billing Portal
                </button>
              )}
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {usage && (
              <>
                <div className="rounded-lg px-3.5 py-3" style={{ backgroundColor: overAthletes ? "rgba(239,68,68,0.06)" : "rgba(255,255,255,0.02)", border: `1px solid ${overAthletes ? "rgba(239,68,68,0.15)" : "rgba(255,255,255,0.04)"}` }}>
                  <p className="text-[9px] font-bold uppercase tracking-[0.1em]" style={{ color: overAthletes ? "#ef4444" : "#5c5e6a" }}>Athletes</p>
                  <p className="text-lg font-bold mt-0.5 tabular-nums" style={{ color: overAthletes ? "#ef4444" : "#f0f0f2" }}>{usage.athletes}<span className="text-xs font-medium" style={{ color: "#5c5e6a" }}> / {usage.max_athletes}</span></p>
                  <div className="h-1 rounded-full mt-2 overflow-hidden" style={{ backgroundColor: "rgba(255,255,255,0.06)" }}>
                    <div className="h-full rounded-full" style={{ width: `${Math.min(100, usage.max_athletes > 0 ? (usage.athletes / usage.max_athletes * 100) : 0)}%`, backgroundColor: overAthletes ? "#ef4444" : "#ff6a3d" }} />
                  </div>
                </div>
                <div className="rounded-lg px-3.5 py-3" style={{ backgroundColor: overCoaches ? "rgba(239,68,68,0.06)" : "rgba(255,255,255,0.02)", border: `1px solid ${overCoaches ? "rgba(239,68,68,0.15)" : "rgba(255,255,255,0.04)"}` }}>
                  <p className="text-[9px] font-bold uppercase tracking-[0.1em]" style={{ color: overCoaches ? "#ef4444" : "#5c5e6a" }}>Coaches</p>
                  <p className="text-lg font-bold mt-0.5 tabular-nums" style={{ color: overCoaches ? "#ef4444" : "#f0f0f2" }}>{usage.coaches}<span className="text-xs font-medium" style={{ color: "#5c5e6a" }}> / {usage.max_coaches}</span></p>
                  <div className="h-1 rounded-full mt-2 overflow-hidden" style={{ backgroundColor: "rgba(255,255,255,0.06)" }}>
                    <div className="h-full rounded-full" style={{ width: `${Math.min(100, usage.max_coaches > 0 ? (usage.coaches / usage.max_coaches * 100) : 0)}%`, backgroundColor: overCoaches ? "#ef4444" : "#ff6a3d" }} />
                  </div>
                </div>
              </>
            )}
            {billingInfo?.price > 0 && (
              <div className="rounded-lg px-3.5 py-3" style={{ backgroundColor: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }}>
                <p className="text-[9px] font-bold uppercase tracking-[0.1em]" style={{ color: "#5c5e6a" }}>Price</p>
                <p className="text-lg font-bold mt-0.5" style={{ color: "#f0f0f2" }}>${billingInfo.price}<span className="text-xs font-medium" style={{ color: "#5c5e6a" }}>/{billingInfo.billing_cycle === "annual" ? "yr" : "mo"}</span></p>
              </div>
            )}
            {billingInfo?.current_period_end && (
              <div className="rounded-lg px-3.5 py-3" style={{ backgroundColor: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }}>
                <p className="text-[9px] font-bold uppercase tracking-[0.1em]" style={{ color: "#5c5e6a" }}>Renews</p>
                <p className="text-sm font-bold mt-0.5" style={{ color: "#f0f0f2" }}>{new Date(billingInfo.current_period_end).toLocaleDateString()}</p>
              </div>
            )}
          </div>
          {isOverLimit && (
            <div className="mt-4 flex items-center gap-3 px-4 py-2.5 rounded-lg" style={{ backgroundColor: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.12)" }}>
              <AlertTriangle className="w-4 h-4 flex-shrink-0" style={{ color: "#ef4444" }} />
              <span className="text-[12px] font-medium" style={{ color: "#f87171" }}>You've exceeded your plan limits. Upgrade to unlock more capacity.</span>
            </div>
          )}
          {billingInfo?.cancel_at_period_end ? (
            <div className="mt-3 flex items-center gap-2">
              <AlertTriangle className="w-3.5 h-3.5" style={{ color: "#f59e0b" }} />
              <span className="text-[11px]" style={{ color: "#f59e0b" }}>Canceling at period end</span>
              <button onClick={handleReactivate} className="text-[11px] font-semibold underline ml-1" style={{ color: "#ff6a3d" }} data-testid="reactivate-btn">Reactivate</button>
            </div>
          ) : hasStripe && (
            <button onClick={handleCancel} className="mt-3 text-[11px] font-medium hover:underline" style={{ color: "#3d3f4a" }} data-testid="cancel-subscription-btn">Cancel subscription</button>
          )}
        </div>
      </div>

      {/* Billing Cycle Toggle */}
      <div className="flex items-center justify-center gap-1" style={{ backgroundColor: "#161921", borderRadius: 10, padding: "4px", width: "fit-content", margin: "0 auto", border: "1px solid rgba(255,255,255,0.06)" }}>
        <button onClick={() => setBillingCycle("monthly")} data-testid="toggle-monthly" className="px-5 py-2 rounded-lg text-xs font-semibold transition-all" style={{ backgroundColor: billingCycle === "monthly" ? "#ff6a3d" : "transparent", color: billingCycle === "monthly" ? "#fff" : "#5c5e6a" }}>Monthly</button>
        <button onClick={() => setBillingCycle("annual")} data-testid="toggle-annual" className="px-5 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5" style={{ backgroundColor: billingCycle === "annual" ? "#ff6a3d" : "transparent", color: billingCycle === "annual" ? "#fff" : "#5c5e6a" }}>Annual <span className="px-1.5 py-0.5 rounded text-[9px] font-bold" style={{ backgroundColor: billingCycle === "annual" ? "rgba(255,255,255,0.2)" : "rgba(16,185,129,0.12)", color: billingCycle === "annual" ? "#fff" : "#10b981" }}>Save ~15%</span></button>
      </div>

      {/* 3 Plan Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {VISIBLE_PLANS.map((pid) => {
          const plan = plans.find((p) => p.id === pid);
          if (!plan) return null;
          const meta = PLAN_META[pid] || {};
          const isActive = pid === activePlanId;
          const activeIdx = PLAN_ORDER.indexOf(activePlanId);
          const thisIdx = PLAN_ORDER.indexOf(pid);
          const isDowngrade = thisIdx < activeIdx;
          const Icon = meta.icon || Zap;
          const isRecommended = pid === "club_pro";
          const price = billingCycle === "annual" ? plan.annual_monthly : plan.monthly_price;
          const totalAnnual = plan.annual_price;
          return (
            <div key={pid} data-testid={`plan-card-${pid}`} className="relative rounded-xl p-6 transition-all flex flex-col" style={{ backgroundColor: "#161921", border: `1px solid ${isActive ? meta.accent + "40" : isRecommended ? "rgba(255,106,61,0.20)" : "rgba(255,255,255,0.06)"}`, boxShadow: isRecommended ? "0 0 30px rgba(255,106,61,0.06)" : "none" }}>
              <div className="flex items-center gap-2.5 mb-1">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${meta.accent}15`, border: `1px solid ${meta.accent}20` }}>
                  <Icon className="w-4 h-4" style={{ color: meta.accent }} />
                </div>
                <p className="text-[15px] font-bold" style={{ color: "#f0f0f2" }}>{plan.label}</p>
              </div>
              <p className="text-[12px] mb-4" style={{ color: "#5c5e6a" }}>{meta.tagline}</p>
              <div className="mb-5">
                {price ? (
                  <>
                    <div className="flex items-baseline gap-1">
                      <span className="text-[32px] font-bold" style={{ color: "#f0f0f2", letterSpacing: "-0.03em" }}>${Math.round(price)}</span>
                      <span className="text-xs" style={{ color: "#5c5e6a" }}>/mo</span>
                    </div>
                    {billingCycle === "annual" && totalAnnual && <p className="text-[10px] mt-0.5" style={{ color: "#3d3f4a" }}>${totalAnnual.toLocaleString()}/year billed annually</p>}
                  </>
                ) : <p className="text-sm font-semibold" style={{ color: "#8b8d98" }}>Custom pricing</p>}
              </div>
              <p className="text-[10px] font-bold uppercase tracking-[0.08em] mb-3" style={{ color: "#3d3f4a" }}>{meta.limits}</p>
              <ul className="space-y-2.5 mb-6 flex-1">
                {(meta.outcomes || []).map((f, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-[12px]" style={{ color: "#8b8d98" }}>
                    <Check className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" style={{ color: meta.checkColor }} />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <button data-testid={`select-plan-${pid}`} onClick={() => handleSelectPlan(pid)} disabled={isActive && hasStripe} className="w-full py-2.5 rounded-lg text-[11px] font-bold uppercase tracking-[0.03em] transition-all flex items-center justify-center gap-1.5" style={{ background: (isActive && hasStripe) ? "rgba(255,255,255,0.04)" : isDowngrade ? "rgba(255,255,255,0.04)" : meta.accent, color: (isActive && hasStripe) ? "#5c5e6a" : isDowngrade ? "#5c5e6a" : "#ffffff", border: (isActive && hasStripe) || isDowngrade ? "1px solid rgba(255,255,255,0.06)" : "none", cursor: (isActive && hasStripe) ? "default" : "pointer", boxShadow: !((isActive && hasStripe) || isDowngrade) ? `0 0 16px ${meta.accent}25` : "none" }}>
                {checkingOut === pid ? <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-white" /> : (isActive && hasStripe) ? "Current Plan" : isDowngrade ? "Downgrade" : <>Get {plan.label} <ChevronRight className="w-3.5 h-3.5" /></>}
              </button>
            </div>
          );
        })}
      </div>

      {/* Enterprise — separate section */}
      <div className="rounded-xl px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-4" style={{ backgroundColor: "#161921", border: "1px solid rgba(255,255,255,0.06)" }} data-testid="plan-card-enterprise">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "rgba(245,158,11,0.10)", border: "1px solid rgba(245,158,11,0.18)" }}>
            <Building2 className="w-5 h-5" style={{ color: "#f59e0b" }} />
          </div>
          <div>
            <p className="text-[15px] font-bold" style={{ color: "#f0f0f2" }}>Enterprise</p>
            <p className="text-[12px]" style={{ color: "#5c5e6a" }}>Need full control across multiple teams? SSO, custom integrations, and dedicated support.</p>
          </div>
        </div>
        <button data-testid="select-plan-enterprise" onClick={() => handleSelectPlan("enterprise")} className="flex items-center gap-1.5 px-5 py-2.5 rounded-lg text-[11px] font-bold uppercase tracking-[0.03em] flex-shrink-0 transition-opacity hover:opacity-80" style={{ backgroundColor: "rgba(245,158,11,0.10)", color: "#f59e0b", border: "1px solid rgba(245,158,11,0.18)" }}>
          Contact Sales <ChevronRight className="w-3.5 h-3.5" />
        </button>
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
        <span style={{ color: "#8b8d98" }}>{label}</span>
        <span style={{ color: isOver ? "#ef4444" : "#5c5e6a" }} className={isOver ? "font-semibold" : ""}>
          {current}{max > 0 ? ` / ${max}` : ""}
        </span>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: "rgba(255,255,255,0.06)" }}>
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${max > 0 ? pct : 0}%`, backgroundColor: isOver ? "#ef4444" : isHigh ? "#f59e0b" : "#ff6a3d" }}
        />
      </div>
    </div>
  );
}

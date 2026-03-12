import { useState, useEffect } from "react";
import { useSubscription } from "../../lib/subscription";
import {
  CreditCard, Crown, Sparkles, Zap, ChevronRight,
  Loader2, AlertTriangle, CheckCircle2, XCircle,
  Clock, Receipt, RotateCcw, Mail,
} from "lucide-react";
import axios from "axios";
import { toast } from "sonner";
import UpgradeModal from "../../components/UpgradeModal";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const TIER_ICONS = { basic: Zap, pro: Sparkles, premium: Crown };
const TIER_COLORS = { basic: "text-zinc-400", pro: "text-teal-500", premium: "text-amber-400" };

function StatusBadge({ status }) {
  if (status === "paid")
    return <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/15 text-emerald-500" data-testid="txn-status-paid">Paid</span>;
  if (status === "pending" || status === "unpaid")
    return <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/15 text-amber-500" data-testid="txn-status-pending">Pending</span>;
  return <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-zinc-500/15 text-zinc-400" data-testid="txn-status-other">{status}</span>;
}

export default function BillingPage() {
  const { subscription, refresh } = useSubscription();
  const [billing, setBilling] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [reactivateLoading, setReactivateLoading] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  useEffect(() => {
    axios.get(`${API}/stripe/billing-history`)
      .then((res) => setBilling(res.data))
      .catch(() => toast.error("Failed to load billing info"))
      .finally(() => setLoading(false));
  }, []);

  const handleCancel = async () => {
    setCancelLoading(true);
    try {
      const res = await axios.post(`${API}/stripe/cancel`);
      toast.success(res.data.message);
      setBilling((prev) => ({ ...prev, cancel_at_period_end: true, plan_expires_at: res.data.plan_expires_at }));
      setShowCancelConfirm(false);
      refresh();
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Failed to cancel");
    } finally { setCancelLoading(false); }
  };

  const handleReactivate = async () => {
    setReactivateLoading(true);
    try {
      const res = await axios.post(`${API}/stripe/reactivate`);
      toast.success(res.data.message);
      setBilling((prev) => ({ ...prev, cancel_at_period_end: false, plan_expires_at: null }));
      refresh();
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Failed to reactivate");
    } finally { setReactivateLoading(false); }
  };

  const formatDate = (d) => {
    if (!d) return "\u2014";
    return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  const formatAmount = (amt, currency = "usd") => {
    if (typeof amt !== "number") return "\u2014";
    return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amt);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24" data-testid="billing-loading">
        <Loader2 className="w-6 h-6 animate-spin text-teal-600" />
      </div>
    );
  }

  const tier = billing?.subscription?.tier || subscription?.tier || "basic";
  const TierIcon = TIER_ICONS[tier] || Zap;
  const tierColor = TIER_COLORS[tier] || "text-zinc-400";
  const isPaid = tier !== "basic";
  const isCancelling = billing?.cancel_at_period_end;

  let blockedImportCount = 0;
  try { blockedImportCount = parseInt(localStorage.getItem("import_blocked_count") || "0", 10); } catch {}

  return (
    <div className="max-w-3xl mx-auto space-y-6" data-testid="billing-page">
      {/* Schools waiting banner */}
      {blockedImportCount > 0 && tier !== "premium" && (
        <div className="rounded-xl border p-4 flex items-start gap-3"
          style={{ backgroundColor: "rgba(26,138,128,0.06)", borderColor: "rgba(26,138,128,0.15)" }}
          data-testid="blocked-import-banner">
          <Mail className="w-5 h-5 flex-shrink-0 mt-0.5 text-teal-500" />
          <div>
            <p className="text-sm font-semibold" style={{ color: "var(--cm-text)" }}>
              {blockedImportCount} school{blockedImportCount !== 1 ? "s" : ""} waiting to be imported
            </p>
            <p className="text-xs mt-0.5" style={{ color: "var(--cm-text-3)" }}>
              Your Gmail scan found more schools than your current plan allows. Upgrade to import them all.
            </p>
          </div>
        </div>
      )}

      {/* Current Plan */}
      <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: "var(--cm-surface)", borderColor: "var(--cm-border)" }} data-testid="current-plan-card">
        <div className="px-6 pt-6 pb-2 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: "rgba(26,138,128,0.15)" }}>
            <CreditCard className="w-5 h-5 text-teal-500" />
          </div>
          <div>
            <h2 className="font-semibold text-lg" style={{ color: "var(--cm-text)" }}>Current Plan</h2>
            <p className="text-sm" style={{ color: "var(--cm-text-3)" }}>Your subscription details</p>
          </div>
        </div>

        <div className="px-6 py-5">
          <div className="flex items-center justify-between p-4 rounded-xl" style={{ backgroundColor: "var(--cm-surface-2)" }}>
            <div className="flex items-center gap-3">
              <TierIcon className={`w-6 h-6 ${tierColor}`} />
              <div>
                <p className="text-base font-bold" style={{ color: "var(--cm-text)" }}>
                  {billing?.subscription?.label || subscription?.label || "Starter"} Plan
                </p>
                <p className="text-sm" style={{ color: "var(--cm-text-3)" }}>
                  {isPaid ? `${formatAmount(billing?.subscription?.price)}/month` : "Free forever"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isCancelling && (
                <span className="px-3 py-1 rounded-lg text-xs font-semibold bg-amber-500/15 text-amber-500" data-testid="cancellation-badge">
                  Cancels {formatDate(billing?.plan_expires_at)}
                </span>
              )}
              {tier !== "premium" && (
                <button onClick={() => setShowUpgrade(true)}
                  className="flex items-center gap-1 px-4 py-2 text-sm font-medium rounded-lg text-white bg-teal-600 hover:bg-teal-700 transition-colors"
                  data-testid="billing-upgrade-btn">
                  Upgrade <ChevronRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Usage Bars */}
          {subscription?.usage && (
            <div className="grid grid-cols-2 gap-6 mt-5">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium" style={{ color: "var(--cm-text-3)" }}>Schools on board</span>
                  <span className="text-xs font-semibold" style={{ color: "var(--cm-text)" }}>
                    {subscription.usage.schools || 0}/{subscription.usage.schools_limit === -1 ? "\u221e" : subscription.usage.schools_limit || 5}
                  </span>
                </div>
                <div className="w-full h-2 rounded-full overflow-hidden" style={{ backgroundColor: "var(--cm-surface-2)" }}>
                  <div className="h-full rounded-full transition-all duration-500" style={{
                    width: subscription.usage.schools_limit === -1 ? "15%" : `${Math.min(100, ((subscription.usage.schools || 0) / (subscription.usage.schools_limit || 5)) * 100)}%`,
                    backgroundColor: "#1a8a80",
                  }} />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium" style={{ color: "var(--cm-text-3)" }}>AI drafts this month</span>
                  <span className="text-xs font-semibold" style={{ color: "var(--cm-text)" }}>
                    {subscription.usage.ai_drafts_used || 0}/{subscription.usage.ai_drafts_limit === -1 ? "\u221e" : subscription.usage.ai_drafts_limit || 0}
                  </span>
                </div>
                <div className="w-full h-2 rounded-full overflow-hidden" style={{ backgroundColor: "var(--cm-surface-2)" }}>
                  <div className="h-full rounded-full transition-all duration-500" style={{
                    width: subscription.usage.ai_drafts_limit <= 0 ? "0%" : subscription.usage.ai_drafts_limit === -1 ? "15%" : `${Math.min(100, ((subscription.usage.ai_drafts_used || 0) / subscription.usage.ai_drafts_limit) * 100)}%`,
                    backgroundColor: "#8b5cf6",
                  }} />
                </div>
              </div>
            </div>
          )}

          {/* Cancellation Notice */}
          {isCancelling && (
            <div className="mt-4 p-4 rounded-xl border flex items-start gap-3"
              style={{ backgroundColor: "rgba(251,191,36,0.06)", borderColor: "rgba(251,191,36,0.2)" }}
              data-testid="cancellation-notice">
              <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-semibold" style={{ color: "var(--cm-text)" }}>Cancellation scheduled</p>
                <p className="text-xs mt-1" style={{ color: "var(--cm-text-3)" }}>
                  Your {billing?.subscription?.label} features will remain active until{" "}
                  <strong style={{ color: "var(--cm-text)" }}>{formatDate(billing?.plan_expires_at)}</strong>.
                  After that, your account will revert to the free Starter plan.
                </p>
                <button onClick={handleReactivate} disabled={reactivateLoading}
                  className="mt-3 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-teal-600 border border-teal-600/30 hover:bg-teal-600/10 transition-colors disabled:opacity-50"
                  data-testid="reactivate-btn">
                  {reactivateLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
                  Keep my plan
                </button>
              </div>
            </div>
          )}

          {/* Cancel Button */}
          {isPaid && !isCancelling && (
            <div className="mt-4 pt-4 border-t" style={{ borderColor: "var(--cm-border)" }}>
              {!showCancelConfirm ? (
                <button onClick={() => setShowCancelConfirm(true)}
                  className="text-xs font-medium transition-colors" style={{ color: "var(--cm-text-3)" }}
                  data-testid="cancel-plan-trigger">
                  Cancel subscription
                </button>
              ) : (
                <div className="p-4 rounded-xl border" style={{ backgroundColor: "rgba(239,68,68,0.04)", borderColor: "rgba(239,68,68,0.2)" }}
                  data-testid="cancel-confirm-box">
                  <p className="text-sm font-semibold" style={{ color: "var(--cm-text)" }}>Are you sure you want to cancel?</p>
                  <p className="text-xs mt-1" style={{ color: "var(--cm-text-3)" }}>
                    You'll keep access to all {billing?.subscription?.label} features until the end of your billing period.
                    After that, your account will revert to the free Starter plan.
                  </p>
                  <div className="flex items-center gap-2 mt-3">
                    <button onClick={handleCancel} disabled={cancelLoading}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-red-500 border border-red-500/30 hover:bg-red-500/10 transition-colors disabled:opacity-50"
                      data-testid="confirm-cancel-btn">
                      {cancelLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
                      Yes, cancel at period end
                    </button>
                    <button onClick={() => setShowCancelConfirm(false)}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                      style={{ color: "var(--cm-text-3)", border: "1px solid var(--cm-border)" }}
                      data-testid="cancel-nevermind-btn">
                      Never mind
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Plan Features */}
      {subscription && tier !== "premium" && (
        <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: "var(--cm-surface)", borderColor: "var(--cm-border)" }} data-testid="plan-features-card">
          <div className="px-6 pt-6 pb-2">
            <h3 className="text-sm font-semibold" style={{ color: "var(--cm-text-2)" }}>Your plan includes</h3>
          </div>
          <div className="px-6 pb-5 space-y-2">
            {[
              { label: "School tracking", included: true },
              { label: "Gmail integration", included: subscription.limits?.gmail_integration },
              { label: "Recruiting analytics", included: subscription.limits?.analytics },
              { label: "Follow-up reminders", included: subscription.limits?.follow_up_reminders },
              { label: "Public athlete profile", included: subscription.limits?.public_profile },
              { label: "AI email drafts", included: subscription.limits?.auto_reply_detection, premium: true },
              { label: "Engagement AI", included: subscription.limits?.auto_reply_detection, premium: true },
            ].map((feat, i) => (
              <div key={i} className="flex items-center justify-between py-1.5">
                <div className="flex items-center gap-2">
                  {feat.included ? <CheckCircle2 className="w-3.5 h-3.5 text-teal-600 flex-shrink-0" /> : <XCircle className="w-3.5 h-3.5 text-zinc-500 flex-shrink-0" />}
                  <span className={`text-sm ${feat.included ? "" : "opacity-50"}`} style={{ color: "var(--cm-text-2)" }}>{feat.label}</span>
                  {!feat.included && feat.premium && (
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/15 text-amber-400">PREMIUM</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Billing History */}
      <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: "var(--cm-surface)", borderColor: "var(--cm-border)" }} data-testid="billing-history-card">
        <div className="px-6 pt-6 pb-2 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: "rgba(139,92,246,0.15)" }}>
            <Receipt className="w-5 h-5 text-violet-500" />
          </div>
          <div>
            <h2 className="font-semibold text-lg" style={{ color: "var(--cm-text)" }}>Billing History</h2>
            <p className="text-sm" style={{ color: "var(--cm-text-3)" }}>Your past payments</p>
          </div>
        </div>
        <div className="px-6 py-5">
          {(!billing?.transactions || billing.transactions.length === 0) ? (
            <div className="text-center py-10" data-testid="no-transactions">
              <Receipt className="w-10 h-10 mx-auto mb-3 opacity-20" style={{ color: "var(--cm-text-3)" }} />
              <p className="text-sm" style={{ color: "var(--cm-text-3)" }}>No transactions yet</p>
              <p className="text-xs mt-1" style={{ color: "var(--cm-text-3)" }}>Your payment history will appear here after you upgrade.</p>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="grid grid-cols-12 gap-3 px-3 py-2 text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--cm-text-3)" }}>
                <div className="col-span-3">Date</div>
                <div className="col-span-3">Plan</div>
                <div className="col-span-2">Amount</div>
                <div className="col-span-2">Status</div>
                <div className="col-span-2">ID</div>
              </div>
              {billing.transactions.map((txn) => (
                <div key={txn.txn_id || txn.session_id}
                  className="grid grid-cols-12 gap-3 items-center px-3 py-3 rounded-xl transition-colors"
                  style={{ backgroundColor: "var(--cm-surface-2)" }}
                  data-testid={`txn-row-${txn.txn_id}`}>
                  <div className="col-span-3 flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "var(--cm-text-3)" }} />
                    <span className="text-sm" style={{ color: "var(--cm-text)" }}>{formatDate(txn.created_at)}</span>
                  </div>
                  <div className="col-span-3">
                    <span className="text-sm font-medium" style={{ color: "var(--cm-text)" }}>
                      {txn.metadata?.plan_label || txn.plan?.charAt(0).toUpperCase() + txn.plan?.slice(1)}
                    </span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-sm font-semibold" style={{ color: "var(--cm-text)" }}>{formatAmount(txn.amount)}</span>
                  </div>
                  <div className="col-span-2"><StatusBadge status={txn.payment_status} /></div>
                  <div className="col-span-2">
                    <span className="text-[11px] font-mono" style={{ color: "var(--cm-text-3)" }}>{txn.txn_id?.slice(0, 12) || "\u2014"}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <UpgradeModal isOpen={showUpgrade} onClose={() => setShowUpgrade(false)} currentTier={tier} />
    </div>
  );
}

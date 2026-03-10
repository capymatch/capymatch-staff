import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import {
  User, Mail, Shield, Key, Palette, ChevronRight,
  CheckCircle2, XCircle, Loader2, Eye, EyeOff, Download,
  Trash2, AlertTriangle, ToggleLeft, ToggleRight,
  CreditCard, Zap, Crown, BarChart3, ExternalLink, Bell,
  Clock, Receipt, RotateCcw
} from "lucide-react";
import { Button } from "../../components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../../components/ui/tabs";
import GmailConsentModal from "../../components/GmailConsentModal";
import GmailImportModal from "../../components/GmailImportModal";
import UpgradeModal from "../../components/UpgradeModal";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

function Toggle({ checked, onChange, testId }) {
  return (
    <button onClick={() => onChange(!checked)} className="relative" data-testid={testId}>
      {checked
        ? <ToggleRight className="w-9 h-9 text-teal-500" />
        : <ToggleLeft className="w-9 h-9 text-slate-500" />
      }
    </button>
  );
}

function SectionCard({ icon: Icon, title, children, testId }) {
  return (
    <div className="rounded-2xl border p-5 sm:p-6" style={{ backgroundColor: "var(--cm-surface)", borderColor: "var(--cm-border)" }} data-testid={testId}>
      <div className="flex items-center gap-2.5 mb-4">
        <div className="w-8 h-8 rounded-lg bg-teal-700/15 flex items-center justify-center">
          <Icon className="w-4 h-4 text-teal-600" />
        </div>
        <h3 className="text-sm font-bold" style={{ color: "var(--cm-text)" }}>{title}</h3>
      </div>
      {children}
    </div>
  );
}

function UsageBar({ label, used, limit, testId }) {
  const unlimited = limit === -1;
  const pct = unlimited ? 15 : limit > 0 ? Math.min((used / limit) * 100, 100) : 0;
  const color = pct >= 90 ? "#ef4444" : pct >= 70 ? "#f59e0b" : "#0d9488";
  return (
    <div data-testid={testId}>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-medium" style={{ color: "var(--cm-text-2)" }}>{label}</span>
        <span className="text-xs font-bold" style={{ color: "var(--cm-text)" }}>
          {used} / {unlimited ? "Unlimited" : limit}
        </span>
      </div>
      <div className="w-full h-2 rounded-full" style={{ backgroundColor: "var(--cm-surface-2)" }}>
        <div className="h-2 rounded-full transition-all duration-500" style={{ width: `${unlimited ? 15 : pct}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}

// ─── Profile Tab Content ─────────────────────
function ProfileTab({
  name, setName, emailVal, setEmailVal, saveProfile, savingProfile,
  currentPwd, setCurrentPwd, newPwd, setNewPwd, confirmPwd, setConfirmPwd,
  showCurrentPwd, setShowCurrentPwd, showNewPwd, setShowNewPwd,
  changePassword, changingPwd,
  prefs, togglePref,
  gmailStatus, showConsent, setShowConsent, showImport, setShowImport,
  handleGmailConnect, handleGmailDisconnect, disconnecting,
}) {
  return (
    <div className="space-y-5">
      {/* Personal Info */}
      <SectionCard icon={User} title="Personal Information" testId="section-personal">
        <div className="space-y-3">
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider block mb-1.5" style={{ color: "var(--cm-text-3)" }}>Name</label>
            <input value={name} onChange={e => setName(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border text-sm outline-none focus:ring-1 focus:ring-teal-600"
              style={{ backgroundColor: "var(--cm-input-bg)", borderColor: "var(--cm-border)", color: "var(--cm-text)" }}
              data-testid="settings-name-input" />
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider block mb-1.5" style={{ color: "var(--cm-text-3)" }}>Email</label>
            <input value={emailVal} onChange={e => setEmailVal(e.target.value)} type="email"
              className="w-full px-3 py-2 rounded-lg border text-sm outline-none focus:ring-1 focus:ring-teal-600"
              style={{ backgroundColor: "var(--cm-input-bg)", borderColor: "var(--cm-border)", color: "var(--cm-text)" }}
              data-testid="settings-email-input" />
          </div>
          <Button onClick={saveProfile} disabled={savingProfile}
            className="bg-teal-700 hover:bg-teal-800 text-white text-xs h-8 px-4" data-testid="save-profile-btn">
            {savingProfile ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}Save Changes
          </Button>
        </div>
      </SectionCard>

      {/* Change Password */}
      <SectionCard icon={Key} title="Change Password" testId="section-password">
        <div className="space-y-3">
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider block mb-1.5" style={{ color: "var(--cm-text-3)" }}>Current Password</label>
            <div className="relative">
              <input type={showCurrentPwd ? "text" : "password"} value={currentPwd} onChange={e => setCurrentPwd(e.target.value)}
                className="w-full px-3 py-2 pr-10 rounded-lg border text-sm outline-none focus:ring-1 focus:ring-teal-600"
                style={{ backgroundColor: "var(--cm-input-bg)", borderColor: "var(--cm-border)", color: "var(--cm-text)" }}
                data-testid="current-password-input" />
              <button onClick={() => setShowCurrentPwd(!showCurrentPwd)} className="absolute right-3 top-2.5" style={{ color: "var(--cm-text-3)" }}>
                {showCurrentPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider block mb-1.5" style={{ color: "var(--cm-text-3)" }}>New Password</label>
            <div className="relative">
              <input type={showNewPwd ? "text" : "password"} value={newPwd} onChange={e => setNewPwd(e.target.value)}
                className="w-full px-3 py-2 pr-10 rounded-lg border text-sm outline-none focus:ring-1 focus:ring-teal-600"
                style={{ backgroundColor: "var(--cm-input-bg)", borderColor: "var(--cm-border)", color: "var(--cm-text)" }}
                data-testid="new-password-input" />
              <button onClick={() => setShowNewPwd(!showNewPwd)} className="absolute right-3 top-2.5" style={{ color: "var(--cm-text-3)" }}>
                {showNewPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider block mb-1.5" style={{ color: "var(--cm-text-3)" }}>Confirm New Password</label>
            <input type="password" value={confirmPwd} onChange={e => setConfirmPwd(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border text-sm outline-none focus:ring-1 focus:ring-teal-600"
              style={{ backgroundColor: "var(--cm-input-bg)", borderColor: "var(--cm-border)", color: "var(--cm-text)" }}
              data-testid="confirm-password-input" />
          </div>
          <Button onClick={changePassword} disabled={changingPwd || !currentPwd || !newPwd}
            className="bg-teal-700 hover:bg-teal-800 text-white text-xs h-8 px-4" data-testid="change-password-btn">
            {changingPwd ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}Update Password
          </Button>
        </div>
      </SectionCard>

      {/* Notifications */}
      <SectionCard icon={Bell} title="Notifications" testId="section-notifications">
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 rounded-xl" style={{ backgroundColor: "var(--cm-surface-2)" }}>
            <div>
              <p className="text-xs font-semibold" style={{ color: "var(--cm-text)" }}>Follow-up Reminders</p>
              <p className="text-[10px]" style={{ color: "var(--cm-text-2)" }}>Get reminded when follow-ups are due</p>
            </div>
            <Toggle checked={prefs.followup_reminders} onChange={v => togglePref("followup_reminders", v)} testId="toggle-followup-reminders" />
          </div>
          <div className="flex items-center justify-between p-3 rounded-xl" style={{ backgroundColor: "var(--cm-surface-2)" }}>
            <div>
              <p className="text-xs font-semibold" style={{ color: "var(--cm-text)" }}>Email Notifications</p>
              <p className="text-[10px]" style={{ color: "var(--cm-text-2)" }}>Receive weekly digest and important alerts</p>
            </div>
            <Toggle checked={prefs.email_notifications} onChange={v => togglePref("email_notifications", v)} testId="toggle-email-notifications" />
          </div>
        </div>
      </SectionCard>

      {/* Appearance */}
      <SectionCard icon={Palette} title="Appearance" testId="section-appearance">
        <div className="flex gap-2">
          {[
            { key: "dark", label: "Dark" },
            { key: "light", label: "Light" },
            { key: "system", label: "System" },
          ].map(opt => (
            <button key={opt.key} onClick={() => togglePref("theme", opt.key)}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold transition-all border ${
                prefs.theme === opt.key
                  ? "bg-teal-700/20 border-teal-700/40 text-teal-400"
                  : "border-transparent"
              }`}
              style={prefs.theme !== opt.key ? { backgroundColor: "var(--cm-surface-2)", color: "var(--cm-text-3)" } : {}}
              data-testid={`theme-${opt.key}`}>
              {opt.label}
            </button>
          ))}
        </div>
      </SectionCard>

      {/* Gmail Integration */}
      <SectionCard icon={Mail} title="Gmail Integration" testId="section-gmail">
        {gmailStatus.connected ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-teal-700/10 border border-teal-700/20">
              <CheckCircle2 className="w-5 h-5 text-teal-500 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold" style={{ color: "var(--cm-text)" }}>Connected</p>
                <p className="text-[11px] truncate" style={{ color: "var(--cm-text-2)" }}>{gmailStatus.gmail_email}</p>
              </div>
              <Button variant="outline" size="sm" onClick={handleGmailDisconnect} disabled={disconnecting}
                className="text-xs h-7 px-3 text-red-400 border-red-500/30 hover:bg-red-500/10" data-testid="gmail-disconnect-btn">
                {disconnecting ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <XCircle className="w-3 h-3 mr-1" />}
                Disconnect
              </Button>
            </div>
            <button onClick={() => setShowImport(true)}
              className="w-full flex items-center gap-3 p-3.5 rounded-xl border transition-colors"
              style={{ backgroundColor: "var(--cm-surface-2)", borderColor: "var(--cm-border)" }}
              data-testid="gmail-import-btn">
              <div className="w-9 h-9 rounded-lg bg-teal-700/15 flex items-center justify-center">
                <Mail className="w-4 h-4 text-teal-600" />
              </div>
              <div className="text-left flex-1">
                <p className="text-xs font-bold" style={{ color: "var(--cm-text)" }}>Import from Gmail</p>
                <p className="text-[10px]" style={{ color: "var(--cm-text-2)" }}>Scan your inbox to auto-discover schools</p>
              </div>
              <ChevronRight className="w-4 h-4" style={{ color: "var(--cm-text-3)" }} />
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-xs leading-relaxed" style={{ color: "var(--cm-text-2)" }}>
              Connect your Gmail to send emails directly from CapyMatch and scan your inbox to
              automatically discover schools you've been talking to.
            </p>
            <Button onClick={() => setShowConsent(true)}
              className="bg-teal-700 hover:bg-teal-800 text-white text-xs h-9 px-5" data-testid="gmail-connect-btn">
              <Mail className="w-3.5 h-3.5 mr-2" />Connect Gmail
            </Button>
          </div>
        )}
      </SectionCard>
    </div>
  );
}

// ─── Billing Tab Content ─────────────────────
function BillingTab({ subscription, subLoading, onOpenUpgrade, onManageBilling, managingBilling, billingData, billingLoading, onCancel, onReactivate, cancelling, reactivating, onRefreshBilling }) {
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  if (subLoading && billingLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-teal-600" />
      </div>
    );
  }

  const sub = subscription || {};
  const tier = sub.tier || "basic";
  const label = sub.label || "Starter";
  const price = sub.price || 0;
  const features = sub.features || [];
  const usage = sub.usage || {};

  const tierIcon = tier === "premium" ? Crown : tier === "pro" ? Zap : BarChart3;
  const TierIcon = tierIcon;
  const tierColor = tier === "premium" ? "#a855f7" : tier === "pro" ? "#0d9488" : "#64748b";

  const cancelPending = billingData?.cancel_at_period_end || false;
  const expiresAt = billingData?.plan_expires_at;
  const transactions = billingData?.transactions || [];

  return (
    <div className="space-y-5">
      {/* Cancellation Banner */}
      {cancelPending && tier !== "basic" && (
        <div className="rounded-2xl border border-amber-500/30 p-4 flex items-start gap-3" style={{ backgroundColor: "rgba(245,158,11,0.05)" }} data-testid="cancel-banner">
          <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-xs font-bold" style={{ color: "var(--cm-text)" }}>Cancellation Scheduled</p>
            <p className="text-[10px] mt-0.5" style={{ color: "var(--cm-text-2)" }}>
              Your {label} plan will remain active until {expiresAt ? new Date(expiresAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) : "the end of your billing period"}.
              After that, you'll be downgraded to the free Starter plan.
            </p>
            <Button size="sm" onClick={onReactivate} disabled={reactivating}
              className="mt-2.5 text-xs h-7 px-4 bg-amber-600 hover:bg-amber-700 text-white" data-testid="reactivate-btn">
              {reactivating ? <Loader2 className="w-3 h-3 animate-spin mr-1.5" /> : <RotateCcw className="w-3 h-3 mr-1.5" />}
              Keep My Plan
            </Button>
          </div>
        </div>
      )}

      {/* Current Plan Card */}
      <div className="rounded-2xl border overflow-hidden" style={{ backgroundColor: "var(--cm-surface)", borderColor: "var(--cm-border)" }} data-testid="section-current-plan">
        <div className="p-5 sm:p-6">
          <div className="flex items-start justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${tierColor}20` }}>
                <TierIcon className="w-5 h-5" style={{ color: tierColor }} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold" style={{ color: "var(--cm-text)" }}>{label}</h3>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full" style={{ backgroundColor: `${tierColor}20`, color: tierColor }}>
                    {tier === "basic" ? "Free" : cancelPending ? "Cancelling" : "Active"}
                  </span>
                </div>
                <p className="text-xs mt-0.5" style={{ color: "var(--cm-text-3)" }}>
                  {price === 0 ? "Free forever" : `$${price}/month`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {tier !== "premium" && !cancelPending && (
                <Button onClick={onOpenUpgrade}
                  className="text-xs h-8 px-4 font-bold"
                  style={{ backgroundColor: "#0d9488", color: "#fff" }}
                  data-testid="upgrade-plan-btn">
                  <Zap className="w-3.5 h-3.5 mr-1.5" />Upgrade
                </Button>
              )}
            </div>
          </div>

          {/* Plan Features */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-5">
            {features.slice(0, 6).map((f, i) => (
              <div key={i} className="flex items-center gap-2 text-xs" style={{ color: "var(--cm-text-2)" }}>
                <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" style={{ color: tierColor }} />
                <span>{f}</span>
              </div>
            ))}
          </div>

          {/* Usage Stats */}
          <div className="space-y-3 pt-4" style={{ borderTop: "1px solid var(--cm-border)" }}>
            <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--cm-text-3)" }}>Usage This Period</p>
            <UsageBar label="Schools" used={usage.schools || 0} limit={usage.schools_limit || 5} testId="usage-schools" />
            <UsageBar label="AI Drafts" used={usage.ai_drafts_used || 0} limit={usage.ai_drafts_limit || 0} testId="usage-ai-drafts" />
          </div>
        </div>

        {/* Action Bar */}
        {tier !== "basic" && (
          <div className="px-5 sm:px-6 py-3.5 flex items-center justify-between gap-3 flex-wrap" style={{ borderTop: "1px solid var(--cm-border)", backgroundColor: "var(--cm-surface-2)" }}>
            <div>
              <p className="text-xs font-semibold" style={{ color: "var(--cm-text)" }}>Manage Billing</p>
              <p className="text-[10px]" style={{ color: "var(--cm-text-3)" }}>Update payment method, view invoices, or cancel</p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={onManageBilling} disabled={managingBilling}
                className="text-xs h-8 px-4" data-testid="manage-billing-btn">
                {managingBilling ? <Loader2 className="w-3 h-3 animate-spin mr-1.5" /> : <ExternalLink className="w-3 h-3 mr-1.5" />}
                Billing Portal
              </Button>
              {!cancelPending && (
                <Button variant="outline" size="sm"
                  onClick={() => setShowCancelConfirm(true)}
                  className="text-xs h-8 px-4 text-red-400 border-red-500/30 hover:bg-red-500/10"
                  data-testid="cancel-plan-btn">
                  Cancel Plan
                </Button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Cancel Confirmation Dialog */}
      {showCancelConfirm && (
        <div className="rounded-2xl border border-red-500/30 p-5" style={{ backgroundColor: "rgba(239,68,68,0.03)" }} data-testid="cancel-confirm-dialog">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-bold text-red-400 mb-1">Cancel your {label} plan?</p>
              <p className="text-xs leading-relaxed mb-3" style={{ color: "var(--cm-text-2)" }}>
                Your plan will remain active until the end of your billing period. After that, you'll be downgraded
                to the free Starter plan and lose access to premium features. You can reactivate anytime before then.
              </p>
              <div className="flex items-center gap-2">
                <Button size="sm" onClick={async () => { await onCancel(); setShowCancelConfirm(false); }} disabled={cancelling}
                  className="text-xs h-8 px-4 bg-red-600/80 hover:bg-red-600 text-white" data-testid="confirm-cancel-btn">
                  {cancelling ? <Loader2 className="w-3 h-3 animate-spin mr-1.5" /> : null}
                  Yes, Cancel
                </Button>
                <Button variant="outline" size="sm" onClick={() => setShowCancelConfirm(false)}
                  className="text-xs h-8 px-4" data-testid="keep-plan-btn">
                  Keep Plan
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Billing History */}
      <SectionCard icon={Receipt} title="Billing History" testId="section-billing-history">
        {billingLoading ? (
          <div className="flex items-center gap-2 py-3">
            <Loader2 className="w-4 h-4 animate-spin text-teal-600" />
            <span className="text-xs" style={{ color: "var(--cm-text-3)" }}>Loading transactions...</span>
          </div>
        ) : transactions.length === 0 ? (
          <div className="text-center py-6">
            <Receipt className="w-8 h-8 mx-auto mb-2" style={{ color: "var(--cm-text-3)", opacity: 0.4 }} />
            <p className="text-xs" style={{ color: "var(--cm-text-3)" }}>No transactions yet</p>
            <p className="text-[10px] mt-0.5" style={{ color: "var(--cm-text-3)", opacity: 0.6 }}>
              Your payment history will appear here after your first upgrade.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto -mx-1">
            <table className="w-full text-xs" data-testid="billing-history-table">
              <thead>
                <tr style={{ borderBottom: "1px solid var(--cm-border)" }}>
                  <th className="text-left py-2 px-2 font-semibold" style={{ color: "var(--cm-text-3)" }}>Date</th>
                  <th className="text-left py-2 px-2 font-semibold" style={{ color: "var(--cm-text-3)" }}>Plan</th>
                  <th className="text-right py-2 px-2 font-semibold" style={{ color: "var(--cm-text-3)" }}>Amount</th>
                  <th className="text-right py-2 px-2 font-semibold" style={{ color: "var(--cm-text-3)" }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((txn, i) => {
                  const date = txn.created_at ? new Date(txn.created_at) : null;
                  const statusColor = txn.payment_status === "paid" ? "#10b981" : txn.payment_status === "pending" ? "#f59e0b" : "#ef4444";
                  return (
                    <tr key={txn.txn_id || txn.session_id || i} style={{ borderBottom: "1px solid var(--cm-border)" }} data-testid={`txn-row-${i}`}>
                      <td className="py-2.5 px-2" style={{ color: "var(--cm-text-2)" }}>
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3 h-3 flex-shrink-0" style={{ color: "var(--cm-text-3)" }} />
                          {date ? date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"}
                        </div>
                      </td>
                      <td className="py-2.5 px-2 font-medium" style={{ color: "var(--cm-text)" }}>
                        {TIERS_MAP[txn.tier] || txn.tier || "—"}
                      </td>
                      <td className="py-2.5 px-2 text-right font-semibold" style={{ color: "var(--cm-text)" }}>
                        ${txn.amount ? txn.amount.toFixed(2) : "0.00"}
                      </td>
                      <td className="py-2.5 px-2 text-right">
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
                          style={{ backgroundColor: `${statusColor}15`, color: statusColor }}>
                          {txn.payment_status === "paid" && <CheckCircle2 className="w-2.5 h-2.5" />}
                          {txn.payment_status || "unknown"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      {/* Compare Plans */}
      {tier !== "premium" && !cancelPending && (
        <button onClick={onOpenUpgrade}
          className="w-full flex items-center gap-3 p-4 rounded-2xl border transition-all hover:border-teal-700/40"
          style={{ backgroundColor: "var(--cm-surface)", borderColor: "var(--cm-border)" }}
          data-testid="compare-plans-btn">
          <div className="w-10 h-10 rounded-xl bg-teal-700/15 flex items-center justify-center">
            <CreditCard className="w-4.5 h-4.5 text-teal-600" />
          </div>
          <div className="text-left flex-1">
            <p className="text-xs font-bold" style={{ color: "var(--cm-text)" }}>Compare All Plans</p>
            <p className="text-[10px]" style={{ color: "var(--cm-text-2)" }}>See what you get with Pro and Premium</p>
          </div>
          <ChevronRight className="w-4 h-4" style={{ color: "var(--cm-text-3)" }} />
        </button>
      )}

      {/* Key Feature Highlights for basic tier */}
      {tier === "basic" && (
        <div className="rounded-2xl border p-5 sm:p-6" style={{ backgroundColor: "var(--cm-surface)", borderColor: "var(--cm-border)" }} data-testid="section-upgrade-highlights">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-8 h-8 rounded-lg bg-amber-600/15 flex items-center justify-center">
              <Zap className="w-4 h-4 text-amber-500" />
            </div>
            <h3 className="text-sm font-bold" style={{ color: "var(--cm-text)" }}>Unlock More with Pro</h3>
          </div>
          <div className="grid grid-cols-1 gap-3">
            {[
              { icon: Mail, text: "Gmail integration & auto-scanning", desc: "Send emails directly and detect coach replies" },
              { icon: BarChart3, text: "Outreach analytics", desc: "Track open rates, clicks, and engagement" },
              { icon: Crown, text: "Recruiting insights", desc: "Smart recommendations for your pipeline" },
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-xl" style={{ backgroundColor: "var(--cm-surface-2)" }}>
                <div className="w-8 h-8 rounded-lg bg-teal-700/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <item.icon className="w-3.5 h-3.5 text-teal-600" />
                </div>
                <div>
                  <p className="text-xs font-semibold" style={{ color: "var(--cm-text)" }}>{item.text}</p>
                  <p className="text-[10px]" style={{ color: "var(--cm-text-3)" }}>{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Data & Privacy */}
      <SectionCard icon={Shield} title="Data & Privacy" testId="section-privacy">
        <DataPrivacyContent />
      </SectionCard>
    </div>
  );
}

const TIERS_MAP = { basic: "Starter", pro: "Pro", premium: "Premium" };

// ─── Data & Privacy Section (shared) ─────────
function DataPrivacyContent() {
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);

  const exportData = async () => {
    try {
      const res = await axios.get(`${API}/athlete/settings/export-data`);
      const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `capymatch-data-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Data exported");
    } catch { toast.error("Failed to export data"); }
  };

  const deleteAccount = async () => {
    if (deleteConfirm !== "DELETE") { toast.error("Type DELETE to confirm"); return; }
    setDeleting(true);
    try {
      await axios.delete(`${API}/athlete/settings/delete-account`, { data: { confirmation: "DELETE" } });
      toast.success("Account deleted");
      window.location.href = "/login";
    } catch { toast.error("Failed to delete account"); }
    finally { setDeleting(false); }
  };

  return (
    <div className="space-y-3">
      <button onClick={exportData}
        className="w-full flex items-center gap-3 p-3 rounded-xl border transition-colors"
        style={{ backgroundColor: "var(--cm-surface-2)", borderColor: "var(--cm-border)" }}
        data-testid="export-data-btn">
        <Download className="w-4 h-4" style={{ color: "var(--cm-text-3)" }} />
        <span className="text-xs font-medium" style={{ color: "var(--cm-text)" }}>Export My Data</span>
      </button>
      <div className="mt-4 pt-4" style={{ borderTop: "1px solid var(--cm-border)" }}>
        <div className="flex items-start gap-3 p-3 rounded-xl bg-red-600/5 border border-red-500/15">
          <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-xs font-bold text-red-300 mb-1">Danger Zone</p>
            <p className="text-[10px] text-red-400/60 mb-3">
              This permanently deletes your account and all associated data. This action cannot be undone.
            </p>
            <div className="flex items-center gap-2">
              <input value={deleteConfirm} onChange={e => setDeleteConfirm(e.target.value)}
                placeholder='Type "DELETE" to confirm'
                className="flex-1 px-3 py-1.5 rounded-lg border text-xs outline-none"
                style={{ backgroundColor: "var(--cm-input-bg)", borderColor: "rgba(239,68,68,0.2)", color: "var(--cm-text)" }}
                data-testid="delete-confirm-input" />
              <Button variant="destructive" size="sm" onClick={deleteAccount} disabled={deleting || deleteConfirm !== "DELETE"}
                className="text-xs h-7 px-3 bg-red-600/80 hover:bg-red-600" data-testid="delete-account-btn">
                {deleting ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Trash2 className="w-3 h-3 mr-1" />}
                Delete
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


// ─── Main Settings Page ──────────────────────
export default function SettingsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [gmailStatus, setGmailStatus] = useState({ connected: false });
  const [showConsent, setShowConsent] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  // Personal info state
  const [name, setName] = useState("");
  const [emailVal, setEmailVal] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  // Password state
  const [currentPwd, setCurrentPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [showCurrentPwd, setShowCurrentPwd] = useState(false);
  const [showNewPwd, setShowNewPwd] = useState(false);
  const [changingPwd, setChangingPwd] = useState(false);

  // Subscription state
  const [subscription, setSubscription] = useState(null);
  const [subLoading, setSubLoading] = useState(true);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [managingBilling, setManagingBilling] = useState(false);

  // Billing data state
  const [billingData, setBillingData] = useState(null);
  const [billingLoading, setBillingLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [reactivating, setReactivating] = useState(false);

  // Active tab
  const [activeTab, setActiveTab] = useState("profile");

  const fetchSettings = useCallback(async () => {
    try {
      const [sRes, gRes] = await Promise.all([
        axios.get(`${API}/athlete/settings`),
        axios.get(`${API}/athlete/gmail/status`),
      ]);
      setSettings(sRes.data);
      setName(sRes.data.name || "");
      setEmailVal(sRes.data.email || "");
      setGmailStatus(gRes.data);
    } catch {
      toast.error("Failed to load settings");
    } finally { setLoading(false); }
  }, []);

  const fetchSubscription = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/subscription`);
      setSubscription(res.data);
    } catch {
      // Subscription fetch failed silently
    } finally { setSubLoading(false); }
  }, []);

  const fetchBillingHistory = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/stripe/billing-history`);
      setBillingData(res.data);
    } catch {
      // Billing fetch failed silently
    } finally { setBillingLoading(false); }
  }, []);

  useEffect(() => {
    fetchSettings();
    fetchSubscription();
    fetchBillingHistory();
  }, [fetchSettings, fetchSubscription, fetchBillingHistory]);

  // Handle Gmail callback redirect
  useEffect(() => {
    const gmailParam = searchParams.get("gmail");
    if (gmailParam === "connected") {
      toast.success("Gmail connected successfully!");
      fetchSettings();
      searchParams.delete("gmail");
      setSearchParams(searchParams, { replace: true });
    } else if (gmailParam === "error") {
      const reason = searchParams.get("reason") || "Unknown error";
      toast.error(`Gmail connection failed: ${reason}`);
      searchParams.delete("gmail");
      searchParams.delete("reason");
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams, fetchSettings]);

  // Handle Stripe checkout redirect
  useEffect(() => {
    const sessionId = searchParams.get("session_id");
    const upgrade = searchParams.get("upgrade");
    if (sessionId && upgrade === "success") {
      setActiveTab("billing");
      const token = localStorage.getItem("session_token");
      axios.get(`${API}/checkout/status/${sessionId}`, {
        headers: { Authorization: `Bearer ${token}` },
      }).then(res => {
        if (res.data?.payment_status === "paid") {
          toast.success("Upgrade successful! Your plan has been updated.");
          fetchSubscription();
        } else {
          toast.info("Payment is processing. Your plan will update shortly.");
        }
      }).catch(() => {
        toast.info("Checking payment status...");
      }).finally(() => {
        searchParams.delete("session_id");
        searchParams.delete("upgrade");
        setSearchParams(searchParams, { replace: true });
        fetchSettings();
        fetchBillingHistory();
      });
    } else if (upgrade === "cancelled") {
      setActiveTab("billing");
      toast.info("Upgrade cancelled. No charges were made.");
      searchParams.delete("upgrade");
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams, fetchSettings, fetchSubscription]);

  const saveProfile = async () => {
    setSavingProfile(true);
    try {
      await axios.put(`${API}/athlete/settings`, { name, email: emailVal });
      toast.success("Profile updated");
    } catch (e) {
      toast.error(e.response?.data?.detail || "Failed to save");
    } finally { setSavingProfile(false); }
  };

  const togglePref = async (key, value) => {
    try {
      await axios.put(`${API}/athlete/settings`, { [key]: value });
      setSettings(prev => ({
        ...prev,
        preferences: { ...prev.preferences, [key]: value }
      }));
    } catch { toast.error("Failed to update"); }
  };

  const changePassword = async () => {
    if (newPwd !== confirmPwd) { toast.error("Passwords don't match"); return; }
    if (newPwd.length < 6) { toast.error("Password must be at least 6 characters"); return; }
    setChangingPwd(true);
    try {
      await axios.post(`${API}/athlete/settings/change-password`, { current_password: currentPwd, new_password: newPwd });
      toast.success("Password changed");
      setCurrentPwd(""); setNewPwd(""); setConfirmPwd("");
    } catch (e) {
      toast.error(e.response?.data?.detail || "Failed to change password");
    } finally { setChangingPwd(false); }
  };

  const handleGmailConnect = async () => {
    try {
      const res = await axios.get(`${API}/athlete/gmail/connect?return_to=/athlete-settings`);
      window.location.href = res.data.auth_url;
    } catch (e) {
      toast.error(e.response?.data?.detail || "Failed to start Gmail connect");
    }
  };

  const handleGmailDisconnect = async () => {
    setDisconnecting(true);
    try {
      await axios.post(`${API}/athlete/gmail/disconnect`);
      setGmailStatus({ connected: false });
      toast.success("Gmail disconnected");
    } catch { toast.error("Failed to disconnect"); }
    finally { setDisconnecting(false); }
  };

  const handleCancelSubscription = async () => {
    setCancelling(true);
    try {
      const res = await axios.post(`${API}/stripe/cancel`);
      toast.success(res.data?.message || "Cancellation scheduled");
      fetchSubscription();
      fetchBillingHistory();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Failed to cancel subscription");
    } finally { setCancelling(false); }
  };

  const handleReactivate = async () => {
    setReactivating(true);
    try {
      const res = await axios.post(`${API}/stripe/reactivate`);
      toast.success(res.data?.message || "Subscription reactivated!");
      fetchSubscription();
      fetchBillingHistory();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Failed to reactivate");
    } finally { setReactivating(false); }
  };

  const handleManageBilling = async () => {
    setManagingBilling(true);
    try {
      const res = await axios.post(`${API}/checkout/create-portal-session`, {
        return_url: `${window.location.origin}/athlete-settings`,
      });
      if (res.data?.url) {
        window.location.href = res.data.url;
      }
    } catch (e) {
      const msg = e.response?.data?.detail || "Could not open billing portal";
      if (msg.includes("No billing account")) {
        toast.error("No billing history yet. Upgrade to a paid plan first.");
      } else {
        toast.error(msg);
      }
    } finally { setManagingBilling(false); }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "var(--cm-bg)" }}>
        <Loader2 className="w-6 h-6 animate-spin text-teal-600" />
      </div>
    );
  }

  const prefs = settings?.preferences || {};

  return (
    <div className="min-h-screen pb-16" style={{ backgroundColor: "var(--cm-bg)" }} data-testid="settings-page">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 pt-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList
            className="w-full grid grid-cols-2 h-11 rounded-xl p-1 mb-6"
            style={{ backgroundColor: "var(--cm-surface)", border: "1px solid var(--cm-border)" }}
            data-testid="settings-tabs"
          >
            <TabsTrigger
              value="profile"
              className="rounded-lg text-xs font-bold transition-all data-[state=active]:bg-teal-700 data-[state=active]:text-white data-[state=active]:shadow-sm"
              style={{ color: "var(--cm-text-3)" }}
              data-testid="tab-profile"
            >
              <User className="w-3.5 h-3.5 mr-1.5" />Profile
            </TabsTrigger>
            <TabsTrigger
              value="billing"
              className="rounded-lg text-xs font-bold transition-all data-[state=active]:bg-teal-700 data-[state=active]:text-white data-[state=active]:shadow-sm"
              style={{ color: "var(--cm-text-3)" }}
              data-testid="tab-billing"
            >
              <CreditCard className="w-3.5 h-3.5 mr-1.5" />Plan & Billing
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile">
            <ProfileTab
              name={name} setName={setName}
              emailVal={emailVal} setEmailVal={setEmailVal}
              saveProfile={saveProfile} savingProfile={savingProfile}
              currentPwd={currentPwd} setCurrentPwd={setCurrentPwd}
              newPwd={newPwd} setNewPwd={setNewPwd}
              confirmPwd={confirmPwd} setConfirmPwd={setConfirmPwd}
              showCurrentPwd={showCurrentPwd} setShowCurrentPwd={setShowCurrentPwd}
              showNewPwd={showNewPwd} setShowNewPwd={setShowNewPwd}
              changePassword={changePassword} changingPwd={changingPwd}
              prefs={prefs} togglePref={togglePref}
              gmailStatus={gmailStatus}
              showConsent={showConsent} setShowConsent={setShowConsent}
              showImport={showImport} setShowImport={setShowImport}
              handleGmailConnect={handleGmailConnect}
              handleGmailDisconnect={handleGmailDisconnect}
              disconnecting={disconnecting}
            />
          </TabsContent>

          <TabsContent value="billing">
            <BillingTab
              subscription={subscription}
              subLoading={subLoading}
              onOpenUpgrade={() => setShowUpgrade(true)}
              onManageBilling={handleManageBilling}
              managingBilling={managingBilling}
              billingData={billingData}
              billingLoading={billingLoading}
              onCancel={handleCancelSubscription}
              onReactivate={handleReactivate}
              cancelling={cancelling}
              reactivating={reactivating}
              onRefreshBilling={fetchBillingHistory}
            />
          </TabsContent>
        </Tabs>
      </div>

      {/* Modals */}
      {showConsent && (
        <GmailConsentModal
          onAccept={() => { setShowConsent(false); handleGmailConnect(); }}
          onCancel={() => setShowConsent(false)}
        />
      )}
      {showImport && (
        <GmailImportModal onClose={() => setShowImport(false)} />
      )}
      <UpgradeModal
        isOpen={showUpgrade}
        onClose={() => { setShowUpgrade(false); fetchSubscription(); }}
        currentTier={subscription?.tier || "basic"}
      />
    </div>
  );
}

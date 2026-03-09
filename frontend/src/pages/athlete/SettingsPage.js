import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import {
  Settings, User, Mail, Shield, Key, Palette, ChevronRight,
  CheckCircle2, XCircle, Loader2, Eye, EyeOff, Download,
  Trash2, AlertTriangle, ToggleLeft, ToggleRight
} from "lucide-react";
import { Button } from "../../components/ui/button";
import GmailConsentModal from "../../components/GmailConsentModal";
import GmailImportModal from "../../components/GmailImportModal";

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

  // Delete account state
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);

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

  useEffect(() => { fetchSettings(); }, [fetchSettings]);

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
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-teal-700/15 flex items-center justify-center">
            <Settings className="w-5 h-5 text-teal-600" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold tracking-tight" style={{ color: "var(--cm-text)" }} data-testid="settings-title">Settings</h1>
            <p className="text-xs" style={{ color: "var(--cm-text-2)" }}>Manage your account, integrations, and preferences</p>
          </div>
        </div>

        <div className="space-y-5">
          {/* ── Personal Info ── */}
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

          {/* ── Gmail Integration ── */}
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
                    <p className="text-[10px]" style={{ color: "var(--cm-text-2)" }}>Scan your inbox to auto-discover schools and add them to your pipeline</p>
                  </div>
                  <ChevronRight className="w-4 h-4" style={{ color: "var(--cm-text-3)" }} />
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-xs leading-relaxed" style={{ color: "var(--cm-text-2)" }}>
                  Connect your Gmail to send emails directly from CapyMatch, and scan your inbox to
                  automatically discover schools you've been talking to.
                </p>
                <Button onClick={() => setShowConsent(true)}
                  className="bg-teal-700 hover:bg-teal-800 text-white text-xs h-9 px-5" data-testid="gmail-connect-btn">
                  <Mail className="w-3.5 h-3.5 mr-2" />Connect Gmail
                </Button>
              </div>
            )}
          </SectionCard>

          {/* ── Notifications ── */}
          <SectionCard icon={Settings} title="Notifications" testId="section-notifications">
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

          {/* ── Appearance ── */}
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

          {/* ── Change Password ── */}
          <SectionCard icon={Key} title="Change Password" testId="section-password">
            <div className="space-y-3">
              <div className="relative">
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
              <div className="relative">
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

          {/* ── Data & Privacy ── */}
          <SectionCard icon={Shield} title="Data & Privacy" testId="section-privacy">
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-xl" style={{ backgroundColor: "var(--cm-surface-2)" }}>
                <div>
                  <p className="text-xs font-semibold" style={{ color: "var(--cm-text)" }}>Inbound Email Scanning</p>
                  <p className="text-[10px]" style={{ color: "var(--cm-text-2)" }}>Auto-detect school emails in your inbox</p>
                </div>
                <Toggle checked={prefs.inbound_scan} onChange={v => togglePref("inbound_scan", v)} testId="toggle-inbound-scan" />
              </div>
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
          </SectionCard>
        </div>
      </div>

      {/* ── Modals ── */}
      {showConsent && (
        <GmailConsentModal
          onAccept={() => { setShowConsent(false); handleGmailConnect(); }}
          onCancel={() => setShowConsent(false)}
        />
      )}
      {showImport && (
        <GmailImportModal
          onClose={() => { setShowImport(false); }}
        />
      )}
    </div>
  );
}

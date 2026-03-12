import { useState, useEffect } from "react";
import {
  Lock, Trash2, Loader2, Shield, Bell, Download, Check,
  User, Pencil,
} from "lucide-react";
import axios from "axios";
import { toast } from "sonner";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function AccountPage() {
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [pwLoading, setPwLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  // Personal info
  const [accountName, setAccountName] = useState("");
  const [accountEmail, setAccountEmail] = useState("");
  const [originalName, setOriginalName] = useState("");
  const [originalEmail, setOriginalEmail] = useState("");
  const [infoLoading, setInfoLoading] = useState(true);
  const [infoSaving, setInfoSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Notification prefs
  const [prefs, setPrefs] = useState({ followup_reminders: true, email_notifications: true });

  useEffect(() => {
    axios.get(`${API}/athlete/settings`)
      .then((res) => {
        setAccountName(res.data.name || "");
        setAccountEmail(res.data.email || "");
        setOriginalName(res.data.name || "");
        setOriginalEmail(res.data.email || "");
        setPrefs(res.data.preferences || {});
      })
      .catch(() => {})
      .finally(() => setInfoLoading(false));
  }, []);

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (newPw.length < 6) { toast.error("New password must be at least 6 characters"); return; }
    if (newPw !== confirmPw) { toast.error("Passwords do not match"); return; }
    setPwLoading(true);
    try {
      await axios.post(`${API}/athlete/settings/change-password`, {
        current_password: currentPw, new_password: newPw,
      });
      toast.success("Password updated successfully");
      setCurrentPw(""); setNewPw(""); setConfirmPw("");
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Failed to change password");
    } finally { setPwLoading(false); }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== "DELETE") return;
    try {
      await axios.delete(`${API}/athlete/settings/delete-account`, {
        data: { confirmation: "DELETE" },
      });
      toast.success("Account deleted. Redirecting...");
      setTimeout(() => { window.location.href = "/login"; }, 1500);
    } catch { toast.error("Failed to delete account"); }
  };

  const handleExportData = async () => {
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

  const togglePref = async (key, value) => {
    setPrefs(p => ({ ...p, [key]: value }));
    try {
      await axios.put(`${API}/athlete/settings`, { [key]: value });
    } catch {
      setPrefs(p => ({ ...p, [key]: !value }));
      toast.error("Failed to update");
    }
  };

  return (
    <div data-testid="account-page" className="max-w-3xl mx-auto space-y-8">
      {/* Personal Info Card */}
      <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: "var(--cm-surface)", borderColor: "var(--cm-border)" }} data-testid="personal-info-card">
        <div className="flex items-center justify-between px-6 pt-6 pb-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: "rgba(26,138,128,0.2)" }}>
              <User className="w-5 h-5" style={{ color: "#1a8a80" }} />
            </div>
            <div>
              <h2 className="font-semibold text-lg" style={{ color: "var(--cm-text)" }}>Personal Info</h2>
              <p className="text-sm" style={{ color: "var(--cm-text-3)" }}>Your account name and email</p>
            </div>
          </div>
          {!isEditing && !infoLoading && (
            <button onClick={() => setIsEditing(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg font-medium transition-colors"
              style={{ backgroundColor: "var(--cm-surface-2)", color: "var(--cm-text-2)" }}
              data-testid="edit-personal-info-btn">
              <Pencil className="w-3.5 h-3.5" /> Edit
            </button>
          )}
        </div>
        <div className="px-6 py-4">
          {infoLoading ? (
            <div className="flex items-center gap-2 py-3">
              <Loader2 className="w-4 h-4 animate-spin" style={{ color: "#1a8a80" }} />
              <span className="text-sm" style={{ color: "var(--cm-text-3)" }}>Loading...</span>
            </div>
          ) : isEditing ? (
            <form onSubmit={async (e) => {
              e.preventDefault();
              if (!accountName.trim()) { toast.error("Name is required"); return; }
              if (!accountEmail.trim()) { toast.error("Email is required"); return; }
              setInfoSaving(true);
              try {
                await axios.put(`${API}/athlete/settings`, { name: accountName.trim(), email: accountEmail.trim() });
                setOriginalName(accountName.trim()); setOriginalEmail(accountEmail.trim()); setIsEditing(false);
                toast.success("Account info updated");
              } catch (err) { toast.error(err?.response?.data?.detail || "Failed to update"); }
              finally { setInfoSaving(false); }
            }} className="space-y-4">
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--cm-text-2)" }}>Name</label>
                <input type="text" value={accountName} onChange={(e) => setAccountName(e.target.value)} required
                  data-testid="account-name-input"
                  className="w-full px-3 py-2 rounded-lg text-sm border focus:outline-none transition-colors"
                  style={{ backgroundColor: "var(--cm-input-bg)", borderColor: "var(--cm-border)", color: "var(--cm-text)" }} />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--cm-text-2)" }}>Email</label>
                <input type="email" value={accountEmail} onChange={(e) => setAccountEmail(e.target.value)} required
                  data-testid="account-email-input"
                  className="w-full px-3 py-2 rounded-lg text-sm border focus:outline-none transition-colors"
                  style={{ backgroundColor: "var(--cm-input-bg)", borderColor: "var(--cm-border)", color: "var(--cm-text)" }} />
              </div>
              <div className="flex items-center gap-2 pt-1">
                <button type="submit" disabled={infoSaving || (accountName === originalName && accountEmail === originalEmail)}
                  data-testid="save-personal-info-btn"
                  className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg font-medium text-white transition-colors disabled:opacity-50"
                  style={{ backgroundColor: "#1a8a80" }}>
                  {infoSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Save Changes
                </button>
                <button type="button" onClick={() => { setAccountName(originalName); setAccountEmail(originalEmail); setIsEditing(false); }}
                  className="px-4 py-2 text-sm rounded-lg font-medium transition-colors"
                  style={{ color: "var(--cm-text-3)", border: "1px solid var(--cm-border)" }}
                  data-testid="cancel-edit-personal-info-btn">
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-3">
              <div className="p-3 rounded-xl" style={{ backgroundColor: "var(--cm-surface-2)" }}>
                <p className="text-[11px] font-medium uppercase tracking-wider" style={{ color: "var(--cm-text-3)" }}>Name</p>
                <p className="text-sm font-medium mt-0.5" style={{ color: "var(--cm-text)" }} data-testid="account-name-display">{originalName || "\u2014"}</p>
              </div>
              <div className="p-3 rounded-xl" style={{ backgroundColor: "var(--cm-surface-2)" }}>
                <p className="text-[11px] font-medium uppercase tracking-wider" style={{ color: "var(--cm-text-3)" }}>Email</p>
                <p className="text-sm font-medium mt-0.5" style={{ color: "var(--cm-text)" }} data-testid="account-email-display">{originalEmail || "\u2014"}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Change Password */}
      <div className="rounded-xl p-6 border" style={{ backgroundColor: "var(--cm-surface)", borderColor: "var(--cm-border)" }} data-testid="password-section">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
            <Lock className="w-5 h-5 text-blue-500" />
          </div>
          <div>
            <h2 className="font-semibold text-lg" style={{ color: "var(--cm-text)" }}>Change Password</h2>
            <p className="text-sm" style={{ color: "var(--cm-text-3)" }}>Update your account password</p>
          </div>
        </div>
        <form onSubmit={handleChangePassword} className="space-y-4 max-w-sm">
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--cm-text-2)" }}>Current Password</label>
            <input type="password" value={currentPw} onChange={(e) => setCurrentPw(e.target.value)} required
              data-testid="current-password-input"
              className="w-full px-3 py-2 rounded-lg text-sm border focus:outline-none transition-colors"
              style={{ backgroundColor: "var(--cm-input-bg)", borderColor: "var(--cm-border)", color: "var(--cm-text)" }} />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--cm-text-2)" }}>New Password</label>
            <input type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} required minLength={6}
              data-testid="new-password-input"
              className="w-full px-3 py-2 rounded-lg text-sm border focus:outline-none transition-colors"
              style={{ backgroundColor: "var(--cm-input-bg)", borderColor: "var(--cm-border)", color: "var(--cm-text)" }} />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--cm-text-2)" }}>Confirm New Password</label>
            <input type="password" value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} required minLength={6}
              data-testid="confirm-password-input"
              className="w-full px-3 py-2 rounded-lg text-sm border focus:outline-none transition-colors"
              style={{ backgroundColor: "var(--cm-input-bg)", borderColor: "var(--cm-border)", color: "var(--cm-text)" }} />
          </div>
          <button type="submit" disabled={pwLoading} data-testid="change-password-btn"
            className="flex items-center gap-2 px-4 py-2.5 text-sm rounded-lg font-medium text-white bg-teal-600 hover:bg-teal-700 transition-colors disabled:opacity-50">
            {pwLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
            Update Password
          </button>
        </form>
      </div>

      {/* Notifications */}
      <div className="rounded-xl p-6 border" style={{ backgroundColor: "var(--cm-surface)", borderColor: "var(--cm-border)" }} data-testid="notifications-section">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-orange-500/20 flex items-center justify-center">
            <Bell className="w-5 h-5 text-orange-500" />
          </div>
          <div>
            <h2 className="font-semibold text-lg" style={{ color: "var(--cm-text)" }}>Notifications</h2>
            <p className="text-sm" style={{ color: "var(--cm-text-3)" }}>Manage your notification preferences</p>
          </div>
        </div>
        <div className="space-y-4">
          <div className="flex items-center justify-between py-3 border-b" style={{ borderColor: "var(--cm-border)" }}>
            <div>
              <p className="text-sm" style={{ color: "var(--cm-text)" }}>Follow-up Reminders</p>
              <p className="text-xs" style={{ color: "var(--cm-text-3)" }}>Get notified when follow-ups are due</p>
            </div>
            <button onClick={() => togglePref("followup_reminders", !prefs.followup_reminders)}
              className="relative w-11 h-6 rounded-full transition-colors flex-shrink-0"
              style={{ backgroundColor: prefs.followup_reminders ? "#1a8a80" : "var(--cm-surface-2)" }}
              data-testid="toggle-followup-reminders">
              <div className="absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform shadow-sm"
                style={{ left: prefs.followup_reminders ? "22px" : "2px" }} />
            </button>
          </div>
          <div className="flex items-center justify-between py-3 border-b" style={{ borderColor: "var(--cm-border)" }}>
            <div>
              <p className="text-sm" style={{ color: "var(--cm-text)" }}>Email Notifications</p>
              <p className="text-xs" style={{ color: "var(--cm-text-3)" }}>Receive updates via email</p>
            </div>
            <button onClick={() => togglePref("email_notifications", !prefs.email_notifications)}
              className="relative w-11 h-6 rounded-full transition-colors flex-shrink-0"
              style={{ backgroundColor: prefs.email_notifications ? "#1a8a80" : "var(--cm-surface-2)" }}
              data-testid="toggle-email-notifications">
              <div className="absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform shadow-sm"
                style={{ left: prefs.email_notifications ? "22px" : "2px" }} />
            </button>
          </div>
        </div>
      </div>

      {/* Privacy */}
      <div className="rounded-xl p-6 border" style={{ backgroundColor: "var(--cm-surface)", borderColor: "var(--cm-border)" }} data-testid="privacy-section">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
            <Shield className="w-5 h-5 text-green-500" />
          </div>
          <div>
            <h2 className="font-semibold text-lg" style={{ color: "var(--cm-text)" }}>Privacy</h2>
            <p className="text-sm" style={{ color: "var(--cm-text-3)" }}>Control your data and privacy</p>
          </div>
        </div>
        <div className="flex items-center justify-between py-3 border-b" style={{ borderColor: "var(--cm-border)" }}>
          <div>
            <p className="text-sm" style={{ color: "var(--cm-text)" }}>Data Export</p>
            <p className="text-xs" style={{ color: "var(--cm-text-3)" }}>Download all your recruiting data</p>
          </div>
          <button onClick={handleExportData}
            className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg transition-colors"
            style={{ backgroundColor: "var(--cm-surface-2)", color: "var(--cm-text-2)" }}
            data-testid="data-export-btn">
            <Download className="w-4 h-4" /> Export
          </button>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="rounded-xl p-6 border border-red-500/20" style={{ backgroundColor: "var(--cm-surface)" }} data-testid="danger-zone">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center">
            <Trash2 className="w-5 h-5 text-red-500" />
          </div>
          <div>
            <h2 className="font-semibold text-lg text-red-500">Danger Zone</h2>
            <p className="text-sm" style={{ color: "var(--cm-text-3)" }}>Permanent actions that cannot be undone</p>
          </div>
        </div>
        <div className="flex items-center justify-between p-4 rounded-xl border border-red-500/15" style={{ backgroundColor: "var(--cm-surface-2)" }}>
          {!showDeleteConfirm ? (
            <>
              <div>
                <p className="text-sm font-medium" style={{ color: "var(--cm-text)" }}>Delete Account</p>
                <p className="text-xs" style={{ color: "var(--cm-text-3)" }}>Permanently delete your account and all data</p>
              </div>
              <button onClick={() => setShowDeleteConfirm(true)} data-testid="delete-account-btn"
                className="px-4 py-2 text-sm rounded-lg border border-red-500/30 text-red-500 hover:bg-red-500/10 transition-colors font-medium">
                Delete Account
              </button>
            </>
          ) : (
            <div className="w-full">
              <p className="text-sm font-semibold text-red-500 mb-2">This is permanent and cannot be undone</p>
              <p className="text-xs mb-3" style={{ color: "var(--cm-text-3)" }}>
                All your schools, interactions, coaches, notes, and account data will be permanently deleted. Type <span className="font-bold" style={{ color: "var(--cm-text)" }}>DELETE</span> to confirm.
              </p>
              <div className="flex gap-2">
                <input type="text" value={deleteConfirmText} onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder="Type DELETE" data-testid="delete-confirm-input"
                  className="flex-1 px-3 py-2 rounded-lg text-sm border"
                  style={{ backgroundColor: "var(--cm-input-bg)", borderColor: "var(--cm-border)", color: "var(--cm-text)" }} />
                <button onClick={handleDeleteAccount} disabled={deleteConfirmText !== "DELETE"} data-testid="delete-confirm-btn"
                  className="px-4 py-2 rounded-lg text-sm font-semibold bg-red-600 text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors hover:bg-red-700">
                  Delete
                </button>
                <button onClick={() => { setShowDeleteConfirm(false); setDeleteConfirmText(""); }}
                  className="px-4 py-2 rounded-lg text-sm font-medium transition-colors hover:bg-white/5"
                  style={{ color: "var(--cm-text-3)", border: "1px solid var(--cm-border)" }}>
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

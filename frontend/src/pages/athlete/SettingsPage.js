import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  Moon, Sun, Monitor, Palette, Mail, CheckCircle2, XCircle,
  Loader2, Sparkles, Shield, Download, Trash2, Eye,
  ExternalLink, Inbox,
} from "lucide-react";
import axios from "axios";
import { toast } from "sonner";
import GmailConsentModal from "../../components/GmailConsentModal";
import GmailImportModal from "../../components/GmailImportModal";
import TeamSection from "../../components/settings/TeamSection";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function SettingsPage() {
  const [theme, setTheme] = useState("dark");
  const [gmailStatus, setGmailStatus] = useState(null);
  const [gmailLoading, setGmailLoading] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [privacyPrefs, setPrivacyPrefs] = useState({ inbound_scan: true, email_notifications: true });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [exporting, setExporting] = useState(false);
  const navigate = useNavigate();

  // Handle Gmail callback
  useEffect(() => {
    const gmailResult = searchParams.get("gmail");
    if (gmailResult === "connected") {
      toast.success("Gmail connected successfully!");
      setShowImportModal(true);
      searchParams.delete("gmail");
      setSearchParams(searchParams, { replace: true });
    } else if (gmailResult === "error") {
      const reason = searchParams.get("reason") || "unknown";
      toast.error(`Gmail connection failed: ${reason}`);
      searchParams.delete("gmail");
      searchParams.delete("reason");
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    axios.get(`${API}/athlete/gmail/status`)
      .then((res) => setGmailStatus(res.data))
      .catch(() => setGmailStatus({ connected: false }))
      .finally(() => setGmailLoading(false));
    axios.get(`${API}/athlete/settings`)
      .then((res) => {
        const prefs = res.data.preferences || {};
        setPrivacyPrefs({
          inbound_scan: prefs.inbound_scan !== false,
          email_notifications: prefs.email_notifications !== false,
        });
      })
      .catch(() => {});
  }, []);

  const handleConnectGmail = () => { setShowConsentModal(true); };

  const handleConsentAndConnect = async () => {
    setShowConsentModal(false);
    try {
      const res = await axios.get(`${API}/athlete/gmail/connect?return_to=/athlete-settings`);
      window.location.href = res.data.auth_url;
    } catch { toast.error("Failed to start Gmail connection"); }
  };

  const handleDisconnectGmail = async () => {
    try {
      await axios.post(`${API}/athlete/gmail/disconnect`);
      setGmailStatus({ connected: false });
      toast.success("Gmail disconnected");
    } catch { toast.error("Failed to disconnect Gmail"); }
  };

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme") || "dark";
    setTheme(savedTheme);
  }, []);

  const handleThemeChange = (newTheme) => {
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
    const root = document.documentElement;
    if (newTheme === "dark") {
      root.classList.add("dark"); root.classList.remove("light");
    } else if (newTheme === "light") {
      root.classList.remove("dark"); root.classList.add("light");
    } else {
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      if (prefersDark) { root.classList.add("dark"); root.classList.remove("light"); }
      else { root.classList.remove("dark"); root.classList.add("light"); }
    }
    // Also persist to backend
    axios.put(`${API}/athlete/settings`, { theme: newTheme }).catch(() => {});
  };

  const handleToggleInboundScanning = async (enabled) => {
    setPrivacyPrefs(prev => ({ ...prev, inbound_scan: enabled }));
    try {
      await axios.put(`${API}/athlete/settings`, { inbound_scan: enabled });
      toast.success(enabled ? "Inbound scanning enabled" : "Inbound scanning disabled");
    } catch {
      setPrivacyPrefs(prev => ({ ...prev, inbound_scan: !enabled }));
      toast.error("Failed to update preference");
    }
  };

  const handleToggleEmailNotifications = async (enabled) => {
    setPrivacyPrefs(prev => ({ ...prev, email_notifications: enabled }));
    try {
      await axios.put(`${API}/athlete/settings`, { email_notifications: enabled });
      toast.success(enabled ? "Email notifications enabled" : "Email notifications disabled");
    } catch {
      setPrivacyPrefs(prev => ({ ...prev, email_notifications: !enabled }));
      toast.error("Failed to update preference");
    }
  };

  const handleExportData = async () => {
    setExporting(true);
    try {
      const res = await axios.get(`${API}/athlete/settings/export-data`);
      const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `capymatch-data-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Data exported successfully");
    } catch { toast.error("Failed to export data"); }
    finally { setExporting(false); }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== "DELETE") return;
    try {
      await axios.delete(`${API}/athlete/settings/delete-account`, { data: { confirmation: "DELETE" } });
      toast.success("Account deleted. Redirecting...");
      setTimeout(() => { window.location.href = "/login"; }, 1500);
    } catch { toast.error("Failed to delete account"); }
  };

  const themeOptions = [
    { value: "dark", label: "Dark", icon: Moon },
    { value: "light", label: "Light", icon: Sun },
    { value: "system", label: "System", icon: Monitor },
  ];

  return (
    <div data-testid="settings-page" className="max-w-3xl mx-auto space-y-5 lg:space-y-8">
      {/* Theme / Appearance */}
      <div className="rounded-xl p-4 lg:p-6 border" style={{ backgroundColor: "var(--cm-surface)", borderColor: "var(--cm-border)" }} data-testid="appearance-section">
        <div className="flex items-center gap-3 mb-4 lg:mb-6">
          <div className="w-9 h-9 lg:w-10 lg:h-10 rounded-lg bg-teal-600/20 flex items-center justify-center">
            <Palette className="w-4 h-4 lg:w-5 lg:h-5 text-teal-600" />
          </div>
          <div>
            <h2 className="font-semibold text-base lg:text-lg" style={{ color: "var(--cm-text)" }}>Appearance</h2>
            <p className="text-xs lg:text-sm" style={{ color: "var(--cm-text-3)" }}>Customize how the app looks</p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 lg:gap-4">
          {themeOptions.map((option) => (
            <button key={option.value} onClick={() => handleThemeChange(option.value)}
              data-testid={`theme-${option.value}`}
              className={`p-3 lg:p-4 rounded-xl border-2 transition-all flex flex-col items-center text-center ${theme === option.value ? "border-teal-600 bg-teal-600/10" : ""}`}
              style={{ borderColor: theme === option.value ? undefined : "var(--cm-border)", backgroundColor: theme === option.value ? undefined : "var(--cm-surface-2)" }}>
              <div className={`w-9 h-9 lg:w-10 lg:h-10 rounded-lg flex items-center justify-center mb-2 ${theme === option.value ? "bg-teal-600/30" : ""}`}
                style={{ backgroundColor: theme === option.value ? undefined : "var(--cm-surface)" }}>
                <option.icon className={`w-4 h-4 lg:w-5 lg:h-5 ${theme === option.value ? "text-teal-600" : ""}`}
                  style={{ color: theme === option.value ? undefined : "var(--cm-text-3)" }} />
              </div>
              <p className="text-sm font-medium" style={{ color: theme === option.value ? "var(--cm-text)" : "var(--cm-text-2)" }}>{option.label}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Gmail Integration */}
      <div className="rounded-xl p-4 lg:p-6 border" style={{ backgroundColor: "var(--cm-surface)", borderColor: "var(--cm-border)" }} data-testid="gmail-section">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 lg:w-10 lg:h-10 rounded-lg bg-red-500/20 flex items-center justify-center">
            <Mail className="w-4 h-4 lg:w-5 lg:h-5 text-red-500" />
          </div>
          <div>
            <h2 className="font-semibold text-base lg:text-lg" style={{ color: "var(--cm-text)" }}>Gmail Integration</h2>
            <p className="text-xs lg:text-sm" style={{ color: "var(--cm-text-3)" }}>Connect your Gmail to send and receive emails</p>
          </div>
        </div>
        {gmailLoading ? (
          <div className="flex items-center gap-3 py-3">
            <Loader2 className="w-4 h-4 animate-spin text-teal-600" />
            <span className="text-sm" style={{ color: "var(--cm-text-3)" }}>Checking...</span>
          </div>
        ) : gmailStatus?.connected ? (
          <>
            <div className="flex items-center gap-3 p-3 rounded-xl" style={{ backgroundColor: "rgba(34, 197, 94, 0.1)" }}>
              <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium" style={{ color: "var(--cm-text)" }}>Connected</p>
                <p className="text-xs truncate" style={{ color: "var(--cm-text-3)" }} data-testid="gmail-connected-email">{gmailStatus.gmail_email}</p>
              </div>
              <button data-testid="disconnect-gmail-btn" onClick={handleDisconnectGmail}
                className="px-3 py-1.5 text-xs rounded-lg border transition-colors text-red-500 hover:bg-red-500/10"
                style={{ borderColor: "var(--cm-border)" }}>
                Disconnect
              </button>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-xl mt-2" style={{ backgroundColor: "var(--cm-surface-2)" }}>
              <Inbox className="w-4 h-4 flex-shrink-0" style={{ color: "var(--cm-text-3)" }} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium" style={{ color: "var(--cm-text)" }}>Import from Gmail</p>
                <p className="text-[11px]" style={{ color: "var(--cm-text-3)" }}>Scan your email history to auto-build your recruiting board</p>
              </div>
              <button onClick={() => setShowImportModal(true)} data-testid="import-gmail-btn"
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg font-medium text-white bg-teal-700 hover:bg-teal-800 transition-colors">
                <Download className="w-3.5 h-3.5" /> Import
              </button>
            </div>
          </>
        ) : (
          <div className="flex items-center gap-3 p-3 rounded-xl" style={{ backgroundColor: "var(--cm-surface-2)" }}>
            <XCircle className="w-4 h-4 flex-shrink-0" style={{ color: "var(--cm-text-3)" }} />
            <p className="flex-1 text-sm" style={{ color: "var(--cm-text-2)" }}>Not connected</p>
            <button data-testid="connect-gmail-settings-btn" onClick={handleConnectGmail}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg font-medium text-white bg-teal-700 hover:bg-teal-800 transition-colors">
              <Mail className="w-3.5 h-3.5" /> Connect
            </button>
          </div>
        )}
      </div>

      {/* Team Management */}
      <TeamSection />

      {/* Your Data & Privacy */}
      <div className="rounded-xl p-4 lg:p-6 border" style={{ backgroundColor: "var(--cm-surface)", borderColor: "var(--cm-border)" }} data-testid="privacy-section">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 lg:w-10 lg:h-10 rounded-lg flex items-center justify-center" style={{ background: "rgba(26,138,128,0.2)" }}>
            <Shield className="w-4 h-4 lg:w-5 lg:h-5" style={{ color: "#1a8a80" }} />
          </div>
          <div>
            <h2 className="font-semibold text-base lg:text-lg" style={{ color: "var(--cm-text)" }}>Your Data & Privacy</h2>
            <p className="text-xs lg:text-sm" style={{ color: "var(--cm-text-3)" }}>Control how your data is used</p>
          </div>
        </div>

        {/* Inbound scanning toggle */}
        <div className="flex items-center justify-between p-3 rounded-xl mb-3" style={{ backgroundColor: "var(--cm-surface-2)" }}>
          <div className="flex items-center gap-3 flex-1">
            <Eye className="w-4 h-4 flex-shrink-0" style={{ color: "var(--cm-text-3)" }} />
            <div>
              <p className="text-sm font-medium" style={{ color: "var(--cm-text)" }}>Auto-detect inbound coach emails</p>
              <p className="text-[11px]" style={{ color: "var(--cm-text-3)" }}>
                {privacyPrefs.inbound_scan
                  ? "We scan email headers to detect when coaches contact you first"
                  : "Disabled — you'll need to manually add schools when a coach contacts you"}
              </p>
            </div>
          </div>
          <button onClick={() => handleToggleInboundScanning(!privacyPrefs.inbound_scan)}
            className="relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ml-3"
            style={{ backgroundColor: privacyPrefs.inbound_scan ? "#1a8a80" : "var(--cm-surface)" }}
            data-testid="inbound-scanning-toggle">
            <div className="absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform shadow-sm"
              style={{ left: privacyPrefs.inbound_scan ? "22px" : "2px" }} />
          </button>
        </div>

        {/* Email notifications toggle */}
        <div className="flex items-center justify-between p-3 rounded-xl mb-3" style={{ backgroundColor: "var(--cm-surface-2)" }}>
          <div className="flex items-center gap-3 flex-1">
            <Mail className="w-4 h-4 flex-shrink-0" style={{ color: "var(--cm-text-3)" }} />
            <div>
              <p className="text-sm font-medium" style={{ color: "var(--cm-text)" }}>Email notifications</p>
              <p className="text-[11px]" style={{ color: "var(--cm-text-3)" }}>
                {privacyPrefs.email_notifications
                  ? "Receive welcome emails, team invitations, and product updates"
                  : "Only essential emails (password resets, security alerts) will be sent"}
              </p>
            </div>
          </div>
          <button onClick={() => handleToggleEmailNotifications(!privacyPrefs.email_notifications)}
            className="relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ml-3"
            style={{ backgroundColor: privacyPrefs.email_notifications ? "#1a8a80" : "var(--cm-surface)" }}
            data-testid="email-notifications-toggle">
            <div className="absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform shadow-sm"
              style={{ left: privacyPrefs.email_notifications ? "22px" : "2px" }} />
          </button>
        </div>

        {/* Export data */}
        <button onClick={handleExportData} disabled={exporting}
          className="flex items-center gap-3 w-full p-3 rounded-xl mb-3 transition-colors hover:bg-white/5 disabled:opacity-50"
          style={{ backgroundColor: "var(--cm-surface-2)" }} data-testid="export-data-btn">
          <Download className="w-4 h-4 flex-shrink-0" style={{ color: "var(--cm-text-3)" }} />
          <p className="text-sm font-medium flex-1 text-left" style={{ color: "var(--cm-text)" }}>{exporting ? "Exporting..." : "Download My Data"}</p>
        </button>

        {/* Delete account */}
        {!showDeleteConfirm ? (
          <button onClick={() => setShowDeleteConfirm(true)}
            className="flex items-center gap-3 w-full p-3 rounded-xl transition-colors hover:bg-red-500/10"
            style={{ backgroundColor: "var(--cm-surface-2)" }} data-testid="delete-account-btn">
            <Trash2 className="w-4 h-4 flex-shrink-0 text-red-500" />
            <p className="text-sm font-medium flex-1 text-left text-red-500">Delete My Account</p>
          </button>
        ) : (
          <div className="p-4 rounded-xl border" style={{ borderColor: "rgba(239,68,68,0.3)", backgroundColor: "rgba(239,68,68,0.05)" }}>
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

      {/* Guided Tour */}
      <div className="rounded-xl p-4 lg:p-6 border" style={{ backgroundColor: "var(--cm-surface)", borderColor: "var(--cm-border)" }} data-testid="guided-tour-section">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 lg:w-10 lg:h-10 rounded-lg bg-teal-600/20 flex items-center justify-center">
              <Sparkles className="w-4 h-4 lg:w-5 lg:h-5 text-teal-600" />
            </div>
            <div>
              <h2 className="font-semibold text-base lg:text-lg" style={{ color: "var(--cm-text)" }}>Guided Tour</h2>
              <p className="text-xs lg:text-sm" style={{ color: "var(--cm-text-3)" }}>Replay the app walkthrough</p>
            </div>
          </div>
          <button data-testid="replay-tour-btn"
            onClick={() => { localStorage.removeItem("pipeline_tour_done"); navigate("/board"); }}
            className="flex items-center gap-1.5 px-3 lg:px-4 py-2 text-xs lg:text-sm rounded-xl font-medium text-white bg-teal-600 hover:bg-teal-700 transition-colors">
            <Sparkles className="w-3.5 h-3.5 lg:w-4 lg:h-4" /> Replay
          </button>
        </div>
      </div>

      {/* Modals */}
      {showConsentModal && (
        <GmailConsentModal
          onAccept={() => handleConsentAndConnect()}
          onCancel={() => setShowConsentModal(false)}
        />
      )}
      {showImportModal && (
        <GmailImportModal onClose={() => setShowImportModal(false)} />
      )}
    </div>
  );
}

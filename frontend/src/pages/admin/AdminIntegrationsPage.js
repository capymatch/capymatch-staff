import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { toast } from "sonner";
import {
  Mail, CreditCard, Brain, GraduationCap,
  RefreshCw, CheckCircle, XCircle, Loader2,
  Globe, UserSearch, Link2, Send, Eye, EyeOff, Trash2, Save,
  Database, ArrowUpCircle
} from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

function StatusBadge({ connected, label }) {
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full"
      style={{
        backgroundColor: connected ? "rgba(16,185,129,0.1)" : "rgba(239,68,68,0.1)",
        color: connected ? "#10b981" : "#ef4444",
      }}>
      {connected ? <CheckCircle className="w-2.5 h-2.5" /> : <XCircle className="w-2.5 h-2.5" />}
      {label || (connected ? "Connected" : "Not configured")}
    </span>
  );
}

function StatRow({ label, value, total }) {
  const pct = total ? Math.round((value / total) * 100) : 0;
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-[11px]" style={{ color: "var(--cm-text-3)" }}>{label}</span>
      <div className="flex items-center gap-2">
        <span className="text-[11px] font-bold" style={{ color: "var(--cm-text)" }}>{value?.toLocaleString?.() ?? value}</span>
        {total && <span className="text-[9px]" style={{ color: "var(--cm-text-4)" }}>({pct}%)</span>}
      </div>
    </div>
  );
}

function IntegrationCard({ icon: Icon, title, subtitle, color, status, children }) {
  return (
    <div className="rounded-xl border p-5" style={{ backgroundColor: "var(--cm-surface)", borderColor: "var(--cm-border)" }}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${color}12` }}>
            <Icon className="w-4.5 h-4.5" style={{ color }} />
          </div>
          <div>
            <h3 className="text-sm font-bold" style={{ color: "var(--cm-text)" }}>{title}</h3>
            <p className="text-[10px]" style={{ color: "var(--cm-text-3)" }}>{subtitle}</p>
          </div>
        </div>
        {status}
      </div>
      {children}
    </div>
  );
}

function GmailConfigCard({ data, onRefresh }) {
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [redirectUri, setRedirectUri] = useState("https://app.capymatch.com/api/gmail/callback");
  const [showSecret, setShowSecret] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadingConfig, setLoadingConfig] = useState(true);

  useEffect(() => {
    const loadConfig = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get(`${API}/admin/integrations/gmail/oauth-config`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (res.data?.redirect_uri) setRedirectUri(res.data.redirect_uri);
      } catch { /* ignore */ }
      setLoadingConfig(false);
    };
    loadConfig();
  }, []);

  const handleSave = async () => {
    if (!clientId.trim() || !clientSecret.trim()) { toast.error("Client ID and Secret are required"); return; }
    setSaving(true);
    try {
      const token = localStorage.getItem("token");
      await axios.put(`${API}/admin/integrations/gmail/oauth-config`, {
        client_id: clientId.trim(),
        client_secret: clientSecret.trim(),
        redirect_uri: redirectUri.trim(),
      }, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
      toast.success("Gmail OAuth config saved");
      setClientId("");
      setClientSecret("");
      onRefresh();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to save");
    } finally { setSaving(false); }
  };

  return (
    <IntegrationCard icon={Mail} title="Gmail" subtitle="Email sync & inbox intelligence" color="#ea4335"
      status={<StatusBadge connected={data?.configured} />}>
      <StatRow label="Connected Users" value={data?.total_connected || 0} />
      <StatRow label="Config Source" value={data?.config_source || "none"} />

      <div className="mt-3 pt-3 space-y-2" style={{ borderTop: "1px solid var(--cm-border)" }}>
        <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: "var(--cm-text-3)" }}>
          Google OAuth Credentials
        </p>
        <input
          type="text"
          value={clientId}
          onChange={e => setClientId(e.target.value)}
          placeholder={data?.configured ? "Enter new Client ID to update..." : "Google OAuth Client ID"}
          className="w-full text-[11px] py-2 px-3 rounded-lg border outline-none"
          style={{ backgroundColor: "var(--cm-surface-2)", borderColor: "var(--cm-border)", color: "var(--cm-text)" }}
          data-testid="gmail-client-id-input"
        />
        <div className="relative">
          <input
            type={showSecret ? "text" : "password"}
            value={clientSecret}
            onChange={e => setClientSecret(e.target.value)}
            placeholder={data?.configured ? "Enter new Client Secret to update..." : "Google OAuth Client Secret"}
            className="w-full text-[11px] py-2 pl-3 pr-8 rounded-lg border outline-none"
            style={{ backgroundColor: "var(--cm-surface-2)", borderColor: "var(--cm-border)", color: "var(--cm-text)" }}
            data-testid="gmail-client-secret-input"
          />
          <button onClick={() => setShowSecret(p => !p)} className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5" style={{ color: "var(--cm-text-3)" }}>
            {showSecret ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          </button>
        </div>
        <input
          type="text"
          value={redirectUri}
          onChange={e => setRedirectUri(e.target.value)}
          placeholder="https://app.capymatch.com/api/gmail/callback"
          className="w-full text-[11px] py-2 px-3 rounded-lg border outline-none"
          style={{ backgroundColor: "var(--cm-surface-2)", borderColor: "var(--cm-border)", color: "var(--cm-text)" }}
          data-testid="gmail-redirect-uri-input"
        />
        <p className="text-[9px] leading-relaxed" style={{ color: "var(--cm-text-4)" }}>
          Add this redirect URI in Google Cloud Console &rarr; Credentials &rarr; OAuth Client &rarr; Authorized redirect URIs
        </p>
        <button onClick={handleSave} disabled={saving || !clientId.trim() || !clientSecret.trim()}
          className="w-full text-[10px] font-bold py-1.5 px-3 rounded-lg transition-all flex items-center justify-center gap-1"
          style={{ backgroundColor: clientId.trim() && clientSecret.trim() ? "rgba(234,67,53,0.08)" : "var(--cm-surface-2)", color: clientId.trim() && clientSecret.trim() ? "#ea4335" : "var(--cm-text-4)", border: `1px solid ${clientId.trim() && clientSecret.trim() ? "rgba(234,67,53,0.2)" : "var(--cm-border)"}` }}
          data-testid="gmail-save-btn">
          {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
          Save Gmail OAuth Config
        </button>
      </div>
    </IntegrationCard>
  );
}

function ResendCard({ data, onRefresh }) {
  const [apiKey, setApiKey] = useState("");
  const [senderEmail, setSenderEmail] = useState(data?.sender_email || "onboarding@resend.dev");
  const [showKey, setShowKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testEmail, setTestEmail] = useState("");
  const [deleting, setDeleting] = useState(false);

  const handleSave = async () => {
    if (!apiKey.trim()) { toast.error("API key is required"); return; }
    setSaving(true);
    try {
      const token = localStorage.getItem("token");
      await axios.put(`${API}/admin/integrations/resend/config`, {
        api_key: apiKey.trim(),
        sender_email: senderEmail.trim() || "onboarding@resend.dev",
      }, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
      toast.success("Resend configuration saved");
      setApiKey("");
      onRefresh();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to save");
    } finally { setSaving(false); }
  };

  const handleTest = async () => {
    if (!testEmail.trim()) { toast.error("Enter a test email address"); return; }
    setTesting(true);
    try {
      const token = localStorage.getItem("token");
      await axios.post(`${API}/admin/integrations/resend/test`, {
        to_email: testEmail.trim(),
      }, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
      toast.success(`Test email sent to ${testEmail}`);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to send test email");
    } finally { setTesting(false); }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`${API}/admin/integrations/resend/config`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      toast.success("Resend configuration removed");
      onRefresh();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to remove");
    } finally { setDeleting(false); }
  };

  return (
    <IntegrationCard icon={Send} title="Resend" subtitle="Transactional email delivery" color="#000"
      status={<StatusBadge connected={data?.connected} />}>
      <StatRow label="API Key" value={data?.key_masked || "Not set"} />
      <StatRow label="Sender" value={data?.sender_email || "Not set"} />
      <StatRow label="Emails Sent" value={data?.stats?.emails_sent || 0} />

      {/* Config form */}
      <div className="mt-3 pt-3 space-y-2" style={{ borderTop: "1px solid var(--cm-border)" }}>
        <div className="relative">
          <input
            type={showKey ? "text" : "password"}
            value={apiKey}
            onChange={e => setApiKey(e.target.value)}
            placeholder={data?.connected ? "Enter new key to update..." : "re_..."}
            className="w-full text-[11px] py-2 pl-3 pr-8 rounded-lg border outline-none"
            style={{ backgroundColor: "var(--cm-surface-2)", borderColor: "var(--cm-border)", color: "var(--cm-text)" }}
            data-testid="resend-api-key-input"
          />
          <button onClick={() => setShowKey(p => !p)} className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5" style={{ color: "var(--cm-text-3)" }}>
            {showKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          </button>
        </div>
        <input
          type="text"
          value={senderEmail}
          onChange={e => setSenderEmail(e.target.value)}
          placeholder="Sender email (e.g. noreply@yourdomain.com)"
          className="w-full text-[11px] py-2 px-3 rounded-lg border outline-none"
          style={{ backgroundColor: "var(--cm-surface-2)", borderColor: "var(--cm-border)", color: "var(--cm-text)" }}
          data-testid="resend-sender-input"
        />
        <div className="flex gap-2">
          <button onClick={handleSave} disabled={saving || !apiKey.trim()}
            className="flex-1 text-[10px] font-bold py-1.5 px-3 rounded-lg transition-all flex items-center justify-center gap-1"
            style={{ backgroundColor: apiKey.trim() ? "rgba(16,185,129,0.08)" : "var(--cm-surface-2)", color: apiKey.trim() ? "#10b981" : "var(--cm-text-4)", border: `1px solid ${apiKey.trim() ? "rgba(16,185,129,0.2)" : "var(--cm-border)"}` }}
            data-testid="resend-save-btn">
            {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
            Save Key
          </button>
          {data?.connected && (
            <button onClick={handleDelete} disabled={deleting}
              className="text-[10px] font-bold py-1.5 px-3 rounded-lg transition-all flex items-center justify-center gap-1"
              style={{ backgroundColor: "rgba(239,68,68,0.06)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.15)" }}
              data-testid="resend-delete-btn">
              {deleting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
            </button>
          )}
        </div>
      </div>

      {/* Test email */}
      {data?.connected && (
        <div className="mt-3 pt-3 space-y-2" style={{ borderTop: "1px solid var(--cm-border)" }}>
          <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: "var(--cm-text-3)" }}>Send Test Email</p>
          <div className="flex gap-2">
            <input
              type="email"
              value={testEmail}
              onChange={e => setTestEmail(e.target.value)}
              placeholder="recipient@example.com"
              className="flex-1 text-[11px] py-2 px-3 rounded-lg border outline-none"
              style={{ backgroundColor: "var(--cm-surface-2)", borderColor: "var(--cm-border)", color: "var(--cm-text)" }}
              data-testid="resend-test-email-input"
            />
            <button onClick={handleTest} disabled={testing || !testEmail.trim()}
              className="text-[10px] font-bold py-1.5 px-3 rounded-lg transition-all flex items-center justify-center gap-1"
              style={{ backgroundColor: "rgba(0,0,0,0.06)", color: "var(--cm-text)", border: "1px solid var(--cm-border)" }}
              data-testid="resend-test-btn">
              {testing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
              Test
            </button>
          </div>
        </div>
      )}
    </IntegrationCard>
  );
}

function MongoDBCard({ data, onRefresh }) {
  const [connStr, setConnStr] = useState("");
  const [dbName, setDbName] = useState("capymatch-prod");
  const [showStr, setShowStr] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [migrating, setMigrating] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [migrateResult, setMigrateResult] = useState(null);

  const handleSave = async () => {
    if (!connStr.trim()) { toast.error("Connection string is required"); return; }
    setSaving(true);
    try {
      const token = localStorage.getItem("token");
      await axios.put(`${API}/admin/integrations/mongodb/config`, {
        connection_string: connStr.trim(),
        db_name: dbName.trim() || "capymatch-prod",
      }, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
      toast.success("MongoDB production config saved");
      setConnStr("");
      onRefresh();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to save");
    } finally { setSaving(false); }
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.post(`${API}/admin/integrations/mongodb/test`, {}, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      setTestResult(res.data);
      toast.success("Connection successful!");
    } catch (err) {
      setTestResult({ ok: false, error: err.response?.data?.detail || "Connection failed" });
      toast.error(err.response?.data?.detail || "Connection failed");
    } finally { setTesting(false); }
  };

  const handleMigrate = async () => {
    if (!window.confirm("This will copy dev data to production. Collections with existing data will be skipped. Continue?")) return;
    setMigrating(true);
    setMigrateResult(null);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.post(`${API}/admin/integrations/mongodb/migrate`, {}, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      setMigrateResult(res.data.results);
      toast.success("Migration complete!");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Migration failed");
    } finally { setMigrating(false); }
  };

  return (
    <IntegrationCard icon={Database} title="MongoDB" subtitle="Production database" color="#00ed64"
      status={<StatusBadge connected={data?.configured} />}>
      <StatRow label="Host" value={data?.host || "Not set"} />
      <StatRow label="Database" value={data?.db_name || "Not set"} />

      <div className="mt-3 pt-3 space-y-2" style={{ borderTop: "1px solid var(--cm-border)" }}>
        <div className="relative">
          <input
            type={showStr ? "text" : "password"}
            value={connStr}
            onChange={e => setConnStr(e.target.value)}
            placeholder={data?.configured ? "Enter new connection string to update..." : "mongodb+srv://user:pass@cluster.mongodb.net/db"}
            className="w-full text-[11px] py-2 pl-3 pr-8 rounded-lg border outline-none"
            style={{ backgroundColor: "var(--cm-surface-2)", borderColor: "var(--cm-border)", color: "var(--cm-text)" }}
            data-testid="mongodb-conn-string-input"
          />
          <button onClick={() => setShowStr(p => !p)} className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5" style={{ color: "var(--cm-text-3)" }}>
            {showStr ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          </button>
        </div>
        <input
          type="text"
          value={dbName}
          onChange={e => setDbName(e.target.value)}
          placeholder="Database name"
          className="w-full text-[11px] py-2 px-3 rounded-lg border outline-none"
          style={{ backgroundColor: "var(--cm-surface-2)", borderColor: "var(--cm-border)", color: "var(--cm-text)" }}
          data-testid="mongodb-db-name-input"
        />
        <div className="flex gap-2">
          <button onClick={handleSave} disabled={saving || !connStr.trim()}
            className="flex-1 text-[10px] font-bold py-1.5 px-3 rounded-lg transition-all flex items-center justify-center gap-1"
            style={{ backgroundColor: connStr.trim() ? "rgba(0,237,100,0.08)" : "var(--cm-surface-2)", color: connStr.trim() ? "#00ed64" : "var(--cm-text-4)", border: `1px solid ${connStr.trim() ? "rgba(0,237,100,0.2)" : "var(--cm-border)"}` }}
            data-testid="mongodb-save-btn">
            {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
            Save
          </button>
          {data?.configured && (
            <button onClick={handleTest} disabled={testing}
              className="flex-1 text-[10px] font-bold py-1.5 px-3 rounded-lg transition-all flex items-center justify-center gap-1"
              style={{ backgroundColor: "rgba(0,237,100,0.06)", color: "#00ed64", border: "1px solid rgba(0,237,100,0.15)" }}
              data-testid="mongodb-test-btn">
              {testing ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
              Test
            </button>
          )}
        </div>
      </div>

      {/* Test result */}
      {testResult && (
        <div className="mt-2 p-2 rounded-lg text-[10px]" style={{ backgroundColor: "var(--cm-surface-2)", color: testResult.ok ? "#00ed64" : "#ef4444" }}>
          {testResult.ok ? (
            <>MongoDB v{testResult.version} | {testResult.collections} collections: {(testResult.collection_names || []).join(", ") || "empty"}</>
          ) : (
            <>{testResult.error}</>
          )}
        </div>
      )}

      {/* Migrate */}
      {data?.configured && (
        <div className="mt-3 pt-3" style={{ borderTop: "1px solid var(--cm-border)" }}>
          <button onClick={handleMigrate} disabled={migrating}
            className="w-full text-[10px] font-bold py-1.5 px-3 rounded-lg transition-all flex items-center justify-center gap-1"
            style={{ backgroundColor: "rgba(245,158,11,0.08)", color: "#f59e0b", border: "1px solid rgba(245,158,11,0.2)" }}
            data-testid="mongodb-migrate-btn">
            {migrating ? <Loader2 className="w-3 h-3 animate-spin" /> : <ArrowUpCircle className="w-3 h-3" />}
            Migrate Dev Data to Production
          </button>
          {migrateResult && (
            <div className="mt-2 p-2 rounded-lg text-[10px] space-y-0.5" style={{ backgroundColor: "var(--cm-surface-2)", color: "var(--cm-text-3)" }}>
              {Object.entries(migrateResult).map(([k, v]) => (
                <div key={k}><span className="font-semibold" style={{ color: "var(--cm-text-2)" }}>{k}:</span> {v}</div>
              ))}
            </div>
          )}
        </div>
      )}
    </IntegrationCard>
  );
}

export default function AdminIntegrationsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [coachStatus, setCoachStatus] = useState(null);
  const [urlStatus, setUrlStatus] = useState(null);
  const [scorecardStatus, setScorecardStatus] = useState(null);
  const [triggering, setTriggering] = useState({});

  const fetchData = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const [intRes, kbRes] = await Promise.all([
        axios.get(`${API}/admin/integrations`, { headers }),
        axios.get(`${API}/admin/kb-jobs`, { headers }).catch(() => null),
      ]);
      setData({ ...intRes.data, kbJobs: kbRes?.data || null });
    } catch {
      toast.error("Failed to load integrations");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const trigger = async (endpoint, key, setStatus) => {
    setTriggering(prev => ({ ...prev, [key]: true }));
    try {
      const token = localStorage.getItem("token");
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await axios.post(`${API}${endpoint}`, {}, { headers });
      toast.success(`${key} started`);
      if (setStatus) setStatus(res.data);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to trigger");
    } finally {
      setTriggering(prev => ({ ...prev, [key]: false }));
    }
  };

  const pollStatus = async (endpoint, setStatus) => {
    try {
      const token = localStorage.getItem("token");
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await axios.get(`${API}${endpoint}`, { headers });
      setStatus(res.data);
    } catch {}
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: "var(--cm-text-3)" }} />
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-6 max-w-5xl mx-auto" data-testid="admin-integrations-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-extrabold" style={{ color: "var(--cm-text)" }}>Integrations</h1>
          <p className="text-xs mt-0.5" style={{ color: "var(--cm-text-3)" }}>External services powering the platform</p>
        </div>
        <button onClick={fetchData} className="p-2 rounded-lg transition-colors" style={{ backgroundColor: "var(--cm-surface-2)" }} data-testid="refresh-integrations">
          <RefreshCw className="w-4 h-4" style={{ color: "var(--cm-text-3)" }} />
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Gmail */}
        <GmailConfigCard data={data.gmail} onRefresh={fetchData} />

        {/* Stripe */}
        <IntegrationCard icon={CreditCard} title="Stripe" subtitle={`Mode: ${data.stripe.mode}`} color="#635bff"
          status={<StatusBadge connected={data.stripe.connected} label={data.stripe.mode} />}>
          <StatRow label="Key" value={data.stripe.key_masked} />
          <StatRow label="Total Transactions" value={data.stripe.stats.total_transactions} />
          <StatRow label="Paid" value={data.stripe.stats.paid_transactions} />
          <StatRow label="Revenue" value={`$${data.stripe.stats.total_revenue}`} />
        </IntegrationCard>

        {/* AI */}
        <IntegrationCard icon={Brain} title="AI / LLM" subtitle={data.ai.provider} color="#8b5cf6"
          status={<StatusBadge connected={data.ai.connected} />}>
          <StatRow label="Key" value={data.ai.key_masked} />
          <StatRow label="Usage This Month" value={data.ai.stats.usage_this_month} />
          <StatRow label="Total Usage" value={data.ai.stats.usage_total} />
        </IntegrationCard>

        {/* College Scorecard */}
        <IntegrationCard icon={GraduationCap} title="College Scorecard" subtitle="Federal academic data (SAT, ACT, costs)" color="#3b82f6"
          status={<StatusBadge connected={data.scorecard.connected} />}>
          <StatRow label="Synced Schools" value={data.scorecard.stats.synced_schools} total={data.scorecard.stats.total_universities} />
          <div className="mt-3 flex gap-2">
            <button onClick={() => trigger("/admin/integrations/scorecard/sync", "scorecard-sync", setScorecardStatus)}
              disabled={triggering["scorecard-sync"]}
              className="flex-1 text-[10px] font-bold py-1.5 px-3 rounded-lg transition-all flex items-center justify-center gap-1"
              style={{ backgroundColor: "rgba(59,130,246,0.08)", color: "#3b82f6", border: "1px solid rgba(59,130,246,0.2)" }}
              data-testid="trigger-scorecard-sync">
              {triggering["scorecard-sync"] ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
              Sync All
            </button>
            <button onClick={() => pollStatus("/admin/integrations/scorecard/sync-status", setScorecardStatus)}
              className="text-[10px] font-bold py-1.5 px-3 rounded-lg"
              style={{ backgroundColor: "var(--cm-surface-2)", color: "var(--cm-text-3)" }}>
              Check Status
            </button>
          </div>
          {scorecardStatus && (
            <div className="mt-2 text-[10px] p-2 rounded-lg" style={{ backgroundColor: "var(--cm-surface-2)", color: "var(--cm-text-3)" }}>
              {scorecardStatus.phase && <span>Phase: {scorecardStatus.phase} | </span>}
              Synced: {scorecardStatus.synced || 0} / {scorecardStatus.total || "?"} | Failed: {scorecardStatus.failed || 0}
            </div>
          )}
        </IntegrationCard>

        {/* Coach Scraper */}
        <IntegrationCard icon={UserSearch} title="Coach Scraper" subtitle="Volleyball coaching staff data" color="#0d9488"
          status={
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
              style={{ backgroundColor: "rgba(13,148,136,0.1)", color: "#0d9488" }}>
              {data.coach_scraper.stats.has_coach_email} / {data.coach_scraper.stats.total}
            </span>
          }>
          <StatRow label="Has Coach Email" value={data.coach_scraper.stats.has_coach_email} total={data.coach_scraper.stats.total} />
          <StatRow label="Missing Email" value={data.coach_scraper.stats.missing_coach_email} />
          <div className="mt-3 flex gap-2">
            <button onClick={() => trigger("/admin/coach-scraper/scrape", "coach-scrape", setCoachStatus)}
              disabled={triggering["coach-scrape"]}
              className="flex-1 text-[10px] font-bold py-1.5 px-3 rounded-lg transition-all flex items-center justify-center gap-1"
              style={{ backgroundColor: "rgba(13,148,136,0.08)", color: "#0d9488", border: "1px solid rgba(13,148,136,0.2)" }}
              data-testid="trigger-coach-scrape">
              {triggering["coach-scrape"] ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
              Scrape Missing
            </button>
            <button onClick={() => pollStatus("/admin/coach-scraper/status", setCoachStatus)}
              className="text-[10px] font-bold py-1.5 px-3 rounded-lg"
              style={{ backgroundColor: "var(--cm-surface-2)", color: "var(--cm-text-3)" }}>
              Check Status
            </button>
          </div>
          {coachStatus && (
            <div className="mt-2 text-[10px] p-2 rounded-lg" style={{ backgroundColor: "var(--cm-surface-2)", color: "var(--cm-text-3)" }}>
              {coachStatus.running ? "Running..." : "Idle"} | Scraped: {coachStatus.scraped || 0} / {coachStatus.total || "?"} | Failed: {coachStatus.failed || 0}
            </div>
          )}
        </IntegrationCard>

        {/* URL Discovery */}
        <IntegrationCard icon={Link2} title="URL Discovery" subtitle="Volleyball program website URLs" color="#f59e0b"
          status={
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
              style={{ backgroundColor: "rgba(245,158,11,0.1)", color: "#f59e0b" }}>
              {data.url_discovery.stats.has_website} / {data.url_discovery.stats.total}
            </span>
          }>
          <StatRow label="Has Website URL" value={data.url_discovery.stats.has_website} total={data.url_discovery.stats.total} />
          <StatRow label="Missing URL" value={data.url_discovery.stats.missing_website} />
          <div className="mt-3 flex gap-2">
            <button onClick={() => trigger("/admin/integrations/scorecard/sync", "url-discover", setUrlStatus)}
              disabled={triggering["url-discover"]}
              className="flex-1 text-[10px] font-bold py-1.5 px-3 rounded-lg transition-all flex items-center justify-center gap-1"
              style={{ backgroundColor: "rgba(245,158,11,0.08)", color: "#f59e0b", border: "1px solid rgba(245,158,11,0.2)" }}
              data-testid="trigger-url-discover">
              {triggering["url-discover"] ? <Loader2 className="w-3 h-3 animate-spin" /> : <Globe className="w-3 h-3" />}
              Discover URLs
            </button>
            <button onClick={() => pollStatus("/admin/coach-scraper/discover-urls/status", setUrlStatus)}
              className="text-[10px] font-bold py-1.5 px-3 rounded-lg"
              style={{ backgroundColor: "var(--cm-surface-2)", color: "var(--cm-text-3)" }}>
              Check Status
            </button>
          </div>
          {urlStatus && (
            <div className="mt-2 text-[10px] p-2 rounded-lg" style={{ backgroundColor: "var(--cm-surface-2)", color: "var(--cm-text-3)" }}>
              {urlStatus.running ? "Running..." : "Idle"} | Found: {urlStatus.found || 0} / {urlStatus.total || "?"} | Failed: {urlStatus.failed || 0}
            </div>
          )}
        </IntegrationCard>

        {/* Resend */}
        <ResendCard data={data.resend} onRefresh={fetchData} />

        {/* MongoDB Production */}
        <MongoDBCard data={data.mongodb_prod} onRefresh={fetchData} />

      </div>
    </div>
  );
}

import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { toast } from "sonner";
import {
  Mail, CreditCard, Brain, GraduationCap,
  RefreshCw, CheckCircle, XCircle, Loader2,
  Globe, UserSearch, Link2
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
        <IntegrationCard icon={Mail} title="Gmail" subtitle="Email sync & inbox intelligence" color="#ea4335"
          status={<StatusBadge connected={data.gmail.configured} />}>
          <StatRow label="Connected Users" value={data.gmail.total_connected} />
          <StatRow label="Config Source" value={data.gmail.config_source} />
        </IntegrationCard>

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
            <button onClick={() => trigger("/admin/coach-scraper/discover-urls", "url-discover", setUrlStatus)}
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

      </div>
    </div>
  );
}

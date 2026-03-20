import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { toast } from "sonner";
import {
  Loader2, Eye, MousePointerClick, Zap, ChevronRight,
  TrendingUp, HelpCircle, RefreshCw, BarChart3, Sparkles
} from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

/* ── tiny reusable pieces ─────────────────────────────────── */

function MetricCard({ label, value, sub, icon: Icon, color = "#1a8a80", testId }) {
  return (
    <div
      className="rounded-xl border p-4 flex flex-col gap-1"
      style={{ backgroundColor: "var(--cm-surface)", borderColor: "var(--cm-border)" }}
      data-testid={testId}
    >
      <div className="flex items-center gap-2 mb-1">
        {Icon && (
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${color}14` }}>
            <Icon className="w-3.5 h-3.5" style={{ color }} />
          </div>
        )}
        <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--cm-text-3)" }}>{label}</span>
      </div>
      <div className="text-2xl font-extrabold" style={{ color: "var(--cm-text)" }}>
        {value ?? "—"}
      </div>
      {sub && <span className="text-[10px]" style={{ color: "var(--cm-text-4)" }}>{sub}</span>}
    </div>
  );
}

function SectionHeader({ title, subtitle }) {
  return (
    <div className="mb-3">
      <h2 className="text-sm font-bold" style={{ color: "var(--cm-text)" }}>{title}</h2>
      {subtitle && <p className="text-[10px] mt-0.5" style={{ color: "var(--cm-text-3)" }}>{subtitle}</p>}
    </div>
  );
}

function ComparisonRow({ label, values, colors }) {
  const total = values.reduce((s, v) => s + v, 0);
  return (
    <div className="flex items-center gap-3 py-2">
      <span className="text-[10px] font-bold w-20 uppercase tracking-wider" style={{ color: "var(--cm-text-3)" }}>{label}</span>
      <div className="flex-1 flex h-2 rounded-full overflow-hidden" style={{ backgroundColor: "var(--cm-surface-2)" }}>
        {values.map((v, i) => {
          const pct = total ? (v / total) * 100 : 0;
          return pct > 0 ? (
            <div key={i} className="h-full" style={{ width: `${pct}%`, backgroundColor: colors[i] }} />
          ) : null;
        })}
      </div>
      <div className="flex gap-2">
        {values.map((v, i) => (
          <span key={i} className="text-[10px] font-bold min-w-[28px] text-right" style={{ color: colors[i] }}>{v}</span>
        ))}
      </div>
    </div>
  );
}

function FunnelStep({ label, count, rate, isLast, color }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex flex-col items-center">
        <div className="w-10 h-10 rounded-lg flex items-center justify-center text-sm font-extrabold"
          style={{ backgroundColor: `${color}14`, color }}>
          {count}
        </div>
        <span className="text-[9px] mt-1 font-semibold uppercase tracking-wider text-center" style={{ color: "var(--cm-text-3)" }}>
          {label}
        </span>
      </div>
      {!isLast && (
        <div className="flex flex-col items-center mx-1">
          <ChevronRight className="w-3.5 h-3.5" style={{ color: "var(--cm-text-4)" }} />
          {rate != null && (
            <span className="text-[9px] font-bold" style={{ color: "var(--cm-accent-text)" }}>{rate}%</span>
          )}
        </div>
      )}
    </div>
  );
}

function DailySparkline({ data }) {
  if (!data || data.length === 0) return null;
  const max = Math.max(...data.map(d => d.count), 1);
  const barW = Math.max(4, Math.min(12, Math.floor(280 / data.length)));
  return (
    <div
      className="rounded-xl border p-4"
      style={{ backgroundColor: "var(--cm-surface)", borderColor: "var(--cm-border)" }}
      data-testid="daily-trend-sparkline"
    >
      <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--cm-text-3)" }}>
        Daily event volume
      </span>
      <div className="flex items-end gap-[2px] mt-3 h-12">
        {data.map((d, i) => (
          <div
            key={i}
            className="rounded-sm"
            style={{
              width: barW,
              height: `${Math.max(2, (d.count / max) * 48)}px`,
              backgroundColor: "var(--cm-accent)",
              opacity: 0.6 + (d.count / max) * 0.4,
            }}
            title={`${d.date}: ${d.count}`}
          />
        ))}
      </div>
      <div className="flex justify-between mt-1">
        <span className="text-[9px]" style={{ color: "var(--cm-text-4)" }}>{data[0]?.date?.slice(5)}</span>
        <span className="text-[9px]" style={{ color: "var(--cm-text-4)" }}>{data[data.length - 1]?.date?.slice(5)}</span>
      </div>
    </div>
  );
}

/* ── pill toggle ──────────────────────────────────────────── */

function PeriodToggle({ value, onChange }) {
  const opts = [7, 14, 30];
  return (
    <div
      className="inline-flex rounded-lg p-0.5 gap-0.5"
      style={{ backgroundColor: "var(--cm-surface-2)" }}
      data-testid="period-toggle"
    >
      {opts.map(d => (
        <button
          key={d}
          onClick={() => onChange(d)}
          className="px-3 py-1 rounded-md text-[10px] font-bold transition-colors"
          style={{
            backgroundColor: value === d ? "var(--cm-accent)" : "transparent",
            color: value === d ? "#fff" : "var(--cm-text-3)",
          }}
          data-testid={`period-toggle-${d}`}
        >
          {d}d
        </button>
      ))}
    </div>
  );
}

/* ── empty state ──────────────────────────────────────────── */

function EmptyState() {
  return (
    <div
      className="rounded-xl border p-10 flex flex-col items-center justify-center text-center"
      style={{ backgroundColor: "var(--cm-surface)", borderColor: "var(--cm-border)" }}
      data-testid="loop-insights-empty"
    >
      <BarChart3 className="w-8 h-8 mb-3" style={{ color: "var(--cm-text-4)" }} />
      <p className="text-sm font-bold" style={{ color: "var(--cm-text-2)" }}>No loop events yet</p>
      <p className="text-[10px] mt-1" style={{ color: "var(--cm-text-3)" }}>
        Events will appear once athletes interact with Hero Cards, Recaps, and Reinforcements.
      </p>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════ */

export default function LoopInsightsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);

  const fetchMetrics = useCallback(async (period) => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${API}/analytics/admin/loop-metrics`, {
        params: { days: period },
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      setData(res.data);
    } catch {
      toast.error("Failed to load loop metrics");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchMetrics(days); }, [days, fetchMetrics]);

  const handlePeriod = (d) => { setDays(d); };

  /* ── render ── */
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64" data-testid="loop-insights-loading">
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: "var(--cm-text-3)" }} />
      </div>
    );
  }

  const empty = !data || data.total_events === 0;
  const m = data || {};
  const funnel = m.funnel || {};
  const sources = m.sources || { views: {}, completions: {} };
  const trust = m.trust || {};
  const reinf = m.reinforcement || {};
  const recap = m.recap || {};

  const srcColors = ["#1a8a80", "#8b5cf6", "#f59e0b"];
  const srcLabels = ["Live", "Recap", "Merged"];
  const srcKeys = ["live", "recap", "merged"];

  const fmtTime = (sec) => {
    if (sec == null) return "—";
    if (sec < 60) return `${Math.round(sec)}s`;
    return `${(sec / 60).toFixed(1)}m`;
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-10" data-testid="loop-insights-page">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-extrabold" style={{ color: "var(--cm-text)", fontFamily: "Manrope, sans-serif" }}>
            Loop Insights
          </h1>
          <p className="text-xs mt-0.5" style={{ color: "var(--cm-text-3)" }}>
            Recap &rarr; Hero &rarr; Action &rarr; Reinforcement
          </p>
        </div>
        <div className="flex items-center gap-3">
          <PeriodToggle value={days} onChange={handlePeriod} />
          <button
            onClick={() => fetchMetrics(days)}
            className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
            style={{ backgroundColor: "var(--cm-surface-2)" }}
            data-testid="refresh-metrics-btn"
          >
            <RefreshCw className="w-3.5 h-3.5" style={{ color: "var(--cm-text-3)" }} />
          </button>
        </div>
      </div>

      {empty ? (
        <EmptyState />
      ) : (
        <>
          {/* ─── 1. Core Loop Funnel ───────────────────────────── */}
          <section data-testid="section-funnel">
            <SectionHeader title="Core Loop Funnel" subtitle="End-to-end conversion through the feedback loop" />
            <div
              className="rounded-xl border p-5 flex items-center justify-center gap-1 flex-wrap"
              style={{ backgroundColor: "var(--cm-surface)", borderColor: "var(--cm-border)" }}
            >
              <FunnelStep label="Views" count={funnel.hero_views} rate={funnel.hero_click_rate} color="#1a8a80" />
              <FunnelStep label="Clicks" count={funnel.hero_clicks} rate={funnel.reinforcement_rate} color="#3b82f6" />
              <FunnelStep label="Done" count={funnel.reinforcements} isLast color="#8b5cf6" />
            </div>
          </section>

          {/* ─── 2. Source Comparison ──────────────────────────── */}
          <section data-testid="section-sources">
            <SectionHeader title="Source Comparison" subtitle="Where priorities originate — live blockers vs recap insights vs merged" />
            <div
              className="rounded-xl border p-4 space-y-1"
              style={{ backgroundColor: "var(--cm-surface)", borderColor: "var(--cm-border)" }}
            >
              <div className="flex justify-end gap-3 mb-1">
                {srcLabels.map((l, i) => (
                  <div key={l} className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: srcColors[i] }} />
                    <span className="text-[9px] font-semibold" style={{ color: "var(--cm-text-3)" }}>{l}</span>
                  </div>
                ))}
              </div>
              <ComparisonRow
                label="Views"
                values={srcKeys.map(k => sources.views?.[k] || 0)}
                colors={srcColors}
              />
              <ComparisonRow
                label="Completions"
                values={srcKeys.map(k => sources.completions?.[k] || 0)}
                colors={srcColors}
              />
            </div>
          </section>

          {/* ─── 3. Trust & Explainability ─────────────────────── */}
          <section data-testid="section-trust">
            <SectionHeader title="Trust & Explainability" subtitle={`\"Why this?\" engagement signals`} />
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <MetricCard
                label="Why expands"
                value={trust.why_expands}
                icon={HelpCircle}
                color="#8b5cf6"
                testId="metric-why-expands"
              />
              <MetricCard
                label="Expand rate"
                value={trust.why_expand_rate != null ? `${trust.why_expand_rate}%` : "—"}
                sub="of hero views"
                icon={Eye}
                color="#8b5cf6"
                testId="metric-expand-rate"
              />
              <MetricCard
                label="Action after why"
                value={trust.actions_after_why}
                icon={MousePointerClick}
                color="#3b82f6"
                testId="metric-action-after-why"
              />
              <MetricCard
                label="Conversion"
                value={trust.action_after_why_rate != null ? `${trust.action_after_why_rate}%` : "—"}
                sub="why → click within 5m"
                icon={TrendingUp}
                color="#3b82f6"
                testId="metric-why-conversion"
              />
            </div>
          </section>

          {/* ─── 4. Reinforcement Effectiveness ────────────────── */}
          <section data-testid="section-reinforcement">
            <SectionHeader title="Reinforcement Effectiveness" subtitle="Completion feedback and response times" />
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <MetricCard
                label="Reinforcements"
                value={reinf.total_shown}
                icon={Zap}
                color="#f59e0b"
                testId="metric-reinforcements"
              />
              <MetricCard
                label="Avg time to act"
                value={fmtTime(reinf.avg_time_to_action)}
                sub="hero view → click"
                icon={TrendingUp}
                color="#f59e0b"
                testId="metric-avg-time"
              />
              <MetricCard
                label="Recap funnel"
                value={recap.opens}
                sub={`${recap.teaser_views} teasers → ${recap.opens} opens (${recap.open_rate}%)`}
                icon={Sparkles}
                color="#8b5cf6"
                testId="metric-recap-funnel"
              />
            </div>
          </section>

          {/* ─── 5. Daily Trend + Summary ──────────────────────── */}
          <section data-testid="section-trend">
            <SectionHeader title="Activity Trend" subtitle="Events per day across the loop" />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <DailySparkline data={m.daily_trend} />
              </div>
              <div
                className="rounded-xl border p-4 flex flex-col justify-center gap-2"
                style={{ backgroundColor: "var(--cm-surface)", borderColor: "var(--cm-border)" }}
                data-testid="summary-card"
              >
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-extrabold" style={{ color: "var(--cm-text)" }}>{m.total_events}</span>
                  <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--cm-text-3)" }}>total events</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-lg font-extrabold" style={{ color: "var(--cm-accent-text)" }}>{m.unique_users}</span>
                  <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--cm-text-3)" }}>active users</span>
                </div>
                <span className="text-[10px]" style={{ color: "var(--cm-text-4)" }}>Last {m.period_days} days</span>
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
}

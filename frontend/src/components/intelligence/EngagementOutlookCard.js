import { useState, useCallback } from "react";
import axios from "axios";
import {
  Activity, ChevronDown, ChevronUp, Loader2,
  ArrowRight, MessageCircle, Clock, TrendingUp,
  Zap, AlertCircle, CheckCircle2, Eye,
} from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const FRESHNESS_STYLE = {
  green:  { bg: "rgba(16,185,129,0.1)",  border: "rgba(16,185,129,0.25)", text: "#10b981" },
  amber:  { bg: "rgba(245,158,11,0.1)",  border: "rgba(245,158,11,0.25)", text: "#f59e0b" },
  orange: { bg: "rgba(251,146,60,0.1)",  border: "rgba(251,146,60,0.2)",  text: "#fb923c" },
  gray:   { bg: "rgba(148,163,184,0.1)", border: "rgba(148,163,184,0.2)", text: "#94a3b8" },
};

const URGENCY_STYLE = {
  high:   { bg: "rgba(239,68,68,0.06)",  border: "rgba(239,68,68,0.18)",  icon: "#f87171", accent: "#ef4444" },
  medium: { bg: "rgba(245,158,11,0.06)", border: "rgba(245,158,11,0.18)", icon: "#fbbf24", accent: "#f59e0b" },
  low:    { bg: "rgba(59,130,246,0.06)", border: "rgba(59,130,246,0.15)", icon: "#60a5fa", accent: "#3b82f6" },
  none:   { bg: "rgba(16,185,129,0.06)", border: "rgba(16,185,129,0.15)", icon: "#34d399", accent: "#10b981" },
};

const SIGNAL_ICON = {
  positive:  { Icon: CheckCircle2, color: "#10b981" },
  neutral:   { Icon: Eye,          color: "#94a3b8" },
  attention: { Icon: AlertCircle,  color: "#f59e0b" },
};

export function EngagementOutlookCard({ programId, isBasic }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [error, setError] = useState(null);

  const fetchOutlook = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get(`${API}/intelligence/program/${programId}/engagement-outlook`);
      setData(res.data);
      setExpanded(true);
    } catch {
      setError("Failed to load engagement outlook");
    } finally {
      setLoading(false);
    }
  }, [programId]);

  // Basic users see a simplified version (freshness + next step only, no signal breakdown)
  // Pro users see the full card with expandable signal details

  return (
    <div
      className="rounded-lg border overflow-hidden"
      style={{
        backgroundColor: "var(--cm-surface)",
        borderColor: data ? (FRESHNESS_STYLE[data.freshness_color] || FRESHNESS_STYLE.gray).border : "var(--cm-border)",
      }}
      data-testid="engagement-outlook-card"
    >
      {/* Header — always clickable */}
      <button
        onClick={() => data ? setExpanded(!expanded) : fetchOutlook()}
        disabled={loading}
        className="w-full flex items-center gap-2 px-4 py-3 transition-colors hover:opacity-80"
        data-testid="engagement-outlook-trigger"
      >
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: "rgba(99,102,241,0.12)" }}
        >
          {loading
            ? <Loader2 className="w-3.5 h-3.5 animate-spin" style={{ color: "#818cf8" }} />
            : <Activity className="w-3.5 h-3.5" style={{ color: "#818cf8" }} />
          }
        </div>
        <div className="text-left flex-1 min-w-0">
          <p className="text-xs font-bold" style={{ color: "var(--cm-text)" }}>Engagement Outlook</p>
          <p className="text-[10px]" style={{ color: "var(--cm-text-3)" }}>
            {data ? data.freshness_label : "See where this relationship stands"}
          </p>
        </div>
        {data && (
          <FreshnessPill label={data.freshness_label} color={data.freshness_color} />
        )}
        {data && (
          expanded
            ? <ChevronUp className="w-4 h-4 flex-shrink-0" style={{ color: "var(--cm-text-3)" }} />
            : <ChevronDown className="w-4 h-4 flex-shrink-0" style={{ color: "var(--cm-text-3)" }} />
        )}
      </button>

      {/* Error */}
      {error && (
        <div className="px-4 pb-3">
          <p className="text-[10px] text-red-400">{error}</p>
        </div>
      )}

      {/* Expanded body */}
      {data && expanded && (
        <div className="px-4 pb-4 space-y-3 border-t" style={{ borderColor: "var(--cm-border)" }}>

          {/* Next Step — the MOST PROMINENT part */}
          <NextStepCard step={data.next_step} />

          {/* Signal breakdown — Pro only */}
          {!isBasic && data.signals?.length > 0 && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider mb-2 flex items-center gap-1" style={{ color: "var(--cm-text-3)" }}>
                <TrendingUp className="w-3 h-3" /> Signals
              </p>
              <div className="space-y-1">
                {data.signals.map((s, i) => {
                  const cfg = SIGNAL_ICON[s.type] || SIGNAL_ICON.neutral;
                  return (
                    <div key={i} className="flex items-center gap-2 py-1" data-testid={`signal-${i}`}>
                      <cfg.Icon style={{ width: 11, height: 11, color: cfg.color, flexShrink: 0 }} />
                      <span className="text-[11px]" style={{ color: "var(--cm-text-2)" }}>{s.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function FreshnessPill({ label, color }) {
  const s = FRESHNESS_STYLE[color] || FRESHNESS_STYLE.gray;
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold border flex-shrink-0"
      style={{ backgroundColor: s.bg, borderColor: s.border, color: s.text }}
      data-testid="freshness-pill"
    >
      {label}
    </span>
  );
}

function NextStepCard({ step }) {
  if (!step) return null;
  const u = URGENCY_STYLE[step.urgency] || URGENCY_STYLE.low;

  return (
    <div
      className="rounded-lg px-3.5 py-3 mt-3"
      style={{ backgroundColor: u.bg, border: `1px solid ${u.border}` }}
      data-testid="next-step-card"
    >
      <div className="flex items-start gap-2.5">
        <div
          className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 mt-0.5"
          style={{ backgroundColor: `${u.accent}18` }}
        >
          {step.urgency === "high" ? (
            <MessageCircle style={{ width: 13, height: 13, color: u.icon }} />
          ) : step.urgency === "none" ? (
            <CheckCircle2 style={{ width: 13, height: 13, color: u.icon }} />
          ) : (
            <ArrowRight style={{ width: 13, height: 13, color: u.icon }} />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[12px] font-bold leading-snug" style={{ color: "var(--cm-text)" }}>
            {step.action}
          </p>
          <p className="text-[10px] mt-1 leading-relaxed" style={{ color: "var(--cm-text-3)" }}>
            {step.context}
          </p>
        </div>
      </div>
    </div>
  );
}

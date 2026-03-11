import { useState, useCallback } from "react";
import axios from "axios";
import {
  Sparkles, ChevronDown, ChevronUp, RefreshCw, Loader2,
  CheckCircle2, AlertTriangle, HelpCircle, Clock, ArrowRight,
  Shield,
} from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const CONFIDENCE_STYLE = {
  HIGH: { bg: "bg-teal-600/15", text: "text-teal-500", border: "border-teal-500/20" },
  MEDIUM: { bg: "bg-amber-500/15", text: "text-amber-400", border: "border-amber-500/20" },
  LOW: { bg: "bg-zinc-500/15", text: "text-zinc-400", border: "border-zinc-500/20" },
};

const TIMELINE_COLOR = {
  green: "bg-teal-600/15 text-teal-500 border-teal-500/20",
  blue: "bg-blue-600/15 text-blue-400 border-blue-500/20",
  amber: "bg-amber-500/15 text-amber-400 border-amber-500/20",
  teal: "bg-teal-600/15 text-teal-500 border-teal-500/20",
  gray: "bg-zinc-500/15 text-zinc-400 border-zinc-500/20",
};

function ConfidenceBadge({ confidence, pct }) {
  const s = CONFIDENCE_STYLE[confidence] || CONFIDENCE_STYLE.LOW;
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold border ${s.bg} ${s.text} ${s.border}`}
      title={`${pct}% of data fields available`}
      data-testid="confidence-badge"
    >
      <Shield className="w-2.5 h-2.5" />
      {confidence} ({pct}%)
    </span>
  );
}

/* ── School Insight Card ──────────────────────────────────────────────── */

export function SchoolInsightCard({ programId, isBasic }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [error, setError] = useState(null);

  const fetch = useCallback(async (force = false) => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get(`${API}/intelligence/program/${programId}/school-insight`, { params: force ? { force: true } : {} });
      setData(res.data);
      setExpanded(true);
    } catch {
      setError("Failed to load school insight");
    } finally {
      setLoading(false);
    }
  }, [programId]);

  if (isBasic) {
    return (
      <div className="rounded-lg border p-4 opacity-60" style={{ backgroundColor: "var(--cm-surface)", borderColor: "var(--cm-border)" }} data-testid="school-insight-card-locked">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-teal-600" />
          <span className="text-xs font-bold" style={{ color: "var(--cm-text)" }}>School Insight</span>
          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400 ml-auto">PRO</span>
        </div>
        <p className="text-[10px] mt-1.5" style={{ color: "var(--cm-text-3)" }}>Upgrade to Pro to see AI-powered school analysis</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border overflow-hidden" style={{ backgroundColor: "var(--cm-surface)", borderColor: data ? "rgba(13,148,136,0.2)" : "var(--cm-border)" }} data-testid="school-insight-card">
      {/* Header */}
      <button
        onClick={() => data ? setExpanded(!expanded) : fetch()}
        disabled={loading}
        className="w-full flex items-center gap-2 px-4 py-3 transition-colors hover:opacity-80"
        data-testid="school-insight-trigger"
      >
        <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: "rgba(13,148,136,0.12)" }}>
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin text-teal-500" /> : <Sparkles className="w-3.5 h-3.5 text-teal-500" />}
        </div>
        <div className="text-left flex-1 min-w-0">
          <p className="text-xs font-bold" style={{ color: "var(--cm-text)" }}>School Insight</p>
          <p className="text-[10px]" style={{ color: "var(--cm-text-3)" }}>
            {data ? "Why this school fits — or doesn't" : "Analyze how this school fits your profile"}
          </p>
        </div>
        {data && <ConfidenceBadge confidence={data.confidence} pct={data.confidence_pct} />}
        {data && (expanded ? <ChevronUp className="w-4 h-4 flex-shrink-0" style={{ color: "var(--cm-text-3)" }} /> : <ChevronDown className="w-4 h-4 flex-shrink-0" style={{ color: "var(--cm-text-3)" }} />)}
      </button>

      {/* Error */}
      {error && (
        <div className="px-4 pb-3">
          <p className="text-[10px] text-red-400">{error}</p>
        </div>
      )}

      {/* Body */}
      {data && expanded && (
        <div className="px-4 pb-4 space-y-3 border-t" style={{ borderColor: "var(--cm-border)" }}>
          {/* Summary */}
          {data.summary && (
            <p className="text-[12px] leading-relaxed pt-3" style={{ color: "var(--cm-text-2)" }} data-testid="school-insight-summary">
              {data.summary}
            </p>
          )}

          {/* Strengths */}
          {data.strengths?.length > 0 && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider mb-1.5 flex items-center gap-1 text-teal-500">
                <CheckCircle2 className="w-3 h-3" /> Strengths
              </p>
              <div className="space-y-1.5">
                {data.strengths.map((s, i) => (
                  <div key={i} className="rounded-lg px-3 py-2" style={{ backgroundColor: "rgba(13,148,136,0.06)" }}>
                    <p className="text-[11px] font-medium" style={{ color: "var(--cm-text)" }}>{s.point}</p>
                    {s.evidence && <p className="text-[10px] mt-0.5" style={{ color: "var(--cm-text-3)" }}>{s.evidence}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Concerns */}
          {data.concerns?.length > 0 && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider mb-1.5 flex items-center gap-1 text-amber-400">
                <AlertTriangle className="w-3 h-3" /> Concerns
              </p>
              <div className="space-y-1.5">
                {data.concerns.map((c, i) => (
                  <div key={i} className="rounded-lg px-3 py-2" style={{ backgroundColor: "rgba(245,158,11,0.06)" }}>
                    <p className="text-[11px] font-medium" style={{ color: "var(--cm-text)" }}>{c.point}</p>
                    {c.evidence && <p className="text-[10px] mt-0.5" style={{ color: "var(--cm-text-3)" }}>{c.evidence}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Unknowns */}
          {data.unknowns?.length > 0 && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider mb-1.5 flex items-center gap-1" style={{ color: "var(--cm-text-3)" }}>
                <HelpCircle className="w-3 h-3" /> Data Gaps
              </p>
              <div className="space-y-1">
                {data.unknowns.map((u, i) => (
                  <p key={i} className="text-[10px] pl-4" style={{ color: "var(--cm-text-4)" }}>- {u}</p>
                ))}
              </div>
            </div>
          )}

          {/* Refresh */}
          <button
            onClick={() => fetch(true)}
            disabled={loading}
            className="flex items-center gap-1.5 text-[10px] font-medium transition-colors hover:opacity-70 pt-1"
            style={{ color: "var(--cm-text-3)" }}
            data-testid="school-insight-refresh"
          >
            <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} />
            {data.from_cache ? "Refresh analysis" : "Re-analyze"}
            {data.generated_by === "deterministic" && <span className="ml-1 opacity-60">(needs more data for AI analysis)</span>}
          </button>
        </div>
      )}
    </div>
  );
}


/* ── Timeline Card ────────────────────────────────────────────────────── */

export function TimelineCard({ programId, isBasic }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [error, setError] = useState(null);

  const fetch = useCallback(async (force = false) => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get(`${API}/intelligence/program/${programId}/timeline`, { params: force ? { force: true } : {} });
      setData(res.data);
      setExpanded(true);
    } catch {
      setError("Failed to load timeline analysis");
    } finally {
      setLoading(false);
    }
  }, [programId]);

  if (isBasic) {
    return (
      <div className="rounded-lg border p-4 opacity-60" style={{ backgroundColor: "var(--cm-surface)", borderColor: "var(--cm-border)" }} data-testid="timeline-card-locked">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-blue-400" />
          <span className="text-xs font-bold" style={{ color: "var(--cm-text)" }}>Recruiting Timeline</span>
          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400 ml-auto">PRO</span>
        </div>
        <p className="text-[10px] mt-1.5" style={{ color: "var(--cm-text-3)" }}>Upgrade to Pro to see timeline analysis</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border overflow-hidden" style={{ backgroundColor: "var(--cm-surface)", borderColor: data ? "rgba(59,130,246,0.2)" : "var(--cm-border)" }} data-testid="timeline-card">
      {/* Header */}
      <button
        onClick={() => data ? setExpanded(!expanded) : fetch()}
        disabled={loading}
        className="w-full flex items-center gap-2 px-4 py-3 transition-colors hover:opacity-80"
        data-testid="timeline-trigger"
      >
        <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: "rgba(59,130,246,0.12)" }}>
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-400" /> : <Clock className="w-3.5 h-3.5 text-blue-400" />}
        </div>
        <div className="text-left flex-1 min-w-0">
          <p className="text-xs font-bold" style={{ color: "var(--cm-text)" }}>Recruiting Timeline</p>
          <p className="text-[10px]" style={{ color: "var(--cm-text-3)" }}>
            {data ? `${data.timeline_label} - ${data.recruiting_status}` : "Analyze recruiting timeline and urgency"}
          </p>
        </div>
        {data && <ConfidenceBadge confidence={data.confidence} pct={data.confidence_pct} />}
        {data && (expanded ? <ChevronUp className="w-4 h-4 flex-shrink-0" style={{ color: "var(--cm-text-3)" }} /> : <ChevronDown className="w-4 h-4 flex-shrink-0" style={{ color: "var(--cm-text-3)" }} />)}
      </button>

      {error && (
        <div className="px-4 pb-3">
          <p className="text-[10px] text-red-400">{error}</p>
        </div>
      )}

      {data && expanded && (
        <div className="px-4 pb-4 space-y-3 border-t" style={{ borderColor: "var(--cm-border)" }}>
          {/* Timeline Label */}
          <div className="flex items-center gap-2 pt-3">
            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold border ${TIMELINE_COLOR[data.timeline_color] || TIMELINE_COLOR.gray}`} data-testid="timeline-label">
              {data.timeline_label}
            </span>
            <span className="text-[10px]" style={{ color: "var(--cm-text-3)" }}>
              {data.interaction_count} interaction{data.interaction_count !== 1 ? "s" : ""}
              {data.days_since_last != null && ` - last ${data.days_since_last}d ago`}
            </span>
          </div>

          {/* Description */}
          <p className="text-[12px] leading-relaxed" style={{ color: "var(--cm-text-2)" }} data-testid="timeline-description">
            {data.timeline_description}
          </p>

          {/* Narrative (LLM-enhanced only) */}
          {data.narrative && (
            <div className="rounded-lg px-3 py-2" style={{ backgroundColor: "rgba(59,130,246,0.06)" }}>
              <p className="text-[10px] font-bold uppercase tracking-wider mb-1 text-blue-400">AI Summary</p>
              <p className="text-[11px]" style={{ color: "var(--cm-text-2)" }}>{data.narrative}</p>
            </div>
          )}

          {/* Next Action */}
          <div className="rounded-lg px-3 py-2.5" style={{ backgroundColor: "var(--cm-surface-2)" }}>
            <p className="text-[10px] font-bold uppercase tracking-wider mb-1 flex items-center gap-1" style={{ color: "var(--cm-text-3)" }}>
              <ArrowRight className="w-3 h-3" /> Suggested Next Step
            </p>
            <p className="text-[11px] font-medium" style={{ color: "var(--cm-text)" }}>{data.next_action}</p>
          </div>

          {/* Urgency */}
          {data.urgency_note && (
            <div className={`rounded-lg px-3 py-2 ${data.urgency === "high" ? "bg-red-500/10" : "bg-amber-500/8"}`}>
              <p className={`text-[10px] font-medium ${data.urgency === "high" ? "text-red-400" : "text-amber-400"}`}>
                {data.urgency_note}
              </p>
            </div>
          )}

          {/* Unknowns */}
          {data.unknowns?.length > 0 && (
            <div className="space-y-1">
              {data.unknowns.map((u, i) => (
                <p key={i} className="text-[10px] flex items-center gap-1" style={{ color: "var(--cm-text-4)" }}>
                  <HelpCircle className="w-3 h-3 flex-shrink-0" /> {u}
                </p>
              ))}
            </div>
          )}

          {/* Refresh */}
          <button
            onClick={() => fetch(true)}
            disabled={loading}
            className="flex items-center gap-1.5 text-[10px] font-medium transition-colors hover:opacity-70 pt-1"
            style={{ color: "var(--cm-text-3)" }}
            data-testid="timeline-refresh"
          >
            <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} />
            Refresh analysis
          </button>
        </div>
      )}
    </div>
  );
}

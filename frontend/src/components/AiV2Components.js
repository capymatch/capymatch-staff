import { useState } from "react";
import axios from "axios";
import { Sparkles, RefreshCw, AlertCircle, ChevronRight, ArrowRight, Signal, Info } from "lucide-react";
import { useNavigate } from "react-router-dom";

const SIGNAL_CONFIG = {
  strong: { dot: "bg-emerald-500", text: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-100", label: "Strong signal" },
  moderate: { dot: "bg-amber-500", text: "text-amber-600", bg: "bg-amber-50", border: "border-amber-100", label: "Moderate signal" },
  limited: { dot: "bg-gray-400", text: "text-gray-500", bg: "bg-gray-50", border: "border-gray-200", label: "Limited signal" },
};

function ConfidenceIndicator({ confidence, dark = false }) {
  if (!confidence) return null;
  const cfg = SIGNAL_CONFIG[confidence.signal] || SIGNAL_CONFIG.limited;

  if (dark) {
    return (
      <div className="flex items-center gap-2 px-4 py-2 border-t border-white/5" data-testid="confidence-indicator">
        <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
        <span className="text-[10px] font-semibold text-white/50">{cfg.label}</span>
        <span className="text-[10px] text-white/30">{confidence.basis}</span>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2 px-4 py-2 border-t ${cfg.border} ${cfg.bg}`} data-testid="confidence-indicator">
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      <span className={`text-[10px] font-semibold ${cfg.text}`}>{cfg.label}</span>
      <span className="text-[10px] text-gray-400">{confidence.basis}</span>
    </div>
  );
}

const PRIORITY_STYLE = {
  high: "bg-red-50 border-red-100 text-red-700",
  medium: "bg-amber-50 border-amber-100 text-amber-700",
  low: "bg-gray-50 border-gray-100 text-gray-500",
};

const CATEGORY_LABEL = {
  advocacy: "Advocacy",
  event_prep: "Event Prep",
  athlete_support: "Support",
  admin: "Admin",
};

function ActionCard({ action }) {
  const navigate = useNavigate();
  const pStyle = PRIORITY_STYLE[action.priority] || PRIORITY_STYLE.low;

  return (
    <div className="border border-gray-100 rounded-lg p-4 bg-white hover:bg-gray-50/50 transition-colors" data-testid={`action-card-${action.priority}`}>
      <div className="flex items-start justify-between gap-3 mb-2">
        <p className="text-sm font-medium text-gray-900 leading-snug flex-1">{action.action}</p>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded border ${pStyle}`}>
            {action.priority}
          </span>
          {action.category && (
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-50 text-slate-500 border border-slate-100">
              {CATEGORY_LABEL[action.category] || action.category}
            </span>
          )}
        </div>
      </div>

      <div className="space-y-1 text-xs">
        {action.why && (
          <p className="text-gray-600"><span className="font-medium text-gray-500">Why:</span> {action.why}</p>
        )}
        {action.evidence && (
          <p className="text-gray-500 italic"><span className="font-medium text-gray-400 not-italic">Evidence:</span> {action.evidence}</p>
        )}
        <div className="flex items-center justify-between pt-1">
          {action.owner && (
            <span className="text-[11px] text-gray-400">Owner: {action.owner}</span>
          )}
          {action.cta_link && (
            <button
              onClick={() => navigate(action.cta_link)}
              className="flex items-center gap-0.5 text-[11px] text-slate-500 hover:text-slate-700"
            >
              {action.cta || "Open"} <ChevronRight className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export function AiSuggestedActions({ endpoint, label, buttonLabel, helperText, className = "" }) {
  const [actions, setActions] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [meta, setMeta] = useState(null);

  const generate = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.post(endpoint, {}, { timeout: 50000 });
      setActions(res.data.actions || []);
      setMeta(res.data);
    } catch (err) {
      const status = err.response?.status;
      const detail = err.response?.data?.detail;
      if (err.code === "ECONNABORTED") setError("Request timed out. Please try again.");
      else if (status === 503) setError(detail || "AI service temporarily unavailable.");
      else if (status === 403) setError("You don't have access to this feature.");
      else setError("Unable to generate suggestions right now.");
      setActions(null);
    } finally {
      setLoading(false);
    }
  };

  if (!actions && !loading && !error) {
    return (
      <div className={className}>
        <button
          onClick={generate}
          className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 text-white text-xs font-medium rounded-lg hover:bg-slate-800 transition-all"
          data-testid="ai-actions-btn"
        >
          <Sparkles className="w-3.5 h-3.5" />
          {buttonLabel || "Generate Suggestions"}
        </button>
        {helperText && (
          <p className="text-[11px] mt-1.5 ml-1" style={{ color: "#94a3b8" }}>{helperText}</p>
        )}
      </div>
    );
  }

  if (error && !loading) {
    return (
      <div className={`bg-slate-900/90 rounded-xl p-5 ${className}`} data-testid="ai-actions-error">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm text-white/70">{error}</p>
            <button onClick={generate} className="mt-2 flex items-center gap-1.5 px-3 py-1.5 text-[11px] text-white/60 hover:text-white/90 bg-white/5 hover:bg-white/10 rounded-md" data-testid="ai-actions-retry">
              <RefreshCw className="w-3 h-3" /> Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white border border-gray-100 rounded-xl overflow-hidden ${className}`} data-testid="ai-actions-panel">
      <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 bg-gradient-to-r from-slate-900 to-slate-800">
        <div className="flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span className="text-[10px] font-bold text-white/50 uppercase tracking-wider">{label || "AI Suggested Actions"}</span>
        </div>
        <button
          onClick={generate}
          disabled={loading}
          className="flex items-center gap-1 px-2 py-1 text-[10px] text-white/40 hover:text-white/70 rounded-md hover:bg-white/5"
          data-testid="ai-actions-refresh"
        >
          <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} /> Refresh
        </button>
      </div>

      <div className="p-4">
        {loading ? (
          <div className="flex items-center gap-2 py-6 justify-center">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-amber-400" />
            <span className="text-xs text-gray-400">Analyzing your data...</span>
          </div>
        ) : (
          <div className="space-y-3">
            {actions?.map((a, i) => <ActionCard key={i} action={a} />)}
            {actions?.length === 0 && (
              <p className="text-xs text-gray-400 text-center py-4">No suggestions generated. Try refreshing.</p>
            )}
          </div>
        )}
      </div>

      {meta?.generated_at && !loading && (
        <div className="px-5 py-2 border-t border-gray-50 text-[9px] text-gray-300">
          AI-generated · {new Date(meta.generated_at).toLocaleTimeString()}
        </div>
      )}
      {meta?.confidence && !loading && <ConfidenceIndicator confidence={meta.confidence} />}
    </div>
  );
}

export function AiPodBrief({ endpoint, className = "" }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const generate = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.post(endpoint, {}, { timeout: 50000 });
      setData(res.data);
    } catch (err) {
      const status = err.response?.status;
      const detail = err.response?.data?.detail;
      if (err.code === "ECONNABORTED") setError("Request timed out.");
      else if (status === 503) setError(detail || "AI service temporarily unavailable.");
      else setError("Unable to generate brief.");
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  const STATUS_STYLE = {
    needs_attention: { bg: "bg-amber-50 border-amber-200", dot: "bg-amber-500", label: "Needs Attention" },
    stable: { bg: "bg-emerald-50 border-emerald-200", dot: "bg-emerald-500", label: "Stable" },
    improving: { bg: "bg-blue-50 border-blue-200", dot: "bg-blue-500", label: "Improving" },
  };

  const FLAG_STYLE = {
    red: "text-red-600",
    overdue: "text-red-600",
    active: "text-amber-600",
    needs_attention: "text-amber-600",
    needs_cleanup: "text-amber-600",
  };

  if (!data && !loading && !error) {
    return (
      <button
        onClick={generate}
        className={`flex items-center gap-2 px-4 py-2.5 bg-slate-900 text-white text-xs font-medium rounded-lg hover:bg-slate-800 transition-all ${className}`}
        data-testid="ai-pod-brief-btn"
      >
        <Sparkles className="w-3.5 h-3.5" />
        Generate Pod Brief
      </button>
    );
  }

  if (error && !loading) {
    return (
      <div className={`bg-slate-900/90 rounded-xl p-4 ${className}`} data-testid="ai-pod-brief-error">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-white/70">{error}</p>
            <button onClick={generate} className="mt-2 flex items-center gap-1.5 px-3 py-1.5 text-[11px] text-white/60 hover:text-white/90 bg-white/5 hover:bg-white/10 rounded-md">
              <RefreshCw className="w-3 h-3" /> Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  const ss = STATUS_STYLE[data?.status_signal] || STATUS_STYLE.stable;

  return (
    <div className={`rounded-xl border overflow-hidden ${ss.bg} ${className}`} data-testid="ai-pod-brief-card">
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">AI Pod Brief</span>
            <span className={`w-2 h-2 rounded-full ${ss.dot}`} />
            <span className="text-[10px] font-medium text-gray-500">{ss.label}</span>
          </div>
          <button
            onClick={generate}
            disabled={loading}
            className="flex items-center gap-1 px-2 py-1 text-[10px] text-gray-400 hover:text-gray-600 rounded-md hover:bg-white/40"
            data-testid="ai-pod-brief-refresh"
          >
            <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 py-3">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-amber-400" />
            <span className="text-xs text-gray-400">Analyzing athlete data...</span>
          </div>
        ) : (
          <>
            <p className="text-sm text-gray-700 leading-relaxed mb-3" data-testid="ai-pod-brief-text">{data?.text}</p>
            {data?.key_facts?.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {data.key_facts.map((f, i) => (
                  <div key={i} className="bg-white/60 rounded-md px-2.5 py-1.5 border border-white/80" data-testid={`pod-fact-${i}`}>
                    <span className="text-[10px] text-gray-400">{f.label}</span>
                    <span className={`text-xs font-semibold ml-1 ${FLAG_STYLE[f.flag] || "text-gray-700"}`}>{f.value}</span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
      {data?.generated_at && !loading && (
        <div className="px-4 py-1.5 text-[9px] text-gray-300 border-t border-white/30">
          AI-generated · {new Date(data.generated_at).toLocaleTimeString()}
        </div>
      )}
      {data?.confidence && !loading && <ConfidenceIndicator confidence={data.confidence} />}
    </div>
  );
}

export function AiProgramInsights({ endpoint, className = "" }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const generate = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.post(endpoint, {}, { timeout: 50000 });
      setData(res.data);
    } catch (err) {
      const status = err.response?.status;
      const detail = err.response?.data?.detail;
      if (err.code === "ECONNABORTED") setError("Request timed out.");
      else if (status === 503) setError(detail || "AI service temporarily unavailable.");
      else if (status === 403) setError("Program insights are available to directors only.");
      else setError("Unable to generate insights.");
    } finally {
      setLoading(false);
    }
  };

  const SEVERITY_STYLE = {
    high: "border-l-red-400",
    medium: "border-l-amber-400",
    low: "border-l-gray-300",
  };

  if (!data && !loading && !error) {
    return (
      <button
        onClick={generate}
        className={`flex items-center gap-2 px-4 py-2.5 bg-slate-900 text-white text-xs font-medium rounded-lg hover:bg-slate-800 transition-all ${className}`}
        data-testid="ai-insights-btn"
      >
        <Sparkles className="w-3.5 h-3.5" />
        Generate Strategic Insights
      </button>
    );
  }

  if (error && !loading) {
    return (
      <div className={`bg-slate-900/90 rounded-xl p-5 ${className}`} data-testid="ai-insights-error">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-white/70">{error}</p>
            <button onClick={generate} className="mt-2 flex items-center gap-1.5 px-3 py-1.5 text-[11px] text-white/60 hover:text-white/90 bg-white/5 hover:bg-white/10 rounded-md">
              <RefreshCw className="w-3 h-3" /> Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-gradient-to-r from-slate-900 to-slate-800 rounded-xl overflow-hidden ${className}`} data-testid="ai-insights-panel">
      <div className="flex items-center justify-between px-5 py-3 border-b border-white/10">
        <div className="flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span className="text-[10px] font-bold text-white/50 uppercase tracking-wider">Strategic Insights</span>
        </div>
        <button
          onClick={generate}
          disabled={loading}
          className="flex items-center gap-1 px-2 py-1 text-[10px] text-white/40 hover:text-white/70 rounded-md hover:bg-white/5"
          data-testid="ai-insights-refresh"
        >
          <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} /> Refresh
        </button>
      </div>

      <div className="p-5">
        {loading ? (
          <div className="flex items-center gap-2 py-6 justify-center">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-amber-400" />
            <span className="text-xs text-white/50">Analyzing program data...</span>
          </div>
        ) : (
          <>
            {data?.narrative && (
              <p className="text-sm text-white/80 leading-relaxed mb-4" data-testid="ai-insights-narrative">{data.narrative}</p>
            )}
            {data?.insights?.length > 0 && (
              <div className="space-y-3">
                {data.insights.map((ins, i) => (
                  <div key={i} className={`bg-white/5 rounded-lg p-3.5 border-l-2 ${SEVERITY_STYLE[ins.severity] || SEVERITY_STYLE.low}`} data-testid={`insight-${i}`}>
                    <p className="text-sm font-medium text-white/90 mb-1.5">{ins.insight}</p>
                    {ins.why && <p className="text-xs text-white/60 mb-1"><span className="text-white/40 font-medium">Why:</span> {ins.why}</p>}
                    {ins.evidence && <p className="text-xs text-white/50 italic mb-1"><span className="text-white/40 font-medium not-italic">Evidence:</span> {ins.evidence}</p>}
                    {ins.recommendation && (
                      <p className="text-xs text-amber-400/80 mt-1.5 flex items-center gap-1">
                        <ArrowRight className="w-3 h-3" /> {ins.recommendation}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
      {data?.generated_at && !loading && (
        <div className="px-5 py-2 border-t border-white/5 text-[9px] text-white/20">
          AI-generated · {new Date(data.generated_at).toLocaleTimeString()}
        </div>
      )}
      {data?.confidence && !loading && <ConfidenceIndicator confidence={data.confidence} dark />}
    </div>
  );
}

export function AiEventFollowups({ endpoint, className = "" }) {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const generate = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.post(endpoint, {}, { timeout: 50000 });
      setData(res.data);
    } catch (err) {
      const status = err.response?.status;
      const detail = err.response?.data?.detail;
      if (err.code === "ECONNABORTED") setError("Request timed out.");
      else if (status === 503) setError(detail || "AI service temporarily unavailable.");
      else if (status === 400) setError(detail || "Not enough data for follow-up suggestions.");
      else setError("Unable to generate follow-ups.");
    } finally {
      setLoading(false);
    }
  };

  if (!data && !loading && !error) {
    return (
      <button
        onClick={generate}
        className={`flex items-center gap-2 px-4 py-2.5 bg-slate-900 text-white text-xs font-medium rounded-lg hover:bg-slate-800 transition-all ${className}`}
        data-testid="ai-followups-btn"
      >
        <Sparkles className="w-3.5 h-3.5" />
        Generate Follow-Up Suggestions
      </button>
    );
  }

  if (error && !loading) {
    return (
      <div className={`bg-slate-900/90 rounded-xl p-5 ${className}`} data-testid="ai-followups-error">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-white/70">{error}</p>
            <button onClick={generate} className="mt-2 flex items-center gap-1.5 px-3 py-1.5 text-[11px] text-white/60 hover:text-white/90 bg-white/5 hover:bg-white/10 rounded-md">
              <RefreshCw className="w-3 h-3" /> Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white border border-gray-100 rounded-xl overflow-hidden ${className}`} data-testid="ai-followups-panel">
      <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 bg-gradient-to-r from-slate-900 to-slate-800">
        <div className="flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span className="text-[10px] font-bold text-white/50 uppercase tracking-wider">AI Follow-Up Suggestions</span>
          {data?.notes_analyzed && (
            <span className="text-[10px] text-white/30">{data.notes_analyzed} notes analyzed</span>
          )}
        </div>
        <button
          onClick={generate}
          disabled={loading}
          className="flex items-center gap-1 px-2 py-1 text-[10px] text-white/40 hover:text-white/70 rounded-md hover:bg-white/5"
          data-testid="ai-followups-refresh"
        >
          <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} /> Refresh
        </button>
      </div>

      <div className="p-4">
        {loading ? (
          <div className="flex items-center gap-2 py-6 justify-center">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-amber-400" />
            <span className="text-xs text-gray-400">Analyzing event notes...</span>
          </div>
        ) : (
          <div className="space-y-3">
            {data?.followups?.map((f, i) => (
              <div key={i} className="border border-gray-100 rounded-lg p-4 hover:bg-gray-50/50 transition-colors" data-testid={`followup-card-${i}`}>
                <div className="flex items-start justify-between gap-3 mb-2">
                  <p className="text-sm font-medium text-gray-900 leading-snug flex-1">{f.action}</p>
                  <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded border shrink-0 ${PRIORITY_STYLE[f.priority] || PRIORITY_STYLE.low}`}>
                    {f.priority}
                  </span>
                </div>
                <div className="space-y-1 text-xs">
                  {f.why && <p className="text-gray-600"><span className="font-medium text-gray-500">Why:</span> {f.why}</p>}
                  {f.evidence && <p className="text-gray-500 italic"><span className="font-medium text-gray-400 not-italic">Evidence:</span> {f.evidence}</p>}
                  {f.athlete && (
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[11px] text-gray-400">Athlete: {f.athlete}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {(!data?.followups || data.followups.length === 0) && (
              <p className="text-xs text-gray-400 text-center py-4">No follow-up suggestions generated.</p>
            )}
          </div>
        )}
      </div>

      {data?.generated_at && !loading && (
        <div className="px-5 py-2 border-t border-gray-50 text-[9px] text-gray-300">
          AI-generated · {new Date(data.generated_at).toLocaleTimeString()}
        </div>
      )}
      {data?.confidence && !loading && <ConfidenceIndicator confidence={data.confidence} />}
    </div>
  );
}

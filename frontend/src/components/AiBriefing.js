import { useState } from "react";
import { Sparkles, RefreshCw, AlertCircle } from "lucide-react";

export function AiBriefing({ endpoint, label, buttonLabel, className = "" }) {
  const [text, setText] = useState(null);
  const [loading, setLoading] = useState(false);
  const [meta, setMeta] = useState(null);
  const [error, setError] = useState(null);

  const generate = async () => {
    setLoading(true);
    setError(null);
    try {
      const axios = (await import("axios")).default;
      const res = await axios.post(endpoint, {}, { timeout: 50000 });
      setText(res.data.text);
      setMeta(res.data);
    } catch (err) {
      const status = err.response?.status;
      const detail = err.response?.data?.detail;
      let msg;
      if (err.code === "ECONNABORTED" || err.message?.includes("timeout")) {
        msg = "Request timed out. The AI service is busy — please try again.";
      } else if (status === 503) {
        msg = detail || "AI service temporarily unavailable. Please try again.";
      } else if (status === 400) {
        msg = detail || "Not enough data to generate this briefing.";
      } else if (status === 403) {
        msg = "You don't have access to this data.";
      } else if (status === 401) {
        msg = "Session expired. Please log in again.";
      } else {
        msg = "Unable to generate briefing right now.";
      }
      setError(msg);
      setText(null);
    } finally {
      setLoading(false);
    }
  };

  if (!text && !loading && !error) {
    return (
      <button
        onClick={generate}
        className={`flex items-center gap-2 px-4 py-2.5 bg-slate-900 text-white text-xs font-medium rounded-lg hover:bg-slate-800 transition-all ${className}`}
        data-testid="ai-generate-btn"
      >
        <Sparkles className="w-3.5 h-3.5" />
        {buttonLabel || "Generate Briefing"}
      </button>
    );
  }

  if (error && !loading) {
    return (
      <div className={`bg-slate-900/90 rounded-xl p-5 ${className}`} data-testid="ai-briefing-error">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm text-white/70">{error}</p>
            <button
              onClick={generate}
              className="mt-2 flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium text-white/60 hover:text-white/90 bg-white/5 hover:bg-white/10 rounded-md transition-colors"
              data-testid="ai-retry-btn"
            >
              <RefreshCw className="w-3 h-3" /> Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-gradient-to-r from-slate-900 to-slate-800 rounded-xl p-5 ${className}`} data-testid="ai-briefing-card">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span className="text-[10px] font-bold text-white/50 uppercase tracking-wider">{label || "AI Briefing"}</span>
        </div>
        <button
          onClick={generate}
          disabled={loading}
          className="flex items-center gap-1 px-2 py-1 text-[10px] text-white/40 hover:text-white/70 transition-colors rounded-md hover:bg-white/5"
          data-testid="ai-refresh-btn"
        >
          <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>
      {loading ? (
        <div className="flex items-center gap-2 py-3">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-amber-400" />
          <span className="text-xs text-white/50">Analyzing your data...</span>
        </div>
      ) : (
        <p className="text-sm text-white/80 leading-relaxed" data-testid="ai-briefing-text">{text}</p>
      )}
      {meta?.generated_at && !loading && (
        <p className="text-[9px] text-white/25 mt-3">
          AI-generated · {new Date(meta.generated_at).toLocaleTimeString()}
        </p>
      )}
    </div>
  );
}

export function AiInlineButton({ onClick, loading, label, className = "" }) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-all ${
        loading
          ? "bg-gray-50 text-gray-400 border-gray-200"
          : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:border-slate-300"
      } ${className}`}
      data-testid="ai-inline-btn"
    >
      {loading ? (
        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-slate-400" />
      ) : (
        <Sparkles className="w-3 h-3 text-amber-500" />
      )}
      {label || "AI Assist"}
    </button>
  );
}

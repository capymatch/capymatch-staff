import { useState } from "react";
import { Sparkles, RefreshCw, AlertCircle, TrendingUp, Users, ShieldAlert } from "lucide-react";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function AIProgramBrief({ programStatus }) {
  const [text, setText] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [meta, setMeta] = useState(null);

  const generate = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.post(`${API}/ai/briefing`, {}, { timeout: 50000 });
      setText(res.data.text);
      setMeta(res.data);
    } catch (err) {
      const detail = err.response?.data?.detail;
      setError(detail || "Unable to generate briefing right now.");
      setText(null);
    } finally {
      setLoading(false);
    }
  };

  const needsAttention = programStatus?.needingAttention || 0;
  const unassigned = programStatus?.unassignedCount || 0;
  const total = programStatus?.totalAthletes || 0;
  const healthSignal = needsAttention > 5 ? "attention" : unassigned > 3 ? "monitor" : "healthy";

  const signalConfig = {
    healthy: { label: "Program Healthy", color: "bg-emerald-400", textColor: "text-emerald-300" },
    monitor: { label: "Monitoring", color: "bg-amber-400", textColor: "text-amber-300" },
    attention: { label: "Needs Attention", color: "bg-red-400", textColor: "text-red-300" },
  };
  const signal = signalConfig[healthSignal];

  return (
    <section
      data-testid="ai-program-brief"
      className="relative overflow-hidden rounded-2xl bg-slate-900 p-6 sm:p-8"
    >
      {/* Subtle gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 pointer-events-none" />

      <div className="relative z-10">
        {/* Top bar: signal + label */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${signal.color} animate-pulse`} />
              <span className={`text-[11px] font-semibold uppercase tracking-widest ${signal.textColor}`}>
                {signal.label}
              </span>
            </div>
            <span className="text-[11px] text-white/25 font-medium">
              {total} athletes in program
            </span>
          </div>

          {text && (
            <button
              onClick={generate}
              disabled={loading}
              className="flex items-center gap-1.5 px-2.5 py-1 text-[10px] text-white/30 hover:text-white/60 transition-colors rounded-md hover:bg-white/5"
              data-testid="ai-brief-refresh"
            >
              <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
          )}
        </div>

        {/* Quick signal chips */}
        {!text && !loading && (
          <div className="flex flex-wrap gap-2 mb-6">
            {needsAttention > 0 && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 text-white/60 text-xs font-medium">
                <ShieldAlert className="w-3 h-3 text-amber-400" />
                {needsAttention} need attention
              </span>
            )}
            {unassigned > 0 && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 text-white/60 text-xs font-medium">
                <Users className="w-3 h-3 text-red-400" />
                {unassigned} unassigned
              </span>
            )}
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 text-white/60 text-xs font-medium">
              <TrendingUp className="w-3 h-3 text-emerald-400" />
              {programStatus?.activeCoaches || 0} active coaches
            </span>
          </div>
        )}

        {/* Content area */}
        {!text && !loading && !error && (
          <button
            onClick={generate}
            className="flex items-center gap-2.5 px-5 py-3 bg-white/10 hover:bg-white/15 text-white text-sm font-medium rounded-xl transition-all active:scale-[0.98]"
            data-testid="ai-brief-generate"
          >
            <Sparkles className="w-4 h-4 text-amber-400" />
            Generate Program Brief
          </button>
        )}

        {loading && (
          <div className="flex items-center gap-3 py-4">
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-amber-400 border-t-transparent" />
            <span className="text-sm text-white/50">Analyzing program data...</span>
          </div>
        )}

        {error && !loading && (
          <div className="flex items-start gap-3 py-2" data-testid="ai-brief-error">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-white/60">{error}</p>
              <button
                onClick={generate}
                className="mt-2 flex items-center gap-1.5 px-3 py-1.5 text-[11px] text-white/40 hover:text-white/70 bg-white/5 hover:bg-white/10 rounded-md transition-colors"
                data-testid="ai-brief-retry"
              >
                <RefreshCw className="w-3 h-3" /> Try Again
              </button>
            </div>
          </div>
        )}

        {text && !loading && (
          <div data-testid="ai-brief-content">
            <p className="text-sm text-white/80 leading-relaxed max-w-3xl">{text}</p>
            {meta?.generated_at && (
              <p className="text-[10px] text-white/20 mt-4">
                AI-generated · {new Date(meta.generated_at).toLocaleTimeString()}
              </p>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

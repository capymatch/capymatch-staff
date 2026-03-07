import { useState } from "react";
import { Sparkles, RefreshCw, AlertCircle, Target, Calendar, AlertTriangle } from "lucide-react";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function TodaysActionsCard({ summary }) {
  const [actions, setActions] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [meta, setMeta] = useState(null);

  const generate = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.post(`${API}/ai/suggested-actions`, {}, { timeout: 50000 });
      setActions(res.data.actions || []);
      setMeta(res.data);
    } catch (err) {
      const detail = err.response?.data?.detail;
      setError(detail || "Unable to generate actions right now.");
      setActions(null);
    } finally {
      setLoading(false);
    }
  };

  const athleteCount = summary?.athleteCount || 0;
  const needingAction = summary?.needingAction || 0;
  const upcomingEvents = summary?.upcomingEvents || 0;

  return (
    <section
      data-testid="todays-actions-card"
      className="relative overflow-hidden rounded-2xl bg-slate-900 p-6 sm:p-8"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 pointer-events-none" />

      <div className="relative z-10">
        {/* Top bar */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span className="text-[11px] font-semibold uppercase tracking-widest text-white/40">
              Today's Actions
            </span>
          </div>
          {actions && (
            <button
              onClick={generate}
              disabled={loading}
              className="flex items-center gap-1.5 px-2.5 py-1 text-[10px] text-white/30 hover:text-white/60 transition-colors rounded-md hover:bg-white/5"
              data-testid="actions-refresh"
            >
              <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
          )}
        </div>

        {/* Summary chips */}
        <div className="flex flex-wrap gap-2 mb-6">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 text-white/60 text-xs font-medium">
            <Target className="w-3 h-3 text-blue-400" />
            {athleteCount} athletes
          </span>
          {needingAction > 0 && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 text-white/60 text-xs font-medium">
              <AlertTriangle className="w-3 h-3 text-amber-400" />
              {needingAction} need action
            </span>
          )}
          {upcomingEvents > 0 && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 text-white/60 text-xs font-medium">
              <Calendar className="w-3 h-3 text-violet-400" />
              {upcomingEvents} events this week
            </span>
          )}
        </div>

        {/* CTA or content */}
        {!actions && !loading && !error && (
          <button
            onClick={generate}
            className="flex items-center gap-2.5 px-5 py-3 bg-white/10 hover:bg-white/15 text-white text-sm font-medium rounded-xl transition-all active:scale-[0.98]"
            data-testid="actions-generate"
          >
            <Sparkles className="w-4 h-4 text-amber-400" />
            What Should I Do Today?
          </button>
        )}

        {loading && (
          <div className="flex items-center gap-3 py-4">
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-amber-400 border-t-transparent" />
            <span className="text-sm text-white/50">Building your priorities...</span>
          </div>
        )}

        {error && !loading && (
          <div className="flex items-start gap-3" data-testid="actions-error">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-white/60">{error}</p>
              <button
                onClick={generate}
                className="mt-2 flex items-center gap-1.5 px-3 py-1.5 text-[11px] text-white/40 hover:text-white/70 bg-white/5 hover:bg-white/10 rounded-md transition-colors"
                data-testid="actions-retry"
              >
                <RefreshCw className="w-3 h-3" /> Try Again
              </button>
            </div>
          </div>
        )}

        {actions && !loading && (
          <div className="space-y-3" data-testid="actions-list">
            {actions.length === 0 ? (
              <p className="text-sm text-white/50">No specific actions right now. Your athletes are on track.</p>
            ) : (
              actions.slice(0, 5).map((action, idx) => (
                <div
                  key={idx}
                  data-testid={`action-item-${idx}`}
                  className="flex items-start gap-3 bg-white/5 rounded-lg px-4 py-3"
                >
                  <span className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-[10px] font-bold text-white/60 shrink-0 mt-0.5">
                    {idx + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm text-white/80 font-medium">{action.action}</p>
                    {action.why && (
                      <p className="text-xs text-white/40 mt-1">{action.why}</p>
                    )}
                    {action.athlete && (
                      <span className="inline-block mt-1.5 text-[10px] px-2 py-0.5 rounded bg-white/5 text-white/50 font-medium">
                        {action.athlete}
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
            {meta?.confidence && (
              <p className="text-[10px] text-white/20 pt-2">
                {meta.confidence.basis} · {new Date(meta.generated_at).toLocaleTimeString()}
              </p>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

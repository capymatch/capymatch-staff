import { useState } from "react";
import { Sparkles, RefreshCw, AlertCircle, ChevronRight } from "lucide-react";
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

  return (
    <section data-testid="todays-actions-card">
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden shadow-sm">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-orange-500" />
            </div>
            <h3 className="text-base font-semibold text-slate-800">Today's Actions</h3>
          </div>
          {actions && (
            <button
              onClick={generate}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-400 hover:text-slate-600 transition-colors rounded-lg hover:bg-gray-50"
              data-testid="actions-refresh"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
          )}
        </div>

        {/* Content */}
        <div className="px-6 py-5">
          {!actions && !loading && !error && (
            <button
              onClick={generate}
              className="flex items-center gap-2.5 px-5 py-3 bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium rounded-xl transition-all active:scale-[0.98]"
              data-testid="actions-generate"
            >
              <Sparkles className="w-4 h-4 text-amber-400" />
              What Should I Do Today?
            </button>
          )}

          {loading && (
            <div className="flex items-center gap-3 py-2">
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-emerald-500 border-t-transparent" />
              <span className="text-sm text-slate-400">Building your priorities...</span>
            </div>
          )}

          {error && !loading && (
            <div className="flex items-start gap-3" data-testid="actions-error">
              <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-slate-500">{error}</p>
                <button
                  onClick={generate}
                  className="mt-2 flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-500 hover:text-slate-700 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
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
                <p className="text-sm text-slate-400">No specific actions right now. Your athletes are on track.</p>
              ) : (
                actions.slice(0, 5).map((action, idx) => (
                  <div
                    key={idx}
                    data-testid={`action-item-${idx}`}
                    className="flex items-start gap-3 bg-gray-50 rounded-xl px-4 py-3.5"
                  >
                    <span className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-[11px] font-bold text-slate-500 shrink-0 mt-0.5">
                      {idx + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm text-slate-700 font-medium">{action.action}</p>
                      {action.why && (
                        <p className="text-xs text-slate-400 mt-1">{action.why}</p>
                      )}
                      {action.athlete && (
                        <span className="inline-block mt-1.5 text-[10px] px-2 py-0.5 rounded-md bg-slate-100 text-slate-500 font-medium">
                          {action.athlete}
                        </span>
                      )}
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-300 shrink-0 mt-1" />
                  </div>
                ))
              )}
              {meta?.confidence && (
                <p className="text-[10px] text-slate-300 pt-1">
                  {meta.confidence.basis}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

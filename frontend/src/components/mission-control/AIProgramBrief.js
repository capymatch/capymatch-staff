import { useState } from "react";
import { Sparkles, RefreshCw, AlertCircle, ChevronRight } from "lucide-react";
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

  return (
    <section data-testid="ai-program-brief">
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden shadow-sm">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-amber-500" />
            </div>
            <h3 className="text-base font-semibold text-slate-800">Program Brief</h3>
          </div>
          {text && (
            <button
              onClick={generate}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-400 hover:text-slate-600 transition-colors rounded-lg hover:bg-gray-50"
              data-testid="ai-brief-refresh"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
          )}
        </div>

        {/* Content */}
        <div className="px-6 py-5">
          {!text && !loading && !error && (
            <button
              onClick={generate}
              className="flex items-center gap-2.5 px-5 py-3 bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium rounded-xl transition-all active:scale-[0.98]"
              data-testid="ai-brief-generate"
            >
              <Sparkles className="w-4 h-4 text-amber-400" />
              Generate Program Brief
            </button>
          )}

          {loading && (
            <div className="flex items-center gap-3 py-2">
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-emerald-500 border-t-transparent" />
              <span className="text-sm text-slate-400">Analyzing program data...</span>
            </div>
          )}

          {error && !loading && (
            <div className="flex items-start gap-3" data-testid="ai-brief-error">
              <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-slate-500">{error}</p>
                <button
                  onClick={generate}
                  className="mt-2 flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-500 hover:text-slate-700 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                  data-testid="ai-brief-retry"
                >
                  <RefreshCw className="w-3 h-3" /> Try Again
                </button>
              </div>
            </div>
          )}

          {text && !loading && (
            <div data-testid="ai-brief-content">
              <p className="text-sm text-slate-600 leading-relaxed">{text}</p>
              {meta?.generated_at && (
                <p className="text-[10px] text-slate-300 mt-3">
                  AI-generated · {new Date(meta.generated_at).toLocaleTimeString()}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

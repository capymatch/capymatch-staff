import { useState } from "react";
import { Sparkles, RefreshCw, AlertCircle } from "lucide-react";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

function formatBullets(text) {
  if (!text) return [];
  // Strip any existing bullet/number markers from AI output
  const cleaned = text
    .replace(/^[\s]*[-*\u2022\d.]+[\s]*/gm, "")
    .replace(/\.\s+/g, ".\n")
    .split("\n")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  return cleaned.slice(0, 4);
}

export default function AIProgramBrief() {
  const [text, setText] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [generatedAt, setGeneratedAt] = useState(null);
  const [dataBasis, setDataBasis] = useState(null);

  const generate = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.post(`${API}/ai/briefing`, {}, { timeout: 50000 });
      setText(res.data.text);
      setGeneratedAt(res.data.generated_at);
      setDataBasis({
        alerts: res.data.alerts_count || 0,
        events: res.data.events_count || 0,
      });
    } catch (err) {
      setError(err.response?.data?.detail || "Unable to generate briefing right now.");
      setText(null);
    } finally {
      setLoading(false);
    }
  };

  const bullets = formatBullets(text);

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
            <div data-testid="ai-brief-empty-state">
              <p className="text-sm text-slate-400 leading-relaxed mb-4">
                Generate a strategic overview of the program including athlete momentum,
                coach activity, recruiting signals, and event readiness.
              </p>
              <button
                onClick={generate}
                className="flex items-center gap-2.5 px-5 py-3 bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium rounded-xl transition-all active:scale-[0.98]"
                data-testid="ai-brief-generate"
              >
                <Sparkles className="w-4 h-4 text-amber-400" />
                Generate Brief
              </button>
            </div>
          )}

          {loading && (
            <div className="flex items-center gap-3 py-2">
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-emerald-500 border-t-transparent" />
              <span className="text-sm text-slate-400">Analyzing program signals...</span>
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
              <ul className="space-y-2">
                {bullets.map((line, idx) => (
                  <li key={idx} className="flex items-start gap-2.5 text-sm text-slate-600 leading-relaxed">
                    <span className="text-slate-400 shrink-0 mt-px select-none">&bull;</span>
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
              {generatedAt && (
                <p className="text-[10px] text-slate-300 mt-3">
                  AI-generated · {new Date(generatedAt).toLocaleTimeString()}
                  {dataBasis && (
                    <span className="ml-1">
                      · Based on {dataBasis.alerts} flagged athlete{dataBasis.alerts !== 1 ? "s" : ""}, {dataBasis.events} upcoming event{dataBasis.events !== 1 ? "s" : ""}
                    </span>
                  )}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

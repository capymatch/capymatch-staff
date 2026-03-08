import { useState } from "react";
import { Sparkles, RefreshCw, AlertCircle, Clock, ChevronRight } from "lucide-react";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

function parseActions(raw) {
  if (!raw) return [];

  // Split on numbered patterns: (1), (2), 1., 2., etc.
  const parts = raw.split(/\(\d+\)\s*|\b\d+\.\s+/).filter((s) => s && s.trim());

  return parts.map((part) => {
    const trimmed = part.trim().replace(/^\s*[-–—]\s*/, "");

    // Try to extract a time range (e.g. "9:00-10:00 AM:")
    const timeMatch = trimmed.match(/^(\d{1,2}:\d{2}\s*(?:AM|PM)?\s*[-–]\s*\d{1,2}:\d{2}\s*(?:AM|PM)?)\s*[:.]?\s*/i);
    const time = timeMatch ? timeMatch[1].trim() : null;
    const body = timeMatch ? trimmed.slice(timeMatch[0].length) : trimmed;

    // Try to split action from reason on " — " or " – "
    const reasonSplit = body.split(/\s[—–]\s/);
    const action = reasonSplit[0]?.trim() || body;
    const reason = reasonSplit.length > 1 ? reasonSplit.slice(1).join(" — ").trim() : null;

    // Extract first sentence as headline, rest as details
    const sentenceEnd = action.search(/[.:;]\s/);
    let headline, details;
    if (sentenceEnd > 20 && sentenceEnd < action.length - 10) {
      headline = action.slice(0, sentenceEnd + 1).trim();
      details = action.slice(sentenceEnd + 2).trim();
    } else {
      headline = action;
      details = null;
    }

    return { time, headline, details, reason };
  });
}

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

  const actions = parseActions(text);

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
            <div data-testid="ai-brief-content" className="space-y-3">
              {actions.length > 0 ? (
                actions.map((item, idx) => (
                  <div
                    key={idx}
                    data-testid={`brief-action-${idx}`}
                    className="flex gap-4 rounded-xl bg-[#F7FAFC] px-5 py-4"
                  >
                    {/* Number badge */}
                    <div className="shrink-0 mt-0.5">
                      <span
                        className="flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold"
                        style={{ backgroundColor: "#1E213A", color: "#30C5BE" }}
                      >
                        {idx + 1}
                      </span>
                    </div>

                    <div className="flex-1 min-w-0">
                      {/* Time badge */}
                      {item.time && (
                        <span className="inline-flex items-center gap-1 mb-2 px-2.5 py-1 rounded-md bg-slate-100 text-[11px] font-semibold text-slate-500">
                          <Clock className="w-3 h-3" />
                          {item.time}
                        </span>
                      )}

                      {/* Headline */}
                      <p className="text-sm font-semibold text-slate-800 leading-snug">
                        {item.headline}
                      </p>

                      {/* Details */}
                      {item.details && (
                        <p className="text-[13px] text-slate-500 leading-relaxed mt-1">
                          {item.details}
                        </p>
                      )}

                      {/* Reason / why */}
                      {item.reason && (
                        <p className="text-xs text-slate-400 italic mt-2 leading-relaxed">
                          {item.reason}
                        </p>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-600 leading-relaxed">{text}</p>
              )}

              {meta?.generated_at && (
                <p className="text-[10px] text-slate-300 pt-1">
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

import { useState, useEffect } from "react";
import axios from "axios";
import { Mail, Send, Clock, CheckCircle, AlertTriangle, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

function formatDate(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
  } catch {
    return "—";
  }
}

export default function DigestPanel() {
  const [sending, setSending] = useState(false);
  const [history, setHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [lastResult, setLastResult] = useState(null);

  const fetchHistory = async () => {
    try {
      const res = await axios.get(`${API}/digest/history`);
      setHistory(res.data);
    } catch { /* silent */ }
  };

  useEffect(() => { fetchHistory(); }, []);

  const handleSend = async () => {
    setSending(true);
    try {
      const res = await axios.post(`${API}/digest/generate`);
      setLastResult(res.data);
      if (res.data.status === "sent") {
        toast.success("Weekly digest sent to your email");
      } else {
        toast.warning("Digest generated but email delivery failed");
      }
      fetchHistory();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to generate digest");
    } finally {
      setSending(false);
    }
  };

  const lastDigest = history[0];

  return (
    <div className="mb-6" data-testid="digest-panel">
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        {/* Header row */}
        <div className="flex items-center gap-3 px-5 py-3.5">
          <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center shrink-0">
            <Mail className="w-4 h-4 text-slate-600" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-slate-800">Weekly Digest</span>
              {lastDigest && (
                <span className="text-[10px] text-slate-400">
                  Last sent {formatDate(lastDigest.sent_at)}
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Command brief of coach activation, notes, and athlete signals
            </p>
          </div>
          <div className="flex items-center gap-2">
            {history.length > 0 && (
              <button
                onClick={() => setShowHistory(!showHistory)}
                className="flex items-center gap-1 px-2 py-1.5 text-[11px] text-slate-400 hover:text-slate-600 border border-slate-200 rounded-lg transition-colors"
                data-testid="digest-history-toggle"
              >
                <Clock className="w-3 h-3" />
                History
                {showHistory ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
            )}
            <button
              onClick={handleSend}
              disabled={sending}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium bg-slate-900 text-white rounded-lg hover:bg-slate-800 disabled:opacity-50 transition-colors"
              data-testid="digest-send-btn"
            >
              {sending ? (
                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white" />
              ) : (
                <Send className="w-3 h-3" />
              )}
              {sending ? "Generating..." : "Send Digest"}
            </button>
          </div>
        </div>

        {/* Last result summary */}
        {lastResult && (
          <div className="border-t border-gray-100 px-5 py-3 bg-slate-50/50" data-testid="digest-result">
            <p className="text-xs text-slate-600 leading-relaxed">{lastResult.summary?.what_changed}</p>
            <div className="flex items-center gap-3 mt-2 text-[10px] text-slate-400">
              <span>{lastResult.summary?.coach_count} coaches</span>
              <span>·</span>
              <span>{lastResult.summary?.notes_this_week} notes this week</span>
              <span>·</span>
              <span>{lastResult.summary?.athletes_attention} needing attention</span>
              {lastResult.summary?.unassigned > 0 && (
                <>
                  <span>·</span>
                  <span className="text-amber-600">{lastResult.summary.unassigned} unassigned</span>
                </>
              )}
            </div>
          </div>
        )}

        {/* History */}
        {showHistory && history.length > 0 && (
          <div className="border-t border-gray-100" data-testid="digest-history-list">
            {history.map((d) => {
              const sc = d.summary_data?.coach_summary?.status_counts || {};
              const notesTotal = d.summary_data?.notes?.total || 0;
              const attnCount = (d.summary_data?.athletes_needing_attention || []).length;
              return (
                <div key={d.id} className="px-5 py-2.5 border-b border-gray-50 last:border-0 flex items-center gap-3">
                  <div className="shrink-0">
                    {d.delivery_status === "sent" ? (
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                    ) : (
                      <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-medium text-slate-700">{formatDate(d.sent_at)}</span>
                      <span className="text-[10px] text-slate-400">by {d.sent_by_name}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-400">
                      <span>{sc.active || 0} active · {sc.needs_support || 0} needs support</span>
                      <span>·</span>
                      <span>{notesTotal} notes</span>
                      <span>·</span>
                      <span>{attnCount} athletes flagged</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

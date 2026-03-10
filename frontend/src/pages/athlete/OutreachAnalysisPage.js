import { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "sonner";
import {
  BarChart3, TrendingUp, Target, AlertCircle, ArrowRight,
  Loader2, RefreshCw, CheckCircle, XCircle, Award
} from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

function ScoreRing({ score, label }) {
  const r = 52, c = 2 * Math.PI * r;
  const offset = c - (score / 100) * c;
  const color = score >= 70 ? "#10b981" : score >= 40 ? "#f59e0b" : "#ef4444";
  return (
    <div className="flex flex-col items-center">
      <div className="relative w-[120px] h-[120px]">
        <svg width="120" height="120" viewBox="0 0 120 120">
          <circle cx="60" cy="60" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" />
          <circle cx="60" cy="60" r={r} fill="none" stroke={color} strokeWidth="8"
            strokeDasharray={c} strokeDashoffset={offset} strokeLinecap="round"
            transform="rotate(-90 60 60)" style={{ transition: "stroke-dashoffset 1s ease" }} />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[28px] font-extrabold leading-none" style={{ color }}>{score}</span>
          <span className="text-[9px] font-semibold uppercase tracking-[1px] text-[var(--cm-text)]/35 mt-1">{label}</span>
        </div>
      </div>
    </div>
  );
}

export default function OutreachAnalysisPage() {
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);
  const token = localStorage.getItem("token");
  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  const fetchAnalysis = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/ai/outreach-analysis`, { headers });
      setAnalysis(res.data.analysis);
    } catch { toast.error("Failed to load analysis"); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchAnalysis(); }, []);

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 text-[#1a8a80] animate-spin" /></div>;

  if (!analysis) {
    return (
      <div className="max-w-2xl mx-auto text-center py-20" data-testid="outreach-empty">
        <BarChart3 className="w-12 h-12 mx-auto mb-3 text-[var(--cm-text)]/15" />
        <p className="text-sm text-[var(--cm-text)]/40">Add schools to your pipeline to see outreach analysis.</p>
      </div>
    );
  }

  const stats = analysis.stats || {};
  const ai = analysis.ai_insights || {};

  return (
    <div className="max-w-4xl mx-auto" data-testid="outreach-analysis-page">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg font-bold text-[var(--cm-text)]">Outreach Analysis</h1>
          <p className="text-[12px] text-[var(--cm-text)]/30">AI-powered analysis of your recruiting outreach</p>
        </div>
        <button onClick={fetchAnalysis} className="px-3 py-2 rounded-xl text-[12px] font-semibold inline-flex items-center gap-1.5 border"
          style={{ color: "var(--cm-text-2)", backgroundColor: "var(--cm-surface)", borderColor: "var(--cm-border)" }}
          data-testid="outreach-refresh-btn">
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      {/* Top Stats + Score */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
        <div className="sm:col-span-1 flex justify-center items-center rounded-lg border border-[var(--cm-border)] bg-[var(--cm-surface)] p-6">
          {ai.overall_score != null ? (
            <ScoreRing score={ai.overall_score} label={ai.score_label || "Score"} />
          ) : (
            <div className="text-center text-[var(--cm-text)]/30 text-xs">Analyzing...</div>
          )}
        </div>
        <div className="sm:col-span-3 grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Schools", value: stats.total_schools, icon: Target },
            { label: "Interactions", value: stats.total_interactions, icon: BarChart3 },
            { label: "Replies", value: stats.replied_schools, icon: CheckCircle },
            { label: "Response Rate", value: `${stats.response_rate || 0}%`, icon: TrendingUp },
          ].map(s => (
            <div key={s.label} className="rounded-xl border border-[var(--cm-border)] bg-[var(--cm-surface)] p-4" data-testid={`stat-${s.label.toLowerCase().replace(/\s+/g, '-')}`}>
              <s.icon className="w-4 h-4 text-[#1a8a80] mb-2" />
              <div className="text-xl font-extrabold text-[var(--cm-text)]">{s.value ?? 0}</div>
              <div className="text-[10px] text-[var(--cm-text)]/30 font-semibold uppercase tracking-wide">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* AI Summary */}
      {ai.summary && (
        <div className="rounded-lg border border-[var(--cm-border)] bg-[var(--cm-surface)] p-5 mb-5" data-testid="ai-summary">
          <p className="text-[13px] text-[var(--cm-text)]/60 leading-relaxed">{ai.summary}</p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-5">
        {/* Strengths */}
        {ai.strengths?.length > 0 && (
          <div className="rounded-lg border border-[var(--cm-border)] bg-[var(--cm-surface)] p-5" data-testid="strengths-section">
            <h3 className="text-[12px] font-bold uppercase tracking-[0.1em] text-emerald-400 mb-3 flex items-center gap-2">
              <Award className="w-4 h-4" /> Strengths
            </h3>
            <ul className="space-y-2">
              {ai.strengths.map((s, i) => (
                <li key={i} className="flex items-start gap-2 text-[13px] text-[var(--cm-text)]/60">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-400 mt-0.5 flex-shrink-0" /> {s}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Improvements */}
        {ai.improvements?.length > 0 && (
          <div className="rounded-lg border border-[var(--cm-border)] bg-[var(--cm-surface)] p-5" data-testid="improvements-section">
            <h3 className="text-[12px] font-bold uppercase tracking-[0.1em] text-amber-400 mb-3 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" /> Areas to Improve
            </h3>
            <ul className="space-y-2">
              {ai.improvements.map((s, i) => (
                <li key={i} className="flex items-start gap-2 text-[13px] text-[var(--cm-text)]/60">
                  <ArrowRight className="w-3.5 h-3.5 text-amber-400 mt-0.5 flex-shrink-0" /> {s}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Next Steps */}
      {ai.next_steps?.length > 0 && (
        <div className="rounded-lg border border-[#1a8a80]/15 bg-[#1a8a80]/5 p-5" data-testid="next-steps-section">
          <h3 className="text-[12px] font-bold uppercase tracking-[0.1em] text-[#1a8a80] mb-3">Recommended Next Steps</h3>
          <ul className="space-y-2">
            {ai.next_steps.map((s, i) => (
              <li key={i} className="flex items-start gap-2 text-[13px] text-[var(--cm-text)]/60">
                <span className="w-5 h-5 rounded-full bg-[#1a8a80]/15 text-[#1a8a80] text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</span>
                {s}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Division Insights */}
      {ai.division_insights && (
        <div className="rounded-lg border border-[var(--cm-border)] bg-[var(--cm-surface)] p-5 mt-5" data-testid="division-insights">
          <h3 className="text-[12px] font-bold uppercase tracking-[0.1em] text-[var(--cm-text)]/40 mb-2">Division Insights</h3>
          <p className="text-[13px] text-[var(--cm-text)]/60 leading-relaxed">{ai.division_insights}</p>
        </div>
      )}
    </div>
  );
}

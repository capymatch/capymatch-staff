import { useState } from "react";
import axios from "axios";
import { toast } from "sonner";
import {
  Video, Send, Loader2, Clock, Film, Target, AlertTriangle,
  Lightbulb, Share2, Sparkles, ChevronDown
} from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

function Section({ icon: Icon, title, color, children, testId }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-[#1a1f2e] overflow-hidden" data-testid={testId}>
      <button onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2.5 px-5 py-3.5 text-left hover:bg-white/[0.02] transition-colors">
        <Icon className="w-4 h-4 flex-shrink-0" style={{ color }} />
        <span className="text-[12px] font-bold uppercase tracking-[0.1em] flex-1" style={{ color }}>{title}</span>
        <ChevronDown className={`w-3.5 h-3.5 text-white/30 transition-transform ${open ? "" : "-rotate-90"}`} />
      </button>
      {open && <div className="px-5 pb-4">{children}</div>}
    </div>
  );
}

export default function HighlightAdvisorPage() {
  const [advice, setAdvice] = useState(null);
  const [loading, setLoading] = useState(false);
  const [question, setQuestion] = useState("");
  const token = localStorage.getItem("token");
  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  const fetchAdvice = async (q = "") => {
    setLoading(true);
    try {
      const res = await axios.post(`${API}/ai/highlight-advice`, { question: q }, { headers });
      setAdvice(res.data.advice);
    } catch { toast.error("Failed to generate advice"); }
    finally { setLoading(false); }
  };

  const quickQuestions = [
    "What clips should I prioritize for D1 coaches?",
    "How do I make my highlight video stand out?",
    "What are the biggest mistakes in recruiting videos?",
    "How long should my highlight reel be?",
  ];

  return (
    <div className="max-w-3xl mx-auto" data-testid="highlight-advisor-page">
      <div className="mb-6">
        <h1 className="text-lg font-bold text-white">Highlight Reel Advisor</h1>
        <p className="text-[12px] text-white/30">AI-powered advice for creating the perfect recruiting video</p>
      </div>

      {/* Input */}
      <div className="rounded-2xl border border-white/[0.06] bg-[#1a1f2e] p-5 mb-5" data-testid="highlight-input-section">
        <div className="flex items-end gap-2 mb-3">
          <textarea value={question} onChange={e => setQuestion(e.target.value)}
            placeholder="Ask about your highlight video, or click 'Generate' for full recommendations..." rows={2}
            className="flex-1 bg-white/[0.03] border border-white/10 rounded-xl p-3 text-[13px] text-white outline-none resize-none placeholder:text-white/25"
            data-testid="highlight-question-input" />
          <button onClick={() => fetchAdvice(question)} disabled={loading}
            className="px-5 py-[11px] rounded-xl text-[12px] font-bold text-white bg-[#1a8a80] disabled:opacity-40 inline-flex items-center gap-1.5"
            data-testid="generate-advice-btn">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {loading ? "Generating..." : "Generate"}
          </button>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {quickQuestions.map((q, i) => (
            <button key={i} onClick={() => { setQuestion(q); fetchAdvice(q); }}
              className="px-3 py-1.5 rounded-lg text-[11px] text-white/40 bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
              data-testid={`quick-q-${i}`}>{q}</button>
          ))}
        </div>
      </div>

      {/* Results */}
      {loading && !advice && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 text-[#1a8a80] animate-spin" />
        </div>
      )}

      {advice && !advice.error && (
        <div className="space-y-4">
          {/* Video Length */}
          {advice.video_length && (
            <div className="flex items-center gap-3 rounded-2xl border border-[#1a8a80]/15 bg-[#1a8a80]/5 p-4" data-testid="video-length-card">
              <Clock className="w-5 h-5 text-[#1a8a80]" />
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wide text-[#1a8a80]">Recommended Length</div>
                <div className="text-[14px] font-bold text-white">{advice.video_length}</div>
              </div>
            </div>
          )}

          {/* Structure */}
          {advice.structure?.length > 0 && (
            <Section icon={Film} title="Video Structure" color="#6366f1" testId="structure-section">
              <div className="space-y-2">
                {advice.structure.map((s, i) => (
                  <div key={i} className="flex items-start gap-3 py-2 border-b border-white/[0.04] last:border-0">
                    <span className="w-6 h-6 rounded-full bg-[#6366f1]/15 text-[#6366f1] text-[10px] font-bold flex items-center justify-center flex-shrink-0">{i + 1}</span>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[13px] font-semibold text-white">{s.section}</span>
                        {s.duration && <span className="text-[11px] text-white/30">{s.duration}</span>}
                      </div>
                      <p className="text-[12px] text-white/40 mt-0.5">{s.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Must-Include Skills */}
          {advice.must_include_skills?.length > 0 && (
            <Section icon={Target} title="Must-Include Skills" color="#10b981" testId="skills-section">
              <div className="flex flex-wrap gap-2">
                {advice.must_include_skills.map((s, i) => (
                  <span key={i} className="px-3 py-1.5 rounded-lg text-[12px] font-semibold bg-emerald-900/30 text-emerald-400 border border-emerald-800/30">{s}</span>
                ))}
              </div>
            </Section>
          )}

          {/* Things to Avoid */}
          {advice.avoid?.length > 0 && (
            <Section icon={AlertTriangle} title="Common Mistakes to Avoid" color="#ef4444" testId="avoid-section">
              <ul className="space-y-1.5">
                {advice.avoid.map((a, i) => (
                  <li key={i} className="flex items-start gap-2 text-[12px] text-white/50">
                    <AlertTriangle className="w-3 h-3 text-red-400 mt-0.5 flex-shrink-0" /> {a}
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {/* Technical Tips */}
          {advice.technical_tips?.length > 0 && (
            <Section icon={Lightbulb} title="Technical Tips" color="#f59e0b" testId="tips-section">
              <ul className="space-y-1.5">
                {advice.technical_tips.map((t, i) => (
                  <li key={i} className="flex items-start gap-2 text-[12px] text-white/50">
                    <Lightbulb className="w-3 h-3 text-amber-400 mt-0.5 flex-shrink-0" /> {t}
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {/* Position Specific */}
          {advice.position_specific && (
            <Section icon={Target} title="Position-Specific Advice" color="#1a8a80" testId="position-section">
              <p className="text-[13px] text-white/60 leading-relaxed">{advice.position_specific}</p>
            </Section>
          )}

          {/* Coach Perspective */}
          {advice.coach_perspective && (
            <Section icon={Video} title="What Coaches Look For" color="#a855f7" testId="coach-perspective-section">
              <p className="text-[13px] text-white/60 leading-relaxed">{advice.coach_perspective}</p>
            </Section>
          )}

          {/* Distribution */}
          {advice.distribution_tips?.length > 0 && (
            <Section icon={Share2} title="Distribution Tips" color="#0ea5e9" testId="distribution-section">
              <ul className="space-y-1.5">
                {advice.distribution_tips.map((t, i) => (
                  <li key={i} className="flex items-start gap-2 text-[12px] text-white/50">
                    <Share2 className="w-3 h-3 text-sky-400 mt-0.5 flex-shrink-0" /> {t}
                  </li>
                ))}
              </ul>
            </Section>
          )}
        </div>
      )}
    </div>
  );
}

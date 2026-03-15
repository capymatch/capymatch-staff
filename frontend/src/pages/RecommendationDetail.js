import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { ArrowLeft, Send, MessageCircle, Clock, Check, X, AlertCircle, ExternalLink, ChevronRight } from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const STATUS_BADGE = {
  draft: { label: "Draft", cls: "bg-gray-100 text-gray-600" },
  sent: { label: "Sent", cls: "bg-blue-100 text-blue-700" },
  awaiting_reply: { label: "Awaiting Reply", cls: "bg-amber-100 text-amber-700" },
  warm_response: { label: "Warm Response", cls: "bg-emerald-100 text-emerald-700" },
  follow_up_needed: { label: "Follow-up Needed", cls: "bg-orange-100 text-orange-700" },
  closed: { label: "Closed", cls: "bg-gray-100 text-gray-400" },
};

const STATUS_STEPS = ["sent", "awaiting_reply", "warm_response", "closed"];

function timeAgo(iso) {
  if (!iso) return "";
  const days = Math.round((Date.now() - new Date(iso).getTime()) / 86400000);
  if (days === 0) return "today";
  if (days === 1) return "1 day ago";
  return `${days} days ago`;
}

function formatDate(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function RecommendationDetail() {
  const { recommendationId } = useParams();
  const navigate = useNavigate();
  const [rec, setRec] = useState(null);
  const [loading, setLoading] = useState(true);

  // Response form
  const [showResponseForm, setShowResponseForm] = useState(false);
  const [responseNote, setResponseNote] = useState("");
  const [responseType, setResponseType] = useState("warm");

  // Close form
  const [showCloseForm, setShowCloseForm] = useState(false);
  const [closeReason, setCloseReason] = useState("no_response");

  const fetchRec = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/advocacy/recommendations/${recommendationId}`);
      setRec(res.data);
    } catch {
      toast.error("Failed to load recommendation");
    } finally {
      setLoading(false);
    }
  }, [recommendationId]);

  useEffect(() => { fetchRec(); }, [fetchRec]);

  const sendDraft = async () => {
    try {
      await axios.post(`${API}/advocacy/recommendations/${recommendationId}/send`);
      toast.success(`Sent to ${rec.school_name} — saved`);
      fetchRec();
    } catch { toast.error("Failed to send"); }
  };

  const submitResponse = async () => {
    if (!responseNote.trim()) { toast.error("Enter a response note"); return; }
    try {
      await axios.post(`${API}/advocacy/recommendations/${recommendationId}/respond`, { response_note: responseNote, response_type: responseType });
      toast.success("Response saved");
      setShowResponseForm(false);
      setResponseNote("");
      fetchRec();
    } catch { toast.error("Failed to log response"); }
  };

  const markFollowUp = async () => {
    try {
      await axios.post(`${API}/advocacy/recommendations/${recommendationId}/follow-up`);
      toast.success("Follow-up saved");
      fetchRec();
    } catch { toast.error("Failed"); }
  };

  const closeRec = async () => {
    try {
      await axios.post(`${API}/advocacy/recommendations/${recommendationId}/close`, { reason: closeReason });
      toast.success("Closed — saved");
      setShowCloseForm(false);
      fetchRec();
    } catch { toast.error("Failed to close"); }
  };

  if (loading) return <div className="min-h-screen bg-slate-50 flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-400" /></div>;
  if (!rec || rec.error) return <div className="min-h-screen bg-slate-50 flex items-center justify-center"><p className="text-gray-500">Recommendation not found</p></div>;

  const badge = STATUS_BADGE[rec.status] || STATUS_BADGE.draft;
  const isClosed = rec.status === "closed";
  const isDraft = rec.status === "draft";

  const FIT_LABELS = { athletic_ability: "Athletic ability", tactical_awareness: "Tactical awareness", academic_fit: "Academic fit", character_leadership: "Character/leadership", coachability: "Coachability", program_need_match: "Program need match" };

  return (
    <div className="min-h-screen bg-slate-50" data-testid="recommendation-detail-page">
      <header className="bg-white/95 border-b border-gray-100">
        <div className="max-w-[900px] mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate("/advocacy")} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800" data-testid="back-to-advocacy-detail">
              <ArrowLeft className="w-4 h-4" /><span className="hidden sm:inline">Advocacy</span>
            </button>
            <div className="h-5 w-px bg-gray-200" />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-gray-900 text-sm">{rec.athlete_name}</span>
                <span className="text-gray-400">→</span>
                <span className="text-sm text-gray-700">{rec.school_name}</span>
                <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${badge.cls}`} data-testid="rec-status-badge">{badge.label}</span>
              </div>
            </div>
          </div>
          {isDraft && (
            <button onClick={sendDraft} className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium bg-slate-900 text-white rounded-md hover:bg-slate-800" data-testid="send-draft-btn">
              <Send className="w-3.5 h-3.5" /> Send
            </button>
          )}
        </div>
      </header>

      <main className="max-w-[900px] mx-auto px-4 sm:px-6 py-6 space-y-5">
        {/* Recommendation Summary */}
        <section className="bg-white border border-gray-100 rounded-lg p-5" data-testid="rec-summary-section">
          <h2 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-3">Recommendation</h2>
          <div className="space-y-2 text-sm text-gray-700">
            <div className="flex items-center gap-4">
              <span><span className="text-gray-400">Athlete:</span> {rec.athlete_name}</span>
              <span><span className="text-gray-400">School:</span> {rec.school_name}</span>
              {rec.college_coach_name && <span><span className="text-gray-400">Coach:</span> {rec.college_coach_name}</span>}
            </div>
            {rec.sent_at && <p className="text-xs text-gray-400">Sent {formatDate(rec.sent_at)} ({timeAgo(rec.sent_at)})</p>}
            {rec.desired_next_step && <p className="text-xs"><span className="text-gray-400">Ask:</span> {rec.desired_next_step.replace(/_/g, " ")}</p>}
            {rec.fit_reasons?.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-1">
                {rec.fit_reasons.map((r) => (
                  <span key={r} className="text-[10px] px-2 py-0.5 bg-gray-100 rounded-full text-gray-600">{FIT_LABELS[r] || r}</span>
                ))}
              </div>
            )}
            {rec.fit_note && <p className="text-xs text-gray-600 mt-1 italic">"{rec.fit_note}"</p>}
            {rec.intro_message && (
              <div className="mt-3 p-3 bg-slate-50 rounded-md border border-slate-100">
                <p className="text-xs text-gray-600 whitespace-pre-line">{rec.intro_message}</p>
              </div>
            )}
          </div>
        </section>

        {/* Response Tracking */}
        {!isDraft && (
          <section className="bg-white border border-gray-100 rounded-lg p-5" data-testid="response-tracking-section">
            <h2 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-4">Response Tracking</h2>

            {/* Status progression */}
            <div className="flex items-center gap-1 mb-4">
              {STATUS_STEPS.map((step, i) => {
                const stepIdx = STATUS_STEPS.indexOf(rec.status === "follow_up_needed" ? "awaiting_reply" : rec.status);
                const currentIdx = STATUS_STEPS.indexOf(step);
                const isActive = currentIdx <= stepIdx;
                return (
                  <div key={step} className="flex items-center gap-1">
                    <div className={`w-2.5 h-2.5 rounded-full ${isActive ? "bg-slate-900" : "bg-gray-200"}`} />
                    <span className={`text-[10px] ${isActive ? "text-gray-700 font-medium" : "text-gray-300"}`}>{STATUS_BADGE[step]?.label}</span>
                    {i < STATUS_STEPS.length - 1 && <div className={`w-6 h-px ${isActive ? "bg-slate-900" : "bg-gray-200"}`} />}
                  </div>
                );
              })}
            </div>

            {/* Actions */}
            {!isClosed && (
              <div className="flex items-center gap-2 mb-4">
                <button
                  onClick={() => { setShowResponseForm(true); setShowCloseForm(false); }}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-emerald-50 text-emerald-700 rounded-md hover:bg-emerald-100 transition-colors"
                  data-testid="log-response-btn"
                >
                  <MessageCircle className="w-3 h-3" /> Log Response
                </button>
                <button
                  onClick={markFollowUp}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-amber-50 text-amber-700 rounded-md hover:bg-amber-100 transition-colors"
                  data-testid="mark-followup-btn"
                >
                  <AlertCircle className="w-3 h-3" /> Follow-up
                </button>
                <button
                  onClick={() => { setShowCloseForm(true); setShowResponseForm(false); }}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-gray-50 text-gray-600 rounded-md hover:bg-gray-100 transition-colors"
                  data-testid="close-rec-btn"
                >
                  <X className="w-3 h-3" /> Close
                </button>
              </div>
            )}

            {/* Response form */}
            {showResponseForm && (
              <div className="p-3 bg-emerald-50 rounded-md border border-emerald-100 mb-4" data-testid="response-form">
                <textarea
                  value={responseNote}
                  onChange={(e) => setResponseNote(e.target.value)}
                  placeholder="What did they say?"
                  rows={2}
                  data-testid="response-note-input"
                  className="w-full border border-emerald-200 rounded-md px-3 py-2 text-sm bg-white resize-none mb-2"
                />
                <div className="flex items-center justify-between">
                  <div className="flex gap-2">
                    {[{ v: "warm", l: "Warm" }, { v: "declined", l: "Declined" }].map((opt) => (
                      <label key={opt.v} className="flex items-center gap-1 text-xs cursor-pointer">
                        <input type="radio" name="rtype" value={opt.v} checked={responseType === opt.v} onChange={() => setResponseType(opt.v)} className="accent-emerald-600" />
                        {opt.l}
                      </label>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setShowResponseForm(false)} className="text-xs text-gray-400 hover:text-gray-600">Cancel</button>
                    <button onClick={submitResponse} className="px-3 py-1 text-xs font-medium bg-emerald-600 text-white rounded-md hover:bg-emerald-700" data-testid="submit-response-btn">Save</button>
                  </div>
                </div>
              </div>
            )}

            {/* Close form */}
            {showCloseForm && (
              <div className="p-3 bg-gray-50 rounded-md border border-gray-200 mb-4" data-testid="close-form">
                <div className="flex items-center gap-3 mb-2">
                  {[{ v: "positive_outcome", l: "Positive outcome" }, { v: "no_response", l: "No response" }, { v: "declined", l: "Declined" }].map((opt) => (
                    <label key={opt.v} className="flex items-center gap-1 text-xs cursor-pointer">
                      <input type="radio" name="creason" value={opt.v} checked={closeReason === opt.v} onChange={() => setCloseReason(opt.v)} className="accent-gray-600" />
                      {opt.l}
                    </label>
                  ))}
                </div>
                <div className="flex justify-end gap-2">
                  <button onClick={() => setShowCloseForm(false)} className="text-xs text-gray-400 hover:text-gray-600">Cancel</button>
                  <button onClick={closeRec} className="px-3 py-1 text-xs font-medium bg-gray-700 text-white rounded-md hover:bg-gray-800" data-testid="confirm-close-btn">Close Recommendation</button>
                </div>
              </div>
            )}

            {/* Response history timeline */}
            <div className="space-y-2 mt-2">
              {(rec.response_history || []).map((entry, i) => (
                <div key={i} className="flex items-start gap-3 text-xs" data-testid={`history-entry-${i}`}>
                  <div className="w-1.5 h-1.5 rounded-full bg-gray-300 mt-1.5 shrink-0" />
                  <div>
                    <span className="text-gray-400">{formatDate(entry.date)}</span>
                    <span className="text-gray-600 ml-2">{entry.text}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Relationship summary */}
        {rec.relationship_summary && (
          <section className="bg-white border border-gray-100 rounded-lg p-5" data-testid="rec-relationship-section">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Relationship with {rec.school_name}</h2>
              <button
                onClick={() => navigate(`/advocacy/relationships/${rec.school_id}`)}
                className="text-[10px] text-gray-400 hover:text-gray-700 flex items-center gap-0.5"
              >
                View full <ExternalLink className="w-3 h-3" />
              </button>
            </div>
            <div className="flex items-center gap-4 text-xs text-gray-500">
              <span>{rec.relationship_summary.totalInteractions} total interactions</span>
              <span>{rec.relationship_summary.athletesIntroduced} athletes introduced</span>
              <span>Response rate: {Math.round(rec.relationship_summary.responseRate * 100)}%</span>
              <span className={`font-medium ${rec.relationship_summary.warmth === "hot" ? "text-red-500" : rec.relationship_summary.warmth === "warm" ? "text-amber-500" : "text-gray-400"}`}>
                {rec.relationship_summary.warmth}
              </span>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

export default RecommendationDetail;

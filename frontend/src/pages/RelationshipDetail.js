import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { ArrowLeft, ExternalLink, Clock, Send, MessageCircle } from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const WARMTH = {
  hot: { cls: "text-red-600 bg-red-50", label: "Hot" },
  warm: { cls: "text-amber-600 bg-amber-50", label: "Warm" },
  cold: { cls: "text-gray-500 bg-gray-50", label: "Cold" },
};

const INTEREST_DOT = { hot: "bg-red-500", warm: "bg-amber-400", cool: "bg-sky-400" };

function formatDate(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function timeAgo(iso) {
  if (!iso) return "";
  const days = Math.round((Date.now() - new Date(iso).getTime()) / 86400000);
  if (days === 0) return "today";
  if (days === 1) return "1 day ago";
  return `${days} days ago`;
}

function RelationshipDetail() {
  const { schoolId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await axios.get(`${API}/advocacy/relationships/${schoolId}`);
        setData(res.data);
      } catch {
        toast.error("Failed to load relationship");
      } finally {
        setLoading(false);
      }
    })();
  }, [schoolId]);

  if (loading) return <div className="min-h-screen bg-slate-50 flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-400" /></div>;
  if (!data || data.error) return <div className="min-h-screen bg-slate-50 flex items-center justify-center"><p className="text-gray-500">School not found</p></div>;

  const { school, summary, athletes, timeline } = data;
  const warmth = WARMTH[summary.warmth] || WARMTH.cold;

  return (
    <div className="min-h-screen bg-slate-50" data-testid="relationship-detail-page">
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-100">
        <div className="max-w-[900px] mx-auto px-4 sm:px-6 py-3 flex items-center gap-4">
          <button onClick={() => navigate("/advocacy")} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800" data-testid="back-to-advocacy-rel">
            <ArrowLeft className="w-4 h-4" /><span className="hidden sm:inline">Advocacy</span>
          </button>
          <div className="h-5 w-px bg-gray-200" />
          <h1 className="font-semibold text-gray-900 text-base" data-testid="relationship-school-name">{school.name} — Relationship History</h1>
        </div>
      </header>

      <main className="max-w-[900px] mx-auto px-4 sm:px-6 py-6 space-y-5">
        {/* Relationship Summary */}
        <section className="bg-white border border-gray-100 rounded-lg p-5" data-testid="relationship-summary">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-base font-semibold text-gray-900">{school.name}</h2>
              <span className="text-xs text-gray-400">{school.division}</span>
            </div>
            <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${warmth.cls}`} data-testid="warmth-badge">{warmth.label}</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
            <div className="text-center p-2 bg-gray-50 rounded-md">
              <div className="text-lg font-bold text-gray-900">{summary.totalInteractions}</div>
              <div className="text-[10px] text-gray-400 uppercase">Interactions</div>
            </div>
            <div className="text-center p-2 bg-gray-50 rounded-md">
              <div className="text-lg font-bold text-gray-900">{summary.athletesIntroduced}</div>
              <div className="text-[10px] text-gray-400 uppercase">Athletes Introduced</div>
            </div>
            <div className="text-center p-2 bg-gray-50 rounded-md">
              <div className="text-lg font-bold text-gray-900">{Math.round(summary.responseRate * 100)}%</div>
              <div className="text-[10px] text-gray-400 uppercase">Response Rate</div>
            </div>
            <div className="text-center p-2 bg-gray-50 rounded-md">
              <div className="text-sm font-bold text-gray-900">{summary.lastContact ? timeAgo(summary.lastContact) : "—"}</div>
              <div className="text-[10px] text-gray-400 uppercase">Last Contact</div>
            </div>
          </div>
        </section>

        {/* Athletes Introduced */}
        {athletes.length > 0 && (
          <section className="bg-white border border-gray-100 rounded-lg p-5" data-testid="rel-athletes-section">
            <h2 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-3">Athletes Introduced</h2>
            <div className="space-y-2">
              {athletes.map((a) => {
                const statusBadge = {
                  draft: "text-gray-500 bg-gray-100",
                  sent: "text-blue-600 bg-blue-50",
                  awaiting_reply: "text-amber-600 bg-amber-50",
                  warm_response: "text-emerald-600 bg-emerald-50",
                  follow_up_needed: "text-orange-600 bg-orange-50",
                  closed: "text-gray-400 bg-gray-100",
                };
                return (
                  <div key={a.id} className="flex items-center justify-between py-1.5" data-testid={`rel-athlete-${a.id}`}>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-800">{a.name}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${statusBadge[a.recommendation_status] || ""}`}>
                        {a.recommendation_status?.replace(/_/g, " ")}
                      </span>
                    </div>
                    <button
                      onClick={() => navigate(`/advocacy/${a.recommendation_id}`)}
                      className="text-[10px] text-gray-400 hover:text-gray-700 flex items-center gap-0.5"
                    >
                      View <ExternalLink className="w-3 h-3" />
                    </button>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Interaction Timeline */}
        <section className="bg-white border border-gray-100 rounded-lg p-5" data-testid="rel-timeline-section">
          <h2 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-4">Interaction Timeline</h2>
          <div className="space-y-3">
            {timeline.length === 0 && <p className="text-xs text-gray-400">No interactions recorded yet.</p>}
            {timeline.map((entry, i) => {
              const isEvent = entry.type === "event_note";
              const isRec = entry.type?.startsWith("recommendation_");
              return (
                <div key={i} className="flex items-start gap-3" data-testid={`timeline-entry-${i}`}>
                  <div className="flex flex-col items-center mt-0.5">
                    <div className={`w-2.5 h-2.5 rounded-full ${
                      isEvent ? (INTEREST_DOT[entry.interest_level] || "bg-gray-300") : "bg-slate-400"
                    }`} />
                    {i < timeline.length - 1 && <div className="w-px h-6 bg-gray-100 mt-0.5" />}
                  </div>
                  <div className="flex-1 min-w-0 pb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-gray-400">{formatDate(entry.date)}</span>
                      {isEvent && <span className="text-[10px] px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded">{entry.event_name}</span>}
                      {isRec && <span className="text-[10px] px-1.5 py-0.5 bg-slate-50 text-slate-600 rounded">Recommendation</span>}
                    </div>
                    <div className="text-xs text-gray-700 mt-0.5">
                      {entry.athlete_name && <span className="font-medium">{entry.athlete_name}: </span>}
                      {entry.text && <span>"{entry.text}"</span>}
                      {!entry.text && entry.desired_next_step && <span>Ask: {entry.desired_next_step.replace(/_/g, " ")}</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </main>
    </div>
  );
}

export default RelationshipDetail;

import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import axios from "axios";
import Header from "@/components/mission-control/Header";
import { toast } from "sonner";
import { Plus, ChevronRight, Clock, MessageCircle, AlertCircle, Check, X } from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const STATUS_BADGE = {
  draft: { label: "Draft", cls: "bg-gray-100 text-gray-600" },
  sent: { label: "Sent", cls: "bg-blue-100 text-blue-700" },
  awaiting_reply: { label: "Awaiting Reply", cls: "bg-amber-100 text-amber-700" },
  warm_response: { label: "Warm Response", cls: "bg-emerald-100 text-emerald-700" },
  follow_up_needed: { label: "Follow-up Needed", cls: "bg-orange-100 text-orange-700" },
  closed: { label: "Closed", cls: "bg-gray-100 text-gray-400" },
};

function timeAgo(iso) {
  if (!iso) return "";
  const days = Math.round((Date.now() - new Date(iso).getTime()) / 86400000);
  if (days === 0) return "today";
  if (days === 1) return "1 day ago";
  return `${days} days ago`;
}

function RecCard({ rec }) {
  const navigate = useNavigate();
  const badge = STATUS_BADGE[rec.status] || STATUS_BADGE.draft;
  const isClosed = rec.status === "closed";
  const isDraft = rec.status === "draft";

  const sentDays = rec.sent_at ? Math.round((Date.now() - new Date(rec.sent_at).getTime()) / 86400000) : null;
  const needsFollowUp = rec.status === "awaiting_reply" && sentDays >= 3;

  return (
    <div
      className={`border rounded-lg p-4 transition-all hover:shadow-sm cursor-pointer ${
        isClosed ? "bg-gray-50 border-gray-200 opacity-75" : "bg-white border-gray-100"
      }`}
      onClick={() => navigate(isDraft ? `/advocacy/${rec.id}` : `/advocacy/${rec.id}`)}
      data-testid={`rec-card-${rec.id}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-semibold text-sm text-gray-900">{rec.athlete_name}</span>
            <span className="text-gray-400">→</span>
            <span className="text-sm text-gray-700">{rec.school_name}</span>
            <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${badge.cls}`}>{badge.label}</span>
          </div>
          <div className="text-xs text-gray-500 space-y-0.5">
            {rec.sent_at && <p>Sent {timeAgo(rec.sent_at)} · "{rec.fit_summary}"</p>}
            {isDraft && <p>Started {timeAgo(rec.created_at)} · Fit: {rec.fit_summary || "In progress"}</p>}
            {rec.response_note && !isClosed && (
              <p className="text-gray-600 flex items-center gap-1"><MessageCircle className="w-3 h-3" />{rec.response_note}</p>
            )}
            {needsFollowUp && (
              <p className="text-amber-600 flex items-center gap-1 font-medium"><AlertCircle className="w-3 h-3" />Follow-up recommended</p>
            )}
            {rec.status === "warm_response" && rec.desired_next_step && (
              <p className="text-emerald-600 font-medium">Next: {rec.desired_next_step.replace(/_/g, " ")}</p>
            )}
            {isClosed && rec.closed_reason && (
              <p className="italic">{rec.closed_reason === "positive_outcome" ? "Positive outcome" : rec.closed_reason.replace(/_/g, " ")}</p>
            )}
          </div>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); navigate(`/advocacy/${rec.id}`); }}
          className="text-xs text-gray-400 hover:text-gray-700 flex items-center gap-0.5 shrink-0"
        >
          {isDraft ? "Continue" : "View"} <ChevronRight className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}

function AdvocacyHome() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({ needs_attention: [], drafts: [], recently_sent: [], closed: [], stats: {} });
  const [tab, setTab] = useState(searchParams.get("status") || "all");

  useEffect(() => {
    (async () => {
      try {
        const params = new URLSearchParams();
        if (tab !== "all") params.set("status", tab);
        const res = await axios.get(`${API}/advocacy/recommendations?${params}`);
        setData(res.data);
      } catch (err) {
        toast.error("Failed to load recommendations");
      } finally {
        setLoading(false);
      }
    })();
  }, [tab]);

  const tabs = [
    { id: "all", label: "All", count: data.stats.total },
    { id: "draft", label: "Drafts", count: data.stats.drafts },
    { id: "sent", label: "Sent", count: data.stats.sent },
    { id: "awaiting_reply", label: "Awaiting", count: data.stats.awaiting },
    { id: "responded", label: "Responded", count: data.stats.warm },
    { id: "closed", label: "Closed", count: data.stats.closed },
  ];

  const allSections = [
    { key: "needs_attention", label: "Needs Attention", items: data.needs_attention },
    { key: "drafts", label: "Drafts", items: data.drafts },
    { key: "recently_sent", label: "Recently Sent", items: data.recently_sent },
    { key: "closed", label: "Closed", items: data.closed },
  ];

  return (
    <div className="min-h-screen bg-slate-50" data-testid="advocacy-home-page">
      <Header selectedGradYear="all" setSelectedGradYear={() => {}} stats={null} />

      <main className="max-w-[1200px] mx-auto px-4 sm:px-6 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-lg font-semibold text-gray-900" data-testid="advocacy-title">Advocacy</h1>
            <p className="text-xs text-gray-500 mt-0.5">Coach-backed promotions & relationship memory</p>
          </div>
          <button
            onClick={() => navigate("/advocacy/new")}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium bg-slate-900 text-white rounded-md hover:bg-slate-800 transition-colors"
            data-testid="new-recommendation-btn"
          >
            <Plus className="w-3.5 h-3.5" /> New Recommendation
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5 mb-5 overflow-x-auto" data-testid="advocacy-tabs">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              data-testid={`adv-tab-${t.id}`}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all whitespace-nowrap ${
                tab === t.id ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {t.label} {t.count != null ? `(${t.count})` : ""}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-400" />
          </div>
        ) : (
          <div className="space-y-6">
            {allSections.map(({ key, label, items }) =>
              items && items.length > 0 ? (
                <section key={key}>
                  <h2 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2" data-testid={`section-${key}`}>{label}</h2>
                  <div className="space-y-2">
                    {items.map((rec) => <RecCard key={rec.id} rec={rec} />)}
                  </div>
                </section>
              ) : null
            )}
            {allSections.every(({ items }) => !items || items.length === 0) && (
              <p className="text-sm text-gray-400 text-center py-12">No recommendations found</p>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

export default AdvocacyHome;

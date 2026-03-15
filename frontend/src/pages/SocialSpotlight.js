import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import axios from "axios";
import { Play, Lock, Sparkles, RefreshCw, ChevronLeft, ChevronRight, TrendingUp, Eye, ExternalLink } from "lucide-react";
import UniversityLogo from "../components/UniversityLogo";
import { useSubscription } from "../lib/subscription";
import UpgradeModal from "../components/UpgradeModal";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

/* ── Decode HTML entities from YouTube API ── */
function decodeHtml(text) {
  if (!text) return "";
  const el = document.createElement("textarea");
  el.innerHTML = text;
  return el.value;
}

/* ── Relative time helper ── */
function timeAgo(iso) {
  if (!iso) return "";
  const diff = (Date.now() - new Date(iso)) / 1000;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

/* ── Check if published within last 7 days ── */
function isNewThisWeek(iso) {
  if (!iso) return false;
  return (Date.now() - new Date(iso)) / 1000 < 604800;
}

/* ── Filters ── */
const BEACH_FILTER = /\bbeach\b/i;
const VB_FILTER = /w\.?\s*volley|women'?s?\s*volley|wvb/i;

/* ── Format view count ── */
function formatViews(count) {
  if (!count) return "0 views";
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M views`;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K views`;
  return `${count.toLocaleString()} views`;
}

/* ── Video Card ── */
function VideoCard({ video }) {
  return (
    <a
      href={video.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group block rounded-xl overflow-hidden transition-all duration-200 hover:shadow-lg"
      style={{ backgroundColor: "var(--cm-card)", border: "1px solid var(--cm-border)" }}
      data-testid={`video-card-${video.video_id}`}
    >
      {/* Thumbnail */}
      <div className="relative aspect-video overflow-hidden">
        {video.thumbnail_url ? (
          <img
            src={video.thumbnail_url}
            alt={video.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center" style={{ backgroundColor: "var(--cm-surface)" }}>
            <Play className="w-8 h-8" style={{ color: "var(--cm-text-3)" }} />
          </div>
        )}
        {/* Play overlay on hover */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/30">
          <Play className="w-10 h-10 text-white fill-white" />
        </div>
        {/* New This Week badge */}
        {isNewThisWeek(video.published_at) && (
          <span className="absolute top-2 left-2 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500 text-white">
            NEW
          </span>
        )}
      </div>
      {/* Info */}
      <div className="p-3">
        <p className="text-sm font-semibold line-clamp-2 mb-1" style={{ color: "var(--cm-text)" }}>
          {decodeHtml(video.title)}
        </p>
        <div className="flex items-center justify-between">
          <span className="text-xs" style={{ color: "var(--cm-text-3)" }}>{video.university_name}</span>
          <span className="text-[10px]" style={{ color: "var(--cm-text-4)" }}>{timeAgo(video.published_at)}</span>
        </div>
      </div>
    </a>
  );
}

/* ── Trending Card (larger, featured) ── */
function TrendingCard({ video, rank }) {
  return (
    <a
      href={video.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group block rounded-xl overflow-hidden transition-all duration-200 hover:shadow-lg relative"
      style={{ backgroundColor: "var(--cm-card)", border: "1px solid var(--cm-border)" }}
      data-testid={`trending-card-${rank}`}
    >
      {/* Rank badge */}
      <div className="absolute top-2 left-2 z-10 w-7 h-7 rounded-full bg-black/70 flex items-center justify-center">
        <span className="text-white text-xs font-bold">{rank}</span>
      </div>
      {/* Thumbnail */}
      <div className="relative aspect-video overflow-hidden">
        {video.thumbnail_url ? (
          <img
            src={video.thumbnail_url}
            alt={decodeHtml(video.title)}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center" style={{ backgroundColor: "var(--cm-surface)" }}>
            <Play className="w-8 h-8" style={{ color: "var(--cm-text-3)" }} />
          </div>
        )}
        {/* Play overlay */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/30">
          <Play className="w-12 h-12 text-white fill-white" />
        </div>
        {/* View count badge */}
        {video.view_count > 0 && (
          <span className="absolute bottom-2 right-2 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-black/60 text-white flex items-center gap-1">
            <Eye className="w-3 h-3" />
            {formatViews(video.view_count)}
          </span>
        )}
        {/* New This Week badge */}
        {isNewThisWeek(video.published_at) && (
          <span className="absolute top-2 right-2 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500 text-white">
            NEW
          </span>
        )}
      </div>
      {/* Info */}
      <div className="p-3">
        <p className="text-sm font-semibold line-clamp-2 mb-1" style={{ color: "var(--cm-text)" }}>
          {decodeHtml(video.title)}
        </p>
        <div className="flex items-center justify-between">
          <span className="text-xs" style={{ color: "var(--cm-text-3)" }}>{video.university_name}</span>
          <span className="text-[10px]" style={{ color: "var(--cm-text-4)" }}>{timeAgo(video.published_at)}</span>
        </div>
      </div>
    </a>
  );
}

/* ── Trending Section ── */
function TrendingSection({ videos }) {
  if (!videos || videos.length === 0) return null;

  return (
    <div className="mb-6" data-testid="trending-section">
      <div className="flex items-center gap-2 mb-3">
        <TrendingUp className="w-4 h-4" style={{ color: "var(--cm-accent)" }} />
        <h2 className="text-sm font-bold" style={{ color: "var(--cm-text)" }}>Trending</h2>
        <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ backgroundColor: "var(--cm-surface)", color: "var(--cm-text-3)" }}>
          Most viewed
        </span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {videos.map((v, i) => (
          <TrendingCard key={v.video_id} video={v} rank={i + 1} />
        ))}
      </div>
    </div>
  );
}

/* ── Horizontal school filter bar ── */
function SchoolFilter({ schools, selected, onSelect, videoCounts }) {
  const scrollRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    checkScroll();
    const el = scrollRef.current;
    if (el) el.addEventListener("scroll", checkScroll, { passive: true });
    window.addEventListener("resize", checkScroll);
    return () => {
      if (el) el.removeEventListener("scroll", checkScroll);
      window.removeEventListener("resize", checkScroll);
    };
  }, [checkScroll, schools]);

  const scroll = (dir) => {
    const el = scrollRef.current;
    if (el) el.scrollBy({ left: dir * 240, behavior: "smooth" });
  };

  if (!schools.length) return null;

  return (
    <div className="relative mb-4" data-testid="school-filter-bar">
      {canScrollLeft && (
        <button
          onClick={() => scroll(-1)}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full flex items-center justify-center transition-all"
          style={{ background: "var(--cm-card)", border: "1px solid var(--cm-border)", boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}
          data-testid="filter-scroll-left"
        >
          <ChevronLeft className="w-4 h-4" style={{ color: "var(--cm-text-3)" }} />
        </button>
      )}
      {canScrollRight && (
        <button
          onClick={() => scroll(1)}
          className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full flex items-center justify-center transition-all"
          style={{ background: "var(--cm-card)", border: "1px solid var(--cm-border)", boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}
          data-testid="filter-scroll-right"
        >
          <ChevronRight className="w-4 h-4" style={{ color: "var(--cm-text-3)" }} />
        </button>
      )}

      <div ref={scrollRef} className="flex items-center gap-2 overflow-x-auto scrollbar-hide px-1 py-1">
        {/* All pill */}
        <button
          onClick={() => onSelect(null)}
          className="flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-200 flex-shrink-0"
          style={
            !selected
              ? { background: "var(--cm-text)", color: "var(--cm-bg)" }
              : { background: "var(--cm-surface)", color: "var(--cm-text-3)", border: "1px solid var(--cm-border)" }
          }
          data-testid="filter-all-schools"
        >
          All Schools
        </button>

        {schools.map((s) => {
          const isActive = selected === s.university_name;
          const count = videoCounts[s.university_name] || 0;
          return (
            <button
              key={s.program_id}
              onClick={() => onSelect(isActive ? null : s.university_name)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all duration-200 flex-shrink-0"
              style={
                isActive
                  ? { background: "var(--cm-text)", color: "var(--cm-bg)" }
                  : { background: "var(--cm-surface)", color: "var(--cm-text-3)", border: "1px solid var(--cm-border)" }
              }
              data-testid={`school-filter-${s.program_id}`}
            >
              {s.university_name?.replace(/\s*University\s*/gi, " U. ").trim()}
              {count > 0 && (
                <span className="text-[10px] opacity-60">{count}</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ── Locked / Upsell overlay ── */
function LockedOverlay({ onUpgrade }) {
  return (
    <div className="relative rounded-xl overflow-hidden" data-testid="locked-overlay">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 opacity-30 blur-sm pointer-events-none">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="aspect-video rounded-lg" style={{ backgroundColor: "var(--cm-surface)" }} />
        ))}
      </div>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6">
        <Lock className="w-10 h-10 mb-3" style={{ color: "var(--cm-accent)" }} />
        <h3 className="text-lg font-bold mb-2" style={{ color: "var(--cm-text)" }}>Live Feed</h3>
        <p className="text-sm mb-4 max-w-sm" style={{ color: "var(--cm-text-3)" }}>
          See the latest volleyball content from schools in your pipeline. Camp alerts, new commits, and more.
        </p>
        <button
          onClick={onUpgrade}
          className="px-5 py-2.5 rounded-full text-sm font-semibold text-white transition-all hover:opacity-90"
          style={{ backgroundColor: "var(--cm-accent)" }}
          data-testid="upgrade-spotlight-btn"
        >
          Upgrade to unlock
        </button>
      </div>
    </div>
  );
}

/* ── Twitter Quick Links Section ── */
function TwitterSection({ schools }) {
  if (!schools || schools.length === 0) return null;

  return (
    <div data-testid="twitter-section">
      <div className="flex items-center gap-2 mb-3">
        <h2 className="text-sm font-bold" style={{ color: "var(--cm-text)" }}>Follow on X</h2>
        <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ backgroundColor: "var(--cm-surface)", color: "var(--cm-text-3)" }}>
          {schools.length} school{schools.length !== 1 ? "s" : ""}
        </span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {schools.map((s) => (
          <a
            key={s.program_id}
            href={s.twitter}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 p-3 rounded-lg transition-all hover:shadow-md"
            style={{ backgroundColor: "var(--cm-card)", border: "1px solid var(--cm-border)" }}
            data-testid={`twitter-link-${s.program_id}`}
          >
            <UniversityLogo domain={s.domain} name={s.university_name} logoUrl={s.logo_url} size={32} />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold truncate" style={{ color: "var(--cm-text)" }}>{s.university_name}</p>
              <p className="text-[10px] truncate" style={{ color: "var(--cm-text-3)" }}>@{s.twitter.split("/").pop()}</p>
            </div>
            <ExternalLink className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "var(--cm-text-4)" }} />
          </a>
        ))}
      </div>
    </div>
  );
}

/* ── Skeleton loader ── */
function FeedSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div key={i} className="rounded-xl overflow-hidden animate-pulse" style={{ backgroundColor: "var(--cm-card)", border: "1px solid var(--cm-border)" }}>
          <div className="aspect-video" style={{ backgroundColor: "var(--cm-surface)" }} />
          <div className="p-3 space-y-2">
            <div className="h-4 rounded w-3/4" style={{ backgroundColor: "var(--cm-surface)" }} />
            <div className="h-3 rounded w-1/2" style={{ backgroundColor: "var(--cm-surface)" }} />
          </div>
        </div>
      ))}
    </div>
  );
}

/* ══════════════════════════════════════════
   Main Page
   ══════════════════════════════════════════ */
export default function SocialSpotlight() {
  const [programs, setPrograms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [feedVideos, setFeedVideos] = useState([]);
  const [trendingVideos, setTrendingVideos] = useState([]);
  const [twitterSchools, setTwitterSchools] = useState([]);
  const [feedLoading, setFeedLoading] = useState(false);
  const [selectedName, setSelectedName] = useState(null);
  const [vbOnly, setVbOnly] = useState(false);
  const [activeTab, setActiveTab] = useState("youtube");
  const [showUpgrade, setShowUpgrade] = useState(false);
  const { subscription } = useSubscription();
  const tier = subscription?.tier || "basic";
  const isLocked = !tier || tier === "basic";

  /* Load pipeline schools */
  useEffect(() => {
    axios.get(`${API}/programs`)
      .then((res) => {
        const data = (Array.isArray(res.data) ? res.data : []).filter(
          (p) => p.board_group !== "archived"
        );
        setPrograms(data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  /* Load YouTube feed */
  const fetchFeed = useCallback(async () => {
    setFeedLoading(true);
    try {
      const res = await axios.get(`${API}/social-spotlight/feed`);
      setFeedVideos(res.data.videos || []);
      setTrendingVideos(res.data.trending || []);
    } catch {
      setFeedVideos([]);
      setTrendingVideos([]);
    } finally {
      setFeedLoading(false);
    }
  }, []);

  useEffect(() => {
    if (tier && tier !== "basic") {
      fetchFeed();
      axios.get(`${API}/social-spotlight/social-links`)
        .then((res) => setTwitterSchools(res.data.schools || []))
        .catch(() => {});
    }
  }, [tier, fetchFeed]);

  const handleRefresh = useCallback(async () => {
    if (tier !== "basic") {
      await axios.post(`${API}/social-spotlight/feed/refresh`).catch(() => {});
      fetchFeed();
    }
  }, [tier, fetchFeed]);

  /* Filtered videos — exclude trending to avoid duplicates */
  const trendingIds = useMemo(() => new Set(trendingVideos.map(v => v.video_id)), [trendingVideos]);
  const displayed = useMemo(() => {
    let list = feedVideos.filter((v) => !BEACH_FILTER.test(v.title));
    if (!selectedName) list = list.filter((v) => !trendingIds.has(v.video_id));
    if (selectedName) list = list.filter((v) => v.university_name === selectedName);
    if (vbOnly) list = list.filter((v) => VB_FILTER.test(v.title) || VB_FILTER.test(v.description || ""));
    return list;
  }, [feedVideos, selectedName, vbOnly, trendingIds]);

  /* Video counts per school */
  const videoCounts = useMemo(() => {
    const counts = {};
    feedVideos
      .filter((v) => !BEACH_FILTER.test(v.title))
      .forEach((v) => {
        counts[v.university_name] = (counts[v.university_name] || 0) + 1;
      });
    return counts;
  }, [feedVideos]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6" data-testid="social-spotlight-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <h1 className="text-xl font-bold" style={{ color: "var(--cm-text)" }}>Social Spotlight</h1>
          <p className="text-xs mt-0.5" style={{ color: "var(--cm-text-3)" }}>Latest volleyball content from your pipeline</p>
        </div>
        <div className="flex items-center gap-2">
          {!isLocked && activeTab === "youtube" && feedVideos.length > 0 && (
            <button
              onClick={() => setVbOnly((v) => !v)}
              data-testid="vb-only-toggle"
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold transition-all duration-200"
              style={
                vbOnly
                  ? { background: "#1a8a80", color: "white" }
                  : { background: "var(--cm-surface)", color: "var(--cm-text-3)", border: "1px solid var(--cm-border)" }
              }
            >
              <Sparkles className="w-3.5 h-3.5" />
              Women's Only
            </button>
          )}
          {!isLocked && activeTab === "youtube" && (
            <button
              onClick={handleRefresh}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold transition-all duration-200"
              style={{ background: "var(--cm-surface)", color: "var(--cm-text-3)", border: "1px solid var(--cm-border)" }}
              data-testid="refresh-feed-btn"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Refresh
            </button>
          )}
        </div>
      </div>

      {/* Tab switcher */}
      {!isLocked && (
        <div className="flex items-center gap-1 p-1 rounded-lg mb-4" style={{ backgroundColor: "var(--cm-surface)" }} data-testid="tab-switcher">
          <button
            onClick={() => setActiveTab("youtube")}
            data-testid="tab-youtube"
            className="flex items-center gap-2 px-4 py-2 rounded-md text-xs font-semibold transition-all duration-200"
            style={
              activeTab === "youtube"
                ? { background: "var(--cm-bg)", color: "var(--cm-text)", boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }
                : { background: "transparent", color: "var(--cm-text-3)" }
            }
          >
            <Play className="w-3.5 h-3.5" />
            YouTube
          </button>
          <button
            onClick={() => setActiveTab("twitter")}
            data-testid="tab-twitter"
            className="flex items-center gap-2 px-4 py-2 rounded-md text-xs font-semibold transition-all duration-200"
            style={
              activeTab === "twitter"
                ? { background: "var(--cm-bg)", color: "var(--cm-text)", boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }
                : { background: "transparent", color: "var(--cm-text-3)" }
            }
          >
            <ExternalLink className="w-3.5 h-3.5" />
            X / Twitter
            {twitterSchools.length > 0 && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-teal-500/20 text-teal-600">
                {twitterSchools.length}
              </span>
            )}
          </button>
        </div>
      )}

      {/* YouTube tab */}
      {activeTab === "youtube" && (
        <>
          {/* School filter pills */}
          {!isLocked && programs.length > 0 && (
            <SchoolFilter schools={programs} selected={selectedName} onSelect={setSelectedName} videoCounts={videoCounts} />
          )}

          {/* Feed content */}
          {isLocked ? (
            <LockedOverlay onUpgrade={() => setShowUpgrade(true)} />
          ) : feedLoading ? (
            <FeedSkeleton />
          ) : displayed.length === 0 ? (
            <div className="text-center py-16" data-testid="empty-feed">
              <p className="text-sm font-semibold mb-1" style={{ color: "var(--cm-text)" }}>
                {selectedName
                  ? `No videos found for ${selectedName}`
                  : "No videos yet"}
              </p>
              <p className="text-xs" style={{ color: "var(--cm-text-3)" }}>
                {selectedName
                  ? "Try selecting a different school or remove the filter."
                  : "Add schools to your pipeline or try refreshing."}
              </p>
              {(selectedName || vbOnly) && (
                <button
                  onClick={() => { setSelectedName(null); setVbOnly(false); }}
                  className="mt-4 text-xs font-semibold px-4 py-2 rounded-full transition-all"
                  style={{ background: "var(--cm-surface)", color: "var(--cm-text-3)", border: "1px solid var(--cm-border)" }}
                  data-testid="clear-filters-btn"
                >
                  Clear filters
                </button>
              )}
            </div>
          ) : (
            <>
              {/* Trending section */}
              {!selectedName && trendingVideos.length > 0 && (
                <TrendingSection videos={trendingVideos} />
              )}

              {/* Result count */}
              <div className="flex items-center gap-2 mb-3" data-testid="video-count">
                <span className="text-xs font-medium" style={{ color: "var(--cm-text-3)" }}>
                  {displayed.length} video{displayed.length !== 1 ? "s" : ""}
                  {selectedName && ` from ${selectedName}`}
                </span>
              </div>

              {/* Video grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {displayed.map((v) => (
                  <VideoCard key={v.video_id} video={v} />
                ))}
              </div>
            </>
          )}
        </>
      )}

      {/* Twitter tab */}
      {activeTab === "twitter" && (
        <div className="mt-2">
          {isLocked ? (
            <LockedOverlay onUpgrade={() => setShowUpgrade(true)} />
          ) : twitterSchools.length === 0 ? (
            <div className="text-center py-16" data-testid="empty-twitter">
              <p className="text-sm font-semibold mb-1" style={{ color: "var(--cm-text)" }}>
                No Twitter/X accounts found
              </p>
              <p className="text-xs" style={{ color: "var(--cm-text-3)" }}>
                Schools in your pipeline don't have Twitter profiles linked yet.
              </p>
            </div>
          ) : (
            <TwitterSection schools={twitterSchools} />
          )}
        </div>
      )}

      {/* Upgrade modal */}
      <UpgradeModal
        isOpen={showUpgrade}
        onClose={() => setShowUpgrade(false)}
        message="Unlock the Live Feed to see real posts from your target schools."
        currentTier={tier}
      />
    </div>
  );
}

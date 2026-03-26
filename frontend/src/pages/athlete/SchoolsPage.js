import { useState, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import {
  Search, Plus, MapPin, Check, LayoutGrid, List, Star,
  Target, MapPinned, GraduationCap, X, Filter, ExternalLink,
  Loader2, RotateCcw, Sparkles, ArrowRight, Database, Lock, Zap,
  RefreshCw, AlertTriangle, BarChart3, ArrowLeft, ChevronRight
} from "lucide-react";
import UpgradeModal from "../../components/UpgradeModal";
import MatchDetailDrawer from "../../components/MatchDetailDrawer";
import CompareDrawer from "../../components/CompareDrawer";
import { useSubscription } from "../../lib/subscription";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const DIVISIONS = ["D1", "D2", "D3", "NAIA"];
const REGIONS = ["Atlantic", "Central", "East", "Great Lakes", "Midwest", "Northeast", "South", "South Central", "Southeast", "West"];

const SMART_BUCKETS = [
  { id: "all", label: "All Schools", icon: LayoutGrid },
  { id: "dream", label: "Dream Schools (D1)", icon: Star, filter: { division: "D1" } },
  { id: "strong", label: "Strong Match (80%+)", icon: Target, filter: { minScore: 80 } },
  { id: "close", label: "Close to Home", icon: MapPinned },
  { id: "academics", label: "Strong Academics", icon: GraduationCap },
];

/* Fit reason copy map */
const FIT_COPY = {
  "Strong Academic Fit": "Strong academic and athletic fit",
  "Good Academic Fit": "Good academic alignment for your goals",
  "Athletic Fit": "Athletic level matches your profile",
  "Location Match": "Good regional match with realistic pathway",
  "Division Fit": "Division level aligned with your ability",
  "Reach": "Competitive reach opportunity",
  "Slight Reach": "Slight stretch with upside potential",
  "Conference Match": "Conference style suits your game",
};

/* ── Slide-in Filter Panel ── */
function FilterPanel({ open, onClose, divisions, regions, conferences, filterDivision, filterRegion, filterConference, onDivision, onRegion, onConference, onApply, onClear }) {
  const [showAllConf, setShowAllConf] = useState(false);
  const visibleConf = showAllConf ? conferences : conferences.slice(0, 8);
  const activeCount = (filterDivision ? 1 : 0) + (filterRegion ? 1 : 0) + (filterConference ? 1 : 0);

  return (
    <>
      {open && <div className="fixed inset-0 bg-black/10 z-[199] backdrop-blur-sm" onClick={onClose} data-testid="filter-overlay" />}
      <div className={`fixed top-0 right-0 w-[380px] max-w-[90vw] h-full z-[200] transition-transform duration-300 ease-out overflow-y-auto bg-white border-l border-gray-200 ${open ? "translate-x-0" : "translate-x-full"}`}
        style={{ boxShadow: open ? "-8px 0 30px rgba(0,0,0,0.08)" : "none" }}
        data-testid="filter-panel">
        <div className="p-6">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-base font-bold text-gray-900">Filters</h3>
            <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center bg-gray-100 hover:bg-gray-200 transition-colors" data-testid="filter-close">
              <X className="w-4 h-4 text-gray-500" />
            </button>
          </div>

          <div className="mb-6">
            <div className="text-[11px] font-semibold tracking-wide uppercase mb-3 text-gray-400">Division</div>
            <div className="flex flex-wrap gap-2">
              {divisions.map(d => (
                <button key={d} onClick={() => onDivision(d)} data-testid={`filter-div-${d.toLowerCase()}`}
                  className={`px-4 py-2 rounded-xl text-[13px] font-semibold transition-all border ${filterDivision === d ? "text-gray-900 bg-gray-100 border-gray-300" : "text-gray-500 bg-white border-gray-200 hover:border-gray-300"}`}>
                  {d}
                </button>
              ))}
            </div>
          </div>

          <div className="mb-6">
            <div className="text-[11px] font-semibold tracking-wide uppercase mb-3 text-gray-400">Region</div>
            <div className="flex flex-wrap gap-2">
              {regions.map(r => (
                <button key={r} onClick={() => onRegion(r)} data-testid={`filter-reg-${r.toLowerCase().replace(/\s+/g, "-")}`}
                  className={`px-4 py-2 rounded-xl text-[13px] font-semibold transition-all border ${filterRegion === r ? "text-gray-900 bg-gray-100 border-gray-300" : "text-gray-500 bg-white border-gray-200 hover:border-gray-300"}`}>
                  {r}
                </button>
              ))}
            </div>
          </div>

          {conferences.length > 0 && (
            <div className="mb-6">
              <div className="text-[11px] font-semibold tracking-wide uppercase mb-3 text-gray-400">Conference</div>
              <div className="flex flex-wrap gap-2">
                {visibleConf.map(c => (
                  <button key={c} onClick={() => onConference(c)} data-testid={`filter-conf-${c.toLowerCase().replace(/\s+/g, "-")}`}
                    className={`px-4 py-2 rounded-xl text-[13px] font-semibold transition-all border ${filterConference === c ? "text-gray-900 bg-gray-100 border-gray-300" : "text-gray-500 bg-white border-gray-200 hover:border-gray-300"}`}>
                    {c}
                  </button>
                ))}
                {conferences.length > 8 && (
                  <button onClick={() => setShowAllConf(!showAllConf)}
                    className="px-4 py-2 rounded-xl text-[13px] font-semibold border text-gray-400 bg-gray-50 border-gray-200">
                    {showAllConf ? "Show less" : `+${conferences.length - 8} more`}
                  </button>
                )}
              </div>
            </div>
          )}

          <button onClick={onApply} data-testid="filter-apply-btn"
            className="w-full py-3.5 rounded-2xl text-[14px] font-bold text-white mt-4 transition-all hover:opacity-90"
            style={{ background: "#1e293b" }}>
            Apply Filters {activeCount > 0 && `(${activeCount})`}
          </button>
          <button onClick={onClear} data-testid="filter-clear-btn"
            className="w-full py-3 rounded-2xl text-[13px] font-semibold mt-2 text-gray-400 hover:text-gray-600 transition-colors">
            Clear All
          </button>
        </div>
      </div>
    </>
  );
}

/* ── University Logo ── */
function UniversityLogo({ domain, name, logoUrl, size = 40 }) {
  const [imgError, setImgError] = useState(false);
  const initials = (name || "").split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
  if (logoUrl && !imgError) {
    return <img src={logoUrl} alt={name} className="rounded-2xl object-contain bg-gray-50" style={{ width: size, height: size }} onError={() => setImgError(true)} />;
  }
  return (
    <div className="rounded-2xl flex items-center justify-center text-white font-bold" style={{ width: size, height: size, background: "linear-gradient(135deg, #64748b, #94a3b8)", fontSize: size * 0.32 }}>
      {initials || "?"}
    </div>
  );
}

/* ── Featured Match Card (large, editorial) ── */
function FeaturedCard({ school, adding, addToBoard, boardSchools, navigate, onDetail }) {
  const isOnBoard = boardSchools.has(school.university_name);
  const chips = school.chips || [];
  const topReason = chips[0] ? (FIT_COPY[chips[0]] || chips[0]) : null;

  return (
    <div className="bg-white rounded-3xl border border-gray-100 p-6 transition-all duration-300 hover:shadow-lg hover:border-gray-200 group cursor-pointer"
      style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
      onClick={() => onDetail(school)}
      data-testid={`featured-card-${school.university_name.replace(/\s+/g, "-").toLowerCase()}`}>
      <div className="flex items-start gap-4 mb-4">
        {school.logo_url ? (
          <img src={school.logo_url} alt="" className="w-14 h-14 rounded-2xl object-contain flex-shrink-0 bg-gray-50 border border-gray-100" />
        ) : (
          <UniversityLogo name={school.university_name} size={56} />
        )}
        <div className="min-w-0 flex-1">
          <h3 className="text-[15px] font-bold text-gray-900 truncate group-hover:text-gray-700 transition-colors" data-testid="featured-name">
            {school.university_name}
          </h3>
          <p className="text-[12px] text-gray-400 mt-0.5">
            {school.division}{school.conference ? ` \u00B7 ${school.conference}` : ""}{school.state ? ` \u00B7 ${school.state}` : ""}
          </p>
        </div>
        <div className="w-14 h-14 rounded-2xl flex flex-col items-center justify-center flex-shrink-0 bg-white"
          style={{
            border: "1.5px solid #e5e7eb",
          }}>
          <span className="text-lg font-extrabold text-gray-900">
            {school.match_score}
          </span>
          <span className="text-[8px] font-semibold text-teal-600 -mt-0.5">MATCH</span>
        </div>
      </div>

      {topReason && (
        <p className="text-[13px] text-gray-500 leading-relaxed mb-4">{topReason}</p>
      )}

      {chips.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-5">
          {chips.slice(0, 3).map((chip, i) => (
            <span key={i} className="text-[10px] font-medium px-2.5 py-1 rounded-lg bg-gray-50 text-gray-500 border border-gray-100">
              {chip}
            </span>
          ))}
        </div>
      )}

      {school.ai_summary && (
        <p className="text-[12px] text-gray-400 leading-relaxed mb-4 line-clamp-2">{school.ai_summary}</p>
      )}

      <div className="flex items-center gap-2 pt-3 border-t border-gray-100" onClick={e => e.stopPropagation()}>
        {school.in_pipeline || isOnBoard ? (
          <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-emerald-600">
            <Check className="w-3.5 h-3.5" /> In Pipeline
          </span>
        ) : (
          <button onClick={() => addToBoard({ university_name: school.university_name })}
            disabled={adding[school.university_name]}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-[12px] font-semibold bg-white text-teal-700 border border-teal-200 hover:bg-teal-50/50 transition-all"
            data-testid={`add-featured-${school.university_name.replace(/\s+/g, "-").toLowerCase()}`}>
            {adding[school.university_name] ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
            Add to Pipeline
          </button>
        )}
        <button onClick={() => school.domain && navigate(`/schools/${school.domain}`)}
          className="ml-auto inline-flex items-center gap-1 text-[12px] font-medium text-gray-400 hover:text-gray-700 transition-colors">
          View Details <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

/* ── Compact School Card (directory) ── */
function SchoolCard({ uni, adding, addToBoard, boardSchools, navigate }) {
  const isOnBoard = boardSchools.has(uni.university_name);
  const sc = uni.scorecard || {};
  const topReason = uni.match_reasons?.[0] ? (FIT_COPY[uni.match_reasons[0]] || uni.match_reasons[0]) : null;

  return (
    <div className="bg-white rounded-2xl p-5 cursor-pointer transition-all duration-200 hover:shadow-md hover:border-gray-200 group border border-gray-100"
      style={{ boxShadow: "0 1px 2px rgba(0,0,0,0.03)" }}
      onClick={() => uni.domain && navigate(`/schools/${uni.domain}`)}
      data-testid={`school-card-${(uni.domain || "").replace(/\./g, "-")}`}>
      <div className="flex items-center gap-3.5 mb-3">
        <UniversityLogo domain={uni.domain} name={uni.university_name} logoUrl={uni.logo_url} size={40} />
        <div className="flex-1 min-w-0">
          <div className="text-[14px] font-bold truncate text-gray-900 group-hover:text-gray-700 transition-colors">{uni.university_name}</div>
          <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-gray-400">
            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-gray-100 text-gray-600">{uni.division}</span>
            {uni.region && <span>{uni.region}</span>}
            {uni.conference && <span>{`\u00B7 ${uni.conference}`}</span>}
          </div>
        </div>
        {uni.match_score > 0 && (
          <span className="text-xl font-extrabold text-gray-900 flex-shrink-0" data-testid="card-match-score">{uni.match_score}<span className="text-[11px] font-semibold text-teal-600">%</span></span>
        )}
      </div>

      {topReason && (
        <p className="text-[12px] text-gray-400 leading-relaxed mb-3 line-clamp-1">{topReason}</p>
      )}

      {uni.match_reasons?.length > 0 && !topReason && (
        <div className="flex flex-wrap gap-1 mb-3">
          {uni.match_reasons.slice(0, 2).map(r => (
            <span key={r} className="text-[10px] px-2 py-0.5 rounded-lg font-medium bg-gray-50 text-gray-500 border border-gray-100">{r}</span>
          ))}
        </div>
      )}

      {sc.admission_rate != null && (
        <div className="flex gap-3 mb-3 text-[10px] text-gray-400">
          <span>{(sc.admission_rate * 100).toFixed(0)}% accept</span>
          {sc.student_size && <span>{Number(sc.student_size).toLocaleString()} students</span>}
          {sc.sat_avg && <span>SAT {sc.sat_avg}</span>}
        </div>
      )}

      <div className="flex gap-2 pt-3 border-t border-gray-50" onClick={e => e.stopPropagation()}>
        <button onClick={() => !isOnBoard && addToBoard(uni)} disabled={adding[uni.university_name] || isOnBoard}
          data-testid={`add-board-${(uni.domain || "").replace(/\./g, "-")}`}
          className={`flex-1 py-2.5 rounded-xl text-[12px] font-semibold text-center transition-all ${isOnBoard ? "bg-white text-emerald-600 border border-emerald-200" : "bg-white text-teal-700 border border-teal-200 hover:bg-teal-50/50"}`}>
          {isOnBoard ? <><Check className="w-3.5 h-3.5 inline mr-1" />In Pipeline</> : adding[uni.university_name] ? "Adding..." : <><Plus className="w-3.5 h-3.5 inline mr-1" />Add</>}
        </button>
        <button onClick={() => uni.domain && navigate(`/schools/${uni.domain}`)}
          data-testid={`details-${(uni.domain || "").replace(/\./g, "-")}`}
          className="py-2.5 px-4 rounded-xl text-[12px] font-semibold transition-all flex items-center gap-1 bg-gray-50 text-gray-500 hover:bg-gray-100 border border-gray-100">
          Details <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

export default function SchoolsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const fromOnboarding = searchParams.get("from") === "onboarding";

  const [universities, setUniversities] = useState([]);
  const [totalUniversities, setTotalUniversities] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [suggestions, setSuggestions] = useState([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(true);
  const [boardSchools, setBoardSchools] = useState(new Set());
  const [conferences, setConferences] = useState([]);
  const [regions, setRegions] = useState(REGIONS);

  const [search, setSearch] = useState("");
  const [filterDivision, setFilterDivision] = useState("");
  const [filterRegion, setFilterRegion] = useState("");
  const [filterConference, setFilterConference] = useState("");
  const [filterState, setFilterState] = useState("");
  const [activeBucket, setActiveBucket] = useState("all");

  const [adding, setAdding] = useState({});
  const [viewMode, setViewMode] = useState("grid");
  const [page, setPage] = useState(1);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [upgradeMessage, setUpgradeMessage] = useState("");
  const { subscription, refresh: refreshSub } = useSubscription();

  const [smartMatches, setSmartMatches] = useState([]);
  const [smartLoading, setSmartLoading] = useState(true);
  const [smartGated, setSmartGated] = useState(false);
  const [smartGatedTotal, setSmartGatedTotal] = useState(0);
  const [drawerSchool, setDrawerSchool] = useState(null);
  const [lastRefreshed, setLastRefreshed] = useState(null);
  const [profileChanged, setProfileChanged] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [compareSelected, setCompareSelected] = useState([]);
  const [compareOpen, setCompareOpen] = useState(false);

  const token = localStorage.getItem("token");
  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  useEffect(() => {
    axios.get(`${API}/knowledge-base/filters`, { headers }).then(res => {
      if (res.data?.conferences) setConferences(res.data.conferences);
      if (res.data?.regions) setRegions(res.data.regions);
    }).catch(() => {});
    axios.get(`${API}/athlete/programs`, { headers }).then(res => {
      setBoardSchools(new Set((res.data || []).map(p => p.university_name)));
    }).catch(() => {});
    axios.get(`${API}/suggested-schools`, { headers }).then(res => {
      setSuggestions(res.data?.suggestions || []);
    }).catch(() => {}).finally(() => setSuggestionsLoading(false));
    axios.get(`${API}/smart-match/recommendations`, { headers }).then(res => {
      setSmartMatches(res.data?.recommendations || []);
      setSmartGated(res.data?.gated || false);
      setSmartGatedTotal(res.data?.gated_total || 0);
      setLastRefreshed(res.data?.last_refreshed || null);
      setProfileChanged(res.data?.profile_changed_since_last_run || false);
    }).catch(() => {}).finally(() => setSmartLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const refreshMatches = async () => {
    setRefreshing(true);
    try {
      const res = await axios.get(`${API}/smart-match/recommendations`, { headers });
      setSmartMatches(res.data?.recommendations || []);
      setSmartGated(res.data?.gated || false);
      setSmartGatedTotal(res.data?.gated_total || 0);
      setLastRefreshed(res.data?.last_refreshed || null);
      setProfileChanged(false);
      setCompareSelected([]);
      toast.success("Recommendations refreshed");
    } catch {
      toast.error("Failed to refresh recommendations");
    } finally {
      setRefreshing(false);
    }
  };

  const toggleCompare = (school) => {
    setCompareSelected(prev => {
      const exists = prev.find(s => s.university_name === school.university_name);
      if (exists) return prev.filter(s => s.university_name !== school.university_name);
      if (prev.length >= 3) { toast.error("Compare up to 3 schools"); return prev; }
      return [...prev, school];
    });
  };

  const fetchUniversities = useCallback(async () => {
    try {
      const params = { page, limit: 50, fields: "list" };
      if (search) params.search = search;
      if (filterRegion) params.region = filterRegion;
      if (filterDivision) params.division = filterDivision;
      if (filterConference) params.conference = filterConference;
      if (filterState) params.state = filterState;
      const res = await axios.get(`${API}/knowledge-base`, { params, headers });
      const data = res.data;
      if (data?.universities) {
        setUniversities(data.universities);
        setTotalUniversities(data.total || data.universities.length);
        setTotalPages(data.pages || 1);
      }
    } catch {
      toast.error("Failed to load knowledge base");
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, filterRegion, filterDivision, filterConference, filterState, page]);

  useEffect(() => { fetchUniversities(); }, [fetchUniversities]);

  const addToBoard = async (uni) => {
    setAdding(prev => ({ ...prev, [uni.university_name]: true }));
    try {
      await axios.post(`${API}/knowledge-base/add-to-board`, { university_name: uni.university_name }, { headers });
      toast.success(`${uni.university_name} added to your board`);
      setSuggestions(prev => prev.filter(s => s.university_name !== uni.university_name));
      setBoardSchools(prev => new Set([...prev, uni.university_name]));
      refreshSub();
      if (fromOnboarding) navigate("/pipeline?congrats=true");
    } catch (err) {
      const detail = err.response?.data?.detail;
      if (detail?.type === "subscription_limit" || err.response?.status === 403) {
        const msg = typeof detail === "object" ? detail.message : "You've reached your school limit. Upgrade to add more.";
        setUpgradeMessage(msg);
        setShowUpgrade(true);
      } else {
        toast.error(typeof detail === "string" ? detail : "Failed to add");
      }
    } finally {
      setAdding(prev => ({ ...prev, [uni.university_name]: false }));
    }
  };

  const handleBucketClick = (bucket) => {
    setActiveBucket(bucket.id);
    setFilterState("");
    if (bucket.id === "all") { setFilterDivision(""); setFilterRegion(""); setFilterConference(""); }
    else if (bucket.id === "close") { setFilterDivision(""); setFilterRegion(""); setFilterConference(""); }
    else if (bucket.filter?.division) { setFilterDivision(bucket.filter.division); setFilterRegion(""); setFilterConference(""); }
    else { setFilterDivision(""); setFilterRegion(""); setFilterConference(""); }
    setPage(1);
  };

  const toggleDiv = d => { setFilterDivision(prev => prev === d ? "" : d); setActiveBucket("all"); setFilterState(""); setPage(1); };
  const toggleReg = r => { setFilterRegion(prev => prev === r ? "" : r); setActiveBucket("all"); setFilterState(""); setPage(1); };
  const toggleConf = c => { setFilterConference(prev => prev === c ? "" : c); setActiveBucket("all"); setFilterState(""); setPage(1); };
  const resetFilters = () => { setFilterDivision(""); setFilterRegion(""); setFilterConference(""); setFilterState(""); setSearch(""); setActiveBucket("all"); setPage(1); };

  const activeFilterCount = (filterDivision ? 1 : 0) + (filterRegion ? 1 : 0) + (filterConference ? 1 : 0) + (filterState ? 1 : 0);

  const suggestionMap = {};
  suggestions.forEach(s => { suggestionMap[s.university_name] = s; });
  const top5Names = new Set(suggestions.slice(0, 5).map(s => s.university_name));

  let filtered = [...universities].sort((a, b) => {
    const aTop5 = top5Names.has(a.university_name);
    const bTop5 = top5Names.has(b.university_name);
    if (aTop5 && !bTop5) return -1;
    if (!aTop5 && bTop5) return 1;
    if (aTop5 && bTop5) return (suggestionMap[b.university_name]?.match_score || 0) - (suggestionMap[a.university_name]?.match_score || 0);
    return a.university_name.localeCompare(b.university_name);
  });

  if (activeBucket === "dream") filtered = filtered.filter(u => u.division === "D1");
  else if (activeBucket === "strong") filtered = filtered.filter(u => (suggestionMap[u.university_name]?.match_score || 0) >= 80);

  const topMatch = suggestions[0] || null;
  if (topMatch) filtered = filtered.filter(u => u.university_name !== topMatch.university_name);

  const enriched = filtered.map(u => ({
    ...u,
    match_score: top5Names.has(u.university_name) ? (suggestionMap[u.university_name]?.match_score || null) : null,
    match_reasons: top5Names.has(u.university_name) ? (suggestionMap[u.university_name]?.match_reasons || []) : [],
  }));

  const bucketCounts = {
    all: totalUniversities,
    dream: universities.filter(u => u.division === "D1").length,
    strong: Object.values(suggestionMap).filter(s => s.match_score >= 80).length,
    academics: Object.values(suggestionMap).filter(s => (s.match_reasons || []).includes("Academics")).length,
  };

  const strongMatchCount = Object.values(suggestionMap).filter(s => s.match_score >= 70).length;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32" data-testid="kb-loading">
        <Loader2 className="w-8 h-8 text-gray-400 animate-spin mb-4" />
        <p className="text-sm text-gray-400">Finding schools for you...</p>
      </div>
    );
  }

  return (
    <div data-testid="knowledge-base">

      {/* ═══ PAGE HERO ═══ */}
      <div className="-mx-2 sm:-mx-6 -mt-4 sm:-mt-6 mb-8 bg-white" style={{ borderBottom: "1px solid rgba(0,0,0,0.06)" }} data-testid="schools-hero">
        <div className="px-4 sm:px-6 py-8 sm:py-10" style={{ maxWidth: 1280, margin: "0 auto" }}>
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight" data-testid="schools-hero-title">
                Find Schools
              </h1>
              <p className="text-[14px] sm:text-[15px] text-gray-400 mt-2 leading-relaxed max-w-lg">
                Discover programs that fit your level, goals, and recruiting journey.
              </p>
            </div>
            <div className="flex items-center gap-5 sm:gap-6">
              <div className="text-center">
                <div className="text-xl sm:text-2xl font-extrabold text-gray-900">{totalUniversities.toLocaleString()}</div>
                <div className="text-[10px] sm:text-[11px] text-gray-400 font-medium">Schools</div>
              </div>
              <div className="w-px h-8 bg-gray-200" />
              <div className="text-center">
                <div className="text-xl sm:text-2xl font-extrabold text-teal-600">{strongMatchCount}</div>
                <div className="text-[10px] sm:text-[11px] text-gray-400 font-medium">Strong Matches</div>
              </div>
              <div className="w-px h-8 bg-gray-200" />
              <div className="text-center">
                <div className="text-xl sm:text-2xl font-extrabold text-amber-500">{smartMatches.length}</div>
                <div className="text-[10px] sm:text-[11px] text-gray-400 font-medium">Recommended</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1280, margin: "0 auto" }}>

        {/* ═══ RECOMMENDED FOR YOU ═══ */}
        {!smartLoading && smartMatches.length > 0 && (
          <div className="mb-10" data-testid="smart-match-section">
            {profileChanged && (
              <div className="mb-4 flex items-center gap-2.5 px-5 py-3 rounded-2xl border border-amber-200 bg-amber-50"
                data-testid="profile-changed-banner">
                <AlertTriangle className="w-4 h-4 flex-shrink-0 text-amber-600" />
                <span className="text-[12px] font-medium flex-1 text-amber-700">
                  Your profile has been updated since these recommendations were generated.
                </span>
                <button onClick={refreshMatches} disabled={refreshing}
                  className="text-[11px] font-bold px-4 py-1.5 rounded-xl flex items-center gap-1.5 bg-amber-100 text-amber-700 border border-amber-200 hover:bg-amber-200 transition-all"
                  data-testid="refresh-from-banner">
                  {refreshing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                  Refresh Now
                </button>
              </div>
            )}

            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl flex items-center justify-center bg-gray-100 border border-gray-200">
                  <Sparkles className="w-5 h-5 text-gray-500" />
                </div>
                <div>
                  <h2 className="text-[16px] font-bold text-gray-900">Recommended for You</h2>
                  <p className="text-[12px] text-gray-400 mt-0.5">
                    Curated matches based on your profile, academics, and goals
                    {lastRefreshed && (
                      <span className="ml-1.5 text-gray-300">
                        &middot; Updated {new Date(lastRefreshed).toLocaleDateString()}
                      </span>
                    )}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {compareSelected.length >= 2 && (
                  <button onClick={() => setCompareOpen(true)}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[11px] font-bold text-white transition-all hover:opacity-90"
                    style={{ background: "#1e293b" }}
                    data-testid="compare-btn">
                    <BarChart3 className="w-3.5 h-3.5" /> Compare ({compareSelected.length})
                  </button>
                )}
                <button onClick={refreshMatches} disabled={refreshing}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[11px] font-semibold text-gray-500 bg-white border border-gray-200 hover:border-gray-300 transition-all"
                  data-testid="refresh-matches-btn">
                  {refreshing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                  Refresh
                </button>
                {smartGated && (
                  <button onClick={() => setShowUpgrade(true)}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[11px] font-semibold text-gray-600 bg-gray-50 border border-gray-200 hover:bg-gray-100 transition-all"
                    data-testid="smart-match-unlock-btn">
                    <Lock className="w-3.5 h-3.5" /> Unlock {smartGatedTotal}+ matches
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {smartMatches.slice(0, 6).map(m => (
                <FeaturedCard
                  key={m.university_name}
                  school={m}
                  adding={adding}
                  addToBoard={addToBoard}
                  boardSchools={boardSchools}
                  navigate={navigate}
                  onDetail={setDrawerSchool}
                />
              ))}
            </div>
            {smartMatches.length > 6 && (
              <div className="text-center mt-5">
                <button onClick={() => { setFilterDivision(""); setActiveBucket("all"); document.querySelector('[data-testid="search-filter-bar"]')?.scrollIntoView({ behavior: "smooth" }); }}
                  className="text-[13px] font-semibold text-gray-500 hover:text-gray-800 transition-colors inline-flex items-center gap-1.5">
                  View all {smartMatches.length} recommendations <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        )}

        {/* ═══ STICKY SEARCH + FILTER BAR ═══ */}
        <div className="sticky top-14 z-20 -mx-2 sm:-mx-6 px-2 sm:px-6 py-3 bg-[#F7FAFC]/95 backdrop-blur-md" style={{ borderBottom: "1px solid rgba(0,0,0,0.04)" }} data-testid="search-filter-bar">
          <div style={{ maxWidth: 1280, margin: "0 auto" }}>
            <div className="flex gap-3 items-center" data-testid="search-row">
              <div className="flex-1 flex items-center gap-2.5 px-4 py-3 rounded-2xl bg-white border border-gray-200 shadow-sm transition-all focus-within:border-gray-400 focus-within:shadow-md">
                <Search className="w-[18px] h-[18px] flex-shrink-0 text-gray-300" />
                <input
                  value={search}
                  onChange={e => { setSearch(e.target.value); setActiveBucket("all"); }}
                  placeholder={`Search ${totalUniversities.toLocaleString()} colleges...`}
                  className="flex-1 bg-transparent border-none outline-none text-[14px] text-gray-900 placeholder:text-gray-300"
                  data-testid="kb-search"
                />
                {search && (
                  <button onClick={() => setSearch("")} className="text-gray-300 hover:text-gray-500 transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Inline division quick-filters */}
              <div className="hidden md:flex items-center gap-1.5">
                {DIVISIONS.map(d => (
                  <button key={d} onClick={() => toggleDiv(d)}
                    className={`px-3.5 py-2.5 rounded-xl text-[12px] font-semibold transition-all border ${filterDivision === d ? "text-gray-900 bg-gray-100 border-gray-300" : "text-gray-400 bg-white border-gray-200 hover:border-gray-300"}`}>
                    {d}
                  </button>
                ))}
              </div>

              <button onClick={() => setFiltersOpen(true)} data-testid="filter-toggle-btn"
                className="flex items-center gap-1.5 px-4 py-3 rounded-2xl text-[13px] font-semibold transition-all bg-white border border-gray-200 hover:border-gray-300 text-gray-500 shadow-sm">
                <Filter className="w-4 h-4" />
                <span className="hidden sm:inline">Filters</span>
                {activeFilterCount > 0 && (
                  <span className="bg-gray-800 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">{activeFilterCount}</span>
                )}
              </button>
            </div>

            {/* Smart bucket chips */}
            <div className="flex gap-2 flex-wrap mt-3" data-testid="smart-chips">
              {SMART_BUCKETS.map(b => {
                const isActive = activeBucket === b.id;
                const count = bucketCounts[b.id];
                const BIcon = b.icon;
                return (
                  <button key={b.id} onClick={() => handleBucketClick(b)} data-testid={`chip-${b.id}`}
                    className={`px-4 py-2 rounded-xl text-[12px] font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${isActive ? "text-gray-900 bg-gray-100 border border-gray-300" : "text-gray-400 bg-white border border-gray-200 hover:border-gray-300"}`}>
                    <BIcon className="w-3.5 h-3.5" />
                    {b.label}
                    {count > 0 && <span className="opacity-50">{count}</span>}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* ═══ ALL SCHOOLS SECTION ═══ */}
        <div className="mt-8">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-[16px] font-bold text-gray-900">All Schools</h2>
              <p className="text-[12px] text-gray-400 mt-0.5">
                {enriched.length.toLocaleString()} of {totalUniversities.toLocaleString()} programs
              </p>
            </div>
            <div className="flex items-center gap-2" data-testid="view-toggle">
              {[{ mode: "grid", Icon: LayoutGrid }, { mode: "list", Icon: List }].map(({ mode, Icon }) => (
                <button key={mode} onClick={() => setViewMode(mode)} data-testid={`view-${mode}-btn`}
                  className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all border ${viewMode === mode ? "bg-white border-gray-200 shadow-sm text-gray-700" : "border-transparent text-gray-300 hover:text-gray-500"}`}>
                  <Icon className="w-4 h-4" />
                </button>
              ))}
            </div>
          </div>

          {enriched.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-3xl border border-gray-100" data-testid="no-results">
              <Search className="w-12 h-12 mx-auto mb-4 text-gray-200" />
              <p className="text-[15px] font-medium text-gray-400">No universities match your current filters</p>
              <button onClick={resetFilters} className="mt-4 text-[13px] font-semibold flex items-center gap-1.5 mx-auto text-gray-500 hover:text-gray-700 transition-colors">
                <RotateCcw className="w-4 h-4" /> Reset all filters
              </button>
            </div>
          ) : (
            <div className={viewMode === "grid" ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" : "flex flex-col gap-3"} data-testid="kb-grid">
              {enriched.map((uni, idx) => (
                <SchoolCard key={`${uni.domain || uni.university_name}-${idx}`} uni={uni} adding={adding} addToBoard={addToBoard} boardSchools={boardSchools} navigate={navigate} />
              ))}
            </div>
          )}
        </div>

        {/* ═══ PAGINATION ═══ */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-8 pb-4" data-testid="kb-pagination">
            <span className="text-[12px] text-gray-400">
              {(page - 1) * 50 + 1}-{Math.min(page * 50, totalUniversities)} of {totalUniversities.toLocaleString()}
            </span>
            <div className="flex items-center gap-2">
              <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} data-testid="kb-prev-page"
                className="px-4 py-2 rounded-xl text-[13px] font-semibold disabled:opacity-30 text-gray-500 bg-white border border-gray-200 hover:border-gray-300 transition-all">
                Previous
              </button>
              <span className="text-[13px] px-3 text-gray-400 font-medium">{page} / {totalPages}</span>
              <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} data-testid="kb-next-page"
                className="px-4 py-2 rounded-xl text-[13px] font-semibold disabled:opacity-30 text-gray-500 bg-white border border-gray-200 hover:border-gray-300 transition-all">
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ═══ PANELS & MODALS ═══ */}
      <FilterPanel
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        divisions={DIVISIONS}
        regions={regions}
        conferences={conferences}
        filterDivision={filterDivision}
        filterRegion={filterRegion}
        filterConference={filterConference}
        onDivision={toggleDiv}
        onRegion={toggleReg}
        onConference={toggleConf}
        onApply={() => setFiltersOpen(false)}
        onClear={() => { resetFilters(); setFiltersOpen(false); }}
      />
      <UpgradeModal isOpen={showUpgrade} onClose={() => setShowUpgrade(false)} message={upgradeMessage} currentTier={subscription?.tier || "basic"} />
      <MatchDetailDrawer
        school={drawerSchool} open={!!drawerSchool} onClose={() => setDrawerSchool(null)}
        onAddToPipeline={(name) => { setDrawerSchool(null); addToBoard({ university_name: name }); }}
        adding={drawerSchool ? adding[drawerSchool.university_name] : false}
        onNavigate={(s) => s.domain ? navigate(`/schools/${s.domain}`) : navigate(`/schools/${encodeURIComponent(s.university_name)}`)}
      />
      <CompareDrawer
        schools={compareSelected} open={compareOpen} onClose={() => setCompareOpen(false)}
        onAddToPipeline={(name) => addToBoard({ university_name: name })} adding={adding}
        onNavigate={(s) => s.domain ? navigate(`/schools/${s.domain}`) : navigate(`/schools/${encodeURIComponent(s.university_name)}`)}
      />
    </div>
  );
}

import { useState, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import {
  Search, Plus, MapPin, Check, LayoutGrid, List, Star,
  Target, MapPinned, GraduationCap, X, Filter, ExternalLink,
  Loader2, RotateCcw, Sparkles, ArrowRight, Database
} from "lucide-react";
import UpgradeModal from "../../components/UpgradeModal";
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

/* ── Slide-in Filter Panel ── */
function FilterPanel({ open, onClose, divisions, regions, conferences, filterDivision, filterRegion, filterConference, onDivision, onRegion, onConference, onApply, onClear }) {
  const [showAllConf, setShowAllConf] = useState(false);
  const visibleConf = showAllConf ? conferences : conferences.slice(0, 8);
  const activeCount = (filterDivision ? 1 : 0) + (filterRegion ? 1 : 0) + (filterConference ? 1 : 0);
  const chipCls = (active) => active ? "text-[#1a8a80] bg-[#1a8a80]/10 border-[#1a8a80]/25" : "";

  return (
    <>
      {open && <div className="fixed inset-0 bg-black/20 z-[199]" onClick={onClose} data-testid="filter-overlay" />}
      <div className={`fixed top-0 right-0 w-[360px] max-w-[90vw] h-full z-[200] transition-transform duration-300 ease-out overflow-y-auto bg-[var(--cm-surface)] border-l border-[var(--cm-border)] ${open ? "translate-x-0" : "translate-x-full"}`}
        style={{ boxShadow: open ? "-10px 0 40px rgba(0,0,0,0.3)" : "none" }}
        data-testid="filter-panel">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <span className="text-[15px] font-bold text-[var(--cm-text)]">Filters</span>
            <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: "var(--cm-surface-2)" }} data-testid="filter-close">
              <X className="w-3.5 h-3.5 text-[var(--cm-text)]/50" />
            </button>
          </div>

          <div className="mb-5">
            <div className="text-[10px] font-bold tracking-[1.2px] uppercase mb-2.5 text-[var(--cm-text)]/40">Division</div>
            <div className="flex flex-wrap gap-1.5">
              {divisions.map(d => (
                <button key={d} onClick={() => onDivision(d)} data-testid={`filter-div-${d.toLowerCase()}`}
                  className={`px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-all border ${chipCls(filterDivision === d)}`}
                  style={filterDivision === d ? {} : { color: "var(--cm-text-2)", backgroundColor: "var(--cm-surface-2)", borderColor: "var(--cm-border)" }}>
                  {d}
                </button>
              ))}
            </div>
          </div>

          <div className="mb-5">
            <div className="text-[10px] font-bold tracking-[1.2px] uppercase mb-2.5 text-[var(--cm-text)]/40">Region</div>
            <div className="flex flex-wrap gap-1.5">
              {regions.map(r => (
                <button key={r} onClick={() => onRegion(r)} data-testid={`filter-reg-${r.toLowerCase().replace(/\s+/g, "-")}`}
                  className={`px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-all border ${chipCls(filterRegion === r)}`}
                  style={filterRegion === r ? {} : { color: "var(--cm-text-2)", backgroundColor: "var(--cm-surface-2)", borderColor: "var(--cm-border)" }}>
                  {r}
                </button>
              ))}
            </div>
          </div>

          {conferences.length > 0 && (
            <div className="mb-5">
              <div className="text-[10px] font-bold tracking-[1.2px] uppercase mb-2.5 text-[var(--cm-text)]/40">Conference</div>
              <div className="flex flex-wrap gap-1.5">
                {visibleConf.map(c => (
                  <button key={c} onClick={() => onConference(c)} data-testid={`filter-conf-${c.toLowerCase().replace(/\s+/g, "-")}`}
                    className={`px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-all border ${chipCls(filterConference === c)}`}
                    style={filterConference === c ? {} : { color: "var(--cm-text-2)", backgroundColor: "var(--cm-surface-2)", borderColor: "var(--cm-border)" }}>
                    {c}
                  </button>
                ))}
                {conferences.length > 8 && (
                  <button onClick={() => setShowAllConf(!showAllConf)}
                    className="px-3 py-1.5 rounded-lg text-[12px] font-semibold border"
                    style={{ color: "var(--cm-text-3)", backgroundColor: "var(--cm-surface-2)", borderColor: "var(--cm-border)" }}>
                    {showAllConf ? "Show less" : `+${conferences.length - 8} more`}
                  </button>
                )}
              </div>
            </div>
          )}

          <button onClick={onApply} data-testid="filter-apply-btn"
            className="w-full py-3 rounded-xl text-[13px] font-bold text-[var(--cm-text)] mt-2"
            style={{ background: "linear-gradient(135deg, #1a8a80, #25a99e)" }}>
            Apply Filters {activeCount > 0 && `(${activeCount})`}
          </button>
          <button onClick={onClear} data-testid="filter-clear-btn"
            className="w-full py-2.5 rounded-xl text-[12px] font-semibold mt-2 text-[var(--cm-text)]/40 border border-white/10">
            Clear All
          </button>
        </div>
      </div>
    </>
  );
}

/* ── Top Match Banner ── */
function TopMatchBanner({ school, adding, addToBoard, boardSchools, navigate }) {
  if (!school) return null;
  const isOnBoard = boardSchools.has(school.university_name);
  return (
    <div className="flex flex-col sm:flex-row rounded-lg overflow-hidden mb-7 border border-[#1a8a80]/12" data-testid="top-match-banner">
      <div className="flex-1 p-5 sm:p-7" style={{ background: "linear-gradient(135deg, var(--cm-hero-from) 0%, var(--cm-surface) 100%)" }}>
        <div className="text-[10px] font-bold tracking-[1.5px] uppercase text-[#1a8a80] mb-2.5 flex items-center gap-1.5">
          <Sparkles className="w-3 h-3" /> Your #1 Match
        </div>
        <div className="text-lg sm:text-[22px] font-extrabold text-[var(--cm-text)] mb-2 tracking-tight leading-tight cursor-pointer hover:text-[#1a8a80] transition-colors"
          onClick={() => school.domain && navigate(`/schools/${school.domain}`)} data-testid="top-match-name">
          {school.university_name}
        </div>
        <div className="flex items-center gap-2 mb-4">
          <span className="px-2.5 py-0.5 rounded-md text-[11px] font-bold" style={{ backgroundColor: "rgba(26,138,128,0.2)", color: "#1a8a80" }}>{school.division}</span>
          <span className="text-[12px] text-[var(--cm-text)]/40">{school.region} {school.conference && `\u00B7 ${school.conference}`}</span>
        </div>
        {school.match_reasons?.length > 0 && (
          <div className="rounded-xl p-3 sm:p-3.5" style={{ backgroundColor: "var(--cm-surface-2)" }}>
            <div className="text-[11px] font-bold text-[var(--cm-text)]/60 mb-1">Why this school?</div>
            <div className="text-[12px] text-[var(--cm-text)]/40 leading-relaxed">
              {school.match_reasons.some(r => ["Strong Academic Fit", "Good Academic Fit"].includes(r))
                ? `Strong match across ${school.match_reasons.join(", ").toLowerCase()}.`
                : `Matches your preferences in ${school.match_reasons.join(", ").toLowerCase()}.`
              }
            </div>
          </div>
        )}
      </div>
      <div className="sm:w-[280px] flex flex-col items-center justify-center p-5 sm:p-7 gap-4 sm:gap-5 flex-shrink-0" style={{ backgroundColor: "var(--cm-surface-2)" }}>
        <div className="flex sm:flex-col items-center gap-2 sm:gap-1">
          <div className="text-[36px] sm:text-[48px] font-extrabold text-[#1a8a80] leading-none">{school.match_score}%</div>
          <div className="text-[10px] sm:text-[11px] text-[var(--cm-text)]/35 uppercase tracking-[1px] font-semibold">Match Score</div>
        </div>
        <button onClick={() => !isOnBoard && addToBoard(school)} disabled={adding[school.university_name] || isOnBoard}
          data-testid="top-match-add-btn"
          className="w-full py-2.5 rounded-xl text-[13px] font-bold text-[var(--cm-text)] transition-all"
          style={isOnBoard ? { backgroundColor: "rgba(16,185,129,0.2)", color: "#10b981" } : { background: "linear-gradient(135deg, #1a8a80, #25a99e)" }}>
          {isOnBoard ? "On Your Board" : adding[school.university_name] ? "Adding..." : "+ Add to Board"}
        </button>
      </div>
    </div>
  );
}

/* ── University Logo ── */
function UniversityLogo({ domain, name, logoUrl, size = 32 }) {
  const [imgError, setImgError] = useState(false);
  const initials = (name || "").split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
  if (logoUrl && !imgError) {
    return <img src={logoUrl} alt={name} className="rounded-lg object-contain" style={{ width: size, height: size }} onError={() => setImgError(true)} />;
  }
  return (
    <div className="rounded-lg flex items-center justify-center text-[var(--cm-text)] font-bold" style={{ width: size, height: size, backgroundColor: "#1a8a80", fontSize: size * 0.35 }}>
      {initials || "?"}
    </div>
  );
}

/* ── School Card ── */
function SchoolCard({ uni, adding, addToBoard, boardSchools, navigate }) {
  const isOnBoard = boardSchools.has(uni.university_name);
  const sc = uni.scorecard || {};
  return (
    <div className="rounded-[14px] p-[18px] cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:border-[#1a8a80]/30 group bg-[var(--cm-surface)] border border-[var(--cm-border)]"
      onClick={() => uni.domain && navigate(`/schools/${uni.domain}`)}
      data-testid={`school-card-${(uni.domain || "").replace(/\./g, "-")}`}>
      <div className="flex items-center gap-3 mb-3.5">
        <UniversityLogo domain={uni.domain} name={uni.university_name} logoUrl={uni.logo_url} size={32} />
        <div className="flex-1 min-w-0">
          <div className="text-[13px] font-bold truncate text-[var(--cm-text)]">{uni.university_name}</div>
          <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-[var(--cm-text)]/40">
            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#1a8a80]/15 text-[#1a8a80]">{uni.division}</span>
            {uni.region && <span>{uni.region}</span>}
            {uni.conference && <span>{`\u00B7 ${uni.conference}`}</span>}
          </div>
        </div>
        {uni.match_score > 0 && (
          <span className="text-[18px] font-extrabold text-[#1a8a80] flex-shrink-0" data-testid="card-match-score">{uni.match_score}%</span>
        )}
      </div>

      {uni.match_reasons?.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3.5">
          {uni.match_reasons.map(r => {
            const isReach = ["Reach", "High Reach"].includes(r);
            const isSlightReach = r === "Slight Reach";
            const isStrongFit = r === "Strong Academic Fit";
            const isGoodFit = r === "Good Academic Fit";
            return (
              <span key={r} className={`text-[10px] px-1.5 py-0.5 rounded-[5px] ${
                isReach ? "bg-red-900/30 text-red-400" :
                isSlightReach ? "bg-amber-900/30 text-amber-400" :
                isStrongFit ? "bg-emerald-900/30 text-emerald-400" :
                isGoodFit ? "bg-teal-900/30 text-teal-400" :
                "bg-white/5 text-[var(--cm-text)]/40"
              }`}>{r}</span>
            );
          })}
        </div>
      )}

      {/* Scorecard quick stats */}
      {sc.admission_rate != null && (
        <div className="flex gap-3 mb-3 text-[10px] text-[var(--cm-text)]/30">
          <span>{(sc.admission_rate * 100).toFixed(0)}% accept</span>
          {sc.student_size && <span>{Number(sc.student_size).toLocaleString()} students</span>}
          {sc.sat_avg && <span>SAT {sc.sat_avg}</span>}
        </div>
      )}

      <div className="flex gap-1.5" onClick={e => e.stopPropagation()}>
        <button onClick={() => !isOnBoard && addToBoard(uni)} disabled={adding[uni.university_name] || isOnBoard}
          data-testid={`add-board-${(uni.domain || "").replace(/\./g, "-")}`}
          className="flex-1 py-2 rounded-lg text-[11px] font-bold text-center transition-all"
          style={isOnBoard ? { backgroundColor: "rgba(16,185,129,0.12)", color: "#10b981" } : { backgroundColor: "rgba(26,138,128,0.12)", color: "#1a8a80" }}>
          {isOnBoard ? <><Check className="w-3 h-3 inline mr-1" />On Board</> : adding[uni.university_name] ? "Adding..." : <><Plus className="w-3 h-3 inline mr-1" />Add to Board</>}
        </button>
        <button onClick={() => uni.domain && navigate(`/schools/${uni.domain}`)}
          data-testid={`details-${(uni.domain || "").replace(/\./g, "-")}`}
          className="py-2 px-3 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1 bg-white/5 text-[var(--cm-text)]/40">
          <ArrowRight className="w-3 h-3" /> Details
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

  const token = localStorage.getItem("token");
  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  useEffect(() => {
    axios.get(`${API}/knowledge-base/filters`, { headers }).then(res => {
      if (res.data?.conferences) setConferences(res.data.conferences);
      if (res.data?.regions) setRegions(res.data.regions);
    }).catch(() => {});

    // Load board schools (pipeline programs)
    axios.get(`${API}/athlete/programs`, { headers }).then(res => {
      setBoardSchools(new Set((res.data || []).map(p => p.university_name)));
    }).catch(() => {});

    // Load suggestions
    axios.get(`${API}/suggested-schools`, { headers }).then(res => {
      setSuggestions(res.data?.suggestions || []);
    }).catch(() => {}).finally(() => setSuggestionsLoading(false));
  }, []);

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
    if (aTop5 && bTop5) {
      return (suggestionMap[b.university_name]?.match_score || 0) - (suggestionMap[a.university_name]?.match_score || 0);
    }
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20" data-testid="kb-loading">
        <Loader2 className="w-6 h-6 text-[#1a8a80] animate-spin" />
      </div>
    );
  }

  return (
    <div data-testid="knowledge-base" className="max-w-[1280px] mx-auto">
      {/* Search + Filter Toggle */}
      <div className="flex gap-2.5 items-center mb-5" data-testid="search-row">
        <div className="flex-1 flex items-center gap-2.5 px-4 py-3 rounded-[14px] bg-[var(--cm-surface)] border border-[var(--cm-border)]">
          <Search className="w-[18px] h-[18px] flex-shrink-0 text-[var(--cm-text)]/30" />
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setActiveBucket("all"); }}
            placeholder={`Search ${totalUniversities.toLocaleString()} colleges by name...`}
            className="flex-1 bg-transparent border-none outline-none text-[14px] text-[var(--cm-text)] placeholder:text-[var(--cm-text)]/25"
            data-testid="kb-search"
          />
          <span className="text-[11px] whitespace-nowrap text-[var(--cm-text)]/30">{enriched.length.toLocaleString()}</span>
        </div>
        <button onClick={() => setFiltersOpen(true)} data-testid="filter-toggle-btn"
          className="flex items-center gap-1.5 px-4 py-3 rounded-[14px] text-[13px] font-semibold transition-all hover:border-[#1a8a80]/30 hover:text-[#1a8a80] text-[var(--cm-text)]/50 bg-[var(--cm-surface)] border border-[var(--cm-border)]">
          <Filter className="w-4 h-4" />
          Filters
          {activeFilterCount > 0 && (
            <span className="bg-[#1a8a80] text-[var(--cm-text)] text-[10px] px-1.5 py-0.5 rounded-[10px] font-bold">{activeFilterCount}</span>
          )}
        </button>
      </div>

      {/* Smart Chips */}
      <div className="flex gap-2 flex-wrap mb-6" data-testid="smart-chips">
        {SMART_BUCKETS.map(b => {
          const isActive = activeBucket === b.id;
          const count = bucketCounts[b.id];
          return (
            <button key={b.id} onClick={() => handleBucketClick(b)} data-testid={`chip-${b.id}`}
              className="px-4 py-[7px] rounded-[20px] text-[12px] font-semibold whitespace-nowrap transition-all"
              style={isActive
                ? { color: "#1a8a80", backgroundColor: "rgba(26,138,128,0.1)", border: "1px solid rgba(26,138,128,0.3)" }
                : { color: "var(--cm-text-3)", backgroundColor: "var(--cm-surface)", border: "1px solid var(--cm-border)" }}>
              {b.label}
              {count > 0 && <span className="ml-1 opacity-50 font-medium">{count}</span>}
            </button>
          );
        })}
      </div>

      {/* Top Match Banner */}
      {!suggestionsLoading && topMatch && (
        <TopMatchBanner school={topMatch} adding={adding} addToBoard={addToBoard} boardSchools={boardSchools} navigate={navigate} />
      )}

      {/* Results Header */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-[12px] text-[var(--cm-text)]/30" data-testid="results-count">
          Showing {enriched.length} of {totalUniversities.toLocaleString()} schools
        </span>
        <div className="flex gap-1" data-testid="view-toggle">
          {[{ mode: "grid", Icon: LayoutGrid }, { mode: "list", Icon: List }].map(({ mode, Icon }) => (
            <button key={mode} onClick={() => setViewMode(mode)} data-testid={`view-${mode}-btn`}
              className="w-8 h-8 rounded-lg flex items-center justify-center transition-all"
              style={{ backgroundColor: viewMode === mode ? "var(--cm-surface-2)" : "transparent", border: `1px solid ${viewMode === mode ? "var(--cm-border)" : "var(--cm-border)"}` }}>
              <Icon className="w-[15px] h-[15px]" style={{ color: viewMode === mode ? "var(--cm-text-2)" : "var(--cm-text-3)" }} />
            </button>
          ))}
        </div>
      </div>

      {/* School Grid / List */}
      {enriched.length === 0 ? (
        <div className="text-center py-16" data-testid="no-results">
          <Search className="w-10 h-10 mx-auto mb-3 text-[var(--cm-text)]/15" />
          <p className="text-sm font-medium text-[var(--cm-text)]/40">No universities found matching your filters</p>
          <button onClick={resetFilters} className="mt-3 text-sm font-medium flex items-center gap-1.5 mx-auto text-[#1a8a80] transition-colors hover:opacity-80">
            <RotateCcw className="w-3.5 h-3.5" /> Reset filters
          </button>
        </div>
      ) : (
        <div className={viewMode === "grid" ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3" : "flex flex-col gap-2.5"} data-testid="kb-grid">
          {enriched.map(uni => (
            <SchoolCard key={uni.domain || uni.university_name} uni={uni} adding={adding} addToBoard={addToBoard} boardSchools={boardSchools} navigate={navigate} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-6 pb-2" data-testid="kb-pagination">
          <span className="text-[12px] text-[var(--cm-text)]/30">
            {(page - 1) * 50 + 1}-{Math.min(page * 50, totalUniversities)} of {totalUniversities}
          </span>
          <div className="flex items-center gap-2">
            <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} data-testid="kb-prev-page"
              className="px-3 py-1.5 rounded-lg text-[12px] font-semibold disabled:opacity-30 text-[var(--cm-text)]/50 bg-[var(--cm-surface)] border border-[var(--cm-border)]">Prev</button>
            <span className="text-[12px] px-2 text-[var(--cm-text)]/40">{page} / {totalPages}</span>
            <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} data-testid="kb-next-page"
              className="px-3 py-1.5 rounded-lg text-[12px] font-semibold disabled:opacity-30 text-[var(--cm-text)]/50 bg-[var(--cm-surface)] border border-[var(--cm-border)]">Next</button>
          </div>
        </div>
      )}

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

      <UpgradeModal
        isOpen={showUpgrade}
        onClose={() => setShowUpgrade(false)}
        message={upgradeMessage}
        currentTier={subscription?.tier || "basic"}
      />
    </div>
  );
}

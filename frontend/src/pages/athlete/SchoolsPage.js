import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import {
  Search, GraduationCap, MapPin, Filter, ChevronDown,
  Trophy, Users, DollarSign, Loader2, X, Plus, Check,
  ChevronRight, Building,
} from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const DIVISION_COLORS = {
  D1: "bg-emerald-100 text-emerald-800",
  D2: "bg-blue-100 text-blue-800",
  D3: "bg-amber-100 text-amber-800",
  NAIA: "bg-slate-100 text-slate-700",
};

function SchoolCard({ school, onAdd }) {
  const nav = useNavigate();
  const stats = school.program_stats || {};
  const divClass = DIVISION_COLORS[school.division] || "bg-slate-100 text-slate-700";

  return (
    <div
      data-testid={`school-card-${school.domain}`}
      className="group bg-white rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-md transition-all cursor-pointer overflow-hidden"
      onClick={() => nav(`/schools/${school.domain}`)}
    >
      {/* Color bar */}
      <div
        className="h-1.5 w-full"
        style={{ backgroundColor: school.colors?.[0] || "#64748b" }}
      />

      <div className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-[10px] font-bold tracking-wide px-2 py-0.5 rounded-full ${divClass}`}>
                {school.division}
              </span>
              <span className="text-[10px] text-slate-400 font-medium">{school.conference}</span>
            </div>
            <h3
              className="text-sm font-semibold text-slate-900 truncate group-hover:text-emerald-700 transition-colors"
              data-testid={`school-name-${school.domain}`}
            >
              {school.university_name}
            </h3>
            <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
              <MapPin className="w-3 h-3" /> {school.city}, {school.state}
            </p>
          </div>

          {/* Mascot initial */}
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-sm shrink-0"
            style={{ backgroundColor: school.colors?.[0] || "#64748b" }}
          >
            {(school.mascot || "?")[0]}
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-2 mb-3">
          {stats.national_championships > 0 && (
            <div className="text-center p-1.5 bg-slate-50 rounded-lg">
              <div className="text-xs font-bold text-slate-900">{stats.national_championships}</div>
              <div className="text-[10px] text-slate-500">Titles</div>
            </div>
          )}
          <div className="text-center p-1.5 bg-slate-50 rounded-lg">
            <div className="text-xs font-bold text-slate-900">{stats.win_loss_record || "—"}</div>
            <div className="text-[10px] text-slate-500">Record</div>
          </div>
          <div className="text-center p-1.5 bg-slate-50 rounded-lg">
            <div className="text-xs font-bold text-slate-900">{school.roster_size || "—"}</div>
            <div className="text-[10px] text-slate-500">Roster</div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-100">
          <div className="flex items-center gap-3 text-[10px] text-slate-500">
            {school.athletic_scholarships && (
              <span className="flex items-center gap-1">
                <DollarSign className="w-3 h-3" /> Scholarships
              </span>
            )}
            {school.acceptance_rate && (
              <span>{school.acceptance_rate}% admit</span>
            )}
          </div>

          {school.in_pipeline ? (
            <span
              className="flex items-center gap-1 text-[10px] font-medium text-emerald-600"
              data-testid={`in-pipeline-${school.domain}`}
            >
              <Check className="w-3 h-3" /> In Pipeline
            </span>
          ) : (
            <button
              data-testid={`add-pipeline-${school.domain}`}
              onClick={(e) => { e.stopPropagation(); onAdd(school); }}
              className="flex items-center gap-1 text-[10px] font-medium text-slate-500 hover:text-emerald-600 transition-colors"
            >
              <Plus className="w-3 h-3" /> Add
            </button>
          )}
        </div>
      </div>
    </div>
  );
}


function FilterBar({ filters, active, onChange, onClear }) {
  const [open, setOpen] = useState(null);

  const toggleDropdown = (key) => setOpen(open === key ? null : key);
  const activeCount = Object.values(active).filter(Boolean).length;

  const filterDefs = [
    { key: "division", label: "Division", options: filters.divisions || [] },
    { key: "state", label: "State", options: filters.states || [] },
    { key: "conference", label: "Conference", options: filters.conferences || [] },
    { key: "region", label: "Region", options: filters.regions || [] },
  ];

  return (
    <div className="flex items-center gap-2 flex-wrap" data-testid="filter-bar">
      <Filter className="w-4 h-4 text-slate-400" />
      {filterDefs.map((f) => (
        <div key={f.key} className="relative">
          <button
            data-testid={`filter-${f.key}`}
            onClick={() => toggleDropdown(f.key)}
            className={`
              flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all
              ${active[f.key]
                ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
              }
            `}
          >
            {active[f.key] || f.label}
            <ChevronDown className="w-3 h-3" />
          </button>

          {open === f.key && (
            <div className="absolute z-30 top-full mt-1 left-0 bg-white border border-slate-200 rounded-lg shadow-lg py-1 min-w-[140px] max-h-60 overflow-y-auto">
              <button
                className="w-full text-left px-3 py-1.5 text-xs text-slate-400 hover:bg-slate-50"
                onClick={() => { onChange(f.key, ""); setOpen(null); }}
              >
                All
              </button>
              {f.options.map((opt) => (
                <button
                  key={opt}
                  data-testid={`filter-option-${f.key}-${opt}`}
                  className={`w-full text-left px-3 py-1.5 text-xs hover:bg-slate-50 ${
                    active[f.key] === opt ? "text-emerald-700 font-medium bg-emerald-50" : "text-slate-700"
                  }`}
                  onClick={() => { onChange(f.key, opt); setOpen(null); }}
                >
                  {opt}
                </button>
              ))}
            </div>
          )}
        </div>
      ))}

      {activeCount > 0 && (
        <button
          data-testid="clear-filters"
          onClick={onClear}
          className="flex items-center gap-1 px-2 py-1.5 text-xs text-slate-500 hover:text-slate-700"
        >
          <X className="w-3 h-3" /> Clear ({activeCount})
        </button>
      )}
    </div>
  );
}


export default function SchoolsPage() {
  const [schools, setSchools] = useState([]);
  const [filters, setFilters] = useState({ divisions: [], states: [], conferences: [], regions: [] });
  const [active, setActive] = useState({ division: "", state: "", conference: "", region: "" });
  const [search, setSearch] = useState("");
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(null);

  const fetchSchools = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (search.trim()) params.q = search.trim();
      if (active.division) params.division = active.division;
      if (active.state) params.state = active.state;
      if (active.conference) params.conference = active.conference;
      if (active.region) params.region = active.region;

      const { data } = await axios.get(`${API}/athlete/knowledge/search`, { params });
      setSchools(data.schools || []);
      setTotal(data.total || 0);
      if (data.filters) setFilters(data.filters);
    } catch (err) {
      toast.error("Failed to load schools");
    } finally {
      setLoading(false);
    }
  }, [search, active]);

  useEffect(() => {
    const timer = setTimeout(fetchSchools, 300);
    return () => clearTimeout(timer);
  }, [fetchSchools]);

  const handleFilterChange = (key, val) => {
    setActive((prev) => ({ ...prev, [key]: val }));
  };

  const clearFilters = () => {
    setActive({ division: "", state: "", conference: "", region: "" });
    setSearch("");
  };

  const handleAddToPipeline = async (school) => {
    setAdding(school.domain);
    try {
      await axios.post(`${API}/athlete/knowledge/${school.domain}/add-to-pipeline`);
      toast.success(`${school.university_name} added to your pipeline`);
      setSchools((prev) =>
        prev.map((s) => s.domain === school.domain ? { ...s, in_pipeline: true } : s)
      );
    } catch (err) {
      const msg = err.response?.data?.detail || "Failed to add school";
      toast.error(msg);
    } finally {
      setAdding(null);
    }
  };

  return (
    <div className="space-y-6" data-testid="schools-page">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-900" data-testid="schools-title">
          School Knowledge Base
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Research volleyball programs and add schools to your pipeline
        </p>
      </div>

      {/* Search */}
      <div className="relative" data-testid="search-container">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          data-testid="school-search-input"
          type="text"
          placeholder="Search schools by name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-300 transition-all"
        />
      </div>

      {/* Filters */}
      <FilterBar filters={filters} active={active} onChange={handleFilterChange} onClear={clearFilters} />

      {/* Results count */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-500" data-testid="results-count">
          {total} program{total !== 1 ? "s" : ""} found
        </p>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
        </div>
      ) : schools.length === 0 ? (
        <div className="text-center py-20" data-testid="no-results">
          <GraduationCap className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-sm text-slate-500">No schools match your search</p>
          <button
            onClick={clearFilters}
            className="text-xs text-emerald-600 hover:underline mt-2"
          >
            Clear all filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" data-testid="schools-grid">
          {schools.map((school) => (
            <SchoolCard
              key={school.domain}
              school={school}
              onAdd={handleAddToPipeline}
            />
          ))}
        </div>
      )}
    </div>
  );
}

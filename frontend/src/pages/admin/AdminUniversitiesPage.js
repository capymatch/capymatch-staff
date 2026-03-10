import { useState, useEffect, useCallback, useRef } from "react";
import axios from "axios";
import { toast } from "sonner";
import {
  Search, GraduationCap, ChevronLeft, ChevronRight, Filter, Download, Upload,
  AlertTriangle, CheckCircle, Loader2, RefreshCw, X, Edit2, Trash2, Plus
} from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const DIVISIONS = ["all", "D1", "D2", "D3", "NAIA", "JUCO"];
const HEALTH_FILTERS = [
  { value: "all", label: "All" },
  { value: "complete", label: "Complete" },
  { value: "missing_coach", label: "Missing Coach" },
  { value: "missing_email", label: "Missing Email" },
];

function HealthBar({ label, value, total, color }) {
  const pct = total ? Math.round((value / total) * 100) : 0;
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] font-semibold" style={{ color: "var(--cm-text-3)" }}>{label}</span>
        <span className="text-[10px] font-bold" style={{ color }}>{pct}%</span>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: "var(--cm-surface-2)" }}>
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}

export default function AdminUniversitiesPage() {
  const [universities, setUniversities] = useState([]);
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [division, setDivision] = useState("all");
  const [healthFilter, setHealthFilter] = useState("all");
  const [editingUni, setEditingUni] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);
  const searchTimer = useRef(null);
  const LIMIT = 50;

  const headers = useCallback(() => {
    const token = localStorage.getItem("token");
    return token ? { Authorization: `Bearer ${token}` } : {};
  }, []);

  const fetchHealth = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/admin/universities/health`, { headers: headers() });
      setHealth(res.data);
    } catch {}
  }, [headers]);

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: LIMIT };
      if (search) params.search = search;
      if (division !== "all") params.division = division;
      if (healthFilter !== "all") params.health = healthFilter;
      const res = await axios.get(`${API}/admin/universities`, { headers: headers(), params });
      setUniversities(res.data.universities);
      setTotal(res.data.total);
    } catch {
      toast.error("Failed to load universities");
    } finally {
      setLoading(false);
    }
  }, [page, search, division, healthFilter, headers]);

  useEffect(() => { fetchHealth(); }, [fetchHealth]);
  useEffect(() => { fetchList(); }, [fetchList]);

  const handleSearchChange = (val) => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => { setSearch(val); setPage(1); }, 400);
  };

  const handleExport = async () => {
    try {
      const res = await axios.get(`${API}/admin/universities/export`, { headers: headers(), responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "universities_export.csv");
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success("CSV exported");
    } catch {
      toast.error("Export failed");
    }
  };

  const saveEdit = async () => {
    setSaving(true);
    try {
      await axios.put(`${API}/admin/universities/${encodeURIComponent(editingUni)}`, editForm, { headers: headers() });
      toast.success("University updated");
      setEditingUni(null);
      fetchList();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Update failed");
    } finally {
      setSaving(false);
    }
  };

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div className="space-y-5 max-w-6xl mx-auto" data-testid="admin-universities-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-extrabold" style={{ color: "var(--cm-text)" }}>University Knowledge Base</h1>
          <p className="text-xs mt-0.5" style={{ color: "var(--cm-text-3)" }}>
            {total.toLocaleString()} schools &middot; Powering Smart Match, school discovery, and coach outreach
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleExport} className="flex items-center gap-1 text-[10px] font-bold px-3 py-1.5 rounded-lg"
            style={{ backgroundColor: "var(--cm-surface-2)", color: "var(--cm-text-2)" }} data-testid="export-csv">
            <Download className="w-3 h-3" /> Export CSV
          </button>
          <button onClick={() => { fetchList(); fetchHealth(); }} className="p-2 rounded-lg"
            style={{ backgroundColor: "var(--cm-surface-2)" }}>
            <RefreshCw className="w-3.5 h-3.5" style={{ color: "var(--cm-text-3)" }} />
          </button>
        </div>
      </div>

      {/* Health Cards */}
      {health && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-xl border p-3" style={{ backgroundColor: "var(--cm-surface)", borderColor: "var(--cm-border)" }}>
            <div className="text-2xl font-extrabold" style={{ color: "var(--cm-text)" }}>{health.total}</div>
            <div className="text-[10px]" style={{ color: "var(--cm-text-3)" }}>Total Schools</div>
          </div>
          <div className="rounded-xl border p-3" style={{ backgroundColor: "var(--cm-surface)", borderColor: "var(--cm-border)" }}>
            <div className="text-2xl font-extrabold" style={{ color: "#10b981" }}>{health.completeness_pct}%</div>
            <div className="text-[10px]" style={{ color: "var(--cm-text-3)" }}>Coach Coverage</div>
          </div>
          <div className="rounded-xl border p-3" style={{ backgroundColor: "var(--cm-surface)", borderColor: "var(--cm-border)" }}>
            <HealthBar label="Has Scorecard" value={health.has_scorecard} total={health.total} color="#3b82f6" />
          </div>
          <div className="rounded-xl border p-3" style={{ backgroundColor: "var(--cm-surface)", borderColor: "var(--cm-border)" }}>
            <HealthBar label="Has Logo" value={health.has_logo} total={health.total} color="#8b5cf6" />
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: "var(--cm-text-4)" }} />
          <input
            type="text"
            placeholder="Search by name..."
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full pl-8 pr-3 py-2 text-xs rounded-lg border outline-none"
            style={{ backgroundColor: "var(--cm-surface)", borderColor: "var(--cm-border)", color: "var(--cm-text)" }}
            data-testid="university-search"
          />
        </div>
        <div className="flex gap-1">
          {DIVISIONS.map(d => (
            <button key={d} onClick={() => { setDivision(d); setPage(1); }}
              className="text-[10px] font-bold px-2.5 py-1.5 rounded-lg transition-all"
              style={{
                backgroundColor: division === d ? "rgba(13,148,136,0.1)" : "var(--cm-surface-2)",
                color: division === d ? "#0d9488" : "var(--cm-text-3)",
                border: division === d ? "1px solid rgba(13,148,136,0.3)" : "1px solid transparent",
              }}>
              {d === "all" ? "All" : d}
            </button>
          ))}
        </div>
        <div className="flex gap-1">
          {HEALTH_FILTERS.map(h => (
            <button key={h.value} onClick={() => { setHealthFilter(h.value); setPage(1); }}
              className="text-[10px] font-bold px-2.5 py-1.5 rounded-lg transition-all"
              style={{
                backgroundColor: healthFilter === h.value ? "rgba(245,158,11,0.1)" : "var(--cm-surface-2)",
                color: healthFilter === h.value ? "#d97706" : "var(--cm-text-3)",
                border: healthFilter === h.value ? "1px solid rgba(245,158,11,0.3)" : "1px solid transparent",
              }}>
              {h.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: "var(--cm-surface)", borderColor: "var(--cm-border)" }}>
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="w-5 h-5 animate-spin" style={{ color: "var(--cm-text-3)" }} />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr style={{ borderBottom: "1px solid var(--cm-border)" }}>
                  {["School", "Division", "Head Coach", "Coach Email", "Coordinator", "Region"].map(h => (
                    <th key={h} className="text-[9px] font-bold tracking-[1px] uppercase px-4 py-3" style={{ color: "var(--cm-text-4)" }}>
                      {h}
                    </th>
                  ))}
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {universities.map((u, i) => (
                  <tr key={u.university_name || i}
                    className="transition-colors"
                    style={{ borderBottom: "1px solid var(--cm-border)" }}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = "var(--cm-surface-hover)"}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = "transparent"}>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        {u.logo_url ? (
                          <img src={u.logo_url} alt="" className="w-6 h-6 rounded object-contain" style={{ backgroundColor: "var(--cm-surface-2)" }} />
                        ) : (
                          <div className="w-6 h-6 rounded flex items-center justify-center" style={{ backgroundColor: "var(--cm-surface-2)" }}>
                            <GraduationCap className="w-3 h-3" style={{ color: "var(--cm-text-4)" }} />
                          </div>
                        )}
                        <span className="text-[11px] font-semibold truncate max-w-[180px]" style={{ color: "var(--cm-text)" }}>
                          {u.university_name}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-[11px]" style={{ color: "var(--cm-text-2)" }}>{u.division || "—"}</td>
                    <td className="px-4 py-2.5 text-[11px]" style={{ color: u.primary_coach ? "var(--cm-text-2)" : "var(--cm-text-4)" }}>
                      {u.primary_coach || <span className="italic">Missing</span>}
                    </td>
                    <td className="px-4 py-2.5 text-[11px] font-mono" style={{ color: u.coach_email ? "var(--cm-text-2)" : "#ef4444" }}>
                      {u.coach_email || <span className="flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Missing</span>}
                    </td>
                    <td className="px-4 py-2.5 text-[11px]" style={{ color: u.recruiting_coordinator ? "var(--cm-text-2)" : "var(--cm-text-4)" }}>
                      {u.recruiting_coordinator || "—"}
                    </td>
                    <td className="px-4 py-2.5 text-[11px]" style={{ color: "var(--cm-text-3)" }}>{u.region || "—"}</td>
                    <td className="px-4 py-2.5">
                      <button onClick={() => { setEditingUni(u.university_name); setEditForm({ primary_coach: u.primary_coach || "", coach_email: u.coach_email || "", recruiting_coordinator: u.recruiting_coordinator || "", coordinator_email: u.coordinator_email || "", division: u.division || "", region: u.region || "" }); }}
                        className="p-1 rounded" style={{ color: "var(--cm-text-4)" }}
                        data-testid={`edit-uni-${i}`}>
                        <Edit2 className="w-3 h-3" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t" style={{ borderColor: "var(--cm-border)" }}>
            <span className="text-[10px]" style={{ color: "var(--cm-text-3)" }}>
              Page {page} of {totalPages} ({total} schools)
            </span>
            <div className="flex gap-1">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="p-1.5 rounded-lg" style={{ backgroundColor: "var(--cm-surface-2)" }}>
                <ChevronLeft className="w-3 h-3" style={{ color: "var(--cm-text-3)" }} />
              </button>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                className="p-1.5 rounded-lg" style={{ backgroundColor: "var(--cm-surface-2)" }}>
                <ChevronRight className="w-3 h-3" style={{ color: "var(--cm-text-3)" }} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {editingUni && (
        <>
          <div className="fixed inset-0 bg-black/30 z-[299]" onClick={() => setEditingUni(null)} />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[420px] max-w-[92vw] z-[300] rounded-xl border p-5 space-y-4"
            style={{ backgroundColor: "var(--cm-surface)", borderColor: "var(--cm-border)" }}
            data-testid="edit-university-modal">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold" style={{ color: "var(--cm-text)" }}>Edit: {editingUni}</h3>
              <button onClick={() => setEditingUni(null)} className="p-1 rounded" style={{ color: "var(--cm-text-4)" }}>
                <X className="w-4 h-4" />
              </button>
            </div>
            {["primary_coach", "coach_email", "recruiting_coordinator", "coordinator_email", "division", "region"].map(field => (
              <div key={field}>
                <label className="text-[10px] font-bold uppercase tracking-[1px] mb-1 block" style={{ color: "var(--cm-text-3)" }}>
                  {field.replace(/_/g, " ")}
                </label>
                <input
                  value={editForm[field] || ""}
                  onChange={e => setEditForm(prev => ({ ...prev, [field]: e.target.value }))}
                  className="w-full px-3 py-2 text-xs rounded-lg border outline-none"
                  style={{ backgroundColor: "var(--cm-surface-2)", borderColor: "var(--cm-border)", color: "var(--cm-text)" }}
                />
              </div>
            ))}
            <div className="flex gap-2 pt-1">
              <button onClick={saveEdit} disabled={saving}
                className="flex-1 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1"
                style={{ background: "linear-gradient(135deg, #1a8a80, #25a99e)", color: "#fff" }}>
                {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3" />}
                Save
              </button>
              <button onClick={() => setEditingUni(null)}
                className="px-4 py-2 rounded-lg text-xs font-bold"
                style={{ backgroundColor: "var(--cm-surface-2)", color: "var(--cm-text-3)" }}>
                Cancel
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, UserPlus, ChevronLeft, ChevronRight, X } from "lucide-react";
import { Input } from "../../components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { Button } from "../../components/ui/button";
import axios from "axios";
import { toast } from "sonner";

const API = process.env.REACT_APP_BACKEND_URL + "/api";

const PLAN_BADGE = {
  basic: "bg-zinc-500/15 text-zinc-400 border-zinc-500/20",
  pro: "bg-teal-600/15 text-teal-500 border-teal-500/20",
  premium: "bg-amber-500/15 text-amber-400 border-amber-500/20",
};

const STATUS_BADGE = {
  active: "bg-teal-600/15 text-teal-500",
  suspended: "bg-amber-500/15 text-amber-400",
  deactivated: "bg-red-500/15 text-red-400",
};

function CreateUserModal({ open, onClose, onCreated }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [plan, setPlan] = useState("basic");
  const [saving, setSaving] = useState(false);

  if (!open) return null;

  const handleCreate = async () => {
    if (!name.trim() || !email.trim()) {
      toast.error("Name and email are required");
      return;
    }
    setSaving(true);
    try {
      await axios.post(`${API}/admin/users`, { name: name.trim(), email: email.trim(), plan });
      toast.success("User created");
      setName(""); setEmail(""); setPlan("basic");
      onCreated();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to create user");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)" }} onClick={onClose}>
      <div
        className="w-full max-w-md rounded-xl border p-6 shadow-2xl"
        style={{ backgroundColor: "var(--cm-surface)", borderColor: "var(--cm-border)" }}
        onClick={e => e.stopPropagation()}
        data-testid="create-user-modal"
      >
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-base font-semibold" style={{ color: "var(--cm-text)" }}>Create New User</h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:opacity-70"><X className="w-4 h-4" style={{ color: "var(--cm-text-3)" }} /></button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium mb-1.5 block" style={{ color: "var(--cm-text-2)" }}>Name</label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="Athlete name" className="text-sm" style={{ backgroundColor: "var(--cm-surface-2)", borderColor: "var(--cm-border)", color: "var(--cm-text)" }} data-testid="create-user-name" />
          </div>
          <div>
            <label className="text-xs font-medium mb-1.5 block" style={{ color: "var(--cm-text-2)" }}>Email</label>
            <Input value={email} onChange={e => setEmail(e.target.value)} placeholder="athlete@email.com" className="text-sm" style={{ backgroundColor: "var(--cm-surface-2)", borderColor: "var(--cm-border)", color: "var(--cm-text)" }} data-testid="create-user-email" />
          </div>
          <div>
            <label className="text-xs font-medium mb-1.5 block" style={{ color: "var(--cm-text-2)" }}>Plan</label>
            <Select value={plan} onValueChange={setPlan}>
              <SelectTrigger className="text-sm" style={{ backgroundColor: "var(--cm-surface-2)", borderColor: "var(--cm-border)", color: "var(--cm-text)" }} data-testid="create-user-plan">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="basic">Basic</SelectItem>
                <SelectItem value="pro">Pro</SelectItem>
                <SelectItem value="premium">Premium</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <Button variant="outline" onClick={onClose} className="text-xs" style={{ borderColor: "var(--cm-border)", color: "var(--cm-text-2)" }}>Cancel</Button>
          <Button onClick={handleCreate} disabled={saving} className="text-xs" style={{ background: "#0d9488", color: "white" }} data-testid="create-user-submit">
            {saving ? "Creating..." : "Create User"}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [planFilter, setPlanFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [showCreate, setShowCreate] = useState(false);
  const navigate = useNavigate();

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const params = { page, limit: 50 };
      if (search) params.search = search;
      if (planFilter !== "all") params.plan = planFilter;
      const res = await axios.get(`${API}/admin/users`, { params });
      setUsers(res.data.users);
      setTotal(res.data.total);
    } catch {
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchUsers(); }, [search, planFilter, page]);

  const totalPages = Math.ceil(total / 50);

  return (
    <div className="space-y-4" data-testid="admin-users-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold" style={{ color: "var(--cm-text)" }}>User Management</h1>
        <span className="text-xs" style={{ color: "var(--cm-text-3)" }}>{total} total users</span>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 lg:gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--cm-text-4)" }} />
          <Input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search by name or email..."
            className="pl-9 text-sm"
            style={{ backgroundColor: "var(--cm-surface)", borderColor: "var(--cm-border)", color: "var(--cm-text)" }}
            data-testid="admin-users-search"
          />
        </div>
        <Select value={planFilter} onValueChange={v => { setPlanFilter(v); setPage(1); }}>
          <SelectTrigger className="w-32 text-xs" style={{ backgroundColor: "var(--cm-surface)", borderColor: "var(--cm-border)", color: "var(--cm-text-2)" }} data-testid="admin-users-plan-filter">
            <SelectValue placeholder="All Plans" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Plans</SelectItem>
            <SelectItem value="basic">Basic</SelectItem>
            <SelectItem value="pro">Pro</SelectItem>
            <SelectItem value="premium">Premium</SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={() => setShowCreate(true)} className="text-xs ml-auto" style={{ background: "#0d9488", color: "white" }} data-testid="admin-create-user-btn">
          <UserPlus className="w-4 h-4 mr-1.5" strokeWidth={1.5} /> New User
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: "var(--cm-surface)", borderColor: "var(--cm-border)" }}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm" data-testid="admin-users-table">
            <thead>
              <tr className="border-b" style={{ borderColor: "var(--cm-border)" }}>
                <th className="text-left px-4 py-3 text-xs font-medium" style={{ color: "var(--cm-text-3)" }}>User</th>
                <th className="text-left px-4 py-3 text-xs font-medium hidden md:table-cell" style={{ color: "var(--cm-text-3)" }}>Email</th>
                <th className="text-left px-4 py-3 text-xs font-medium" style={{ color: "var(--cm-text-3)" }}>Plan</th>
                <th className="text-left px-4 py-3 text-xs font-medium hidden lg:table-cell" style={{ color: "var(--cm-text-3)" }}>Schools</th>
                <th className="text-left px-4 py-3 text-xs font-medium hidden lg:table-cell" style={{ color: "var(--cm-text-3)" }}>Interactions</th>
                <th className="text-left px-4 py-3 text-xs font-medium hidden md:table-cell" style={{ color: "var(--cm-text-3)" }}>Status</th>
                <th className="text-left px-4 py-3 text-xs font-medium hidden xl:table-cell" style={{ color: "var(--cm-text-3)" }}>Joined</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="text-center py-12"><div className="w-6 h-6 border-2 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto" /></td></tr>
              ) : users.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-12 text-xs" style={{ color: "var(--cm-text-3)" }}>No users found</td></tr>
              ) : (
                users.map(u => (
                  <tr
                    key={u.user_id}
                    onClick={() => navigate(`/admin/users/${u.user_id}`)}
                    className="border-b cursor-pointer transition-colors hover:opacity-80"
                    style={{ borderColor: "rgba(255,255,255,0.04)" }}
                    data-testid={`admin-user-row-${u.user_id}`}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0" style={{ backgroundColor: "rgba(13,148,136,0.15)", color: "#0d9488" }}>
                          {(u.athlete_name || "?").charAt(0).toUpperCase()}
                        </div>
                        <span className="font-medium text-[13px] truncate" style={{ color: "var(--cm-text)" }}>
                          {u.athlete_name || u.name}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className="text-xs truncate" style={{ color: "var(--cm-text-3)" }}>{u.email}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${PLAN_BADGE[u.plan] || PLAN_BADGE.basic}`}>
                        {(u.plan || "basic").charAt(0).toUpperCase() + (u.plan || "basic").slice(1)}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <span className="text-xs font-medium" style={{ color: "var(--cm-text)" }}>{u.school_count}</span>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <span className="text-xs font-medium" style={{ color: "var(--cm-text)" }}>{u.interaction_count}</span>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${STATUS_BADGE[u.status] || STATUS_BADGE.active}`}>
                        {(u.status || "active").charAt(0).toUpperCase() + (u.status || "active").slice(1)}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden xl:table-cell">
                      <span className="text-xs" style={{ color: "var(--cm-text-3)" }}>
                        {u.created_at ? new Date(u.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "-"}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t" style={{ borderColor: "var(--cm-border)" }}>
            <span className="text-xs" style={{ color: "var(--cm-text-3)" }}>{total} users</span>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="p-1.5 rounded-lg hover:opacity-70 disabled:opacity-30">
                <ChevronLeft className="w-4 h-4" style={{ color: "var(--cm-text-3)" }} />
              </button>
              <span className="text-xs px-2" style={{ color: "var(--cm-text)" }}>{page} / {totalPages}</span>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="p-1.5 rounded-lg hover:opacity-70 disabled:opacity-30">
                <ChevronRight className="w-4 h-4" style={{ color: "var(--cm-text-3)" }} />
              </button>
            </div>
          </div>
        )}
      </div>

      <CreateUserModal open={showCreate} onClose={() => setShowCreate(false)} onCreated={fetchUsers} />
    </div>
  );
}

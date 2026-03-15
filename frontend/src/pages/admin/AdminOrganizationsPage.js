import { useEffect, useState, useCallback } from "react";
import { Search, Plus, X, Building2, Users, GraduationCap, Trash2, UserPlus, ChevronRight, ArrowLeft } from "lucide-react";
import { Input } from "../../components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { Button } from "../../components/ui/button";
import axios from "axios";
import { toast } from "sonner";

const API = process.env.REACT_APP_BACKEND_URL + "/api";

const PLAN_BADGE = {
  free: "bg-zinc-500/15 text-zinc-400 border-zinc-500/20",
  basic: "bg-zinc-500/15 text-zinc-400 border-zinc-500/20",
  pro: "bg-teal-600/15 text-teal-500 border-teal-500/20",
  premium: "bg-amber-500/15 text-amber-400 border-amber-500/20",
};

function CreateOrgModal({ open, onClose, onCreated }) {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [plan, setPlan] = useState("free");
  const [saving, setSaving] = useState(false);

  if (!open) return null;

  const handleCreate = async () => {
    if (!name.trim()) { toast.error("Name is required"); return; }
    setSaving(true);
    try {
      await axios.post(`${API}/organizations`, { name: name.trim(), slug: slug.trim() || undefined, plan });
      toast.success("Organization created");
      setName(""); setSlug(""); setPlan("free");
      onCreated();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to create organization");
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)" }} onClick={onClose}>
      <div className="w-full max-w-md rounded-xl border p-6 shadow-2xl" style={{ backgroundColor: "var(--cm-surface)", borderColor: "var(--cm-border)" }} onClick={e => e.stopPropagation()} data-testid="create-org-modal">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-base font-semibold" style={{ color: "var(--cm-text)" }}>Create Organization</h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:opacity-70"><X className="w-4 h-4" style={{ color: "var(--cm-text-3)" }} /></button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium mb-1.5 block" style={{ color: "var(--cm-text-2)" }}>Name</label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="Club name" className="text-sm" style={{ backgroundColor: "var(--cm-surface-2)", borderColor: "var(--cm-border)", color: "var(--cm-text)" }} data-testid="create-org-name" />
          </div>
          <div>
            <label className="text-xs font-medium mb-1.5 block" style={{ color: "var(--cm-text-2)" }}>Slug <span className="font-normal" style={{ color: "var(--cm-text-4)" }}>(optional)</span></label>
            <Input value={slug} onChange={e => setSlug(e.target.value)} placeholder="Auto-generated from name" className="text-sm" style={{ backgroundColor: "var(--cm-surface-2)", borderColor: "var(--cm-border)", color: "var(--cm-text)" }} data-testid="create-org-slug" />
          </div>
          <div>
            <label className="text-xs font-medium mb-1.5 block" style={{ color: "var(--cm-text-2)" }}>Plan</label>
            <Select value={plan} onValueChange={setPlan}>
              <SelectTrigger className="text-sm" style={{ backgroundColor: "var(--cm-surface-2)", borderColor: "var(--cm-border)", color: "var(--cm-text)" }} data-testid="create-org-plan">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="free">Free</SelectItem>
                <SelectItem value="basic">Basic</SelectItem>
                <SelectItem value="pro">Pro</SelectItem>
                <SelectItem value="premium">Premium</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <Button variant="outline" onClick={onClose} className="text-xs" style={{ borderColor: "var(--cm-border)", color: "var(--cm-text-2)" }}>Cancel</Button>
          <Button onClick={handleCreate} disabled={saving} className="text-xs" style={{ background: "#0d9488", color: "white" }} data-testid="create-org-submit">
            {saving ? "Creating..." : "Create Organization"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function AddMemberModal({ open, onClose, orgId, onAdded }) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("athlete");
  const [saving, setSaving] = useState(false);

  if (!open) return null;

  const handleAdd = async () => {
    if (!email.trim()) { toast.error("Email is required"); return; }
    setSaving(true);
    try {
      const res = await axios.post(`${API}/organizations/${orgId}/members`, { email: email.trim(), role });
      toast.success(res.data.message || `${res.data.name || "User"} added as ${role}`);
      setEmail(""); setRole("athlete");
      onAdded();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to add member");
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)" }} onClick={onClose}>
      <div className="w-full max-w-md rounded-xl border p-6 shadow-2xl" style={{ backgroundColor: "var(--cm-surface)", borderColor: "var(--cm-border)" }} onClick={e => e.stopPropagation()} data-testid="add-member-modal">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-base font-semibold" style={{ color: "var(--cm-text)" }}>Add Member</h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:opacity-70"><X className="w-4 h-4" style={{ color: "var(--cm-text-3)" }} /></button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium mb-1.5 block" style={{ color: "var(--cm-text-2)" }}>User Email</label>
            <Input value={email} onChange={e => setEmail(e.target.value)} placeholder="user@email.com" className="text-sm" style={{ backgroundColor: "var(--cm-surface-2)", borderColor: "var(--cm-border)", color: "var(--cm-text)" }} data-testid="add-member-email" />
          </div>
          <div>
            <label className="text-xs font-medium mb-1.5 block" style={{ color: "var(--cm-text-2)" }}>Role</label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger className="text-sm" style={{ backgroundColor: "var(--cm-surface-2)", borderColor: "var(--cm-border)", color: "var(--cm-text)" }} data-testid="add-member-role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="athlete">Athlete</SelectItem>
                <SelectItem value="club_coach">Coach</SelectItem>
                <SelectItem value="director">Director</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <Button variant="outline" onClick={onClose} className="text-xs" style={{ borderColor: "var(--cm-border)", color: "var(--cm-text-2)" }}>Cancel</Button>
          <Button onClick={handleAdd} disabled={saving} className="text-xs" style={{ background: "#0d9488", color: "white" }} data-testid="add-member-submit">
            {saving ? "Adding..." : "Add Member"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function OrgDetail({ org, onBack, onRefresh }) {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [plan, setPlan] = useState(org.plan || "free");
  const [savingPlan, setSavingPlan] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);

  const fetchDetail = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/organizations/${org.id}`);
      setDetail(res.data);
      setPlan(res.data.plan || "free");
    } catch { toast.error("Failed to load org details"); }
    finally { setLoading(false); }
  }, [org.id]);

  useEffect(() => { fetchDetail(); }, [fetchDetail]);

  const updatePlan = async () => {
    setSavingPlan(true);
    try {
      await axios.put(`${API}/organizations/${org.id}`, { plan });
      toast.success("Plan updated");
      fetchDetail();
      onRefresh();
    } catch (err) { toast.error(err.response?.data?.detail || "Failed to update"); }
    finally { setSavingPlan(false); }
  };

  const removeMember = async (userId, name) => {
    if (!window.confirm(`Remove ${name} from this organization?`)) return;
    try {
      await axios.delete(`${API}/organizations/${org.id}/members/${userId}`);
      toast.success(`${name} removed`);
      fetchDetail();
      onRefresh();
    } catch (err) { toast.error(err.response?.data?.detail || "Failed to remove member"); }
  };

  if (loading) return <div className="flex items-center justify-center py-20"><div className="w-6 h-6 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" /></div>;
  if (!detail) return null;

  const allMembers = [
    ...(detail.directors || []).map(m => ({ ...m, role: "Director" })),
    ...(detail.coaches || []).map(m => ({ ...m, role: "Coach" })),
    ...(detail.athletes || []).map(m => ({ ...m, role: "Athlete" })),
  ];

  return (
    <div className="space-y-5" data-testid="org-detail-view">
      <button onClick={onBack} className="flex items-center gap-1.5 text-xs font-medium hover:opacity-70 transition-opacity" style={{ color: "var(--cm-text-3)" }} data-testid="org-detail-back">
        <ArrowLeft className="w-3.5 h-3.5" /> Back to Organizations
      </button>

      {/* Header */}
      <div className="rounded-xl border p-5" style={{ backgroundColor: "var(--cm-surface)", borderColor: "var(--cm-border)" }}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold" style={{ color: "var(--cm-text)" }} data-testid="org-detail-name">{detail.name}</h2>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-xs" style={{ color: "var(--cm-text-4)" }}>slug: {detail.slug}</span>
              <span className="text-xs" style={{ color: "var(--cm-text-4)" }}>ID: {detail.id}</span>
            </div>
          </div>
          <div className="flex items-center gap-4 text-center">
            <div>
              <div className="text-xl font-bold" style={{ color: "var(--cm-text)" }}>{detail.member_count}</div>
              <div className="text-[10px]" style={{ color: "var(--cm-text-4)" }}>Members</div>
            </div>
            <div>
              <div className="text-xl font-bold" style={{ color: "var(--cm-text)" }}>{detail.athlete_count}</div>
              <div className="text-[10px]" style={{ color: "var(--cm-text-4)" }}>Athletes</div>
            </div>
          </div>
        </div>
      </div>

      {/* Plan Management */}
      <div className="rounded-xl border p-5" style={{ backgroundColor: "var(--cm-surface)", borderColor: "var(--cm-border)" }}>
        <h3 className="text-sm font-semibold mb-3" style={{ color: "var(--cm-text)" }}>Subscription Plan</h3>
        <div className="flex items-center gap-3">
          <Select value={plan} onValueChange={setPlan}>
            <SelectTrigger className="w-40 text-sm" style={{ backgroundColor: "var(--cm-surface-2)", borderColor: "var(--cm-border)", color: "var(--cm-text)" }} data-testid="org-plan-select">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="free">Free</SelectItem>
              <SelectItem value="basic">Basic</SelectItem>
              <SelectItem value="pro">Pro</SelectItem>
              <SelectItem value="premium">Premium</SelectItem>
            </SelectContent>
          </Select>
          {plan !== (detail.plan || "free") && (
            <Button onClick={updatePlan} disabled={savingPlan} className="text-xs" style={{ background: "#0d9488", color: "white" }} data-testid="org-plan-save">
              {savingPlan ? "Saving..." : "Update Plan"}
            </Button>
          )}
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${PLAN_BADGE[detail.plan] || PLAN_BADGE.free}`}>
            Current: {(detail.plan || "free").charAt(0).toUpperCase() + (detail.plan || "free").slice(1)}
          </span>
        </div>
      </div>

      {/* Members */}
      <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: "var(--cm-surface)", borderColor: "var(--cm-border)" }}>
        <div className="flex items-center justify-between px-5 py-3 border-b" style={{ borderColor: "var(--cm-border)" }}>
          <h3 className="text-sm font-semibold" style={{ color: "var(--cm-text)" }}>Members ({allMembers.length})</h3>
          <Button onClick={() => setShowAddMember(true)} className="text-xs h-8" style={{ background: "#0d9488", color: "white" }} data-testid="org-add-member-btn">
            <UserPlus className="w-3.5 h-3.5 mr-1" /> Add Member
          </Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm" data-testid="org-members-table">
            <thead>
              <tr className="border-b" style={{ borderColor: "var(--cm-border)" }}>
                <th className="text-left px-5 py-2.5 text-xs font-medium" style={{ color: "var(--cm-text-3)" }}>Name</th>
                <th className="text-left px-5 py-2.5 text-xs font-medium hidden md:table-cell" style={{ color: "var(--cm-text-3)" }}>Email</th>
                <th className="text-left px-5 py-2.5 text-xs font-medium" style={{ color: "var(--cm-text-3)" }}>Role</th>
                <th className="text-right px-5 py-2.5 text-xs font-medium" style={{ color: "var(--cm-text-3)" }}></th>
              </tr>
            </thead>
            <tbody>
              {allMembers.length === 0 ? (
                <tr><td colSpan={4} className="text-center py-8 text-xs" style={{ color: "var(--cm-text-3)" }}>No members</td></tr>
              ) : allMembers.map(m => (
                <tr key={m.id} className="border-b" style={{ borderColor: "rgba(255,255,255,0.04)" }} data-testid={`org-member-${m.id}`}>
                  <td className="px-5 py-2.5">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0" style={{ backgroundColor: "rgba(13,148,136,0.15)", color: "#0d9488" }}>
                        {(m.name || "?").charAt(0).toUpperCase()}
                      </div>
                      <span className="text-[13px] font-medium" style={{ color: "var(--cm-text)" }}>{m.name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-2.5 hidden md:table-cell"><span className="text-xs" style={{ color: "var(--cm-text-3)" }}>{m.email}</span></td>
                  <td className="px-5 py-2.5">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${
                      m.role === "Director" ? "bg-amber-500/15 text-amber-400" :
                      m.role === "Coach" ? "bg-blue-500/15 text-blue-400" :
                      "bg-teal-600/15 text-teal-500"
                    }`}>{m.role}</span>
                  </td>
                  <td className="px-5 py-2.5 text-right">
                    <button onClick={() => removeMember(m.id, m.name)} className="p-1.5 rounded-lg hover:bg-red-500/10 transition-colors" title="Remove member" data-testid={`remove-member-${m.id}`}>
                      <Trash2 className="w-3.5 h-3.5 text-red-400" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <AddMemberModal open={showAddMember} onClose={() => setShowAddMember(false)} orgId={org.id} onAdded={fetchDetail} />
    </div>
  );
}

export default function AdminOrganizationsPage() {
  const [orgs, setOrgs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [planFilter, setPlanFilter] = useState("all");
  const [showCreate, setShowCreate] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState(null);

  const fetchOrgs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/organizations`);
      setOrgs(res.data.organizations || []);
    } catch { toast.error("Failed to load organizations"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchOrgs(); }, [fetchOrgs]);

  const deleteOrg = async (org) => {
    if (!window.confirm(`Delete "${org.name}"? All members will be unlinked.`)) return;
    try {
      await axios.delete(`${API}/organizations/${org.id}`);
      toast.success("Organization deleted");
      fetchOrgs();
    } catch (err) { toast.error(err.response?.data?.detail || "Failed to delete"); }
  };

  if (selectedOrg) {
    return <OrgDetail org={selectedOrg} onBack={() => setSelectedOrg(null)} onRefresh={fetchOrgs} />;
  }

  const filtered = orgs.filter(o => {
    if (search && !o.name.toLowerCase().includes(search.toLowerCase()) && !(o.slug || "").toLowerCase().includes(search.toLowerCase())) return false;
    if (planFilter !== "all" && (o.plan || "free") !== planFilter) return false;
    return true;
  });

  return (
    <div className="space-y-4" data-testid="admin-orgs-page">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold" style={{ color: "var(--cm-text)" }}>Organizations</h1>
        <span className="text-xs" style={{ color: "var(--cm-text-3)" }}>{orgs.length} total</span>
      </div>

      <div className="flex flex-wrap items-center gap-2 lg:gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--cm-text-4)" }} />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or slug..." className="pl-9 text-sm" style={{ backgroundColor: "var(--cm-surface)", borderColor: "var(--cm-border)", color: "var(--cm-text)" }} data-testid="admin-orgs-search" />
        </div>
        <Select value={planFilter} onValueChange={setPlanFilter}>
          <SelectTrigger className="w-32 text-xs" style={{ backgroundColor: "var(--cm-surface)", borderColor: "var(--cm-border)", color: "var(--cm-text-2)" }} data-testid="admin-orgs-plan-filter">
            <SelectValue placeholder="All Plans" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Plans</SelectItem>
            <SelectItem value="free">Free</SelectItem>
            <SelectItem value="basic">Basic</SelectItem>
            <SelectItem value="pro">Pro</SelectItem>
            <SelectItem value="premium">Premium</SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={() => setShowCreate(true)} className="text-xs ml-auto" style={{ background: "#0d9488", color: "white" }} data-testid="admin-create-org-btn">
          <Plus className="w-4 h-4 mr-1.5" /> New Organization
        </Button>
      </div>

      <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: "var(--cm-surface)", borderColor: "var(--cm-border)" }}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm" data-testid="admin-orgs-table">
            <thead>
              <tr className="border-b" style={{ borderColor: "var(--cm-border)" }}>
                <th className="text-left px-4 py-3 text-xs font-medium" style={{ color: "var(--cm-text-3)" }}>Organization</th>
                <th className="text-left px-4 py-3 text-xs font-medium hidden md:table-cell" style={{ color: "var(--cm-text-3)" }}>Slug</th>
                <th className="text-left px-4 py-3 text-xs font-medium" style={{ color: "var(--cm-text-3)" }}>Plan</th>
                <th className="text-left px-4 py-3 text-xs font-medium" style={{ color: "var(--cm-text-3)" }}>Members</th>
                <th className="text-left px-4 py-3 text-xs font-medium hidden lg:table-cell" style={{ color: "var(--cm-text-3)" }}>Athletes</th>
                <th className="text-left px-4 py-3 text-xs font-medium hidden lg:table-cell" style={{ color: "var(--cm-text-3)" }}>Created</th>
                <th className="text-right px-4 py-3 text-xs font-medium" style={{ color: "var(--cm-text-3)" }}></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="text-center py-12"><div className="w-6 h-6 border-2 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto" /></td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-12 text-xs" style={{ color: "var(--cm-text-3)" }}>No organizations found</td></tr>
              ) : filtered.map(o => (
                <tr key={o.id} className="border-b cursor-pointer transition-colors hover:opacity-80" style={{ borderColor: "rgba(255,255,255,0.04)" }} data-testid={`admin-org-row-${o.id}`}>
                  <td className="px-4 py-3" onClick={() => setSelectedOrg(o)}>
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: "rgba(13,148,136,0.15)" }}>
                        <Building2 className="w-4 h-4" style={{ color: "#0d9488" }} />
                      </div>
                      <span className="font-medium text-[13px]" style={{ color: "var(--cm-text)" }}>{o.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell" onClick={() => setSelectedOrg(o)}>
                    <span className="text-xs" style={{ color: "var(--cm-text-3)" }}>{o.slug}</span>
                  </td>
                  <td className="px-4 py-3" onClick={() => setSelectedOrg(o)}>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${PLAN_BADGE[o.plan] || PLAN_BADGE.free}`}>
                      {(o.plan || "free").charAt(0).toUpperCase() + (o.plan || "free").slice(1)}
                    </span>
                  </td>
                  <td className="px-4 py-3" onClick={() => setSelectedOrg(o)}>
                    <div className="flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5" style={{ color: "var(--cm-text-4)" }} />
                      <span className="text-xs font-medium" style={{ color: "var(--cm-text)" }}>{o.member_count || 0}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell" onClick={() => setSelectedOrg(o)}>
                    <div className="flex items-center gap-1.5">
                      <GraduationCap className="w-3.5 h-3.5" style={{ color: "var(--cm-text-4)" }} />
                      <span className="text-xs font-medium" style={{ color: "var(--cm-text)" }}>{o.athlete_count || 0}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell" onClick={() => setSelectedOrg(o)}>
                    <span className="text-xs" style={{ color: "var(--cm-text-3)" }}>
                      {o.created_at ? new Date(o.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "-"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={(e) => { e.stopPropagation(); deleteOrg(o); }} className="p-1.5 rounded-lg hover:bg-red-500/10 transition-colors" title="Delete" data-testid={`delete-org-${o.id}`}>
                        <Trash2 className="w-3.5 h-3.5 text-red-400" />
                      </button>
                      <button onClick={() => setSelectedOrg(o)} className="p-1.5 rounded-lg hover:opacity-70 transition-opacity" data-testid={`view-org-${o.id}`}>
                        <ChevronRight className="w-4 h-4" style={{ color: "var(--cm-text-3)" }} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <CreateOrgModal open={showCreate} onClose={() => setShowCreate(false)} onCreated={fetchOrgs} />
    </div>
  );
}

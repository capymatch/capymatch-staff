import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { useAuth } from "@/AuthContext";
import { toast } from "sonner";
import {
  Mail, UserPlus, Clock, CheckCircle, XCircle, Trash2, Copy, Users,
  RefreshCw, AlertTriangle, Send, UserCheck, Pencil, X, Shield,
  ChevronDown, MoreHorizontal,
} from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

/* ──────────────────────── Shared components ──────────────────────── */

function StatusBadge({ status }) {
  const styles = {
    pending: "bg-amber-50 text-amber-700 border-amber-200",
    accepted: "bg-emerald-50 text-emerald-700 border-emerald-200",
    expired: "bg-gray-100 text-gray-500 border-gray-200",
    cancelled: "bg-red-50 text-red-600 border-red-200",
    active: "bg-emerald-50 text-emerald-700 border-emerald-200",
    inactive: "bg-gray-100 text-gray-500 border-gray-200",
  };
  const icons = { pending: Clock, accepted: CheckCircle, expired: XCircle, cancelled: XCircle, active: CheckCircle, inactive: XCircle };
  const Icon = icons[status] || Clock;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium border rounded-full uppercase tracking-wider ${styles[status] || styles.pending}`} data-testid={`status-badge-${status}`}>
      <Icon className="w-3 h-3" /> {status}
    </span>
  );
}

function DeliveryBadge({ status, lastError }) {
  const map = {
    sent: { style: "text-emerald-600", icon: CheckCircle, label: "Email sent" },
    failed: { style: "text-red-500", icon: AlertTriangle, label: "Send failed" },
    pending: { style: "text-gray-400", icon: Clock, label: "Sending..." },
  };
  const cfg = map[status] || map.pending;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] ${cfg.style}`} title={lastError || ""} data-testid={`delivery-status-${status}`}>
      <Icon className="w-3 h-3" /> {cfg.label}
    </span>
  );
}

function ConfirmDialog({ title, message, onConfirm, onCancel, confirmLabel = "Confirm", destructive = false }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" data-testid="confirm-dialog">
      <div className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full mx-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-1">{title}</h3>
        <p className="text-xs text-gray-500 mb-5">{message}</p>
        <div className="flex justify-end gap-2">
          <button onClick={onCancel} className="px-3 py-2 text-xs text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-50" data-testid="confirm-cancel-btn">Cancel</button>
          <button onClick={onConfirm} className={`px-4 py-2 text-xs font-medium rounded-lg text-white ${destructive ? "bg-red-600 hover:bg-red-700" : "bg-slate-900 hover:bg-slate-800"}`} data-testid="confirm-action-btn">
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ──────────────────────── Edit Coach Modal ──────────────────────── */

function EditCoachModal({ coach, onSave, onClose }) {
  const [name, setName] = useState(coach.name || "");
  const [team, setTeam] = useState(coach.team || "");
  const [saving, setSaving] = useState(false);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const updates = {};
      if (name !== coach.name) updates.name = name;
      if (team !== (coach.team || "")) updates.team = team || null;
      if (Object.keys(updates).length === 0) { onClose(); return; }
      await axios.put(`${API}/coaches/${coach.id}`, updates);
      toast.success("Coach updated");
      onSave();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to update");
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" data-testid="edit-coach-modal">
      <div className="bg-white rounded-xl shadow-xl p-6 max-w-md w-full mx-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-900">Edit Coach</h3>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 rounded-md" data-testid="close-edit-modal">
            <X className="w-4 h-4" />
          </button>
        </div>
        <form onSubmit={handleSave} className="space-y-3">
          <div>
            <label className="text-[10px] font-medium text-gray-400 uppercase tracking-wider block mb-1">Name</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} required className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-300" data-testid="edit-coach-name" />
          </div>
          <div>
            <label className="text-[10px] font-medium text-gray-400 uppercase tracking-wider block mb-1">Team</label>
            <input type="text" value={team} onChange={(e) => setTeam(e.target.value)} placeholder="Varsity, JV, 2027s..." className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-300" data-testid="edit-coach-team" />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="px-3 py-2 text-xs text-gray-500 hover:text-gray-700">Cancel</button>
            <button type="submit" disabled={saving} className="px-4 py-2 bg-slate-900 text-white text-xs font-medium rounded-lg hover:bg-slate-800 disabled:opacity-50" data-testid="save-coach-btn">
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ──────────────────────── Pending Assignment Banner ──────────────────────── */

function PendingAssignmentBanner({ assignment, onComplete }) {
  const [selected, setSelected] = useState(new Set(assignment.suggested_athletes.map((a) => a.id)));
  const [assigning, setAssigning] = useState(false);
  const [dismissing, setDismissing] = useState(false);

  const toggleAthlete = (id) => {
    setSelected((prev) => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });
  };

  const handleAssign = async () => {
    if (selected.size === 0) { toast.error("Select at least one athlete"); return; }
    setAssigning(true);
    try {
      const res = await axios.post(`${API}/invites/${assignment.invite_id}/assign-athletes`, { athlete_ids: [...selected] });
      toast.success(`${res.data.assigned_count} athlete(s) assigned to ${res.data.coach_name}`);
      onComplete();
    } catch (err) { toast.error(err.response?.data?.detail || "Failed to assign"); }
    finally { setAssigning(false); }
  };

  const handleDismiss = async () => {
    setDismissing(true);
    try { await axios.post(`${API}/invites/${assignment.invite_id}/dismiss-assignment`); toast.success("Dismissed"); onComplete(); }
    catch { toast.error("Failed to dismiss"); }
    finally { setDismissing(false); }
  };

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 mb-4" data-testid="pending-assignment-banner">
      <div className="flex items-start gap-3 mb-3">
        <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center shrink-0">
          <UserCheck className="w-4 h-4 text-amber-700" />
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-amber-900">{assignment.coach_name} joined — assign {assignment.team} athletes?</h3>
          <p className="text-xs text-amber-700 mt-0.5">{assignment.suggested_count} unassigned athlete{assignment.suggested_count !== 1 ? "s" : ""} on {assignment.team}</p>
        </div>
      </div>
      {assignment.suggested_athletes.length > 0 && (
        <>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider">Select athletes</span>
            <button onClick={() => setSelected(new Set(assignment.suggested_athletes.map((a) => a.id)))} className="text-[10px] text-amber-600 hover:text-amber-800 underline">All</button>
            <button onClick={() => setSelected(new Set())} className="text-[10px] text-amber-600 hover:text-amber-800 underline">None</button>
          </div>
          <div className="space-y-1.5 mb-4">
            {assignment.suggested_athletes.map((a) => (
              <label key={a.id} className="flex items-center gap-3 px-3 py-2 bg-white/70 rounded-lg border border-amber-100 cursor-pointer hover:bg-white transition-colors">
                <input type="checkbox" checked={selected.has(a.id)} onChange={() => toggleAthlete(a.id)} className="w-3.5 h-3.5 rounded border-amber-300 text-amber-600 focus:ring-amber-500" />
                <span className="text-sm text-gray-800 flex-1">{a.name}</span>
                <span className="text-[10px] text-amber-500">{a.team}</span>
              </label>
            ))}
          </div>
        </>
      )}
      <div className="flex items-center gap-2">
        <button onClick={handleAssign} disabled={assigning || selected.size === 0} className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium bg-amber-700 text-white rounded-lg hover:bg-amber-800 disabled:opacity-50" data-testid="assign-selected-btn">
          <UserCheck className="w-3 h-3" /> {assigning ? "Assigning..." : `Assign ${selected.size}`}
        </button>
        <button onClick={handleDismiss} disabled={dismissing} className="px-3 py-2 text-xs text-amber-600 hover:text-amber-800 hover:bg-amber-100 rounded-lg">
          {dismissing ? "..." : "Skip for now"}
        </button>
      </div>
    </div>
  );
}

/* ──────────────────────── Active Coaches Tab ──────────────────────── */

function ActiveCoachesTab({ coaches, loading, onRefresh }) {
  const [editingCoach, setEditingCoach] = useState(null);
  const [confirmRemove, setConfirmRemove] = useState(null);
  const [menuOpen, setMenuOpen] = useState(null);

  const handleRemove = async (coach) => {
    try {
      const res = await axios.delete(`${API}/coaches/${coach.id}`);
      toast.success(`${res.data.coach_name} removed${res.data.athletes_unassigned > 0 ? ` · ${res.data.athletes_unassigned} athletes unassigned` : ""}`);
      onRefresh();
    } catch (err) { toast.error(err.response?.data?.detail || "Failed to remove"); }
    finally { setConfirmRemove(null); }
  };

  const toggleStatus = async (coach) => {
    const newStatus = coach.status === "active" ? "inactive" : "active";
    try {
      await axios.put(`${API}/coaches/${coach.id}`, { status: newStatus });
      toast.success(`${coach.name} ${newStatus === "active" ? "activated" : "deactivated"}`);
      onRefresh();
    } catch (err) { toast.error(err.response?.data?.detail || "Failed to update"); }
    setMenuOpen(null);
  };

  if (loading) {
    return <div className="flex items-center justify-center py-16"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-400" /></div>;
  }

  if (coaches.length === 0) {
    return (
      <div className="text-center py-16 bg-white border border-gray-100 rounded-xl" data-testid="no-coaches-empty">
        <Users className="w-10 h-10 text-gray-300 mx-auto mb-3" />
        <p className="text-sm text-gray-500">No active coaches yet</p>
        <p className="text-xs text-gray-400 mt-1">Invite coaches from the Invites tab</p>
      </div>
    );
  }

  return (
    <div className="space-y-2" data-testid="active-coaches-list">
      {coaches.map((coach) => (
        <div key={coach.id} className="bg-white border border-gray-100 rounded-lg p-4 flex items-center justify-between hover:border-gray-200 transition-colors" data-testid={`coach-card-${coach.id}`}>
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0" style={{ background: coach.status === "active" ? "#1e293b" : "#94a3b8" }}>
              {(coach.name || "?").charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                <span className="text-sm font-medium text-gray-900 truncate">{coach.name}</span>
                <StatusBadge status={coach.status || "active"} />
                {coach.team && <span className="text-[10px] text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded">{coach.team}</span>}
              </div>
              <p className="text-xs text-gray-500 truncate">{coach.email}</p>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-[10px] text-gray-400">
                  {coach.athlete_count} athlete{coach.athlete_count !== 1 ? "s" : ""}
                </span>
                {coach.created_at && (
                  <span className="text-[10px] text-gray-400">
                    Joined {new Date(coach.created_at).toLocaleDateString()}
                  </span>
                )}
                {coach.last_active && (
                  <span className="text-[10px] text-gray-400">
                    Last active {new Date(coach.last_active).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="relative flex items-center gap-1 shrink-0 ml-3">
            <button onClick={() => setEditingCoach(coach)} className="p-2 text-gray-400 hover:text-blue-600 transition-colors rounded-md hover:bg-blue-50" title="Edit coach" data-testid={`edit-coach-${coach.id}`}>
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => setMenuOpen(menuOpen === coach.id ? null : coach.id)} className="p-2 text-gray-400 hover:text-gray-600 transition-colors rounded-md hover:bg-gray-50" data-testid={`coach-menu-${coach.id}`}>
              <MoreHorizontal className="w-3.5 h-3.5" />
            </button>
            {menuOpen === coach.id && (
              <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-20 min-w-[160px]" data-testid={`coach-menu-dropdown-${coach.id}`}>
                <button
                  onClick={() => toggleStatus(coach)}
                  className="w-full text-left px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                  data-testid={`toggle-status-${coach.id}`}
                >
                  <Shield className="w-3 h-3" />
                  {coach.status === "active" ? "Deactivate" : "Activate"}
                </button>
                <button
                  onClick={() => { setConfirmRemove(coach); setMenuOpen(null); }}
                  className="w-full text-left px-3 py-2 text-xs text-red-600 hover:bg-red-50 flex items-center gap-2"
                  data-testid={`remove-coach-${coach.id}`}
                >
                  <Trash2 className="w-3 h-3" />
                  Remove Coach
                </button>
              </div>
            )}
          </div>
        </div>
      ))}

      {editingCoach && (
        <EditCoachModal
          coach={editingCoach}
          onSave={() => { setEditingCoach(null); onRefresh(); }}
          onClose={() => setEditingCoach(null)}
        />
      )}

      {confirmRemove && (
        <ConfirmDialog
          title={`Remove ${confirmRemove.name}?`}
          message={`This will permanently remove the coach and unassign their ${confirmRemove.athlete_count} athlete${confirmRemove.athlete_count !== 1 ? "s" : ""}. This cannot be undone.`}
          confirmLabel="Remove Coach"
          destructive
          onConfirm={() => handleRemove(confirmRemove)}
          onCancel={() => setConfirmRemove(null)}
        />
      )}
    </div>
  );
}

/* ──────────────────────── Invites Tab ──────────────────────── */

function InvitesTab({ invites, pendingAssignments, loading, onRefresh }) {
  const [showForm, setShowForm] = useState(false);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [team, setTeam] = useState("");
  const [sending, setSending] = useState(false);
  const [resendingId, setResendingId] = useState(null);

  const handleInvite = async (e) => {
    e.preventDefault();
    setSending(true);
    try {
      const res = await axios.post(`${API}/invites`, { email, name, team: team || null });
      if (res.data.delivery_status === "sent") toast.success(`Invite sent to ${email}`);
      else if (res.data.delivery_status === "failed") toast.warning("Invite created but email failed — use copy link");
      setEmail(""); setName(""); setTeam(""); setShowForm(false);
      onRefresh();
    } catch (err) { toast.error(err.response?.data?.detail || "Failed to send invite"); }
    finally { setSending(false); }
  };

  const handleResend = async (inviteId) => {
    setResendingId(inviteId);
    try {
      const res = await axios.post(`${API}/invites/${inviteId}/resend`);
      if (res.data.delivery_status === "sent") toast.success("Invite email resent");
      else toast.warning("Resend failed — use copy link instead");
      onRefresh();
    } catch (err) { toast.error(err.response?.data?.detail || "Failed to resend"); }
    finally { setResendingId(null); }
  };

  const handleCancel = async (inviteId) => {
    try { await axios.delete(`${API}/invites/${inviteId}`); toast.success("Invite cancelled"); onRefresh(); }
    catch (err) { toast.error(err.response?.data?.detail || "Failed to cancel"); }
  };

  const copyInviteLink = (invite) => {
    const link = `${window.location.origin}/invite/${invite.token}`;
    navigator.clipboard.writeText(link).then(() => toast.success("Invite link copied"));
  };

  const pending = invites.filter((i) => i.status === "pending");
  const others = invites.filter((i) => i.status !== "pending");

  if (loading) {
    return <div className="flex items-center justify-center py-16"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-400" /></div>;
  }

  return (
    <div data-testid="invites-tab-content">
      {/* New Invite Button */}
      <div className="flex justify-end mb-4">
        <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 text-white text-xs font-medium rounded-lg hover:bg-slate-800 transition-colors" data-testid="new-invite-btn">
          <UserPlus className="w-3.5 h-3.5" /> New Invite
        </button>
      </div>

      {/* Invite Form */}
      {showForm && (
        <div className="bg-white border border-gray-200 rounded-xl p-5 mb-4" data-testid="invite-form">
          <h2 className="text-sm font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Mail className="w-4 h-4 text-gray-400" /> Send Coach Invite
          </h2>
          <form onSubmit={handleInvite} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-medium text-gray-400 uppercase tracking-wider block mb-1">Coach Name</label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} required placeholder="Coach Thompson" className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-300" data-testid="invite-name-input" />
              </div>
              <div>
                <label className="text-[10px] font-medium text-gray-400 uppercase tracking-wider block mb-1">Email</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="coach@example.com" className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-300" data-testid="invite-email-input" />
              </div>
            </div>
            <div>
              <label className="text-[10px] font-medium text-gray-400 uppercase tracking-wider block mb-1">Team (optional)</label>
              <input type="text" value={team} onChange={(e) => setTeam(e.target.value)} placeholder="Varsity, JV, 2027s..." className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-300" data-testid="invite-team-input" />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button type="button" onClick={() => setShowForm(false)} className="px-3 py-2 text-xs text-gray-500 hover:text-gray-700">Cancel</button>
              <button type="submit" disabled={sending} className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 text-white text-xs font-medium rounded-lg hover:bg-slate-800 disabled:opacity-50" data-testid="send-invite-btn">
                {sending ? <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-white" /> : <Send className="w-3.5 h-3.5" />}
                Send Invite
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Pending Assignment Banners */}
      {pendingAssignments.map((a) => (
        <PendingAssignmentBanner key={a.invite_id} assignment={a} onComplete={onRefresh} />
      ))}

      {/* Invite Lists */}
      {invites.length === 0 ? (
        <div className="text-center py-16 bg-white border border-gray-100 rounded-xl" data-testid="no-invites-empty">
          <Mail className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-500">No invites yet</p>
          <p className="text-xs text-gray-400 mt-1">Send an invite to add coaches to your program</p>
        </div>
      ) : (
        <div className="space-y-3">
          {pending.length > 0 && (
            <div>
              <h3 className="text-[10px] font-bold text-amber-500 uppercase tracking-wider mb-2">Pending Invites</h3>
              <div className="space-y-2">
                {pending.map((inv) => (
                  <div key={inv.id} className="bg-white border border-gray-100 rounded-lg p-4 flex items-center justify-between" data-testid={`invite-${inv.id}`}>
                    <div>
                      <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                        <span className="text-sm font-medium text-gray-900">{inv.name}</span>
                        <StatusBadge status={inv.status} />
                        <DeliveryBadge status={inv.delivery_status} lastError={inv.last_error} />
                        {inv.team && <span className="text-[10px] text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded">{inv.team}</span>}
                      </div>
                      <p className="text-xs text-gray-500">{inv.email}</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">
                        Invited {new Date(inv.created_at).toLocaleDateString()} · Expires {new Date(inv.expires_at).toLocaleDateString()}
                        {inv.resend_count > 0 && <span className="ml-1">· Resent {inv.resend_count}x</span>}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => handleResend(inv.id)} disabled={resendingId === inv.id} className="p-2 text-gray-400 hover:text-blue-600 transition-colors rounded-md hover:bg-blue-50 disabled:opacity-50" title="Resend" data-testid={`resend-invite-${inv.id}`}>
                        {resendingId === inv.id ? <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-blue-500" /> : <RefreshCw className="w-3.5 h-3.5" />}
                      </button>
                      <button onClick={() => copyInviteLink(inv)} className="p-2 text-gray-400 hover:text-slate-700 transition-colors rounded-md hover:bg-gray-50" title="Copy link" data-testid={`copy-invite-${inv.id}`}>
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleCancel(inv.id)} className="p-2 text-gray-400 hover:text-red-500 transition-colors rounded-md hover:bg-red-50" title="Cancel" data-testid={`cancel-invite-${inv.id}`}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {others.length > 0 && (
            <div className="mt-4">
              <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">History</h3>
              <div className="space-y-2">
                {others.map((inv) => (
                  <div key={inv.id} className="bg-white border border-gray-50 rounded-lg p-4 flex items-center justify-between opacity-75" data-testid={`invite-${inv.id}`}>
                    <div>
                      <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                        <span className="text-sm font-medium text-gray-700">{inv.name}</span>
                        <StatusBadge status={inv.status} />
                        {inv.team && <span className="text-[10px] text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded">{inv.team}</span>}
                      </div>
                      <p className="text-xs text-gray-500">{inv.email}</p>
                      {inv.accepted_at && <p className="text-[10px] text-emerald-600 mt-0.5">Accepted {new Date(inv.accepted_at).toLocaleDateString()}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ──────────────────────── Main Page ──────────────────────── */

export default function InvitesPage() {
  const { user, effectiveRole } = useAuth();
  const navigate = useNavigate();
  const role = effectiveRole || user?.role;

  const [activeTab, setActiveTab] = useState("coaches");
  const [coaches, setCoaches] = useState([]);
  const [invites, setInvites] = useState([]);
  const [pendingAssignments, setPendingAssignments] = useState([]);
  const [loadingCoaches, setLoadingCoaches] = useState(true);
  const [loadingInvites, setLoadingInvites] = useState(true);

  useEffect(() => {
    if (role !== "director" && role !== "coach" && role !== "platform_admin") { navigate("/mission-control"); return; }
    fetchCoaches();
    fetchInvites();
    fetchPendingAssignments();
  }, [user, navigate]);

  const fetchCoaches = useCallback(async () => {
    setLoadingCoaches(true);
    try { const res = await axios.get(`${API}/coaches`); setCoaches(res.data); }
    catch { /* silent */ }
    finally { setLoadingCoaches(false); }
  }, []);

  const fetchInvites = useCallback(async () => {
    setLoadingInvites(true);
    try { const res = await axios.get(`${API}/invites`); setInvites(res.data); }
    catch { /* silent */ }
    finally { setLoadingInvites(false); }
  }, []);

  const fetchPendingAssignments = useCallback(async () => {
    try { const res = await axios.get(`${API}/invites/pending-assignments`); setPendingAssignments(res.data); }
    catch { /* silent */ }
  }, []);

  const refreshAll = useCallback(() => {
    fetchCoaches();
    fetchInvites();
    fetchPendingAssignments();
  }, [fetchCoaches, fetchInvites, fetchPendingAssignments]);

  const pendingInviteCount = invites.filter((i) => i.status === "pending").length;

  const tabs = [
    { id: "coaches", label: "Active Coaches", count: coaches.length },
    { id: "invites", label: "Invites", count: pendingInviteCount, countColor: pendingInviteCount > 0 ? "bg-amber-100 text-amber-700" : "" },
  ];

  return (
    <div data-testid="coaches-page">
      <main className="max-w-[800px] mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-lg font-semibold text-gray-900" data-testid="coaches-page-title">Coaches</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            {coaches.length} active coach{coaches.length !== 1 ? "es" : ""} · {pendingInviteCount} pending invite{pendingInviteCount !== 1 ? "s" : ""}
          </p>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 mb-5 border-b border-gray-200" data-testid="coaches-tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`relative px-4 py-2.5 text-xs font-medium transition-colors ${
                activeTab === tab.id
                  ? "text-gray-900"
                  : "text-gray-400 hover:text-gray-600"
              }`}
              data-testid={`tab-${tab.id}`}
            >
              <span className="flex items-center gap-1.5">
                {tab.label}
                {tab.count > 0 && (
                  <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${tab.countColor || "bg-gray-100 text-gray-600"}`}>
                    {tab.count}
                  </span>
                )}
              </span>
              {activeTab === tab.id && (
                <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-gray-900 rounded-full" />
              )}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === "coaches" && (
          <ActiveCoachesTab coaches={coaches} loading={loadingCoaches} onRefresh={refreshAll} />
        )}
        {activeTab === "invites" && (
          <InvitesTab invites={invites} pendingAssignments={pendingAssignments} loading={loadingInvites} onRefresh={refreshAll} />
        )}
      </main>
    </div>
  );
}

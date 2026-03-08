import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { useAuth } from "@/AuthContext";
import { toast } from "sonner";
import {
  Mail, UserPlus, Clock, CheckCircle, XCircle, Trash2, Copy, Users,
  RefreshCw, AlertTriangle, Send, UserCheck,
} from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

function PendingAssignmentBanner({ assignment, onComplete }) {
  const [selected, setSelected] = useState(new Set(assignment.suggested_athletes.map((a) => a.id)));
  const [assigning, setAssigning] = useState(false);
  const [dismissing, setDismissing] = useState(false);

  const toggleAthlete = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const selectAll = () => setSelected(new Set(assignment.suggested_athletes.map((a) => a.id)));
  const selectNone = () => setSelected(new Set());

  const handleAssign = async () => {
    if (selected.size === 0) { toast.error("Select at least one athlete"); return; }
    setAssigning(true);
    try {
      const res = await axios.post(`${API}/invites/${assignment.invite_id}/assign-athletes`, {
        athlete_ids: [...selected],
      });
      toast.success(`${res.data.assigned_count} athlete(s) assigned to ${res.data.coach_name}`);
      onComplete();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to assign");
    } finally {
      setAssigning(false);
    }
  };

  const handleDismiss = async () => {
    setDismissing(true);
    try {
      await axios.post(`${API}/invites/${assignment.invite_id}/dismiss-assignment`);
      toast.success("Assignment suggestion dismissed");
      onComplete();
    } catch (err) {
      toast.error("Failed to dismiss");
    } finally {
      setDismissing(false);
    }
  };

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 mb-6" data-testid="pending-assignment-banner">
      <div className="flex items-start gap-3 mb-4">
        <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center shrink-0">
          <UserCheck className="w-4 h-4 text-amber-700" />
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-amber-900">
            {assignment.coach_name} joined — assign {assignment.team} athletes?
          </h3>
          <p className="text-xs text-amber-700 mt-0.5">
            {assignment.suggested_count} unassigned athlete{assignment.suggested_count !== 1 ? "s" : ""} on {assignment.team}
            {assignment.already_assigned_on_team > 0 && (
              <span className="text-amber-500"> · {assignment.already_assigned_on_team} already assigned to other coaches</span>
            )}
          </p>
        </div>
      </div>

      {assignment.suggested_athletes.length > 0 ? (
        <>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider">Select athletes</span>
            <button onClick={selectAll} className="text-[10px] text-amber-600 hover:text-amber-800 underline">All</button>
            <button onClick={selectNone} className="text-[10px] text-amber-600 hover:text-amber-800 underline">None</button>
          </div>
          <div className="space-y-1.5 mb-4">
            {assignment.suggested_athletes.map((a) => (
              <label key={a.id} className="flex items-center gap-3 px-3 py-2 bg-white/70 rounded-lg border border-amber-100 cursor-pointer hover:bg-white transition-colors" data-testid={`assign-athlete-${a.id}`}>
                <input
                  type="checkbox"
                  checked={selected.has(a.id)}
                  onChange={() => toggleAthlete(a.id)}
                  className="w-3.5 h-3.5 rounded border-amber-300 text-amber-600 focus:ring-amber-500"
                />
                <div className="flex-1">
                  <span className="text-sm text-gray-800">{a.name}</span>
                  <span className="text-[11px] text-gray-400 ml-2">
                    {a.position}{a.grad_year ? ` · '${String(a.grad_year).slice(-2)}` : ""}
                  </span>
                </div>
                <span className="text-[10px] text-amber-500">{a.team}</span>
              </label>
            ))}
          </div>
        </>
      ) : (
        <p className="text-xs text-amber-600 mb-4">No unassigned athletes found on {assignment.team}. You can assign athletes manually from the Roster page.</p>
      )}

      <div className="flex items-center gap-2">
        <button
          onClick={handleAssign}
          disabled={assigning || selected.size === 0}
          className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium bg-amber-700 text-white rounded-lg hover:bg-amber-800 disabled:opacity-50 transition-colors"
          data-testid="assign-selected-btn"
        >
          <UserCheck className="w-3 h-3" />
          {assigning ? "Assigning..." : `Assign ${selected.size} athlete${selected.size !== 1 ? "s" : ""}`}
        </button>
        <button
          onClick={handleDismiss}
          disabled={dismissing}
          className="px-3 py-2 text-xs text-amber-600 hover:text-amber-800 hover:bg-amber-100 rounded-lg transition-colors"
          data-testid="dismiss-assignment-btn"
        >
          {dismissing ? "..." : "Skip for now"}
        </button>
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const styles = {
    pending: "bg-amber-50 text-amber-700 border-amber-200",
    accepted: "bg-emerald-50 text-emerald-700 border-emerald-200",
    expired: "bg-gray-100 text-gray-500 border-gray-200",
    cancelled: "bg-red-50 text-red-600 border-red-200",
  };
  const icons = { pending: Clock, accepted: CheckCircle, expired: XCircle, cancelled: XCircle };
  const Icon = icons[status] || Clock;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium border rounded-full uppercase tracking-wider ${styles[status] || styles.pending}`} data-testid={`invite-status-${status}`}>
      <Icon className="w-3 h-3" />
      {status}
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
      <Icon className="w-3 h-3" />
      {cfg.label}
    </span>
  );
}

export default function InvitesPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [invites, setInvites] = useState([]);
  const [pendingAssignments, setPendingAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [team, setTeam] = useState("");
  const [sending, setSending] = useState(false);
  const [resendingId, setResendingId] = useState(null);

  useEffect(() => {
    if (user?.role !== "director") { navigate("/mission-control"); return; }
    fetchInvites();
    fetchPendingAssignments();
  }, [user, navigate]);

  const fetchInvites = async () => {
    try { const res = await axios.get(`${API}/invites`); setInvites(res.data); }
    catch { toast.error("Failed to load invites"); }
    finally { setLoading(false); }
  };

  const fetchPendingAssignments = async () => {
    try {
      const res = await axios.get(`${API}/invites/pending-assignments`);
      setPendingAssignments(res.data);
    } catch { /* silent */ }
  };

  const handleInvite = async (e) => {
    e.preventDefault();
    setSending(true);
    try {
      const res = await axios.post(`${API}/invites`, { email, name, team: team || null });
      const inv = res.data;
      if (inv.delivery_status === "sent") {
        toast.success(`Invite email sent to ${email}`);
      } else if (inv.delivery_status === "failed") {
        toast.warning(`Invite created but email failed — use copy link as fallback`);
      }
      setEmail(""); setName(""); setTeam(""); setShowForm(false);
      fetchInvites();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to send invite");
    } finally { setSending(false); }
  };

  const handleResend = async (inviteId) => {
    setResendingId(inviteId);
    try {
      const res = await axios.post(`${API}/invites/${inviteId}/resend`);
      if (res.data.delivery_status === "sent") {
        toast.success("Invite email resent");
      } else {
        toast.warning("Resend failed — use copy link instead");
      }
      fetchInvites();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to resend");
    } finally { setResendingId(null); }
  };

  const handleCancel = async (inviteId) => {
    try { await axios.delete(`${API}/invites/${inviteId}`); toast.success("Invite cancelled"); fetchInvites(); }
    catch (err) { toast.error(err.response?.data?.detail || "Failed to cancel"); }
  };

  const copyInviteLink = (invite) => {
    const link = `${window.location.origin}/invite/${invite.token}`;
    navigator.clipboard.writeText(link).then(() => toast.success("Invite link copied"));
  };

  const pending = invites.filter((i) => i.status === "pending");
  const others = invites.filter((i) => i.status !== "pending");

  return (
    <div data-testid="invites-page">
      <main className="max-w-[800px] mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-lg font-semibold text-gray-900" data-testid="invites-title">Invite Coaches</h1>
            <p className="text-xs text-gray-500 mt-0.5">{invites.length} total invites · {pending.length} pending</p>
          </div>
          <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 text-white text-xs font-medium rounded-lg hover:bg-slate-800 transition-colors" data-testid="new-invite-btn">
            <UserPlus className="w-3.5 h-3.5" /> New Invite
          </button>
        </div>

        {showForm && (
          <div className="bg-white border border-gray-200 rounded-xl p-5 mb-6" data-testid="invite-form">
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

        {pendingAssignments.length > 0 && (
          <div data-testid="pending-assignments-section">
            {pendingAssignments.map((a) => (
              <PendingAssignmentBanner
                key={a.invite_id}
                assignment={a}
                onComplete={() => { fetchPendingAssignments(); fetchInvites(); }}
              />
            ))}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-16"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-400" /></div>
        ) : invites.length === 0 ? (
          <div className="text-center py-16 bg-white border border-gray-100 rounded-xl">
            <Users className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-500">No invites yet</p>
            <p className="text-xs text-gray-400 mt-1">Invite coaches to join your program</p>
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
                        <div className="flex items-center gap-2 mb-0.5">
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
                        <button onClick={() => handleResend(inv.id)} disabled={resendingId === inv.id} className="p-2 text-gray-400 hover:text-blue-600 transition-colors rounded-md hover:bg-blue-50 disabled:opacity-50" title="Resend invite email" data-testid={`resend-invite-${inv.id}`}>
                          {resendingId === inv.id ? <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-blue-500" /> : <RefreshCw className="w-3.5 h-3.5" />}
                        </button>
                        <button onClick={() => copyInviteLink(inv)} className="p-2 text-gray-400 hover:text-slate-700 transition-colors rounded-md hover:bg-gray-50" title="Copy invite link" data-testid={`copy-invite-${inv.id}`}>
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => handleCancel(inv.id)} className="p-2 text-gray-400 hover:text-red-500 transition-colors rounded-md hover:bg-red-50" title="Cancel invite" data-testid={`cancel-invite-${inv.id}`}>
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
                        <div className="flex items-center gap-2 mb-0.5">
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
      </main>
    </div>
  );
}

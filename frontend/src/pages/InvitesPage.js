import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import Header from "@/components/mission-control/Header";
import { useAuth } from "@/AuthContext";
import { toast } from "sonner";
import {
  Mail, UserPlus, Clock, CheckCircle, XCircle, Trash2, Copy, Users,
} from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

function StatusBadge({ status }) {
  const styles = {
    pending: "bg-amber-50 text-amber-700 border-amber-200",
    accepted: "bg-emerald-50 text-emerald-700 border-emerald-200",
    expired: "bg-gray-100 text-gray-500 border-gray-200",
    cancelled: "bg-red-50 text-red-600 border-red-200",
  };
  const icons = {
    pending: Clock,
    accepted: CheckCircle,
    expired: XCircle,
    cancelled: XCircle,
  };
  const Icon = icons[status] || Clock;

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium border rounded-full uppercase tracking-wider ${styles[status] || styles.pending}`} data-testid={`invite-status-${status}`}>
      <Icon className="w-3 h-3" />
      {status}
    </span>
  );
}

export default function InvitesPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [invites, setInvites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [team, setTeam] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (user?.role !== "director") {
      navigate("/mission-control");
      return;
    }
    fetchInvites();
  }, [user, navigate]);

  const fetchInvites = async () => {
    try {
      const res = await axios.get(`${API}/invites`);
      setInvites(res.data);
    } catch {
      toast.error("Failed to load invites");
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = async (e) => {
    e.preventDefault();
    setSending(true);
    try {
      await axios.post(`${API}/invites`, {
        email,
        name,
        team: team || null,
      });
      toast.success(`Invite sent to ${email}`);
      setEmail("");
      setName("");
      setTeam("");
      setShowForm(false);
      fetchInvites();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to send invite");
    } finally {
      setSending(false);
    }
  };

  const handleCancel = async (inviteId) => {
    try {
      await axios.delete(`${API}/invites/${inviteId}`);
      toast.success("Invite cancelled");
      fetchInvites();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to cancel");
    }
  };

  const copyInviteLink = (invite) => {
    const link = `${window.location.origin}/invite/${invite.token}`;
    navigator.clipboard.writeText(link).then(() => toast.success("Invite link copied"));
  };

  const pending = invites.filter((i) => i.status === "pending");
  const others = invites.filter((i) => i.status !== "pending");

  return (
    <div className="min-h-screen bg-slate-50" data-testid="invites-page">
      <Header selectedGradYear="all" setSelectedGradYear={() => {}} stats={null} />

      <main className="max-w-[800px] mx-auto px-4 sm:px-6 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-lg font-semibold text-gray-900" data-testid="invites-title">Invite Coaches</h1>
            <p className="text-xs text-gray-500 mt-0.5">
              {invites.length} total invites · {pending.length} pending
            </p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 text-white text-xs font-medium rounded-lg hover:bg-slate-800 transition-colors"
            data-testid="new-invite-btn"
          >
            <UserPlus className="w-3.5 h-3.5" />
            New Invite
          </button>
        </div>

        {/* Invite Form */}
        {showForm && (
          <div className="bg-white border border-gray-200 rounded-xl p-5 mb-6" data-testid="invite-form">
            <h2 className="text-sm font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <Mail className="w-4 h-4 text-gray-400" />
              Send Coach Invite
            </h2>
            <form onSubmit={handleInvite} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-medium text-gray-400 uppercase tracking-wider block mb-1">Coach Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    placeholder="Coach Thompson"
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-300"
                    data-testid="invite-name-input"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-medium text-gray-400 uppercase tracking-wider block mb-1">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="coach@example.com"
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-300"
                    data-testid="invite-email-input"
                  />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-medium text-gray-400 uppercase tracking-wider block mb-1">Team (optional)</label>
                <input
                  type="text"
                  value={team}
                  onChange={(e) => setTeam(e.target.value)}
                  placeholder="Varsity, JV, 2027s..."
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-300"
                  data-testid="invite-team-input"
                />
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-3 py-2 text-xs text-gray-500 hover:text-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={sending}
                  className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 text-white text-xs font-medium rounded-lg hover:bg-slate-800 disabled:opacity-50"
                  data-testid="send-invite-btn"
                >
                  {sending ? (
                    <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-white" />
                  ) : (
                    <Mail className="w-3.5 h-3.5" />
                  )}
                  Send Invite
                </button>
              </div>
            </form>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-400" />
          </div>
        ) : invites.length === 0 ? (
          <div className="text-center py-16 bg-white border border-gray-100 rounded-xl">
            <Users className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-500">No invites yet</p>
            <p className="text-xs text-gray-400 mt-1">Invite coaches to join your program</p>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Pending first */}
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
                          {inv.team && (
                            <span className="text-[10px] text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded">{inv.team}</span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500">{inv.email}</p>
                        <p className="text-[10px] text-gray-400 mt-0.5">
                          Invited {new Date(inv.created_at).toLocaleDateString()} · Expires {new Date(inv.expires_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => copyInviteLink(inv)}
                          className="p-2 text-gray-400 hover:text-slate-700 transition-colors rounded-md hover:bg-gray-50"
                          title="Copy invite link"
                          data-testid={`copy-invite-${inv.id}`}
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleCancel(inv.id)}
                          className="p-2 text-gray-400 hover:text-red-500 transition-colors rounded-md hover:bg-red-50"
                          title="Cancel invite"
                          data-testid={`cancel-invite-${inv.id}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Past invites */}
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
                          {inv.team && (
                            <span className="text-[10px] text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded">{inv.team}</span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500">{inv.email}</p>
                        {inv.accepted_at && (
                          <p className="text-[10px] text-emerald-600 mt-0.5">
                            Accepted {new Date(inv.accepted_at).toLocaleDateString()}
                          </p>
                        )}
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

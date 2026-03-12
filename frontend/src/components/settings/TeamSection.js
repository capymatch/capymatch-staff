import { useState, useEffect, useCallback } from "react";
import {
  Users, UserPlus, Crown, Trash2, Loader2, Mail,
  X, Info, ChevronDown, ChevronUp, Shield, Pencil,
} from "lucide-react";
import axios from "axios";
import { toast } from "sonner";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

function HowItWorks({ isOwner }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mb-5 rounded-xl border overflow-hidden" style={{ borderColor: "rgba(139,92,246,0.2)", backgroundColor: "rgba(139,92,246,0.04)" }} data-testid="team-how-it-works">
      <button onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 text-left transition-colors hover:bg-white/[0.02]"
        data-testid="team-how-it-works-toggle">
        <div className="flex items-center gap-2.5">
          <Info className="w-4 h-4 text-violet-400 flex-shrink-0" />
          <span className="text-sm font-medium text-violet-300">How team collaboration works</span>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-violet-400" /> : <ChevronDown className="w-4 h-4 text-violet-400" />}
      </button>
      {open && (
        <div className="px-4 pb-4 space-y-3" data-testid="team-how-it-works-content">
          {isOwner ? (
            <>
              <div className="flex gap-3">
                <div className="w-7 h-7 rounded-lg bg-amber-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Crown className="w-3.5 h-3.5 text-amber-400" />
                </div>
                <div>
                  <p className="text-sm font-medium" style={{ color: "var(--cm-text)" }}>You are the Owner</p>
                  <p className="text-xs leading-relaxed mt-0.5" style={{ color: "var(--cm-text-3)" }}>
                    You manage billing, subscriptions, and team members. Only you can invite or remove people.
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="w-7 h-7 rounded-lg bg-slate-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <UserPlus className="w-3.5 h-3.5 text-teal-600" />
                </div>
                <div>
                  <p className="text-sm font-medium" style={{ color: "var(--cm-text)" }}>How to invite</p>
                  <p className="text-xs leading-relaxed mt-0.5" style={{ color: "var(--cm-text-3)" }}>
                    Enter their email below and click Invite. They'll see a notification to accept. If they don't have an account yet, they'll need to sign up first with that same email.
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="w-7 h-7 rounded-lg bg-slate-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Pencil className="w-3.5 h-3.5 text-teal-600" />
                </div>
                <div>
                  <p className="text-sm font-medium" style={{ color: "var(--cm-text)" }}>What members can do</p>
                  <p className="text-xs leading-relaxed mt-0.5" style={{ color: "var(--cm-text-3)" }}>
                    Members get full access to your recruiting dashboard — they can add schools, manage the pipeline, use AI tools, and help with outreach. They just can't change billing or manage the team.
                  </p>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="flex gap-3">
                <div className="w-7 h-7 rounded-lg bg-slate-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Users className="w-3.5 h-3.5 text-teal-600" />
                </div>
                <div>
                  <p className="text-sm font-medium" style={{ color: "var(--cm-text)" }}>You are a Member</p>
                  <p className="text-xs leading-relaxed mt-0.5" style={{ color: "var(--cm-text-3)" }}>
                    You have full access to the team's recruiting dashboard — add schools, manage the pipeline, use AI tools, and collaborate.
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="w-7 h-7 rounded-lg bg-amber-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Shield className="w-3.5 h-3.5 text-amber-400" />
                </div>
                <div>
                  <p className="text-sm font-medium" style={{ color: "var(--cm-text)" }}>What's managed by the Owner</p>
                  <p className="text-xs leading-relaxed mt-0.5" style={{ color: "var(--cm-text-3)" }}>
                    Billing, subscription plan, and team membership are controlled by the account owner. You can leave the team anytime.
                  </p>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default function TeamSection() {
  const [team, setTeam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviting, setInviting] = useState(false);

  const fetchTeam = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/team`);
      setTeam(res.data);
    } catch {
      setTeam(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchTeam(); }, [fetchTeam]);

  const handleInvite = async (e) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setInviting(true);
    try {
      await axios.post(`${API}/team/invite`, { email: inviteEmail.trim() });
      toast.success(`Invitation sent to ${inviteEmail}`);
      setInviteEmail("");
      fetchTeam();
    } catch (err) {
      const detail = err.response?.data?.detail;
      if (typeof detail === "string") toast.error(detail);
      else toast.error("Failed to send invitation");
    } finally { setInviting(false); }
  };

  const handleCancelInvite = async (inviteId) => {
    try {
      await axios.delete(`${API}/team/invitations/${inviteId}`);
      toast.success("Invitation cancelled");
      fetchTeam();
    } catch { toast.error("Failed to cancel invitation"); }
  };

  const handleRemoveMember = async (userId, name) => {
    if (!window.confirm(`Remove ${name} from the team?`)) return;
    try {
      await axios.delete(`${API}/team/members/${userId}`);
      toast.success(`${name} removed from team`);
      fetchTeam();
    } catch { toast.error("Failed to remove member"); }
  };

  const handleLeave = async () => {
    if (!window.confirm("Leave this team? You'll return to your own individual account.")) return;
    try {
      await axios.post(`${API}/team/leave`);
      toast.success("You've left the team");
      setTimeout(() => window.location.reload(), 500);
    } catch { toast.error("Failed to leave team"); }
  };

  if (loading) {
    return (
      <div className="rounded-xl p-6 border" style={{ backgroundColor: "var(--cm-surface)", borderColor: "var(--cm-border)" }}>
        <div className="flex items-center gap-3">
          <Loader2 className="w-5 h-5 animate-spin text-teal-600" />
          <span className="text-sm" style={{ color: "var(--cm-text-3)" }}>Loading team...</span>
        </div>
      </div>
    );
  }

  if (!team) return null;

  const isOwner = team.current_user_role === "owner";
  const maxMembers = team.limits.max_members;
  const currentCount = team.limits.current_count;
  const canInvite = isOwner && (maxMembers === -1 || (currentCount + team.pending_invitations.length) < maxMembers);
  const atLimit = isOwner && maxMembers !== -1 && currentCount >= maxMembers && team.pending_invitations.length === 0;

  return (
    <div className="rounded-xl p-6 border" style={{ backgroundColor: "var(--cm-surface)", borderColor: "var(--cm-border)" }} data-testid="team-section">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-violet-500/20 flex items-center justify-center">
            <Users className="w-5 h-5 text-violet-500" />
          </div>
          <div>
            <h2 className="font-semibold text-lg" style={{ color: "var(--cm-text)" }}>Team</h2>
            <p className="text-sm" style={{ color: "var(--cm-text-3)" }}>
              {maxMembers === -1 ? "Unlimited members" : `${currentCount} of ${maxMembers} member${maxMembers !== 1 ? "s" : ""}`}
            </p>
          </div>
        </div>
      </div>

      <HowItWorks isOwner={isOwner} />

      {/* Team Members */}
      <div className="space-y-2 mb-4">
        {team.owner && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl" style={{ backgroundColor: "var(--cm-surface-2)" }} data-testid="team-owner-row">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
              {team.owner.name?.charAt(0) || "O"}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium truncate" style={{ color: "var(--cm-text)" }}>{team.owner.name}</p>
                {isOwner && <span className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-white/5" style={{ color: "var(--cm-text-3)" }}>You</span>}
              </div>
              <p className="text-xs truncate" style={{ color: "var(--cm-text-3)" }}>{team.owner.email}</p>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 text-[10px] font-bold uppercase tracking-wider flex-shrink-0">
              <Crown className="w-3 h-3" /> Owner
            </div>
          </div>
        )}

        {team.members.map((m) => (
          <div key={m.user_id} className="flex items-center gap-3 px-4 py-3 rounded-xl" style={{ backgroundColor: "var(--cm-surface-2)" }} data-testid={`team-member-${m.user_id}`}>
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-slate-500 to-teal-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
              {m.name?.charAt(0) || "M"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate" style={{ color: "var(--cm-text)" }}>{m.name}</p>
              <p className="text-xs truncate" style={{ color: "var(--cm-text-3)" }}>{m.email}</p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="text-[10px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full bg-slate-500/10 text-teal-600">Member</span>
              {isOwner && (
                <button onClick={() => handleRemoveMember(m.user_id, m.name)}
                  className="p-1.5 rounded-lg hover:bg-red-500/10 transition-colors text-white/30 hover:text-red-400"
                  data-testid={`remove-member-${m.user_id}`} title="Remove member">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Pending Invitations */}
      {team.pending_invitations.length > 0 && (
        <div className="mb-4">
          <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--cm-text-3)" }}>Pending Invitations</p>
          {team.pending_invitations.map((inv) => (
            <div key={inv.invite_id} className="flex items-center gap-3 px-4 py-3 rounded-xl border border-dashed" style={{ borderColor: "var(--cm-border)" }} data-testid={`pending-invite-${inv.invite_id}`}>
              <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: "var(--cm-surface-2)" }}>
                <Mail className="w-4 h-4" style={{ color: "var(--cm-text-3)" }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm truncate" style={{ color: "var(--cm-text-2)" }}>{inv.email}</p>
                <p className="text-[10px]" style={{ color: "var(--cm-text-3)" }}>Waiting for them to accept</p>
              </div>
              {isOwner && (
                <button onClick={() => handleCancelInvite(inv.invite_id)}
                  className="p-1.5 rounded-lg hover:bg-white/5 transition-colors"
                  style={{ color: "var(--cm-text-3)" }}
                  data-testid={`cancel-invite-${inv.invite_id}`} title="Cancel invitation">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Invite Form */}
      {isOwner && canInvite && (
        <>
          <p className="text-xs mb-2" style={{ color: "var(--cm-text-3)" }}>
            They'll need to create an account with this email to accept.
          </p>
          <form onSubmit={handleInvite} className="flex gap-2" data-testid="invite-form">
            <div className="flex-1 relative">
              <UserPlus className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--cm-text-3)" }} />
              <input type="email" placeholder="Enter email to invite..." value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)} required data-testid="invite-email-input"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm border focus:outline-none transition-colors"
                style={{ backgroundColor: "var(--cm-input-bg)", borderColor: "var(--cm-border)", color: "var(--cm-text)" }} />
            </div>
            <button type="submit" disabled={inviting} data-testid="invite-submit-btn"
              className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-teal-600 hover:bg-teal-700 transition-all disabled:opacity-50 flex items-center gap-2">
              {inviting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Invite"}
            </button>
          </form>
        </>
      )}

      {isOwner && atLimit && (
        <div className="flex items-center justify-between px-4 py-3 rounded-xl border border-dashed" style={{ borderColor: "rgba(244,63,94,0.3)", backgroundColor: "rgba(244,63,94,0.05)" }}>
          <p className="text-sm" style={{ color: "var(--cm-text-2)" }}>
            Your plan is at its team limit. Upgrade for more members.
          </p>
        </div>
      )}

      {/* Leave button for members */}
      {!isOwner && (
        <button onClick={handleLeave} data-testid="leave-team-btn"
          className="w-full mt-2 px-4 py-2.5 rounded-xl text-sm font-medium border border-red-500/20 text-red-400 hover:bg-red-500/10 transition-colors">
          Leave Team
        </button>
      )}
    </div>
  );
}

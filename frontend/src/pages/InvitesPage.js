import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { useAuth } from "@/AuthContext";
import { toast } from "sonner";
import {
  Mail, UserPlus, Clock, CheckCircle, XCircle, Trash2, Copy, Users,
  RefreshCw, AlertTriangle, Send, UserCheck, Pencil, X, Shield,
  MoreHorizontal, Activity, Calendar, ChevronDown,
} from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

/* ═══════════════════════ Team Dropdown ═══════════════════════ */

function TeamDropdown({ value, onChange, teams, loading }) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full appearance-none px-3 py-2.5 pr-8 text-sm rounded-lg border transition-colors focus:outline-none focus:ring-2 focus:ring-orange-200 cursor-pointer"
        style={{ background: "var(--cm-input-bg)", borderColor: "var(--cm-border)", color: value ? "var(--cm-text)" : "var(--cm-text-3)" }}
        data-testid="team-dropdown"
      >
        <option value="">Select a roster...</option>
        {loading && <option disabled>Loading rosters...</option>}
        {teams.map((t) => (
          <option key={t.name} value={t.name}>
            {t.name}{t.age_group ? ` (${t.age_group})` : ""}{t.athlete_count > 0 ? ` — ${t.athlete_count} athletes` : ""}
          </option>
        ))}
      </select>
      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none" style={{ color: "var(--cm-text-3)" }} />
    </div>
  );
}

/* ═══════════════════════ Utility Helpers ═══════════════════════ */

function coachHealthSignal(coach) {
  if (coach.status === "inactive") return { dot: "bg-gray-400", label: "Inactive", color: "text-gray-500" };
  if (coach.last_active) {
    const days = Math.floor((Date.now() - new Date(coach.last_active).getTime()) / 86400000);
    if (days <= 3) return { dot: "bg-emerald-500", label: "Active", color: "text-emerald-600" };
    if (days <= 7) return { dot: "bg-amber-400", label: "Needs attention", color: "text-amber-600" };
    return { dot: "bg-red-400", label: "Inactive", color: "text-red-500" };
  }
  if (coach.status === "active") return { dot: "bg-emerald-500", label: "Active", color: "text-emerald-600" };
  return { dot: "bg-gray-400", label: "Unknown", color: "text-gray-500" };
}

function timeAgo(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  const now = new Date();
  const days = Math.floor((now - d) / 86400000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/* ═══════════════════════ Confirm Dialog ═══════════════════════ */

function ConfirmDialog({ title, message, onConfirm, onCancel, confirmLabel = "Confirm", destructive = false }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "var(--cm-overlay)" }} data-testid="confirm-dialog">
      <div className="rounded-xl p-6 max-w-sm w-full mx-4" style={{ background: "var(--cm-surface)", boxShadow: "0 20px 60px rgba(0,0,0,0.15)" }}>
        <h3 className="text-sm font-semibold mb-1" style={{ color: "var(--cm-text)" }}>{title}</h3>
        <p className="text-xs mb-5" style={{ color: "var(--cm-text-3)" }}>{message}</p>
        <div className="flex justify-end gap-2">
          <button onClick={onCancel} className="px-3 py-2 text-xs font-medium rounded-lg transition-colors hover:bg-gray-100" style={{ color: "var(--cm-text-2)" }} data-testid="confirm-cancel-btn">Cancel</button>
          <button onClick={onConfirm} className={`px-4 py-2 text-xs font-medium rounded-lg text-white transition-colors ${destructive ? "bg-red-600 hover:bg-red-700" : ""}`} style={!destructive ? { background: "var(--cm-accent)" } : {}} data-testid="confirm-action-btn">
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════ Edit Coach Modal ═══════════════════════ */

function EditCoachModal({ coach, onSave, onClose, teams, teamsLoading }) {
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
    } catch (err) { toast.error(err.response?.data?.detail || "Failed to update"); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "var(--cm-overlay)" }} data-testid="edit-coach-modal">
      <div className="rounded-xl p-6 max-w-md w-full mx-4" style={{ background: "var(--cm-surface)", boxShadow: "0 20px 60px rgba(0,0,0,0.15)" }}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-sm font-semibold" style={{ color: "var(--cm-text)" }}>Edit Coach</h3>
          <button onClick={onClose} className="p-1 rounded-md transition-colors hover:bg-gray-100" style={{ color: "var(--cm-text-3)" }} data-testid="close-edit-modal">
            <X className="w-4 h-4" />
          </button>
        </div>
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-wider block mb-1.5" style={{ color: "var(--cm-text-3)" }}>Name</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} required className="w-full px-3 py-2.5 text-sm rounded-lg border transition-colors focus:outline-none focus:ring-2 focus:ring-orange-200" style={{ background: "var(--cm-input-bg)", borderColor: "var(--cm-border)", color: "var(--cm-text)" }} data-testid="edit-coach-name" />
          </div>
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-wider block mb-1.5" style={{ color: "var(--cm-text-3)" }}>Team</label>
            <TeamDropdown value={team} onChange={setTeam} teams={teams} loading={teamsLoading} />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} className="px-3 py-2.5 text-xs font-medium rounded-lg transition-colors hover:bg-gray-100" style={{ color: "var(--cm-text-2)" }}>Cancel</button>
            <button type="submit" disabled={saving} className="px-5 py-2.5 text-xs font-semibold rounded-lg text-white disabled:opacity-50 transition-colors" style={{ background: "var(--cm-accent)" }} data-testid="save-coach-btn">
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ═══════════════════════ Summary Strip ═══════════════════════ */

function SummaryStrip({ coaches, pendingInviteCount }) {
  const totalAthletes = coaches.reduce((sum, c) => sum + (c.athlete_count || 0), 0);
  const activeCount = coaches.filter(c => (c.status || "active") === "active").length;

  const stats = [
    { label: "Active Coaches", value: activeCount, icon: Users, accent: false },
    { label: "Pending Invites", value: pendingInviteCount, icon: Clock, accent: pendingInviteCount > 0 },
    { label: "Athletes Managed", value: totalAthletes, icon: Activity, accent: false },
    { label: "Avg Response", value: "--", icon: RefreshCw, accent: false, muted: true },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6" data-testid="summary-strip">
      {stats.map((s) => (
        <div
          key={s.label}
          className="rounded-xl px-4 py-3.5 transition-all"
          style={{
            background: "var(--cm-surface)",
            border: `1px solid ${s.accent ? "var(--cm-accent)" : "var(--cm-border-subtle)"}`,
            boxShadow: "var(--cm-shadow)",
          }}
          data-testid={`stat-${s.label.toLowerCase().replace(/\s/g, "-")}`}
        >
          <div className="flex items-center gap-2 mb-2">
            <s.icon className="w-3.5 h-3.5" style={{ color: s.accent ? "var(--cm-accent)" : "var(--cm-text-3)" }} />
            <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--cm-text-3)" }}>{s.label}</span>
          </div>
          <span className={`text-xl font-bold tabular-nums ${s.muted ? "opacity-40" : ""}`} style={{ color: s.accent ? "var(--cm-accent-text)" : "var(--cm-text)" }}>
            {s.value}
          </span>
        </div>
      ))}
    </div>
  );
}

/* ═══════════════════════ Coach Card ═══════════════════════ */

function CoachCard({ coach, onEdit, onToggleStatus, onRemove }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const health = coachHealthSignal(coach);

  return (
    <div
      className="rounded-xl p-5 transition-all hover:translate-y-[-1px]"
      style={{
        background: "var(--cm-surface)",
        border: "1px solid var(--cm-border-subtle)",
        boxShadow: "var(--cm-shadow)",
      }}
      data-testid={`coach-card-${coach.id}`}
    >
      <div className="flex items-start justify-between gap-4">
        {/* Left: Avatar + Identity */}
        <div className="flex items-start gap-3.5 flex-1 min-w-0">
          <div className="relative shrink-0">
            <div
              className="w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold text-white"
              style={{ background: (coach.status || "active") === "active" ? "#1e293b" : "#94a3b8" }}
            >
              {(coach.name || "?").charAt(0).toUpperCase()}
            </div>
            <div className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 ${health.dot}`} style={{ borderColor: "var(--cm-surface)" }} />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-0.5 flex-wrap">
              <span className="text-sm font-semibold truncate" style={{ color: "var(--cm-text)" }}>{coach.name}</span>
              {coach.team && (
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-md" style={{ background: "var(--cm-surface-2)", color: "var(--cm-text-2)" }}>
                  {coach.team}
                </span>
              )}
            </div>
            <p className="text-xs truncate mb-2.5" style={{ color: "var(--cm-text-3)" }}>{coach.email}</p>

            {/* Stats row */}
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-1.5">
                <Users className="w-3 h-3" style={{ color: "var(--cm-text-4)" }} />
                <span className="text-[11px] font-medium" style={{ color: "var(--cm-text-2)" }}>
                  {coach.athlete_count} athlete{coach.athlete_count !== 1 ? "s" : ""}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className={`w-1.5 h-1.5 rounded-full ${health.dot}`} />
                <span className={`text-[11px] font-medium ${health.color}`}>{health.label}</span>
              </div>
              {coach.created_at && (
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3 h-3" style={{ color: "var(--cm-text-4)" }} />
                  <span className="text-[11px]" style={{ color: "var(--cm-text-3)" }}>
                    Joined {new Date(coach.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </span>
                </div>
              )}
              {coach.last_active && (
                <span className="text-[11px]" style={{ color: "var(--cm-text-3)" }}>
                  Last active {timeAgo(coach.last_active)}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="relative flex items-center gap-0.5 shrink-0">
          <button
            onClick={() => onEdit(coach)}
            className="p-2 rounded-lg transition-colors hover:bg-gray-100"
            style={{ color: "var(--cm-text-3)" }}
            title="Edit"
            data-testid={`edit-coach-${coach.id}`}
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="p-2 rounded-lg transition-colors hover:bg-gray-100"
            style={{ color: "var(--cm-text-3)" }}
            data-testid={`coach-menu-${coach.id}`}
          >
            <MoreHorizontal className="w-3.5 h-3.5" />
          </button>
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 top-full mt-1 rounded-xl py-1.5 z-20 min-w-[180px]" style={{ background: "var(--cm-surface)", border: "1px solid var(--cm-border)", boxShadow: "var(--cm-shadow-md)" }} data-testid={`coach-menu-dropdown-${coach.id}`}>
                <button
                  onClick={() => { onToggleStatus(coach); setMenuOpen(false); }}
                  className="w-full text-left px-3.5 py-2 text-xs flex items-center gap-2.5 transition-colors hover:bg-gray-50"
                  style={{ color: "var(--cm-text-2)" }}
                  data-testid={`toggle-status-${coach.id}`}
                >
                  <Shield className="w-3.5 h-3.5" />
                  {(coach.status || "active") === "active" ? "Deactivate Coach" : "Activate Coach"}
                </button>
                <div className="my-1" style={{ borderTop: "1px solid var(--cm-border-subtle)" }} />
                <button
                  onClick={() => { onRemove(coach); setMenuOpen(false); }}
                  className="w-full text-left px-3.5 py-2 text-xs text-red-600 flex items-center gap-2.5 transition-colors hover:bg-red-50"
                  data-testid={`remove-coach-${coach.id}`}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Remove Coach
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════ Active Coaches Tab ═══════════════════════ */

function ActiveCoachesTab({ coaches, loading, onRefresh, onOpenInvite, teams, teamsLoading }) {
  const [editingCoach, setEditingCoach] = useState(null);
  const [confirmRemove, setConfirmRemove] = useState(null);

  const handleRemove = async (coach) => {
    try {
      const res = await axios.delete(`${API}/coaches/${coach.id}`);
      toast.success(`${res.data.coach_name} removed${res.data.athletes_unassigned > 0 ? ` — ${res.data.athletes_unassigned} athletes unassigned` : ""}`);
      onRefresh();
    } catch (err) { toast.error(err.response?.data?.detail || "Failed to remove"); }
    finally { setConfirmRemove(null); }
  };

  const toggleStatus = async (coach) => {
    const newStatus = (coach.status || "active") === "active" ? "inactive" : "active";
    try {
      await axios.put(`${API}/coaches/${coach.id}`, { status: newStatus });
      toast.success(`${coach.name} ${newStatus === "active" ? "activated" : "deactivated"}`);
      onRefresh();
    } catch (err) { toast.error(err.response?.data?.detail || "Failed to update"); }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2" style={{ borderColor: "var(--cm-accent)" }} />
      </div>
    );
  }

  return (
    <div data-testid="active-coaches-list">
      {coaches.length === 0 ? (
        <div className="text-center py-16 rounded-xl" style={{ background: "var(--cm-surface)", border: "1px solid var(--cm-border-subtle)", boxShadow: "var(--cm-shadow)" }} data-testid="no-coaches-empty">
          <div className="w-14 h-14 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ background: "var(--cm-accent-light)" }}>
            <Users className="w-6 h-6" style={{ color: "var(--cm-accent)" }} />
          </div>
          <p className="text-sm font-semibold mb-1" style={{ color: "var(--cm-text)" }}>Your program is just getting started</p>
          <p className="text-xs max-w-xs mx-auto mb-5" style={{ color: "var(--cm-text-3)" }}>
            Invite coaches to manage athletes and recruiting workflows.
          </p>
          <button onClick={onOpenInvite} className="inline-flex items-center gap-1.5 px-5 py-2.5 text-xs font-semibold rounded-lg text-white transition-colors" style={{ background: "var(--cm-accent)" }} data-testid="empty-invite-coach-btn">
            <UserPlus className="w-3.5 h-3.5" /> Invite Coach
          </button>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {coaches.map((coach) => (
              <CoachCard
                key={coach.id}
                coach={coach}
                onEdit={setEditingCoach}
                onToggleStatus={toggleStatus}
                onRemove={setConfirmRemove}
              />
            ))}
          </div>

          {/* Contextual footer */}
          {coaches.length < 3 && (
            <div className="mt-6 rounded-xl px-5 py-4 flex items-center justify-between" style={{ background: "var(--cm-surface-2)", border: "1px solid var(--cm-border-subtle)" }} data-testid="grow-team-prompt">
              <div>
                <p className="text-xs font-medium" style={{ color: "var(--cm-text-2)" }}>Grow your coaching staff</p>
                <p className="text-[11px] mt-0.5" style={{ color: "var(--cm-text-3)" }}>Invite more coaches to expand coverage and improve response times.</p>
              </div>
              <button onClick={onOpenInvite} className="shrink-0 flex items-center gap-1.5 px-4 py-2 text-[11px] font-semibold rounded-lg transition-colors hover:opacity-90 text-white ml-4" style={{ background: "var(--cm-accent)" }} data-testid="grow-invite-btn">
                <UserPlus className="w-3 h-3" /> Invite Coach
              </button>
            </div>
          )}
        </>
      )}

      {editingCoach && (
        <EditCoachModal
          coach={editingCoach}
          onSave={() => { setEditingCoach(null); onRefresh(); }}
          onClose={() => setEditingCoach(null)}
          teams={teams}
          teamsLoading={teamsLoading}
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

/* ═══════════════════════ Invite Status Badges ═══════════════════════ */

function InviteStatusBadge({ status }) {
  const cfg = {
    pending: { bg: "rgba(245,158,11,0.08)", color: "#d97706", border: "rgba(245,158,11,0.2)" },
    accepted: { bg: "rgba(16,185,129,0.08)", color: "#059669", border: "rgba(16,185,129,0.2)" },
    expired: { bg: "rgba(148,163,184,0.08)", color: "#64748b", border: "rgba(148,163,184,0.2)" },
    cancelled: { bg: "rgba(239,68,68,0.08)", color: "#dc2626", border: "rgba(239,68,68,0.2)" },
  };
  const icons = { pending: Clock, accepted: CheckCircle, expired: XCircle, cancelled: XCircle };
  const Icon = icons[status] || Clock;
  const c = cfg[status] || cfg.pending;
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded-md"
      style={{ background: c.bg, color: c.color, border: `1px solid ${c.border}` }}
      data-testid={`status-badge-${status}`}
    >
      <Icon className="w-3 h-3" /> {status}
    </span>
  );
}

function DeliveryBadge({ status, lastError }) {
  const map = {
    sent: { color: "#059669", icon: CheckCircle, label: "Email sent" },
    failed: { color: "#dc2626", icon: AlertTriangle, label: "Send failed" },
    pending: { color: "#94a3b8", icon: Clock, label: "Sending..." },
  };
  const cfg = map[status] || map.pending;
  const Icon = cfg.icon;
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-medium" style={{ color: cfg.color }} title={lastError || ""} data-testid={`delivery-status-${status}`}>
      <Icon className="w-3 h-3" /> {cfg.label}
    </span>
  );
}

/* ═══════════════════════ Pending Assignment Banner ═══════════════════════ */

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
    <div className="rounded-xl p-5 mb-4" style={{ background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.15)" }} data-testid="pending-assignment-banner">
      <div className="flex items-start gap-3 mb-3">
        <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: "rgba(245,158,11,0.12)" }}>
          <UserCheck className="w-4 h-4 text-amber-600" />
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-amber-900">{assignment.coach_name} joined — assign {assignment.team} athletes?</h3>
          <p className="text-xs text-amber-700 mt-0.5">{assignment.suggested_count} unassigned</p>
        </div>
      </div>
      {assignment.suggested_athletes.length > 0 && (
        <div className="space-y-1.5 mb-4">
          {assignment.suggested_athletes.map((a) => (
            <label key={a.id} className="flex items-center gap-3 px-3 py-2 bg-white/70 rounded-lg border border-amber-100 cursor-pointer hover:bg-white transition-colors">
              <input type="checkbox" checked={selected.has(a.id)} onChange={() => toggleAthlete(a.id)} className="w-3.5 h-3.5 rounded border-amber-300 text-amber-600 focus:ring-amber-500" />
              <span className="text-sm text-gray-800 flex-1">{a.name}</span>
            </label>
          ))}
        </div>
      )}
      <div className="flex items-center gap-2">
        <button onClick={handleAssign} disabled={assigning || selected.size === 0} className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50" data-testid="assign-selected-btn">
          <UserCheck className="w-3 h-3" /> {assigning ? "Assigning..." : `Assign ${selected.size}`}
        </button>
        <button onClick={handleDismiss} disabled={dismissing} className="px-3 py-2 text-xs text-amber-600 hover:text-amber-800 hover:bg-amber-100/50 rounded-lg">
          {dismissing ? "..." : "Skip for now"}
        </button>
      </div>
    </div>
  );
}

/* ═══════════════════════ Invites Tab ═══════════════════════ */

function InvitesTab({ invites, pendingAssignments, loading, onRefresh, teams, teamsLoading }) {
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
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2" style={{ borderColor: "var(--cm-accent)" }} />
      </div>
    );
  }

  return (
    <div data-testid="invites-tab-content">
      {/* Inline invite form toggle */}
      {!showForm && (
        <button onClick={() => setShowForm(true)} className="w-full rounded-xl px-5 py-4 mb-4 flex items-center justify-center gap-2 text-xs font-semibold transition-all hover:border-orange-200" style={{ background: "var(--cm-accent-light)", border: "1px dashed var(--cm-accent)", color: "var(--cm-accent-text)" }} data-testid="new-invite-btn">
          <UserPlus className="w-4 h-4" /> Send a New Invite
        </button>
      )}

      {showForm && (
        <div className="rounded-xl p-5 mb-4" style={{ background: "var(--cm-surface)", border: "1px solid var(--cm-border)", boxShadow: "var(--cm-shadow)" }} data-testid="invite-form">
          <h2 className="text-sm font-semibold mb-4 flex items-center gap-2" style={{ color: "var(--cm-text)" }}>
            <Mail className="w-4 h-4" style={{ color: "var(--cm-accent)" }} /> Send Coach Invite
          </h2>
          <form onSubmit={handleInvite} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-semibold uppercase tracking-wider block mb-1.5" style={{ color: "var(--cm-text-3)" }}>Coach Name</label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} required placeholder="Coach Thompson" className="w-full px-3 py-2.5 text-sm rounded-lg border focus:outline-none focus:ring-2 focus:ring-orange-200" style={{ background: "var(--cm-input-bg)", borderColor: "var(--cm-border)", color: "var(--cm-text)" }} data-testid="invite-name-input" />
              </div>
              <div>
                <label className="text-[10px] font-semibold uppercase tracking-wider block mb-1.5" style={{ color: "var(--cm-text-3)" }}>Email</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="coach@example.com" className="w-full px-3 py-2.5 text-sm rounded-lg border focus:outline-none focus:ring-2 focus:ring-orange-200" style={{ background: "var(--cm-input-bg)", borderColor: "var(--cm-border)", color: "var(--cm-text)" }} data-testid="invite-email-input" />
              </div>
            </div>
            <div>
              <label className="text-[10px] font-semibold uppercase tracking-wider block mb-1.5" style={{ color: "var(--cm-text-3)" }}>Team (optional)</label>
              <TeamDropdown value={team} onChange={setTeam} teams={teams} loading={teamsLoading} />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setShowForm(false)} className="px-3 py-2.5 text-xs font-medium rounded-lg transition-colors hover:bg-gray-100" style={{ color: "var(--cm-text-2)" }}>Cancel</button>
              <button type="submit" disabled={sending} className="flex items-center gap-1.5 px-5 py-2.5 text-xs font-semibold rounded-lg text-white disabled:opacity-50 transition-colors" style={{ background: "var(--cm-accent)" }} data-testid="send-invite-btn">
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
      {invites.length === 0 && !showForm ? (
        <div className="text-center py-16 rounded-xl" style={{ background: "var(--cm-surface)", border: "1px solid var(--cm-border-subtle)" }} data-testid="no-invites-empty">
          <Mail className="w-10 h-10 mx-auto mb-3" style={{ color: "var(--cm-text-4)" }} />
          <p className="text-sm font-medium" style={{ color: "var(--cm-text-2)" }}>No invites sent yet</p>
          <p className="text-xs mt-1" style={{ color: "var(--cm-text-3)" }}>Send an invite to add coaches to your program</p>
        </div>
      ) : (
        <div className="space-y-3">
          {pending.length > 0 && (
            <div>
              <h3 className="text-[10px] font-bold uppercase tracking-wider mb-2.5" style={{ color: "var(--cm-accent-text)" }}>Pending Invites</h3>
              <div className="space-y-2">
                {pending.map((inv) => (
                  <div key={inv.id} className="rounded-xl p-4 flex items-center justify-between transition-colors" style={{ background: "var(--cm-surface)", border: "1px solid var(--cm-border-subtle)", boxShadow: "var(--cm-shadow)" }} data-testid={`invite-${inv.id}`}>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                        <span className="text-sm font-semibold" style={{ color: "var(--cm-text)" }}>{inv.name}</span>
                        <InviteStatusBadge status={inv.status} />
                        <DeliveryBadge status={inv.delivery_status} lastError={inv.last_error} />
                        {inv.team && <span className="text-[10px] font-medium px-2 py-0.5 rounded-md" style={{ background: "var(--cm-surface-2)", color: "var(--cm-text-2)" }}>{inv.team}</span>}
                      </div>
                      <p className="text-xs" style={{ color: "var(--cm-text-3)" }}>{inv.email}</p>
                      <p className="text-[10px] mt-0.5" style={{ color: "var(--cm-text-4)" }}>
                        Invited {new Date(inv.created_at).toLocaleDateString()} · Expires {new Date(inv.expires_at).toLocaleDateString()}
                        {inv.resend_count > 0 && <span className="ml-1">· Resent {inv.resend_count}x</span>}
                      </p>
                    </div>
                    <div className="flex items-center gap-0.5 shrink-0 ml-3">
                      <button onClick={() => handleResend(inv.id)} disabled={resendingId === inv.id} className="p-2 rounded-lg transition-colors hover:bg-blue-50 disabled:opacity-50" style={{ color: "var(--cm-text-3)" }} title="Resend invite" data-testid={`resend-invite-${inv.id}`}>
                        {resendingId === inv.id ? <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-blue-500" /> : <RefreshCw className="w-3.5 h-3.5" />}
                      </button>
                      <button onClick={() => copyInviteLink(inv)} className="p-2 rounded-lg transition-colors hover:bg-gray-100" style={{ color: "var(--cm-text-3)" }} title="Copy invite link" data-testid={`copy-invite-${inv.id}`}>
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleCancel(inv.id)} className="p-2 rounded-lg transition-colors hover:bg-red-50 hover:text-red-500" style={{ color: "var(--cm-text-3)" }} title="Cancel invite" data-testid={`cancel-invite-${inv.id}`}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {others.length > 0 && (
            <div className={pending.length > 0 ? "mt-5" : ""}>
              <h3 className="text-[10px] font-bold uppercase tracking-wider mb-2.5" style={{ color: "var(--cm-text-4)" }}>History</h3>
              <div className="space-y-2">
                {others.map((inv) => (
                  <div key={inv.id} className="rounded-xl p-4 flex items-center justify-between" style={{ background: "var(--cm-surface)", border: "1px solid var(--cm-border-subtle)", opacity: 0.7 }} data-testid={`invite-${inv.id}`}>
                    <div>
                      <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                        <span className="text-sm font-medium" style={{ color: "var(--cm-text-2)" }}>{inv.name}</span>
                        <InviteStatusBadge status={inv.status} />
                        {inv.team && <span className="text-[10px] font-medium px-2 py-0.5 rounded-md" style={{ background: "var(--cm-surface-2)", color: "var(--cm-text-3)" }}>{inv.team}</span>}
                      </div>
                      <p className="text-xs" style={{ color: "var(--cm-text-3)" }}>{inv.email}</p>
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

/* ═══════════════════════ Main Page ═══════════════════════ */

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
  const [teams, setTeams] = useState([]);
  const [teamsLoading, setTeamsLoading] = useState(true);

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

  const fetchTeams = useCallback(async () => {
    setTeamsLoading(true);
    try { const res = await axios.get(`${API}/roster/teams`); setTeams(res.data); }
    catch { /* silent */ }
    finally { setTeamsLoading(false); }
  }, []);

  const refreshAll = useCallback(() => {
    fetchCoaches();
    fetchInvites();
    fetchPendingAssignments();
    fetchTeams();
  }, [fetchCoaches, fetchInvites, fetchPendingAssignments, fetchTeams]);

  useEffect(() => {
    if (role !== "director" && role !== "coach" && role !== "platform_admin") { navigate("/mission-control"); return; }
    fetchCoaches();
    fetchInvites();
    fetchPendingAssignments();
    fetchTeams();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role]);

  const pendingInviteCount = invites.filter((i) => i.status === "pending").length;

  const tabs = [
    { id: "coaches", label: "Active Coaches", count: coaches.length, icon: Users },
    { id: "invites", label: "Invites", count: pendingInviteCount, icon: Mail },
  ];

  const openInviteTab = () => setActiveTab("invites");

  return (
    <div data-testid="coaches-page">
      <main className="max-w-[880px] mx-auto">
        {/* ═══ Header ═══ */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-lg font-bold" style={{ color: "var(--cm-text)" }} data-testid="coaches-page-title">Coaches</h1>
            <p className="text-xs mt-0.5" style={{ color: "var(--cm-text-3)" }}>
              Manage your coaching staff and track their activity across the program
            </p>
          </div>
          <button
            onClick={openInviteTab}
            className="shrink-0 flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold rounded-lg text-white transition-all hover:opacity-90"
            style={{ background: "var(--cm-accent)" }}
            data-testid="header-invite-coach-btn"
          >
            <UserPlus className="w-3.5 h-3.5" /> Invite Coach
          </button>
        </div>

        {/* ═══ Summary Strip ═══ */}
        <SummaryStrip coaches={coaches} pendingInviteCount={pendingInviteCount} />

        {/* ═══ Tabs ═══ */}
        <div className="flex items-center gap-0 mb-6" style={{ borderBottom: "1px solid var(--cm-border)" }} data-testid="coaches-tabs">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="relative flex items-center gap-2 px-5 py-3 text-xs font-semibold transition-colors"
                style={{ color: isActive ? "var(--cm-text)" : "var(--cm-text-3)" }}
                data-testid={`tab-${tab.id}`}
              >
                <tab.icon className="w-3.5 h-3.5" />
                {tab.label}
                {tab.count > 0 && (
                  <span
                    className="text-[10px] font-bold px-1.5 py-0.5 rounded-md tabular-nums"
                    style={{
                      background: isActive ? "var(--cm-text)" : "var(--cm-surface-2)",
                      color: isActive ? "var(--cm-surface)" : "var(--cm-text-3)",
                    }}
                  >
                    {tab.count}
                  </span>
                )}
                {isActive && (
                  <span className="absolute bottom-0 left-2 right-2 h-[2px] rounded-full" style={{ background: "var(--cm-accent)" }} />
                )}
              </button>
            );
          })}
        </div>

        {/* ═══ Tab Content ═══ */}
        {activeTab === "coaches" && (
          <ActiveCoachesTab coaches={coaches} loading={loadingCoaches} onRefresh={refreshAll} onOpenInvite={openInviteTab} teams={teams} teamsLoading={teamsLoading} />
        )}
        {activeTab === "invites" && (
          <InvitesTab invites={invites} pendingAssignments={pendingAssignments} loading={loadingInvites} onRefresh={refreshAll} teams={teams} teamsLoading={teamsLoading} />
        )}
      </main>
    </div>
  );
}

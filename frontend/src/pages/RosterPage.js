import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { useAuth } from "@/AuthContext";
import CoachActivationPanel from "@/components/CoachActivationPanel";
import DigestPanel from "@/components/DigestPanel";
import { Users, UserMinus, ArrowRightLeft, AlertTriangle, ChevronDown, ChevronUp, User } from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const REASON_LABELS = {
  newly_created: "New athlete",
  coach_left: "Coach left",
  manually_unassigned: "Manually unassigned",
  imported_without_owner: "Imported without owner",
};

function ReassignModal({ athlete, coaches, currentCoachId, onClose, onConfirm }) {
  const [selectedCoach, setSelectedCoach] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const availableCoaches = coaches.filter((c) => c.id !== currentCoachId);

  const handleSubmit = async () => {
    if (!selectedCoach) { toast.error("Select a coach"); return; }
    setSubmitting(true);
    try {
      const res = await axios.post(`${API}/athletes/${athlete.id}/reassign`, {
        new_coach_id: selectedCoach,
        reason: reason || null,
      });
      const warnings = res.data.open_actions_warning || [];
      if (warnings.length > 0) {
        toast.warning(`Reassigned — ${warnings.length} open action(s) still belong to the previous coach`, { duration: 6000 });
      } else {
        toast.success(`${athlete.name} reassigned to ${res.data.to_coach}`);
      }
      onConfirm(res.data);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to reassign");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()} data-testid="reassign-modal">
        <h3 className="text-sm font-semibold text-gray-900 mb-1">Reassign {athlete.name}</h3>
        <p className="text-xs text-gray-500 mb-4">
          {currentCoachId ? `Currently assigned to a coach. Select the new coach below.` : `Currently unassigned. Select a coach to assign.`}
        </p>

        <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">New Coach</label>
        <select
          value={selectedCoach}
          onChange={(e) => setSelectedCoach(e.target.value)}
          className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm text-gray-700 bg-white mb-3"
          data-testid="reassign-coach-select"
        >
          <option value="">Select coach...</option>
          {availableCoaches.map((c) => (
            <option key={c.id} value={c.id}>{c.name}{c.team ? ` · ${c.team}` : ""}</option>
          ))}
        </select>

        <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Reason (optional)</label>
        <input
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="e.g. balancing workload"
          className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm text-gray-700 placeholder-gray-400 mb-4"
          data-testid="reassign-reason-input"
        />

        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700" data-testid="reassign-cancel-btn">Cancel</button>
          <button
            onClick={handleSubmit}
            disabled={submitting || !selectedCoach}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium bg-slate-900 text-white rounded-md hover:bg-slate-800 disabled:opacity-50"
            data-testid="reassign-confirm-btn"
          >
            <ArrowRightLeft className="w-3 h-3" />
            {submitting ? "Reassigning..." : "Reassign"}
          </button>
        </div>
      </div>
    </div>
  );
}

function UnassignConfirm({ athlete, onClose, onConfirm }) {
  const [submitting, setSubmitting] = useState(false);

  const handleUnassign = async () => {
    setSubmitting(true);
    try {
      const res = await axios.post(`${API}/athletes/${athlete.id}/unassign`, { reason: "manually_unassigned" });
      const warnings = res.data.open_actions_warning || [];
      if (warnings.length > 0) {
        toast.warning(`Unassigned — ${warnings.length} open action(s) still belong to the previous coach`, { duration: 6000 });
      } else {
        toast.success(`${athlete.name} is now unassigned`);
      }
      onConfirm(res.data);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to unassign");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6" onClick={(e) => e.stopPropagation()} data-testid="unassign-modal">
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle className="w-4 h-4 text-amber-500" />
          <h3 className="text-sm font-semibold text-gray-900">Unassign {athlete.name}?</h3>
        </div>
        <p className="text-xs text-gray-500 mb-4">
          This athlete will become unassigned. Their coach will lose visibility. Open actions will remain with the current coach.
        </p>
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700" data-testid="unassign-cancel-btn">Cancel</button>
          <button
            onClick={handleUnassign}
            disabled={submitting}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium bg-amber-600 text-white rounded-md hover:bg-amber-700 disabled:opacity-50"
            data-testid="unassign-confirm-btn"
          >
            <UserMinus className="w-3 h-3" />
            {submitting ? "Unassigning..." : "Unassign"}
          </button>
        </div>
      </div>
    </div>
  );
}

function CoachGroup({ group, coaches, onReload }) {
  const [expanded, setExpanded] = useState(group.coach_id === null || group.count > 0);
  const [reassignTarget, setReassignTarget] = useState(null);
  const [unassignTarget, setUnassignTarget] = useState(null);

  const isUnassigned = group.coach_id === null;

  return (
    <section className="bg-white border border-gray-100 rounded-lg overflow-hidden" data-testid={`coach-group-${group.coach_id || "unassigned"}`}>
      <button
        onClick={() => setExpanded(!expanded)}
        className={`w-full flex items-center justify-between px-5 py-3.5 transition-colors ${
          isUnassigned ? "bg-amber-50 hover:bg-amber-100/60" : "hover:bg-gray-50"
        }`}
        data-testid={`toggle-group-${group.coach_id || "unassigned"}`}
      >
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
            isUnassigned ? "bg-amber-100" : "bg-slate-100"
          }`}>
            {isUnassigned ? (
              <AlertTriangle className="w-4 h-4 text-amber-600" />
            ) : (
              <User className="w-4 h-4 text-slate-600" />
            )}
          </div>
          <div className="text-left">
            <div className="flex items-center gap-2">
              <span className={`text-sm font-semibold ${isUnassigned ? "text-amber-800" : "text-gray-900"}`}>
                {group.coach_name}
              </span>
              {group.coach_team && (
                <span className="text-[10px] px-1.5 py-0.5 bg-slate-100 rounded text-slate-500">{group.coach_team}</span>
              )}
            </div>
            {group.coach_email && (
              <p className="text-[11px] text-gray-400">{group.coach_email}</p>
            )}
            {/* Profile context */}
            {(group.coach_contact_method || group.coach_availability) && (
              <div className="flex items-center gap-2 mt-0.5 text-[10px] text-gray-400">
                {group.coach_contact_method && <span>Prefers {group.coach_contact_method}</span>}
                {group.coach_contact_method && group.coach_availability && <span className="text-gray-200">|</span>}
                {group.coach_availability && <span>{group.coach_availability}</span>}
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
            isUnassigned ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-600"
          }`}>
            {group.count} athlete{group.count !== 1 ? "s" : ""}
          </span>
          {expanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
        </div>
      </button>

      {expanded && group.athletes.length > 0 && (
        <div className="border-t border-gray-100">
          {group.athletes.map((a) => (
            <div key={a.id} className="flex items-center justify-between px-5 py-2.5 border-b border-gray-50 last:border-0 hover:bg-gray-50/50" data-testid={`roster-athlete-${a.id}`}>
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="w-6 h-6 bg-slate-100 rounded-full flex items-center justify-center shrink-0">
                  <span className="text-[9px] font-bold text-slate-500">
                    {a.name?.split(" ").map((w) => w[0]).join("").slice(0, 2)}
                  </span>
                </div>
                <div>
                  <span className="text-sm text-gray-800">{a.name}</span>
                  <div className="flex items-center gap-2 text-[11px] text-gray-400">
                    {a.position && <span>{a.position}</span>}
                    {a.grad_year && <span>'{String(a.grad_year).slice(-2)}</span>}
                    {a.team && <span>{a.team}</span>}
                    {isUnassigned && a.unassigned_reason && (
                      <span className="text-amber-600 font-medium">{REASON_LABELS[a.unassigned_reason] || a.unassigned_reason}</span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => setReassignTarget(a)}
                  className="flex items-center gap-1 px-2.5 py-1 text-[10px] font-medium text-slate-600 bg-slate-50 hover:bg-slate-100 rounded-md transition-colors"
                  data-testid={`reassign-btn-${a.id}`}
                >
                  <ArrowRightLeft className="w-3 h-3" /> Reassign
                </button>
                {!isUnassigned && (
                  <button
                    onClick={() => setUnassignTarget(a)}
                    className="flex items-center gap-1 px-2.5 py-1 text-[10px] font-medium text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-md transition-colors"
                    data-testid={`unassign-btn-${a.id}`}
                  >
                    <UserMinus className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {expanded && group.athletes.length === 0 && (
        <div className="border-t border-gray-100 px-5 py-4">
          <p className="text-xs text-gray-400 text-center">No athletes assigned</p>
        </div>
      )}

      {reassignTarget && (
        <ReassignModal
          athlete={reassignTarget}
          coaches={coaches}
          currentCoachId={group.coach_id}
          onClose={() => setReassignTarget(null)}
          onConfirm={() => { setReassignTarget(null); onReload(); }}
        />
      )}

      {unassignTarget && (
        <UnassignConfirm
          athlete={unassignTarget}
          onClose={() => setUnassignTarget(null)}
          onConfirm={() => { setUnassignTarget(null); onReload(); }}
        />
      )}
    </section>
  );
}

function RosterPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [coaches, setCoaches] = useState([]);

  useEffect(() => {
    if (user?.role !== "director") { navigate("/mission-control"); }
  }, [user, navigate]);

  const fetchRoster = useCallback(async () => {
    try {
      const [rosterRes, coachesRes] = await Promise.all([
        axios.get(`${API}/roster`),
        axios.get(`${API}/roster/coaches`),
      ]);
      setData(rosterRes.data);
      setCoaches(coachesRes.data);
    } catch {
      toast.error("Failed to load roster");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchRoster(); }, [fetchRoster]);

  return (
    <div data-testid="roster-page">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg font-semibold text-gray-900" data-testid="roster-title">Roster</h1>
          <p className="text-xs text-gray-500 mt-0.5">Athlete assignments by coach</p>
        </div>
        {data?.summary && (
          <div className="flex items-center gap-3" data-testid="roster-summary">
            <div className="text-center px-3">
              <div className="text-lg font-bold text-gray-900">{data.summary.total_athletes}</div>
              <div className="text-[10px] text-gray-400 uppercase tracking-wider">Athletes</div>
            </div>
            <div className="h-8 w-px bg-gray-200" />
            <div className="text-center px-3">
              <div className="text-lg font-bold text-gray-900">{data.summary.coach_count}</div>
              <div className="text-[10px] text-gray-400 uppercase tracking-wider">Coaches</div>
            </div>
            {data.summary.unassigned > 0 && (
              <>
                <div className="h-8 w-px bg-gray-200" />
                <div className="text-center px-3">
                  <div className="text-lg font-bold text-amber-600">{data.summary.unassigned}</div>
                  <div className="text-[10px] text-amber-500 uppercase tracking-wider">Unassigned</div>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-400" />
        </div>
      ) : (
        <>
          <CoachActivationPanel directorName={user?.name} />
          <DigestPanel />
          <div className="space-y-3">
            {data?.groups?.map((group) => (
              <CoachGroup
                key={group.coach_id || "unassigned"}
                group={group}
                coaches={coaches}
                onReload={fetchRoster}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default RosterPage;

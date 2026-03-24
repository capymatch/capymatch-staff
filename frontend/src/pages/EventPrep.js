import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import {
  ArrowLeft, Check, AlertTriangle, ExternalLink, ChevronRight,
  MapPin, GraduationCap, Users, Zap, Clock, CheckCircle2, Shield,
  Target, Plus, X, School
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import UniversityLogo from "../components/UniversityLogo";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const PREP_ORDER = { blocker: 0, needs_attention: 1, ready: 2 };
const PREP_CONFIG = {
  blocker: { label: "Blocker", bg: "rgba(220,38,38,0.10)", border: "rgba(220,38,38,0.20)", text: "#ef4444", dot: "bg-red-500" },
  needs_attention: { label: "Needs Attention", bg: "rgba(245,158,11,0.10)", border: "rgba(245,158,11,0.20)", text: "#f59e0b", dot: "bg-amber-500" },
  ready: { label: "Ready", bg: "rgba(16,185,129,0.10)", border: "rgba(16,185,129,0.20)", text: "#10b981", dot: "bg-emerald-500" },
};

function AddAthletesDialog({ open, onOpenChange, eventId, currentAthleteIds, onUpdated }) {
  const [roster, setRoster] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(null);

  useEffect(() => {
    if (!open) return;
    (async () => {
      try {
        const res = await axios.get(`${API}/mission-control`);
        setRoster(res.data.myRoster || []);
      } catch {
        toast.error("Failed to load roster");
      } finally {
        setLoading(false);
      }
    })();
  }, [open]);

  const toggleAthlete = async (athleteId, isAdded) => {
    setToggling(athleteId);
    try {
      if (isAdded) {
        await axios.delete(`${API}/events/${eventId}/athletes/${athleteId}`);
      } else {
        await axios.post(`${API}/events/${eventId}/athletes`, { athlete_id: athleteId });
      }
      onUpdated();
    } catch {
      toast.error("Failed to update athlete");
    } finally {
      setToggling(null);
    }
  };

  const addedSet = new Set(currentAthleteIds);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px] bg-white" data-testid="add-athletes-dialog">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold text-gray-900">Manage Athletes</DialogTitle>
          <DialogDescription className="text-xs text-gray-500">Add or remove athletes from this event.</DialogDescription>
        </DialogHeader>
        {loading ? (
          <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-400" /></div>
        ) : (
          <div className="space-y-1 mt-2 max-h-[400px] overflow-y-auto">
            {roster.map((a) => {
              const isAdded = addedSet.has(a.id);
              const isLoading = toggling === a.id;
              return (
                <div
                  key={a.id}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-lg transition-colors ${isAdded ? "bg-emerald-50 border border-emerald-100" : "bg-gray-50 border border-gray-100"}`}
                  data-testid={`roster-athlete-${a.id}`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {a.photo_url ? (
                      <img src={a.photo_url} alt={a.name} className="w-8 h-8 rounded-full object-cover" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-[11px] font-bold text-gray-500">
                        {(a.name || "").split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2)}
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{a.name}</p>
                      <p className="text-[10px] text-gray-500">{a.position} · {a.grad_year}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => toggleAthlete(a.id, isAdded)}
                    disabled={isLoading}
                    className={`flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                      isAdded
                        ? "text-red-600 bg-red-50 hover:bg-red-100 border border-red-200"
                        : "text-emerald-700 bg-emerald-100 hover:bg-emerald-200 border border-emerald-200"
                    } ${isLoading ? "opacity-50" : ""}`}
                    data-testid={`toggle-athlete-${a.id}`}
                  >
                    {isLoading ? "..." : isAdded ? (<><X className="w-3 h-3" /> Remove</>) : (<><Plus className="w-3 h-3" /> Add</>)}
                  </button>
                </div>
              );
            })}
            {roster.length === 0 && <p className="text-sm text-gray-400 text-center py-6">No athletes in your roster</p>}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function ManageSchoolsDialog({ open, onOpenChange, eventId, currentSchoolIds, onUpdated }) {
  const [allSchools, setAllSchools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(null);
  const [customName, setCustomName] = useState("");
  const [addingCustom, setAddingCustom] = useState(false);

  useEffect(() => {
    if (!open) return;
    (async () => {
      try {
        const res = await axios.get(`${API}/events/schools/available`);
        setAllSchools(res.data);
      } catch {
        toast.error("Failed to load schools");
      } finally {
        setLoading(false);
      }
    })();
  }, [open]);

  const toggleSchool = async (schoolId, isAdded) => {
    setToggling(schoolId);
    try {
      if (isAdded) {
        await axios.delete(`${API}/events/${eventId}/schools/${schoolId}`);
      } else {
        await axios.post(`${API}/events/${eventId}/schools`, { school_id: schoolId });
      }
      onUpdated();
    } catch {
      toast.error("Failed to update school");
    } finally {
      setToggling(null);
    }
  };

  const addCustomSchool = async () => {
    if (!customName.trim()) return;
    setAddingCustom(true);
    try {
      await axios.post(`${API}/events/${eventId}/schools`, { school_name: customName.trim() });
      const res = await axios.get(`${API}/events/schools/available`);
      setAllSchools(res.data);
      setCustomName("");
      onUpdated();
    } catch {
      toast.error("Failed to add school");
    } finally {
      setAddingCustom(false);
    }
  };

  const addedSet = new Set(currentSchoolIds);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[460px] bg-white" data-testid="manage-schools-dialog">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold text-gray-900">Manage Schools</DialogTitle>
          <DialogDescription className="text-xs text-gray-500">Add or remove schools attending this event.</DialogDescription>
        </DialogHeader>

        {/* Add custom school */}
        <div className="flex items-center gap-2 mt-1" data-testid="add-custom-school-form">
          <input
            type="text"
            placeholder="Add a school not listed..."
            className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400"
            value={customName}
            onChange={(e) => setCustomName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addCustomSchool()}
            data-testid="custom-school-input"
          />
          <button
            onClick={addCustomSchool}
            disabled={addingCustom || !customName.trim()}
            className="px-3 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-lg transition-colors"
            data-testid="custom-school-add-btn"
          >
            {addingCustom ? "..." : "Add"}
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-400" /></div>
        ) : (
          <div className="space-y-1 mt-2 max-h-[350px] overflow-y-auto">
            {allSchools.map((s) => {
              const isAdded = addedSet.has(s.id);
              const isLoading = toggling === s.id;
              return (
                <div
                  key={s.id}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-lg transition-colors ${isAdded ? "bg-emerald-50 border border-emerald-100" : "bg-gray-50 border border-gray-100"}`}
                  data-testid={`school-item-${s.id}`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center">
                      <GraduationCap className="w-4 h-4 text-slate-500" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{s.name}</p>
                      {s.division && <p className="text-[10px] text-gray-500">{s.division}</p>}
                    </div>
                  </div>
                  <button
                    onClick={() => toggleSchool(s.id, isAdded)}
                    disabled={isLoading}
                    className={`flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                      isAdded
                        ? "text-red-600 bg-red-50 hover:bg-red-100 border border-red-200"
                        : "text-emerald-700 bg-emerald-100 hover:bg-emerald-200 border border-emerald-200"
                    } ${isLoading ? "opacity-50" : ""}`}
                    data-testid={`toggle-school-${s.id}`}
                  >
                    {isLoading ? "..." : isAdded ? (<><X className="w-3 h-3" /> Remove</>) : (<><Plus className="w-3 h-3" /> Add</>)}
                  </button>
                </div>
              );
            })}
            {allSchools.length === 0 && <p className="text-sm text-gray-400 text-center py-6">No schools available</p>}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function EventPrep() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [showAddAthletes, setShowAddAthletes] = useState(false);
  const [showManageSchools, setShowManageSchools] = useState(false);

  const fetchPrep = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/events/${eventId}/prep`);
      setData(res.data);
    } catch {
      toast.error("Failed to load prep data");
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => { fetchPrep(); }, [fetchPrep]);

  const toggleCheck = async (itemId) => {
    try {
      const res = await axios.patch(`${API}/events/${eventId}/checklist/${itemId}`);
      setData((prev) => ({
        ...prev,
        checklist: prev.checklist.map((c) => c.id === itemId ? res.data.item : c),
        event: { ...prev.event, prepStatus: res.data.prepStatus },
      }));
    } catch {
      toast.error("Failed to update checklist");
    }
  };

  if (loading) return <div className="flex items-center justify-center py-32"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-400" /></div>;
  if (!data || data.error) return <div className="flex items-center justify-center py-32"><p className="text-gray-500">Event not found</p></div>;

  const { event, athletes, targetSchools, checklist, blockers } = data;
  const completed = checklist.filter((c) => c.completed).length;
  const sortedAthletes = [...athletes].sort((a, b) => (PREP_ORDER[a.prepStatus] ?? 2) - (PREP_ORDER[b.prepStatus] ?? 2));
  const sortedSchools = [...targetSchools].sort((a, b) => b.athleteOverlap - a.athleteOverlap);
  const readyCt = athletes.filter(a => a.prepStatus === "ready").length;
  const notReadyCt = athletes.length - readyCt;

  return (
    <div data-testid="event-prep-page">
      {/* Header */}
      <header className="bg-white/95 border-b border-gray-100">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 sm:gap-4 min-w-0">
            <button onClick={() => navigate("/events")} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors shrink-0" data-testid="back-to-events">
              <ArrowLeft className="w-4 h-4" /><span className="hidden sm:inline">Events</span>
            </button>
            <div className="h-5 w-px bg-gray-200 shrink-0" />
            <div className="min-w-0">
              <h1 className="font-semibold text-gray-900 text-sm sm:text-base leading-tight truncate" data-testid="prep-event-name">{event.name} — Prep</h1>
              <div className="flex items-center gap-3 text-xs text-gray-500">
                <span className="flex items-center gap-1 truncate"><MapPin className="w-3 h-3 shrink-0" />{event.location}</span>
                <span className="font-medium shrink-0">{event.daysAway <= 1 ? "TOMORROW" : `IN ${event.daysAway} DAYS`}</span>
              </div>
            </div>
          </div>
          <button
            onClick={() => navigate(`/events/${eventId}/live`)}
            className="flex items-center gap-1.5 px-3 sm:px-4 py-2 text-xs font-semibold bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors shrink-0"
            data-testid="go-live-btn"
          >
            <Zap className="w-3.5 h-3.5" /> Go Live <ChevronRight className="w-3 h-3" />
          </button>
        </div>
      </header>

      <main className="max-w-[1200px] mx-auto px-0 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-5">

        {/* ─── Quick Summary Bar ─── */}
        <div className="flex items-center gap-3 flex-wrap px-3 sm:px-0" data-testid="prep-summary-bar">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-100 text-xs">
            <Users className="w-3.5 h-3.5 text-slate-500" />
            <span className="font-semibold text-slate-800">{athletes.length}</span>
            <span className="text-slate-500">athletes</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-100 text-xs">
            <GraduationCap className="w-3.5 h-3.5 text-slate-500" />
            <span className="font-semibold text-slate-800">{targetSchools.length}</span>
            <span className="text-slate-500">schools</span>
          </div>
          {readyCt > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-100 text-xs">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span className="font-semibold text-emerald-700">{readyCt}</span>
              <span className="text-emerald-600">ready</span>
            </div>
          )}
          {notReadyCt > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-100 text-xs">
              <Clock className="w-3.5 h-3.5 text-amber-600" />
              <span className="font-semibold text-amber-700">{notReadyCt}</span>
              <span className="text-amber-600">need{notReadyCt > 1 ? "" : "s"} attention</span>
            </div>
          )}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-100 text-xs">
            <Check className="w-3.5 h-3.5 text-slate-500" />
            <span className="font-semibold text-slate-800">{completed}/{checklist.length}</span>
            <span className="text-slate-500">prep done</span>
          </div>
        </div>

        {/* ─── Blockers — Promoted to Top ─── */}
        {blockers.length > 0 && (
          <section className="rounded-xl overflow-hidden" style={{ background: "#161921", border: "1px solid rgba(220,38,38,0.30)" }} data-testid="prep-blockers-section">
            <div className="px-4 py-3 flex items-center gap-2" style={{ borderBottom: "1px solid rgba(220,38,38,0.15)" }}>
              <Shield className="w-4 h-4" style={{ color: "#ef4444" }} />
              <h2 className="text-xs font-bold uppercase tracking-wider" style={{ color: "#ef4444" }}>Blockers — Resolve Before Event</h2>
            </div>
            <div>
              {blockers.map((b, i) => (
                <div key={i} className="px-4 py-3 flex items-start justify-between gap-4" style={i > 0 ? { borderTop: "1px solid rgba(255,255,255,0.06)" } : {}}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" style={{ color: "#ef4444" }} />
                      <span className="text-sm font-semibold" style={{ color: "#f0f0f2" }}>{b.athleteName}</span>
                    </div>
                    <p className="text-xs ml-5.5" style={{ color: "#8b8d98" }}>{b.impact}</p>
                    {b.recommended_action && (
                      <p className="text-[11px] font-medium mt-1 ml-5.5" style={{ color: "#f87171" }}>Next: {b.recommended_action}</p>
                    )}
                    {b.owner && (
                      <p className="text-[10px] mt-0.5 ml-5.5" style={{ color: "#5c5e6a" }}>Owner: {b.owner}</p>
                    )}
                  </div>
                  <button
                    onClick={() => navigate(`/support-pods/${b.athleteId}`)}
                    className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium rounded-md transition-colors shrink-0"
                    style={{ color: "#f87171", background: "rgba(239,68,68,0.10)", border: "1px solid rgba(239,68,68,0.25)" }}
                    data-testid={`blocker-pod-${b.athleteId}`}
                  >
                    Open Pod <ExternalLink className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ─── Athletes — Sorted by Readiness ─── */}
        <section className="bg-white border border-gray-100 sm:rounded-xl overflow-hidden" data-testid="prep-athletes-section">
          <div className="px-4 py-3 border-b border-gray-50 flex items-center justify-between">
            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Athletes ({athletes.length})</h2>
            <button
              onClick={() => setShowAddAthletes(true)}
              className="flex items-center gap-1 px-3 py-1.5 text-[11px] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors"
              data-testid="add-athletes-button"
            >
              <Plus className="w-3 h-3" /> Manage Athletes
            </button>
          </div>
          <div className="divide-y divide-gray-50">
            {sortedAthletes.length === 0 && (
              <div className="px-4 py-8 text-center">
                <Users className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-400">No athletes assigned yet</p>
                <button
                  onClick={() => setShowAddAthletes(true)}
                  className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors"
                  data-testid="add-athletes-empty-cta"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Athletes
                </button>
              </div>
            )}
            {sortedAthletes.map((a) => {
              const cfg = PREP_CONFIG[a.prepStatus] || PREP_CONFIG.ready;
              return (
                <div key={a.id} className="px-4 py-3 flex items-center justify-between gap-3" data-testid={`prep-athlete-${a.id}`}>
                  <div className="flex-1 min-w-0 flex items-start gap-3">
                    <div className="relative shrink-0 mt-0.5">
                      {a.photo_url ? (
                        <img src={a.photo_url} alt={a.full_name} className="w-8 h-8 rounded-full object-cover" data-testid={`prep-avatar-${a.id}`} />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-[11px] font-bold text-gray-500" data-testid={`prep-avatar-${a.id}`}>
                          {(a.full_name || "").split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2)}
                        </div>
                      )}
                      <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${cfg.dot}`} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-medium text-sm text-gray-900">{a.full_name}</span>
                        <span className="text-[10px] text-gray-400">{a.grad_year} · {a.position}</span>
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded" style={{ background: cfg.bg, color: cfg.text }}>{cfg.label}</span>
                      </div>
                    {a.targetSchoolsAtEvent.length > 0 && (
                      <div className="flex items-center gap-1 ml-4 mt-1 flex-wrap">
                        <Target className="w-3 h-3 text-gray-300 shrink-0" />
                        {a.targetSchoolsAtEvent.map((s, i) => (
                          <span key={i} className="text-[10px] px-1.5 py-0.5 bg-gray-50 text-gray-500 rounded border border-gray-100">{s}</span>
                        ))}
                      </div>
                    )}
                    {a.blockers?.length > 0 && (
                      <p className="text-[11px] text-red-600 mt-1 ml-4">{a.blockers[0].why_this_surfaced || a.blockers[0].recommended_action}</p>
                    )}
                    </div>
                  </div>
                  <button
                    onClick={() => navigate(`/support-pods/${a.id}`)}
                    className="text-[10px] text-gray-400 hover:text-gray-700 flex items-center gap-0.5 transition-colors shrink-0"
                  >
                    Pod <ExternalLink className="w-3 h-3" />
                  </button>
                </div>
              );
            })}
          </div>
        </section>

        {/* ─── Target Schools + Checklist side by side ─── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Schools — Ranked by athlete overlap */}
          <section className="bg-white border border-gray-100 sm:rounded-xl overflow-hidden" data-testid="prep-schools-section">
            <div className="px-4 py-3 border-b border-gray-50 flex items-center justify-between">
              <div>
                <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Target Schools ({targetSchools.length})</h2>
                <p className="text-[10px] text-gray-400 mt-0.5">Ranked by how many of your athletes target them</p>
              </div>
              <button
                onClick={() => setShowManageSchools(true)}
                className="flex items-center gap-1 px-3 py-1.5 text-[11px] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors"
                data-testid="manage-schools-button"
              >
                <Plus className="w-3 h-3" /> Manage Schools
              </button>
            </div>
            <div className="divide-y divide-gray-50">
              {sortedSchools.length === 0 && (
                <div className="px-4 py-8 text-center">
                  <GraduationCap className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-400">No schools added yet</p>
                  <button
                    onClick={() => setShowManageSchools(true)}
                    className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors"
                    data-testid="add-schools-empty-cta"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Schools
                  </button>
                </div>
              )}
              {sortedSchools.map((s, i) => (
                <div key={s.id} className="px-4 py-2.5 flex items-center justify-between" data-testid={`prep-school-${s.id}`}>
                  <div className="flex items-center gap-2.5">
                    <UniversityLogo domain={s.domain} name={s.name} logoUrl={s.logo_url} size={28} />
                    <div>
                      <span className="text-sm font-medium text-gray-900">{s.name}</span>
                      <span className="text-[10px] text-gray-400 ml-1.5">{s.division}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Users className="w-3 h-3 text-gray-300" />
                    <span className={`text-[11px] font-semibold ${s.athleteOverlap > 0 ? "text-slate-700" : "text-gray-300"}`}>
                      {s.athleteOverlap}
                    </span>
                    <span className="text-[10px] text-gray-400">athlete{s.athleteOverlap !== 1 ? "s" : ""}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Prep Checklist */}
          <section className="bg-white border border-gray-100 sm:rounded-xl overflow-hidden" data-testid="prep-checklist-section">
            <div className="px-4 py-3 border-b border-gray-50 flex items-center justify-between">
              <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Prep Checklist</h2>
              <span className="text-[11px] font-semibold text-gray-500">{completed}/{checklist.length}</span>
            </div>
            <div className="px-4 py-2 divide-y divide-gray-50">
              {checklist.map((item) => (
                <button
                  key={item.id}
                  onClick={() => toggleCheck(item.id)}
                  className="w-full flex items-center gap-3 py-2.5 text-left hover:bg-gray-50/50 transition-colors rounded"
                  data-testid={`checklist-${item.id}`}
                >
                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all shrink-0 ${
                    item.completed ? "bg-emerald-500 border-emerald-500" : "border-gray-300 hover:border-emerald-400"
                  }`}>
                    {item.completed && <Check className="w-3 h-3 text-white" />}
                  </div>
                  <span className={`text-sm ${item.completed ? "text-gray-400 line-through" : "text-gray-700"}`}>{item.label}</span>
                </button>
              ))}
            </div>
            <div className="px-4 pb-3">
              <div className="w-full bg-gray-100 rounded-full h-1.5">
                <div className="bg-emerald-500 h-1.5 rounded-full transition-all" style={{ width: `${checklist.length > 0 ? (completed / checklist.length) * 100 : 0}%` }} />
              </div>
            </div>
          </section>
        </div>
      </main>

      <AddAthletesDialog
        open={showAddAthletes}
        onOpenChange={setShowAddAthletes}
        eventId={eventId}
        currentAthleteIds={event.athlete_ids || []}
        onUpdated={fetchPrep}
      />

      <ManageSchoolsDialog
        open={showManageSchools}
        onOpenChange={setShowManageSchools}
        eventId={eventId}
        currentSchoolIds={event.school_ids || []}
        onUpdated={fetchPrep}
      />
    </div>
  );
}

export default EventPrep;

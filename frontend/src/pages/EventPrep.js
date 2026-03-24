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
      <DialogContent className="sm:max-w-[440px]" style={{ background: "#161921", border: "1px solid rgba(255,255,255,0.08)" }} data-testid="add-athletes-dialog">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold" style={{ color: "#f0f0f2" }}>Manage Athletes</DialogTitle>
          <DialogDescription className="text-xs" style={{ color: "#5c5e6a" }}>Add or remove athletes from this event.</DialogDescription>
        </DialogHeader>
        {loading ? (
          <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-6 w-6 border-b-2" style={{ borderColor: "#5c5e6a" }} /></div>
        ) : (
          <div className="space-y-1 mt-2 max-h-[400px] overflow-y-auto">
            {roster.map((a) => {
              const isAdded = addedSet.has(a.id);
              const isLoading = toggling === a.id;
              return (
                <div
                  key={a.id}
                  className="flex items-center justify-between px-3 py-2.5 rounded-lg transition-colors"
                  style={{
                    background: isAdded ? "rgba(16,185,129,0.06)" : "rgba(255,255,255,0.03)",
                    border: `1px solid ${isAdded ? "rgba(16,185,129,0.15)" : "rgba(255,255,255,0.06)"}`,
                  }}
                  data-testid={`roster-athlete-${a.id}`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {a.photo_url ? (
                      <img src={a.photo_url} alt={a.name} className="w-8 h-8 rounded-full object-cover" />
                    ) : (
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold" style={{ background: "rgba(255,255,255,0.08)", color: "#8b8d98" }}>
                        {(a.name || "").split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2)}
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: "#f0f0f2" }}>{a.name}</p>
                      <p className="text-[10px]" style={{ color: "#5c5e6a" }}>{a.position} · {a.grad_year}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => toggleAthlete(a.id, isAdded)}
                    disabled={isLoading}
                    className={`flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${isLoading ? "opacity-50" : ""}`}
                    style={{
                      color: isAdded ? "#ef4444" : "#10b981",
                      background: isAdded ? "rgba(239,68,68,0.08)" : "rgba(16,185,129,0.08)",
                      border: `1px solid ${isAdded ? "rgba(239,68,68,0.20)" : "rgba(16,185,129,0.20)"}`,
                    }}
                    data-testid={`toggle-athlete-${a.id}`}
                  >
                    {isLoading ? "..." : isAdded ? (<><X className="w-3 h-3" /> Remove</>) : (<><Plus className="w-3 h-3" /> Add</>)}
                  </button>
                </div>
              );
            })}
            {roster.length === 0 && <p className="text-sm text-center py-6" style={{ color: "#5c5e6a" }}>No athletes in your roster</p>}
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
      <DialogContent className="sm:max-w-[460px]" style={{ background: "#161921", border: "1px solid rgba(255,255,255,0.08)" }} data-testid="manage-schools-dialog">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold" style={{ color: "#f0f0f2" }}>Manage Schools</DialogTitle>
          <DialogDescription className="text-xs" style={{ color: "#5c5e6a" }}>Add or remove schools attending this event.</DialogDescription>
        </DialogHeader>

        {/* Add custom school */}
        <div className="flex items-center gap-2 mt-1" data-testid="add-custom-school-form">
          <input
            type="text"
            placeholder="Add a school not listed..."
            className="flex-1 px-3 py-2 text-sm rounded-lg focus:outline-none"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: "#f0f0f2" }}
            value={customName}
            onChange={(e) => setCustomName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addCustomSchool()}
            data-testid="custom-school-input"
          />
          <button
            onClick={addCustomSchool}
            disabled={addingCustom || !customName.trim()}
            className="px-3 py-2 text-sm font-semibold rounded-lg transition-colors disabled:opacity-50"
            style={{ background: "#ff6a3d", color: "#fff" }}
            data-testid="custom-school-add-btn"
          >
            {addingCustom ? "..." : "Add"}
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-6 w-6 border-b-2" style={{ borderColor: "#5c5e6a" }} /></div>
        ) : (
          <div className="space-y-1 mt-2 max-h-[350px] overflow-y-auto">
            {allSchools.map((s) => {
              const isAdded = addedSet.has(s.id);
              const isLoading = toggling === s.id;
              return (
                <div
                  key={s.id}
                  className="flex items-center justify-between px-3 py-2.5 rounded-lg transition-colors"
                  style={{
                    background: isAdded ? "rgba(16,185,129,0.06)" : "rgba(255,255,255,0.03)",
                    border: `1px solid ${isAdded ? "rgba(16,185,129,0.15)" : "rgba(255,255,255,0.06)"}`,
                  }}
                  data-testid={`school-item-${s.id}`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.06)" }}>
                      <GraduationCap className="w-4 h-4" style={{ color: "#8b8d98" }} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: "#f0f0f2" }}>{s.name}</p>
                      {s.division && <p className="text-[10px]" style={{ color: "#5c5e6a" }}>{s.division}</p>}
                    </div>
                  </div>
                  <button
                    onClick={() => toggleSchool(s.id, isAdded)}
                    disabled={isLoading}
                    className={`flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${isLoading ? "opacity-50" : ""}`}
                    style={{
                      color: isAdded ? "#ef4444" : "#10b981",
                      background: isAdded ? "rgba(239,68,68,0.08)" : "rgba(16,185,129,0.08)",
                      border: `1px solid ${isAdded ? "rgba(239,68,68,0.20)" : "rgba(16,185,129,0.20)"}`,
                    }}
                    data-testid={`toggle-school-${s.id}`}
                  >
                    {isLoading ? "..." : isAdded ? (<><X className="w-3 h-3" /> Remove</>) : (<><Plus className="w-3 h-3" /> Add</>)}
                  </button>
                </div>
              );
            })}
            {allSchools.length === 0 && <p className="text-sm text-center py-6" style={{ color: "#5c5e6a" }}>No schools available</p>}
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

  if (loading) return <div className="flex items-center justify-center py-32"><div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: "#5c5e6a" }} /></div>;
  if (!data || data.error) return <div className="flex items-center justify-center py-32"><p style={{ color: "#5c5e6a" }}>Event not found</p></div>;

  const { event, athletes, targetSchools, checklist, blockers } = data;
  const completed = checklist.filter((c) => c.completed).length;
  const sortedAthletes = [...athletes].sort((a, b) => (PREP_ORDER[a.prepStatus] ?? 2) - (PREP_ORDER[b.prepStatus] ?? 2));
  const sortedSchools = [...targetSchools].sort((a, b) => b.athleteOverlap - a.athleteOverlap);
  const readyCt = athletes.filter(a => a.prepStatus === "ready").length;
  const notReadyCt = athletes.length - readyCt;

  return (
    <div data-testid="event-prep-page">
      {/* Header */}
      <header style={{ background: "#161921", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 sm:gap-4 min-w-0">
            <button onClick={() => navigate("/events")} className="flex items-center gap-1.5 text-sm transition-colors shrink-0" style={{ color: "#8b8d98" }} data-testid="back-to-events">
              <ArrowLeft className="w-4 h-4" /><span className="hidden sm:inline">Events</span>
            </button>
            <div className="h-5 w-px shrink-0" style={{ background: "rgba(255,255,255,0.08)" }} />
            <div className="min-w-0">
              <h1 className="font-semibold text-sm sm:text-base leading-tight truncate" style={{ color: "#f0f0f2" }} data-testid="prep-event-name">{event.name} — Prep</h1>
              <div className="flex items-center gap-3 text-xs" style={{ color: "#5c5e6a" }}>
                <span className="flex items-center gap-1 truncate"><MapPin className="w-3 h-3 shrink-0" />{event.location}</span>
                <span className="font-medium shrink-0" style={{ color: event.daysAway <= 2 ? "#ef4444" : "#8b8d98" }}>{event.daysAway <= 1 ? "TOMORROW" : `IN ${event.daysAway} DAYS`}</span>
              </div>
            </div>
          </div>
          <button
            onClick={() => navigate(`/events/${eventId}/live`)}
            className="flex items-center gap-1.5 px-3 sm:px-4 py-2 text-xs font-semibold text-white rounded-lg transition-colors shrink-0"
            style={{ background: "#dc2626" }}
            data-testid="go-live-btn"
          >
            <Zap className="w-3.5 h-3.5" /> Go Live <ChevronRight className="w-3 h-3" />
          </button>
        </div>
      </header>

      <main className="max-w-[1200px] mx-auto px-4 sm:px-6 py-6 space-y-5">

        {/* ─── Quick Summary Bar ─── */}
        <div className="flex items-center gap-3 flex-wrap" data-testid="prep-summary-bar">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <Users className="w-3.5 h-3.5" style={{ color: "#5c5e6a" }} />
            <span className="font-semibold" style={{ color: "#f0f0f2" }}>{athletes.length}</span>
            <span style={{ color: "#5c5e6a" }}>athletes</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <GraduationCap className="w-3.5 h-3.5" style={{ color: "#5c5e6a" }} />
            <span className="font-semibold" style={{ color: "#f0f0f2" }}>{targetSchools.length}</span>
            <span style={{ color: "#5c5e6a" }}>schools</span>
          </div>
          {readyCt > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs" style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.15)" }}>
              <CheckCircle2 className="w-3.5 h-3.5" style={{ color: "#10b981" }} />
              <span className="font-semibold" style={{ color: "#10b981" }}>{readyCt}</span>
              <span style={{ color: "rgba(16,185,129,0.7)" }}>ready</span>
            </div>
          )}
          {notReadyCt > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs" style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.15)" }}>
              <Clock className="w-3.5 h-3.5" style={{ color: "#f59e0b" }} />
              <span className="font-semibold" style={{ color: "#f59e0b" }}>{notReadyCt}</span>
              <span style={{ color: "rgba(245,158,11,0.7)" }}>need{notReadyCt > 1 ? "" : "s"} attention</span>
            </div>
          )}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <Check className="w-3.5 h-3.5" style={{ color: "#5c5e6a" }} />
            <span className="font-semibold" style={{ color: "#f0f0f2" }}>{completed}/{checklist.length}</span>
            <span style={{ color: "#5c5e6a" }}>prep done</span>
          </div>
        </div>

        {/* ─── Blockers — Promoted to Top ─── */}
        {blockers.length > 0 && (
          <section className="rounded-xl overflow-hidden" style={{ border: "1px solid rgba(220,38,38,0.25)", background: "rgba(220,38,38,0.06)" }} data-testid="prep-blockers-section">
            <div className="px-4 py-3 flex items-center gap-2" style={{ borderBottom: "1px solid rgba(220,38,38,0.15)" }}>
              <Shield className="w-4 h-4" style={{ color: "#ef4444" }} />
              <h2 className="text-xs font-bold uppercase tracking-wider" style={{ color: "#ef4444" }}>Blockers — Resolve Before Event</h2>
            </div>
            <div style={{ borderTop: "none" }}>
              {blockers.map((b, i) => (
                <div key={i} className="px-4 py-3 flex items-start justify-between gap-4" style={i > 0 ? { borderTop: "1px solid rgba(220,38,38,0.10)" } : {}}>
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
                    style={{ color: "#f87171", background: "rgba(239,68,68,0.10)", border: "1px solid rgba(239,68,68,0.20)" }}
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
        <section className="rounded-xl overflow-hidden" style={{ background: "#161921", border: "1px solid rgba(255,255,255,0.06)" }} data-testid="prep-athletes-section">
          <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            <h2 className="text-xs font-bold uppercase tracking-wider" style={{ color: "#5c5e6a" }}>Athletes ({athletes.length})</h2>
            <button
              onClick={() => setShowAddAthletes(true)}
              className="flex items-center gap-1 px-3 py-1.5 text-[11px] font-semibold rounded-lg transition-colors"
              style={{ color: "#ff6a3d", background: "rgba(255,106,61,0.08)", border: "1px solid rgba(255,106,61,0.20)" }}
              data-testid="add-athletes-button"
            >
              <Plus className="w-3 h-3" /> Manage Athletes
            </button>
          </div>
          <div>
            {sortedAthletes.length === 0 && (
              <div className="px-4 py-8 text-center">
                <Users className="w-8 h-8 mx-auto mb-2" style={{ color: "#3d3f4a" }} />
                <p className="text-sm" style={{ color: "#5c5e6a" }}>No athletes assigned yet</p>
                <button
                  onClick={() => setShowAddAthletes(true)}
                  className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg transition-colors"
                  style={{ color: "#ff6a3d", background: "rgba(255,106,61,0.08)", border: "1px solid rgba(255,106,61,0.20)" }}
                  data-testid="add-athletes-empty-cta"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Athletes
                </button>
              </div>
            )}
            {sortedAthletes.map((a, idx) => {
              const cfg = PREP_CONFIG[a.prepStatus] || PREP_CONFIG.ready;
              return (
                <div key={a.id} className="px-4 py-3 flex items-center justify-between gap-3" style={idx > 0 ? { borderTop: "1px solid rgba(255,255,255,0.04)" } : {}} data-testid={`prep-athlete-${a.id}`}>
                  <div className="flex-1 min-w-0 flex items-start gap-3">
                    <div className="relative shrink-0 mt-0.5">
                      {a.photo_url ? (
                        <img src={a.photo_url} alt={a.full_name} className="w-8 h-8 rounded-full object-cover" data-testid={`prep-avatar-${a.id}`} />
                      ) : (
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold" style={{ background: "rgba(255,255,255,0.08)", color: "#8b8d98" }} data-testid={`prep-avatar-${a.id}`}>
                          {(a.full_name || "").split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2)}
                        </div>
                      )}
                      <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 ${cfg.dot}`} style={{ borderColor: "#161921" }} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-medium text-sm" style={{ color: "#f0f0f2" }}>{a.full_name}</span>
                        <span className="text-[10px]" style={{ color: "#5c5e6a" }}>{a.grad_year} · {a.position}</span>
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded" style={{ background: cfg.bg, color: cfg.text }}>{cfg.label}</span>
                      </div>
                    {a.targetSchoolsAtEvent.length > 0 && (
                      <div className="flex items-center gap-1 ml-4 mt-1 flex-wrap">
                        <Target className="w-3 h-3 shrink-0" style={{ color: "#3d3f4a" }} />
                        {a.targetSchoolsAtEvent.map((s, i) => (
                          <span key={i} className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: "rgba(255,255,255,0.04)", color: "#8b8d98", border: "1px solid rgba(255,255,255,0.06)" }}>{s}</span>
                        ))}
                      </div>
                    )}
                    {a.blockers?.length > 0 && (
                      <p className="text-[11px] mt-1 ml-4" style={{ color: "#f87171" }}>{a.blockers[0].why_this_surfaced || a.blockers[0].recommended_action}</p>
                    )}
                    </div>
                  </div>
                  <button
                    onClick={() => navigate(`/support-pods/${a.id}`)}
                    className="text-[10px] flex items-center gap-0.5 transition-colors shrink-0"
                    style={{ color: "#5c5e6a" }}
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
          <section className="rounded-xl overflow-hidden" style={{ background: "#161921", border: "1px solid rgba(255,255,255,0.06)" }} data-testid="prep-schools-section">
            <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
              <div>
                <h2 className="text-xs font-bold uppercase tracking-wider" style={{ color: "#5c5e6a" }}>Target Schools ({targetSchools.length})</h2>
                <p className="text-[10px] mt-0.5" style={{ color: "#3d3f4a" }}>Ranked by how many of your athletes target them</p>
              </div>
              <button
                onClick={() => setShowManageSchools(true)}
                className="flex items-center gap-1 px-3 py-1.5 text-[11px] font-semibold rounded-lg transition-colors"
                style={{ color: "#ff6a3d", background: "rgba(255,106,61,0.08)", border: "1px solid rgba(255,106,61,0.20)" }}
                data-testid="manage-schools-button"
              >
                <Plus className="w-3 h-3" /> Manage Schools
              </button>
            </div>
            <div>
              {sortedSchools.length === 0 && (
                <div className="px-4 py-8 text-center">
                  <GraduationCap className="w-8 h-8 mx-auto mb-2" style={{ color: "#3d3f4a" }} />
                  <p className="text-sm" style={{ color: "#5c5e6a" }}>No schools added yet</p>
                  <button
                    onClick={() => setShowManageSchools(true)}
                    className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg transition-colors"
                    style={{ color: "#ff6a3d", background: "rgba(255,106,61,0.08)", border: "1px solid rgba(255,106,61,0.20)" }}
                    data-testid="add-schools-empty-cta"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Schools
                  </button>
                </div>
              )}
              {sortedSchools.map((s, i) => (
                <div key={s.id} className="px-4 py-2.5 flex items-center justify-between" style={i > 0 ? { borderTop: "1px solid rgba(255,255,255,0.04)" } : {}} data-testid={`prep-school-${s.id}`}>
                  <div className="flex items-center gap-2.5">
                    <UniversityLogo domain={s.domain} name={s.name} logoUrl={s.logo_url} size={28} />
                    <div>
                      <span className="text-sm font-medium" style={{ color: "#f0f0f2" }}>{s.name}</span>
                      <span className="text-[10px] ml-1.5" style={{ color: "#5c5e6a" }}>{s.division}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Users className="w-3 h-3" style={{ color: "#3d3f4a" }} />
                    <span className="text-[11px] font-semibold" style={{ color: s.athleteOverlap > 0 ? "#f0f0f2" : "#3d3f4a" }}>
                      {s.athleteOverlap}
                    </span>
                    <span className="text-[10px]" style={{ color: "#5c5e6a" }}>athlete{s.athleteOverlap !== 1 ? "s" : ""}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Prep Checklist */}
          <section className="rounded-xl overflow-hidden" style={{ background: "#161921", border: "1px solid rgba(255,255,255,0.06)" }} data-testid="prep-checklist-section">
            <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
              <h2 className="text-xs font-bold uppercase tracking-wider" style={{ color: "#5c5e6a" }}>Prep Checklist</h2>
              <span className="text-[11px] font-semibold" style={{ color: "#8b8d98" }}>{completed}/{checklist.length}</span>
            </div>
            <div className="px-4 py-2">
              {checklist.map((item, idx) => (
                <button
                  key={item.id}
                  onClick={() => toggleCheck(item.id)}
                  className="w-full flex items-center gap-3 py-2.5 text-left rounded transition-colors"
                  style={idx > 0 ? { borderTop: "1px solid rgba(255,255,255,0.04)" } : {}}
                  data-testid={`checklist-${item.id}`}
                >
                  <div className="w-5 h-5 rounded flex items-center justify-center transition-all shrink-0" style={{
                    background: item.completed ? "#10b981" : "transparent",
                    border: item.completed ? "2px solid #10b981" : "2px solid #5c5e6a",
                  }}>
                    {item.completed && <Check className="w-3 h-3 text-white" />}
                  </div>
                  <span className="text-sm" style={{ color: item.completed ? "#5c5e6a" : "#f0f0f2", textDecoration: item.completed ? "line-through" : "none" }}>{item.label}</span>
                </button>
              ))}
            </div>
            <div className="px-4 pb-3">
              <div className="w-full rounded-full h-1.5" style={{ background: "rgba(255,255,255,0.06)" }}>
                <div className="h-1.5 rounded-full transition-all" style={{ background: "#10b981", width: `${checklist.length > 0 ? (completed / checklist.length) * 100 : 0}%` }} />
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

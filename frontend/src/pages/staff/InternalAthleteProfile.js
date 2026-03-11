import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import {
  User, Mail, Phone, Play, Loader2, MapPin,
  Link2, Copy, Check, ExternalLink, Eye, EyeOff,
  GraduationCap, Ruler, Activity, Flag, AlertTriangle,
  MessageSquare, Calendar, ArrowLeft, Globe, Shield,
  ChevronDown, ChevronUp
} from "lucide-react";
import { Button } from "../../components/ui/button";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// ── Reusable sub-components ──────────────────────────────────────────

function StatCard({ value, label }) {
  if (!value) return null;
  return (
    <div className="rounded-2xl bg-gray-50 border border-gray-100 text-center py-5 px-3">
      <div className="text-2xl font-extrabold text-slate-800">{value}</div>
      <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mt-1.5">{label}</div>
    </div>
  );
}

function QuickFact({ icon, value, label }) {
  if (!value) return null;
  return (
    <div className="flex items-center gap-2.5">
      <div className="w-8 h-8 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center shrink-0">{icon}</div>
      <div>
        <div className="font-bold text-sm text-slate-800">{value}</div>
        <div className="text-[10px] uppercase tracking-wider text-gray-400">{label}</div>
      </div>
    </div>
  );
}

function ContextSection({ icon: Icon, title, count, color, children, testId }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="rounded-xl border border-gray-100 overflow-hidden" data-testid={testId}>
      <button onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${color}15` }}>
            <Icon className="w-3.5 h-3.5" style={{ color }} />
          </div>
          <span className="text-xs font-bold text-slate-800">{title}</span>
          {count > 0 && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: `${color}15`, color }}>
              {count}
            </span>
          )}
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
      </button>
      {open && <div className="px-4 pb-4 border-t border-gray-50">{children}</div>}
    </div>
  );
}

function formatDate(d) {
  if (!d) return "";
  try {
    return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  } catch { return ""; }
}

// ── Status badge helpers ─────────────────────────────────────────────

const STATUS_COLORS = {
  added: "#6366f1", outreach: "#3b82f6", in_conversation: "#0d9488",
  campus_visit: "#8b5cf6", offer: "#f59e0b", committed: "#10b981",
};

const STATUS_LABELS = {
  added: "Added", outreach: "Outreach", in_conversation: "In Conversation",
  campus_visit: "Campus Visit", offer: "Offer", committed: "Committed",
};

function StatusBadge({ status }) {
  const color = STATUS_COLORS[status] || "#64748b";
  const label = STATUS_LABELS[status] || status;
  return (
    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: `${color}15`, color }}>
      {label}
    </span>
  );
}

// ── Main component ───────────────────────────────────────────────────

export default function InternalAthleteProfile() {
  const { athleteId } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [publishing, setPublishing] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const res = await axios.get(`${API}/internal/athlete/${athleteId}/profile`);
        setData(res.data);
      } catch (e) {
        toast.error(e.response?.data?.detail || "Failed to load athlete profile");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [athleteId]);

  const copyProfileLink = () => {
    if (!data?.slug) return;
    const url = `${window.location.origin}/p/${data.slug}`;
    navigator.clipboard.writeText(url);
    setCopied(true);

    const isVisible = data.settings?.profile_visible;
    if (!isVisible) {
      toast("Link copied! Note: This profile is not published yet. External viewers won't be able to access it until the athlete publishes.", { icon: "⚠️" });
    } else {
      toast.success("Athlete profile link copied!");
    }
    setTimeout(() => setCopied(false), 2000);
  };

  const togglePublish = async () => {
    if (!data) return;
    setPublishing(true);
    const newVal = !data.settings?.profile_visible;
    try {
      const res = await axios.put(`${API}/internal/athlete/${athleteId}/profile/publish`, { profile_visible: newVal });
      setData(prev => ({
        ...prev,
        settings: { ...prev.settings, profile_visible: newVal },
        slug: res.data.slug || prev.slug,
      }));
      toast.success(newVal ? "Profile published!" : "Profile unpublished.");
    } catch (e) {
      toast.error(e.response?.data?.detail || "Failed to update");
    } finally {
      setPublishing(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center py-24" data-testid="internal-profile-loading">
      <Loader2 className="w-7 h-7 animate-spin text-teal-600" />
    </div>
  );

  if (!data) return (
    <div className="text-center py-24" data-testid="internal-profile-error">
      <h2 className="text-lg font-bold text-slate-800">Athlete not found</h2>
      <p className="text-sm text-gray-500 mt-1">This athlete may not exist or you don't have access.</p>
    </div>
  );

  const { profile, coach_summary, completeness, settings, slug, recruiting_context, upcoming_events = [], past_events = [] } = data;
  const isVisible = settings?.profile_visible || false;
  const hasStats = profile.standing_reach || profile.approach_touch || profile.block_touch || profile.wingspan;
  const hasPhoto = profile.photo_url && (profile.photo_url.startsWith("data:") || profile.photo_url.startsWith("http"));
  const hasCoach = profile.parent_name || profile.parent_email;
  const { pipeline, coach_flags, director_actions, recent_interactions } = recruiting_context || {};

  return (
    <div className="pb-12" data-testid="internal-athlete-profile">
      {/* Top bar */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-gray-700" data-testid="back-btn">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Publish toggle */}
          <Button
            onClick={togglePublish}
            disabled={publishing}
            variant={isVisible ? "outline" : "default"}
            className={`text-xs h-8 px-4 ${!isVisible ? "bg-teal-700 hover:bg-teal-800 text-white" : ""}`}
            data-testid="staff-publish-btn"
          >
            {publishing ? <Loader2 className="w-3 h-3 animate-spin mr-1.5" /> : (isVisible ? <EyeOff className="w-3.5 h-3.5 mr-1.5" /> : <Globe className="w-3.5 h-3.5 mr-1.5" />)}
            {isVisible ? "Unpublish" : "Publish Profile"}
          </Button>

          {/* Copy link */}
          <Button variant="outline" className="text-xs h-8 px-4" onClick={copyProfileLink} data-testid="copy-profile-link-btn">
            {copied ? <Check className="w-3.5 h-3.5 mr-1.5 text-teal-600" /> : <Copy className="w-3.5 h-3.5 mr-1.5" />}
            Copy Profile Link
          </Button>

          {/* Preview public */}
          <a href={`/p/${slug}${isVisible ? "" : "?staff_preview=true"}`} target="_blank" rel="noopener noreferrer">
            <Button variant="outline" className="text-xs h-8 px-4" data-testid="preview-public-btn">
              <ExternalLink className="w-3.5 h-3.5 mr-1.5" /> Preview Public Profile
            </Button>
          </a>
        </div>
      </div>

      {/* Unpublished banner */}
      {!isVisible && (
        <div className="flex items-center gap-3 p-3.5 rounded-xl bg-amber-50 border border-amber-200 mb-6" data-testid="unpublished-banner">
          <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
          <div className="flex-1">
            <p className="text-xs font-bold text-amber-800">Profile Not Published</p>
            <p className="text-[10px] text-amber-600 mt-0.5">This profile is only visible to staff. College coaches cannot access it until it is published.</p>
          </div>
        </div>
      )}

      {/* Completeness bar */}
      {completeness && completeness.score < 100 && (
        <div className="p-3.5 rounded-xl bg-white border border-gray-100 mb-6" data-testid="staff-completeness">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Profile Completeness</span>
            <span className="text-xs font-bold" style={{ color: completeness.score >= 80 ? "#0d9488" : completeness.score >= 50 ? "#f59e0b" : "#ef4444" }}>
              {completeness.score}%
            </span>
          </div>
          <div className="w-full h-1.5 rounded-full bg-gray-100">
            <div className="h-1.5 rounded-full transition-all" style={{ width: `${completeness.score}%`, backgroundColor: completeness.score >= 80 ? "#0d9488" : completeness.score >= 50 ? "#f59e0b" : "#ef4444" }} />
          </div>
          {completeness.missing?.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {completeness.missing.map(f => (
                <span key={f} className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-red-50 text-red-500">+ {f}</span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── PROFILE CARD ── */}
      <div className="rounded-2xl bg-white border border-gray-100 overflow-hidden shadow-sm mb-6" data-testid="profile-card">
        <div className="p-6 sm:p-8 flex flex-col sm:flex-row items-center sm:items-start gap-6 sm:gap-10">
          {/* Photo */}
          <div className="shrink-0">
            {hasPhoto ? (
              <img src={profile.photo_url} alt={profile.athlete_name}
                className="w-40 h-52 sm:w-48 sm:h-60 rounded-[16px] object-cover object-[center_15%] border border-gray-100" />
            ) : (
              <div className="w-40 h-52 sm:w-48 sm:h-60 rounded-[16px] bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                <User className="w-16 h-16 text-white/70" />
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 text-center sm:text-left">
            <div className="text-[11px] font-semibold tracking-[2px] uppercase text-emerald-600 mb-1">
              {[profile.position, profile.graduation_year && `Class of ${profile.graduation_year}`].filter(Boolean).join(" \u00B7 ")}
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-800 uppercase leading-tight" data-testid="staff-athlete-name"
              style={{ fontFamily: "'Barlow Condensed', system-ui, sans-serif" }}>
              {profile.athlete_name || "Athlete"}
            </h1>
            <div className="flex flex-wrap gap-1.5 mt-2 justify-center sm:justify-start text-sm font-medium text-gray-500">
              {[profile.club_team, profile.high_school, profile.city && profile.state && `${profile.city}, ${profile.state}`, profile.jersey_number && `#${profile.jersey_number}`]
                .filter(Boolean).map((item, i, arr) => (
                  <span key={i}>{item}{i < arr.length - 1 && <span className="mx-1.5 text-gray-300">&bull;</span>}</span>
                ))}
            </div>

            <div className="flex flex-wrap gap-4 mt-5 justify-center sm:justify-start">
              <QuickFact icon={<Ruler className="w-3.5 h-3.5 text-emerald-600" />} value={profile.height} label="Height" />
              <QuickFact icon={<Activity className="w-3.5 h-3.5 text-emerald-600" />} value={profile.weight && `${profile.weight} lbs`} label="Weight" />
              <QuickFact icon={<GraduationCap className="w-3.5 h-3.5 text-emerald-600" />} value={profile.gpa && `${profile.gpa} GPA`} label="Academics" />
            </div>

            {/* Contact + links */}
            <div className="flex flex-wrap gap-2 mt-5 justify-center sm:justify-start">
              {profile.contact_email && (
                <a href={`mailto:${profile.contact_email}`} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold text-slate-700 bg-gray-100 border border-gray-200 hover:bg-gray-200 transition-all">
                  <Mail className="w-3.5 h-3.5" /> {profile.contact_email}
                </a>
              )}
              {profile.contact_phone && (
                <a href={`tel:${profile.contact_phone}`} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold text-slate-700 bg-gray-100 border border-gray-200 hover:bg-gray-200 transition-all">
                  <Phone className="w-3.5 h-3.5" /> {profile.contact_phone}
                </a>
              )}
              {profile.hudl_profile_url && (
                <a href={profile.hudl_profile_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold text-white bg-orange-500 hover:bg-orange-600 transition-all">
                  <Play className="w-3.5 h-3.5" /> Hudl
                </a>
              )}
              {profile.video_link && (
                <a href={profile.video_link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold text-white bg-emerald-600 hover:bg-emerald-700 transition-all">
                  <Play className="w-3.5 h-3.5" /> Highlights
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Coach summary */}
        {coach_summary && (
          <div className="px-6 sm:px-8 pb-6">
            <div className="p-4 rounded-xl bg-emerald-50/50 border border-emerald-100" data-testid="staff-coach-summary">
              <p className="text-[10px] font-semibold uppercase tracking-[2px] text-emerald-600 mb-1">Recruiting Summary</p>
              <p className="text-xs leading-relaxed text-gray-700">{coach_summary}</p>
            </div>
          </div>
        )}

        {/* Bio */}
        {profile.bio && (
          <div className="px-6 sm:px-8 pb-6">
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2">About</p>
            <p className="text-sm leading-relaxed text-gray-600">{profile.bio}</p>
          </div>
        )}

        {/* Measurables */}
        {hasStats && (
          <div className="px-6 sm:px-8 pb-6">
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2">Athletic Measurables</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <StatCard value={profile.standing_reach} label="Standing Reach" />
              <StatCard value={profile.approach_touch} label="Approach Touch" />
              <StatCard value={profile.block_touch} label="Block Touch" />
              <StatCard value={profile.wingspan} label="Wingspan" />
            </div>
          </div>
        )}

        {/* Club Coach */}
        {hasCoach && (
          <div className="px-6 sm:px-8 pb-6">
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2">Club Coach</p>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-bold shrink-0">
                {(profile.parent_name || "C")[0].toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-bold text-slate-800">{profile.parent_name}</p>
                {profile.parent_email && <p className="text-[11px] text-gray-500">{profile.parent_email}</p>}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── RECRUITING CONTEXT ── */}
      <div className="space-y-3" data-testid="recruiting-context">
        <h2 className="text-[11px] font-bold uppercase tracking-[2px] text-gray-400 flex items-center gap-2">
          <Shield className="w-3.5 h-3.5" /> Internal Recruiting Context
        </h2>

        {/* Pipeline */}
        <ContextSection icon={MapPin} title="Pipeline Status" count={pipeline?.total_schools || 0} color="#6366f1" testId="context-pipeline">
          {pipeline?.total_schools > 0 ? (
            <div className="space-y-3 pt-3">
              {/* Stage distribution */}
              <div className="flex flex-wrap gap-2">
                {Object.entries(pipeline.stages || {}).map(([stage, count]) => (
                  <div key={stage} className="flex items-center gap-1.5">
                    <StatusBadge status={stage} />
                    <span className="text-[10px] font-bold text-gray-500">{count}</span>
                  </div>
                ))}
              </div>
              {/* Schools list */}
              <div className="space-y-1.5">
                {pipeline.schools?.slice(0, 10).map(s => (
                  <div key={s.program_id} className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-gray-50">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xs font-medium text-slate-800 truncate">{s.university_name}</span>
                      <StatusBadge status={s.recruiting_status} />
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {s.reply_status && <span className="text-[10px] text-gray-400">{s.reply_status}</span>}
                      {s.next_action_due && <span className="text-[10px] text-gray-400">Due {formatDate(s.next_action_due)}</span>}
                    </div>
                  </div>
                ))}
                {(pipeline.schools?.length || 0) > 10 && (
                  <p className="text-[10px] text-gray-400 pl-2">+{pipeline.schools.length - 10} more schools</p>
                )}
              </div>
            </div>
          ) : (
            <p className="text-xs text-gray-400 pt-3">No schools in pipeline yet.</p>
          )}
        </ContextSection>

        {/* Coach Flags */}
        <ContextSection icon={Flag} title="Coach Flags" count={coach_flags?.length || 0} color="#f59e0b" testId="context-flags">
          {coach_flags?.length > 0 ? (
            <div className="space-y-2 pt-3">
              {coach_flags.map(f => (
                <div key={f.flag_id} className="p-2.5 rounded-lg bg-amber-50/50 border border-amber-100">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-800">{f.reason?.replace(/_/g, " ")}</span>
                    {f.due && <span className="text-[10px] text-amber-600">Due: {f.due}</span>}
                  </div>
                  {f.university_name && <p className="text-[10px] text-gray-500 mt-0.5">{f.university_name}</p>}
                  {f.note && <p className="text-[10px] text-gray-600 mt-1">{f.note}</p>}
                  <p className="text-[9px] text-gray-400 mt-1">Flagged by {f.coach_name} &middot; {formatDate(f.created_at)}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-gray-400 pt-3">No active coach flags.</p>
          )}
        </ContextSection>

        {/* Director Actions */}
        <ContextSection icon={AlertTriangle} title="Director Actions" count={director_actions?.length || 0} color="#ef4444" testId="context-actions">
          {director_actions?.length > 0 ? (
            <div className="space-y-2 pt-3">
              {director_actions.map(a => (
                <div key={a.action_id} className="p-2.5 rounded-lg bg-red-50/50 border border-red-100">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-red-800">{a.action_type?.replace(/_/g, " ")}</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                      style={{
                        backgroundColor: a.status === "open" ? "#fef3c7" : "#d1fae5",
                        color: a.status === "open" ? "#92400e" : "#065f46"
                      }}>
                      {a.status}
                    </span>
                  </div>
                  <p className="text-[10px] text-gray-600 mt-0.5">{a.reason?.replace(/_/g, " ")}{a.risk_level ? ` (${a.risk_level})` : ""}</p>
                  {a.note && <p className="text-[10px] text-gray-500 mt-1">{a.note}</p>}
                  <p className="text-[9px] text-gray-400 mt-1">By {a.created_by_name} &middot; {formatDate(a.created_at)}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-gray-400 pt-3">No open director actions.</p>
          )}
        </ContextSection>

        {/* Recent Interactions */}
        <ContextSection icon={MessageSquare} title="Recent Interactions" count={recent_interactions?.length || 0} color="#0d9488" testId="context-interactions">
          {recent_interactions?.length > 0 ? (
            <div className="space-y-1.5 pt-3">
              {recent_interactions.map((ix, i) => (
                <div key={i} className="flex items-start gap-2.5 py-1.5 px-2 rounded-lg hover:bg-gray-50">
                  <div className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${ix.is_meaningful ? "bg-emerald-500" : "bg-gray-300"}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-slate-700">{ix.type}</span>
                      {ix.university_name && <span className="text-[10px] text-gray-400">&middot; {ix.university_name}</span>}
                    </div>
                    {ix.notes && <p className="text-[10px] text-gray-500 truncate mt-0.5">{ix.notes}</p>}
                  </div>
                  <span className="text-[9px] text-gray-400 shrink-0">{formatDate(ix.date)}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-gray-400 pt-3">No recorded interactions.</p>
          )}
        </ContextSection>

        {/* Events */}
        {(upcoming_events.length > 0 || past_events.length > 0) && (
          <ContextSection icon={Calendar} title="Events" count={upcoming_events.length} color="#8b5cf6" testId="context-events">
            <div className="space-y-1.5 pt-3">
              {upcoming_events.map(evt => (
                <div key={evt.event_id} className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-gray-50">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-emerald-600 uppercase">{formatDate(evt.start_date)}</span>
                    <span className="text-xs font-medium text-slate-800">{evt.title}</span>
                  </div>
                  {evt.location && <span className="text-[10px] text-gray-400">{evt.location}</span>}
                </div>
              ))}
            </div>
          </ContextSection>
        )}
      </div>
    </div>
  );
}

import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import {
  ArrowLeft, MapPin, Trophy, Users, DollarSign, GraduationCap,
  Globe, Mail, Plus, Check, Loader2, Building, ExternalLink,
  BarChart3, BookOpen, Shield,
} from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

function StatBox({ icon: Icon, label, value, sub }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-4 h-4 text-slate-400" />
        <span className="text-[10px] font-bold tracking-widest uppercase text-slate-400">{label}</span>
      </div>
      <div className="text-lg font-bold text-slate-900">{value || "—"}</div>
      {sub && <div className="text-[10px] text-slate-500 mt-0.5">{sub}</div>}
    </div>
  );
}

function CoachCard({ coach }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-slate-100 last:border-0">
      <div>
        <p className="text-sm font-semibold text-slate-900">{coach.name}</p>
        <p className="text-xs text-slate-500">{coach.role}</p>
      </div>
      {coach.email && (
        <a
          href={`mailto:${coach.email}`}
          onClick={(e) => e.stopPropagation()}
          className="flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-700 transition-colors"
          data-testid={`coach-email-${coach.name?.replace(/\s/g, "-")}`}
        >
          <Mail className="w-3.5 h-3.5" /> Email
        </a>
      )}
    </div>
  );
}


export default function SchoolDetailPage() {
  const { domain } = useParams();
  const nav = useNavigate();
  const [school, setSchool] = useState(null);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await axios.get(`${API}/athlete/knowledge/${domain}`);
        setSchool(data);
      } catch (err) {
        toast.error("Failed to load school data");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [domain]);

  const handleAddToPipeline = async () => {
    setAdding(true);
    try {
      await axios.post(`${API}/athlete/knowledge/${domain}/add-to-pipeline`);
      toast.success(`${school.university_name} added to your pipeline`);
      setSchool((prev) => ({ ...prev, in_pipeline: true }));
    } catch (err) {
      const msg = err.response?.data?.detail || "Failed to add school";
      toast.error(msg);
    } finally {
      setAdding(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
      </div>
    );
  }

  if (!school) {
    return (
      <div className="text-center py-32" data-testid="school-not-found">
        <GraduationCap className="w-12 h-12 text-slate-300 mx-auto mb-3" />
        <p className="text-sm text-slate-500">School not found</p>
        <button onClick={() => nav("/schools")} className="text-xs text-emerald-600 hover:underline mt-2">
          Back to Knowledge Base
        </button>
      </div>
    );
  }

  const stats = school.program_stats || {};
  const DIVISION_COLORS = {
    D1: "bg-emerald-100 text-emerald-800",
    D2: "bg-blue-100 text-blue-800",
    D3: "bg-amber-100 text-amber-800",
    NAIA: "bg-slate-100 text-slate-700",
  };
  const divClass = DIVISION_COLORS[school.division] || "bg-slate-100 text-slate-700";

  return (
    <div className="space-y-6" data-testid="school-detail-page">
      {/* Back nav */}
      <button
        onClick={() => nav("/schools")}
        className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 transition-colors"
        data-testid="back-to-schools"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Back to Knowledge Base
      </button>

      {/* Hero */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden" data-testid="school-hero">
        <div
          className="h-3 w-full"
          style={{ backgroundColor: school.colors?.[0] || "#64748b" }}
        />
        <div className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div className="flex items-start gap-4">
              <div
                className="w-14 h-14 rounded-xl flex items-center justify-center text-white font-bold text-xl shrink-0"
                style={{ backgroundColor: school.colors?.[0] || "#64748b" }}
              >
                {(school.mascot || "?")[0]}
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900" data-testid="school-detail-name">
                  {school.university_name}
                </h1>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <span className={`text-[10px] font-bold tracking-wide px-2 py-0.5 rounded-full ${divClass}`}>
                    {school.division}
                  </span>
                  <span className="text-xs text-slate-500">{school.conference}</span>
                  <span className="text-xs text-slate-400 flex items-center gap-1">
                    <MapPin className="w-3 h-3" /> {school.city}, {school.state}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1">{school.mascot}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {school.website && (
                <a
                  href={school.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
                  data-testid="school-website-link"
                >
                  <Globe className="w-3.5 h-3.5" /> Website
                </a>
              )}
              {school.in_pipeline ? (
                <span
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-emerald-700 bg-emerald-50 rounded-lg"
                  data-testid="already-in-pipeline"
                >
                  <Check className="w-3.5 h-3.5" /> In Pipeline
                </span>
              ) : (
                <button
                  data-testid="add-to-pipeline-btn"
                  onClick={handleAddToPipeline}
                  disabled={adding}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50"
                >
                  {adding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                  Add to Pipeline
                </button>
              )}
            </div>
          </div>

          {/* Description */}
          {school.description && (
            <p className="text-sm text-slate-600 mt-4 leading-relaxed" data-testid="school-description">
              {school.description}
            </p>
          )}
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3" data-testid="stats-grid">
        <StatBox icon={Trophy} label="Championships" value={stats.national_championships} />
        <StatBox icon={BarChart3} label="Record" value={stats.win_loss_record} sub={stats.home_record ? `Home: ${stats.home_record}` : null} />
        <StatBox icon={Users} label="Roster Size" value={school.roster_size} />
        <StatBox icon={Trophy} label="Conf. Titles" value={stats.conference_titles} />
        <StatBox icon={BookOpen} label="Enrollment" value={school.enrollment?.toLocaleString()} />
        <StatBox icon={GraduationCap} label="Acceptance" value={school.acceptance_rate ? `${school.acceptance_rate}%` : "—"} />
        <StatBox icon={DollarSign} label="In-State Tuition" value={school.tuition_in_state ? `$${school.tuition_in_state.toLocaleString()}` : "—"} />
        <StatBox icon={DollarSign} label="Out-State Tuition" value={school.tuition_out_state ? `$${school.tuition_out_state.toLocaleString()}` : "—"} />
      </div>

      {/* Program details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Coaching Staff */}
        <div className="bg-white rounded-xl border border-slate-200 p-5" data-testid="coaching-staff-section">
          <h2 className="text-xs font-bold tracking-widest uppercase text-slate-400 mb-4">
            Coaching Staff
          </h2>
          {(school.coaching_staff || []).length > 0 ? (
            <div>
              {school.coaching_staff.map((coach, i) => (
                <CoachCard key={i} coach={coach} />
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500">No coaching staff listed</p>
          )}
        </div>

        {/* Program Info */}
        <div className="bg-white rounded-xl border border-slate-200 p-5" data-testid="program-info-section">
          <h2 className="text-xs font-bold tracking-widest uppercase text-slate-400 mb-4">
            Program Info
          </h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2 border-b border-slate-100">
              <span className="text-xs text-slate-500">Facilities</span>
              <span className="text-sm font-medium text-slate-900">{school.facilities || "—"}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-slate-100">
              <span className="text-xs text-slate-500">Scholarships</span>
              <span className="text-sm font-medium text-slate-900">
                {school.athletic_scholarships ? school.scholarship_type || "Yes" : "None (D3/Academic)"}
              </span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-slate-100">
              <span className="text-xs text-slate-500">NCAA Appearances</span>
              <span className="text-sm font-medium text-slate-900">{stats.ncaa_appearances || "—"}</span>
            </div>
            {stats.rpi_ranking && (
              <div className="flex items-center justify-between py-2 border-b border-slate-100">
                <span className="text-xs text-slate-500">RPI Ranking</span>
                <span className="text-sm font-medium text-slate-900">#{stats.rpi_ranking}</span>
              </div>
            )}
            <div className="flex items-center justify-between py-2">
              <span className="text-xs text-slate-500">Avg GPA</span>
              <span className="text-sm font-medium text-slate-900">{school.avg_gpa || "—"}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

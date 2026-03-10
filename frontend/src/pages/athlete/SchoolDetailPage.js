import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import {
  ChevronLeft, Plus, Mail, ExternalLink, Users, User,
  Check, Loader2, Activity, GraduationCap, DollarSign, BookOpen, Sparkles, PieChart, Target
} from "lucide-react";
import UpgradeModal from "../../components/UpgradeModal";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

/* ── Fit label colors ── */
const FIT_COLORS = {
  "Strong Fit": { bg: "rgba(22,163,74,0.15)", text: "#16a34a", border: "rgba(22,163,74,0.2)" },
  "Possible Fit": { bg: "rgba(13,148,136,0.15)", text: "#0d9488", border: "rgba(13,148,136,0.2)" },
  "Stretch": { bg: "rgba(245,158,11,0.12)", text: "#d97706", border: "rgba(245,158,11,0.2)" },
  "Less Likely Fit": { bg: "rgba(239,68,68,0.1)", text: "#dc2626", border: "rgba(239,68,68,0.15)" },
  "Not Enough Data": { bg: "var(--cm-surface-2)", text: "var(--cm-text-3)", border: "var(--cm-border)" },
};

const CONFIDENCE_LABELS = {
  high: "High Confidence",
  medium: "Medium Confidence",
  low: "Low Confidence",
  estimated: "Estimated",
};

const SUB_SCORE_COLORS = {
  division: "#0d9488",
  region: "#6366f1",
  priorities: "#8b5cf6",
  academics: "#2563eb",
  measurables: "#d97706",
};

/* ── Match Ring ── */
function MatchRing({ score }) {
  const pct = score || 0;
  const r = 44, c = 2 * Math.PI * r;
  const offset = c - (pct / 100) * c;
  return (
    <div className="relative flex-shrink-0 w-[100px] h-[100px]" data-testid="match-score-ring">
      <svg width="100" height="100" viewBox="0 0 100 100" className="absolute inset-0">
        <circle cx="50" cy="50" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="6" />
        <circle cx="50" cy="50" r={r} fill="none" stroke="#1a8a80" strokeWidth="6"
          strokeDasharray={c} strokeDashoffset={offset} strokeLinecap="round"
          transform="rotate(-90 50 50)" style={{ transition: "stroke-dashoffset 0.8s ease" }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[22px] font-extrabold text-[#1a8a80] leading-none">{pct}%</span>
        <span className="text-[9px] font-semibold text-[var(--cm-text)]/35 uppercase tracking-[1px] mt-0.5">Match</span>
      </div>
    </div>
  );
}

/* ── Stat Card ── */
function StatCard({ value, label, subtitle, accent }) {
  const isEmpty = !value && value !== 0;
  return (
    <div className="rounded-xl border border-[var(--cm-border)] bg-[var(--cm-surface)] p-5 flex flex-col items-center text-center" data-testid={`stat-card-${label?.replace(/\s+/g, '-').toLowerCase()}`}>
      <div className={`text-[26px] sm:text-[30px] font-black tracking-tight leading-none mb-2 ${
        isEmpty ? "text-[var(--cm-text)]/20" : accent ? "text-[#1a8a80]" : "text-[var(--cm-text)]"
      }`}>
        {isEmpty ? "N/A" : value}
      </div>
      <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--cm-text)]/30 mb-0.5">{label}</div>
      {subtitle && <div className="text-[11px] text-[var(--cm-text)]/20">{subtitle}</div>}
    </div>
  );
}

/* ── Section Header ── */
function SectionHeader({ icon: Icon, title, testId }) {
  return (
    <div className="flex items-center gap-2 mb-4" data-testid={testId}>
      {Icon && <Icon className="w-4 h-4 text-[#1a8a80]" />}
      <h3 className="text-[13px] font-bold uppercase tracking-[0.1em] text-[var(--cm-text)]/40">{title}</h3>
    </div>
  );
}

/* ── Overview Field ── */
function OverviewField({ label, value, isLink }) {
  const linkText = label === "Recruiting Questionnaire" ? "Fill out questionnaire" : "Visit website";
  return (
    <div>
      <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--cm-text)]/30 mb-1.5">{label}</div>
      {isLink && value ? (
        <a href={value.startsWith("http") ? value : `https://${value}`} target="_blank" rel="noreferrer"
          className="text-[13px] text-[#1a8a80] font-semibold hover:underline inline-flex items-center gap-1">
          {linkText} <ExternalLink className="w-3 h-3" />
        </a>
      ) : (
        <div className="text-[13px] font-semibold text-[var(--cm-text)]/70">{value || "\u2014"}</div>
      )}
    </div>
  );
}

/* ── Helpers ── */
function selectivityLabel(rate) {
  if (rate == null) return null;
  if (rate < 0.15) return "Highly selective";
  if (rate < 0.30) return "Selective";
  if (rate < 0.60) return "Moderate";
  return "Open admission";
}

function sizeLabel(size) {
  if (size == null) return null;
  if (size < 2000) return "Small";
  if (size < 10000) return "Medium-sized";
  return "Large";
}

function gradLabel(rate) {
  if (rate == null) return null;
  if (rate > 0.75) return "Excellent";
  if (rate > 0.50) return "Good";
  return "Fair";
}

/* ── Match Breakdown Section ── */
function MatchBreakdown({ matchData }) {
  if (!matchData) return null;
  const { sub_scores, measurables_fit, confidence, explanation, full_explanation, risk_badges } = matchData;
  const fitLabel = measurables_fit?.label;
  const fitColor = FIT_COLORS[fitLabel] || FIT_COLORS["Not Enough Data"];
  const confLabel = CONFIDENCE_LABELS[confidence] || "";

  return (
    <div className="rounded-xl border border-[var(--cm-border)] bg-[var(--cm-surface)] p-5 sm:p-6" data-testid="match-breakdown-section">
      <SectionHeader icon={Target} title="Match Breakdown" testId="match-breakdown-header" />

      {/* Top badges row */}
      <div className="flex flex-wrap items-center gap-2 mb-5">
        <span className="text-[22px] font-black text-[#1a8a80]" data-testid="breakdown-match-pct">{matchData.match_score}%</span>
        <span className="text-[11px] font-semibold text-[var(--cm-text-3)]">Overall Match</span>
        {fitLabel && (
          <span data-testid="breakdown-fit-label" className="text-[11px] font-bold px-2.5 py-0.5 rounded-lg" style={{ background: fitColor.bg, color: fitColor.text, border: `1px solid ${fitColor.border}` }}>
            {fitLabel}
          </span>
        )}
        {confLabel && (
          <span data-testid="breakdown-confidence" className="text-[10px] font-semibold italic text-[var(--cm-text-3)]">{confLabel}</span>
        )}
      </div>

      {/* Sub-score bars */}
      {sub_scores && (
        <div className="space-y-3 mb-5" data-testid="sub-scores-bars">
          {Object.entries(sub_scores).map(([key, ss]) => {
            const pct = ss.max > 0 ? Math.round((ss.score / ss.max) * 100) : 0;
            const barColor = SUB_SCORE_COLORS[key] || "#0d9488";
            return (
              <div key={key} data-testid={`sub-score-${key}`}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-semibold text-[var(--cm-text-2)]">{ss.label}</span>
                  <span className="text-[11px] font-bold text-[var(--cm-text)]">{ss.score}/{ss.max}</span>
                </div>
                <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: "var(--cm-surface-2)" }}>
                  <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: barColor }} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Measurables detail */}
      {measurables_fit?.details && Object.keys(measurables_fit.details).length > 0 && (
        <div className="rounded-lg p-3 mb-4" style={{ background: "var(--cm-surface-2)", border: "1px solid var(--cm-border)" }} data-testid="measurables-detail">
          <div className="text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--cm-text-3)] mb-2">Athletic Measurables</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {Object.entries(measurables_fit.details).map(([key, d]) => (
              <div key={key} className="flex items-center justify-between text-[11px]">
                <span className="font-semibold text-[var(--cm-text-2)] capitalize">{key.replace(/_/g, ' ')}</span>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-[var(--cm-text)]">{d.value}</span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded font-semibold" style={{
                    background: d.status === "match" ? "rgba(22,163,74,0.15)" : d.status === "close" ? "rgba(245,158,11,0.12)" : "rgba(239,68,68,0.1)",
                    color: d.status === "match" ? "#16a34a" : d.status === "close" ? "#d97706" : "#dc2626",
                  }}>
                    {d.status === "match" ? "In Range" : d.status === "close" ? "Close" : "Below"}
                  </span>
                  <span className="text-[9px] text-[var(--cm-text-3)]">{d.benchmark}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Risk badges */}
      {risk_badges?.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4" data-testid="risk-badges">
          {risk_badges.map(b => (
            <span key={b.key} className="text-[10px] font-bold px-2 py-1 rounded-lg" style={{
              background: b.severity === "warning" ? "rgba(239,68,68,0.1)" : b.severity === "time" ? "rgba(245,158,11,0.1)" : "var(--cm-surface-2)",
              color: b.severity === "warning" ? "#dc2626" : b.severity === "time" ? "#d97706" : "var(--cm-text-3)",
              border: `1px solid ${b.severity === "warning" ? "rgba(239,68,68,0.15)" : b.severity === "time" ? "rgba(245,158,11,0.15)" : "var(--cm-border)"}`,
            }}>
              {b.label}
            </span>
          ))}
        </div>
      )}

      {/* Explanation */}
      {(full_explanation || explanation) && (
        <div className="rounded-lg p-3" style={{ background: "var(--cm-surface-2)" }} data-testid="breakdown-explanation">
          <div className="text-[12px] leading-relaxed text-[var(--cm-text-2)]">{full_explanation || explanation}</div>
        </div>
      )}
    </div>
  );
}

export default function SchoolDetailPage() {
  const { domain } = useParams();
  const navigate = useNavigate();
  const [school, setSchool] = useState(null);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [matchData, setMatchData] = useState(null);

  const token = localStorage.getItem("token");
  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  useEffect(() => {
    axios.get(`${API}/knowledge-base/school/${domain}`, { headers })
      .then(res => setSchool(res.data))
      .catch(() => { toast.error("School not found"); navigate("/schools"); })
      .finally(() => setLoading(false));
  }, [domain, navigate]);

  // Fetch V2 match data for this school (if on board)
  useEffect(() => {
    if (!school?.university_name) return;
    axios.get(`${API}/match-scores`, { headers })
      .then(res => {
        const scores = res.data?.scores || [];
        const found = scores.find(s => s.university_name === school.university_name);
        if (found) setMatchData(found);
      })
      .catch(() => {});
  }, [school?.university_name]);

  const addToBoard = async () => {
    if (!school) return;
    setAdding(true);
    try {
      await axios.post(`${API}/knowledge-base/add-to-board`, { university_name: school.university_name }, { headers });
      toast.success(`${school.university_name} added to your board!`);
      setSchool(prev => ({ ...prev, on_board: true }));
    } catch (err) {
      const detail = err.response?.data?.detail;
      if (detail?.type === "subscription_limit") {
        toast.error(detail.message || `You've reached your limit of ${detail.limit} schools.`);
        setShowUpgrade(true);
      } else {
        toast.error(typeof detail === "string" ? detail : "Failed to add");
      }
    } finally {
      setAdding(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-6 h-6 text-[#1a8a80] animate-spin" />
      </div>
    );
  }
  if (!school) return null;

  const coaches = school.coaches_scraped?.length
    ? school.coaches_scraped
    : [
        school.primary_coach && { name: school.primary_coach, title: "Head Coach", email: school.coach_email },
        school.recruiting_coordinator && { name: school.recruiting_coordinator, title: "Recruiting Coordinator", email: school.coordinator_email },
      ].filter(Boolean);

  const sc = school.scorecard || {};
  const divLabel = { D1: "NCAA D1", D2: "NCAA D2", D3: "NCAA D3", NAIA: "NAIA", JUCO: "JUCO" };

  const fmtPct = (v) => v != null ? `${(v * 100).toFixed(1)}%` : null;
  const fmtMoney = (v) => v != null ? `$${Number(v).toLocaleString()}` : null;
  const fmtRatio = (v) => v != null ? `${v}:1` : null;

  // Extract social links
  const socialLinks = school.social_links || {};
  const twitterUrl = socialLinks.twitter || null;
  const instagramUrl = socialLinks.instagram || null;
  const facebookUrl = socialLinks.facebook || null;

  return (
    <div className="max-w-[960px] mx-auto px-4 sm:px-6 pb-16" data-testid="school-info-page">
      {/* Back link */}
      <button onClick={() => navigate(-1)} data-testid="back-button"
        className="inline-flex items-center gap-1.5 text-[12px] text-[var(--cm-text)]/30 font-semibold mb-5 hover:text-[#1a8a80] transition-colors">
        <ChevronLeft className="w-3.5 h-3.5" /> Back to Find Schools
      </button>

      {/* Dark Hero Card */}
      <div className="rounded-[20px] overflow-hidden mb-6 border border-white/[0.06]"
        style={{ background: "linear-gradient(135deg, var(--cm-hero-from) 0%, var(--cm-surface) 60%, var(--cm-surface-2) 100%)" }}
        data-testid="school-hero">
        <div className="p-5 sm:p-9 flex flex-col sm:flex-row gap-4 sm:gap-7 items-center sm:items-start">
          {school.match_score != null && school.match_score > 0 && (
            <div className="flex flex-col items-center order-first sm:order-last mb-2 sm:mb-0">
              <MatchRing score={school.match_score} />
              {school.match_reasons?.length > 0 && (
                <div className="flex flex-wrap gap-1 justify-center mt-2">
                  {school.match_reasons.map(r => (
                    <span key={r} className="text-[9px] px-1.5 py-0.5 rounded-[5px] font-medium"
                      style={{ backgroundColor: "rgba(26,138,128,0.1)", color: "rgba(26,138,128,0.7)", border: "1px solid rgba(26,138,128,0.15)" }}>{r}</span>
                  ))}
                </div>
              )}
            </div>
          )}
          <div className="flex-1 min-w-0 text-center sm:text-left">
            {school.logo_url && (
              <img src={school.logo_url} alt="" className="w-12 h-12 rounded-lg object-contain mb-3 mx-auto sm:mx-0" onError={e => e.target.style.display = 'none'} />
            )}
            <h1 className="text-xl sm:text-[28px] font-extrabold text-[var(--cm-text)] tracking-tight mb-1.5 leading-tight" data-testid="school-name">
              {school.university_name}
            </h1>
            <div className="flex flex-wrap items-center gap-1.5 mb-3 justify-center sm:justify-start">
              {school.division && (
                <span className="px-2.5 py-0.5 rounded-lg text-[11px] font-bold" data-testid="school-division"
                  style={{ backgroundColor: "rgba(26,138,128,0.2)", color: "#1a8a80" }}>{school.division}</span>
              )}
              {school.conference && (
                <span className="px-2.5 py-0.5 rounded-lg text-[11px] font-semibold" style={{ backgroundColor: "var(--cm-surface-2)", color: "var(--cm-text-2)" }}>{school.conference}</span>
              )}
              {school.region && (
                <span className="px-2.5 py-0.5 rounded-lg text-[11px] font-semibold" style={{ backgroundColor: "var(--cm-surface-2)", color: "var(--cm-text-2)" }}>{school.region}</span>
              )}
            </div>
            <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
              <button onClick={addToBoard} disabled={adding || school.on_board} data-testid="add-to-board-btn"
                className="px-4 py-2 sm:px-5 sm:py-2.5 rounded-[10px] text-[12px] sm:text-[13px] font-bold inline-flex items-center gap-1.5 text-[var(--cm-text)] transition-all border-none"
                style={school.on_board
                  ? { background: "rgba(16,185,129,0.2)", color: "#10b981" }
                  : { background: "linear-gradient(135deg, #1a8a80, #25a99e)" }}>
                {school.on_board ? <><Check className="w-4 h-4" /> On Your Board</> : <><Plus className="w-4 h-4" /> {adding ? "Adding..." : "Add to Board"}</>}
              </button>
              {school.website && (
                <a href={school.website} target="_blank" rel="noreferrer" data-testid="visit-website-btn"
                  className="px-4 py-2 sm:px-5 sm:py-2.5 rounded-[10px] text-[12px] sm:text-[13px] font-bold inline-flex items-center gap-1.5 border"
                  style={{ backgroundColor: "var(--cm-surface-2)", color: "var(--cm-text-2)", borderColor: "var(--cm-border)" }}>
                  <ExternalLink className="w-4 h-4" /> Visit Website
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Match Breakdown (V2) */}
      {matchData && (
        <div className="mb-6">
          <MatchBreakdown matchData={matchData} />
        </div>
      )}

      {/* Key Statistics */}
      <div className="mb-6" data-testid="key-statistics-section">
        <SectionHeader icon={Activity} title="Key Statistics" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard value={fmtMoney(sc.tuition_out_of_state || sc.tuition_in_state)} label="Tuition" subtitle="Out-of-state" />
          <StatCard value={fmtPct(sc.admission_rate)} label="Acceptance Rate" subtitle={selectivityLabel(sc.admission_rate)} accent={sc.admission_rate != null && sc.admission_rate < 0.30} />
          <StatCard value={sc.student_size ? Number(sc.student_size).toLocaleString() : null} label="Undergrads" subtitle={sizeLabel(sc.student_size)} />
          <StatCard value={fmtPct(sc.graduation_rate)} label="Graduation Rate" subtitle={gradLabel(sc.graduation_rate)} accent={sc.graduation_rate != null && sc.graduation_rate > 0.50} />
        </div>
      </div>

      <div className="flex flex-col gap-5">
        {/* Program Overview */}
        <div className="rounded-xl border border-[var(--cm-border)] bg-[var(--cm-surface)] p-5 sm:p-6" data-testid="program-overview-section">
          <SectionHeader icon={BookOpen} title="Program Overview" />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4 pb-4 border-b border-white/[0.06]">
            <OverviewField label="Division" value={
              school.division ? <span className="inline-block px-2 py-0.5 rounded text-[12px] font-bold border border-[#1a8a80]/20 text-[#1a8a80] bg-[#1a8a80]/5">{divLabel[school.division] || school.division}</span> : "\u2014"
            } />
            <OverviewField label="Conference" value={school.conference || "\u2014"} />
            <OverviewField label="Program Website" value={school.website} isLink />
            <OverviewField label="Academic Website" value={school.domain ? `https://${school.domain}` : null} isLink />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <OverviewField label="Recruiting Questionnaire" value={school.questionnaire_url} isLink />
            <OverviewField label="Twitter/X" value={twitterUrl} isLink />
            <OverviewField label="Instagram" value={instagramUrl} isLink />
            <OverviewField label="Facebook" value={facebookUrl} isLink />
          </div>
        </div>

        {/* Coaching Staff */}
        <div data-testid="coaching-staff-section">
          <SectionHeader icon={Users} title="Coaching Staff" />
          {coaches.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              {coaches.map((c, i) => (
                <div key={i} className="rounded-xl border border-[var(--cm-border)] bg-[var(--cm-surface)] p-5" data-testid={`coach-card-${i}`}>
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 bg-[#1a8a80]/10">
                      <User className="w-5 h-5 text-[#1a8a80]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[15px] font-bold text-[var(--cm-text)]">{c.name}</div>
                      <div className="text-[12px] text-[var(--cm-text)]/30 mt-0.5">{c.title || c.role || "Coach"}</div>
                    </div>
                  </div>
                  {c.email && (
                    <div className="flex items-center gap-2.5 mt-4">
                      <Mail className="w-3.5 h-3.5 text-[var(--cm-text)]/30" />
                      <a href={`mailto:${c.email}`} className="text-[13px] text-[#1a8a80] font-medium hover:underline">{c.email}</a>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[13px] text-[var(--cm-text)]/30 mb-4">No coaching staff data available.</p>
          )}
        </div>

        {/* School Profile */}
        <div data-testid="school-profile-section">
          <SectionHeader icon={GraduationCap} title="School Profile" />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard value={fmtPct(sc.graduation_rate)} label="Graduation Rate" subtitle={gradLabel(sc.graduation_rate)} accent={sc.graduation_rate > 0.50} />
            <StatCard value={fmtPct(sc.retention_rate)} label="Retention Rate" />
            <StatCard value={fmtRatio(sc.student_faculty_ratio)} label="Student-Faculty Ratio" />
            <StatCard value={sc.student_size ? Number(sc.student_size).toLocaleString() : null} label="Undergrad Students" subtitle={sizeLabel(sc.student_size)} />
          </div>
        </div>

        {/* Admissions */}
        <div data-testid="admissions-section">
          <SectionHeader icon={BookOpen} title="Admissions" />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard value={sc.avg_gpa || null} label="Average GPA" />
            <StatCard value={sc.act_midpoint ? String(sc.act_midpoint) : null} label="ACT" />
            <StatCard value={sc.sat_avg ? String(sc.sat_avg) : null} label="SAT" />
            <StatCard value={fmtPct(sc.admission_rate)} label="Acceptance Rate" subtitle={selectivityLabel(sc.admission_rate)} accent={sc.admission_rate != null && sc.admission_rate < 0.30} />
          </div>
        </div>

        {/* Financial */}
        <div data-testid="financial-section">
          <SectionHeader icon={DollarSign} title="Financial" />
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <StatCard value={fmtMoney(sc.avg_annual_cost || sc.tuition_out_of_state)} label="Avg. Annual Cost" />
            <StatCard value={fmtMoney(sc.tuition_in_state)} label="Tuition (In-State)" />
            <StatCard value={fmtMoney(sc.median_debt)} label="Median Debt" subtitle="At graduation" />
            <StatCard value={fmtMoney(sc.median_earnings)} label="Median Earnings" subtitle="After graduation" accent />
            <StatCard value={sc.school_type || null} label="School Type" />
          </div>
        </div>

        {/* Campus Diversity */}
        {school.campus_diversity && Object.keys(school.campus_diversity).length > 0 && (
          <div data-testid="campus-diversity-section">
            <SectionHeader icon={PieChart} title="Campus Diversity" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {Object.entries(school.campus_diversity)
                .sort((a, b) => b[1].students - a[1].students)
                .map(([category, data]) => (
                  <div key={category} className="rounded-xl border border-[var(--cm-border)] bg-[var(--cm-surface)] p-4" data-testid={`diversity-${category.replace(/[\s/]+/g, '-').toLowerCase()}`}>
                    <div className="text-[13px] font-semibold mb-3 text-[var(--cm-text)]">{category}</div>
                    <div className="space-y-2.5">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] font-semibold uppercase tracking-wide text-[var(--cm-text)]/30">Students</span>
                          <span className="text-[12px] font-bold text-[var(--cm-text)]">{data.students}%</span>
                        </div>
                        <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: "var(--cm-surface-2)" }}>
                          <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(data.students, 100)}%`, background: "#1a8a80" }} />
                        </div>
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] font-semibold uppercase tracking-wide text-[var(--cm-text)]/30">Faculty</span>
                          <span className="text-[12px] font-bold text-[var(--cm-text)]">{data.faculty}%</span>
                        </div>
                        <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: "var(--cm-surface-2)" }}>
                          <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(data.faculty, 100)}%`, background: "#6366f1" }} />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Additional Details */}
        {(school.mascot || school.scholarship_type || school.region) && (
          <div data-testid="additional-details-section">
            <SectionHeader title="Additional Details" />
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {school.region && (
                <div className="rounded-xl border border-[var(--cm-border)] bg-[var(--cm-surface)] p-4">
                  <div className="text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--cm-text)]/30 mb-1">Location</div>
                  <div className="text-[15px] font-bold text-[var(--cm-text)]">{school.region}{sc.city ? ` \u00B7 ${sc.city}, ${sc.state}` : ""}</div>
                </div>
              )}
              {school.mascot && (
                <div className="rounded-xl border border-[var(--cm-border)] bg-[var(--cm-surface)] p-4">
                  <div className="text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--cm-text)]/30 mb-1">Mascot</div>
                  <div className="text-[15px] font-bold text-[var(--cm-text)]">{school.mascot}</div>
                </div>
              )}
              {school.scholarship_type && (
                <div className="rounded-xl border border-[var(--cm-border)] bg-[var(--cm-surface)] p-4">
                  <div className="text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--cm-text)]/30 mb-1">Scholarship</div>
                  <div className="text-[15px] font-bold text-[var(--cm-text)]">{school.scholarship_type}</div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      {showUpgrade && <UpgradeModal feature="schools" currentTier="basic" onClose={() => setShowUpgrade(false)} />}
    </div>
  );
}

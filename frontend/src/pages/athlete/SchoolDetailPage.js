import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import {
  ChevronLeft, Plus, Mail, ExternalLink, Users, User,
  Check, Loader2, Sparkles, Globe, FileText, ArrowUpRight
} from "lucide-react";
import UpgradeModal from "../../components/UpgradeModal";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

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
  if (size < 10000) return "Mid-size";
  return "Large";
}

const fmtPct = (v) => v != null ? `${(v * 100).toFixed(0)}%` : null;
const fmtMoney = (v) => v != null ? `$${Number(v).toLocaleString()}` : null;

/* ── Match Score (Clean Ring — Ochre) ── */
function MatchRing({ score }) {
  const pct = score || 0;
  const r = 52, c = 2 * Math.PI * r;
  const offset = c - (pct / 100) * c;
  return (
    <div className="relative flex-shrink-0 w-[130px] h-[130px]" data-testid="match-score-ring">
      <svg width="130" height="130" viewBox="0 0 120 120" className="absolute inset-0">
        <circle cx="60" cy="60" r={r} fill="none" stroke="var(--cm-border)" strokeWidth="5" opacity="0.5" />
        <circle cx="60" cy="60" r={r} fill="none" stroke="#8B3F1F" strokeWidth="5"
          strokeDasharray={c} strokeDashoffset={offset} strokeLinecap="round"
          transform="rotate(-90 60 60)" style={{ transition: "stroke-dashoffset 0.8s ease" }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[28px] font-semibold text-[#8B3F1F] leading-none tracking-tight">{pct}</span>
        <span className="text-[10px] font-medium text-[var(--cm-text-3)] uppercase tracking-[1.5px] mt-1">match</span>
      </div>
    </div>
  );
}

/* ── Snapshot Item (borderless) ── */
function SnapshotItem({ label, value, note }) {
  const isEmpty = !value && value !== 0;
  return (
    <div className="flex flex-col gap-0.5" data-testid={`snapshot-${label?.replace(/\s+/g, '-').toLowerCase()}`}>
      <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--cm-text-3)]">{label}</span>
      <span className={`text-[22px] font-medium tracking-tight leading-tight ${isEmpty ? "text-[var(--cm-text-3)]" : "text-[var(--cm-text)]"}`}>
        {isEmpty ? "—" : value}
      </span>
      {note && <span className="text-[11px] text-[var(--cm-text-3)]">{note}</span>}
    </div>
  );
}

/* ── Section Divider ── */
function Divider() {
  return <div className="h-px w-full bg-[var(--cm-border)] opacity-50 my-10 md:my-14" />;
}

/* ── Section Title ── */
function SectionTitle({ children, testId }) {
  return (
    <h2 className="text-base sm:text-lg font-medium text-[var(--cm-text)] tracking-tight mb-6" data-testid={testId}>
      {children}
    </h2>
  );
}

/* ── Build "Why This School" bullets from available data ── */
function buildFitReasons(school, matchData) {
  const reasons = [];
  const sc = school.scorecard || {};
  const sub = matchData?.sub_scores || {};

  // Division fit
  if (school.division) {
    const divScore = sub.division;
    if (divScore && divScore.score >= divScore.max * 0.7) {
      reasons.push({ label: "Division Fit", text: `${school.division} aligns with your recruiting preferences.` });
    } else if (school.division) {
      reasons.push({ label: "Division Fit", text: `Competes at the ${school.division} level.` });
    }
  }

  // Academic fit
  if (sc.admission_rate != null || sc.graduation_rate != null) {
    const acadScore = sub.academics;
    if (acadScore && acadScore.score >= acadScore.max * 0.6) {
      reasons.push({ label: "Academic Fit", text: `Strong academic profile with ${fmtPct(sc.graduation_rate) || "solid"} graduation rate${sc.admission_rate ? ` and ${fmtPct(sc.admission_rate)} acceptance rate` : ""}.` });
    } else {
      const parts = [];
      if (sc.graduation_rate) parts.push(`${fmtPct(sc.graduation_rate)} graduation rate`);
      if (sc.admission_rate) parts.push(`${fmtPct(sc.admission_rate)} acceptance rate`);
      if (parts.length) reasons.push({ label: "Academics", text: parts.join(", ") + "." });
    }
  }

  // Location
  if (school.region) {
    const regScore = sub.region;
    if (regScore && regScore.score >= regScore.max * 0.7) {
      reasons.push({ label: "Location", text: `Located in the ${school.region}${sc.city ? ` (${sc.city}, ${sc.state})` : ""} — matches your location preference.` });
    } else {
      reasons.push({ label: "Location", text: `Located in the ${school.region}${sc.city ? ` — ${sc.city}, ${sc.state}` : ""}.` });
    }
  }

  // Roster / Scholarship opportunity
  if (school.scholarship_type) {
    reasons.push({ label: "Scholarship", text: `Offers ${school.scholarship_type.toLowerCase()} scholarships.` });
  }
  if (school.roster_needs) {
    reasons.push({ label: "Roster Opportunity", text: school.roster_needs });
  }

  // Measurables fit from match data
  if (matchData?.measurables_fit?.label && matchData.measurables_fit.label !== "Not Enough Data") {
    reasons.push({ label: "Athletic Fit", text: `${matchData.measurables_fit.label} based on your measurables.` });
  }

  return reasons;
}

/* ── Build Opportunity & Risk from match data ── */
function buildOpportunity(school, matchData) {
  const items = [];

  // Overall opportunity level from match score
  if (matchData?.match_score != null) {
    const score = matchData.match_score;
    let level, desc;
    if (score >= 75) { level = "high"; desc = "Strong match — this school aligns well with your profile."; }
    else if (score >= 50) { level = "moderate"; desc = "Moderate match — some areas align, others may need attention."; }
    else { level = "low"; desc = "Lower match — consider if specific strengths outweigh the overall fit."; }
    items.push({ label: "Opportunity Level", level, text: desc });
  }

  // Confidence
  if (matchData?.confidence) {
    const confMap = { high: "High confidence", medium: "Medium confidence", low: "Low confidence", estimated: "Estimated" };
    items.push({ label: "Data Confidence", level: matchData.confidence === "high" ? "high" : matchData.confidence === "medium" ? "moderate" : "low", text: `${confMap[matchData.confidence] || matchData.confidence} — ${matchData.confidence_guidance || "based on available data."}` });
  }

  // Risk badges
  if (matchData?.risk_badges?.length) {
    const riskDescriptions = {
      roster_tight: "Roster spots may be limited — competition for positions is higher.",
      timeline_risk: "Be mindful of recruiting timelines and deadlines.",
      low_academic_fit: "Academic requirements may be a stretch for your profile.",
      low_measurables: "Your measurables are below the typical range for this program.",
    };
    matchData.risk_badges.forEach(b => {
      items.push({
        label: b.label,
        level: b.severity === "warning" ? "low" : b.severity === "time" ? "moderate" : "neutral",
        text: riskDescriptions[b.key] || `Factor to consider for this program.`,
      });
    });
  }

  // Roster competition from school data
  if (school.roster_needs) {
    items.push({ label: "Roster Status", level: "moderate", text: school.roster_needs });
  }

  return items;
}

const LEVEL_DOT = {
  high: "#8B3F1F",
  moderate: "var(--cm-text-3)",
  low: "var(--cm-text-3)",
  neutral: "var(--cm-text-3)",
};

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [domain, navigate]);

  useEffect(() => {
    if (!school?.university_name) return;
    axios.get(`${API}/match-scores`, { headers })
      .then(res => {
        const scores = res.data?.scores || [];
        const found = scores.find(s => s.university_name === school.university_name);
        if (found) setMatchData(found);
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
        <Loader2 className="w-5 h-5 text-[#8B3F1F] animate-spin" />
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
  const fitReasons = buildFitReasons(school, matchData);
  const opportunityItems = buildOpportunity(school, matchData);
  const hasMatch = (school.match_score != null && school.match_score > 0) || matchData;
  const displayScore = matchData?.match_score ?? school.match_score ?? 0;
  const aiSummary = matchData?.explanation || matchData?.full_explanation || null;

  // Social links
  const socialLinks = school.social_links || {};

  return (
    <div className="max-w-[860px] mx-auto px-6 md:px-12 pb-20 pt-2" data-testid="school-info-page">
      {/* ─── Back ─── */}
      <button onClick={() => navigate(-1)} data-testid="back-button"
        className="inline-flex items-center gap-1 text-[13px] text-[var(--cm-text-3)] font-medium mb-8 hover:text-[var(--cm-text)] transition-colors">
        <ChevronLeft className="w-4 h-4" /> Back
      </button>

      {/* ═══════════════ HERO ═══════════════ */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-6 mb-4" data-testid="school-hero">
        <div className="flex-1 min-w-0">
          {/* School logo + name */}
          {school.logo_url && (
            <img src={school.logo_url} alt="" className="w-14 h-14 rounded-xl object-contain mb-4" onError={e => e.target.style.display = 'none'} data-testid="school-logo" />
          )}
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-medium text-[var(--cm-text)] tracking-tight leading-[1.1] mb-3" data-testid="school-name">
            {school.university_name}
          </h1>

          {/* Subtle metadata */}
          <div className="flex flex-wrap items-center gap-1 text-[13px] text-[var(--cm-text-3)] font-medium mb-5" data-testid="school-metadata">
            {school.division && <span data-testid="school-division">{school.division}</span>}
            {school.division && school.conference && <span className="mx-1 opacity-40">·</span>}
            {school.conference && <span>{school.conference}</span>}
            {(school.division || school.conference) && school.region && <span className="mx-1 opacity-40">·</span>}
            {school.region && <span>{school.region}</span>}
            {sc.city && sc.state && (
              <>
                <span className="mx-1 opacity-40">·</span>
                <span>{sc.city}, {sc.state}</span>
              </>
            )}
          </div>

          {/* AI Summary */}
          {aiSummary && (
            <p className="text-[15px] sm:text-base text-[var(--cm-text-2)] leading-relaxed max-w-2xl mb-6 line-clamp-2" data-testid="ai-summary">
              {aiSummary}
            </p>
          )}

          {/* CTAs */}
          <div className="flex flex-wrap items-center gap-3" data-testid="hero-ctas">
            <button onClick={addToBoard} disabled={adding || school.on_board} data-testid="add-to-board-btn"
              className={`px-5 py-2.5 rounded-full text-[13px] font-medium inline-flex items-center gap-2 transition-all ${
                school.on_board
                  ? "border border-[var(--cm-border)] text-[var(--cm-text-3)] cursor-default"
                  : "border-2 border-[#8B3F1F] text-[#8B3F1F] hover:bg-[#8B3F1F] hover:text-white"
              }`}>
              {school.on_board ? <><Check className="w-4 h-4" /> On Your Board</> : <><Plus className="w-4 h-4" /> {adding ? "Adding..." : "Add to Pipeline"}</>}
            </button>
            {school.website && (
              <a href={school.website} target="_blank" rel="noreferrer" data-testid="visit-website-btn"
                className="px-5 py-2.5 rounded-full text-[13px] font-medium inline-flex items-center gap-2 text-[var(--cm-text-2)] hover:bg-[var(--cm-surface-2)] transition-colors">
                <Globe className="w-4 h-4" /> Visit Website
              </a>
            )}
          </div>
        </div>

        {/* Match score ring */}
        {hasMatch && displayScore > 0 && (
          <div className="flex-shrink-0 self-center sm:self-start sm:mt-2">
            <MatchRing score={displayScore} />
          </div>
        )}
      </div>

      {/* ═══════════════ WHY THIS SCHOOL ═══════════════ */}
      {fitReasons.length > 0 && (
        <>
          <Divider />
          <div className="rounded-2xl md:rounded-3xl p-6 md:p-8" style={{ backgroundColor: "rgba(139, 63, 31, 0.04)" }} data-testid="why-this-school-section">
            <div className="flex items-center gap-2 mb-5">
              <Sparkles className="w-4 h-4 text-[#8B3F1F]" />
              <h2 className="text-base sm:text-lg font-medium text-[var(--cm-text)] tracking-tight" data-testid="why-this-school-title">Why This School</h2>
            </div>
            <ul className="space-y-4" data-testid="fit-reasons-list">
              {fitReasons.map((r, i) => (
                <li key={i} className="flex items-start gap-3" data-testid={`fit-reason-${i}`}>
                  <span className="w-1.5 h-1.5 rounded-full bg-[#8B3F1F] mt-[7px] flex-shrink-0" />
                  <div>
                    <span className="text-[13px] font-semibold text-[#8B3F1F] mr-2">{r.label}</span>
                    <span className="text-[14px] sm:text-[15px] text-[var(--cm-text-2)] leading-relaxed">{r.text}</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}

      {/* ═══════════════ QUICK SNAPSHOT ═══════════════ */}
      <Divider />
      <SectionTitle testId="quick-snapshot-title">Quick Snapshot</SectionTitle>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-x-8 gap-y-6" data-testid="quick-snapshot-grid">
        <SnapshotItem label="Tuition" value={fmtMoney(sc.tuition_out_of_state || sc.tuition_in_state)} note="Out-of-state" />
        <SnapshotItem label="Acceptance" value={fmtPct(sc.admission_rate)} note={selectivityLabel(sc.admission_rate)} />
        <SnapshotItem label="Students" value={sc.student_size ? Number(sc.student_size).toLocaleString() : null} note={sizeLabel(sc.student_size)} />
        <SnapshotItem label="Graduation" value={fmtPct(sc.graduation_rate)} />
        <SnapshotItem label="Retention" value={fmtPct(sc.retention_rate)} />
        <SnapshotItem label="Student-Faculty" value={sc.student_faculty_ratio ? `${sc.student_faculty_ratio}:1` : null} />
        <SnapshotItem label="SAT Avg" value={sc.sat_avg ? String(sc.sat_avg) : null} />
        <SnapshotItem label="ACT Mid" value={sc.act_midpoint ? String(sc.act_midpoint) : null} />
        {sc.avg_gpa && <SnapshotItem label="Avg GPA" value={sc.avg_gpa} />}
        {sc.avg_annual_cost && <SnapshotItem label="Avg Annual Cost" value={fmtMoney(sc.avg_annual_cost)} />}
        {sc.tuition_in_state && <SnapshotItem label="Tuition (In-State)" value={fmtMoney(sc.tuition_in_state)} />}
        <SnapshotItem label="Median Debt" value={sc.median_debt ? fmtMoney(sc.median_debt) : "N/A"} note="At graduation" />
        {sc.median_earnings && <SnapshotItem label="Median Earnings" value={fmtMoney(sc.median_earnings)} note="Post-graduation" />}
        {sc.school_type && <SnapshotItem label="School Type" value={sc.school_type} />}
        {school.scholarship_type && <SnapshotItem label="Scholarship" value={school.scholarship_type} />}
      </div>

      {/* ═══════════════ OPPORTUNITY & RISK ═══════════════ */}
      {opportunityItems.length > 0 && (
        <>
          <Divider />
          <SectionTitle testId="opportunity-risk-title">Opportunity & Risk</SectionTitle>
          <div className="space-y-4" data-testid="opportunity-risk-section">
            {opportunityItems.map((item, i) => (
              <div key={i} className="flex items-start gap-3" data-testid={`opportunity-item-${i}`}>
                <span className="w-2 h-2 rounded-full mt-[6px] flex-shrink-0" style={{ backgroundColor: LEVEL_DOT[item.level] || "var(--cm-text-3)" }} />
                <div>
                  <span className="text-[13px] font-semibold text-[var(--cm-text)] mr-2">{item.label}</span>
                  <span className="text-[14px] text-[var(--cm-text-2)] leading-relaxed">{item.text}</span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ═══════════════ MATCH BREAKDOWN (if on board) ═══════════════ */}
      {matchData?.sub_scores && (
        <>
          <Divider />
          <SectionTitle testId="match-breakdown-title">Match Breakdown</SectionTitle>
          <div className="space-y-3" data-testid="match-breakdown-section">
            {/* Sub-score bars */}
            {Object.entries(matchData.sub_scores).map(([key, ss]) => {
              const pct = ss.max > 0 ? Math.round((ss.score / ss.max) * 100) : 0;
              return (
                <div key={key} data-testid={`sub-score-${key}`}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[13px] font-medium text-[var(--cm-text-2)]">{ss.label}</span>
                    <span className="text-[13px] font-semibold text-[var(--cm-text)]">{ss.score}/{ss.max}</span>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden bg-[var(--cm-surface-2)]">
                    <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, backgroundColor: "#8B3F1F" }} />
                  </div>
                </div>
              );
            })}

            {/* Measurables detail */}
            {matchData.measurables_fit?.details && Object.keys(matchData.measurables_fit.details).length > 0 && (
              <div className="mt-6 rounded-2xl p-5 bg-[var(--cm-surface-2)]" data-testid="measurables-detail">
                <div className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--cm-text-3)] mb-3">Athletic Measurables</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {Object.entries(matchData.measurables_fit.details).map(([key, d]) => (
                    <div key={key} className="flex items-center justify-between text-[13px]">
                      <span className="font-medium text-[var(--cm-text-2)] capitalize">{key.replace(/_/g, ' ')}</span>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-[var(--cm-text)]">{d.value}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold" style={{
                          background: d.status === "match" ? "rgba(139,63,31,0.1)" : d.status === "close" ? "rgba(139,63,31,0.06)" : "var(--cm-surface-2)",
                          color: d.status === "match" ? "#8B3F1F" : d.status === "close" ? "#8B3F1F" : "var(--cm-text-3)",
                        }}>
                          {d.status === "match" ? "In Range" : d.status === "close" ? "Close" : "Below"}
                        </span>
                        <span className="text-[10px] text-[var(--cm-text-3)]">{d.benchmark}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Full explanation */}
            {matchData.full_explanation && (
              <p className="text-[14px] text-[var(--cm-text-2)] leading-relaxed mt-4" data-testid="breakdown-explanation">
                {matchData.full_explanation}
              </p>
            )}
          </div>
        </>
      )}

      {/* ═══════════════ COACHING STAFF ═══════════════ */}
      {coaches.length > 0 && (
        <>
          <Divider />
          <SectionTitle testId="coaching-staff-title">Coaching Staff</SectionTitle>
          <div data-testid="coaching-staff-section">
            {coaches.map((c, i) => (
              <div key={i}
                className={`flex items-center justify-between py-4 ${i < coaches.length - 1 ? "border-b border-[var(--cm-border)]" : ""}`}
                data-testid={`coach-row-${i}`}>
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 bg-[var(--cm-surface-2)] text-[var(--cm-text-3)]">
                    <User className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[14px] font-medium text-[var(--cm-text)] truncate">{c.name}</div>
                    <div className="text-[12px] text-[var(--cm-text-3)]">{c.title || c.role || "Coach"}</div>
                  </div>
                </div>
                {c.email && (
                  <a href={`mailto:${c.email}`} data-testid={`coach-email-${i}`}
                    className="text-[13px] text-[var(--cm-text-3)] hover:text-[var(--cm-text)] transition-colors flex items-center gap-1.5 flex-shrink-0 ml-4">
                    <Mail className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">{c.email}</span>
                  </a>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {/* ═══════════════ PROGRAM OVERVIEW ═══════════════ */}
      <Divider />
      <SectionTitle testId="program-overview-title">Program Details</SectionTitle>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-8 gap-y-4 text-[14px]" data-testid="program-overview-section">
        {school.division && (
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--cm-text-3)] mb-1">Division</div>
            <div className="font-medium text-[var(--cm-text)]">{school.division}</div>
          </div>
        )}
        {school.conference && (
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--cm-text-3)] mb-1">Conference</div>
            <div className="font-medium text-[var(--cm-text)]">{school.conference}</div>
          </div>
        )}
        {school.mascot && (
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--cm-text-3)] mb-1">Mascot</div>
            <div className="font-medium text-[var(--cm-text)]">{school.mascot}</div>
          </div>
        )}
        {sc.school_type && (
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--cm-text-3)] mb-1">School Type</div>
            <div className="font-medium text-[var(--cm-text)]">{sc.school_type}</div>
          </div>
        )}
        {school.scholarship_type && (
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--cm-text-3)] mb-1">Scholarship</div>
            <div className="font-medium text-[var(--cm-text)]">{school.scholarship_type}</div>
          </div>
        )}
        {school.region && (
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--cm-text-3)] mb-1">Region</div>
            <div className="font-medium text-[var(--cm-text)]">{school.region}{sc.city ? ` — ${sc.city}, ${sc.state}` : ""}</div>
          </div>
        )}
      </div>

      {/* Links row */}
      <div className="flex flex-wrap gap-4 mt-6" data-testid="program-links">
        {school.website && (
          <a href={school.website} target="_blank" rel="noreferrer" data-testid="program-website-link"
            className="text-[13px] text-[var(--cm-text-3)] hover:text-[var(--cm-text)] transition-colors inline-flex items-center gap-1">
            <ArrowUpRight className="w-3.5 h-3.5" /> Program Website
          </a>
        )}
        {school.domain && (
          <a href={`https://${school.domain}`} target="_blank" rel="noreferrer" data-testid="academic-website-link"
            className="text-[13px] text-[var(--cm-text-3)] hover:text-[var(--cm-text)] transition-colors inline-flex items-center gap-1">
            <ArrowUpRight className="w-3.5 h-3.5" /> Academic Website
          </a>
        )}
        {school.questionnaire_url && (
          <a href={school.questionnaire_url.startsWith("http") ? school.questionnaire_url : `https://${school.questionnaire_url}`} target="_blank" rel="noreferrer" data-testid="questionnaire-link"
            className="text-[13px] text-[var(--cm-text-3)] hover:text-[var(--cm-text)] transition-colors inline-flex items-center gap-1">
            <FileText className="w-3.5 h-3.5" /> Recruiting Questionnaire
          </a>
        )}
        {socialLinks.twitter && (
          <a href={socialLinks.twitter} target="_blank" rel="noreferrer" data-testid="twitter-link"
            className="text-[13px] text-[var(--cm-text-3)] hover:text-[var(--cm-text)] transition-colors inline-flex items-center gap-1">
            <ExternalLink className="w-3.5 h-3.5" /> Twitter / X
          </a>
        )}
        {socialLinks.instagram && (
          <a href={socialLinks.instagram} target="_blank" rel="noreferrer" data-testid="instagram-link"
            className="text-[13px] text-[var(--cm-text-3)] hover:text-[var(--cm-text)] transition-colors inline-flex items-center gap-1">
            <ExternalLink className="w-3.5 h-3.5" /> Instagram
          </a>
        )}
        {socialLinks.facebook && (
          <a href={socialLinks.facebook} target="_blank" rel="noreferrer" data-testid="facebook-link"
            className="text-[13px] text-[var(--cm-text-3)] hover:text-[var(--cm-text)] transition-colors inline-flex items-center gap-1">
            <ExternalLink className="w-3.5 h-3.5" /> Facebook
          </a>
        )}
      </div>

      {/* ═══════════════ CAMPUS DIVERSITY ═══════════════ */}
      {school.campus_diversity && Object.keys(school.campus_diversity).length > 0 && (
        <>
          <Divider />
          <SectionTitle testId="campus-diversity-title">Campus Diversity</SectionTitle>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6" data-testid="campus-diversity-section">
            {Object.entries(school.campus_diversity)
              .sort((a, b) => b[1].students - a[1].students)
              .map(([category, data]) => (
                <div key={category} data-testid={`diversity-${category.replace(/[\s/]+/g, '-').toLowerCase()}`}>
                  <div className="text-[13px] font-medium mb-3 text-[var(--cm-text)]">{category}</div>
                  <div className="space-y-2.5">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--cm-text-3)]">Students</span>
                        <span className="text-[12px] font-semibold text-[var(--cm-text)]">{data.students}%</span>
                      </div>
                      <div className="h-1.5 rounded-full overflow-hidden bg-[var(--cm-surface-2)]">
                        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(data.students, 100)}%`, backgroundColor: "#8B3F1F" }} />
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--cm-text-3)]">Faculty</span>
                        <span className="text-[12px] font-semibold text-[var(--cm-text)]">{data.faculty}%</span>
                      </div>
                      <div className="h-1.5 rounded-full overflow-hidden bg-[var(--cm-surface-2)]">
                        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(data.faculty, 100)}%`, backgroundColor: "var(--cm-text-3)" }} />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </>
      )}

      {showUpgrade && <UpgradeModal feature="schools" currentTier="basic" onClose={() => setShowUpgrade(false)} />}
    </div>
  );
}

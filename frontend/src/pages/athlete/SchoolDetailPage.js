import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import {
  ChevronLeft, Plus, Mail, ExternalLink, User,
  Check, Loader2, Sparkles, Globe, FileText, ArrowUpRight, ArrowRight
} from "lucide-react";
import UpgradeModal from "../../components/UpgradeModal";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const ACCENT = "#E65C2A";
const ACCENT_TINT = "rgba(230,92,42,0.08)";
const ACCENT_BORDER = "rgba(230,92,42,0.15)";

/* ── Helpers ── */
function selectivityLabel(rate) {
  if (rate == null) return null;
  if (rate < 0.15) return "Highly selective";
  if (rate < 0.30) return "Competitive";
  if (rate < 0.60) return "Accessible";
  return "Open admission";
}
function sizeLabel(size) {
  if (size == null) return null;
  if (size < 2000) return "Small";
  if (size < 10000) return "Mid-size";
  return "Large";
}
function gradQuality(rate) {
  if (rate == null) return null;
  if (rate > 0.75) return "Strong";
  if (rate > 0.50) return "Good";
  return "Fair";
}
function retentionQuality(rate) {
  if (rate == null) return null;
  if (rate > 0.80) return "Excellent";
  if (rate > 0.65) return "Good";
  return "Fair";
}
function ratioQuality(ratio) {
  if (ratio == null) return null;
  if (ratio <= 12) return "Strong support";
  if (ratio <= 18) return "Average";
  return "Large classes";
}

const fmtPct = (v) => v != null ? `${(v * 100).toFixed(0)}%` : null;
const fmtMoney = (v) => v != null ? `$${Number(v).toLocaleString()}` : null;

/* ── Match Ring ── */
function MatchRing({ score }) {
  const pct = score || 0;
  const r = 46, c = 2 * Math.PI * r;
  const offset = c - (pct / 100) * c;
  return (
    <div className="relative flex-shrink-0 w-[110px] h-[110px]" data-testid="match-score-ring">
      <svg width="110" height="110" viewBox="0 0 110 110" className="absolute inset-0">
        <circle cx="55" cy="55" r={r} fill="none" stroke="#e5e7eb" strokeWidth="4" />
        <circle cx="55" cy="55" r={r} fill="none" stroke={ACCENT} strokeWidth="4"
          strokeDasharray={c} strokeDashoffset={offset} strokeLinecap="round"
          transform="rotate(-90 55 55)" style={{ transition: "stroke-dashoffset 0.8s ease" }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[26px] font-semibold leading-none tracking-tight" style={{ color: ACCENT }}>{pct}</span>
        <span className="text-[9px] font-semibold text-gray-400 uppercase tracking-[1.5px] mt-1">match</span>
      </div>
    </div>
  );
}

/* ── Metric Card ── */
function MetricCard({ label, value, quality, note }) {
  const isEmpty = !value && value !== 0;
  return (
    <div className="bg-white border border-gray-100 rounded-xl px-4 py-4" data-testid={`snapshot-${label?.replace(/\s+/g, '-').toLowerCase()}`}>
      <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-gray-400 block mb-1.5">{label}</span>
      <span className={`text-xl font-semibold tracking-tight leading-tight block ${isEmpty ? "text-gray-300" : "text-gray-900"}`}>
        {isEmpty ? "—" : value}
      </span>
      {(quality || note) && (
        <span className="text-[11px] mt-1 block">
          {quality && <span className="font-medium" style={{ color: ACCENT }}>{quality}</span>}
          {quality && note && <span className="text-gray-300"> · </span>}
          {note && <span className="text-gray-400">{note}</span>}
        </span>
      )}
    </div>
  );
}

/* ── Build fit reasons ── */
function buildFitReasons(school, matchData) {
  const reasons = [];
  const sc = school.scorecard || {};
  const sub = matchData?.sub_scores || {};

  if (school.division) {
    const divScore = sub.division;
    if (divScore && divScore.score >= divScore.max * 0.7) {
      reasons.push({ label: "Division Fit", text: `${school.division} aligns with your recruiting preferences.` });
    } else {
      reasons.push({ label: "Division Fit", text: `Competes at the ${school.division} level.` });
    }
  }

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

  if (school.region) {
    const regScore = sub.region;
    if (regScore && regScore.score >= regScore.max * 0.7) {
      reasons.push({ label: "Location", text: `Located in the ${school.region}${sc.city ? ` (${sc.city}, ${sc.state})` : ""} — matches your location preference.` });
    } else {
      reasons.push({ label: "Location", text: `Located in the ${school.region}${sc.city ? ` — ${sc.city}, ${sc.state}` : ""}.` });
    }
  }

  if (school.scholarship_type) {
    reasons.push({ label: "Scholarship", text: `Offers ${school.scholarship_type.toLowerCase()} scholarships.` });
  }
  if (school.roster_needs) {
    reasons.push({ label: "Roster Opportunity", text: school.roster_needs });
  }
  if (matchData?.measurables_fit?.label && matchData.measurables_fit.label !== "Not Enough Data") {
    reasons.push({ label: "Athletic Fit", text: `${matchData.measurables_fit.label} based on your measurables.` });
  }

  return reasons;
}

/* ── Decision summary ── */
function buildDecisionSummary(school, matchData) {
  const parts = [];
  const sub = matchData?.sub_scores || {};
  const sc = school.scorecard || {};

  const acad = sub.academics;
  if (acad && acad.score >= acad.max * 0.7) parts.push("strong academic fit");
  else if (acad && acad.score >= acad.max * 0.4) parts.push("moderate academic fit");

  const div = sub.division;
  if (div && div.score >= div.max * 0.8) parts.push("division fit");
  if (matchData?.measurables_fit?.label === "Strong Fit") parts.push("athletic fit");

  const score = matchData?.match_score ?? school.match_score ?? 0;
  if (score >= 75) parts.push("realistic opportunity");
  else if (score >= 50) parts.push("moderate opportunity");

  if (sc.admission_rate != null) {
    if (sc.admission_rate < 0.15) parts.push("highly selective");
    else if (sc.admission_rate >= 0.60) parts.push("accessible admissions");
  }

  if (parts.length === 0) {
    if (school.division) return `${school.division} program in the ${school.conference || school.region || "region"}.`;
    return null;
  }
  const joined = parts.slice(0, 3).join(" + ");
  return joined.charAt(0).toUpperCase() + joined.slice(1) + ".";
}

/* ── Next step ── */
function buildNextStep(school, coaches) {
  if (!school.on_board) {
    return { text: "Add this school to your pipeline to start tracking it.", action: "pipeline" };
  }
  const headCoach = coaches.find(c => (c.title || c.role || "").toLowerCase().includes("head"));
  const target = headCoach || coaches[0];
  if (target?.email) {
    return { text: `Send an intro email to ${target.name} this week.`, action: "email", email: target.email };
  }
  if (school.questionnaire_url) {
    return { text: "Fill out the recruiting questionnaire to get on their radar.", action: "questionnaire", url: school.questionnaire_url };
  }
  return { text: "Research the program and prepare your outreach.", action: "info" };
}

/* ── Fit summary ── */
function buildFitSummary(school, matchData) {
  const score = matchData?.match_score ?? school.match_score ?? 0;
  const sub = matchData?.sub_scores || {};
  const strengths = [];

  if (sub.division?.score >= sub.division?.max * 0.7) strengths.push("division level");
  if (sub.academics?.score >= sub.academics?.max * 0.6) strengths.push("academics");
  if (sub.region?.score >= sub.region?.max * 0.7) strengths.push("location");
  if (matchData?.measurables_fit?.label === "Strong Fit") strengths.push("athletic measurables");

  if (score >= 70 && strengths.length >= 2) {
    return `This school is a strong fit across ${strengths.slice(0, 3).join(", ")} — worth pursuing actively.`;
  }
  if (score >= 50) {
    return `This school shows potential${strengths.length ? `, especially in ${strengths[0]}` : ""}. Worth exploring further.`;
  }
  if (strengths.length > 0) {
    return `There's alignment in ${strengths.join(" and ")}. Review the details below to decide.`;
  }
  return "Here's what we know about how this school fits your profile.";
}

/* ── Opportunity & Risk ── */
function buildOpportunity(school, matchData) {
  const items = [];
  if (matchData?.match_score != null) {
    const score = matchData.match_score;
    let level, desc;
    if (score >= 75) { level = "high"; desc = "Strong match — this school aligns well with your profile."; }
    else if (score >= 50) { level = "moderate"; desc = "Moderate match — some areas align, others may need attention."; }
    else { level = "low"; desc = "Lower match — consider if specific strengths outweigh the overall fit."; }
    items.push({ label: "Opportunity Level", level, text: desc });
  }
  if (matchData?.confidence) {
    const confMap = { high: "High confidence", medium: "Medium confidence", low: "Low confidence", estimated: "Estimated" };
    items.push({ label: "Data Confidence", level: matchData.confidence === "high" ? "high" : "moderate", text: `${confMap[matchData.confidence] || matchData.confidence} — ${matchData.confidence_guidance || "based on available data."}` });
  }
  if (matchData?.risk_badges?.length) {
    const desc = { roster_tight: "Roster spots may be limited.", timeline_risk: "Be mindful of recruiting timelines.", low_academic_fit: "Academic requirements may be a stretch.", low_measurables: "Your measurables are below the typical range." };
    matchData.risk_badges.forEach(b => {
      items.push({ label: b.label, level: b.severity === "warning" ? "low" : "moderate", text: desc[b.key] || "Factor to consider." });
    });
  }
  if (school.roster_needs) items.push({ label: "Roster Status", level: "moderate", text: school.roster_needs });
  return items;
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
    } finally { setAdding(false); }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-5 h-5 animate-spin" style={{ color: ACCENT }} />
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
  const decisionSummary = buildDecisionSummary(school, matchData);
  const fitSummary = buildFitSummary(school, matchData);
  const nextStep = buildNextStep(school, coaches);
  const socialLinks = school.social_links || {};

  return (
    <div className="max-w-[900px] mx-auto px-4 md:px-8 pb-24 pt-4" data-testid="school-info-page">

      {/* Back */}
      <button onClick={() => navigate(-1)} data-testid="back-button"
        className="inline-flex items-center gap-1.5 text-[13px] text-gray-400 font-medium mb-8 hover:text-gray-700 transition-colors">
        <ChevronLeft className="w-3.5 h-3.5" /> Back
      </button>

      {/* ═══ HERO CARD ═══ */}
      <div className="bg-white border border-gray-200/80 rounded-2xl p-6 md:p-8 mb-6" data-testid="school-hero">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-6">
          <div className="flex-1 min-w-0">
            {school.logo_url && (
              <img src={school.logo_url} alt="" className="w-12 h-12 rounded-lg object-contain mb-4" onError={e => e.target.style.display = 'none'} data-testid="school-logo" />
            )}
            <h1 className="text-3xl sm:text-4xl font-semibold text-gray-900 tracking-tight leading-[1.15] mb-3" data-testid="school-name">
              {school.university_name}
            </h1>
            <div className="flex flex-wrap items-center gap-1.5 text-[13px] text-gray-400 font-medium mb-4" data-testid="school-metadata">
              {school.division && <span data-testid="school-division">{school.division}</span>}
              {school.division && school.conference && <span className="opacity-40">·</span>}
              {school.conference && <span>{school.conference}</span>}
              {(school.division || school.conference) && school.region && <span className="opacity-40">·</span>}
              {school.region && <span>{school.region}</span>}
              {sc.city && sc.state && <><span className="opacity-40">·</span><span>{sc.city}, {sc.state}</span></>}
            </div>

            {decisionSummary && (
              <p className="text-[15px] text-gray-600 leading-relaxed mb-2" data-testid="decision-summary">
                {decisionSummary}
              </p>
            )}
            {aiSummary && (
              <p className="text-[14px] text-gray-400 leading-relaxed max-w-xl mb-5 line-clamp-2" data-testid="ai-summary">
                {aiSummary}
              </p>
            )}

            {/* CTAs */}
            <div className="flex flex-wrap items-center gap-3" data-testid="hero-ctas">
              <button onClick={addToBoard} disabled={adding || school.on_board} data-testid="add-to-board-btn"
                className={`px-5 py-2.5 rounded-lg text-[13px] font-semibold inline-flex items-center gap-2 transition-all duration-200 ${
                  school.on_board
                    ? "bg-gray-50 text-gray-400 cursor-default border border-gray-200"
                    : "text-white hover:opacity-90 active:scale-[0.97]"
                }`}
                style={school.on_board ? {} : { backgroundColor: ACCENT }}>
                {school.on_board ? <><Check className="w-4 h-4" /> On Your Board</> : <><Plus className="w-4 h-4" /> {adding ? "Adding..." : "Add to Pipeline"}</>}
              </button>
              {school.website && (
                <a href={school.website} target="_blank" rel="noreferrer" data-testid="visit-website-btn"
                  className="px-5 py-2.5 rounded-lg text-[13px] font-medium inline-flex items-center gap-2 text-gray-500 border border-gray-200 hover:border-gray-300 hover:text-gray-700 transition-all">
                  <Globe className="w-4 h-4" /> Visit Website
                </a>
              )}
            </div>
          </div>

          {hasMatch && displayScore > 0 && (
            <div className="flex-shrink-0 self-center sm:self-start">
              <MatchRing score={displayScore} />
            </div>
          )}
        </div>
      </div>

      {/* ═══ WHY THIS SCHOOL — highlighted card ═══ */}
      {fitReasons.length > 0 && (
        <div className="rounded-2xl p-6 md:p-8 mb-6" style={{ backgroundColor: ACCENT_TINT, border: `1px solid ${ACCENT_BORDER}` }} data-testid="why-this-school-section">
          <div className="flex items-center gap-2.5 mb-4">
            <Sparkles className="w-4 h-4" style={{ color: ACCENT }} />
            <h2 className="text-lg font-semibold text-gray-900 tracking-tight" data-testid="why-this-school-title">Why This School</h2>
          </div>
          <p className="text-[14px] text-gray-600 leading-[1.7] mb-6 max-w-xl" data-testid="fit-summary">
            {fitSummary}
          </p>
          <div className="space-y-3" data-testid="fit-reasons-list">
            {fitReasons.map((r, i) => (
              <div key={i} className="flex items-baseline gap-3" data-testid={`fit-reason-${i}`}>
                <span className="w-1 h-1 rounded-full mt-[7px] flex-shrink-0" style={{ backgroundColor: ACCENT }} />
                <div>
                  <span className="text-[13px] font-semibold mr-1.5" style={{ color: ACCENT }}>{r.label}</span>
                  <span className="text-[14px] text-gray-600 leading-relaxed">{r.text}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══ RECOMMENDED NEXT STEP — inline card ═══ */}
      <div className="bg-white border border-gray-200/80 rounded-xl px-5 py-4 flex items-center gap-3 mb-10" data-testid="next-step-section">
        <ArrowRight className="w-4 h-4 flex-shrink-0" style={{ color: ACCENT }} />
        <div className="flex-1 min-w-0">
          <span className="text-[11px] font-bold uppercase tracking-[0.08em] block mb-0.5" style={{ color: ACCENT }}>Next Step</span>
          <span className="text-[14px] text-gray-600">{nextStep.text}</span>
        </div>
        {nextStep.action === "email" && nextStep.email && (
          <a href={`mailto:${nextStep.email}`} data-testid="next-step-email-cta"
            className="flex-shrink-0 px-4 py-1.5 rounded-lg text-[12px] font-semibold transition-all hover:opacity-80 text-white"
            style={{ backgroundColor: ACCENT }}>
            Draft Email
          </a>
        )}
        {nextStep.action === "pipeline" && (
          <button onClick={addToBoard} disabled={adding} data-testid="next-step-pipeline-cta"
            className="flex-shrink-0 px-4 py-1.5 rounded-lg text-[12px] font-semibold border transition-all hover:opacity-80"
            style={{ color: ACCENT, borderColor: ACCENT_BORDER }}>
            Add Now
          </button>
        )}
      </div>

      {/* ═══ QUICK SNAPSHOT — metric grid cards ═══ */}
      <section className="mb-10">
        <h2 className="text-lg font-semibold text-gray-900 tracking-tight mb-5" data-testid="quick-snapshot-title">Quick Snapshot</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3" data-testid="quick-snapshot-grid">
          <MetricCard label="Tuition" value={fmtMoney(sc.tuition_out_of_state || sc.tuition_in_state)} note="Out-of-state" />
          <MetricCard label="Acceptance" value={fmtPct(sc.admission_rate)} quality={selectivityLabel(sc.admission_rate)} />
          <MetricCard label="Students" value={sc.student_size ? Number(sc.student_size).toLocaleString() : null} quality={sizeLabel(sc.student_size)} />
          <MetricCard label="Graduation" value={fmtPct(sc.graduation_rate)} quality={gradQuality(sc.graduation_rate)} />
          <MetricCard label="Retention" value={fmtPct(sc.retention_rate)} quality={retentionQuality(sc.retention_rate)} />
          <MetricCard label="Student-Faculty" value={sc.student_faculty_ratio ? `${sc.student_faculty_ratio}:1` : null} quality={ratioQuality(sc.student_faculty_ratio)} />
          <MetricCard label="SAT Avg" value={sc.sat_avg ? String(sc.sat_avg) : null} />
          <MetricCard label="ACT Mid" value={sc.act_midpoint ? String(sc.act_midpoint) : null} />
          {sc.avg_gpa && <MetricCard label="Avg GPA" value={sc.avg_gpa} />}
          {sc.avg_annual_cost && <MetricCard label="Avg Annual Cost" value={fmtMoney(sc.avg_annual_cost)} />}
          {sc.tuition_in_state && <MetricCard label="Tuition (In-State)" value={fmtMoney(sc.tuition_in_state)} />}
          <MetricCard label="Median Debt" value={sc.median_debt ? fmtMoney(sc.median_debt) : "N/A"} note="At graduation" />
          {sc.median_earnings && <MetricCard label="Median Earnings" value={fmtMoney(sc.median_earnings)} note="Post-graduation" />}
          {sc.school_type && <MetricCard label="School Type" value={sc.school_type} />}
          {school.scholarship_type && <MetricCard label="Scholarship" value={school.scholarship_type} />}
        </div>
      </section>

      {/* ═══ OPPORTUNITY & RISK ═══ */}
      {opportunityItems.length > 0 && (
        <section className="mb-10">
          <h2 className="text-lg font-semibold text-gray-900 tracking-tight mb-5" data-testid="opportunity-risk-title">Opportunity & Risk</h2>
          <div className="bg-white border border-gray-200/80 rounded-2xl divide-y divide-gray-100" data-testid="opportunity-risk-section">
            {opportunityItems.map((item, i) => (
              <div key={i} className="px-5 py-4 flex items-start gap-3" data-testid={`opportunity-item-${i}`}>
                <span className="w-2 h-2 rounded-full mt-[5px] flex-shrink-0" style={{ backgroundColor: item.level === "high" ? ACCENT : "#d1d5db" }} />
                <div>
                  <span className="text-[13px] font-semibold text-gray-900 mr-1.5">{item.label}</span>
                  <span className="text-[14px] text-gray-500 leading-relaxed">{item.text}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ═══ MATCH BREAKDOWN ═══ */}
      {matchData?.sub_scores && (
        <section className="mb-10">
          <h2 className="text-lg font-semibold text-gray-900 tracking-tight mb-5" data-testid="match-breakdown-title">Match Breakdown</h2>
          <div className="bg-white border border-gray-200/80 rounded-2xl p-5 md:p-6" data-testid="match-breakdown-section">
            <div className="space-y-4">
              {Object.entries(matchData.sub_scores).map(([key, ss]) => {
                const pct = ss.max > 0 ? Math.round((ss.score / ss.max) * 100) : 0;
                return (
                  <div key={key} data-testid={`sub-score-${key}`}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[13px] font-medium text-gray-600">{ss.label}</span>
                      <span className="text-[13px] font-semibold text-gray-900">{ss.score}/{ss.max}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, backgroundColor: ACCENT }} />
                    </div>
                  </div>
                );
              })}
            </div>

            {matchData.measurables_fit?.details && Object.keys(matchData.measurables_fit.details).length > 0 && (
              <div className="mt-6 pt-5 border-t border-gray-100" data-testid="measurables-detail">
                <div className="text-[10px] font-semibold uppercase tracking-[0.1em] text-gray-400 mb-3">Athletic Measurables</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {Object.entries(matchData.measurables_fit.details).map(([key, d]) => (
                    <div key={key} className="flex items-center justify-between text-[13px] bg-gray-50 rounded-lg px-3 py-2">
                      <span className="text-gray-500 capitalize">{key.replace(/_/g, ' ')}</span>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-900">{d.value}</span>
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded" style={{
                          background: d.status === "match" ? ACCENT_TINT : d.status === "close" ? "rgba(230,92,42,0.04)" : "#f3f4f6",
                          color: d.status === "match" ? ACCENT : d.status === "close" ? ACCENT : "#9ca3af",
                        }}>
                          {d.status === "match" ? "In Range" : d.status === "close" ? "Close" : "Below"}
                        </span>
                        <span className="text-[10px] text-gray-400">{d.benchmark}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {matchData.full_explanation && (
              <p className="text-[13px] text-gray-400 leading-relaxed mt-5 pt-4 border-t border-gray-100" data-testid="breakdown-explanation">
                {matchData.full_explanation}
              </p>
            )}
          </div>
        </section>
      )}

      {/* ═══ COACHING STAFF — row cards ═══ */}
      {coaches.length > 0 && (
        <section className="mb-10">
          <h2 className="text-lg font-semibold text-gray-900 tracking-tight mb-5" data-testid="coaching-staff-title">Coaching Staff</h2>
          <div className="bg-white border border-gray-200/80 rounded-2xl divide-y divide-gray-100" data-testid="coaching-staff-section">
            {coaches.map((c, i) => (
              <div key={i} className="flex items-center justify-between px-5 py-4 group hover:bg-gray-50/50 transition-colors" data-testid={`coach-row-${i}`}>
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 bg-gray-100 text-gray-400 group-hover:bg-gray-200/70 transition-colors">
                    <User className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[14px] font-medium text-gray-900 truncate">{c.name}</div>
                    <div className="text-[12px] text-gray-400">{c.title || c.role || "Coach"}</div>
                  </div>
                </div>
                {c.email && (
                  <a href={`mailto:${c.email}`} data-testid={`coach-email-${i}`}
                    className="text-[13px] text-gray-400 hover:text-gray-700 transition-colors flex items-center gap-1.5 flex-shrink-0 ml-4 px-3 py-1.5 rounded-lg hover:bg-gray-100">
                    <Mail className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">{c.email}</span>
                  </a>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ═══ PROGRAM DETAILS — structured card ═══ */}
      <section className="mb-10">
        <h2 className="text-lg font-semibold text-gray-900 tracking-tight mb-5" data-testid="program-overview-title">Program Details</h2>
        <div className="bg-white border border-gray-200/80 rounded-2xl p-5 md:p-6" data-testid="program-overview-section">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-8 gap-y-4">
            {school.division && (
              <div>
                <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-gray-400 block mb-1">Division</span>
                <span className="text-[14px] font-medium text-gray-900">{school.division}</span>
              </div>
            )}
            {school.conference && (
              <div>
                <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-gray-400 block mb-1">Conference</span>
                <span className="text-[14px] font-medium text-gray-900">{school.conference}</span>
              </div>
            )}
            {school.mascot && (
              <div>
                <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-gray-400 block mb-1">Mascot</span>
                <span className="text-[14px] font-medium text-gray-900">{school.mascot}</span>
              </div>
            )}
            {sc.school_type && (
              <div>
                <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-gray-400 block mb-1">School Type</span>
                <span className="text-[14px] font-medium text-gray-900">{sc.school_type}</span>
              </div>
            )}
            {school.scholarship_type && (
              <div>
                <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-gray-400 block mb-1">Scholarship</span>
                <span className="text-[14px] font-medium text-gray-900">{school.scholarship_type}</span>
              </div>
            )}
            {school.region && (
              <div>
                <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-gray-400 block mb-1">Region</span>
                <span className="text-[14px] font-medium text-gray-900">{school.region}{sc.city ? ` — ${sc.city}, ${sc.state}` : ""}</span>
              </div>
            )}
          </div>

          {/* Links */}
          <div className="flex flex-wrap gap-4 mt-6 pt-5 border-t border-gray-100 text-[13px]" data-testid="program-links">
            {school.website && (
              <a href={school.website} target="_blank" rel="noreferrer" data-testid="program-website-link"
                className="text-gray-400 hover:text-gray-700 transition-colors inline-flex items-center gap-1">
                <ArrowUpRight className="w-3 h-3" /> Program Website
              </a>
            )}
            {school.domain && (
              <a href={`https://${school.domain}`} target="_blank" rel="noreferrer" data-testid="academic-website-link"
                className="text-gray-400 hover:text-gray-700 transition-colors inline-flex items-center gap-1">
                <ArrowUpRight className="w-3 h-3" /> Academic Website
              </a>
            )}
            {school.questionnaire_url && (
              <a href={school.questionnaire_url.startsWith("http") ? school.questionnaire_url : `https://${school.questionnaire_url}`} target="_blank" rel="noreferrer" data-testid="questionnaire-link"
                className="text-gray-400 hover:text-gray-700 transition-colors inline-flex items-center gap-1">
                <FileText className="w-3 h-3" /> Recruiting Questionnaire
              </a>
            )}
            {socialLinks.twitter && (
              <a href={socialLinks.twitter} target="_blank" rel="noreferrer" data-testid="twitter-link"
                className="text-gray-400 hover:text-gray-700 transition-colors inline-flex items-center gap-1">
                <ExternalLink className="w-3 h-3" /> Twitter / X
              </a>
            )}
            {socialLinks.instagram && (
              <a href={socialLinks.instagram} target="_blank" rel="noreferrer" data-testid="instagram-link"
                className="text-gray-400 hover:text-gray-700 transition-colors inline-flex items-center gap-1">
                <ExternalLink className="w-3 h-3" /> Instagram
              </a>
            )}
            {socialLinks.facebook && (
              <a href={socialLinks.facebook} target="_blank" rel="noreferrer" data-testid="facebook-link"
                className="text-gray-400 hover:text-gray-700 transition-colors inline-flex items-center gap-1">
                <ExternalLink className="w-3 h-3" /> Facebook
              </a>
            )}
          </div>
        </div>
      </section>

      {/* ═══ CAMPUS DIVERSITY ═══ */}
      {school.campus_diversity && Object.keys(school.campus_diversity).length > 0 && (
        <section className="mb-10">
          <h2 className="text-lg font-semibold text-gray-900 tracking-tight mb-5" data-testid="campus-diversity-title">Campus Diversity</h2>
          <div className="bg-white border border-gray-200/80 rounded-2xl p-5 md:p-6" data-testid="campus-diversity-section">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {Object.entries(school.campus_diversity)
                .sort((a, b) => b[1].students - a[1].students)
                .map(([category, data]) => (
                  <div key={category} data-testid={`diversity-${category.replace(/[\s/]+/g, '-').toLowerCase()}`}>
                    <div className="text-[13px] font-medium text-gray-700 mb-3">{category}</div>
                    <div className="space-y-2">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-gray-400">Students</span>
                          <span className="text-[12px] font-semibold text-gray-700">{data.students}%</span>
                        </div>
                        <div className="h-1 rounded-full bg-gray-100 overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${Math.min(data.students, 100)}%`, backgroundColor: ACCENT, opacity: 0.7 }} />
                        </div>
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-gray-400">Faculty</span>
                          <span className="text-[12px] font-semibold text-gray-700">{data.faculty}%</span>
                        </div>
                        <div className="h-1 rounded-full bg-gray-100 overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${Math.min(data.faculty, 100)}%`, backgroundColor: "#9ca3af", opacity: 0.5 }} />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </section>
      )}

      {showUpgrade && <UpgradeModal feature="schools" currentTier="basic" onClose={() => setShowUpgrade(false)} />}
    </div>
  );
}

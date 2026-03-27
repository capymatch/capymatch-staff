import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import {
  ChevronLeft, Plus, Mail, ExternalLink, Users, User,
  Check, Loader2, Sparkles, Globe, FileText, ArrowUpRight, ArrowRight
} from "lucide-react";
import UpgradeModal from "../../components/UpgradeModal";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

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

/* ── Match Score Ring ── */
function MatchRing({ score }) {
  const pct = score || 0;
  const r = 52, c = 2 * Math.PI * r;
  const offset = c - (pct / 100) * c;
  return (
    <div className="relative flex-shrink-0 w-[130px] h-[130px]" data-testid="match-score-ring">
      <svg width="130" height="130" viewBox="0 0 120 120" className="absolute inset-0">
        <circle cx="60" cy="60" r={r} fill="none" stroke="var(--cm-border)" strokeWidth="5" opacity="0.5" />
        <circle cx="60" cy="60" r={r} fill="none" stroke="#1a8a80" strokeWidth="5"
          strokeDasharray={c} strokeDashoffset={offset} strokeLinecap="round"
          transform="rotate(-90 60 60)" style={{ transition: "stroke-dashoffset 0.8s ease" }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[28px] font-semibold text-[#1a8a80] leading-none tracking-tight">{pct}</span>
        <span className="text-[10px] font-medium text-[var(--cm-text-3)] uppercase tracking-[1.5px] mt-1">match</span>
      </div>
    </div>
  );
}

/* ── Snapshot Item with micro interpretation ── */
function SnapshotItem({ label, value, note, quality }) {
  const isEmpty = !value && value !== 0;
  return (
    <div className="flex flex-col gap-0.5" data-testid={`snapshot-${label?.replace(/\s+/g, '-').toLowerCase()}`}>
      <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--cm-text-3)]">{label}</span>
      <span className={`text-[22px] font-medium tracking-tight leading-tight ${isEmpty ? "text-[var(--cm-text-3)]" : "text-[var(--cm-text)]"}`}>
        {isEmpty ? "—" : value}
      </span>
      <div className="flex items-center gap-1.5">
        {quality && (
          <span className="text-[10px] font-semibold text-[#8B3F1F]">{quality}</span>
        )}
        {quality && note && <span className="text-[var(--cm-text-3)] text-[8px]">·</span>}
        {note && <span className="text-[11px] text-[var(--cm-text-3)]">{note}</span>}
      </div>
    </div>
  );
}

/* ── Section Divider (increased spacing) ── */
function Divider() {
  return <div className="h-px w-full bg-[var(--cm-border)] opacity-40 my-12 md:my-16" />;
}

/* ── Section Title (increased size) ── */
function SectionTitle({ children, testId }) {
  return (
    <h2 className="text-lg sm:text-xl font-medium text-[var(--cm-text)] tracking-tight mb-8" data-testid={testId}>
      {children}
    </h2>
  );
}

/* ── Build "Why This School" bullets ── */
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

/* ── Build decision summary for hero ── */
function buildDecisionSummary(school, matchData) {
  const parts = [];
  const sub = matchData?.sub_scores || {};
  const sc = school.scorecard || {};

  // Academic assessment
  const acad = sub.academics;
  if (acad && acad.score >= acad.max * 0.7) parts.push("strong academic fit");
  else if (acad && acad.score >= acad.max * 0.4) parts.push("moderate academic fit");

  // Division assessment
  const div = sub.division;
  if (div && div.score >= div.max * 0.8) parts.push("division fit");

  // Measurables
  if (matchData?.measurables_fit?.label === "Strong Fit") parts.push("athletic fit");

  // Opportunity
  const score = matchData?.match_score ?? school.match_score ?? 0;
  if (score >= 75) parts.push("realistic opportunity");
  else if (score >= 50) parts.push("moderate opportunity");

  // Selectivity
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

/* ── Build recommended next step ── */
function buildNextStep(school, coaches) {
  if (!school.on_board) {
    return { text: "Add this school to your pipeline to start tracking it.", action: "pipeline" };
  }
  const headCoach = coaches.find(c => (c.title || c.role || "").toLowerCase().includes("head"));
  const anyCoach = coaches[0];
  const target = headCoach || anyCoach;
  if (target?.email) {
    return { text: `Send an intro email to ${target.name} this week.`, action: "email", email: target.email };
  }
  if (school.questionnaire_url) {
    return { text: "Fill out the recruiting questionnaire to get on their radar.", action: "questionnaire", url: school.questionnaire_url };
  }
  return { text: "Research the program and prepare your outreach.", action: "info" };
}

/* ── Build "Why This School" summary sentence ── */
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

/* ── Build Opportunity & Risk ── */
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
    items.push({ label: "Data Confidence", level: matchData.confidence === "high" ? "high" : matchData.confidence === "medium" ? "moderate" : "low", text: `${confMap[matchData.confidence] || matchData.confidence} — ${matchData.confidence_guidance || "based on available data."}` });
  }

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
        text: riskDescriptions[b.key] || "Factor to consider for this program.",
      });
    });
  }

  if (school.roster_needs) {
    items.push({ label: "Roster Status", level: "moderate", text: school.roster_needs });
  }

  return items;
}

const LEVEL_DOT = {
  high: "#1a8a80",
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
        <Loader2 className="w-5 h-5 text-[#1a8a80] animate-spin" />
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
    <div className="max-w-[860px] mx-auto px-6 md:px-12 pb-24 pt-2" data-testid="school-info-page">
      {/* ─── Back ─── */}
      <button onClick={() => navigate(-1)} data-testid="back-button"
        className="inline-flex items-center gap-1 text-[13px] text-[var(--cm-text-3)] font-medium mb-10 hover:text-[var(--cm-text)] transition-colors">
        <ChevronLeft className="w-4 h-4" /> Back
      </button>

      {/* ═══════════════ HERO ═══════════════ */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-6 mb-6" data-testid="school-hero">
        <div className="flex-1 min-w-0">
          {school.logo_url && (
            <img src={school.logo_url} alt="" className="w-14 h-14 rounded-xl object-contain mb-4" onError={e => e.target.style.display = 'none'} data-testid="school-logo" />
          )}
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-medium text-[var(--cm-text)] tracking-tight leading-[1.1] mb-3" data-testid="school-name">
            {school.university_name}
          </h1>

          {/* Subtle metadata */}
          <div className="flex flex-wrap items-center gap-1 text-[13px] text-[var(--cm-text-3)] font-medium mb-4" data-testid="school-metadata">
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

          {/* Decision summary — one line */}
          {decisionSummary && (
            <p className="text-[15px] sm:text-base font-medium text-[#8B3F1F] mb-2 leading-snug" data-testid="decision-summary">
              {decisionSummary}
            </p>
          )}

          {/* AI Summary */}
          {aiSummary && (
            <p className="text-[14px] sm:text-[15px] text-[var(--cm-text-2)] leading-relaxed max-w-2xl mb-6 line-clamp-2" data-testid="ai-summary">
              {aiSummary}
            </p>
          )}

          {/* CTAs — improved prominence */}
          <div className="flex flex-wrap items-center gap-3 mt-2" data-testid="hero-ctas">
            <button onClick={addToBoard} disabled={adding || school.on_board} data-testid="add-to-board-btn"
              className={`px-6 py-2.5 rounded-full text-[13px] font-semibold inline-flex items-center gap-2 transition-all duration-200 ${
                school.on_board
                  ? "border border-[var(--cm-border)] text-[var(--cm-text-3)] cursor-default"
                  : "border-[2.5px] border-[var(--cm-accent)] text-[var(--cm-accent)] hover:bg-[var(--cm-accent)] hover:text-white hover:shadow-md active:scale-[0.97]"
              }`}>
              {school.on_board ? <><Check className="w-4 h-4" /> On Your Board</> : <><Plus className="w-4 h-4" /> {adding ? "Adding..." : "Add to Pipeline"}</>}
            </button>
            {school.website && (
              <a href={school.website} target="_blank" rel="noreferrer" data-testid="visit-website-btn"
                className="px-6 py-2.5 rounded-full text-[13px] font-semibold inline-flex items-center gap-2 text-[var(--cm-text-2)] border border-[var(--cm-border)] hover:border-[var(--cm-text-3)] hover:bg-[var(--cm-surface-2)] transition-all duration-200">
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

      {/* ═══════════════ WHY THIS SCHOOL (most important) ═══════════════ */}
      {fitReasons.length > 0 && (
        <>
          <Divider />
          <div className="rounded-2xl md:rounded-3xl p-7 md:p-10" style={{ backgroundColor: "rgba(139, 63, 31, 0.04)", border: "1px solid rgba(139, 63, 31, 0.08)" }} data-testid="why-this-school-section">
            <div className="flex items-center gap-2.5 mb-3">
              <Sparkles className="w-[18px] h-[18px] text-[#8B3F1F]" />
              <h2 className="text-lg sm:text-xl font-semibold text-[var(--cm-text)] tracking-tight" data-testid="why-this-school-title">Why This School</h2>
            </div>

            {/* Summary sentence */}
            <p className="text-[14px] sm:text-[15px] text-[var(--cm-text-2)] leading-relaxed mb-6 max-w-2xl" data-testid="fit-summary">
              {fitSummary}
            </p>

            <ul className="space-y-4" data-testid="fit-reasons-list">
              {fitReasons.map((r, i) => (
                <li key={i} className="flex items-start gap-3" data-testid={`fit-reason-${i}`}>
                  <span className="w-1.5 h-1.5 rounded-full bg-[#8B3F1F] mt-[8px] flex-shrink-0" />
                  <div>
                    <span className="text-[13px] font-bold text-[#8B3F1F] mr-2">{r.label}</span>
                    <span className="text-[15px] text-[var(--cm-text)] leading-relaxed">{r.text}</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}

      {/* ═══════════════ RECOMMENDED NEXT STEP ═══════════════ */}
      <div className="mt-8 flex items-start gap-3 rounded-xl px-5 py-4" style={{ backgroundColor: "var(--cm-surface-2)" }} data-testid="next-step-section">
        <ArrowRight className="w-4 h-4 text-[#8B3F1F] mt-0.5 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#8B3F1F] block mb-1">Recommended Next Step</span>
          <span className="text-[14px] text-[var(--cm-text)] leading-relaxed">{nextStep.text}</span>
        </div>
        {nextStep.action === "email" && nextStep.email && (
          <a href={`mailto:${nextStep.email}`} data-testid="next-step-email-cta"
            className="flex-shrink-0 px-4 py-1.5 rounded-full text-[12px] font-semibold text-[#8B3F1F] border border-[#8B3F1F]/20 hover:bg-[#8B3F1F]/5 transition-colors">
            Draft Email
          </a>
        )}
        {nextStep.action === "pipeline" && (
          <button onClick={addToBoard} disabled={adding} data-testid="next-step-pipeline-cta"
            className="flex-shrink-0 px-4 py-1.5 rounded-full text-[12px] font-semibold text-[var(--cm-accent)] border border-[var(--cm-accent)]/20 hover:bg-[var(--cm-accent)]/5 transition-colors">
            Add Now
          </button>
        )}
      </div>

      {/* ═══════════════ QUICK SNAPSHOT ═══════════════ */}
      <Divider />
      <SectionTitle testId="quick-snapshot-title">Quick Snapshot</SectionTitle>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-x-8 gap-y-7" data-testid="quick-snapshot-grid">
        <SnapshotItem label="Tuition" value={fmtMoney(sc.tuition_out_of_state || sc.tuition_in_state)} note="Out-of-state" />
        <SnapshotItem label="Acceptance" value={fmtPct(sc.admission_rate)} quality={selectivityLabel(sc.admission_rate)} />
        <SnapshotItem label="Students" value={sc.student_size ? Number(sc.student_size).toLocaleString() : null} quality={sizeLabel(sc.student_size)} />
        <SnapshotItem label="Graduation" value={fmtPct(sc.graduation_rate)} quality={gradQuality(sc.graduation_rate)} />
        <SnapshotItem label="Retention" value={fmtPct(sc.retention_rate)} quality={retentionQuality(sc.retention_rate)} />
        <SnapshotItem label="Student-Faculty" value={sc.student_faculty_ratio ? `${sc.student_faculty_ratio}:1` : null} quality={ratioQuality(sc.student_faculty_ratio)} />
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
          <div className="space-y-5" data-testid="opportunity-risk-section">
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

      {/* ═══════════════ MATCH BREAKDOWN ═══════════════ */}
      {matchData?.sub_scores && (
        <>
          <Divider />
          <SectionTitle testId="match-breakdown-title">Match Breakdown</SectionTitle>
          <div className="space-y-4" data-testid="match-breakdown-section">
            {Object.entries(matchData.sub_scores).map(([key, ss]) => {
              const pct = ss.max > 0 ? Math.round((ss.score / ss.max) * 100) : 0;
              return (
                <div key={key} data-testid={`sub-score-${key}`}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[13px] font-medium text-[var(--cm-text-2)]">{ss.label}</span>
                    <span className="text-[13px] font-semibold text-[var(--cm-text)]">{ss.score}/{ss.max}</span>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden bg-[var(--cm-surface-2)]">
                    <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, backgroundColor: "#1a8a80" }} />
                  </div>
                </div>
              );
            })}

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
                          background: d.status === "match" ? "rgba(26,138,128,0.15)" : d.status === "close" ? "rgba(26,138,128,0.08)" : "var(--cm-surface-2)",
                          color: d.status === "match" ? "#1a8a80" : d.status === "close" ? "#1a8a80" : "var(--cm-text-3)",
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

            {matchData.full_explanation && (
              <p className="text-[14px] text-[var(--cm-text-2)] leading-relaxed mt-4" data-testid="breakdown-explanation">
                {matchData.full_explanation}
              </p>
            )}
          </div>
        </>
      )}

      {/* ═══════════════ COACHING STAFF (improved) ═══════════════ */}
      {coaches.length > 0 && (
        <>
          <Divider />
          <SectionTitle testId="coaching-staff-title">Coaching Staff</SectionTitle>
          <div data-testid="coaching-staff-section">
            {coaches.map((c, i) => (
              <div key={i}
                className={`flex items-center justify-between py-5 group transition-colors hover:bg-[var(--cm-surface-2)]/50 -mx-3 px-3 rounded-lg ${i < coaches.length - 1 ? "border-b border-[var(--cm-border)]/50" : ""}`}
                data-testid={`coach-row-${i}`}>
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 bg-[var(--cm-surface-2)] text-[var(--cm-text-3)] group-hover:bg-[var(--cm-border)] transition-colors">
                    <User className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[14px] font-medium text-[var(--cm-text)] truncate">{c.name}</div>
                    <div className="text-[12px] text-[var(--cm-text-3)] mt-0.5">{c.title || c.role || "Coach"}</div>
                  </div>
                </div>
                {c.email && (
                  <a href={`mailto:${c.email}`} data-testid={`coach-email-${i}`}
                    className="text-[13px] text-[var(--cm-text-3)] hover:text-[#8B3F1F] transition-colors flex items-center gap-2 flex-shrink-0 ml-4 px-3 py-1.5 rounded-full hover:bg-[#8B3F1F]/5">
                    <Mail className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">{c.email}</span>
                  </a>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {/* ═══════════════ PROGRAM DETAILS ═══════════════ */}
      <Divider />
      <SectionTitle testId="program-overview-title">Program Details</SectionTitle>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-8 gap-y-5 text-[14px]" data-testid="program-overview-section">
        {school.division && (
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--cm-text-3)] mb-1.5">Division</div>
            <div className="font-medium text-[var(--cm-text)]">{school.division}</div>
          </div>
        )}
        {school.conference && (
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--cm-text-3)] mb-1.5">Conference</div>
            <div className="font-medium text-[var(--cm-text)]">{school.conference}</div>
          </div>
        )}
        {school.mascot && (
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--cm-text-3)] mb-1.5">Mascot</div>
            <div className="font-medium text-[var(--cm-text)]">{school.mascot}</div>
          </div>
        )}
        {sc.school_type && (
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--cm-text-3)] mb-1.5">School Type</div>
            <div className="font-medium text-[var(--cm-text)]">{sc.school_type}</div>
          </div>
        )}
        {school.scholarship_type && (
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--cm-text-3)] mb-1.5">Scholarship</div>
            <div className="font-medium text-[var(--cm-text)]">{school.scholarship_type}</div>
          </div>
        )}
        {school.region && (
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--cm-text-3)] mb-1.5">Region</div>
            <div className="font-medium text-[var(--cm-text)]">{school.region}{sc.city ? ` — ${sc.city}, ${sc.state}` : ""}</div>
          </div>
        )}
      </div>

      {/* Links row */}
      <div className="flex flex-wrap gap-4 mt-8" data-testid="program-links">
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
                        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(data.students, 100)}%`, backgroundColor: "#1a8a80" }} />
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

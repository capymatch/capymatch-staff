import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Loader2, AlertTriangle, Archive, ChevronRight, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import ReinforcementToast from "../../components/reinforcement/ReinforcementToast";
import UniversityLogo from "../../components/UniversityLogo";
import { useSubscription, getUsage } from "../../lib/subscription";
import UpgradeModal from "../../components/UpgradeModal";
import OnboardingEmptyBoard from "../../components/onboarding/EmptyBoardState";
import PipelineHero from "../../components/pipeline/PipelineHero";
import PriorityBoard from "../../components/pipeline/PriorityBoard";
import MomentumInsight from "../../components/pipeline/MomentumInsight";
import PipelineList from "../../components/pipeline/PipelineList";
import CommittedBanner from "../../components/pipeline/CommittedBanner";
import { computeAllAttention } from "../../lib/computeAttention";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const FONT = '-apple-system, "SF Pro Text", Inter, ui-sans-serif, system-ui, sans-serif';

export default function PipelinePage() {
  const [allPrograms, setAllPrograms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [matchScores, setMatchScores] = useState({});
  const [topActionsMap, setTopActionsMap] = useState({});
  const [collapsedArchived, setCollapsedArchived] = useState(true);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [recapData, setRecapData] = useState(null);
  const navigate = useNavigate();
  const { subscription, loading: subLoading } = useSubscription();

  /* ── Data fetching ── */
  const fetchAll = useCallback(async () => {
    try {
      const [programsRes, matchRes, topActionsRes] = await Promise.all([
        axios.get(`${API}/athlete/programs`),
        axios.get(`${API}/match-scores`).catch(() => ({ data: { scores: [] } })),
        axios.get(`${API}/internal/programs/top-actions`).catch(() => ({ data: { actions: [] } })),
      ]);

      const programs = Array.isArray(programsRes.data) ? programsRes.data : [];
      setAllPrograms(programs);

      const byId = {};
      (matchRes.data?.scores || []).forEach(s => { byId[s.program_id] = s; });
      setMatchScores(byId);

      const actionsMap = {};
      (topActionsRes.data?.actions || []).forEach(a => { actionsMap[a.program_id] = a; });
      setTopActionsMap(actionsMap);
    } catch { toast.error("Failed to load programs"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  /* ── Recap fetch (non-blocking) ── */
  useEffect(() => {
    axios.get(`${API}/athlete/momentum-recap`).then(res => {
      setRecapData(res.data);
    }).catch(() => {});
  }, []);

  /* ── Loading ── */
  if (loading) {
    return (
      <div className="flex items-center justify-center py-24" data-testid="board-loading">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-7 h-7 animate-spin" style={{ color: "#bbb" }} />
          <span className="text-sm" style={{ color: "#94a3b8" }}>Loading...</span>
        </div>
      </div>
    );
  }

  /* ── Derived data ── */
  const archivedPrograms = allPrograms.filter(p => p.board_group === "archived");
  const activePrograms = allPrograms.filter(p => p.board_group !== "archived");
  const committedPrograms = allPrograms.filter(p => p.recruiting_status === "Committed" || p.journey_stage === "committed");

  if (activePrograms.length === 0 && archivedPrograms.length === 0) {
    return <div style={{ maxWidth: 1060, margin: "0 auto" }}><OnboardingEmptyBoard onSchoolAdded={fetchAll} /></div>;
  }

  const recapCtx = recapData?.priorities?.length ? {
    priorities: recapData.priorities,
    createdAt: recapData.period_start,
  } : null;

  const allAttention = computeAllAttention(allPrograms, topActionsMap, recapCtx);
  const attentionMap = {};
  allAttention.forEach(a => { attentionMap[a.programId] = a; });
  const heroItems = allAttention.filter(a => a.attentionLevel !== "low").slice(0, 5);
  const highCount = allAttention.filter(a => a.attentionLevel === "high").length;
  const medCount = allAttention.filter(a => a.attentionLevel === "medium").length;
  const lowCount = allAttention.filter(a => a.attentionLevel === "low").length;

  const usage = getUsage(subscription, "schools");
  const schoolPct = usage.limit > 0 && !usage.unlimited ? usage.used / usage.limit : 0;
  const nearLimit = schoolPct >= 0.8;

  return (
    <div style={{ maxWidth: 1060, margin: "0 auto", padding: "0 12px", fontFamily: FONT }} data-testid="recruiting-board">

      {/* ═══ 1. HEADER ═══ */}
      <div style={{ marginBottom: 32 }} data-testid="pipeline-header">
        <h1 style={{
          fontSize: 28, fontWeight: 600, letterSpacing: "-0.03em",
          color: "#0f172a", margin: "0 0 8px", fontFamily: FONT,
        }}>
          Your recruiting right now
        </h1>
        <p style={{ fontSize: 15, fontWeight: 400, color: "#64748b", margin: 0, lineHeight: 1.5 }} data-testid="summary-chips">
          {highCount > 0 && <>{highCount} needs attention</>}
          {highCount > 0 && medCount > 0 && <span style={{ margin: "0 6px", color: "#cbd5e1" }}>&middot;</span>}
          {medCount > 0 && <>{medCount} gaining momentum</>}
          {(highCount > 0 || medCount > 0) && lowCount > 0 && <span style={{ margin: "0 6px", color: "#cbd5e1" }}>&middot;</span>}
          {lowCount > 0 && <>{lowCount} steady</>}
        </p>
      </div>

      {/* ═══ 2. HERO CARD ═══ */}
      <PipelineHero heroItems={heroItems} matchScores={matchScores} navigate={navigate} />

      {/* ═══ 3. MOMENTUM INSIGHT ═══ */}
      <MomentumInsight data={recapData} attention={allAttention} />

      {/* ═══ UPGRADE PROMPT ═══ */}
      {nearLimit && !usage.unlimited && usage.limit > 0 && (
        <div style={{
          background: "#fff",
          border: `1px solid ${usage.used >= usage.limit ? "rgba(245,158,11,0.2)" : "rgba(20,37,68,0.06)"}`,
          borderRadius: 16, padding: "16px 20px", marginBottom: 28,
          display: "flex", alignItems: "center", gap: 14,
          boxShadow: "0 1px 4px rgba(19,33,58,0.03)",
        }} data-testid="over-limit-banner">
          <AlertTriangle style={{ width: 18, height: 18, color: usage.used >= usage.limit ? "#f59e0b" : "#94a3b8", flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: "#0f172a" }}>
              {usage.used >= usage.limit ? `You've reached your ${usage.limit}-school limit` : `${usage.used} of ${usage.limit} schools used`}
            </div>
            <div style={{ fontSize: 13, fontWeight: 400, color: "#64748b", marginTop: 2 }}>
              {usage.used >= usage.limit ? "Upgrade to add more schools." : "Approaching your plan limit."}
            </div>
          </div>
          <button onClick={() => setShowUpgrade(true)} style={{
            padding: "9px 16px", borderRadius: 12,
            background: "linear-gradient(135deg, #19c3b2, #4d7cff)",
            color: "#fff", fontSize: 13, fontWeight: 600,
            cursor: "pointer", border: "none", fontFamily: FONT, flexShrink: 0,
          }} data-testid="upgrade-from-banner">Upgrade</button>
        </div>
      )}

      {/* ═══ 4. WHAT TO DO NEXT ═══ */}
      <PriorityBoard items={allAttention} navigate={navigate} heroProgramId={allAttention[0]?.programId} />

      {/* ═══ COMMITTED ═══ */}
      <CommittedBanner programs={committedPrograms} navigate={navigate} />

      {/* ═══ 5. ALL PROGRAMS ═══ */}
      <PipelineList programs={activePrograms} attentionMap={attentionMap} matchScores={matchScores} navigate={navigate} />

      {/* ═══ ARCHIVED ═══ */}
      {archivedPrograms.length > 0 && (
        <div data-testid="section-archived" style={{ marginTop: 40 }}>
          <div onClick={() => setCollapsedArchived(!collapsedArchived)} style={{
            display: "flex", alignItems: "center", gap: 8, padding: "16px 0 10px", cursor: "pointer",
          }} data-testid="section-header-archived">
            <ChevronRight style={{ width: 14, height: 14, color: "#94a3b8", transition: "transform 0.2s", transform: collapsedArchived ? "none" : "rotate(90deg)" }} />
            <Archive style={{ width: 14, height: 14, color: "#94a3b8" }} />
            <span style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "#94a3b8" }}>Archived</span>
            <span style={{ fontSize: 11, fontWeight: 500, padding: "2px 8px", borderRadius: 999, background: "rgba(20,37,68,0.04)", color: "#94a3b8" }}>{archivedPrograms.length}</span>
          </div>
          {!collapsedArchived && archivedPrograms.map(p => (
            <div key={p.program_id} style={{
              background: "#fff", border: "1px solid rgba(20,37,68,0.05)",
              borderRadius: 14, padding: "12px 16px", marginBottom: 6,
              display: "flex", alignItems: "center", gap: 12, opacity: 0.65,
            }} data-testid={`archived-card-${p.program_id}`}>
              <UniversityLogo domain={p.domain} name={p.university_name} size={32} className="rounded-[10px] grayscale" />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 500, color: "#0f172a" }}>{p.university_name}</div>
                <div style={{ fontSize: 12, fontWeight: 400, color: "#64748b", marginTop: 1 }}>{[p.division, p.conference, p.state].filter(Boolean).join(" · ")}</div>
              </div>
              <button onClick={async (e) => {
                e.stopPropagation();
                try { await axios.put(`${API}/athlete/programs/${p.program_id}`, { is_active: true }); toast.success(`${p.university_name} reactivated`); fetchAll(); }
                catch { toast.error("Failed"); }
              }} style={{
                padding: "7px 14px", borderRadius: 10, fontSize: 12, fontWeight: 500,
                background: "rgba(25,195,178,0.06)", color: "#19c3b2",
                border: "1px solid rgba(25,195,178,0.12)", cursor: "pointer",
                fontFamily: FONT, display: "flex", alignItems: "center", gap: 5, flexShrink: 0,
              }} data-testid={`reactivate-btn-${p.program_id}`}>
                <RotateCcw style={{ width: 12, height: 12 }} /> Reactivate
              </button>
            </div>
          ))}
        </div>
      )}

      <UpgradeModal
        isOpen={showUpgrade}
        onClose={() => setShowUpgrade(false)}
        message={`You've reached your limit of ${usage.limit || 5} schools. Upgrade to add more.`}
        currentTier={subscription?.tier || (subLoading ? "premium" : "basic")}
      />

      <ReinforcementToast />
    </div>
  );
}

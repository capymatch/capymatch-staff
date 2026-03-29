import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Loader2, AlertTriangle, Archive, ChevronRight, RotateCcw, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { triggerReinforcement } from "../../lib/reinforcement";
import ReinforcementToast from "../../components/reinforcement/ReinforcementToast";
import UniversityLogo from "../../components/UniversityLogo";
import { useSubscription, getUsage } from "../../lib/subscription";
import UpgradeModal from "../../components/UpgradeModal";
import OnboardingEmptyBoard from "../../components/onboarding/EmptyBoardState";
import PipelineHero from "../../components/pipeline/PipelineHero";
// ComingUpTimeline removed — "Coming up" is now unified inside PriorityBoard
import KanbanBoard from "../../components/pipeline/KanbanBoard";
import PriorityBoard from "../../components/pipeline/PriorityBoard";
import PipelineStyles from "../../components/pipeline/PipelineStyles";
import UpcomingTasksSection from "../../components/pipeline/UpcomingTasksSection";
import CommittedBanner from "../../components/pipeline/CommittedBanner";
import "../../components/pipeline/pipeline-responsive.css";
// RecapTeaser removed — recap content merged into PriorityBoard
import MomentumInsight from "../../components/pipeline/MomentumInsight";
import BreakdownDrawer from "../../components/pipeline/BreakdownDrawer";
import { KANBAN_COLS, COL_TO_STAGE } from "../../components/pipeline/pipeline-constants";
// computeAttention.js no longer used — attention is now computed by backend (SSOT)
import "../../components/pipeline/pipeline-motion.css";
import "../../components/pipeline/pipeline-premium.css";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function PipelinePage() {
  const [allPrograms, setAllPrograms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [matchScores, setMatchScores] = useState({});
  const [tasks, setTasks] = useState([]);
  const [topActionsMap, setTopActionsMap] = useState({});
  const [collapsedArchived, setCollapsedArchived] = useState(true);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [justDroppedId, setJustDroppedId] = useState(null);
  const [dragDest, setDragDest] = useState(null);
  const [pulsingColumnId, setPulsingColumnId] = useState(null);
  const [activeDragId, setActiveDragId] = useState(null);
  const [recapData, setRecapData] = useState(null);
  const [breakdownOpen, setBreakdownOpen] = useState(false);
  const [viewMode, setViewMode] = useState(() => {
    try { return localStorage.getItem('capymatch_view_mode') || 'priority'; }
    catch { return 'priority'; }
  });
  const [viewPhase, setViewPhase] = useState('idle');
  const viewPendingRef = useRef(null);
  const navigate = useNavigate();
  const { subscription, loading: subLoading } = useSubscription();
  const togglePriorityRef = useRef(null);
  const togglePipelineRef = useRef(null);

  /* ── Data fetching ── */
  const fetchAll = useCallback(async () => {
    try {
      const [programsRes, matchRes, tasksRes, topActionsRes] = await Promise.all([
        axios.get(`${API}/athlete/programs`),
        axios.get(`${API}/match-scores`).catch(() => ({ data: { scores: [] } })),
        axios.get(`${API}/athlete/tasks`).catch(() => ({ data: { tasks: [] } })),
        axios.get(`${API}/internal/programs/top-actions`).catch(() => ({ data: { actions: [] } })),
      ]);

      const programs = Array.isArray(programsRes.data) ? programsRes.data : [];
      setAllPrograms(programs);

      const byId = {};
      (matchRes.data?.scores || []).forEach(s => { byId[s.program_id] = s; });
      setMatchScores(byId);

      setTasks(tasksRes.data?.tasks || []);

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

  /* ── Drag & Drop ── */
  const handleDragEnd = useCallback(async (result) => {
    setActiveDragId(null);
    setDragDest(null);
    const { destination, source, draggableId } = result;
    if (!destination || destination.droppableId === source.droppableId) return;

    const newCol = destination.droppableId;
    const stageUpdate = COL_TO_STAGE[newCol];
    if (!stageUpdate) return;

    setJustDroppedId(draggableId);
    setTimeout(() => setJustDroppedId(null), 400);
    setPulsingColumnId(newCol);
    setTimeout(() => setPulsingColumnId(null), 200);

    setAllPrograms(prev => prev.map(p =>
      p.program_id === draggableId
        ? { ...p, pipeline_stage: newCol, recruiting_status: stageUpdate.recruiting_status }
        : p
    ));

    try {
      await axios.put(`${API}/athlete/programs/${draggableId}`, stageUpdate);

      // Trigger reinforcement on stage change
      const movedProg = allPrograms.find(p => p.program_id === draggableId);
      const oldStage = movedProg?.pipeline_stage || movedProg?.journey_rail?.active || "added";
      const newStage = newCol;
      const isOffer = newStage === "offer" || newStage === "committed";
      const attn = attentionMap[draggableId];
      const isHero = isOffer || (attn?.recapRank === "top");
      triggerReinforcement({
        type: "stageChange",
        isHeroPriority: isHero,
        heroReason: isOffer ? "This could change everything" : (attn?.heroReason || ""),
        priorityRank: isOffer ? 1 : (attn?.recapRank === "top" ? 1 : 99),
        attentionBefore: attn?.attentionLevel || null,
        attentionAfter: null,
        daysSinceLastActivity: movedProg?.signals?.days_since_last_activity || 0,
        stageBefore: oldStage,
        stageAfter: newStage,
        schoolName: movedProg?.university_name || "",
        recapRank: attn?.recapRank || null,
        prioritySource: attn?.prioritySource || "live",
      });

      toast.success(`Moved to ${KANBAN_COLS.find(c => c.key === newCol)?.label || newCol}`);
    } catch {
      toast.error("Failed to update stage");
      fetchAll();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchAll]);

  const handleDragUpdate = useCallback((update) => {
    setDragDest(update.destination
      ? { droppableId: update.destination.droppableId, index: update.destination.index, sourceId: update.source.droppableId }
      : null);
  }, []);

  const handleDragStart = useCallback((start) => {
    setActiveDragId(start.draggableId);
  }, []);

  /* ── View toggle with animation ── */
  const toggleView = useCallback((mode) => {
    if (mode === viewMode || viewPhase !== 'idle') return;
    setViewPhase('exit');
    viewPendingRef.current = mode;
    setTimeout(() => {
      const next = viewPendingRef.current;
      viewPendingRef.current = null;
      setViewMode(next);
      try { localStorage.setItem('capymatch_view_mode', next); } catch {}
      setViewPhase('enter');
      setTimeout(() => setViewPhase('idle'), 220);
    }, 140);
  }, [viewMode, viewPhase]);

  /* ── Derived data (memoized — must be before any early returns for hook order) ── */
  const { archivedPrograms, activePrograms, committedPrograms, allAttention, attentionMap, heroItem } = useMemo(() => {
    const archived = allPrograms.filter(p => p.board_group === "archived");
    const active = allPrograms.filter(p => p.board_group !== "archived");
    const committed = allPrograms.filter(p => p.recruiting_status === "Committed" || p.pipeline_stage === "committed");
    const attention = allPrograms
      .filter(p => p.attention && p.is_active !== false)
      .map(p => ({ ...p.attention, programId: p.program_id, universityName: p.university_name, program: p }))
      .sort((a, b) => (b.attentionScore || 0) - (a.attentionScore || 0));
    const aMap = {};
    attention.forEach(a => { aMap[a.programId] = a; });
    return { archivedPrograms: archived, activePrograms: active, committedPrograms: committed, allAttention: attention, attentionMap: aMap, heroItem: attention[0] || null };
  }, [allPrograms]);

  /* ── Loading state — skeleton instead of spinner ── */
  if (loading) {
    return (
      <div style={{ maxWidth: 1120, margin: "0 auto" }} className="px-0 sm:px-1" data-testid="board-loading">
        <PipelineStyles />
        {/* Header skeleton */}
        <div className="-mx-[200px] -mt-4 sm:-mt-6 mb-5 sm:mb-8 bg-white" style={{ borderBottom: "1px solid rgba(0,0,0,0.07)", paddingLeft: 200, paddingRight: 200 }}>
          <div className="py-3 sm:py-4 flex items-center gap-3">
            <div className="h-8 w-48 rounded-lg" style={{ background: "rgba(0,0,0,0.04)" }} />
            <div className="ml-auto flex gap-2">
              <div className="h-8 w-20 rounded-lg" style={{ background: "rgba(0,0,0,0.04)" }} />
              <div className="h-8 w-20 rounded-lg" style={{ background: "rgba(0,0,0,0.04)" }} />
            </div>
          </div>
        </div>
        {/* Hero skeleton */}
        <div className="rounded-2xl mb-6" style={{ background: "#1a1a1e", padding: "28px 28px", animation: "pulse 1.5s ease-in-out infinite" }}>
          <div className="h-3 w-20 rounded mb-4" style={{ background: "rgba(255,255,255,0.06)" }} />
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-lg" style={{ background: "rgba(255,255,255,0.06)" }} />
            <div className="h-5 w-40 rounded" style={{ background: "rgba(255,255,255,0.06)" }} />
          </div>
          <div className="h-4 w-52 rounded mb-2" style={{ background: "rgba(255,255,255,0.04)" }} />
          <div className="h-3 w-72 rounded mb-1" style={{ background: "rgba(255,255,255,0.03)" }} />
          <div className="h-3 w-56 rounded mb-6" style={{ background: "rgba(255,255,255,0.03)" }} />
          <div className="h-10 w-36 rounded-xl" style={{ background: "rgba(255,90,31,0.15)" }} />
        </div>
        {/* Cards skeleton */}
        <div className="h-4 w-40 rounded mb-3" style={{ background: "rgba(0,0,0,0.05)" }} />
        <div className="flex flex-col gap-3">
          {[1,2,3].map(i => (
            <div key={i} className="rounded-2xl" style={{ background: "#faf8f4", padding: "20px 22px", border: "1px solid rgba(0,0,0,0.04)", animation: `pulse 1.5s ease-in-out ${i * 0.15}s infinite` }}>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-9 h-9 rounded-lg" style={{ background: "rgba(0,0,0,0.04)" }} />
                <div>
                  <div className="h-4 w-40 rounded mb-1" style={{ background: "rgba(0,0,0,0.05)" }} />
                  <div className="h-3 w-56 rounded" style={{ background: "rgba(0,0,0,0.03)" }} />
                </div>
              </div>
            </div>
          ))}
        </div>
        <style>{`@keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.6; } }`}</style>
      </div>
    );
  }

  if (activePrograms.length === 0 && archivedPrograms.length === 0) {
    return <div style={{ maxWidth: 1120, margin: "0 auto" }}><PipelineStyles /><OnboardingEmptyBoard onSchoolAdded={fetchAll} /></div>;
  }

  const usage = getUsage(subscription, "schools");
  const schoolPct = usage.limit > 0 && !usage.unlimited ? usage.used / usage.limit : 0;
  const nearLimit = schoolPct >= 0.8;

  return (
    <div className="pipeline-premium px-0 sm:px-1" style={{ maxWidth: 1120, margin: "0 auto" }} data-testid="recruiting-board">
      <PipelineStyles />

      {/* ═══ PAGE HEADER ═══ */}
      <div className="-mx-[200px] -mt-4 sm:-mt-6 mb-5 sm:mb-8 bg-white" style={{ borderBottom: "1px solid rgba(0,0,0,0.07)", boxShadow: "0 1px 3px rgba(0,0,0,0.04)", paddingLeft: 200, paddingRight: 200 }} data-testid="pipeline-header">
        <div className="py-3 sm:py-4 flex items-center gap-3">
        {/* Back to Dashboard */}
        <button
          onClick={() => navigate("/dashboard")}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors shrink-0"
          data-testid="back-to-dashboard"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Dashboard</span>
        </button>
        <div className="h-5 w-px bg-gray-200 hidden sm:block" />
        {/* Left: live summary */}
        <div className="flex-1 min-w-0 pt-0.5">
          {viewMode === "priority" && <MomentumInsight attention={allAttention} recapData={recapData} onViewBreakdown={() => setBreakdownOpen(true)} />}
        </div>

        {/* Right: toggle */}
        <div className="pm-toggle-track inline-flex flex-shrink-0" style={{ background: "rgba(247,243,236,0.8)", border: "1px solid #e7dfd4", borderRadius: 14, backdropFilter: "blur(8px)" }} data-testid="view-toggle">
          <div className="pm-toggle-slider" style={{
            left: viewMode === 'priority' ? 2 : (togglePriorityRef.current?.offsetWidth || 60) + 2,
            width: viewMode === 'priority' ? (togglePriorityRef.current?.offsetWidth || 60) : (togglePipelineRef.current?.offsetWidth || 60),
            borderRadius: 12,
          }} />
          <button ref={togglePriorityRef} onClick={() => toggleView('priority')} data-testid="toggle-priority" className="pm-toggle-btn"
            style={{ color: viewMode === 'priority' ? '#1a1a1a' : '#8a847a', padding: "8px 18px", fontSize: 13 }}>Priority</button>
          <button ref={togglePipelineRef} onClick={() => toggleView('pipeline')} data-testid="toggle-pipeline" className="pm-toggle-btn"
            style={{ color: viewMode === 'pipeline' ? '#1a1a1a' : '#8a847a', padding: "8px 18px", fontSize: 13 }}>Pipeline</button>
        </div>
        </div>
      </div>

      {/* ═══ HERO — only in Priority view ═══ */}
      {viewMode === "priority" && (
      <div style={{ marginBottom: 32 }}>
        <PipelineHero heroItem={heroItem} matchScores={matchScores} navigate={navigate} />
      </div>
      )}

      {/* ═══ UPGRADE PROMPT ═══ */}
      {nearLimit && !usage.unlimited && usage.limit > 0 && (
        <div style={{ background: usage.used >= usage.limit ? "rgba(255,155,82,0.06)" : "rgba(255,255,255,0.72)", backdropFilter: "blur(16px)", border: `1px solid ${usage.used >= usage.limit ? "rgba(255,155,82,0.2)" : "rgba(20,37,68,0.08)"}`, borderRadius: 22, padding: "18px 22px", marginBottom: 18, display: "flex", alignItems: "center", gap: 16, boxShadow: "0 10px 30px rgba(19,33,58,0.08)" }} data-testid="over-limit-banner">
          <div style={{ width: 40, height: 40, borderRadius: 12, background: usage.used >= usage.limit ? "rgba(255,155,82,0.15)" : "rgba(93,135,255,0.08)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <AlertTriangle style={{ width: 18, height: 18, color: usage.used >= usage.limit ? "#ff9b52" : "#5f6c84" }} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#13213a", marginBottom: 2 }}>
              {usage.used >= usage.limit ? `You've reached your ${usage.limit}-school limit` : `${usage.used} of ${usage.limit} schools used`}
            </div>
            <div style={{ fontSize: 12, color: "#5f6c84" }}>
              {usage.used >= usage.limit ? "Upgrade to add more schools and unlock AI drafts." : "You're approaching your plan limit. Upgrade for more schools and AI drafts."}
            </div>
          </div>
          <button onClick={() => setShowUpgrade(true)} className="ds-btn-primary" style={{ padding: "10px 18px", fontSize: 12, borderRadius: 14 }} data-testid="upgrade-from-banner">Upgrade</button>
        </div>
      )}

      <UpcomingTasksSection tasks={tasks} navigate={navigate} />
      <CommittedBanner programs={committedPrograms} navigate={navigate} />

      {/* ═══ BOARD ═══ */}
      <div className={`pm-view-${viewPhase}`} data-testid="board-view-container">
        {viewMode === 'pipeline' ? (
          <KanbanBoard programs={allPrograms} navigate={navigate} onDragEnd={handleDragEnd} onDragUpdate={handleDragUpdate} onDragStart={handleDragStart} attentionMap={attentionMap} justDroppedId={justDroppedId} dragDest={dragDest} pulsingColumnId={pulsingColumnId} activeDragId={activeDragId} />
        ) : (
          <PriorityBoard items={allAttention} navigate={navigate} heroItemId={heroItem?.programId} recapData={recapData} programs={allPrograms} />
        )}
      </div>

      {/* ═══ ARCHIVED ═══ */}
      {archivedPrograms.length > 0 && (
        <div data-testid="section-archived" style={{ marginTop: 28 }}>
          <div onClick={() => setCollapsedArchived(!collapsedArchived)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "18px 0 12px", cursor: "pointer" }} data-testid="section-header-archived">
            <ChevronRight style={{ width: 14, height: 14, color: "#9aa5b8", transition: "transform 0.2s", transform: collapsedArchived ? "none" : "rotate(90deg)" }} />
            <Archive style={{ width: 14, height: 14, color: "#9aa5b8" }} />
            <span className="ds-eyebrow" style={{ color: "#9aa5b8", fontSize: 11 }}>Archived</span>
            <span style={{ fontSize: 11, fontWeight: 800, padding: "2px 8px", borderRadius: 999, background: "rgba(255,255,255,0.72)", color: "#9aa5b8", border: "1px solid rgba(20,37,68,0.06)" }}>{archivedPrograms.length}</span>
            <div style={{ flex: 1, height: 1, background: "rgba(20,37,68,0.08)", marginLeft: 8 }} />
          </div>
          {!collapsedArchived && archivedPrograms.map(p => (
            <div key={p.program_id} style={{ background: "rgba(255,255,255,0.72)", backdropFilter: "blur(16px)", border: "1px solid rgba(20,37,68,0.08)", borderRadius: 18, padding: "14px 18px", marginBottom: 10, display: "flex", alignItems: "center", gap: 14, opacity: 0.7, boxShadow: "0 4px 12px rgba(19,33,58,0.04)" }} data-testid={`archived-card-${p.program_id}`}>
              <UniversityLogo domain={p.domain} name={p.university_name} size={36} className="rounded-[12px] grayscale" />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#13213a" }}>{p.university_name}</div>
                <div style={{ fontSize: 11, color: "#5f6c84", marginTop: 2 }}>{[p.division, p.conference, p.state].filter(Boolean).join(" · ")}</div>
              </div>
              <button onClick={async (e) => { e.stopPropagation(); try { await axios.put(`${API}/athlete/programs/${p.program_id}`, { is_active: true }); toast.success(`${p.university_name} reactivated`); fetchAll(); } catch { toast.error("Failed"); } }} className="ds-btn-secondary" style={{ padding: "8px 16px", fontSize: 12, borderRadius: 14, display: "flex", alignItems: "center", gap: 6 }} data-testid={`reactivate-btn-${p.program_id}`}>
                <RotateCcw style={{ width: 13, height: 13 }} /> Reactivate
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

      {/* Action Reinforcement Toast — portal-based, listens for triggerReinforcement events */}
      <ReinforcementToast />

      {/* ═══ FULL BREAKDOWN DRAWER ═══ */}
      <BreakdownDrawer
        isOpen={breakdownOpen}
        onClose={() => setBreakdownOpen(false)}
        recapData={recapData}
        attentionItems={allAttention}
      />
    </div>
  );
}

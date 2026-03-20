import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Loader2, AlertTriangle, Archive, ChevronRight, RotateCcw } from "lucide-react";
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
import RecapTeaser from "../../components/pipeline/RecapTeaser";
import { KANBAN_COLS, COL_TO_STAGE } from "../../components/pipeline/pipeline-constants";
import { computeAllAttention } from "../../lib/computeAttention";
import "../../components/pipeline/pipeline-motion.css";

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
        ? { ...p, journey_stage: stageUpdate.journey_stage, recruiting_status: stageUpdate.recruiting_status }
        : p
    ));

    try {
      await axios.put(`${API}/athlete/programs/${draggableId}`, stageUpdate);

      // Trigger reinforcement on stage change
      const movedProg = allPrograms.find(p => p.program_id === draggableId);
      const oldStage = movedProg?.journey_rail?.active || movedProg?.journey_stage || "added";
      const newStage = stageUpdate.journey_stage || newCol;
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

  /* ── Loading state ── */
  if (loading) {
    return (
      <div className="flex items-center justify-center py-24" data-testid="board-loading">
        <div className="flex flex-col items-center gap-3"><Loader2 className="w-8 h-8 animate-spin" style={{ color: "#999" }} /><span className="text-sm" style={{ color: "#999" }}>Loading your board...</span></div>
      </div>
    );
  }

  /* ── Derived data ── */
  const archivedPrograms = allPrograms.filter(p => p.board_group === "archived");
  const activePrograms = allPrograms.filter(p => p.board_group !== "archived");
  const committedPrograms = allPrograms.filter(p => p.recruiting_status === "Committed" || p.journey_stage === "committed");

  if (activePrograms.length === 0 && archivedPrograms.length === 0) {
    return <div style={{ maxWidth: 1120, margin: "0 auto" }}><PipelineStyles /><OnboardingEmptyBoard onSchoolAdded={fetchAll} /></div>;
  }

  // Build recap context for attention engine
  const recapCtx = recapData?.priorities?.length ? {
    priorities: recapData.priorities,
    createdAt: recapData.period_start,
  } : null;

  const allAttention = computeAllAttention(allPrograms, topActionsMap, recapCtx);
  const attentionMap = {};
  allAttention.forEach(a => { attentionMap[a.programId] = a; });
  const heroItems = allAttention.filter(a => a.attentionLevel !== 'low').slice(0, 5);
  const highCount = allAttention.filter(a => a.attentionLevel === 'high').length;
  const medCount = allAttention.filter(a => a.attentionLevel === 'medium').length;
  const lowCount = allAttention.filter(a => a.attentionLevel === 'low').length;

  const usage = getUsage(subscription, "schools");
  const schoolPct = usage.limit > 0 && !usage.unlimited ? usage.used / usage.limit : 0;
  const nearLimit = schoolPct >= 0.8;

  return (
    <div style={{ maxWidth: 1120, margin: "0 auto" }} data-testid="recruiting-board">
      <PipelineStyles />

      {/* ═══ PAGE HEADER ═══ */}
      <div className="flex items-start justify-between gap-3 mb-4 sm:mb-5" data-testid="pipeline-header">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight m-0" style={{ color: "var(--cm-text, #0f172a)" }}>
            Your Pipeline
          </h1>
          <div className="flex items-center gap-2 flex-wrap mt-1.5" data-testid="summary-chips">
            {highCount > 0 && (
              <span className="flex items-center gap-1.5 text-[10px] sm:text-[11px] font-medium" data-testid="chip-attention" style={{ color: "var(--cm-text-3, #94a3b8)" }}>
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#ef4444" }} />{highCount} needs attention
              </span>
            )}
            {medCount > 0 && (
              <span className="flex items-center gap-1.5 text-[10px] sm:text-[11px] font-medium" data-testid="chip-momentum" style={{ color: "var(--cm-text-3, #94a3b8)" }}>
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#818cf8" }} />{medCount} coming up
              </span>
            )}
            {lowCount > 0 && (
              <span className="flex items-center gap-1.5 text-[10px] sm:text-[11px] font-medium" data-testid="chip-on-track" style={{ color: "var(--cm-text-3, #94a3b8)" }}>
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#10b981" }} />{lowCount} on track
              </span>
            )}
          </div>
        </div>
        <div className="pm-toggle-track" style={{ background: 'var(--cm-surface-2, #f1f5f9)' }} data-testid="view-toggle">
          <div className="pm-toggle-slider" style={{
            left: viewMode === 'priority' ? 2 : (togglePriorityRef.current?.offsetWidth || 60) + 2,
            width: viewMode === 'priority' ? (togglePriorityRef.current?.offsetWidth || 60) : (togglePipelineRef.current?.offsetWidth || 60),
          }} />
          <button ref={togglePriorityRef} onClick={() => toggleView('priority')} data-testid="toggle-priority" className="pm-toggle-btn"
            style={{ color: viewMode === 'priority' ? 'var(--cm-text)' : 'var(--cm-text-3, #94a3b8)' }}>Priority</button>
          <button ref={togglePipelineRef} onClick={() => toggleView('pipeline')} data-testid="toggle-pipeline" className="pm-toggle-btn"
            style={{ color: viewMode === 'pipeline' ? 'var(--cm-text)' : 'var(--cm-text-3, #94a3b8)' }}>Pipeline</button>
        </div>
      </div>

      {/* ═══ HERO ═══ */}
      <PipelineHero heroItems={heroItems} matchScores={matchScores} navigate={navigate} />

      {/* ═══ RECAP TEASER ═══ */}
      {viewMode === "priority" && <RecapTeaser data={recapData} />}

      {/* ═══ BOARD SEPARATOR ═══ */}
      <div className="flex items-center gap-3 mt-5 sm:mt-6 mb-4 px-1" data-testid="board-separator">
        <div className="flex-1 h-px" style={{ background: "var(--cm-border, #e2e8f0)" }} />
        <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider flex-shrink-0" style={{ color: "var(--cm-text-3, #94a3b8)" }}>Manage all programs</span>
        <div className="flex-1 h-px" style={{ background: "var(--cm-border, #e2e8f0)" }} />
      </div>

      {/* ═══ UPGRADE PROMPT ═══ */}
      {nearLimit && !usage.unlimited && usage.limit > 0 && (
        <div style={{ background: usage.used >= usage.limit ? "rgba(245,158,11,0.06)" : "rgba(255,255,255,0.02)", border: `1px solid ${usage.used >= usage.limit ? "rgba(245,158,11,0.2)" : "var(--cm-border)"}`, borderRadius: 10, padding: "14px 20px", marginBottom: 16, display: "flex", alignItems: "center", gap: 14 }} data-testid="over-limit-banner">
          <div style={{ width: 36, height: 36, borderRadius: 8, background: usage.used >= usage.limit ? "rgba(245,158,11,0.15)" : "rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <AlertTriangle style={{ width: 18, height: 18, color: usage.used >= usage.limit ? "#f59e0b" : "var(--cm-text-3)" }} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--cm-text)", marginBottom: 1 }}>
              {usage.used >= usage.limit ? `You've reached your ${usage.limit}-school limit` : `${usage.used} of ${usage.limit} schools used`}
            </div>
            <div style={{ fontSize: 11, color: "var(--cm-text-3)" }}>
              {usage.used >= usage.limit ? "Upgrade to add more schools and unlock AI drafts." : "You're approaching your plan limit. Upgrade for more schools and AI drafts."}
            </div>
          </div>
          <button onClick={() => setShowUpgrade(true)} style={{ padding: "7px 14px", borderRadius: 8, background: usage.used >= usage.limit ? "#f59e0b" : "var(--cm-surface-2)", color: usage.used >= usage.limit ? "#000" : "var(--cm-text-2)", fontSize: 11, fontWeight: 700, cursor: "pointer", flexShrink: 0, border: usage.used >= usage.limit ? "none" : "1px solid var(--cm-border)" }} data-testid="upgrade-from-banner">Upgrade</button>
        </div>
      )}

      <UpcomingTasksSection tasks={tasks} navigate={navigate} />
      <CommittedBanner programs={committedPrograms} navigate={navigate} />

      {/* ═══ BOARD ═══ */}
      <div className={`pm-view-${viewPhase}`} data-testid="board-view-container">
        {viewMode === 'pipeline' ? (
          <KanbanBoard programs={allPrograms} navigate={navigate} onDragEnd={handleDragEnd} onDragUpdate={handleDragUpdate} onDragStart={handleDragStart} attentionMap={attentionMap} justDroppedId={justDroppedId} dragDest={dragDest} pulsingColumnId={pulsingColumnId} activeDragId={activeDragId} />
        ) : (
          <PriorityBoard items={allAttention} navigate={navigate} />
        )}
      </div>

      {/* ═══ ARCHIVED ═══ */}
      {archivedPrograms.length > 0 && (
        <div data-testid="section-archived" style={{ marginTop: 24 }}>
          <div onClick={() => setCollapsedArchived(!collapsedArchived)} style={{ display: "flex", alignItems: "center", gap: 8, padding: "16px 0 10px", cursor: "pointer" }} data-testid="section-header-archived">
            <ChevronRight style={{ width: 14, height: 14, color: "#94a3b8", transition: "transform 0.2s", transform: collapsedArchived ? "none" : "rotate(90deg)" }} />
            <Archive style={{ width: 13, height: 13, color: "#94a3b8" }} />
            <span style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: 1, color: "#94a3b8" }}>Archived</span>
            <span style={{ fontSize: 10, fontWeight: 700, padding: "1px 7px", borderRadius: 6, background: "var(--cm-surface-2)", color: "#94a3b8" }}>{archivedPrograms.length}</span>
            <div style={{ flex: 1, height: 1, background: "var(--cm-border)", marginLeft: 6 }} />
          </div>
          {!collapsedArchived && archivedPrograms.map(p => (
            <div key={p.program_id} style={{ background: "var(--cm-surface)", border: "1px solid var(--cm-border)", borderRadius: 12, padding: "12px 16px", marginBottom: 8, display: "flex", alignItems: "center", gap: 12, opacity: 0.7 }} data-testid={`archived-card-${p.program_id}`}>
              <UniversityLogo domain={p.domain} name={p.university_name} size={34} className="rounded-[10px] grayscale" />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "var(--cm-text)" }}>{p.university_name}</div>
                <div style={{ fontSize: 10, color: "var(--cm-text-3)", marginTop: 1 }}>{[p.division, p.conference, p.state].filter(Boolean).join(" · ")}</div>
              </div>
              <button onClick={async (e) => { e.stopPropagation(); try { await axios.put(`${API}/athlete/programs/${p.program_id}`, { is_active: true }); toast.success(`${p.university_name} reactivated`); fetchAll(); } catch { toast.error("Failed"); } }} style={{ padding: "6px 14px", borderRadius: 8, fontSize: 11, fontWeight: 700, background: "rgba(13,148,136,0.08)", color: "#0d9488", border: "1px solid rgba(13,148,136,0.15)", cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 5, flexShrink: 0 }} data-testid={`reactivate-btn-${p.program_id}`}>
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

      {/* Action Reinforcement Toast — portal-based, listens for triggerReinforcement events */}
      <ReinforcementToast />
    </div>
  );
}

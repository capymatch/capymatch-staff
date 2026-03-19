import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, AlertTriangle, Send, FileText, ExternalLink, X, Loader2 } from "lucide-react";
import axios from "axios";
import { toast } from "sonner";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const INITIALS_COLORS = ["#0d9488", "#6366f1", "#2563eb", "#dc2626", "#d97706", "#7c3aed", "#059669"];

function Avatar({ name, photoUrl, size = 32 }) {
  const initials = (name || "").split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
  const colorIdx = (name || "").length % INITIALS_COLORS.length;
  if (photoUrl) {
    return <img src={photoUrl} alt={name} className="rounded-full object-cover shrink-0" style={{ width: size, height: size }} />;
  }
  return (
    <div className="rounded-full flex items-center justify-center shrink-0 font-bold text-white"
      style={{ width: size, height: size, backgroundColor: INITIALS_COLORS[colorIdx], fontSize: size * 0.38 }}>
      {initials}
    </div>
  );
}

const TRAJECTORY = {
  worsening: { symbol: "\u2198", label: "Worsening", color: "#dc2626" },
  stable:    { symbol: "\u2192", label: "Stable",    color: "#94a3b8" },
  improving: { symbol: "\u2197", label: "Improving", color: "#10b981" },
};

function TrajectoryHint({ trajectory }) {
  const t = TRAJECTORY[trajectory];
  if (!t) return null;
  return (
    <span className="inline-flex items-center gap-0.5" style={{ fontSize: 10, fontWeight: 600, color: t.color }} data-testid={`trajectory-${trajectory}`}>
      {t.symbol} {t.label}
    </span>
  );
}

const COACH_CTA_CONFIG = {
  "Send follow-up": { icon: Send, color: "#0d9488", bg: "#0d9488" },
  "Open Pod":       { icon: ExternalLink, color: "#3b82f6", bg: "#3b82f6" },
  "Request director help": { icon: AlertTriangle, color: "#dc2626", bg: "#dc2626" },
  "Review blocker": { icon: FileText, color: "#b45309", bg: "#b45309" },
};

/* ═══════════════════════════════════════════════ */
/* Escalation Modal                                */
/* ═══════════════════════════════════════════════ */
function EscalateModal({ item, onClose, onSent }) {
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);

  async function handleSend() {
    setSending(true);
    try {
      const token = localStorage.getItem("capymatch_token");
      await axios.post(`${API}/coach/escalate`, {
        athlete_id: item.athleteId,
        athlete_name: item.athleteName,
        school_name: item.schoolName || "",
        primary_risk: item.primaryRisk || "",
        why_now: item.whyNow || "",
        coach_note: note,
      }, { headers: { Authorization: `Bearer ${token}` } });
      toast.success("Escalation sent to director");
      onSent();
    } catch {
      toast.error("Failed to send escalation");
    }
    setSending(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" data-testid="escalate-modal">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-[500px] rounded-lg overflow-hidden shadow-2xl" style={{ background: "#1a1f2e" }}>
        <div className="flex items-center justify-between px-5 py-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          <p className="text-sm font-bold text-white">Request Director Help</p>
          <button onClick={onClose} className="p-1 rounded hover:bg-white/10">
            <X className="w-4 h-4 text-white/60" />
          </button>
        </div>
        <div className="px-5 py-4 space-y-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-white/40 mb-1">Athlete</p>
            <p className="text-sm font-semibold text-white">{item.athleteName}</p>
          </div>
          {item.schoolName && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-white/40 mb-1">School</p>
              <p className="text-sm text-white/80">{item.schoolName}</p>
            </div>
          )}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-white/40 mb-1">Issue</p>
            <p className="text-sm text-white/80">{item.primaryRisk}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-white/40 mb-1">Why Now</p>
            <p className="text-xs text-white/60">{item.whyNow}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-white/40 mb-1">Note (optional)</p>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              placeholder="Add context for the director..."
              className="w-full text-sm rounded-md px-3 py-2 outline-none resize-none"
              style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff" }}
              data-testid="escalate-note-input"
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 px-5 py-3" style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}>
          <button onClick={onClose} className="px-3 py-1.5 text-xs font-semibold rounded-md" style={{ color: "rgba(255,255,255,0.5)" }}>
            Cancel
          </button>
          <button
            onClick={handleSend}
            disabled={sending}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-md text-xs font-semibold text-white disabled:opacity-50"
            style={{ background: "#dc2626" }}
            data-testid="escalate-confirm-btn"
          >
            {sending ? <Loader2 className="w-3 h-3 animate-spin" /> : <AlertTriangle className="w-3 h-3" />}
            {sending ? "Sending..." : "Send Escalation"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════ */
/* Top Priority Card (Coach variant)               */
/* ═══════════════════════════════════════════════ */
function CoachTopPriority({ item }) {
  const navigate = useNavigate();
  const [showEscalate, setShowEscalate] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  if (!item || dismissed) return null;

  const isCritical = item.severity === "critical";
  const cardBg = isCritical ? "#fef2f2" : "#fefce8";
  const cardBorder = isCritical ? "#fecaca" : "#fef08a";
  const labelColor = isCritical ? "#991b1b" : "#a16207";
  const issueColor = isCritical ? "#b91c1c" : "#92400e";
  const severityLabel = isCritical ? "CRITICAL" : "HIGH PRIORITY";

  const title = item.schoolName
    ? `${item.athleteName} — ${item.schoolName}`
    : item.titleSuffix
      ? `${item.athleteName} — ${item.titleSuffix}`
      : item.athleteName;

  /* CTA: derive from intervention + signal, align label to coachAction */
  const topCta = getRowCta(item);
  const CtaIcon = (COACH_CTA_CONFIG[topCta.label] || COACH_CTA_CONFIG["Open Pod"]).icon;

  function handleCta() {
    if (item.interventionType === "escalate" || topCta.label === "Request help") {
      setShowEscalate(true);
    } else {
      navigate(item.cta.url);
    }
  }

  return (
    <>
      <div className="rounded-lg overflow-hidden" style={{ background: cardBg, border: `1px solid ${cardBorder}` }} data-testid="coach-top-priority">
        <div className="px-5 py-3.5">
          <div className="flex items-center gap-2">
            <p className="text-[10px] font-bold uppercase tracking-[0.1em]" style={{ color: labelColor, margin: 0 }} data-testid="coach-severity-label">
              {severityLabel}
            </p>
            {item.trajectory && <TrajectoryHint trajectory={item.trajectory} />}
          </div>
          <div className="flex items-center gap-2.5 mt-1.5">
            <Avatar name={item.athleteName} photoUrl={item.photoUrl} size={28} />
            <p className="text-[15px] font-bold" style={{ color: "#1e293b", margin: 0, lineHeight: 1.3 }}>
              {title}
            </p>
          </div>
          <p className="text-[12px] font-medium mt-1" style={{ color: issueColor, margin: 0 }}>
            {(item.riskSignals || item.issues || []).filter(s => s !== "Needs attention" && s !== "Needs follow-up").join(" · ") || item.primaryRisk} {item.timeAgo && `· ${item.timeAgo}`}
          </p>
          <p className="text-[11.5px] mt-1.5" style={{ color: "#78716c", margin: 0, lineHeight: 1.4 }} data-testid="coach-why-now">
            {item.whyNow}
          </p>

          {/* Coach-specific action */}
          <div className="mt-3 pt-2.5" style={{ borderTop: `1px solid ${isCritical ? "rgba(254,202,202,0.6)" : "rgba(254,240,138,0.6)"}` }}>
            <p className="text-[9.5px] font-bold uppercase tracking-[0.1em] mb-1.5" style={{ color: labelColor, opacity: 0.6, margin: 0 }}>
              Your recommended action
            </p>
            <p className="text-[12px] font-semibold mb-2" style={{ color: "#1e293b" }}>
              {item.coachAction}
            </p>
            <button
              onClick={handleCta}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11.5px] font-semibold cursor-pointer text-white"
              style={{ background: topCta.color, border: "none", fontFamily: "inherit" }}
              data-testid="coach-top-priority-cta"
            >
              <CtaIcon className="w-3 h-3" />
              {topCta.label}
            </button>
          </div>
        </div>
      </div>
      {showEscalate && (
        <EscalateModal item={item} onClose={() => setShowEscalate(false)} onSent={() => { setShowEscalate(false); setDismissed(true); }} />
      )}
    </>
  );
}

/* ═══════════════════════════════════════════════ */
/* Up Next Row — final clarity pass                */
/* ═══════════════════════════════════════════════ */
const SEV_DOT = { critical: "#ef4444", high: "#f59e0b", medium: "#94a3b8", low: "#cbd5e1" };

const GENERIC_LABELS = new Set(["Needs attention", "Needs follow-up"]);

/* Signal-aware CTA: intervention + primary signal → specific label */
const SIGNAL_CTA = {
  "No activity":         { label: "Check in",       color: "#0d9488" },
  "Awaiting reply":      { label: "Send follow-up", color: "#0d9488" },
  "Missing requirement": { label: "Review blocker", color: "#b45309" },
  "No coach assigned":   { label: "Assign coach",   color: "#b45309" },
  "Stalled stage":       { label: "Review status",  color: "#3b82f6" },
};

const INTERVENTION_CTA = {
  nudge:    { label: "Check in",       color: "#0d9488" },
  review:   { label: "Open Pod",       color: "#3b82f6" },
  escalate: { label: "Request help",   color: "#dc2626" },
  blocker:  { label: "Review blocker", color: "#b45309" },
};

function getRowCta(item) {
  /* escalate always uses its own CTA */
  if (item.interventionType === "escalate") return INTERVENTION_CTA.escalate;
  if (item.interventionType === "blocker") return INTERVENTION_CTA.blocker;
  /* signal-specific CTA takes priority over generic intervention CTA */
  const issue = getSpecificIssue(item);
  return SIGNAL_CTA[issue] || INTERVENTION_CTA[item.interventionType] || INTERVENTION_CTA.review;
}

function getSpecificIssue(item) {
  const signals = item.riskSignals || item.issues || [];
  const specific = signals.find(s => !GENERIC_LABELS.has(s));
  return specific || signals[0] || item.primaryRisk || "Open issue";
}

function UpNextRow({ item, onDismiss }) {
  const navigate = useNavigate();
  const [showEscalate, setShowEscalate] = useState(false);
  const [exiting, setExiting] = useState(false);
  const [hovered, setHovered] = useState(false);
  const dot = SEV_DOT[item.severity] || "#94a3b8";

  const title = item.schoolName
    ? `${item.athleteName} — ${item.schoolName}`
    : item.titleSuffix
      ? `${item.athleteName} — ${item.titleSuffix}`
      : item.athleteName;

  /* Line 1: WHAT — specific issue · time · trajectory */
  const issue = getSpecificIssue(item);
  const traj = TRAJECTORY[item.trajectory];
  const showTraj = item.trajectory && item.trajectory !== "stable" && traj;

  /* Line 2: WHY — whyNow (skip if empty) */
  const whyNow = item.whyNow || "";

  /* CTA from signal + intervention */
  const intv = getRowCta(item);

  /* Secondary risks for hover — exclude primary + generic */
  const primaryIssue = issue;
  const secondary = (item.secondaryRisks || [])
    .filter(s => !GENERIC_LABELS.has(s) && s !== primaryIssue)
    .slice(0, 2);

  function handleCta(e) {
    e.stopPropagation();
    if (item.interventionType === "escalate") {
      setShowEscalate(true);
    } else {
      navigate(item.cta.url);
    }
  }

  function handleEscalated() {
    setShowEscalate(false);
    setExiting(true);
    setTimeout(() => onDismiss && onDismiss(item.id), 300);
  }

  return (
    <>
      <div
        className="px-4 py-2 transition-all duration-300"
        style={{
          borderBottom: "1px solid #f1f5f9",
          opacity: exiting ? 0 : 1,
          maxHeight: exiting ? 0 : 200,
          overflow: "hidden",
        }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        data-testid={`coach-inbox-row-${item.id}`}
      >
        <div className="flex items-start gap-3">
          <Avatar name={item.athleteName} photoUrl={item.photoUrl} size={28} />
          <span className="w-2 h-2 rounded-full shrink-0 mt-2.5" style={{ background: dot }} data-testid={`severity-dot-${item.severity}`} />
          <div className="flex-1 min-w-0">
            {/* Title */}
            <p className="text-[13px] font-semibold" style={{ color: "#1e293b", lineHeight: 1.3 }}>{title}</p>
            {/* WHAT: issue · time · trajectory (inline) */}
            <p className="text-[11px] mt-0.5" style={{ color: "#64748b" }}>
              {issue}
              {item.timeAgo && <span> · {item.timeAgo}</span>}
              {showTraj && (
                <span style={{ color: traj.color, fontWeight: 600, marginLeft: 6 }}>
                  {traj.symbol} {traj.label}
                </span>
              )}
            </p>
            {/* WHY: whyNow explanation */}
            {whyNow && (
              <p className="text-[11px] mt-0.5" style={{ color: "#94a3b8", lineHeight: 1.4 }} data-testid={`why-now-${item.id}`}>{whyNow}</p>
            )}
            {/* Hover: secondary risks */}
            {hovered && secondary.length > 0 && (
              <p className="text-[10px] mt-1" style={{ color: "#b0b8c4" }}>
                Also: {secondary.join(" · ")}
              </p>
            )}
          </div>
          <button
            onClick={handleCta}
            className="inline-flex items-center gap-1 shrink-0 text-[11px] font-semibold transition-opacity hover:opacity-70 mt-1"
            style={{ color: intv.color }}
            data-testid={`coach-cta-${item.id}`}
          >
            {intv.label} <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      </div>
      {showEscalate && (
        <EscalateModal item={item} onClose={() => setShowEscalate(false)} onSent={handleEscalated} />
      )}
    </>
  );
}

/* ═══════════════════════════════════════════════ */
/* Main: CoachInbox                                */
/* ═══════════════════════════════════════════════ */
export default function CoachInbox() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dismissed, setDismissed] = useState(new Set());

  const fetchItems = useCallback(async () => {
    try {
      const token = localStorage.getItem("capymatch_token");
      const res = await axios.get(`${API}/coach-inbox`, { headers: { Authorization: `Bearer ${token}` } });
      setItems(res.data.items || []);
    } catch { /* silent */ }
    setLoading(false);
  }, []);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  function handleDismiss(id) {
    setDismissed(prev => new Set([...prev, id]));
  }

  if (loading) return null;

  const visible = items.filter(i => !dismissed.has(i.id));
  if (visible.length === 0) return null;

  const topItem = visible[0];
  const rest = visible.slice(1);

  return (
    <div className="space-y-4" data-testid="coach-inbox-section">
      {/* Top Priority */}
      <CoachTopPriority item={topItem} />

      {/* Up Next — action queue */}
      {rest.length > 0 && (
        <div data-testid="coach-up-next">
          <p className="text-[10px] font-bold uppercase tracking-[0.1em] mb-2" style={{ color: "#94a3b8" }}>
            Up Next
          </p>
          <div className="rounded-lg overflow-hidden border" style={{ borderColor: "#e2e8f0", backgroundColor: "#fff" }}>
            {rest.map((item) => (
              <UpNextRow key={item.id} item={item} onDismiss={handleDismiss} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

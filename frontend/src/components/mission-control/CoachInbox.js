import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, AlertTriangle, Send, FileText, ExternalLink, X, Loader2 } from "lucide-react";
import axios from "axios";
import { toast } from "sonner";
import { getPrimaryHeadline, getShortExplanation, getSchoolNames, getContextualCta } from "./inbox-utils";

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

/* ── CTA color by signal type ── */
function getCtaColor(item) {
  const issues = item.issues || [];
  if (issues.includes("Overdue follow-up") || issues.includes("Escalated issue")) return "#dc2626";
  if (issues.includes("Missing requirement") || issues.includes("No coach assigned")) return "#b45309";
  return "#0d9488";
}

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
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-white/40 mb-1">Issue</p>
            <p className="text-sm text-white/80">{getPrimaryHeadline(item)}</p>
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
  const severityLabel = isCritical ? "CRITICAL" : "HIGH PRIORITY";

  const headline = getPrimaryHeadline(item);
  const explanation = getShortExplanation(item);
  const schoolNames = getSchoolNames(item);
  const ctaLabel = getContextualCta(item);
  const ctaColor = getCtaColor(item);
  const traj = TRAJECTORY[item.trajectory];
  const showTraj = item.trajectory && item.trajectory !== "stable" && traj;

  function handleCta() {
    if (item.interventionType === "escalate") {
      setShowEscalate(true);
    } else {
      navigate(item.cta.url);
    }
  }

  return (
    <>
      <div className="rounded-lg overflow-hidden" style={{ background: cardBg, border: `1px solid ${cardBorder}` }} data-testid="coach-top-priority">
        <div className="px-5 py-4">
          {/* Row 1: Severity badge */}
          <div className="flex items-center gap-2 mb-3">
            <span className="text-[9px] font-bold uppercase tracking-[0.1em] px-2 py-0.5 rounded" style={{ color: labelColor, background: `${labelColor}10` }} data-testid="coach-severity-label">
              {severityLabel}
            </span>
          </div>

          {/* Row 2: Avatar + Name */}
          <div className="flex items-center gap-2.5 mb-2">
            <Avatar name={item.athleteName} photoUrl={item.photoUrl} size={30} />
            <p className="text-[14px] font-semibold" style={{ color: "#1e293b", lineHeight: 1.2 }}>
              {item.athleteName}
            </p>
          </div>

          {/* Row 3: Primary headline (bold, dominant) */}
          <p className="text-[16px] font-bold" style={{ color: isCritical ? "#b91c1c" : "#92400e", lineHeight: 1.3 }} data-testid="coach-headline">
            {headline}
          </p>

          {/* Row 4: Trend */}
          {showTraj && (
            <p className="mt-1" style={{ fontSize: 11, fontWeight: 600, color: traj.color }}>
              {traj.symbol} {traj.label}
            </p>
          )}

          {/* Row 5: Short explanation (1 line) */}
          <p className="text-[12px] mt-1" style={{ color: "#78716c", lineHeight: 1.4 }} data-testid="coach-why-now">
            {explanation}
          </p>

          {/* Row 6: School list (compact bullets) */}
          {schoolNames.length > 0 && (
            <div className="mt-2.5 flex flex-col gap-0.5" data-testid="coach-school-list">
              {schoolNames.slice(0, 5).map((name, i) => (
                <p key={i} className="text-[11px] flex items-center gap-1.5" style={{ color: "#64748b" }}>
                  <span className="w-1 h-1 rounded-full shrink-0" style={{ background: isCritical ? "#ef4444" : "#f59e0b" }} />
                  {name}
                </p>
              ))}
            </div>
          )}

          {/* CTA */}
          <div className="mt-4 pt-3" style={{ borderTop: `1px solid ${isCritical ? "rgba(254,202,202,0.4)" : "rgba(254,240,138,0.4)"}` }}>
            <button
              onClick={handleCta}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-[12px] font-semibold cursor-pointer text-white transition-opacity hover:opacity-90"
              style={{ background: ctaColor, border: "none", fontFamily: "inherit" }}
              data-testid="coach-top-priority-cta"
            >
              {ctaLabel} <ArrowRight className="w-3.5 h-3.5" />
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
/* Up Next Row — clean hierarchy                   */
/* ═══════════════════════════════════════════════ */
const SEV_DOT = { critical: "#ef4444", high: "#f59e0b", medium: "#94a3b8", low: "#cbd5e1" };

function UpNextRow({ item, onDismiss }) {
  const navigate = useNavigate();
  const [showEscalate, setShowEscalate] = useState(false);
  const [exiting, setExiting] = useState(false);
  const dot = SEV_DOT[item.severity] || "#94a3b8";

  const headline = getPrimaryHeadline(item);
  const explanation = getShortExplanation(item);
  const schoolNames = getSchoolNames(item);
  const ctaLabel = getContextualCta(item);
  const ctaColor = getCtaColor(item);
  const traj = TRAJECTORY[item.trajectory];
  const showTraj = item.trajectory && item.trajectory !== "stable" && traj;

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
        className="px-4 py-3 transition-all duration-300"
        style={{
          borderBottom: "1px solid #f1f5f9",
          opacity: exiting ? 0 : 1,
          maxHeight: exiting ? 0 : 200,
          overflow: "hidden",
        }}
        data-testid={`coach-inbox-row-${item.id}`}
      >
        <div className="flex items-start gap-3">
          {/* Left: Avatar + severity dot */}
          <div className="relative shrink-0">
            <Avatar name={item.athleteName} photoUrl={item.photoUrl} size={28} />
            <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full" style={{ background: dot, border: "2px solid white" }} data-testid={`severity-dot-${item.severity}`} />
          </div>

          {/* Center: Content */}
          <div className="flex-1 min-w-0">
            {/* Name */}
            <p className="text-[13px] font-semibold" style={{ color: "#1e293b", lineHeight: 1.2 }}>{item.athleteName}</p>
            {/* Headline */}
            <p className="text-[12px] font-semibold mt-0.5" style={{ color: dot === "#ef4444" ? "#b91c1c" : "#64748b" }}>
              {headline}
            </p>
            {/* Trend + explanation on one line */}
            <p className="text-[11px] mt-0.5" style={{ color: "#94a3b8", lineHeight: 1.3 }}>
              {showTraj && (
                <span style={{ color: traj.color, fontWeight: 600, marginRight: 6 }}>{traj.symbol} {traj.label}</span>
              )}
              {explanation}
            </p>
            {/* School bullets (compact) */}
            {schoolNames.length > 1 && (
              <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0" data-testid={`school-issues-${item.id}`}>
                {schoolNames.slice(0, 4).map((name, i) => (
                  <span key={i} className="text-[10px] flex items-center gap-1" style={{ color: "#94a3b8" }}>
                    <span className="w-1 h-1 rounded-full" style={{ background: dot }} />
                    {name}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Right: CTA */}
          <button
            onClick={handleCta}
            className="inline-flex items-center gap-1 shrink-0 text-[11px] font-semibold transition-opacity hover:opacity-70 mt-1 whitespace-nowrap"
            style={{ color: ctaColor }}
            data-testid={`coach-cta-${item.id}`}
          >
            {ctaLabel} <ArrowRight className="w-3 h-3" />
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
export default function CoachInbox({ excludeAthleteId }) {
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

  const visible = items.filter(i => !dismissed.has(i.id) && i.athleteId !== excludeAthleteId);
  if (visible.length === 0) return null;

  const topItem = visible[0];
  const rest = visible.slice(1);

  return (
    <div className="space-y-4" data-testid="coach-inbox-section">
      <CoachTopPriority item={topItem} />

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

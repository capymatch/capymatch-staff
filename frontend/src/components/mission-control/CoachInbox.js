import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, AlertTriangle, X, Loader2 } from "lucide-react";
import axios from "axios";
import { toast } from "sonner";
import {
  getPrimaryHeadline,
  getSecondaryContext,
  getCompressedLine,
  getSchoolNames,
  getContextualCta,
} from "./inbox-utils";

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

/* ── CTA color: red only for overdue/escalated ── */
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
          <button onClick={onClose} className="p-1 rounded hover:bg-white/10"><X className="w-4 h-4 text-white/60" /></button>
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
            <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3}
              placeholder="Add context for the director..."
              className="w-full text-sm rounded-md px-3 py-2 outline-none resize-none"
              style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff" }}
              data-testid="escalate-note-input" />
          </div>
        </div>
        <div className="flex justify-end gap-2 px-5 py-3" style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}>
          <button onClick={onClose} className="px-3 py-1.5 text-xs font-semibold rounded-md" style={{ color: "rgba(255,255,255,0.5)" }}>Cancel</button>
          <button onClick={handleSend} disabled={sending}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-md text-xs font-semibold text-white disabled:opacity-50"
            style={{ background: "#dc2626" }} data-testid="escalate-confirm-btn">
            {sending ? <Loader2 className="w-3 h-3 animate-spin" /> : <AlertTriangle className="w-3 h-3" />}
            {sending ? "Sending..." : "Send Escalation"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════ */
/* Top Priority Card (Coach — critical)            */
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

  const headline = getPrimaryHeadline(item);
  const context = getSecondaryContext(item);
  const compressed = getCompressedLine(item);
  const schoolNames = getSchoolNames(item);
  const ctaLabel = getContextualCta(item);
  const ctaColor = getCtaColor(item);

  function handleCta() {
    if (item.interventionType === "escalate") setShowEscalate(true);
    else navigate(item.cta?.url || `/support-pods/${item.athleteId}`);
  }

  return (
    <>
      <div className="rounded-lg overflow-hidden" style={{ background: cardBg, border: `1px solid ${cardBorder}` }} data-testid="coach-top-priority">
        <div className="px-5 py-4">
          {/* Severity */}
          <span className="text-[9px] font-bold uppercase tracking-[0.1em] px-2 py-0.5 rounded"
            style={{ color: labelColor, background: `${labelColor}10` }} data-testid="coach-severity-label">
            {isCritical ? "CRITICAL" : "HIGH PRIORITY"}
          </span>

          {/* Name */}
          <div className="flex items-center gap-2.5 mt-3 mb-1">
            <Avatar name={item.athleteName} photoUrl={item.photoUrl} size={28} />
            <p className="text-[14px] font-semibold" style={{ color: "#1e293b" }}>{item.athleteName}</p>
          </div>

          {/* Headline (dominant — red only for overdue count) */}
          <p className="text-[16px] font-bold" style={{ color: isCritical ? "#b91c1c" : "#92400e" }} data-testid="coach-headline">
            {headline}
          </p>

          {/* Context: "Across 4 schools" or school name */}
          {context && (
            <p className="text-[11px] font-medium mt-0.5" style={{ color: "#64748b" }}>{context}</p>
          )}

          {/* Compressed line: "↘ Worsening · Momentum dropping" */}
          <p className="text-[11px] mt-1" style={{ color: "#94a3b8" }} data-testid="coach-compressed-line">
            {compressed}
          </p>

          {/* School bullets — neutral gray, never red */}
          {schoolNames.length > 0 && (
            <div className="mt-2 flex flex-col gap-0.5" data-testid="coach-school-list">
              {schoolNames.slice(0, 5).map((name, i) => (
                <p key={i} className="text-[11px] flex items-center gap-1.5" style={{ color: "#64748b" }}>
                  <span className="w-1 h-1 rounded-full shrink-0" style={{ background: "#cbd5e1" }} />
                  {name}
                </p>
              ))}
            </div>
          )}

          {/* CTA — full-width solid button for critical card */}
          <div className="mt-4 pt-3" style={{ borderTop: `1px solid ${isCritical ? "rgba(254,202,202,0.4)" : "rgba(254,240,138,0.4)"}` }}>
            <button onClick={handleCta}
              className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg text-[12px] font-bold cursor-pointer text-white transition-opacity hover:opacity-90"
              style={{ background: ctaColor, border: "none", fontFamily: "inherit" }}
              data-testid="coach-top-priority-cta">
              {ctaLabel} <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
      {showEscalate && <EscalateModal item={item} onClose={() => setShowEscalate(false)} onSent={() => { setShowEscalate(false); setDismissed(true); }} />}
    </>
  );
}

/* ═══════════════════════════════════════════════ */
/* Up Next Row — compact, inline CTA              */
/* ═══════════════════════════════════════════════ */
const SEV_DOT = { critical: "#ef4444", high: "#f59e0b", medium: "#94a3b8", low: "#cbd5e1" };

function UpNextRow({ item, onDismiss }) {
  const navigate = useNavigate();
  const [showEscalate, setShowEscalate] = useState(false);
  const [exiting, setExiting] = useState(false);
  const dot = SEV_DOT[item.severity] || "#94a3b8";

  const headline = getPrimaryHeadline(item);
  const context = getSecondaryContext(item);
  const compressed = getCompressedLine(item);
  const schoolNames = getSchoolNames(item);
  const ctaLabel = getContextualCta(item);
  const ctaColor = getCtaColor(item);

  function handleCta(e) {
    e.stopPropagation();
    if (item.interventionType === "escalate") setShowEscalate(true);
    else navigate(item.cta?.url || `/support-pods/${item.athleteId}`);
  }

  return (
    <>
      <div className="px-4 py-3 transition-all duration-300"
        style={{ borderBottom: "1px solid #f1f5f9", opacity: exiting ? 0 : 1, maxHeight: exiting ? 0 : 200, overflow: "hidden" }}
        data-testid={`coach-inbox-row-${item.id}`}>
        <div className="flex items-start gap-3">
          {/* Avatar + severity dot */}
          <div className="relative shrink-0">
            <Avatar name={item.athleteName} photoUrl={item.photoUrl} size={28} />
            <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full" style={{ background: dot, border: "2px solid white" }} />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-semibold" style={{ color: "#1e293b" }}>{item.athleteName}</p>
            {/* Headline — red text only for the count */}
            <p className="text-[12px] font-semibold mt-0.5" style={{ color: "#334155" }}>{headline}</p>
            {/* Compressed: trend · reason */}
            <p className="text-[10px] mt-0.5" style={{ color: "#94a3b8" }}>
              {context && <span style={{ color: "#78716c" }}>{context} · </span>}
              {compressed}
            </p>
            {/* School names inline — neutral gray, no red */}
            {schoolNames.length > 1 && (
              <p className="text-[10px] mt-0.5" style={{ color: "#94a3b8" }}>
                {schoolNames.slice(0, 3).map((n, i) => (
                  <span key={i}>{i > 0 ? " · " : ""}{n}</span>
                ))}
                {schoolNames.length > 3 && <span> +{schoolNames.length - 3}</span>}
              </p>
            )}
          </div>

          {/* CTA — subtle text + arrow for secondary cards */}
          <button onClick={handleCta}
            className="inline-flex items-center gap-1 shrink-0 text-[11px] font-semibold transition-opacity hover:opacity-70 mt-1 whitespace-nowrap"
            style={{ color: ctaColor, background: "none", border: "none", cursor: "pointer", fontFamily: "inherit" }}
            data-testid={`coach-cta-${item.id}`}>
            {ctaLabel} <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      </div>
      {showEscalate && <EscalateModal item={item} onClose={() => setShowEscalate(false)} onSent={() => { setShowEscalate(false); setExiting(true); setTimeout(() => onDismiss?.(item.id), 300); }} />}
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

  if (loading) return null;

  const visible = items.filter(i => !dismissed.has(i.id) && i.athleteId !== excludeAthleteId);
  if (visible.length === 0) return null;

  return (
    <div className="space-y-4" data-testid="coach-inbox-section">
      <CoachTopPriority item={visible[0]} />

      {visible.length > 1 && (
        <div data-testid="coach-up-next">
          <p className="text-[10px] font-bold uppercase tracking-[0.1em] mb-2" style={{ color: "#94a3b8" }}>Up Next</p>
          <div className="rounded-lg overflow-hidden border" style={{ borderColor: "#e2e8f0", backgroundColor: "#fff" }}>
            {visible.slice(1).map((item) => (
              <UpNextRow key={item.id} item={item} onDismiss={(id) => setDismissed(prev => new Set([...prev, id]))} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

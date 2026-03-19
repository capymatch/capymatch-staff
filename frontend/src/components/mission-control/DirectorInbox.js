import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Send, UserPlus, FileText, MessageCircle, RefreshCw, Check, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const DOT_COLOR = { high: "#ef4444", medium: "#f59e0b" };

/* ── Nudge mapping: issue → suggestion + icon + route + autopilot action ── */
const NUDGE_MAP = {
  "Awaiting reply": {
    label: "Send follow-up message",
    icon: Send,
    actionType: "follow_up",
    getUrl: (item) => `/messages?to=${encodeURIComponent(item.athleteName)}&draft=${encodeURIComponent(`Hi ${item.athleteName.split(" ")[0]}, just following up${item.schoolName ? ` regarding ${item.schoolName}` : ""} — would love to hear your thoughts. Let us know if you had a chance to review.`)}`,
    getTemplate: (item) => `Hi ${item.athleteName.split(" ")[0]}, just following up${item.schoolName ? ` regarding ${item.schoolName}` : ""} — would love to hear your thoughts. Let us know if you had a chance to review.`,
  },
  "No activity": {
    label: "Check in with athlete",
    icon: MessageCircle,
    actionType: "check_in",
    getUrl: (item) => `/support-pods/${extractAthleteId(item)}`,
    getTemplate: (item) => `Hi ${item.athleteName.split(" ")[0]}, just checking in${item.schoolName ? ` regarding ${item.schoolName}` : ""} — wanted to see how things are going on your end. Let us know if there's anything you need.`,
  },
  "Missing requirement": {
    label: "Request missing document",
    icon: FileText,
    actionType: "request_doc",
    getUrl: (item) => `/support-pods/${extractAthleteId(item)}`,
    getTemplate: (item) => `Hi ${item.athleteName.split(" ")[0]}, we noticed a required document is still missing${item.schoolName ? ` for ${item.schoolName}` : ""} from your profile. Please upload it at your earliest convenience so we can keep things moving.`,
  },
  "No coach assigned": {
    label: "Assign coach",
    icon: UserPlus,
    actionType: "assign_coach",
    getUrl: () => "/roster",
    getTemplate: () => null,
  },
  "Needs follow-up": {
    label: "Review and follow up",
    icon: RefreshCw,
    actionType: "follow_up",
    getUrl: () => "/advocacy",
    getTemplate: (item) => `Hi ${item.athleteName.split(" ")[0]}, just following up${item.schoolName ? ` regarding ${item.schoolName}` : ""} on our last conversation. Let us know how things are progressing.`,
  },
  "Needs attention": {
    label: "Review and take action",
    icon: RefreshCw,
    actionType: "check_in",
    getUrl: (item) => item.cta.url,
    getTemplate: (item) => `Hi ${item.athleteName.split(" ")[0]}, just checking in${item.schoolName ? ` regarding ${item.schoolName}` : ""} — wanted to see how things are going. Let us know if there's anything you need.`,
  },
};

function extractAthleteId(item) {
  return (item.id || "").replace(/^inbox_/, "").split("_")[0];
}

function getNudge(item) {
  const issues = item.issues || [];
  const order = ["No coach assigned", "Missing requirement", "Awaiting reply", "No activity", "Needs follow-up", "Needs attention"];
  for (const key of order) {
    if (issues.includes(key) && NUDGE_MAP[key]) {
      const n = NUDGE_MAP[key];
      return {
        label: n.label,
        Icon: n.icon,
        url: n.getUrl(item),
        actionType: n.actionType,
        template: n.getTemplate ? n.getTemplate(item) : null,
      };
    }
  }
  return null;
}

/* ── Inbox Row ── */
function InboxRow({ item }) {
  const navigate = useNavigate();
  const dot = DOT_COLOR[item.priority] || "#94a3b8";
  const isPrimary = item.ctaPrimary;
  const nudge = getNudge(item);

  const title = item.titleSuffix
    ? `${item.athleteName} — ${item.titleSuffix}`
    : item.schoolName
      ? `${item.athleteName} — ${item.schoolName}`
      : item.athleteName;

  const parts = [...(item.issues || [])];
  if (item.timeAgo) parts.push(item.timeAgo);
  const subtitle = parts.join(" · ");

  return (
    <div className="inbox-row-wrap" data-testid={`inbox-row-${item.id}`}>
      <div
        className="inbox-row"
        onClick={() => navigate(item.cta.url)}
      >
        <span className="inbox-dot" style={{ background: dot }} />
        <div className="inbox-text">
          <p className="inbox-title">{title}</p>
          <p className="inbox-subtitle">{subtitle}</p>
        </div>
        <span className="inbox-cta" style={{ opacity: isPrimary ? 1 : 0.6 }}>
          {item.cta.label} <ArrowRight className="w-3 h-3" />
        </span>
      </div>
      {/* Nudge on hover */}
      {nudge && (
        <div
          className="inbox-nudge"
          onClick={(e) => { e.stopPropagation(); navigate(nudge.url); }}
          data-testid={`nudge-${item.id}`}
        >
          <nudge.Icon className="w-3 h-3" />
          <span>{nudge.label}</span>
          <ArrowRight className="w-2.5 h-2.5" style={{ opacity: 0.5 }} />
        </div>
      )}
    </div>
  );
}

function GroupLabel({ label }) {
  return (
    <div className="px-5 pt-4 pb-1.5">
      <span className="text-[9.5px] font-bold uppercase tracking-[0.12em]" style={{ color: "#94a3b8" }}>
        {label}
      </span>
    </div>
  );
}

/* ── Scoring + "why" logic for Top Priority ── */
const HIGH_ISSUES = new Set(["Needs attention", "Missing requirement", "No coach assigned"]);
const MED_ISSUES = new Set(["Awaiting reply", "No activity"]);
const LOW_ISSUES = new Set(["Needs follow-up"]);

function scoreItem(item) {
  let score = 0;
  for (const issue of (item.issues || [])) {
    if (HIGH_ISSUES.has(issue)) score += 3;
    else if (MED_ISSUES.has(issue)) score += 2;
    else if (LOW_ISSUES.has(issue)) score += 1;
  }
  if ((item.issues || []).length > 1) score += 1;
  if (item.timestamp) {
    const age = Date.now() - new Date(item.timestamp).getTime();
    if (age > 14 * 86400000) score += 1;
  }
  if (item.schoolName) score += 1;
  return score;
}

function generateWhy(item) {
  const issues = item.issues || [];
  const has = (s) => issues.includes(s);
  const daysStr = item.timeAgo || "";

  if (has("No activity") && has("No coach assigned"))
    return "No activity and no coach assigned — athlete is at risk of falling behind.";
  if (has("Needs attention") && has("No activity"))
    return `Flagged and inactive ${daysStr ? "for " + daysStr.replace(" ago", "") : ""} — momentum may be dropping.`.replace("for now", "");
  if (has("Needs attention") && has("Missing requirement"))
    return "Flagged with missing requirements — may block applications.";
  if (has("No coach assigned"))
    return "No coach assigned — athlete is not being actively managed.";
  if (has("Missing requirement"))
    return "Missing requirement — may block applications.";
  if (has("Awaiting reply"))
    return "Waiting for response — opportunity may go cold.";
  if (has("No activity"))
    return `No activity ${daysStr ? "in " + daysStr.replace(" ago", "") : ""} — recruiting momentum may be dropping.`.replace("in now", "recently");
  if (has("Needs follow-up"))
    return "Follow-up needed — don't let this conversation stall.";
  if (has("Needs attention"))
    return "Flagged for attention — review and take action.";
  return "This item needs your attention.";
}

function getTopPriority(items) {
  if (!items || items.length === 0) return null;
  const scored = items.map(i => ({ ...i, _score: scoreItem(i) }));
  scored.sort((a, b) => {
    if (b._score !== a._score) return b._score - a._score;
    return (a.timestamp || "").localeCompare(b.timestamp || "");
  });
  return scored[0];
}

/* ── Compose Modal (Journey-style dark modal) ── */
function ComposeModal({ nudge, item, onClose, onSent }) {
  const [body, setBody] = useState(nudge.template || "");
  const [sending, setSending] = useState(false);
  const subject = nudge.actionType === "follow_up" ? "Following up"
    : nudge.actionType === "request_doc" ? "Missing document needed"
    : "Quick check-in";

  const inputCls = "w-full px-3 py-2 rounded-lg border text-sm outline-none focus:ring-1 focus:ring-teal-600 transition-colors";
  const inputStyle = { backgroundColor: "rgba(255,255,255,0.05)", borderColor: "rgba(255,255,255,0.1)", color: "#e2e8f0" };

  async function handleSend() {
    if (!body.trim() || sending) return;
    setSending(true);
    try {
      const res = await axios.post(`${API}/autopilot/execute`, {
        action_type: nudge.actionType,
        athlete_id: extractAthleteId(item),
        athlete_name: item.athleteName,
        school_name: item.schoolName || null,
        message_body: body.trim(),
      });
      toast.success(res.data.detail || res.data.message || "Message sent");
      onSent();
    } catch (err) {
      toast.error("Failed to send — try again");
      console.error(err);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(12px)" }}
      onClick={onClose}
      data-testid="compose-modal-overlay"
    >
      <div className="w-full max-w-[480px] rounded-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200 flex flex-col"
        style={{ background: "#161b25", border: "1px solid rgba(46, 196, 182, 0.15)", boxShadow: "0 25px 60px rgba(0,0,0,0.5), 0 0 40px rgba(26,138,128,0.08)" }}
        onClick={e => e.stopPropagation()}
        data-testid="compose-modal"
      >
        {/* Header */}
        <div className="p-5 pb-4 border-b flex-shrink-0" style={{ borderColor: "rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)" }}>
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
              <nudge.Icon className="w-4 h-4 text-teal-400" />
              {nudge.label}
            </h2>
            <button onClick={onClose} className="p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer" data-testid="compose-modal-close">
              <X className="w-4 h-4 text-white/40" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-5 space-y-3">
          <div className="flex items-center gap-2 text-[12px]" style={{ color: "rgba(255,255,255,0.4)" }}>
            <span className="font-semibold">To:</span>
            <span className="text-white font-semibold">{item.athleteName}</span>
          </div>
          {item.schoolName && (
            <div className="flex items-center gap-2 text-[12px]" style={{ color: "rgba(255,255,255,0.4)" }}>
              <span className="font-semibold">School:</span>
              <span style={{ color: "#e2e8f0" }}>{item.schoolName}</span>
            </div>
          )}
          {item.schoolCount > 1 && (
            <div className="text-[12px]" style={{ color: "rgba(255,255,255,0.4)" }}>
              <span className="font-semibold">Scope:</span>
              <span style={{ color: "#e2e8f0" }}> Across {item.schoolCount} schools</span>
              {(item.schoolBreakdown || []).length > 0 && (
                <div className="mt-1.5 ml-1 space-y-0.5">
                  {(item.schoolBreakdown || []).slice(0, 3).map((b, i) => (
                    <p key={i} className="text-[11px]" style={{ color: "rgba(255,255,255,0.5)", margin: 0 }}>
                      {b.school} — <span style={{ color: "rgba(255,255,255,0.3)" }}>{b.issue}</span>
                    </p>
                  ))}
                </div>
              )}
            </div>
          )}
          <div className="flex items-center gap-2 text-[12px]" style={{ color: "rgba(255,255,255,0.4)" }}>
            <span className="font-semibold">Reason:</span>
            <span style={{ color: "#e2e8f0" }}>{(item.issues || []).join(" · ")}{item.timeAgo ? ` · ${item.timeAgo}` : ""}</span>
          </div>
          <div className="flex items-center gap-2 text-[12px]" style={{ color: "rgba(255,255,255,0.4)" }}>
            <span className="font-semibold">Subject:</span>
            <span style={{ color: "#e2e8f0" }}>{subject}</span>
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider block mb-1.5" style={{ color: "rgba(255,255,255,0.3)" }}>Message</label>
            <textarea
              value={body}
              onChange={e => setBody(e.target.value)}
              rows={4}
              className={`${inputCls} resize-none`}
              style={inputStyle}
              data-testid="compose-modal-body"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 flex items-center justify-between gap-3 flex-shrink-0" style={{ background: "rgba(15,18,25,0.5)", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <button onClick={onClose}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-[13px] font-semibold transition-all hover:bg-white/5 cursor-pointer"
            style={{ color: "rgba(255,255,255,0.5)", border: "1px solid rgba(255,255,255,0.1)", background: "transparent", fontFamily: "inherit" }}
            data-testid="compose-modal-cancel"
          >Cancel</button>
          <button onClick={handleSend} disabled={!body.trim() || sending}
            className="flex items-center gap-2 px-6 py-2.5 rounded-lg text-[13px] font-bold text-white transition-all hover:shadow-[0_0_20px_rgba(46,196,182,0.3)] cursor-pointer"
            style={{ background: "linear-gradient(135deg, #0d9488, #0f766e)", border: "none", fontFamily: "inherit", opacity: !body.trim() || sending ? 0.5 : 1 }}
            data-testid="compose-modal-send"
          >
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Send
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Top Priority Card (with Autopilot) ── */
function TopPriorityCard({ item, onActionComplete }) {
  const navigate = useNavigate();
  const [completed, setCompleted] = useState(false);
  const [showCompose, setShowCompose] = useState(false);

  if (!item || completed) return null;

  const title = item.titleSuffix
    ? `${item.athleteName} — ${item.titleSuffix}`
    : item.schoolName
      ? `${item.athleteName} — ${item.schoolName}`
      : item.athleteName;

  const parts = [...(item.issues || [])];
  if (item.timeAgo) parts.push(item.timeAgo);
  const issueLine = parts.join(" · ");
  const why = generateWhy(item);
  const nudge = getNudge(item);
  const canAutoExecute = nudge && nudge.actionType !== "assign_coach";
  const breakdown = item.schoolBreakdown || [];

  function handleApprove(e) {
    e.stopPropagation();
    if (!nudge) return;
    if (nudge.actionType === "assign_coach") {
      navigate("/roster");
      return;
    }
    setShowCompose(true);
  }

  function handleEdit(e) {
    e.stopPropagation();
    if (nudge) navigate(nudge.url);
  }

  function handleSent() {
    setShowCompose(false);
    setCompleted(true);
    if (onActionComplete) onActionComplete(item.id);
  }

  return (
    <div
      className="rounded-lg overflow-hidden"
      style={{ background: "#fefce8", border: "1px solid #fef08a" }}
      data-testid="top-priority-card"
    >
      <div className="px-5 py-3.5">
        <p className="text-[10px] font-bold uppercase tracking-[0.1em]" style={{ color: "#a16207", margin: 0 }}>
          Top Priority Right Now
        </p>
        <p className="text-[15px] font-bold mt-1.5" style={{ color: "#1e293b", margin: 0, lineHeight: 1.3 }}>
          {title}
        </p>
        <p className="text-[12px] font-medium mt-1" style={{ color: "#92400e", margin: 0 }}>
          {issueLine}
        </p>
        <p className="text-[11.5px] mt-1.5" style={{ color: "#78716c", margin: 0, lineHeight: 1.4 }}>
          {why}
        </p>

        {/* School breakdown — "Also affected" */}
        {breakdown.length > 1 && (
          <div className="mt-2">
            <p className="text-[9.5px] font-bold uppercase tracking-[0.08em]" style={{ color: "#a16207", opacity: 0.5, margin: "0 0 4px" }}>
              Also affected
            </p>
            {breakdown.slice(0, 3).map((b, i) => (
              <p key={i} className="text-[11px] font-medium" style={{ color: "#78716c", margin: "1px 0", lineHeight: 1.4 }}>
                <span style={{ color: "#92400e" }}>{b.issue}</span>
                <span style={{ color: "#a8a29e" }}> — {b.school}</span>
              </p>
            ))}
          </div>
        )}

        {/* Suggested Action with Approve/Edit */}
        {nudge && (
          <div className="mt-3 pt-2.5" style={{ borderTop: "1px solid rgba(254,240,138,0.6)" }}>
            <p className="text-[9.5px] font-bold uppercase tracking-[0.1em] mb-1.5" style={{ color: "#a16207", opacity: 0.6, margin: 0 }}>
              Suggested action
            </p>
            {(item.schoolName || item.titleSuffix) && (
              <p className="text-[11px] font-medium mb-1" style={{ color: "#a16207", opacity: 0.7, margin: 0 }}>
                {item.schoolName ? `Regarding ${item.schoolName} outreach` : `${item.titleSuffix}`}
              </p>
            )}
            <div className="flex items-center gap-1.5 mb-2">
              <nudge.Icon className="w-3.5 h-3.5" style={{ color: "#0d9488" }} />
              <span className="text-[12px] font-semibold" style={{ color: "#1e293b" }}>
                {nudge.label}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {canAutoExecute && (
                <button
                  onClick={handleApprove}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11.5px] font-semibold cursor-pointer transition-all duration-100"
                  style={{
                    background: "#0d9488",
                    color: "#fff",
                    border: "none",
                    fontFamily: "inherit",
                  }}
                  data-testid="autopilot-approve-btn"
                >
                  <Check className="w-3 h-3" /> Approve & Send
                </button>
              )}
              <button
                onClick={handleEdit}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-[11.5px] font-semibold cursor-pointer transition-colors duration-100"
                style={{
                  background: "transparent",
                  color: "#64748b",
                  border: "1px solid #e2e8f0",
                  fontFamily: "inherit",
                }}
                data-testid="autopilot-edit-btn"
              >
                Edit
              </button>
            </div>
          </div>
        )}

        {/* Secondary CTA — Open Pod */}
        <span
          className="inline-flex items-center gap-1 mt-2.5 text-[11px] font-medium cursor-pointer"
          style={{ color: "#94a3b8" }}
          onClick={(e) => { e.stopPropagation(); navigate(item.cta.url); }}
          data-testid="top-priority-cta"
        >
          {item.cta.label} <ArrowRight className="w-3 h-3" />
        </span>
      </div>

      {/* Compose Modal */}
      {showCompose && nudge && (
        <ComposeModal
          nudge={nudge}
          item={item}
          onClose={() => setShowCompose(false)}
          onSent={handleSent}
        />
      )}
    </div>
  );
}

/* ── Main export ── */
export default function DirectorInbox() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);

  const fetchInbox = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/director-inbox`);
      setItems(res.data.items || []);
      setTotalCount(res.data.count || 0);
    } catch (err) {
      console.error("Failed to load director inbox:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchInbox(); }, [fetchInbox]);

  const handleActionComplete = useCallback((itemId) => {
    // Remove completed item and recompute
    setItems(prev => {
      const next = prev.filter(i => i.id !== itemId);
      setTotalCount(next.length);
      return next;
    });
  }, []);

  const topItem = getTopPriority(items);
  const highItems = items.filter(i => i.group === "high");
  const atRiskItems = items.filter(i => i.group === "at_risk");

  if (loading) {
    return (
      <div className="space-y-4" data-testid="director-inbox-wrapper">
        <section className="inbox-container" data-testid="director-inbox">
          <div className="px-5 py-5">
            <div className="h-4 w-40 rounded bg-slate-100 animate-pulse" />
            <div className="h-12 w-full rounded bg-slate-50 animate-pulse mt-4" />
            <div className="h-12 w-full rounded bg-slate-50 animate-pulse mt-2" />
          </div>
        </section>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <section className="inbox-container" data-testid="director-inbox">
        <div className="px-5 py-10 text-center">
          <h3 className="text-[14px] font-semibold" style={{ color: "#1e293b" }}>No urgent issues</h3>
          <p className="text-[12px] mt-1" style={{ color: "#94a3b8" }}>
            Everything is running smoothly right now.
          </p>
        </div>
      </section>
    );
  }

  return (
    <div className="space-y-4" data-testid="director-inbox-wrapper">
      <style>{`
        .inbox-container {
          background: #fff;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          overflow: hidden;
        }
        .inbox-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 20px;
          border-bottom: 1px solid #f1f5f9;
        }
        .inbox-row-wrap {
          position: relative;
          border-bottom: 1px solid #f8fafc;
        }
        .inbox-row-wrap:last-child { border-bottom: none; }
        .inbox-row {
          display: grid;
          grid-template-columns: 18px 1fr auto;
          align-items: center;
          gap: 0;
          padding: 0 20px;
          height: 66px;
          cursor: pointer;
          transition: background 80ms ease-out;
        }
        .inbox-row:hover { background: #f8fafc; }
        .inbox-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          justify-self: start;
        }
        .inbox-text {
          min-width: 0;
          padding-right: 16px;
        }
        .inbox-title {
          font-size: 13px;
          font-weight: 600;
          color: #1e293b;
          line-height: 1.3;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          margin: 0;
        }
        .inbox-subtitle {
          font-size: 11.5px;
          font-weight: 500;
          color: #94a3b8;
          line-height: 1.3;
          margin: 2px 0 0;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .inbox-cta {
          font-size: 11.5px;
          font-weight: 600;
          color: #0d9488;
          white-space: nowrap;
          display: flex;
          align-items: center;
          gap: 3px;
        }
        /* Nudge — visible on hover */
        .inbox-nudge {
          display: none;
          align-items: center;
          gap: 5px;
          padding: 4px 20px 8px 38px;
          font-size: 11px;
          font-weight: 500;
          color: #0d9488;
          opacity: 0.7;
          cursor: pointer;
          transition: opacity 80ms;
        }
        .inbox-nudge:hover { opacity: 1; }
        .inbox-row-wrap:hover .inbox-nudge { display: flex; }
      `}</style>

      {/* ═══ TOP PRIORITY ═══ */}
      <TopPriorityCard item={topItem} onActionComplete={handleActionComplete} />

      {/* ═══ INBOX ═══ */}
      <section className="inbox-container" data-testid="director-inbox">
        <div className="inbox-header">
          <div className="flex items-center gap-2">
            <h3 className="text-[14px] font-bold" style={{ color: "#1e293b", margin: 0 }}>
              Needs Attention
            </h3>
            <span className="text-[12px] font-medium" style={{ color: "#94a3b8" }}>
              ({totalCount})
            </span>
          </div>
          <span
            className="text-[11px] font-semibold flex items-center gap-0.5 cursor-pointer"
            style={{ color: "#94a3b8" }}
          >
            View all <ArrowRight className="w-3 h-3" />
          </span>
        </div>

        {highItems.length > 0 && (
          <>
            <GroupLabel label="High Priority" />
            <div data-testid="inbox-group-high">
              {highItems.map(item => <InboxRow key={item.id} item={item} />)}
            </div>
          </>
        )}

        {atRiskItems.length > 0 && (
          <>
            <GroupLabel label="At Risk" />
            <div data-testid="inbox-group-at-risk">
              {atRiskItems.map(item => <InboxRow key={item.id} item={item} />)}
            </div>
          </>
        )}
      </section>
    </div>
  );
}

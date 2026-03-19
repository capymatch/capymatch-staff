import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const DOT_COLOR = { high: "#ef4444", medium: "#f59e0b" };

function InboxRow({ item }) {
  const navigate = useNavigate();
  const dot = DOT_COLOR[item.priority] || "#94a3b8";
  const isPrimary = item.ctaPrimary;

  const title = item.schoolName
    ? `${item.athleteName} — ${item.schoolName}`
    : item.athleteName;

  const parts = [...(item.issues || [])];
  if (item.timeAgo) parts.push(item.timeAgo);
  const subtitle = parts.join(" · ");

  return (
    <div
      className="inbox-row"
      onClick={() => navigate(item.cta.url)}
      data-testid={`inbox-row-${item.id}`}
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
  // Boosts
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

/* ── Top Priority component ── */
function TopPriorityCard({ item }) {
  const navigate = useNavigate();
  if (!item) return null;

  const title = item.schoolName
    ? `${item.athleteName} — ${item.schoolName}`
    : item.athleteName;

  const parts = [...(item.issues || [])];
  if (item.timeAgo) parts.push(item.timeAgo);
  const issueLine = parts.join(" · ");
  const why = generateWhy(item);

  return (
    <div
      className="rounded-lg overflow-hidden cursor-pointer"
      style={{ background: "#fefce8", border: "1px solid #fef08a" }}
      onClick={() => navigate(item.cta.url)}
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
        <span
          className="inline-flex items-center gap-1 mt-2.5 text-[12px] font-semibold"
          style={{ color: "#0d9488" }}
          data-testid="top-priority-cta"
        >
          {item.cta.label} <ArrowRight className="w-3.5 h-3.5" />
        </span>
      </div>
    </div>
  );
}

/* ── Main export: renders TopPriority + Inbox ── */
export default function DirectorInbox() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    const fetchInbox = async () => {
      try {
        const res = await axios.get(`${API}/director-inbox`);
        setItems(res.data.items || []);
        setTotalCount(res.data.count || 0);
      } catch (err) {
        console.error("Failed to load director inbox:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchInbox();
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
        .inbox-row {
          display: grid;
          grid-template-columns: 18px 1fr auto;
          align-items: center;
          gap: 0;
          padding: 0 20px;
          height: 66px;
          cursor: pointer;
          transition: background 80ms ease-out;
          border-bottom: 1px solid #f8fafc;
        }
        .inbox-row:last-child { border-bottom: none; }
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
      `}</style>

      {/* ═══ TOP PRIORITY ═══ */}
      <TopPriorityCard item={topItem} />

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

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const PRIORITY_DOT = { high: "#ef4444", medium: "#f59e0b" };

/* Human-readable issue labels */
const ISSUE_LABEL = {
  "Escalation": "Needs follow-up",
  "Awaiting reply": "Awaiting reply",
  "Needs follow-up": "Needs follow-up",
  "No coach assigned": "No coach assigned",
  "Missing documents": "Missing transcript",
  "No activity": "Stalled",
};

function InboxRow({ item }) {
  const navigate = useNavigate();
  const dot = PRIORITY_DOT[item.priority] || "#94a3b8";
  const label = ISSUE_LABEL[item.issueType] || item.issueType;

  /* Compose Line 1: "Olivia Anderson — Stanford" */
  const nameLine = item.schoolName
    ? `${item.athleteName} — ${item.schoolName}`
    : item.athleteName;

  /* Compose Line 2: "Awaiting reply · 10d ago" */
  const detail = item.timeAgo ? `${label} · ${item.timeAgo}` : label;

  return (
    <div
      className="flex items-center gap-3.5 px-5 cursor-pointer transition-colors duration-100"
      style={{ height: 66, borderBottom: "1px solid #f1f5f9" }}
      onClick={() => navigate(item.cta.url)}
      onMouseEnter={e => e.currentTarget.style.background = "#f8fafc"}
      onMouseLeave={e => e.currentTarget.style.background = "transparent"}
      data-testid={`inbox-row-${item.id}`}
    >
      {/* Priority dot */}
      <span
        className="w-[7px] h-[7px] rounded-full flex-shrink-0"
        style={{ background: dot }}
      />

      {/* Center — two lines */}
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-semibold truncate" style={{ color: "#1e293b", lineHeight: 1.3 }}>
          {nameLine}
        </p>
        <p className="text-[11.5px] font-medium mt-0.5 truncate" style={{ color: "#94a3b8" }}>
          {detail}
        </p>
      </div>

      {/* CTA */}
      <span
        className="text-[11.5px] font-semibold flex items-center gap-1 flex-shrink-0"
        style={{ color: "#0d9488", whiteSpace: "nowrap" }}
      >
        {item.cta.label} <ArrowRight className="w-3 h-3" />
      </span>
    </div>
  );
}

export default function DirectorInbox() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchInbox = async () => {
      try {
        const res = await axios.get(`${API}/director-inbox`);
        setItems(res.data.items || []);
      } catch (err) {
        console.error("Failed to load director inbox:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchInbox();
  }, []);

  if (loading) {
    return (
      <section
        className="rounded-lg border overflow-hidden"
        style={{ background: "#fff", borderColor: "#e2e8f0" }}
        data-testid="director-inbox"
      >
        <div className="px-5 py-4">
          <div className="h-4 w-40 rounded bg-slate-100 animate-pulse" />
          <div className="h-3 w-56 rounded bg-slate-50 animate-pulse mt-3" />
          <div className="h-3 w-48 rounded bg-slate-50 animate-pulse mt-2" />
        </div>
      </section>
    );
  }

  if (items.length === 0) {
    return (
      <section
        className="rounded-lg border overflow-hidden"
        style={{ background: "#fff", borderColor: "#e2e8f0" }}
        data-testid="director-inbox"
      >
        <div className="px-5 py-10 text-center">
          <h3 className="text-[14px] font-semibold" style={{ color: "#1e293b" }}>No urgent issues</h3>
          <p className="text-[12px] mt-1" style={{ color: "#94a3b8" }}>
            Everything is running smoothly right now.
          </p>
        </div>
      </section>
    );
  }

  const highCount = items.filter(i => i.priority === "high").length;

  return (
    <section
      className="rounded-lg border overflow-hidden"
      style={{ background: "#fff", borderColor: "#e2e8f0" }}
      data-testid="director-inbox"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3" style={{ borderBottom: "1px solid #f1f5f9" }}>
        <div className="flex items-center gap-2">
          <h3 className="text-[14px] font-bold" style={{ color: "#1e293b" }}>Needs Attention</h3>
          <span
            className="text-[10px] font-bold px-1.5 py-0.5 rounded"
            style={{
              background: highCount > 0 ? "rgba(239,68,68,0.08)" : "rgba(245,158,11,0.08)",
              color: highCount > 0 ? "#ef4444" : "#f59e0b",
            }}
          >
            {items.length}
          </span>
        </div>
        <span
          className="text-[11px] font-semibold flex items-center gap-0.5 cursor-pointer"
          style={{ color: "#94a3b8" }}
        >
          View all <ArrowRight className="w-3 h-3" />
        </span>
      </div>

      {/* Rows */}
      <div data-testid="inbox-list">
        {items.map(item => (
          <InboxRow key={item.id} item={item} />
        ))}
      </div>
    </section>
  );
}

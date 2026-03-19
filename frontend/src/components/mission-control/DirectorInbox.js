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

  /* Line 1: "Olivia Anderson — Stanford" */
  const title = item.schoolName
    ? `${item.athleteName} — ${item.schoolName}`
    : item.athleteName;

  /* Line 2: "Needs attention · Awaiting reply · 10d ago" */
  const parts = [...(item.issues || [])];
  if (item.timeAgo) parts.push(item.timeAgo);
  const subtitle = parts.join(" · ");

  return (
    <div
      className="inbox-row"
      onClick={() => navigate(item.cta.url)}
      data-testid={`inbox-row-${item.id}`}
    >
      {/* Col 1: dot */}
      <span className="inbox-dot" style={{ background: dot }} />

      {/* Col 2: text */}
      <div className="inbox-text">
        <p className="inbox-title">{title}</p>
        <p className="inbox-subtitle">{subtitle}</p>
      </div>

      {/* Col 3: CTA */}
      <span
        className="inbox-cta"
        style={{ opacity: isPrimary ? 1 : 0.6 }}
      >
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

export default function DirectorInbox() {
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

  if (loading) {
    return (
      <section className="inbox-container" data-testid="director-inbox">
        <div className="px-5 py-5">
          <div className="h-4 w-40 rounded bg-slate-100 animate-pulse" />
          <div className="h-12 w-full rounded bg-slate-50 animate-pulse mt-4" />
          <div className="h-12 w-full rounded bg-slate-50 animate-pulse mt-2" />
        </div>
      </section>
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

  const highItems = items.filter(i => i.group === "high");
  const atRiskItems = items.filter(i => i.group === "at_risk");

  return (
    <section className="inbox-container" data-testid="director-inbox">
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

      {/* Header */}
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

      {/* HIGH PRIORITY group */}
      {highItems.length > 0 && (
        <>
          <GroupLabel label="High Priority" />
          <div data-testid="inbox-group-high">
            {highItems.map(item => (
              <InboxRow key={item.id} item={item} />
            ))}
          </div>
        </>
      )}

      {/* AT RISK group */}
      {atRiskItems.length > 0 && (
        <>
          <GroupLabel label="At Risk" />
          <div data-testid="inbox-group-at-risk">
            {atRiskItems.map(item => (
              <InboxRow key={item.id} item={item} />
            ))}
          </div>
        </>
      )}
    </section>
  );
}

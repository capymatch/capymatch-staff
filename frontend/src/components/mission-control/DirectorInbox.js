import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const SOURCE_COLORS = {
  escalation: { dot: "#ef4444", bg: "rgba(239,68,68,0.08)" },
  advocacy:   { dot: "#f59e0b", bg: "rgba(245,158,11,0.06)" },
  roster:     { dot: "#ef4444", bg: "rgba(239,68,68,0.08)" },
  momentum:   { dot: "#f59e0b", bg: "rgba(245,158,11,0.06)" },
};

const PRIORITY_DOT = { high: "#ef4444", medium: "#f59e0b" };

function InboxRow({ item }) {
  const navigate = useNavigate();
  const dot = PRIORITY_DOT[item.priority] || "#94a3b8";

  return (
    <div
      className="flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors hover:bg-white/[0.03]"
      onClick={() => navigate(item.cta.url)}
      data-testid={`inbox-row-${item.id}`}
    >
      {/* Dot */}
      <span
        className="w-[7px] h-[7px] rounded-full flex-shrink-0"
        style={{ background: dot }}
      />

      {/* Center — name + context */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-bold text-white truncate">
            {item.athleteName}
          </span>
          {item.schoolName && (
            <span className="text-[11px] font-medium truncate" style={{ color: "#8A92A3" }}>
              {item.schoolName}
            </span>
          )}
        </div>
        <p className="text-[11px] font-medium mt-0.5" style={{ color: "#6B7280" }}>
          {item.issueType}
        </p>
      </div>

      {/* Right — time + CTA */}
      <div className="flex items-center gap-3 flex-shrink-0">
        {item.timeAgo && (
          <span className="text-[10px] font-medium" style={{ color: "#6B7280" }}>
            {item.timeAgo}
          </span>
        )}
        <span
          className="text-[11px] font-semibold flex items-center gap-1"
          style={{ color: "#30C5BE", whiteSpace: "nowrap" }}
        >
          {item.cta.label} <ArrowRight className="w-3 h-3" />
        </span>
      </div>
    </div>
  );
}

export default function DirectorInbox() {
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
        className="rounded-xl border"
        style={{ backgroundColor: "#1E2433", borderColor: "#2D3548" }}
        data-testid="director-inbox"
      >
        <div className="px-5 py-4">
          <div className="h-4 w-32 rounded bg-slate-700 animate-pulse" />
          <div className="h-3 w-48 rounded bg-slate-800 animate-pulse mt-2" />
        </div>
      </section>
    );
  }

  if (items.length === 0) {
    return (
      <section
        className="rounded-xl border"
        style={{ backgroundColor: "#1E2433", borderColor: "#2D3548" }}
        data-testid="director-inbox"
      >
        <div className="px-5 py-6 text-center">
          <h3 className="text-sm font-bold text-white">No urgent issues</h3>
          <p className="text-[11px] mt-1" style={{ color: "#8A92A3" }}>
            Everything is running smoothly right now.
          </p>
        </div>
      </section>
    );
  }

  const highCount = items.filter(i => i.priority === "high").length;

  return (
    <section
      className="rounded-xl border overflow-hidden"
      style={{ backgroundColor: "#1E2433", borderColor: highCount > 0 ? "rgba(239,68,68,0.15)" : "#2D3548" }}
      data-testid="director-inbox"
    >
      {/* Header */}
      <div
        className="px-5 py-3 flex items-center justify-between"
        style={{ borderBottom: "1px solid #2D3548" }}
      >
        <div className="flex items-center gap-2.5">
          <h3 className="text-sm font-bold text-white">Needs Attention</h3>
          <span
            className="text-[10px] font-bold px-1.5 py-0.5 rounded"
            style={{
              background: highCount > 0 ? "rgba(239,68,68,0.12)" : "rgba(245,158,11,0.12)",
              color: highCount > 0 ? "#ef4444" : "#f59e0b",
            }}
          >
            {items.length}
          </span>
        </div>
        <span className="text-[10px] font-medium" style={{ color: "#6B7280" }}>
          {highCount > 0 && `${highCount} urgent`}
        </span>
      </div>

      {/* List */}
      <div className="divide-y divide-[#2D354810]" data-testid="inbox-list">
        {items.map(item => (
          <InboxRow key={item.id} item={item} />
        ))}
      </div>
    </section>
  );
}

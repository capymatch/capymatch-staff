import { useState, useEffect } from "react";
import axios from "axios";
import { AlertTriangle, Eye, CheckCircle2, Clock } from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

function Stat({ value, label, color, icon: Icon }) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ backgroundColor: `${color}08` }}>
      <Icon className="w-3.5 h-3.5 flex-shrink-0" style={{ color }} />
      <span className="text-base font-bold tabular-nums" style={{ color }}>{value}</span>
      <span className="text-[10px] font-medium" style={{ color: "var(--cm-text-3)" }}>{label}</span>
    </div>
  );
}

export default function DirectorActionsPulse() {
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem("capymatch_token");
    axios.get(`${API}/director/actions`, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => setSummary(res.data.summary))
      .catch(() => {});
  }, []);

  if (!summary) return null;

  const { total_open, open_critical, acknowledged, resolved_recently } = summary;
  const allClear = total_open === 0 && acknowledged === 0;

  // One-line insight
  let insight = "";
  if (open_critical > 0) {
    insight = `${open_critical} critical item${open_critical > 1 ? "s" : ""} still waiting on coach response`;
  } else if (total_open > 0) {
    insight = `${total_open} open action${total_open > 1 ? "s" : ""} pending coach response`;
  } else if (acknowledged > 0) {
    insight = `All actions acknowledged — ${acknowledged} in progress`;
  } else if (resolved_recently > 0) {
    insight = "Coach responsiveness is healthy this week";
  } else {
    insight = "No active director actions";
  }

  return (
    <div className="rounded-xl border px-4 py-3" data-testid="director-actions-pulse"
      style={{ backgroundColor: "var(--cm-surface)", borderColor: allClear ? "var(--cm-border)" : open_critical > 0 ? "rgba(239,68,68,0.2)" : "rgba(245,158,11,0.2)" }}>
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Stat value={total_open} label="Open" color="#f59e0b" icon={Clock} />
          {open_critical > 0 && <Stat value={open_critical} label="Critical" color="#ef4444" icon={AlertTriangle} />}
          <Stat value={acknowledged} label="Ack'd" color="#3b82f6" icon={Eye} />
          <Stat value={resolved_recently} label="This Week" color="#10b981" icon={CheckCircle2} />
        </div>
        <span className="text-[11px] font-medium" style={{ color: open_critical > 0 ? "#ef4444" : "var(--cm-text-3)" }}>
          {insight}
        </span>
      </div>
    </div>
  );
}

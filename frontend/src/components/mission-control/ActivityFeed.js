import { Star, FileText, MessageCircle, AlertCircle, Mail, TrendingUp } from "lucide-react";

const TYPE_ICONS = {
  interest: { icon: Star, color: "text-amber-500", bg: "bg-amber-50", prefix: "" },
  note: { icon: FileText, color: "text-violet-500", bg: "bg-violet-50", prefix: "" },
  response: { icon: MessageCircle, color: "text-blue-500", bg: "bg-blue-50", prefix: "" },
  inactivity: { icon: AlertCircle, color: "text-red-400", bg: "bg-red-50", prefix: "" },
  positive: { icon: TrendingUp, color: "text-emerald-500", bg: "bg-emerald-50", prefix: "" },
  mail: { icon: Mail, color: "text-slate-400", bg: "bg-slate-50", prefix: "" },
};

function detectType(item) {
  const desc = (item.description || "").toLowerCase();
  if (desc.includes("interest") || desc.includes("school")) return "interest";
  if (desc.includes("note") || desc.includes("logged")) return "note";
  if (desc.includes("response") || desc.includes("replied")) return "response";
  if (desc.includes("inactive") || desc.includes("missed") || desc.includes("dropped") || desc.includes("no activity")) return "inactivity";
  if (item.sentiment === "positive") return "positive";
  if (item.sentiment === "negative") return "inactivity";
  return "mail";
}

function formatDescription(text) {
  if (!text) return "";
  return text
    .replace(/^(just |recently |has been |was |is )/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

function getTimeLabel(hoursAgo) {
  if (hoursAgo < 1) return "now";
  if (hoursAgo < 2) return "1h";
  if (hoursAgo < 24) return `${Math.floor(hoursAgo)}h`;
  return `${Math.floor(hoursAgo / 24)}d`;
}

export default function ActivityFeed({ items = [], title = "Recent Activity" }) {
  if (!items.length) {
    return (
      <section data-testid="activity-feed">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-[11px] font-bold uppercase tracking-widest" style={{ color: "var(--cm-text-3)" }}>{title}</span>
        </div>
        <div className="rounded-xl border p-8 text-center" style={{ backgroundColor: "var(--cm-surface)", borderColor: "var(--cm-border)" }}>
          <p className="text-sm" style={{ color: "var(--cm-text-3)" }}>No recent activity</p>
        </div>
      </section>
    );
  }

  return (
    <section data-testid="activity-feed">
      <div className="flex items-center justify-between mb-4">
        <span className="text-[11px] font-bold uppercase tracking-widest" style={{ color: "var(--cm-text-3)" }}>{title}</span>
        <span className="text-xs" style={{ color: "var(--cm-text-3)" }}>{Math.min(items.length, 6)} most recent</span>
      </div>

      <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: "var(--cm-surface)", borderColor: "var(--cm-border)" }}>
        {items.slice(0, 6).map((item, idx) => {
          const type = detectType(item);
          const config = TYPE_ICONS[type];
          const Icon = config.icon;

          return (
            <div
              key={item.id || idx}
              data-testid={`activity-item-${item.id || idx}`}
              className="flex items-center gap-3.5 px-5 py-3.5 hover:bg-slate-50/40 transition-colors"
              style={{ borderBottom: idx < Math.min(items.length, 6) - 1 ? "1px solid var(--cm-border)" : "none" }}
            >
              <div className={`w-7 h-7 rounded-full ${config.bg} flex items-center justify-center shrink-0`}>
                <Icon className={`w-3.5 h-3.5 ${config.color}`} />
              </div>

              <div className="flex-1 min-w-0">
                <span className="text-[13px]" style={{ color: "var(--cm-text)" }}>
                  <span className="font-semibold">{item.athleteName}</span>
                  <span className="mx-1.5" style={{ color: "var(--cm-text-3)" }}>&mdash;</span>
                  <span style={{ color: "var(--cm-text-2)" }}>{formatDescription(item.description)}</span>
                </span>
              </div>

              <span className="text-[10px] font-medium shrink-0 tabular-nums" style={{ color: "var(--cm-text-3)" }}>
                {getTimeLabel(item.hoursAgo)}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

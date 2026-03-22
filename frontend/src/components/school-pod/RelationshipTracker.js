import { Mail, Phone, Activity } from "lucide-react";
import { STRENGTH_CONFIG } from "./constants";

export function RelationshipTracker({ relationship }) {
  if (!relationship) return null;
  const { strength, interactions, last_contact, last_contact_type, response_detail, contact_health } = relationship;
  const cfg = STRENGTH_CONFIG[strength] || STRENGTH_CONFIG.cold;
  const STRENGTH_ORDER = ["cold", "warm", "active", "strong"];
  const activeIdx = STRENGTH_ORDER.indexOf(strength);

  const lastDate = last_contact ? new Date(last_contact).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : null;

  return (
    <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: "var(--cm-surface, white)", borderColor: "var(--cm-border, #e2e8f0)" }} data-testid="relationship-tracker">
      {/* Header */}
      <div className="px-4 py-3 border-b" style={{ borderColor: "var(--cm-border, #e2e8f0)" }}>
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--cm-text-3, #94a3b8)" }}>Relationship Tracker</h3>
          <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full" style={{ backgroundColor: cfg.bg, color: cfg.color }} data-testid="relationship-strength-badge">
            {cfg.label}
          </span>
        </div>
        {/* Strength meter */}
        <div className="flex items-center gap-1.5 mt-2.5">
          {STRENGTH_ORDER.map((s, i) => {
            const sc = STRENGTH_CONFIG[s];
            const filled = i <= activeIdx;
            return (
              <div key={s} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full h-1.5 rounded-full transition-all" style={{ backgroundColor: filled ? sc.color : "var(--cm-border, #e2e8f0)" }} />
                <span className="text-[8px] font-semibold uppercase" style={{ color: filled ? sc.color : "var(--cm-text-4, #cbd5e1)" }}>{sc.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="px-4 py-3 space-y-3">
        {/* Interaction Summary */}
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: "var(--cm-text-3)" }}>Interactions</p>
          <div className="grid grid-cols-3 gap-2">
            {[
              { icon: Mail, label: "Emails", count: interactions.emails },
              { icon: Phone, label: "Calls", count: interactions.calls },
              { icon: Activity, label: "Events", count: interactions.events },
            ].map(({ icon: Icon, label, count }) => (
              <div key={label} className="flex flex-col items-center py-2 rounded-lg" style={{ backgroundColor: "var(--cm-bg, #f8fafc)" }}>
                <Icon className="w-3.5 h-3.5 mb-1" style={{ color: "var(--cm-text-3)" }} />
                <span className="text-sm font-bold" style={{ color: "var(--cm-text)" }}>{count}</span>
                <span className="text-[9px]" style={{ color: "var(--cm-text-3)" }}>{label}</span>
              </div>
            ))}
          </div>
          {(interactions.advocacy > 0 || interactions.visits > 0) && (
            <div className="flex gap-3 mt-2 text-[11px]" style={{ color: "var(--cm-text-2, #64748b)" }}>
              {interactions.visits > 0 && <span><strong>{interactions.visits}</strong> campus visit{interactions.visits !== 1 ? "s" : ""}</span>}
              {interactions.advocacy > 0 && <span><strong>{interactions.advocacy}</strong> advocacy message{interactions.advocacy !== 1 ? "s" : ""}</span>}
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="border-t" style={{ borderColor: "var(--cm-border, #e2e8f0)" }} />

        {/* Last Contact */}
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--cm-text-3)" }}>Last Contact</p>
          {lastDate ? (
            <span className="text-xs" style={{ color: "var(--cm-text)" }} data-testid="last-contact-date">
              {lastDate} <span style={{ color: "var(--cm-text-3)" }}>&#183; {last_contact_type}</span>
            </span>
          ) : (
            <span className="text-xs" style={{ color: "var(--cm-text-3)" }}>No recorded contact</span>
          )}
        </div>

        {/* Response Rate */}
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--cm-text-3)" }}>Response Rate</p>
          <span className="text-xs font-semibold" style={{ color: "var(--cm-text)" }} data-testid="response-rate">{response_detail}</span>
        </div>

        {/* Divider */}
        <div className="border-t" style={{ borderColor: "var(--cm-border, #e2e8f0)" }} />

        {/* Contact Health */}
        <div data-testid="contact-health">
          <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: "var(--cm-text-3)" }}>Contact Health</p>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: contact_health.includes("today") || contact_health.includes("Recently") ? "#10b981" : contact_health.includes("Awaiting") ? "#f59e0b" : contact_health.includes("recommended") || contact_health.includes("cold") ? "#f59e0b" : contact_health.includes("No recorded") || contact_health.includes("Re-engagement") ? "#ef4444" : "#94a3b8" }} />
            <p className="text-xs font-medium" style={{ color: contact_health.includes("today") || contact_health.includes("Recently") ? "#10b981" : contact_health.includes("Awaiting") ? "#f59e0b" : contact_health.includes("recommended") || contact_health.includes("cold") ? "#f59e0b" : contact_health.includes("No recorded") || contact_health.includes("Re-engagement") ? "#ef4444" : "#94a3b8" }}>{contact_health}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

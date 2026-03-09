import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, Check, Loader2 } from "lucide-react";
import axios from "axios";
import { toast } from "sonner";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

function TierCard({ tier, isCurrent, isPopular, onUpgrade }) {
  const isFree = tier.price === 0;

  return (
    <div
      className={`relative flex flex-col rounded-2xl border transition-all ${
        isPopular ? "border-2" : ""
      }`}
      style={{
        backgroundColor: "var(--cm-surface)",
        borderColor: isPopular ? "#0d9488" : "var(--cm-border)",
      }}
      data-testid={`tier-card-${tier.id}`}
    >
      {isPopular && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-20">
          <div className="px-5 py-1.5 rounded-full text-white text-[11px] font-bold uppercase tracking-wider whitespace-nowrap"
            style={{ backgroundColor: "#0d9488" }}>
            Most Popular
          </div>
        </div>
      )}

      <div className="p-7 flex flex-col flex-1">
        <p className="text-[11px] uppercase tracking-[0.15em] font-bold mb-5" style={{ color: "var(--cm-text-3)" }}>
          {tier.label}
        </p>

        <div className="mb-1">
          {isFree ? (
            <div className="flex items-baseline gap-1.5">
              <span className="text-4xl font-black tracking-tight" style={{ color: "var(--cm-text)" }}>Free</span>
              <span className="text-base font-medium" style={{ color: "var(--cm-text-3)" }}>forever</span>
            </div>
          ) : (
            <div className="flex items-baseline gap-0.5">
              <span className="text-4xl font-black tracking-tight" style={{ color: "var(--cm-text)" }}>${tier.price}</span>
              <span className="text-sm font-medium" style={{ color: "var(--cm-text-3)" }}>/month</span>
            </div>
          )}
        </div>

        <p className="text-xs mb-7" style={{ color: "var(--cm-text-3)" }}>
          {tier.description}
        </p>

        <ul className="space-y-4 mb-8 flex-1">
          {tier.features.map((f, i) => (
            <li key={i} className="flex items-start gap-2.5">
              <Check className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: "#0d9488" }} strokeWidth={2.5} />
              <span className="text-sm" style={{ color: "var(--cm-text)" }}>{f}</span>
            </li>
          ))}
        </ul>

        {isCurrent ? (
          <div
            className="w-full py-3 rounded-xl text-center text-sm font-semibold border"
            style={{ borderColor: "var(--cm-border)", color: "var(--cm-text-3)" }}
            data-testid={`tier-current-${tier.id}`}
          >
            Current Plan
          </div>
        ) : (
          <button
            className="w-full py-3 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2"
            style={
              isPopular
                ? { backgroundColor: "#0d9488", color: "#fff" }
                : { border: "1px solid var(--cm-border)", color: "var(--cm-text)" }
            }
            data-testid={`tier-upgrade-${tier.id}`}
            onClick={() => onUpgrade(tier)}
          >
            {isFree ? "Start Free" : `Upgrade to ${tier.label}`}
          </button>
        )}
      </div>
    </div>
  );
}

export default function UpgradeModal({ isOpen, onClose, message, currentTier = "basic" }) {
  const [tiers, setTiers] = useState([]);
  const [loading, setLoading] = useState(true);

  const displayMessage = message || null;

  useEffect(() => {
    if (!isOpen) return;
    const token = localStorage.getItem("token");
    axios.get(`${API}/subscription/tiers`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then(res => {
      setTiers(res.data.tiers || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [isOpen]);

  if (!isOpen) return null;

  const handleUpgrade = (tier) => {
    if (tier.price === 0) { onClose(); return; }
    toast.info("Stripe checkout coming soon! Contact support to upgrade.");
    onClose();
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div className="absolute inset-0" style={{ backgroundColor: "rgba(0,0,0,0.4)" }} onClick={onClose} />

      <div
        className="relative w-full max-w-4xl rounded-2xl border overflow-y-auto max-h-[95vh]"
        style={{ backgroundColor: "var(--cm-bg)", borderColor: "var(--cm-border)" }}
        data-testid="upgrade-modal"
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 p-2 rounded-xl transition-colors"
          style={{ color: "var(--cm-text-3)" }}
          data-testid="upgrade-modal-close"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="px-6 pt-8 pb-2 text-center">
          {displayMessage && (
            <div className="mb-4 mx-auto max-w-lg px-4 py-3 rounded-xl text-sm font-medium" style={{ backgroundColor: "rgba(251,191,36,0.1)", color: "#92400e", border: "1px solid rgba(251,191,36,0.3)" }} data-testid="upgrade-trigger-message">
              {displayMessage}
            </div>
          )}
          <h2 className="text-xl md:text-2xl font-bold mb-1" style={{ color: "var(--cm-text)" }}>
            Choose Your Plan
          </h2>
          <p className="text-sm" style={{ color: "var(--cm-text-3)" }}>
            Stay organized, never miss a coach response, and always know your next move.
          </p>
        </div>

        <div className="px-6 py-8">
          {loading ? (
            <div className="text-center py-12">
              <Loader2 className="w-6 h-6 animate-spin mx-auto mb-3" style={{ color: "#0d9488" }} />
              <p className="text-sm" style={{ color: "var(--cm-text-3)" }}>Loading plans...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
              {tiers.map((tier) => (
                <TierCard
                  key={tier.id}
                  tier={tier}
                  isCurrent={tier.id === currentTier}
                  isPopular={tier.id === "pro"}
                  onUpgrade={handleUpgrade}
                />
              ))}
            </div>
          )}
        </div>

        <div className="px-6 pb-6 text-center">
          <p className="text-xs" style={{ color: "var(--cm-text-3)" }}>14-day money-back guarantee. Cancel anytime.</p>
        </div>
      </div>
    </div>,
    document.body
  );
}

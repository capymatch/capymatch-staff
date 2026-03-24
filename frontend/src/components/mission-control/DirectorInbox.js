import { useState, useEffect, useCallback } from "react";
import { ArrowRight } from "lucide-react";
import axios from "axios";
import { API, getTopPriority } from "./inbox-utils";
import { InboxRow, GroupLabel } from "./InboxRow";
import { TopPriorityCard } from "./TopPriorityCard";
import { usePlan } from "@/PlanContext";
import UpgradeNudge from "@/components/UpgradeNudge";

export default function DirectorInbox() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const { getLimit } = usePlan();
  const inboxLimit = getLimit("director_inbox_item_limit");

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
    setItems(prev => {
      const next = prev.filter(i => i.id !== itemId);
      setTotalCount(next.length);
      return next;
    });
  }, []);

  const topItem = getTopPriority(items);

  // Apply plan limit: -1 = unlimited
  const isLimited = inboxLimit > 0 && items.length > inboxLimit;
  const visibleItems = isLimited ? items.slice(0, inboxLimit) : items;
  const hiddenCount = isLimited ? items.length - inboxLimit : 0;

  const highItems = visibleItems.filter(i => i.group === "high");
  const atRiskItems = visibleItems.filter(i => i.group === "at_risk");

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
          display: flex;
          align-items: flex-start;
          gap: 8px;
          padding: 12px 16px;
          cursor: pointer;
          transition: background 80ms ease-out;
        }
        .inbox-row:hover { background: #f8fafc; }
        .inbox-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          flex-shrink: 0;
          margin-top: 10px;
        }
        .inbox-text {
          min-width: 0;
          flex: 1;
        }
        .inbox-title {
          font-size: 13px;
          font-weight: 600;
          color: #1e293b;
          line-height: 1.4;
          margin: 0;
          word-wrap: break-word;
          overflow-wrap: break-word;
        }
        .inbox-subtitle {
          font-size: 11.5px;
          font-weight: 500;
          color: #94a3b8;
          line-height: 1.4;
          margin: 2px 0 0;
          word-wrap: break-word;
          overflow-wrap: break-word;
        }
        .inbox-cta {
          font-size: 11.5px;
          font-weight: 600;
          color: #64748b;
          white-space: nowrap;
          display: flex;
          align-items: center;
          gap: 3px;
          cursor: pointer;
          transition: color 80ms;
          margin-top: 4px;
          flex-shrink: 0;
        }
        .inbox-cta:hover { color: #1e293b; }
        .inbox-action-link {
          display: inline-flex;
          align-items: center;
          gap: 3px;
          font-size: 11px;
          font-weight: 600;
          color: #ff6a3d;
          cursor: pointer;
          margin-top: 3px;
          transition: opacity 80ms;
        }
        .inbox-action-link:hover { opacity: 0.7; }
        .inbox-action-blocker {
          color: #dc2626;
          font-weight: 700;
        }
        .inbox-action-escalate {
          color: #dc2626;
        }

        /* ── Mobile: stack CTA below text ── */
        @media (max-width: 640px) {
          .inbox-row {
            grid-template-columns: 14px 1fr;
            padding: 12px 14px;
          }
          .inbox-title {
            font-size: 13px;
          }
          .inbox-subtitle {
            font-size: 11px;
          }
          .inbox-cta {
            grid-column: 2;
            justify-self: start;
            margin-top: 6px;
            font-size: 11px;
            color: #ff6a3d;
          }
        }
      `}</style>

      {/* Top Priority */}
      <TopPriorityCard item={topItem} onActionComplete={handleActionComplete} />

      {/* Inbox List */}
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

      {/* Limit nudge — shown when plan caps visible items */}
      {isLimited && (
        <UpgradeNudge
          featureName="inbox items"
          planLabel="Growth"
          remaining={hiddenCount}
          inline
        />
      )}
    </div>
  );
}

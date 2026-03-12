import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, AlertTriangle, X } from "lucide-react";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unread, setUnread] = useState(0);
  const ref = useRef(null);
  const navigate = useNavigate();

  const fetchCount = useCallback(async () => {
    try {
      const token = localStorage.getItem("capymatch_token");
      if (!token) return;
      const res = await axios.get(`${API}/notifications/count`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUnread(res.data.unread || 0);
    } catch {}
  }, []);

  const fetchAll = useCallback(async () => {
    try {
      const token = localStorage.getItem("capymatch_token");
      if (!token) return;
      const res = await axios.get(`${API}/notifications`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotifications(res.data.notifications || []);
    } catch {}
  }, []);

  const markRead = useCallback(async () => {
    try {
      const token = localStorage.getItem("capymatch_token");
      await axios.post(`${API}/notifications/read`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUnread(0);
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch {}
  }, []);

  useEffect(() => { fetchCount(); const iv = setInterval(fetchCount, 60000); return () => clearInterval(iv); }, [fetchCount]);

  useEffect(() => {
    if (open) { fetchAll(); markRead(); }
  }, [open, fetchAll, markRead]);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleClick = (notif) => {
    setOpen(false);
    if (notif.action_url) navigate(notif.action_url);
  };

  const timeAgo = (iso) => {
    if (!iso) return "";
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="p-2 rounded-lg transition-colors"
        style={{ color: "var(--cm-text-3)" }}
        data-testid="notification-btn"
      >
        <Bell className="w-[18px] h-[18px]" />
        {unread > 0 && (
          <span
            className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 flex items-center justify-center rounded-full text-[10px] font-bold text-white px-1"
            style={{ backgroundColor: "#ef4444" }}
            data-testid="notification-badge"
          >
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          className="fixed sm:absolute right-2 sm:right-0 left-2 sm:left-auto top-14 sm:top-full sm:mt-2 sm:w-80 rounded-xl border overflow-hidden z-50"
          style={{ backgroundColor: "var(--cm-surface)", borderColor: "var(--cm-border)", boxShadow: "0 8px 32px rgba(0,0,0,0.12)" }}
          data-testid="notification-dropdown"
        >
          <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: "var(--cm-border)" }}>
            <span className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--cm-text-2)" }}>Notifications</span>
            <button onClick={() => setOpen(false)} className="p-1" style={{ color: "var(--cm-text-3)" }}>
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="max-h-72 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <Bell className="w-6 h-6 mx-auto mb-2" style={{ color: "var(--cm-text-4)" }} />
                <p className="text-xs" style={{ color: "var(--cm-text-3)" }}>No notifications yet</p>
              </div>
            ) : (
              notifications.map((n, i) => (
                <div
                  key={i}
                  onClick={() => handleClick(n)}
                  className="flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors"
                  style={{
                    borderBottom: i < notifications.length - 1 ? "1px solid var(--cm-border)" : "none",
                    backgroundColor: n.read ? "transparent" : "rgba(13,148,136,0.04)",
                  }}
                  data-testid={`notification-item-${i}`}
                >
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                    style={{ backgroundColor: n.type === "measurables_nudge" ? "rgba(245,158,11,0.1)" : "rgba(13,148,136,0.1)" }}
                  >
                    <AlertTriangle className="w-3.5 h-3.5" style={{ color: n.type === "measurables_nudge" ? "#f59e0b" : "#0d9488" }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold" style={{ color: "var(--cm-text)" }}>{n.title}</div>
                    <div className="text-[11px] mt-0.5 leading-relaxed" style={{ color: "var(--cm-text-3)" }}>{n.message}</div>
                    <div className="text-[10px] mt-1" style={{ color: "var(--cm-text-4)" }}>{timeAgo(n.created_at)}</div>
                  </div>
                  {!n.read && (
                    <div className="w-2 h-2 rounded-full mt-2 flex-shrink-0" style={{ backgroundColor: "#0d9488" }} />
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

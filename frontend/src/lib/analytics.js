/**
 * Loop Analytics — lightweight event tracking for the
 * Recap → Hero → Action → Reinforcement loop.
 *
 * Events are batched and sent every 5 seconds or on page unload.
 * Non-blocking — failures are silently ignored.
 */

const API = process.env.REACT_APP_BACKEND_URL;
const FLUSH_INTERVAL = 5000;

let queue = [];
let flushTimer = null;

function getToken() {
  return localStorage.getItem("capymatch_token") || localStorage.getItem("token");
}

async function flush() {
  if (queue.length === 0) return;
  const batch = queue.splice(0);
  const token = getToken();
  if (!token) return;
  try {
    await fetch(`${API}/api/analytics/events`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ events: batch }),
      keepalive: true,
    });
  } catch {
    // silent — analytics should never block the user
  }
}

function ensureTimer() {
  if (!flushTimer) {
    flushTimer = setInterval(flush, FLUSH_INTERVAL);
    if (typeof window !== "undefined") {
      window.addEventListener("beforeunload", flush);
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "hidden") flush();
      });
    }
  }
}

/**
 * Track a loop analytics event.
 * @param {string} event — event name (e.g. "hero_viewed")
 * @param {object} [properties] — additional context
 */
export function trackEvent(event, properties = {}) {
  queue.push({
    event,
    properties,
    timestamp: new Date().toISOString(),
  });
  ensureTimer();
}

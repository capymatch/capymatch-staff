/**
 * signal-format.js — Shared formatting for hero/priority card signals.
 *
 * Splits raw reason text into clean, deduplicated, short bullet signals.
 * Max 3 bullets. Each bullet = one clear idea. Colored by sentiment.
 */

const RED    = "#ff6b7f";
const AMBER  = "#ffb347";
const GREEN  = "#5ce0b8";

const NEG_KEYS  = ["overdue", "no response", "no activity", "stale", "expired", "urgent", "past due", "waiting", "inactive"];
const POS_KEYS  = ["responded", "replied", "on track", "active", "positive", "engaged", "coach replied"];
// everything else → amber

/** Detect dot color from phrase */
function dotColor(phrase) {
  const lc = phrase.toLowerCase();
  if (POS_KEYS.some(k => lc.includes(k))) return GREEN;
  if (NEG_KEYS.some(k => lc.includes(k))) return RED;
  return AMBER;
}

/** Capitalize first letter */
function cap(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * Normalize a phrase to a dedup key — lowercase, strip filler words,
 * collapse whitespace. Two phrases with the same key are duplicates.
 */
function dedupKey(phrase) {
  return phrase
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, "")
    .replace(/\b(the|a|an|is|are|was|were|has|have|had|been|be|to|for|of|in|on|with|and|or|but|this|that|your|their|its|needs?|needed|action)\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Check if two keys are too similar (one contains the other, or >60% overlap) */
function isSimilar(a, b) {
  if (!a || !b) return false;
  if (a.includes(b) || b.includes(a)) return true;
  const setA = new Set(a.split(" "));
  const setB = new Set(b.split(" "));
  const overlap = [...setA].filter(w => setB.has(w)).length;
  const minLen = Math.min(setA.size, setB.size);
  return minLen > 0 && overlap / minLen >= 0.6;
}

/**
 * Parse raw reason string into clean signal array.
 * @param {string} raw — e.g. "Overdue follow-up needs action; Coach responded — momentum is building — action overdue — follow up needed"
 * @returns {{ text: string, color: string }[]} — max 3 items
 */
export function parseSignals(raw) {
  if (!raw || !raw.trim()) return [];

  // 1. Split on em-dash and semicolon only (not en-dash, which appears in ranges like 24–48)
  const fragments = raw
    .split(/\s*[—;]\s*/)
    .map(s => s.trim())
    .filter(Boolean);

  // 2. Capitalize and deduplicate
  const seen = [];
  const unique = [];
  for (const frag of fragments) {
    const clean = cap(frag);
    const key = dedupKey(clean);
    if (!key) continue;
    if (seen.some(s => isSimilar(s, key))) continue;
    seen.push(key);
    unique.push({ text: clean, color: dotColor(clean) });
  }

  // 3. Cap at 3
  return unique.slice(0, 3);
}

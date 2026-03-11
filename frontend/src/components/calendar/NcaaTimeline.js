import { useState, useMemo } from "react";
import { Calendar, AlertCircle, FileText, GraduationCap, Eye, Tent } from "lucide-react";

const DIVISIONS = ["D1", "D2", "D3", "NAIA"];

const COLORS = {
  contact:    { bar: "#6ECEC0", text: "#1B6B5E", tint: "#EAF6F3", tintBorder: "#C2E4DD" },
  dead:       { bar: "#E09494", text: "#7A3836", tint: "#F8EDED", tintBorder: "#E4C4C3" },
  evaluation: { bar: "#96A4D0", text: "#3E4D7A", tint: "#EDEFFA", tintBorder: "#C4CAE0" },
  quiet:      { bar: "#E4C06A", text: "#7A6420", tint: "#F8F2E0", tintBorder: "#E4D8A8" },
};

const PERIOD_TYPES = {
  contact:    { label: "Contact",    desc: "Coaches can call, text, and email you directly" },
  dead:       { label: "Dead",       desc: "No in-person or off-campus contact allowed" },
  evaluation: { label: "Evaluation", desc: "Coaches can watch you compete but can't contact you off-campus" },
  quiet:      { label: "Quiet",      desc: "Limited contact — coaches can only talk to you on campus" },
};

const MONTHS = ["Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug"];

const TIMELINE_DATA = {
  D1: {
    season: "2025-26",
    periods: [
      { type: "contact", startMonth: 0, startFrac: 0, endMonth: 2, endFrac: 0.4, label: "Contact" },
      { type: "dead", startMonth: 2, startFrac: 0.4, endMonth: 2, endFrac: 0.65, label: "Dead" },
      { type: "contact", startMonth: 2, startFrac: 0.65, endMonth: 5, endFrac: 0, label: "Contact" },
      { type: "dead", startMonth: 5, startFrac: 0, endMonth: 5, endFrac: 0.25, label: "Dead" },
      { type: "contact", startMonth: 5, startFrac: 0.25, endMonth: 7, endFrac: 0.5, label: "Contact" },
      { type: "quiet", startMonth: 7, startFrac: 0.5, endMonth: 8, endFrac: 1, label: "Quiet" },
      { type: "evaluation", startMonth: 9, startFrac: 0, endMonth: 10, endFrac: 0, label: "Evaluation" },
      { type: "contact", startMonth: 10, startFrac: 0, endMonth: 11, endFrac: 1, label: "Contact" },
    ],
    keyDates: [
      { name: "NLI Early Signing Period", range: "Nov 13 - Nov 20, 2025", icon: "file", status: "passed" },
      { name: "Transfer Portal Window", range: "Apr 15 - Apr 30, 2026", icon: "grad", status: "upcoming" },
      { name: "Spring Evaluation Period", range: "Apr 16 - May 31, 2026", icon: "eye", status: "upcoming" },
      { name: "Summer Camp Season", range: "Jun 1 - Aug 1, 2026", icon: "camp", status: "upcoming" },
      { name: "NLI Regular Signing Period", range: "Apr 15 - Aug 1, 2026", icon: "file", status: "upcoming" },
      { name: "Fall Contact Period Begins", range: "Sep 1, 2026", icon: "calendar", status: "upcoming" },
    ],
  },
  D2: {
    season: "2025-26",
    periods: [
      { type: "contact", startMonth: 0, startFrac: 0, endMonth: 2, endFrac: 0.4, label: "Contact" },
      { type: "dead", startMonth: 2, startFrac: 0.4, endMonth: 2, endFrac: 0.65, label: "Dead" },
      { type: "contact", startMonth: 2, startFrac: 0.65, endMonth: 7, endFrac: 0.5, label: "Contact" },
      { type: "quiet", startMonth: 7, startFrac: 0.5, endMonth: 8, endFrac: 1, label: "Quiet" },
      { type: "evaluation", startMonth: 9, startFrac: 0, endMonth: 10, endFrac: 0, label: "Evaluation" },
      { type: "contact", startMonth: 10, startFrac: 0, endMonth: 11, endFrac: 1, label: "Contact" },
    ],
    keyDates: [
      { name: "NLI Early Signing Period", range: "Nov 13 - Nov 20, 2025", icon: "file", status: "passed" },
      { name: "Spring Evaluation Period", range: "Apr 16 - May 31, 2026", icon: "eye", status: "upcoming" },
      { name: "Summer Camp Season", range: "Jun 1 - Aug 1, 2026", icon: "camp", status: "upcoming" },
      { name: "NLI Regular Signing Period", range: "Apr 15 - Aug 1, 2026", icon: "file", status: "upcoming" },
    ],
  },
  D3: {
    season: "2025-26",
    periods: [
      { type: "contact", startMonth: 0, startFrac: 0, endMonth: 11, endFrac: 1, label: "Contact" },
    ],
    keyDates: [
      { name: "No NLI for D3", range: "D3 schools do not offer athletic scholarships or NLI", icon: "file", status: "info" },
      { name: "Summer Camp Season", range: "Jun 1 - Aug 1, 2026", icon: "camp", status: "upcoming" },
      { name: "Coaches can contact year-round", range: "No restricted periods for D3", icon: "calendar", status: "info" },
    ],
  },
  NAIA: {
    season: "2025-26",
    periods: [
      { type: "contact", startMonth: 0, startFrac: 0, endMonth: 11, endFrac: 1, label: "Contact" },
    ],
    keyDates: [
      { name: "NAIA Letter of Intent", range: "Can be signed anytime after receiving an offer", icon: "file", status: "info" },
      { name: "Coaches can contact year-round", range: "No restricted contact periods for NAIA", icon: "calendar", status: "info" },
      { name: "Summer Camp Season", range: "Jun 1 - Aug 1, 2026", icon: "camp", status: "upcoming" },
    ],
  },
};

function getCurrentMonthIndex() {
  const m = new Date().getMonth();
  const map = { 0: 4, 1: 5, 2: 6, 3: 7, 4: 8, 5: 9, 6: 10, 7: 11, 8: 0, 9: 1, 10: 2, 11: 3 };
  return map[m];
}

function getCurrentPeriod(division) {
  const data = TIMELINE_DATA[division];
  const nowIdx = getCurrentMonthIndex();
  const nowFrac = new Date().getDate() / 30;
  const nowPos = nowIdx + nowFrac;
  for (const p of data.periods) {
    const start = p.startMonth + p.startFrac;
    const end = p.endMonth + p.endFrac;
    if (nowPos >= start && nowPos <= end) return p;
  }
  return data.periods[0];
}

function daysUntilDate(dateStr) {
  const parts = dateStr.split(" - ")[0].replace(",", "").split(" ");
  const monthMap = { Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5, Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11 };
  const m = monthMap[parts[0]];
  const d = parseInt(parts[1]);
  const y = parseInt(parts[2] || "2026");
  const target = new Date(y, m, d);
  return Math.ceil((target - new Date()) / (1000 * 60 * 60 * 24));
}

const DATE_ICONS = {
  file: FileText, grad: GraduationCap, eye: Eye,
  camp: Tent, calendar: Calendar,
};

function StatusTag({ status, range }) {
  if (status === "passed")
    return <span className="text-[10px] px-2 py-0.5 rounded-md font-medium" style={{ backgroundColor: "#f0f1f3", color: "#8e8e93" }}>Passed</span>;
  if (status === "info")
    return <span className="text-[10px] px-2 py-0.5 rounded-md font-medium" style={{ backgroundColor: COLORS.evaluation.tint, color: COLORS.evaluation.text }}>Info</span>;
  const days = daysUntilDate(range);
  if (days <= 0)
    return <span className="text-[10px] px-2 py-0.5 rounded-md font-medium" style={{ backgroundColor: COLORS.contact.tint, color: COLORS.contact.text }}>Active Now</span>;
  return <span className="text-[10px] px-2 py-0.5 rounded-md font-medium" style={{ backgroundColor: COLORS.quiet.tint, color: COLORS.quiet.text }}>{days}d away</span>;
}

function TimelineBar({ periods, division }) {
  const currentIdx = getCurrentMonthIndex();
  const nowFrac = new Date().getDate() / 30;
  const nowPercent = ((currentIdx + nowFrac) / 12) * 100;

  const segments = useMemo(() => {
    const segs = [];
    let covered = 0;
    const sorted = [...periods].sort((a, b) => (a.startMonth + a.startFrac) - (b.startMonth + b.startFrac));
    for (const p of sorted) {
      const start = p.startMonth + p.startFrac;
      const end = p.endMonth + p.endFrac;
      if (start > covered) segs.push({ type: "gap", width: ((start - covered) / 12) * 100 });
      segs.push({ type: p.type, width: ((end - start) / 12) * 100, label: p.label });
      covered = end;
    }
    if (covered < 12) segs.push({ type: "gap", width: ((12 - covered) / 12) * 100 });
    return segs;
  }, [periods]);

  return (
    <div className="rounded-xl border p-4 sm:p-5" style={{ backgroundColor: "var(--cm-surface)", borderColor: "var(--cm-border)" }} data-testid="ncaa-timeline-bar">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold flex items-center gap-2" style={{ color: "var(--cm-text)" }}>
          <Calendar className="w-4 h-4" style={{ color: "var(--cm-text-3)" }} />
          NCAA {division} Recruiting Calendar
        </h3>
        <span className="text-xs" style={{ color: "var(--cm-text-3)" }}>{TIMELINE_DATA[division].season} Season</span>
      </div>

      <div className="flex mb-1.5 overflow-x-auto">
        {MONTHS.map((m, i) => (
          <div key={m} className="flex-1 text-center text-[9px] sm:text-[10px] font-semibold uppercase tracking-wider min-w-[2rem]"
            style={{ color: i === currentIdx ? "var(--cm-text-2)" : "var(--cm-text-3)" }}>
            {m}
          </div>
        ))}
      </div>

      <div className="relative mb-3">
        <div className="flex gap-[2px] h-9 sm:h-10 rounded-lg overflow-hidden">
          {segments.map((s, i) => (
            <div key={i} className="rounded-[4px] flex items-center justify-center overflow-hidden"
              style={{
                width: `${s.width}%`,
                backgroundColor: s.type === "gap" ? "#f0f1f3" : COLORS[s.type]?.bar,
              }}>
              {s.type !== "gap" && s.width > 6 && (
                <span className="text-[8px] sm:text-[9px] font-semibold uppercase tracking-wide text-white/90">{s.label}</span>
              )}
            </div>
          ))}
        </div>
        <div className="absolute top-[-4px] bottom-[-4px] w-[2px] z-10" style={{ left: `${nowPercent}%`, backgroundColor: "var(--cm-text)" }}>
          <span className="absolute -top-4 left-1/2 -translate-x-1/2 text-[7px] font-bold tracking-wider px-1.5 py-0.5 rounded-md"
            style={{ backgroundColor: "var(--cm-text)", color: "var(--cm-surface)" }}>
            NOW
          </span>
        </div>
      </div>

      <div className="flex gap-4 sm:gap-6 flex-wrap pt-3 border-t" style={{ borderColor: "var(--cm-border)" }}>
        {Object.entries(PERIOD_TYPES).map(([key, val]) => (
          <div key={key} className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-[3px]" style={{ backgroundColor: COLORS[key].bar }} />
            <span className="text-[10px] sm:text-[11px] font-medium" style={{ color: "var(--cm-text-2)" }}>{val.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function NcaaTimeline() {
  const [division, setDivision] = useState("D1");
  const data = TIMELINE_DATA[division];
  const currentPeriod = getCurrentPeriod(division);
  const periodInfo = PERIOD_TYPES[currentPeriod.type];
  const periodColor = COLORS[currentPeriod.type];

  const nowIdx = getCurrentMonthIndex();
  const endPos = currentPeriod.endMonth + currentPeriod.endFrac;
  const daysRemaining = Math.max(0, Math.round((endPos - nowIdx) * 30));

  return (
    <div className="space-y-5" data-testid="ncaa-timeline">
      {/* Current Period Banner */}
      <div className="rounded-xl border p-4 sm:p-5" style={{
        backgroundColor: "var(--cm-surface)",
        borderColor: "var(--cm-border)",
        borderLeft: `4px solid ${periodColor.bar}`,
      }} data-testid="current-period-banner">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-5">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="w-2.5 h-2.5 rounded-full animate-pulse" style={{ backgroundColor: periodColor.bar }} />
            <div>
              <p className="text-[10px] uppercase tracking-wider font-bold" style={{ color: periodColor.text }}>
                Current Period — {division}
              </p>
              <p className="text-base sm:text-lg font-bold mt-0.5" style={{ color: "var(--cm-text)" }}>
                {periodInfo.label} Period
              </p>
              <p className="text-xs mt-0.5" style={{ color: "var(--cm-text-3)" }}>{periodInfo.desc}</p>
            </div>
          </div>
          <div className="px-3 py-1.5 rounded-lg text-xs font-semibold border self-start sm:self-auto flex-shrink-0" style={{
            backgroundColor: periodColor.tint,
            color: periodColor.text,
            borderColor: periodColor.tintBorder,
          }} data-testid="days-remaining-badge">
            {daysRemaining} days remaining
          </div>
        </div>
      </div>

      {/* Division Selector */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[11px] uppercase tracking-wider font-semibold" style={{ color: "var(--cm-text-3)" }}>Division:</span>
        {DIVISIONS.map(d => {
          const active = d === division;
          return (
            <button key={d} onClick={() => setDivision(d)}
              className="px-3 py-1.5 rounded-lg text-xs font-bold border transition-all"
              style={{
                backgroundColor: active ? COLORS.contact.tint : "transparent",
                borderColor: active ? COLORS.contact.tintBorder : "var(--cm-border)",
                color: active ? COLORS.contact.text : "var(--cm-text-3)",
              }}
              data-testid={`division-chip-${d}`}>
              {d}
            </button>
          );
        })}
      </div>

      {/* Timeline Visual */}
      <TimelineBar periods={data.periods} division={division} />

      {/* Key NCAA Dates */}
      <div className="rounded-xl border p-4 sm:p-5" style={{ backgroundColor: "var(--cm-surface)", borderColor: "var(--cm-border)" }} data-testid="key-ncaa-dates">
        <h3 className="text-sm font-semibold mb-4 flex items-center gap-2" style={{ color: "var(--cm-text)" }}>
          <AlertCircle className="w-4 h-4" style={{ color: "var(--cm-text-3)" }} />
          Key NCAA Dates & Deadlines
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {data.keyDates.map((date, i) => {
            const Icon = DATE_ICONS[date.icon] || Calendar;
            return (
              <div key={i} className="flex items-start gap-3 p-3 rounded-lg border" style={{ borderColor: "var(--cm-border)" }} data-testid={`key-date-${i}`}>
                <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: "var(--cm-surface-2)" }}>
                  <Icon className="w-4 h-4" style={{ color: "var(--cm-text-2)" }} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold" style={{ color: "var(--cm-text)" }}>{date.name}</p>
                  <p className="text-[11px] mt-0.5" style={{ color: "var(--cm-text-3)" }}>{date.range}</p>
                  <div className="mt-1.5">
                    <StatusTag status={date.status} range={date.range} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

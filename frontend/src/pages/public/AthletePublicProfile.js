import { useState, useEffect } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import {
  Mail, Phone, Play, User, Loader2, MapPin, Share2, Copy, Check,
  AlertTriangle, ArrowUpRight, Zap
} from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const EVENT_STYLES = {
  Camp: { bg: "bg-teal-50", text: "text-teal-700" },
  Showcase: { bg: "bg-blue-50", text: "text-blue-700" },
  Tournament: { bg: "bg-amber-50", text: "text-amber-700" },
  Visit: { bg: "bg-emerald-50", text: "text-emerald-700" },
  Tryout: { bg: "bg-slate-50", text: "text-slate-700" },
  Meeting: { bg: "bg-cyan-50", text: "text-cyan-700" },
  Deadline: { bg: "bg-red-50", text: "text-red-700" },
  Other: { bg: "bg-gray-50", text: "text-gray-700" },
};

function getYouTubeId(url) {
  if (!url) return null;
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtube.com") && u.pathname === "/watch") return u.searchParams.get("v");
    if (u.hostname.includes("youtube.com") && u.pathname.startsWith("/embed/")) return u.pathname.split("/embed/")[1]?.split("?")[0];
    if (u.hostname === "youtu.be") return u.pathname.slice(1).split("?")[0];
    if (u.hostname.includes("youtube.com") && u.pathname.startsWith("/shorts/")) return u.pathname.split("/shorts/")[1]?.split("?")[0];
  } catch { /* ignore */ }
  return null;
}

function fmtDate(d) {
  if (!d) return {};
  const dt = new Date(d + "T00:00:00");
  return { month: dt.toLocaleString("en-US", { month: "short" }).toUpperCase(), day: dt.getDate() };
}

/* ── Scan Fact: tight key-value chip ── */
function ScanFact({ label, value }) {
  if (!value) return null;
  return (
    <div className="flex flex-col" data-testid={`scan-${label.toLowerCase().replace(/\s+/g, "-")}`}>
      <span className="text-[9px] font-bold uppercase tracking-[1.5px] text-gray-400">{label}</span>
      <span className="text-[15px] font-extrabold text-slate-800 leading-tight mt-0.5">{value}</span>
    </div>
  );
}

/* ── Measurable chip ── */
function MeasurableChip({ label, value }) {
  if (!value) return null;
  return (
    <div className="text-center">
      <div className="text-lg font-extrabold text-slate-800">{value}</div>
      <div className="text-[8px] font-bold uppercase tracking-[1.5px] text-gray-400 mt-0.5">{label}</div>
    </div>
  );
}

/* ── Event card ── */
function EventCard({ event, isLast }) {
  const { month, day } = fmtDate(event.start_date);
  const es = EVENT_STYLES[event.event_type] || EVENT_STYLES.Other;
  return (
    <div>
      <div className="flex items-center gap-4 px-2 py-4">
        <div className="w-12 text-center shrink-0">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-emerald-600">{month}</div>
          <div className="text-3xl font-extrabold text-slate-800 leading-none">{day}</div>
        </div>
        <div className="w-px h-10 bg-gray-100 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm text-slate-800">{event.title}</p>
          <p className="text-xs text-gray-500 mt-1 flex items-center gap-1.5">
            {event.location && <><MapPin className="w-3 h-3 text-gray-400" />{event.location}</>}
          </p>
        </div>
        <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md ${es.bg} ${es.text}`}>{event.event_type}</span>
      </div>
      {!isLast && <div className="h-px bg-gray-100 mx-2" />}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════ */

export default function AthletePublicProfile() {
  const { slug, shortId } = useParams();
  const [searchParams] = useSearchParams();
  const isStaffPreview = searchParams.get("staff_preview") === "true";
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [unpublished, setUnpublished] = useState(false);
  const [videoPlaying, setVideoPlaying] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function fetchProfile() {
      setLoading(true);
      setError(null);
      setUnpublished(false);

      if (slug) {
        try {
          const r = await fetch(`${BACKEND_URL}/api/public/profile/${slug}`);
          if (r.ok) { setData(await r.json()); setLoading(false); return; }
          if (r.status === 404 && isStaffPreview) { setUnpublished(true); }
        } catch { /* fall through */ }
      }

      if (shortId) {
        try {
          const r = await fetch(`${BACKEND_URL}/api/public/athlete/tenant-${shortId}`);
          if (r.ok) { setData(await r.json()); setLoading(false); return; }
        } catch { /* fall through */ }
      }

      if (!unpublished) setError("Profile not found");
      setLoading(false);
    }
    fetchProfile();
  }, [slug, shortId, isStaffPreview]);

  /* Loading */
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#fafafa]" data-testid="public-profile-loading">
      <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
    </div>
  );

  /* Error */
  if (error || (!data && !unpublished)) return (
    <div className="min-h-screen flex items-center justify-center bg-[#fafafa]" data-testid="public-profile-error">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-slate-800 mb-2">Athlete Not Found</h1>
        <p className="text-gray-500 text-sm">This profile link may be invalid or the athlete hasn't published their profile yet.</p>
      </div>
    </div>
  );

  /* Unpublished staff preview */
  if (unpublished && !data) return (
    <div className="min-h-screen flex items-center justify-center bg-[#fafafa]" data-testid="public-profile-unpublished">
      <div className="text-center max-w-md px-6">
        <div className="w-16 h-16 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center mx-auto mb-4">
          <AlertTriangle className="w-7 h-7 text-amber-500" />
        </div>
        <h1 className="text-2xl font-bold text-slate-800 mb-2">Profile Not Published</h1>
        <p className="text-gray-500 text-sm">This athlete's profile is not yet visible to external viewers.</p>
      </div>
    </div>
  );

  const { profile: p, coach_summary, recruiting_signals = [], upcoming_events = [], past_events = [] } = data;
  const hasPhoto = p.photo_url && (p.photo_url.startsWith("data:") || p.photo_url.startsWith("http"));
  const videoId = getYouTubeId(p.video_link);
  const hasStats = p.standing_reach || p.approach_touch || p.block_touch || p.wingspan;
  const hasCoach = p.parent_name || p.parent_email;
  const hasCTA = p.contact_email || p.contact_phone;
  const location = [p.city, p.state].filter(Boolean).join(", ");
  const subline = [p.club_team, p.high_school, location].filter(Boolean);

  return (
    <div data-testid="public-profile" className="min-h-screen bg-[#fafafa]" style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700;800&family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700&display=swap" rel="stylesheet" />

      {/* Share Button */}
      <button onClick={() => { navigator.clipboard.writeText(window.location.href); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
        className="fixed top-4 right-4 z-40 w-10 h-10 rounded-full bg-white/90 backdrop-blur border border-gray-200/80 flex items-center justify-center cursor-pointer hover:bg-white transition-all shadow-sm"
        data-testid="share-button">
        {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Share2 className="w-4 h-4 text-gray-500" />}
      </button>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* COACH SCAN MODE — 10-second hero                              */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <section className="bg-white border-b border-gray-100" data-testid="coach-scan-section">
        <div className="max-w-[900px] mx-auto px-5 sm:px-8 py-8 sm:py-10">
          <div className="flex flex-col sm:flex-row gap-6 sm:gap-10">

            {/* Photo */}
            <div className="shrink-0 self-center sm:self-start">
              {hasPhoto ? (
                <img src={p.photo_url} alt={p.athlete_name}
                  className="w-44 h-56 sm:w-52 sm:h-[270px] rounded-[18px] object-cover object-[center_15%] shadow-md border border-gray-100/80"
                  data-testid="athlete-photo" />
              ) : (
                <div className="w-44 h-56 sm:w-52 sm:h-[270px] rounded-[18px] bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center shadow-md"
                  data-testid="athlete-photo-placeholder">
                  <User className="w-16 h-16 text-white/40" />
                </div>
              )}
            </div>

            {/* Right: Info Stack */}
            <div className="flex-1 min-w-0 flex flex-col justify-between text-center sm:text-left">

              {/* Row 1: Name + Class + Position */}
              <div>
                <h1 className="text-[38px] sm:text-[52px] font-extrabold leading-[0.95] uppercase text-slate-900 tracking-tight"
                  style={{ fontFamily: "'Barlow Condensed', system-ui, sans-serif" }}
                  data-testid="athlete-name">
                  {p.athlete_name || "Athlete"}
                </h1>
                <div className="mt-2 flex flex-wrap items-center gap-2 justify-center sm:justify-start">
                  {p.graduation_year && (
                    <span className="text-[11px] font-bold tracking-[2px] uppercase text-emerald-700 bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-md"
                      data-testid="class-year-badge">
                      Class of {p.graduation_year}
                    </span>
                  )}
                  {p.position && (
                    <span className="text-[11px] font-bold tracking-[1px] uppercase text-slate-600">
                      {p.position}
                    </span>
                  )}
                  {p.jersey_number && (
                    <span className="text-[11px] font-bold text-gray-400">#{p.jersey_number}</span>
                  )}
                </div>
                {subline.length > 0 && (
                  <p className="mt-2 text-[13px] text-gray-500 font-medium">
                    {subline.join(" \u00B7 ")}
                  </p>
                )}
              </div>

              {/* Row 2: Key Facts Grid */}
              <div className="mt-5 flex flex-wrap gap-x-8 gap-y-3 justify-center sm:justify-start" data-testid="key-facts">
                <ScanFact label="Height" value={p.height} />
                <ScanFact label="Weight" value={p.weight ? `${p.weight} lbs` : null} />
                <ScanFact label="GPA" value={p.gpa} />
                <ScanFact label="Dominant" value={p.handed} />
              </div>

              {/* Row 3: Measurables (compact) */}
              {hasStats && (
                <div className="mt-4 flex items-center gap-0 justify-center sm:justify-start" data-testid="scan-measurables">
                  <div className="flex items-center gap-5 px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-100">
                    <MeasurableChip label="Stnd Reach" value={p.standing_reach} />
                    <MeasurableChip label="App Touch" value={p.approach_touch} />
                    <MeasurableChip label="Blk Touch" value={p.block_touch} />
                    <MeasurableChip label="Wingspan" value={p.wingspan} />
                  </div>
                </div>
              )}

              {/* Row 4: CTAs */}
              <div className="mt-5 flex flex-wrap gap-2.5 justify-center sm:justify-start" data-testid="hero-ctas">
                {(p.video_link || p.hudl_profile_url) && (
                  <a href={p.video_link || p.hudl_profile_url} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-[13px] font-bold text-white bg-slate-900 hover:bg-slate-800 shadow-sm transition-all"
                    data-testid="watch-highlights-cta">
                    <Play className="w-4 h-4 fill-white" /> Watch Highlights
                  </a>
                )}
                {p.contact_email && (
                  <a href={`mailto:${p.contact_email}`}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-[13px] font-bold text-slate-800 bg-white border-2 border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-all"
                    data-testid="contact-email-cta">
                    <Mail className="w-4 h-4" /> Contact
                  </a>
                )}
                {p.contact_phone && !p.contact_email && (
                  <a href={`tel:${p.contact_phone}`}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-[13px] font-bold text-slate-800 bg-white border-2 border-slate-200 hover:border-slate-300 transition-all"
                    data-testid="contact-phone-cta">
                    <Phone className="w-4 h-4" /> Call
                  </a>
                )}
                {p.hudl_profile_url && p.video_link && (
                  <a href={p.hudl_profile_url} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full text-[12px] font-semibold text-orange-600 bg-orange-50 border border-orange-100 hover:bg-orange-100 transition-all"
                    data-testid="hudl-cta">
                    Hudl Profile <ArrowUpRight className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>

            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* DYNAMIC RECRUITING SNAPSHOT                                    */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      {recruiting_signals.length > 0 && (
        <section className="bg-white border-b border-gray-100" data-testid="recruiting-snapshot">
          <div className="max-w-[900px] mx-auto px-5 sm:px-8 py-4">
            <div className="flex items-center gap-2 flex-wrap justify-center sm:justify-start">
              <Zap className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              {recruiting_signals.map((signal, i) => (
                <span key={i}
                  className="text-[11px] font-semibold text-gray-500 bg-gray-50 border border-gray-100 px-3 py-1.5 rounded-full"
                  data-testid={`signal-${i}`}>
                  {signal}
                </span>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* CONTENT SECTIONS                                               */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <div className="max-w-[900px] mx-auto px-5 sm:px-8 py-8 space-y-5">

        {/* Bio */}
        {p.bio && (
          <div className="rounded-2xl bg-white border border-gray-100 p-6 sm:p-8 shadow-sm" data-testid="bio-section">
            <h2 className="text-[10px] font-bold uppercase tracking-[2px] text-gray-400 mb-3">About</h2>
            <p className="text-[15px] leading-[1.7] text-gray-600 max-w-[640px]">{p.bio}</p>
          </div>
        )}

        {/* Club Coach */}
        {hasCoach && (
          <div className="rounded-2xl bg-white border border-gray-100 p-6 sm:p-8 shadow-sm" data-testid="club-coach-section">
            <h2 className="text-[10px] font-bold uppercase tracking-[2px] text-gray-400 mb-4">Club Coach</h2>
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <div className="w-12 h-12 rounded-[14px] bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center text-white text-lg font-bold shrink-0">
                {(p.parent_name || "C")[0].toUpperCase()}
              </div>
              <div className="flex-1 text-center sm:text-left">
                <p className="font-bold text-[15px] text-slate-800">{p.parent_name || "Coach"}</p>
                {p.club_team && <p className="text-xs text-gray-400 mt-0.5">{p.club_team}</p>}
              </div>
              <div className="flex gap-2">
                {p.parent_email && (
                  <a href={`mailto:${p.parent_email}`}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[11px] font-semibold text-slate-600 bg-gray-50 border border-gray-100 hover:bg-gray-100 transition-colors"
                    data-testid="coach-email-link">
                    <Mail className="w-3.5 h-3.5" /> Email
                  </a>
                )}
                {p.parent_phone && (
                  <a href={`tel:${p.parent_phone}`}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[11px] font-semibold text-slate-600 bg-gray-50 border border-gray-100 hover:bg-gray-100 transition-colors"
                    data-testid="coach-phone-link">
                    <Phone className="w-3.5 h-3.5" /> Call
                  </a>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Highlights Video */}
        {videoId && (
          <div className="rounded-2xl bg-white border border-gray-100 p-6 sm:p-8 shadow-sm" data-testid="video-embed-section">
            <h2 className="text-[10px] font-bold uppercase tracking-[2px] text-gray-400 mb-4">Highlights</h2>
            {videoPlaying ? (
              <div className="rounded-2xl overflow-hidden aspect-video bg-black shadow-lg">
                <iframe src={`https://www.youtube.com/embed/${videoId}?autoplay=1`} title="Highlights" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen className="w-full h-full" />
              </div>
            ) : (
              <div className="relative rounded-2xl overflow-hidden aspect-video bg-black cursor-pointer group shadow-lg" onClick={() => setVideoPlaying(true)} data-testid="video-thumbnail">
                <img src={`https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`} alt="Highlights" className="w-full h-full object-cover brightness-[0.6] group-hover:brightness-[0.4] transition-all duration-300"
                  onError={(e) => { e.target.src = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`; }} />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[68px] h-[68px] rounded-full bg-white/95 flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg">
                  <Play className="w-7 h-7 text-slate-900 fill-slate-900 ml-1" />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Events */}
        {(upcoming_events.length > 0 || past_events.length > 0) && (
          <div className="rounded-2xl bg-white border border-gray-100 p-6 sm:p-8 shadow-sm" data-testid="events-section">
            <h2 className="text-[10px] font-bold uppercase tracking-[2px] text-gray-400 mb-4">Where to See Me Play</h2>
            {upcoming_events.length > 0 ? (
              <div data-testid="upcoming-events">
                {upcoming_events.map((evt, i) => <EventCard key={evt.event_id} event={evt} isLast={i === upcoming_events.length - 1} />)}
              </div>
            ) : (
              <div className="text-center py-10 rounded-2xl bg-gray-50/70 border border-gray-100">
                <p className="text-sm text-gray-400">Schedule coming soon</p>
                {p.contact_email && (
                  <a href={`mailto:${p.contact_email}`}
                    className="inline-flex items-center gap-2 mt-3 px-4 py-2 rounded-full text-xs font-semibold text-emerald-600 bg-emerald-50 border border-emerald-100">
                    <Mail className="w-3.5 h-3.5" /> Get in touch
                  </a>
                )}
              </div>
            )}
            {past_events.length > 0 && (
              <div className="mt-8 opacity-50">
                <h2 className="text-[10px] font-bold uppercase tracking-[2px] text-gray-400 mb-3">Past Events</h2>
                <div data-testid="past-events">{past_events.map((evt, i) => <EventCard key={evt.event_id} event={evt} isLast={i === past_events.length - 1} />)}</div>
              </div>
            )}
          </div>
        )}

        {/* No events */}
        {upcoming_events.length === 0 && past_events.length === 0 && (
          <div className="rounded-2xl bg-white border border-gray-100 p-6 sm:p-8 shadow-sm">
            <h2 className="text-[10px] font-bold uppercase tracking-[2px] text-gray-400 mb-4">Where to See Me Play</h2>
            <div className="text-center py-10 rounded-2xl bg-gray-50/70 border border-gray-100">
              <p className="text-sm text-gray-400">Schedule coming soon</p>
              {p.contact_email && (
                <a href={`mailto:${p.contact_email}`}
                  className="inline-flex items-center gap-2 mt-3 px-4 py-2 rounded-full text-xs font-semibold text-emerald-600 bg-emerald-50 border border-emerald-100">
                  <Mail className="w-3.5 h-3.5" /> Get in touch
                </a>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="pb-24 sm:pb-8 pt-2 text-center">
        <span className="text-[11px] tracking-wider text-gray-300">Powered by <span className="font-semibold text-gray-400">CapyMatch</span></span>
      </footer>

      {/* Mobile CTA */}
      {hasCTA && (
        <div className="fixed bottom-0 left-0 right-0 z-50 sm:hidden bg-white/95 backdrop-blur-md border-t border-gray-200" style={{ paddingBottom: "calc(10px + env(safe-area-inset-bottom, 0px))" }} data-testid="mobile-cta-bar">
          <div className="flex gap-2 px-4 pt-3 max-w-[500px] mx-auto">
            {(p.video_link || p.hudl_profile_url) && (
              <a href={p.video_link || p.hudl_profile_url} target="_blank" rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-1.5 py-3 rounded-xl text-[13px] font-bold text-white bg-slate-900"
                data-testid="mobile-highlights-cta">
                <Play className="w-4 h-4 fill-white" /> Highlights
              </a>
            )}
            {p.contact_email && (
              <a href={`mailto:${p.contact_email}`}
                className="flex-1 flex items-center justify-center gap-1.5 py-3 rounded-xl text-[13px] font-bold text-slate-800 border-2 border-slate-200 bg-white"
                data-testid="mobile-email-cta">
                <Mail className="w-4 h-4" /> Contact
              </a>
            )}
            {p.contact_phone && !p.contact_email && (
              <a href={`tel:${p.contact_phone}`}
                className="flex-1 flex items-center justify-center gap-1.5 py-3 rounded-xl text-[13px] font-bold text-slate-800 border-2 border-slate-200 bg-white"
                data-testid="mobile-phone-cta">
                <Phone className="w-4 h-4" /> Call
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

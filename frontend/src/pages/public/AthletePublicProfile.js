import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Mail, Phone, Play, User, Loader2, MapPin, Share2, Copy, Check } from "lucide-react";

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

function StatCard({ value, label }) {
  if (!value) return null;
  return (
    <div className="rounded-2xl bg-gray-50 border border-gray-100 text-center py-6 px-4" data-testid={`stat-${label.toLowerCase().replace(/\s+/g, "-")}`}>
      <div className="text-3xl font-extrabold text-slate-800">{value}</div>
      <div className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mt-2">{label}</div>
    </div>
  );
}

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

function QuickFact({ icon, value, label }) {
  if (!value) return null;
  return (
    <div className="flex items-center gap-2.5">
      <div className="w-9 h-9 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center shrink-0">{icon}</div>
      <div>
        <div className="font-bold text-sm text-slate-800">{value}</div>
        <div className="text-[10px] uppercase tracking-wider text-gray-400">{label}</div>
      </div>
    </div>
  );
}

export default function AthletePublicProfile() {
  const { shortId } = useParams();
  const tenantId = shortId ? `tenant-${shortId}` : "";
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [videoPlaying, setVideoPlaying] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch(`${BACKEND_URL}/api/public/athlete/${tenantId}`)
      .then((r) => { if (!r.ok) throw new Error("not found"); return r.json(); })
      .then(setData)
      .catch(() => setError("Athlete not found"))
      .finally(() => setLoading(false));
  }, [tenantId]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50" data-testid="public-profile-loading">
      <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
    </div>
  );

  if (error || !data) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50" data-testid="public-profile-error">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-slate-800 mb-2">Athlete Not Found</h1>
        <p className="text-gray-500">This profile link may be invalid.</p>
      </div>
    </div>
  );

  const { profile, upcoming_events, past_events } = data;
  const hasPhoto = profile.photo_url && (profile.photo_url.startsWith("data:") || profile.photo_url.startsWith("http"));
  const videoId = getYouTubeId(profile.video_link);
  const hasStats = profile.standing_reach || profile.approach_touch || profile.block_touch || profile.wingspan;
  const hasCoach = profile.parent_name || profile.parent_email;

  return (
    <div data-testid="public-profile" className="min-h-screen bg-gray-50">
      <link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700;800&family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />

      {/* Share Button */}
      <button onClick={() => { navigator.clipboard.writeText(window.location.href); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
        className="fixed top-5 right-5 z-40 w-11 h-11 rounded-full bg-white/80 backdrop-blur border border-gray-200 flex items-center justify-center cursor-pointer hover:bg-white transition-all"
        data-testid="share-button">
        {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Share2 className="w-4 h-4 text-gray-600" />}
      </button>

      {/* Hero */}
      <section className="bg-white relative overflow-hidden">
        <div className="absolute -top-[20%] -right-[10%] w-[600px] h-[600px] pointer-events-none bg-gradient-to-br from-emerald-50/50 to-transparent rounded-full" />
        <div className="relative z-10 max-w-[860px] mx-auto px-6 sm:px-8 py-14 sm:py-16 flex flex-col sm:flex-row items-center sm:items-start gap-8 sm:gap-12">
          {/* Photo */}
          <div className="shrink-0" data-testid="hero-photo-wrapper">
            {hasPhoto ? (
              <img src={profile.photo_url} alt={profile.athlete_name}
                className="w-52 h-64 sm:w-[280px] sm:h-[340px] rounded-[20px] object-cover object-[center_15%] shadow-lg border border-gray-100" data-testid="athlete-photo" />
            ) : (
              <div className="w-52 h-64 sm:w-[280px] sm:h-[340px] rounded-[20px] bg-gradient-to-br from-emerald-500 to-indigo-500 flex items-center justify-center shadow-lg">
                <User className="w-20 h-20 text-white/70" />
              </div>
            )}
            <div className="mt-2 h-[3px] mx-6 rounded-full bg-gradient-to-r from-emerald-500 to-emerald-100" />
          </div>

          {/* Info */}
          <div className="flex-1 text-center sm:text-left pt-0 sm:pt-4">
            <div className="text-[12px] font-semibold tracking-[3px] uppercase text-emerald-600">
              {[profile.position, profile.graduation_year && `Class of ${profile.graduation_year}`].filter(Boolean).join("  ·  ")}
            </div>
            <h1 className="text-[42px] sm:text-[58px] font-extrabold leading-none uppercase text-slate-800 mt-3" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
              data-testid="athlete-name">
              {profile.athlete_name || "Athlete"}
            </h1>
            <div className="flex flex-wrap gap-1.5 mt-3 justify-center sm:justify-start text-[15px] font-medium text-gray-500">
              {[profile.club_team, profile.high_school, profile.city && profile.state && `${profile.city}, ${profile.state}`, profile.jersey_number && `#${profile.jersey_number}`]
                .filter(Boolean).map((item, i, arr) => (
                  <span key={i}>{item}{i < arr.length - 1 && <span className="mx-1.5 text-gray-300">&bull;</span>}</span>
                ))}
            </div>

            <div className="flex flex-wrap gap-5 mt-7 justify-center sm:justify-start">
              <QuickFact icon={<span className="text-emerald-600 text-sm font-bold">H</span>} value={profile.height} label="Height" />
              <QuickFact icon={<span className="text-emerald-600 text-sm font-bold">W</span>} value={profile.weight && `${profile.weight} lbs`} label="Weight" />
              <QuickFact icon={<span className="text-emerald-600 text-sm font-bold">G</span>} value={profile.gpa && `${profile.gpa} GPA`} label="Academics" />
              <QuickFact icon={<span className="text-emerald-600 text-sm font-bold">D</span>} value={profile.handed} label="Dominant" />
            </div>

            <div className="hidden sm:flex gap-2.5 mt-8">
              {profile.hudl_profile_url && (
                <a href={profile.hudl_profile_url} target="_blank" rel="noopener noreferrer" data-testid="hudl-link"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-[13px] font-semibold text-white bg-orange-500 hover:bg-orange-600 shadow-sm transition-all">
                  <Play className="w-4 h-4" /> Hudl
                </a>
              )}
              {profile.video_link && (
                <a href={profile.video_link} target="_blank" rel="noopener noreferrer" data-testid="video-link"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-[13px] font-semibold text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm transition-all">
                  <Play className="w-4 h-4" /> Highlights
                </a>
              )}
              {profile.contact_email && (
                <a href={`mailto:${profile.contact_email}`} data-testid="email-link"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-[13px] font-semibold text-slate-700 bg-gray-100 border border-gray-200 hover:bg-gray-200 transition-all">
                  <Mail className="w-4 h-4" /> Email
                </a>
              )}
              {profile.contact_phone && (
                <a href={`tel:${profile.contact_phone}`} data-testid="phone-link"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-[13px] font-semibold text-slate-700 bg-gray-100 border border-gray-200 hover:bg-gray-200 transition-all">
                  <Phone className="w-4 h-4" /> Call
                </a>
              )}
            </div>
          </div>
        </div>
      </section>

      <div className="h-12 bg-gradient-to-b from-white to-gray-50" />

      {/* Content */}
      <div className="bg-gray-50">
        {/* Bio */}
        {profile.bio && (
          <div className="max-w-[860px] mx-auto px-6 sm:px-8 pt-10">
            <div className="rounded-2xl bg-white border border-gray-100 p-6 sm:p-8 shadow-sm">
              <h2 className="text-[11px] font-semibold tracking-[3px] uppercase text-gray-400 mb-4">About</h2>
              <p className="text-[15px] leading-relaxed text-gray-600 max-w-[600px]">{profile.bio}</p>
            </div>
          </div>
        )}

        {/* Measurables */}
        {hasStats && (
          <div className="max-w-[860px] mx-auto px-6 sm:px-8 pt-6">
            <div className="rounded-2xl bg-white border border-gray-100 p-6 sm:p-8 shadow-sm">
              <h2 className="text-[11px] font-semibold tracking-[3px] uppercase text-gray-400 mb-4">Athletic Measurables</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <StatCard value={profile.standing_reach} label="Standing Reach" />
                <StatCard value={profile.approach_touch} label="Approach Touch" />
                <StatCard value={profile.block_touch} label="Block Touch" />
                <StatCard value={profile.wingspan} label="Wingspan" />
              </div>
            </div>
          </div>
        )}

        {/* Club Coach */}
        {hasCoach && (
          <div className="max-w-[860px] mx-auto px-6 sm:px-8 pt-6">
            <div className="rounded-2xl bg-white border border-gray-100 p-6 sm:p-8 shadow-sm">
              <h2 className="text-[11px] font-semibold tracking-[3px] uppercase text-gray-400 mb-4">Club Coach</h2>
              <div className="flex flex-col sm:flex-row items-center gap-4">
                <div className="w-[52px] h-[52px] rounded-[14px] bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white text-xl font-bold shrink-0">
                  {(profile.parent_name || "C")[0].toUpperCase()}
                </div>
                <div className="flex-1 text-center sm:text-left">
                  <p className="font-bold text-[15px] text-slate-800">{profile.parent_name || "Coach"}</p>
                  {profile.club_team && <p className="text-xs text-gray-400 mt-0.5">Club Director · {profile.club_team}</p>}
                </div>
                <div className="flex gap-2">
                  {profile.parent_email && (
                    <a href={`mailto:${profile.parent_email}`} className="w-10 h-10 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center hover:bg-gray-100 transition-colors">
                      <Mail className="w-4 h-4 text-gray-400" />
                    </a>
                  )}
                  {profile.parent_phone && (
                    <a href={`tel:${profile.parent_phone}`} className="w-10 h-10 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center hover:bg-gray-100 transition-colors">
                      <Phone className="w-4 h-4 text-gray-400" />
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Highlights Video */}
        {videoId && (
          <div className="max-w-[860px] mx-auto px-6 sm:px-8 pt-6" data-testid="video-embed-section">
            <div className="rounded-2xl bg-white border border-gray-100 p-6 sm:p-8 shadow-sm">
              <h2 className="text-[11px] font-semibold tracking-[3px] uppercase text-gray-400 mb-4">Highlights</h2>
              {videoPlaying ? (
                <div className="rounded-2xl overflow-hidden aspect-video bg-black shadow-lg border border-gray-200">
                  <iframe src={`https://www.youtube.com/embed/${videoId}?autoplay=1`} title="Highlights" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen className="w-full h-full" />
                </div>
              ) : (
                <div className="relative rounded-2xl overflow-hidden aspect-video bg-black cursor-pointer group shadow-lg border border-gray-200" onClick={() => setVideoPlaying(true)} data-testid="video-thumbnail">
                  <img src={`https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`} alt="Highlights" className="w-full h-full object-cover brightness-[0.65] group-hover:brightness-[0.45] transition-all"
                    onError={(e) => { e.target.src = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`; }} />
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[68px] h-[68px] rounded-full bg-emerald-600/90 backdrop-blur flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Play className="w-7 h-7 text-white fill-white ml-1" />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Events */}
        <div className="max-w-[860px] mx-auto px-6 sm:px-8 pt-6 pb-8">
          <div className="rounded-2xl bg-white border border-gray-100 p-6 sm:p-8 shadow-sm">
            <h2 className="text-[11px] font-semibold tracking-[3px] uppercase text-gray-400 mb-4">Where to See Me Play</h2>
            {upcoming_events.length > 0 ? (
              <div data-testid="upcoming-events">
                {upcoming_events.map((evt, i) => <EventCard key={evt.event_id} event={evt} isLast={i === upcoming_events.length - 1} />)}
              </div>
            ) : (
              <div className="text-center py-14 rounded-2xl bg-gray-50 border border-gray-100">
                <p className="text-sm text-gray-400">Schedule coming soon</p>
                {profile.contact_email && (
                  <a href={`mailto:${profile.contact_email}`}
                    className="inline-flex items-center gap-2 mt-4 px-4 py-2 rounded-full text-xs font-semibold text-emerald-600 bg-emerald-50 border border-emerald-100">
                    <Mail className="w-3.5 h-3.5" /> Get in touch
                  </a>
                )}
              </div>
            )}
            {past_events.length > 0 && (
              <div className="mt-10 opacity-60">
                <h2 className="text-[11px] font-semibold tracking-[3px] uppercase text-gray-400 mb-4">Past Events</h2>
                <div data-testid="past-events">{past_events.map((evt, i) => <EventCard key={evt.event_id} event={evt} isLast={i === past_events.length - 1} />)}</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="pb-24 sm:pb-8 pt-4 text-center bg-gray-50">
        <span className="text-[11px] tracking-wider text-gray-300">Powered by <span className="font-semibold text-gray-400">CapyMatch</span></span>
      </footer>

      {/* Mobile CTA */}
      <div className="fixed bottom-0 left-0 right-0 z-50 sm:hidden bg-white/90 backdrop-blur border-t border-gray-200" style={{ paddingBottom: "calc(12px + env(safe-area-inset-bottom, 0px))" }} data-testid="mobile-cta-bar">
        <div className="flex gap-2 px-4 pt-3 max-w-[500px] mx-auto">
          {profile.contact_email && (
            <a href={`mailto:${profile.contact_email}`} className="flex-1 flex items-center justify-center gap-1.5 py-3 rounded-xl text-[13px] font-semibold text-white bg-emerald-600 shadow-sm">
              <Mail className="w-4 h-4" /> Email
            </a>
          )}
          {profile.contact_phone && (
            <a href={`tel:${profile.contact_phone}`} className="flex-1 flex items-center justify-center gap-1.5 py-3 rounded-xl text-[13px] font-semibold text-slate-700 bg-white border border-gray-200 shadow-sm">
              <Phone className="w-4 h-4" /> Call
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

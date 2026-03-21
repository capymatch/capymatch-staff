import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import axios from "axios";
import {
  Sparkles, ChevronRight,
  Plus, Loader2, Mail, Shield, PartyPopper
} from "lucide-react";
import { toast } from "sonner";
import GmailConsentModal from "../GmailConsentModal";
import GmailImportModal from "../GmailImportModal";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

/* ── Progress Step ── */
function ProgressStep({ num, label, done, current }) {
  return (
    <div className="flex items-center gap-2">
      <div
        className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${
          done ? "text-teal-600" : current ? "border-[1.5px] border-teal-500 text-teal-600" : "border border-slate-400 text-slate-500"
        }`}
        style={done ? { backgroundColor: "rgba(16,185,129,0.15)" } : current ? { backgroundColor: "rgba(26,138,128,0.12)" } : { backgroundColor: "rgba(148,163,184,0.12)" }}
      >
        {done ? "\u2713" : num}
      </div>
      <span className={`text-xs ${current ? "font-semibold" : ""}`} style={{ color: current ? "var(--cm-text)" : done ? "#10b981" : "#64748b" }}>
        {label}
      </span>
    </div>
  );
}

/* ── Suggestion Grid Card ── */
function SuggestionCard({ school, onAdd, adding }) {
  return (
    <div
      className="flex items-center gap-3 rounded-lg border p-3 transition-all hover:shadow-sm"
      style={{ backgroundColor: "var(--cm-surface)", borderColor: "var(--cm-border)" }}
      data-testid={`suggestion-${school.university_name.replace(/\s+/g, "-").toLowerCase()}`}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="font-semibold text-[12px] truncate" style={{ color: "var(--cm-text)" }}>{school.university_name}</span>
          {school.match_score && <span className="text-[11px] font-bold" style={{ color: "#0d9488" }}>{school.match_score}%</span>}
        </div>
        <div className="flex items-center gap-1.5 mt-1">
          {school.division && <span className="text-[9px] font-bold px-1.5 py-px rounded" style={{ background: "var(--cm-surface-2)", color: "var(--cm-text-3)", border: "1px solid var(--cm-border)" }}>{school.division}</span>}
          {school.conference && <span className="text-[9px]" style={{ color: "var(--cm-text-3)" }}>{school.conference}</span>}
        </div>
      </div>
      <button onClick={(e) => { e.stopPropagation(); onAdd(school); }} disabled={adding}
        className="flex-shrink-0 text-[10px] font-semibold px-2.5 py-1.5 rounded-lg transition-colors"
        style={{ background: "#0d9488", color: "white" }}
        data-testid={`add-suggestion-${school.university_name.replace(/\s+/g, "-").toLowerCase()}`}
      >
        {adding ? <Loader2 className="w-3 h-3 animate-spin" /> : <><Plus className="w-3 h-3 inline mr-0.5" />Add</>}
      </button>
    </div>
  );
}

/* ── Ghost Board Column ── */
function GhostColumn({ label, cardCount }) {
  return (
    <div>
      <div className="text-[10px] font-bold uppercase tracking-wider text-center px-3 py-2 rounded-lg mb-2" style={{ backgroundColor: "var(--cm-surface-2)", color: "var(--cm-text-3)" }}>
        {label}
      </div>
      {Array.from({ length: cardCount }).map((_, i) => (
        <div key={i} className="rounded-lg border p-3 mb-2" style={{ backgroundColor: "var(--cm-surface-2)", borderColor: "var(--cm-border)" }}>
          <div className="h-2 rounded-full mb-1.5" style={{ width: i % 2 === 0 ? "80%" : "60%", backgroundColor: "var(--cm-text-4)", opacity: 0.25 }} />
          <div className="h-2 rounded-full mb-1.5" style={{ width: i % 2 === 0 ? "60%" : "80%", backgroundColor: "var(--cm-text-4)", opacity: 0.2 }} />
          <div className="h-1.5 rounded-full mt-2" style={{ width: "40%", backgroundColor: "var(--cm-text-4)", opacity: 0.15 }} />
        </div>
      ))}
    </div>
  );
}

/* ══════════════════════════════════════════ */
/* ── Main Empty Board State Component ──    */
/* ══════════════════════════════════════════ */
export default function EmptyBoardState({ onSchoolAdded }) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [profile, setProfile] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [gmailConnected, setGmailConnected] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [addingSchool, setAddingSchool] = useState(null);
  const [gmailConnecting, setGmailConnecting] = useState(false);
  const [celebrating, setCelebrating] = useState(null);
  const [showConsentModal, setShowConsentModal] = useState(false);

  // Handle Gmail OAuth callback params
  useEffect(() => {
    const gmailResult = searchParams.get("gmail");
    if (gmailResult === "connected") {
      toast.success("Gmail connected successfully!");
      setGmailConnected(true);
      setShowImportModal(true);
      searchParams.delete("gmail");
      setSearchParams(searchParams, { replace: true });
    } else if (gmailResult === "error") {
      const reason = searchParams.get("reason") || "unknown";
      toast.error(`Gmail connection failed: ${reason}`);
      searchParams.delete("gmail");
      searchParams.delete("reason");
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    Promise.all([
      axios.get(`${API}/athlete/profile`).catch(() => ({ data: {} })),
      axios.get(`${API}/athlete/suggested-schools?limit=15`).catch(() => ({ data: { suggestions: [] } })),
      axios.get(`${API}/athlete/gmail/status`).catch(() => ({ data: { connected: false } })),
      axios.get(`${API}/athlete/dashboard`).catch(() => ({ data: {} })),
    ]).then(([profRes, sugRes, gmailRes, dashRes]) => {
      const profileData = profRes.data || {};
      if (dashRes.data?.athlete_name) {
        profileData.athlete_name = dashRes.data.athlete_name;
      }
      setProfile(profileData);
      setSuggestions((sugRes.data?.suggestions || []).slice(0, 15));
      setGmailConnected(gmailRes.data?.connected || localStorage.getItem('cm_gmail_skipped') === 'true');
    }).finally(() => setLoading(false));
  }, []);

  const handleAddSchool = async (school) => {
    setAddingSchool(school.university_name);
    try {
      await axios.post(`${API}/athlete/programs`, {
        university_name: school.university_name,
        division: school.division,
        conference: school.conference,
      });
      setSuggestions(prev => prev.filter(s => s.university_name !== school.university_name));
      setCelebrating(school.university_name);
      setTimeout(() => {
        setCelebrating(null);
        if (onSchoolAdded) onSchoolAdded();
      }, 2500);
    } catch (err) {
      const msg = err?.response?.data?.detail || "Failed to add school";
      toast.error(msg);
    } finally {
      setAddingSchool(null);
    }
  };

  const handleConnectGmail = async () => {
    setShowConsentModal(false);
    setGmailConnecting(true);
    try {
      const res = await axios.get(`${API}/athlete/gmail/connect?return_to=/pipeline`);
      window.location.href = res.data.auth_url;
    } catch {
      toast.error("Failed to start Gmail connection");
      setGmailConnecting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-8 h-8 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const athleteName = profile?.athlete_name || "";
  const firstName = athleteName.split(" ")[0] || "";
  const essentialFields = [
    profile?.athlete_name,
    profile?.graduation_year,
    profile?.position,
    profile?.height,
    profile?.city || profile?.state,
    profile?.club_team || profile?.high_school,
  ];
  const filledCount = essentialFields.filter(Boolean).length;
  const profileDone = filledCount >= 5;
  const currentStep = !profileDone ? 1 : !gmailConnected ? 2 : 3;

  // Celebration overlay
  if (celebrating) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-5 animate-in fade-in duration-300" data-testid="celebration-overlay">
        <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ backgroundColor: "rgba(13,148,136,0.12)" }}>
          <PartyPopper className="w-8 h-8" style={{ color: "#0d9488" }} />
        </div>
        <div className="text-center">
          <h2 className="text-xl font-extrabold" style={{ color: "var(--cm-text)" }}>First school added!</h2>
          <p className="text-sm mt-2" style={{ color: "var(--cm-text-3)" }}>
            <span className="font-semibold" style={{ color: "#0d9488" }}>{celebrating}</span> is now on your board.
          </p>
          <p className="text-xs mt-1" style={{ color: "var(--cm-text-3)" }}>Setting up your recruiting pipeline...</p>
        </div>
        <div className="w-8 h-8 mt-2">
          <Loader2 className="w-5 h-5 animate-spin mx-auto" style={{ color: "#0d9488" }} />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5" data-testid="empty-board-state">

      {/* Welcome Hero Card */}
      <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: "var(--cm-surface)", borderColor: "var(--cm-border)", minHeight: "55vh" }} data-testid="welcome-hero">

        {/* Progress Strip */}
        <div className="flex items-center gap-4 px-5 py-3 border-b overflow-x-auto" style={{ borderColor: "var(--cm-border)", backgroundColor: "var(--cm-surface-2)" }}>
          <ProgressStep num={1} label="Create Profile" done={profileDone} current={!profileDone} />
          <div className="w-5 h-px flex-shrink-0" style={{ backgroundColor: "#94a3b8" }} />
          <ProgressStep num={2} label="Connect Gmail" done={gmailConnected} current={profileDone && !gmailConnected} />
          <div className="w-5 h-px flex-shrink-0" style={{ backgroundColor: "#94a3b8" }} />
          <ProgressStep num={3} label="Add Schools" done={false} current={profileDone && gmailConnected} />
          <div className="w-5 h-px flex-shrink-0" style={{ backgroundColor: "#94a3b8" }} />
          <ProgressStep num={4} label="Start Your Journey" done={false} current={false} />
        </div>

        {/* Hero Content */}
        <div className="relative px-6 pt-7 pb-12 lg:px-8 lg:pb-14">
          <div className="absolute inset-0 pointer-events-none" style={{
            background: "radial-gradient(ellipse at 20% 50%, rgba(13,148,136,0.06) 0%, transparent 60%), radial-gradient(ellipse at 80% 80%, rgba(59,130,246,0.04) 0%, transparent 50%)"
          }} />
          <div className="relative">
            <div className="inline-flex items-center gap-1.5 text-[10px] font-bold tracking-wider uppercase px-3 py-1 rounded-full mb-4"
              style={{ backgroundColor: "rgba(13,148,136,0.12)", color: "#0d9488" }}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: "#0d9488" }} />
              Step {currentStep} of 4
            </div>
            <h2 className="text-xl lg:text-2xl font-extrabold tracking-tight mb-3" style={{ color: "var(--cm-text)" }}>
              {!profileDone
                ? <>First, let's set up <span style={{ color: "#0d9488" }}>the athlete profile</span></>
                : !gmailConnected
                ? <>Connect <span style={{ color: "#0d9488" }}>Gmail</span> to email coaches</>
                : (firstName ? <>Let's build <span style={{ color: "#0d9488" }}>{firstName}'s</span> target list</> : <>Let's build your <span style={{ color: "#0d9488" }}>target list</span></>)
              }
            </h2>
            <p className="text-sm leading-relaxed max-w-lg" style={{ color: "var(--cm-text-2)" }}>
              {!profileDone
                ? "Add the athlete's name, position, key details, and highlight video so coaches know exactly who they're hearing from."
                : !gmailConnected
                ? "Link your Gmail so you can send and receive coach emails directly inside the app - no switching tabs."
                : "Browse programs, get AI-matched suggestions, or search by division and location. You can always add or remove schools later."
              }
            </p>
            {!profileDone && (
              <div className="mt-6 flex items-center gap-3">
                <button
                  className="inline-flex items-center gap-2 text-sm font-bold px-5 py-2.5 rounded-xl transition-all hover:opacity-90"
                  style={{ backgroundColor: "#0d9488", color: "white" }}
                  onClick={() => navigate("/athlete-profile?from=onboarding")}
                  data-testid="complete-profile-btn"
                >
                  Set Up Athlete Profile <ChevronRight className="w-4 h-4" />
                </button>
                <span className="text-xs" style={{ color: "var(--cm-text-4)" }}>Takes about 3-5 minutes</span>
              </div>
            )}
            {profileDone && !gmailConnected && (
              <div className="mt-6 space-y-4">
                <div className="flex items-center gap-3">
                  <button
                    className="inline-flex items-center gap-2 text-sm font-bold px-5 py-2.5 rounded-xl transition-all hover:opacity-90 disabled:opacity-60"
                    style={{ backgroundColor: "#0d9488", color: "white" }}
                    onClick={() => setShowConsentModal(true)}
                    disabled={gmailConnecting}
                    data-testid="connect-gmail-btn"
                  >
                    {gmailConnecting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Mail className="w-4 h-4" />
                    )}
                    {gmailConnecting ? "Connecting..." : "Connect Gmail"} <ChevronRight className="w-4 h-4" />
                  </button>
                  <button
                    className="text-sm font-medium transition-all hover:opacity-70"
                    style={{ color: "var(--cm-text-3)" }}
                    onClick={() => { localStorage.setItem('cm_gmail_skipped', 'true'); setGmailConnected(true); }}
                    data-testid="skip-gmail-btn"
                  >
                    Skip for now
                  </button>
                </div>
                <div className="flex items-start gap-3 rounded-lg px-4 py-3" style={{ backgroundColor: "var(--cm-surface-2)" }}>
                  <Shield className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: "var(--cm-text-3)" }} />
                  <div>
                    <p className="text-xs font-medium" style={{ color: "var(--cm-text-2)" }}>Secure Google connection</p>
                    <p className="text-[11px] mt-0.5 leading-relaxed" style={{ color: "var(--cm-text-3)" }}>
                      We only request permission to send and read emails. You can disconnect anytime from Settings.
                    </p>
                  </div>
                </div>
              </div>
            )}
            {profileDone && gmailConnected && (
              <p className="flex items-center gap-1.5 text-xs mt-3" style={{ color: "var(--cm-text-3)" }}>
                Most families start with 8-15 schools across 2-3 divisions
              </p>
            )}
          </div>
        </div>

        {/* Action — only shown on Step 3 (Add Schools) */}
        {profileDone && gmailConnected && (
          <div className="px-6 pb-10 lg:px-8 lg:pb-12 flex items-center gap-4">
            <button
              className="inline-flex items-center gap-2 text-sm font-bold px-5 py-2.5 rounded-xl transition-all hover:opacity-90"
              style={{ backgroundColor: "#0d9488", color: "white" }}
              onClick={() => navigate("/schools?from=onboarding")}
              data-testid="find-schools-btn"
            >
              Find Schools <ChevronRight className="w-4 h-4" />
            </button>
            <span className="text-xs" style={{ color: "var(--cm-text-3)" }}>or add from the matches below</span>
          </div>
        )}
      </div>

      {/* Top Matches Grid */}
      {profileDone && gmailConnected && suggestions.length > 0 && (
        <div data-testid="ai-suggestions">
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#0d9488]" />
                <span className="text-[14px] font-bold" style={{ color: "var(--cm-text)" }}>Top matches for you</span>
              </div>
              <p className="text-[11px] mt-0.5" style={{ color: "var(--cm-text-3)" }}>Based on your profile and preferences. Scores reflect academic realism.</p>
            </div>
            <button onClick={() => navigate("/schools")} className="text-[11px] font-medium" style={{ color: "#0d9488" }} data-testid="see-all-schools">
              See all schools
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {suggestions.map(s => (
              <SuggestionCard
                key={s.university_name}
                school={s}
                onAdd={handleAddSchool}
                adding={addingSchool === s.university_name}
              />
            ))}
          </div>
        </div>
      )}

      {/* Ghost Board Preview */}
      {profileDone && gmailConnected && (
        <div className="rounded-xl border overflow-hidden relative" style={{ backgroundColor: "var(--cm-surface)", borderColor: "var(--cm-border)" }} data-testid="ghost-board">
          <div className="p-6">
            <div className="grid grid-cols-3 lg:grid-cols-5 gap-3" style={{ opacity: 0.25 }}>
              <GhostColumn label="Needs Outreach" cardCount={2} />
              <GhostColumn label="Contacted" cardCount={3} />
              <GhostColumn label="Waiting Reply" cardCount={1} />
              <div className="hidden lg:block"><GhostColumn label="In Conversation" cardCount={1} /></div>
              <div className="hidden lg:block"><GhostColumn label="Offer / Commit" cardCount={1} /></div>
            </div>
          </div>
          <div className="absolute inset-0 flex items-end justify-center pb-8 pointer-events-none"
            style={{ background: "linear-gradient(to bottom, transparent 0%, var(--cm-bg) 75%)" }}>
            <div className="text-center pointer-events-auto">
              <p className="text-sm font-medium" style={{ color: "var(--cm-text-2)" }}>
                This is where you'll track every school - from first contact to offer
              </p>
              <p className="text-xs mt-1" style={{ color: "var(--cm-text-4)" }}>
                Add schools above to start building your board
              </p>
            </div>
          </div>
        </div>
      )}
      {showConsentModal && (
        <GmailConsentModal
          onAccept={handleConnectGmail}
          onCancel={() => setShowConsentModal(false)}
        />
      )}
      {showImportModal && (
        <GmailImportModal onClose={() => setShowImportModal(false)} />
      )}
    </div>
  );
}

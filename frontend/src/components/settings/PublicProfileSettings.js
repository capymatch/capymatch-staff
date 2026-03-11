import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { toast } from "sonner";
import {
  Globe, Eye, EyeOff, Link2, Copy, Check, Loader2,
  ExternalLink, Mail, Phone, GraduationCap, Activity,
  User2, Calendar, FileText, RefreshCw
} from "lucide-react";
import { Button } from "../../components/ui/button";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

function VisibilityToggle({ label, description, icon: Icon, checked, onChange, testId }) {
  return (
    <div className="flex items-center justify-between p-3 rounded-xl" style={{ backgroundColor: "var(--cm-surface-2)" }}>
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: checked ? "rgba(13,148,136,0.15)" : "rgba(100,116,139,0.1)" }}>
          <Icon className="w-4 h-4" style={{ color: checked ? "#0d9488" : "var(--cm-text-3)" }} />
        </div>
        <div>
          <p className="text-xs font-semibold" style={{ color: "var(--cm-text)" }}>{label}</p>
          <p className="text-[10px]" style={{ color: "var(--cm-text-3)" }}>{description}</p>
        </div>
      </div>
      <button onClick={() => onChange(!checked)} className="relative" data-testid={testId}>
        {checked
          ? <Eye className="w-5 h-5 text-teal-500" />
          : <EyeOff className="w-5 h-5 text-slate-400" />
        }
      </button>
    </div>
  );
}

export default function PublicProfileSettings() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  const fetchSettings = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/athlete/public-profile/settings`);
      setData(res.data);
    } catch {
      toast.error("Failed to load public profile settings");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchSettings(); }, [fetchSettings]);

  const updateSetting = async (key, value) => {
    if (!data) return;
    setSaving(true);
    try {
      const res = await axios.put(`${API}/athlete/public-profile/settings`, { [key]: value });
      setData(prev => ({ ...prev, settings: res.data.settings }));
      if (key === "is_published" && value) {
        toast.success("Profile published! Your public profile is now live.");
      } else if (key === "is_published" && !value) {
        toast.success("Profile unpublished.");
      }
    } catch {
      toast.error("Failed to update setting");
    } finally {
      setSaving(false);
    }
  };

  const copyShareLink = () => {
    if (!data?.slug) return;
    const url = `${window.location.origin}/p/${data.slug}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    toast.success("Share link copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  const regenerateSlug = async () => {
    setRegenerating(true);
    try {
      const res = await axios.post(`${API}/athlete/public-profile/generate-slug`);
      setData(prev => ({ ...prev, slug: res.data.slug, share_url: res.data.share_url }));
      toast.success("Profile URL updated");
    } catch {
      toast.error("Failed to regenerate URL");
    } finally {
      setRegenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="rounded-lg border p-5 sm:p-6" style={{ backgroundColor: "var(--cm-surface)", borderColor: "var(--cm-border)" }}>
        <div className="flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin text-teal-600" />
          <span className="text-xs" style={{ color: "var(--cm-text-3)" }}>Loading public profile settings...</span>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { settings, slug, completeness, coach_summary_preview } = data;
  const isPublished = settings?.is_published || false;
  const shareUrl = slug ? `${window.location.origin}/p/${slug}` : "";

  return (
    <div className="rounded-lg border overflow-hidden" style={{ backgroundColor: "var(--cm-surface)", borderColor: "var(--cm-border)" }} data-testid="section-public-profile">
      {/* Header */}
      <div className="p-5 sm:p-6">
        <div className="flex items-center gap-2.5 mb-5">
          <div className="w-8 h-8 rounded-lg bg-teal-700/15 flex items-center justify-center">
            <Globe className="w-4 h-4 text-teal-600" />
          </div>
          <div>
            <h3 className="text-sm font-bold" style={{ color: "var(--cm-text)" }}>Public Profile</h3>
            <p className="text-[10px]" style={{ color: "var(--cm-text-3)" }}>Share your recruiting profile with college coaches</p>
          </div>
        </div>

        {/* Publish Toggle */}
        <div className="flex items-center justify-between p-4 rounded-xl mb-5"
          style={{ backgroundColor: isPublished ? "rgba(13,148,136,0.08)" : "var(--cm-surface-2)", border: isPublished ? "1px solid rgba(13,148,136,0.2)" : "1px solid var(--cm-border)" }}>
          <div>
            <p className="text-xs font-bold" style={{ color: "var(--cm-text)" }}>
              {isPublished ? "Profile is Live" : "Profile is Hidden"}
            </p>
            <p className="text-[10px] mt-0.5" style={{ color: "var(--cm-text-3)" }}>
              {isPublished ? "Coaches can view your public profile" : "Enable to make your profile visible to coaches"}
            </p>
          </div>
          <Button
            onClick={() => updateSetting("is_published", !isPublished)}
            disabled={saving}
            className={`text-xs h-8 px-4 font-bold ${isPublished ? "bg-slate-600 hover:bg-slate-700" : "bg-teal-700 hover:bg-teal-800"} text-white`}
            data-testid="publish-toggle-btn"
          >
            {saving ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
            {isPublished ? "Unpublish" : "Publish"}
          </Button>
        </div>

        {/* Share Link */}
        {isPublished && slug && (
          <div className="mb-5">
            <label className="text-[10px] font-bold uppercase tracking-wider block mb-2" style={{ color: "var(--cm-text-3)" }}>Share Link</label>
            <div className="flex gap-2">
              <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-lg border text-xs truncate"
                style={{ backgroundColor: "var(--cm-input-bg)", borderColor: "var(--cm-border)", color: "var(--cm-text-2)" }}
                data-testid="share-link-display">
                <Link2 className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                <span className="truncate">{shareUrl}</span>
              </div>
              <Button variant="outline" size="sm" onClick={copyShareLink}
                className="text-xs h-9 px-3 shrink-0" data-testid="copy-share-link-btn">
                {copied ? <Check className="w-3.5 h-3.5 text-teal-600" /> : <Copy className="w-3.5 h-3.5" />}
              </Button>
              <a href={`/p/${slug}`} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" size="sm" className="text-xs h-9 px-3 shrink-0" data-testid="preview-profile-btn">
                  <ExternalLink className="w-3.5 h-3.5" />
                </Button>
              </a>
            </div>
            <button onClick={regenerateSlug} disabled={regenerating}
              className="flex items-center gap-1 mt-2 text-[10px] font-medium hover:underline"
              style={{ color: "var(--cm-text-3)" }}
              data-testid="regenerate-slug-btn">
              <RefreshCw className={`w-3 h-3 ${regenerating ? "animate-spin" : ""}`} />
              Regenerate URL
            </button>
          </div>
        )}

        {/* Profile Completeness */}
        {completeness && (
          <div className="mb-5" data-testid="profile-completeness">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--cm-text-3)" }}>Profile Completeness</span>
              <span className="text-xs font-bold" style={{ color: completeness.score >= 80 ? "#0d9488" : completeness.score >= 50 ? "#f59e0b" : "#ef4444" }}>
                {completeness.score}%
              </span>
            </div>
            <div className="w-full h-2 rounded-full" style={{ backgroundColor: "var(--cm-surface-2)" }}>
              <div className="h-2 rounded-full transition-all duration-500"
                style={{
                  width: `${completeness.score}%`,
                  backgroundColor: completeness.score >= 80 ? "#0d9488" : completeness.score >= 50 ? "#f59e0b" : "#ef4444"
                }}
                data-testid="completeness-bar" />
            </div>
            {completeness.missing?.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {completeness.missing.map(field => (
                  <span key={field} className="text-[10px] font-medium px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: "rgba(239,68,68,0.08)", color: "#ef4444" }}
                    data-testid={`missing-field-${field.toLowerCase().replace(/\s+/g, "-")}`}>
                    + {field}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Coach Summary Preview */}
        {coach_summary_preview && (
          <div className="mb-5 p-3 rounded-xl" style={{ backgroundColor: "var(--cm-surface-2)", border: "1px solid var(--cm-border)" }} data-testid="coach-summary-preview">
            <p className="text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: "var(--cm-text-3)" }}>Coach Summary Preview</p>
            <p className="text-xs leading-relaxed" style={{ color: "var(--cm-text-2)" }}>{coach_summary_preview}</p>
          </div>
        )}

        {/* Visibility Controls */}
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider mb-3" style={{ color: "var(--cm-text-3)" }}>Section Visibility</p>
          <div className="space-y-2">
            <VisibilityToggle
              icon={Mail}
              label="Contact Email"
              description="Show your email address to coaches"
              checked={settings?.show_contact_email || false}
              onChange={v => updateSetting("show_contact_email", v)}
              testId="toggle-show-email"
            />
            <VisibilityToggle
              icon={Phone}
              label="Contact Phone"
              description="Show your phone number to coaches"
              checked={settings?.show_contact_phone || false}
              onChange={v => updateSetting("show_contact_phone", v)}
              testId="toggle-show-phone"
            />
            <VisibilityToggle
              icon={GraduationCap}
              label="Academics"
              description="Show GPA and test scores"
              checked={settings?.show_academics !== false}
              onChange={v => updateSetting("show_academics", v)}
              testId="toggle-show-academics"
            />
            <VisibilityToggle
              icon={Activity}
              label="Athletic Measurables"
              description="Show reach, touch, and wingspan"
              checked={settings?.show_measurables !== false}
              onChange={v => updateSetting("show_measurables", v)}
              testId="toggle-show-measurables"
            />
            <VisibilityToggle
              icon={User2}
              label="Club Coach"
              description="Show club coach name and contact"
              checked={settings?.show_club_coach !== false}
              onChange={v => updateSetting("show_club_coach", v)}
              testId="toggle-show-coach"
            />
            <VisibilityToggle
              icon={FileText}
              label="Bio / About"
              description="Show your personal bio"
              checked={settings?.show_bio !== false}
              onChange={v => updateSetting("show_bio", v)}
              testId="toggle-show-bio"
            />
            <VisibilityToggle
              icon={Calendar}
              label="Events Schedule"
              description="Show upcoming and past events"
              checked={settings?.show_events !== false}
              onChange={v => updateSetting("show_events", v)}
              testId="toggle-show-events"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

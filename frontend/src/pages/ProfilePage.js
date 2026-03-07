import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { useAuth } from "@/AuthContext";
import Header from "@/components/mission-control/Header";
import { toast } from "sonner";
import {
  User, Phone, MessageSquare, Clock, FileText, Save, CheckCircle, AlertCircle, Minus,
} from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const CONTACT_OPTIONS = [
  { value: "email", label: "Email" },
  { value: "phone", label: "Phone call" },
  { value: "text", label: "Text message" },
  { value: "slack", label: "Slack" },
];

const COMPLETENESS_CONFIG = {
  incomplete: { label: "Incomplete", bg: "bg-slate-100", text: "text-slate-500", icon: Minus },
  basic: { label: "Basic", bg: "bg-amber-50", text: "text-amber-700", icon: AlertCircle },
  complete: { label: "Complete", bg: "bg-emerald-50", text: "text-emerald-700", icon: CheckCircle },
};

export default function ProfilePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState({
    name: "", phone: "", contact_method: "", availability: "", bio: "",
  });

  useEffect(() => {
    (async () => {
      try {
        const res = await axios.get(`${API}/profile`);
        setProfile(res.data);
        setForm({
          name: res.data.name || "",
          phone: res.data.phone || "",
          contact_method: res.data.contact_method || "",
          availability: res.data.availability || "",
          bio: res.data.bio || "",
        });
      } catch {
        toast.error("Failed to load profile");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error("Name cannot be empty");
      return;
    }
    setSaving(true);
    try {
      const res = await axios.put(`${API}/profile`, form);
      setProfile(res.data);
      toast.success("Profile saved");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const hasChanges = profile && (
    form.name !== (profile.name || "") ||
    form.phone !== (profile.phone || "") ||
    form.contact_method !== (profile.contact_method || "") ||
    form.availability !== (profile.availability || "") ||
    form.bio !== (profile.bio || "")
  );

  const completeness = profile ? COMPLETENESS_CONFIG[profile.completeness] || COMPLETENESS_CONFIG.incomplete : null;
  const CompIcon = completeness?.icon || Minus;

  const initials = form.name
    ? form.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()
    : "?";

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Header />
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-400" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50" data-testid="profile-page">
      <Header />
      <main className="max-w-xl mx-auto px-4 sm:px-6 py-8">
        {/* Avatar + name header */}
        <div className="flex items-center gap-4 mb-6">
          <div className="w-14 h-14 bg-slate-900 rounded-full flex items-center justify-center shrink-0">
            <span className="text-white font-semibold text-lg">{initials}</span>
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-semibold text-slate-900" data-testid="profile-title">Your Profile</h1>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs text-slate-400">{profile?.email}</span>
              {profile?.team && (
                <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full">{profile.team}</span>
              )}
            </div>
          </div>
          {completeness && (
            <span
              className={`flex items-center gap-1 px-2.5 py-1 text-[10px] font-semibold rounded-full ${completeness.bg} ${completeness.text}`}
              data-testid="profile-completeness-badge"
            >
              <CompIcon className="w-3 h-3" />
              {completeness.label}
            </span>
          )}
        </div>

        {/* Form */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm space-y-5" data-testid="profile-form">
          {/* Name */}
          <div>
            <label className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
              <User className="w-3 h-3" /> Full Name
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Your full name"
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-300"
              data-testid="profile-name-input"
            />
          </div>

          {/* Contact method */}
          <div>
            <label className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
              <MessageSquare className="w-3 h-3" /> Preferred Contact Method
            </label>
            <div className="flex flex-wrap gap-1.5">
              {CONTACT_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, contact_method: f.contact_method === opt.value ? "" : opt.value }))}
                  className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${
                    form.contact_method === opt.value
                      ? "bg-slate-900 text-white border-slate-900"
                      : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
                  }`}
                  data-testid={`profile-contact-${opt.value}`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Phone */}
          <div>
            <label className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
              <Phone className="w-3 h-3" /> Phone <span className="text-slate-300 normal-case font-normal">(optional)</span>
            </label>
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              placeholder="(555) 123-4567"
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-300"
              data-testid="profile-phone-input"
            />
          </div>

          {/* Availability */}
          <div>
            <label className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
              <Clock className="w-3 h-3" /> Availability / Best Time to Reach
            </label>
            <input
              type="text"
              value={form.availability}
              onChange={(e) => setForm((f) => ({ ...f, availability: e.target.value }))}
              placeholder="e.g. Weekday mornings, Tues/Thurs evenings"
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-300"
              data-testid="profile-availability-input"
            />
          </div>

          {/* Bio */}
          <div>
            <label className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
              <FileText className="w-3 h-3" /> Short Bio
            </label>
            <textarea
              value={form.bio}
              onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
              rows={3}
              maxLength={500}
              placeholder="A few sentences about your coaching background and focus"
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-300 resize-none"
              data-testid="profile-bio-input"
            />
            <p className="text-[10px] text-slate-300 text-right mt-1">{form.bio.length}/500</p>
          </div>

          {/* Team (read-only) */}
          {profile?.team && (
            <div>
              <label className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                Team <span className="text-slate-300 normal-case font-normal">(managed by director)</span>
              </label>
              <div className="px-3 py-2.5 text-sm border border-gray-100 rounded-lg bg-gray-50 text-slate-500" data-testid="profile-team-display">
                {profile.team}
              </div>
            </div>
          )}

          {/* Save button */}
          <div className="pt-2">
            <button
              onClick={handleSave}
              disabled={saving || !hasChanges}
              className="flex items-center gap-1.5 px-5 py-2.5 text-sm font-medium bg-slate-900 text-white rounded-lg hover:bg-slate-800 disabled:opacity-40 transition-colors"
              data-testid="profile-save-btn"
            >
              {saving ? (
                <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-white" />
              ) : (
                <Save className="w-3.5 h-3.5" />
              )}
              {saving ? "Saving..." : "Save Profile"}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

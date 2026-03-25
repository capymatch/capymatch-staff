import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft, School, MessageSquare, Shield,
  CheckCircle2, XCircle, Mail
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { Button } from "../../components/ui/button";
import axios from "axios";
import { toast } from "sonner";

const API = process.env.REACT_APP_BACKEND_URL + "/api";

const PLAN_BADGE = {
  basic: "bg-zinc-500/15 text-zinc-400 border-zinc-500/20",
  pro: "bg-teal-600/15 text-teal-500 border-teal-500/20",
  premium: "bg-amber-500/15 text-amber-400 border-amber-500/20",
};

function InfoRow({ label, value, icon: Icon }) {
  return (
    <div className="flex items-center justify-between py-2 border-b" style={{ borderColor: "var(--cm-border)" }}>
      <span className="text-xs flex items-center gap-2" style={{ color: "var(--cm-text-3)" }}>
        {Icon && <Icon className="w-3.5 h-3.5" />}
        {label}
      </span>
      <span className="text-xs font-medium" style={{ color: "var(--cm-text)" }}>{value || "-"}</span>
    </div>
  );
}

function FeatureRow({ label, enabled }) {
  return (
    <div className="flex items-center justify-between py-2 border-b" style={{ borderColor: "var(--cm-border)" }}>
      <span className="text-xs" style={{ color: "var(--cm-text-3)" }}>{label}</span>
      {enabled ? <CheckCircle2 className="w-4 h-4 text-teal-500" /> : <XCircle className="w-4 h-4" style={{ color: "var(--cm-text-4)" }} />}
    </div>
  );
}

function StatMini({ label, value, color }) {
  return (
    <div className="text-center p-3 rounded-lg" style={{ backgroundColor: "var(--cm-surface-2)" }}>
      <p className={`text-xl font-bold ${color}`}>{value}</p>
      <p className="text-[10px] mt-0.5" style={{ color: "var(--cm-text-3)" }}>{label}</p>
    </div>
  );
}

export default function AdminUserDetailPage() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchDetail = () => {
    setLoading(true);
    axios.get(`${API}/admin/users/${userId}`).then(res => {
      setData(res.data);
      setSelectedPlan(res.data.plan || "basic");
      setSelectedStatus(res.data.status || "active");
    }).catch(() => {
      toast.error("User not found");
      navigate("/admin/users");
    }).finally(() => setLoading(false));
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchDetail(); }, [userId]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await axios.put(`${API}/admin/users/${userId}`, {
        plan: selectedPlan,
        status: selectedStatus,
      });
      toast.success("User updated");
      fetchDetail();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to update");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-8 h-8 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!data) return null;

  const { user, athlete, subscription, stats, recent_interactions, programs, plan } = data;
  const displayName = athlete?.full_name || user?.name || "Unknown";

  return (
    <div className="space-y-5" data-testid="admin-user-detail">
      {/* Back */}
      <button onClick={() => navigate("/admin/users")} className="flex items-center gap-1.5 text-xs font-medium transition-colors hover:text-teal-500" style={{ color: "var(--cm-text-3)" }} data-testid="admin-back-to-users">
        <ArrowLeft className="w-3.5 h-3.5" /> Back to Users
      </button>

      {/* Header Card */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 rounded-xl border p-5" style={{ backgroundColor: "var(--cm-surface)", borderColor: "var(--cm-border)" }}>
        <div className="w-14 h-14 rounded-xl flex items-center justify-center text-xl font-bold flex-shrink-0" style={{ backgroundColor: "rgba(13,148,136,0.15)", color: "#0d9488" }}>
          {displayName.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-bold" style={{ color: "var(--cm-text)" }}>{displayName}</h2>
          <p className="text-xs" style={{ color: "var(--cm-text-3)" }}>{user?.email}</p>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${PLAN_BADGE[plan]}`}>
              {plan.charAt(0).toUpperCase() + plan.slice(1)}
            </span>
            {stats?.position && <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ backgroundColor: "var(--cm-surface-2)", color: "var(--cm-text-2)" }}>{stats.position}</span>}
            {stats?.grad_year && <span className="text-[10px]" style={{ color: "var(--cm-text-3)" }}>Class of {stats.grad_year}</span>}
            <span className="text-[10px]" style={{ color: "var(--cm-text-3)" }}>
              Joined {user?.created_at ? new Date(user.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "-"}
            </span>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 rounded-xl border p-4" style={{ backgroundColor: "var(--cm-surface)", borderColor: "var(--cm-border)" }}>
        <StatMini label="Schools" value={stats.school_count} color="text-blue-400" />
        <StatMini label="Interactions" value={stats.interaction_count} color="text-amber-400" />
        <StatMini label="Gmail" value={stats.gmail_connected ? "Connected" : "Not connected"} color={stats.gmail_connected ? "text-teal-500" : "text-zinc-500"} />
        <StatMini label="Quiz Done" value={stats.questionnaire_completed ? "Yes" : "No"} color={stats.questionnaire_completed ? "text-teal-500" : "text-zinc-500"} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Manage Account */}
        <div className="rounded-xl border p-5" style={{ backgroundColor: "var(--cm-surface)", borderColor: "var(--cm-border)" }}>
          <h3 className="text-sm font-semibold mb-4 flex items-center gap-2" style={{ color: "var(--cm-text)" }}>
            <Shield className="w-4 h-4 text-teal-500" /> Manage Account
          </h3>
          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium mb-1.5 block" style={{ color: "var(--cm-text-2)" }}>Subscription Plan</label>
              <Select value={selectedPlan} onValueChange={setSelectedPlan}>
                <SelectTrigger className="text-sm" style={{ backgroundColor: "var(--cm-surface-2)", borderColor: "var(--cm-border)", color: "var(--cm-text)" }} data-testid="admin-user-plan-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="basic">Basic</SelectItem>
                  <SelectItem value="pro">Pro</SelectItem>
                  <SelectItem value="premium">Premium</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium mb-1.5 block" style={{ color: "var(--cm-text-2)" }}>Account Status</label>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger className="text-sm" style={{ backgroundColor: "var(--cm-surface-2)", borderColor: "var(--cm-border)", color: "var(--cm-text)" }} data-testid="admin-user-status-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                  <SelectItem value="deactivated">Deactivated</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleSave} disabled={saving} className="w-full text-xs" style={{ background: "#0d9488", color: "white" }} data-testid="admin-user-save-btn">
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>

        {/* Plan Features */}
        <div className="rounded-xl border p-5" style={{ backgroundColor: "var(--cm-surface)", borderColor: "var(--cm-border)" }}>
          <h3 className="text-sm font-semibold mb-4" style={{ color: "var(--cm-text)" }}>
            Current Plan Features ({plan.charAt(0).toUpperCase() + plan.slice(1)})
          </h3>
          <div className="space-y-0.5">
            <InfoRow label="Max Schools" value={subscription?.max_schools === -1 ? "Unlimited" : subscription?.max_schools} icon={School} />
            <InfoRow label="AI Drafts/Month" value={subscription?.ai_drafts_per_month === -1 ? "Unlimited" : subscription?.ai_drafts_per_month === 0 ? "None" : subscription?.ai_drafts_per_month} icon={MessageSquare} />
            <FeatureRow label="Gmail Integration" enabled={subscription?.gmail_integration} />
            <FeatureRow label="Follow-up Reminders" enabled={subscription?.follow_up_reminders} />
            <FeatureRow label="Recruiting Insights" enabled={subscription?.recruiting_insights} />
            <FeatureRow label="Auto Reply Detection" enabled={subscription?.auto_reply_detection} />
            <FeatureRow label="Weekly Digest" enabled={subscription?.weekly_digest} />
            <FeatureRow label="Analytics" enabled={subscription?.analytics} />
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="rounded-xl border p-5" style={{ backgroundColor: "var(--cm-surface)", borderColor: "var(--cm-border)" }}>
        <h3 className="text-sm font-semibold mb-4" style={{ color: "var(--cm-text)" }}>Recent Activity</h3>
        {recent_interactions.length === 0 ? (
          <p className="text-xs py-4 text-center" style={{ color: "var(--cm-text-3)" }}>No interactions yet</p>
        ) : (
          <div className="space-y-0">
            {recent_interactions.map((ix, i) => (
              <div key={ix.interaction_id || i} className="flex items-center gap-3 py-2.5 border-b" style={{ borderColor: "var(--cm-border)" }}>
                <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: "rgba(13,148,136,0.1)" }}>
                  {ix.type === "email" ? <Mail className="w-3.5 h-3.5 text-teal-500" /> : <MessageSquare className="w-3.5 h-3.5 text-teal-500" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate" style={{ color: "var(--cm-text)" }}>
                    {ix.type} - {ix.university_name || "Unknown school"}
                  </p>
                  <p className="text-[10px]" style={{ color: "var(--cm-text-3)" }}>
                    {ix.outcome || "No outcome"} {ix.date_time ? `| ${new Date(ix.date_time).toLocaleDateString()}` : ""}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Schools on Board */}
      <div className="rounded-xl border p-5" style={{ backgroundColor: "var(--cm-surface)", borderColor: "var(--cm-border)" }}>
        <h3 className="text-sm font-semibold mb-4" style={{ color: "var(--cm-text)" }}>Schools on Board ({programs.length})</h3>
        {programs.length === 0 ? (
          <p className="text-xs py-4 text-center" style={{ color: "var(--cm-text-3)" }}>No schools added yet</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {programs.map(p => (
              <div key={p.program_id || p.university_name} className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ backgroundColor: "var(--cm-surface-2)" }}>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded flex-shrink-0" style={{ backgroundColor: "rgba(59,130,246,0.15)", color: "#60a5fa" }}>{p.division || "-"}</span>
                <span className="text-xs truncate" style={{ color: "var(--cm-text)" }}>{p.university_name}</span>
                <span className="text-[10px] ml-auto flex-shrink-0" style={{ color: "var(--cm-text-3)" }}>{p.recruiting_status || p.board_group}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

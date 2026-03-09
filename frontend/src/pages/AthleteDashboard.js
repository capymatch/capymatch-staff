import { useState, useEffect } from "react";
import axios from "axios";
import { useAuth } from "../AuthContext";
import {
  LayoutDashboard,
  Kanban,
  GraduationCap,
  Calendar,
  Mail,
  TrendingUp,
  TrendingDown,
  Minus,
  Target,
  Star,
  Clock,
  ArrowRight,
  User,
  Shield,
} from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

function MomentumIcon({ trend }) {
  if (trend === "rising") return <TrendingUp className="w-4 h-4 text-emerald-500" />;
  if (trend === "declining") return <TrendingDown className="w-4 h-4 text-red-500" />;
  return <Minus className="w-4 h-4 text-amber-500" />;
}

function MomentumLabel({ trend }) {
  const map = {
    rising: { text: "Rising", cls: "text-emerald-600 bg-emerald-50" },
    declining: { text: "Declining", cls: "text-red-600 bg-red-50" },
    stable: { text: "Stable", cls: "text-amber-600 bg-amber-50" },
  };
  const m = map[trend] || map.stable;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${m.cls}`}>
      <MomentumIcon trend={trend} />
      {m.text}
    </span>
  );
}

function StageLabel({ stage }) {
  const map = {
    exploring: { text: "Exploring", cls: "bg-blue-50 text-blue-700" },
    actively_recruiting: { text: "Actively Recruiting", cls: "bg-emerald-50 text-emerald-700" },
    narrowing: { text: "Narrowing", cls: "bg-purple-50 text-purple-700" },
    committed: { text: "Committed", cls: "bg-amber-50 text-amber-700" },
  };
  const s = map[stage] || { text: stage || "—", cls: "bg-gray-50 text-gray-600" };
  return <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${s.cls}`}>{s.text}</span>;
}

function QuickLink({ icon: Icon, label, sub, disabled }) {
  return (
    <button
      disabled={disabled}
      className={`flex items-center gap-3 p-3.5 rounded-xl border transition-all text-left w-full group ${
        disabled
          ? "border-gray-100 bg-gray-50/50 cursor-default"
          : "border-gray-100 hover:border-emerald-200 hover:bg-emerald-50/30 cursor-pointer"
      }`}
      data-testid={`quick-link-${label.toLowerCase().replace(/\s/g, "-")}`}
    >
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
        disabled ? "bg-gray-100" : "bg-slate-100 group-hover:bg-emerald-100"
      }`}>
        <Icon className={`w-4.5 h-4.5 ${disabled ? "text-gray-300" : "text-slate-500 group-hover:text-emerald-600"}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium ${disabled ? "text-gray-400" : "text-slate-700"}`}>{label}</p>
        <p className="text-[11px] text-gray-400 truncate">{sub}</p>
      </div>
      {!disabled && <ArrowRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-emerald-500 transition-colors" />}
      {disabled && (
        <span className="text-[10px] text-gray-300 font-medium whitespace-nowrap">Soon</span>
      )}
    </button>
  );
}

export default function AthleteDashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    axios
      .get(`${API}/athlete/me`)
      .then((res) => setData(res.data))
      .catch((err) => setError(err.response?.data?.detail || "Failed to load profile"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center" data-testid="athlete-dashboard-loading">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center" data-testid="athlete-dashboard-error">
        <div className="text-center">
          <p className="text-sm text-red-600 mb-2">{error}</p>
        </div>
      </div>
    );
  }

  // Unclaimed user — registered but no athlete record linked
  if (!data?.claimed) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center" data-testid="athlete-dashboard-unclaimed">
        <div className="text-center max-w-sm">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 flex items-center justify-center mx-auto mb-4">
            <User className="w-7 h-7 text-amber-500" />
          </div>
          <h1 className="text-xl font-semibold text-slate-800 mb-2">Welcome, {user?.name || "Athlete"}</h1>
          <p className="text-sm text-slate-500 leading-relaxed">
            Your account isn't linked to a club profile yet. Ask your coach or club director to add your email to their roster — once they do, your full dashboard will appear here.
          </p>
        </div>
      </div>
    );
  }

  const a = data.athlete;
  const coach = data.coach;

  return (
    <div className="space-y-6 max-w-3xl" data-testid="athlete-dashboard">
      {/* Welcome header */}
      <div className="flex items-start gap-4">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shrink-0 shadow-sm">
          <span className="text-white font-bold text-lg">
            {(a.firstName?.[0] || "").toUpperCase()}{(a.lastName?.[0] || "").toUpperCase()}
          </span>
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-slate-800" data-testid="athlete-welcome-name">
            Welcome back, {a.firstName || user?.name}
          </h1>
          <p className="text-sm text-slate-500 mt-0.5" data-testid="athlete-welcome-meta">
            {[a.position, a.team, a.gradYear ? `Class of ${a.gradYear}` : ""].filter(Boolean).join(" · ")}
          </p>
        </div>
      </div>

      {/* Recruiting snapshot */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3" data-testid="athlete-snapshot">
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <p className="text-[11px] uppercase tracking-wider text-gray-400 font-medium mb-1">Momentum</p>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold text-slate-800">{a.momentumScore ?? "—"}</span>
            <MomentumLabel trend={a.momentumTrend} />
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <p className="text-[11px] uppercase tracking-wider text-gray-400 font-medium mb-1">Stage</p>
          <div className="mt-1">
            <StageLabel stage={a.recruitingStage} />
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <p className="text-[11px] uppercase tracking-wider text-gray-400 font-medium mb-1">School Targets</p>
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-slate-400" />
            <span className="text-2xl font-bold text-slate-800">{a.schoolTargets ?? 0}</span>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <p className="text-[11px] uppercase tracking-wider text-gray-400 font-medium mb-1">Active Interest</p>
          <div className="flex items-center gap-2">
            <Star className="w-4 h-4 text-amber-400" />
            <span className="text-2xl font-bold text-slate-800">{a.activeInterest ?? 0}</span>
          </div>
        </div>
      </div>

      {/* Profile info + Coach */}
      <div className="grid sm:grid-cols-2 gap-3">
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">Your Profile</h2>
          <dl className="space-y-2.5" data-testid="athlete-profile-info">
            {[
              { label: "Position", value: a.position },
              { label: "Team", value: a.team },
              { label: "Grad Year", value: a.gradYear },
              { label: "GPA", value: a.gpa },
              { label: "High School", value: a.high_school },
            ]
              .filter((r) => r.value)
              .map((r) => (
                <div key={r.label} className="flex items-center justify-between">
                  <dt className="text-xs text-gray-400">{r.label}</dt>
                  <dd className="text-sm font-medium text-slate-700">{r.value}</dd>
                </div>
              ))}
          </dl>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">Your Coach</h2>
          {coach ? (
            <div className="flex items-center gap-3" data-testid="athlete-coach-info">
              <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
                <Shield className="w-5 h-5 text-slate-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-700">{coach.name}</p>
                <p className="text-xs text-gray-400">{coach.email}</p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-400">No coach assigned yet</p>
          )}

          <div className="mt-4 pt-4 border-t border-gray-50">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">Last Activity</h2>
            <div className="flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-gray-300" />
              <p className="text-xs text-gray-500">
                {a.lastActivity
                  ? new Date(a.lastActivity).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                  : "—"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick links */}
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">Explore</h2>
        <div className="grid sm:grid-cols-2 gap-2" data-testid="athlete-quick-links">
          <QuickLink icon={Kanban} label="Pipeline" sub="Track your target schools" disabled />
          <QuickLink icon={GraduationCap} label="Schools" sub="Research college programs" disabled />
          <QuickLink icon={Calendar} label="Calendar" sub="Events, visits & deadlines" disabled />
          <QuickLink icon={Mail} label="Inbox" sub="Coach messages & emails" disabled />
        </div>
        <p className="text-[11px] text-gray-300 mt-2 text-center">Full features coming in Phase 2</p>
      </div>
    </div>
  );
}
